"""Dopo firma e pagamento: mail di conferma col PDF personalizzato e contratto in "I miei materiali".

Percorso simulato con le funzioni VERE (dati -> firma -> pagamento -> effetti di finalizzazione) e un database
finto che valuta i filtri. Sostituiti solo i confini col mondo esterno: SMTP (registrato), Systeme, Telegram,
Stripe, Cloudinary.

Due casi, perche' dipendono da dati diversi:
- cliente Ciak (Blueprint) SENZA documento `partners` prima del pagamento: il caso normale di chi entra in
  Partnership dall'area cliente. Prima della correzione la finalizzazione si fermava a "Dati contratto mancanti"
  DOPO aver incassato: niente PDF, niente mail, niente percorso operativo.
- documento `partners` gia' presente: la finalizzazione arrivava in fondo ma la mail partiva SENZA allegato
  (il PDF e' servito da /api/contract/pdf-download/{id}, che la lettura dell'allegato non sapeva aprire).
"""
import base64
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from routers import contract as contract_mod
from tests.test_proposta_payment_gate import _iso, proposta
from tests.test_proposta_security import FakeCollection

pytestmark = pytest.mark.unit

UID = "user-ciak-1"
DATI = {"nome": "Mario", "cognome": "Bianchi", "codice_fiscale": "BNCMRA80A01L219X", "indirizzo": "Via Roma 1",
        "cap": "10100", "citta": "Torino", "provincia": "TO", "email": "mario@example.com"}
FLAGS = {"consenso_checkbox": True, "clausole_vessatorie_approved": True, "approvazione_specifica_clausole": True,
         "dichiarazione_imprenditoriale": True, "piva": ""}
CASI = pytest.mark.parametrize("con_partners", [False, True], ids=["senza_doc_partners", "con_doc_partners"])


class Db:
    def __init__(self, con_partners=False):
        # Il cliente Ciak ha un `users` (creato da _create_user_for_client) e, di norma, NESSUN `partners`.
        self.users = FakeCollection([{"id": UID, "email": "mario@example.com", "name": "Mario Bianchi", "role": "cliente"}])
        self.partners = FakeCollection(
            [{"id": UID, "name": "Mario Bianchi", "email": "mario@example.com"}] if con_partners else [])
        self.ciak_clients = FakeCollection([{"id": "client-1", "email": "mario@example.com", "user_id": UID}])
        self.contract_partner_data = FakeCollection()
        self.contract_pdfs = FakeCollection()
        self.partnership_payment_audit = FakeCollection()
        self.partner_journey_steps = FakeCollection()
        self.proposte = FakeCollection([{
            "token": "tok-e2e", "partner_id": UID, "prospect_email": "mario@example.com", "prospect_nome": "Mario Bianchi",
            "stato": "accettata", "accettato_at": _iso(-1), "scadenza": _iso(5), "contract_params": {"corrispettivo": 2990},
        }])

    def __getitem__(self, name):
        return getattr(self, name)


def _req(body):
    return SimpleNamespace(json=AsyncMock(return_value=body))


async def _percorso(monkeypatch, con_partners=False, dopo_la_firma=None):
    """Esegue dati -> firma -> pagamento e raccoglie cosa e' successo."""
    db = Db(con_partners)
    monkeypatch.setattr(proposta, "db", db)
    monkeypatch.setattr(contract_mod, "db", db)
    monkeypatch.setattr(proposta, "_trusted_client_ip", lambda request: "192.0.2.9")
    for nome in ("_notify_telegram", "_activate_partner_account_and_notify", "_finalization_tags",
                 "_seed_operativo_journey_from_funnel"):
        monkeypatch.setattr(proposta, nome, AsyncMock())
    monkeypatch.setattr(contract_mod, "send_contract_email", AsyncMock())
    # Il backup su Cloudinary tenta la rete: nel test non deve uscire.
    fake_up = SimpleNamespace(upload=lambda *a, **k: None)
    monkeypatch.setitem(sys.modules, "cloudinary", SimpleNamespace(config=lambda **k: None, uploader=fake_up))
    monkeypatch.setitem(sys.modules, "cloudinary.uploader", fake_up)
    from reportlab import rl_config
    monkeypatch.setattr(rl_config, "pageCompression", 0)
    mail = []

    async def _registra(email, nome, pdf_bytes=None):
        mail.append({"email": email, "nome": nome, "pdf_bytes": pdf_bytes})

    monkeypatch.setattr(proposta, "send_contratto_firmato_async", _registra)

    out = {"mail": mail, "db": db, "errore": None}
    await proposta.salva_dati_contratto("tok-e2e", _req(DATI))
    await proposta.firma_contratto_proposta("tok-e2e", _req(FLAGS), None)
    if dopo_la_firma:
        await dopo_la_firma(db)
    try:
        doc = await db.proposte.find_one({"token": "tok-e2e"}, {"_id": 0})
        out["esito"] = await proposta.finalize_partnership_payment(doc, "stripe", "cs_test_e2e")
    except Exception as e:  # noqa: BLE001 - e' proprio cio' che si vuole osservare
        out["errore"] = f"{type(e).__name__}: {getattr(e, 'detail', e)}"
    return out


