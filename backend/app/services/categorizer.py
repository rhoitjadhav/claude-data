import asyncio
import json
import logging
import os
import re

from groq import AsyncGroq
from mistralai.client import Mistral

logger = logging.getLogger(__name__)

CATEGORIES = [
    "Food & Dining",
    "Transport",
    "Groceries",
    "Shopping",
    "Entertainment",
    "Subscriptions",
    "Health",
    "Recharge",
    "Bill",
    "Rent",
    "Family",
    "Household",
    "Social Life",
    "Lending",
    "Education",
    "Finance",
    "Uncategorized",
]

CATEGORY_RULES: dict[str, list[str]] = {
    "Food & Dining": [
        "swiggy", "zomato", "blinkit", "zepto", "dunzo", "instamart",
        "domino", "mcdonald", "kfc", "subway", "pizza", "burger",
        "restaurant", "café", "cafe", "diner", "eatery", "dhaba",
        "hotel new", "south twist", "sagar sweets", "madhur sweets", "iskcon",
        "biryani", "nasta", "khava", "vada", "misal", "bhaji", "chaha",
        "tifin", "tiffin", "lunch", "dinner", "breakfast", "snack",
        "pav", "roti", "rice", "sweets", "chocolate", "dairy",
        "bakers", "bakery",
    ],
    "Transport": [
        "ola", "uber", "rapido", "irctc", "redbus", "metro",
        "petrol", "fuel", "parking", "toll",
        "cab", "taxi", "auto rickshaw", "rickshaw", "auto to", "auto for",
        "yulu", "bounce", "vogo",
        "honda", "bike emi", "vehicle emi", "car emi", "sp 125",
        "train", "bus ticket", "flight",
    ],
    "Groceries": [
        "bigbasket", "dmart", "reliance fresh", "milkbasket",
        "supermarket", "kirana", "vegetables", "fruits",
        "provisions", "royal balaji", "comfort surf", "surf excel",
        "shivam dairy", "milk", "ghee", "paneer",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
        "snapdeal", "tatacliq", "reliance digital", "croma", "vijay sales",
        "lifestyle", "westside", "zara", "h&m", "zudio", "reliance retail",
        "dress", "jeans", "shirt", "clothes", "clothing", "garment",
        "bouquet", "gift", "jewellery", "chain", "bengal", "mridanga", "musical",
        "washing machine", "refrigerator", "fridge", "tv ", "television",
        "laptop", "mobile", "phone", "samsung", "lg ", "whirlpool", "sony",
        "ac", "air conditioner", "microwave", "cooler", "fan ",
    ],
    "Entertainment": [
        "bookmyshow", "pvr", "inox", "movie ticket", "concert",
        "amusement", "theme park",
    ],
    "Subscriptions": [
        "netflix", "spotify", "prime video", "hotstar",
        "youtube premium", "disney", "sony liv", "zee5", "apple music",
        "gaana", "hungama", "subscription", "membership",
    ],
    "Health": [
        "pharmacy", "medplus", "apollo pharmacy", "1mg", "netmeds",
        "doctor", "hospital", "clinic", "dental", "lab test",
        "healthkart", "cult.fit", "gym",
    ],
    "Recharge": [
        "jio", "airtel", "bharti airtel", "vi ", "vodafone", "idea", "bsnl",
        "recharge", "prepaid", "internet recharge", "net recharge",
        "data recharge", "mobile recharge", "dth", "tatasky", "dish tv",
    ],
    "Bill": [
        "electricity", "electric bill", "light bill", "water bill",
        "gas cylinder", "gas bill", "broadband", "internet bill",
        "wifi", "maintenance", "society charges", "mseb", "bescom",
        "tata power", "adani electricity",
    ],
    "Rent": [
        "rent", "house rent", "room rent", "flat rent",
        "kamvali", "maid", "vamshivat voice",
    ],
    "Family": [
        "family", "mother", "father", "parents", "brother", "sister",
        "wife", "husband", "son", "daughter", "home expense",
    ],
    "Education": [
        "udemy", "coursera", "byju", "unacademy", "vedantu",
        "school fees", "college fees", "tuition", "coaching",
        "fees", "kundli",
    ],
    "Finance": [
        "insurance", "emi payment", "loan repayment", "credit card payment",
        "mutual fund", "zerodha", "groww", "upstox", "angel broking",
        "ppf", "nps", "salary", "advance salary",
    ],
    "Household": [
        "broom", "mop", "cleaning", "detergent", "utensil", "vessel",
        "bucket", "furniture", "curtain", "bedsheet", "pillow", "mattress",
        "household", "home decor", "repair", "plumber", "electrician",
        "carpenter", "pest control", "iron box", "mixer", "grinder",
    ],
    "Social Life": [
        "party", "birthday", "celebration", "outing", "trip", "picnic",
        "bar", "pub", "lounge", "club ", "wedding", "anniversary",
        "hangout", "meet ", "reunion", "gift for", "flowers",
        "treat", "get together",
    ],
    "Lending": [
        "lend", "lending", "borrowed", "gave to", "given to",
    ],
}

