"""
Cancellare un credito: serve per i doppioni, ed e' l'unica scrittura distruttiva
di tutta l'amministrazione.

Perche' l'endpoint esiste (3/9/2026): un id e' una CHIAVE, non un'etichetta. Due
sessioni che hanno caricato la stessa persona con id diversi (`falcone` e
`falcone-piano-rientro`, `depalma` e `depalma-chiusura-bonaria`) non si sono
sovrascritte: convivevano, e il riepilogo sommava entrambe. Il residuo dichiarava
EUR 2.634 in piu' del vero — peggio che non averlo, perche' un numero preciso
nessuno lo mette in dubbio.

Qui si verificano le tre cose che rendono la cancellazione sicura: e' protetta,
restituisce cio' che ha tolto, e non finge di aver cancellato qualcosa che non
c'era.
"""

import os
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://crediti-elimina-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routers.ciak_admin as ciak_admin  # noqa: E402


def test_l_endpoint_e_protetto_come_le_altre_scritture():
    """
    ⛔ La cancellazione non deve essere piu' accessibile della scrittura.

    Il 1/9 su questo stesso backend c'erano PATCH e DELETE sui discovery lead
    aperti a chiunque: il DELETE cancellava. Qui si controlla nel routing, non
    nella memoria di chi ha scritto il codice.
    """
    rotta = next(
        r for r in ciak_admin.router.routes
        if getattr(r, "path", "").endswith("/crediti/{credito_id}") and "DELETE" in r.methods
    )
    dipendenze = [d.call for d in rotta.dependant.dependencies]
    assert ciak_admin.require_ciak_admin in dipendenze, (
        "il DELETE sui crediti deve passare da require_ciak_admin"
    )


def test_restituisce_il_documento_cancellato():
    """
    Chi cancella deve restare con in mano cio' che ha tolto: e' l'unico appiglio
    se si accorge dopo di aver colpito il bersaglio sbagliato.
    """
    import asyncio

    doppione = {
        "id": "falcone", "nome": "Maria Giulia Falcone", "importo_totale": 1074.0,
        "causale": "doppione", "stato": "in_piano",
        "rate": [{"numero": 1, "importo": 1074.0, "stato": "attesa"}],
    }
    cancellati = []

    class _Crediti:
        async def find_one(self, filtro, *_a, **_k):
            return doppione if filtro.get("id") == "falcone" else None

        async def delete_one(self, filtro):
            cancellati.append(filtro["id"])

    class _Db:
        crediti = _Crediti()

    ciak_admin.set_db(_Db())
    try:
        esito = asyncio.run(ciak_admin.crediti_elimina("falcone", admin=None))
    finally:
        ciak_admin.set_db(None)

    assert esito["success"] is True
    assert esito["cancellato"]["nome"] == "Maria Giulia Falcone"
    assert esito["cancellato"]["importo_totale"] == 1074.0
    assert cancellati == ["falcone"]


def test_un_id_inesistente_da_404_e_non_cancella_niente():
    """
    ⛔ Senza questo, un id sbagliato tornerebbe "success" e chi esegue crederebbe
    di aver ripulito un doppione che invece e' ancora li' a gonfiare il residuo.
    """
    import asyncio

    from fastapi import HTTPException

    cancellati = []

    class _Crediti:
        async def find_one(self, *_a, **_k):
            return None

        async def delete_one(self, filtro):
            cancellati.append(filtro["id"])

    class _Db:
        crediti = _Crediti()

    ciak_admin.set_db(_Db())
    try:
        with pytest.raises(HTTPException) as e:
            asyncio.run(ciak_admin.crediti_elimina("mai-esistito", admin=None))
    finally:
        ciak_admin.set_db(None)

    assert e.value.status_code == 404
    assert cancellati == [], "non deve cancellare niente quando non trova il credito"
