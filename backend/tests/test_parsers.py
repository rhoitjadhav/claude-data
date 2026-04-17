from datetime import date
from decimal import Decimal
from unittest.mock import patch

from app.parsers.base import BaseParser
from app.parsers.navi import NaviParser
from app.parsers.phonepe import PhonePeParser
from app.parsers.googlepay import GooglePayParser
from app.parsers.detector import detect_parser

# ---------------------------------------------------------------------------
# Navi
# ---------------------------------------------------------------------------

_NAVI_HEADER = (
    "ROHIT DILIP JADHAV\n"
    "+91 8070316131\n"
    "Transaction statement from 1 Jan 2025 to 31 Jan 2025\n"
    "All UPI, bill payments & recharges done via Navi are listed in this statement\n"
    "Date Transaction details Account Amount\n"
)


def test_navi_parses_debit_row():
    text = _NAVI_HEADER + (
        "14 Jan 2025 Paid to Swiggy \u20b9250\n"
        "ICICI Bank - XX98\n"
        "12:38 PM UPI txn ID: 123456789\n"
        "Note: food\n"
    )
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = NaviParser().parse(b"fake")
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-250")
    assert txns[0].description == "Paid to Swiggy"
    assert txns[0].date == date(2025, 1, 14)
    assert txns[0].note == "food"
    assert txns[0].account == "ICICI Bank - XX98"


def test_navi_parses_multiple_rows():
    text = _NAVI_HEADER + (
        "14 Jan 2025 Paid to Swiggy \u20b9250\n"
        "ICICI Bank - XX98\n"
        "12:38 PM UPI txn ID: 111\n"
        "Note: food\n"
        "13 Jan 2025 Paid to Rapido \u20b9180\n"
        "UPI Lite\n"
        "10:00 AM UPI txn ID: 222\n"
        "Note: cab\n"
    )
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = NaviParser().parse(b"fake")
    assert len(txns) == 2
    assert txns[0].amount == Decimal("-250")
    assert txns[1].amount == Decimal("-180")


def test_navi_excludes_received_from():
    """Received-from entries should be positive (filter will drop them)."""
    text = _NAVI_HEADER + (
        "10 Jan 2025 Received from SOMEONE \u20b9500\n"
        "ICICI Bank - XX98\n"
        "9:00 AM UPI txn ID: 333\n"
        "Note: null\n"
    )
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = NaviParser().parse(b"fake")
    assert len(txns) == 1
    assert txns[0].amount == Decimal("500")   # positive → filter will drop it


def test_navi_amount_with_comma():
    text = _NAVI_HEADER + (
        "1 Jan 2025 Paid to MERCHANT \u20b91,500\n"
        "ICICI Bank - XX98\n"
        "8:00 AM UPI txn ID: 444\n"
        "Note: null\n"
    )
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = NaviParser().parse(b"fake")
    assert txns[0].amount == Decimal("-1500")


# ---------------------------------------------------------------------------
# PhonePe
# ---------------------------------------------------------------------------

_PHONEPE_HEADER = "PhonePe Transaction History\nDate & Time           Description                    Amount\n"


def test_phonepe_parses_debit():
    text = _PHONEPE_HEADER + "14 Jan 2025 10:30  Swiggy payment                    -320.00 Dr\n"
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = PhonePeParser().parse(b"fake")
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-320.00")
    assert txns[0].date == date(2025, 1, 14)


def test_phonepe_cr_becomes_positive():
    text = _PHONEPE_HEADER + "14 Jan 2025 10:30  Refund from Swiggy              320.00 Cr\n"
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = PhonePeParser().parse(b"fake")
    assert len(txns) == 1
    assert txns[0].amount == Decimal("320.00")


# ---------------------------------------------------------------------------
# Google Pay
# ---------------------------------------------------------------------------

_GPAY_HEADER = "Google Pay Transaction Details\nDate        Description                    Amount\n"


def test_gpay_parses_debit():
    text = _GPAY_HEADER + "Jan 14, 2025  Ola Cabs                        -150.00\n"
    with patch.object(BaseParser, "extract_text", return_value=text):
        txns = GooglePayParser().parse(b"fake")
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-150.00")
    assert txns[0].date == date(2025, 1, 14)


# ---------------------------------------------------------------------------
# Detector
# ---------------------------------------------------------------------------

def test_detector_navi():
    text = _NAVI_HEADER + "14 Jan 2025 Paid to Swiggy \u20b9200\nICICI Bank - XX98\n9:00 AM UPI txn ID: 1\nNote: food\n"
    with patch.object(BaseParser, "extract_text", return_value=text):
        parser = detect_parser(b"fake")
    assert isinstance(parser, NaviParser)


def test_detector_phonepe():
    text = "PhonePe Transaction History\n" + "14 Jan 2025 10:30  Swiggy  -200.00 Dr\n"
    with patch.object(BaseParser, "extract_text", return_value=text):
        parser = detect_parser(b"fake")
    assert isinstance(parser, PhonePeParser)


def test_detector_gpay():
    text = "Google Pay Transaction Details\n" + "Jan 14, 2025  Swiggy  -200.00\n"
    with patch.object(BaseParser, "extract_text", return_value=text):
        parser = detect_parser(b"fake")
    assert isinstance(parser, GooglePayParser)