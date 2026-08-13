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
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import ciak_start_milestones as milestones
from services.ciak_start_delivery import _delivery_dates

pytestmark = pytest.mark.unit


def _iso(days_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def _client(days_ago: float = 10, **extra) -> dict:
    base = {
        "id": "client-start-1",
        "email": "cinzia@example.it",
        "name": "Cinzia Lissi",
        "access_level": "cliente_start",
        "start_purchased_at": _iso(days_ago),
        "start_credit_amount": 49900,
        "start_progress": [
            {"id": f"start_{i}", "label": f"Step {i}", "status": "locked" if i > 1 else "todo"}
            for i in range(1, 8)
        ],
    }
    base.update(extra)
    return base


# ─── Il vincolo: le date sono quelle dell'email ────────────────────────────


def test_le_date_del_pannello_sono_le_stesse_che_il_cliente_ha_ricevuto():
    """Stessa sorgente, non una formula equivalente: e' l'intero punto del blocco."""
    paid_at = _iso(10)
    rows = milestones.milestone_rows(_client(days_ago=10))

    assert [row["data_promessa"] for row in rows] == _delivery_dates(paid_at)


def test_l_email_usa_la_funzione_estratta_e_non_una_copia():
    """`_delivery_dates` deve essere la formattazione di `delivery_datetimes`."""
    paid_at = _iso(3)
    attese = [d.strftime("%d/%m/%Y") for d in milestones.delivery_datetimes(paid_at)]

    assert _delivery_dates(paid_at) == attese
    assert milestones.MILESTONE_OFFSET_DAYS == (7, 14, 21)


def test_una_data_di_acquisto_illeggibile_non_fa_esplodere_il_pannello():
    rows = milestones.milestone_rows(_client(start_purchased_at="non-una-data"))

    assert len(rows) == 3
    assert all(row["data_promessa"] for row in rows)


# ─── La prova che chiude il blocco ─────────────────────────────────────────


def test_cliente_di_10_giorni_fa_tappa_1_scaduta_di_3_giorni():
    rows = milestones.milestone_rows(_client(days_ago=10))

    assert [row["giorni"] for row in rows] == [-3, 4, 11]
    assert rows[0]["tappa"] == 1
    assert rows[0]["urgenza"] == "scaduta"
    assert rows[0]["giorni_ritardo"] == 3
    assert rows[1]["urgenza"] == "in_corso"
    assert rows[2]["urgenza"] == "in_corso"


def test_le_tre_tappe_dicono_cosa_contengono():
    rows = milestones.milestone_rows(_client())

    assert [row["titolo"] for row in rows] == [
        "Posizionamento e brand",
        "Profili social e sito vetrina",
        "Strategia contenuti e calendario 90 giorni",
    ]
    assert all(row["contenuto"] for row in rows)


def test_lo_step_7_non_ha_una_data_promessa_e_non_diventa_una_quarta_tappa():
    """L'email promette 3 tappe; `default_start_progress` ha 7 step. Il settimo
    (readiness partnership) non ha nessuna data promessa: non si inventa."""
    rows = milestones.milestone_rows(_client())

    assert len(rows) == 3
    coperti = [step for row in rows for step in row["step_ids"]]
    assert coperti == ["start_1", "start_2", "start_3", "start_4", "start_5", "start_6"]
    assert "start_7" not in coperti


# ─── Urgenza e ordinamento ─────────────────────────────────────────────────


def test_entro_48_ore_coincide_con_la_scadenza_interna_arrivata():
    """Claudio approva prima del cliente: la scadenza interna e' 48h prima di
    quella promessa. Una tappa 'imminente' e' esattamente una che avrebbe gia'
    dovuto essere sulla sua scrivania."""
    rows = milestones.milestone_rows(_client(days_ago=5))  # tappa 1 fra 2 giorni

    tappa1 = rows[0]
    assert tappa1["giorni"] == 2
    assert tappa1["urgenza"] == "imminente"
    assert tappa1["giorni_interni"] == 0


def test_la_scadenza_interna_e_48_ore_prima_di_quella_promessa():
    rows = milestones.milestone_rows(_client(days_ago=0))

    for row in rows:
        promessa = datetime.fromisoformat(row["data_promessa_iso"])
        interna = datetime.fromisoformat(row["scadenza_interna_iso"])
        assert promessa - interna == timedelta(hours=milestones.INTERNAL_REVIEW_HOURS)


def test_le_righe_sono_ordinate_per_urgenza_non_per_data_di_acquisto():
    """Chi ha comprato ieri ma e' gia' in ritardo sta sopra a chi ha comprato un
    mese fa ed e' in regola."""
    vecchio_in_regola = _client(days_ago=2, id="c-vecchio", email="regolare@example.it")
    nuovo_in_ritardo = _client(days_ago=25, id="c-nuovo", email="ritardo@example.it")

    rows = milestones.build_report([vecchio_in_regola, nuovo_in_ritardo])["items"]

    assert rows[0]["email"] == "ritardo@example.it"
    assert rows[0]["urgenza"] == "scaduta"
    assert rows[0]["giorni"] <= rows[1]["giorni"]


def test_le_tappe_consegnate_scendono_in_fondo_e_non_sono_piu_urgenti():
    consegnato = _client(days_ago=30)
    consegnato["start_progress"][0]["status"] = "done"
    consegnato["start_progress"][1]["status"] = "done"

    rows = milestones.milestone_rows(consegnato)

    assert rows[-1]["tappa"] == 1
    assert rows[-1]["stato"] == "consegnata"
    assert rows[-1]["urgenza"] == "chiusa"


# ─── I due numeri in cima ──────────────────────────────────────────────────


def test_in_cima_solo_scadute_e_entro_48_ore():
    report = milestones.build_report([_client(days_ago=10), _client(days_ago=5, id="c2")])

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
        "start_progress": [],
    }

    report = milestones.build_report([blueprint])

    assert report["items"] == []
    assert report["totale_clienti"] == 0


