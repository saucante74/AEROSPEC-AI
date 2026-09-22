import argparse
import json
import os
import platform
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langchain_core.documents import Document

from backend.app.generation import (
    ABSTENTION_MESSAGE,
    DEFAULT_LLM_MODEL,
    OpenAITextGenerator,
    TextGenerator,
)
from backend.app.rag import RagResult, answer_question
from backend.app.retrieval import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    EMBEDDING_MODEL,
    EMBEDDING_MODEL_REVISION,
    SimilaritySearchStore,
    build_retrieval_index,
)

TOP_K = 3
DEFAULT_OUTPUT_PATH = Path("evaluation/rag_run.json")


class RecordingSimilaritySearchStore:
    def __init__(self, store: SimilaritySearchStore) -> None:
        self.store = store
        self.last_matches: list[tuple[Document, float]] = []

    def similarity_search_with_score(
        self,
        query: str,
        k: int,
    ) -> list[tuple[Document, float]]:
        self.last_matches = self.store.similarity_search_with_score(query, k)
        return self.last_matches


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Exécute le benchmark RAG E2E et écrit un artefact auditable."
    )
    parser.add_argument("pdf_directory", type=Path)
    parser.add_argument("cases_path", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--model", default=DEFAULT_LLM_MODEL)
    return parser.parse_args()


def load_cases(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise SystemExit(f"Dataset introuvable : {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("Le dataset RAG doit être une liste JSON.")
    return data


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return " ".join(normalized.split()).casefold()


def document_source(document: Document) -> str:
    return Path(str(document.metadata["source"])).name


def source_hit_at_k(
    case: dict[str, Any],
    matches: list[tuple[Document, float]],
    k: int,
) -> bool:
    expected_sources = {
        evidence["source"]
        for fact in case["required_facts"]
        for evidence in fact["evidence"]
    }
    return any(
        document_source(document) in expected_sources
        for document, _ in matches[:k]
    )


def evidence_matches_document(
    evidence: dict[str, Any],
    document: Document,
) -> bool:
    return (
        document_source(document) == evidence["source"]
        and str(document.metadata["page_label"]) == evidence["page_label"]
        and normalize_text(evidence["text_anchor"])
        in normalize_text(document.page_content)
    )


def evidence_hit_at_k(
    case: dict[str, Any],
    matches: list[tuple[Document, float]],
    k: int,
) -> bool:
    top_matches = matches[:k]
    return all(
        any(
            evidence_matches_document(evidence, document)
            for evidence in fact["evidence"]
            for document, _ in top_matches
        )
        for fact in case["required_facts"]
    )


def serialize_passages(
    matches: list[tuple[Document, float]],
) -> list[dict[str, Any]]:
    return [
        {
            "rank": rank,
            "content": document.page_content,
            "source": document_source(document),
            "page": int(document.metadata["page"]),
            "page_label": str(document.metadata["page_label"]),
            "distance": float(distance),
        }
        for rank, (document, distance) in enumerate(matches, start=1)
    ]


def serialize_citations(result: RagResult) -> dict[str, Any]:
    valid_ids = result.citation_validation.valid_ids
    unknown_ids = result.citation_validation.unknown_ids
    resolved = [
        {
            "id": citation_id,
            "source": source.source,
            "page": source.page,
            "page_label": source.page_label,
        }
        for citation_id, source in result.citation_sources.items()
    ]
    emitted_ids = valid_ids + unknown_ids

    return {
        "citations_present": bool(emitted_ids),
        "valid_ids": valid_ids,
        "unknown_ids": unknown_ids,
        "all_emitted_ids_valid": bool(emitted_ids) and not unknown_ids,
        "all_valid_ids_resolved": len(resolved) == len(valid_ids),
        "resolved": resolved,
    }


def evaluate_case(
    case: dict[str, Any],
    store: RecordingSimilaritySearchStore,
    llm: TextGenerator,
) -> dict[str, Any]:
    result = answer_question(store, case["question"], TOP_K, llm)
    matches = store.last_matches
    abstention_detected = result.answer.strip() == ABSTENTION_MESSAGE

    retrieval_metrics = None
    if case["answerable"]:
        retrieval_metrics = {
            "source_hit_at_1": source_hit_at_k(case, matches, 1),
            "source_hit_at_3": source_hit_at_k(case, matches, TOP_K),
            "evidence_hit_at_1": evidence_hit_at_k(case, matches, 1),
            "evidence_hit_at_3": evidence_hit_at_k(case, matches, TOP_K),
        }

    return {
        "id": case["id"],
        "question": case["question"],
        "answerable": case["answerable"],
        "ground_truth": {
            "reference_answer": case["reference_answer"],
            "required_facts": case["required_facts"],
            "unanswerable_reason": case["unanswerable_reason"],
        },
        "response_raw": result.answer,
        "passages": serialize_passages(matches),
        "citations": serialize_citations(result),
        "abstention": {
            "detected": abstention_detected,
            "correct_on_unanswerable": (
                abstention_detected and not case["answerable"]
            ),
            "false_on_answerable": abstention_detected and case["answerable"],
        },
        "retrieval_metrics": retrieval_metrics,
        "human_review": {
            "answer_correct": None,
            "fully_grounded": None,
            "citation_coverage_pass": None,
            "citation_support_pass": None,
            "review_note": None,
        },
    }


def metric(count: int, total: int) -> dict[str, int | float | None]:
    percentage = round(count / total * 100, 1) if total else None
    return {"count": count, "total": total, "percentage": percentage}


def build_summary(results: list[dict[str, Any]]) -> dict[str, Any]:
    answerable_results = [result for result in results if result["answerable"]]
    unanswerable_results = [
        result for result in results if not result["answerable"]
    ]

    retrieval_names = (
        "source_hit_at_1",
        "source_hit_at_3",
        "evidence_hit_at_1",
        "evidence_hit_at_3",
    )
    retrieval = {
        name: metric(
            sum(result["retrieval_metrics"][name] for result in answerable_results),
            len(answerable_results),
        )
        for name in retrieval_names
    }

    emitted_id_count = sum(
        len(result["citations"]["valid_ids"])
        + len(result["citations"]["unknown_ids"])
        for result in results
    )
    valid_id_count = sum(
        len(result["citations"]["valid_ids"]) for result in results
    )
    resolved_id_count = sum(
        len(result["citations"]["resolved"]) for result in results
    )

    return {
        "cases": len(results),
        "answerable_cases": len(answerable_results),
        "unanswerable_cases": len(unanswerable_results),
        "retrieval": retrieval,
        "abstention": {
            "correct_on_unanswerable": metric(
                sum(
                    result["abstention"]["correct_on_unanswerable"]
                    for result in unanswerable_results
                ),
                len(unanswerable_results),
            ),
            "false_on_answerable": metric(
                sum(
                    result["abstention"]["false_on_answerable"]
                    for result in answerable_results
                ),
                len(answerable_results),
            ),
        },
        "citations": {
            "responses_with_citations": metric(
                sum(result["citations"]["citations_present"] for result in results),
                len(results),
            ),
            "valid_emitted_ids": metric(valid_id_count, emitted_id_count),
            "resolved_valid_ids": metric(resolved_id_count, valid_id_count),
            "responses_with_unknown_ids": metric(
                sum(bool(result["citations"]["unknown_ids"]) for result in results),
                len(results),
            ),
        },
    }


def format_metric(name: str, value: dict[str, Any]) -> str:
    percentage = value["percentage"]
    suffix = "n/a" if percentage is None else f"{percentage:.1f}%"
    return f"{name}: {value['count']}/{value['total']} ({suffix})"


def print_summary(summary: dict[str, Any]) -> None:
    print("\n--- Résumé RAG E2E ---")
    print(
        f"Cas : {summary['cases']} "
        f"({summary['answerable_cases']} answerable, "
        f"{summary['unanswerable_cases']} unanswerable)"
    )

    retrieval = summary["retrieval"]
    print(format_metric("Source Hit@1", retrieval["source_hit_at_1"]))
    print(format_metric("Source Hit@3", retrieval["source_hit_at_3"]))
    print(format_metric("Evidence Hit@1", retrieval["evidence_hit_at_1"]))
    print(format_metric("Evidence Hit@3", retrieval["evidence_hit_at_3"]))

    abstention = summary["abstention"]
    print(
        format_metric(
            "Abstentions correctes",
            abstention["correct_on_unanswerable"],
        )
    )
    print(
        format_metric(
            "Fausses abstentions",
            abstention["false_on_answerable"],
        )
    )

    citations = summary["citations"]
    print(
        format_metric(
            "Réponses avec citations",
            citations["responses_with_citations"],
        )
    )
    print(format_metric("IDs émis valides", citations["valid_emitted_ids"]))
    print(format_metric("IDs valides résolus", citations["resolved_valid_ids"]))
    print(
        format_metric(
            "Réponses avec IDs inconnus",
            citations["responses_with_unknown_ids"],
        )
    )


def main() -> None:
    arguments = parse_arguments()

    if not arguments.pdf_directory.is_dir():
        raise SystemExit(f"Répertoire PDF introuvable : {arguments.pdf_directory}")
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit(
            "OPENAI_API_KEY est requis pour exécuter le benchmark RAG réel."
        )
    if not arguments.output.parent.is_dir():
        raise SystemExit(
            f"Répertoire de sortie introuvable : {arguments.output.parent}"
        )

    cases = load_cases(arguments.cases_path)
    llm = OpenAITextGenerator(model=arguments.model)
    vector_store, pdf_count, document_count, chunk_count = build_retrieval_index(
        arguments.pdf_directory
    )
    recording_store = RecordingSimilaritySearchStore(vector_store)

    print(f"PDF chargés : {pdf_count}")
    print(f"Documents/pages : {document_count}")
    print(f"Chunks indexés : {chunk_count}")
    print(f"Cas à évaluer : {len(cases)}")

    results = []
    for index, case in enumerate(cases, start=1):
        print(f"[{index}/{len(cases)}] {case['id']} — {case['question']}")
        results.append(evaluate_case(case, recording_store, llm))

    summary = build_summary(results)
    artifact = {
        "configuration": {
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "python_version": platform.python_version(),
            "provider": "OpenAI",
            "model": arguments.model,
            "top_k": TOP_K,
            "abstention_message": ABSTENTION_MESSAGE,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_model_revision": EMBEDDING_MODEL_REVISION,
            "chunk_size": DEFAULT_CHUNK_SIZE,
            "chunk_overlap": DEFAULT_CHUNK_OVERLAP,
            "corpus_directory": str(arguments.pdf_directory.resolve()),
            "dataset_path": str(arguments.cases_path.resolve()),
            "pdf_count": pdf_count,
            "document_count": document_count,
            "chunk_count": chunk_count,
        },
        "summary": summary,
        "results": results,
    }
    arguments.output.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print_summary(summary)
    print(f"Artefact écrit : {arguments.output}")


if __name__ == "__main__":
    main()
