# Evolution Insider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invitare automaticamente, una sola volta, chi ha già interagito con Ciak e non ha acquistato a iscriversi a Evolution Insider (biblioteca + email settimanale su Systeme), con consenso esplicito.

**Architecture:** Un servizio backend (`ciak_insider_invites`) individua i candidati nei dati esistenti e applica su Systeme il tag `insider_invito` con `ciak_emit_event`; ogni invito è registrato in `insider_invites` (email unica). Un endpoint con chiave report e un job dello scheduler lo eseguono ogni giorno, come il promemoria del bonus 48h. Su Systeme (creato disattivato) un workflow parte dal tag, invia l'invito, e l'iscrizione con consenso applica `insider_membro`.

**Tech Stack:** Python 3.12, FastAPI, Motor/MongoDB, APScheduler, pytest (fake DB ermetico), Systeme.io (MCP).

## Global Constraints

- Disegno di riferimento: `docs/superpowers/specs/2026-10-01-evolution-insider-community-design.md`.
- Nome: **Evolution Insider**. Tag: `insider_invito`, `insider_invitato` (registro `insider_invites`), `insider_membro`.
- Si invita **una sola volta** per persona. Mai chi ha acquistato, mai `call_booked`, mai la lista fredda da 13k (policy 19/9).
- Il controllo è **spento** finché `INSIDER_INVITES_ENABLED` non vale `1`; spento, conta soltanto. Tetto **giornaliero** dal registro: default **10**, massimo assoluto **25** (`INSIDER_INVITES_MAX_PER_RUN`; 0 = non invia). Solo riferimenti entro **180 giorni** (`INSIDER_INVITES_MAX_AGE_DAYS`), dai più recenti. *(Aggiornato dopo la revisione finale: il testo originale diceva «25 per giro».)*
- Percorsi: a) proposta scaduta senza pagamento · b) Blueprint consegnato da 7 giorni, nessuna proposta · c) `report_generated` da 14 giorni senza call.
- Le email si normalizzano in minuscolo (`diagnostic_sessions.user_email` può essere in maiuscolo).
- Su Systeme si crea tutto **disattivato**. Nessun invio reale prima dell'approvazione delle email da parte di Claudio.
- La guida bonus «Come creare un videocorso che vende davvero» **non** entra nella biblioteca. Niente casi studio, testimonianze o numeri inventati.
- Repo pubblico: nessun dato personale, nessuna chiave, nessuna email reale nei file o nei test.
- Codice, commit e nomi di file in inglese dove già così; i messaggi di commit del repo sono in italiano: seguire lo stile esistente. Copy in italiano, dai del tu, frasi corte, niente anglicismi.

## File Structure

| File | Responsabilità |
|---|---|
| `backend/services/ciak_insider_invites.py` (nuovo) | Candidatura (funzioni pure + lettura DB) e invio con registro, tetto, riprova |
| `backend/tests/test_ciak_insider_invites.py` (nuovo) | Test ermetici con DB finto che valuta i filtri |
| `backend/routers/ciak_clients.py` (modifica) | Endpoint `POST /api/ciak/client/insider-invites/run` |
| `backend/scheduler.py` (modifica) | Job giornaliero `trigger_insider_invites` |
| `.github/workflows/ci.yml` (modifica) | Aggiunge il nuovo file di test alla lista della CI |
| `docs/marketing/evolution-insider-email.md` (nuovo) | Bozze delle email, da approvare |

---

### Task 1: Candidatura (funzioni pure)

**Files:**
- Create: `backend/services/ciak_insider_invites.py`
- Test: `backend/tests/test_ciak_insider_invites.py`

**Interfaces:**
- Produces: `parse_iso(value) -> Optional[datetime]`, `norm_email(value) -> str` (vuota se non valida), `state_time(session, state) -> Optional[datetime]`, `has_bought(client, proposta) -> bool`, `reference(session, proposta, blueprint) -> Optional[tuple[str, datetime]]`, costanti `PATH_PROPOSTA`, `PATH_BLUEPRINT`, `PATH_QUESTIONARIO`, `BLUEPRINT_WAIT_DAYS=7`, `QUESTIONARIO_WAIT_DAYS=14`.

- [ ] **Step 1: Scrivi i test che falliscono**

Crea `backend/tests/test_ciak_insider_invites.py` con questo contenuto iniziale:

