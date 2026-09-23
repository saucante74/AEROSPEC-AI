import json
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

BASELINE_PATH = Path("evaluation/runs/history/baseline-72/rag_run.json")
EXPERIMENT_PATHS = {
    "top-k-5": Path("evaluation/runs/history/top-k-5/rag_run.json"),
    "chunk-size-600": Path(
        "evaluation/runs/history/chunk-size-600/rag_run.json"
    ),
    "chunk-overlap-400": Path(
        "evaluation/runs/history/chunk-overlap-400/rag_run.json"
    ),
}
OUTPUT_PATH = Path(
    "evaluation/diagnostics/baseline_72_retrieval_failures.json"
)

CATEGORIES = {
    "A": "Correct document, wrong page/chunk",
    "B": "Correct page/context retrieved, incomplete evidence",
    "C": "Wrong document / source retrieval failure",
    "D": "Evidence split across chunks or pages",
    "E": "Parsing / extraction issue",
    "F": "Semantic / terminology mismatch",
    "G": "Table / structured-content issue",
    "H": "Benchmark / evidence-anchor issue",
    "UNCERTAIN": "Insufficient evidence for a reliable diagnosis",
}

DIAGNOSES = {
    "rag-001": (
        "F",
        ["correct_source_wrong_page"],
        "The expected Harwin page-3 specification is one complete baseline chunk, "
        "but retrieval selected Harwin page 6 and two Amphenol passages. The query "
        "says 'base material' while the document labels the field 'Contacts'.",
    ),
    "rag-002": (
        "F",
        ["correct_source_wrong_page"],
        "The epoxy anchor exists in one chunk on Douglas page 2, while the Top 3 "
        "contains Douglas pages 1 and 8. 'Sealing material' is expressed as an "
        "ASTM-rated hermetic epoxy specification in the source.",
    ),
    "rag-005": (
        "C",
        ["semantic_terminology_mismatch", "chunk_window_or_ranking_sensitivity"],
        "Both Harwin anchors coexist in one page-3 chunk, but no Harwin passage is "
        "in the baseline Top 3. Overlap 400 retrieves both anchors together, which "
        "shows chunk-window sensitivity but not a baseline evidence split.",
    ),
    "rag-007": (
        "D",
        ["multi_page_evidence", "partial_evidence_retrieved"],
        "The shielding anchor is retrieved from Harwin page 5, but the pitch anchor "
        "is in a separate page-3 chunk that is absent from the Top 3.",
    ),
    "rag-008": (
        "G",
        ["correct_source_wrong_page", "benchmark_manual_review"],
        "The expected 23-35 row is in a densely linearized insert-arrangement table. "
        "Retrieval selects nearby Amphenol table pages 149, 153, and 152 instead of "
        "the expected Douglas page 3 or Amphenol page 146 row.",
    ),
    "rag-013": (
        "A",
        ["dense_ranking"],
        "Both voltage anchors coexist in the Harwin page-3 specification chunk, "
        "while retrieval selects Harwin pages 4, 6, and 2.",
    ),
    "rag-016": (
        "A",
        ["dense_ranking"],
        "Both temperature anchors coexist in one Douglas page-2 chunk. The Top 3 "
        "selects Douglas pages 1 and 8 plus an Amphenol passage.",
    ),
    "rag-017": (
        "C",
        ["structured_table_linearization", "cross_document_family_confusion"],
        "The expected shell-size row is a compact Douglas dimensional table. The "
        "Top 3 contains only similarly worded Amphenol MIL-DTL-38999 dimension pages.",
    ),
    "rag-040": (
        "C",
        ["semantic_terminology_mismatch", "chunk_granularity_sensitivity"],
        "The Harwin page-2 prose states the pin-count limit, but all Top 3 passages "
        "are Molex. Chunk size 600 retrieves the anchor, indicating granularity or "
        "ranking sensitivity rather than missing corpus text.",
    ),
    "rag-041": (
        "A",
        ["dense_ranking"],
        "The housing-material anchor is in Douglas page 2, while retrieval selects "
        "Douglas page 1 and two Amphenol passages.",
    ),
    "rag-042": (
        "C",
        [
            "structured_table_linearization",
            "cross_document_family_confusion",
            "benchmark_manual_review",
        ],
        "Both expected rows coexist in the Douglas page-3 insert-arrangement table. "
        "Retrieval instead selects nearby Amphenol arrangement-table pages.",
    ),
    "rag-043": (
        "C",
        [
            "structured_table_linearization",
            "cross_document_family_confusion",
            "benchmark_manual_review",
        ],
        "The F45 row exists in the Douglas page-3 table, but retrieval selects "
        "Amphenol arrangement pages with similar numeric identifiers.",
    ),
    "rag-046": (
        "A",
        ["chunk_window_or_ranking_sensitivity", "structured_specification"],
        "All three rating anchors coexist in one Molex page-6 chunk, while the Top 3 "
        "selects Molex pages 9, 4, and 8. Both chunking experiments retrieve the "
        "complete page-6 evidence.",
    ),
    "rag-047": (
        "A",
        ["dense_ranking", "structured_specification"],
        "The phenolic circuit-range anchor is in the Molex page-6 specification, "
        "while the Top 3 selects Molex pages 4, 4, and 16.",
    ),
    "rag-049": (
        "B",
        ["correct_page_wrong_chunk", "structured_specification"],
        "Molex page 9 is rank 2, but the retrieved chunk is a different product "
        "section and does not contain the insulated-wire-range anchor.",
    ),
    "rag-051": (
        "G",
        ["correct_source_wrong_page", "benchmark_manual_review"],
        "All four interface/frequency pairs coexist in a structured Samtec page-4 "
        "listing. Retrieval selects Samtec pages 9, 15, and 11 instead.",
    ),
    "rag-052": (
        "B",
        ["correct_page_wrong_chunk", "chunk_window_or_ranking_sensitivity"],
        "Samtec page 7 is retrieved at rank 2, but that chunk lacks both mounting "
        "anchors. Overlap 400 retrieves a different page-7 chunk containing both.",
    ),
    "rag-054": (
        "B",
        ["correct_page_wrong_chunk", "chunk_granularity_sensitivity"],
        "Samtec page 11 is rank 1, but its retrieved chunk omits the panel-density "
        "statement. Chunk size 600 retrieves the required page-11 evidence.",
    ),
    "rag-056": (
        "B",
        ["correct_page_wrong_chunk", "chunk_boundary_sensitivity"],
        "The rank-1 Amphenol page-144 chunk ends before the coupling statement. "
        "Overlap 400 retrieves a later page-144 chunk containing the complete anchor.",
    ),
    "rag-057": (
        "G",
        ["correct_page_wrong_chunk", "benchmark_manual_review"],
        "Amphenol page 145 is rank 1, but the required diameter is encoded in a "
        "linearized multi-column table in a different chunk on that page.",
    ),
    "rag-058": (
        "G",
        ["correct_source_wrong_page", "benchmark_manual_review"],
        "The 19-32 row is split across overlapping chunks of the page-146 insert "
        "table; retrieval instead selects Amphenol pages 148, 151, and 153.",
    ),
    "rag-060": (
        "G",
        ["correct_source_wrong_page", "benchmark_manual_review"],
        "The stickout range is a dimension callout on Amphenol page 163. Retrieval "
        "selects other nearby Series III dimension pages 168, 179, and 167.",
    ),
}

