"""Guardia: nessuna route admin senza autenticazione.

Il 2026-07-30 sono stati trovati 62 endpoint sotto `/api/admin/*` e
`/api/partner-hub/*` raggiungibili in produzione SENZA alcun token: esponevano
anagrafiche partner complete (CF/P.IVA/IBAN nelle note), risposte dei wizard e
parametri contrattuali, e permettevano di SCRIVERE su fasi, questionari e hub.

Questo test rilegge staticamente tutte le route del backend e fallisce se una
route sotto quei due prefissi non ha una guardia di autorizzazione. Serve a non
farne ricomparire una per distrazione: e' facile aggiungere un endpoint admin
dimenticando la `Depends`, e in produzione non se ne accorge nessuno.

Una route e' considerata protetta se l'auth arriva da almeno una di queste vie:
  1. `Depends(<guardia>)` nella firma dell'handler
  2. `dependencies=[Depends(<guardia>)]` sul decoratore della route
  3. `dependencies=[Depends(<guardia>)]` sul costruttore dell'APIRouter
     (protegge tutte le route del router, anche quelle future)
  4. controllo del token nel corpo (`decode_token`, `verify_admin`, ...)
  5. confronto con una chiave condivisa di modulo (`... != EMAIL_SNAPSHOT_KEY`)
     per gli endpoint chiamati da automazioni che non hanno un JWT admin

Le guardie sono risolte in modo TRANSITIVO dentro il file: se un handler dipende
da `require_billing_admin`, che a sua volta dipende da `require_ciak_admin`,
conta come protetto.
"""
import ast
import re
from functools import lru_cache
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parent.parent
METHODS = {"get", "post", "put", "patch", "delete"}

# Prefissi sorvegliati: tutto cio' che sta sotto /api/admin/... o /api/partner-hub/...
WATCHED = re.compile(r"(^|/)api/admin(/|$)|/api/partner-hub")

# Nomi che identificano una funzione-guardia.
GUARD_NAME = re.compile(r"^(require_|verify_|get_current_user)", re.I)

# Chiamate che, se presenti nel corpo, valgono come controllo del token.
GUARD_CALLS = {
    "decode_token", "verify_admin", "get_current_user", "require_admin_role",
    "require_partner_or_admin", "require_ciak_admin", "require_admin_token",
    "require_admin", "require_partner_or_admin_for_partner",
    "require_admin_or_internal", "can_manage_collaborator_billing",
}

# Eccezioni: route deliberatamente pubbliche. Ogni voce va motivata.
# NON aggiungere righe qui per far passare il test: l'eccezione dev'essere una
# scelta di prodotto, non una scorciatoia.
PUBLIC_ALLOWLIST = {
    # Sottoinsieme pubblico della config del sito: espone i soli URL di
    # prenotazione Cal.com, letti dal frontend prima del login.
    ("GET", "/api/admin/ciak/public-config"),
}


def _const(node):
    return node.value if isinstance(node, ast.Constant) else None


def _depends_targets(node):
    """Nomi X in tutte le `Depends(X)` contenute nel nodo."""
    found = set()
    for sub in ast.walk(node):
        if (
            isinstance(sub, ast.Call)
            and isinstance(sub.func, ast.Name)
            and sub.func.id == "Depends"
            and sub.args
        ):
            arg = sub.args[0]
            if isinstance(arg, ast.Name):
                found.add(arg.id)
            elif isinstance(arg, ast.Attribute):
                found.add(arg.attr)
    return found


def _signature_deps(fn):
    defaults = [d for d in [*fn.args.defaults, *fn.args.kw_defaults] if d is not None]
    return set().union(*(_depends_targets(d) for d in defaults)) if defaults else set()


def _keyword_deps(call):
    for kw in call.keywords:
        if kw.arg == "dependencies":
            return _depends_targets(kw.value)
    return set()


def _checks_shared_secret(fn):
    """True se il corpo confronta qualcosa con una chiave condivisa di modulo.

    Copre gli endpoint chiamati da automazioni prive di JWT admin (es. lo
    snapshot campagne email, autenticato dall'header X-Snapshot-Key contro
    EMAIL_SNAPSHOT_KEY). Si richiede il confronto REALE con una costante
    *_KEY/*_SECRET/*_TOKEN: togliere il controllo fa tornare rosso il test.
    """
    secret = re.compile(r"_(KEY|SECRET|TOKEN)$")
    for sub in ast.walk(fn):
        if not isinstance(sub, ast.Compare):
            continue
        operands = [sub.left, *sub.comparators]
        if any(isinstance(o, ast.Name) and secret.search(o.id) for o in operands):
            return True
    return False


