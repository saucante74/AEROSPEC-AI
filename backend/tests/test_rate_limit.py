from unittest import TestCase

from backend.app.rate_limit import AskRateLimiter, RateLimitDecision


class AskRateLimiterTest(TestCase):
    def test_allows_configured_requests_then_resets_next_minute(self) -> None:
        now = [0.0]
        limiter = AskRateLimiter(2, 10, clock=lambda: now[0])

        self.assertEqual(limiter.check("client-a"), RateLimitDecision(True))
        self.assertEqual(limiter.check("client-a"), RateLimitDecision(True))
        self.assertEqual(
            limiter.check("client-a"),
            RateLimitDecision(False, "per_minute"),
        )

        now[0] = 60.0
        self.assertEqual(limiter.check("client-a"), RateLimitDecision(True))

    def test_daily_limit_resets_next_utc_day(self) -> None:
        now = [0.0]
        limiter = AskRateLimiter(0, 1, clock=lambda: now[0])

        self.assertEqual(limiter.check("client-a"), RateLimitDecision(True))
        self.assertEqual(
            limiter.check("client-b"),
            RateLimitDecision(False, "daily"),
        )

        now[0] = 86_400.0
        self.assertEqual(limiter.check("client-b"), RateLimitDecision(True))

    def test_zero_disables_both_limits(self) -> None:
        limiter = AskRateLimiter(0, 0, clock=lambda: 0.0)

        for _ in range(200):
            self.assertEqual(limiter.check("client-a"), RateLimitDecision(True))

    def test_account_quota_resets_after_window(self) -> None:
        now = [0.0]
        limiter = AskRateLimiter(
            0,
            0,
            account_quota=2,
            quota_window_seconds=14_400,
            clock=lambda: now[0],
        )

        first = limiter.check("client-a", "reviewer")
        second = limiter.check("client-b", "reviewer")
        rejected = limiter.check("client-c", "reviewer")

        self.assertTrue(first.allowed)
        self.assertTrue(second.allowed)
        self.assertEqual(rejected.limit_type, "account_quota")
        self.assertEqual(rejected.retry_after_seconds, 14_400)

        now[0] = 14_400.0
        self.assertTrue(limiter.check("client-c", "reviewer").allowed)

    def test_released_quota_reservation_can_be_used_again(self) -> None:
        limiter = AskRateLimiter(0, 0, account_quota=1, clock=lambda: 0.0)
        decision = limiter.check("client-a", "reviewer")

        self.assertIsNotNone(decision.quota_reservation)
        assert decision.quota_reservation is not None
        limiter.release_quota(decision.quota_reservation)

        self.assertTrue(limiter.check("client-b", "reviewer").allowed)
