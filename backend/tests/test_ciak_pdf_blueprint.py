"""
Unit test: renderer del Blueprint DEFINITIVO a 13 sezioni (layout A4 Evolution).

Verifica che `render_blueprint_html` produca copertina + sommario + le 13 sezioni
LOCKATE nell'ordine giusto, con i componenti corretti (tabelle moduli/segmenti,
trend, roadmap steps, competitor a 2 colonne) e con escaping dei dati utente.
"""
import pytest

from services.ciak_pdf_blueprint import render_blueprint_html, _SEZIONI

pytestmark = pytest.mark.unit


def _payload():
    return {
        "meta": {"nome": "Mario Rossi", "progetto": "Progetto", "accent_progetto": "Test",
                 "ambito": "Coaching", "data": "15 settembre 2026"},
        "sezioni": {
            "sintesi": {"title": "T", "accent": "a", "lead": "L", "body": "B", "note": "N"},
            "potenziale": {"title": "T", "accent": "a", "lead": "L", "cards": [{"h": "C1", "p": "p1"}]},
            "mercato": {"title": "T", "accent": "a", "lead": "L", "trend": ["trend-uno", "trend-due"]},
            "competitor": {"title": "T", "accent": "a", "presidia": ["chi-c-e"], "spazio": ["il-tuo-spazio"]},
            "pubblico": {"title": "T", "accent": "a", "lead": "L",
                         "segmenti": [{"segmento": "Seg1", "chi": "chi1", "cerca": "cerca1"}]},
            "problema": {"title": "T", "accent": "a", "lead": "L", "body": "B"},
            "forza": {"title": "T", "accent": "a", "punti": ["forza-uno"]},
            "limiti": {"title": "T", "accent": "a", "punti": ["limite-uno"]},
            "accademia": {"title": "T", "accent": "a", "lead": "L",
                          "moduli": [{"titolo": "Mod1", "contenuto": "cont1"}]},
            "rischio": {"title": "T", "accent": "a", "lead": "L", "callout": "<b>cta</b>"},
            "manca": {"title": "T", "accent": "a", "items": [{"h": "M1", "p": "p1"}]},
            "roadmap": {"title": "T", "accent": "a", "lead": "L",
                        "steps": [{"titolo": "Step1", "desc": "d1"}]},
            "prossimo": {"title": "T", "accent": "a", "lead": "L", "no": "strada-no",
                         "yes": ["strada-si"], "chiusura": "<b>fine</b>"},
            "cta": {"title": "T", "accent": "a", "lead": "cta-lead", "body": "cta-body",
                    "callout": "<b>cta-callout</b>", "note": "cta-note"},
        },
    }


def test_sono_14_sezioni_locked_in_ordine():
    # 13 sezioni diagnostiche LOCKATE + la CTA finale (sez. 14).
    assert [k for (k, *_r) in _SEZIONI] == [
        "sintesi", "potenziale", "mercato", "competitor", "pubblico", "problema",
        "forza", "limiti", "accademia", "rischio", "manca", "roadmap", "prossimo", "cta",
    ]


def test_render_produce_cover_sommario_e_14_pagine():
    html = render_blueprint_html(_payload())
    # copertina + sommario + 14 = 16 blocchi pagina
    assert html.count('<section class="page') == 16
    assert "Sommario" in html and "Analisi Strategica di Posizionamento" in html
    # i numeri di tutte e 14 le sezioni nell'eyebrow
    for n in ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14"]:
        assert f'>{n} · ' in html


def test_componenti_specifici_delle_nuove_sezioni():
    html = render_blueprint_html(_payload())
    assert "trend-uno" in html and 'class="trend"' in html          # 03 mercato
    assert "chi-c-e" in html and "il-tuo-spazio" in html            # 04 competitor
    assert "Seg1" in html and "<table" in html                      # 05 pubblico
    assert "Mod1" in html                                           # 09 accademia
    assert "Step1" in html and 'class="steps"' in html             # 12 roadmap
    assert "strada-no" in html and "strada-si" in html             # 13 prossimo
    assert "cta-lead" in html and "cta-callout" in html            # 14 cta finale


def test_escape_dei_dati_utente():
    p = _payload()
    p["sezioni"]["sintesi"]["lead"] = '<script>alert(1)</script>'
    html = render_blueprint_html(p)
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html


def test_niente_prezzi_blueprint_nel_layout():
    # il layout non deve introdurre da solo prezzi/vecchio 67 (i dati non ne hanno)
    html = render_blueprint_html(_payload())
    assert "67€" not in html and "2790" not in html and "2.790" not in html
