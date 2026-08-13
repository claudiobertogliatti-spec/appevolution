"""Profili social pronti da incollare — deliverable Ciak Start (tappa 2).

Non tocchiamo gli account del cliente e non gli chiediamo le password
(decisione di Claudio del 30/7): il sistema scrive i testi, li applica lui.
Quindi il valore sta tutto nell'essere *incollabile*: ogni bio rispetta il
limite vero della sua piattaforma, perche' una bio che non entra la taglia il
cliente, a caso, rovinando il posizionamento che ha appena pagato.

Agente: VALENTINA (brand e posizionamento), via `agent_deliverable.system_blocks`.
Come tutti i generatori del repo: tool-use con fallback che **si dichiara** e non
consegna testo inventato.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = os.environ.get("START_PROFILI_MODEL", "claude-sonnet-4-6")

# Limiti reali delle piattaforme (verificati al 12/8/2026). Se una piattaforma
# li cambia, si cambia qui: il generatore li passa al modello E li applica dopo,
# perche' un modello che sfora non deve poter produrre un documento inutilizzabile.
LIMITI = {
    "instagram_bio": 150,
    "facebook_descrizione": 255,
    "linkedin_headline": 220,
    "linkedin_about": 2000,
    "tiktok_bio": 80,
    "cover_titolo": 60,
    "cover_sottotitolo": 90,
}

LINK_DA_INSERIRE = "da inserire quando il sito vetrina e' online"

_NOTA_FALLBACK = (
    "Le bio non sono state generate: la scrittura automatica non e' andata a buon fine. "
    "Gli elementi qui sotto sono corretti e bastano a scriverle con Valentina in pochi minuti. "
    "Meglio nessuna bio che una bio sbagliata sui tuoi profili pubblici."
)

_SYSTEM = (
    "Scrivi i testi dei PROFILI SOCIAL di un professionista, partendo dal suo "
    "posizionamento gia' definito. I testi verranno incollati da lui nei suoi "
    "account: devono essere pronti, non bozze.\n"
    "REGOLE DI SCRITTURA (brand voice Ciak, non negoziabili):\n"
    "- Italiano semplice e diretto, zero fuffa.\n"
    "- Niente superlativi assoluti (mai 'potente', 'incredibile', '10x', 'il migliore').\n"
    "- Niente registro guru o motivazionale.\n"
    "- Nessuna emoji: le aggiunge lui se vuole.\n"
    "- Mai il trattino lungo. Al suo posto virgola, punto o parentesi.\n"
    "- Vietato promettere guadagni o risultati numerici che non ti sono stati dati: "
    "non inventare cifre, percentuali, anni di esperienza o numero di clienti.\n"
    "LIMITI DI CARATTERI, tassativi (li impone la piattaforma):\n"
    f"- instagram_bio: {LIMITI['instagram_bio']}\n"
    f"- facebook_descrizione: {LIMITI['facebook_descrizione']}\n"
    f"- linkedin_headline: {LIMITI['linkedin_headline']}\n"
    f"- tiktok_bio: {LIMITI['tiktok_bio']}\n"
    f"- cover_titolo: {LIMITI['cover_titolo']} · cover_sottotitolo: {LIMITI['cover_sottotitolo']}\n"
    "Ogni bio deve dire a CHI si rivolge e COSA ottiene chi lo segue. La prima riga "
    "e' quella che si legge senza aprire il profilo: mettici la specializzazione, "
    "non il ruolo generico.\n"
    "'in_evidenza' sono 3-5 cose concrete da mettere in primo piano sul profilo "
    "(highlight, post fissato, sezione servizi), non slogan."
)

_CAMPI = [
    "nome_visualizzato", "instagram_bio", "facebook_descrizione", "linkedin_headline",
    "linkedin_about", "tiktok_bio", "cover_titolo", "cover_sottotitolo", "in_evidenza",
]

_SCHEMA = {
    "type": "object",
    "properties": {
        "nome_visualizzato": {"type": "string", "description": "Nome del profilo: nome vero piu' la specializzazione."},
        "instagram_bio": {"type": "string", "description": f"Bio Instagram, max {LIMITI['instagram_bio']} caratteri."},
        "facebook_descrizione": {"type": "string", "description": f"Descrizione Pagina Facebook, max {LIMITI['facebook_descrizione']}."},
        "linkedin_headline": {"type": "string", "description": f"Headline LinkedIn, max {LIMITI['linkedin_headline']}."},
        "linkedin_about": {"type": "string", "description": "Sezione Informazioni di LinkedIn, 4-8 frasi brevi."},
        "tiktok_bio": {"type": "string", "description": f"Bio TikTok, max {LIMITI['tiktok_bio']} caratteri."},
        "cover_titolo": {"type": "string", "description": "Titolo per l'immagine di copertina."},
        "cover_sottotitolo": {"type": "string", "description": "Sottotitolo della copertina."},
        "in_evidenza": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3-5 elementi concreti da mettere in evidenza sul profilo.",
        },
    },
    "required": _CAMPI,
}

# Emoji e simboli decorativi: fuori dal brand e, sui profili, rumore.
_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002190-\U000021FF\U00002B00-\U00002BFF️‍]"
)


def _pulisci(testo: Any) -> str:
    """Toglie emoji, trattini lunghi e spazi doppi. Non riscrive il contenuto."""
    t = _EMOJI.sub("", str(testo or ""))
    t = t.replace("—", ",").replace("–", "-")
    return " ".join(t.split()).strip(" ,;")


def _entro(testo: str, limite: int) -> str:
    """Taglia su confine di parola. Una bio troncata a meta' parola e' peggio di una corta."""
    t = _pulisci(testo)
    if len(t) <= limite:
        return t
    tagliato = t[: limite - 1].rsplit(" ", 1)[0].rstrip(" ,.;:")
    return (tagliato + "…") if tagliato else t[: limite - 1] + "…"


def _ingredienti(dati: dict) -> list[str]:
    pos = dati.get("posizionamento") or {}
    voci = [
        pos.get("idea_differenziante"),
        pos.get("vantaggio_cliente"),
        pos.get("categoria"),
        dati.get("nicchia"),
    ]
    return [_pulisci(v) for v in voci if _pulisci(v)]


def _fallback(dati: dict) -> dict:
    """Nessuna bio inventata: si dichiara il buco e si lasciano gli elementi giusti.

    Stessa regola del Brand Positioning Statement (12/8): un fallback che
    assembla testo produce documenti che il cliente pubblicherebbe sgrammaticati.
    """
    pos = dati.get("posizionamento") or {}
    nome = _pulisci(dati.get("nome")) or _pulisci(pos.get("brand")) or "Il tuo nome"
    return {
        "_fallback": True,
        "nota": _NOTA_FALLBACK,
        "nome_visualizzato": nome,
        "link_in_bio": _link_in_bio(dati),
        "instagram": {"bio": ""},
        "facebook": {"descrizione": ""},
        "linkedin": {"headline": "", "about": ""},
        "tiktok": {"bio": ""},
        "cover": {"titolo": "", "sottotitolo": ""},
        "in_evidenza": _ingredienti(dati),
    }


def _link_in_bio(dati: dict) -> str:
    url = (dati.get("vetrina_url") or "").strip()
    return url if url.startswith("http") else LINK_DA_INSERIRE


def _call_claude(dati: dict) -> dict:
    """Chiamata sincrona Anthropic tool-use. Solleva in caso di errore."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY non configurata")

    pos = dati.get("posizionamento") or {}
    righe = [
        f"- nome: {dati.get('nome') or ''}",
        f"- ambito: {dati.get('nicchia') or ''}",
        f"- brand: {pos.get('brand') or ''}",
        f"- categoria: {pos.get('categoria') or ''}",
        f"- idea differenziante: {pos.get('idea_differenziante') or ''}",
        f"- vantaggio per il cliente: {pos.get('vantaggio_cliente') or ''}",
    ]
    user = "Posizionamento gia' approvato:\n" + "\n".join(righe) + "\n\nScrivi i testi dei profili."

    from .agent_deliverable import system_blocks

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=_MODEL,
        max_tokens=2000,
        system=system_blocks("VALENTINA", _SYSTEM),
        messages=[{"role": "user", "content": user}],
        tools=[{
            "name": "profili_social",
            "description": "Restituisci i testi dei profili social, pronti da incollare.",
            "input_schema": _SCHEMA,
        }],
        tool_choice={"type": "tool", "name": "profili_social"},
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use":
            return dict(block.input)
    raise RuntimeError("Nessun output strutturato dal modello")


