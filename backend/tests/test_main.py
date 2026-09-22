import json
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch
from uuid import UUID

from httpx import ASGITransport, AsyncClient, Response
from langchain_core.documents import Document
from openai import OpenAIError

from backend.app.generation import ABSTENTION_MESSAGE
from backend.app.main import (
    FRONTEND_ORIGINS,
    app,
    get_retrieval_index,
    get_text_generator,
    load_retrieval_index,
)


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

        async def override_retrieval_index() -> FakeVectorStore:
            return self.vector_store

        async def override_text_generator() -> FakeTextGenerator:
            return self.text_generator

        app.dependency_overrides[get_retrieval_index] = override_retrieval_index
        app.dependency_overrides[get_text_generator] = override_text_generator

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    async def request(
        self,
        method: str,
        path: str,
        json: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Response:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            return await client.request(method, path, json=json, headers=headers)

    async def test_health(self) -> None:
        response = await self.request("GET", "/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    async def test_cors_allows_configured_frontend_origin(self) -> None:
        origin = FRONTEND_ORIGINS[0]
        response = await self.request(
            "OPTIONS",
            "/ask",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], origin)

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