# ─── Lo stato di avanzamento: una funzione sola ────────────────────────────


def test_lo_stato_si_legge_da_una_funzione_sola_pronta_per_la_journey():
    """Il Blocco 1 sposta lo stato da `start_progress` a `partner_journey_steps`.
    Quando atterra si cambia `_stato_tappe`, e nient'altro."""
    client = _client()
    client["start_progress"][0]["status"] = "ready"
    client["start_progress"][1]["status"] = "ready"

    stato = milestones._stato_tappe(client)

    assert stato[1]["stato"] == "da_approvare"
    assert stato[2]["stato"] == "da_fare"


def test_una_tappa_e_consegnata_solo_se_lo_sono_tutti_i_suoi_step():
    client = _client()
    client["start_progress"][0]["status"] = "done"  # start_1 si', start_2 no

    stato = milestones._stato_tappe(client)

    assert stato[1]["stato"] == "da_fare"


def test_non_esistono_stati_che_nessuno_scrive():
    """Uno stato finto e' peggio di uno stato mancante: gli stati del pannello
    sono solo quelli che un endpoint scrive davvero."""
    assert milestones.STATI_TAPPA == ("da_fare", "da_approvare", "consegnata")


# ─── Segnare una tappa ─────────────────────────────────────────────────────


def test_segnare_consegnata_scrive_data_riferimento_e_chi_l_ha_fatto():
    client = _client()

    progress = milestones.apply_milestone_status(
        client,
        tappa=1,
        stato="consegnata",
        riferimento="https://drive.google.com/file/xyz",
        nota="Consegnato a mano in call",
        attore="claudio@evolution-pro.it",
    )

    toccati = [s for s in progress if s["id"] in ("start_1", "start_2")]
    assert all(s["status"] == "done" for s in toccati)
    assert all(s["delivered_at"] for s in toccati)
    assert all(s["reference"] == "https://drive.google.com/file/xyz" for s in toccati)
    assert all(s["delivered_by"] == "claudio@evolution-pro.it" for s in toccati)
    # Gli step di un'altra tappa non si toccano.
    assert [s for s in progress if s["id"] == "start_3"][0]["status"] == "locked"


def test_segnare_pronta_da_approvare_non_e_ancora_una_consegna():
    client = _client()

    progress = milestones.apply_milestone_status(
        client, tappa=2, stato="da_approvare", attore="antonella@evolution-pro.it"
    )

    toccati = [s for s in progress if s["id"] in ("start_3", "start_4")]
    assert all(s["status"] == "ready" for s in toccati)
    assert all(s.get("delivered_at") is None for s in toccati)


def test_una_tappa_inesistente_viene_rifiutata():
    with pytest.raises(ValueError):
        milestones.apply_milestone_status(_client(), tappa=4, stato="consegnata", attore="x")


def test_uno_stato_inventato_viene_rifiutato():
    with pytest.raises(ValueError):
        milestones.apply_milestone_status(
            _client(), tappa=1, stato="in_revisione", attore="x"
        )


def test_segnare_una_tappa_su_un_percorso_mai_creato_lo_ricostruisce():
    """Un cliente Start attivato prima che `start_progress` esistesse non deve
    far fallire la marcatura."""
    client = _client(start_progress=[])

    progress = milestones.apply_milestone_status(
        client, tappa=1, stato="consegnata", attore="claudio@evolution-pro.it"
    )

    assert len(progress) == 7
    assert [s for s in progress if s["id"] == "start_1"][0]["status"] == "done"


# ─── Gli endpoint admin ────────────────────────────────────────────────────


class FakeCursor:
    def __init__(self, docs):
        self.docs = [dict(doc) for doc in docs]

    def sort(self, field, direction):
        self.docs.sort(key=lambda doc: doc.get(field) or "", reverse=direction == -1)
        return self

    async def to_list(self, length):
        return [dict(doc) for doc in self.docs[:length]]


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


class FakeDb:
    def __init__(self, clients):
        self.ciak_clients = FakeCollection(clients)


ADMIN = type("Admin", (), {"email": "claudio@evolution-pro.it", "user_id": "admin-1"})()


@pytest.mark.asyncio
async def test_endpoint_elenca_tre_tappe_per_cliente_con_i_due_numeri_in_cima(monkeypatch):
    from routers import ciak_admin

    monkeypatch.setattr(ciak_admin, "db", FakeDb([_client(days_ago=10)]))

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
    monkeypatch.setattr(ciak_admin, "db", FakeDb([cliente]))

    result = await ciak_admin.consegne_start(_admin=ADMIN, max_items=500)

    assert "tok-segreto" not in str(result)


@pytest.mark.asyncio
async def test_segna_tappa_persiste_la_consegna(monkeypatch):
    from routers import ciak_admin

    database = FakeDb([_client()])
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
    salvato = database.ciak_clients.docs[0]["start_progress"]
    assert [s for s in salvato if s["id"] == "start_1"][0]["status"] == "done"
    assert [s for s in salvato if s["id"] == "start_1"][0]["delivered_by"] == "claudio@evolution-pro.it"


@pytest.mark.asyncio
async def test_segna_tappa_su_cliente_inesistente_da_404(monkeypatch):
    from fastapi import HTTPException
    from routers import ciak_admin

    monkeypatch.setattr(ciak_admin, "db", FakeDb([]))

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
        "start_progress": [],
    }
    monkeypatch.setattr(ciak_admin, "db", FakeDb([blueprint]))

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

    monkeypatch.setattr(ciak_admin, "db", FakeDb([_client()]))

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
