"""
PATCH di un singolo campo dell'obiettivo, senza toccare le leve.

Perche' l'endpoint esiste (15/9/2026): l'unico modo di scrivere sull'obiettivo
era il PUT, che fa `$set` del documento INTERO (`Obiettivo(**body).model_dump()`).
Per correggere un numero -- p.es. `incassato_pregresso`, l'incassato vecchio non
tracciato come credito -- bisognava rimandare anche tutte le leve con i loro stati
e le date di ultimo movimento, o si azzeravano. Un ritocco non deve poter
cancellare il piano.

Qui si verificano le tre cose che rendono il ritocco sicuro: e' protetto, scrive
SOLO i campi scalari passati (mai le leve), e non finge di aver aggiornato un
obiettivo che non c'e'.
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://obiettivo-patch-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routers.ciak_admin as ciak_admin  # noqa: E402


class _Risultato:
    def __init__(self, matched):
        self.matched_count = matched


class _Obiettivi:
    def __init__(self, esiste=True):
        self.esiste = esiste
        self.ultimo_set = None

    async def update_one(self, filtro, update):
        self.ultimo_set = update["$set"]
        return _Risultato(1 if self.esiste else 0)


class _Db:
    def __init__(self, esiste=True):
        self.obiettivi = _Obiettivi(esiste)


def _patch(obiettivo_id, body, esiste=True):
    db = _Db(esiste)
    ciak_admin.set_db(db)
    try:
        esito = asyncio.run(
            ciak_admin.obiettivo_aggiorna_campi(obiettivo_id, body, admin=None)
        )
    finally:
        ciak_admin.set_db(None)
    return esito, db.obiettivi.ultimo_set


def test_l_endpoint_e_protetto_come_le_altre_scritture():
    """Un ritocco ai numeri di cassa non deve essere piu' accessibile del PUT."""
    rotta = next(
        r for r in ciak_admin.router.routes
        if getattr(r, "path", "").endswith("/obiettivo/{obiettivo_id}") and "PATCH" in r.methods
    )
    dipendenze = [d.call for d in rotta.dependant.dependencies]
    assert ciak_admin.require_ciak_admin in dipendenze


def test_scrive_solo_i_campi_passati_e_non_tocca_le_leve():
    """
    ⛔ Il punto di tutto l'endpoint: `leve` non deve MAI finire nel $set, altrimenti
    un ritocco al numero azzererebbe il piano.
    """
    esito, set_scritto = _patch("10k-settembre", {"incassato_pregresso": 196})

    assert esito["success"] is True
    assert set_scritto["incassato_pregresso"] == 196.0
    assert "leve" not in set_scritto
    assert "aggiornato_at" in set_scritto


def test_i_campi_numerici_diventano_float():
    """Se arriva "196" come stringa dev'essere salvato come numero, non testo."""
    _, set_scritto = _patch("10k-settembre", {"incassato_pregresso": "196"})

    assert set_scritto["incassato_pregresso"] == 196.0
    assert isinstance(set_scritto["incassato_pregresso"], float)


def test_i_campi_non_ammessi_sono_ignorati():
    """id, leve o campi inventati non passano: si scrive solo la whitelist."""
    _, set_scritto = _patch(
        "10k-settembre",
        {"incassato_pregresso": 196, "leve": [], "id": "altro", "pippo": 1},
    )

    assert set(set_scritto) == {"incassato_pregresso", "aggiornato_at"}


def test_nessun_campo_valido_da_400():
    with pytest.raises(HTTPException) as e:
        _patch("10k-settembre", {"leve": [], "pippo": 1})
    assert e.value.status_code == 400


def test_un_numero_non_valido_da_400():
    with pytest.raises(HTTPException) as e:
        _patch("10k-settembre", {"target": "non-un-numero"})
    assert e.value.status_code == 400


def test_un_obiettivo_inesistente_da_404():
    """Non deve rispondere success per un id che non c'e'."""
    with pytest.raises(HTTPException) as e:
        _patch("mai-esistito", {"incassato_pregresso": 196}, esiste=False)
    assert e.value.status_code == 404
