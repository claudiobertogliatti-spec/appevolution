"""Sito vetrina di Ciak Start — il secondo deliverable della tappa 2.

Il vincolo commerciale viene prima di quello tecnico: **la vetrina non vende**
(decisione di Claudio del 30/7). Niente checkout, niente opt-in, niente
automazioni: e' il confine fra i 499 di Start e i 2.790 della Partnership. Se la
vetrina vendesse, avremmo regalato il pezzo che distingue i due prodotti.

Da qui i test: piu' che "genera l'HTML", verificano che l'HTML NON contenga il
mondo della vendita, che non resti un solo placeholder non sostituito (il
`_render` del repo lascia `{CHIAVE}` letterale, e in un `<style>` significa CSS
rotto) e che nessun dato assente venga inventato.
"""
import pytest

from services import start_vetrina as sv

pytestmark = pytest.mark.unit


DATI = {
    "nome": "Maria Restifo",
    "nicchia": "massaggio thai professionale",
    "dominio": "mariarestifo.it",
    "email_contatto": "maria@mariarestifo.it",
    "posizionamento": {
        "brand": "Metodo Sabai",
        "categoria": "formazione per terapisti del massaggio thai",
        "idea_differenziante": "insegna a chi pratica gia', non ai principianti",
        "vantaggio_cliente": "riempi l'agenda senza abbassare le tariffe",
    },
}


def _risposta_modello(**override):
    base = {
        "headline": "Il massaggio thai come professione, non come hobby",
        "sottotitolo": "Formazione per terapisti che praticano gia' e vogliono viverci.",
        "cosa_faccio": [
            {"titolo": "Percorso in 8 settimane", "testo": "Dalla tecnica alla gestione dei clienti."},
            {"titolo": "Lavoro sul posizionamento", "testo": "Ti aiuto a farti scegliere per quello che fai."},
            {"titolo": "Supporto continuo", "testo": "Rivediamo insieme i casi difficili."},
        ],
        "per_chi_si": ["Terapisti gia' in attivita'", "Chi vuole alzare le tariffe"],
        "per_chi_no": ["Chi parte da zero", "Chi cerca una qualifica veloce"],
        "bio": "Lavoro con terapisti del massaggio thai da undici anni.",
    }
    base.update(override)
    return base


@pytest.mark.asyncio
async def test_la_pagina_non_contiene_nessun_placeholder_non_sostituito(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina(DATI)

    residui = sv.placeholder_residui(out["html"])
    assert residui == [], f"placeholder rimasti nell'HTML: {residui}"


@pytest.mark.asyncio
async def test_la_vetrina_non_vende(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"].lower()

    for vietato in ("<form", "<input", "checkout", "acquista", "aggiungi al carrello",
                    "iscriviti ora", "prezzo", "€", "sconto", "posti disponibili", "scade"):
        assert vietato not in html, f"la vetrina non deve contenere '{vietato}'"


@pytest.mark.asyncio
async def test_il_font_di_default_e_poppins_ma_il_brand_ciak_non_entra(monkeypatch):
    """Perimetro ESTERNO: questa pagina e' del cliente.

    Poppins resta il default (e' il font che il brand kit Ciak Start produce),
    ma i COLORI di Evolution non devono comparire su un sito che non e' suo.
    """
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "Poppins" in html
    assert "#FACC15" not in html


@pytest.mark.asyncio
async def test_il_font_del_cliente_sostituisce_il_default(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina({**DATI, "brand_kit": {
        "colore_primario": "#2F5D50", "font": "Source Serif 4",
    }}))["html"]

    assert "family=Source+Serif+4" in html
    assert "'Source Serif 4'" in html


@pytest.mark.asyncio
async def test_senza_foto_non_stampa_un_immagine_rotta(monkeypatch):
    """Foto assente non significa placeholder grigio: significa niente <img>."""
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina({**DATI, "foto_url": None}))["html"]

    assert "<img" not in html
    assert '<div class="ritratto"' not in html


@pytest.mark.asyncio
async def test_con_la_foto_il_ritratto_ha_un_alt_descrittivo(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina({**DATI, "foto_url": "https://cdn.esempio.it/maria.jpg"}))["html"]

    assert 'alt="Ritratto di Maria Restifo"' in html
    assert 'class="ritratto"' in html


@pytest.mark.asyncio
async def test_i_colori_arrivano_dal_brand_kit_del_cliente_non_da_ciak(monkeypatch):
    """Perimetro esterno: il giallo Ciak su un sito del cliente e' contaminazione."""
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())
    kit = {"colore_primario": "#2F5D50", "colore_accento": "#C97B4A", "font": "Poppins"}

    out = await sv.build_vetrina({**DATI, "brand_kit": kit})

    assert out["brand_applicato"] is True
    assert "#2F5D50" in out["html"]
    assert "#C97B4A" in out["html"]
    assert "#FACC15" not in out["html"]


