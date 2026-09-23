import json
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, ClassVar
from unittest import TestCase

from evaluation.scripts.archive_evaluation import (
    EXPERIMENT_FIELDS,
    archive_experiment,
    are_directly_comparable,
    validate_registry,
)
from evaluation.scripts.evaluation_summary import build_evaluation_summary

EVALUATION_DIRECTORY = Path(__file__).parent.parent
ARCHIVE_DIRECTORY = EVALUATION_DIRECTORY / "runs" / "history" / "baseline-12"
REGISTRY_PATH = EVALUATION_DIRECTORY / "experiments.json"


class BaselineArchiveTest(TestCase):
    cases: ClassVar[list[dict[str, Any]]]
    archived_run: ClassVar[dict[str, Any]]
    summary: ClassVar[dict[str, Any]]
    registry: ClassVar[dict[str, Any]]

    @classmethod
    def setUpClass(cls) -> None:
        cls.cases = json.loads(
            (ARCHIVE_DIRECTORY / "rag_cases.json").read_text(encoding="utf-8")
        )
        cls.archived_run = json.loads(
            (ARCHIVE_DIRECTORY / "rag_run.json").read_text(encoding="utf-8")
        )
        cls.summary = json.loads(
            (ARCHIVE_DIRECTORY / "summary.json").read_text(encoding="utf-8")
        )
        cls.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))

    def test_baseline_snapshot_has_historical_case_counts(self) -> None:
        self.assertEqual(len(self.cases), 12)
        self.assertEqual(sum(case["answerable"] for case in self.cases), 8)
        self.assertEqual(sum(not case["answerable"] for case in self.cases), 4)

    def test_baseline_snapshot_preserves_historical_ids(self) -> None:
        self.assertEqual(
            [case["id"] for case in self.cases],
            [f"rag-{index:03d}" for index in range(1, 13)],
        )

    def test_historical_run_matches_snapshot_ids(self) -> None:
        self.assertEqual(
            [result["id"] for result in self.archived_run["results"]],
            [case["id"] for case in self.cases],
        )

    def test_historical_summary_is_generated_from_archived_run(self) -> None:
        self.assertEqual(
            self.summary,
            build_evaluation_summary(
                self.archived_run,
                source_artifact="evaluation/history/baseline-12/rag_run.json",
            ),
        )

    def test_registry_uses_minimal_schema(self) -> None:
        validate_registry(self.registry)
        experiment = self.registry["experiments"][0]
        self.assertEqual(set(experiment), EXPERIMENT_FIELDS)
        self.assertEqual(experiment["total_cases"], 12)
        self.assertEqual(experiment["answerable_cases"], 8)
        self.assertEqual(experiment["unanswerable_cases"], 4)

    def test_recorded_configuration_matches_verified_baseline(self) -> None:
        configuration = self.registry["experiments"][0]["rag_config"]
        self.assertEqual(configuration["chunk_size"], 1000)
        self.assertEqual(configuration["chunk_overlap"], 200)
        self.assertEqual(configuration["top_k"], 3)
        self.assertEqual(
            configuration["embedding_model"],
            "sentence-transformers/all-MiniLM-L6-v2",
        )
        self.assertEqual(configuration["retrieval_strategy"], "dense_vector_similarity")
        self.assertEqual(configuration["vector_store"], "Chroma")
        self.assertEqual(configuration["distance_metric"], "cosine")

    def test_different_benchmarks_are_not_directly_comparable(self) -> None:
        baseline = self.registry["experiments"][0]
        benchmark_36 = {
            **baseline,
            "id": "future-benchmark-36",
            "benchmark_version": "benchmark-36",
            "comparable_to": ["baseline-12"],
        }

        self.assertFalse(are_directly_comparable(baseline, benchmark_36))
        self.assertEqual(baseline["comparable_to"], [])
        with self.assertRaisesRegex(ValueError, "different benchmarks"):
            validate_registry(
                {
                    "schema_version": 1,
                    "experiments": [baseline, benchmark_36],
                }
            )

    def test_two_configuration_changes_are_not_directly_comparable(self) -> None:
        baseline = self.registry["experiments"][2]
        one_change = {
            **baseline,
            "id": "top-k-test",
            "rag_config": {**baseline["rag_config"], "top_k": 5},
            "comparable_to": [],
        }
        two_changes = {
            **one_change,
            "id": "chunk-and-top-k-test",
            "rag_config": {**one_change["rag_config"], "chunk_size": 600},
        }

        self.assertTrue(are_directly_comparable(baseline, one_change))
        self.assertFalse(are_directly_comparable(baseline, two_changes))

    def test_archiver_refuses_to_overwrite_an_existing_archive(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            history_root = root / "history"
            registry_path = root / "experiments.json"

            def archive_test_run() -> None:
                archive_experiment(
                    experiment_id="copied-baseline",
                    benchmark_version="baseline-12",
                    change="Test copy",
                    hypothesis="Test archive behavior",
                    cases_path=(
                        EVALUATION_DIRECTORY / "benchmarks" / "rag_cases.json"
                    ),
                    run_path=(
                        EVALUATION_DIRECTORY
                        / "runs"
                        / "current"
                        / "rag_run.json"
                    ),
                    history_root=history_root,
                    registry_path=registry_path,
                    archived_at_utc="2026-09-22T00:00:00+00:00",
                )

            archive_test_run()

            with self.assertRaises(FileExistsError):
                archive_test_run()
