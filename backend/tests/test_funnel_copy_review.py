"""Controllo del copy di Gaia sulle modifiche del partner: spiega, non blocca senza motivo."""
import asyncio
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.funnel_review as route
import services.funnel_copy_review as cr

pytestmark = pytest.mark.unit

URL = "https://sabai-daniele-andolfi.vercel.app"
RELEASED = {"partner_id": "p1", "preview_url": URL, "preview_version": 1, "preview_released": True,
            "page_content": {"optin": {"titolo": "Il Metodo Sabai"}}}


def test_a_verdict_is_accepted_only_if_complete_and_a_refusal_always_carries_an_explanation():
    assert cr.normalize({"verdict": "ok", "spiegazione": "ignorata", "proposta": "x"}) == \
        {"verdict": "ok", "spiegazione": "", "proposta": "", "versione_finale": ""}
    full = cr.normalize({"verdict": "sconsiglio", "spiegazione": "Prometti un risultato garantito: non si può scrivere.",
                         "proposta": "Un percorso per ritrovare calma"})
    assert full["verdict"] == "sconsiglio" and "garantito" in full["spiegazione"] and full["proposta"]
    # bocciare senza spiegare non è ammesso: si inoltra al team
    assert cr.normalize({"verdict": "sconsiglio", "spiegazione": "", "proposta": ""})["verdict"] == "inoltrata"
    assert cr.normalize({"verdict": "boh"})["verdict"] == "inoltrata"
    assert cr.normalize(None)["verdict"] == "inoltrata"


def test_if_the_model_fails_the_request_goes_to_the_team_without_judgement(monkeypatch):
    def boom(user):
        raise RuntimeError("niente rete")
    monkeypatch.setattr(cr, "_call_claude", boom)
    out = asyncio.run(cr.assess_edit("Iscrizione", "Il titolo", "Titolo", "Titolo nuovo", "Metodo Sabai"))
    assert out["verdict"] == "inoltrata"


def test_the_prompt_to_the_model_carries_the_real_context_and_strips_markup():
    msg = cr.build_user_message("Iscrizione", "Il titolo", "Il Metodo <b>Sabai</b>", "Guadagna 10.000 euro", "Metodo Sabai")
    assert "Metodo Sabai" in msg and "<b>" not in msg and "Guadagna 10.000 euro" in msg


class FakeFunnel:
    def __init__(self, doc):
        self.doc = dict(doc)

    async def find_one(self, q, p=None):
        return dict(self.doc)

    async def update_one(self, key, update, upsert=False):
        for path, value in (update.get("$set") or {}).items():
            node = self.doc
            parts = path.split(".")
            for k in parts[:-1]:
                node = node.setdefault(k, {})
            node[parts[-1]] = value
        for path, value in (update.get("$push") or {}).items():
            node = self.doc
            parts = path.split(".")
            for k in parts[:-1]:
                node = node.setdefault(k, {})
            node.setdefault(parts[-1], []).append(value)


class FakePartners:
    async def find_one(self, q, p=None):
        return {"id": "p1", "name": "Daniele Andolfi", "corso_titolo": "Metodo Sabai"}


@pytest.fixture
def env(monkeypatch):
    sent = []

    async def notify(text):
        sent.append(text)

    import routers.partner_journey as pj
    monkeypatch.setattr(pj, "notify_telegram", notify, raising=False)

    async def authorize(partner_id, credentials):
        return SimpleNamespace(role="partner")

    monkeypatch.setattr(route, "_authorize", authorize)
    funnel = FakeFunnel(RELEASED)

    class FakeSteps:
        async def find_one(self, q, p=None):
            return {"data": {"colors": ["#9988AA", "#FFCC66"], "tone_of_voice": "Caldo e gentile"}}

    route.db = SimpleNamespace(partner_funnel=funnel, partners=FakePartners(), partner_journey_steps=FakeSteps())
    seen = {}

    def verdict(v):
        async def fake(*a, **k):
            seen["args"] = a
            return v
        monkeypatch.setattr(route.copy_review, "assess_edit", fake)
    verdict.sent, verdict.funnel, verdict.seen = sent, funnel, seen
    return verdict


EDIT = dict(page_id="optin", part_id="titolo")


