"""
Nessuna rotta di server.py senza guardia, salvo un elenco ESPLICITO e motivato di rotte pubbliche.

Il 14/10/2026 il controllo completo ha trovato 255 rotte su 410 senza alcun controllo di accesso,
verificate dal vivo (200 senza token): elenco e dati dei partner, pagamenti, credenziali Systeme
(scrivibili!), chiavi YouTube, upload, task degli agenti, campagne, ecc. Le rotte `/api/admin/*` e
`/api/partner-hub` erano gia' coperte da `test_admin_endpoints_auth.py` (30/7/2026); questo test chiude
il resto. Una rotta nuova senza guardia fa fallire la CI: o le si mette una `Depends(...)` o la si aggiunge
a PUBBLICHE con il motivo, e quell'aggiunta si vede in code review.

Legge server.py COME TESTO (non lo importa).
"""
import ast
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

SERVER = Path(__file__).resolve().parents[1] / "server.py"
METODI = {"get", "post", "put", "patch", "delete"}
GUARDIE = {
    "require_admin_role", "require_partner_or_admin", "require_partner_or_admin_any",
    "require_admin_or_report_key", "require_admin_or_system", "verify_admin",
}

# (metodo, percorso) -> motivo per cui resta pubblica. Ogni voce e' una scelta, non una dimenticanza.
PUBBLICHE = {
    ("POST", "/api/auth/login"): "login",
    ("POST", "/api/auth/register"): "registrazione pubblica dei partner (ruolo imposto lato server, vedi test_auth_public_surface)",
    ("GET", "/api/health"): "health check",
    ("GET", "/api/"): "root",
    ("GET", "/api/tracking/config"): "id dei pixel, letti dal browser dei visitatori",
    ("POST", "/api/tracking/capi/event"): "eventi di tracciamento dai visitatori",
    ("GET", "/api/p/{partner_id}/v"): "pixel di visita delle pagine pubbliche dei partner",
    ("POST", "/api/webhooks/systeme"): "webhook con segreto (SYSTEME_WEBHOOK_SECRET)",
    ("POST", "/api/telegram/webhook"): "webhook con segreto (TELEGRAM_WEBHOOK_SECRET)",
    ("POST", "/api/internal/pipeline-watchdog"): "chiamata di sistema con hmac nel corpo",
    ("GET", "/api/avatar-packages"): "listino pubblico dei pacchetti avatar",
    ("POST", "/api/notify/telegram"): (
        "chiamata interna da celery/agenti/scheduler SENZA chiave: chiuderla spegnerebbe gli alert "
        "se il worker non ha la chiave. DA FARE: dare la chiave anche al worker, poi chiuderla"
    ),
}


@pytest.fixture(scope="module")
def tree():
    return ast.parse(SERVER.read_text(encoding="utf-8"))


def _rotte(tree):
    for n in ast.walk(tree):
        if not isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for d in n.decorator_list:
            if (
                isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in METODI
                and isinstance(d.func.value, ast.Name) and d.func.value.id == "api_router"
                and d.args and isinstance(d.args[0], ast.Constant)
            ):
                yield d.func.attr.upper(), "/api" + d.args[0].value, n


def _guardie(fn):
    out = set()
    for default in list(fn.args.defaults) + [x for x in fn.args.kw_defaults if x is not None]:
        if isinstance(default, ast.Call) and getattr(default.func, "id", "") == "Depends" and default.args:
            out.add(getattr(default.args[0], "id", ""))
    return out


def _testo(fn):
    return ast.get_source_segment(SERVER.read_text(encoding="utf-8"), fn)


def _chiusa_410(fn):
    """Rotta del vecchio flusso «Analisi €67», ritirata il 29/9/2026: risponde sempre 410."""
    return "_analisi_67_dismessa()" in _testo(fn)


def _guardia_nel_corpo(fn):
    testo = _testo(fn)
    if _chiusa_410(fn):
        return True
    if "Depends(security)" not in testo:
        return False
    # il token viene davvero verificato nel corpo (non basta avere l'header `credentials`)
    return bool(re.search(r"await require_partner_or_admin\(|decode_token\(|verify_admin\(|get_current_user\(", testo))


def test_ci_sono_centinaia_di_rotte_da_controllare(tree):
    assert len(list(_rotte(tree))) >= 380


def test_ogni_rotta_di_server_py_ha_una_guardia_o_e_pubblica_di_proposito(tree):
    aperte = [
        f"{m} {p}  ({fn.name}, riga {fn.lineno})"
        for m, p, fn in _rotte(tree)
        if (m, p) not in PUBBLICHE and not (_guardie(fn) & GUARDIE) and not _guardia_nel_corpo(fn)
    ]
    assert aperte == [], "Rotte senza guardia (aggiungi Depends o motiva in PUBBLICHE):\n  " + "\n  ".join(aperte)


def test_l_elenco_delle_pubbliche_non_contiene_voci_morte(tree):
    esistenti = {(m, p) for m, p, _ in _rotte(tree)}
    morte = sorted(set(PUBBLICHE) - esistenti)
    assert morte == [], f"Voci in PUBBLICHE che non esistono piu': {morte}"


def test_le_pubbliche_non_hanno_guardia_nascosta_da_togliere(tree):
    # se una rotta pubblica ottiene una guardia, va tolta dall'elenco: l'elenco deve restare onesto
    con_guardia = [
        (m, p) for m, p, fn in _rotte(tree) if (m, p) in PUBBLICHE and (_guardie(fn) & GUARDIE)
    ]
    assert con_guardia == [], f"Hanno gia' una guardia, togli da PUBBLICHE: {con_guardia}"


def test_le_pubbliche_non_sono_rotte_gia_chiuse_con_410(tree):
    chiuse = [(m, p) for m, p, fn in _rotte(tree) if (m, p) in PUBBLICHE and _chiusa_410(fn)]
    assert chiuse == [], f"Sono gia' chiuse (410): togli da PUBBLICHE {chiuse}"


def test_una_guardia_nel_corpo_deve_davvero_verificare_il_token(tree):
    """Il caso storico: `if not credentials: raise 401` accetta QUALUNQUE header Authorization, anche finto
    (le letture dei dati personali dei prospect erano aperte cosi'). Segnala i casi che restano."""
    deboli = []
    for m, p, fn in _rotte(tree):
        t = _testo(fn)
        if "Depends(security)" in t and not _chiusa_410(fn) and not (_guardie(fn) & GUARDIE):
            if not re.search(r"decode_token\(|verify_admin\(|get_current_user\(|require_partner_or_admin\(", t):
                deboli.append(f"{m} {p}")
    assert deboli == [], "Guardia debole (solo presenza dell'header):\n  " + "\n  ".join(deboli)
