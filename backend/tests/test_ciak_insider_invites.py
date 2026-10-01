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
    assert ins.has_bought({}, {"stato": "pagamento_in_attesa_verifica"})
    assert ins.has_bought({}, {"stato": "finalizzazione_in_corso"})
    assert ins.has_bought({}, {"stato": "scaduta", "pagamento_completato": True})
    assert not ins.has_bought({}, {"stato": "accettata"})
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


def test_primo_nome_estrae_prima_parola():
    assert ins.primo_nome("Anna Maria Rossi") == "Anna"
    assert ins.primo_nome("  Luca ") == "Luca"
    assert ins.primo_nome("") is None
    assert ins.primo_nome(None) is None
    assert ins.primo_nome("   ") is None
    assert ins.primo_nome("Giovanni") == "Giovanni"
    assert ins.primo_nome(123) is None


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
                if op == "$gte" and not (actual is not None and actual >= operand):
                    return False
                if op == "$ne" and actual == operand:
                    return False
        elif actual != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, n):
        return [dict(d) for d in self.docs[:n]]


class _UpdateResult:
    def __init__(self, matched_count):
        self.matched_count = matched_count


class FakeCollection:
    def __init__(self, docs=None, unique=None):
        self.docs = [dict(d) for d in (docs or [])]
        self.unique = unique
        self.fail_insert = None
        self.fail_index = None
        self.before_update = None  # hook: simula un altro giro che cambia il doc prima del claim

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _match(d, query or {})])

    async def insert_one(self, doc):
        if self.fail_insert:
            raise self.fail_insert
        if self.unique and any(d.get(self.unique) == doc.get(self.unique) for d in self.docs):
            raise DuplicateKeyError("duplicato")
        self.docs.append(dict(doc))

    async def update_one(self, query, update):
        if self.before_update:
            hook, self.before_update = self.before_update, None
            hook(self)
        for d in self.docs:
            if _match(d, query):
                d.update(update.get("$set", {}))
                return _UpdateResult(1)
        return _UpdateResult(0)

    async def create_index(self, *args, **kwargs):
        if self.fail_index:
            raise self.fail_index
        return "ok"


class FakeDb:
    def __init__(self, sessions=(), clients=(), proposte=(), blueprints=(), invites=(), partners=()):
        self.diagnostic_sessions = FakeCollection(sessions)
        self.ciak_clients = FakeCollection(clients)
        self.proposte = FakeCollection(proposte)
        self.ciak_blueprints = FakeCollection(blueprints)
        self.partners = FakeCollection(partners)
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


async def test_email_non_valida_scartata_e_ordine_dal_piu_recente():
    db = FakeDb(sessions=[
        _session("report_generated", "nuovo@example.com", days_ago=16, token="t1"),
        _session("report_generated", "vecchio@example.com", days_ago=60, token="t2"),
        _session("report_generated", "rotta", days_ago=60, token="t3"),
    ])
    out = await ins.trova_candidati(db, NOW)
    assert [c["email"] for c in out] == ["nuovo@example.com", "vecchio@example.com"]


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
    assert emit.calls[0]["first_name"] == "Anna"
    assert {d["status"] for d in db.insider_invites.docs} == {"applied"}
    second = await ins.invita_insider(db, emit=emit, now=NOW)
    assert second["inviati"] == 0 and len(emit.calls) == 2


async def test_tetto_per_giro_e_il_resto_al_giorno_dopo(flag_on, monkeypatch):
    monkeypatch.delenv(ins.MAX_PER_RUN_ENV, raising=False)
    db = FakeDb(sessions=_many(25))
    emit = Emitter()
    first = await ins.invita_insider(db, emit=emit, now=NOW)
    assert first["inviati"] == ins.DEFAULT_MAX_PER_RUN == 10
    # stesso giorno UTC: il tetto e' giornaliero, niente di nuovo
    same_day = await ins.invita_insider(db, emit=emit, now=NOW + timedelta(hours=2))
    assert same_day["inviati"] == 0 and same_day["motivo"] == "tetto_giornaliero_raggiunto"
    second = await ins.invita_insider(db, emit=emit, now=NOW + timedelta(days=1))
    assert second["inviati"] == 10 and len({c["email"] for c in emit.calls}) == 20


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


