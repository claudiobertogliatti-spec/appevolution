"""
Ciak — Email transactional Partnership.

Invia direttamente via SMTP (smtp.register.it, sender info@evolution-pro.it)
le 3 email del percorso post-call → firma → pagamento → documenti:

  1. send_contratto_firmato_email   (al POST /api/proposta/:token/firma-contratto)
     Conferma firma + PDF contratto allegato.

  2. send_partnership_benvenuto_email (al POST /api/proposta/:token/conferma-stripe
                                       o /conferma-bonifico)
     Benvenuto in Partnership + credenziali area partner Ciak.

  3. send_documenti_ricevuti_email   (al POST /api/proposta/:token/upload-documenti)
     Conferma ricezione documenti + cosa aspettarsi dopo.

Voice lock: claudio_voice_style.md (14/5/2026)
Brand lock: ciak_brand_copy_framework.md (12/5/2026)
Pattern parallelo a ciak_checkpoint_email.py (tracking pixel, UTM, audit log).
"""
import logging
import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional

logger = logging.getLogger(__name__)

PARTNER_AREA_URL = "https://www.ciak.io/partner"
TRACKING_BASE_URL = os.environ.get("CIAK_PUBLIC_BASE_URL", "https://www.ciak.io")

# Iniettato da server.py via set_db()
_db = None


def set_db(database) -> None:
    global _db
    _db = database


def _smtp_config() -> tuple[str, int, str, str, str]:
    host = os.environ.get("SMTP_HOST", "smtp.register.it")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get(
        "CIAK_EMAIL_FROM",
        os.environ.get("SMTP_FROM", f"Claudio Bertogliatti <{user}>" if user else "")
    )
    return host, port, user, pwd, sender


# ─── HTML wrapper comune ──────────────────────────────────────────────

def _wrap_html(title: str, body_html: str, cta_label: str, cta_url: str, tracking_token: Optional[str] = None) -> str:
    """Template HTML coerente con email checkpoint Ciak."""
    pixel_html = (
        f'<img src="{TRACKING_BASE_URL}/api/partnership/email-opened/{tracking_token}.gif" '
        f'width="1" height="1" alt="" '
        f'style="display:block;width:1px;height:1px;border:0;outline:none;">'
    ) if tracking_token else ""

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">
      Ciak — Partnership Evolution PRO
    </div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">
      {title}
    </div>
    <div style="font-size:15px;color:#3d4148;">
      {body_html}
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="{cta_url}" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">
        {cta_label}
      </a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio Bertogliatti</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
  <div style="text-align:center;font-size:11px;color:#9ca3af;padding:0 28px 32px;max-width:560px;margin:0 auto;">
    Email automatica del percorso Partnership Evolution PRO. Per assistenza: <a href="mailto:assistenza@evolution-pro.it" style="color:#9ca3af;">assistenza@evolution-pro.it</a>
  </div>
  {pixel_html}
</body>
</html>"""


def _utm_partner_url(campaign: str) -> str:
    return f"{PARTNER_AREA_URL}?utm_source=ciak_email&utm_medium=email&utm_campaign={campaign}"


# ─── 1. CONTRATTO FIRMATO ─────────────────────────────────────────────

def _build_contratto_firmato_email(nome: str, tracking_token: str) -> tuple[str, str, str]:
    """Ritorna (subject, body_text, body_html)."""
    nome_safe = (nome or "").strip() or "Ciao"
    subject = f"{nome_safe}, contratto firmato. In allegato la tua copia."
    body_text = f"""Ciao {nome_safe},

abbiamo registrato la firma del contratto Partnership Evolution PRO.

In allegato trovi il PDF firmato — conservalo. Vale come copia legale.

Il prossimo passaggio è il pagamento, che puoi completare dalla stessa
pagina della proposta. Una volta confermato il pagamento ricevi:

- accesso alla tua area partner su ciak.io/partner
- le credenziali via email separata
- il calendario operativo dei primi 7 giorni con Valentina

A presto,
Claudio Bertogliatti

