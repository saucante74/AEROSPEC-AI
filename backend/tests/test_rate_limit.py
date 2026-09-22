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
