# Email di onboarding transazionale Ciak — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chi paga (Blueprint €27, Ciak Start €499, o attivazione manuale da Payment Link) riceve dal backend un'email con l'accesso alla piattaforma e i passi da fare, e l'esito di ogni invio è registrato e interrogabile.

**Architecture:** un service nuovo `services/ciak_onboarding_email.py` che replica il pattern già collaudato di `services/ciak_checkpoint_email.py`: invio SMTP diretto (`smtp.register.it`), audit dell'esito **reale** su una collection dedicata, tag Systeme emesso **solo se l'invio è riuscito**. Systeme resta per marketing e segmentazione, non per la consegna dell'accesso. Nessuna credenziale via email: si manda un magic link che porta a scegliere la password.

**Tech Stack:** Python 3.12, FastAPI, Motor (MongoDB async), smtplib + email.mime, pytest (`asyncio_mode = auto`, marker `unit`).

## Perché questo piano esiste

Verificato il 30/7 in produzione e in Systeme: `_deliver_client_access_link` (`routers/checkout.py:93-125`) **non invia nessuna email**, scrive solo un campo e un tag su Systeme, e nell'account Systeme **non esistono** né il campo `client_access_url` né il tag `ciak_client_access_ready` né un workflow che li ascolti. Per Ciak Start non parte nemmeno il link. Nessun cliente è stato danneggiato solo perché `CLIENTI CIAK = 0`.

⚠️ **Lo stesso errore è già stato commesso e corretto una volta**: vedi il docstring di `send_checkpoint_email_async` (`services/ciak_checkpoint_email.py:329-334`), fix del 12/6/2026 — *"in precedenza questo service NON inviava nulla (delegava a un workflow Systeme mai configurato) e marcava comunque sent=True"*. Questo piano applica la stessa correzione al terzo punto del funnel.

