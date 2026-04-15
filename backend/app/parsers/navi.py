import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction

_MONTHS = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}

# Matches: "30 Sep 2025 Paid to SOMEONE ₹1,500"  or  "3 Sep 2025 Bill payment of XYZ ₹750.50"
_HEADER = re.compile(
    r'^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(.+?)\s+₹([\d,]+(?:\.\d{1,2})?)$'
)
# Time line: "12:38 PM UPI txn ID: 563944389217"  or  "1:50 PM"
_TIME = re.compile(r'^\d{1,2}:\d{2}\s+[AP]M')
# UPI txn ID only line: "UPI txn ID: 563944389217"
_TXN_ID = re.compile(r'^UPI txn ID:')
# Note line
_NOTE = re.compile(r'^Note:\s*(.*)')
# Page header lines to skip
_SKIP = re.compile(
    r'^(ROHIT.*|Transaction statement.*|All UPI.*|Date Transaction.*|\+91\s*\d+)$',
    re.IGNORECASE,
)


class NaviParser(BaseParser):
    """Parse Navi UPI statement PDFs.

    Real format (multi-line per transaction):
        30 Sep 2025 Paid to MERCHANT NAME ₹1,500
        ICICI Bank - XX98
        12:38 PM UPI txn ID: 563944389217
        Note: Some note text

    Amount is always shown positive; debits are negated, credits kept positive.
    """

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

        # Find indices where each transaction starts
        starts = [i for i, ln in enumerate(lines) if _HEADER.match(ln)]

        transactions: list[RawTransaction] = []
        for idx, start in enumerate(starts):
            end = starts[idx + 1] if idx + 1 < len(starts) else len(lines)
            chunk = lines[start:end]
            txn = self._parse_chunk(chunk)
            if txn is not None:
                transactions.append(txn)

        return transactions

    def _parse_chunk(self, chunk: list[str]) -> RawTransaction | None:
        header_match = _HEADER.match(chunk[0])
        if not header_match:
            return None

        day_s, mon_s, year_s, description, amount_s = header_match.groups()

        try:
            month = _MONTHS[mon_s.lower()]
            txn_date = datetime(int(year_s), month, int(day_s)).date()
            amount = Decimal(amount_s.replace(',', ''))
        except (ValueError, KeyError, InvalidOperation):
            return None

        # Walk remaining lines to extract account and note
        account = ''
        note_parts: list[str] = []
        in_note = False

        for line in chunk[1:]:
            if _SKIP.match(line):
                continue
            if _TIME.match(line) or _TXN_ID.match(line):
                in_note = False
                continue
            note_match = _NOTE.match(line)
            if note_match:
                val = note_match.group(1).strip()
                if val.lower() != 'null' and val:
                    note_parts.append(val)
                in_note = True
                continue
            if in_note:
                # continuation of a multi-line note
                note_parts.append(line)
                continue
            if not account:
                account = line

        note = ' '.join(note_parts) if note_parts else None

        # Navi shows all amounts positive; negate debits so the filter passes them
        is_credit = 'received from' in description.lower()
        signed_amount = amount if is_credit else -amount

        return RawTransaction(
            date=txn_date,
            description=description.strip(),
            account=account.strip(),
            amount=signed_amount,
            note=note,
            raw_text='\n'.join(chunk),
        )