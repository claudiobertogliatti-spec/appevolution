"""
Consegna post-acquisto della BOZZA analisi (Plan B).
Orchestratore idempotente: genera (Plan A) → render PDF (estetica Canva) →
upload Cloudinary → email transazionale con allegato. Emesso in background dal webhook €67.
"""
import logging
import os
import smtplib
from datetime import datetime, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from services import ciak_analisi, ciak_pdf

logger = logging.getLogger(__name__)

db = None


def set_db(database) -> None:
    global db
    db = database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _upload_pdf(pdf_bytes: bytes, session_token: str) -> Optional[str]:
    """Upload Cloudinary raw → secure_url (None se Cloudinary non configurato/ko)."""
    try:
        from cloudinary_service import upload_file_direct
        res = await upload_file_direct(
            file_data=pdf_bytes, filename=f"bozza_analisi_{session_token}.pdf",
            resource_type="raw", folder="ciak/analisi/bozze",
        )
        return res.get("secure_url") if res.get("success") else None
    except Exception as e:
        logger.warning("[CIAK_DELIVERY] upload Cloudinary fallito: %s", e)
        return None


def _send_email_attachment(*, to: str, subject: str, body_text: str,
                           pdf_bytes: bytes, pdf_filename: str) -> tuple[bool, Optional[str]]:
    """Email transazionale SMTP con PDF in allegato. Ritorna (ok, err)."""
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", f"Claudio Bertogliatti <{user}>")
    if not user or not pwd:
        return False, "SMTP non configurato"
    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        part = MIMEBase("application", "octet-stream")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{pdf_filename}"')
        msg.attach(part)
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        return True, None
    except Exception as e:
        return False, str(e)


def _email_body(nome: str, link: Optional[str]) -> str:
    primo = (nome or "").split()[0] if nome else "ciao"
    link_line = f"\n\nPuoi anche scaricarla qui:\n{link}\n" if link else "\n"
    return (
        f"Ciao {primo},\n\n"
        "in allegato trovi l'anteprima della tua analisi strategica Ciak Blueprint."
        f"{link_line}\n"
        "È una sintesi: la versione completa — mercato, accademia e roadmap nel dettaglio — "
        "la vediamo insieme nella call strategica.\n\n"
        "A presto,\nClaudio\nEvolution PRO"
    )


async def processa_acquisto(session_token: str, email: str, nome: Optional[str]) -> dict:
    """
    Background post-€67: genera (idempotente) + invia bozza PDF una sola volta.
    Non solleva: logga e ritorna lo stato (non deve mai rompere il webhook).
    """
    if db is None:
        logger.error("[CIAK_DELIVERY] db non configurato")
        return {"sent": False, "error": "no_db"}
    try:
        await ciak_analisi.genera_e_salva(session_token)
    except Exception as e:
        logger.error("[CIAK_DELIVERY] generazione fallita per %s: %s", session_token, e)
        return {"sent": False, "error": f"gen: {e}"}

    doc = await db.ciak_analisi.find_one({"session_token": session_token})
    if not doc:
        return {"sent": False, "error": "analisi non trovata dopo generazione"}
    if doc.get("bozza_inviata_at"):
        return {"sent": False, "skipped": "gia_inviata"}

    bozza = doc.get("bozza") or {}
    dest = email or doc.get("email")
    if not dest:
        return {"sent": False, "error": "email mancante"}

    try:
        pdf_bytes = await ciak_pdf.genera_bozza_pdf(bozza, nome or "")
    except Exception as e:
        logger.error("[CIAK_DELIVERY] render PDF fallito per %s: %s", session_token, e)
        return {"sent": False, "error": f"pdf: {e}"}

    pdf_url = await _upload_pdf(pdf_bytes, session_token)
    ok, err = _send_email_attachment(
        to=dest, subject="La tua analisi Ciak Blueprint — anteprima",
        body_text=_email_body(nome, pdf_url),
        pdf_bytes=pdf_bytes, pdf_filename=f"analisi_ciak_{session_token[:8]}.pdf",
    )
    bozza["pdf_url"] = pdf_url
    update = {"bozza": bozza}
    if ok:
        update["bozza_inviata_at"] = _now_iso()
    else:
        logger.error("[CIAK_DELIVERY] email bozza ko per %s: %s", dest, err)
        update["bozza_errore"] = err
    try:
        await db.ciak_analisi.update_one({"session_token": session_token}, {"$set": update})
    except Exception as e:
        logger.error("[CIAK_DELIVERY] persistenza stato fallita per %s: %s", session_token, e)
        return {"sent": ok, "pdf_url": pdf_url, "error": err, "persist_error": str(e)}
    return {"sent": ok, "pdf_url": pdf_url, "error": err}
