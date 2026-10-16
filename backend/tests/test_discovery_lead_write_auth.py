"""
Le scritture sui discovery lead devono essere autenticate.

Fino all'1/9/2026 `PATCH /api/discovery/leads/{id}` e `DELETE .../{id}` erano
**aperti a chiunque conoscesse l'URL**: il primo scrive nome, email, telefono e
note di un lead, il secondo lo cancella in modo irreversibile.

Il frontend admin li chiama gia' con `adminFetch`, che manda
`Authorization: Bearer <token>`: aggiungere il controllo non ha cambiato nulla
per l'interfaccia.

Questo test e' una controprova permanente: se qualcuno toglie la dipendenza,
fallisce invece di lasciare l'endpoint scoperto.
"""

import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routers import discovery_engine  # noqa: E402


def _rotta(metodo, path_finale):
    for r in discovery_engine.router.routes:
        if path_finale in getattr(r, "path", "") and metodo in getattr(r, "methods", set()):
            return r
    return None


def _dipendenze(rotta):
    return [d.call.__name__ for d in rotta.dependant.dependencies]


@pytest.mark.parametrize("metodo,path", [
    ("PATCH", "/leads/{lead_id}"),
    ("DELETE", "/leads/{lead_id}"),
    ("POST", "/import"),
    ("POST", "/import-csv"),
    ("POST", "/search-places"),
])
def test_le_scritture_sui_lead_richiedono_admin(metodo, path):
    rotta = _rotta(metodo, path)

    assert rotta is not None, f"{metodo} /leads/{{lead_id}} non registrata"
    assert "require_ciak_admin" in _dipendenze(rotta), (
        f"{metodo} {path} e' SENZA autenticazione: "
        f"chiunque conosca l'URL puo' scrivere sui lead"
    )


def test_il_campo_del_coordinamento_e_modificabile():
    """
    `lavorazione_manuale` esclude un lead dall'outreach automatico: e' il
    coordinamento con la lista telefonica. Senza il campo in whitelist il PATCH
    risponde "Nessun campo valido" e i lead che Claudio sta chiamando non si
    possono togliere dalla coda.
    """
    sorgente = Path(__file__).resolve().parents[1] / "routers" / "discovery_engine.py"
    testo = sorgente.read_text(encoding="utf-8")

    inizio = testo.find("    allowed = {")
    assert inizio != -1, "whitelist dei campi modificabili non trovata"
    blocco = testo[inizio : testo.find("}", inizio)]

    assert '"lavorazione_manuale"' in blocco


def test_le_get_lead_discovery_richiedono_admin():
    """
    16/9: le GET dei lead discovery (hot/lista/dettaglio) erano PUBBLICHE mentre
    DELETE/PATCH erano admin → email/telefono/indirizzo/note dei lead scaricabili
    senza token. Ora anche le GET passano da require_ciak_admin.
    """
    import ast
    from pathlib import Path
    src = (Path(__file__).resolve().parent.parent / "routers" / "discovery_engine.py").read_text(encoding="utf-8")
    tree = ast.parse(src)
    attese = {("get", "/leads/hot"), ("get", "/leads"), ("get", "/leads/{lead_id}")}
    trovate = {}
    for node in ast.walk(tree):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            if (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)
                    and dec.args and isinstance(dec.args[0], ast.Constant)):
                key = (dec.func.attr, dec.args[0].value)
                if key in attese:
                    deps = {s.args[0].id for s in ast.walk(node)
                            if isinstance(s, ast.Call) and isinstance(s.func, ast.Name)
                            and s.func.id == "Depends" and s.args and isinstance(s.args[0], ast.Name)}
                    trovate[key] = deps
    for key in attese:
        assert key in trovate, f"route {key} non trovata"
        assert "require_ciak_admin" in trovate[key], f"{key} senza require_ciak_admin: {trovate[key]}"
