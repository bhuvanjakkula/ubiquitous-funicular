"""Exact cents. Decimal is used only to parse textual input, never floats."""
from dataclasses import dataclass
import re

LIMIT = 2**63 - 1

def parse_cents(value: str) -> int:
    if not isinstance(value, str):
        raise ValueError("Money must be a decimal string")
    s = re.sub(r"[\s$,]", "", value)
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    if not re.fullmatch(r"[+-]?\d+(?:\.\d{1,2})?", s):
        raise ValueError("Invalid money: use at most two decimal places")
    negative = s.startswith("-")
    whole, _, fraction = s.lstrip("+-").partition(".")
    cents = (int(whole) * 100 + int(fraction.ljust(2, "0"))) * (-1 if negative else 1)
    if abs(cents) > LIMIT:
        raise ValueError("Money exceeds SQLite integer range")
    return cents

@dataclass(frozen=True, slots=True)
class Money:
    cents: int
    currency: str = "USD"

    def __post_init__(self):
        if type(self.cents) is not int or abs(self.cents) > LIMIT:
            raise ValueError("Money requires signed 64-bit integer cents")
        if not re.fullmatch(r"[A-Z]{3}", self.currency):
            raise ValueError("Currency must be three uppercase letters")

    def _check(self, other):
        if not isinstance(other, Money) or self.currency != other.currency:
            raise ValueError("Money arithmetic requires matching currencies")

    def __add__(self, other):
        self._check(other)
        return Money(self.cents + other.cents, self.currency)

    def __sub__(self, other):
        self._check(other)
        return Money(self.cents - other.cents, self.currency)
