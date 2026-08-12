"""La prova che chiude il Blocco 1.

Un cliente con entitlement Ciak Start apre lo step posizionamento, compila le
risposte e `finalize_posizionamento` produce il documento: niente 403 (la
guardia partner lo riconosce), niente 400 (le risposte sono dove il motore le
cerca). Finche' non c'e' questo, sono solo permessi spostati.

Il render del PDF e' sostituito da uno stub perche' la CI non ha Chromium: qui
si prova il percorso: identita' -> guardia -> step -> motore -> file. La prova
con il PDF vero, generato da Playwright, sta in HANDOFF.md.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from models.start_journey import START_JOURNEY_STEPS_DEFINITION
from routers import partner_journey, posizionamento_approval
from services.start_partner_bridge import ensure_start_partner_bridge

pytestmark = pytest.mark.unit

CLIENT_ID = "client-start-e2e"

# Le 20 chiavi del wizard, tutte oltre il minimo di POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR.
ANSWERS = {
    "nicchia": "Fotografi di matrimonio in Lombardia che lavorano da soli e vogliono alzare il prezzo medio",
    "momento_di_vita": "Ha gia' un portfolio ma lavora sotto costo e accetta ogni richiesta",
    "livello_consapevolezza": "Sa di avere un problema di prezzo ma non conosce una soluzione strutturata",
    "promessa": "Passare da otto a diciotto matrimoni all'anno con un prezzo medio raddoppiato in una sola stagione",
    "trasformazione_90gg": "In novanta giorni costruisce un pacchetto premium, un listino difendibile e una pagina che lo vende senza trattativa",
    "prezzo_e_formato": "Percorso online da milleduecento euro, otto settimane, con revisione dei materiali",
    "metodo_nome": "Metodo Scatto Pieno",
    "metodo_step": "Primo: si riscrive il pacchetto partendo dal valore percepito, non dalle ore. Secondo: si costruisce il listino a tre livelli. Terzo: si porta tutto in una pagina di vendita che regge da sola.",
    "prova_sociale_concreta": "Sette fotografi hanno raddoppiato il prezzo medio nella stagione successiva, con i contratti a dimostrarlo",
    "origin_story": "Ho fatto quarant'anni di matrimoni sottopagati prima di capire che il problema non era la qualita' delle foto ma il modo in cui le presentavo al cliente prima ancora di scattarle.",
    "contrarian_view": "Abbassare il prezzo per riempire l'agenda e' il modo piu' rapido per non lavorare mai piu' con chi paga bene",
    "differenza_riconoscibile": "Non insegno a fotografare meglio: insegno a vendere quello che gia' sai fare",
    "paure_avatar": "Teme che alzando il prezzo il telefono smetta semplicemente di squillare",
    "desideri_avatar": "Vuole scegliere i matrimoni invece di prendere tutto quello che arriva",
    "costo_del_no": "Un'altra stagione a lavorare tutti i sabati per un margine che non copre l'attrezzatura",
    "concorrenti_principali": "Corsi di tecnica fotografica e gruppi Facebook gratuiti",
    "mercato_affollato": "Tutti insegnano luce e post-produzione, nessuno tocca il prezzo e la trattativa",
    "obiezione_principale": "Nella mia zona non c'e' nessuno disposto a pagare quelle cifre per un matrimonio",
    "limite_onesto": "Non funziona per chi non ha ancora un portfolio con almeno dieci matrimoni veri",
    "spazio_specialista": "Il posizionamento sul prezzo per fotografi gia' operativi non lo presidia nessuno",
}


def _matches(doc, query):
    for key, value in query.items():
        if isinstance(value, dict):
            if "$ne" in value and doc.get(key) == value["$ne"]:
                return False
            if "$exists" in value and (key in doc) != value["$exists"]:
                return False
            if "$in" in value and doc.get(key) not in value["$in"]:
                return False
            continue
        if doc.get(key) != value:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, key, direction=1):
        self._docs = sorted(self._docs, key=lambda d: d.get(key) or 0, reverse=direction < 0)
        return self

    async def to_list(self, length=None):
        return [dict(d) for d in self._docs[:length]]


class _Collection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None, sort=None):
        found = [d for d in self.docs if _matches(d, query)]
        if sort:
            key, direction = sort[0]
            found = sorted(found, key=lambda d: d.get(key) or "", reverse=direction < 0)
        return dict(found[0]) if found else None

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query or {})])

    async def count_documents(self, query):
        return len([d for d in self.docs if _matches(d, query)])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("R", (), {"inserted_id": doc.get("id")})()

    async def insert_many(self, docs):
        self.docs.extend(dict(d) for d in docs)
        return type("R", (), {"inserted_ids": []})()

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return type("R", (), {"matched_count": 1, "modified_count": 1})()
        if upsert:
            new_doc = {k: v for k, v in query.items() if not isinstance(v, dict)}
            new_doc.update(update.get("$set", {}))
            self.docs.append(new_doc)
            return type("R", (), {"matched_count": 0, "modified_count": 1})()
        return type("R", (), {"matched_count": 0, "modified_count": 0})()

    async def update_many(self, query, update):
        n = 0
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                n += 1
        return type("R", (), {"matched_count": n, "modified_count": n})()


class _Db:
    def __init__(self, clients):
        self.ciak_clients = _Collection(clients)
        self.users = _Collection()
        self.partners = _Collection()
        self.partner_journey_steps = _Collection()
        self.diagnostic_sessions = _Collection()
        self.files = _Collection()
        self.alerts = _Collection()
        self.stefania_conversations = _Collection()
        self.partner_journey = _Collection()
        self.casi_studio = _Collection()


def _client_creds(client_id=CLIENT_ID):
    import os

    secret = (
        os.environ.get("JWT_SECRET")
        or os.environ.get("SECRET_KEY")
        or os.environ.get("JWT_SECRET_KEY")
    )
    token = jwt.encode(
        {
            "sub": client_id,
            "email": "fotografo@example.com",
            "role": "ciak_client",
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
        },
        secret,
        algorithm="HS256",
    )
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


START_CLIENT = {
    "id": CLIENT_ID,
    "email": "fotografo@example.com",
    "name": "Luca Ferrari",
    "access_level": "cliente_start",
    "start_purchased_at": "2026-08-12T10:00:00+00:00",
}

BLUEPRINT_CLIENT = {
    "id": "client-solo-blueprint",
    "email": "solo27@example.com",
    "name": "Chi Ha Pagato 27",
    "access_level": "cliente_blueprint",
}


@pytest.fixture
async def start_client_db(monkeypatch):
    """Cliente Start reale: ponte costruito, journey seedata, risposte salvate."""
    db = _Db([START_CLIENT, BLUEPRINT_CLIENT])
    monkeypatch.setattr(partner_journey, "db", db)
    monkeypatch.setattr(posizionamento_approval, "db", db)

    async def _fake_pdf(answers, nome, statement, revisione):
        assert answers["nicchia"] == ANSWERS["nicchia"]
        return b"%PDF-1.4 fake-per-la-CI"

    async def _fake_upload(pdf_bytes, partner_id, filename):
        return {"url": f"https://cdn.example/{filename}", "public_id": filename, "storage": "test"}

    monkeypatch.setattr(posizionamento_approval, "genera_posizionamento_pdf", _fake_pdf)
    monkeypatch.setattr(posizionamento_approval, "upload_posizionamento_pdf", _fake_upload)

    await ensure_start_partner_bridge(db, START_CLIENT)
    await db.partner_journey_steps.update_one(
        {"partner_id": CLIENT_ID, "step_id": "04-posizionamento"},
        {"$set": {"status": "in_progress", "data": {"answers": ANSWERS}}},
    )
    return db


# ─── la prova ──────────────────────────────────────────────────────────────────


async def test_il_cliente_start_arriva_al_documento_di_posizionamento(start_client_db):
    db = start_client_db

    result = await posizionamento_approval.finalize_posizionamento(
        posizionamento_approval.FinalizeBody(partner_id=CLIENT_ID),
        credentials=_client_creds(),
    )

    assert result["file_id"]
    assert result["internal_url"].startswith("https://cdn.example/posizionamento-")
    file_doc = await db.files.find_one({"file_id": result["file_id"]})
    assert file_doc["partner_id"] == CLIENT_ID
    assert file_doc["category"] == "posizionamento"
    assert file_doc["step_ref"] == "04-posizionamento"


async def test_lo_step_risulta_completato_dopo_il_documento(start_client_db):
    db = start_client_db

    await posizionamento_approval.finalize_posizionamento(
        posizionamento_approval.FinalizeBody(partner_id=CLIENT_ID),
        credentials=_client_creds(),
    )

    step = await db.partner_journey_steps.find_one(
        {"partner_id": CLIENT_ID, "step_id": "04-posizionamento"}
    )
    assert step["approval_status"] == "approved"
    assert step["approval_file_id"]


async def test_senza_risposte_resta_400_non_403(start_client_db):
    """Il 400 e' il messaggio giusto: 'compila le risposte'. Se qui uscisse un
    403 vorrebbe dire che la guardia non ha riconosciuto il cliente."""
    db = start_client_db
    await db.partner_journey_steps.update_one(
        {"partner_id": CLIENT_ID, "step_id": "04-posizionamento"},
        {"$set": {"data": {"answers": {"nicchia": "troppo corta"}}}},
    )

    with pytest.raises(HTTPException) as exc:
        await posizionamento_approval.finalize_posizionamento(
            posizionamento_approval.FinalizeBody(partner_id=CLIENT_ID),
            credentials=_client_creds(),
        )

    assert exc.value.status_code == 400
    assert "mancanti" in exc.value.detail.lower() or "brevi" in exc.value.detail.lower()


async def test_il_cliente_blueprint_non_arriva_al_documento(start_client_db):
    """Chi ha pagato solo i 27 EUR resta fuori: 403, non un PDF."""
    with pytest.raises(HTTPException) as exc:
        await posizionamento_approval.finalize_posizionamento(
            posizionamento_approval.FinalizeBody(partner_id="client-solo-blueprint"),
            credentials=_client_creds("client-solo-blueprint"),
        )

    assert exc.value.status_code == 403


async def test_il_cliente_start_non_arriva_al_documento_di_un_altro(start_client_db):
    db = start_client_db
    await db.partners.insert_one({"id": "13", "name": "Cosimo Filieri", "tier": "partnership"})

    with pytest.raises(HTTPException) as exc:
        await posizionamento_approval.finalize_posizionamento(
            posizionamento_approval.FinalizeBody(partner_id="13"),
            credentials=_client_creds(),
        )

    assert exc.value.status_code == 403


async def test_il_cliente_start_non_puo_completare_uno_step_partner(start_client_db):
    """Il gate min_tier: la guardia dice chi sei, questo dice cosa hai pagato."""
    with pytest.raises(HTTPException) as exc:
        await partner_journey.complete_operativo_step(
            CLIENT_ID,
            "05-script-masterclass",
            partner_journey._OperativoCompleteBody(data={}),
            credentials=_client_creds(),
        )

    assert exc.value.status_code == 403


async def test_il_cliente_start_puo_salvare_una_bozza_sui_suoi_step(start_client_db):
    db = start_client_db

    await partner_journey.save_draft_operativo_step(
        CLIENT_ID,
        "start-vetrina",
        partner_journey._OperativoCompleteBody(data={"dominio": "lucaferrari.it"}),
        credentials=_client_creds(),
    )

    step = await db.partner_journey_steps.find_one(
        {"partner_id": CLIENT_ID, "step_id": "start-vetrina"}
    )
    assert step["data"]["dominio"] == "lucaferrari.it"


async def test_lo_stato_journey_del_cliente_start_e_coerente(start_client_db):
    state = await partner_journey.get_operativo_state(CLIENT_ID, _client_creds())

    assert state["tier"] == "start"
    assert len(state["steps"]) == len(START_JOURNEY_STEPS_DEFINITION)
    assert len(state["locked_steps"]) == 18
