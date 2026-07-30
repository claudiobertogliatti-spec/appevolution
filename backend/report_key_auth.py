"""
Auth di sola lettura per i report automatici (briefing di Luca delle 7:45).

Perche' esiste: il briefing gira senza nessuno davanti allo schermo. Il JWT admin
dura 24h e vive nel localStorage di una sessione loggata, quindi un'automazione
non puo' usarlo — o il token e' scaduto, o il browser non e' connesso, e il
briefing salta. Questa chiave sblocca SOLO i due GET di report, che leggono e
non scrivono nulla.

NON e' un ruolo e non passa da `auth.decode_token`: non apre nessun altro
endpoint, nemmeno in lettura. Per revocarla basta cambiare la variabile
d'ambiente e riavviare.

Fail-closed: se `LUCA_REPORT_KEY` non e' configurata (o e' piu' corta di
MIN_KEY_LENGTH) la chiave non vale mai e resta solo la strada del JWT admin.

Vedi commit fa110052 (chiusura dei 61 endpoint admin aperti): questa non e' una
riapertura di quel buco, e' un canale stretto e revocabile per l'automazione.
"""
import hmac
import logging
import os
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

ENV_VAR = "LUCA_REPORT_KEY"
HEADER_NAME = "X-Report-Key"
MIN_KEY_LENGTH = 32

security = HTTPBearer(auto_error=False)


def report_key_configured() -> bool:
    """True se la chiave e' configurata e abbastanza lunga da valere qualcosa."""
    return len(os.environ.get(ENV_VAR, "")) >= MIN_KEY_LENGTH


def _report_key_ok(provided: Optional[str]) -> bool:
    expected = os.environ.get(ENV_VAR, "")
    if not report_key_configured() or not provided:
        return False
    return hmac.compare_digest(provided, expected)


async def require_admin_or_report_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Passa con un JWT admin/superadmin OPPURE con la chiave di report.

    Da applicare esclusivamente a endpoint GET di sola lettura. Il valore
    restituito ha la stessa forma d'uso di `require_admin` (i due endpoint
    che la usano non lo leggono nel body).
    """
    if _report_key_ok(request.headers.get(HEADER_NAME)):
        logger.info(
            "Report servito via %s (automazione) su %s", HEADER_NAME, request.url.path
        )
        return {"role": "report_key", "via": "report_key"}

    from auth import decode_token

    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data
