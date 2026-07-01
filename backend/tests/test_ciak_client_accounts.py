import pytest

from services.ciak_client_accounts import (
    default_start_progress,
    offer_for_score,
    partnership_price_for_client,
)


def test_offer_for_score_routes_below_50_to_start():
    assert offer_for_score(49) == "ciak_start"
    assert offer_for_score(0) == "ciak_start"


def test_offer_for_score_routes_50_and_above_to_partnership():
    assert offer_for_score(50) == "partnership"
    assert offer_for_score(87) == "partnership"


def test_partnership_price_applies_guaranteed_start_credit():
    client = {"access_level": "cliente_start", "start_credit_amount": 49900}
    price = partnership_price_for_client(client)
    assert price == {
        "full_amount_cents": 279000,
        "credit_amount_cents": 49900,
        "due_amount_cents": 229100,
        "currency": "eur",
    }


def test_partnership_price_without_start_is_full_price():
    price = partnership_price_for_client({"access_level": "cliente_blueprint"})
    assert price["due_amount_cents"] == 279000
    assert price["credit_amount_cents"] == 0


def test_default_start_progress_has_expected_services():
    labels = [item["label"] for item in default_start_progress()]
    assert labels == [
        "Direzione di posizionamento",
        "Basi del brand",
        "Sistemazione profili social",
        "Sito vetrina semplice",
        "Strategia contenuti",
        "Calendario contenuti",
        "Revisione finale e readiness partnership",
    ]
