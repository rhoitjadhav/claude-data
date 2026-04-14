import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction


class GooglePayParser(BaseParser):
    """Parse Google Pay transaction detail PDFs.

    Format: Date | Description | Amount
    Date format: Mon DD, YYYY  (e.g. Jan 14, 2025)
    Amount: negative for debits
    """

    ROW_PATTERN = re.compile(
        r"(\w{3}\s+\d{1,2},\s+\d{4})\s+"   # date
        r"(.+?)\s{2,}"                        # description
        r"(-?\d+(?:\.\d{2})?)"               # amount
    )

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        transactions: list[RawTransaction] = []

        for line in text.splitlines():
            match = self.ROW_PATTERN.search(line)
            if not match:
                continue
            date_str, description, amount_str = match.groups()
            try:
                txn_date = datetime.strptime(date_str.strip(), "%b %d, %Y").date()
                amount = Decimal(amount_str)
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