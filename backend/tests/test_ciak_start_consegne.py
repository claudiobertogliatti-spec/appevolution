"""Pannello delle 3 tappe datate che l'email di Ciak Start promette al cliente.

Il problema che chiude: alla consegna dell'accesso il sistema promette per iscritto
tre date (7/14/21 giorni da `start_purchased_at`, `ciak_start_delivery.py`). Quelle
date partono da sole a ogni pagamento e **non le ricorda nessuno**: nessuna coda,
nessun promemoria, nessuna schermata. Con l'Edizione Settembre (8 posti, partenza
unica) sono 24 consegne datate in 21 giorni tenute a memoria.

Il vincolo piu' importante e' il primo test: le date del pannello devono essere le
STESSE dell'email, non una formula equivalente. Se il pannello ricalcola per conto
suo, prima o poi mostra una data diversa da quella che il cliente ha ricevuto per
iscritto — e in quel caso la versione giusta e' sempre quella nell'email.

Lo stato delle tappe si legge dalla journey vera (`partner_journey_steps`, tier
start): il campo `start_progress` e' stato DISMESSO. Le 3 tappe mappano sui 6 step
reali (tappa 3 = un solo step fuso, `start-contenuti-90`).
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import ciak_start_milestones as milestones
from services.ciak_start_delivery import _delivery_dates

pytestmark = pytest.mark.unit


# I 6 step della journey del tier start, nell'ordine in cui li servono le tappe.
JOURNEY_STEP_IDS = [
    "04-posizionamento",
    "03-brand-kit",
    "start-profili",
    "start-vetrina",
    "start-contenuti-90",
    "start-readiness",
]


def _iso(days_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def _client(days_ago: float = 10, **extra) -> dict:
    base = {
        "id": "client-start-1",
        "email": "cinzia@example.it",
        "name": "Cinzia Lissi",
        "access_level": "cliente_start",
        "start_purchased_at": _iso(days_ago),
        "start_credit_amount": 39000,
    }
    base.update(extra)
    return base


def _journey_steps(client_id: str = "client-start-1", overrides: dict | None = None) -> list[dict]:
    """Gli step di journey del cliente, seedati come da bridge: tutti pending.

    `overrides` mappa uno step_id sui campi da sovrascrivere (status,
    approval_status, ...) — cosi' un test descrive solo cio' che gli serve.
    """
    overrides = overrides or {}
    steps = []
    for sid in JOURNEY_STEP_IDS:
        step = {"partner_id": client_id, "step_id": sid, "status": "pending"}
        step.update(overrides.get(sid, {}))
        steps.append(step)
    return steps


# ─── Il vincolo: le date sono quelle dell'email ────────────────────────────


def test_le_date_del_pannello_sono_le_stesse_che_il_cliente_ha_ricevuto():
    """Stessa sorgente, non una formula equivalente: e' l'intero punto del blocco."""
    paid_at = _iso(10)
    rows = milestones.milestone_rows(_client(days_ago=10), _journey_steps())

    assert [row["data_promessa"] for row in rows] == _delivery_dates(paid_at)


def test_l_email_usa_la_funzione_estratta_e_non_una_copia():
    """`_delivery_dates` deve essere la formattazione di `delivery_datetimes`."""
    paid_at = _iso(3)
    attese = [d.strftime("%d/%m/%Y") for d in milestones.delivery_datetimes(paid_at)]

    assert _delivery_dates(paid_at) == attese
    assert milestones.MILESTONE_OFFSET_DAYS == (7, 14, 21)


def test_una_data_di_acquisto_illeggibile_non_fa_esplodere_il_pannello():
    rows = milestones.milestone_rows(
        _client(start_purchased_at="non-una-data"), _journey_steps()
    )

    assert len(rows) == 3
    assert all(row["data_promessa"] for row in rows)


# ─── La prova che chiude il blocco ─────────────────────────────────────────


def test_cliente_di_10_giorni_fa_tappa_1_scaduta_di_3_giorni():
    rows = milestones.milestone_rows(_client(days_ago=10), _journey_steps())

    assert [row["giorni"] for row in rows] == [-3, 4, 11]
    assert rows[0]["tappa"] == 1
    assert rows[0]["urgenza"] == "scaduta"
    assert rows[0]["giorni_ritardo"] == 3
    assert rows[1]["urgenza"] == "in_corso"
    assert rows[2]["urgenza"] == "in_corso"


def test_le_tre_tappe_dicono_cosa_contengono():
    rows = milestones.milestone_rows(_client(), _journey_steps())

    assert [row["titolo"] for row in rows] == [
        "Posizionamento e brand",
        "Profili social e sito vetrina",
        "Strategia contenuti e calendario 90 giorni",
    ]
    assert all(row["contenuto"] for row in rows)


def test_la_readiness_non_ha_una_data_promessa_e_non_diventa_una_quarta_tappa():
    """L'email promette 3 tappe; la journey start ha 6 step. La readiness
    (`start-readiness`) non ha nessuna data promessa: non si inventa."""
    rows = milestones.milestone_rows(_client(), _journey_steps())

    assert len(rows) == 3
    coperti = [step for row in rows for step in row["step_ids"]]
    assert coperti == [
        "04-posizionamento",
        "03-brand-kit",
        "start-profili",
        "start-vetrina",
        "start-contenuti-90",
    ]
    assert milestones.STEP_SENZA_DATA_PROMESSA == "start-readiness"
    assert "start-readiness" not in coperti


# ─── Urgenza e ordinamento ─────────────────────────────────────────────────


def test_entro_48_ore_coincide_con_la_scadenza_interna_arrivata():
    """Claudio approva prima del cliente: la scadenza interna e' 48h prima di
    quella promessa. Una tappa 'imminente' e' esattamente una che avrebbe gia'
    dovuto essere sulla sua scrivania."""
    rows = milestones.milestone_rows(_client(days_ago=5), _journey_steps())  # tappa 1 fra 2 giorni

    tappa1 = rows[0]
    assert tappa1["giorni"] == 2
    assert tappa1["urgenza"] == "imminente"
    assert tappa1["giorni_interni"] == 0


def test_la_scadenza_interna_e_48_ore_prima_di_quella_promessa():
    rows = milestones.milestone_rows(_client(days_ago=0), _journey_steps())

    for row in rows:
        promessa = datetime.fromisoformat(row["data_promessa_iso"])
        interna = datetime.fromisoformat(row["scadenza_interna_iso"])
        assert promessa - interna == timedelta(hours=milestones.INTERNAL_REVIEW_HOURS)


def test_le_righe_sono_ordinate_per_urgenza_non_per_data_di_acquisto():
    """Chi ha comprato ieri ma e' gia' in ritardo sta sopra a chi ha comprato un
    mese fa ed e' in regola."""
    vecchio_in_regola = _client(days_ago=2, id="c-vecchio", email="regolare@example.it")
    nuovo_in_ritardo = _client(days_ago=25, id="c-nuovo", email="ritardo@example.it")
    steps_by_client = {
        "c-vecchio": _journey_steps("c-vecchio"),
        "c-nuovo": _journey_steps("c-nuovo"),
    }

    rows = milestones.build_report(
        [vecchio_in_regola, nuovo_in_ritardo], steps_by_client
    )["items"]

    assert rows[0]["email"] == "ritardo@example.it"
    assert rows[0]["urgenza"] == "scaduta"
    assert rows[0]["giorni"] <= rows[1]["giorni"]