CHUNK_RELATED_CASES = {"rag-005", "rag-007", "rag-046", "rag-052", "rag-056"}
PARSING_OR_TABLE_CASES = {
    "rag-008",
    "rag-017",
    "rag-042",
    "rag-043",
    "rag-051",
    "rag-057",
    "rag-058",
    "rag-060",
}
SEMANTIC_CASES = {"rag-001", "rag-002", "rag-005", "rag-040"}
MANUAL_REVIEW_CASES = {
    case_id
    for case_id, diagnosis in DIAGNOSES.items()
    if "benchmark_manual_review" in diagnosis[1]
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split()).casefold()


def expected_evidence(result: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "fact": fact["fact"],
            "source": evidence["source"],
            "page_label": evidence["page_label"],
            "text_anchor": evidence["text_anchor"],
        }
        for fact in result["ground_truth"]["required_facts"]
        for evidence in fact["evidence"]
    ]


def retrieved_passages(
    result: dict[str, Any], evidence: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    return [
        {
            "rank": passage["rank"],
            "source": passage["source"],
            "page_label": passage["page_label"],
            "distance": passage["distance"],
            "matched_expected_anchors": [
                item["text_anchor"]
                for item in evidence
                if item["source"] == passage["source"]
                and item["page_label"] == passage["page_label"]
                and normalize_text(item["text_anchor"])
                in normalize_text(passage["content"])
            ],
        }
        for passage in result["passages"][:3]
    ]


def build_diagnostic() -> dict[str, Any]:
    baseline = load_json(BASELINE_PATH)
    experiment_results = {
        name: {result["id"]: result for result in load_json(path)["results"]}
        for name, path in EXPERIMENT_PATHS.items()
    }
    failures = [
        result
        for result in baseline["results"]
        if result["answerable"]
        and not result["retrieval_metrics"]["evidence_hit_at_3"]
    ]
    failure_ids = {result["id"] for result in failures}
    if failure_ids != set(DIAGNOSES):
        raise ValueError("The reviewed diagnoses do not match baseline failures.")

    cases = []
    for result in failures:
        case_id = result["id"]
        category, secondary_factors, explanation = DIAGNOSES[case_id]
        evidence = expected_evidence(result)
        cases.append(
            {
                "case_id": case_id,
                "question": result["question"],
                "expected_sources": sorted({item["source"] for item in evidence}),
                "expected_pages": sorted(
                    {
                        f"{item['source']}#page={item['page_label']}"
                        for item in evidence
                    }
                ),
                "expected_evidence": evidence,
                "retrieved_top_3": retrieved_passages(result, evidence),
                "source_hit_at_3": result["retrieval_metrics"][
                    "source_hit_at_3"
                ],
                "evidence_hit_at_3": False,
                "primary_failure_category": category,
                "primary_failure_label": CATEGORIES[category],
                "secondary_factors": secondary_factors,
                "explanation": explanation,
                "archived_experiment_evidence_hit_at_3": {
                    name: experiment[case_id]["retrieval_metrics"][
                        "evidence_hit_at_3"
                    ]
                    for name, experiment in experiment_results.items()
                },
            }
        )

    category_counts = Counter(
        case["primary_failure_category"] for case in cases
    )
    total = len(cases)
    return {
        "schema_version": 1,
        "diagnostic_of": "baseline-72",
        "scope": "answerable cases with Evidence Hit@3=false",
        "source_artifacts": {
            "benchmark": "evaluation/runs/history/baseline-72/rag_cases.json",
            "baseline_run": BASELINE_PATH.as_posix(),
            "secondary_experiments": {
                name: path.as_posix() for name, path in EXPERIMENT_PATHS.items()
            },
        },
        "method": {
            "automatic": (
                "Expected anchors and Top 3 metadata were joined from immutable "
                "artifacts; aggregate counts were computed from reviewed cases."
            ),
            "human_review": (
                "Expected PDF text, reconstructed baseline chunks, retrieved "
                "passages, and archived experiment outcomes were inspected."
            ),
            "categories": CATEGORIES,
        },
        "summary": {
            "failure_count": total,
            "category_counts": {
                category: category_counts.get(category, 0)
                for category in CATEGORIES
            },
            "category_percentages": {
                category: round(category_counts.get(category, 0) / total * 100, 1)
                for category in CATEGORIES
            },
            "correct_source_in_top_3_count": sum(
                case["source_hit_at_3"] for case in cases
            ),
            "source_retrieval_failure_count": sum(
                not case["source_hit_at_3"] for case in cases
            ),
            "chunk_related_count": len(CHUNK_RELATED_CASES),
            "parsing_or_table_related_count": len(PARSING_OR_TABLE_CASES),
            "semantic_or_terminology_related_count": len(SEMANTIC_CASES),
            "manual_review_case_ids": sorted(MANUAL_REVIEW_CASES),
        },
        "cases": cases,
    }


def main() -> None:
    diagnostic = build_diagnostic()
    OUTPUT_PATH.write_text(
        json.dumps(diagnostic, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Diagnostic written: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
