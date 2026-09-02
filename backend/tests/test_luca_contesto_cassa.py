"""
Luca deve VEDERE la cassa, non solo avere l'ordine di guardarla.

Il difetto che questo test blocca (2/9/2026): il system prompt di Luca dice che
la cassa e' "il gate che decide se l'azienda respira" e gli chiede di partire da
li' -- ma `build_luca_context()` raccoglieva solo i 4 reparti. Quel numero nel
contesto non c'era.

Un modello a cui chiedi di ragionare su un dato che non gli hai dato lo stima, e
lo dice con lo stesso tono con cui direbbe un dato vero: e' il modo piu' rapido
per ricevere una cifra inventata. Qui si verifica che i numeri veri ci siano, e
che quando NON ci sono il contesto lo dichiari invece di tacere.
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://luca-contesto-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routers.admin_luca as admin_luca  # noqa: E402


# ── Un database finto, ridotto a quello che il contesto interroga ─────────────
#
# ⛔ Volutamente NON un mock che restituisce sempre qualcosa: le collection che
# non conosce rispondono vuoto, cosi' le altre sezioni del contesto degradano
# come farebbero in produzione e il test misura solo la parte sulla cassa.

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


OBIETTIVO = {
    "id": "10k-settembre",
    "titolo": "10.000 euro entro il 30/9",
    "target": 10000.0,
    "inizio": "2026-08-01",
    "scadenza": "2099-12-31",  # lontana: il test non deve scadere col tempo
    "incassato": 375.0,
    "leve": [
        {"nome": "Rosanna Amato", "valore": 1850.0, "stato": "aperta",
         "ultimo_movimento": "2020-01-01", "dipende_da": "solo una call"},
    ],
}

# Una posizione normale e una che NON si sollecita: sono i due casi che il
# contesto deve trattare in modo diverso.
CREDITI = [
    {
        "id": "test-normale", "nome": "Partner Normale", "importo_totale": 930.0,
        "causale": "seconda rata", "stato": "aperto", "tipo": "credito",
        "rate": [{"numero": 1, "importo": 930.0, "scadenza": "2020-01-15",
                  "stato": "attesa"}],
    },
    {
        "id": "test-sospeso", "nome": "Partner Fragile", "importo_totale": 129.0,
        "causale": "ultima rata", "stato": "aperto", "tipo": "credito",
        "non_sollecitare": True,
        "rate": [{"numero": 1, "importo": 129.0, "scadenza": "2020-01-04",
                  "stato": "attesa"}],
    },
]


def _contesto(db):
    admin_luca.set_db(db)
    try:
        return asyncio.run(admin_luca.build_luca_context())
    finally:
        admin_luca.set_db(None)


def test_il_contesto_contiene_obiettivo_gap_e_leve():
    testo = _contesto(_Db(obiettivi=[OBIETTIVO], crediti=CREDITI))

    assert "CASSA A BREVE" in testo
    assert "10.000 euro entro il 30/9" in testo
    # Il gap e' 10000 - 375: se compare, il numero e' calcolato e non copiato.
    assert "9625" in testo.replace(".", "").replace(",", "")
    assert "Rosanna Amato" in testo


def test_una_leva_ferma_da_mesi_viene_segnalata():
    """E' il servizio vero: dire che si sta raffreddando MENTRE c'e' tempo."""
    testo = _contesto(_Db(obiettivi=[OBIETTIVO], crediti=CREDITI))

    assert "FERMA da" in testo
    assert "Rosanna Amato" in testo


def test_lo_scoperto_viene_dichiarato_quando_le_leve_non_bastano():
    """
    Una sola leva da 1.850 contro un gap da 9.625: il piano NON regge, e dirlo
    e' l'unica riga che puo' far cambiare strategia in tempo.
    """
    testo = _contesto(_Db(obiettivi=[OBIETTIVO], crediti=CREDITI))

    assert "SCOPERTI" in testo


def test_chi_non_si_sollecita_e_dichiarato_ma_escluso_dai_ritardi():
    """
    ⛔ La regola che protegge una persona: la posizione resta nei conti, ma non
    deve MAI comparire tra quelle da chiamare oggi.
    """
    testo = _contesto(_Db(obiettivi=[OBIETTIVO], crediti=CREDITI))

    assert "DOVUTO MA DA NON SOLLECITARE" in testo
    assert "Partner Fragile" in testo

    # E non deve stare tra i ritardi: la' dentro e' un invito a telefonare.
    righe_ritardo = [r for r in testo.splitlines() if "in ritardo:" in r]
    assert righe_ritardo, "il credito normale scaduto deve risultare in ritardo"
    assert all("Partner Fragile" not in r for r in righe_ritardo)
    assert any("Partner Normale" in r for r in righe_ritardo)


def test_senza_dati_il_contesto_dichiara_il_punto_cieco():
    """
    Il caso peggiore non e' il dato mancante: e' il dato mancante taciuto. Senza
    questa riga Luca ricostruirebbe l'obiettivo a memoria dalle conversazioni.
    """
    testo = _contesto(_Db())

    assert "NON CENSITO" in testo
    assert "non stimarli" in testo or "nessun credito censito" in testo.lower()
