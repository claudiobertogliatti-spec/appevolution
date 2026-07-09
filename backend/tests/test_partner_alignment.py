"""
Test unitari del motore di stima Partner Alignment (services/partner_alignment.py).

Coprono: cascata EVO (Esamina -> Valida -> Ottimizza), bloccati/sospesi,
incoerenza fase<->asset, asset mancanti/presenti, mapping atto legacy e override.
Nessun DB: le funzioni sono pure.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.partner_alignment import (  # noqa: E402
    estimate_alignment,
    atto_evo_from_phase,
    missing_assets,
    present_assets,
    apply_overrides,
    build_override_update,
    ASSET_ORDER,
)


def _full_signals(**overrides):
    base = {
        "stato": "attivo",
        "phase": "F7",
        "posizionamento_ok": True,
        "brand_ok": True,
        "dati_base_ok": True,
        "script_masterclass_ok": True,
        "video_masterclass_ok": True,
        "videocorso_ok": True,
        "funnel_ok": True,
        "kpi_ok": True,
        "vendite_ok": True,
    }
    base.update(overrides)
    return base


def test_atto_evo_from_phase():
    assert atto_evo_from_phase("F1") == "Esamina"
    assert atto_evo_from_phase("F2") == "Esamina"
    assert atto_evo_from_phase("F3") == "Valida"
    assert atto_evo_from_phase("F7") == "Valida"
    assert atto_evo_from_phase("LIVE") == "Ottimizza"
    assert atto_evo_from_phase(None) is None
    assert atto_evo_from_phase("") is None


def test_esamina_incompleta_senza_posizionamento():
    r = estimate_alignment(_full_signals(posizionamento_ok=False, phase="F1"))
    assert r["atto_evo"] == "Esamina"
    assert r["stato_reale"] == "Esamina incompleta"
    assert r["priorita"] == "media"
    assert r["incoerenza"] is False


def test_valida_script_da_creare():
    r = estimate_alignment(_full_signals(script_masterclass_ok=False))
    assert r["atto_evo"] == "Valida"
    assert "script masterclass" in r["stato_reale"].lower()
    assert r["responsabile"] == "Agente Ciak"


def test_valida_masterclass_da_completare():
    r = estimate_alignment(_full_signals(video_masterclass_ok=False))
    assert r["stato_reale"] == "Valida: masterclass da completare"
    assert r["responsabile"] == "Partner"


def test_valida_videocorso_da_completare():
    r = estimate_alignment(_full_signals(videocorso_ok=False))
    assert r["stato_reale"] == "Valida: videocorso da completare"


def test_valida_funnel_da_completare():
    r = estimate_alignment(_full_signals(funnel_ok=False))
    assert r["stato_reale"] == "Valida: funnel da completare"
    assert r["responsabile"] == "Agente Ciak"


def test_ottimizza_dati_da_impostare():
    r = estimate_alignment(_full_signals(kpi_ok=False, vendite_ok=False))
    assert r["atto_evo"] == "Ottimizza"
    assert r["stato_reale"] == "Ottimizza: dati da impostare"


def test_ottimizza_miglioramento_vendita():
    r = estimate_alignment(_full_signals(vendite_ok=False))
    assert r["stato_reale"] == "Ottimizza: miglioramento vendita"


def test_ottimizza_attivo():
    r = estimate_alignment(_full_signals())
    assert r["stato_reale"] == "Ottimizza attivo"
    assert r["priorita"] == "bassa"


def test_quarantena_ha_priorita_su_asset():
    r = estimate_alignment(_full_signals(stato="quarantena"))
    assert r["stato_reale"].startswith("Bloccato")
    assert r["priorita"] == "alta"
    assert r["responsabile"] == "Claudio"


def test_sospeso():
    r = estimate_alignment(_full_signals(stato="sospeso", posizionamento_ok=False))
    assert r["stato_reale"].startswith("Sospeso")
    assert r["priorita"] == "alta"


def test_incoerenza_fase_avanzata_ma_esamina():
    r = estimate_alignment(_full_signals(phase="F5", posizionamento_ok=False))
    assert r["atto_evo"] == "Esamina"
    assert r["incoerenza"] is True
    assert r["priorita"] == "alta"


def test_missing_and_present_assets():
    sig = _full_signals(kpi_ok=False, vendite_ok=False)
    miss = missing_assets(sig)
    pres = present_assets(sig)
    assert "kpi" in miss and "vendite" in miss
    assert "posizionamento" in pres
    assert len(miss) + len(pres) == len(ASSET_ORDER)


def test_asset_flags_in_result():
    r = estimate_alignment(_full_signals(funnel_ok=False))
    assert r["asset_flags"]["funnel"] is False
    assert r["asset_flags"]["videocorso"] is True
    assert "funnel" in r["asset_mancanti"]


def test_apply_overrides_nessuno():
    stima = estimate_alignment(_full_signals(funnel_ok=False))
    eff = apply_overrides(stima, {})
    assert eff["stato_reale"] == stima["stato_reale"]
    assert eff["ha_override"] is False
    assert eff["note"] is None


def test_apply_overrides_forza_campi():
    stima = estimate_alignment(_full_signals(funnel_ok=False))
    partner = {
        "alignment_status_override": "Caso speciale - gestito da Claudio",
        "alignment_priority": "alta",
        "alignment_owner": "Claudio",
        "alignment_notes": "  parlato al telefono  ",
    }
    eff = apply_overrides(stima, partner)
    assert eff["stato_reale"] == "Caso speciale - gestito da Claudio"
    assert eff["priorita"] == "alta"
    assert eff["responsabile"] == "Claudio"
    assert eff["ha_override"] is True
    assert eff["rischio"] == stima["rischio"]


def test_build_override_update_set_e_unset():
    payload = {
        "alignment_priority": "media",
        "alignment_owner": "  Luca  ",
        "alignment_risk": "",
        "alignment_notes": None,
    }
    set_f, unset_f = build_override_update(payload)
    assert set_f["alignment_priority"] == "media"
    assert set_f["alignment_owner"] == "Luca"
    assert "alignment_risk" in unset_f
    assert "alignment_notes" in unset_f
    assert "alignment_status_override" not in set_f
    assert "alignment_status_override" not in unset_f
