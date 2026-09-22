from collections.abc import Callable
from dataclasses import dataclass
from threading import Lock
from time import time
from typing import Literal

LimitType = Literal["per_minute", "daily"]


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit_type: LimitType | None = None


class AskRateLimiter:
    def __init__(
        self,
        per_minute: int,
        daily: int,
        clock: Callable[[], float] = time,
    ) -> None:
        if per_minute < 0 or daily < 0:
            raise ValueError("Les limites de requêtes doivent être positives ou nulles.")
        self.per_minute = per_minute
        self.daily = daily
        self._clock = clock
        self._lock = Lock()
        self._minute_bucket: int | None = None
        self._minute_counts: dict[str, int] = {}
        self._day_bucket: int | None = None
        self._daily_count = 0

    def check(self, client_id: str) -> RateLimitDecision:
        now = self._clock()
        minute_bucket = int(now // 60)
        day_bucket = int(now // 86_400)

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

            self._daily_count += 1
            self._minute_counts[client_id] = client_count + 1
            return RateLimitDecision(allowed=True)