```python
"""
Evolution Insider — inviti. Ermetici: niente rete, niente Mongo. Il DB finto VALUTA i
filtri (non restituisce a prescindere), cosi' un filtro sbagliato fa fallire il test.
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import ciak_insider_invites as ins

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 20, 9, 0, tzinfo=timezone.utc)


def _iso(days_ago: float) -> str:
    return (NOW - timedelta(days=days_ago)).isoformat()


def _session(state="report_generated", email="a@example.com", days_ago=20, token="t1", name="Anna Rossi"):
    return {
        "session_token": token, "user_email": email, "user_name": name, "current_state": state,
        "state_history": [{"state": state, "timestamp": _iso(days_ago)}],
    }


def test_norm_email_minuscolo_e_validazione():
    assert ins.norm_email("  Anna.Rossi@Example.COM ") == "anna.rossi@example.com"
    assert ins.norm_email("senza-chiocciola") == ""
    assert ins.norm_email("a b@example.com") == ""
    assert ins.norm_email(None) == ""


def test_parse_iso_accetta_z_e_naive():
    assert ins.parse_iso("2026-10-01T10:00:00Z").tzinfo is not None
    assert ins.parse_iso("2026-10-01T10:00:00").tzinfo is not None
    assert ins.parse_iso("boh") is None and ins.parse_iso(None) is None


def test_state_time_prende_l_ultimo_timestamp_dello_stato():
    s = {"state_history": [
        {"state": "report_generated", "timestamp": "2026-10-01T10:00:00+00:00"},
        {"state": "call_booked", "timestamp": "2026-10-02T10:00:00+00:00"},
        {"state": "report_generated", "timestamp": "2026-10-03T10:00:00+00:00"},
    ]}
    assert ins.state_time(s, "report_generated") == datetime(2026, 10, 3, 10, 0, tzinfo=timezone.utc)
    assert ins.state_time(s, "call_done") is None


def test_has_bought_riconosce_ogni_indicatore():
    assert ins.has_bought({"start_purchased_at": "2026-10-01"}, None)
    assert ins.has_bought({"access_level": "cliente_start"}, None)
    assert ins.has_bought({"access_level": "partner"}, None)
    assert ins.has_bought({"partnership_attiva": True}, None)
    assert ins.has_bought({}, {"stato": "pagamento_completato"})
    assert ins.has_bought({}, {"stato": "contratto_firmato"})
    assert not ins.has_bought({"access_level": "lead"}, {"stato": "vista"})
    assert not ins.has_bought(None, None)


def test_reference_questionario_dopo_14_giorni_dal_report():
    path, ref = ins.reference(_session("report_generated", days_ago=20), None, None)
    assert path == ins.PATH_QUESTIONARIO
    assert ref == NOW - timedelta(days=20) + timedelta(days=14)


def test_reference_call_done_con_proposta_usa_la_scadenza():
    proposta = {"scadenza": _iso(2), "stato": "scaduta"}
    path, ref = ins.reference(_session("call_done"), proposta, {"consegna_inviata_at": _iso(30)})
    assert path == ins.PATH_PROPOSTA and ref == NOW - timedelta(days=2)


def test_reference_call_done_senza_proposta_usa_consegna_blueprint_piu_7_giorni():
    path, ref = ins.reference(_session("call_done"), None, {"consegna_inviata_at": _iso(10)})
    assert path == ins.PATH_BLUEPRINT and ref == NOW - timedelta(days=10) + timedelta(days=7)


def test_reference_call_done_senza_consegna_ripiega_sulla_data_della_call():
    path, ref = ins.reference(_session("call_done", days_ago=9), None, None)
    assert path == ins.PATH_BLUEPRINT and ref == NOW - timedelta(days=9) + timedelta(days=7)


@pytest.mark.parametrize("state", ["call_booked", "ciak_completed", "ciak_started", "lead_created", None])
def test_reference_altri_stati_non_sono_mai_candidati(state):
    assert ins.reference(_session(state or "x") | {"current_state": state}, None, None) is None
```

- [ ] **Step 2: Verifica che fallisca**

Run: `cd backend && MONGO_URL=mongodb://localhost:27017 DB_NAME=ciak_ci JWT_SECRET_KEY=ci-test-secret APP_ENV=test python -m pytest -q tests/test_ciak_insider_invites.py`
Expected: FAIL (`ModuleNotFoundError: services.ciak_insider_invites`).

- [ ] **Step 3: Scrivi l'implementazione minima**

Crea `backend/services/ciak_insider_invites.py`:

```python
"""
Evolution Insider — inviti alla community per chi non ha acquistato.

Ogni giorno individua chi ha gia' interagito con noi e non ha comprato, e applica su
Systeme il tag `insider_invito`: da li' parte il workflow d'invito (creato su Systeme).
Una sola volta per persona (`insider_invites`, email unica). Spento finche'
INSIDER_INVITES_ENABLED != "1": spento, conta soltanto i candidati ("conta a secco").
Disegno: docs/superpowers/specs/2026-10-01-evolution-insider-community-design.md
"""
import logging
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

PATH_PROPOSTA = "proposta_scaduta"
PATH_BLUEPRINT = "blueprint_senza_acquisto"
PATH_QUESTIONARIO = "questionario_senza_call"

BLUEPRINT_WAIT_DAYS = 7
QUESTIONARIO_WAIT_DAYS = 14
MAX_ATTEMPTS = 3
DEFAULT_MAX_PER_RUN = 25
EVENT_TAG = "insider_invito"
FLAG_ENV = "INSIDER_INVITES_ENABLED"
MAX_PER_RUN_ENV = "INSIDER_INVITES_MAX_PER_RUN"

PAID_PROPOSTA_STATES = {"pagamento_completato", "contratto_firmato"}
BOUGHT_ACCESS_LEVELS = {"cliente_start", "partner"}
CANDIDATE_STATES = ("report_generated", "call_done")


def parse_iso(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def norm_email(value) -> str:
    """Minuscolo e senza spazi; stringa vuota se non e' un indirizzo plausibile."""
    email = str(value or "").strip().lower()
    return email if "@" in email and " " not in email else ""


def state_time(session: dict, state: str) -> Optional[datetime]:
    """Ultimo timestamp di `state_history` per lo stato dato."""
    found = None
    for entry in session.get("state_history") or []:
        if isinstance(entry, dict) and entry.get("state") == state:
            ts = parse_iso(entry.get("timestamp"))
            if ts and (found is None or ts > found):
                found = ts
    return found


def has_bought(client: Optional[dict], proposta: Optional[dict]) -> bool:
    c = client or {}
    if c.get("start_purchased_at") or c.get("partnership_attiva") is True:
        return True
    if c.get("access_level") in BOUGHT_ACCESS_LEVELS:
        return True
    return bool(proposta and proposta.get("stato") in PAID_PROPOSTA_STATES)


def reference(session: dict, proposta: Optional[dict], blueprint: Optional[dict]) -> Optional[tuple]:
    """(percorso, data di riferimento) oppure None se la persona non e' candidabile."""
    state = session.get("current_state")
    if state == "call_done":
        if proposta:
            scadenza = parse_iso(proposta.get("scadenza"))
            if scadenza:
                return PATH_PROPOSTA, scadenza
        base = parse_iso((blueprint or {}).get("consegna_inviata_at")) or state_time(session, "call_done")
        if not base:
            return None
        return PATH_BLUEPRINT, base + timedelta(days=BLUEPRINT_WAIT_DAYS)
    if state == "report_generated":
        reached = state_time(session, "report_generated")
        if not reached:
            return None
        return PATH_QUESTIONARIO, reached + timedelta(days=QUESTIONARIO_WAIT_DAYS)
    return None
```