def _testo_pdf(pdf: bytes) -> str:
    return pdf.decode("latin-1").replace("\\(", "(").replace("\\)", ")")


@CASI
@pytest.mark.asyncio
async def test_la_finalizzazione_dopo_il_pagamento_arriva_in_fondo(monkeypatch, con_partners):
    out = await _percorso(monkeypatch, con_partners)
    assert out["errore"] is None, out["errore"]
    assert out["esito"]["complete"] is True


@CASI
@pytest.mark.asyncio
async def test_la_mail_di_conferma_parte_con_il_pdf_allegato(monkeypatch, con_partners):
    out = await _percorso(monkeypatch, con_partners)
    assert out["errore"] is None, out["errore"]
    assert len(out["mail"]) == 1 and out["mail"][0]["email"] == "mario@example.com"
    assert (out["mail"][0]["pdf_bytes"] or b"").startswith(b"%PDF"), "la mail e' partita SENZA il PDF allegato"


@CASI
@pytest.mark.asyncio
async def test_il_pdf_allegato_e_personalizzato_con_i_dati_inseriti_dal_partner(monkeypatch, con_partners):
    out = await _percorso(monkeypatch, con_partners)
    assert out["errore"] is None, out["errore"]
    pdf = out["mail"][0]["pdf_bytes"] or b""
    assert pdf, "nessun PDF allegato"
    testo = _testo_pdf(pdf)
    assert "Mario Bianchi" in testo and "BNCMRA80A01L219X" in testo and "Via Roma 1" in testo


@CASI
@pytest.mark.asyncio
async def test_l_allegato_e_lo_stesso_pdf_memorizzato_per_il_partner(monkeypatch, con_partners):
    out = await _percorso(monkeypatch, con_partners)
    assert out["errore"] is None, out["errore"]
    riga = await out["db"].contract_pdfs.find_one({"partner_id": UID})
    memorizzato = base64.b64decode(riga["pdf_base64"])
    assert memorizzato.startswith(b"%PDF")
    assert out["mail"][0]["pdf_bytes"] == memorizzato


@CASI
@pytest.mark.asyncio
async def test_il_contratto_compare_in_i_miei_materiali(monkeypatch, con_partners):
    """La pagina Materiali mostra la voce solo se /status dice firmato E /pdf conferma il PDF."""
    out = await _percorso(monkeypatch, con_partners)
    assert out["errore"] is None, out["errore"]
    stato = await contract_mod.get_contract_status(UID)
    assert stato["signed"] is True, "get_contract_status: il contratto risulta NON firmato"
    pdf = await contract_mod.get_contract_pdf(UID)
    assert pdf["success"] is True and pdf["pdf_url"].endswith(UID)
    download = await contract_mod.download_contract_pdf(UID)
    assert download.body.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_senza_doc_partners_il_contratto_viene_copiato_sul_partner_creato_al_pagamento(monkeypatch):
    out = await _percorso(monkeypatch, con_partners=False)
    assert out["errore"] is None, out["errore"]
    partner = await out["db"].partners.find_one({"id": UID})
    assert partner["contract"]["approvazione_specifica_clausole"] is True
    assert partner["contract"]["luogo_accettazione"] == "Torino"
    assert partner["contract_signed"] is True and partner["contract_signed_at"] == partner["contract"]["signed_at"]


@pytest.mark.asyncio
async def test_se_il_contratto_c_e_solo_sulla_proposta_la_finalizzazione_funziona_lo_stesso(monkeypatch):
    """Terza fonte: il registro dell'accettazione sulla proposta, che la firma salva sempre."""
    async def _toglie_il_contratto_da_users_e_partners(db):
        for coll in (db.users, db.partners):
            for doc in coll.docs:
                doc.pop("contract", None)

    out = await _percorso(monkeypatch, con_partners=True, dopo_la_firma=_toglie_il_contratto_da_users_e_partners)
    assert out["errore"] is None, out["errore"]
    assert (out["mail"][0]["pdf_bytes"] or b"").startswith(b"%PDF")
    assert (await contract_mod.get_contract_status(UID))["signed"] is True


@pytest.mark.asyncio
async def test_senza_alcun_contratto_firmato_la_finalizzazione_si_ferma_con_l_errore_chiaro(monkeypatch):
    """Resta il blocco onesto: niente PDF inventato se il contratto firmato non esiste da nessuna parte."""
    async def _cancella_ovunque(db):
        for coll in (db.users, db.partners):
            for doc in coll.docs:
                doc.pop("contract", None)
        db.proposte.docs[0].pop("contract_acceptance", None)

    out = await _percorso(monkeypatch, con_partners=True, dopo_la_firma=_cancella_ovunque)
    assert out["errore"] and "contract_pdf" in out["errore"]
    assert out["mail"] == []
