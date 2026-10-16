"""
Ciak — Blueprint salvato: una sola generazione, lo stesso documento ovunque.

Il Blueprint (template lockato: 2 copertine + 14 pagine, `ciak_pdf_blueprint`)
si genera UNA volta con Claude e il contenuto (payload) si salva in
`ciak_blueprints`. Il PDF è sempre l'impaginazione di quel payload: quello che
l'admin scarica prima della call e quello che il cliente riceve dopo sono lo
stesso documento. Prima ogni click rigenerava un testo diverso.

Documento `ciak_blueprints` (chiave: session_token):
  stato          "in_generazione" | "pronto" | "errore"
  payload        {"meta", "sezioni"} per render_blueprint_html (solo se pronto)
  errore         messaggio reale dell'ultimo fallimento (solo se errore)
  avviato_at / generato_at
  consegna_inviata_at, consegna_errore, pdf_url   (vedi ciak_analisi_delivery)

Niente lavori in background: la generazione gira dentro la richiesta che la
chiede (async, il server resta libero). Se il proxy chiude la connessione
prima, il backend finisce comunque e salva lo stato: l'admin lo ritrova
ricaricando la scheda del lead.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from services import ciak_analisi, ciak_pdf_blueprint

logger = logging.getLogger(__name__)

STATO_IN_GENERAZIONE = "in_generazione"
STATO_PRONTO = "pronto"
STATO_ERRORE = "errore"

# Oltre questo tempo una generazione "in corso" è considerata morta (processo
# riavviato, timeout del container) e si può ripartire.
GENERAZIONE_SCADUTA_DOPO = timedelta(minutes=10)

# Campi esposti all'admin (il payload resta dentro: serve solo al renderer).
_CAMPI_STATO = (
    "session_token", "stato", "errore", "avviato_at", "generato_at",
    "consegna_inviata_at", "consegna_errore", "pdf_url",
)


class BlueprintNonPronto(Exception):
    """Il Blueprint non è ancora stato generato (o l'ultima generazione è fallita)."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def stato_pubblico(doc: Optional[dict]) -> dict:
    """Stato del Blueprint per la UI admin, senza il contenuto."""
    if not doc:
        return {"stato": "mancante"}
    out = {k: doc.get(k) for k in _CAMPI_STATO if doc.get(k) is not None}
    out.setdefault("stato", "mancante")
    return out


async def leggi(db, session_token: str) -> Optional[dict]:
    return await db.ciak_blueprints.find_one({"session_token": session_token}, {"_id": 0})


def _in_corso(doc: Optional[dict]) -> bool:
    if not doc or doc.get("stato") != STATO_IN_GENERAZIONE:
        return False
    try:
        avviato = datetime.fromisoformat(str(doc.get("avviato_at")))
    except (TypeError, ValueError):
        return False
    if avviato.tzinfo is None:
        avviato = avviato.replace(tzinfo=timezone.utc)
    return _now() - avviato < GENERAZIONE_SCADUTA_DOPO


async def genera(db, session_token: str, email: Optional[str] = None, force: bool = False) -> dict:
    """Genera il contenuto del Blueprint e lo salva. Ritorna lo stato pubblico.

    Idempotente: se è già pronto non rigenera (salvo force=True, "Rigenera");
    se c'è già una generazione in corso non ne parte una seconda. Una generazione
    fallita lascia stato=errore con il motivo reale, visibile nella scheda lead.
    Non tocca mai la consegna: rigenerare dopo l'invio non manda nulla al cliente.
    """
    doc = await leggi(db, session_token)
    if doc and doc.get("stato") == STATO_PRONTO and not force:
        return stato_pubblico(doc)
    if _in_corso(doc):
        return stato_pubblico(doc)

    await db.ciak_blueprints.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "session_token": session_token,
                "email": (email or "").strip().lower() or None,
                "stato": STATO_IN_GENERAZIONE,
                "avviato_at": _now().isoformat(),
            },
            "$unset": {"errore": ""},
        },
        upsert=True,
    )
    ciak_analisi.set_db(db)
    try:
        payload = await ciak_analisi.genera_blueprint(session_token)
        # Verifica che il template si impagini davvero prima di dichiararlo pronto:
        # un payload che il renderer rifiuta non deve arrivare fino alla consegna.
        ciak_pdf_blueprint.render_blueprint_html(payload)
    except Exception as exc:  # noqa: BLE001 — il motivo va mostrato all'admin, non perso
        logger.error("[CIAK_BLUEPRINT] generazione fallita per %s: %s", session_token, exc)
        await db.ciak_blueprints.update_one(
            {"session_token": session_token},
            {"$set": {"stato": STATO_ERRORE, "errore": str(exc) or exc.__class__.__name__}},
        )
        return stato_pubblico(await leggi(db, session_token))

    await db.ciak_blueprints.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "stato": STATO_PRONTO,
                "payload": payload,
                "generato_at": _now().isoformat(),
            },
            "$unset": {"errore": ""},
        },
    )
    return stato_pubblico(await leggi(db, session_token))


async def pdf(db, session_token: str) -> bytes:
    """PDF del Blueprint salvato (template lockato). Nessuna chiamata AI."""
    doc = await leggi(db, session_token)
    if not doc or doc.get("stato") != STATO_PRONTO or not doc.get("payload"):
        raise BlueprintNonPronto(_motivo_non_pronto(doc))
    return await ciak_pdf_blueprint.genera_blueprint_pdf(doc["payload"])


def _motivo_non_pronto(doc: Optional[dict]) -> str:
    if not doc:
        return "Il Blueprint non è ancora stato generato: premi \"Genera Blueprint\" nella scheda del lead."
    if doc.get("stato") == STATO_IN_GENERAZIONE:
        return "Il Blueprint è in preparazione: riprova tra un minuto."
    if doc.get("stato") == STATO_ERRORE:
        return f"L'ultima generazione del Blueprint è fallita: {doc.get('errore')}"
    return "Il Blueprint non è pronto."
