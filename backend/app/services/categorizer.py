import json
import logging
import os

from groq import AsyncGroq

logger = logging.getLogger(__name__)

CATEGORIES = [
    "Food & Dining",
    "Transport",
    "Groceries",
    "Shopping",
    "Entertainment",
    "Health",
    "Utilities",
    "Rent & Housing",
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
        "netflix", "spotify", "prime video", "hotstar", "bookmyshow",
        "youtube premium", "disney", "sony liv", "zee5", "apple music",
        "gaana", "hungama", "pvr", "inox",
    ],
    "Health": [
        "pharmacy", "medplus", "apollo pharmacy", "1mg", "netmeds",
        "doctor", "hospital", "clinic", "dental", "lab test",
        "healthkart", "cult.fit", "gym",
    ],
    "Utilities": [
        "electricity", "water bill", "gas cylinder", "broadband",
        "jio", "airtel", "bharti airtel", "vi ", "vodafone", "idea", "bsnl",
        "recharge", "dth", "tatasky", "dish tv", "internet", "wifi",
        "internet recharge", "net recharge", "data recharge",
    ],
    "Rent & Housing": [
        "rent", "house rent", "room rent", "flat rent",
        "maintenance", "society charges", "kamvali", "maid", "vamshivat voice",
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
}

_SYSTEM = (
    "You are a UPI transaction categorizer. Given a list of transactions, "
    "return a JSON array of category names — one per transaction, same order.\n\n"
    "Valid categories:\n"
    + "\n".join(f"- {c}" for c in CATEGORIES)
    + "\n\nReturn ONLY a JSON array like: [\"Food & Dining\", \"Transport\", ...]\n"
    "No explanation. No markdown. Just the JSON array."
)

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    return _client


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


async def categorize_batch(transactions: list[tuple[str, str | None]]) -> list[str]:
    """Categorize transactions — Groq first, keyword fallback on any error."""
    if not transactions:
        return []

    try:
        lines = []
        for i, (description, note) in enumerate(transactions):
            parts = []
            if note and note.lower() not in ("paid via navi upi", "paid via navi", "null", ""):
                parts.append(f"Note: {note}")
            parts.append(f"Description: {description}")
            lines.append(f"{i+1}. {' | '.join(parts)}")

        response = await _get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": "\n".join(lines)},
            ],
            temperature=0,
        )
        categories = json.loads(response.choices[0].message.content.strip())

        if isinstance(categories, list) and len(categories) == len(transactions):
            return [c if c in CATEGORIES else "Uncategorized" for c in categories]

    except Exception as e:
        logger.warning("Groq categorization failed (%s), falling back to keywords", e)

    return [_keyword_categorize(desc, note) for desc, note in transactions]
