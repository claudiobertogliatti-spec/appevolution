import pytest
from services.ciak_pdf import render_bozza_html

pytestmark = pytest.mark.unit

BOZZA = {
    "intro": "Hai già clienti reali.",
    "bullet_per_capitolo": {
        "punto_di_partenza": ["Il mercato ti ha validato."],
        "dove_sei_adesso": ["Vendi ore, non prodotti."],
        "il_tuo_mercato": ["Spazio non presidiato."],
        "la_tua_accademia": ["Percorso possibile a 4 moduli."],
        "la_roadmap": ["Cinque fasi, output concreti."],
        "prossimo_passo": ["Una sessione strategica."],
    },
    "chiusura": "La versione completa la vediamo in call.",
}


def test_render_bozza_html_contiene_nome_titoli_bullet():
    html = render_bozza_html(BOZZA, "Marco Rossi")
    assert "Marco Rossi" in html
    for t in ["Il tuo punto di partenza", "Dove sei adesso", "Il tuo mercato",
              "La tua Accademia Digitale", "La roadmap", "Il prossimo passo"]:
        assert t in html
    assert "Il mercato ti ha validato." in html
    assert "La versione completa la vediamo in call." in html
    assert "highlight-pill" in html
    assert "#FACC15" in html


def test_render_bozza_html_escapa_html():
    html = render_bozza_html(
        {"intro": "", "bullet_per_capitolo": {k: ["<script>x</script>"] for k in
          ["punto_di_partenza","dove_sei_adesso","il_tuo_mercato","la_tua_accademia","la_roadmap","prossimo_passo"]},
         "chiusura": ""},
        "A & B",
    )
    assert "<script>x</script>" not in html
    assert "&lt;script&gt;" in html
    assert "A &amp; B" in html
