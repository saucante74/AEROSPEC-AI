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

RANKS = (1, 3, 5, 6)
MAX_RANK = max(RANKS)
EXPECTED_ANSWERABLE_CASES = 8


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Mesure Source Hit et Evidence Hit sans génération LLM."
    )
    parser.add_argument("pdf_directory", type=Path)
    parser.add_argument("cases_path", type=Path)
    return parser.parse_args()


def evidence_ranks(
    case: dict[str, Any],
    matches: list[tuple[Document, float]],
) -> list[int | None]:
    return [
        next(
            (
                rank
                for rank, (document, _) in enumerate(matches, start=1)
                if any(
                    evidence_matches_document(evidence, document)
                    for evidence in fact["evidence"]
                )
            ),
            None,
        )
        for fact in case["required_facts"]
    ]


def format_evidence_ranks(ranks: list[int | None]) -> str:
    return ", ".join(
        f"F{index}={'—' if rank is None else rank}"
        for index, rank in enumerate(ranks, start=1)
    )


def main() -> None:
    arguments = parse_arguments()
    if not arguments.pdf_directory.is_dir():
        raise SystemExit(f"Répertoire PDF introuvable : {arguments.pdf_directory}")

    answerable_cases = [
        case for case in load_cases(arguments.cases_path) if case["answerable"]
    ]
    if len(answerable_cases) != EXPECTED_ANSWERABLE_CASES:
        raise SystemExit(
            f"Le benchmark doit contenir {EXPECTED_ANSWERABLE_CASES} cas answerable, "
            f"pas {len(answerable_cases)}."
        )

    vector_store, pdf_count, document_count, chunk_count = build_retrieval_index(
        arguments.pdf_directory
    )
    evidence_totals = {rank: 0 for rank in RANKS}
    source_totals = {rank: 0 for rank in RANKS}
    rows: list[dict[str, Any]] = []

    for case in answerable_cases:
        matches = vector_store.similarity_search_with_score(
            case["question"],
            k=MAX_RANK,
        )
        evidence_hits = {
            rank: evidence_hit_at_k(case, matches, rank) for rank in RANKS
        }
        source_hits = {
            rank: source_hit_at_k(case, matches, rank) for rank in RANKS
        }
        expected_ranks = evidence_ranks(case, matches)

        for rank in RANKS:
            evidence_totals[rank] += evidence_hits[rank]
            source_totals[rank] += source_hits[rank]

        rows.append(
            {
                "id": case["id"],
                "evidence_hits": evidence_hits,
                "source_hits": source_hits,
                "evidence_ranks": expected_ranks,
            }
        )

    print(f"PDF chargés : {pdf_count}")
    print(f"Documents/pages : {document_count}")
    print(f"Chunks indexés : {chunk_count}")
    print("\nID      EH@1  EH@3  EH@5  EH@6  Rangs des preuves")
    for row in rows:
        hits = row["evidence_hits"]
        print(
            f"{row['id']:<8}"
            f"{'yes' if hits[1] else 'no':<6}"
            f"{'yes' if hits[3] else 'no':<6}"
            f"{'yes' if hits[5] else 'no':<6}"
            f"{'yes' if hits[6] else 'no':<6}"
            f"{format_evidence_ranks(row['evidence_ranks'])}"
        )

    total = len(answerable_cases)
    print("\n--- Evidence Hit ---")
    for rank in RANKS:
        print(f"Evidence Hit@{rank} : {evidence_totals[rank]}/{total}")

    print("\n--- Source Hit ---")
    for rank in RANKS:
        print(f"Source Hit@{rank} : {source_totals[rank]}/{total}")

    print("\n--- Échecs à Evidence Hit@6 ---")
    for row in rows:
        if row["evidence_hits"][6]:
            continue
        ranks = row["evidence_ranks"]
        if all(rank is None for rank in ranks):
            cause = "preuve absente du top 6"
        elif any(rank is None for rank in ranks):
            cause = "preuve partielle : au moins un fait requis manque dans le top 6"
        else:
            cause = "autre cause observée"
        print(f"{row['id']} : {cause}")


if __name__ == "__main__":
    main()