- [ ] **Step 4: Verifica che passi**

Run: stesso comando del Step 2.
Expected: PASS (tutti i test di questo task).

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_insider_invites.py backend/tests/test_ciak_insider_invites.py
git commit -m "feat(insider): candidatura alla community Evolution Insider (funzioni pure)"
```

---

### Task 2: Lettura dei candidati e invio con registro

**Files:**
- Modify: `backend/services/ciak_insider_invites.py`
- Modify: `backend/tests/test_ciak_insider_invites.py`

**Interfaces:**
- Consumes: le funzioni del Task 1.
- Produces: `async trova_candidati(db, now=None) -> list[dict]` (ogni elemento: `email`, `nome`, `path`, `riferimento` ISO, `session_token`; ordinati dal più vecchio) · `async invita_insider(db, emit=None, now=None, dry_run=None, max_per_run=None) -> dict` con chiavi `dry_run`, `candidati`, `per_path`, `esempi`, `inviati`, `riprovati`, `errori`, e `motivo` quando il flag è spento. `emit` ha la firma di `ciak_emit_event(email, event_name, first_name=None, metadata=None, extra_tags=None) -> bool`.

- [ ] **Step 1: Aggiungi i test che falliscono**

Aggiungi in fondo a `backend/tests/test_ciak_insider_invites.py`:

```python
# ───────────────────────── DB finto ─────────────────────────
from pymongo.errors import DuplicateKeyError


def _match(doc, query):
    for key, cond in query.items():
        actual = doc.get(key)
        if isinstance(cond, dict):
            for op, operand in cond.items():
                if op == "$in" and actual not in operand:
                    return False
                if op == "$nin" and actual in operand:
                    return False
                if op == "$lt" and not (actual is not None and actual < operand):
                    return False
        elif actual != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, n):
        return [dict(d) for d in self.docs[:n]]


class FakeCollection:
    def __init__(self, docs=None, unique=None):
        self.docs = [dict(d) for d in (docs or [])]
        self.unique = unique

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _match(d, query or {})])

    async def insert_one(self, doc):
        if self.unique and any(d.get(self.unique) == doc.get(self.unique) for d in self.docs):
            raise DuplicateKeyError("duplicato")
        self.docs.append(dict(doc))

    async def update_one(self, query, update):
        for d in self.docs:
            if _match(d, query):
                d.update(update.get("$set", {}))
                return

    async def create_index(self, *args, **kwargs):
        return "ok"


class FakeDb:
    def __init__(self, sessions=(), clients=(), proposte=(), blueprints=(), invites=()):
        self.diagnostic_sessions = FakeCollection(sessions)
        self.ciak_clients = FakeCollection(clients)
        self.proposte = FakeCollection(proposte)
        self.ciak_blueprints = FakeCollection(blueprints)
        self.insider_invites = FakeCollection(invites, unique="email")


class Emitter:
    def __init__(self, results=None):
        self.calls = []
        self.results = results

    async def __call__(self, email, event_name, first_name=None, metadata=None, extra_tags=None):
        self.calls.append({"email": email, "event": event_name, "first_name": first_name, "metadata": metadata})
        if self.results is None:
            return True
        return self.results.pop(0) if self.results else True


@pytest.fixture
def flag_on(monkeypatch):
    monkeypatch.setenv(ins.FLAG_ENV, "1")


# ───────────────────────── candidati ─────────────────────────
async def test_report_generated_candidato_solo_dopo_14_giorni():
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=20),
                          _session("report_generated", "b@example.com", days_ago=5, token="t2")])
    out = await ins.trova_candidati(db, NOW)
    assert [c["email"] for c in out] == ["a@example.com"]
    assert out[0]["path"] == ins.PATH_QUESTIONARIO and out[0]["nome"] == "Anna Rossi"


async def test_call_done_con_proposta_non_scaduta_non_e_candidato():
    db = FakeDb(sessions=[_session("call_done", "a@example.com", days_ago=3)],
                proposte=[{"prospect_email": "a@example.com", "scadenza": (NOW + timedelta(days=4)).isoformat(), "stato": "vista"}])
    assert await ins.trova_candidati(db, NOW) == []


async def test_call_done_con_proposta_scaduta_e_candidato_sul_percorso_a():
    db = FakeDb(sessions=[_session("call_done", "a@example.com", days_ago=12)],
                proposte=[{"prospect_email": "a@example.com", "scadenza": _iso(1), "stato": "scaduta"}])
    out = await ins.trova_candidati(db, NOW)
    assert [(c["email"], c["path"]) for c in out] == [("a@example.com", ins.PATH_PROPOSTA)]


async def test_call_done_senza_proposta_usa_il_blueprint_consegnato():
    db = FakeDb(sessions=[_session("call_done", "a@example.com", days_ago=12, token="tk")],
                blueprints=[{"session_token": "tk", "consegna_inviata_at": _iso(9)}])
    out = await ins.trova_candidati(db, NOW)
    assert [(c["email"], c["path"]) for c in out] == [("a@example.com", ins.PATH_BLUEPRINT)]


async def test_call_prenotata_mai_invitata():
    db = FakeDb(sessions=[_session("call_booked", "a@example.com", days_ago=40)])
    assert await ins.trova_candidati(db, NOW) == []


