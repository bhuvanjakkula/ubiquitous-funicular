from ledgertrace.money import parse_cents


def parse_amount_to_cents(raw: str) -> int:
    """Required amount; blank values are errors."""
    return parse_cents(raw)


def parse_optional_cents(raw: str) -> int:
    return 0 if not raw.strip() else parse_amount_to_cents(raw)
