"""
Il collaudo deve distinguere «rotto ieri» da «non ha mai funzionato».

Perche' esiste (3/9/2026): i guasti di Ciak hanno tutti la stessa firma — un
pezzo gira, dichiara successo, e non produce niente. Il filtro outreach che non
agganciava nessuno ha restituito `success` ogni mattina per due mesi.

Un collaudo che dicesse solo "zero" ripeterebbe lo stesso errore in forma
diversa: zero senza un giudizio non fa alzare nessuno dalla sedia. Qui si
verifica che il verdetto separi i tre casi che portano a indagini diverse.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://collaudo-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import collaudo  # noqa: E402


def _quando(giorni_fa):
    return (datetime.now(timezone.utc) - timedelta(days=giorni_fa)).isoformat()


class _Coll:
    """Collection finta che filtra davvero sul $gte, come farebbe Mongo."""

    def __init__(self, docs):
        self._docs = list(docs)

    def _match(self, doc, query):
        for chiave, atteso in (query or {}).items():
            valore = doc.get(chiave)
            if isinstance(atteso, dict):
                if "$gte" in atteso and not (valore and str(valore) >= atteso["$gte"]):
                    return False
                if "$nin" in atteso and valore in atteso["$nin"]:
                    return False
            elif valore != atteso:
                return False
        return True

    async def count_documents(self, query=None):
        return sum(1 for d in self._docs if self._match(d, query))

    def find(self, query=None, _proj=None):
        trovati = [d for d in self._docs if self._match(d, query)]

        class _Cur:
            def sort(self, campo, verso=1):
                trovati.sort(key=lambda d: d.get(campo) or "", reverse=verso < 0)
                return self

            async def to_list(self, n=None):
                return trovati[:n] if n else trovati

        return _Cur()


class _Db:
    def __init__(self, **coll):
        self._c = {k: _Coll(v) for k, v in coll.items()}

    def __getattr__(self, nome):
        return self._c.get(nome) or _Coll([])


def test_una_catena_che_ha_prodotto_ieri_e_sana():
    db = _Db(discovery_leads=[{"created_at": _quando(1)}])
    esito = asyncio.run(collaudo.collauda(db))

    lead = next(c for c in esito["catene"] if c["catena"] == "Lead scoperti")
    assert lead["verdetto"] == collaudo.PRODUCE
    assert lead["prodotto_negli_ultimi_giorni"] == 1
    # Su una catena sana non si spiega niente: sarebbe rumore.
    assert lead["cosa_significa"] is None


def test_ha_prodotto_in_passato_ma_non_piu_e_GIRA_A_VUOTO():
    """
    E' il caso dei 564 lead: il dato c'e', il job gira, e da mesi non aggiunge
    niente. Va distinto da «non ha mai funzionato», perche' l'indagine e'
    diversa: qui qualcosa si e' rotto, li' qualcosa non e' mai stato collegato.
    """
    db = _Db(discovery_leads=[{"created_at": _quando(90)}])
    esito = asyncio.run(collaudo.collauda(db))

    lead = next(c for c in esito["catene"] if c["catena"] == "Lead scoperti")
    assert lead["verdetto"] == collaudo.A_VUOTO
    assert lead["totale_storico"] == 1
    assert lead["giorni_dall_ultimo"] >= 89
    assert "filtro" in (lead["cosa_significa"] or "")


def test_mai_prodotto_niente_e_un_verdetto_a_parte():
    """Una catena a zero assoluto e' quasi sempre scollegata, non guasta."""
    esito = asyncio.run(collaudo.collauda(_Db()))

    task = next(c for c in esito["catene"] if "outreach eseguiti" in c["catena"])
    assert task["verdetto"] == collaudo.MAI
    # La spiegazione deve nominare la causa vera trovata nel codice.
    assert "consumatore" in task["cosa_significa"]


def test_la_sintesi_nomina_le_catene_rotte():
    """
    ⛔ Serve una riga leggibile in trenta secondi: e' l'unica che verra' letta
    davvero alle 7 del mattino.
    """
    db = _Db(
        discovery_leads=[{"created_at": _quando(1)}],
        ciak_leads=[{"created_at": _quando(1)}],
        email_logs=[{"sent_at": _quando(1), "status": "sent_smtp"}],
        luca_stato_giornaliero=[{"data": "oggi", "scritto_a": _quando(0)}],
    )
    esito = asyncio.run(collaudo.collauda(db))

    assert "Task di outreach eseguiti" in esito["in_sintesi"]
    assert esito["quante_rotte"] >= 1
    assert "NON producono" in esito["in_sintesi"]