async def test_chi_ha_acquistato_e_escluso_in_ogni_forma():
    sessions = [_session("report_generated", f"u{i}@example.com", days_ago=30, token=f"t{i}") for i in range(4)]
    db = FakeDb(
        sessions=sessions,
        clients=[
            {"email": "u0@example.com", "start_purchased_at": "2026-10-01"},
            {"email": "u1@example.com", "access_level": "partner"},
            {"email": "u2@example.com", "partnership_attiva": True},
        ],
        proposte=[{"prospect_email": "u3@example.com", "scadenza": _iso(5), "stato": "pagamento_completato"}],
    )
    assert await ins.trova_candidati(db, NOW) == []


async def test_email_in_maiuscolo_si_unifica_e_vince_lo_stato_piu_avanzato():
    db = FakeDb(
        sessions=[_session("report_generated", "ANNA@Example.com", days_ago=30, token="t1"),
                  _session("call_done", "anna@example.com", days_ago=20, token="t2")],
        blueprints=[{"session_token": "t2", "consegna_inviata_at": _iso(15)}],
    )
    out = await ins.trova_candidati(db, NOW)
    assert len(out) == 1 and out[0]["email"] == "anna@example.com" and out[0]["path"] == ins.PATH_BLUEPRINT


async def test_acquisto_registrato_con_email_maiuscola_esclude_comunque():
    db = FakeDb(sessions=[_session("report_generated", "anna@example.com", days_ago=30)],
                clients=[{"email": "ANNA@example.com", "access_level": "cliente_start"}])
    assert await ins.trova_candidati(db, NOW) == []


async def test_email_non_valida_scartata_e_ordine_dal_piu_vecchio():
    db = FakeDb(sessions=[
        _session("report_generated", "nuovo@example.com", days_ago=16, token="t1"),
        _session("report_generated", "vecchio@example.com", days_ago=60, token="t2"),
        _session("report_generated", "rotta", days_ago=60, token="t3"),
    ])
    out = await ins.trova_candidati(db, NOW)
    assert [c["email"] for c in out] == ["vecchio@example.com", "nuovo@example.com"]


async def test_gia_invitato_non_e_piu_candidato():
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=30)],
                invites=[{"email": "a@example.com", "status": "applied"}])
    assert await ins.trova_candidati(db, NOW) == []


# ───────────────────────── invio ─────────────────────────
def _many(n, days_ago=30):
    return [_session("report_generated", f"p{i:02d}@example.com", days_ago=days_ago + i, token=f"t{i}") for i in range(n)]


async def test_conta_a_secco_non_invia_niente_e_non_scrive():
    db = FakeDb(sessions=_many(3))
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW, dry_run=True)
    assert out["dry_run"] is True and out["candidati"] == 3 and out["inviati"] == 0
    assert out["per_path"] == {ins.PATH_QUESTIONARIO: 3}
    assert emit.calls == [] and db.insider_invites.docs == []
    assert all("***@" in e for e in out["esempi"]) and len(out["esempi"]) <= 5


async def test_con_il_flag_spento_resta_a_secco_anche_se_si_chiede_di_inviare(monkeypatch):
    monkeypatch.delenv(ins.FLAG_ENV, raising=False)
    emit = Emitter()
    out = await ins.invita_insider(FakeDb(sessions=_many(2)), emit=emit, now=NOW, dry_run=False)
    assert out["dry_run"] is True and out["motivo"] == "flag_spento" and emit.calls == []


async def test_invio_applica_il_tag_registra_e_non_ripete(flag_on):
    db = FakeDb(sessions=_many(2))
    emit = Emitter()
    first = await ins.invita_insider(db, emit=emit, now=NOW)
    assert first["inviati"] == 2 and [c["event"] for c in emit.calls] == [ins.EVENT_TAG] * 2
    assert emit.calls[0]["first_name"] == "Anna Rossi"
    assert {d["status"] for d in db.insider_invites.docs} == {"applied"}
    second = await ins.invita_insider(db, emit=emit, now=NOW)
    assert second["inviati"] == 0 and len(emit.calls) == 2


async def test_tetto_per_giro_e_il_resto_al_giro_dopo(flag_on):
    db = FakeDb(sessions=_many(30))
    emit = Emitter()
    first = await ins.invita_insider(db, emit=emit, now=NOW)
    assert first["inviati"] == ins.DEFAULT_MAX_PER_RUN == 25
    second = await ins.invita_insider(db, emit=emit, now=NOW)
    assert second["inviati"] == 5 and len({c["email"] for c in emit.calls}) == 30


async def test_il_tetto_si_puo_abbassare_con_la_variabile(flag_on, monkeypatch):
    monkeypatch.setenv(ins.MAX_PER_RUN_ENV, "3")
    emit = Emitter()
    out = await ins.invita_insider(FakeDb(sessions=_many(10)), emit=emit, now=NOW)
    assert out["inviati"] == 3


async def test_invio_fallito_si_riprova_e_dopo_tre_tentativi_si_ferma(flag_on):
    db = FakeDb(sessions=_many(1))
    emit = Emitter(results=[False, False, False, True])
    r1 = await ins.invita_insider(db, emit=emit, now=NOW)
    assert r1["errori"] == 1 and db.insider_invites.docs[0]["status"] == "failed"
    r2 = await ins.invita_insider(db, emit=emit, now=NOW)
    assert r2["riprovati"] == 1 and db.insider_invites.docs[0]["attempts"] == 2
    r3 = await ins.invita_insider(db, emit=emit, now=NOW)
    assert db.insider_invites.docs[0]["attempts"] == 3 and db.insider_invites.docs[0]["status"] == "failed"
    r4 = await ins.invita_insider(db, emit=emit, now=NOW)
    assert r4["riprovati"] == 0 and len(emit.calls) == 3  # basta: niente quarto tentativo


