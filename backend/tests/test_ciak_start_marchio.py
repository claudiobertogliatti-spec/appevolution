"""Il marchio del cliente Start: scelte semplici, nessun codice colore da scrivere.

Le scelte devono arrivare ai generatori nella forma che leggono davvero
(`colore_primario`, `font`, `logo_url`...) e restare compatibili col brand kit
del partner (`colors`, `tone_of_voice`, `parole_chiave`).
"""
import pytest

from services import ciak_start_marchio as m
from services.start_vetrina import palette_da_brand_kit

pytestmark = pytest.mark.unit


def test_una_palette_scelta_diventa_i_colori_che_la_vetrina_legge():
    dati = m.normalizza({"palette_id": "sicuro"})
    assert dati["colors"] == ["#0F2A4A", "#5B7C99", "#D9A441"]
    assert dati["colore_primario"] == "#0F2A4A"
    # Il punto del difetto: il generatore leggeva `colore_primario`, non `colors`.
    palette, brand_presente = palette_da_brand_kit(dati)
    assert brand_presente is True
    assert palette["primario"] == "#0F2A4A"


def test_ogni_primario_e_abbastanza_scuro_per_fare_da_testo():
    from services.start_vetrina import contrasto

    for p in m.PALETTE:
        assert contrasto(p["colori"][0], "#FFFFFF") >= 7, p["id"]


def test_colori_propri_solo_se_sono_tre_esadecimali_validi():
    ok = m.normalizza({"palette_id": "miei", "colori_miei": ["#112233", "#445566", "#778899"]})
    assert ok["colore_primario"] == "#112233"
    assert "colors" not in m.normalizza({"palette_id": "miei", "colori_miei": ["rosso", "#445566", "#778899"]})
    assert "colors" not in m.normalizza({"palette_id": "miei", "colori_miei": ["#112233"]})
    assert "colors" not in m.normalizza({"palette_id": "inventata"})


def test_font_e_tono_sono_scelte_chiuse_e_producono_il_testo_del_brand_kit_partner():
    dati = m.normalizza({"font_id": "classico", "tono_id": "caldo", "font": "Comic Sans", "tone_of_voice": "x"})
    assert dati["font"] == "Lora"  # mai un valore libero dal browser
    assert len(dati["tone_of_voice"]) >= 40  # la soglia del brand kit partner
    assert "tone_of_voice" not in m.normalizza({"tono_id": "boh", "tone_of_voice": "x"})


def test_gli_indirizzi_finiscono_in_una_pagina_pubblica_quindi_solo_https():
    assert m.normalizza({"logo_url": "https://cdn.example.com/l.png"})["logo_url"].startswith("https://")
    assert m.normalizza({"logo_url": "javascript:alert(1)"})["logo_url"] == ""
    assert m.normalizza({"foto_url": "http://example.com/f.jpg"})["foto_url"] == ""
    assert m.normalizza({"foto_url": "https://a.com/x y.jpg"})["foto_url"] == ""


def test_le_parole_si_puliscono_e_hanno_un_tetto():
    dati = m.normalizza({"parole_chiave": ["  calma ", "", "ascolto", "x" * 90, "a", "b", "c"]})
    assert dati["parole_chiave"][0] == "calma"
    assert len(dati["parole_chiave"]) == 5
    assert max(len(p) for p in dati["parole_chiave"]) <= m.MAX_PAROLA


def test_mancanti_logo_e_foto_sono_facoltativi():
    completo = m.normalizza({
        "palette_id": "sicuro", "font_id": "moderno", "tono_id": "semplice",
        "parole_chiave": ["calma", "ascolto", "metodo"],
    })
    assert m.mancanti(completo) == []
    assert set(m.mancanti({})) == {"palette_id", "font_id", "tono_id", "parole_chiave"}
    assert m.mancanti({**completo, "parole_chiave": ["una", "due"]}) == ["parole_chiave"]
