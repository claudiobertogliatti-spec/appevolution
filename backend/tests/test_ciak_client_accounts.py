import asyncio

import pytest

from services.ciak_client_accounts import (
    START_AMOUNT_CENTS,
    create_magic_login_token,
    ensure_client_for_blueprint,
    offer_for_score,
    partnership_price_for_client,
    verify_magic_login_token,
    _score_from_session,
)


def test_numeric_blueprint_score_is_clamped_to_the_canonical_13_point_scale():
    assert _score_from_session({"scoring": {"score_numerico": 13}}) == 100
    assert _score_from_session({"scoring": {"score_numerico": 14}}) == 100
    assert _score_from_session({"scoring": {"score_numerico": 15}}) == 100

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                return self._project(doc, projection)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                for key, value in update.get("$set", {}).items():
                    doc[key] = value
                return {"matched_count": 1, "modified_count": 1}
        return {"matched_count": 0, "modified_count": 0}

    @staticmethod
    def _project(doc, projection):
        data = dict(doc)
        if projection and projection.get("_id") == 0:
            data.pop("_id", None)
        return data


class FakeDB:
    def __init__(self, diagnostic_sessions=None, ciak_analisi=None, ciak_clients=None):
        self.diagnostic_sessions = FakeCollection(diagnostic_sessions)
        self.ciak_analisi = FakeCollection(ciak_analisi)
        self.ciak_clients = FakeCollection(ciak_clients)
        self.ciak_client_login_tokens = FakeCollection()


class RacingTokenCollection(FakeCollection):
    def __init__(self, docs=None, parties=2):
        super().__init__(docs)
        self._parties = parties
        self._waiting = 0
        self._release = asyncio.Event()

    async def find_one(self, query, projection=None):
        result = await super().find_one(query, projection)
        if result and "token_hash" in query:
            self._waiting += 1
            if self._waiting >= self._parties:
                self._release.set()
            await self._release.wait()
        return result


def test_offer_for_score_routes_below_50_to_start():
    assert offer_for_score(49) == "ciak_start"
    assert offer_for_score(0) == "ciak_start"


def test_offer_for_score_routes_50_and_above_to_partnership():
    assert offer_for_score(50) == "partnership"
    assert offer_for_score(87) == "partnership"


def test_start_credit_amount_constant_is_499_euro():
    assert START_AMOUNT_CENTS == 39000


def test_partnership_price_applies_guaranteed_start_credit():
    client = {"access_level": "cliente_start", "start_credit_amount": 39000}
    price = partnership_price_for_client(client)
    assert price == {
        "full_amount_cents": 299000,
        "credit_amount_cents": 39000,
        "due_amount_cents": 260000,
        "currency": "eur",
    }


def test_partnership_price_retains_start_credit_after_partner_promotion():
    client = {"access_level": "partner", "start_credit_amount": 39000}
    price = partnership_price_for_client(client)
    assert price["credit_amount_cents"] == 39000
    assert price["due_amount_cents"] == 260000


def test_partnership_price_floors_start_credit_to_guaranteed_minimum():
    client = {"access_level": "cliente_start", "start_credit_amount": 1200}
    price = partnership_price_for_client(client)
    assert price["credit_amount_cents"] == 39000
    assert price["due_amount_cents"] == 260000


def test_partnership_price_does_not_grant_credit_to_unrelated_partner():
    price = partnership_price_for_client({"access_level": "partner"})
    assert price["due_amount_cents"] == 299000
    assert price["credit_amount_cents"] == 0


def test_partnership_price_without_start_is_full_price():
    price = partnership_price_for_client({"access_level": "cliente_blueprint"})
    assert price["due_amount_cents"] == 299000
    assert price["credit_amount_cents"] == 0


