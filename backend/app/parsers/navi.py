import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction


class NaviParser(BaseParser):
    """Parse Navi UPI statement PDFs.

    Navi PDFs have a text table with columns:
    Date | Description | Account | Amount | Note

    Date format: DD/MM/YYYY
    Amount: negative for debits (e.g. -250.00), positive for credits
    """

    # Matches lines like: 14/01/2025  Payment to Swiggy  user@upi  -250.00  food
    ROW_PATTERN = re.compile(
        r"(\d{2}/\d{2}/\d{4})\s+"       # date
        r"(.+?)\s{2,}"                   # description (2+ spaces as separator)
        r"([\w@.]+)\s+"                  # account
        r"(-?\d+(?:\.\d{2})?)"           # amount
        r"(?:\s+(.+))?"                  # optional note
    )

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        transactions: list[RawTransaction] = []

        for line in text.splitlines():
            match = self.ROW_PATTERN.search(line)
            if not match:
                continue
            date_str, description, account, amount_str, note = match.groups()
            try:
                txn_date = datetime.strptime(date_str, "%d/%m/%Y").date()
                amount = Decimal(amount_str)
            except (ValueError, InvalidOperation):
                continue

            transactions.append(
                RawTransaction(
                    date=txn_date,
                    description=description.strip(),
                    account=account.strip(),
                    amount=amount,
                    note=note.strip() if note else None,
                    raw_text=line,
                )
            )

        return transactions
