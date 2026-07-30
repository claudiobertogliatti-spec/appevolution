"""Guardie sulla superficie pubblica di /api/auth/*.

Il 2026-07-30 sono state trovate due falle vive in produzione:

1. `/api/auth/register` era pubblico e accettava un `RegisterRequest` completo,
   in cui `role` era una stringa libera scritta nel DB senza whitelist. Chiunque
   poteva registrarsi con role="admin"/"superadmin", fare login e ottenere un
   token valido che superava OGNI guardia amministrativa: la protezione degli
   endpoint admin diventava aggirabile a monte.

2. `/api/auth/users` era pubblico e proiettava `{"hashed_password": 0}`, ma il
   campo realmente salvato si chiama `password_hash`: l'esclusione non filtrava
   nulla. L'endpoint restituiva gli hash bcrypt di tutti gli utenti, inclusi
   tutti gli account admin.

Questi test bloccano il ritorno di entrambe.
"""
import ast
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parent.parent
SERVER = BACKEND / "server.py"

# Campi che il client non deve MAI poter esprimere in registrazione pubblica:
# determinano privilegi, non identita'.
PRIVILEGE_FIELDS = {"role", "admin_type", "partner_id"}

# Qualunque campo che assomigli a una credenziale non va esposto da /auth/users.
SECRET_HINTS = ("password", "hash", "token", "secret", "salt")


def _tree():
    return ast.parse(SERVER.read_text(encoding="utf-8"))


def _class_fields(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == name:
            return {
                stmt.target.id
                for stmt in node.body
                if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name)
            }
    raise AssertionError(f"classe {name} non trovata in server.py")


def _handler(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"handler {name} non trovato in server.py")


def test_public_register_cannot_set_privileges():
    """Il modello della registrazione pubblica non deve avere campi di privilegio.

    L'assenza del campo e' piu' forte di un filtro sul valore: se `role` non
    esiste nello schema, non c'e' un controllo che qualcuno possa aggirare.
    """
    fields = _class_fields(_tree(), "PublicRegisterRequest")
    leaked = fields & PRIVILEGE_FIELDS
    assert not leaked, (
        "PublicRegisterRequest espone campi di privilegio al client: "
        f"{sorted(leaked)}. La registrazione pubblica deve creare SOLO partner, "
        "con il ruolo imposto lato server."
    )


def test_register_endpoint_uses_the_public_model():
    """L'endpoint pubblico non deve tornare ad accettare RegisterRequest."""
    handler = _handler(_tree(), "register")
    annotations = {
        arg.annotation.id
        for arg in [*handler.args.args, *handler.args.kwonlyargs]
        if isinstance(arg.annotation, ast.Name)
    }
    assert "RegisterRequest" not in annotations, (
        "/api/auth/register e' tornato ad accettare RegisterRequest, che "
        "contiene `role`: chiunque potrebbe registrarsi come admin."
    )
    assert "PublicRegisterRequest" in annotations, (
        "/api/auth/register deve accettare PublicRegisterRequest"
    )


def test_list_users_requires_admin():
    handler = _handler(_tree(), "list_users")
    defaults = [d for d in [*handler.args.defaults, *handler.args.kw_defaults] if d]
    guarded = any(
        isinstance(d, ast.Call)
        and isinstance(d.func, ast.Name)
        and d.func.id == "Depends"
        and d.args
        and isinstance(d.args[0], ast.Name)
        and d.args[0].id in ("require_admin_role", "verify_admin")
        for d in defaults
    )
    assert guarded, "/api/auth/users deve richiedere un admin autenticato"


def test_list_users_projection_is_an_allowlist_without_secrets():
    """La proiezione deve essere positiva e non contenere campi credenziali.

    Una proiezione a esclusione e' fragile: basta sbagliare il nome del campo
    (era il caso di `hashed_password` contro `password_hash`) perche' non filtri
    piu' nulla, in silenzio.
    """
    tree = _tree()
    proj = None
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Assign)
            and any(isinstance(t, ast.Name) and t.id == "_USER_PUBLIC_FIELDS" for t in node.targets)
            and isinstance(node.value, ast.Dict)
        ):
            proj = node.value
    assert proj is not None, "_USER_PUBLIC_FIELDS non trovata: la proiezione di /auth/users deve essere esplicita"

    included, excluded = [], []
    for key, value in zip(proj.keys, proj.values):
        if not (isinstance(key, ast.Constant) and isinstance(value, ast.Constant)):
            continue
        (included if value.value else excluded).append(key.value)

    assert included, "_USER_PUBLIC_FIELDS deve essere una lista POSITIVA di campi da esporre"
    assert excluded == ["_id"], (
        "l'unica esclusione ammessa e' `_id`; ogni altro campo va gestito per "
        f"inclusione, non per esclusione. Trovate: {sorted(excluded)}"
    )

    sensitive = [f for f in included if any(h in f.lower() for h in SECRET_HINTS)]
    assert not sensitive, f"/auth/users esporrebbe campi sensibili: {sorted(sensitive)}"