—
Ciak. Una direzione strategica per la tua competenza professionale.
"""
    body_html = _wrap_html(
        title=f"Contratto firmato.",
        body_html=(
            f"<p style='margin:0 0 16px;'>Ciao {nome_safe},</p>"
            f"<p style='margin:0 0 16px;'>abbiamo registrato la firma del contratto <strong>Partnership Evolution PRO</strong>.</p>"
            f"<p style='margin:0 0 16px;'>In allegato trovi il PDF firmato — conservalo. Vale come copia legale.</p>"
            f"<p style='margin:0 0 16px;'>Il prossimo passaggio è il pagamento, che puoi completare dalla stessa pagina della proposta. Una volta confermato il pagamento ricevi:</p>"
            f"<ul style='margin:0 0 16px 20px;padding:0;'>"
            f"<li style='margin-bottom:6px;'>accesso alla tua area partner su <strong>ciak.io/partner</strong></li>"
            f"<li style='margin-bottom:6px;'>le credenziali via email separata</li>"
            f"<li style='margin-bottom:6px;'>il calendario operativo dei primi 7 giorni con Valentina</li>"
            f"</ul>"
        ),
        cta_label="Torna alla pagina della proposta",
        cta_url=_utm_partner_url("partnership_contratto_firmato"),
        tracking_token=tracking_token,
    )
    return subject, body_text, body_html


def send_contratto_firmato_sync(
    email: str,
    nome: Optional[str],
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: str = "Contratto_Partnership_Ciak.pdf",
    tracking_token: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    if not email or "@" not in email:
        return False, "email mancante/non valida"
    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd:
        return False, "SMTP non configurato"

    token = tracking_token or uuid.uuid4().hex
    subject, body_text, body_html = _build_contratto_firmato_email(nome or "", token)

    msg = MIMEMultipart("mixed")
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = subject
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "assistenza@evolution-pro.it")

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body_text, "plain", "utf-8"))
    alt.attach(MIMEText(body_html, "html", "utf-8"))
    msg.attach(alt)

    if pdf_bytes:
        att = MIMEApplication(pdf_bytes, _subtype="pdf")
        att.add_header("Content-Disposition", "attachment", filename=pdf_filename)
        msg.attach(att)

    try:
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        logger.info("[CIAK-PARTNERSHIP-EMAIL] contratto_firmato sent to %s", email)
        return True, None
    except Exception as e:
        logger.error("[CIAK-PARTNERSHIP-EMAIL] contratto_firmato send failed for %s: %s", email, e)
        return False, str(e)


# ─── 2. BENVENUTO PARTNERSHIP (post-pagamento) ────────────────────────

def _build_benvenuto_email(nome: str, partner_email: str, password: Optional[str], tracking_token: str) -> tuple[str, str, str]:
    nome_safe = (nome or "").strip() or "Ciao"
    subject = f"{nome_safe}, benvenuto in Partnership Evolution PRO."

    if password:
        creds_text = f"""
Le tue credenziali per l'area partner ciak.io/partner:

  Email:    {partner_email}
  Password: {password}

Al primo accesso ti chiederemo di cambiare la password.
"""
        creds_html = (
            f"<div style='background:#fef9e7;border:1px solid #ffd24d;border-radius:8px;padding:16px;margin:16px 0;'>"
            f"<p style='margin:0 0 8px;font-weight:600;color:#92400e;'>Le tue credenziali area partner</p>"
            f"<p style='margin:0 0 4px;font-family:Menlo,Consolas,monospace;font-size:14px;'><strong>Email:</strong> {partner_email}</p>"
            f"<p style='margin:0 0 4px;font-family:Menlo,Consolas,monospace;font-size:14px;'><strong>Password:</strong> {password}</p>"
            f"<p style='margin:8px 0 0;font-size:12px;color:#92400e;'>Al primo accesso ti chiederemo di cambiare la password.</p>"
            f"</div>"
        )
    else:
        creds_text = """