@pytest.mark.asyncio
async def test_ensure_client_for_blueprint_uses_persisted_diagnostic_and_analysis_data():
    db = FakeDB(
        diagnostic_sessions=[
            {
                "session_token": "tok-1",
                "user_email": "persisted@example.com",
                "user_name": "Persisted Name",
                "completed_at": "2026-06-30T10:00:00+00:00",
                "current_state": "report_generated",
                "responses": {"q1_competenza": "Video strategy"},
                "report": {"headline": "Strong fit"},
                "tracking": {"campaign": "summer"},
                "scoring": {"score_percentuale": 72},
            }
        ],
        ciak_analisi=[
            {
                "session_token": "tok-1",
                "stato": "inviata",
                "generated_at": "2026-06-30T11:00:00+00:00",
                "bozza_inviata_at": "2026-06-30T12:00:00+00:00",
                "analisi_definitiva": {"titolo": "Analisi Ciak"},
                "script_call": {"secret": True},
            }
        ],
    )

    client = await ensure_client_for_blueprint(
        db,
        {
            "session_token": "tok-1",
            "user_email": "fallback@example.com",
            "user_name": "Fallback Name",
            "scoring": {"score_percentuale": 15},
        },
    )

    assert client["email"] == "persisted@example.com"
    assert client["name"] == "Persisted Name"
    assert client["blueprint_score"] == 72
    assert client["recommended_offer"] == "partnership"
    assert client["diagnostic_current_state"] == "report_generated"
    assert client["diagnostic_report"] == {"headline": "Strong fit"}
    assert client["diagnostic_responses"] == {"q1_competenza": "Video strategy"}
    assert client["diagnostic_tracking"] == {"campaign": "summer"}
    assert client["analysis_status"] == "inviata"
    assert client["analysis_title"] == "Analisi Ciak"
    assert client["analysis_publicly_available"] is True
    assert "script_call" not in client


@pytest.mark.asyncio
async def test_ensure_client_for_blueprint_updates_existing_client_by_email():
    db = FakeDB(
        diagnostic_sessions=[
            {
                "session_token": "tok-2",
                "user_email": "client@example.com",
                "user_name": "Updated Client",
                "responses": {"q1_competenza": "Branding"},
                "scoring": {"score_percentuale": 45},
            }
        ],
        ciak_clients=[
            {
                "id": "client-1",
                "email": "client@example.com",
                "name": "Original Client",
                "access_level": "cliente_blueprint",
                "start_credit_amount": 0,
                "created_at": "2026-06-01T09:00:00+00:00",
            }
        ],
    )

    client = await ensure_client_for_blueprint(db, {"session_token": "tok-2"})

    assert client["id"] == "client-1"
    assert len(db.ciak_clients.docs) == 1
    assert client["name"] == "Updated Client"
    assert client["diagnostic_responses"] == {"q1_competenza": "Branding"}
    assert client["recommended_offer"] == "ciak_start"


@pytest.mark.asyncio
async def test_verify_magic_login_token_leaves_token_unused_when_client_missing():
    db = FakeDB()
    token_data = await create_magic_login_token(db, "missing-client", "user@example.com")

    with pytest.raises(ValueError, match="cliente non trovato"):
        await verify_magic_login_token(db, token_data["token"])

    stored = db.ciak_client_login_tokens.docs[0]
    assert stored["used_at"] is None


@pytest.mark.asyncio
async def test_verify_magic_login_token_allows_reuse_within_validity():
    # Il link e' RIUTILIZZABILE entro la validita' (30gg): la stessa persona puo'
    # riaprirlo piu' volte (leggo il Blueprint, ci penso, torno a pagare) senza che
    # si "bruci" al primo uso. Due accessi con lo stesso token, anche concorrenti,
    # riescono entrambi.
    db = FakeDB(
        ciak_clients=[
            {
                "id": "client-1",
                "email": "user@example.com",
                "name": "Client",
                "access_level": "cliente_blueprint",
            }
        ]
    )
    db.ciak_client_login_tokens = RacingTokenCollection()
    token_data = await create_magic_login_token(db, "client-1", "user@example.com")

    results = await asyncio.gather(
        verify_magic_login_token(db, token_data["token"]),
        verify_magic_login_token(db, token_data["token"]),
        return_exceptions=True,
    )

    successes = [result for result in results if isinstance(result, dict)]
    failures = [result for result in results if isinstance(result, Exception)]

    assert [result["id"] for result in successes] == ["client-1", "client-1"]
    assert failures == []


