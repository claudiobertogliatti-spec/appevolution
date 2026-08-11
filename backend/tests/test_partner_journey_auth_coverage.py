"""Copertura autorizzativa del router partner-journey.

Il router espone oltre cento endpoint che leggono e scrivono dati di partner
paganti (posizionamento, lead, funnel, notifiche). Fino al 2026-08-11 ventitre
di questi non avevano alcuna guardia: `GET /dashboard-operativa` restituiva
nome, nicchia e fase di tutti i partner a chiunque, senza token.

Questo test non prova un endpoint per volta: ispeziona la firma di OGNI route
registrata e pretende che dichiari `credentials`. Gli unici endpoint che possono
restare pubblici sono elencati in PUBLIC_ROUTES, con la motivazione accanto.
Aggiungere un endpoint senza guardia rompe questo test.
"""
import inspect

import pytest

from routers import partner_journey

pytestmark = pytest.mark.unit


# (metodo, path) che devono restare raggiungibili senza JWT, con il perche'.
PUBLIC_ROUTES: dict[tuple[str, str], str] = {
    ("POST", "/api/partner-journey/leads/webhook/{partner_id}"): (
        "Ingresso lead dai funnel dei partner: lo chiamano sistemi esterni "
        "(Systeme.io, form del partner) che non hanno un JWT Ciak."
    ),
}


def _routes():
    for route in partner_journey.router.routes:
        endpoint = getattr(route, "endpoint", None)
        if endpoint is None:
            continue
        for method in sorted(getattr(route, "methods", set()) - {"HEAD", "OPTIONS"}):
            yield method, route.path, endpoint


def _declares_credentials(endpoint) -> bool:
    return "credentials" in inspect.signature(endpoint).parameters


def test_every_partner_journey_route_requires_credentials():
    unguarded = [
        f"{method} {path}"
        for method, path, endpoint in _routes()
        if (method, path) not in PUBLIC_ROUTES and not _declares_credentials(endpoint)
    ]
    assert not unguarded, (
        "Endpoint partner-journey senza guardia (aggiungi `credentials` e la "
        "chiamata a require_partner_or_admin_for_partner / require_admin_token, "
        "oppure dichiarali in PUBLIC_ROUTES con la motivazione):\n  "
        + "\n  ".join(unguarded)
    )


def test_public_allowlist_stays_minimal():
    """La lista degli endpoint pubblici non deve crescere per inerzia."""
    assert len(PUBLIC_ROUTES) <= 1, (
        "Aggiunto un endpoint pubblico: va motivato in review, non solo in lista."
    )


def test_dashboard_operativa_is_guarded():
    """Regressione puntuale: e' l'endpoint che esponeva 26 partner reali."""
    endpoint = next(
        ep
        for method, path, ep in _routes()
        if path == "/api/partner-journey/dashboard-operativa" and method == "GET"
    )
    assert _declares_credentials(endpoint)


def test_admin_unlock_is_guarded():
    """Regressione puntuale: scriveva dominio verificato e legal approvati."""
    endpoint = next(
        ep
        for method, path, ep in _routes()
        if path == "/api/partner-journey/funnel/admin-unlock" and method == "POST"
    )
    assert _declares_credentials(endpoint)