@pytest.mark.asyncio
async def test_nonsense_is_explained_and_nothing_is_saved(env):
    env({"verdict": "sconsiglio", "spiegazione": "Promette un guadagno garantito: chi legge non ci crede e la legge lo vieta.",
         "proposta": "Ritrova calma e energia in 10 minuti al giorno"})
    out = await route.edit_part("p1", route.PartEditBody(wanted="Guadagna 10.000 euro garantiti", **EDIT), object())
    assert out["verdict"] == "sconsiglio" and "garantito" in out["message"] and out["proposal"]
    assert "review" not in env.funnel.doc and not env.sent  # nessuna modifica salvata, nessun disturbo al team


@pytest.mark.asyncio
async def test_a_sensible_edit_goes_to_the_team_with_the_page_and_the_part(env):
    env({"verdict": "ok", "spiegazione": "", "proposta": ""})
    out = await route.edit_part("p1", route.PartEditBody(wanted="Il Metodo Sabai per ritrovare calma", **EDIT), object())
    assert out["verdict"] == "inviata"
    parts = {x["id"]: x["state"] for x in out["sequence"][0]["parts"]}
    assert parts["titolo"] == "in_modifica"
    assert env.sent and "Il Metodo Sabai per ritrovare calma" in env.sent[0] and "Daniele Andolfi" in env.sent[0]


@pytest.mark.asyncio
async def test_if_the_partner_insists_it_is_sent_with_gaias_warning(env):
    env({"verdict": "sconsiglio", "spiegazione": "x" * 20, "proposta": ""})  # non deve nemmeno essere interpellata
    out = await route.edit_part("p1", route.PartEditBody(wanted="Titolo che voglio io", insist=True,
                                                        gaia_note="Troppo lungo", **EDIT), object())
    assert out["verdict"] == "inviata"
    entry = env.funnel.doc["review"]["corrections"][0]
    assert "Troppo lungo" in entry["note"] and entry["right"] == "Titolo che voglio io"


@pytest.mark.asyncio
async def test_bad_input_is_a_clear_400(env):
    env({"verdict": "ok", "spiegazione": "", "proposta": ""})
    with pytest.raises(HTTPException) as exc:
        await route.edit_part("p1", route.PartEditBody(wanted="ok", **EDIT), object())
    assert exc.value.status_code == 400 and "Come lo vorresti" in exc.value.detail
    with pytest.raises(HTTPException) as exc:
        await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="inventato", wanted="Va bene così"), object())
    assert exc.value.status_code == 400


def test_brand_summary_lists_only_what_exists():
    out = cr.brand_summary({"colors": ["#9988AA", "#FFCC66"], "tone_of_voice": "Caldo", "parole_evitare": ["Fatica"]})
    assert "#9988AA" in out and "Caldo" in out and "Fatica" in out and "Font" not in out
    assert cr.brand_summary({}) == "Brand kit non disponibile."


@pytest.mark.asyncio
async def test_a_design_request_is_judged_against_the_partners_brand_kit(env):
    env({"verdict": "sconsiglio", "spiegazione": "Il rosso acceso è fuori dalla tua palette: il funnel non sembrerebbe più il tuo sito.",
         "proposta": "Usare il lavanda #9988AA come sfondo"})
    out = await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="aspetto", wanted="Sfondo rosso fuoco"), object())
    assert out["verdict"] == "sconsiglio" and "palette" in out["message"]
    assert "#9988AA" in env.seen["args"][5]  # il brand kit vero arriva a Gaia


@pytest.mark.asyncio
async def test_the_partner_can_send_his_own_photos_with_the_look_request(env):
    env({"verdict": "ok", "spiegazione": "", "proposta": ""})
    url = "https://res.cloudinary.com/x/image/upload/mia-foto.jpg"
    out = await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="aspetto", wanted="", photos=[url]), object())
    assert out["verdict"] == "inviata"
    entry = env.funnel.doc["review"]["corrections"][0]
    assert entry["photos"] == [url] and "foto" in entry["right"].lower()
    assert url in env.sent[0]
    assert "1 foto sue" in env.seen["args"][3]  # Gaia sa che ci sono foto allegate


