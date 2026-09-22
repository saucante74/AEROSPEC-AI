import json
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from unittest import TestCase

from evaluation.scripts.evaluation_summary import (
    DEFAULT_RUN_PATH,
    DEFAULT_SUMMARY_PATH,
    build_evaluation_summary,
    ratio,
    write_evaluation_summary,
)


def make_result(
    *,
    answerable: bool,
    retrieval: dict[str, bool] | None,
    correct_abstention: bool,
    false_abstention: bool,
    valid_ids: list[str],
    unknown_ids: list[str],
    resolved_ids: list[str],
    answer_correct: bool,
    fully_grounded: bool | None,
    citation_coverage: bool | None,
    citation_support: bool | None,
) -> dict[str, Any]:
    return {
        "answerable": answerable,
        "retrieval_metrics": retrieval,
        "abstention": {
            "correct_on_unanswerable": correct_abstention,
            "false_on_answerable": false_abstention,
        },
        "citations": {
            "citations_present": bool(valid_ids or unknown_ids),
            "valid_ids": valid_ids,
            "unknown_ids": unknown_ids,
            "resolved": [{"id": citation_id} for citation_id in resolved_ids],
        },
        "human_review": {
            "answer_correct": answer_correct,
            "fully_grounded": fully_grounded,
            "citation_coverage_pass": citation_coverage,
            "citation_support_pass": citation_support,
        },
    }


def sample_run() -> dict[str, Any]:
    hit = {
        "source_hit_at_1": True,
        "source_hit_at_3": True,
        "evidence_hit_at_1": False,
        "evidence_hit_at_3": True,
    }
    miss = {name: False for name in hit}
    return {
        "configuration": {
            "model": "recorded-model",
            "top_k": 3,
            "dataset_path": "/project/evaluation/benchmarks/rag_cases.json",
        },
        "results": [
            make_result(
                answerable=True,
                retrieval=hit,
                correct_abstention=False,
                false_abstention=False,
                valid_ids=["[S1]"],
                unknown_ids=["[S9]"],
                resolved_ids=[],
                answer_correct=True,
                fully_grounded=True,
                citation_coverage=True,
                citation_support=True,
            ),
            make_result(
                answerable=True,
                retrieval=miss,
                correct_abstention=False,
                false_abstention=True,
                valid_ids=["[S2]"],
                unknown_ids=[],
                resolved_ids=["[S2]"],
                answer_correct=False,
                fully_grounded=False,
                citation_coverage=True,
                citation_support=False,
            ),
            make_result(
                answerable=False,
                retrieval=None,
                correct_abstention=True,
                false_abstention=False,
                valid_ids=[],
                unknown_ids=[],
                resolved_ids=[],
                answer_correct=True,
                fully_grounded=None,
                citation_coverage=None,
                citation_support=None,
            ),
        ],
    }


class EvaluationSummaryTest(TestCase):
    def test_build_summary_uses_metric_specific_denominators(self) -> None:
        summary = build_evaluation_summary(sample_run())
        metrics = summary["metrics"]

        self.assertEqual(summary["benchmark"]["total_cases"], 3)
        self.assertEqual(summary["benchmark"]["answerable_cases"], 2)
        self.assertEqual(summary["benchmark"]["unanswerable_cases"], 1)
        self.assertEqual(
            metrics["retrieval"]["source_hit_at_1"],
            {"numerator": 1, "denominator": 2, "rate": 0.5},
        )
        self.assertEqual(
            metrics["abstention"]["correct_abstentions"],
            {"numerator": 1, "denominator": 1, "rate": 1.0},
        )
        self.assertEqual(
            metrics["abstention"]["false_abstentions"],
            {"numerator": 1, "denominator": 2, "rate": 0.5},
        )
        self.assertEqual(
            metrics["citations"]["responses_with_citations"],
            {"numerator": 2, "denominator": 3, "rate": 0.6667},
        )
        self.assertEqual(
            metrics["citations"]["valid_emitted_citation_ids"],
            {"numerator": 2, "denominator": 3, "rate": 0.6667},
        )
        self.assertEqual(
            metrics["citations"]["resolved_citation_ids"],
            {"numerator": 1, "denominator": 2, "rate": 0.5},
        )
        self.assertEqual(
            metrics["citations"]["unknown_citation_ids"],
            {"numerator": 1, "denominator": 3, "rate": 0.3333},
        )

    def test_human_metrics_only_count_recorded_judgments(self) -> None:
        metrics = build_evaluation_summary(sample_run())["metrics"]["human_review"]

        self.assertEqual(
            metrics["answer_correctness"],
            {"numerator": 2, "denominator": 3, "rate": 0.6667},
        )
        self.assertEqual(
            metrics["fully_grounded_substantive_responses"],
            {"numerator": 1, "denominator": 2, "rate": 0.5},
        )
        self.assertEqual(
            metrics["citation_coverage"],
            {"numerator": 2, "denominator": 2, "rate": 1.0},
        )
        self.assertEqual(
            metrics["citation_support"],
            {"numerator": 1, "denominator": 2, "rate": 0.5},
        )

    def test_ratio_has_no_rate_without_a_denominator(self) -> None:
        self.assertEqual(
            ratio(0, 0),
            {"numerator": 0, "denominator": 0, "rate": None},
        )

    def test_write_summary_serializes_generated_data(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            run_path = temporary_path / "rag_run.json"
            output_path = temporary_path / "data" / "evaluation-summary.json"
            run_path.write_text(json.dumps(sample_run()), encoding="utf-8")

            write_evaluation_summary(run_path, output_path)

            written = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(
                written,
                build_evaluation_summary(
                    sample_run(),
                    source_artifact=run_path.as_posix(),
                ),
            )

    def test_frontend_summary_matches_recorded_run(self) -> None:
        run = json.loads(DEFAULT_RUN_PATH.read_text(encoding="utf-8"))
        written = json.loads(DEFAULT_SUMMARY_PATH.read_text(encoding="utf-8"))

        self.assertEqual(written, build_evaluation_summary(run))