Riceverai le credenziali per l'area partner ciak.io/partner via email separata
da Valentina entro 24 ore.
"""
        creds_html = (
            f"<p style='margin:0 0 16px;'>Riceverai le credenziali per l'area partner via email separata da Valentina entro 24 ore.</p>"
        )

    body_text = f"""Ciao {nome_safe},

pagamento ricevuto. Sei ufficialmente Partner Evolution PRO.

Cosa succede adesso:

1. Valentina ti contatta nelle prossime 24 ore per la chiamata operativa
   di onboarding (40 minuti).
2. Andrea ti scrive per organizzare la prima sessione di registrazione
   dei contenuti (Posizionamento → Masterclass → Videocorso).
3. Marco entra in cabina di regia per l'accountability settimanale.
{creds_text}
Il percorso operativo è strutturato in 7 fasi. Le prime 3 (Posizionamento,
Masterclass, Videocorso) le chiudiamo nei primi 30-45 giorni. Dalla 4a
(Funnel) iniziano i lanci.

→ Area partner: {PARTNER_AREA_URL}

A presto,
Claudio Bertogliatti

—
Ciak. Una direzione strategica per la tua competenza professionale.
"""
    body_html = _wrap_html(
        title="Benvenuto in Partnership.",
        body_html=(
            f"<p style='margin:0 0 16px;'>Ciao {nome_safe},</p>"
            f"<p style='margin:0 0 16px;'>pagamento ricevuto. Sei ufficialmente <strong>Partner Evolution PRO</strong>.</p>"
            f"<p style='margin:0 0 16px;font-weight:600;'>Cosa succede adesso:</p>"
            f"<ol style='margin:0 0 16px 20px;padding:0;'>"
            f"<li style='margin-bottom:8px;'>Valentina ti contatta nelle prossime 24 ore per la chiamata operativa di onboarding (40 minuti).</li>"
            f"<li style='margin-bottom:8px;'>Andrea ti scrive per organizzare la prima sessione di registrazione dei contenuti (Posizionamento → Masterclass → Videocorso).</li>"
            f"<li style='margin-bottom:8px;'>Marco entra in cabina di regia per l'accountability settimanale.</li>"
            f"</ol>"
            f"{creds_html}"
            f"<p style='margin:0 0 16px;'>Il percorso operativo è strutturato in <strong>7 fasi</strong>. Le prime 3 (Posizionamento, Masterclass, Videocorso) le chiudiamo nei primi 30-45 giorni. Dalla 4a (Funnel) iniziano i lanci.</p>"
        ),
        cta_label="Accedi all'area partner →",
        cta_url=_utm_partner_url("partnership_benvenuto"),
        tracking_token=tracking_token,
    )
    return subject, body_text, body_html


def send_partnership_benvenuto_sync(
    email: str,
    nome: Optional[str],
    password: Optional[str] = None,
    tracking_token: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    if not email or "@" not in email:
        return False, "email mancante/non valida"
    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd:
        return False, "SMTP non configurato"

    token = tracking_token or uuid.uuid4().hex
    subject, body_text, body_html = _build_benvenuto_email(nome or "", email, password, token)

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
        logger.info("[CIAK-PARTNERSHIP-EMAIL] benvenuto sent to %s (password=%s)", email, "YES" if password else "NO")
        return True, None
    except Exception as e:
        logger.error("[CIAK-PARTNERSHIP-EMAIL] benvenuto send failed for %s: %s", email, e)
        return False, str(e)


# ─── 3. DOCUMENTI RICEVUTI ────────────────────────────────────────────

def _build_documenti_email(nome: str, tracking_token: str) -> tuple[str, str, str]:
    nome_safe = (nome or "").strip() or "Ciao"
    subject = f"{nome_safe}, documenti ricevuti. Si parte."
    body_text = f"""Ciao {nome_safe},

documenti ricevuti — sei a posto sulla parte amministrativa.

Da qui in poi è esecuzione. Il calendario dei prossimi 7 giorni:

- Entro 24h: Valentina ti scrive per fissare la chiamata operativa di
  onboarding (40 minuti, agenda condivisa prima).
