"""
Admin Diagnostics Router — Evolution PRO / Ciak
================================================
GET /api/admin/diagnostics/partners

Endpoint diagnostico in SOLA LETTURA per la rilevazione automatica di anomalie
nei dati dei partner e dell'hub partner.

NON modifica alcun dato. Segnala soltanto le anomalie riscontrate.

Controlli implementati:
  - PLAYLIST_URL_INSTEAD_OF_ID: youtube_playlist_id contiene http/watch?v= o non inizia con PL
  - PHASE_OUT_OF_SCALE: phase non e' in F1..F7 ne' LIVE (es. F9)
  - DEMO_RECORD: record di test/seed tra i partner reali (id che inizia per demo-)
  - EMPTY_OFFER: offerName o offerPrice vuoti nell'hub
  - HUB_STALE_VS_PARTNER: partner-hub.updated_at piu' vecchio di partners.updated_at di oltre 30 giorni
  - REVENUE_ZERO_WITH_ACTIVE_CONTRACT: revenue = 0 con contratto attivo
  - MISSING_SUBDOMAIN: systeme_subdomain vuoto per partner oltre F2
"""

import logging
from models.start_journey import only_real_partners
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from auth import decode_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/diagnostics", tags=["admin-diagnostics"])
security = HTTPBearer(auto_error=False)

db = None


def set_db(database) -> None:
    global db
    db = database


# ── Configurazione / Costanti nominate ──────────────────────────────────────
DEFAULT_HUB_STALE_DAYS: int = 30
VALID_PHASES: Set[str] = {"F1", "F2", "F3", "F4", "F5", "F6", "F7", "LIVE"}


# ── Auth Helper ─────────────────────────────────────────────────────────────
async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non fornito"
        )
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso riservato agli admin"
        )
    return data


# ── Pydantic Output Models ──────────────────────────────────────────────────
class IssueDetail(BaseModel):
    code: str
    detail: str
    field: str


class PartnerDiagnosticsItem(BaseModel):
    id: str
    name: str
    issues: List[IssueDetail] = Field(default_factory=list)


class DiagnosticsPartnersResponse(BaseModel):
    generated_at: str
    partners_checked: int
    issues_total: int
    by_code: Dict[str, int]
    partners: List[PartnerDiagnosticsItem]


# ── Helpers per i controlli ─────────────────────────────────────────────────
def _parse_iso_datetime(dt_val: Any) -> Optional[datetime]:
    """Parse str or datetime to timezone-aware UTC datetime."""
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val.astimezone(timezone.utc)
    if isinstance(dt_val, str):
        try:
            s = dt_val.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            return None
    return None


def _is_beyond_f2(phase: Optional[str]) -> bool:
    """Ritorna True se la fase e' oltre F2 (es. F3..F13, LIVE)."""
    if not phase:
        return False
    p = str(phase).strip().upper()
    if p == "LIVE":
        return True
    if p.startswith("F") and p[1:].isdigit():
        return int(p[1:]) > 2
    return False


def _has_active_contract(partner: Dict[str, Any]) -> bool:
    """Verifica se il partner ha un contratto attivo."""
    if partner.get("contract_status") == "active" or partner.get("has_active_contract") is True:
        return True
    contract = partner.get("contract")
    if isinstance(contract, dict):
        status_val = str(contract.get("status", "")).lower()
        active_val = contract.get("active")
        if status_val in ("active", "attivo", "signed", "firmato") or active_val is True:
            return True
    elif isinstance(contract, str):
        c_str = contract.strip().lower()
        if c_str and c_str not in ("none", "inactive", "cancelled", "draft", "expired", "0", "false"):
            return True
    return False


async def _get_hub_doc(partner_id: str) -> Optional[Dict[str, Any]]:
    """Tenta di recuperare il documento hub del partner su partner-hub, partner_hubs o partner_hub."""
    if db is None:
        return None
    
    try:
        coll_names = await db.list_collection_names()
    except Exception:
        coll_names = []

    for coll_name in ["partner-hub", "partner_hubs", "partner_hub", "hubs"]:
        if coll_name in coll_names:
            try:
                hub = await db[coll_name].find_one(
                    {"$or": [{"partner_id": partner_id}, {"id": partner_id}]},
                    {"_id": 0}
                )
                if hub:
                    return hub
            except Exception:
                pass
    return None


