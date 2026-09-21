from typing import Literal


Unit = Literal["mm", "inch", "N", "lbf", "°C", "°F"]

MM_PER_INCH = 25.4
NEWTONS_PER_LBF = 4.4482216152605
SUPPORTED_UNITS = {"mm", "inch", "N", "lbf", "°C", "°F"}


def convert_unit(value: float, from_unit: Unit, to_unit: Unit) -> float:
    if from_unit not in SUPPORTED_UNITS:
        raise ValueError(f"Unité inconnue : {from_unit}")
    if to_unit not in SUPPORTED_UNITS:
        raise ValueError(f"Unité inconnue : {to_unit}")

    if from_unit == "mm" and to_unit == "inch":
        return value / MM_PER_INCH
    if from_unit == "inch" and to_unit == "mm":
        return value * MM_PER_INCH
    if from_unit == "N" and to_unit == "lbf":
        return value / NEWTONS_PER_LBF
    if from_unit == "lbf" and to_unit == "N":
        return value * NEWTONS_PER_LBF
    if from_unit == "°C" and to_unit == "°F":
        return value * 9 / 5 + 32
    if from_unit == "°F" and to_unit == "°C":
        return (value - 32) * 5 / 9

    raise ValueError(f"Conversion non supportée : {from_unit} -> {to_unit}")
