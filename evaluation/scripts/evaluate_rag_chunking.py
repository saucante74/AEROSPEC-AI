import argparse
from pathlib import Path
from typing import Any

from langchain_core.documents import Document

from backend.app.retrieval import build_retrieval_index
from evaluation.scripts.evaluate_rag import (
    evidence_hit_at_k,
    evidence_matches_document,
    load_cases,
    source_hit_at_k,
)

TOP_K = 3
EXPECTED_ANSWERABLE_CASES = 8


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare two chunking configurations without generation."
    )
    parser.add_argument("pdf_directory", type=Path)
    parser.add_argument("cases_path", type=Path)
    return parser.parse_args()


def find_fact_evidence(
    fact: dict[str, Any],
    matches: list[tuple[Document, float]],
) -> dict[str, Any] | None:
    for rank, (document, _) in enumerate(matches, start=1):
        for evidence in fact["evidence"]:
            if evidence_matches_document(evidence, document):
                return {
                    "fact": fact["fact"],
                    "rank": rank,
                    "source": evidence["source"],
                    "page_label": evidence["page_label"],
                    "text_anchor": evidence["text_anchor"],
                }
    return None


def evaluate_configuration(
    name: str,
    chunk_size: int,
    chunk_overlap: int,
    pdf_directory: Path,
    cases: list[dict[str, Any]],
) -> dict[str, Any]:
    vector_store, _, _, chunk_count = build_retrieval_index(
        pdf_directory,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    results: list[dict[str, Any]] = []

    for case in cases:
        matches = vector_store.similarity_search_with_score(
            case["question"],
            k=TOP_K,
        )
        results.append(
            {
                "id": case["id"],
                "source_hit_at_1": source_hit_at_k(case, matches, 1),
                "source_hit_at_3": source_hit_at_k(case, matches, TOP_K),
                "evidence_hit_at_1": evidence_hit_at_k(case, matches, 1),
                "evidence_hit_at_3": evidence_hit_at_k(case, matches, TOP_K),
                "matched_evidence": [
                    find_fact_evidence(fact, matches)
                    for fact in case["required_facts"]
                ],
            }
        )

    return {
        "name": name,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "chunk_count": chunk_count,
        "results": results,
    }


def count_hits(results: list[dict[str, Any]], metric: str) -> int:
    return sum(1 for result in results if result[metric])


def format_evidence(evidence: dict[str, Any] | None) -> str:
    if evidence is None:
        return "preuve absente du top 3"
    return (
        f"rang {evidence['rank']}, {evidence['source']} "
        f"p. {evidence['page_label']}, ancre « {evidence['text_anchor']} »"
    )


def print_summary(configurations: list[dict[str, Any]]) -> None:
    case_count = len(configurations[0]["results"])
    print("\nMétriques")
    print("configuration | Source Hit@1 | Source Hit@3 | Evidence Hit@1 | Evidence Hit@3")
    for configuration in configurations:
        results = configuration["results"]
        metrics = [
            count_hits(results, "source_hit_at_1"),
            count_hits(results, "source_hit_at_3"),
            count_hits(results, "evidence_hit_at_1"),
            count_hits(results, "evidence_hit_at_3"),
        ]
        formatted = " | ".join(f"{value}/{case_count}" for value in metrics)
        print(
            f"{configuration['name']} ({configuration['chunk_count']} chunks) "
            f"| {formatted}"
        )


def print_case_comparison(
    baseline: dict[str, Any],
    candidate: dict[str, Any],
) -> None:
    print("\nComparaison par cas")
    print("ID | baseline EH@3 | candidate EH@3 | évolution")
    changed: list[tuple[dict[str, Any], dict[str, Any], str]] = []

    for baseline_result, candidate_result in zip(
        baseline["results"], candidate["results"], strict=True
    ):
        baseline_hit = baseline_result["evidence_hit_at_3"]
        candidate_hit = candidate_result["evidence_hit_at_3"]
        if baseline_hit == candidate_hit:
            evolution = "inchangé"
        elif candidate_hit:
            evolution = "amélioration"
        else:
            evolution = "dégradation"
        print(
            f"{baseline_result['id']} | {baseline_hit} | "
            f"{candidate_hit} | {evolution}"
        )
        if baseline_hit != candidate_hit:
            changed.append((baseline_result, candidate_result, evolution))

    if not changed:
        print("\nAucun cas ne change pour Evidence Hit@3.")
        return

    print("\nPreuves des cas modifiés")
    for baseline_result, candidate_result, evolution in changed:
        relevant_result = (
            candidate_result if evolution == "amélioration" else baseline_result
        )
        action = "retrouvée" if evolution == "amélioration" else "perdue"
        evidence_details = "; ".join(
            format_evidence(evidence)
            for evidence in relevant_result["matched_evidence"]
        )
        print(f"{baseline_result['id']}: preuve {action}: {evidence_details}")


def main() -> None:
    args = parse_args()
    cases = [case for case in load_cases(args.cases_path) if case["answerable"]]
    if len(cases) != EXPECTED_ANSWERABLE_CASES:
        raise ValueError(
            f"Expected {EXPECTED_ANSWERABLE_CASES} answerable cases, got {len(cases)}."
        )

    baseline = evaluate_configuration(
        "baseline 1000/200",
        1000,
        200,
        args.pdf_directory,
        cases,
    )
    candidate = evaluate_configuration(
        "candidate 500/100",
        500,
        100,
        args.pdf_directory,
        cases,
    )
    print_summary([baseline, candidate])
    print_case_comparison(baseline, candidate)


if __name__ == "__main__":
    main()
