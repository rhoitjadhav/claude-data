import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction


class PhonePeParser(BaseParser):
    """Parse PhonePe transaction history PDFs.

    Format: Date & Time | Description | Amount (with Dr/Cr suffix)
    Date format: DD Mon YYYY HH:MM  (e.g. 14 Jan 2025 10:30)
    Amount: e.g. -320.00 Dr or 500.00 Cr
    """

    ROW_PATTERN = re.compile(
        r"(\d{1,2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2})\s+"  # date+time
        r"(.+?)\s{2,}"                                    # description
        r"(-?\d+(?:\.\d{2})?)\s*(Dr|Cr)?"                # amount + direction
    )

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        transactions: list[RawTransaction] = []

        for line in text.splitlines():
            match = self.ROW_PATTERN.search(line)
            if not match:
                continue
            date_str, description, amount_str, direction = match.groups()
            try:
                txn_date = datetime.strptime(date_str.strip(), "%d %b %Y %H:%M").date()
                amount = Decimal(amount_str)
                if direction == "Dr" and amount > 0:
                    amount = -amount
                elif direction == "Cr" and amount < 0:
                    amount = -amount
            except (ValueError, InvalidOperation):
                continue

            transactions.append(
                RawTransaction(
                    date=txn_date,
                    description=description.strip(),
                    account="",
                    amount=amount,
                    raw_text=line,
                )
            )

        return transactions