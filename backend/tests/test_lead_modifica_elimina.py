"""
Lead: modifica (nome, cognome, email, telefono) ed eliminazione.
Regole delicate: l'email cambia solo se non c'e' un account o una proposta; l'account
Blueprint si elimina solo su richiesta e mai se ha acquistato. DB fittizio.
"""
import re

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services.lead_edit import ModificaNonValida, prepara_modifica

pytestmark = pytest.mark.unit
ADMIN = object()


# ── funzione pura ─────────────────────────────────────────────────────────

def test_nome_e_cognome_compongono_il_nome_per_intero():
    m = prepara_modifica(nome="Anna Maria", cognome="Bernard")
    assert m["lead"]["nome"] == "Anna Maria Bernard"
    assert m["lead"]["nome_proprio"] == "Anna Maria" and m["lead"]["cognome"] == "Bernard"
    assert m["nome_completo"] == "Anna Maria Bernard"


def test_solo_nome_vecchia_modifica_non_tocca_cognome():
    m = prepara_modifica(nome="Rosa Maria Verdi")
    assert m["lead"] == {"nome": "Rosa Maria Verdi"} and "cognome" not in m["lead"]


def test_cognome_vuoto_e_ammesso_nome_vuoto_no():
    assert prepara_modifica(nome="Linda", cognome="")["lead"]["nome"] == "Linda"
    with pytest.raises(ModificaNonValida):
        prepara_modifica(nome="  ", cognome="Pavia")
    with pytest.raises(ModificaNonValida):
        prepara_modifica(cognome="Pavia")


def test_telefono_si_scrive_nei_due_campi():
    m = prepara_modifica(telefono=" +39 333 1234567 ")
    assert m["lead"] == {"telefono": "+39 333 1234567", "phone": "+39 333 1234567"}


def test_email_normalizzata_e_validata_e_niente_da_aggiornare():
    assert prepara_modifica(nuova_email=" Linda@X.it ")["email"] == "linda@x.it"
    with pytest.raises(ModificaNonValida):
        prepara_modifica(nuova_email="non-una-email")
    with pytest.raises(ModificaNonValida):
        prepara_modifica()


# ── database fittizio ─────────────────────────────────────────────────────

def _match(doc, query):
    for k, v in query.items():
        if k == "$or":
            if not any(_match(doc, q) for q in v):
                return False
        elif isinstance(v, dict) and "$regex" in v:
            if not re.match(v["$regex"], str(doc.get(k) or ""), re.I if "i" in v.get("$options", "") else 0):
                return False
        elif doc.get(k) != v:
            return False
    return True


class _R:
    def __init__(self, n):
        self.matched_count = self.deleted_count = n


class _Coll:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        return next((dict(d) for d in self.docs if _match(d, query)), None)

    async def update_one(self, query, update):
        for d in self.docs:
            if _match(d, query):
                d.update(update["$set"])
                return _R(1)
        return _R(0)

    async def update_many(self, query, update):
        n = 0
        for d in self.docs:
            if _match(d, query):
                d.update(update["$set"])
                n += 1
        return _R(n)

    async def delete_many(self, query):
        keep = [d for d in self.docs if not _match(d, query)]
        n = len(self.docs) - len(keep)
        self.docs = keep
        return _R(n)

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if _match(d, query):
                del self.docs[i]
                return _R(1)
        return _R(0)


class _Db:
    def __init__(self, leads=(), diag=(), clients=(), proposte=()):
        self.ciak_leads = _Coll(leads)
        self.diagnostic_sessions = _Coll(diag)
        self.ciak_checkpoint_events = _Coll([])
        self.ciak_clients = _Coll(clients)
        self.proposte = _Coll(proposte)
        for n in ("partners", "users", "partner_journey_steps", "ciak_start_deliverables",
                  "ciak_client_login_tokens", "ciak_client_access_recovery", "ciak_onboarding_emails"):
            setattr(self, n, _Coll([]))


LEAD = {"email": "linda@x.it", "nome": "Linda Pavia"}
DIAG = {"user_email": "Linda@X.it", "user_name": "Linda Pavia"}


def _edit(**kw):
    return ciak_admin.LeadEditIn(email="linda@x.it", **kw)


