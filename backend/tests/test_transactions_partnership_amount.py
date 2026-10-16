"""
/transactions-partnership: l'importo non fa esplodere l'endpoint su `corrispettivo` null.

Il difetto (#7, 16/9/2026): `amount = float(contract_params.get("corrispettivo", 2990.0))`.
Se una proposta ha `corrispettivo` PRESENTE ma `null`, `float(None)` solleva e
manda in 500 l'intera lista degli incassi partnership. 2990 e' lo standard;
`corrispettivo` lo sovrascrive quando c'e' un valore vero.
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://tx-partnership-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routers.ciak_admin as ciak_admin  # noqa: E402


class _Cursore:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, *_a, **_k):
        return self

    def __aiter__(self):
        async def gen():
            for d in self._docs:
                yield d
        return gen()


class _Proposte:
    def __init__(self, docs):
        self._docs = list(docs)

    def find(self, *_a, **_k):
        return _Cursore(self._docs)


class _Db:
    def __init__(self, docs):
        self.proposte = _Proposte(docs)


def _chiama(docs):
    ciak_admin.set_db(_Db(docs))
    try:
        return asyncio.run(
            ciak_admin.ciak_transactions_partnership(admin=None, limit=200, offset=0)
        )
    finally:
        ciak_admin.set_db(None)


def test_corrispettivo_null_non_fa_500_e_torna_allo_standard():
    docs = [
        {"prospect_email": "a@x.it", "pagamento_completato": True,
         "contract_params": {"corrispettivo": None}},
    ]

    res = _chiama(docs)

    assert res["items"][0]["amount_euro"] == 2990.0
    assert res["total_incassato_euro"] == 2990.0


def test_corrispettivo_reale_vince_sullo_standard():
    docs = [
        {"prospect_email": "b@x.it", "pagamento_completato": True,
         "contract_params": {"corrispettivo": 1560.0}},
        {"prospect_email": "c@x.it", "pagamento_completato": True,
         "contract_params": {}},  # assente -> standard 2990
    ]

    res = _chiama(docs)

    importi = sorted(i["amount_euro"] for i in res["items"])
    assert importi == [1560.0, 2990.0]
    assert res["total_incassato_euro"] == 4550.0
