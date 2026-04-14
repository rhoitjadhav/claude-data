import io
from datetime import date
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.parsers.navi import NaviParser


def make_navi_pdf(rows: list[tuple]) -> bytes:
    """Generate a minimal Navi-style PDF for testing."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 800, "Navi UPI Statement")
    c.drawString(50, 780, "Date        Description                    Account          Amount      Note")
    c.setFont("Helvetica", 9)
    y = 760
    for row in rows:
        line = f"{row[0]}  {row[1]:<35} {row[2]:<20} {row[3]:<12} {row[4]}"
        c.drawString(50, y, line)
        y -= 15
    c.save()
    buf.seek(0)
    return buf.read()


def test_navi_parses_debit_row():
    rows = [("14/01/2025", "Payment to Swiggy", "user@upi", "-250.00", "food")]
    pdf_bytes = make_navi_pdf(rows)
    parser = NaviParser()
    txns = parser.parse(pdf_bytes)
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-250.00")
    assert txns[0].description == "Payment to Swiggy"
    assert txns[0].date == date(2025, 1, 14)


def test_navi_parses_multiple_rows():
    rows = [
        ("14/01/2025", "Payment to Swiggy", "user@upi", "-250.00", ""),
        ("15/01/2025", "Ola ride", "user@upi", "-180.00", "cab"),
    ]
    pdf_bytes = make_navi_pdf(rows)
    parser = NaviParser()
    txns = parser.parse(pdf_bytes)
    assert len(txns) == 2
