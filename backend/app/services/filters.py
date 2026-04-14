from decimal import Decimal

EXCLUDE_PHRASES = [
    "upi lite auto top-up",
    "received from",
]


def should_include(description: str, amount: Decimal) -> bool:
    """Return True if transaction should be saved.

    Rules:
    - Amount must be negative (debit) and non-zero.
    - Description must not contain any excluded phrase (case-insensitive).
    - UPI Lite deductions (not top-ups) are included.
    """
    if amount >= 0:
        return False

    lowered = description.lower()
    for phrase in EXCLUDE_PHRASES:
        if phrase in lowered:
            return False

    return True