# ───────────────────────── Fix Round 1 ─────────────────────────
async def test_pending_stale_e_riemesso_giovane_ignorato(flag_on):
    """Una pending doc creata 30 min fa viene ri-emessa; una creata 2 min fa e ignorata."""
    db = FakeDb(
        sessions=[_session("report_generated", "p00@example.com", days_ago=30, token="t00"),
                  _session("report_generated", "p01@example.com", days_ago=30, token="t01")],
        invites=[
            {"email": "p00@example.com", "status": "pending", "attempts": 0, "created_at": _iso(0.5), "nome": "Anna Rossi"},
            {"email": "p01@example.com", "status": "pending", "attempts": 0, "created_at": _iso(0.004), "nome": "Bob Smith"},
        ],
    )
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    # Solo la stale (30 min fa) deve essere riemessa
    assert out["riprovati"] == 1 and out["inviati"] == 0
    assert len(emit.calls) == 1 and emit.calls[0]["email"] == "p00@example.com"
    assert db.insider_invites.docs[0]["attempts"] == 1 and db.insider_invites.docs[0]["status"] == "applied"
    # La giovane non e toccata
    assert db.insider_invites.docs[1]["status"] == "pending" and db.insider_invites.docs[1]["attempts"] == 0


async def test_retry_esclude_chi_ha_acquistato_nel_frattempo(flag_on):
    """Una failed doc per chi ha comprato nel frattempo diventa 'annullato' senza emit."""
    db = FakeDb(
        sessions=_many(1),
        clients=[{"email": "p00@example.com", "access_level": "cliente_start"}],
        invites=[
            {"email": "p00@example.com", "status": "failed", "attempts": 1, "nome": "Anna Rossi", "path": "questionario_senza_call"},
        ],
    )
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert out["riprovati"] == 0 and out["inviati"] == 0 and len(emit.calls) == 0
    assert db.insider_invites.docs[0]["status"] == "annullato"


async def test_retry_con_emitter_fallito_poi_successo(flag_on):
    """Retry con False poi True: attempts=2, status=applied."""
    db = FakeDb(
        sessions=_many(1),
        invites=[
            {"email": "p00@example.com", "status": "failed", "attempts": 0, "nome": "Anna Rossi", "path": "questionario_senza_call"},
        ],
    )
    emit = Emitter(results=[False, True])
    r1 = await ins.invita_insider(db, emit=emit, now=NOW)
    assert r1["riprovati"] == 1 and r1["errori"] == 1
    assert db.insider_invites.docs[0]["attempts"] == 1 and db.insider_invites.docs[0]["status"] == "failed"

    r2 = await ins.invita_insider(db, emit=emit, now=NOW)
    assert r2["riprovati"] == 1 and r2["inviati"] == 0
    assert db.insider_invites.docs[0]["attempts"] == 2 and db.insider_invites.docs[0]["status"] == "applied"


# ───────────────────────── Fix Round 2 ─────────────────────────
async def test_trova_candidati_exception_skip_retry_non_cancella(flag_on, monkeypatch):
    """Se trova_candidati(escludi_invitati=False) raises, retry è saltato; failed doc resta failed."""
    db = FakeDb(
        sessions=_many(1),
        invites=[
            {"email": "p00@example.com", "status": "failed", "attempts": 1, "nome": "Anna Rossi", "path": "questionario_senza_call"},
        ],
    )
    emit = Emitter()

    original_trova = ins.trova_candidati
    async def broken_trova(db, now=None, escludi_invitati=True):
        if escludi_invitati is False:
            raise RuntimeError("DB temporary error")
        return await original_trova(db, now, escludi_invitati)

    monkeypatch.setattr(ins, "trova_candidati", broken_trova)
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    # Retry saltato: niente emit, doc stays failed
    assert out["riprovati"] == 0 and out["inviati"] == 0 and len(emit.calls) == 0
    assert db.insider_invites.docs[0]["status"] == "failed" and db.insider_invites.docs[0]["attempts"] == 1


async def test_invio_con_full_name_usa_primo_nome(flag_on):
    """Con user_name "Anna Maria Rossi", emit riceve first_name "Anna" e doc tiene full name."""
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=20, name="Anna Maria Rossi")])
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert out["inviati"] == 1
    assert emit.calls[0]["first_name"] == "Anna"
    assert db.insider_invites.docs[0]["nome"] == "Anna Maria Rossi"


