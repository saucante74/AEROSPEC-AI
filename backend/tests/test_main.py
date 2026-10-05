import json
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch
from uuid import UUID

import bcrypt
from httpx import ASGITransport, AsyncClient, Response
from langchain_core.documents import Document
from openai import OpenAIError

from backend.app.auth import DemoAuthenticator
from backend.app.generation import ABSTENTION_MESSAGE
from backend.app.main import (
    FRONTEND_ORIGINS,
    app,
    get_ask_rate_limiter,
    get_demo_authenticator,
    get_login_rate_limiter,
    get_retrieval_index,
    get_text_generator,
    load_retrieval_index,
)
from backend.app.rate_limit import AskRateLimiter


class FakeVectorStore:
    def similarity_search_with_score(
        self,
        query: str,
        k: int,
    ) -> list[tuple[Document, float]]:
        document = Document(
            page_content=f"Result for {query}",
            metadata={
                "source": "/internal/corpus/datasheet.pdf",
                "page": 4,
                "page_label": "5",
            },
        )
        return [(document, 0.125)][:k]


class FakeTextGenerator:
    def __init__(
        self,
        answer: str = "The helium leak rate is 1 × 10⁻⁶ atm·cm³/s.",
    ) -> None:
        self.answer = answer

    def generate(self, prompt: str) -> str:
        return self.answer


class FailingTextGenerator:
    def generate(self, prompt: str) -> str:
        raise OpenAIError("secret provider diagnostic")