@pytest.mark.asyncio
async def test_modifica_nome_cognome_telefono_aggiorna_scheda_e_questionario(monkeypatch):
    db = _Db([LEAD], [DIAG])
    monkeypatch.setattr(ciak_admin, "db", db)
    await ciak_admin.ciak_lead_edit(_edit(nome="Linda", cognome="Pavia", phone="333"), admin=ADMIN)
    assert db.ciak_leads.docs[0]["nome"] == "Linda Pavia" and db.ciak_leads.docs[0]["cognome"] == "Pavia"
    assert db.ciak_leads.docs[0]["telefono"] == db.ciak_leads.docs[0]["phone"] == "333"
    assert db.diagnostic_sessions.docs[0]["user_name"] == "Linda Pavia"


@pytest.mark.asyncio
async def test_cambio_email_aggiorna_le_tre_collezioni(monkeypatch):
    db = _Db([LEAD], [DIAG])
    db.ciak_checkpoint_events.docs = [{"email": "linda@x.it"}]
    monkeypatch.setattr(ciak_admin, "db", db)
    r = await ciak_admin.ciak_lead_edit(_edit(nuova_email="Nuova@X.it"), admin=ADMIN)
    assert r["email"] == "nuova@x.it"
    assert db.ciak_leads.docs[0]["email"] == "nuova@x.it"
    assert db.diagnostic_sessions.docs[0]["user_email"] == "nuova@x.it"
    assert db.ciak_checkpoint_events.docs[0]["email"] == "nuova@x.it"


@pytest.mark.asyncio
@pytest.mark.parametrize("db_kw,frase", [
    ({"clients": [{"id": "c1", "email": "linda@x.it", "access_level": "cliente_blueprint"}]}, "account"),
    ({"proposte": [{"prospect_email": "linda@x.it"}]}, "proposta"),
    ({"leads": [LEAD, {"email": "nuova@x.it"}]}, "gia' di un altro"),
])
async def test_cambio_email_rifiutato_e_niente_scritto(monkeypatch, db_kw, frase):
    db = _Db(**{"leads": [LEAD], "diag": [DIAG], **db_kw})
    monkeypatch.setattr(ciak_admin, "db", db)
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.ciak_lead_edit(_edit(nuova_email="nuova@x.it"), admin=ADMIN)
    assert exc.value.status_code == 409 and frase in exc.value.detail
    assert db.ciak_leads.docs[0]["email"] == "linda@x.it"


@pytest.mark.asyncio
async def test_email_non_valida_400(monkeypatch):
    monkeypatch.setattr(ciak_admin, "db", _Db([LEAD], [DIAG]))
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.ciak_lead_edit(_edit(nuova_email="boh"), admin=ADMIN)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_elimina_lead_senza_toccare_l_account_se_non_richiesto(monkeypatch):
    db = _Db([LEAD], [DIAG], clients=[{"id": "c1", "email": "linda@x.it", "access_level": "cliente_blueprint"}])
    monkeypatch.setattr(ciak_admin, "db", db)
    r = await ciak_admin.ciak_delete_lead(email="linda@x.it", elimina_account=False, admin=ADMIN)
    assert r["ciak_leads_deleted"] == 1 and r["account_deleted"] is None
    assert len(db.ciak_clients.docs) == 1  # l'accesso resta attivo


@pytest.mark.asyncio
async def test_elimina_lead_e_account_blueprint_gratuito(monkeypatch):
    db = _Db([LEAD], [DIAG], clients=[{"id": "c1", "email": "linda@x.it", "access_level": "cliente_blueprint"}])
    monkeypatch.setattr(ciak_admin, "db", db)
    r = await ciak_admin.ciak_delete_lead(email="linda@x.it", elimina_account=True, admin=ADMIN)
    assert r["account_deleted"]["ciak_clients"] == 1 and db.ciak_clients.docs == []


@pytest.mark.asyncio
async def test_chi_ha_acquistato_non_perde_l_account_e_il_lead_resta(monkeypatch):
    db = _Db([LEAD], [DIAG], clients=[{"id": "c1", "email": "linda@x.it", "access_level": "cliente_start"}])
    monkeypatch.setattr(ciak_admin, "db", db)
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.ciak_delete_lead(email="linda@x.it", elimina_account=True, admin=ADMIN)
    assert exc.value.status_code == 409
    assert len(db.ciak_leads.docs) == 1 and len(db.ciak_clients.docs) == 1  # niente e' stato cancellato