async def test_eccezione_del_motore_non_ferma_il_giro(flag_on):
    async def boom(email, event_name, first_name=None, metadata=None, extra_tags=None):
        raise RuntimeError("Systeme giu'")

    db = FakeDb(sessions=_many(2))
    out = await ins.invita_insider(db, emit=boom, now=NOW)
    assert out["errori"] == 2 and out["inviati"] == 0
    assert {d["status"] for d in db.insider_invites.docs} == {"failed"}


async def test_senza_db_risponde_con_errore_chiaro():
    assert (await ins.invita_insider(None))["error"] == "no_db"
```

- [ ] **Step 2: Verifica che fallisca**

Run: stesso comando pytest del Task 1.
Expected: FAIL (`AttributeError: module ... has no attribute 'trova_candidati'`).

- [ ] **Step 3: Scrivi l'implementazione**

Aggiungi in fondo a `backend/services/ciak_insider_invites.py`:

```python
_RANK = {"report_generated": 0, "call_done": 1}


def _most_advanced_per_email(sessions: list) -> dict:
    """Una sessione per email (minuscola): lo stato piu' avanzato, a parita' la piu' recente."""
    best: dict = {}
    for s in sessions:
        email = norm_email(s.get("user_email"))
        if not email:
            continue
        key = (_RANK.get(s.get("current_state"), -1), str(s.get("created_at") or ""))
        if email not in best or key > best[email][0]:
            best[email] = (key, s)
    return {email: pair[1] for email, pair in best.items()}


def _pick_proposta(items: list) -> Optional[dict]:
    """Se una proposta risulta pagata/firmata vince; altrimenti la piu' recente."""
    if not items:
        return None
    for p in items:
        if p.get("stato") in PAID_PROPOSTA_STATES:
            return p
    return sorted(items, key=lambda p: str(p.get("creato_at") or ""))[-1]


async def trova_candidati(db, now: Optional[datetime] = None) -> list:
    now = now or datetime.now(timezone.utc)
    sessions = await db.diagnostic_sessions.find({"current_state": {"$in": list(CANDIDATE_STATES)}}).to_list(5000)
    chosen = _most_advanced_per_email(sessions)
    if not chosen:
        return []

    tokens = [s.get("session_token") for s in chosen.values() if s.get("session_token")]

    # Clienti e proposte si leggono per intero (poche centinaia di documenti, con proiezione) e
    # si confrontano in Python con l'email normalizzata: un filtro `$in` non coprirebbe ogni
    # combinazione di maiuscole e un acquirente potrebbe ricevere l'invito per errore.
    clients: dict = {}
    for c in await db.ciak_clients.find(
        {}, {"_id": 0, "email": 1, "start_purchased_at": 1, "access_level": 1, "partnership_attiva": 1}
    ).to_list(20000):
        email = norm_email(c.get("email"))
        if email:
            clients[email] = c
    proposte_by: dict = {}
    for p in await db.proposte.find(
        {}, {"_id": 0, "prospect_email": 1, "scadenza": 1, "stato": 1, "creato_at": 1}
    ).to_list(20000):
        email = norm_email(p.get("prospect_email"))
        if email:
            proposte_by.setdefault(email, []).append(p)
    blueprints = {b.get("session_token"): b for b in await db.ciak_blueprints.find({"session_token": {"$in": tokens}}).to_list(5000)}
    invited = {norm_email(i.get("email")) for i in await db.insider_invites.find({"email": {"$in": list(chosen)}}).to_list(5000)}

    out = []
    for email, s in chosen.items():
        if email in invited:
            continue
        proposta = _pick_proposta(proposte_by.get(email, []))
        if has_bought(clients.get(email), proposta):
            continue
        ref = reference(s, proposta, blueprints.get(s.get("session_token")))
        if not ref:
            continue
        path, when = ref
        if when > now:
            continue
        out.append({
            "email": email,
            "nome": s.get("user_name"),
            "path": path,
            "riferimento": when.isoformat(),
            "session_token": s.get("session_token"),
        })
    out.sort(key=lambda c: c["riferimento"])
    return out


