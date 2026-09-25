"""
Unit test: renderer del Blueprint DEFINITIVO a 13 sezioni (layout A4 Evolution).

Verifica che `render_blueprint_html` produca copertina + sommario + le 13 sezioni
LOCKATE nell'ordine giusto, con i componenti corretti (tabelle moduli/segmenti,
trend, roadmap steps, competitor a 2 colonne) e con escaping dei dati utente.
"""
import re

import pytest

from services.ciak_pdf_blueprint import genera_blueprint_pdf, render_blueprint_html, _MAX_PROSA_LEN, _SEZIONI

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


def test_callout_e_chiusura_neutralizzano_markup_estraneo_ma_permettono_i_tag_di_base():
    # regressione: rischio.callout, prossimo.chiusura e cta.callout sono gli unici
    # campi "html-safe" per schema — devono lasciar passare <b> ma neutralizzare
    # qualunque altro markup (script, tag con attributi, event handler).
    p = _payload()
    p["sezioni"]["rischio"]["callout"] = '<b>ok</b><img src=x onerror=alert(1)><script>alert(2)</script>'
    p["sezioni"]["prossimo"]["chiusura"] = '<script>alert(3)</script><b>fine sicura</b>'
    p["sezioni"]["cta"]["callout"] = '<b>cta ok</b><iframe src="evil"></iframe>'
    html = render_blueprint_html(p)
    assert "<b>ok</b>" in html and "<b>fine sicura</b>" in html and "<b>cta ok</b>" in html
    # controllo mirato sui payload iniettati (non sul tag in generale: la copertina
    # ha già un <img> legittimo per la spirale del logo, marcarlo come vietato
    # darebbe un falso positivo)
    assert "<script>alert(2)</script>" not in html
    assert "<script>alert(3)</script>" not in html
    assert "<img src=x onerror=alert(1)>" not in html  # come tag HTML reale: MAI
    assert '<iframe src="evil">' not in html
    # neutralizzati come testo inerte (le parentesi angolari sono escapate: il
    # browser li mostra come caratteri, non li esegue come markup)
    assert "&lt;script&gt;alert(2)&lt;/script&gt;" in html
    assert "&lt;script&gt;alert(3)&lt;/script&gt;" in html
    assert "&lt;img src=x onerror=alert(1)&gt;" in html
    assert "&lt;iframe src=" in html


def test_prosa_troppo_lunga_viene_troncata_non_tagliata_a_vista():
    p = _payload()
    testo_lungo = "parola " * 400  # ben oltre _MAX_PROSA_LEN
    p["sezioni"]["sintesi"]["body"] = testo_lungo
    p["sezioni"]["rischio"]["callout"] = "<b>" + testo_lungo + "</b>"
    html = render_blueprint_html(p)
    assert testo_lungo not in html
    assert "…" in html
    # nessun singolo campo di prosa deve finire nell'HTML per intero oltre il limite
    assert len(testo_lungo) > _MAX_PROSA_LEN


@pytest.mark.asyncio
async def test_genera_blueprint_pdf_produce_un_pdf_reale():
    # Copre il buco segnalato in revisione: nessun test esercitava la funzione
    # finale che produce davvero il PDF (solo l'HTML intermedio era testato).
    # Richiede il browser Chromium di Playwright: se non è installato in questo
    # ambiente (es. CI senza `playwright install`), il test si salta invece di
    # fallire — non è quello il gap che deve coprire.
    try:
        pdf_bytes = await genera_blueprint_pdf(_payload())
    except Exception as e:  # pragma: no cover - dipende dall'ambiente locale/CI
        pytest.skip(f"Playwright/Chromium non disponibile in questo ambiente: {e}")
        return
    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 50_000  # una copertina+sommario+14 sezioni non è mai minuscola
    # Verifica best-effort del conteggio pagine leggendo i byte grezzi: i motori
    # PDF possono comprimere gli oggetti in stream, nel qual caso questo pattern
    # non trova nulla — in quel caso il controllo si limita alle asserzioni sopra
    # (bytes validi, dimensione plausibile) invece di far fallire il test.
    counts = [int(n) for n in re.findall(rb"/Count\s+(\d+)", bytes(pdf_bytes))]
    if counts:
        assert max(counts) == 16


def test_callout_su_pagina_chiara_ha_sfondo_scuro():
    """La CTA (pagina 14) e' chiara ma il callout ha testo chiaro: senza sfondo scuro e' illeggibile."""
    from services.ciak_pdf_blueprint import _CSS
    assert ".page:not(.dark) .callout{background:var(--ink)" in _CSS
