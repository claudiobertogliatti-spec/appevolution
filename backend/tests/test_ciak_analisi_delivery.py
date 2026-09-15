import pytest
from services import ciak_analisi_delivery as delivery


class FakeColl:
    def __init__(self, doc=None): self.doc = doc; self.updated = None
    async def find_one(self, q): return self.doc
    async def update_one(self, q, upd): self.updated = upd["$set"]


class FakeDB:
    def __init__(self, doc): self.ciak_analisi = FakeColl(doc)


@pytest.mark.asyncio
async def test_processa_acquisto_idempotente(monkeypatch):
    doc = {"session_token": "t1", "email": "c@x.it", "bozza": {"intro": "x", "bullet_per_capitolo": {}},
           "bozza_inviata_at": "2026-05-29T10:00:00Z"}
    delivery.set_db(FakeDB(doc))
    monkeypatch.setattr(delivery.ciak_analisi, "genera_e_salva", lambda t, force=False: _a({"already_exists": True}))
    monkeypatch.setattr(delivery, "_send_email_attachment", lambda **k: (True, None))
    res = await delivery.processa_acquisto("t1", "c@x.it", "Cliente")
    assert res["skipped"] == "gia_inviata"


@pytest.mark.asyncio
async def test_processa_acquisto_invia_blueprint(monkeypatch):
    """Path primario: consegna il Blueprint DEFINITIVO a 13 sezioni."""
    doc = {"session_token": "t2", "email": "c@x.it",
           "bozza": {"intro": "x", "bullet_per_capitolo": {}}, "bozza_inviata_at": None}
    db = FakeDB(doc)
    delivery.set_db(db)
    monkeypatch.setattr(delivery.ciak_analisi, "genera_e_salva", lambda t, force=False: _a({"already_exists": False}))
    monkeypatch.setattr(delivery.ciak_analisi, "genera_blueprint",
                        lambda t: _a({"meta": {}, "sezioni": {}}))
    monkeypatch.setattr(delivery.ciak_pdf_blueprint, "genera_blueprint_pdf", lambda p: _a(b"BLUEPRINT-PDF"))
    monkeypatch.setattr(delivery, "_upload_pdf", lambda data, token: _a("https://cdn/x.pdf"))
    sent = {}
    monkeypatch.setattr(delivery, "_send_email_attachment",
                        lambda **k: sent.update(k) or (True, None))
    res = await delivery.processa_acquisto("t2", "c@x.it", "Cliente")
    assert res["sent"] is True
    assert db.ciak_analisi.updated["bozza_inviata_at"] is not None
    assert db.ciak_analisi.updated["deliverable_kind"] == "blueprint"
    assert db.ciak_analisi.updated["bozza"]["pdf_url"] == "https://cdn/x.pdf"
    assert sent["to"] == "c@x.it"
    assert sent["pdf_bytes"] == b"BLUEPRINT-PDF"


@pytest.mark.asyncio
async def test_processa_acquisto_degrada_a_teaser(monkeypatch):
    """Se il Blueprint 13-sez fallisce, la consegna NON si blocca: manda il teaser."""
    doc = {"session_token": "t3", "email": "c@x.it",
           "bozza": {"intro": "x", "bullet_per_capitolo": {}}, "bozza_inviata_at": None}
    db = FakeDB(doc)
    delivery.set_db(db)
    monkeypatch.setattr(delivery.ciak_analisi, "genera_e_salva", lambda t, force=False: _a({"already_exists": False}))

    async def _boom(t): raise RuntimeError("anthropic down")
    monkeypatch.setattr(delivery.ciak_analisi, "genera_blueprint", _boom)
    monkeypatch.setattr(delivery.ciak_pdf, "genera_bozza_pdf", lambda b, n: _a(b"TEASER-PDF"))
    monkeypatch.setattr(delivery, "_upload_pdf", lambda data, token: _a(None))
    sent = {}
    monkeypatch.setattr(delivery, "_send_email_attachment",
                        lambda **k: sent.update(k) or (True, None))
    res = await delivery.processa_acquisto("t3", "c@x.it", "Cliente")
    assert res["sent"] is True
    assert db.ciak_analisi.updated["deliverable_kind"] == "teaser"
    assert sent["pdf_bytes"] == b"TEASER-PDF"


async def _a(v): return v
