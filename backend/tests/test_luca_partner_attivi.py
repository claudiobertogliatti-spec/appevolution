"""
"Partner attivi" nel contesto di Luca si conta sul campo `stato`, non `status`.

Il difetto che questo test blocca (15/9/2026): `build_luca_context` contava gli
attivi su `status` -- che vale "active" alla creazione e non cambia MAI col ciclo
di vita. Il ciclo di vita vive su `stato` (attivo/sospeso/quarantena/ex), l'unico
campo che daily_report e ciak_admin usano davvero. Risultato: un partner in
quarantena (congelato) restava contato tra gli attivi in chat con Claudio, con un
numero diverso da quello del daily_report -- due cifre di "attivi" nello stesso
cruscotto.

Controprova: se il codice tornasse a leggere `status`, i partner del fixture non
ce l'hanno -> attivi = 0, e il test fallisce.
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://luca-attivi-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routers.admin_luca as admin_luca  # noqa: E402


class _Cursore:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, *_a, **_k):
        return self

    async def to_list(self, _n=None):
        return list(self._docs)

    def __aiter__(self):
        async def gen():
            for d in self._docs:
                yield d
        return gen()


class _Collection:
    def __init__(self, docs):
        self._docs = list(docs)

    def find(self, *_a, **_k):
        return _Cursore(self._docs)

    async def find_one(self, filtro=None, *_a, **_k):
        for d in self._docs:
            if not filtro or all(d.get(k) == v for k, v in filtro.items()):
                return d
        return None

    async def count_documents(self, *_a, **_k):
        return len(self._docs)


class _Db:
    def __init__(self, **collezioni):
        self._c = {n: _Collection(docs) for n, docs in collezioni.items()}

    def __getattr__(self, nome):
        return self._c.get(nome) or _Collection([])


PARTNERS = [
    {"id": "p1", "name": "Attivo Uno", "stato": "attivo", "phase": "F3"},
    {"id": "p2", "name": "Senza Stato", "phase": "F1"},            # assente = attivo
    {"id": "p3", "name": "Falcone", "stato": "quarantena", "phase": "F2"},
    {"id": "p4", "name": "Uscito", "stato": "ex", "phase": "F1"},
    {"id": "p5", "name": "Sospeso", "stato": "sospeso", "phase": "F2"},
]


def _contesto(db):
    admin_luca.set_db(db)
    try:
        return asyncio.run(admin_luca.build_luca_context())
    finally:
        admin_luca.set_db(None)


def test_attivi_conta_solo_stato_attivo_o_assente():
    testo = _contesto(_Db(partners=PARTNERS))

    # Totali = tutti i partner reali; Attivi = solo attivo + assente (2 su 5).
    assert "Partner totali: 5 · Attivi: 2" in testo


def test_quarantena_sospeso_ex_non_sono_attivi():
    """Un partner congelato non deve gonfiare gli attivi nel briefing a Claudio."""
    solo_fermi = [
        {"id": "x", "name": "Q", "stato": "quarantena"},
        {"id": "y", "name": "S", "stato": "sospeso"},
        {"id": "z", "name": "E", "stato": "ex"},
    ]

    testo = _contesto(_Db(partners=solo_fermi))

    assert "Partner totali: 3 · Attivi: 0" in testo
