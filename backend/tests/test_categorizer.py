import pytest
from app.services.categorizer import categorize


def test_swiggy_is_food():
    assert categorize("Payment to Swiggy Foods") == "Food & Dining"


def test_zomato_is_food():
    assert categorize("ZOMATO ORDER 12345") == "Food & Dining"


def test_ola_is_transport():
    assert categorize("Ola Cabs ride payment") == "Transport"


def test_amazon_is_shopping():
    assert categorize("Amazon.in purchase") == "Shopping"


def test_netflix_is_entertainment():
    assert categorize("NETFLIX SUBSCRIPTION") == "Entertainment"


def test_jio_is_utilities():
    assert categorize("Jio recharge 299") == "Utilities"


def test_unknown_is_uncategorized():
    assert categorize("Random merchant XYZ") == "Uncategorized"


def test_case_insensitive():
    assert categorize("SWIGGY PAYMENT") == "Food & Dining"


def test_empty_string():
    assert categorize("") == "Uncategorized"
