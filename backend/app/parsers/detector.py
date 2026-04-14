from app.parsers.base import BaseParser
from app.parsers.googlepay import GooglePayParser
from app.parsers.navi import NaviParser
from app.parsers.phonepe import PhonePeParser


def detect_parser(file_bytes: bytes) -> BaseParser:
    """Detect which app generated the PDF and return the appropriate parser.

    Detection is keyword-based on extracted text.
    Defaults to NaviParser if no match found.
    """
    text = NaviParser.extract_text(file_bytes).lower()

    if "phonepe" in text or "phone pe" in text or "phonepetransaction" in text:
        return PhonePeParser()
    if "google pay" in text or "gpay" in text or "google payment" in text:
        return GooglePayParser()
    return NaviParser()
