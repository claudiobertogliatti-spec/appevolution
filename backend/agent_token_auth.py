"""
Token tecnico per l'agente (Claude) che opera su Ciak senza login manuale.

Perche' esiste: il JWT admin dura 24h (auth.JWT_EXPIRATION_HOURS) e vive nel
localStorage di un browser loggato. Un agente che lavora in una sessione cloud
non puo' usarlo: dopo un giorno scade e va sostituito a mano. Questa chiave e'
lunga, casuale, revocabile (basta cambiare la variabile d'ambiente) e NON tocca
la durata dei token degli utenti.

Come funziona: middleware ASGI. Se `Authorization: Bearer <chiave>` coincide con
CIAK_AGENT_TOKEN, il middleware
  1. verifica che metodo e path siano nell'allowlist qui sotto, altrimenti 403;
  2. sostituisce l'header con un JWT admin vero, firmato dal backend, valido
     pochi minuti. Le dependency esistenti (require_ciak_admin, require_admin_role,
     require_admin_token, ...) lo vedono come un normale admin: nessuna di esse
     va modificata, e il token lungo non arriva mai alle route.
Qualunque altro header passa intatto: i login degli utenti non cambiano.

Fail-closed: se CIAK_AGENT_TOKEN manca o e' piu' corta di MIN_KEY_LENGTH la chiave
non vale mai. Come report_key_auth.py, non e' un ruolo e non passa da
auth.decode_token: il valore lungo da solo non e' un JWT valido da nessuna parte.

Scope: SOLO dati partner. Niente pagamenti, niente cancellazioni, niente utenti,
niente /api/ciak-admin. Per allargare lo scope si modifica ALLOWED_PREFIXES
(con review): non esiste una variabile d'ambiente che lo allarga, di proposito.
"""
import hmac
import logging
import os
from datetime import timedelta
from typing import Optional

logger = logging.getLogger(__name__)

ENV_VAR = "CIAK_AGENT_TOKEN"
MIN_KEY_LENGTH = 32
AGENT_USER_ID = "agent-claude"
AGENT_EMAIL = "agent@ciak.io"
EXCHANGED_TOKEN_MINUTES = 5

# Dati partner: anagrafica, hub, journey, step. Match per segmento intero
# (`/api/partners` e `/api/partners/x`, NON `/api/partners-unified`).
ALLOWED_PREFIXES = (
    "/api/partners",
    "/api/partner-hub",
    "/api/partner-journey",
    "/api/admin/partner",
)
# Mai, nemmeno dentro i prefissi sopra.
DENIED_METHODS = frozenset({"DELETE"})
DENIED_PATH_FRAGMENTS = (
    "/payments", "/segna-pagamento", "/attiva-piano",   # soldi
    "/notifiche/invia",                                  # messaggi al partner
    "/admin-unlock", "/publish", "/activate",            # sblocchi e pubblicazioni
    "/reset", "/prune-playlist", "/retrigger-video",     # pipeline / YouTube / crediti
    "/generate",                                         # job LLM a costo
    "/content-credits",
)
# Anagrafica del partner (phase, contract_end, kpi_manual...): in sola lettura.
# Le scritture sui dati del percorso passano da /api/admin/partner/{id}/journey|step.
READ_ONLY_EXACT = ("/api/partners",)

AGENT_SCOPE_DETAIL = "Token agente: percorso o metodo fuori dallo scope consentito"


def agent_token_configured() -> bool:
    return len(os.environ.get(ENV_VAR, "")) >= MIN_KEY_LENGTH


def is_agent_token(provided: Optional[str]) -> bool:
    expected = os.environ.get(ENV_VAR, "")
    if not agent_token_configured() or not provided:
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


def agent_scope_allows(path: str, method: str) -> bool:
    """True se il token agente puo' chiamare questo metodo su questo path."""
    method = (method or "GET").upper()
    if method in DENIED_METHODS:
        return False
    if any(fragment in path for fragment in DENIED_PATH_FRAGMENTS):
        return False
    if method not in ("GET", "HEAD", "OPTIONS"):
        for base in READ_ONLY_EXACT:
            rest = path[len(base):] if path.startswith(base) else None
            # `/api/partners` e `/api/partners/{id}` (un solo segmento) -> solo lettura
            if rest is not None and rest.count("/") <= 1 and (rest == "" or rest.startswith("/")):
                return False
    return any(path == p or path.startswith(p + "/") for p in ALLOWED_PREFIXES)


def _bearer_index(headers) -> Optional[int]:
    for i, (name, value) in enumerate(headers):
        if name == b"authorization":
            return i
    return None


def _bearer_value(raw: bytes) -> Optional[str]:
    text = raw.decode("latin-1").strip()
    if text[:7].lower() == "bearer ":
        return text[7:].strip() or None
    return None


def _exchange_token() -> str:
    """JWT admin di breve durata, firmato con lo stesso segreto degli utenti."""
    from auth import create_access_token

    return create_access_token(
        {"sub": AGENT_USER_ID, "email": AGENT_EMAIL, "role": "admin"},
        expires_delta=timedelta(minutes=EXCHANGED_TOKEN_MINUTES),
    )


class AgentTokenMiddleware:
    """ASGI puro (come CommercialScopeMiddleware): non tocca streaming e background task.

    In server.py va aggiunto DOPO CommercialScopeMiddleware (cosi' gira prima e
    quel filtro vede gia' il JWT scambiato) e PRIMA di CORSMiddleware (che resta
    lo strato esterno e porta gli header CORS anche sul 403).
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        headers = list(scope.get("headers") or [])
        idx = _bearer_index(headers)
        if idx is None or not is_agent_token(_bearer_value(headers[idx][1])):
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or ""
        method = scope.get("method") or "GET"
        if not agent_scope_allows(path, method):
            from starlette.responses import JSONResponse

            logger.warning("[AGENT_TOKEN] NEGATO %s %s", method, path)
            response = JSONResponse(status_code=403, content={"detail": AGENT_SCOPE_DETAIL})
            await response(scope, receive, send)
            return

        logger.info("[AGENT_TOKEN] %s %s", method, path)
        headers[idx] = (b"authorization", f"Bearer {_exchange_token()}".encode("latin-1"))
        await self.app({**scope, "headers": headers}, receive, send)
