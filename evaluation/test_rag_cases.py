import json
from pathlib import Path
from typing import Any, ClassVar
from unittest import TestCase

CASES_PATH = Path(__file__).with_name("rag_cases.json")
REQUIRED_FIELDS = {
    "id",
    "question",
    "answerable",
    "reference_answer",
    "required_facts",
    "unanswerable_reason",
}


class RagCasesTest(TestCase):
    cases: ClassVar[list[dict[str, Any]]]

    @classmethod
    def setUpClass(cls) -> None:
        cls.cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))

    def test_expected_case_counts_and_unique_ids(self) -> None:
        ids = [case["id"] for case in self.cases]
        answerable_count = sum(case["answerable"] for case in self.cases)

        self.assertEqual(len(self.cases), 72)
        self.assertEqual(answerable_count, 48)
        self.assertEqual(len(self.cases) - answerable_count, 24)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(ids, [f"rag-{index:03d}" for index in range(1, 73)])

    def test_all_cases_follow_the_dataset_schema(self) -> None:
        for case in self.cases:
            with self.subTest(case=case["id"]):
                self.assertEqual(set(case), REQUIRED_FIELDS)
                self.assertIsInstance(case["question"], str)
                self.assertTrue(case["question"].strip())
                self.assertIsInstance(case["answerable"], bool)

    def test_answerable_cases_have_verifiable_ground_truth(self) -> None:
        for case in (case for case in self.cases if case["answerable"]):
            with self.subTest(case=case["id"]):
                self.assertIsInstance(case["reference_answer"], str)
                self.assertTrue(case["reference_answer"].strip())
                self.assertIsNone(case["unanswerable_reason"])
                self.assertTrue(case["required_facts"])

                for fact in case["required_facts"]:
                    self.assertIsInstance(fact["fact"], str)
                    self.assertTrue(fact["fact"].strip())
                    self.assertTrue(fact["evidence"])
                    for evidence in fact["evidence"]:
                        self.assertTrue(evidence["source"].strip())
                        self.assertTrue(evidence["page_label"].strip())
                        self.assertTrue(evidence["text_anchor"].strip())

    def test_unanswerable_cases_have_only_an_absence_reason(self) -> None:
        for case in (case for case in self.cases if not case["answerable"]):
            with self.subTest(case=case["id"]):
                self.assertIsNone(case["reference_answer"])
                self.assertEqual(case["required_facts"], [])
                self.assertIsInstance(case["unanswerable_reason"], str)
                self.assertTrue(case["unanswerable_reason"].strip())
