from decimal import Decimal

from app.services.filters import should_include


def test_debit_included():
    assert should_include("Paid to merchant", Decimal("-200.00")) is True


def test_credit_excluded():
    assert should_include("Received from John", Decimal("500.00")) is False


def test_upi_lite_topup_excluded():
    assert should_include("UPI Lite Auto top-up", Decimal("-100.00")) is False


def test_received_from_excluded():
    assert should_include("Received from Rahul via UPI", Decimal("300.00")) is False


def test_upi_lite_deduction_included():
    assert should_include("UPI Lite deduction - Swiggy", Decimal("-80.00")) is True


def test_case_insensitive_exclusion():
    assert should_include("upi lite auto top-up for wallet", Decimal("-100.00")) is False


def test_zero_amount_excluded():
    assert should_include("Some transaction", Decimal("0.00")) is False