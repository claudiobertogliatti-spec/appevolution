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
    # un tono_id inventato non e' una scelta: la voce libera "x" si salva come bozza ma NON basta a inviare
    assert "tono_id" in m.mancanti(m.normalizza({"tono_id": "boh", "tone_of_voice": "x",
                                                  "colors": ["#112233", "#445566", "#778899"],
                                                  "parole_chiave": ["a1", "b2", "c3"]}))


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
    assert set(m.mancanti({})) == {"palette_id", "tono_id", "parole_chiave"}  # le lettere non sono piu' obbligatorie (11/10/2026)
    assert m.mancanti({**completo, "parole_chiave": ["una", "due"]}) == ["parole_chiave"]


# ─── Brand kit EVO anche per Start (11/10/2026) ───────────────────────────

VOCE = "Parlo in modo semplice e diretto, con esempi concreti e senza parole complicate, come in una consulenza."


def test_i_tre_colori_liberi_del_brand_kit_evo_arrivano_ai_generatori():
    dati = m.normalizza({"colors": ["#112233", "#445566", "#778899"]})
    assert dati["colors"] == ["#112233", "#445566", "#778899"]
    assert dati["colore_primario"] == "#112233" and dati["palette_id"] == "miei"
    palette, presente = palette_da_brand_kit(dati)
    assert presente is True and palette["primario"] == "#112233"
    # esadecimali sbagliati o numero diverso da tre: ignorati
    assert "colors" not in m.normalizza({"colors": ["#112233", "rosso", "#778899"]})
    assert "colors" not in m.normalizza({"colors": ["#112233"]})


def test_la_voce_scritta_a_mano_si_salva_sempre_ma_per_inviare_serve_la_lunghezza_di_evo():
    assert m.normalizza({"tone_of_voice": VOCE})["tone_of_voice"] == VOCE
    # bozza troppo corta: salvata (non si perde il testo), ma non basta per inviare
    corta = m.normalizza({"tone_of_voice": "troppo corta"})
    assert corta["tone_of_voice"] == "troppo corta"
    assert "tono_id" in m.mancanti({**corta, "colore_primario": "#112233", "parole_chiave": ["a1", "b2", "c3"]})


def test_espressioni_parole_da_evitare_emozioni_e_scala_si_puliscono():
    dati = m.normalizza({
        "espressioni": ["  Partiamo dalle basi ", "", "a", "b", "c"],
        "parole_evitare": ["subito", "x" * 99],
        "emozioni": ["Sicuro", "Sicuro", "Inventata", "Curioso"],
        "tono_scale": [0, 1, 2, 3, 4, 2],
    })
    assert dati["espressioni"][0] == "Partiamo dalle basi" and len(dati["espressioni"]) == 3
    assert max(len(p) for p in dati["parole_evitare"]) <= m.MAX_PAROLA
    assert dati["emozioni"] == ["Sicuro", "Curioso"]  # doppioni e valori inventati fuori
    assert dati["tono_scale"] == [0, 1, 2, 3, 4, 2]
    assert "tono_scale" not in m.normalizza({"tono_scale": [0, 1, 2]})
    assert "tono_scale" not in m.normalizza({"tono_scale": [9, 1, 2, 3, 4, 2]})


def test_marchio_completo_in_forma_evo_senza_logo_foto_e_lettere():
    dati = m.normalizza({"colors": ["#112233", "#445566", "#778899"], "tone_of_voice": VOCE,
                         "parole_chiave": ["calma", "ascolto", "metodo"]})
    assert m.mancanti(dati) == []  # logo, foto e lettere sono facoltativi
    assert m.mancanti(m.normalizza({"colors": ["#112233", "#445566", "#778899"]})) == ["tono_id", "parole_chiave"]


def test_la_scheda_del_marchio_ha_poppins_se_non_scelte_le_lettere_e_porta_i_campi_evo():
    from services.start_tappa1 import build_start_brand

    dati = m.normalizza({"colors": ["#112233", "#445566", "#778899"], "tone_of_voice": VOCE,
                         "parole_chiave": ["calma", "ascolto", "metodo"], "parole_evitare": ["subito"],
                         "espressioni": ["Partiamo dalle basi"], "emozioni": ["Sicuro"]})
    scheda = build_start_brand(dati)
    assert scheda["font"]["famiglia"] == "Poppins"
    assert scheda["tono"]["frase"] == VOCE
    assert scheda["parole_evitare"] == ["subito"] and scheda["espressioni"] == ["Partiamo dalle basi"]
    assert scheda["emozioni"] == ["Sicuro"]


def test_chi_aveva_scelto_con_le_opzioni_pronte_continua_a_funzionare():
    dati = m.normalizza({"palette_id": "sicuro", "font_id": "classico", "tono_id": "caldo",
                         "parole_chiave": ["a1", "b2", "c3"]})
    assert m.mancanti(dati) == []