# ───────────────────────── Final fix wave ─────────────────────────
@pytest.mark.parametrize("proposta", [
    {"stato": "pagamento_in_attesa_verifica"},
    {"stato": "finalizzazione_in_corso"},
    {"stato": "scaduta", "pagamento_completato": True},  # `stato` sovrascritto all'apertura oltre la scadenza
])
async def test_proposta_in_pagamento_o_pagata_esclude(proposta):
    db = FakeDb(sessions=[_session("call_done", "a@example.com", days_ago=12)],
                proposte=[{"prospect_email": "a@example.com", "scadenza": _iso(1), **proposta}])
    assert await ins.trova_candidati(db, NOW) == []


async def test_proposta_pagata_vince_su_quella_piu_recente():
    db = FakeDb(sessions=[_session("call_done", "a@example.com", days_ago=12)],
                proposte=[{"prospect_email": "a@example.com", "scadenza": _iso(1), "stato": "scaduta",
                           "pagamento_completato": True, "creato_at": _iso(20)},
                          {"prospect_email": "a@example.com", "scadenza": _iso(1), "stato": "scaduta", "creato_at": _iso(5)}])
    assert await ins.trova_candidati(db, NOW) == []


async def test_chi_e_partner_e_escluso_anche_con_maiuscole():
    db = FakeDb(sessions=[_session("report_generated", "anna@example.com", days_ago=30)],
                partners=[{"email": "ANNA@Example.com"}])
    assert await ins.trova_candidati(db, NOW) == []


async def test_seconda_sessione_call_booked_esclude_la_persona():
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=30, token="t1"),
                          _session("call_booked", "A@example.com", days_ago=2, token="t2")])
    assert await ins.trova_candidati(db, NOW) == []


async def test_riferimento_troppo_vecchio_escluso_e_ordine_recente_prima():
    # riferimento = report + 14 giorni: 214 giorni fa -> 200 giorni di eta', 184 -> 170 giorni
    db = FakeDb(sessions=[
        _session("report_generated", "vecchio@example.com", days_ago=214, token="t1"),
        _session("report_generated", "ok170@example.com", days_ago=184, token="t2"),
        _session("report_generated", "ok20@example.com", days_ago=34, token="t3"),
    ])
    out = await ins.trova_candidati(db, NOW)
    assert [c["email"] for c in out] == ["ok20@example.com", "ok170@example.com"]


async def test_eta_massima_configurabile_con_la_variabile(monkeypatch):
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=60)])
    monkeypatch.setenv(ins.MAX_AGE_DAYS_ENV, "30")
    assert await ins.trova_candidati(db, NOW) == []
    monkeypatch.setenv(ins.MAX_AGE_DAYS_ENV, "testo")  # non valido -> default 180
    assert len(await ins.trova_candidati(db, NOW)) == 1


@pytest.mark.parametrize("collection", ["clients", "proposte", "partners"])
async def test_lettura_al_limite_ferma_tutto(flag_on, monkeypatch, collection):
    monkeypatch.setattr(ins, "READ_LIMIT_OTHERS", 2)
    fill = {"clients": [{"email": "x1@example.com"}, {"email": "x2@example.com"}],
            "proposte": [{"prospect_email": "x1@example.com"}, {"prospect_email": "x2@example.com"}],
            "partners": [{"email": "x1@example.com"}, {"email": "x2@example.com"}]}
    db = FakeDb(sessions=_many(2), **{collection: fill[collection]})
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert "limite di lettura raggiunto" in out["error"] and emit.calls == [] and out["inviati"] == 0


async def test_lettura_sessioni_al_limite_avvisa_ma_non_ferma(monkeypatch, caplog):
    monkeypatch.setattr(ins, "READ_LIMIT_SESSIONS", 2)
    db = FakeDb(sessions=_many(2))
    with caplog.at_level("WARNING"):
        out = await ins.trova_candidati(db, NOW)
    assert len(out) == 2 and "massimo di sessioni" in caplog.text


