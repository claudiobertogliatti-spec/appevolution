"""Contratto Partnership: dati anagrafici prima, doppia sottoscrizione con i soli flag, Torino fisso.

Prima di questa modifica la pagina mandava `clausole_vessatorie_approved: true` da sola: il
cliente non approvava mai, di fatto, le clausole dell'Art. 15.5 (artt. 1341-1342 c.c.).
Qui si prova che adesso e' un atto distinto, obbligatorio, registrato con luogo e data.
"""
import base64
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from routers.insider_helpers import LUOGO_ACCETTAZIONE, build_contract_acceptance, validate_dati_contratto
from tests.test_proposta_payment_gate import GateDb, _iso, _proposta_doc, _request, proposta
from tests.test_proposta_security import FakeCollection

pytestmark = pytest.mark.unit

DATI = {
    "nome": "Mario", "cognome": "Bianchi", "codice_fiscale": "BNCMRA80A01L219X",
    "indirizzo": "Via Roma 1", "cap": "10100", "citta": "Torino", "provincia": "TO",
    "email": "mario@example.com",
}


# ── dati anagrafici ───────────────────────────────────────────────────────────

def test_dati_validi_vengono_normalizzati_e_gli_extra_scartati():
    out = validate_dati_contratto({
        **DATI, "codice_fiscale": " bncmra80a01l219x ", "provincia": "to", "email": "MARIO@EXAMPLE.COM",
        "partita_iva": "IT 12345678901", "iban": "IT00X0000000000000000000000", "partner_id": "evil",
    })
    assert out["codice_fiscale"] == "BNCMRA80A01L219X"
    assert out["provincia"] == "TO"
    assert out["email"] == "MARIO@EXAMPLE.COM"
    assert out["partita_iva"] == "12345678901"
    assert "iban" not in out and "partner_id" not in out


@pytest.mark.parametrize("campo", ["nome", "cognome", "codice_fiscale", "indirizzo", "cap", "citta", "provincia", "email"])
def test_ogni_dato_obbligatorio_manca_con_messaggio_chiaro(campo):
    dati = {**DATI, campo: "   "}
    with pytest.raises(ValueError, match="Inserisci"):
        validate_dati_contratto(dati)


@pytest.mark.parametrize("campo,valore", [
    ("codice_fiscale", "TROPPO-CORTO"), ("cap", "1010"), ("cap", "10A00"), ("provincia", "TOR"),
    ("provincia", "T0"), ("email", "non-una-email"), ("pec", "x@y"), ("partita_iva", "1234567890"),
])
def test_formati_sbagliati_sono_rifiutati(campo, valore):
    with pytest.raises(ValueError):
        validate_dati_contratto({**DATI, campo: valore})


def test_valori_non_stringa_o_enormi_sono_rifiutati():
    with pytest.raises(ValueError):
        validate_dati_contratto({**DATI, "nome": 123})
    with pytest.raises(ValueError):
        validate_dati_contratto({**DATI, "indirizzo": "x" * 500})
    with pytest.raises(ValueError):
        validate_dati_contratto("non un dict")


def test_pec_e_azienda_sono_facoltative():
    out = validate_dati_contratto(DATI)
    assert out["pec"] == "" and out["nome_azienda"] == "" and out["partita_iva"] == ""


# ── elenco clausole (Art. 15.5) ───────────────────────────────────────────────

def test_elenco_clausole_dal_testo_vero_del_contratto():
    from routers.contract import clausole_approvazione_specifica
    elenco = clausole_approvazione_specifica()
    assert len(elenco) == 14
    assert elenco[0] == "Articolo 1.4 (Esclusiva)"
    assert elenco[-1] == "Articolo 14.4 (Foro competente esclusivo di Torino)"
    assert not any("letto integralmente" in c for c in elenco)  # non pesca i punti di 15.4


def test_elenco_clausole_vuoto_se_la_sezione_non_c_e():
    from routers.contract import clausole_approvazione_specifica
    assert clausole_approvazione_specifica("ARTICOLO 1\n• non pertinente") == []


# ── registro dell'accettazione ────────────────────────────────────────────────

def _flags(**extra):
    return {"clausole_vessatorie_approved": True, "consenso_checkbox": True,
            "dichiarazione_imprenditoriale": True, **extra}


def test_torino_e_fisso_il_client_non_puo_cambiarlo():
    cd = build_contract_acceptance(_flags(approvazione_specifica_clausole=True, luogo_accettazione="Milano"),
                                   "1.2.3.4", "2026-10-04T10:00:00+00:00")
    assert cd["luogo_accettazione"] == LUOGO_ACCETTAZIONE == "Torino"
    assert cd["approvazione_specifica_clausole"] is True


def test_approvazione_specifica_assente_vale_falso_e_non_si_deduce():
    cd = build_contract_acceptance(_flags(), "1.2.3.4", "now")
    assert cd["approvazione_specifica_clausole"] is False