def _called_names(node):
    names = set()
    for sub in ast.walk(node):
        if isinstance(sub, ast.Call):
            fn = sub.func
            if isinstance(fn, ast.Name):
                names.add(fn.id)
            elif isinstance(fn, ast.Attribute):
                names.add(fn.attr)
    return names


@lru_cache(maxsize=1)
def _routes():
    """Elenco completo delle route sorvegliate. In cache: il parse dell'intero
    backend (server.py da solo e' ~17k righe) costa, e i test sono due."""
    return tuple(_iter_routes())


def _iter_routes():
    """Produce (metodo, path, file, riga, nome_handler, protetta)."""
    for path in sorted(BACKEND.rglob("*.py")):
        parts = path.parts
        if "__pycache__" in parts or "tests" in parts:
            continue
        source = path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(source)

        # prefisso e dipendenze dichiarate su ogni APIRouter del modulo
        prefixes, router_deps = {}, {}
        for node in ast.walk(tree):
            if not (isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)):
                continue
            func = node.value.func
            is_router = (isinstance(func, ast.Name) and func.id == "APIRouter") or (
                isinstance(func, ast.Attribute) and func.attr == "APIRouter"
            )
            if not is_router:
                continue
            prefix = ""
            for kw in node.value.keywords:
                if kw.arg == "prefix":
                    prefix = _const(kw.value) or ""
            for target in node.targets:
                if isinstance(target, ast.Name):
                    prefixes[target.id] = prefix
                    router_deps[target.id] = _keyword_deps(node.value)

        functions = {
            n.name: n
            for n in ast.walk(tree)
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

        def is_guard(name, seen=None):
            """Risolve transitivamente se `name` e' una funzione-guardia."""
            seen = seen or set()
            if name in seen:
                return False
            seen.add(name)
            if name in GUARD_CALLS or GUARD_NAME.match(name):
                return True
            fn = functions.get(name)
            if fn is None:
                return False
            if _called_names(fn) & GUARD_CALLS:
                return True
            return any(is_guard(dep, seen) for dep in _signature_deps(fn))

        for fn in ast.walk(tree):
            if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in fn.decorator_list:
                if not (
                    isinstance(dec, ast.Call)
                    and isinstance(dec.func, ast.Attribute)
                    and dec.func.attr in METHODS
                    and isinstance(dec.func.value, ast.Name)
                    and dec.args
                ):
                    continue
                var = dec.func.value.id
                route = _const(dec.args[0])
                if route is None or (var not in prefixes and var != "app"):
                    continue
                # server.py monta api_router (prefix "") sotto /api
                prefix = prefixes.get(var, "")
                full = route if var == "app" else prefix + route
                if var in prefixes and prefix == "" and path.name == "server.py":
                    full = "/api" + route
                if not WATCHED.search(full):
                    continue

                deps = _signature_deps(fn) | _keyword_deps(dec) | router_deps.get(var, set())
                protected = (
                    any(is_guard(d) for d in deps)
                    or bool(_called_names(fn) & GUARD_CALLS)
                    or _checks_shared_secret(fn)
                )
                yield (
                    dec.func.attr.upper(),
                    full,
                    path.relative_to(BACKEND).as_posix(),
                    dec.lineno,
                    fn.name,
                    protected,
                )


def test_admin_routes_require_auth():
    routes = _routes()
    assert routes, "nessuna route trovata: il parser e' rotto, non il backend"

    unprotected = [
        (method, full, file, line, name)
        for method, full, file, line, name, protected in routes
        if not protected and (method, full) not in PUBLIC_ALLOWLIST
    ]

    assert not unprotected, (
        "Route amministrative SENZA autenticazione (chiunque puo' chiamarle "
        "senza token). Aggiungi una guardia — Depends(require_admin_role) in "
        "server.py, Depends(require_ciak_admin) nei router — oppure, se la route "
        "e' pubblica per scelta, inseriscila in PUBLIC_ALLOWLIST motivandola:\n"
        + "\n".join(
            f"  {m} {p}  ({f}:{line} {name})"
            for m, p, f, line, name in sorted(unprotected)
        )
    )


def test_allowlist_entries_still_exist():
    """Se una route in allowlist sparisce o cambia path, va tolta dalla lista."""
    existing = {(method, full) for method, full, _, _, _, _ in _routes()}
    stale = PUBLIC_ALLOWLIST - existing
    assert not stale, (
        "PUBLIC_ALLOWLIST contiene route che non esistono piu': rimuovile "
        f"per non lasciare eccezioni orfane: {sorted(stale)}"
    )