def test_le_tappe_consegnate_scendono_in_fondo_e_non_sono_piu_urgenti():
    consegnato = _client(days_ago=30)
    steps = _journey_steps(overrides={
        "04-posizionamento": {"status": "done"},
        "03-brand-kit": {"status": "done"},
    })

    rows = milestones.milestone_rows(consegnato, steps)

    assert rows[-1]["tappa"] == 1
    assert rows[-1]["stato"] == "consegnata"
    assert rows[-1]["urgenza"] == "chiusa"


# ─── I due numeri in cima ──────────────────────────────────────────────────


def test_in_cima_solo_scadute_e_entro_48_ore():
    steps_by_client = {
        "client-start-1": _journey_steps("client-start-1"),
        "c2": _journey_steps("c2"),
    }
    report = milestones.build_report(
        [_client(days_ago=10), _client(days_ago=5, id="c2")], steps_by_client
    )

    # 10 giorni fa: tappa 1 scaduta. 5 giorni fa: tappa 1 fra 2 giorni.
    assert report["scadute"] == 1
    assert report["entro_48_ore"] == 1
    assert report["totale_clienti"] == 2


def test_un_cliente_senza_entitlement_start_non_entra_nel_pannello():
    blueprint = {
        "id": "solo-blueprint",
        "email": "blueprint@example.it",
        "access_level": "cliente_blueprint",
        "start_credit_amount": 0,
    }

    report = milestones.build_report([blueprint], {})

    assert report["items"] == []
    assert report["totale_clienti"] == 0


# ─── Lo stato di avanzamento: letto dalla journey ──────────────────────────


