"""Outreach 1:1 dei lead di acquisizione.

Email inviata dallo STESSO canale SMTP del transazionale (in produzione = relay
Brevo autenticato → arriva su Microsoft/hotmail dove register.it veniva scartato).
NON usa l'API HTTP di Brevo: riusa le env `SMTP_*` già configurate, nessuna chiave
nuova. Contesto e motivazione: vedi memory ciak_email_deliverability_hotmail.

Il lato relazione (sequenza + community) NON passa da qui: lo fa Systeme via tag
(services/ciak_systeme.ciak_emit_event), chiamato da chi usa questo modulo.
"""
from __future__ import annotations

import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def is_smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def _html_to_text(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html or "", flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def send_lead_email(to: str, subject: str, html_body: str) -> tuple[bool, str | None]:
    """Invia una email 1:1 (HTML + fallback testo) via SMTP. Ritorna (ok, err).

    Fail-closed: senza SMTP_USER/SMTP_PASSWORD ritorna (False, "SMTP non configurato").
    """
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", f"Evolution PRO <{user}>")
    if not user or not pwd:
        return False, "SMTP non configurato"
    if not (to and subject and html_body):
        return False, "Destinatario, oggetto o testo mancante"
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = sender
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(_html_to_text(html_body), "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        return True, None
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[LEAD-OUTREACH] invio a {to} fallito: {e}")
        return False, str(e)[:200]
