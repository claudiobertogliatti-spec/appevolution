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