def inspect_partner_issues(partner: Dict[str, Any], hub: Optional[Dict[str, Any]] = None) -> List[IssueDetail]:
    """Valuta un partner ed il suo hub document restituendo la lista di anomalie riscontrate."""
    issues: List[IssueDetail] = []
    
    partner_id = str(partner.get("id", ""))
    name = str(partner.get("name", partner.get("nome", "")))
    phase = partner.get("phase")
    
    # 1. PLAYLIST_URL_INSTEAD_OF_ID
    yt_playlist_id = partner.get("youtube_playlist_id") or (hub.get("youtube_playlist_id") if hub else None)
    if yt_playlist_id and isinstance(yt_playlist_id, str):
        yt_str = yt_playlist_id.strip()
        if "http" in yt_str or "watch?v=" in yt_str or not yt_str.startswith("PL"):
            issues.append(IssueDetail(
                code="PLAYLIST_URL_INSTEAD_OF_ID",
                detail=f"youtube_playlist_id={yt_playlist_id}",
                field="youtube_playlist_id"
            ))

    # 2. PHASE_OUT_OF_SCALE
    if not phase or str(phase).strip().upper() not in VALID_PHASES:
        issues.append(IssueDetail(
            code="PHASE_OUT_OF_SCALE",
            detail=f"phase={phase}",
            field="phase"
        ))

    # 3. DEMO_RECORD
    is_demo = partner.get("is_demo") is True
    pid_lower = partner_id.lower()
    name_lower = name.lower()
    if is_demo or pid_lower.startswith("demo-") or pid_lower.startswith("test-") or pid_lower == "demo" or name_lower.startswith("demo ") or name_lower.startswith("test "):
        issues.append(IssueDetail(
            code="DEMO_RECORD",
            detail=f"id={partner_id}",
            field="id"
        ))

    # 4. EMPTY_OFFER
    offer_name = (hub.get("offerName") or hub.get("offer_name")) if hub else (partner.get("offerName") or partner.get("offer_name"))
    offer_price = (hub.get("offerPrice") or hub.get("offer_price")) if hub else (partner.get("offerPrice") or partner.get("offer_price"))
    
    offer_name_empty = not offer_name or not str(offer_name).strip()
    offer_price_empty = offer_price is None or str(offer_price).strip() in ("", "0")
    if hub is None or offer_name_empty or offer_price_empty:
        detail_msg = []
        if hub is None:
            detail_msg.append("hub document missing")
        if offer_name_empty:
            detail_msg.append("offerName empty")
        if offer_price_empty:
            detail_msg.append("offerPrice empty")
        issues.append(IssueDetail(
            code="EMPTY_OFFER",
            detail=", ".join(detail_msg),
            field="offerName/offerPrice"
        ))

    # 5. HUB_STALE_VS_PARTNER
    if hub:
        p_updated = _parse_iso_datetime(partner.get("updated_at"))
        h_updated = _parse_iso_datetime(hub.get("updated_at"))
        if p_updated and h_updated and p_updated > h_updated:
            diff_days = (p_updated - h_updated).total_seconds() / 86400.0
            if diff_days > DEFAULT_HUB_STALE_DAYS:
                issues.append(IssueDetail(
                    code="HUB_STALE_VS_PARTNER",
                    detail=f"partner-hub updated_at is {int(diff_days)} days older than partners updated_at",
                    field="updated_at"
                ))

    # 6. REVENUE_ZERO_WITH_ACTIVE_CONTRACT
    rev = partner.get("revenue", 0)
    try:
        rev_num = float(rev) if rev is not None else 0.0
    except (ValueError, TypeError):
        rev_num = 0.0

    if rev_num == 0.0 and _has_active_contract(partner):
        issues.append(IssueDetail(
            code="REVENUE_ZERO_WITH_ACTIVE_CONTRACT",
            detail="revenue=0 with active contract",
            field="revenue"
        ))

    # 7. MISSING_SUBDOMAIN
    if _is_beyond_f2(phase):
        subdomain = partner.get("systeme_subdomain") or partner.get("subdomain") or (hub.get("systeme_subdomain") if hub else None)
        if not subdomain or not str(subdomain).strip():
            issues.append(IssueDetail(
                code="MISSING_SUBDOMAIN",
                detail=f"systeme_subdomain is missing for phase={phase}",
                field="systeme_subdomain"
            ))

    return issues


# ── Endpoint GET /api/admin/diagnostics/partners ────────────────────────────
@router.get("/partners", response_model=DiagnosticsPartnersResponse)
async def get_partners_diagnostics(
    admin_user: Any = Depends(require_admin)
):
    """
    Rileva anomalie nei dati dei partner in SOLA LETTURA.
    """
    by_code = {
        "PLAYLIST_URL_INSTEAD_OF_ID": 0,
        "PHASE_OUT_OF_SCALE": 0,
        "DEMO_RECORD": 0,
        "EMPTY_OFFER": 0,
        "HUB_STALE_VS_PARTNER": 0,
        "REVENUE_ZERO_WITH_ACTIVE_CONTRACT": 0,
        "MISSING_SUBDOMAIN": 0,
    }

    if db is None:
        return DiagnosticsPartnersResponse(
            generated_at=datetime.now(timezone.utc).isoformat(),
            partners_checked=0,
            issues_total=0,
            by_code=by_code,
            partners=[]
        )

    try:
        partners_cursor = db.partners.find(only_real_partners(), {"_id": 0})
        partners_list = await partners_cursor.to_list(length=1000)
    except Exception as e:
        logger.error("Errore durante la lettura dei partner da DB: %s", e)
        partners_list = []

    result_partners: List[PartnerDiagnosticsItem] = []
    issues_total = 0

    for partner in partners_list:
        p_id = str(partner.get("id", ""))
        p_name = str(partner.get("name", partner.get("nome", "")))
        
        hub_doc = await _get_hub_doc(p_id)
        partner_issues = inspect_partner_issues(partner, hub_doc)
        
        for issue in partner_issues:
            if issue.code in by_code:
                by_code[issue.code] += 1
            else:
                by_code[issue.code] = 1
            issues_total += 1

        result_partners.append(PartnerDiagnosticsItem(
            id=p_id,
            name=p_name,
            issues=partner_issues
        ))

    return DiagnosticsPartnersResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        partners_checked=len(partners_list),
        issues_total=issues_total,
        by_code=by_code,
        partners=result_partners
    )