def _valido(out: Any) -> bool:
    if not isinstance(out, dict):
        return False
    for campo in _CAMPI:
        valore = out.get(campo)
        if campo == "in_evidenza":
            if not isinstance(valore, list) or not [v for v in valore if str(v).strip()]:
                return False
        elif not str(valore or "").strip():
            return False
    return True


async def build_profili_social(dati: dict) -> dict:
    """Testi dei profili social a partire dal posizionamento gia' approvato.

    Non solleva mai: in caso di errore o output incompleto ritorna il fallback
    dichiarato, cosi' il documento si genera comunque e dice cosa manca.
    """
    try:
        out = await asyncio.to_thread(_call_claude, dati)
        if not _valido(out):
            logger.warning("[START_PROFILI] Output AI incompleto — fallback dichiarato")
            return _fallback(dati)
    except Exception as exc:  # noqa: BLE001 — il deliverable non deve mai rompersi
        logger.warning("[START_PROFILI] Generazione fallita (%s) — fallback dichiarato", exc)
        return _fallback(dati)

    nome = _pulisci(out.get("nome_visualizzato"))
    nome_vero = _pulisci(dati.get("nome"))
    if nome_vero and nome_vero.lower() not in nome.lower():
        nome = f"{nome_vero} | {nome}" if nome else nome_vero

    return {
        "_fallback": False,
        "nome_visualizzato": _entro(nome, 60),
        "link_in_bio": _link_in_bio(dati),
        "instagram": {"bio": _entro(out.get("instagram_bio"), LIMITI["instagram_bio"])},
        "facebook": {"descrizione": _entro(out.get("facebook_descrizione"), LIMITI["facebook_descrizione"])},
        "linkedin": {
            "headline": _entro(out.get("linkedin_headline"), LIMITI["linkedin_headline"]),
            "about": _entro(out.get("linkedin_about"), LIMITI["linkedin_about"]),
        },
        "tiktok": {"bio": _entro(out.get("tiktok_bio"), LIMITI["tiktok_bio"])},
        "cover": {
            "titolo": _entro(out.get("cover_titolo"), LIMITI["cover_titolo"]),
            "sottotitolo": _entro(out.get("cover_sottotitolo"), LIMITI["cover_sottotitolo"]),
        },
        "in_evidenza": [_pulisci(v) for v in (out.get("in_evidenza") or []) if _pulisci(v)][:5],
    }