class SearchApiTest(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.vector_store = FakeVectorStore()
        self.text_generator = FakeTextGenerator()
        self.retrieval_dependency_calls = 0
        self.generator_dependency_calls = 0
        self.rate_limiter = AskRateLimiter(1_000, 10_000)
        self.login_rate_limiter = AskRateLimiter(100, 0)
        self.demo_password = "reviewer-password"
        self.demo_password_hash = bcrypt.hashpw(
            self.demo_password.encode(),
            bcrypt.gensalt(rounds=4),
        ).decode()
        self.authenticator = DemoAuthenticator(
            "reviewer",
            self.demo_password_hash,
        )
        session = self.authenticator.login("reviewer", self.demo_password)
        assert session is not None
        self.access_token = session.access_token

        async def override_retrieval_index() -> FakeVectorStore:
            self.retrieval_dependency_calls += 1
            return self.vector_store

        async def override_text_generator() -> FakeTextGenerator:
            self.generator_dependency_calls += 1
            return self.text_generator

        async def override_rate_limiter() -> AskRateLimiter:
            return self.rate_limiter

        async def override_login_rate_limiter() -> AskRateLimiter:
            return self.login_rate_limiter

        async def override_authenticator() -> DemoAuthenticator:
            return self.authenticator

        app.dependency_overrides[get_retrieval_index] = override_retrieval_index
        app.dependency_overrides[get_text_generator] = override_text_generator
        app.dependency_overrides[get_ask_rate_limiter] = override_rate_limiter
        app.dependency_overrides[get_login_rate_limiter] = (
            override_login_rate_limiter
        )
        app.dependency_overrides[get_demo_authenticator] = override_authenticator

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    async def request(
        self,
        method: str,
        path: str,
        json: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
        client_ip: str = "127.0.0.1",
        authenticate: bool = True,
    ) -> Response:
        request_headers = dict(headers or {})
        if authenticate and path in {"/ask", "/auth/status"}:
            request_headers.setdefault(
                "Authorization",
                f"Bearer {self.access_token}",
            )
        async with AsyncClient(
            transport=ASGITransport(app=app, client=(client_ip, 123)),
            base_url="http://test",
        ) as client:
            return await client.request(
                method,
                path,
                json=json,
                headers=request_headers,
            )

    async def test_health(self) -> None:
        response = await self.request("GET", "/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    async def test_login_accepts_valid_credentials(self) -> None:
        response = await self.request(
            "POST",
            "/auth/login",
            json={
                "username": "reviewer",
                "password": self.demo_password,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["token_type"], "bearer")
        self.assertEqual(body["expires_in"], 14_400)
        self.assertEqual(
            self.authenticator.authenticate(body["access_token"]),
            "reviewer",
        )

    async def test_login_rejects_invalid_credentials(self) -> None:
        response = await self.request(
            "POST",
            "/auth/login",
            json={"username": "reviewer", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"detail": "Invalid username or password."},
        )

    async def test_login_limits_repeated_attempts_by_client(self) -> None:
        self.login_rate_limiter = AskRateLimiter(1, 0)

        first = await self.request(
            "POST",
            "/auth/login",
            json={"username": "reviewer", "password": "wrong-password"},
        )
        rejected = await self.request(
            "POST",
            "/auth/login",
            json={"username": "reviewer", "password": "wrong-password"},
        )

        self.assertEqual(first.status_code, 401)
        self.assertEqual(rejected.status_code, 429)
        self.assertEqual(rejected.headers["Retry-After"], "60")

    async def test_login_response_does_not_expose_credentials_or_hash(self) -> None:
        response = await self.request(
            "POST",
            "/auth/login",
            json={
                "username": "reviewer",
                "password": self.demo_password,
            },
        )

        response_text = response.text
        self.assertNotIn(self.demo_password, response_text)
        self.assertNotIn(self.demo_password_hash, response_text)

    async def test_usage_status_reports_current_account_quota_window(self) -> None:
        self.rate_limiter = AskRateLimiter(
            0,
            100,
            account_quota=20,
            quota_window_seconds=14_400,
            clock=lambda: 14_460.0,
        )
        ask_response = await self.request(
            "POST",
            "/ask",
            json={"question": "Count this request"},
        )

        response = await self.request("GET", "/auth/status")

        self.assertEqual(ask_response.status_code, 200)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "quota_limit": 20,
                "requests_used": 1,
                "requests_remaining": 19,
                "reset_at": "1970-01-01T08:00:00Z",
            },
        )

    async def test_usage_status_requires_authentication(self) -> None:
        response = await self.request(
            "GET",
            "/auth/status",
            authenticate=False,
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"detail": "Authentication required."},
        )

    async def test_usage_status_does_not_consume_quota(self) -> None:
        self.rate_limiter = AskRateLimiter(0, 100, account_quota=1)

        first_status = await self.request("GET", "/auth/status")
        second_status = await self.request("GET", "/auth/status")
        allowed = await self.request(
            "POST",
            "/ask",
            json={"question": "Still available"},
        )
        rejected = await self.request(
            "POST",
            "/ask",
            json={"question": "Quota used"},
        )

        self.assertEqual(first_status.json()["requests_remaining"], 1)
        self.assertEqual(second_status.json()["requests_remaining"], 1)
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(rejected.status_code, 429)

    async def test_cors_allows_configured_frontend_origin(self) -> None:
        origin = FRONTEND_ORIGINS[0]
        response = await self.request(
            "OPTIONS",
            "/ask",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], origin)
        self.assertIn(
            "Authorization",
            response.headers["access-control-allow-headers"],
        )

    async def test_cors_rejects_unconfigured_origin(self) -> None:
        origin = "https://unauthorized.invalid"
        self.assertNotIn(origin, FRONTEND_ORIGINS)

        response = await self.request(
            "OPTIONS",
            "/ask",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        self.assertNotIn("access-control-allow-origin", response.headers)

    async def test_convert_millimeters_to_inches(self) -> None:
        response = await self.request(
            "POST",
            "/convert",
            json={"value": 25.4, "from_unit": "mm", "to_unit": "inch"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "value": 25.4,
                "from_unit": "mm",
                "to_unit": "inch",
                "converted_value": 1.0,
            },
        )

    async def test_convert_newtons_to_pounds_force(self) -> None:
        response = await self.request(
            "POST",
            "/convert",
            json={"value": 100, "from_unit": "N", "to_unit": "lbf"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["value"], 100.0)
        self.assertAlmostEqual(
            response.json()["converted_value"],
            22.48089430997105,
            places=14,
        )

    async def test_convert_celsius_to_fahrenheit(self) -> None:
        response = await self.request(
            "POST",
            "/convert",
            json={"value": 0, "from_unit": "°C", "to_unit": "°F"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["converted_value"], 32.0)

    async def test_convert_rejects_unknown_unit(self) -> None:
        response = await self.request(
            "POST",
            "/convert",
            json={"value": 1, "from_unit": "cm", "to_unit": "mm"},
        )

        self.assertEqual(response.status_code, 422)

    async def test_convert_rejects_unsupported_pair(self) -> None:
        response = await self.request(
            "POST",
            "/convert",
            json={"value": 1, "from_unit": "mm", "to_unit": "N"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json(),
            {"detail": "Conversion non supportée : mm -> N"},
        )

    async def test_convert_rejects_invalid_request(self) -> None:
        response = await self.request(
            "POST",
            "/convert",
            json={"value": "not-a-number", "from_unit": "mm", "to_unit": "inch"},
        )

        self.assertEqual(response.status_code, 422)

    async def test_search_returns_retrieval_metadata(self) -> None:
        response = await self.request(
            "POST",
            "/search",
            json={"query": "What is the helium leak rate?", "top_k": 3},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "query": "What is the helium leak rate?",
                "results": [
                    {
                        "content": "Result for What is the helium leak rate?",
                        "source": "datasheet.pdf",
                        "page": 4,
                        "page_label": "5",
                        "distance": 0.125,
                    }
                ],
            },
        )

    async def test_search_rejects_blank_query(self) -> None:
        response = await self.request(
            "POST",
            "/search",
            json={"query": "   ", "top_k": 3},
        )

        self.assertEqual(response.status_code, 422)

    async def test_search_rejects_top_k_outside_limits(self) -> None:
        for top_k in (0, 21):
            with self.subTest(top_k=top_k):
                response = await self.request(
                    "POST",
                    "/search",
                    json={"query": "leak rate", "top_k": top_k},
                )

                self.assertEqual(response.status_code, 422)

    async def test_search_returns_503_when_corpus_initialization_fails(self) -> None:
        app.dependency_overrides.clear()
        load_retrieval_index.cache_clear()

        with patch(
            "backend.app.main.build_retrieval_index",
            side_effect=ValueError("Aucun PDF trouvé"),
        ):
            response = await self.request(
                "POST",
                "/search",
                json={"query": "leak rate", "top_k": 3},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Aucun PDF trouvé"})

    async def test_ask_returns_grounded_answer_and_retrieval_sources(self) -> None:
        with self.assertLogs("backend.app.main", level="INFO") as captured_logs:
            response = await self.request(
                "POST",
                "/ask",
                json={"question": "What is the helium leak rate?", "top_k": 3},
            )

        self.assertEqual(response.status_code, 200)
        request_id = response.headers["X-Request-ID"]
        self.assertEqual(str(UUID(request_id)), request_id)
        self.assertEqual(
            response.json(),
            {
                "question": "What is the helium leak rate?",
                "answer": "The helium leak rate is 1 × 10⁻⁶ atm·cm³/s.",
                "sources": [
                    {
                        "source": "datasheet.pdf",
                        "page": 4,
                        "page_label": "5",
                    }
                ],
                "citations": [],
            },
        )
        event = json.loads(captured_logs.records[0].getMessage())
        self.assertEqual(event["event"], "rag_request_completed")
        self.assertEqual(event["request_id"], request_id)
        self.assertEqual(event["status"], "answered")
        self.assertEqual(event["retrieved_count"], 1)
        self.assertEqual(event["citation_count"], 0)
        for duration_name in (
            "total_duration_ms",
            "retrieval_duration_ms",
            "generation_duration_ms",
        ):
            self.assertGreaterEqual(event[duration_name], 0)

    async def test_ask_rejects_missing_authentication_before_workflow(self) -> None:
        response = await self.request(
            "POST",
            "/ask",
            json={"question": "Protected question"},
            authenticate=False,
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Authentication required."})
        self.assertEqual(self.retrieval_dependency_calls, 0)
        self.assertEqual(self.generator_dependency_calls, 0)

    async def test_ask_rejects_expired_authentication_before_workflow(self) -> None:
        now = [0.0]
        self.authenticator = DemoAuthenticator(
            "reviewer",
            self.demo_password_hash,
            clock=lambda: now[0],
        )
        session = self.authenticator.login("reviewer", self.demo_password)
        assert session is not None
        self.access_token = session.access_token
        now[0] = 14_400.0

        response = await self.request(
            "POST",
            "/ask",
            json={"question": "Expired session"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"detail": "Authentication is invalid or expired."},
        )
        self.assertEqual(self.retrieval_dependency_calls, 0)
        self.assertEqual(self.generator_dependency_calls, 0)

    async def test_ask_returns_a_distinct_request_id_for_each_request(self) -> None:
        first_response = await self.request(
            "POST",
            "/ask",
            json={"question": "First question", "top_k": 3},
        )
        second_response = await self.request(
            "POST",
            "/ask",
            json={"question": "Second question", "top_k": 3},
        )

        self.assertNotEqual(
            first_response.headers["X-Request-ID"],
            second_response.headers["X-Request-ID"],
        )

    async def test_ask_logs_abstention_without_sensitive_content(self) -> None:
        sensitive_question = "SENSITIVE_QUESTION_42"
        sensitive_answer = ABSTENTION_MESSAGE
        self.text_generator = FakeTextGenerator(sensitive_answer)

        with self.assertLogs("backend.app.main", level="INFO") as captured_logs:
            response = await self.request(
                "POST",
                "/ask",
                json={"question": sensitive_question, "top_k": 3},
            )

        event_text = captured_logs.records[0].getMessage()
        event = json.loads(event_text)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(event["status"], "abstained")
        self.assertNotIn(sensitive_question, event_text)
        self.assertNotIn(f"Result for {sensitive_question}", event_text)
        self.assertNotIn(sensitive_answer, event_text)

    async def test_ask_returns_only_valid_resolved_citations(self) -> None:
        self.text_generator = FakeTextGenerator(
            "The helium leak rate is documented [S1], not [S99]."
        )

        response = await self.request(
            "POST",
            "/ask",
            json={"question": "What is the helium leak rate?", "top_k": 3},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["citations"],
            [
                {
                    "id": "S1",
                    "source": "datasheet.pdf",
                    "page": 4,
                    "page_label": "5",
                }
            ],
        )

    async def test_ask_rejects_blank_question(self) -> None:
        response = await self.request(
            "POST",
            "/ask",
            json={"question": "   ", "top_k": 3},
        )

        self.assertEqual(response.status_code, 422)

    async def test_ask_rejects_top_k_outside_limits(self) -> None:
        for top_k in (0, 21):
            with self.subTest(top_k=top_k):
                response = await self.request(
                    "POST",
                    "/ask",
                    json={"question": "helium leak rate", "top_k": top_k},
                )

                self.assertEqual(response.status_code, 422)

    async def test_ask_returns_safe_error_when_llm_provider_fails(self) -> None:
        async def override_text_generator() -> FailingTextGenerator:
            return FailingTextGenerator()

        app.dependency_overrides[get_text_generator] = override_text_generator

        with self.assertLogs("backend.app.main", level="ERROR") as captured_logs:
            response = await self.request(
                "POST",
                "/ask",
                json={"question": "What is the helium leak rate?", "top_k": 3},
            )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json(),
            {"detail": "Le fournisseur LLM n'a pas pu générer de réponse."},
        )
        request_id = response.headers["X-Request-ID"]
        event_text = captured_logs.records[0].getMessage()
        event = json.loads(event_text)
        self.assertNotIn("secret provider diagnostic", response.text)
        self.assertEqual(event["event"], "rag_request_completed")
        self.assertEqual(event["request_id"], request_id)
        self.assertEqual(event["status"], "error")
        self.assertEqual(event["error_type"], "OpenAIError")
        self.assertGreaterEqual(event["total_duration_ms"], 0)
        self.assertNotIn("What is the helium leak rate?", event_text)
        self.assertNotIn("Result for What is the helium leak rate?", event_text)
        self.assertNotIn("secret provider diagnostic", event_text)

    async def test_ask_enforces_per_minute_limit_before_rag_dependencies(
        self,
    ) -> None:
        self.rate_limiter = AskRateLimiter(2, 10)

        first = await self.request("POST", "/ask", json={"question": "First"})
        second = await self.request("POST", "/ask", json={"question": "Second"})
        rejected = await self.request(
            "POST",
            "/ask",
            json={"question": "Rejected"},
        )

        self.assertEqual([first.status_code, second.status_code], [200, 200])
        self.assertEqual(rejected.status_code, 429)
        self.assertEqual(
            rejected.json(),
            {"detail": "Trop de requêtes. Réessayez plus tard."},
        )
        self.assertIn("X-Request-ID", rejected.headers)
        self.assertEqual(self.retrieval_dependency_calls, 2)
        self.assertEqual(self.generator_dependency_calls, 2)

    async def test_ask_per_minute_limit_is_separate_for_each_client(self) -> None:
        self.rate_limiter = AskRateLimiter(1, 10)

        first_client = await self.request(
            "POST",
            "/ask",
            json={"question": "First client"},
            client_ip="192.0.2.1",
        )
        second_client = await self.request(
            "POST",
            "/ask",
            json={"question": "Second client"},
            client_ip="192.0.2.2",
        )

        self.assertEqual(first_client.status_code, 200)
        self.assertEqual(second_client.status_code, 200)

    async def test_ask_uses_render_forwarded_client_ip_only_on_render(self) -> None:
        self.rate_limiter = AskRateLimiter(1, 10)

        with patch.dict("os.environ", {"RENDER": "true"}):
            first_client = await self.request(
                "POST",
                "/ask",
                json={"question": "First client"},
                headers={"X-Forwarded-For": "198.51.100.1"},
            )
            second_client = await self.request(
                "POST",
                "/ask",
                json={"question": "Second client"},
                headers={"X-Forwarded-For": "198.51.100.2"},
            )

        self.assertEqual(first_client.status_code, 200)
        self.assertEqual(second_client.status_code, 200)

    async def test_ask_ignores_forged_forwarded_ip_outside_render(self) -> None:
        self.rate_limiter = AskRateLimiter(1, 10)

        with patch.dict("os.environ", {"RENDER": ""}):
            allowed = await self.request(
                "POST",
                "/ask",
                json={"question": "Allowed"},
                headers={"X-Forwarded-For": "198.51.100.1"},
            )
            rejected = await self.request(
                "POST",
                "/ask",
                json={"question": "Rejected"},
                headers={"X-Forwarded-For": "198.51.100.2"},
            )

        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(rejected.status_code, 429)

    async def test_ask_daily_limit_is_global_across_clients(self) -> None:
        self.rate_limiter = AskRateLimiter(0, 2)

        responses = [
            await self.request(
                "POST",
                "/ask",
                json={"question": f"Question {index}"},
                client_ip=f"192.0.2.{index}",
            )
            for index in range(1, 4)
        ]

        self.assertEqual(
            [response.status_code for response in responses],
            [200, 200, 429],
        )
        self.assertEqual(self.retrieval_dependency_calls, 2)
        self.assertEqual(self.generator_dependency_calls, 2)

    async def test_ask_enforces_authenticated_account_quota(self) -> None:
        self.rate_limiter = AskRateLimiter(0, 100, account_quota=2)

        responses = [
            await self.request(
                "POST",
                "/ask",
                json={"question": f"Question {index}"},
            )
            for index in range(1, 4)
        ]

        self.assertEqual(
            [response.status_code for response in responses],
            [200, 200, 429],
        )
        self.assertEqual(
            responses[2].json()["detail"]["code"],
            "demo_quota_exhausted",
        )
        self.assertIn("Retry-After", responses[2].headers)
        self.assertEqual(self.retrieval_dependency_calls, 2)
        self.assertEqual(self.generator_dependency_calls, 2)

    async def test_intentional_abstention_consumes_quota(self) -> None:
        self.rate_limiter = AskRateLimiter(0, 100, account_quota=1)
        self.text_generator = FakeTextGenerator(ABSTENTION_MESSAGE)

        abstention = await self.request(
            "POST",
            "/ask",
            json={"question": "Unsupported question"},
        )
        rejected = await self.request(
            "POST",
            "/ask",
            json={"question": "Another question"},
        )

        self.assertEqual(abstention.status_code, 200)
        self.assertEqual(rejected.status_code, 429)

    async def test_technical_failure_releases_reserved_quota(self) -> None:
        self.rate_limiter = AskRateLimiter(0, 100, account_quota=1)

        async def override_failing_generator() -> FailingTextGenerator:
            return FailingTextGenerator()

        app.dependency_overrides[get_text_generator] = override_failing_generator
        failed = await self.request(
            "POST",
            "/ask",
            json={"question": "Provider failure"},
        )

        async def override_working_generator() -> FakeTextGenerator:
            return FakeTextGenerator()

        app.dependency_overrides[get_text_generator] = override_working_generator
        successful = await self.request(
            "POST",
            "/ask",
            json={"question": "Retry after failure"},
        )

        self.assertEqual(failed.status_code, 502)
        self.assertEqual(successful.status_code, 200)

    async def test_rate_limited_log_excludes_sensitive_content(self) -> None:
        self.rate_limiter = AskRateLimiter(1, 10)
        await self.request("POST", "/ask", json={"question": "Allowed"})
        sensitive_question = "SENSITIVE_RATE_LIMITED_QUESTION"

        with self.assertLogs("backend.app.main", level="INFO") as captured_logs:
            response = await self.request(
                "POST",
                "/ask",
                json={"question": sensitive_question},
            )

        event_text = captured_logs.records[0].getMessage()
        event = json.loads(event_text)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(event["event"], "rag_request_rate_limited")
        self.assertEqual(event["request_id"], response.headers["X-Request-ID"])
        self.assertEqual(event["status"], "rate_limited")
        self.assertEqual(event["limit_type"], "per_minute")
        self.assertNotIn(sensitive_question, event_text)
        self.assertNotIn("Result for", event_text)
        self.assertNotIn("The helium leak rate", event_text)

    async def test_health_and_convert_are_not_rate_limited(self) -> None:
        self.rate_limiter = AskRateLimiter(1, 1)

        health_responses = [await self.request("GET", "/health") for _ in range(3)]
        convert_responses = [
            await self.request(
                "POST",
                "/convert",
                json={"value": 25.4, "from_unit": "mm", "to_unit": "inch"},
            )
            for _ in range(3)
        ]

        self.assertTrue(
            all(response.status_code == 200 for response in health_responses)
        )
        self.assertTrue(
            all(response.status_code == 200 for response in convert_responses)
        )