def test_lo_stato_si_legge_dalla_journey_non_da_start_progress():
    """Una tappa con un deliverable in attesa di approvazione e' 'da approvare';
    una senza nulla ancora prodotto e' 'da fare'."""
    steps = _journey_steps(overrides={
        "04-posizionamento": {"approval_status": "pending_review"},
        "03-brand-kit": {"approval_status": "pending_review"},
    })

    stato = milestones._stato_tappe(milestones._steps_by_id(steps))

    assert stato[1]["stato"] == "da_approvare"
    assert stato[2]["stato"] == "da_fare"


def test_una_tappa_e_consegnata_solo_se_lo_sono_tutti_i_suoi_step():
    steps = _journey_steps(overrides={
        "04-posizionamento": {"status": "done"},  # posizionamento si', brand-kit no
    })

    stato = milestones._stato_tappe(milestones._steps_by_id(steps))

    assert stato[1]["stato"] == "da_fare"


def test_un_deliverable_approvato_conta_come_consegnato():
    """L'approvazione scrive `approval_status: approved`: il pannello lo deve
    leggere come consegnato senza aspettare anche `status: done`."""
    steps = _journey_steps(overrides={
        "start-profili": {"approval_status": "approved"},
        "start-vetrina": {"approval_status": "approved"},
    })

    stato = milestones._stato_tappe(milestones._steps_by_id(steps))

    assert stato[2]["stato"] == "consegnata"


def test_non_esistono_stati_che_nessuno_scrive():
    """Uno stato finto e' peggio di uno stato mancante: gli stati del pannello
    sono solo quelli che un endpoint scrive davvero."""
    assert milestones.STATI_TAPPA == ("da_fare", "da_approvare", "consegnata")


# ─── Segnare una tappa (aggiornamenti sulla journey) ───────────────────────


def test_segnare_consegnata_scrive_stato_riferimento_e_chi_l_ha_fatto():
    aggiornamenti = milestones.apply_milestone_status(
        tappa=1,
        stato="consegnata",
        riferimento="https://drive.google.com/file/xyz",
        nota="Consegnato a mano in call",
        attore="claudio@evolution-pro.it",
    )

    toccati = {riga["step_id"]: riga["set"] for riga in aggiornamenti}
    assert set(toccati) == {"04-posizionamento", "03-brand-kit"}
    for campi in toccati.values():
        assert campi["status"] == "done"
        assert campi["approval_status"] == "approved"
        assert campi["approved_by"] == "claudio@evolution-pro.it"
        assert campi["reference"] == "https://drive.google.com/file/xyz"
        assert campi["completed_at"]
    # Gli step di un'altra tappa non compaiono.
    assert "start-profili" not in toccati


def test_segnare_pronta_da_approvare_non_e_ancora_una_consegna():
    aggiornamenti = milestones.apply_milestone_status(
        tappa=2, stato="da_approvare", attore="antonella@evolution-pro.it"
    )

    toccati = {riga["step_id"]: riga["set"] for riga in aggiornamenti}
    assert set(toccati) == {"start-profili", "start-vetrina"}
    for campi in toccati.values():
        assert campi["approval_status"] == "pending_review"
        assert "completed_at" not in campi


def test_una_tappa_a_un_solo_step_tocca_solo_quello():
    """La tappa 3 (strategia + calendario) e' un unico step fuso."""
    aggiornamenti = milestones.apply_milestone_status(
        tappa=3, stato="consegnata", attore="claudio@evolution-pro.it"
    )

    assert [riga["step_id"] for riga in aggiornamenti] == ["start-contenuti-90"]


def test_una_tappa_inesistente_viene_rifiutata():
    with pytest.raises(ValueError):
        milestones.apply_milestone_status(tappa=4, stato="consegnata", attore="x")


def test_uno_stato_inventato_viene_rifiutato():
    with pytest.raises(ValueError):
        milestones.apply_milestone_status(tappa=1, stato="in_revisione", attore="x")


# ─── Gli endpoint admin ────────────────────────────────────────────────────


class FakeCursor:
    def __init__(self, docs):
        self.docs = [dict(doc) for doc in docs]

    def sort(self, field, direction):
        self.docs.sort(key=lambda doc: doc.get(field) or "", reverse=direction == -1)
        return self

    async def to_list(self, length):
        return [dict(doc) for doc in self.docs[:length]]

    def __aiter__(self):
        self._iter = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return dict(next(self._iter))
        except StopIteration:
            raise StopAsyncIteration


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    def find(self, query=None, projection=None):
        return FakeCursor(self.docs)

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                return dict(doc)
        return None

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                doc.update(update.get("$set", {}))
                return None
        if upsert:
            nuovo = dict(query)
            nuovo.update(update.get("$setOnInsert", {}))
            nuovo.update(update.get("$set", {}))
            self.docs.append(nuovo)
        return None