@pytest.mark.parametrize("valore", ["true", 1, "si"])
def test_approvazione_specifica_deve_essere_un_booleano_vero(valore):
    with pytest.raises(ValueError):
        build_contract_acceptance(_flags(approvazione_specifica_clausole=valore), "ip", "now")


# ── endpoint: dati-contratto ──────────────────────────────────────────────────

class Db(GateDb):
    def __init__(self, proposta_doc):
        super().__init__(proposta_doc)
        self.contract_partner_data = FakeCollection()


def _req(body):
    return SimpleNamespace(json=AsyncMock(return_value=body))


@pytest.mark.asyncio
async def test_dati_salvati_per_il_partner_della_proposta_non_per_quello_nel_body(monkeypatch):
    db = Db(_proposta_doc(contratto_firmato_at=None, stato="accettata"))
    monkeypatch.setattr(proposta, "db", db)
    res = await proposta.salva_dati_contratto("tok-gate", _req({**DATI, "partner_id": "evil", "iban": "IT0"}))
    assert res == {"success": True}
    saved = db.contract_partner_data.docs[0]
    assert saved["partner_id"] == "user-1" and saved["nome"] == "Mario" and "iban" not in saved
    assert db.proposte.docs[0]["dati_contratto_at"]


@pytest.mark.asyncio
@pytest.mark.parametrize("overrides,status", [
    ({"pagamento_completato": True}, 409),
    ({"scadenza": _iso(-1)}, 410),
    ({"stato": "inviata", "accettato_at": None}, 409),
    ({"partner_id": None}, 409),
])
async def test_dati_rifiutati_nei_casi_non_validi(monkeypatch, overrides, status):
    monkeypatch.setattr(proposta, "db", Db(_proposta_doc(contratto_firmato_at=None, **overrides)))
    with pytest.raises(HTTPException) as err:
        await proposta.salva_dati_contratto("tok-gate", _req(DATI))
    assert err.value.status_code == status


@pytest.mark.asyncio
async def test_dati_token_sconosciuto_e_dati_invalidi(monkeypatch):
    monkeypatch.setattr(proposta, "db", Db(_proposta_doc(contratto_firmato_at=None)))
    with pytest.raises(HTTPException) as err:
        await proposta.salva_dati_contratto("altro-token", _req(DATI))
    assert err.value.status_code == 404
    with pytest.raises(HTTPException) as err:
        await proposta.salva_dati_contratto("tok-gate", _req({**DATI, "cap": "12"}))
    assert err.value.status_code == 422 and "CAP" in err.value.detail


# ── endpoint: firma-contratto con doppia sottoscrizione ───────────────────────

def _prepara_firma(monkeypatch, **overrides):
    db = Db(_proposta_doc(contratto_firmato_at=None, contract_acceptance=None, dati_contratto_at=_iso(-1), **overrides))
    monkeypatch.setattr(proposta, "db", db)
    monkeypatch.setattr(proposta, "_trusted_client_ip", lambda request: "192.0.2.7")
    monkeypatch.setattr(proposta, "_notify_telegram", AsyncMock())
    return db


@pytest.mark.asyncio
async def test_firma_senza_approvazione_specifica_e_rifiutata(monkeypatch):
    db = _prepara_firma(monkeypatch)
    with pytest.raises(HTTPException) as err:
        await proposta.firma_contratto_proposta("tok-gate", _req(_flags()), None)
    assert err.value.status_code == 422 and "clausole" in err.value.detail
    assert not db.proposte.docs[0].get("contratto_firmato_at")


@pytest.mark.asyncio
async def test_firma_senza_i_dati_personali_e_rifiutata(monkeypatch):
    db = _prepara_firma(monkeypatch)
    db.proposte.docs[0].pop("dati_contratto_at")
    with pytest.raises(HTTPException) as err:
        await proposta.firma_contratto_proposta(
            "tok-gate", _req(_flags(approvazione_specifica_clausole=True)), None)
    assert err.value.status_code == 422 and "dati" in err.value.detail
    assert not db.proposte.docs[0].get("contratto_firmato_at")


@pytest.mark.asyncio
async def test_doppia_firma_completa_registra_torino_data_e_snapshot_delle_clausole(monkeypatch):
    db = _prepara_firma(monkeypatch)
    res = await proposta.firma_contratto_proposta(
        "tok-gate", _req(_flags(approvazione_specifica_clausole=True, piva="")), None)
    assert res["success"] is True
    acc = db.proposte.docs[0]["contract_acceptance"]
    assert acc["metodo"] == "checkbox"
    assert acc["approvazione_specifica_clausole"] is True
    assert acc["luogo_accettazione"] == "Torino"
    assert acc["approvazione_specifica_at"] == acc["signed_at"]
    assert len(acc["clausole_approvate"]) == 14
    assert acc["ip_address"] == "192.0.2.7"
    assert db.partners.docs[0]["contract"]["clausole_approvate"] == acc["clausole_approvate"]


