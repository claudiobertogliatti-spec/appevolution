"""Start Plus: dettaglio del passo `start-primo-prodotto` (4 voci, via finale a mano)."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services import start_primo_prodotto as pp

MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "ciak_admin.py"
SPEC = importlib.util.spec_from_file_location("ciak_admin_primo_prodotto", MODULE_PATH)
ciak_admin = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ciak_admin)

pytestmark = pytest.mark.unit

NOW = "2026-10-16T10:00:00+00:00"


# ── Regole pure ──────────────────────────────────────────────────────────────

def _consegnate():
    b = pp.normalizza(None)
    valori = {
        "promessa": "Un solo risultato chiaro.",
        "pagina_vendita": "https://esempio.it/vendita",
        "checkout": "https://esempio.it/checkout",
        "messaggio_lancio": "Ciao, da oggi e' disponibile.",
    }
    for chiave, valore in valori.items():
        b = pp.aggiorna_voce(b, chiave, "consegnato", valore, None, NOW)
    return b


def test_default_quattro_voci_da_fare_e_passo_in_attesa():
    b = pp.normalizza(None)
    assert list(b["voci"]) == ["promessa", "pagina_vendita", "checkout", "messaggio_lancio"]
    assert all(v["stato"] == "da_fare" for v in b["voci"].values())
    assert pp.stato_passo(b) == "pending"


def test_voce_in_lavorazione_porta_il_passo_in_corso_non_a_fatto():
    b = pp.aggiorna_voce(pp.normalizza(None), "promessa", "in_lavorazione", None, "bozza", NOW)
    assert pp.stato_passo(b) == "in_progress"


def test_consegnato_richiede_il_contenuto_e_i_link_veri():
    b = pp.normalizza(None)
    with pytest.raises(pp.VoceNonValida):
        pp.aggiorna_voce(b, "promessa", "consegnato", "", None, NOW)
    with pytest.raises(pp.VoceNonValida):
        pp.aggiorna_voce(b, "checkout", "consegnato", "vai su esempio", None, NOW)
    ok = pp.aggiorna_voce(b, "checkout", "consegnato", "https://esempio.it/c", None, NOW)
    assert ok["voci"]["checkout"]["stato"] == "consegnato"


def test_voce_e_stato_sconosciuti_rifiutati():
    b = pp.normalizza(None)
    with pytest.raises(pp.VoceNonValida):
        pp.aggiorna_voce(b, "altro", "consegnato", "x", None, NOW)
    with pytest.raises(pp.VoceNonValida):
        pp.aggiorna_voce(b, "promessa", "fatto", "x", None, NOW)


def test_tutte_consegnate_ma_senza_via_finale_il_passo_non_e_fatto():
    b = _consegnate()
    assert pp.voci_mancanti(b) == []
    assert pp.stato_passo(b) == "in_progress"


def test_via_finale_solo_a_voci_tutte_consegnate():
    b = pp.aggiorna_voce(pp.normalizza(None), "promessa", "consegnato", "Una promessa.", None, NOW)
    with pytest.raises(pp.VoceNonValida) as exc:
        pp.dai_via_finale(b, "admin@x.it", NOW)
    assert "Pagina di vendita" in str(exc.value)


def test_via_finale_chiude_il_passo_e_una_modifica_lo_riapre():
    b = pp.dai_via_finale(_consegnate(), "admin@x.it", NOW)
    assert pp.stato_passo(b) == "done"
    assert b["via_finale"]["da"] == "admin@x.it"
    modificato = pp.aggiorna_voce(b, "promessa", "consegnato", "Promessa cambiata.", None, NOW)
    assert modificato["via_finale"] is None
    assert pp.stato_passo(modificato) == "in_progress"


# ── Rotte admin con db finto ────────────────────────────────────────────────

class FakeColl:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    def _match(self, doc, query):
        return all(doc.get(k) == v for k, v in query.items())

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if self._match(d, query):
                row = dict(d)
                row.pop("_id", None)
                return row
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, query, update, upsert=False):
        for d in self.docs:
            if self._match(d, query):
                for chiave, valore in update.get("$set", {}).items():
                    if "." in chiave:
                        padre, figlio = chiave.split(".", 1)
                        d.setdefault(padre, {})[figlio] = valore
                    else:
                        d[chiave] = valore
                for chiave in update.get("$unset", {}):
                    d.pop(chiave, None)
                return


class FakeDb:
    def __init__(self, clienti):
        self.ciak_clients = FakeColl(clienti)
        self.partner_journey_steps = FakeColl()


CLIENTE_PLUS = {"id": "c-plus", "email": "p@x.it", "start_plus_purchased_at": NOW, "start_purchased_at": NOW}
CLIENTE_START = {"id": "c-start", "email": "s@x.it", "start_purchased_at": NOW}


@pytest.fixture
def api():
    db = FakeDb([CLIENTE_PLUS, CLIENTE_START])
    app = FastAPI()
    ciak_admin.set_db(db)
    app.dependency_overrides[ciak_admin.require_ciak_admin] = lambda: SimpleNamespace(
        role="admin", email="admin@example.com"
    )
    app.include_router(ciak_admin.router)
    with TestClient(app) as client:
        yield client, db


def _put(client, voce, stato, valore=None, cid="c-plus"):
    return client.put(f"/api/admin/ciak/start/{cid}/primo-prodotto/voce",
                      json={"voce": voce, "stato": stato, "valore": valore})


def test_cliente_start_senza_plus_riceve_409(api):
    client, _ = api
    assert client.get("/api/admin/ciak/start/c-start/primo-prodotto").status_code == 409
    assert _put(client, "promessa", "in_lavorazione", cid="c-start").status_code == 409


def test_cliente_inesistente_404(api):
    client, _ = api
    assert client.get("/api/admin/ciak/start/nessuno/primo-prodotto").status_code == 404


def test_lettura_crea_il_passo_e_mostra_le_quattro_voci_da_fare(api):
    client, db = api
    body = client.get("/api/admin/ciak/start/c-plus/primo-prodotto").json()
    assert [v["chiave"] for v in body["voci"]] == ["promessa", "pagina_vendita", "checkout", "messaggio_lancio"]
    assert body["stato_passo"] == "pending"
    assert len(db.partner_journey_steps.docs) == 1


def test_percorso_completo_via_api_e_il_passo_si_chiude_solo_col_via_finale(api):
    client, db = api
    assert _put(client, "promessa", "consegnato", "Una promessa.").status_code == 200
    assert _put(client, "pagina_vendita", "consegnato", "https://e.it/v").status_code == 200
    assert _put(client, "checkout", "consegnato", "https://e.it/c").status_code == 200
    r = _put(client, "messaggio_lancio", "consegnato", "Messaggio.")
    assert r.json()["stato_passo"] == "in_progress"
    passo = db.partner_journey_steps.docs[0]
    assert passo["status"] == "in_progress" and "completed_at" not in passo
    fin = client.post("/api/admin/ciak/start/c-plus/primo-prodotto/via-finale")
    assert fin.status_code == 200 and fin.json()["stato_passo"] == "done"
    passo = db.partner_journey_steps.docs[0]
    assert passo["status"] == "done" and passo["completed_at"]
    assert passo["data"]["primo_prodotto"]["via_finale"]["da"] == "admin@example.com"
    # una modifica successiva riapre il passo
    r = _put(client, "promessa", "consegnato", "Cambiata.")
    assert r.json()["stato_passo"] == "in_progress"
    assert "completed_at" not in db.partner_journey_steps.docs[0]


def test_via_finale_con_voci_mancanti_409(api):
    client, db = api
    _put(client, "promessa", "consegnato", "Una promessa.")
    r = client.post("/api/admin/ciak/start/c-plus/primo-prodotto/via-finale")
    assert r.status_code == 409 and "Checkout" in r.json()["detail"]
    assert db.partner_journey_steps.docs[0]["status"] == "in_progress"


def test_voce_non_valida_422(api):
    client, _ = api
    assert _put(client, "checkout", "consegnato", "non un link").status_code == 422
    assert _put(client, "boh", "da_fare").status_code == 422
