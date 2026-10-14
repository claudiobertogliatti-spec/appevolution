"""
Memoria Ciak — le regole condivise che tutti gli agenti leggono.

Un'unica fonte, scritta da una persona, in 4 sezioni: marchio, offerte, regole, tono.
Persistenza versionata (come il prompt di Matteo): una sola versione e' attiva, le
precedenti restano leggibili e si puo' tornare indietro.

Storage: collection MongoDB `ciak_memoria`.

⛔ Regola d'oro del repo: una risposta incompleta ma vera vale piu' di una completa e inventata.
Per questo NON c'e' nessun testo di partenza: finche' una persona non scrive la memoria,
`render_block()` ritorna "" e gli agenti si comportano esattamente come prima. Quello che
c'e' qui dentro lo ha scritto e approvato chi la modifica, non il modello.

Schema documento:
{
    id: str (uuid),
    label: str,
    sections: {marchio, offerte, regole, tono: str},
    author_email: str,
    created_at: ISO,
    active: bool,
    parent_id: str | None
}
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Iterable, Optional

logger = logging.getLogger(__name__)

# Iniettato da server.py
db = None

# (chiave, titolo mostrato, a cosa serve) — l'ordine e' quello del blocco passato agli agenti.
SECTIONS: tuple[tuple[str, str, str], ...] = (
    ("marchio", "Marchio", "Chi siamo, cosa vendiamo, a chi, parole da usare e da evitare."),
    ("offerte", "Offerte", "Cosa c'e' in ogni offerta, a che condizioni. Solo cio' che e' vero oggi."),
    ("regole", "Regole", "Cosa gli agenti non devono mai fare o promettere."),
    ("tono", "Tono", "Come si scrive: persona, registro, lunghezza, esempi."),
)
SECTION_KEYS = tuple(k for k, _, _ in SECTIONS)
TITLES = {k: t for k, t, _ in SECTIONS}

MAX_SECTION_CHARS = 4000
MAX_LABEL_CHARS = 200

INTRO = (
    "━━━ MEMORIA CIAK ━━━\n"
    "Scritta da una persona del team. Vale per tutti gli agenti. Se qui non c'e' scritto "
    "qualcosa, non lo inventi: dici che non lo sai."
)


def set_db(database) -> None:
    global db
    db = database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def normalize_sections(raw: Optional[dict]) -> dict:
    """Tiene solo le 4 sezioni note, come testo ripulito. Una chiave sconosciuta e' un
    errore (ValueError), non viene ignorata in silenzio: chi scrive deve saperlo."""
    raw = raw or {}
    unknown = [k for k in raw if k not in SECTION_KEYS]
    if unknown:
        raise ValueError(f"Sezioni sconosciute: {', '.join(sorted(unknown))}")
    out = {}
    for key in SECTION_KEYS:
        value = raw.get(key, "")
        if value is None:
            value = ""
        if not isinstance(value, str):
            raise ValueError(f"La sezione «{TITLES[key]}» deve essere testo")
        value = value.strip()
        if len(value) > MAX_SECTION_CHARS:
            raise ValueError(
                f"La sezione «{TITLES[key]}» supera {MAX_SECTION_CHARS} caratteri ({len(value)})"
            )
        out[key] = value
    return out


def render_block(sections: Optional[dict], only: Optional[Iterable[str]] = None) -> str:
    """Testo da accodare al prompt di un agente. Vuoto se non c'e' nulla di scritto.

    `only` limita alle sezioni indicate (per gli agenti che parlano coi clienti non si
    passa mai tutto: vedi `CLIENT_SAFE`)."""
    if not sections:
        return ""
    wanted = set(only) if only is not None else set(SECTION_KEYS)
    parts = []
    for key, title, _ in SECTIONS:
        text = (sections.get(key) or "").strip()
        if key in wanted and text:
            parts.append(f"{title.upper()}\n{text}")
    if not parts:
        return ""
    return INTRO + "\n\n" + "\n\n".join(parts) + "\n"


# Sezioni che si possono mostrare a un agente che parla con i clienti. «offerte» e «regole»
# restano interne: possono contenere condizioni e margini non pensati per essere detti.
CLIENT_SAFE = ("marchio", "tono")


async def get_active() -> Optional[dict]:
    if db is None:
        return None
    return _clean(await db.ciak_memoria.find_one({"active": True}))


async def render_active_block(only: Optional[Iterable[str]] = None) -> str:
    """Il blocco per gli agenti. Non solleva mai: se il DB non risponde la chat deve
    continuare come prima, quindi si logga e si ritorna ''."""
    try:
        active = await get_active()
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[MEMORIA] lettura fallita, agenti senza memoria: {e}")
        return ""
    return render_block((active or {}).get("sections"), only)


async def list_versions(limit: int = 50) -> list:
    if db is None:
        return []
    items = []
    async for doc in db.ciak_memoria.find({}).sort("created_at", -1).limit(limit):
        items.append(_clean(doc))
    return items


async def create_version(
    sections: dict,
    label: str,
    author_email: str,
    parent_id: Optional[str] = None,
    activate: bool = True,
) -> dict:
    """Nuova versione (ValueError se le sezioni non sono valide). Con activate=True
    diventa quella attiva e la precedente resta in archivio."""
    if db is None:
        raise RuntimeError("DB non configurato")
    label = (label or "").strip()
    if not label:
        raise ValueError("Serve una etichetta (cosa hai cambiato)")
    doc = {
        "id": str(uuid.uuid4()),
        "label": label[:MAX_LABEL_CHARS],
        "sections": normalize_sections(sections),
        "author_email": author_email,
        "created_at": _now_iso(),
        "active": activate,
        "parent_id": parent_id,
    }
    if activate:
        await db.ciak_memoria.update_many({"active": True}, {"$set": {"active": False}})
    await db.ciak_memoria.insert_one(dict(doc))
    logger.info("[MEMORIA] nuova versione id=%s label=%s active=%s", doc["id"], doc["label"], activate)
    return doc


async def activate_version(version_id: str) -> Optional[dict]:
    """Riattiva una versione esistente (ritorno indietro)."""
    if db is None:
        return None
    target = await db.ciak_memoria.find_one({"id": version_id})
    if not target:
        return None
    await db.ciak_memoria.update_many({"active": True}, {"$set": {"active": False}})
    await db.ciak_memoria.update_one({"id": version_id}, {"$set": {"active": True}})
    return _clean(await db.ciak_memoria.find_one({"id": version_id}))
