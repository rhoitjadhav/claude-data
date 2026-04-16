CATEGORY_RULES: dict[str, list[str]] = {
    "Food & Dining": [
        # Apps
        "swiggy", "zomato", "blinkit", "zepto", "dunzo", "instamart",
        # Chains
        "domino", "mcdonald", "kfc", "subway", "pizza", "burger",
        # Generic
        "restaurant", "café", "cafe", "diner", "eatery", "dhaba",
        "hotel new", "south twist", "sagar sweets", "madhur sweets",
        "iskcon",
        # Food words
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
        "lifestyle", "westside", "zara", "h&m", "zudio",
        "reliance retail",
        "dress", "jeans", "shirt", "clothes", "clothing", "garment",
        "bouquet", "gift", "jewellery", "chain", "bengal",
        "mridanga", "musical",
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
    ],
    "Rent & Housing": [
        "rent", "house rent", "room rent", "flat rent",
        "maintenance", "society charges", "kamvali", "maid",
        "vamshivat voice",
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


def categorize(description: str, note: str | None = None) -> str:
    """Return category by matching keywords against description + note.

    Checks note first (richer context), then description. First match wins.
    Falls back to 'Uncategorized'.
    """
    # Combine note + description into one search string; note first (more specific)
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