@pytest.mark.asyncio
async def test_photos_only_on_the_look_element_and_only_from_our_storage(env):
    env({"verdict": "ok", "spiegazione": "", "proposta": ""})
    url = "https://res.cloudinary.com/x/image/upload/mia-foto.jpg"
    with pytest.raises(HTTPException) as exc:
        await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="titolo", wanted="Nuovo titolo chiaro", photos=[url]), object())
    assert exc.value.status_code == 400
    with pytest.raises(HTTPException) as exc:
        await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="aspetto", wanted="Foto", photos=["https://evil.example/a.jpg"]), object())
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_an_addition_reaches_gaia_as_an_addition_and_the_team_as_one(env):
    env({"verdict": "ok", "spiegazione": "", "proposta": ""})
    out = await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="faq", action="aggiungi",
                                                        wanted="Posso farlo anche con dolori alla schiena?"), object())
    assert out["verdict"] == "inviata"
    assert env.seen["args"][3].startswith("AGGIUNTA richiesta:")
    assert "AGGIUNTA RICHIESTA" in env.sent[0]
    assert env.funnel.doc["review"]["corrections"][0]["action"] == "aggiungi"
    with pytest.raises(HTTPException) as exc:
        await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="titolo", action="aggiungi",
                                                      wanted="Un altro titolo ancora"), object())
    assert exc.value.status_code == 400


def test_gaia_is_told_the_partner_is_the_expert_on_his_technical_terms():
    assert "termine tecnico" in cr._SYSTEM and "è l'esperto" in cr._SYSTEM
    assert "rispondi del COPY" in cr._SYSTEM


def test_the_conversation_reaches_gaia_and_is_capped():
    thread = [{"role": "partner", "text": "Voglio scrivere Chi Kung"}, {"role": "gaia", "text": "Meglio coerente col sito"}]
    msg = cr.build_user_message("Iscrizione", "Il titolo", "Qi Gong", "Chi Kung", "Metodo Sabai", "Colori: #9988AA",
                                thread, "Nella mia scuola si scrive così")
    assert "Conversazione finora" in msg and "Gaia: Meglio coerente col sito" in msg
    assert "Ultima risposta del partner: Nella mia scuola si scrive così" in msg
    assert cr.gaia_turns(thread) == 1 and cr.MAX_GAIA_TURNS == 4
    assert "DIALOGO" in cr._SYSTEM and "Cosa NON gestisci" in cr._SYSTEM and "prezzo" in cr._SYSTEM


def test_an_agreement_after_the_dialogue_carries_the_final_text():
    out = cr.normalize({"verdict": "ok", "spiegazione": "", "proposta": "", "versione_finale": "Chi Kung dolce"})
    assert out["versione_finale"] == "Chi Kung dolce"
    assert cr.normalize({"verdict": "sconsiglio", "spiegazione": "Motivo chiaro e lungo abbastanza.",
                         "proposta": "", "versione_finale": "x"})["versione_finale"] == ""


@pytest.mark.asyncio
async def test_after_the_agreement_the_team_receives_what_gaia_and_the_partner_settled_on(env):
    env({"verdict": "ok", "spiegazione": "", "proposta": "", "versione_finale": "Chi Kung dolce per ritrovare calma"})
    thread = [{"role": "partner", "text": "Chi Kung"}, {"role": "gaia", "text": "Sul sito scrivi Qi Gong"}]
    out = await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="titolo", wanted="Chi Kung",
                                                        thread=thread, reply="Nella mia scuola si scrive così"), object())
    assert out["verdict"] == "inviata"
    entry = env.funnel.doc["review"]["corrections"][0]
    assert entry["right"] == "Chi Kung dolce per ritrovare calma" and "dialogo" in entry["note"]


@pytest.mark.asyncio
async def test_the_dialogue_has_a_ceiling_and_then_the_partner_decides(env):
    env({"verdict": "sconsiglio", "spiegazione": "Non cambio parere, per questo motivo concreto.", "proposta": "Altra versione"})
    thread = [{"role": "gaia", "text": f"risposta {i}"} for i in range(4)]
    out = await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="titolo", wanted="Titolo mio",
                                                        thread=thread, reply="ancora una volta"), object())
    assert out["verdict"] == "sconsiglio" and out["closed"] is True
    assert "review" not in env.funnel.doc  # niente salvato: decide il partner
    # all'ultimo scambio permesso Gaia risponde ancora, ma la conversazione si chiude
    out = await route.edit_part("p1", route.PartEditBody(page_id="optin", part_id="titolo", wanted="Titolo mio",
                                                        thread=thread[:3], reply="ancora"), object())
    assert out["verdict"] == "sconsiglio" and out["closed"] is True and out["message"].startswith("Non cambio")
