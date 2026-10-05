"""Il prezzo del webinar viene dall'offerta vera, mai dall'AI (caso Daniele: 97/67 invece di 497/297)."""
import asyncio

import pytest

import services.offer_price as op
import services.webinar_deck as wd
import services.webinar_strategy as ws

pytestmark = pytest.mark.unit

ANSWERS = {"nicchia": "adulti sotto stress", "metodo_nome": "Metodo Sabai", "promessa": "ritrovare calma",
           "trasformazione_90gg": "dormire meglio"}


def test_offer_price_is_read_from_the_free_text_of_the_offer():
    offer = op.parse_offer("297€ (listino 497€)", "12 moduli")
    assert offer["listino"] == 497 and offer["promo"] == 297 and offer["allowed"] == {297, 497}
    assert offer["includes"] == "12 moduli"
    assert op.parse_offer("€ 497 scontato a 297 euro")["promo"] == 297
    assert op.parse_offer("1.497€")["listino"] == 1497
    single = op.parse_offer("497€")
    assert single["listino"] == 497 and single["promo"] is None


def test_a_missing_or_confusing_price_is_an_error_not_a_guess():
    for bad in (None, "", "da definire", "0€"):
        with pytest.raises(op.OfferPriceMissing):
            op.parse_offer(bad)
    with pytest.raises(op.OfferPriceMissing):
        op.parse_offer("97€, 197€ e 297€")


def test_foreign_amounts_are_found_anywhere_in_the_generated_text():
    allowed = {297, 497}
    ok = {"a": ["Il corso costa 497€, oggi 297 euro"], "b": {"c": "nessun importo"}}
    assert op.foreign_amounts(ok, allowed) == []
    bad = {"fasi": [{"cosa_dire": "Il corso è in vendita a 97€"}], "x": "promo a 67 euro, bonus del valore di € 150"}
    assert sorted(op.foreign_amounts(bad, allowed)) == [67, 97, 150]


def _ai_with_wrong_price(*a, **k):
    return {
        "webinar": {"titolo": "Come dormire meglio", "durata_min": 75, "fasi": [
            {"obiettivo": "o", "minuti": "5", "cosa_dire": "Il corso è in vendita a 97€" if i == 4 else "x", "come_farlo": "c"}
            for i in range(6)]},
        "prezzo": {"listino": "97€", "promo_webinar": "67€", "scadenza_promo": "entro 48h", "bonus": ["Bonus inventato"], "razionale": "r"},
    }


def test_strategy_never_keeps_an_invented_price_it_falls_back_to_the_real_one(monkeypatch):
    monkeypatch.setattr(ws, "_call_claude", _ai_with_wrong_price)
    offer = op.parse_offer("297€ (listino 497€)")
    out = asyncio.run(ws.build_webinar_strategy(ANSWERS, None, offer))
    assert out["source"] == "fallback"
    assert out["prezzo"]["listino"] == "497€" and out["prezzo"]["promo_webinar"] == "297€"
    assert op.foreign_amounts(out, offer["allowed"]) == []
    assert out["prezzo"]["bonus"] == []  # mai bonus inventati


def test_strategy_with_a_correct_ai_output_still_gets_the_real_numbers(monkeypatch):
    def good(*a, **k):
        out = _ai_with_wrong_price()
        out["webinar"]["fasi"][4]["cosa_dire"] = "Presenta il corso e il prezzo"
        out["prezzo"]["listino"], out["prezzo"]["promo_webinar"] = "199€", "99€"
        return out
    # nessun importo nel testo: l'AI ha scritto numeri sbagliati solo nei campi prezzo, che vengono sovrascritti
    monkeypatch.setattr(ws, "_call_claude", good)
    offer = op.parse_offer("297€ (listino 497€)")
    out = asyncio.run(ws.build_webinar_strategy(ANSWERS, None, offer))
    assert out["prezzo"]["listino"] == "497€" and out["prezzo"]["promo_webinar"] == "297€"


def test_the_prompt_gives_the_price_as_a_fact_and_forbids_other_amounts():
    block = op.prompt_block(op.parse_offer("297€ (listino 497€)", "12 moduli"))
    assert "497€" in block and "297€" in block and "NON modificarlo" in block and "12 moduli" in block
    assert "range" not in ws._SYSTEM and "Mai inventare bonus" in ws._SYSTEM
    assert "listino" not in ws._PREZZO_SCHEMA["properties"]  # l'AI non produce piu' i numeri


def test_deck_uses_the_real_price_and_drops_invented_bonuses(monkeypatch):
    monkeypatch.setattr(wd, "_call_claude", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("AI giù")))
    offer = op.parse_offer("297€ (listino 497€)")
    old_strategy = {"webinar": {"titolo": "Come dormire meglio"},
                    "prezzo": {"listino": "97€", "promo_webinar": "67€", "scadenza_promo": "entro 48h",
                               "bonus": []}}
    deck = asyncio.run(wd.build_webinar_deck(ANSWERS, None, old_strategy, offer))
    text = str(deck)
    assert set(op.amounts_in(text)) == {297, 497}  # solo gli importi veri, mai 97 o 67
    assert all("bonus" not in s["titolo"].lower() for s in deck["slides"])  # nessuna slide sui bonus senza bonus
    assert op.foreign_amounts(deck, offer["allowed"]) == []


def test_deck_with_a_single_price_has_no_fake_promo(monkeypatch):
    monkeypatch.setattr(wd, "_call_claude", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("AI giù")))
    offer = op.parse_offer("497€")
    deck = asyncio.run(wd.build_webinar_deck(ANSWERS, None, {"webinar": {}, "prezzo": {}}, offer))
    text = str(deck)
    assert "497€" in text and "Stasera" not in text and "solo stasera" not in text.lower()


def test_gamma_is_gone():
    assert not hasattr(wd, "export_deck_to_gamma") and not hasattr(wd, "poll_gamma_generation")
    import inspect
    assert "gamma" not in inspect.getsource(wd).lower()


def test_chat_block_gives_agents_the_real_price_and_forbids_changing_it():
    block = op.chat_block("Sabai Academy", "147€ (listino 247€)", "12 moduli")
    assert "Nome offerta: Sabai Academy" in block
    assert "listino 247€, prezzo scontato 147€" in block
    assert "non modificabile" in block and "non confermare nessun nuovo importo" in block
    assert "297" not in block and "497" not in block


def test_chat_block_without_a_usable_price_says_so_instead_of_guessing():
    for bad in (None, "", "da definire", "97€, 197€ e 297€"):
        block = op.chat_block("", bad)
        assert "NON ANCORA DEFINITO" in block and "non scrivere nessun importo" in block
    assert "nessuno sconto" in op.chat_block("X", "247€")
