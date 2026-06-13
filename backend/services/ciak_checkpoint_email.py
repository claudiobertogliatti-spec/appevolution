"""
Ciak — Email Checkpoint Strategico.

Invia direttamente via SMTP (smtp.register.it, sender info@evolution-pro.it)
l'email post-Checkpoint al lead, una per ogni Stato (1-4).

Sostituisce il workflow Systeme.io: l'email parte immediatamente dal backend
al submit del Checkpoint, in parallelo al tag Systeme (che resta per
audit/segmentazione).

Voice lock: claudio_voice_style.md (14/5/2026)
Brand lock: ciak_brand_copy_framework.md (12/5/2026)
Riferimento testi originali: docs/marketing/email-checkpoint-templates.md
"""
import logging
import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

BLUEPRINT_URL_BASE = "https://www.ciak.io/ciak-blueprint"
TRACKING_BASE_URL = os.environ.get("CIAK_PUBLIC_BASE_URL", "https://www.ciak.io")


def _utm_blueprint_url(stato: int) -> str:
    """CTA Blueprint con UTM: tracciamo click via GA/Stripe come provenienti
    dall'email post-Checkpoint, per stato."""
    return (
        f"{BLUEPRINT_URL_BASE}"
        f"?utm_source=ciak_email"
        f"&utm_medium=email"
        f"&utm_campaign=checkpoint_email"
        f"&utm_content=stato_{stato}"
    )


def _tracking_pixel_url(token: str) -> str:
    """URL del pixel 1x1: caricato dal client email all'apertura → endpoint
    backend applica tag ciak_checkpoint_email_opened_stato_<n> su Systeme."""
    return f"{TRACKING_BASE_URL}/api/checkpoint/email-opened/{token}.gif"

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


# ─── Testi per stato ──────────────────────────────────────────────────

STATO_LABELS = {
    1: "Stato 1 — Definizione",
    2: "Stato 2 — Strutturazione",
    3: "Stato 3 — Validazione",
    4: "Stato 4 — Evoluzione Strategica",
}

SUBJECTS = {
    1: "{nome}, ho letto il tuo Checkpoint. Sei allo Stato 1.",
    2: "{nome}, sei allo Stato 2. Ecco cosa significa.",
    3: "{nome}, sei allo Stato 3. Il problema è diverso da quello che pensi.",
    4: "{nome}, sei allo Stato 4. Adesso la domanda cambia.",
}

