"""Aree personali collaboratori: ore/attività, identità unica, accessi (T24).

Sui campi reali dei task collaboratore (`assigned_to`, `estimated_minutes`,
`actual_minutes`, `approved_minutes`, `week_start`, `hourly_rate`). Distingue
**pianificazione** (estimated) da **consuntivo** (actual) da **approvato** (approved), e
il **tempo** dal **risultato** (result_ref). Non riscrive gli accordi: segnala
sovrapposizioni, ore duplicate e limiti superati.

Identità unica: una collaboratrice che opera in più reparti (Mariangela in Acquisizione e
Vendite) ha UNA lista personale; la vista per reparto è un filtro, non una seconda
registrazione — il totale personale deduplica per attività.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional

# Ruoli di direzione: vedono tutto. Un admin il cui admin_type coincide con l'id di una
# collaboratrice è quella collaboratrice (vede solo i propri dati) — coerente con
# services/collaborator_settlements.can_manage_collaborator_billing.
DIRECTION_ROLES = ("superadmin",)
ECONOMIC_FIELDS = ("approved_amount", "hourly_rate")


def _norm(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def _int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def normalize_entry(task: Mapping[str, Any]) -> dict:
    """Normalizza un task collaboratore in una registrazione di lavoro."""
    return {
        "activity_id": _norm(task.get("task_id") or task.get("id")),
        "collaborator_id": _norm(task.get("assigned_to")),
        "department": _norm(task.get("department") or task.get("department_id")),
        "week_start": _norm(task.get("week_start")),
        "estimated_minutes": _int(task.get("estimated_minutes")),   # pianificazione
        "actual_minutes": _int(task.get("actual_minutes")),         # consuntivo dichiarato
        "approved_minutes": _int(task.get("approved_minutes")),     # approvate
        "started_at": _norm(task.get("started_at")),
        "ended_at": _norm(task.get("ended_at")),
        "result_ref": _norm(task.get("result_ref")),                # prova di consegna (risultato ≠ tempo)
    }


def department_view(entries: Iterable[Mapping[str, Any]], department: str) -> List[dict]:
    """Filtro per reparto: NON duplica, seleziona le registrazioni di quel reparto."""
    return [dict(e) for e in entries if _norm(e.get("department")) == department]


def personal_totals(entries: Iterable[Mapping[str, Any]]) -> dict:
    """Totali personali deduplicati per attività: passare da Acquisizione a Vendite non
    conta le ore due volte."""
    seen: Dict[str, dict] = {}
    for e in entries:
        aid = _norm(e.get("activity_id"))
        if aid and aid not in seen:  # una attività conta UNA volta, qualunque reparto
            seen[aid] = e
    return {
        "activities": len(seen),
        "estimated_minutes": sum(_int(e.get("estimated_minutes")) for e in seen.values()),
        "actual_minutes": sum(_int(e.get("actual_minutes")) for e in seen.values()),
        "approved_minutes": sum(_int(e.get("approved_minutes")) for e in seen.values()),
    }


def detect_duplicates(entries: Iterable[Mapping[str, Any]]) -> List[str]:
    """activity_id che compaiono più di una volta (stessa attività registrata due volte)."""
    counts: Dict[str, int] = {}
    for e in entries:
        aid = _norm(e.get("activity_id"))
        if aid:
            counts[aid] = counts.get(aid, 0) + 1
    return sorted([aid for aid, n in counts.items() if n > 1])


def _overlaps(a: Mapping[str, Any], b: Mapping[str, Any]) -> bool:
    a0, a1 = _norm(a.get("started_at")), _norm(a.get("ended_at"))
    b0, b1 = _norm(b.get("started_at")), _norm(b.get("ended_at"))
    if not (a0 and a1 and b0 and b1):
        return False
    return a0 < b1 and b0 < a1


def detect_overlaps(entries: Iterable[Mapping[str, Any]]) -> List[tuple]:
    """Coppie di registrazioni con finestre temporali sovrapposte."""
    items = [e for e in entries if _norm(e.get("started_at")) and _norm(e.get("ended_at"))]
    pairs = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if _overlaps(items[i], items[j]):
                pairs.append((_norm(items[i].get("activity_id")), _norm(items[j].get("activity_id"))))
    return pairs


def weekly_load(entries: Iterable[Mapping[str, Any]], week_start: str, *, max_minutes: Optional[int]) -> dict:
    """Carico settimanale (su ore approvate, deduplicate). Segnala il superamento del tetto
    concordato SENZA riscriverlo: `over_limit` è un flag, non un taglio."""
    week_entries = [e for e in entries if _norm(e.get("week_start")) == week_start]
    totals = personal_totals(week_entries)
    approved = totals["approved_minutes"]
    return {
        "week_start": week_start,
        "approved_minutes": approved,
        "declared_minutes": totals["actual_minutes"],
        "max_minutes": max_minutes,
        "over_limit": bool(max_minutes is not None and approved > max_minutes),
    }


# ─────────────────────────── controllo accessi ───────────────────────────

@dataclass(frozen=True)
class AccessDecision:
    can_view: bool
    can_edit_economics: bool
    fields: str  # "full" | "minimal"
    reason: str = ""


def _is_direction(actor: Mapping[str, Any]) -> bool:
    role = actor.get("role")
    if role in DIRECTION_ROLES:
        return True
    # admin "pieno" (senza admin_type da collaboratrice) = direzione
    return role == "admin" and not _norm(actor.get("admin_type"))


def _is_self(actor: Mapping[str, Any], collaborator_id: str) -> bool:
    return actor.get("role") == "admin" and _norm(actor.get("admin_type")) == collaborator_id


def access_for(actor: Optional[Mapping[str, Any]], collaborator_id: str) -> AccessDecision:
    """Chi vede/modifica i dati di UNA collaboratrice.

    - Direzione (superadmin, o admin senza admin_type di collaboratrice): vede tutto e può
      modificare le competenze economiche.
    - La collaboratrice stessa: vede i propri dati, NON può modificare le proprie competenze.
    - Chiunque altro (altra collaboratrice / vista reparto): al più il minimo, mai i campi economici.
    """
    if not isinstance(actor, Mapping):
        return AccessDecision(False, False, "none", "attore non autenticato")
    if _is_direction(actor):
        return AccessDecision(True, True, "full", "direzione")
    if _is_self(actor, collaborator_id):
        return AccessDecision(True, False, "full", "dati propri (economia in sola lettura)")
    return AccessDecision(False, False, "minimal", "accesso non ai dati economici altrui")


def redact_for(actor: Optional[Mapping[str, Any]], collaborator_id: str, record: Mapping[str, Any]) -> dict:
    """Restituisce il record con i campi economici rimossi quando l'attore non è
    direzione né la collaboratrice stessa."""
    decision = access_for(actor, collaborator_id)
    if decision.fields == "full":
        return dict(record)
    return {k: v for k, v in record.items() if k not in ECONOMIC_FIELDS}
