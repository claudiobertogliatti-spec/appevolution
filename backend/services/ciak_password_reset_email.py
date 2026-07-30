"""
Ciak — Email "Password dimenticata" (reset self-service area partner).

Invia via SMTP (smtp.register.it, sender info@evolution-pro.it) il magic link
che porta su /partner/setup-password?token=..., dove l'utente sceglie una nuova
password. Nessuna password viene mai generata, trasmessa o salvata in chiaro.

Pattern SMTP identico a services/ciak_checkpoint_email.py e
services/ciak_partnership_email.py: _smtp_config() da env → send_*_sync() che
ritorna (ok, error). Chi chiama fa asyncio.to_thread + audit con l'esito REALE.

Regola in LOCK (17/5/2026): l'accesso si consegna con un magic link che fa
impostare la password, mai con credenziali via email.

Contenuto pensato per target poco digitalizzato: una sola azione in alto,
URL in chiaro come fallback se il bottone non è cliccabile, scadenza esplicita.
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORT_EMAIL = "assistenza@evolution-pro.it"


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


SUBJECT = "Reimposta la password del tuo accesso Evolution PRO"


def _body_text(nome: str, reset_url: str, ore_validita: int) -> str:
    saluto = f"Ciao {nome}," if nome else "Ciao,"
    return f"""{saluto}

hai chiesto di reimpostare la password della tua area partner Evolution PRO.

Apri questo link e scegli la nuova password:
{reset_url}

Il link vale {ore_validita} ore e si può usare una volta sola.

Se non hai chiesto tu il cambio, non devi fare niente: la password attuale
resta valida e nessuno può entrare con questo messaggio da solo.

Se il link non funziona scrivici a {SUPPORT_EMAIL}.

A presto,
Claudio

—
Evolution PRO
"""


def _body_html(nome: str, reset_url: str, ore_validita: int) -> str:
    saluto = f"Ciao {nome}," if nome else "Ciao,"
    return f"""<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;
                    font-family:Poppins,Helvetica,Arial,sans-serif;color:#0F172A;">
        <tr><td style="background:#0F172A;padding:24px 28px;">
          <span style="color:#FACC15;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">
            Evolution PRO
          </span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;">Reimposta la tua password</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
            {saluto} hai chiesto di reimpostare la password della tua area partner.
            Premi il bottone e scegli la nuova password.
          </p>
          <p style="margin:0 0 20px;">
            <a href="{reset_url}"
               style="display:inline-block;background:#0F172A;color:#FACC15;text-decoration:none;
                      padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
              Scegli la nuova password
            </a>
          </p>
          <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#64748B;">
            Se il bottone non funziona, copia e incolla questo indirizzo nel browser:<br>
            <span style="color:#0F172A;word-break:break-all;">{reset_url}</span>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748B;">
            Il link vale <strong style="color:#0F172A;">{ore_validita} ore</strong> e si può usare una volta sola.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">
            Se non hai chiesto tu il cambio non devi fare niente: la password attuale resta valida.
            Per qualsiasi problema scrivici a
            <a href="mailto:{SUPPORT_EMAIL}" style="color:#0F172A;">{SUPPORT_EMAIL}</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 28px;font-size:11px;color:#94a3b8;">
          Evolution PRO — questa email è stata inviata perché è stato richiesto un reset password
          per questo indirizzo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_password_reset_email_sync(
    email: str,
    nome: Optional[str],
    reset_url: str,
    ore_validita: int,
) -> tuple[bool, Optional[str]]:
    """Invio SMTP bloccante. Ritorna (ok, error).

    Il chiamante è responsabile di eseguirlo in un thread (asyncio.to_thread)
    e di registrare l'audit con l'esito reale.
    """
    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd or not sender:
        logger.error("[CIAK-PWD-RESET-EMAIL] SMTP non configurato (SMTP_USER/SMTP_PASSWORD mancanti)")
        return False, "SMTP non configurato"

    nome_breve = (nome or "").split()[0] if nome else ""

    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = SUBJECT
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", SUPPORT_EMAIL)
    msg.attach(MIMEText(_body_text(nome_breve, reset_url, ore_validita), "plain", "utf-8"))
    msg.attach(MIMEText(_body_html(nome_breve, reset_url, ore_validita), "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        logger.info("[CIAK-PWD-RESET-EMAIL] sent to %s", email)
        return True, None
    except Exception as e:
        logger.error("[CIAK-PWD-RESET-EMAIL] send failed for %s: %s", email, e)
        return False, str(e)
