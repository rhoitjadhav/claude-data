# NOTE: Expand CATEGORY_RULES keywords from user's Excel reference sheet
# before first real upload. Each list is lowercase; matching is case-insensitive.

CATEGORY_RULES: dict[str, list[str]] = {
    "Food & Dining": [
        "swiggy", "zomato", "blinkit", "zepto", "dunzo", "restaurant",
        "café", "cafe", "hotel food", "domino", "mcdonald", "kfc", "subway",
        "pizza", "burger", "biryani", "mess", "tiffin", "diner", "eatery",
    ],
    "Transport": [
        "ola", "uber", "rapido", "irctc", "redbus", "metro", "petrol",
        "fuel", "parking", "toll", "cab", "taxi", "auto rickshaw", "rickshaw",
        "yulu", "bounce", "vogo",
    ],
    "Groceries": [
        "bigbasket", "dmart", "reliance fresh", "nature's basket", "grofers",
        "instamart", "milkbasket", "supermarket", "kirana", "vegetables",
        "fruits stall", "provisions",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
        "snapdeal", "tatacliq", "reliance digital", "croma", "vijay sales",
        "lifestyle", "westside", "zara", "h&m",
    ],
    "Entertainment": [
        "netflix", "spotify", "prime video", "hotstar", "bookmyshow",
        "youtube premium", "disney", "sony liv", "zee5", "apple music",
        "gaana", "hungama", "pvr", "inox",
    ],
    "Health": [
        "pharmacy", "medplus", "apollo pharmacy", "1mg", "netmeds",
        "doctor", "hospital", "clinic", "dental", "lab test", "healthkart",
        "cult.fit", "gym",
    ],
    "Utilities": [
        "electricity", "water bill", "gas", "broadband", "jio", "airtel",
        "vi ", "vodafone", "idea", "bsnl", "recharge", "dth", "tatasky",
        "dish tv", "internet",
    ],
    "Education": [
        "udemy", "coursera", "byju", "unacademy", "vedantu", "collegedunia",
        "school fees", "college fees", "tuition", "coaching",
    ],
    "Finance": [
        "insurance", "emi payment", "loan repayment", "credit card payment",
        "mutual fund", "zerodha", "groww", "upstox", "angel broking",
        "ppf", "nps",
    ],
}


def categorize(description: str) -> str:
    """Return category for a transaction description using keyword matching.

    First match wins. Falls back to 'Uncategorized'.
    """
    lowered = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in lowered:
                return category
    return "Uncategorized"
