"""
Ciak — Email di SOLLECITO motivazionale del percorso operativo (deadline 21 giorni).

Modulo separato da ciak_partnership_email.py (di cui riusa gli helper: SMTP,
wrapper HTML, audit log) per non appesantire quel file. Le email vengono
registrate con data nella stessa collezione `ciak_partnership_emails`.

Tono: motivante, MAI accusatorio. L'obiettivo non è "rimproverare" il ritardo
ma rimettere il partner sul focus corretto = la prossima singola azione che
sblocca il resto. Voce Claudio (frasi brevi, concrete, supportive).

Ogni soglia (G7/G14/G18) parte una volta sola ed è registrata con data
(valore probatorio: dimostra che Evolution ha accompagnato il partner verso
il lancio nei 21 giorni previsti).
"""
import logging
import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from services.ciak_partnership_email import (
    PARTNER_AREA_URL,
    _wrap_html,
    _utm_partner_url,
    _smtp_config,
    _audit_pre_insert,
    _audit_post_update,
)

logger = logging.getLogger(__name__)

_SOLLECITO_VARIANTI = {
    7: {
        "subject": "{nome}, partiamo dal posizionamento: è il passo che sblocca tutto",
        "title": "Il primo mattone è il posizionamento.",
        "lead": (
            "sei al <strong>giorno {giorno}</strong> del percorso. Il posizionamento è "
            "il primo tassello e apre la strada a tutto il resto: senza quello, masterclass "
            "e funnel restano in attesa. È normale che sia il passaggio che costa di più — "
            "proprio per questo è quello che, una volta chiuso, ti fa volare."
        ),
        "spinta": (
            "Bastano pochi minuti concentrati per togliere il blocco più grande. "
            "Appena lo chiudi, il resto scorre da solo."
        ),
    },
    14: {
        "subject": "{nome}, sei a metà strada verso il lancio: teniamo il ritmo",
        "title": "Sei a metà strada. Adesso si tiene il ritmo.",
        "lead": (
            "giorno <strong>{giorno}</strong>: sei esattamente a metà del percorso e la "
            "parte più impegnativa è già dietro di te. Mancano <strong>{giorni_rimanenti} "
            "giorni</strong> al lancio e sei in piena corsa."
        ),
        "spinta": (
            "Il prossimo passo è a portata di mano. Una sessione di lavoro mirata e sei "
            "in dirittura d'arrivo."
        ),
    },
    18: {
        "subject": "{nome}, ci siamo: il lancio è dietro l'angolo",
        "title": "Ci siamo. Il lancio è a portata.",
        "lead": (
            "giorno <strong>{giorno}</strong>: il traguardo dei 21 giorni è vicinissimo. "
            "Hai costruito quasi tutto — manca davvero l'ultimo pezzo."
        ),
        "spinta": (
            "È il momento di spingere. Chiudiamo insieme l'ultimo passaggio e vai online "
            "come da piano."
        ),
    },
}


def _build_sollecito_email(nome, soglia, giorno, giorni_rimanenti, prossima_azione, tracking_token):
    """Ritorna (subject, body_text, body_html) per il sollecito di una soglia."""
    nome_safe = (nome or "").strip() or "Ciao"
    v = _SOLLECITO_VARIANTI.get(soglia, _SOLLECITO_VARIANTI[7])
    fmt = {"giorno": giorno, "giorni_rimanenti": giorni_rimanenti}

    subject = v["subject"].format(nome=nome_safe)
    title = v["title"]
    lead_html = v["lead"].format(**fmt)
    lead_text = lead_html.replace("<strong>", "").replace("</strong>", "")
    spinta = v["spinta"]
    azione = (prossima_azione or "").strip() or "il prossimo passo del percorso"

    body_text = f"""Ciao {nome_safe},

{lead_text}

Il tuo prossimo passo: {azione}.

{spinta}

Se ti sei bloccato su qualcosa, rispondi a questa email: ci pensiamo insieme.
Siamo qui per portarti al lancio, non per lasciarti solo.

→ Riprendi da dove eri: {PARTNER_AREA_URL}

A presto,
Claudio Bertogliatti

—
Ciak. Una direzione strategica per la tua competenza professionale.
"""
    body_html = _wrap_html(
        title=title,
        body_html=(
            f"<p style='margin:0 0 16px;'>Ciao {nome_safe},</p>"
            f"<p style='margin:0 0 16px;'>{lead_html}</p>"
            f"<div style='background:#fef9e7;border:1px solid #ffd24d;border-radius:8px;padding:16px;margin:16px 0;'>"
            f"<p style='margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;'>Il tuo prossimo passo</p>"
            f"<p style='margin:0;font-size:16px;font-weight:600;color:#1a1f24;'>{azione}</p>"
            f"</div>"
            f"<p style='margin:0 0 16px;'>{spinta}</p>"
            f"<p style='margin:0 0 16px;color:#3d4148;'>Se ti sei bloccato su qualcosa, rispondi a questa email: ci pensiamo insieme. Siamo qui per portarti al lancio, non per lasciarti solo.</p>"
        ),
        cta_label="Riprendi da dove eri →",
        cta_url=_utm_partner_url(f"partnership_sollecito_g{soglia}"),
        tracking_token=tracking_token,
    )
    return subject, body_text, body_html


def send_sollecito_sync(email, nome, soglia, giorno, giorni_rimanenti, prossima_azione, tracking_token=None):
    if not email or "@" not in email:
        return False, "email mancante/non valida"
    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd:
        return False, "SMTP non configurato"

    token = tracking_token or uuid.uuid4().hex
    subject, body_text, body_html = _build_sollecito_email(
        nome or "", soglia, giorno, giorni_rimanenti, prossima_azione, token
    )

    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = subject
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "assistenza@evolution-pro.it")
    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        logger.info("[CIAK-SOLLECITO] sollecito_g%s sent to %s (giorno=%s)", soglia, email, giorno)
        return True, None
    except Exception as e:
        logger.error("[CIAK-SOLLECITO] sollecito_g%s send failed for %s: %s", soglia, email, e)
        return False, str(e)


async def send_sollecito_async(email, nome, partner_id, soglia, giorno, giorni_rimanenti, prossima_azione):
    """Audit pre-insert (partner_id + soglia + giorno) → SMTP → update audit. Ritorna True se inviata."""
    import asyncio
    token = uuid.uuid4().hex

    audit_id = await _audit_pre_insert(
        f"sollecito_g{soglia}", email, nome, token,
        extra={
            "partner_id": partner_id,
            "soglia": soglia,
            "giorno": giorno,
            "giorni_rimanenti": giorni_rimanenti,
            "prossima_azione": prossima_azione,
        },
    )

    try:
        ok, err = await asyncio.to_thread(
            send_sollecito_sync, email, nome, soglia, giorno, giorni_rimanenti, prossima_azione, token
        )
    except Exception as e:
        ok, err = False, str(e)

    await _audit_post_update(audit_id, ok, err)

    if ok:
        try:
            from services.ciak_systeme import ciak_emit_event
            asyncio.create_task(ciak_emit_event(
                email=email,
                event_name=f"ciak_partnership_sollecito_g{soglia}_email_sent",
                extra_tags=["ciak_partnership_email_sent", "ciak_partnership_sollecito_sent"],
                first_name=nome,
                metadata={"kind": f"sollecito_g{soglia}", "giorno": giorno, "tracking_token": token},
            ))
        except Exception as e:
            logger.warning("[CIAK-SOLLECITO] systeme tag failed: %s", e)

    return ok
