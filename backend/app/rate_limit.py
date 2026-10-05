from collections.abc import Callable
from dataclasses import dataclass
from threading import Lock
from time import time
from typing import Literal

LimitType = Literal["per_minute", "daily", "account_quota"]


@dataclass(frozen=True)
class QuotaReservation:
    account_id: str
    window_bucket: int


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit_type: LimitType | None = None
    retry_after_seconds: int | None = None
    quota_reservation: QuotaReservation | None = None


@dataclass(frozen=True)
class AccountQuotaStatus:
    limit: int
    used: int
    remaining: int
    reset_at: int


class AskRateLimiter:
    def __init__(
        self,
        per_minute: int,
        daily: int,
        account_quota: int = 0,
        quota_window_seconds: int = 14_400,
        clock: Callable[[], float] = time,
    ) -> None:
        if per_minute < 0 or daily < 0 or account_quota < 0:
            raise ValueError("Les limites de requêtes doivent être positives ou nulles.")
        if quota_window_seconds <= 0:
            raise ValueError("La fenêtre de quota doit être positive.")
        self.per_minute = per_minute
        self.daily = daily
        self.account_quota = account_quota
        self.quota_window_seconds = quota_window_seconds
        self._clock = clock
        self._lock = Lock()
        self._minute_bucket: int | None = None
        self._minute_counts: dict[str, int] = {}
        self._day_bucket: int | None = None
        self._daily_count = 0
        self._account_quota_counts: dict[str, tuple[int, int]] = {}

    def check(
        self,
        client_id: str,
        account_id: str | None = None,
    ) -> RateLimitDecision:
        now = self._clock()
        minute_bucket = int(now // 60)
        day_bucket = int(now // 86_400)
        quota_bucket = int(now // self.quota_window_seconds)

        with self._lock:
            if minute_bucket != self._minute_bucket:
                self._minute_bucket = minute_bucket
                self._minute_counts.clear()
            if day_bucket != self._day_bucket:
                self._day_bucket = day_bucket
                self._daily_count = 0

            if self.daily and self._daily_count >= self.daily:
                return RateLimitDecision(allowed=False, limit_type="daily")

            client_count = self._minute_counts.get(client_id, 0)
            if self.per_minute and client_count >= self.per_minute:
                return RateLimitDecision(allowed=False, limit_type="per_minute")

            quota_count = 0
            if account_id is not None and self.account_quota:
                stored_bucket, stored_count = self._account_quota_counts.get(
                    account_id,
                    (quota_bucket, 0),
                )
                if stored_bucket == quota_bucket:
                    quota_count = stored_count
                if quota_count >= self.account_quota:
                    window_end = (quota_bucket + 1) * self.quota_window_seconds
                    return RateLimitDecision(
                        allowed=False,
                        limit_type="account_quota",
                        retry_after_seconds=max(1, int(window_end - now)),
                    )

            self._daily_count += 1
            self._minute_counts[client_id] = client_count + 1
            reservation = None
            if account_id is not None and self.account_quota:
                self._account_quota_counts[account_id] = (
                    quota_bucket,
                    quota_count + 1,
                )
                reservation = QuotaReservation(account_id, quota_bucket)
            return RateLimitDecision(
                allowed=True,
                quota_reservation=reservation,
            )

    def release_quota(self, reservation: QuotaReservation) -> None:
        with self._lock:
            stored_bucket, stored_count = self._account_quota_counts.get(
                reservation.account_id,
                (reservation.window_bucket, 0),
            )
            if stored_bucket != reservation.window_bucket or stored_count == 0:
                return
            self._account_quota_counts[reservation.account_id] = (
                stored_bucket,
                stored_count - 1,
            )

    def quota_status(self, account_id: str) -> AccountQuotaStatus:
        now = self._clock()
        quota_bucket = int(now // self.quota_window_seconds)

        with self._lock:
            stored_bucket, stored_count = self._account_quota_counts.get(
                account_id,
                (quota_bucket, 0),
            )
            used = stored_count if stored_bucket == quota_bucket else 0

        return AccountQuotaStatus(
            limit=self.account_quota,
            used=used,
            remaining=max(0, self.account_quota - used),
            reset_at=(quota_bucket + 1) * self.quota_window_seconds,
        )
