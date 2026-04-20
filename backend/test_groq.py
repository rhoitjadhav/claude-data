"""Quick Groq categorization test — run before uploading a full PDF."""
import asyncio
import os
import sys

# Load .env manually
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

from app.services.categorizer import categorize_batch

SAMPLE = [
    ("Payment to Swiggy", "Food order"),
    ("UPI payment to IRCTC", None),
    ("Paid to Amazon", "Birthday gift"),
    ("Transfer to Reliance Jio", "Monthly recharge"),
    ("Payment to ABC Pharmacy", None),
    # Navi-style: note carries the real meaning
    ("Paid to NZM BROADBAND", "Internet Recharge NZM"),
    ("Paid to PETROL PUMP", "Petrol 3720 ml"),
    ("Paid to CROMA", "Samsung Washing Machine 7 KG AI"),
    ("Paid to Babu", "Paani Puri"),
]


async def main() -> None:
    print(f"Testing Groq with {len(SAMPLE)} transactions...\n")
    try:
        results = await categorize_batch(SAMPLE)
        for (desc, note), category in zip(SAMPLE, results):
            note_str = f" | Note: {note}" if note else ""
            print(f"  {desc}{note_str}  →  {category}")
        print("\nGroq is working!")
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)


asyncio.run(main())
