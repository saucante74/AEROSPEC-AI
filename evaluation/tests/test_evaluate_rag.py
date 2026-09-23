from unittest import TestCase

from langchain_core.documents import Document

from backend.app.generation import ABSTENTION_MESSAGE
from backend.app.retrieval import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_TOP_K,
)
from evaluation.scripts.evaluate_rag import (
    RecordingSimilaritySearchStore,
    evaluate_case,
    parse_arguments,
)


class StaticSearchStore:
    def __init__(self, matches: list[tuple[Document, float]]) -> None:
        self.matches = matches
        self.requested_k: int | None = None

    def similarity_search_with_score(
        self,
        query: str,
        k: int,
    ) -> list[tuple[Document, float]]:
        self.requested_k = k
        return self.matches[:k]


class AbstainingGenerator:
    def generate(self, prompt: str) -> str:
        return ABSTENTION_MESSAGE


class EvaluateRagTest(TestCase):
    def test_defaults_match_production_retrieval_configuration(self) -> None:
        arguments = parse_arguments(["documents", "cases.json"])

        self.assertEqual(DEFAULT_CHUNK_SIZE, 1_000)
        self.assertEqual(DEFAULT_CHUNK_OVERLAP, 200)
        self.assertEqual(DEFAULT_TOP_K, 3)
        self.assertEqual(arguments.chunk_size, 1_000)
        self.assertEqual(arguments.chunk_overlap, 200)
        self.assertEqual(arguments.top_k, 3)

    def test_chunk_size_experiment_changes_only_chunk_size(self) -> None:
        arguments = parse_arguments(
            ["documents", "cases.json", "--chunk-size", "600"]
        )

        self.assertEqual(arguments.chunk_size, 600)
        self.assertEqual(arguments.chunk_overlap, 200)
        self.assertEqual(arguments.top_k, 3)

    def test_chunk_overlap_experiment_changes_only_chunk_overlap(self) -> None:
        arguments = parse_arguments(
            ["documents", "cases.json", "--chunk-overlap", "400"]
        )

        self.assertEqual(arguments.chunk_size, 1_000)
        self.assertEqual(arguments.chunk_overlap, 400)
        self.assertEqual(arguments.top_k, 3)

    def test_top_k_override_does_not_change_hit_at_3_semantics(self) -> None:
        matches = [
            (
                Document(
                    page_content=(
                        "target evidence" if rank == 4 else f"unrelated {rank}"
                    ),
                    metadata={
                        "source": "target.pdf" if rank == 4 else "other.pdf",
                        "page": rank - 1,
                        "page_label": str(rank),
                    },
                ),
                rank / 10,
            )
            for rank in range(1, 6)
        ]
        inner_store = StaticSearchStore(matches)
        store = RecordingSimilaritySearchStore(inner_store)
        case = {
            "id": "rag-test",
            "question": "Where is the target evidence?",
            "answerable": True,
            "reference_answer": "At rank four.",
            "required_facts": [
                {
                    "fact": "The evidence is at rank four.",
                    "evidence": [
                        {
                            "source": "target.pdf",
                            "page_label": "4",
                            "text_anchor": "target evidence",
                        }
                    ],
                }
            ],
            "unanswerable_reason": None,
        }

        result = evaluate_case(case, store, AbstainingGenerator(), top_k=5)

        self.assertEqual(inner_store.requested_k, 5)
        self.assertEqual(len(result["passages"]), 5)
        self.assertFalse(result["retrieval_metrics"]["source_hit_at_3"])
        self.assertFalse(result["retrieval_metrics"]["evidence_hit_at_3"])
