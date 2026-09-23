from unittest import TestCase

from langchain_core.documents import Document

from backend.app.rag import (
    CitationValidation,
    RagSource,
    _validate_citations,
    answer_question,
)


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
    def __init__(self, answer: str = "Grounded answer [S1][S3]") -> None:
        self.answer = answer
        self.received_prompt: str | None = None

    def generate(self, prompt: str) -> str:
        self.received_prompt = prompt
        return self.answer


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

        self.assertEqual(result.answer, "Grounded answer [S1][S3]")
        self.assertEqual(
            result.sources,
            [
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
        )
        self.assertEqual(
            result.citation_validation,
            CitationValidation(valid_ids=["[S1]", "[S3]"], unknown_ids=[]),
        )
        self.assertEqual(
            result.citation_sources,
            {
                "[S1]": RagSource(
                    source="datasheet.pdf",
                    page=4,
                    page_label="5",
                ),
                "[S3]": RagSource(
                    source="datasheet.pdf",
                    page=7,
                    page_label="8",
                ),
            },
        )
        self.assertGreaterEqual(result.retrieval_duration_ms, 0)
        self.assertGreaterEqual(result.generation_duration_ms, 0)
        self.assertEqual(result.retrieved_count, 3)
        self.assertEqual(list(result.citation_sources), ["[S1]", "[S3]"])
        received_prompt = llm.received_prompt
        assert received_prompt is not None
        self.assertIn("First chunk from page 5", received_prompt)
        self.assertIn("Second chunk from page 5", received_prompt)
        self.assertIn("Chunk from page 8", received_prompt)

    def test_validate_citations(self) -> None:
        cases = [
            (
                "valid citations",
                "First fact [S1]. Second fact [S2][S3].",
                CitationValidation(
                    valid_ids=["[S1]", "[S2]", "[S3]"],
                    unknown_ids=[],
                ),
            ),
            (
                "unknown citation",
                "Unsupported citation [S99].",
                CitationValidation(valid_ids=[], unknown_ids=["[S99]"]),
            ),
            (
                "duplicate citations",
                "Repeated [S2], then [S1], then [S2] and [S1].",
                CitationValidation(valid_ids=["[S2]", "[S1]"], unknown_ids=[]),
            ),
            (
                "no citation",
                "Answer without a citation.",
                CitationValidation(valid_ids=[], unknown_ids=[]),
            ),
            (
                "valid and unknown citations",
                "Valid [S3], unknown [S0], valid [S1], unknown [S99].",
                CitationValidation(
                    valid_ids=["[S3]", "[S1]"],
                    unknown_ids=["[S0]", "[S99]"],
                ),
            ),
        ]

        for name, answer, expected in cases:
            with self.subTest(name=name):
                self.assertEqual(_validate_citations(answer, 3), expected)

    def test_unknown_or_missing_citations_have_no_resolved_source(self) -> None:
        cases = [
            ("unknown citation", "Unsupported citation [S99]."),
            ("no citation", "Answer without a citation."),
        ]

        for name, answer in cases:
            with self.subTest(name=name):
                result = answer_question(
                    FakeVectorStore(),
                    "What is the helium leak rate?",
                    3,
                    FakeTextGenerator(answer),
                )

                self.assertEqual(result.citation_sources, {})
