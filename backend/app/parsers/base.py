from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class RawTransaction:
    date: date
    description: str
    account: str
    amount: Decimal  # negative = debit, positive = credit
    note: str | None = None
    raw_text: str | None = None


class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        """Extract raw transactions from PDF bytes."""
        ...

    @staticmethod
    def extract_text(file_bytes: bytes) -> str:
        import io
        import pdfplumber

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages)

    @staticmethod
    def extract_tables(file_bytes: bytes) -> list[list[list[str | None]]]:
        import io
        import pdfplumber

        all_tables: list[list[list[str | None]]] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    all_tables.extend(tables)
        return all_tables
