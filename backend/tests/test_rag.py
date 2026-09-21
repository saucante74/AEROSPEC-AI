from unittest import TestCase

from langchain_core.documents import Document

from backend.app.rag import RagResult, RagSource, answer_question


class FakeVectorStore:
    def similarity_search_with_score(
        self,
        query: str,
        k: int,
    ) -> list[tuple[Document, float]]:
        matches = [
            (
                Document(
                    page_content="First chunk from page 5",
                    metadata={
                        "source": "/internal/corpus/datasheet.pdf",
                        "page": 4,
                        "page_label": "5",
                    },
                ),
                0.1,
            ),
            (
                Document(
                    page_content="Second chunk from page 5",
                    metadata={
                        "source": "/internal/corpus/datasheet.pdf",
                        "page": 4,
                        "page_label": "5",
                    },
                ),
                0.2,
            ),
            (
                Document(
                    page_content="Chunk from page 8",
                    metadata={
                        "source": "/internal/corpus/datasheet.pdf",
                        "page": 7,
                        "page_label": "8",
                    },
                ),
                0.3,
            ),
        ]
        return matches[:k]


class FakeTextGenerator:
    def __init__(self) -> None:
        self.received_prompt: str | None = None

    def generate(self, prompt: str) -> str:
        self.received_prompt = prompt
        return "Grounded answer [S1][S3]"


class RagWorkflowTest(TestCase):
    def test_answer_question_generates_from_all_chunks_and_deduplicates_sources(
        self,
    ) -> None:
        llm = FakeTextGenerator()

        result = answer_question(
            FakeVectorStore(),
            "What is the helium leak rate?",
            3,
            llm,
        )

        self.assertEqual(
            result,
            RagResult(
                answer="Grounded answer [S1][S3]",
                sources=[
                    RagSource(
                        source="datasheet.pdf",
                        page=4,
                        page_label="5",
                    ),
                    RagSource(
                        source="datasheet.pdf",
                        page=7,
                        page_label="8",
                    ),
                ],
            ),
        )
        self.assertIsNotNone(llm.received_prompt)
        self.assertIn("First chunk from page 5", llm.received_prompt)
        self.assertIn("Second chunk from page 5", llm.received_prompt)
        self.assertIn("Chunk from page 8", llm.received_prompt)