def test_tutto_sano_lo_dice_senza_giri_di_parole():
    db = _Db(
        discovery_leads=[{"created_at": _quando(1)}],
        ciak_leads=[{"created_at": _quando(1)}],
        email_logs=[{"sent_at": _quando(1), "status": "sent_smtp"}],
        luca_stato_giornaliero=[{"data": "oggi", "scritto_a": _quando(0)}],
        agent_tasks=[{
            "created_at": _quando(1), "type": "auto_outreach_lead", "status": "done",
        }],
        ciak_systeme_events=[{"at": _quando(1), "applied_tags.0": True}],
    )
    # `auto_approved_at` sui lead: la catena dell'auto-approvazione.
    db._c["discovery_leads"] = _Coll([
        {"created_at": _quando(1), "auto_approved": True,
         "auto_approved_at": _quando(1)},
    ])

    esito = asyncio.run(collaudo.collauda(db))

    assert esito["quante_rotte"] == 0
    assert esito["in_sintesi"] == "tutte le catene producono"


def test_una_email_fallita_non_conta_come_contatto_avvenuto():
    """
    ⛔ Il punto piu' delicato: `status: failed` significa che la persona NON e'
    stata contattata. Contarla renderebbe il collaudo complice dello stesso
    inganno che deve smascherare.
    """
    db = _Db(email_logs=[{"sent_at": _quando(1), "status": "failed"}])
    esito = asyncio.run(collaudo.collauda(db))

    email = next(c for c in esito["catene"] if c["catena"] == "Email partite")
    assert email["prodotto_negli_ultimi_giorni"] == 0
    assert email["verdetto"] != collaudo.PRODUCE


def test_il_campo_data_del_briefing_e_quello_vero():
    """
    ⛔ Il 3/9 questa riga cercava `created_at` su una collection che scrive
    `scritto_a`: zero risultati sempre, e il collaudo dichiarava morto un
    briefing che girava. Il nome di un campo si legge nel codice che scrive, non
    si presume dalla convenzione delle altre collection.
    """
    db = _Db(luca_stato_giornaliero=[{"data": "2026-09-03", "scritto_a": _quando(0)}])
    esito = asyncio.run(collaudo.collauda(db))

    briefing = next(c for c in esito["catene"] if c["catena"] == "Briefing di Luca")
    assert briefing["verdetto"] == collaudo.PRODUCE, (
        "un briefing scritto oggi deve risultare vivo"
    )


def test_il_censimento_dice_dove_stanno_davvero_i_contatti():
    """
    Un job che cerca nella collection sbagliata e' il guasto piu' frequente di
    Ciak. Il censimento risponde con i numeri invece di lasciarlo dedurre.
    """
    db = _Db(discovery_leads=[], ciak_leads=[{"created_at": _quando(1)}] * 12)
    esito = asyncio.run(collaudo.collauda(db))

    dove = esito["dove_stanno_i_lead"]
    assert dove["discovery_leads"] == 0
    assert dove["ciak_leads"] == 12
    assert "lista_fredda" in dove, "va contata anche dove i lead potrebbero essere finiti"


def test_il_ponte_verso_systeme_e_sorvegliato():
    """
    ⛔ Il guasto trovato il 3/9/2026: in Systeme l'ultimo contatto e' dell'8
    agosto, mentre in Ciak gli opt-in continuavano ad arrivare. Chi si iscrive
    resta nel nostro database e fuori dalla lista email — non riceve niente.

    Era invisibile perche' la chiamata e' `asyncio.create_task(...)`,
    fire-and-forget: un errore non ferma l'opt-in e non lo sa nessuno.
    """
    db = _Db(ciak_systeme_events=[])
    esito = asyncio.run(collaudo.collauda(db))

    ponte = next(c for c in esito["catene"] if "Systeme" in c["catena"])
    assert ponte["verdetto"] != collaudo.PRODUCE
    # La spiegazione deve portare dritto alla prima cosa da controllare.
    assert "SYSTEME_API_KEY" in ponte["cosa_significa"]
    assert "lista email" in ponte["cosa_significa"]
