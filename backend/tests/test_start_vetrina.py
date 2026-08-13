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
async def test_rispetta_il_brand_lock(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "Poppins" in html
    assert "#0F172A" in html
    assert "#FACC15" in html


@pytest.mark.asyncio
async def test_senza_foto_non_stampa_un_immagine_rotta(monkeypatch):
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina({**DATI, "foto_url": None}))["html"]

    assert "<img" not in html


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
    assert "Recapiti da inserire" in out["html"]


@pytest.mark.asyncio
async def test_il_titolo_di_sezione_non_resta_minuscolo(monkeypatch):
    """I campi del posizionamento sono frammenti da mezza frase.

    Usati come titolo restavano in minuscolo ("formazione per terapisti...") e la
    pagina sembrava sciatta. Visto sullo screenshot, non nei test.
    """
    monkeypatch.setattr(sv, "_call_claude", lambda dati: _risposta_modello())

    html = (await sv.build_vetrina(DATI))["html"]

    assert "<h2>Formazione per terapisti del massaggio thai</h2>" in html
