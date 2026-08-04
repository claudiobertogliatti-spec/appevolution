"""Test dell'endpoint VERO `PATCH /posizionamento/{partner_id}/inputs`.

Perche' esiste, oltre a `test_posizionamento_partial_update.py`: quello simula la logica
di merge dentro il test e passerebbe anche se l'endpoint fosse cancellato. Questo importa
il modulo ed esegue l'handler, quindi fallisce se qualcuno rompe la funzione — o il modulo.
Serve: il 04/08/2026 `partner_journey.py` usava `Field` senza importarlo e l'intero
backend non partiva, mentre il gate di sintassi e i test passavano lo stesso.
"""

import os

for _chiave, _valore in [
    ("MONGO_URL", "mongodb://localhost:27017/test_db"),
    ("DB_NAME", "test_db"),
    ("REACT_APP_BACKEND_URL", "http://localhost:8000"),
    ("JWT_SECRET_KEY", "x" * 40),
]:
    os.environ.setdefault(_chiave, _valore)

import pytest

import routers.partner_journey as pj


class _FakeCollection:
    def __init__(self):
        self.chiamate = []

    async def update_one(self, filtro, update, upsert=False):
        self.chiamate.append({"filtro": filtro, "update": update, "upsert": upsert})

        class _Res:
            modified_count = 1

        return _Res()

    async def find_one(self, *_a, **_k):
        # L'handler rilegge il documento e lo restituisce al chiamante.
        return {"partner_id": "23", "inputs": {}}


class _FakeDB:
    def __init__(self):
        self.partner_posizionamento = _FakeCollection()


@pytest.fixture
def db_finto(monkeypatch):
    db = _FakeDB()
    monkeypatch.setattr(pj, "db", db)

    async def _auth_ok(*_a, **_k):
        return True

    async def _partner(*_a, **_k):
        return {"id": "23", "name": "Daniele Andolfi"}

    monkeypatch.setattr(pj, "require_partner_or_admin_for_partner", _auth_ok)
    monkeypatch.setattr(pj, "get_partner_or_404", _partner)
    return db


async def _chiama(inputs, approvazione=None):
    richiesta = pj.UpdatePosizionamentoInputsRequest(
        inputs=inputs, approvato_dal_partner=approvazione
    )
    return await pj.update_posizionamento_inputs_partial("23", richiesta, credentials=None)


@pytest.mark.unit
async def test_merge_per_chiave_non_sovrascrive_l_intero_oggetto(db_finto):
    await _chiama({"target": "Nuovo target", "risultato": "Nuova promessa"})

    set_ = db_finto.partner_posizionamento.chiamate[0]["update"]["$set"]
    assert set_["inputs.target"] == "Nuovo target"
    assert set_["inputs.risultato"] == "Nuova promessa"
    # La chiave nuda `inputs` cancellerebbe competenza, esperienza, differenziazione...
    assert "inputs" not in set_


@pytest.mark.unit
async def test_salvataggio_semplice_non_tocca_l_approvazione(db_finto):
    await _chiama({"target": "Solo salvato"}, approvazione=None)

    set_ = db_finto.partner_posizionamento.chiamate[0]["update"]["$set"]
    assert "approvato_dal_partner" not in set_
    assert "approvato_at" not in set_


@pytest.mark.unit
async def test_approvazione_e_revoca_scrivono_date_diverse(db_finto):
    await _chiama({}, approvazione=True)
    approva = db_finto.partner_posizionamento.chiamate[0]["update"]["$set"]
    assert approva["approvato_dal_partner"] is True
    assert "approvato_at" in approva

    await _chiama({}, approvazione=False)
    revoca = db_finto.partner_posizionamento.chiamate[1]["update"]["$set"]
    assert revoca["approvato_dal_partner"] is False
    # In revoca `approvato_at` non si tocca: altrimenti il documento direbbe
    # "approvato il <data della revoca>".
    assert "approvato_at" not in revoca
    assert "approvazione_revocata_at" in revoca