# Testo "plain": fallback per client che non renderizzano HTML.
BODY_TEXT = {
    1: """Ciao {nome},

hai appena chiuso il Checkpoint Strategico. Grazie per il tempo — non è banale fermarsi 5 minuti a guardare dove sei davvero.

Le tue risposte ti collocano in Stato 1 — Definizione.

Significa che sei in una fase di valutazione iniziale. La competenza c'è (altrimenti non saresti qui), ma il modello digitale intorno alla competenza non è ancora definito.

E attenzione: questo non è un giudizio. È il punto di partenza più onesto. Saltarlo significa costruire su sabbia.

Quello che NON funziona nello Stato 1 è iniziare a "fare cose": aprire un profilo Instagram, registrare un video, comprare un funnel. Sembra produttivo ma non lo è — perché non hai ancora deciso quale offerta vuoi costruire, per chi, e a quale prezzo.

Quello che FUNZIONA è fermarsi un attimo prima e definire la direzione.

Il passo coerente con lo Stato 1 è l'Analisi Strategica (67€, rimborsabili): 60 minuti 1-a-1 con me in cui ricevi la roadmap esatta per trasformare la tua competenza in un brand — costruendo la tua Accademia Digitale e mettendo in vendita i tuoi videocorsi. Non un template: la tua situazione, i tuoi prossimi 90 giorni.

Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai una direzione precisa, ti rimborso integralmente.

Prenota la tua Analisi Strategica: {url}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
""",
    2: """Ciao {nome},

hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in Stato 2 — Strutturazione.

Significa che la tua competenza è reale, hai già clienti che la riconoscono, ma manca una struttura chiara e replicabile per trasformare quella competenza in un modello digitale sostenibile.

E attenzione: lo Stato 2 è la fase in cui si fanno gli errori più costosi.

Si fanno corsi, si comprano funnel, si registrano video, si testano ads. Sembra che si stia "lavorando al business". Ma senza una struttura che tenga insieme tutti questi pezzi, ogni azione disperde energia invece di sommarla.

Il passaggio successivo coerente con lo Stato 2 NON è fare di più. È fissare la struttura PRIMA di accelerare.

L'Analisi Strategica (67€, rimborsabili) serve esattamente a questo: 60 minuti 1-a-1 con me in cui ricevi la roadmap esatta per trasformare la tua competenza in un brand — costruendo la tua Accademia Digitale e mettendo in vendita i tuoi videocorsi, con posizionamento, offerta, funnel e prezzi al posto giusto. Tutto sulla TUA situazione, non su un template.

Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai una direzione precisa, ti rimborso integralmente.

Prenota la tua Analisi Strategica: {url}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
""",
    3: """Ciao {nome},

hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in Stato 3 — Validazione.

Significa che hai già un'offerta digitale attiva, qualche cliente, qualche risultato. Ma percepisci che qualcosa non sta crescendo come dovrebbe.

E attenzione: nello Stato 3 il problema è quasi sempre diverso da quello che sembra.

Sembra un problema di traffico (mi servono più lead). Sembra un problema di copy (devo scrivere meglio). Sembra un problema di prezzo (forse costo troppo).

Nella maggior parte dei casi che vedo, è un collo di bottiglia strutturale nascosto. Un punto preciso del modello in cui l'energia si disperde — e finché non lo identifichi, ogni leva nuova (più ads, più contenuti, più funnel) rende meno di quello che potrebbe.

L'Analisi Strategica (67€, rimborsabili) serve a leggere lucidamente cosa sta funzionando e dove intervenire prima: 60 minuti 1-a-1 con me in cui ricevi la roadmap esatta per trasformare la tua competenza in un brand — rafforzando la tua Accademia Digitale e la vendita dei tuoi videocorsi, focalizzata sul collo di bottiglia che sta limitando la tua crescita.

Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai una direzione precisa, ti rimborso integralmente.

Prenota la tua Analisi Strategica: {url}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
""",
    4: """Ciao {nome},

hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in Stato 4 — Evoluzione Strategica.

Significa che hai già un modello strutturato e genera risultati concreti. Non sei più in cerca di "come iniziare". Sei in cerca di "dove concentrare attenzione e risorse per crescere mantenendo solidità".

E attenzione: nello Stato 4 il rischio non è la velocità. È perdere sostenibilità mentre si cresce.

Più i numeri salgono, più ogni decisione strategica pesa: che leva attivare, che offerta scalare, dove smettere di disperdere. È la fase in cui un confronto strategico esterno vale più di qualsiasi nuovo strumento.

L'Analisi Strategica (67€, rimborsabili) in Stato 4 è un'analisi 1-a-1 profonda — 90 minuti invece dei 60 standard — in cui ricevi la roadmap esatta per scalare il tuo brand attraverso la tua Accademia Digitale e la vendita dei tuoi videocorsi, identificando i 2-3 fuochi di concentrazione strategica per i prossimi 12 mesi. Output: una direzione che ti dice non cosa fare, ma cosa SMETTERE di fare e dove raddoppiare.

Non vendo un percorso. Vendo chiarezza. Se al termine dell'analisi non hai una direzione precisa, ti rimborso integralmente.

Prenota la tua Analisi Strategica: {url}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
""",
}


def _build_html(nome: str, stato: int, tracking_token: Optional[str] = None) -> str:
    """HTML semplice, monospace-safe, leggibile su tutti i client email.

    Args:
        tracking_token: se fornito, incluso pixel 1x1 in fondo per tracciare
                        l'apertura dell'email (registra tag Systeme).
    """
    label = STATO_LABELS[stato]
    cta_url = _utm_blueprint_url(stato)
    body_paragraphs = _html_paragraphs(
        BODY_TEXT[stato].format(nome=nome, url=cta_url), stato
    )
    # Pixel di tracking: caricato dal client email all'apertura. width=1
    # height=1 invisibile. URL termina con .gif per essere recognized come
    # immagine dai client più paranoici.
    pixel_html = (
        f'<img src="{_tracking_pixel_url(tracking_token)}" '
        f'width="1" height="1" alt="" '
        f'style="display:block;width:1px;height:1px;border:0;outline:none;">'
    ) if tracking_token else ""

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>{label}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">
      Checkpoint Strategico — Risultato
    </div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">
      {label}
    </div>
    <div style="font-size:15px;color:#3d4148;">
      {body_paragraphs}
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="{cta_url}" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">
        Prenota la tua Analisi Strategica (67€) →
      </a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio Bertogliatti</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
  <div style="text-align:center;font-size:11px;color:#9ca3af;padding:0 28px 32px;max-width:560px;margin:0 auto;">
    Hai ricevuto questa email perché hai completato il Checkpoint Strategico su ciak.io.
  </div>
  {pixel_html}
