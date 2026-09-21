from unittest import TestCase

from backend.app.tools import NEWTONS_PER_LBF, convert_unit


class ConvertUnitTest(TestCase):
    def test_converts_millimeters_to_inches(self) -> None:
        self.assertEqual(convert_unit(25.4, "mm", "inch"), 1.0)

    def test_converts_inches_to_millimeters(self) -> None:
        self.assertEqual(convert_unit(1.0, "inch", "mm"), 25.4)

    def test_converts_newtons_to_pounds_force(self) -> None:
        self.assertAlmostEqual(
            convert_unit(1.0, "N", "lbf"),
            1 / NEWTONS_PER_LBF,
            places=15,
        )

    def test_converts_pounds_force_to_newtons(self) -> None:
        self.assertEqual(convert_unit(1.0, "lbf", "N"), NEWTONS_PER_LBF)

    def test_converts_celsius_to_fahrenheit(self) -> None:
        self.assertEqual(convert_unit(0.0, "°C", "°F"), 32.0)

    def test_converts_fahrenheit_to_celsius(self) -> None:
        self.assertEqual(convert_unit(32.0, "°F", "°C"), 0.0)

    def test_rejects_unknown_unit(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unité inconnue : cm"):
            convert_unit(1.0, "cm", "mm")  # type: ignore[arg-type]

    def test_rejects_unsupported_conversion(self) -> None:
        with self.assertRaisesRegex(
            ValueError,
            "Conversion non supportée : mm -> N",
        ):
            convert_unit(1.0, "mm", "N")
