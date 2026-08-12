"""Un cliente Ciak Start non e' un partner: non deve entrare nei conteggi.

Il ponte di identita' crea un record `partners` per ogni cliente da 499 EUR.
Senza filtro, il cockpit, le metriche e i check diagnostici lo contano come un
partner da 2.790. Il rischio vero non e' il singolo sito: e' quello dimenticato.
Per questo il file contiene anche una scansione AST di tutti i moduli che
leggono liste o conteggi di `partners`.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

from models.start_journey import TIER_START, only_real_partners

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parents[1]


# ─── il filtro ─────────────────────────────────────────────────────────────────


def test_esclude_il_tier_start():
    assert only_real_partners()["tier"] == {"$ne": TIER_START}


def test_conserva_il_resto_della_query():
    q = only_real_partners({"phase": {"$in": ["F1", "F2"]}, "active": True})
    assert q["phase"] == {"$in": ["F1", "F2"]}
    assert q["active"] is True
    assert q["tier"] == {"$ne": TIER_START}


def test_non_muta_la_query_ricevuta():
    original = {"active": True}
    only_real_partners(original)
    assert original == {"active": True}


def test_non_sovrascrive_un_filtro_esplicito_sul_tier():
    """Chi chiede esplicitamente un livello sa cosa sta chiedendo: sovrascriverlo
    renderebbe impossibile elencare i clienti Start."""
    q = only_real_partners({"tier": TIER_START})
    assert q["tier"] == TIER_START


def test_un_partner_senza_tier_resta_dentro():
    """I 26 partner migrati il 12/8 non hanno il campo `tier`. `$ne` matcha i
    documenti in cui il campo manca: nessun backfill necessario."""
    filtro = only_real_partners()["tier"]
    partner_senza_tier = {"id": "13", "name": "Cosimo"}
    assert partner_senza_tier.get("tier") != filtro["$ne"]


# ─── scansione: nessun conteggio dimenticato ───────────────────────────────────

# Moduli che producono numeri visti da un umano: cockpit, metriche, dashboard,
# diagnostica, liste partner. Se ne aggiungi uno, aggiungilo anche qui.
MODULES_UNDER_SCAN = [
    "agent_hub_service.py",
    "routers/admin_luca.py",
    "routers/admin_stefania.py",
    "routers/journey_automation.py",
    "routers/operations.py",
    "routers/admin_diagnostics.py",
    "routers/partner_journey.py",
    "server.py",
]

READ_METHODS = {"find", "count_documents", "aggregate"}

# Siti che leggono `partners` senza filtro per una ragione precisa. La chiave e'
# (modulo, nome della funzione che contiene la chiamata). Ogni voce e' una
# decisione, non una dimenticanza.
ALLOWLIST: dict[tuple[str, str], str] = {
    # Backfill una-tantum di evolution_id: opera su chi il campo non ce l'ha,
    # tier compreso; escludere Start lascerebbe record a meta'.
    ("server.py", "backfill_evolution_ids"): "backfill tecnico, non e' un conteggio",
    # Seed dev-mode: "se la collection e' vuota, popola i demo". Deve guardare
    # la collection cosi' com'e', o un cliente Start la farebbe ri-seedare.
    ("server.py", "seed_database"): "seed dev-mode sulla collection grezza",
    # Endpoint di debug: riporta il conteggio reale dei documenti nel database,
    # non una metrica di prodotto. Filtrarlo lo renderebbe inutile.
    ("server.py", "debug_db_check"): "conteggio grezzo di debug sul database",
    # Lookup di una mappa id -> sottodominio a partire da id gia' noti: non e'
    # un elenco di partner, e' una join.
    ("routers/partner_journey.py", "get_all_pending_distributions"): "join per id espliciti",
}


def _is_partners_read(node: ast.Call) -> bool:
    func = node.func
    if not isinstance(func, ast.Attribute) or func.attr not in READ_METHODS:
        return False
    owner = func.value
    return isinstance(owner, ast.Attribute) and owner.attr == "partners"


def _uses_filter(node: ast.Call, tree: ast.AST) -> bool:
    """La chiamata passa dal filtro condiviso?

    Segue anche l'indirezione per variabile: `aggregate(pipeline)` con il
    `$match` costruito qualche riga sopra e' il pattern usato dalla dashboard
    journey, e non deve risultare un falso positivo.
    """
    for arg in node.args:
        if _contains_only_real_partners(arg):
            return True
        if isinstance(arg, ast.Name) and _assignment_uses_filter(tree, arg.id):
            return True
    return False


def _assignment_uses_filter(tree: ast.AST, name: str) -> bool:
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            continue
        if _contains_only_real_partners(node.value):
            return True
    return False


def _contains_only_real_partners(node: ast.AST) -> bool:
    for sub in ast.walk(node):
        if (
            isinstance(sub, ast.Call)
            and isinstance(sub.func, ast.Name)
            and sub.func.id == "only_real_partners"
        ):
            return True
    return False


def _enclosing_function(tree: ast.AST, lineno: int) -> str:
    best = "<module>"
    best_line = -1
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.lineno <= lineno and node.lineno > best_line:
                best = node.name
                best_line = node.lineno
    return best


def test_nessuna_lettura_partners_senza_filtro_nei_moduli_che_contano():
    scoperti: list[str] = []
    for rel in MODULES_UNDER_SCAN:
        path = BACKEND / rel
        assert path.exists(), f"modulo scansionato non trovato: {rel}"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not _is_partners_read(node):
                continue
            if _uses_filter(node, tree):
                continue
            fn = _enclosing_function(tree, node.lineno)
            if (rel, fn) in ALLOWLIST:
                continue
            scoperti.append(f"{rel}:{node.lineno} (in {fn})")

    assert not scoperti, (
        "letture di `partners` senza only_real_partners(): un cliente Ciak Start "
        "finirebbe nei conteggi come partner.\n  " + "\n  ".join(scoperti)
    )
