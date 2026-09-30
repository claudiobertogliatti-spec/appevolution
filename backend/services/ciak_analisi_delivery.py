"""
Consegna del Blueprint al cliente dopo la call.

Il PDF consegnato è SEMPRE il Blueprint salvato (template lockato 2 copertine +
14 pagine, vedi services/ciak_blueprint_store.py): lo stesso documento che
l'admin ha scaricato e mostrato in call. Nessun ripiego su altri documenti: se
il Blueprint non è pronto o l'invio fallisce, la consegna fallisce con il motivo
reale e l'admin lo vede — prima partiva in silenzio un "teaser" diverso.

Gira DENTRO la richiesta dell'admin (niente BackgroundTask: su Cloud Run un
lavoro dopo la risposta può restare senza CPU e morire senza lasciare traccia).
"""
import asyncio
import logging
import os
import smtplib
from datetime import datetime, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from services import ciak_analisi, ciak_blueprint_store, ciak_systeme

logger = logging.getLogger(__name__)

db = None

# Tag Systeme applicato quando la mail col Blueprint è partita davvero (stesso
# schema di `ciak_partnership_email_sent`). `ciak_call_done` dice che la call è
# stata confermata, non che la mail sia arrivata: senza questo tag, in Systeme
# non si vede chi ha già ricevuto il Blueprint.
TAG_BLUEPRINT_EMAIL_SENT = "ciak_blueprint_email_sent"


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


def _email_body(nome: str, pdf_url: Optional[str], access_link: Optional[str] = None) -> str:
    primo = (nome or "").split()[0] if nome else "ciao"
    pdf_line = f"\n\nSe preferisci, puoi scaricarlo anche qui:\n{pdf_url}\n" if pdf_url else "\n"
    if access_link:
        accesso = (
            "Per proseguire, entra nella tua area riservata da qui (il link e' "
            f"personale):\n{access_link}\n\n"
            "Da li' scegli come muoverti: Ciak Start oppure la Partnership completa."
        )
    else:
        accesso = (
            "Quando vuoi proseguire, dalla tua area riservata scegli come muoverti: "
            "Ciak Start oppure la Partnership completa."
        )
    return (
        f"Ciao {primo},\n\n"
        "come promesso, in allegato trovi il tuo Blueprint Evolution: l'analisi strategica "
        "di posizionamento che abbiamo visto insieme nella call — profilo, mercato, "
        "pubblico, la tua accademia e la roadmap, sezione per sezione."
        f"{pdf_line}\n"
        f"{accesso}\n\n"
        "A presto,\nClaudio\nEvolution PRO"
    )


def _send_email_link(*, to: str, nome: str, subject: str, link: str) -> tuple[bool, Optional[str]]:
    """Email transazionale SMTP con un link (no allegato). Ritorna (ok, err)."""
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", f"Claudio Bertogliatti <{user}>")
    if not user or not pwd:
        return False, "SMTP non configurato"
    primo = (nome or "").split()[0] if nome else "ciao"
    body = (f"Ciao {primo},\n\nla tua analisi strategica completa è pronta. "
            f"Puoi consultarla qui:\n{link}\n\nA presto,\nClaudio\nEvolution PRO")
    try:
        msg = MIMEMultipart()
        msg["From"] = sender; msg["To"] = to; msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls(); server.login(user, pwd); server.send_message(msg)
        return True, None
    except Exception as e:
        return False, str(e)


def _segnala_a_systeme(session_token: str, email: str, nome: Optional[str],
                       pdf_url: Optional[str], con_link_accesso: bool) -> None:
    """Tag Systeme a invio riuscito. Non blocca e non rompe la consegna: se
    Systeme non risponde l'email è già partita e l'esito è già registrato."""
    ciak_systeme.fire_and_forget(ciak_systeme.ciak_emit_event(
        email=email,
        event_name=TAG_BLUEPRINT_EMAIL_SENT,
        first_name=nome,
        metadata={
            "session_token": session_token,
            "pdf_url": pdf_url,
            "con_link_accesso": con_link_accesso,
        },
    ))


class ConsegnaFallita(Exception):
    """Il Blueprint non è arrivato al cliente: il messaggio è il motivo reale."""


async def _registra_esito(session_token: str, email: str, nome: Optional[str], esito: dict) -> None:
    """Scrive l'esito sia su ciak_blueprints (scheda lead) sia su ciak_analisi,
    dove lo leggono area cliente, controllo consegne mancate e proposta."""
    await db.ciak_blueprints.update_one({"session_token": session_token}, {"$set": esito})
    analisi = {"email": email, "nome": nome}
    if esito.get("consegna_inviata_at"):
        analisi["bozza_inviata_at"] = esito["consegna_inviata_at"]
        analisi["bozza.pdf_url"] = esito.get("pdf_url")
        analisi["deliverable_kind"] = "blueprint"
    if esito.get("consegna_errore"):
        analisi["bozza_errore"] = esito["consegna_errore"]
    await db.ciak_analisi.update_one(
        {"session_token": session_token},
        {"$set": analisi, "$setOnInsert": {"session_token": session_token}},
        upsert=True,
    )


async def consegna_blueprint(
    session_token: str,
    email: str,
    nome: Optional[str],
    access_link: Optional[str] = None,
) -> dict:
    """Invia al cliente il Blueprint salvato, una volta sola.

    Solleva `ciak_blueprint_store.BlueprintNonPronto` se il Blueprint non è stato
    generato, `ConsegnaFallita` se impaginazione o email falliscono. Idempotente:
    se è già stato inviato non rimanda nulla.
    """
    if db is None:
        raise ConsegnaFallita("Database non configurato")
    doc = await ciak_blueprint_store.leggi(db, session_token)
    if doc and doc.get("consegna_inviata_at"):
        return {"sent": False, "skipped": "gia_inviata", "pdf_url": doc.get("pdf_url")}
    if not email:
        raise ConsegnaFallita("Email del cliente mancante")

    pdf_bytes = await ciak_blueprint_store.pdf(db, session_token)  # BlueprintNonPronto se manca

    pdf_url = await _upload_pdf(pdf_bytes, session_token)
    ok, err = await asyncio.to_thread(
        _send_email_attachment,
        to=email, subject="Il tuo Blueprint Evolution",
        body_text=_email_body(nome, pdf_url, access_link),
        pdf_bytes=pdf_bytes, pdf_filename=f"blueprint_evolution_{session_token[:8]}.pdf",
    )
    if not ok:
        logger.error("[CIAK_DELIVERY] email Blueprint ko per %s: %s", email, err)
        await _registra_esito(session_token, email, nome, {"consegna_errore": err, "pdf_url": pdf_url})
        raise ConsegnaFallita(f"Email non inviata: {err}")

    await _registra_esito(session_token, email, nome, {
        "consegna_inviata_at": _now_iso(),
        "consegna_errore": None,
        "pdf_url": pdf_url,
    })
    _segnala_a_systeme(session_token, email, nome, pdf_url, bool(access_link))
    return {"sent": True, "pdf_url": pdf_url}


async def completa_analisi_cliente(session_token: str) -> None:
    """Dopo l'invio: genera l'analisi a 6 capitoli che area cliente e pagina
    Insider leggono ancora da `ciak_analisi`. Non tocca la consegna: se fallisce
    il cliente ha comunque il suo Blueprint; si logga e basta."""
    try:
        ciak_analisi.set_db(db)
        await ciak_analisi.genera_e_salva(session_token)
    except Exception as exc:  # noqa: BLE001
        logger.warning("[CIAK_DELIVERY] analisi area cliente non generata per %s: %s", session_token, exc)