# ---- tetto giornaliero ----
async def test_il_tetto_e_giornaliero_non_per_giro(flag_on):
    db = FakeDb(sessions=_many(10))
    emit = Emitter()
    a = await ins.invita_insider(db, emit=emit, now=NOW, max_per_run=3)
    b = await ins.invita_insider(db, emit=emit, now=NOW, max_per_run=3)
    assert a["inviati"] == 3 and b["inviati"] == 0 and b["motivo"] == "tetto_giornaliero_raggiunto"
    assert len(emit.calls) == 3
    c = await ins.invita_insider(db, emit=emit, now=NOW + timedelta(days=1), max_per_run=3)
    assert c["inviati"] == 3 and len(emit.calls) == 6
    assert all(d["last_attempt_at"] for d in db.insider_invites.docs)


async def test_annullato_non_conta_nel_tetto_giornaliero(flag_on):
    db = FakeDb(sessions=_many(5), invites=[
        {"email": "gone@example.com", "status": "annullato", "attempts": 1, "last_attempt_at": NOW.isoformat()}])
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW, max_per_run=2)
    assert out["inviati"] == 2


# ---- retry atomico ----
async def test_claim_non_riuscito_non_emette(flag_on):
    db = FakeDb(sessions=_many(1), invites=[
        {"email": "p00@example.com", "status": "failed", "attempts": 1, "nome": "Anna Rossi", "path": ins.PATH_QUESTIONARIO}])

    def other_worker(coll):  # un altro giro ha gia' cambiato il doc tra lettura e claim
        coll.docs[0]["attempts"] = 2

    db.insider_invites.before_update = other_worker
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert emit.calls == [] and out["riprovati"] == 0 and out["errori"] == 0
    assert db.insider_invites.docs[0]["status"] == "failed"


async def test_retrying_giovane_si_lascia_stare_e_vecchio_si_riprova(flag_on):
    db = FakeDb(
        sessions=[_session("report_generated", "p00@example.com", days_ago=30, token="t0"),
                  _session("report_generated", "p01@example.com", days_ago=30, token="t1")],
        invites=[
            {"email": "p00@example.com", "status": "retrying", "attempts": 1, "nome": "A", "claimed_at": _iso(0.001)},
            {"email": "p01@example.com", "status": "retrying", "attempts": 1, "nome": "B", "claimed_at": _iso(0.5)},
        ])
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert [c["email"] for c in emit.calls] == ["p01@example.com"] and out["riprovati"] == 1
    assert db.insider_invites.docs[0]["status"] == "retrying"
    assert db.insider_invites.docs[1]["status"] == "applied" and db.insider_invites.docs[1]["attempts"] == 2


async def test_il_retry_registra_il_tentativo_di_oggi(flag_on):
    db = FakeDb(sessions=_many(1), invites=[
        {"email": "p00@example.com", "status": "failed", "attempts": 1, "nome": "Anna", "last_attempt_at": _iso(5)}])
    await ins.invita_insider(db, emit=Emitter(), now=NOW)
    assert db.insider_invites.docs[0]["last_attempt_at"] == NOW.isoformat()


# ---- tetto: valori ----
async def test_tetto_zero_da_variabile_non_invia_niente(flag_on, monkeypatch):
    monkeypatch.setenv(ins.MAX_PER_RUN_ENV, "0")
    emit = Emitter()
    out = await ins.invita_insider(FakeDb(sessions=_many(3)), emit=emit, now=NOW)
    assert out["inviati"] == 0 and emit.calls == [] and out["motivo"] == "tetto_zero"


async def test_tetto_zero_esplicito_non_invia_niente(flag_on):
    emit = Emitter()
    out = await ins.invita_insider(FakeDb(sessions=_many(3)), emit=emit, now=NOW, max_per_run=0)
    assert out["inviati"] == 0 and emit.calls == []


@pytest.mark.parametrize("raw,expected", [("500", 25), ("-3", 0), ("testo", 10), ("7", 7)])
def test_max_per_run_limitato(monkeypatch, raw, expected):
    monkeypatch.setenv(ins.MAX_PER_RUN_ENV, raw)
    assert ins._max_per_run(None) == expected