- Giorni 2-4: prima sessione di Posizionamento (online con me + Andrea).
- Giorno 5-7: primo template Masterclass scritto e revisionato.

L'area partner ciak.io/partner ti permette di seguire ogni passaggio in
tempo reale: stato dei documenti, video caricati, prossime scadenze,
feedback del team.

A presto,
Claudio Bertogliatti

—
Ciak. Una direzione strategica per la tua competenza professionale.
"""
    body_html = _wrap_html(
        title="Documenti ricevuti. Si parte.",
        body_html=(
            f"<p style='margin:0 0 16px;'>Ciao {nome_safe},</p>"
            f"<p style='margin:0 0 16px;'>documenti ricevuti — sei a posto sulla parte amministrativa.</p>"
            f"<p style='margin:0 0 16px;'>Da qui in poi è esecuzione. Il calendario dei prossimi 7 giorni:</p>"
            f"<ul style='margin:0 0 16px 20px;padding:0;'>"
            f"<li style='margin-bottom:8px;'><strong>Entro 24h:</strong> Valentina ti scrive per fissare la chiamata operativa di onboarding (40 minuti, agenda condivisa prima).</li>"
            f"<li style='margin-bottom:8px;'><strong>Giorni 2-4:</strong> prima sessione di Posizionamento (online con me + Andrea).</li>"
            f"<li style='margin-bottom:8px;'><strong>Giorno 5-7:</strong> primo template Masterclass scritto e revisionato.</li>"
            f"</ul>"
            f"<p style='margin:0 0 16px;'>L'area partner ti permette di seguire ogni passaggio in tempo reale: stato documenti, video caricati, prossime scadenze, feedback del team.</p>"
        ),
        cta_label="Accedi all'area partner →",
        cta_url=_utm_partner_url("partnership_documenti"),
        tracking_token=tracking_token,
    )
    return subject, body_text, body_html


def send_documenti_ricevuti_sync(
    email: str,
    nome: Optional[str],
    tracking_token: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    if not email or "@" not in email:
        return False, "email mancante/non valida"
    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd:
        return False, "SMTP non configurato"

    token = tracking_token or uuid.uuid4().hex
    subject, body_text, body_html = _build_documenti_email(nome or "", token)

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
        logger.info("[CIAK-PARTNERSHIP-EMAIL] documenti_ricevuti sent to %s", email)
        return True, None
    except Exception as e:
        logger.error("[CIAK-PARTNERSHIP-EMAIL] documenti_ricevuti send failed for %s: %s", email, e)
        return False, str(e)


# ─── Async wrappers (fire-and-forget) ─────────────────────────────────

async def send_contratto_firmato_async(
    email: str,
    nome: Optional[str],
    pdf_bytes: Optional[bytes] = None,
) -> None:
    """Wrapper async: invio + audit log + tag Systeme."""
    import asyncio
    from datetime import datetime, timezone
    token = uuid.uuid4().hex
    try:
        ok, err = await asyncio.to_thread(
            send_contratto_firmato_sync, email, nome, pdf_bytes, "Contratto_Partnership_Ciak.pdf", token
        )
    except Exception as e:
        ok, err = False, str(e)

    if _db is not None:
        try:
            await _db.ciak_partnership_emails.insert_one({
                "email": email, "nome": nome,
                "kind": "contratto_firmato",
                "sent": ok, "error": err,
                "tracking_token": token, "opened_at": None,
                "at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning("[CIAK-PARTNERSHIP-EMAIL] audit log failed: %s", e)

    if ok:
        try:
            from services.ciak_systeme import ciak_emit_event
            asyncio.create_task(ciak_emit_event(
                email=email,
                event_name="ciak_partnership_contratto_firmato_email_sent",
                extra_tags=["ciak_partnership_email_sent"],
                first_name=nome,
                metadata={"kind": "contratto_firmato", "tracking_token": token},
            ))
        except Exception as e:
            logger.warning("[CIAK-PARTNERSHIP-EMAIL] systeme tag failed: %s", e)


async def send_partnership_benvenuto_async(
    email: str,
    nome: Optional[str],
    password: Optional[str] = None,
) -> None:
    import asyncio
    from datetime import datetime, timezone
    token = uuid.uuid4().hex
    try:
        ok, err = await asyncio.to_thread(
            send_partnership_benvenuto_sync, email, nome, password, token
        )
    except Exception as e:
        ok, err = False, str(e)

    if _db is not None:
        try:
            await _db.ciak_partnership_emails.insert_one({
                "email": email, "nome": nome,
                "kind": "benvenuto",
                "password_inviata": bool(password),
                "sent": ok, "error": err,
                "tracking_token": token, "opened_at": None,
                "at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning("[CIAK-PARTNERSHIP-EMAIL] audit log failed: %s", e)

    if ok:
        try:
            from services.ciak_systeme import ciak_emit_event
            asyncio.create_task(ciak_emit_event(
                email=email,
                event_name="ciak_partnership_benvenuto_email_sent",
                extra_tags=["ciak_partnership_email_sent", "ciak_partner_attivo"],
                first_name=nome,
                metadata={"kind": "benvenuto", "tracking_token": token},
            ))
        except Exception as e:
            logger.warning("[CIAK-PARTNERSHIP-EMAIL] systeme tag failed: %s", e)


async def send_documenti_ricevuti_async(
    email: str,
    nome: Optional[str],
) -> None:
    import asyncio
    from datetime import datetime, timezone
    token = uuid.uuid4().hex
    try:
        ok, err = await asyncio.to_thread(
            send_documenti_ricevuti_sync, email, nome, token
        )
    except Exception as e:
        ok, err = False, str(e)

    if _db is not None:
        try:
            await _db.ciak_partnership_emails.insert_one({
                "email": email, "nome": nome,
                "kind": "documenti_ricevuti",
                "sent": ok, "error": err,
                "tracking_token": token, "opened_at": None,
                "at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning("[CIAK-PARTNERSHIP-EMAIL] audit log failed: %s", e)

    if ok:
        try:
            from services.ciak_systeme import ciak_emit_event
            asyncio.create_task(ciak_emit_event(
                email=email,
                event_name="ciak_partnership_documenti_email_sent",
                extra_tags=["ciak_partnership_email_sent"],
                first_name=nome,
                metadata={"kind": "documenti_ricevuti", "tracking_token": token},
            ))
        except Exception as e:
            logger.warning("[CIAK-PARTNERSHIP-EMAIL] systeme tag failed: %s", e)


# ─── Tracking pixel open ──────────────────────────────────────────────

async def register_partnership_email_opened(tracking_token: str) -> Optional[dict]:
    """Endpoint pixel: registra opened_at + emette tag Systeme."""
    import asyncio
    from datetime import datetime, timezone
    if _db is None or not tracking_token:
        return None
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        result = await _db.ciak_partnership_emails.find_one_and_update(
            {"tracking_token": tracking_token, "opened_at": None},
            {"$set": {"opened_at": now_iso}},
            return_document=False,
        )
        if result is None:
            return await _db.ciak_partnership_emails.find_one({"tracking_token": tracking_token})

        email = result.get("email")
        kind = result.get("kind", "unknown")
        nome = result.get("nome")
        if email:
            try:
                from services.ciak_systeme import ciak_emit_event
                asyncio.create_task(ciak_emit_event(
                    email=email,
                    event_name=f"ciak_partnership_{kind}_email_opened",
                    extra_tags=["ciak_partnership_email_opened"],
                    first_name=nome,
                    metadata={"kind": kind, "tracking_token": tracking_token, "opened_at": now_iso},
                ))
            except Exception as e:
                logger.warning("[CIAK-PARTNERSHIP-EMAIL] systeme tag opened failed: %s", e)

        logger.info("[CIAK-PARTNERSHIP-EMAIL] opened token=%s kind=%s email=%s",
                    tracking_token[:8], kind, email)
        return result
    except Exception as e:
        logger.warning("[CIAK-PARTNERSHIP-EMAIL] register_opened failed: %s", e)
        return None