_SYSTEM = (
    "Categorize UPI transactions. Output ONLY a JSON array, nothing else.\n"
    "One category per transaction, same order as input.\n\n"
    "Categories: " + ", ".join(f'"{c}"' for c in CATEGORIES) + "\n\n"
    "Example output for 3 inputs: [\"Food & Dining\", \"Transport\", \"Rent\"]\n"
    "RULES: No explanation. No markdown. No extra text. Start with [ end with ]."
)

_client: AsyncGroq | None = None
_mistral_client: Mistral | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def _get_mistral_client() -> Mistral:
    global _mistral_client
    if _mistral_client is None:
        _mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
    return _mistral_client


def _keyword_categorize(description: str, note: str | None = None) -> str:
    parts = []
    if note and note.lower() not in ("paid via navi upi", "paid via navi", "null", ""):
        parts.append(note.lower())
    parts.append(description.lower())
    text = " ".join(parts)
    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in text:
                return category
    return "Uncategorized"


_CHUNK_SIZE = 50


async def _categorize_chunk(chunk: list[tuple[str, str | None]]) -> list[str]:
    """Categorize one chunk via Mistral, keyword fallback on failure."""
    lines = []
    for i, (description, note) in enumerate(chunk):
        parts = []
        if note and note.lower() not in ("paid via navi upi", "paid via navi", "null", ""):
            parts.append(f"Note: {note}")
        parts.append(f"Description: {description}")
        lines.append(f"{i+1}. {' | '.join(parts)}")

    def _parse(raw: str) -> list[str] | None:
        match = re.search(r'\[.*]', raw, re.DOTALL)
        if not match:
            return None
        try:
            cats = json.loads(match.group())
        except json.JSONDecodeError:
            return None
        if isinstance(cats, list) and len(cats) == len(chunk):
            return [c if c in CATEGORIES else "Uncategorized" for c in cats]
        logger.warning("Mistral returned %d categories for %d transactions", len(cats) if isinstance(cats, list) else -1, len(chunk))
        return None

    user_msg = f"Categorize exactly {len(chunk)} transactions:\n" + "\n".join(lines)

    for attempt in range(2):
        try:
            response = await _get_mistral_client().chat.complete_async(
                model="mistral-small-latest",
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0,
            )
            result = _parse(response.choices[0].message.content.strip())
            if result:
                return result
            logger.warning("Mistral count mismatch on attempt %d, %s", attempt + 1,
                           "retrying" if attempt == 0 else "falling back to keywords")
        except Exception as e:
            logger.warning("Mistral attempt %d failed: %s", attempt + 1, e)
        if attempt == 0:
            await asyncio.sleep(3)

    return [_keyword_categorize(desc, note) for desc, note in chunk]


async def categorize_batch(transactions: list[tuple[str, str | None]]) -> list[str]:
    """Categorize transactions in chunks — Mistral per chunk, keyword fallback on failure."""
    if not transactions:
        return []

    results: list[str] = []
    for i in range(0, len(transactions), _CHUNK_SIZE):
        chunk = transactions[i:i + _CHUNK_SIZE]
        logger.info("Categorizing chunk %d-%d of %d", i + 1, i + len(chunk), len(transactions))
        results.extend(await _categorize_chunk(chunk))
    return results


class MistralAPIClient:
    def __init__(self):
        self._client = None

