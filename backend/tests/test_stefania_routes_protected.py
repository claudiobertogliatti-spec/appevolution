"""
Le rotte /stefania/* di server.py erano aperte a chiunque (14/10/2026, verificato dal vivo: 200 senza
token su dashboard, credenziali API, ROI, CRM, course-builder…). Questo test legge server.py COME TESTO
(non lo importa: nel sandbox e in CI servono dipendenze pesanti) e fallisce se una rotta con «stefania»
nel percorso non ha una guardia di accesso nella firma. Cosi' una rotta nuova non nasce di nuovo aperta.

In piu' prova il COMPORTAMENTO delle guardie, estraendone il sorgente e girandolo con dipendenze finte.
"""
import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

pytestmark = pytest.mark.unit

SERVER = Path(__file__).resolve().parents[1] / "server.py"
GUARDIE = {"require_admin_role", "require_partner_or_admin", "require_partner_or_admin_any", "require_admin_or_report_key"}
METODI = {"get", "post", "put", "patch", "delete"}

# Rotte con «stefania» nel percorso che restano pubbliche di proposito: nessuna.
PUBBLICHE = set()


@pytest.fixture(scope="module")
def tree():
    return ast.parse(SERVER.read_text(encoding="utf-8"))


def _rotte_stefania(tree):
    for n in ast.walk(tree):
        if not isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for d in n.decorator_list:
            if (
                isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in METODI
                and isinstance(d.func.value, ast.Name) and d.func.value.id in ("api_router", "app")
                and d.args and isinstance(d.args[0], ast.Constant) and "stefania" in str(d.args[0].value)
            ):
                yield d.args[0].value, d.func.attr.upper(), n


def _guardie_della_firma(fn):
    trovate = set()
    for default in list(fn.args.defaults) + [x for x in fn.args.kw_defaults if x is not None]:
        if isinstance(default, ast.Call) and getattr(default.func, "id", "") == "Depends" and default.args:
            nome = getattr(default.args[0], "id", "")
            trovate.add(nome)
    return trovate


def test_ci_sono_rotte_stefania_da_controllare(tree):
    assert len(list(_rotte_stefania(tree))) >= 40  # se scende a zero il test non starebbe provando niente


def _guardia_nel_corpo(fn):
    """Il partner_id sta nel body (non nel path): la guardia e' una chiamata dentro la funzione."""
    testo = ast.get_source_segment(SERVER.read_text(encoding="utf-8"), fn)
    return "await require_partner_or_admin(" in testo and "Depends(security)" in testo


def test_ogni_rotta_stefania_ha_una_guardia_di_accesso(tree):
    aperte = [
        f"{metodo} {percorso} ({fn.name}, riga {fn.lineno})"
        for percorso, metodo, fn in _rotte_stefania(tree)
        if percorso not in PUBBLICHE and not (_guardie_della_firma(fn) & GUARDIE) and not _guardia_nel_corpo(fn)
    ]
    assert aperte == [], "Rotte /stefania/* senza guardia:\n  " + "\n  ".join(aperte)


def test_le_rotte_per_partner_con_id_nel_path_usano_la_guardia_del_partner_o_admin_solo(tree):
    # il controllo sul partner_id funziona solo se la guardia legge LO STESSO partner_id del path
    for percorso, _metodo, fn in _rotte_stefania(tree):
        if "{partner_id}" in percorso and "course-builder" in percorso:
            assert "require_partner_or_admin" in _guardie_della_firma(fn)


def test_il_salvataggio_del_corso_controlla_il_partner_del_body(tree):
    fn = next(f for p, m, f in _rotte_stefania(tree) if p.endswith("/course-builder/save"))
    testo = ast.get_source_segment(SERVER.read_text(encoding="utf-8"), fn)
    assert "await require_partner_or_admin(request.partner_id, credentials)" in testo
    assert testo.index("require_partner_or_admin(") < testo.index("update_one(")  # prima di scrivere


# ── comportamento delle guardie (sorgente estratto, dipendenze finte) ────────────────────────────
def _guardia(tree, nome, token, utenti=()):
    src = SERVER.read_text(encoding="utf-8")
    fn = next(n for n in ast.walk(tree) if isinstance(n, ast.AsyncFunctionDef) and n.name == nome)
    codice = ast.get_source_segment(src, fn)

    class _Users:
        async def find_one(self, q, projection=None):
            return next((dict(u) for u in utenti if u["id"] == q.get("id")), None)

    ns = {
        "Depends": lambda *a, **k: None, "security": None, "HTTPAuthorizationCredentials": object,
        "HTTPException": HTTPException, "decode_token": lambda t: token if t == "t" else None,
        "db": SimpleNamespace(users=_Users()),
    }
    exec(codice, ns)  # noqa: S102 - sorgente del repo, non input esterno
    return ns[nome]


def _chiama(guardia, *args, creds="t"):
    c = SimpleNamespace(credentials=creds) if creds else None
    try:
        return asyncio.run(guardia(*args, credentials=c))
    except HTTPException as e:
        return e.status_code


def test_guardia_qualunque_partner_o_admin(tree):
    for ruolo, atteso in (("partner", "ok"), ("admin", "ok"), ("superadmin", "ok"), ("ciak_client", 403)):
        g = _guardia(tree, "require_partner_or_admin_any", SimpleNamespace(role=ruolo, user_id="u"))
        r = _chiama(g)
        assert (r == 403) if atteso == 403 else (not isinstance(r, int)), (ruolo, r)
    g = _guardia(tree, "require_partner_or_admin_any", None)
    assert _chiama(g, creds=None) == 401 and _chiama(g, creds="inventato") == 401


def test_guardia_partner_solo_il_proprio_e_mai_id_vuoto(tree):
    utenti = [{"id": "u1", "partner_id": "p1"}, {"id": "u2", "partner_id": None}, {"id": "u3"}]
    def g(uid):
        return _guardia(tree, "require_partner_or_admin", SimpleNamespace(role="partner", user_id=uid), utenti)
    assert not isinstance(_chiama(g("u1"), "p1"), int)       # il proprio: passa
    assert _chiama(g("u1"), "p2") == 403                    # un altro: no
    assert _chiama(g("u2"), "") == 403                      # senza partner_id, id vuoto: NO (prima passava)
    assert _chiama(g("u3"), "") == 403
    assert _chiama(g("u1"), "   ") == 403
    assert _chiama(_guardia(tree, "require_partner_or_admin", SimpleNamespace(role="admin", user_id="a")), "qualunque") is not None


def test_la_revisione_giornaliera_resta_raggiungibile_dallo_scheduler(tree):
    """`/agent-tasks/stefania-review` accetta admin O chiave di report, e lo scheduler la manda."""
    # il percorso e' /agent-tasks/stefania-review: si cerca per nome della funzione
    nodo = next(n for n in ast.walk(tree) if isinstance(n, ast.AsyncFunctionDef) and n.name == "api_stefania_task_review")
    assert "require_admin_or_report_key" in _guardie_della_firma(nodo)
    scheduler = (SERVER.parent / "scheduler.py").read_text(encoding="utf-8")
    i = scheduler.index("/agent-tasks/stefania-review")
    assert 'X-Report-Key' in scheduler[i:i + 300] and "LUCA_REPORT_KEY" in scheduler[i:i + 300]