async def test_tetto_500_da_variabile_e_limitato_a_25(flag_on, monkeypatch):
    monkeypatch.setenv(ins.MAX_PER_RUN_ENV, "500")
    emit = Emitter()
    out = await ins.invita_insider(FakeDb(sessions=_many(40)), emit=emit, now=NOW)
    assert out["inviati"] == ins.HARD_MAX_PER_RUN == 25


# ---- errori non silenziosi / fail closed ----
async def test_errore_inatteso_del_db_non_solleva_e_viene_riportato(flag_on):
    db = FakeDb(sessions=_many(3))
    db.insider_invites.fail_insert = RuntimeError("mongo giu")
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert out["error"] == "mongo giu" and out["inviati"] == 0 and emit.calls == []


async def test_indice_non_creato_non_invia_niente(flag_on):
    db = FakeDb(sessions=_many(3))
    db.insider_invites.fail_index = RuntimeError("nope")
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert out["error"] == "indice_non_creato" and emit.calls == [] and db.insider_invites.docs == []


# ---- hardening: claim esclusivo su retrying e call_booked fail closed ----
async def test_retrying_vecchio_senza_interferenze_si_prende_in_carico_e_applica(flag_on):
    db = FakeDb(sessions=_many(1), invites=[
        {"email": "p00@example.com", "status": "retrying", "attempts": 1, "nome": "Anna", "path": ins.PATH_QUESTIONARIO,
         "claimed_at": _iso(30 / 1440)}])
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert len(emit.calls) == 1 and out["riprovati"] == 1
    doc = db.insider_invites.docs[0]
    assert doc["status"] == "applied" and doc["attempts"] == 2 and doc["claimed_at"] == NOW.isoformat()


async def test_retrying_gia_ripreso_da_un_altro_giro_non_si_emette_due_volte(flag_on):
    db = FakeDb(sessions=_many(1), invites=[
        {"email": "p00@example.com", "status": "retrying", "attempts": 1, "nome": "Anna", "path": ins.PATH_QUESTIONARIO,
         "claimed_at": _iso(30 / 1440)}])
    other_claim = (NOW - timedelta(seconds=1)).isoformat()

    def other_worker(coll):  # l'altro giro ripende il doc: stesso status e attempts, cambia solo claimed_at
        coll.docs[0]["claimed_at"] = other_claim

    db.insider_invites.before_update = other_worker
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert emit.calls == [] and out["riprovati"] == 0 and out["errori"] == 0
    doc = db.insider_invites.docs[0]
    assert doc["status"] == "retrying" and doc["attempts"] == 1 and doc["claimed_at"] == other_claim


async def test_claim_su_failed_senza_claimed_at_corrisponde_con_none(flag_on):
    db = FakeDb(sessions=_many(1), invites=[
        {"email": "p00@example.com", "status": "failed", "attempts": 1, "nome": "Anna", "path": ins.PATH_QUESTIONARIO}])
    assert "claimed_at" not in db.insider_invites.docs[0]
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert len(emit.calls) == 1 and out["riprovati"] == 1 and db.insider_invites.docs[0]["status"] == "applied"


async def test_call_booked_al_limite_ferma_tutto(flag_on, monkeypatch):
    monkeypatch.setattr(ins, "READ_LIMIT_SESSIONS", 2)
    booked = [_session("call_booked", f"b{i}@example.com", days_ago=2, token=f"b{i}") for i in range(2)]
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=30, token="t1")] + booked)
    with pytest.raises(RuntimeError, match="sessioni call_booked"):
        await ins.trova_candidati(db, NOW)
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert "limite di lettura raggiunto" in out["error"] and emit.calls == [] and out["inviati"] == 0
    assert db.insider_invites.docs == []


async def test_call_booked_sotto_il_limite_funziona_come_prima(flag_on, monkeypatch):
    monkeypatch.setattr(ins, "READ_LIMIT_SESSIONS", 3)
    booked = [_session("call_booked", f"b{i}@example.com", days_ago=2, token=f"b{i}") for i in range(2)]
    db = FakeDb(sessions=[_session("report_generated", "a@example.com", days_ago=30, token="t1"),
                          _session("report_generated", "b0@example.com", days_ago=30, token="t2")] + booked)
    emit = Emitter()
    out = await ins.invita_insider(db, emit=emit, now=NOW)
    assert [c["email"] for c in emit.calls] == ["a@example.com"] and out["inviati"] == 1
