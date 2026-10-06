"""
Re-engagement area cliente (ponte Partnership): "rimandami l'accesso" + richiamo
quando un deliverable e' pronto. SMTP e magic-link mockati; le funzioni non sollevano.
"""
import pytest

from services import ciak_client_reengagement as reeng

pytestmark = pytest.mark.unit


class _Coll:
    def __init__(self, docs):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, q):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                return dict(d)
        return None


class _Db:
    def __init__(self, docs):
        self.ciak_clients = _Coll(docs)


CLIENT = {"id": "c1", "email": "linda@x.it", "name": "Linda Pavia"}


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    async def _tok(db, cid, email):
        return {"token": "T"}
    monkeypatch.setattr(reeng, "create_magic_login_token", _tok)
    sent = []
    monkeypatch.setattr(reeng, "_send",
                        lambda email, nome, subject, corpo, link: sent.append({"to": email, "subject": subject, "corpo": corpo, "link": link}) or True)
    return sent


@pytest.mark.asyncio
async def test_rimandami_accesso_invia_se_cliente_esiste(_patch):
    ok = await reeng.invia_link_accesso(_Db([CLIENT]), "Linda@x.it")
    assert ok is True
    assert _patch[0]["to"] == "linda@x.it"
    assert "token=T" in _patch[0]["link"]


@pytest.mark.asyncio
async def test_rimandami_accesso_silenzioso_se_non_esiste(_patch):
    ok = await reeng.invia_link_accesso(_Db([]), "ignoto@x.it")
    assert ok is False
    assert _patch == []  # nessuna email, nessun leak


@pytest.mark.asyncio
async def test_email_senza_chiocciola_scartata(_patch):
    assert await reeng.invia_link_accesso(_Db([CLIENT]), "non-una-email") is False
    assert _patch == []


@pytest.mark.asyncio
async def test_deliverable_pronto_usa_etichetta_leggibile(_patch):
    ok = await reeng.invia_deliverable_pronto(_Db([CLIENT]), "c1", "social_profiles")
    assert ok is True
    assert "profili social" in _patch[0]["subject"]


@pytest.mark.asyncio
async def test_endpoint_request_access_risponde_sempre_ok(monkeypatch):
    from routers import ciak_clients
    monkeypatch.setattr(ciak_clients, "db", _Db([CLIENT]))
    called = {}

    async def _fake(db, email):
        called["email"] = email
        return False  # anche se False, l'endpoint risponde ok
    monkeypatch.setattr(reeng, "invia_link_accesso", _fake)
    res = await ciak_clients.request_access(ciak_clients.RequestAccessRequest(email="chiunque@x.it"))
    assert res["ok"] is True
    assert called["email"] == "chiunque@x.it"


@pytest.mark.asyncio
@pytest.mark.parametrize("tipo,oggetto,corpo", [
    ("brand_kit", "Il tuo marchio e' pronto", "il tuo marchio e' pronto: lo trovi"),
    ("social_profiles", "I testi per i tuoi profili social sono pronti", "sono pronti: li trovi"),
    ("showcase", "La tua pagina web e' pronta", "e' pronta: la trovi"),
    ("content_plan_90d", "Il tuo calendario dei 60 giorni e' pronto", "calendario dei 60 giorni e' pronto: lo trovi"),
])
async def test_l_avviso_parla_in_italiano_semplice_e_concorda(_patch, tipo, oggetto, corpo):
    """Il cliente Start e' poco digitalizzato: niente 'brand kit', niente '90 giorni'
    (il prodotto e' a 60), e il verbo concorda con cio' che e' pronto."""
    assert await reeng.invia_deliverable_pronto(_Db([CLIENT]), "c1", tipo) is True
    assert _patch[0]["subject"] == oggetto
    assert corpo in _patch[0]["corpo"]
    assert not any(brutto in _patch[0]["subject"].lower() for brutto in ("brand kit", "90 giorni", "deliverable"))


class _CursorDeliverable:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _DeliverableColl:
    def __init__(self, docs):
        self.docs = docs

    def find(self, q, projection=None):
        return _CursorDeliverable([
            {"type": d["type"]} for d in self.docs
            if all(d.get(k) == v for k, v in q.items())
        ])


class _DbConAvanzamento(_Db):
    def __init__(self, docs, deliverables):
        super().__init__(docs)
        self.ciak_start_deliverables = _DeliverableColl(deliverables)


@pytest.mark.asyncio
async def test_mail_di_approvazione_dice_a_che_punto_siamo(_patch):
    """Conta solo cio' che e' APPROVATO: la bozza di un altro cliente o non approvata
    non e' un lavoro consegnato."""
    db = _DbConAvanzamento([CLIENT], [
        {"partner_id": "c1", "type": "positioning", "approval_status": "approved"},
        {"partner_id": "c1", "type": "brand_kit", "approval_status": "pending_review"},
        {"partner_id": "altro", "type": "showcase", "approval_status": "approved"},
    ])
    assert await reeng.invia_deliverable_pronto(db, "c1", "positioning") is True
    corpo = _patch[0]["corpo"]
    assert "Avanzamento lavori: 1 su 5 materiali pronti" in corpo
    assert "✓ Posizionamento: pronto" in corpo
    assert "• Marchio: in lavorazione" in corpo
    assert "• Sito vetrina: in lavorazione" in corpo  # approvato ma di un altro cliente


@pytest.mark.asyncio
async def test_mail_con_tutto_pronto_lo_dice(_patch):
    tipi = ("positioning", "brand_kit", "social_profiles", "showcase", "content_plan_90d")
    db = _DbConAvanzamento([CLIENT], [{"partner_id": "c1", "type": t, "approval_status": "approved"} for t in tipi])
    assert await reeng.invia_deliverable_pronto(db, "c1", "content_plan_90d") is True
    assert "tutti e 5 i materiali sono pronti" in _patch[0]["corpo"]


@pytest.mark.asyncio
async def test_readiness_non_ha_il_blocco_avanzamento(_patch):
    db = _DbConAvanzamento([CLIENT], [])
    assert await reeng.invia_deliverable_pronto(db, "c1", "partnership_readiness") is True
    assert "Avanzamento lavori" not in _patch[0]["corpo"]


@pytest.mark.asyncio
async def test_se_l_avanzamento_non_si_legge_la_mail_parte_comunque(_patch):
    """_Db senza la collezione dei deliverable: la lettura solleva, la mail parte senza blocco."""
    assert await reeng.invia_deliverable_pronto(_Db([CLIENT]), "c1", "positioning") is True
    assert "Avanzamento lavori" not in _patch[0]["corpo"]
    assert "il tuo posizionamento e' pronto: lo trovi" in _patch[0]["corpo"]
