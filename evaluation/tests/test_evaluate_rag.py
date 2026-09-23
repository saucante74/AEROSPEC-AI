from unittest import TestCase

from langchain_core.documents import Document

from backend.app.generation import ABSTENTION_MESSAGE
from evaluation.scripts.evaluate_rag import (
    RecordingSimilaritySearchStore,
    evaluate_case,
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
