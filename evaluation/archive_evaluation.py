import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

from evaluation.evaluation_summary import build_evaluation_summary

DEFAULT_CASES_PATH = Path("evaluation/rag_cases.json")
DEFAULT_RUN_PATH = Path("evaluation/rag_run.json")
DEFAULT_HISTORY_ROOT = Path("evaluation/history")
DEFAULT_REGISTRY_PATH = Path("evaluation/experiments.json")
RAG_CONFIG_FIELDS = (
    "chunk_size",
    "chunk_overlap",
    "top_k",
    "embedding_model",
    "embedding_model_revision",
    "retrieval_strategy",
    "vector_store",
    "distance_metric",
    "provider",
    "model",
    "abstention_message",
)
EXPERIMENT_FIELDS = {
    "id",
    "date",
    "archived_at_utc",
    "benchmark_version",
    "total_cases",
    "answerable_cases",
    "unanswerable_cases",
    "change",
    "hypothesis",
    "rag_config",
    "artifacts",
    "metrics",
    "comparable_to",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def are_directly_comparable(
    first_experiment: dict[str, Any],
    second_experiment: dict[str, Any],
) -> bool:
    return bool(
        first_experiment["benchmark_version"]
        == second_experiment["benchmark_version"]
    )


def select_run_cases(
    current_cases: list[dict[str, Any]],
    run: dict[str, Any],
) -> list[dict[str, Any]]:
    cases_by_id = {case["id"]: case for case in current_cases}
    if len(cases_by_id) != len(current_cases):
        raise ValueError("Benchmark case IDs must be unique.")

    results = run.get("results")
    if not isinstance(results, list) or not results:
        raise ValueError("The run must contain a non-empty results list.")

    run_ids = [result["id"] for result in results]
    if len(run_ids) != len(set(run_ids)):
        raise ValueError("Run result IDs must be unique.")

    selected_cases = []
    for result in results:
        case = cases_by_id.get(result["id"])
        if case is None:
            raise ValueError(f"Run case {result['id']!r} is absent from the benchmark.")
        expected_ground_truth = {
            "reference_answer": case["reference_answer"],
            "required_facts": case["required_facts"],
            "unanswerable_reason": case["unanswerable_reason"],
        }
        if result["question"] != case["question"]:
            raise ValueError(f"Question mismatch for {result['id']}.")
        if result["answerable"] != case["answerable"]:
            raise ValueError(f"Answerability mismatch for {result['id']}.")
        if result["ground_truth"] != expected_ground_truth:
            raise ValueError(f"Ground-truth mismatch for {result['id']}.")
        selected_cases.append(case)
    return selected_cases


def build_rag_config(
    run: dict[str, Any],
    verified_overrides: dict[str, str | None],
) -> dict[str, Any]:
    configuration = run.get("configuration", {})
    rag_config = {
        field: configuration[field]
        for field in RAG_CONFIG_FIELDS
        if field in configuration
    }
    rag_config.update(
        {
            field: value
            for field, value in verified_overrides.items()
            if value is not None
        }
    )
    return rag_config


def validate_registry(registry: dict[str, Any]) -> None:
    if registry.get("schema_version") != 1:
        raise ValueError("Unsupported experiments registry schema version.")
    experiments = registry.get("experiments")
    if not isinstance(experiments, list):
        raise ValueError("The experiments registry must contain a list.")

    experiments_by_id: dict[str, dict[str, Any]] = {}
    for experiment in experiments:
        if set(experiment) != EXPERIMENT_FIELDS:
            raise ValueError("An experiment does not follow the registry schema.")
        experiment_id = experiment["id"]
        if not isinstance(experiment_id, str) or not experiment_id:
            raise ValueError("Experiment IDs must be non-empty strings.")
        if experiment_id in experiments_by_id:
            raise ValueError(f"Duplicate experiment ID: {experiment_id}.")
        if experiment["date"] is not None and not isinstance(
            experiment["date"], str
        ):
            raise ValueError("Experiment dates must be strings or null.")
        if not isinstance(experiment["rag_config"], dict):
            raise ValueError("rag_config must be an object.")
        if not isinstance(experiment["comparable_to"], list):
            raise ValueError("comparable_to must be a list.")
        if experiment["total_cases"] != (
            experiment["answerable_cases"] + experiment["unanswerable_cases"]
        ):
            raise ValueError("Experiment case counts are inconsistent.")
        experiments_by_id[experiment_id] = experiment

    for experiment in experiments:
        for comparable_id in experiment["comparable_to"]:
            comparable = experiments_by_id.get(comparable_id)
            if comparable is None:
                raise ValueError(f"Unknown comparable experiment: {comparable_id}.")
            if not are_directly_comparable(experiment, comparable):
                raise ValueError(
                    "Experiments using different benchmarks cannot be marked "
                    "as directly comparable."
                )


def archive_experiment(
    *,
    experiment_id: str,
    benchmark_version: str,
    change: str,
    hypothesis: str,
    cases_path: Path = DEFAULT_CASES_PATH,
    run_path: Path = DEFAULT_RUN_PATH,
    history_root: Path = DEFAULT_HISTORY_ROOT,
    registry_path: Path = DEFAULT_REGISTRY_PATH,
    verified_config: dict[str, str | None] | None = None,
    archived_at_utc: str | None = None,
) -> dict[str, Any]:
    current_cases = load_json(cases_path)
    run = load_json(run_path)
    if not isinstance(current_cases, list) or not isinstance(run, dict):
        raise ValueError("Cases must be a list and the run must be an object.")
    selected_cases = select_run_cases(current_cases, run)

    archive_directory = history_root / experiment_id
    if archive_directory.exists():
        raise FileExistsError(f"Archive already exists: {archive_directory}.")

    if registry_path.exists():
        loaded_registry = load_json(registry_path)
        if not isinstance(loaded_registry, dict):
            raise ValueError("The experiments registry must be an object.")
        registry: dict[str, Any] = loaded_registry
    else:
        registry = {"schema_version": 1, "experiments": []}
    validate_registry(registry)
    experiments = cast(list[dict[str, Any]], registry["experiments"])
    if any(item["id"] == experiment_id for item in experiments):
        raise ValueError(f"Experiment ID already exists: {experiment_id}.")

    comparable_to = [
        item["id"]
        for item in experiments
        if item["benchmark_version"] == benchmark_version
    ]
    relative_archive = archive_directory.relative_to(registry_path.parent)
    relative_cases = (relative_archive / "rag_cases.json").as_posix()
    relative_run = (relative_archive / "rag_run.json").as_posix()
    relative_summary = (relative_archive / "summary.json").as_posix()
    configuration = run.get("configuration", {})
    answerable_cases = sum(case["answerable"] for case in selected_cases)
    experiment = {
        "id": experiment_id,
        "date": configuration.get("created_at_utc"),
        "archived_at_utc": archived_at_utc
        or datetime.now(timezone.utc).isoformat(),
        "benchmark_version": benchmark_version,
        "total_cases": len(selected_cases),
        "answerable_cases": answerable_cases,
        "unanswerable_cases": len(selected_cases) - answerable_cases,
        "change": change,
        "hypothesis": hypothesis,
        "rag_config": build_rag_config(run, verified_config or {}),
        "artifacts": {
            "benchmark": relative_cases,
            "run": relative_run,
            "summary": relative_summary,
        },
        "metrics": {"summary_path": relative_summary},
        "comparable_to": comparable_to,
    }
    experiments.append(experiment)
    validate_registry(registry)

    summary = build_evaluation_summary(
        run,
        source_artifact=(registry_path.parent / relative_run).as_posix(),
    )
    archive_directory.mkdir(parents=True)
    write_json(archive_directory / "rag_cases.json", selected_cases)
    shutil.copyfile(run_path, archive_directory / "rag_run.json")
    write_json(archive_directory / "summary.json", summary)
    write_json(registry_path, registry)
    return experiment


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Archive an existing RAG run without executing evaluation."
    )
    parser.add_argument("experiment_id")
    parser.add_argument("benchmark_version")
    parser.add_argument("--change", required=True)
    parser.add_argument("--hypothesis", required=True)
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES_PATH)
    parser.add_argument("--run", type=Path, default=DEFAULT_RUN_PATH)
    parser.add_argument("--history-root", type=Path, default=DEFAULT_HISTORY_ROOT)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY_PATH)
    parser.add_argument("--retrieval-strategy")
    parser.add_argument("--vector-store")
    parser.add_argument("--distance-metric")
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    experiment = archive_experiment(
        experiment_id=arguments.experiment_id,
        benchmark_version=arguments.benchmark_version,
        change=arguments.change,
        hypothesis=arguments.hypothesis,
        cases_path=arguments.cases,
        run_path=arguments.run,
        history_root=arguments.history_root,
        registry_path=arguments.registry,
        verified_config={
            "retrieval_strategy": arguments.retrieval_strategy,
            "vector_store": arguments.vector_store,
            "distance_metric": arguments.distance_metric,
        },
    )
    print(f"Archived experiment: {experiment['id']}")


if __name__ == "__main__":
    main()
