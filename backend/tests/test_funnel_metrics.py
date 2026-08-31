"""
Test di `/api/admin/ciak/funnel-metrics` — il funnel pre-acquisto in forma
aggregata che legge il briefing di Luca.

Esiste perche' il 31/8/2026 Luca leggeva due sole fonti, entrambe sugli stadi
DOPO l'iscrizione: riportava "zero lead" mentre in pipeline c'erano sei opt-in
di luglio e agosto. L'endpoint gli da' il funnel intero senza dargli i dati
personali — quelli si guardano in /admin/pipeline.

Il test piu' importante di questo file e' l'ultimo: verifica che dall'output non
esca nessun nome e nessuna email. E' la ragione per cui questo endpoint esiste
invece di aprire `pipeline-prospect` alla chiave di sola lettura.
"""

import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routers import ciak_admin  # noqa: E402


def _iso(giorni_fa):
    return (datetime.now(timezone.utc) - timedelta(days=giorni_fa)).isoformat()


@pytest.fixture
def voci():
    """Un funnel realistico: sei iscritti recenti, tre checkpoint vecchi."""
    return {
        "a@x.it": {"email": "a@x.it", "nome": "Mariangela", "stage": "iscritto", "updated_at": _iso(6)},
        "b@x.it": {"email": "b@x.it", "nome": "Letizia", "stage": "iscritto", "updated_at": _iso(23)},
        "c@x.it": {"email": "c@x.it", "nome": "annaclara", "stage": "iscritto", "updated_at": _iso(25)},
        "d@x.it": {"email": "d@x.it", "nome": "enrica", "stage": "iscritto", "updated_at": _iso(49)},
        "e@x.it": {"email": "e@x.it", "nome": "Flavia", "stage": "iscritto", "updated_at": _iso(58)},
        "f@x.it": {"email": "f@x.it", "nome": "Fulvia", "stage": "checkpoint", "updated_at": _iso(80)},
    }


@pytest.fixture
def chiama(monkeypatch, voci):
    """Isola l'endpoint dal DB: la costruzione delle voci e' gia' testata altrove."""
    async def _finto():
        return voci

    monkeypatch.setattr(ciak_admin, "_build_prospect_entries", _finto)
    monkeypatch.setattr(ciak_admin, "db", object())  # basta che non sia None

    async def _esegui():
        return await ciak_admin.funnel_metrics(admin={"role": "report_key"})

    import asyncio

    def _run():
        return asyncio.new_event_loop().run_until_complete(_esegui())

    return _run


def test_giorni_da_calcola_e_dichiara_i_buchi():
    assert ciak_admin._giorni_da(_iso(10)) == 10
    # un dato che manca o non si legge resta None: non diventa "0 giorni fa"
    assert ciak_admin._giorni_da(None) is None
    assert ciak_admin._giorni_da("") is None
    assert ciak_admin._giorni_da("non-una-data") is None


def test_conta_tutti_gli_stadi_anche_quelli_vuoti(chiama):
    risultato = chiama()
    stadi = risultato["pre_acquisto"]["stadi"]

    assert [s["id"] for s in stadi] == [
        "iscritto", "checkpoint", "diagnostica", "report", "click_67",
    ]
    assert risultato["pre_acquisto"]["totale"] == 6


def test_distingue_i_recenti_dalla_coda_vecchia(chiama):
    """E' la differenza tra "il funnel scorre" e "il funnel e' tappato"."""
    iscritto = chiama()["pre_acquisto"]["stadi"][0]

    assert iscritto["totale"] == 5
    assert iscritto["ultimi_30gg"] == 3       # 6, 23, 25 giorni
    assert iscritto["fermi_oltre_14gg"] == 4  # 23, 25, 49, 58
    assert iscritto["piu_vecchio_giorni"] == 58


def test_stadio_vuoto_non_finge_di_avere_una_attesa(chiama):
    """`piu_vecchio_giorni` a None, non 0: 'nessuno in coda' != 'fermo da zero giorni'."""
    diagnostica = chiama()["pre_acquisto"]["stadi"][2]

    assert diagnostica["totale"] == 0
    assert diagnostica["piu_vecchio_giorni"] is None
    assert diagnostica["fermi_oltre_14gg"] == 0


def test_le_voci_senza_data_sono_dichiarate_non_nascoste(monkeypatch):
    async def _senza_data():
        return {
            "x@x.it": {"email": "x@x.it", "nome": "Tizio", "stage": "iscritto", "updated_at": None},
            "y@x.it": {"email": "y@x.it", "nome": "Caio", "stage": "iscritto", "updated_at": _iso(3)},
        }

    monkeypatch.setattr(ciak_admin, "_build_prospect_entries", _senza_data)
    monkeypatch.setattr(ciak_admin, "db", object())

    import asyncio

    risultato = asyncio.new_event_loop().run_until_complete(
        ciak_admin.funnel_metrics(admin={"role": "report_key"})
    )
    iscritto = risultato["pre_acquisto"]["stadi"][0]

    assert iscritto["totale"] == 2
    assert iscritto["senza_data"] == 1
    assert iscritto["ultimi_30gg"] == 1


def test_non_esce_nessun_dato_personale(chiama, voci):
    """
    IL test di questo file. L'endpoint accetta la chiave di sola lettura del
    briefing: se un nome o una email finissero nella risposta, quella chiave
    diventerebbe un accesso ai dati dei prospect.
    """
    import json

    testo = json.dumps(chiama(), ensure_ascii=False)

    for voce in voci.values():
        assert voce["email"] not in testo
        assert voce["nome"] not in testo
    assert "@" not in testo
    assert "email" not in testo
    assert "nome" not in testo