</body>
</html>"""


def _html_paragraphs(text: str, stato: int) -> str:
    """Converte plain text in paragrafi HTML, evidenziando 'E attenzione:' e
    label di stato. Salta il saluto iniziale e la firma (già in template HTML)."""
    paragraphs = []
    for raw in text.strip().split("\n\n"):
        line = raw.strip()
        if not line:
            continue
        # Salta saluto, firma e ultima riga "Prenota la tua Analisi Strategica" (è già nel CTA button)
        if line.startswith("Ciao "):
            continue
        if line.startswith("A presto,"):
            break
        if line.startswith("Prenota la tua Analisi Strategica"):
            continue
        # Evidenzia "E attenzione:" + label stato + frasi chiave
        line_html = (line
            .replace("E attenzione:", "<strong>E attenzione:</strong>")
            .replace(f"Stato {stato}", f"<strong>Stato {stato}</strong>")
            .replace("Analisi Strategica", "<strong>Analisi Strategica</strong>")
            .replace("Accademia Digitale", "<strong>Accademia Digitale</strong>")
            .replace("\n", "<br>"))
        paragraphs.append(f'<p style="margin:0 0 16px;">{line_html}</p>')
    return "".join(paragraphs)


# ─── Send ─────────────────────────────────────────────────────────────

def send_checkpoint_email_sync(
    email: str,
    nome: Optional[str],
    stato: int,
    tracking_token: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """Invio SMTP sincrono. Ritorna (ok, error_msg).

    Da chiamare in BackgroundTasks o asyncio.to_thread per non bloccare
    il response del POST /api/checkpoint/result.

    Args:
        tracking_token: se fornito, include pixel tracking nell'HTML email +
                        UTM nel CTA Blueprint con utm_content=stato_<n>.
    """
    if stato not in STATO_LABELS:
        return False, f"stato {stato} non valido (atteso 1-4)"
    if not email or "@" not in email:
        return False, "email mancante/non valida"

    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd:
        return False, "SMTP non configurato (manca SMTP_USER o SMTP_PASSWORD)"

    nome_safe = (nome or "").strip() or "ciao"
    # In Subject "Ciao" non torna bene, fallback su nome generico
    subject_name = nome_safe if nome_safe != "ciao" else "Ciao"

    cta_url = _utm_blueprint_url(stato)
    subject = SUBJECTS[stato].format(nome=subject_name)
    body_text = BODY_TEXT[stato].format(nome=nome_safe, url=cta_url)
    body_html = _build_html(nome_safe, stato, tracking_token=tracking_token)

    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = subject
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "claudio.bertogliatti@gmail.com")
    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        logger.info("[CIAK-CHECKPOINT-EMAIL] sent to %s stato=%d", email, stato)
        return True, None
    except Exception as e:
        logger.error("[CIAK-CHECKPOINT-EMAIL] send failed for %s stato=%d: %s", email, stato, e)
        return False, str(e)


async def send_checkpoint_email_async(
    email: str,
    nome: Optional[str],
    stato: int,
    score: int,
) -> None:
    """Invia l'email Checkpoint via SMTP + audit log + tag Systeme.

    FIX 12/6/2026 (Claudio): in precedenza questo service NON inviava nulla
    (delegava a un workflow Systeme mai configurato) e marcava comunque
    sent=True. Risultato: l'email non partiva da nessuna parte. Ora invia
    direttamente via SMTP tramite send_checkpoint_email_sync (sender + i 4
    testi sono già qui), registra l'esito REALE e applica il tag Systeme
    solo se l'invio è andato a buon fine.

    Pipeline:
      1. Genera tracking_token (pixel apertura nell'HTML)
      2. Invio SMTP reale (in thread, non blocca l'event loop)
      3. Audit su ciak_checkpoint_emails con esito reale (sent + error)
      4. Tag ciak_checkpoint_email_sent_stato_<n> solo se inviata

    Fire-and-forget: non solleva eccezioni al chiamante.
    """
    import asyncio
    from datetime import datetime, timezone

    tracking_token = uuid.uuid4().hex
    now_iso = datetime.now(timezone.utc).isoformat()

    # Invio reale via SMTP. send_checkpoint_email_sync è bloccante (smtplib),
    # quindi lo eseguiamo in un thread per non bloccare l'event loop.
    ok, err = await asyncio.to_thread(
        send_checkpoint_email_sync, email, nome, stato, tracking_token
    )

    # Audit log: una riga per ogni checkpoint completato, con ESITO REALE.
    if _db is not None:
        try:
            await _db.ciak_checkpoint_emails.insert_one({
                "email": email,
                "nome": nome,
                "stato": stato,
                "score": score,
                "sent": ok,
                "sent_via": "smtp",
                "error": err,
                "tracking_token": tracking_token,
                "opened_at": None,
                "at": now_iso,
                "sent_at": now_iso if ok else None,
            })
        except Exception as e:
            logger.warning("[CIAK-CHECKPOINT-EMAIL] audit insert failed: %s", e)

    if not ok:
        logger.error(
            "[CIAK-CHECKPOINT-EMAIL] invio fallito email=%s stato=%d: %s",
            email, stato, err,
        )
        return

    # Tag Systeme "email_sent" come segnale aggiuntivo (audit/segmentazione),
    # applicato solo se l'email è realmente partita.
    try:
        from services.ciak_systeme import ciak_emit_event
        asyncio.create_task(ciak_emit_event(
            email=email,
            event_name=f"ciak_checkpoint_email_sent_stato_{stato}",
            extra_tags=["ciak_checkpoint_email_sent"],
            first_name=nome,
            metadata={
                "stato": stato,
                "score": score,
                "tracking_token": tracking_token,
            },
        ))
    except Exception as e:
        logger.warning("[CIAK-CHECKPOINT-EMAIL] systeme tag email_sent failed: %s", e)


async def register_email_opened(tracking_token: str) -> Optional[dict]:
    """Chiamata dall'endpoint pixel quando il client email carica l'immagine.

    Trova il record in ciak_checkpoint_emails via tracking_token, segna
    opened_at (idempotente: solo prima volta) e applica tag Systeme
    ciak_checkpoint_email_opened_stato_<n>.

    Ritorna il record (o None se token non trovato).
    """
    import asyncio
    from datetime import datetime, timezone
    if _db is None or not tracking_token:
        return None

    try:
        # Idempotente: setta opened_at solo se è ancora None (prima apertura).
        # Pixel può essere caricato N volte (preview client, refresh, ecc).
        now_iso = datetime.now(timezone.utc).isoformat()
        result = await _db.ciak_checkpoint_emails.find_one_and_update(
            {"tracking_token": tracking_token, "opened_at": None},
            {"$set": {"opened_at": now_iso}},
            return_document=False,  # ritorna doc PRE-update (per sapere se era già aperto)
        )
        # Se result è None → token non esiste OPPURE era già aperto. In entrambi i
        # casi: cerchiamo il doc per restituirlo, ma NON applichiamo tag (idempotente).
        if result is None:
            existing = await _db.ciak_checkpoint_emails.find_one(
                {"tracking_token": tracking_token}
            )
            return existing  # può essere None se token sconosciuto

        # Prima apertura: applica tag Systeme.
        stato = result.get("stato")
        email = result.get("email")
        score = result.get("score")
        nome = result.get("nome")
        if email and stato:
            try:
                from services.ciak_systeme import ciak_emit_event
                asyncio.create_task(ciak_emit_event(
                    email=email,
                    event_name=f"ciak_checkpoint_email_opened_stato_{stato}",
                    extra_tags=["ciak_checkpoint_email_opened"],
                    first_name=nome,
                    metadata={
                        "stato": stato,
                        "score": score,
                        "tracking_token": tracking_token,
                        "opened_at": now_iso,
                    },
                ))
            except Exception as e:
                logger.warning("[CIAK-CHECKPOINT-EMAIL] systeme tag email_opened failed: %s", e)

        logger.info("[CIAK-CHECKPOINT-EMAIL] opened token=%s stato=%s email=%s", tracking_token[:8], stato, email)
        return result
    except Exception as e:
        logger.warning("[CIAK-CHECKPOINT-EMAIL] register_email_opened failed: %s", e)
        return None
