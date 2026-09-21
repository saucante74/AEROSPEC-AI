from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient, Response
from langchain_core.documents import Document

from backend.app.main import app, get_retrieval_index, load_retrieval_index


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


class SearchApiTest(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.vector_store = FakeVectorStore()

        async def override_retrieval_index() -> FakeVectorStore:
            return self.vector_store

        app.dependency_overrides[get_retrieval_index] = override_retrieval_index

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    async def request(self, method: str, path: str, **kwargs: object) -> Response:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            return await client.request(method, path, **kwargs)

    async def test_health(self) -> None:
        response = await self.request("GET", "/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

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