@pytest.mark.asyncio
async def test_firma_registrata_senza_approvazione_specifica_viene_completata_senza_toccare_la_data(monkeypatch):
    """Chi aveva accettato con la vecchia pagina (un solo flag) la completa, senza ripartire da capo."""
    db = _prepara_firma(monkeypatch)
    db.proposte.docs[0].update({
        "contratto_firmato_at": "2026-09-30T09:00:00+00:00", "stato": "contratto_firmato",
        "contract_acceptance": {"metodo": "checkbox", "dichiarazione_imprenditoriale": True},
    })
    res = await proposta.firma_contratto_proposta(
        "tok-gate", _req(_flags(approvazione_specifica_clausole=True)), None)
    assert res["already_signed"] is True and res["signed_at"] == "2026-09-30T09:00:00+00:00"
    assert db.proposte.docs[0]["contract_acceptance"]["approvazione_specifica_clausole"] is True
    assert db.proposte.docs[0]["contratto_firmato_at"] == "2026-09-30T09:00:00+00:00"


# ── pagamento ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pagamento_bloccato_se_accettazione_a_flag_senza_approvazione_specifica(monkeypatch):
    monkeypatch.setattr(proposta, "db", GateDb(_proposta_doc(
        contract_acceptance={"metodo": "checkbox", "dichiarazione_imprenditoriale": True})))
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_fixture")
    with pytest.raises(HTTPException) as err:
        await proposta.pagamento_stripe("tok-gate", _request())
    assert err.value.status_code == 409
    assert err.value.detail["code"] == "SPECIFIC_APPROVAL_REQUIRED"


@pytest.mark.asyncio
async def test_pagamento_con_doppia_sottoscrizione_supera_il_blocco(monkeypatch):
    monkeypatch.setattr(proposta, "db", GateDb(_proposta_doc(contract_acceptance={
        "metodo": "checkbox", "dichiarazione_imprenditoriale": True, "approvazione_specifica_clausole": True})))
    monkeypatch.delenv("STRIPE_API_KEY", raising=False)
    with pytest.raises(HTTPException) as err:
        await proposta.pagamento_stripe("tok-gate", _request())
    assert err.value.status_code == 500  # arriva a Stripe: i controlli sul contratto sono superati


# ── PDF: onesto sul metodo ───────────────────────────────────────────────────

def _pdf_text(monkeypatch, contract_data):
    """Genera il PDF vero e ne ricava il testo. Senza pypdf (non e' in requirements.txt): si
    spegne la compressione di reportlab e si leggono i flussi di testo grezzi, cosi' il test
    gira anche in CI invece di essere saltato in silenzio."""
    from reportlab import rl_config
    from routers import contract as contract_mod
    monkeypatch.setattr(rl_config, "pageCompression", 0)
    # Il backup su Cloudinary e' non bloccante ma tenta la rete: nel test non deve uscire.
    import sys
    fake_uploader = SimpleNamespace(upload=lambda *a, **k: None)
    monkeypatch.setitem(sys.modules, "cloudinary", SimpleNamespace(config=lambda **k: None, uploader=fake_uploader))
    monkeypatch.setitem(sys.modules, "cloudinary.uploader", fake_uploader)

    class PdfDb:
        def __init__(self):
            self.partners = FakeCollection([{"id": "user-1"}])
            self.contract_partner_data = FakeCollection([{"partner_id": "user-1", **DATI}])
            self.contract_pdfs = FakeCollection()

    pdfdb = PdfDb()
    monkeypatch.setattr(contract_mod, "db", pdfdb)
    import asyncio
    url = asyncio.get_event_loop_policy().new_event_loop().run_until_complete(
        contract_mod.generate_contract_pdf({"id": "user-1", "name": "Account Demo", "email": "a@b.it"}, contract_data))
    assert url, "il PDF non e' stato generato"
    raw = base64.b64decode(pdfdb.contract_pdfs.docs[0]["pdf_base64"]).decode("latin-1")
    return raw.replace("\\(", "(").replace("\\)", ")")


def test_pdf_con_flag_non_si_dichiara_firma_digitale_e_porta_torino_e_le_clausole(monkeypatch):
    cd = build_contract_acceptance(_flags(approvazione_specifica_clausole=True), "192.0.2.7", "2026-10-04T10:00:00+00:00")
    cd["clausole_approvate"] = ["Articolo 99.9 (Clausola di prova)"]
    text = _pdf_text(monkeypatch, cd)
    assert "Accettazione elettronica" in text
    assert "Torino" in text
    assert "Clausola di prova" in text                          # stampa lo snapshot, non una lista fissa
    assert "Mario Bianchi" in text                              # i dati inseriti, non il nome dell'account
    assert "Account Demo" not in text
    assert "Firma digitale tramite" not in text
    assert "D.Lgs." not in text                                 # niente claim da firma digitale per un flag


def test_pdf_con_firma_disegnata_resta_come_prima(monkeypatch):
    cd = build_contract_acceptance(
        {"clausole_vessatorie_approved": True, "signature_base64": "AAAA"}, "192.0.2.7", "2026-10-04T10:00:00+00:00")
    text = _pdf_text(monkeypatch, cd)
    assert "Firma digitale tramite" in text and "D.Lgs." in text