@pytest.mark.asyncio
async def test_senza_brand_kit_niente_accento_inventato_e_lo_dice(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina(DATI)

    assert out["brand_applicato"] is False
    assert "#FACC15" not in out["html"]
    assert "brand kit" in out["nota"].lower()


@pytest.mark.asyncio
async def test_un_colore_non_valido_non_finisce_nel_css(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())
    kit = {"colore_primario": "verde bosco; }body{display:none", "colore_accento": "#C97B4A"}

    out = await sv.build_vetrina({**DATI, "brand_kit": kit})

    # Si cerca l'iniezione, non "display:none": quello compare legittimamente nel
    # CSS delle FAQ per nascondere il marker nativo di <details>.
    assert "verde bosco" not in out["html"]
    assert "}body{" not in out["html"]
    assert out["brand_applicato"] is False


@pytest.mark.asyncio
async def test_il_form_non_si_stampa_se_non_ha_dove_recapitare(monkeypatch):
    """Un form che perde i messaggi e' peggio di nessun form."""
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina(DATI)

    assert out["form_attivo"] is False
    assert "<form" not in out["html"]


@pytest.mark.asyncio
async def test_il_form_ha_label_vere_e_il_consenso_privacy(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina({
        **DATI,
        "form_action": "https://www.ciak.io/api/vetrina/abc/contatto",
        "privacy_url": "https://mariarestifo.it/privacy",
    })
    html = out["html"]

    assert out["form_attivo"] is True
    for campo in ("nome", "email", "messaggio"):
        assert f'<label for="{campo}"' in html
    assert 'name="consenso"' in html and "required" in html
    assert "informativa privacy" in html


@pytest.mark.asyncio
async def test_le_icone_sono_svg_non_emoji(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "<svg" in html
    assert "✅" not in html and "❌" not in html and "✔" not in html


@pytest.mark.asyncio
async def test_il_movimento_rispetta_prefers_reduced_motion(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "prefers-reduced-motion" in html
    # Senza JS il contenuto resta visibile: il reveal non nasconde nulla di critico.
    assert "IntersectionObserver" in html and "classList.add('visibile')" in html


@pytest.mark.asyncio
async def test_la_checklist_dns_usa_il_dominio_vero_e_non_chiede_una_call(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina(DATI)

    passi = " ".join(out["checklist_dns"])
    assert "mariarestifo.it" in passi
    assert len(out["checklist_dns"]) >= 3


@pytest.mark.asyncio
async def test_senza_dominio_la_checklist_lo_dice_invece_di_inventarlo(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina({**DATI, "dominio": None})

    assert out["dominio"] == sv.DOMINIO_DA_SCEGLIERE
    assert any(sv.DOMINIO_DA_SCEGLIERE in passo for passo in out["checklist_dns"])


@pytest.mark.asyncio
async def test_quando_l_ai_non_risponde_la_pagina_esce_lo_stesso_ma_si_dichiara(monkeypatch):
    def esplode(dati):
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    monkeypatch.setattr(sv, "_call_claude", esplode)

    out = await sv.build_vetrina(DATI)

    assert out["_fallback"] is True
    assert out["nota"]
    # I testi grezzi vengono dal posizionamento del cliente: veri, non inventati.
    assert "insegna a chi pratica gia'" in out["html"]
    assert sv.placeholder_residui(out["html"]) == []


@pytest.mark.asyncio
async def test_i_contatti_mancanti_non_diventano_recapiti_finti(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina({**DATI, "email_contatto": None})

    assert "mailto:" not in out["html"]
    assert "Da inserire prima di pubblicare" in out["html"]


@pytest.mark.asyncio
async def test_il_titolo_di_sezione_non_resta_minuscolo(monkeypatch):
    """I campi del posizionamento sono frammenti da mezza frase.

    Usati come titolo restavano in minuscolo ("formazione per terapisti...") e la
    pagina sembrava sciatta. Visto sullo screenshot, non nei test.
    """
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "<h2>Formazione per terapisti del massaggio thai</h2>" in html


@pytest.mark.asyncio
async def test_senza_javascript_la_pagina_resta_leggibile(monkeypatch):
    """Il difetto trovato guardando il render, non i test.

    Con `.rivela{opacity:0}` incondizionato, un browser senza JS mostrava una
    pagina bianca. Ora il reveal e' subordinato alla classe `js`, che aggiunge
    lo script stesso: niente JS, nessun nascondimento.
    """
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    import re

    assert "classList.add('js')" in html
    # Ogni regola che azzera l'opacita' deve essere condizionata alla classe `js`.
    # I commenti CSS si tolgono prima: citano la regola sbagliata per spiegarla.
    css = re.sub(r"/\*.*?\*/", "", html, flags=re.S)
    regole = re.findall(r"([^\s{;]*\s*\.rivela[^{]*)\{opacity:0", css)
    assert regole, "il reveal non c'e' piu': aggiorna il test"
    for regola in regole:
        assert regola.strip().startswith(".js "), f"reveal non condizionato al JS: {regola}"


def test_il_contrasto_si_calcola_come_wcag():
    assert sv.contrasto("#FFFFFF", "#000000") == 21.0
    assert sv.contrasto("#24463C", "#FFFFFF") > 7


@pytest.mark.asyncio
async def test_un_accento_troppo_chiaro_non_viene_usato_dove_serve_leggerlo(monkeypatch):
    """Il cliente sceglie i suoi colori, e puo' sceglierne uno illeggibile.

    Un giallo chiaro come stroke delle icone sparisce sul fondo chiaro: dove
    l'accento porta significato si ripiega sul primario. Resta l'accento dove
    e' solo decorazione.
    """
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())
    kit = {"colore_primario": "#24463C", "colore_accento": "#FAF089", "colore_fondo": "#FFFFFF"}

    palette, presente = sv.palette_da_brand_kit(kit)

    assert presente is True
    assert palette["accento"] == "#FAF089"
    assert palette["accento_forte"] == "#24463C"

    html = (await sv.build_vetrina({**DATI, "brand_kit": kit}))["html"]
    assert 'stroke="var(--accento-forte)"' in html


# ─── FAQ e testimonianze ─────────────────────────────────────────────────────
# Le FAQ tolgono attrito prima del contatto. Le testimonianze sono prova sociale
# e per questo sono il punto piu' pericoloso della pagina: inventarne una e'
# illecito (Codice del Consumo artt. 21-23), ed e' il motivo per cui
# `POST /funnel/{id}/genera-ai` e' stato ritirato con 410. Qui si difende quello.

def _con_faq(**override):
    return _risposta_modello(faq=[
        {"domanda": "Come si lavora insieme?", "risposta": "Ci sentiamo, guardiamo la tua situazione e decidiamo se ha senso."},
        {"domanda": "Quanto dura il percorso?", "risposta": "Otto settimane, con un incontro ogni quindici giorni."},
    ], **override)


VERE = [
    {"testo": "Ho smesso di abbassare le tariffe e l'agenda si e' riempita lo stesso.",
     "autore": "Giulia Ferrero", "ruolo": "Terapista, Torino"},
    {"testo": "In due mesi ho capito a chi mi rivolgo davvero, e i clienti sono cambiati.",
     "autore": "Marco Lippi", "ruolo": "Massaggiatore sportivo"},
]


@pytest.mark.asyncio
async def test_le_faq_usano_details_cosi_si_aprono_anche_senza_javascript(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _con_faq())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "<details class=\"faq\">" in html
    assert "<summary>Come si lavora insieme?</summary>" in html
    assert "Domande che mi fanno spesso" in html


@pytest.mark.asyncio
async def test_senza_faq_la_sezione_sparisce_invece_di_restare_vuota(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    out = await sv.build_vetrina(DATI)

    assert "Domande che mi fanno spesso" not in out["html"]
    assert "elenco-faq" not in out["html"].split("<style>")[1].split("</style>")[1]


@pytest.mark.asyncio
async def test_le_testimonianze_vere_si_pubblicano_con_nome_e_ruolo(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _con_faq())

    out = await sv.build_vetrina({**DATI, "testimonianze": VERE})

    assert out["testimonianze_pubblicate"] == 2
    assert "Giulia Ferrero" in out["html"]
    assert "Terapista, Torino" in out["html"]
    assert "<blockquote>" in out["html"]


@pytest.mark.asyncio
async def test_senza_testimonianze_la_sezione_non_esiste_e_il_cliente_sa_come_averle(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _con_faq())

    out = await sv.build_vetrina(DATI)

    assert out["testimonianze_pubblicate"] == 0
    assert "Chi ha lavorato con me" not in out["html"]
    assert any("Testimonianze" in v for v in out["da_completare"])


@pytest.mark.asyncio
async def test_una_testimonianza_anonima_non_si_pubblica(monkeypatch):
    """Anonima vale zero e sembra inventata: chi la rilascia deve poterlo confermare."""
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _con_faq())
    miste = VERE + [{"testo": "Bravissima, la consiglio a tutti quanti davvero!", "autore": ""}]

    out = await sv.build_vetrina({**DATI, "testimonianze": miste})

    assert out["testimonianze_pubblicate"] == 2
    assert "Bravissima" not in out["html"]


@pytest.mark.asyncio
async def test_il_modello_non_puo_inventare_testimonianze(monkeypatch):
    """Anche se l'AI ne restituisse, non entrano: non sono un campo dello schema."""
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _con_faq(
        testimonianze=[{"testo": "Mi ha cambiato la vita, incredibile!", "autore": "Un cliente"}],
    ))

    out = await sv.build_vetrina(DATI)

    assert "testimonianze" not in sv._SCHEMA["properties"]
    assert "Mi ha cambiato la vita" not in out["html"]
    assert out["testimonianze_pubblicate"] == 0


@pytest.mark.asyncio
async def test_nessun_carattere_di_controllo_nella_pagina(monkeypatch):
    """Un `\201C` scritto in Python diventa un carattere di controllo, non una virgoletta.

    Sulla pagina si vedeva un quadratino. Vale per tutto l'HTML: i caratteri di
    controllo non hanno nulla da fare in un documento consegnato al cliente.
    """
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _con_faq())

    html = (await sv.build_vetrina({**DATI, "testimonianze": VERE}))["html"]

    controllo = [c for c in html if ord(c) < 32 and c not in "\n\t\r"] + \
                [c for c in html if 127 <= ord(c) <= 159]
    assert controllo == [], f"caratteri di controllo trovati: {[hex(ord(c)) for c in controllo]}"
