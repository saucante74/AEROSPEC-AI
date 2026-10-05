import unittest

from backend.app.generation import ABSTENTION_MESSAGE, is_abstention


class AbstentionDetectionTest(unittest.TestCase):
    def test_detects_canonical_message(self) -> None:
        self.assertEqual(
            ABSTENTION_MESSAGE,
            "The information is not available in the provided documents.",
        )
        self.assertTrue(is_abstention(ABSTENTION_MESSAGE))

    def test_does_not_detect_old_french_message(self) -> None:
        message = "L'information n'est pas disponible dans les documents fournis."

        self.assertFalse(is_abstention(message))

    def test_ignores_surrounding_whitespace(self) -> None:
        self.assertTrue(is_abstention(f"  \n{ABSTENTION_MESSAGE}\t"))

    def test_applies_unicode_compatibility_normalization(self) -> None:
        message = ABSTENTION_MESSAGE.replace("T", "Ｔ", 1)

        self.assertTrue(is_abstention(message))

    def test_does_not_detect_a_technical_answer(self) -> None:
        self.assertFalse(
            is_abstention("The connector is rated for 3.3 A per contact [S1].")
        )


if __name__ == "__main__":
    unittest.main()
