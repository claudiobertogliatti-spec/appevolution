"""Ciclo di contenuti di 60 giorni — deliverable Ciak Start (tappa 3).

Regole del blocco: 60 giorni, 3 fasi fisse, UNA live in chiusura dove il cliente
propone i propri servizi, ripetibile. Diverso dal regime 90g della Partnership,
che NON viene toccato.
"""
import pytest

from services import start_content_cycle as scc
from services.start_final_deliverables import build_start_content_plan

pytestmark = pytest.mark.unit


ANSWERS = {
    "nicchia": "Fotografi di matrimonio in Lombardia che lavorano da soli",
    "metodo_nome": "Metodo Scatto Pieno",
    "promessa": "Alzare il prezzo medio senza cambiare come fotografi",
}


def test_fallback_ha_3_fasi_fisse_e_60_giorni():
    cal = scc._deterministic(ANSWERS)
    assert cal["cycle_days"] == 60
    assert cal["recurring"] is True
    assert cal["ritmo"]
    assert cal["source"] == "fallback"
    assert [f["fase"] for f in cal["fasi"]] == [
        "Presenza e valore",
        "Prova e desiderio",
        "Verso la live",
    ]


def test_i_giorni_sono_numerati_nei_range_delle_fasi():
    cal = scc._deterministic(ANSWERS)
    f1, f2, f3 = cal["fasi"]
    assert f1["giorni"][0]["giorno"] == 1
    assert f2["giorni"][0]["giorno"] == 21
    assert f3["giorni"][0]["giorno"] == 41
    # Nessun giorno oltre i 60.
    tutti = [g["giorno"] for f in cal["fasi"] for g in f["giorni"]]
    assert max(tutti) <= 60


def test_c_e_una_sola_live_in_chiusura_che_propone_i_servizi():
    cal = scc._deterministic(ANSWERS)
    live = [g for f in cal["fasi"] for g in f["giorni"]
            if "live" in (g.get("fonte") or "").lower() and g["fonte"].lower() == "live"]
    assert len(live) == 1
    giorno_live = live[0]
    # La live propone i propri servizi con un'offerta a scadenza.
    assert giorno_live["cta"] == "Approfitta dell'offerta"
    assert "servizi" in giorno_live["tema"].lower()


def test_ogni_giorno_e_ben_formato():
    cal = scc._deterministic(ANSWERS)
    for f in cal["fasi"]:
        for g in f["giorni"]:
            assert g["formato"] in scc.FORMATI
            assert g["tema"] and g["come_farlo"] and g["cta"]
            assert g["fonte"]


def test_niente_vendita_del_corso_nel_copy():
    """Il cliente Start puo' non avere un corso: la live propone i SUOI servizi,
    non 'il corso'. Nessuna CTA 'Scopri il corso' come nel regime Partnership."""
    cal = scc._deterministic(ANSWERS)
    ctas = {g["cta"] for f in cal["fasi"] for g in f["giorni"]}
    assert "Scopri il corso" not in ctas


@pytest.mark.asyncio
async def test_build_senza_api_key_ricade_sul_fallback(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    cal = await scc.build_start_content_cycle(ANSWERS)
    assert cal["source"] == "fallback"
    assert len(cal["fasi"]) == 3


@pytest.mark.asyncio
async def test_il_fallback_dichiara_il_motivo(monkeypatch):
    """Diagnostica: se l'AI fallisce, il deliverable dichiara PERCHE' (admin-only),
    cosi' si capisce se e' timeout / errore API / output non valido senza log Cloud Run."""
    def _boom(answers, outline):
        raise TimeoutError("simulated timeout")

    monkeypatch.setattr(scc, "_call_claude", _boom)
    cal = await scc.build_start_content_cycle(ANSWERS)
    assert cal["source"] == "fallback"
    assert "TimeoutError" in cal.get("fallback_reason", "")


def test_fallback_pulito_senza_motivo_non_ha_il_campo():
    """Il fallback chiamato direttamente (senza reason) non porta rumore."""
    cal = scc._deterministic(ANSWERS)
    assert "fallback_reason" not in cal


@pytest.mark.asyncio
async def test_deliverable_wrapper_e_a_60_giorni(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    out = await build_start_content_plan({"answers": ANSWERS})
    # id tecnico legacy invariato, ma contenuto a 60 giorni.
    assert out["type"] == "content_plan_90d"
    assert out["period_days"] == 60
    assert out["recurring"] is True
    assert out["calendar"]["cycle_days"] == 60
    assert len(out["calendar"]["fasi"]) == 3
