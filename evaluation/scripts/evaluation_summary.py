import argparse
import json
from pathlib import Path
from typing import Any, Callable

DEFAULT_RUN_PATH = Path("evaluation/runs/current/rag_run.json")
DEFAULT_SUMMARY_PATH = Path("frontend/src/data/evaluation-summary.json")
DEFAULT_EXPERIMENTS_PATH = Path("evaluation/experiments.json")

CONFIGURATION_FIELDS = (
    "created_at_utc",
    "python_version",
    "provider",
    "model",
    "top_k",
    "abstention_message",
    "embedding_model",
    "embedding_model_revision",
    "retrieval_strategy",
    "vector_store",
    "distance_metric",
    "chunk_size",
    "chunk_overlap",
    "pdf_count",
    "document_count",
    "chunk_count",
)


def ratio(numerator: int, denominator: int) -> dict[str, int | float | None]:
    if denominator < 0 or numerator < 0 or numerator > denominator:
        raise ValueError("Invalid metric numerator or denominator.")
    rate = round(numerator / denominator, 4) if denominator else None
    return {
        "numerator": numerator,
        "denominator": denominator,
        "rate": rate,
    }


def count_boolean_metric(
    results: list[dict[str, Any]],
    value: Callable[[dict[str, Any]], Any],
) -> dict[str, int | float | None]:
    values = [value(result) for result in results]
    if not all(isinstance(item, bool) for item in values):
        raise ValueError("Automatic metric values must be booleans.")
    return ratio(sum(values), len(values))


def count_human_metric(
    results: list[dict[str, Any]],
    field: str,
) -> dict[str, int | float | None]:
    values = [
        result["human_review"].get(field)
        for result in results
        if result.get("human_review", {}).get(field) is not None
    ]
    if not all(isinstance(item, bool) for item in values):
        raise ValueError(f"Human review field {field!r} must be boolean or null.")
    return ratio(sum(values), len(values))


def count_retrieval_metric(
    results: list[dict[str, Any]],
    field: str,
) -> dict[str, int | float | None]:
    return count_boolean_metric(
        results,
        lambda result: result["retrieval_metrics"][field],
    )


def build_evaluation_summary(
    run: dict[str, Any],
    source_artifact: str = DEFAULT_RUN_PATH.as_posix(),
) -> dict[str, Any]:
    results = run["results"]
    if not isinstance(results, list):
        raise ValueError("The RAG run results must be a list.")

    answerable_results = [result for result in results if result["answerable"]]
    unanswerable_results = [
        result for result in results if not result["answerable"]
    ]

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
    unknown_id_count = sum(
        len(result["citations"]["unknown_ids"]) for result in results
    )

    configuration = run.get("configuration", {})
    campaign_configuration = {
        field: configuration[field]
        for field in CONFIGURATION_FIELDS
        if field in configuration
    }
    dataset_path = configuration.get("dataset_path")

    return {
        "schema_version": 1,
        "benchmark": {
            "type": "manual_rag_benchmark",
            "scope": "small",
            "total_cases": len(results),
            "answerable_cases": len(answerable_results),
            "unanswerable_cases": len(unanswerable_results),
            "general_performance_guarantee": False,
            "production_performance_guarantee": False,
        },
        "provenance": {
            "source_artifact": source_artifact,
            "dataset_file": Path(str(dataset_path)).name if dataset_path else None,
            "campaign_configuration": campaign_configuration,
        },
        "metrics": {
            "retrieval": {
                metric_name: count_retrieval_metric(
                    answerable_results,
                    metric_name,
                )
                for metric_name in (
                    "source_hit_at_1",
                    "source_hit_at_3",
                    "evidence_hit_at_1",
                    "evidence_hit_at_3",
                )
            },
            "abstention": {
                "correct_abstentions": count_boolean_metric(
                    unanswerable_results,
                    lambda result: result["abstention"][
                        "correct_on_unanswerable"
                    ],
                ),
                "false_abstentions": count_boolean_metric(
                    answerable_results,
                    lambda result: result["abstention"]["false_on_answerable"],
                ),
            },
            "citations": {
                "responses_with_citations": count_boolean_metric(
                    results,
                    lambda result: result["citations"]["citations_present"],
                ),
                "valid_emitted_citation_ids": ratio(
                    valid_id_count,
                    emitted_id_count,
                ),
                "resolved_citation_ids": ratio(
                    resolved_id_count,
                    valid_id_count,
                ),
                "unknown_citation_ids": ratio(
                    unknown_id_count,
                    emitted_id_count,
                ),
            },
            "human_review": {
                "answer_correctness": count_human_metric(
                    results,
                    "answer_correct",
                ),
                "fully_grounded_substantive_responses": count_human_metric(
                    results,
                    "fully_grounded",
                ),
                "citation_coverage": count_human_metric(
                    results,
                    "citation_coverage_pass",
                ),
                "citation_support": count_human_metric(
                    results,
                    "citation_support_pass",
                ),
            },
        },
    }


def build_evaluation_history(
    current_summary: dict[str, Any],
    experiments_path: Path = DEFAULT_EXPERIMENTS_PATH,
) -> list[dict[str, Any]]:
    registry = json.loads(experiments_path.read_text(encoding="utf-8"))
    experiments = registry.get("experiments")
    if not isinstance(experiments, list):
        raise ValueError("The experiment registry must contain an experiments list.")

    current_timestamp = current_summary["provenance"]["campaign_configuration"].get(
        "created_at_utc"
    )
    history = []

    for experiment in experiments:
        summary_path = experiments_path.parent / experiment["artifacts"]["summary"]
        archived_summary = json.loads(summary_path.read_text(encoding="utf-8"))
        history.append(
            {
                "id": experiment["id"],
                "date": experiment["date"],
                "change": experiment.get("change") or "Historical baseline",
                "benchmark_version": experiment["benchmark_version"],
                "cases": archived_summary["benchmark"]["total_cases"],
                "metrics": {
                    "source_hit_at_3": archived_summary["metrics"]["retrieval"][
                        "source_hit_at_3"
                    ],
                    "evidence_hit_at_3": archived_summary["metrics"]["retrieval"][
                        "evidence_hit_at_3"
                    ],
                    "correct_abstentions": archived_summary["metrics"]["abstention"][
                        "correct_abstentions"
                    ],
                    "false_abstentions": archived_summary["metrics"]["abstention"][
                        "false_abstentions"
                    ],
                },
                "is_current": experiment["date"] == current_timestamp,
            }
        )

    return sorted(history, key=lambda item: item["date"], reverse=True)


def build_frontend_evaluation_summary(
    run: dict[str, Any],
    experiments_path: Path = DEFAULT_EXPERIMENTS_PATH,
) -> dict[str, Any]:
    summary = build_evaluation_summary(run)
    summary["history"] = build_evaluation_history(summary, experiments_path)
    return summary


def write_evaluation_summary(run_path: Path, output_path: Path) -> None:
    run = json.loads(run_path.read_text(encoding="utf-8"))
    summary = build_evaluation_summary(run, source_artifact=run_path.as_posix())
    if output_path == DEFAULT_SUMMARY_PATH:
        summary["history"] = build_evaluation_history(summary)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Produit le summary frontend depuis un artefact RAG existant."
    )
    parser.add_argument("--run", type=Path, default=DEFAULT_RUN_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_SUMMARY_PATH)
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    write_evaluation_summary(arguments.run, arguments.output)
    print(f"Summary écrit : {arguments.output}")


if __name__ == "__main__":
    main()
