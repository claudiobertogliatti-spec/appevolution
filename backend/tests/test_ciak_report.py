"""Report settimana: finestre, variazioni, voce non contabile = None (mai zero)."""
import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from routers import ciak_admin
from services import ciak_report as rp

pytestmark = pytest.mark.unit
NOW = datetime(2026, 10, 12, 12, 0, tzinfo=timezone.utc)


def test_finestre_adiacenti_di_7_giorni():
    f = rp.finestre(NOW)
    assert f["attuale"][0] == f["precedente"][1] and f["attuale"][1] == NOW.isoformat()


def test_variazione():
    assert rp.variazione(5, 3) == 2 and rp.variazione(0, 4) == -4
    assert rp.variazione(None, 3) is None and rp.variazione(3, None) is None


def test_costruisci_tiene_tutte_le_voci_e_il_none():
    righe = rp.costruisci({"contatti": (4, 1)})
    assert len(righe) == len(rp.VOCI)
    assert righe[0]["variazione"] == 3
    assert righe[1]["attuale"] is None and righe[1]["variazione"] is None


class _C:
    def __init__(self, n=None, boom=False): self.n, self.boom, self.q = n, boom, []
    async def count_documents(self, q):
        self.q.append(q)
        if self.boom: raise RuntimeError("giu")
        return self.n


def test_endpoint_conta_e_segnala_il_non_contabile(monkeypatch):
    dbf = {c: _C(2) for c in ("ciak_leads", "diagnostic_sessions", "proposte", "ciak_solleciti", "ciak_social_queue")}
    dbf["ciak_reel"] = _C(boom=True)
    monkeypatch.setattr(ciak_admin, "db", dbf)
    out = asyncio.new_event_loop().run_until_complete(ciak_admin.report_settimana(SimpleNamespace()))
    per = {v["chiave"]: v for v in out["voci"]}
    assert per["contatti"]["attuale"] == 2 and per["contatti"]["variazione"] == 0
    assert per["reel"]["attuale"] is None and per["reel"]["variazione"] is None
    assert dbf["ciak_social_queue"].q[0]["status"] == "published"
