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


# ── Generatori Gaia della pagina di vendita: nessun importo fuori offerta (caso «sessione a 80€») ──

import services.vendita_price_guard as vg

OFFER = op.parse_offer("147€ (listino 247€)", "12 moduli")


def test_the_saving_between_list_and_promo_is_the_only_extra_amount_allowed():
    assert op.foreign_in_text("Oggi 147€ invece di 247€. Risparmi 100€.", OFFER) == []
    assert op.foreign_in_text("Una sessione costa facilmente 80€.", OFFER) == [80]
    assert "risparmio: 100€" in op.saving_note(OFFER)
    assert "100" not in op.saving_note(op.parse_offer("247€"))


def _llm(answers):
    calls = []

    async def llm(system, user):
        calls.append((system, user))
        return answers[min(len(calls) - 1, len(answers) - 1)]

    llm.calls = calls
    return llm


def test_guard_passes_the_real_price_to_the_model_and_accepts_a_clean_text():
    llm = _llm(["Oggi 147€ invece di 247€."])
    body = asyncio.run(vg.generate_checked(llm, "Sei Gaia.", "SISTEMA", OFFER))
    assert body == "Oggi 147€ invece di 247€." and len(llm.calls) == 1
    assert "listino 247€" in llm.calls[0][0] and "promo del webinar 147€" in llm.calls[0][0]
    assert "non citare cifre di mercato" in llm.calls[0][0]


def test_guard_retries_once_naming_the_forbidden_amount():
    llm = _llm(["Una sessione costa 80€. Oggi 147€.", "Oggi 147€ invece di 247€."])
    body = asyncio.run(vg.generate_checked(llm, "Sei Gaia.", "SISTEMA", OFFER))
    assert body == "Oggi 147€ invece di 247€." and len(llm.calls) == 2
    assert "80€" in llm.calls[1][1]


def test_guard_refuses_a_text_that_still_has_foreign_amounts_after_the_retry():
    llm = _llm(["costa 80€", "costa ancora 80€ e 150€"])
    with pytest.raises(vg.PriceGuardError) as e:
        asyncio.run(vg.generate_checked(llm, "Sei Gaia.", "SISTEMA", OFFER))
    assert e.value.amounts == [80, 150] and len(llm.calls) == 2


# ── Export funnel: senza prezzo nell'hub non si stampa un prezzo inventato (era il default "297€") ──

def _export_service(monkeypatch):
    import importlib
    import pathlib
    import sys

    # il modulo crea /app/storage/... all'import: nei test non deve toccare il disco
    monkeypatch.setattr(pathlib.Path, "mkdir", lambda *a, **k: None)
    monkeypatch.delitem(sys.modules, "funnel_export_service", raising=False)
    return importlib.import_module("funnel_export_service").FunnelExportService()


def test_funnel_export_does_not_invent_a_price_when_the_offer_has_none(monkeypatch):
    svc = _export_service(monkeypatch)
    html = svc._generate_html_document({"name": "Daniele"}, [], [])
    assert "Da definire" in html and "297" not in html
    html = svc._generate_html_document({"name": "Daniele", "offer_price": ""}, [], [])
    assert "Da definire" in html and "297" not in html


def test_funnel_export_prints_the_real_price_when_given(monkeypatch):
    svc = _export_service(monkeypatch)
    html = svc._generate_html_document({"name": "Daniele", "offer_price": "147€ (listino 247€)"}, [], [])
    assert "147€ (listino 247€)" in html and "Da definire" not in html
