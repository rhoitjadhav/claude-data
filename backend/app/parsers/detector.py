from app.parsers.base import BaseParser
from app.parsers.googlepay import GooglePayParser
from app.parsers.navi import NaviParser
from app.parsers.phonepe import PhonePeParser


def detect_parser(file_bytes: bytes) -> BaseParser:
    """Detect which app generated the PDF and return the appropriate parser.

    Uses only the first ~1500 chars (header area) to avoid false positives
    from merchant names in the transaction body (e.g. 'Paid to PhonePe').
    Checks Navi first since its header is the most distinctive.
    Defaults to NaviParser if no match found.
    """
    full_text = NaviParser.extract_text(file_bytes).lower()
    header = full_text[:1500]

    # Navi: distinctive header phrase present on every statement
    if "done via navi" in header or "recharges done via navi" in header:
        return NaviParser()
    # PhonePe and Google Pay have their own branded headers
    if "phonepe" in header or "phone pe" in header or "phonepetransaction" in header:
        return PhonePeParser()
    if "google pay" in header or "gpay" in header or "google payment" in header:
        return GooglePayParser()
    return NaviParser()
