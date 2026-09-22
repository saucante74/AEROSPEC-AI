import argparse
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

from langchain_chroma import Chroma
from langchain_core.documents import Document

from backend.app.retrieval import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    build_retrieval_index,
)
from evaluation.scripts.evaluate_rag import (
    evidence_hit_at_k,
    evidence_matches_document,
    load_cases,
    source_hit_at_k,
)

TOP_K = 3
FUSION_DEPTH = 20
RRF_K = 60
EXPECTED_ANSWERABLE_CASES = 8
TOKEN_PATTERN = re.compile(r"[^\W_]+(?:[.-][^\W_]+)*", re.UNICODE)
DISPLAY_STOP_WORDS = {
    "a",
    "and",
    "are",
    "does",
    "for",
    "how",
    "is",
    "its",
    "of",
    "the",
    "to",
    "up",
    "what",
    "which",
    "with",
}
FOCUS_CASE_IDS = {"rag-001", "rag-002", "rag-005", "rag-007", "rag-008"}


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare vector, lexical TF-IDF and hybrid RRF retrieval."
    )
    parser.add_argument("pdf_directory", type=Path)
    parser.add_argument("cases_path", type=Path)
    return parser.parse_args()


def tokenize(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    return TOKEN_PATTERN.findall(normalized)


def document_key(document: Document) -> tuple[str, str, str, str]:
    return (
        Path(str(document.metadata["source"])).name,
        str(document.metadata["page"]),
        str(document.metadata["page_label"]),
        document.page_content,
    )


class LexicalIndex:
    def __init__(self, documents: list[Document]) -> None:
        self.documents = documents
        token_counts = [Counter(tokenize(document.page_content)) for document in documents]
        document_frequencies = Counter(
            token for counts in token_counts for token in counts
        )
        document_count = len(documents)
        self.idf = {
            token: math.log((document_count + 1) / (frequency + 1)) + 1
            for token, frequency in document_frequencies.items()
        }
        self.document_weights = [self._weights(counts) for counts in token_counts]
        self.document_norms = [
            math.sqrt(sum(weight * weight for weight in weights.values()))
            for weights in self.document_weights
        ]

    def _weights(self, counts: Counter[str]) -> dict[str, float]:
        return {
            token: (1 + math.log(count)) * self.idf[token]
            for token, count in counts.items()
        }

    def search(self, query: str, k: int) -> list[tuple[Document, float]]:
        query_counts = Counter(tokenize(query))
        query_weights = {
            token: (1 + math.log(count)) * self.idf[token]
            for token, count in query_counts.items()
            if token in self.idf
        }
        query_norm = math.sqrt(
            sum(weight * weight for weight in query_weights.values())
        )
        scored_documents: list[tuple[Document, float]] = []

        for document, weights, document_norm in zip(
            self.documents,
            self.document_weights,
            self.document_norms,
            strict=True,
        ):
            denominator = query_norm * document_norm
            score = 0.0
            if denominator:
                score = sum(
                    query_weight * weights.get(token, 0.0)
                    for token, query_weight in query_weights.items()
                ) / denominator
            scored_documents.append((document, score))

        return sorted(
            scored_documents,
            key=lambda match: (-match[1], document_key(match[0])),
        )[:k]


def indexed_documents(vector_store: Chroma) -> list[Document]:
    stored = vector_store.get(include=["documents", "metadatas"])
    contents = stored["documents"] or []
    metadatas = stored["metadatas"] or []
    if len(contents) != len(metadatas):
        raise ValueError("Chroma returned inconsistent documents and metadata.")

    documents = [
        Document(page_content=content, metadata=metadata or {})
        for content, metadata in zip(contents, metadatas, strict=True)
    ]
    documents.sort(key=document_key)
    keys = [document_key(document) for document in documents]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate chunk keys prevent deterministic RRF fusion.")
    return documents


def reciprocal_rank_fusion(
    vector_matches: list[tuple[Document, float]],
    lexical_matches: list[tuple[Document, float]],
) -> list[tuple[Document, float]]:
    documents: dict[tuple[str, str, str, str], Document] = {}
    scores: dict[tuple[str, str, str, str], float] = {}
    for ranking in (vector_matches, lexical_matches):
        for rank, (document, _) in enumerate(ranking, start=1):
            key = document_key(document)
            documents[key] = document
            scores[key] = scores.get(key, 0.0) + 1 / (RRF_K + rank)

    ranked_keys = sorted(scores, key=lambda key: (-scores[key], key))
    return [(documents[key], -scores[key]) for key in ranked_keys]


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


def evaluate_ranking(
    case: dict[str, Any],
    matches: list[tuple[Document, float]],
) -> dict[str, Any]:
    return {
        "source_hit_at_1": source_hit_at_k(case, matches, 1),
        "source_hit_at_3": source_hit_at_k(case, matches, TOP_K),
        "evidence_hit_at_1": evidence_hit_at_k(case, matches, 1),
        "evidence_hit_at_3": evidence_hit_at_k(case, matches, TOP_K),
        "evidence_ranks": evidence_ranks(case, matches),
        "matches": matches,
    }


def shared_query_terms(question: str, document: Document) -> str:
    question_terms = set(tokenize(question)) - DISPLAY_STOP_WORDS
    document_terms = set(tokenize(document.page_content))
    shared = sorted(question_terms & document_terms)
    return ", ".join(shared[:8]) if shared else "aucun terme exact notable"


def describe_evidence(
    case: dict[str, Any],
    ranking: dict[str, Any],
) -> str:
    details = []
    matches = ranking["matches"]
    for fact_index, fact in enumerate(case["required_facts"], start=1):
        matched = next(
            (
                (rank, document, evidence)
                for rank, (document, _) in enumerate(matches, start=1)
                for evidence in fact["evidence"]
                if evidence_matches_document(evidence, document)
            ),
            None,
        )
        if matched is None:
            details.append(f"F{fact_index}=absente du top {FUSION_DEPTH}")
            continue
        rank, document, evidence = matched
        details.append(
            f"F{fact_index}=rang {rank}, ancre « {evidence['text_anchor']} », "
            f"termes communs : {shared_query_terms(case['question'], document)}"
        )
    return "; ".join(details)


def count_metric(results: list[dict[str, Any]], strategy: str, metric: str) -> int:
    return sum(1 for result in results if result[strategy][metric])


def print_results(results: list[dict[str, Any]]) -> None:
    strategies = (
        ("vector", "Vectoriel"),
        ("lexical", "Lexical TF-IDF"),
        ("hybrid", f"Hybride RRF k={RRF_K}"),
    )
    total = len(results)
    print("\nStratégie | Source Hit@1 | Source Hit@3 | Evidence Hit@1 | Evidence Hit@3")
    for key, label in strategies:
        metrics = (
            count_metric(results, key, "source_hit_at_1"),
            count_metric(results, key, "source_hit_at_3"),
            count_metric(results, key, "evidence_hit_at_1"),
            count_metric(results, key, "evidence_hit_at_3"),
        )
        print(f"{label} | " + " | ".join(f"{value}/{total}" for value in metrics))

    print("\nID | Vector EH@3 | Lexical EH@3 | Hybrid EH@3")
    for result in results:
        print(
            f"{result['id']} | {result['vector']['evidence_hit_at_3']} | "
            f"{result['lexical']['evidence_hit_at_3']} | "
            f"{result['hybrid']['evidence_hit_at_3']}"
        )

    print("\nCas modifiés par rapport au vectoriel")
    changed = False
    for result in results:
        vector_hit = result["vector"]["evidence_hit_at_3"]
        if (
            result["lexical"]["evidence_hit_at_3"] == vector_hit
            and result["hybrid"]["evidence_hit_at_3"] == vector_hit
        ):
            continue
        changed = True
        print(f"{result['id']}:")
        for key, label in strategies:
            print(f"  {label}: {describe_evidence(result['case'], result[key])}")
    if not changed:
        print("Aucun cas ne change à Evidence Hit@3.")

    print("\nRangs des preuves pour les cas prioritaires")
    for result in results:
        if result["id"] not in FOCUS_CASE_IDS:
            continue
        print(f"{result['id']}:")
        for key, label in strategies:
            print(f"  {label}: {describe_evidence(result['case'], result[key])}")


def main() -> None:
    arguments = parse_arguments()
    if not arguments.pdf_directory.is_dir():
        raise SystemExit(f"Répertoire PDF introuvable : {arguments.pdf_directory}")

    cases = [case for case in load_cases(arguments.cases_path) if case["answerable"]]
    if len(cases) != EXPECTED_ANSWERABLE_CASES:
        raise SystemExit(
            f"Le benchmark doit contenir {EXPECTED_ANSWERABLE_CASES} cas answerable, "
            f"pas {len(cases)}."
        )

    vector_store, pdf_count, page_count, chunk_count = build_retrieval_index(
        arguments.pdf_directory,
        chunk_size=DEFAULT_CHUNK_SIZE,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP,
    )
    lexical_index = LexicalIndex(indexed_documents(vector_store))
    results: list[dict[str, Any]] = []

    for case in cases:
        vector_matches = vector_store.similarity_search_with_score(
            case["question"], k=FUSION_DEPTH
        )
        lexical_matches = lexical_index.search(case["question"], k=FUSION_DEPTH)
        hybrid_matches = reciprocal_rank_fusion(vector_matches, lexical_matches)
        results.append(
            {
                "id": case["id"],
                "case": case,
                "vector": evaluate_ranking(case, vector_matches),
                "lexical": evaluate_ranking(case, lexical_matches),
                "hybrid": evaluate_ranking(case, hybrid_matches),
            }
        )

    print(f"PDF : {pdf_count}; pages : {page_count}; chunks partagés : {chunk_count}")
    print(
        f"Chunking : {DEFAULT_CHUNK_SIZE}/{DEFAULT_CHUNK_OVERLAP}; "
        f"top_k métrique : {TOP_K}; profondeur RRF : {FUSION_DEPTH}"
    )
    print_results(results)


if __name__ == "__main__":
    main()