def _mask(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"


def _max_per_run(explicit: Optional[int]) -> int:
    if explicit:
        return int(explicit)
    try:
        value = int(os.environ.get(MAX_PER_RUN_ENV, DEFAULT_MAX_PER_RUN))
    except ValueError:
        value = DEFAULT_MAX_PER_RUN
    return max(1, value)


async def _default_emit(email, event_name, first_name=None, metadata=None, extra_tags=None) -> bool:
    from services.ciak_systeme import ciak_emit_event
    return await ciak_emit_event(email, event_name, extra_tags=extra_tags, first_name=first_name, metadata=metadata)


async def _emit_safe(emit, email, nome, metadata) -> bool:
    try:
        return bool(await emit(email, EVENT_TAG, first_name=nome, metadata=metadata))
    except Exception as exc:  # noqa: BLE001 - un contatto che fallisce non ferma il giro
        logger.warning("[INSIDER] invito fallito per %s: %s", _mask(email), exc)
        return False


async def invita_insider(db, emit=None, now: Optional[datetime] = None,
                         dry_run: Optional[bool] = None, max_per_run: Optional[int] = None) -> dict:
    """Individua i candidati e, solo con il flag acceso, applica il tag d'invito su Systeme."""
    if db is None:
        return {"error": "no_db", "dry_run": True, "candidati": 0, "inviati": 0, "errori": 0, "riprovati": 0}
    now = now or datetime.now(timezone.utc)
    enabled = os.environ.get(FLAG_ENV) == "1"
    dry = (not enabled) if dry_run is None else bool(dry_run)
    motivo = None
    if not enabled and dry_run is False:
        dry, motivo = True, "flag_spento"  # non si invia mai a flag spento, nemmeno se richiesto

    try:
        candidati = await trova_candidati(db, now)
    except Exception as exc:  # noqa: BLE001
        logger.error("[INSIDER] lettura candidati fallita: %s", exc)
        return {"error": str(exc), "dry_run": dry, "candidati": 0, "inviati": 0, "errori": 0, "riprovati": 0}

    result = {
        "dry_run": dry,
        "candidati": len(candidati),
        "per_path": dict(Counter(c["path"] for c in candidati)),
        "esempi": [_mask(c["email"]) for c in candidati[:5]],
        "inviati": 0, "riprovati": 0, "errori": 0,
    }
    if motivo:
        result["motivo"] = motivo
    if dry:
        return result

    emit = emit or _default_emit
    try:
        await db.insider_invites.create_index("email", unique=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning("[INSIDER] indice non creato: %s", exc)

    budget = _max_per_run(max_per_run)

    # 1. riprova chi era fallito (al massimo MAX_ATTEMPTS volte in tutto)
    failed = await db.insider_invites.find({"status": "failed", "attempts": {"$lt": MAX_ATTEMPTS}}).to_list(100)
    for doc in failed:
        if budget <= 0:
            break
        ok = await _emit_safe(emit, doc["email"], doc.get("nome"), {"path": doc.get("path"), "riprova": True})
        await db.insider_invites.update_one(
            {"email": doc["email"]},
            {"$set": {"status": "applied" if ok else "failed", "attempts": int(doc.get("attempts", 0)) + 1,
                      **({"applied_at": now.isoformat()} if ok else {})}},
        )
        result["riprovati"] += 1
        result["errori"] += 0 if ok else 1
        budget -= 1

    # 2. nuovi inviti: prima si registra (email unica), poi si applica il tag
    from pymongo.errors import DuplicateKeyError

    for c in candidati:
        if budget <= 0:
            break
        try:
            await db.insider_invites.insert_one({
                "email": c["email"], "nome": c["nome"], "path": c["path"], "riferimento": c["riferimento"],
                "status": "pending", "attempts": 0, "created_at": now.isoformat(),
            })
        except DuplicateKeyError:
            continue  # gia' invitato da un altro giro in parallelo
        ok = await _emit_safe(emit, c["email"], c["nome"], {"path": c["path"], "riferimento": c["riferimento"]})
        await db.insider_invites.update_one(
            {"email": c["email"]},
            {"$set": {"status": "applied" if ok else "failed", "attempts": 1,
                      **({"applied_at": now.isoformat()} if ok else {})}},
        )
        result["inviati" if ok else "errori"] += 1
        budget -= 1

    logger.info("[INSIDER] giro: %s", {k: v for k, v in result.items() if k != "esempi"})
    return result
```

- [ ] **Step 4: Verifica che passi**

Run: `cd backend && MONGO_URL=mongodb://localhost:27017 DB_NAME=ciak_ci JWT_SECRET_KEY=ci-test-secret APP_ENV=test python -m pytest -q tests/test_ciak_insider_invites.py`
Expected: PASS (tutti). Se un test fallisce, correggere l'implementazione, non il test, salvo errore evidente nel test.

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_insider_invites.py backend/tests/test_ciak_insider_invites.py
git commit -m "feat(insider): invito con registro, tetto per giro, riprova e conta a secco"
```

---

### Task 3: Endpoint, job giornaliero e CI

**Files:**
- Modify: `backend/routers/ciak_clients.py` (dopo `bonus_reminder_run`, circa riga 1297-1308)
- Modify: `backend/scheduler.py` (funzione dopo `trigger_bonus_guida_reminder`, circa riga 112-133; registrazione dopo il job `bonus_guida_reminder`, circa riga 515-522)
- Modify: `.github/workflows/ci.yml` (lista test backend, accanto a `tests/test_proposta_chat.py`)

**Interfaces:**
- Consumes: `invita_insider(db, dry_run=...)` del Task 2.
- Produces: `POST /api/ciak/client/insider-invites/run?dry_run=<bool>` protetto da `require_admin_or_report_key`; job `trigger_insider_invites` ogni giorno alle 10:30.

- [ ] **Step 1: Aggiungi l'endpoint**

In `backend/routers/ciak_clients.py`, subito dopo la funzione `bonus_reminder_run`, aggiungi:

```python
@router.post("/insider-invites/run")
async def insider_invites_run(dry_run: Optional[bool] = None, _auth=Depends(require_admin_or_report_key)):
    """Innescato ogni giorno dallo scheduler (X-Report-Key): invita a Evolution Insider chi ha
    gia' interagito e non ha acquistato. Spento finche' INSIDER_INVITES_ENABLED != "1": spento,
    conta soltanto. `?dry_run=true` conta senza inviare, anche a flag acceso. Vedi
    services/ciak_insider_invites e docs/superpowers/specs/2026-10-01-evolution-insider-community-design.md."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database non configurato")
    from services.ciak_insider_invites import invita_insider

    return await invita_insider(db, dry_run=dry_run)
```

Verifica che `Optional` sia già importato in quel file: `grep -n "^from typing import" backend/routers/ciak_clients.py`. Se manca `Optional`, aggiungilo all'import.

- [ ] **Step 2: Aggiungi il job**

In `backend/scheduler.py`, dopo `trigger_bonus_guida_reminder`, aggiungi:

```python
def trigger_insider_invites():
    """Ogni giorno — invita a Evolution Insider chi ha gia' interagito e non ha acquistato.
    Il servizio e' spento finche' INSIDER_INVITES_ENABLED != "1" (spento, conta soltanto)
    e invita al massimo 25 persone per giro. Idempotente: una sola volta per persona."""
    try:
        chiave = os.environ.get("LUCA_REPORT_KEY", "")
        if not chiave:
            logger.error("[SCHEDULER] Insider invites saltato: LUCA_REPORT_KEY non configurata")
            return
        r = httpx.post(
            f"{BASE_URL}/ciak/client/insider-invites/run",
            headers={"X-Report-Key": chiave},
            timeout=120,
        )
        if r.status_code >= 400:
            logger.error(f"[SCHEDULER] Insider invites: HTTP {r.status_code} {r.text[:200]}")
            return
        res = r.json()
        logger.info(f"[SCHEDULER] Insider invites — candidati {res.get('candidati', 0)}, "
                    f"inviati {res.get('inviati', 0)}, errori {res.get('errori', 0)}, "
                    f"a secco {res.get('dry_run')}")
    except Exception as e:
        logger.error(f"[SCHEDULER] Errore trigger_insider_invites: {e}")
```

Subito dopo il blocco `scheduler.add_job(trigger_bonus_guida_reminder, ...)`, aggiungi:

```python
    # EVOLUTION INSIDER — ogni giorno alle 10:30: inviti alla community per chi non ha
    # acquistato. Spento finche' INSIDER_INVITES_ENABLED != "1".
    scheduler.add_job(
        trigger_insider_invites,
        CronTrigger(hour=10, minute=30),
        id="insider_invites",
        replace_existing=True
    )
```

- [ ] **Step 3: Aggiungi il test alla CI**

In `.github/workflows/ci.yml`, nella lista dei test backend, sotto la riga `tests/test_proposta_chat.py` aggiungi (stessa indentazione):

```
          tests/test_ciak_insider_invites.py
```

- [ ] **Step 4: Verifica sintassi e test**

Run:
```bash
cd backend && python -m py_compile routers/ciak_clients.py scheduler.py services/ciak_insider_invites.py && MONGO_URL=mongodb://localhost:27017 DB_NAME=ciak_ci JWT_SECRET_KEY=ci-test-secret APP_ENV=test python -m pytest -q tests/test_ciak_insider_invites.py tests/test_proposta_chat.py tests/test_ciak_bonus_reminder.py
```
Expected: compilazione senza errori; test verdi.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_clients.py backend/scheduler.py .github/workflows/ci.yml
git commit -m "feat(insider): endpoint e job giornaliero degli inviti (spenti finche' il flag non e' acceso)"
```

---

### Task 4: Pull request e conta a secco in produzione

**Files:** nessuno nuovo.

- [ ] **Step 1: Apri la PR** dal branch di lavoro, senza mergiare. Corpo: cosa fa, che è spento di default, cosa NON è verificato (invio reale su Systeme, flusso completo), il link al disegno.
- [ ] **Step 2: Dopo il merge e il deploy, esegui la conta a secco.** L'endpoint richiede un token admin: Claudio indica il percorso del file che lo contiene (regola «Token via file»; io non lo cerco da sola). Si legge il token da quel file e si lancia `POST https://www.ciak.io/api/ciak/client/insider-invites/run?dry_run=true` con l'intestazione `Authorization: Bearer`, costruendo il comando con il percorso reale al momento. Si usa `www.ciak.io`, perché `ciak.io` reindirizza e perde l'intestazione.
- [ ] **Step 3: Leggi il risultato** (`candidati`, `per_path`, `esempi` mascherati) e riferiscilo a Claudio: è la dimensione reale del primo lotto e la risposta alla domanda «quanti rientrano?». Nessun invio avviene in questo passo.

---

### Task 5: Oggetti su Systeme (tutto disattivato)

Strumenti Systeme (MCP) da caricare con ToolSearch al momento: `create_tag`, `get_tags`, `create_classic_course`, `create_course_module`, `create_classic_lecture`, `get_course`, `create_workflow`, `create_workflow_step`, `get_workflow`, `get_workflow_steps`, `create_funnel`, `create_funnel_step`, `describe_funnel_page_schema`, `describe_page_edit_guide`, `save_funnel_page_content`, `create_newsletter`, `create_contact`, `assign_contact_tag`, `remove_contact`. Gli schemi si leggono prima di usarli: non si indovinano i parametri.

- [ ] **Step 1: Crea i tag** `insider_invito`, `insider_invitato`, `insider_membro` (`create_tag`; poi `get_tags` con `query: "insider"` per verificare che esistano tutti e tre, senza doppioni).
- [ ] **Step 2: Crea l'area membri «Evolution Insider»** con `create_classic_course` (non attiva) e i moduli «Parti da qui», «Percorso di lettura», «Strumenti». Verifica con `get_course`. Contenuti: solo materiali già esistenti (Blueprint spiegato, masterclass, articoli del blog in ordine di lettura). **Non** inserire la guida bonus 48h.
- [ ] **Step 2b: Verifica se esiste una funzione «community»** negli strumenti: se non c'è, dichiaralo a Claudio e proponi l'area membri come sostituto, indicando cosa fare dall'interfaccia (abilitare la sezione community del corso) in elenco puntato.
- [ ] **Step 3: Pagina d'iscrizione con consenso.** Leggi `describe_funnel_page_schema` e `describe_page_edit_guide`. Se il modulo supporta una casella di consenso con link alla privacy, crea il funnel «Evolution Insider — iscrizione» (non pubblicato) con il campo email e la casella «Acconsento a ricevere materiali e aggiornamenti da Evolution PRO» + link alla privacy; l'invio applica `insider_membro` e iscrive al corso. Se gli strumenti non lo permettono, fermati e consegna a Claudio le istruzioni passo-passo per l'interfaccia, con il testo esatto.
- [ ] **Step 4: Verifica** rileggendo ogni oggetto creato (`get_*`) e annota gli ID in un file locale (non nel repo).

---

### Task 6: Email (gate di approvazione di Claudio)

**Files:**
- Create: `docs/marketing/evolution-insider-email.md`

- [ ] **Step 1: Scrivi le bozze** nella voce di Claudio (registro scritto: dai del tu, frasi corte, niente anglicismi, niente promesse di risultati, niente urgenze finte): **invito**, **promemoria** (uno solo, a 3 giorni), **benvenuto** (con il primo materiale), **uscita per acquisto**, e **tre numeri settimanali** di avvio (ognuno: un articolo reale del blog, un video reale, un materiale della biblioteca). Gli articoli si scelgono dall'elenco reale in `evolution-pro-site/blog-build/content.mjs`, i video dal canale reale: nessun titolo inventato.
- [ ] **Step 2: Ogni email** ha oggetto, anteprima, corpo, e la riga di disiscrizione. L'invito dice chiaramente chi scrive, perché arriva (hai ricevuto il tuo Blueprint / hai compilato il questionario), cosa si riceve e che l'iscrizione è facoltativa.
- [ ] **Step 3: Consegna a Claudio** per l'approvazione. **Niente passa al Task 7 senza il suo ok esplicito sul testo.** Commit del file dopo l'approvazione.

---

### Task 7: Workflow su Systeme (disattivati)

- [ ] **Step 1: Workflow «Evolution Insider — Invito»**: trigger = tag `insider_invito` aggiunto → email d'invito (testo approvato) → attesa 3 giorni → se NON ha il tag `insider_membro`, un solo promemoria → fine. Crea con `create_workflow` + `create_workflow_step` leggendo prima lo schema reale; resta **non attivo**. Verifica con `get_workflow_steps`.
- [ ] **Step 2: Workflow «Evolution Insider — Benvenuto»**: trigger = tag `insider_membro` → email di benvenuto con il primo materiale. Disattivato.
- [ ] **Step 3: Uscita per acquisto**: quando compare uno dei tag di acquisto (`ciak_bought_*`, `contratto_firmato`, `partner_attivo`, il tag di Start) la persona esce dalla sequenza e si rimuove `insider_membro` dalla newsletter. Leggi i nomi reali dei tag con `get_tags` (query «bought», «partner», «contratto») prima di collegarli. Disattivato.
- [ ] **Step 4: Newsletter settimanale** `create_newsletter` con i tre numeri di avvio approvati, destinata al tag `insider_membro`, **non programmata**.
- [ ] **Step 5: Verifica** con `get_workflows`, `get_workflow_steps`, `get_newsletter`: tutto presente, tutto non attivo. Riporta a Claudio l'elenco.

---

### Task 8: Collaudo su contatto di prova e partenza controllata

- [ ] **Step 1: Contatto di prova.** Crea con `create_contact` un contatto con un indirizzo di Claudio (un alias `+prova`), dati sporchi inclusi (email con maiuscole). Attiva **solo** i workflow necessari al collaudo, solo per quel contatto, poi ridisattiva.
- [ ] **Step 2: Percorso completo.** Applica `insider_invito` (`assign_contact_tag`) → arriva l'invito → iscrizione dalla pagina con consenso → arriva il benvenuto e compare `insider_membro` → arriva il primo numero → applica un tag di acquisto → esce dalla sequenza → prova la disiscrizione. Registra ogni passo con prova (email ricevuta, tag letto con `get_contact`).
- [ ] **Step 3: Pulizia.** Rimuovi il contatto di prova (`remove_contact`) e rimetti tutto in stato non attivo, salvo i workflow che Claudio decide di accendere.
- [ ] **Step 3b: Prima di accendere il flag, correggi i due punti rimasti aperti dalla revisione finale** (registrati con la loro motivazione, non bloccano il merge perché con il flag spento nulla parte): (1) il «claim» delle riprove non è esclusivo per un invito già in stato `retrying`: due giri sovrapposti dopo un crash possono mandare due inviti; aggiungere `claimed_at` al filtro del claim, con un test in cui il documento viene riacquisito tra la lettura e il claim. (2) la lettura delle sessioni `call_booked` deve fermare il giro al limite (come clienti, proposte e partner), non solo avvisare. Dopo una nuova revisione mirata.
- [ ] **Step 4: Partenza controllata.** Con l'ok di Claudio: attiva i workflow; imposta su Cloud Run `INSIDER_INVITES_ENABLED=1` (il tetto di default è già 10 al giorno); guarda consegna, aperture e disiscrizioni per una settimana prima di alzare `INSIDER_INVITES_MAX_PER_RUN` (massimo 25). Rollback: `INSIDER_INVITES_ENABLED=` (vuoto) e disattivare i workflow.

---

### Task 9: Memoria e chiusura

- [ ] **Step 1:** Aggiorna `ciak_evolution_insider_community_systeme.md` nella memoria con lo stato (PR, dimensioni del lotto, esito del collaudo, decisioni di Claudio sulle email).
- [ ] **Step 2:** Segna come chiusa la sezione «Ancora da verificare» del disegno con i risultati reali.

---

## Self-Review

**Copertura del disegno:** chi/quando (Task 1-2), invito unico e registro (Task 2), flag spento + tetto 25 (Task 2-3), consenso con iscrizione (Task 5 step 3, Task 7), biblioteca v1 senza guida bonus (Task 5 step 2), email nella voce di Claudio con approvazione (Task 6), uscita per acquisto (Task 7 step 3), newsletter settimanale (Task 7 step 4), misura (Task 8 step 4 + Task 9), collaudo su contatto di prova con dati sporchi (Task 8), rischio consenso (Task 6 step 2: l'invito dichiara perché arriva; resta la validazione del consulente, da chiedere a Claudio prima del Task 8 step 4).
**Lacune dichiarate:** la validazione legale del primo invito non è un compito del piano: è una condizione per l'accensione. La funzione «community» di Systeme e la pagina con consenso dipendono da ciò che gli strumenti permettono (Task 5 step 2b e 3 hanno l'alternativa esplicita).
**Coerenza dei nomi:** `trova_candidati`, `invita_insider`, `reference`, `has_bought`, `PATH_*`, `EVENT_TAG`, `FLAG_ENV`, `MAX_PER_RUN_ENV` sono usati con lo stesso nome in Task 1, 2 e 3.
