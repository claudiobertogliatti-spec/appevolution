"""Autorizzazione e vincolo delle approvazioni, applicati dal server (T06).

Due principi:

1. L'identità dell'attore viene dal **token autenticato**, mai dal corpo della
   richiesta, dal campo ``reviewer`` libero o dal testo di un prompt.
2. Un'approvazione autorizza **una sola versione**: se l'output cambia dopo
   l'approvazione, o se l'approvazione è scaduta, non autorizza più nulla.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

ADMIN_ROLES = ("admin", "superadmin")
# Numero massimo di rifiuti prima di fermare il task per intervento umano.
MAX_REVISIONS = 3
# Durata di validità di un'approvazione.
APPROVAL_TTL_SECONDS = 7 * 24 * 3600


def canonical_checksum(value: Any) -> str:
    """Checksum stabile del contenuto approvato (stringa o struttura)."""
    payload = json.dumps(
        value, sort_keys=True, ensure_ascii=False, default=str, separators=(",", ":")
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class AuthDecision:
    allowed: bool
    actor_id: Optional[str] = None
    reason: str = ""


def authorize_admin(actor: Optional[Mapping[str, Any]]) -> AuthDecision:
    """L'attore deve essere autenticato con ruolo admin. Ritorna l'identità reale.

    ``actor`` è il TokenData decodificato (o un mapping con ``role`` ed ``email``/
    ``user_id``). Nessuna identità viene dedotta da un nome libero.
    """
    if not isinstance(actor, Mapping):
        return AuthDecision(False, None, "attore non autenticato")
    role = actor.get("role")
    actor_id = actor.get("email") or actor.get("user_id")
    if role not in ADMIN_ROLES:
        return AuthDecision(False, actor_id if isinstance(actor_id, str) else None,
                            f"ruolo non autorizzato: {role!r}")
    if not actor_id:
        return AuthDecision(False, None, "attore senza identità")
    return AuthDecision(True, str(actor_id), "")


def _parse_iso(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


@dataclass(frozen=True)
class ApprovalCheck:
    valid: bool
    reason: str = ""


def approval_authorizes_output(
    approval: Optional[Mapping[str, Any]],
    current_output_checksum: str,
    *,
    now: Optional[datetime] = None,
) -> ApprovalCheck:
    """Un'approvazione autorizza l'esecuzione solo se: è ``approved``, ha un reviewer
    identificato, non è scaduta ed è legata ESATTAMENTE all'output corrente.

    È ciò che impedisce che «approvo la bozza A» autorizzi l'esecuzione della bozza B.
    """
    now = now or datetime.now(timezone.utc)
    if not isinstance(approval, Mapping):
        return ApprovalCheck(False, "nessuna approvazione")
    if approval.get("status") != "approved":
        return ApprovalCheck(False, f"approvazione non valida: {approval.get('status')!r}")
    if not approval.get("reviewer"):
        return ApprovalCheck(False, "approvazione senza reviewer identificato")
    approved = approval.get("approved_checksum")
    if not approved:
        return ApprovalCheck(False, "approvazione non legata a una versione (checksum assente)")
    if approved != current_output_checksum:
        return ApprovalCheck(False, "l'output è cambiato dopo l'approvazione")
    expires = _parse_iso(approval.get("expires_at"))
    if expires is not None and now >= expires:
        return ApprovalCheck(False, "approvazione scaduta")
    return ApprovalCheck(True, "")
