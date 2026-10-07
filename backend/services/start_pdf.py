"""Ciak Start: i materiali approvati diventano PDF veri nell'archivio del cliente.

Prima l'approvazione di un materiale Start scriveva solo dati strutturati
(`ciak_start_deliverables`) e portava lo step a "Completato": nell'area del cliente
"Consulta materiali" restava vuoto ("Il team sta completando l'archiviazione") e in
"I tuoi materiali" non c'era nessun documento suo. Qui, all'approvazione, nasce il
PDF e si registra in `files` come per ogni altro materiale del percorso.

Documenti INTERNI Ciak: cornice nel tema condiviso `ciak_doc_theme` (brand lock);
i colori del cliente sono solo il contenuto delle campionature. Nessun "EVO":
e' il vocabolario della Partnership, non di Start.

Per ora: posizionamento e marchio (tappa 1). Mai solleva: un PDF non riuscito non
blocca l'approvazione, si logga e si puo' rigenerare dal pannello admin.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from services.brand_kit_pdf_renderer import genera_brand_kit_pdf
from services.brand_kit_storage import upload_brand_kit_pdf
from services.ciak_doc_theme import cover, documento, esc, foot, render_pdf

logger = logging.getLogger(__name__)

# tipo deliverable -> (categoria in `files`, step journey, titolo del documento)
DOCUMENTI = {
    "positioning": ("posizionamento", "04-posizionamento", "Il tuo posizionamento"),
    "brand_kit": ("brand_kit", "03-brand-kit", "Il tuo marchio"),
}

_ELEMENTI = (
    ("brand", "Il tuo nome"),
    ("categoria", "Di cosa ti occupi"),
    ("idea_differenziante", "La tua idea che ti distingue"),
    ("a_differenza_di", "A differenza di"),
    ("vantaggio_cliente", "Cosa ottiene chi lavora con te"),
)

_CSS = """
.ps-frase{ font-size:18pt; font-weight:600; line-height:1.35; color:var(--ink);
  border-left:3mm solid #FACC15; padding:2mm 0 2mm 6mm; margin:2mm 0 8mm; }
.ps-promessa{ font-size:12pt; color:var(--ink); }
"""


def render_posizionamento_corpo(doc: dict[str, Any]) -> str:
    """Il solo contenuto (frase, elementi, promessa), senza copertina ne' sezioni:
    lo riusa il libretto del progetto Start."""
    elementi = doc.get("elementi") or {}
    righe = "".join(
        f'<div class="doc-qa"><div class="lab">{esc(etichetta)}</div>'
        f'<div class="ans">{esc(elementi.get(chiave) or "—")}</div></div>'
        for chiave, etichetta in _ELEMENTI
        if (elementi.get(chiave) or "").strip()
    )
    promessa = (doc.get("promessa") or "").strip()
    return (
        f'<div class="ps-frase">{esc(doc.get("frase") or "—")}</div>'
        + righe
        + (f'<div class="doc-qa"><div class="lab">La tua promessa</div><div class="ans">{esc(promessa)}</div></div>' if promessa else "")
    )


def render_posizionamento_html(doc: dict[str, Any], nome: str) -> str:
    """Il posizionamento approvato: la frase e i suoi cinque elementi."""
    elementi = doc.get("elementi") or {}
    righe = "".join(
        f'<div class="doc-qa"><div class="lab">{esc(etichetta)}</div>'
        f'<div class="ans">{esc(elementi.get(chiave) or "—")}</div></div>'
        for chiave, etichetta in _ELEMENTI
        if (elementi.get(chiave) or "").strip()
    ) or '<div class="doc-empty">Elementi non ancora definiti.</div>'
    promessa = (doc.get("promessa") or "").strip()
    corpo = (
        '<section class="doc-group"><div class="doc-group-head">'
        '<h2><span class="doc-num">1</span>La tua frase</h2>'
        '<div class="sub">Il messaggio che ti presenta in una riga sola.</div></div>'
        f'<div class="ps-frase">{esc(doc.get("frase") or "—")}</div></section>'
        '<section class="doc-group"><div class="doc-group-head">'
        '<h2><span class="doc-num">2</span>Gli elementi del tuo posizionamento</h2>'
        '<div class="sub">I pezzi con cui è costruita la frase.</div></div>'
        f'{righe}</section>'
    )
    if promessa:
        corpo += (
            '<section class="doc-group"><div class="doc-group-head">'
            '<h2><span class="doc-num">3</span>La tua promessa</h2>'
            '<div class="sub">Quello che dici a chi ti sceglie.</div></div>'
            f'<div class="doc-qa"><div class="ans ps-promessa">{esc(promessa)}</div></div></section>'
        )
    return documento(
        f"Il posizionamento di {esc(nome)}",
        cover(
            kicker="Ciak Start · Il tuo posizionamento",
            titolo="Il tuo posizionamento",
            sottotitolo="Chi sei, per chi lavori e cosa ti rende diverso, messo in parole semplici: "
                        "da qui parte tutto quello che comunichi.",
            meta=f"Preparato per <strong>{esc(nome)}</strong>",
        )
        + f'<main class="doc-body">{corpo}</main>'
        + foot(nome),
        _CSS,
    )


async def _render(db, client_id: str, tipo: str, nome: str, doc: dict[str, Any]) -> bytes:
    if tipo == "brand_kit":
        step = await db.partner_journey_steps.find_one(
            {"partner_id": client_id, "step_id": "03-brand-kit"}, {"_id": 0, "data": 1}
        )
        return await genera_brand_kit_pdf((step or {}).get("data") or {}, nome, start=True)
    return await render_pdf(render_posizionamento_html(doc, nome), f"Il tuo posizionamento · {nome}")


async def registra_pdf_start(db, client_id: str, tipo: str) -> bool:
    """Genera il PDF del materiale APPROVATO e lo registra nell'archivio del cliente.

    Ritorna True se il file e' stato registrato. Non solleva mai.
    """
    meta = DOCUMENTI.get(tipo)
    if not meta:
        return False
    categoria, step_id, titolo = meta
    try:
        doc = await db.ciak_start_deliverables.find_one(
            {"partner_id": client_id, "type": tipo, "approval_status": "approved"}, {"_id": 0}
        )
        if not doc:
            return False
        client = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0, "name": 1, "email": 1}) or {}
        nome = client.get("name") or client.get("email") or "Cliente"

        pdf = await _render(db, client_id, tipo, nome, doc)
        filename = f"start_{categoria}_{client_id}_{uuid.uuid4().hex[:8]}.pdf"
        upload = await upload_brand_kit_pdf(pdf, client_id, filename)
        if upload.get("storage") != "cloudinary":
            # Un file su disco locale sparisce al prossimo riavvio del servizio:
            # meglio nessuna riga che una riga che scarica un 404.
            logger.warning("[START_PDF] storage non persistente per %s/%s: PDF non registrato", client_id, tipo)
            return False

        now = datetime.now(timezone.utc).isoformat()
        await db.files.update_many(
            {"partner_id": client_id, "category": categoria, "source": "ciak_start", "superseded": {"$ne": True}},
            {"$set": {"superseded": True}},
        )
        await db.files.insert_one({
            "file_id": uuid.uuid4().hex,
            "partner_id": client_id,
            "category": categoria,
            "file_type": "document",
            "content_type": "application/pdf",
            "original_name": f"{titolo} - {nome}.pdf",
            "stored_name": filename,
            "internal_url": upload["url"],
            "public_id": upload.get("public_id", ""),
            "status": "approved",
            "approval_status": "approved",
            "step_ref": step_id,
            "step_id": step_id,
            "source": "ciak_start",
            "superseded": False,
            "uploaded_at": now,
            "size": len(pdf),
            "size_readable": f"{max(1, len(pdf) // 1024)} KB",
        })
        return True
    except Exception as exc:  # noqa: BLE001 - un PDF mancato non deve bloccare l'approvazione
        logger.exception("[START_PDF] PDF %s non creato per %s: %s", tipo, client_id, exc)
        return False