Spec di riferimento: `docs/superpowers/specs/2026-07-30-ciak-start-erogazione-design.md` (blocco 1-bis dell'ordine di implementazione).

## Global Constraints

- **Mai credenziali via email.** Solo magic link che porta a impostare la password (LOCK 17/5/2026).
- **Systeme non consegna l'accesso.** Il tag va emesso solo dopo un invio riuscito, come segnale di audit. Non creare, modificare o attivare workflow, tag o campi su Systeme.
- **Sender e SMTP dalle env già in uso**: `SMTP_HOST` (default `smtp.register.it`), `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `CIAK_EMAIL_FROM`, `CIAK_EMAIL_REPLY_TO`. Nessuna credenziale nel codice.
- **Voce di Claudio nei testi**: frasi brevi, richiesta esplicita, nessun trattino lungo (em dash), nessuna formula da AI, nessuna emoji.
- **Target poco digitalizzato**: una sola azione in alto (il pulsante), il resto sotto.
- **Fire-and-forget**: l'invio non deve mai fare fallire un webhook di pagamento. Nessuna eccezione risale al chiamante.
- **Testi in italiano, codice e commit in inglese.**
- **Non promettere deliverable non decisi.** In particolare, per il Blueprint NON menzionare la call 1:1 né le "72 ore": quella promessa è sul checkout ma è in revisione (vedi spec). Attenersi a: accesso attivo, la tua analisi, prossimi passi.

---

## File Structure

| File | Responsabilità |
|---|---|
| `backend/services/ciak_onboarding_email.py` (**create**) | testi per livello, calcolo delle 3 date di consegna, invio SMTP sincrono, wrapper async con audit e tag |
| `backend/tests/test_ciak_onboarding_email.py` (**create**) | unit test del service, SMTP e db finti |
| `backend/server.py` (**modify**, accanto a riga ~17220) | `set_db` del nuovo service |
| `backend/routers/checkout.py` (**modify**, `_deliver_client_access_link` righe 93-125) | trigger Blueprint: invia l'email, poi il tag solo se riuscito |
| `backend/routers/stripe_webhook.py` (**modify**, `process_ciak_start_payment` righe 446-479) | trigger Ciak Start da checkout |
| `backend/routers/ciak_admin.py` (**modify**) | reinvio manuale + report degli invii mancanti |

Collection nuova: **`ciak_onboarding_emails`** (una riga per invio tentato).

---

### Task 1: Service — testi, date di consegna, invio SMTP

**Files:**
- Create: `backend/services/ciak_onboarding_email.py`
- Test: `backend/tests/test_ciak_onboarding_email.py`

**Interfaces:**
- Consumes: niente da task precedenti.
- Produces: `TIERS: tuple[str, ...]`, `delivery_dates(paid_at: str) -> list[str]`, `send_onboarding_email_sync(email: str, nome: str | None, tier: str, access_url: str, paid_at: str | None = None) -> tuple[bool, str | None]`, `set_db(database) -> None`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_onboarding_email.py
import pytest

from services.ciak_onboarding_email import (
    TIERS,
    delivery_dates,
    send_onboarding_email_sync,
)

pytestmark = pytest.mark.unit


class FakeSMTP:
    """Sostituisce smtplib.SMTP: registra il messaggio inviato."""

    sent: list = []

    def __init__(self, host, port, timeout=None):
        self.host = host
        self.port = port

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self):
        return None

    def login(self, user, pwd):
        return None

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)


@pytest.fixture(autouse=True)
def smtp_env(monkeypatch):
    FakeSMTP.sent = []
    monkeypatch.setenv("SMTP_USER", "info@evolution-pro.it")
    monkeypatch.setenv("SMTP_PASSWORD", "x")
    monkeypatch.setattr("services.ciak_onboarding_email.smtplib.SMTP", FakeSMTP)


def test_tiers_are_the_three_paid_entry_points():
    assert TIERS == ("blueprint", "start")


def test_delivery_dates_are_7_14_21_days_after_payment():
    assert delivery_dates("2026-08-03T10:00:00+00:00") == [
        "10/08/2026",
        "17/08/2026",
        "24/08/2026",
    ]


def test_send_blueprint_email_includes_access_url_in_plain_text():
    ok, err = send_onboarding_email_sync(
        email="mario@example.com",
        nome="Mario",
        tier="blueprint",
        access_url="https://www.ciak.io/cliente/accesso?token=abc",
    )
    assert (ok, err) == (True, None)
    msg = FakeSMTP.sent[0]
    assert msg["To"] == "mario@example.com"
    assert "Mario" in msg["Subject"]
    plain = msg.get_payload()[0].get_payload(decode=True).decode("utf-8")
    assert "https://www.ciak.io/cliente/accesso?token=abc" in plain
    assert "password" in plain.lower()


def test_send_start_email_lists_the_three_dated_deliveries():
    ok, err = send_onboarding_email_sync(
        email="mario@example.com",
        nome="Mario",
        tier="start",
        access_url="https://www.ciak.io/cliente/accesso?token=abc",
        paid_at="2026-08-03T10:00:00+00:00",
    )
    assert ok is True
    plain = FakeSMTP.sent[0].get_payload()[0].get_payload(decode=True).decode("utf-8")
    for expected in ("10/08/2026", "17/08/2026", "24/08/2026"):
        assert expected in plain
    assert "499" in plain


def test_no_em_dash_in_any_template():
    for tier in TIERS:
        send_onboarding_email_sync(
            email="mario@example.com",
            nome="Mario",
            tier=tier,
            access_url="https://www.ciak.io/x",
            paid_at="2026-08-03T10:00:00+00:00",
        )
    for msg in FakeSMTP.sent:
        for part in msg.get_payload():
            body = part.get_payload(decode=True).decode("utf-8")
            assert "—" not in body


def test_invalid_tier_is_rejected_without_sending():
    ok, err = send_onboarding_email_sync(
        email="mario@example.com", nome="Mario", tier="partnership", access_url="https://x"
    )
    assert ok is False
    assert "tier" in err
    assert FakeSMTP.sent == []


def test_missing_email_is_rejected_without_sending():
    ok, err = send_onboarding_email_sync(
        email="", nome="Mario", tier="start", access_url="https://x"
    )
    assert ok is False
    assert FakeSMTP.sent == []


def test_missing_smtp_credentials_reported_as_error(monkeypatch):
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)
    ok, err = send_onboarding_email_sync(
        email="mario@example.com", nome="Mario", tier="start", access_url="https://x"
    )
    assert ok is False
    assert "SMTP" in err
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_onboarding_email.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'services.ciak_onboarding_email'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/ciak_onboarding_email.py
"""
Ciak — Email di onboarding transazionale.

Invia via SMTP (smtp.register.it, sender info@evolution-pro.it) l'email di
accesso a chi ha pagato: Blueprint €27 o Ciak Start €499.

Perche' SMTP e non Systeme: verificato il 30/7/2026 che il campo
`client_access_url` e il tag `ciak_client_access_ready` non esistono
nell'account Systeme e nessun workflow li ascolta, quindi il magic link
generato non raggiungeva nessuno. Stesso errore gia' corretto il 12/6 per
le email Checkpoint (vedi services/ciak_checkpoint_email.py).

Nessuna credenziale viene spedita: solo il magic link che porta a scegliere
la password.

Voce: docs/marketing/claudio_voice_style.md (niente em dash, frasi brevi).
Spec: docs/superpowers/specs/2026-07-30-ciak-start-erogazione-design.md
"""
import logging
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

TIERS = ("blueprint", "start")

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
        os.environ.get("SMTP_FROM", f"Claudio Bertogliatti <{user}>" if user else ""),
    )
    return host, port, user, pwd, sender


def delivery_dates(paid_at: Optional[str]) -> list[str]:
    """Le 3 consegne di Ciak Start: 7, 14 e 21 giorni dal pagamento.

    Formato gg/mm/aaaa, quello che legge un italiano. Se paid_at manca o non
    e' parsabile si parte da adesso: meglio date approssimate che nessuna data.
    """
    base = None
    if paid_at:
        try:
            base = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
        except ValueError:
            base = None
    if base is None:
        base = datetime.now(timezone.utc)
    return [(base + timedelta(days=step)).strftime("%d/%m/%Y") for step in (7, 14, 21)]


SUBJECTS = {
    "blueprint": "{nome}, il tuo accesso a Ciak e' attivo",
    "start": "{nome}, Ciak Start e' attivo. Ecco il piano dei prossimi 21 giorni",
}

_BLUEPRINT_TEXT = """Ciao {nome},

il pagamento e' arrivato e il tuo accesso e' attivo.

Entra e scegli la tua password da qui:
{url}

Cosa fare, in ordine:

1. Apri il link qui sopra e scegli una password. Ti serve una volta sola.
2. Entra nella tua area e leggi l'analisi: e' il punto di partenza del lavoro.
3. Guarda i prossimi passi che trovi in area e dimmi se qualcosa non ti torna.

Se il link non funziona, rispondi a questa email e te ne mando un altro.

Un saluto,
Claudio
"""

_START_TEXT = """Ciao {nome},

il pagamento e' arrivato e il tuo percorso e' attivo.

Entra e scegli la tua password da qui:
{url}

Come funziona, in tre tappe.

1. Entro il {d1}: posizionamento e brand. Rispondi ai questionari guidati dentro
la piattaforma, noi ti restituiamo il documento di posizionamento e il tuo brand kit.

2. Entro il {d2}: profili social e sito vetrina. Prepariamo i testi dei tuoi profili
e la pagina di presentazione. Per pubblicare il sito ti guidiamo passo per passo.

3. Entro il {d3}: strategia dei contenuti e calendario dei 90 giorni.

Cosa serve da te: rispondere alle domande dentro la piattaforma. Quando ti mandiamo
un materiale, guardalo e dimmi se va bene o cosa cambiare. Noi ti rispondiamo entro
due giorni lavorativi.

Ti scrivo a parte per fissare la call di avvio, mezz'ora, cosi' partiamo insieme.

I 499 euro restano scalati interi se piu' avanti passi alla partnership.

Se il link non funziona, rispondi a questa email e te ne mando un altro.

Un saluto,
Claudio
"""


def _plain_body(tier: str, nome: str, url: str, paid_at: Optional[str]) -> str:
    if tier == "blueprint":
        return _BLUEPRINT_TEXT.format(nome=nome, url=url)
    d1, d2, d3 = delivery_dates(paid_at)
    return _START_TEXT.format(nome=nome, url=url, d1=d1, d2=d2, d3=d3)


def _html_body(tier: str, nome: str, url: str, paid_at: Optional[str]) -> str:
    """HTML minimale: un solo bottone in alto, poi il testo. L'URL resta anche
    in chiaro sotto il bottone, perche' alcuni client email non rendono i link."""
    plain = _plain_body(tier, nome, url, paid_at)
    # La prima riga e' il saluto, la CTA la mettiamo come bottone dedicato.
    paragraphs = "".join(
        f'<p style="margin:0 0 14px;line-height:1.6;">{block.strip()}</p>'
        for block in plain.split("\n\n")
        if block.strip() and url not in block
    )
    return f"""<html><body style="font-family:Poppins,Arial,sans-serif;color:#0F172A;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
<p style="margin:0 0 20px;line-height:1.6;">Ciao {nome},</p>
<p style="margin:0 0 20px;">
  <a href="{url}" style="background:#0F172A;color:#FACC15;padding:14px 22px;
     border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
     Entra e scegli la tua password</a>
</p>
<p style="margin:0 0 20px;font-size:13px;color:#64748B;">
  Se il bottone non funziona, copia questo indirizzo nel browser:<br>{url}
</p>
{paragraphs}
</div></body></html>"""


def send_onboarding_email_sync(
    email: str,
    nome: Optional[str],
    tier: str,
    access_url: str,
    paid_at: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """Invio SMTP sincrono. Ritorna (ok, error_msg). Non solleva."""
    if tier not in TIERS:
        return False, f"tier {tier!r} non valido (attesi {TIERS})"
    if not email or "@" not in email:
        return False, "email mancante/non valida"
    if not access_url:
        return False, "access_url mancante"

    host, port, user, pwd, sender = _smtp_config()
    if not user or not pwd:
        return False, "SMTP non configurato (manca SMTP_USER o SMTP_PASSWORD)"

    nome_safe = (nome or "").strip() or "ciao"
    subject_name = nome_safe if nome_safe != "ciao" else "Ciao"

    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = SUBJECTS[tier].format(nome=subject_name)
    msg["Reply-To"] = os.environ.get("CIAK_EMAIL_REPLY_TO", "claudio.bertogliatti@gmail.com")
    msg.attach(MIMEText(_plain_body(tier, nome_safe, access_url, paid_at), "plain", "utf-8"))
    msg.attach(MIMEText(_html_body(tier, nome_safe, access_url, paid_at), "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls()
            server.login(user, pwd)
            server.send_message(msg)
        logger.info("[CIAK-ONBOARDING-EMAIL] sent to %s tier=%s", email, tier)
        return True, None
    except Exception as e:
        logger.error("[CIAK-ONBOARDING-EMAIL] send failed for %s tier=%s: %s", email, tier, e)
        return False, str(e)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_onboarding_email.py -v`
Expected: PASS, 8 test

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_onboarding_email.py backend/tests/test_ciak_onboarding_email.py
git commit -m "feat(ciak): transactional onboarding email service with SMTP send"
```

---

### Task 2: Wrapper async con audit dell'esito reale

**Files:**
- Modify: `backend/services/ciak_onboarding_email.py` (append)
- Modify: `backend/tests/test_ciak_onboarding_email.py` (append)
- Modify: `backend/server.py` (accanto a riga ~17220, dove c'è `set_ciak_checkpoint_email_db(db)`)

**Interfaces:**
- Consumes: `send_onboarding_email_sync`, `set_db` dal Task 1.
- Produces: `async def send_onboarding_email_async(email: str, nome: str | None, tier: str, access_url: str, paid_at: str | None = None, client_id: str | None = None, attempt: int = 1) -> bool`, la costante `_RETRY_DELAY_S`, e le righe su `ciak_onboarding_emails` con schema `{email, nome, tier, client_id, attempt, sent, sent_via, error, at, sent_at}` (una riga per tentativo, massimo 2).

- [ ] **Step 1: Write the failing test**

```python
# append a backend/tests/test_ciak_onboarding_email.py
import services.ciak_onboarding_email as onboarding


class FakeCollection:
    def __init__(self):
        self.docs = []

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None


class FakeDB:
    def __init__(self):
        self.ciak_onboarding_emails = FakeCollection()


@pytest.mark.asyncio
async def test_async_send_records_successful_delivery():
    db = FakeDB()
    onboarding.set_db(db)
    ok = await onboarding.send_onboarding_email_async(
        email="mario@example.com",
        nome="Mario",
        tier="start",
        access_url="https://www.ciak.io/x",
        paid_at="2026-08-03T10:00:00+00:00",
        client_id="cli-1",
    )
    assert ok is True
    row = db.ciak_onboarding_emails.docs[0]
    assert row["sent"] is True
    assert row["error"] is None
    assert row["sent_at"] is not None
    assert row["tier"] == "start"
    assert row["client_id"] == "cli-1"


@pytest.mark.asyncio
async def test_async_send_records_failure_with_error(monkeypatch):
    db = FakeDB()
    onboarding.set_db(db)
    monkeypatch.setattr(
        onboarding, "send_onboarding_email_sync", lambda *a, **k: (False, "boom")
    )
    ok = await onboarding.send_onboarding_email_async(
        email="mario@example.com", nome="Mario", tier="blueprint", access_url="https://x"
    )
    assert ok is False
    row = db.ciak_onboarding_emails.docs[0]
    assert row["sent"] is False
    assert row["error"] == "boom"
    assert row["sent_at"] is None


@pytest.mark.asyncio
async def test_async_send_never_raises_when_db_missing(monkeypatch):
    onboarding.set_db(None)
    ok = await onboarding.send_onboarding_email_async(
        email="mario@example.com", nome="Mario", tier="blueprint", access_url="https://x"
    )
    assert ok is True


@pytest.mark.asyncio
async def test_failed_send_is_retried_once_and_both_attempts_are_recorded(monkeypatch):
    db = FakeDB()
    onboarding.set_db(db)
    monkeypatch.setattr(onboarding, "_RETRY_DELAY_S", 0)
    attempts = {"n": 0}

    def flaky(*args, **kwargs):
        attempts["n"] += 1
        return (attempts["n"] == 2, None if attempts["n"] == 2 else "temporary")

    monkeypatch.setattr(onboarding, "send_onboarding_email_sync", flaky)

    ok = await onboarding.send_onboarding_email_async(
        email="mario@example.com", nome="Mario", tier="start", access_url="https://x"
    )

    assert ok is True
    assert attempts["n"] == 2
    rows = db.ciak_onboarding_emails.docs
    assert [row["attempt"] for row in rows] == [1, 2]
    assert [row["sent"] for row in rows] == [False, True]


@pytest.mark.asyncio
async def test_retry_is_not_attempted_a_third_time(monkeypatch):
    db = FakeDB()
    onboarding.set_db(db)
    monkeypatch.setattr(onboarding, "_RETRY_DELAY_S", 0)
    monkeypatch.setattr(
        onboarding, "send_onboarding_email_sync", lambda *a, **k: (False, "down")
    )

    ok = await onboarding.send_onboarding_email_async(
        email="mario@example.com", nome="Mario", tier="start", access_url="https://x"
    )

    assert ok is False
    assert [row["attempt"] for row in db.ciak_onboarding_emails.docs] == [1, 2]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_onboarding_email.py -k async -v`
Expected: FAIL con `AttributeError: module 'services.ciak_onboarding_email' has no attribute 'send_onboarding_email_async'`

- [ ] **Step 3: Write minimal implementation**

```python
# append a backend/services/ciak_onboarding_email.py

# Un solo tentativo differito: se anche quello fallisce la riga resta
# sent=False e la coppia compare in /onboarding-email/gaps.
_RETRY_DELAY_S = int(os.environ.get("ONBOARDING_EMAIL_RETRY_DELAY_S", "60"))


async def send_onboarding_email_async(
    email: str,
    nome: Optional[str],
    tier: str,
    access_url: str,
    paid_at: Optional[str] = None,
    client_id: Optional[str] = None,
    attempt: int = 1,
) -> bool:
    """Invia + registra l'esito REALE. Fire-and-forget: non solleva mai.

    Pipeline (stesso pattern di services/ciak_checkpoint_email.py):
      1. invio SMTP in thread, per non bloccare l'event loop
      2. audit su ciak_onboarding_emails con l'esito vero, una riga per tentativo
      3. un solo retry differito se il primo tentativo fallisce
      4. tag Systeme solo se l'email e' partita davvero
    """
    import asyncio

    now_iso = datetime.now(timezone.utc).isoformat()
    ok, err = await asyncio.to_thread(
        send_onboarding_email_sync, email, nome, tier, access_url, paid_at
    )

    if _db is not None:
        try:
            await _db.ciak_onboarding_emails.insert_one({
                "email": email,
                "nome": nome,
                "tier": tier,
                "client_id": client_id,
                "attempt": attempt,
                "sent": ok,
                "sent_via": "smtp",
                "error": err,
                "at": now_iso,
                "sent_at": now_iso if ok else None,
            })
        except Exception as e:
            logger.warning("[CIAK-ONBOARDING-EMAIL] audit insert failed: %s", e)

    if not ok and attempt == 1:
        logger.warning(
            "[CIAK-ONBOARDING-EMAIL] tentativo 1 fallito per %s, riprovo tra %ss",
            email, _RETRY_DELAY_S,
        )
        await asyncio.sleep(_RETRY_DELAY_S)
        return await send_onboarding_email_async(
            email=email,
            nome=nome,
            tier=tier,
            access_url=access_url,
            paid_at=paid_at,
            client_id=client_id,
            attempt=2,
        )

    if not ok:
        logger.error(
            "[CIAK-ONBOARDING-EMAIL] invio fallito email=%s tier=%s: %s", email, tier, err
        )
        return False

    # Segnale per Systeme: audit/segmentazione, NON consegna. Solo se inviata.
    try:
        from services.ciak_systeme import ciak_emit_event

        asyncio.create_task(ciak_emit_event(
            email=email,
            event_name=f"ciak_onboarding_email_sent_{tier}",
            first_name=nome,
            metadata={"tier": tier},
        ))
    except Exception as e:
        logger.warning("[CIAK-ONBOARDING-EMAIL] systeme tag failed: %s", e)

    return True
```

- [ ] **Step 4: Register the db in server.py**

Accanto alla registrazione esistente di `ciak_checkpoint_email` (riga ~17220):

```python
from services.ciak_onboarding_email import set_db as set_ciak_onboarding_email_db

set_ciak_onboarding_email_db(db)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_ciak_onboarding_email.py -v`
Expected: PASS, 11 test

- [ ] **Step 6: Commit**

```bash
git add backend/services/ciak_onboarding_email.py backend/tests/test_ciak_onboarding_email.py backend/server.py
git commit -m "feat(ciak): audit every onboarding email send with its real outcome"
```

---

### Task 3: Trigger Blueprint €27

**Files:**
- Modify: `backend/routers/checkout.py:93-125` (`_deliver_client_access_link`)
- Test: `backend/tests/test_checkout_onboarding_email.py` (create)

**Interfaces:**
- Consumes: `send_onboarding_email_async` dal Task 2.
- Produces: `_deliver_client_access_link` invia l'email e mantiene il campo Systeme; il tag `ciak_client_access_ready` viene emesso solo dopo un invio riuscito.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_checkout_onboarding_email.py
import pytest

import routers.checkout as checkout

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
async def test_blueprint_delivery_sends_email_and_tags_only_on_success(monkeypatch):
    calls = {"email": None, "tag": None, "field": None}

    async def fake_email(**kwargs):
        calls["email"] = kwargs
        return True

    async def fake_fields(**kwargs):
        calls["field"] = kwargs

    async def fake_event(**kwargs):
        calls["tag"] = kwargs

    monkeypatch.setattr(
        "services.ciak_onboarding_email.send_onboarding_email_async", fake_email
    )
    monkeypatch.setattr("services.ciak_systeme.ciak_set_contact_fields", fake_fields)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", fake_event)

    await checkout._deliver_client_access_link(
        email="mario@example.com",
        name="Mario",
        magic_link="https://www.ciak.io/cliente/accesso?token=abc",
        expires_at="2026-08-10T00:00:00+00:00",
    )

    assert calls["email"]["tier"] == "blueprint"
    assert calls["email"]["access_url"].endswith("token=abc")
    assert calls["tag"] is not None


@pytest.mark.asyncio
async def test_blueprint_delivery_skips_tag_when_email_fails(monkeypatch):
    calls = {"tag": None}

    async def fake_email(**kwargs):
        return False

    async def fake_fields(**kwargs):
        return None

    async def fake_event(**kwargs):
        calls["tag"] = kwargs

    monkeypatch.setattr(
        "services.ciak_onboarding_email.send_onboarding_email_async", fake_email
    )
    monkeypatch.setattr("services.ciak_systeme.ciak_set_contact_fields", fake_fields)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", fake_event)

    await checkout._deliver_client_access_link(
        email="mario@example.com",
        name="Mario",
        magic_link="https://www.ciak.io/cliente/accesso?token=abc",
        expires_at="2026-08-10T00:00:00+00:00",
    )

    assert calls["tag"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_checkout_onboarding_email.py -v`
Expected: FAIL, il tag viene emesso comunque (oggi non c'è alcun invio email)

- [ ] **Step 3: Write minimal implementation**

Sostituire il corpo di `_deliver_client_access_link` (`routers/checkout.py:93-125`):

```python
async def _deliver_client_access_link(
    *,
    email: str,
    name: str | None,
    magic_link: str,
    expires_at: str,
) -> None:
    """Consegna l'accesso al cliente Blueprint.

    LOCK 30/7/2026: l'email la manda il backend via SMTP. Prima questa funzione
    scriveva solo un campo e un tag su Systeme, aspettando un workflow che non
    esiste: il magic link non raggiungeva nessuno. Systeme resta per
    audit/segmentazione e il tag parte solo se l'email e' andata.
    """
    if not email:
        return

    from services.ciak_onboarding_email import send_onboarding_email_async
    from services.ciak_systeme import ciak_emit_event, ciak_set_contact_fields

    sent = False
    try:
        sent = await send_onboarding_email_async(
            email=email,
            nome=name,
            tier="blueprint",
            access_url=magic_link,
        )
    except Exception as exc:  # noqa: BLE001 - il webhook non deve fallire
        logger.error("[CIAK_WEBHOOK] onboarding email failed for %s: %s", email, exc)

    try:
        await ciak_set_contact_fields(
            email=email,
            fields={"client_access_url": magic_link},
            first_name=name,
        )
    except Exception as exc:  # noqa: BLE001 - best effort per webhook
        logger.warning("[CIAK_WEBHOOK] Systeme client access field failed for %s: %s", email, exc)

    if not sent:
        logger.error(
            "[CIAK_WEBHOOK] accesso NON consegnato a %s: recupero manuale necessario", email
        )
        return

    try:
        await ciak_emit_event(
            email=email,
            event_name="ciak_client_access_ready",
            first_name=name,
            metadata={"client_access_url": magic_link, "expires_at": expires_at},
        )
    except Exception as exc:  # noqa: BLE001 - best effort per webhook
        logger.warning("[CIAK_WEBHOOK] Systeme client access event failed for %s: %s", email, exc)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_checkout_onboarding_email.py -v`
Expected: PASS, 2 test

- [ ] **Step 5: Commit**

```bash
git add backend/routers/checkout.py backend/tests/test_checkout_onboarding_email.py
git commit -m "fix(ciak): actually email the access link after Blueprint payment"
```

---

### Task 4: Trigger Ciak Start €499 da checkout

**Files:**
- Modify: `backend/routers/stripe_webhook.py:446-479` (`process_ciak_start_payment`)
- Test: `backend/tests/test_stripe_webhook_start_email.py` (create)

**Interfaces:**
- Consumes: `send_onboarding_email_async` (Task 2), `create_magic_login_token` da `services.ciak_client_accounts`.
- Produces: `process_ciak_start_payment` genera un magic link e invia l'email `tier="start"` con `paid_at` = istante del pagamento.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_stripe_webhook_start_email.py
import pytest

import routers.stripe_webhook as webhook

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update.get("$set", {}))
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None


class FakeDB:
    def __init__(self):
        self.ciak_clients = FakeCollection([
            {"id": "cli-1", "email": "mario@example.com", "name": "Mario"}
        ])
        self.ciak_client_login_tokens = FakeCollection()
        self.payments = FakeCollection()
        self.payment_transactions = FakeCollection()


@pytest.mark.asyncio
async def test_start_payment_sends_onboarding_email_with_magic_link(monkeypatch):
    sent = {}

    async def fake_email(**kwargs):
        sent.update(kwargs)
        return True

    monkeypatch.setattr(
        "services.ciak_onboarding_email.send_onboarding_email_async", fake_email
    )

    db = FakeDB()
    await webhook.process_ciak_start_payment(db, "cli-1", "cs_test_123")

    assert sent["tier"] == "start"
    assert sent["email"] == "mario@example.com"
    assert "token=" in sent["access_url"]
    assert sent["paid_at"] is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_stripe_webhook_start_email.py -v`
Expected: FAIL con `KeyError: 'tier'` (oggi non viene inviata alcuna email)

- [ ] **Step 3: Write minimal implementation**

In `process_ciak_start_payment`, dopo `_record_checkout_payment(...)` (riga ~479):

```python
    # LOCK 30/7/2026: l'accesso lo consegna il backend via email, non Systeme.
    try:
        import os

        from services.ciak_client_accounts import create_magic_login_token
        from services.ciak_onboarding_email import send_onboarding_email_async

        login = await create_magic_login_token(db, client_id, client.get("email", ""))
        base = os.environ.get("CIAK_BASE_URL", "https://www.ciak.io")
        access_url = f"{base}/cliente/accesso?token={login['token']}"
        await db.ciak_clients.update_one(
            {"id": client_id},
            {"$set": {"last_magic_link_created_at": now, "last_magic_login_url": access_url}},
        )
        await send_onboarding_email_async(
            email=client.get("email", ""),
            nome=client.get("name"),
            tier="start",
            access_url=access_url,
            paid_at=now,
            client_id=client_id,
        )
    except Exception as exc:  # noqa: BLE001 - il webhook non deve fallire
        logger.error("[STRIPE_WEBHOOK] Ciak Start onboarding email failed: %s", exc)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_stripe_webhook_start_email.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routers/stripe_webhook.py backend/tests/test_stripe_webhook_start_email.py
git commit -m "feat(ciak): send access email on Ciak Start payment"
```

---

### Task 5: Reinvio manuale dall'admin

**Files:**
- Modify: `backend/routers/ciak_admin.py` (nuovo endpoint, accanto a `/clienti-ciak` riga ~666)
- Test: `backend/tests/test_ciak_admin_onboarding_resend.py` (create)

**Interfaces:**
- Consumes: `send_onboarding_email_async` (Task 2), `create_magic_login_token`.
- Produces: `POST /api/ciak/admin/onboarding-email/resend` con body `{"email": str, "tier": "blueprint"|"start"}` → `{"ok": bool, "sent": bool, "access_url": str}`. Auth: `require_ciak_admin`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_admin_onboarding_resend.py
import pytest

import routers.ciak_admin as ciak_admin

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update.get("$set", {}))
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None


class FakeDB:
    def __init__(self):
        self.ciak_clients = FakeCollection([
            {"id": "cli-1", "email": "mario@example.com", "name": "Mario"}
        ])
        self.ciak_client_login_tokens = FakeCollection()


@pytest.mark.asyncio
async def test_resend_generates_fresh_link_and_sends(monkeypatch):
    sent = {}

    async def fake_email(**kwargs):
        sent.update(kwargs)
        return True

    monkeypatch.setattr(
        "services.ciak_onboarding_email.send_onboarding_email_async", fake_email
    )
    ciak_admin.db = FakeDB()

    result = await ciak_admin.resend_onboarding_email(
        ciak_admin.ResendOnboardingRequest(email="mario@example.com", tier="start"),
        admin=None,
    )

    assert result["sent"] is True
    assert "token=" in result["access_url"]
    assert sent["tier"] == "start"


@pytest.mark.asyncio
async def test_resend_404_when_client_unknown(monkeypatch):
    from fastapi import HTTPException

    ciak_admin.db = FakeDB()
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.resend_onboarding_email(
            ciak_admin.ResendOnboardingRequest(email="nobody@example.com", tier="start"),
            admin=None,
        )
    assert exc.value.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_admin_onboarding_resend.py -v`
Expected: FAIL con `AttributeError: module 'routers.ciak_admin' has no attribute 'ResendOnboardingRequest'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/routers/ciak_admin.py, accanto a /clienti-ciak
class ResendOnboardingRequest(BaseModel):
    email: str
    tier: str = "blueprint"


@router.post("/onboarding-email/resend")
async def resend_onboarding_email(
    payload: ResendOnboardingRequest,
    admin=Depends(require_ciak_admin),
):
    """Rigenera il magic link e reinvia l'email di accesso.

    Serve come recovery: chi ha pagato prima del fix del 30/7/2026 non ha mai
    ricevuto l'accesso (il canale Systeme non esisteva).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    import os

    from services.ciak_client_accounts import create_magic_login_token
    from services.ciak_onboarding_email import send_onboarding_email_async

    email = _email(payload.email)
    client = await db.ciak_clients.find_one({"email": email}, {"_id": 0})
    if not client:
        raise HTTPException(404, "Nessun cliente Ciak con questa email")

    login = await create_magic_login_token(db, client["id"], email)
    base = os.environ.get("CIAK_BASE_URL", "https://www.ciak.io")
    access_url = f"{base}/cliente/accesso?token={login['token']}"
    await db.ciak_clients.update_one(
        {"id": client["id"]},
        {"$set": {"last_magic_login_url": access_url}},
    )
    sent = await send_onboarding_email_async(
        email=email,
        nome=client.get("name"),
        tier=payload.tier,
        access_url=access_url,
        paid_at=client.get("start_purchased_at") or client.get("created_at"),
        client_id=client["id"],
    )
    return {"ok": True, "sent": sent, "access_url": access_url}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_ciak_admin_onboarding_resend.py -v`
Expected: PASS, 2 test

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_admin.py backend/tests/test_ciak_admin_onboarding_resend.py
git commit -m "feat(ciak-admin): resend onboarding email with a fresh magic link"
```

---

### Task 6: Report degli accessi non consegnati

**Files:**
- Modify: `backend/routers/ciak_admin.py` (nuovo endpoint)
- Test: `backend/tests/test_ciak_admin_onboarding_gaps.py` (create)

**Interfaces:**
- Consumes: collection `ciak_onboarding_emails` (Task 2), `ciak_clients`.
- Produces: `GET /api/ciak/admin/onboarding-email/gaps` → `{"items": [{"email", "tier", "reason"}], "count": int}` con `reason` in `("nessuna_email", "invio_fallito", "mai_entrato")`. `mai_entrato` = email consegnata ma nessun token con `used_at` valorizzato su `ciak_client_login_tokens`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_admin_onboarding_gaps.py
import pytest

import routers.ciak_admin as ciak_admin

pytestmark = pytest.mark.unit


class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def __aiter__(self):
        async def gen():
            for doc in self._docs:
                yield doc
        return gen()


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    def find(self, query=None, projection=None):
        return FakeCursor(self.docs)


class FakeDB:
    def __init__(self, clients, emails, tokens=None):
        self.ciak_clients = FakeCollection(clients)
        self.ciak_onboarding_emails = FakeCollection(emails)
        self.ciak_client_login_tokens = FakeCollection(tokens)


@pytest.mark.asyncio
async def test_gaps_lists_paying_clients_without_a_sent_email():
    ciak_admin.db = FakeDB(
        clients=[
            {"email": "a@x.it", "access_level": "cliente_blueprint"},
            {"email": "b@x.it", "access_level": "cliente_start"},
            {"email": "c@x.it", "access_level": "cliente_start"},
        ],
        emails=[
            {"email": "b@x.it", "sent": True},
            {"email": "c@x.it", "sent": False, "error": "boom"},
        ],
        tokens=[{"email": "b@x.it", "used_at": "2026-08-04T09:00:00+00:00"}],
    )
    result = await ciak_admin.onboarding_email_gaps(admin=None)
    by_email = {item["email"]: item["reason"] for item in result["items"]}
    assert by_email["a@x.it"] == "nessuna_email"
    assert by_email["c@x.it"] == "invio_fallito"
    assert "b@x.it" not in by_email
    assert result["count"] == 2


@pytest.mark.asyncio
async def test_gaps_flags_delivered_email_never_used_to_log_in():
    ciak_admin.db = FakeDB(
        clients=[{"email": "d@x.it", "access_level": "cliente_start"}],
        emails=[{"email": "d@x.it", "sent": True}],
        tokens=[{"email": "d@x.it", "used_at": None}],
    )
    result = await ciak_admin.onboarding_email_gaps(admin=None)
    assert result["items"] == [
        {"email": "d@x.it", "tier": "cliente_start", "reason": "mai_entrato"}
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_admin_onboarding_gaps.py -v`
Expected: FAIL con `AttributeError: module 'routers.ciak_admin' has no attribute 'onboarding_email_gaps'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/routers/ciak_admin.py
_PAYING_ACCESS_LEVELS = ("cliente_blueprint", "cliente_start", "partner")


@router.get("/onboarding-email/gaps")
async def onboarding_email_gaps(admin=Depends(require_ciak_admin)):
    """Chi ha pagato e non ha ricevuto l'accesso.

    Un pagamento senza una riga `sent: True` su ciak_onboarding_emails e' un
    cliente rimasto fuori: va recuperato con /onboarding-email/resend.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    outcomes: dict[str, bool] = {}
    async for row in db.ciak_onboarding_emails.find({}, {"_id": 0, "email": 1, "sent": 1}):
        email = _email(row.get("email"))
        outcomes[email] = outcomes.get(email, False) or bool(row.get("sent"))

    logged_in: set[str] = set()
    async for row in db.ciak_client_login_tokens.find(
        {}, {"_id": 0, "email": 1, "used_at": 1}
    ):
        if row.get("used_at"):
            logged_in.add(_email(row.get("email")))

    items = []
    async for client in db.ciak_clients.find(
        {}, {"_id": 0, "email": 1, "access_level": 1}
    ):
        if client.get("access_level") not in _PAYING_ACCESS_LEVELS:
            continue
        email = _email(client.get("email"))
        if not outcomes.get(email):
            reason = "invio_fallito" if email in outcomes else "nessuna_email"
        elif email not in logged_in:
            reason = "mai_entrato"
        else:
            continue
        items.append({
            "email": email,
            "tier": client.get("access_level"),
            "reason": reason,
        })

    return {"items": items, "count": len(items)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_admin_onboarding_gaps.py -v`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `cd backend && python -m pytest -m unit -q`
Expected: nessuna regressione

- [ ] **Step 6: Commit**

```bash
git add backend/routers/ciak_admin.py backend/tests/test_ciak_admin_onboarding_gaps.py
git commit -m "feat(ciak-admin): report clients who paid without receiving access"
```

---

### Task 7: Trigger sull'attivazione manuale da Payment Link

⛔ **BLOCCATO dal merge di `ag/ciak-start-activate`**: l'endpoint `POST /api/admin/ciak-start/activate` esiste solo su quel branch. Da eseguire dopo il merge, non prima.

**Files:**
- Modify: `backend/routers/ciak_admin.py` (dentro l'handler di `/ciak-start/activate`, dopo la creazione account e credito)
- Test: `backend/tests/test_ciak_start_activate.py` (esistente sul branch, append)

**Interfaces:**
- Consumes: `send_onboarding_email_async` (Task 2), `create_magic_login_token`.
- Produces: l'attivazione manuale restituisce `access_url` e invia l'email `tier="start"`.

- [ ] **Step 1: Write the failing test**

```python
# append a backend/tests/test_ciak_start_activate.py
@pytest.mark.asyncio
async def test_manual_activation_sends_onboarding_email(monkeypatch):
    sent = {}

    async def fake_email(**kwargs):
        sent.update(kwargs)
        return True

    monkeypatch.setattr(
        "services.ciak_onboarding_email.send_onboarding_email_async", fake_email
    )
    result = await activate_ciak_start_for_email("mario@example.com")
    assert sent["tier"] == "start"
    assert "token=" in sent["access_url"]
    assert result["access_url"] == sent["access_url"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ciak_start_activate.py -k onboarding -v`
Expected: FAIL, l'attivazione non invia nulla

- [ ] **Step 3: Write minimal implementation**

Nell'handler di attivazione, dopo aver impostato credito e progress:

```python
    import os

    from services.ciak_client_accounts import create_magic_login_token
    from services.ciak_onboarding_email import send_onboarding_email_async

    login = await create_magic_login_token(db, client["id"], client["email"])
    base = os.environ.get("CIAK_BASE_URL", "https://www.ciak.io")
    access_url = f"{base}/cliente/accesso?token={login['token']}"
    await send_onboarding_email_async(
        email=client["email"],
        nome=client.get("name"),
        tier="start",
        access_url=access_url,
        paid_at=_now_iso(),
        client_id=client["id"],
    )
```

e aggiungere `"access_url": access_url` alla risposta dell'endpoint.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ciak_start_activate.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_admin.py backend/tests/test_ciak_start_activate.py
git commit -m "feat(ciak): email the access link on manual Ciak Start activation"
```

---

## Verifica finale prima di dichiarare fatto

- [ ] `cd backend && python -m pytest -m unit -q` verde.
- [ ] **Smoke reale**: chiamare `POST /api/ciak/admin/onboarding-email/resend` su un indirizzo di test di Claudio e **aprire la mail ricevuta**: il pulsante porta alla pagina di scelta password, l'URL in chiaro funziona, non ci sono trattini lunghi, le tre date sono giuste. Mai su un indirizzo di cliente vero.
- [ ] `GET /api/ciak/admin/onboarding-email/gaps` risponde e, se ci sono righe, ognuna viene recuperata con il resend.
- [ ] Il workflow Systeme `Ciak Bought 67` (516729) **non è stato toccato**. Va riallineato in una sessione dedicata, perché oggi manda alle 8 Domande e a Cal.com mentre questa email manda in area: due messaggi lo stesso giorno.

## Punti da confermare con Claudio (non bloccano il Task 1)

1. **Testo Blueprint**: non menziona la call 1:1 né le "72 ore" promesse sul checkout (`checkout.py:217-221`), perché quella promessa è in revisione. Se resta valida, il testo va integrato.
2. **Reply-To**: oggi il default del pattern è `claudio.bertogliatti@gmail.com`. Confermare se preferisce `info@evolution-pro.it`.
3. **Call di kickoff**: il testo Start dice "ti scrivo a parte per fissare la call". Se si vuole un link di prenotazione (Cal.com), va aggiunto.
4. 🔴 **Il magic link cliente scade in 48 ore** (`services/ciak_client_accounts.py:189`), mentre quello partner dura **7 giorni** (`routers/proposta.py`). Per un target poco digitalizzato 48 ore sono poche: chi paga il venerdì e apre la mail il lunedì trova un link morto. La mail dice "rispondi e te ne mando un altro", ma è attrito su un cliente appena pagante. **Proposta: allineare a 7 giorni.** È una riga (`timedelta(hours=48)` → `days=7`), non è in questo piano perché cambia il comportamento anche del flusso Blueprint esistente: decisione di Claudio.