class FakeDb:
    def __init__(self, clients, journey_steps=None):
        self.ciak_clients = FakeCollection(clients)
        self.partner_journey_steps = FakeCollection(journey_steps or [])


ADMIN = type("Admin", (), {"email": "claudio@evolution-pro.it", "user_id": "admin-1"})()


@pytest.mark.asyncio
async def test_endpoint_elenca_tre_tappe_per_cliente_con_i_due_numeri_in_cima(monkeypatch):
    from routers import ciak_admin

    monkeypatch.setattr(
        ciak_admin, "db", FakeDb([_client(days_ago=10)], _journey_steps())
    )

    result = await ciak_admin.consegne_start(_admin=ADMIN, max_items=500)

    assert result["totale_clienti"] == 1
    assert len(result["items"]) == 3
    assert result["scadute"] == 1
    assert "entro_48_ore" in result
    assert result["items"][0]["email"] == "cinzia@example.it"


@pytest.mark.asyncio
async def test_endpoint_non_espone_token_ne_magic_link(monkeypatch):
    """Stessa regola di Consegne mancate: da una lista diagnostica non esce mai
    una credenziale."""
    from routers import ciak_admin

    cliente = _client()
    cliente["magic_link_token"] = "tok-segreto"
    monkeypatch.setattr(ciak_admin, "db", FakeDb([cliente], _journey_steps()))

    result = await ciak_admin.consegne_start(_admin=ADMIN, max_items=500)

    assert "tok-segreto" not in str(result)


@pytest.mark.asyncio
async def test_segna_tappa_persiste_la_consegna_sulla_journey(monkeypatch):
    from routers import ciak_admin

    database = FakeDb([_client()], _journey_steps())
    monkeypatch.setattr(ciak_admin, "db", database)

    result = await ciak_admin.segna_tappa_start(
        ciak_admin.SegnaTappaStartRequest(
            client_id="client-start-1",
            tappa=1,
            stato="consegnata",
            riferimento="https://drive.google.com/file/xyz",
        ),
        admin=ADMIN,
    )

    assert result["success"] is True
    steps = {s["step_id"]: s for s in database.partner_journey_steps.docs}
    assert steps["04-posizionamento"]["status"] == "done"
    assert steps["04-posizionamento"]["approved_by"] == "claudio@evolution-pro.it"
    assert steps["03-brand-kit"]["approval_status"] == "approved"
    # Una tappa diversa non viene toccata.
    assert steps["start-profili"]["status"] == "pending"


@pytest.mark.asyncio
async def test_segna_tappa_su_cliente_inesistente_da_404(monkeypatch):
    from fastapi import HTTPException
    from routers import ciak_admin

    monkeypatch.setattr(ciak_admin, "db", FakeDb([], []))

    with pytest.raises(HTTPException) as exc:
        await ciak_admin.segna_tappa_start(
            ciak_admin.SegnaTappaStartRequest(client_id="ignoto", tappa=1, stato="consegnata"),
            admin=ADMIN,
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_segna_tappa_su_cliente_senza_start_e_rifiutata(monkeypatch):
    from fastapi import HTTPException
    from routers import ciak_admin

    blueprint = {
        "id": "solo-blueprint",
        "email": "blueprint@example.it",
        "access_level": "cliente_blueprint",
        "start_credit_amount": 0,
    }
    monkeypatch.setattr(ciak_admin, "db", FakeDb([blueprint], []))

    with pytest.raises(HTTPException) as exc:
        await ciak_admin.segna_tappa_start(
            ciak_admin.SegnaTappaStartRequest(
                client_id="solo-blueprint", tappa=1, stato="consegnata"
            ),
            admin=ADMIN,
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_segna_tappa_rifiuta_uno_stato_inventato(monkeypatch):
    from fastapi import HTTPException
    from routers import ciak_admin

    monkeypatch.setattr(ciak_admin, "db", FakeDb([_client()], _journey_steps()))

    with pytest.raises(HTTPException) as exc:
        await ciak_admin.segna_tappa_start(
            ciak_admin.SegnaTappaStartRequest(
                client_id="client-start-1", tappa=1, stato="in_revisione"
            ),
            admin=ADMIN,
        )
    assert exc.value.status_code == 422


def test_i_due_endpoint_sono_protetti_da_require_ciak_admin():
    from routers import ciak_admin

    paths = {
        route.path: route
        for route in ciak_admin.router.routes
        if getattr(route, "path", "").startswith("/api/admin/ciak/start/consegne")
    }
    assert "/api/admin/ciak/start/consegne" in paths
    for route in paths.values():
        nomi = [d.call.__name__ for d in route.dependant.dependencies]
        assert "require_ciak_admin" in nomi