def test_ruolo_contatto_distingue_lead_cliente_start_e_partner():
    from services.ciak_client_accounts import ruolo_contatto

    assert ruolo_contatto(None)["tipo"] == "lead"
    # Account creato dal Blueprint gratuito: ha ricevuto un PDF, non ha pagato.
    assert ruolo_contatto({"access_level": "cliente_blueprint"})["tipo"] == "lead"
    start = ruolo_contatto({"access_level": "cliente_start", "start_purchased_at": "2026-10-01T07:02:00+00:00"})
    assert start["tipo"] == "cliente_start" and "2026-10-01" in start["dettaglio"]
    assert ruolo_contatto({"start_credit_amount": 390})["tipo"] == "cliente_start"
    assert ruolo_contatto({"access_level": "partner"})["tipo"] == "partner"
    # Un partner ha la precedenza anche se ha pagato Start prima.
    assert ruolo_contatto({"access_level": "cliente_start"}, {"id": "p1"})["tipo"] == "partner"


def test_pick_diagnostic_session_preferisce_la_piu_recente_con_risposte():
    from services.ciak_client_accounts import pick_diagnostic_session

    vuota_nuova = {"session_token": "new", "responses": {}}
    compilata_vecchia = {"session_token": "old", "responses": {"q1_competenza": "coaching"}}
    # Chi riapre il questionario crea una sessione vuota: conta quella compilata.
    assert pick_diagnostic_session([vuota_nuova, compilata_vecchia])["session_token"] == "old"
    # Tra due compilate vince la piu' recente (lista gia' ordinata dalla piu' recente).
    ancora_piu_nuova = {"session_token": "newer", "responses": {"q1_competenza": "x"}}
    assert pick_diagnostic_session([ancora_piu_nuova, compilata_vecchia])["session_token"] == "newer"
    # Nessuna con risposte: si torna alla piu' recente, mai None se esiste qualcosa.
    assert pick_diagnostic_session([vuota_nuova, {"session_token": "x"}])["session_token"] == "new"
    assert pick_diagnostic_session([]) is None and pick_diagnostic_session(None) is None


def test_una_sessione_con_tutte_le_chiavi_ma_valori_nulli_non_ha_risposte():
    """Caso Anna Maria Bernard (1/10): riaprire il questionario crea una sessione con
    le 10 chiavi presenti e tutti i valori nulli. Un dizionario non vuoto NON e' una
    sessione compilata: il Blueprint generato li' dice 'questionario arrivato vuoto'."""
    from services.ciak_client_accounts import ha_risposte, pick_diagnostic_session

    nulla = {"session_token": "new", "responses": {f"q{i}": None for i in range(10)}}
    vuote = {"session_token": "new2", "responses": {"q1": "", "q2": "   ", "q3": [], "q4": {}}}
    compilata = {"session_token": "old", "responses": {"q1_competenza": "coaching", "q2": None}}
    assert ha_risposte(nulla) is False and ha_risposte(vuote) is False
    assert ha_risposte(compilata) is True
    assert ha_risposte({}) is False and ha_risposte(None) is False and ha_risposte({"responses": "x"}) is False
    assert ha_risposte({"responses": {"q1": ["a"]}}) is True
    assert ha_risposte({"responses": {"q1": 0}}) is True
    assert pick_diagnostic_session([nulla, vuote, compilata])["session_token"] == "old"
    # Nessuna compilata: si torna alla piu' recente.
    assert pick_diagnostic_session([nulla, vuote])["session_token"] == "new"
