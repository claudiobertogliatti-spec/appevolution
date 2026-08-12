"""Profili social di Ciak Start — il deliverable della tappa 2.

Il cliente Start non ci da' i suoi accessi social (decisione di Claudio del
30/7): il sistema produce i testi, li incolla lui. Quindi il documento vale solo
se e' *incollabile*: una bio Instagram di 300 caratteri non entra, e il cliente
la taglia a caso rovinando il posizionamento che ha appena pagato.

Qui si difendono tre cose: i limiti veri delle piattaforme, il divieto di
inventare (URL, numeri, promesse di guadagno) e il fallback che si dichiara
invece di consegnare bio finte.
"""
import pytest

from services import start_profili_social as sps

pytestmark = pytest.mark.unit


POSIZIONAMENTO = {
    "brand": "Metodo Sabai",
    "categoria": "formazione per terapisti del massaggio thai",
    "idea_differenziante": "insegna a chi pratica gia', non ai principianti",
    "vantaggio_cliente": "riempi l'agenda senza abbassare le tariffe",
}

DATI = {
    "nome": "Maria Restifo",
    "nicchia": "massaggio thai professionale",
    "posizionamento": POSIZIONAMENTO,
    "vetrina_url": "https://mariarestifo.it",
}


def _risposta_modello(**override):
    base = {
        "nome_visualizzato": "Maria Restifo | Metodo Sabai",
        "instagram_bio": "Insegno il massaggio thai a chi lo pratica gia'. " * 12,
        "facebook_descrizione": "Formazione per terapisti. " * 30,
        "linkedin_headline": "Formatrice per terapisti del massaggio thai. " * 12,
        "linkedin_about": "Lavoro con terapisti che vogliono vivere del loro lavoro.",
        "tiktok_bio": "Massaggio thai per chi lo pratica gia' e vuole viverci. " * 5,
        "cover_titolo": "Il massaggio thai come professione",
        "cover_sottotitolo": "Formazione per chi pratica gia'",
        "in_evidenza": ["Percorso in 8 settimane", "Solo terapisti in attivita'"],
    }
    base.update(override)
    return base


@pytest.mark.asyncio
async def test_le_bio_stanno_dentro_i_limiti_veri_delle_piattaforme(monkeypatch):
    monkeypatch.setattr(sps, "_call_claude", lambda dati: _risposta_modello())

    out = await sps.build_profili_social(DATI)

    assert len(out["instagram"]["bio"]) <= sps.LIMITI["instagram_bio"]
    assert len(out["facebook"]["descrizione"]) <= sps.LIMITI["facebook_descrizione"]
    assert len(out["linkedin"]["headline"]) <= sps.LIMITI["linkedin_headline"]
    assert len(out["tiktok"]["bio"]) <= sps.LIMITI["tiktok_bio"]
    # Tagliato su confine di parola: niente parole spezzate a meta'.
    assert not out["instagram"]["bio"].rstrip("…").endswith(" ")
    assert "  " not in out["instagram"]["bio"]


@pytest.mark.asyncio
async def test_il_link_in_bio_e_la_vetrina_quando_esiste(monkeypatch):
    monkeypatch.setattr(sps, "_call_claude", lambda dati: _risposta_modello())

    out = await sps.build_profili_social(DATI)

    assert out["link_in_bio"] == "https://mariarestifo.it"


@pytest.mark.asyncio
async def test_senza_vetrina_il_link_resta_da_inserire_e_non_viene_inventato(monkeypatch):
    monkeypatch.setattr(sps, "_call_claude", lambda dati: _risposta_modello())
    dati = {**DATI, "vetrina_url": None}

    out = await sps.build_profili_social(dati)

    assert out["link_in_bio"] == sps.LINK_DA_INSERIRE
    assert "http" not in out["link_in_bio"]


@pytest.mark.asyncio
async def test_emoji_e_trattini_lunghi_vengono_tolti(monkeypatch):
    monkeypatch.setattr(sps, "_call_claude", lambda dati: _risposta_modello(
        instagram_bio="🔥 Massaggio thai — il metodo che spacca 💪",
        tiktok_bio="Thai massage ✨",
    ))

    out = await sps.build_profili_social(DATI)

    assert "🔥" not in out["instagram"]["bio"]
    assert "💪" not in out["instagram"]["bio"]
    assert "—" not in out["instagram"]["bio"]
    assert "✨" not in out["tiktok"]["bio"]


@pytest.mark.asyncio
async def test_quando_l_ai_non_risponde_il_fallback_si_dichiara_e_non_inventa_bio(monkeypatch):
    def esplode(dati):
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    monkeypatch.setattr(sps, "_call_claude", esplode)

    out = await sps.build_profili_social(DATI)

    assert out["_fallback"] is True
    assert out["instagram"]["bio"] == ""
    assert out["tiktok"]["bio"] == ""
    assert out["nota"]
    # Gli ingredienti corretti restano, cosi' le bio si scrivono a mano in due minuti.
    assert POSIZIONAMENTO["idea_differenziante"] in " ".join(out["in_evidenza"])


@pytest.mark.asyncio
async def test_una_risposta_incompleta_del_modello_vale_come_fallback(monkeypatch):
    monkeypatch.setattr(sps, "_call_claude", lambda dati: {"instagram_bio": "solo questa"})

    out = await sps.build_profili_social(DATI)

    assert out["_fallback"] is True


@pytest.mark.asyncio
async def test_il_nome_visualizzato_usa_il_nome_vero_del_cliente(monkeypatch):
    monkeypatch.setattr(sps, "_call_claude", lambda dati: _risposta_modello())

    out = await sps.build_profili_social(DATI)

    assert "Maria Restifo" in out["nome_visualizzato"]
