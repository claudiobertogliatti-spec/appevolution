"""
Stefania Engine — Evolution PRO Guided System
==============================================
Internal coordination engine.
Evaluates partner state, decides next action, manages transitions.

NOT a chat bot. NOT user-facing.
Stefania computes decisions — Valentina (and other agents) communicate them.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from .agent_dispatcher import get_assigned_agent

# ── State ordering ─────────────────────────────────────────────────────────────

STATE_ORDER = [
    "ONBOARDING",
    "POSITIONING",
    "MASTERCLASS",
    "VIDEOCORSO",
    "FUNNEL",
    "LANCIO",
    "POST_LAUNCH",
    "SCALING",
]

# ── Canonical progress_data schema ─────────────────────────────────────────────
# Each key is a step_code.
# bool → partner or system sets True when done
# int  → counter (MODULES_TOTAL, MODULES_UPLOADED)

CANONICAL_PROGRESS: dict[str, dict] = {
    "ONBOARDING": {
        "UPLOAD_DOCS":      False,
        "VERIFY_IDENTITY":  False,
        "CONFIRM_NICHE":    False,
    },
    "POSITIONING": {
        "BIO_COMPLETED":            False,
        "TARGET_DEFINED":           False,
        "TRANSFORMATION_DEFINED":   False,
        "POSITIONING_CONFIRMED":    False,
    },
    "MASTERCLASS": {
        "SCRIPT_WRITTEN":   False,
        "SCRIPT_APPROVED":  False,
        "VIDEO_RECORDED":   False,
        "VIDEO_APPROVED":   False,
    },
    "VIDEOCORSO": {
        "STRUCTURE_DEFINED":    False,
        "MODULES_TOTAL":        0,
        "MODULES_UPLOADED":     0,
        "CONTENT_APPROVED":     False,
    },
    "FUNNEL": {
        "COPY_WRITTEN":         False,
        "COPY_APPROVED":        False,
        "FUNNEL_BUILT":         False,
        "PAYMENT_CONFIGURED":   False,
        "CHECKOUT_TEST_PASSED": False,
    },
    "LANCIO": {
        "CALENDAR_CREATED":     False,
        "CONTENT_READY":        False,
        "LAUNCH_APPROVED":      False,
        "GO_LIVE_DATE":         None,
        "WENT_LIVE":            False,
        "FIRST_WEEK_DONE":      False,
    },
    "POST_LAUNCH": {
        "KPI_BASELINE_SET":     False,
        "FIRST_SALE":           False,
        "FUNNEL_OPTIMIZED":     False,
        "REVIEW_CALL_DONE":     False,
    },
    "SCALING": {
        "ADV_ACTIVATED":            False,
        "UPSELL_DEFINED":           False,
        "SECOND_PRODUCT_STARTED":   False,
        "COMMUNITY_ACTIVE":         False,
    },
}

# ── Completion rules ───────────────────────────────────────────────────────────
# Each state defines which step_codes must be True to consider the state complete.
# VIDEOCORSO uses a lambda for the counter logic.
# SCALING has no auto-completion — requires explicit admin graduation.

def _videocorso_complete(prog: dict) -> bool:
    total = prog.get("MODULES_TOTAL", 0)
    uploaded = prog.get("MODULES_UPLOADED", 0)
    return (
        prog.get("STRUCTURE_DEFINED", False)
        and total > 0
        and uploaded >= total
        and prog.get("CONTENT_APPROVED", False)
    )

COMPLETION_RULES: dict[str, Any] = {
    "ONBOARDING":   ["UPLOAD_DOCS", "VERIFY_IDENTITY", "CONFIRM_NICHE"],
    "POSITIONING":  ["BIO_COMPLETED", "TARGET_DEFINED", "TRANSFORMATION_DEFINED", "POSITIONING_CONFIRMED"],
    "MASTERCLASS":  ["SCRIPT_WRITTEN", "SCRIPT_APPROVED", "VIDEO_RECORDED", "VIDEO_APPROVED"],
    "VIDEOCORSO":   _videocorso_complete,
    "FUNNEL":       ["COPY_WRITTEN", "COPY_APPROVED", "FUNNEL_BUILT", "PAYMENT_CONFIGURED", "CHECKOUT_TEST_PASSED"],
    "LANCIO":       ["CALENDAR_CREATED", "CONTENT_READY", "LAUNCH_APPROVED", "WENT_LIVE", "FIRST_WEEK_DONE"],
    "POST_LAUNCH":  ["KPI_BASELINE_SET", "FIRST_SALE", "FUNNEL_OPTIMIZED", "REVIEW_CALL_DONE"],
    "SCALING":      [],  # no auto-completion
}

# ── Step classification ────────────────────────────────────────────────────────
# ACTIONABLE: partner can complete this directly via UI
# INTERNAL: requires admin, agent, or system — partner waits

STEP_TYPES: dict[str, dict[str, str]] = {
    "ONBOARDING": {
        "UPLOAD_DOCS":      "ACTIONABLE",
        "VERIFY_IDENTITY":  "INTERNAL",   # admin verifies
        "CONFIRM_NICHE":    "ACTIONABLE",
    },
    "POSITIONING": {
        "BIO_COMPLETED":            "ACTIONABLE",
        "TARGET_DEFINED":           "ACTIONABLE",
        "TRANSFORMATION_DEFINED":   "ACTIONABLE",
        "POSITIONING_CONFIRMED":    "ACTIONABLE",
    },
    "MASTERCLASS": {
        "SCRIPT_WRITTEN":   "ACTIONABLE",
        "SCRIPT_APPROVED":  "INTERNAL",   # Valentina reviews
        "VIDEO_RECORDED":   "ACTIONABLE",
        "VIDEO_APPROVED":   "INTERNAL",   # Andrea approves
    },
    "VIDEOCORSO": {
        "STRUCTURE_DEFINED":    "ACTIONABLE",
        "MODULES_UPLOADED":     "ACTIONABLE",   # special: counter, not bool
        "CONTENT_APPROVED":     "INTERNAL",     # Andrea approves
    },
    "FUNNEL": {
        "COPY_WRITTEN":         "ACTIONABLE",
        "COPY_APPROVED":        "INTERNAL",     # admin reviews
        "FUNNEL_BUILT":         "INTERNAL",     # Gaia builds
        "PAYMENT_CONFIGURED":   "INTERNAL",     # Gaia / Stripe
        "CHECKOUT_TEST_PASSED": "INTERNAL",     # automated test
    },
    "LANCIO": {
        "CALENDAR_CREATED":     "ACTIONABLE",
        "CONTENT_READY":        "ACTIONABLE",
        "LAUNCH_APPROVED":      "INTERNAL",     # Claudio approves
        "WENT_LIVE":            "INTERNAL",     # system / Claudio
        "FIRST_WEEK_DONE":      "INTERNAL",     # system sets after 7 days
    },
    "POST_LAUNCH": {
        "KPI_BASELINE_SET":     "INTERNAL",     # system computes
        "FIRST_SALE":           "INTERNAL",     # Stripe webhook
        "FUNNEL_OPTIMIZED":     "ACTIONABLE",
        "REVIEW_CALL_DONE":     "INTERNAL",     # Marco confirms call
    },
    "SCALING": {
        "ADV_ACTIVATED":            "ACTIONABLE",
        "UPSELL_DEFINED":           "ACTIONABLE",
        "SECOND_PRODUCT_STARTED":   "ACTIONABLE",
        "COMMUNITY_ACTIVE":         "ACTIONABLE",
    },
}

# ── Blocking conditions ────────────────────────────────────────────────────────
# A step can be blocked with a human-readable reason that is shown to the partner.
# Keys are (state, step_code) → blocking function(progress_data) → str|None

def _check_upload_docs_blocked(prog: dict) -> Optional[str]:
    return None  # never blocked, always the first action

def _check_modules_uploadable(prog: dict) -> Optional[str]:
    if not prog.get("STRUCTURE_DEFINED", False):
        return "Devi prima definire la struttura del corso."
    if prog.get("MODULES_TOTAL", 0) == 0:
        return "Indica quanti moduli vuoi creare prima di iniziare l'upload."
    return None

BLOCKING_CONDITIONS: dict[tuple[str, str], callable] = {
    ("VIDEOCORSO", "MODULES_UPLOADED"): _check_modules_uploadable,
}


def _is_state_complete(state: str, progress_data: dict) -> bool:
    """Return True if all completion conditions for the state are satisfied."""
    rule = COMPLETION_RULES.get(state)
    if not rule:
        return False
    if callable(rule):
        return rule(progress_data.get(state, {}))
    state_prog = progress_data.get(state, {})
    return all(state_prog.get(key, False) for key in rule)


def _compute_completion_percentage(progress_data: dict) -> int:
    """
    Compute overall completion % across all states.
    Weighted equally by state count.
    """
    if not progress_data:
        return 0

    total_weight = len(STATE_ORDER)
    earned = 0.0

    for state in STATE_ORDER:
        rule = COMPLETION_RULES.get(state, [])
        state_prog = progress_data.get(state, {})

        if callable(rule):
            earned += 1.0 if rule(state_prog) else 0.0
            continue

        if not rule:
            continue

        done = sum(1 for k in rule if state_prog.get(k, False))
        earned += done / len(rule)

    return min(100, int((earned / total_weight) * 100))


def _find_current_step(state: str, progress_data: dict) -> tuple[str, str]:
    """
    Return (current_step, step_type) for the given state.

    Logic:
    1. Walk through the canonical step order for this state.
    2. Find the first step that is not yet complete.
    3. If that step is INTERNAL (waiting), return it with type WAITING.
    4. If that step is ACTIONABLE and has no blocking conditions, return ACTIONABLE.
    5. If blocked, return it with type BLOCKED.

    For VIDEOCORSO counter steps (MODULES_UPLOADED), check if count < total.
    """
    state_prog = progress_data.get(state, {})
    canonical = CANONICAL_PROGRESS.get(state, {})
    step_types = STEP_TYPES.get(state, {})

    for step_code in canonical.keys():
        # Skip non-bool metadata (like GO_LIVE_DATE)
        canonical_val = canonical[step_code]
        if canonical_val is None:
            continue

        # Handle counter steps (MODULES_UPLOADED)
        if isinstance(canonical_val, int):
            total = state_prog.get("MODULES_TOTAL", 0)
            uploaded = state_prog.get("MODULES_UPLOADED", 0)
            if total == 0 or uploaded < total:
                step_type = step_types.get(step_code, "ACTIONABLE")
                # Check blocking
                blocker = BLOCKING_CONDITIONS.get((state, step_code))
                if blocker:
                    reason = blocker(state_prog)
                    if reason:
                        return step_code, "BLOCKED"
                return step_code, step_type
            continue

        # Handle bool steps
        if not state_prog.get(step_code, False):
            step_type = step_types.get(step_code, "ACTIONABLE")
            if step_type == "INTERNAL":
                return step_code, "WAITING"
            # Check blocking
            blocker = BLOCKING_CONDITIONS.get((state, step_code))
            if blocker:
                reason = blocker(state_prog)
                if reason:
                    return step_code, "BLOCKED"
            return step_code, "ACTIONABLE"

    # All steps done — state is complete
    return "__COMPLETE__", "COMPLETE"


def _get_blocking_reason(state: str, step: str, progress_data: dict) -> Optional[str]:
    """Return human-readable blocking reason if step is blocked, else None."""
    blocker = BLOCKING_CONDITIONS.get((state, step))
    if blocker:
        return blocker(progress_data.get(state, {}))
    return None


def _next_state(current_state: str) -> Optional[str]:
    """Return the next state after current_state, or None if at SCALING."""
    try:
        idx = STATE_ORDER.index(current_state)
        if idx + 1 < len(STATE_ORDER):
            return STATE_ORDER[idx + 1]
    except ValueError:
        pass
    return None


def _build_default_progress() -> dict:
    """Return a fresh progress_data dict with all canonical defaults."""
    return {state: dict(steps) for state, steps in CANONICAL_PROGRESS.items()}


def _migrate_progress_from_phase(phase: str) -> dict:
    """
    Build progress_data for an existing partner based on their current phase.
    Conservative: mark all states BEFORE the current one as complete.
    """
    phase_to_state = {
        "F0": "ONBOARDING",
        "F1": "ONBOARDING",
        "F2": "POSITIONING",
        "F3": "MASTERCLASS",
        "F4": "VIDEOCORSO",
        "F5": "VIDEOCORSO",
        "F6": "FUNNEL",
        "F7": "FUNNEL",
        "F8": "LANCIO",
        "F9": "LANCIO",
        "LIVE": "POST_LAUNCH",
        "OTTIMIZZAZIONE": "POST_LAUNCH",
    }
    current_state = phase_to_state.get(phase, "ONBOARDING")
    progress = _build_default_progress()

    # Mark all states before current as fully complete
    for state in STATE_ORDER:
        if state == current_state:
            break
        state_canon = CANONICAL_PROGRESS.get(state, {})
        for k, v in state_canon.items():
            if isinstance(v, bool):
                progress[state][k] = True
            elif isinstance(v, int) and k == "MODULES_TOTAL":
                progress[state][k] = 5   # reasonable default
            elif isinstance(v, int) and k == "MODULES_UPLOADED":
                progress[state][k] = 5

    return progress


# ── Main engine ────────────────────────────────────────────────────────────────

class StefaniaEngine:
    """
    Core coordination engine.
    Stateless: all methods take partner data and return results.
    The router/service layer handles persistence.
    """

    STALL_THRESHOLD_HOURS = 72

    @staticmethod
    def evaluate(partner: dict) -> dict:
        """
        Full evaluation of partner guided state.
        Returns updated guided sub-document (does NOT persist).

        Steps:
        1. Get or initialize guided sub-document.
        2. Check if current state is complete → advance if so.
        3. Find current step and step type within state.
        4. Update assigned_agent, completion_percentage, blocked_reason.
        """
        guided = partner.get("guided") or {}
        if not guided:
            # First time: initialize from existing phase
            phase = partner.get("phase", "F1")
            phase_to_state = {
                "F0": "ONBOARDING", "F1": "ONBOARDING",
                "F2": "POSITIONING", "F3": "MASTERCLASS",
                "F4": "VIDEOCORSO",  "F5": "VIDEOCORSO",
                "F6": "FUNNEL",      "F7": "FUNNEL",
                "F8": "LANCIO",      "F9": "LANCIO",
                "LIVE": "POST_LAUNCH", "OTTIMIZZAZIONE": "POST_LAUNCH",
            }
            current_state = phase_to_state.get(phase, "ONBOARDING")
            progress_data = _migrate_progress_from_phase(phase)
            guided = {
                "current_state": current_state,
                "current_step": None,
                "progress_data": progress_data,
                "blocked_reason": None,
                "next_action_code": None,
                "assigned_agent": "VALENTINA",
                "internal_coordinator": "STEFANIA",
                "state_updated_at": datetime.now(timezone.utc).isoformat(),
                "completion_percentage": 0,
                "last_action_at": None,
                "last_action_code": None,
            }

        current_state = guided.get("current_state", "ONBOARDING")
        progress_data = guided.get("progress_data", _build_default_progress())

        # Ensure all state keys exist in progress_data (forward-compatibility)
        for state, defaults in CANONICAL_PROGRESS.items():
            if state not in progress_data:
                progress_data[state] = dict(defaults)

        # Check if current state is fully complete → advance
        while _is_state_complete(current_state, progress_data):
            next_s = _next_state(current_state)
            if not next_s:
                break  # Already at SCALING
            current_state = next_s
            guided["state_updated_at"] = datetime.now(timezone.utc).isoformat()

        # Find current step within state
        current_step, step_type = _find_current_step(current_state, progress_data)

        # Determine blocking reason
        blocked_reason = None
        if step_type == "BLOCKED":
            blocked_reason = _get_blocking_reason(
                current_state, current_step, progress_data
            )

        # Assign agent
        step_for_agent = current_step if current_step != "__COMPLETE__" else current_step
        assigned_agent = get_assigned_agent(current_state, current_step)

        # Compute completion
        completion_pct = _compute_completion_percentage(progress_data)

        guided.update({
            "current_state": current_state,
            "current_step": current_step,
            "progress_data": progress_data,
            "blocked_reason": blocked_reason,
            "next_action_code": current_step,
            "assigned_agent": assigned_agent,
            "internal_coordinator": "STEFANIA",
            "completion_percentage": completion_pct,
        })

        return guided

    @staticmethod
    def advance(partner: dict, step_code: str, payload: dict = None, source: str = "partner") -> dict:
        """
        Mark step_code as complete in progress_data, then re-evaluate.
        Returns updated guided dict (does NOT persist).

        source: "partner" | "admin" | "agent:andrea" | "webhook:stripe" | "system"
        """
        guided = StefaniaEngine.evaluate(partner)
        progress_data = guided["progress_data"]
        current_state = guided["current_state"]

        state_prog = progress_data.get(current_state, {})

        # Handle counter steps
        if step_code == "MODULES_UPLOADED" and isinstance(state_prog.get("MODULES_UPLOADED"), int):
            state_prog["MODULES_UPLOADED"] = state_prog.get("MODULES_UPLOADED", 0) + 1
        elif step_code == "MODULES_TOTAL" and payload and "total" in payload:
            state_prog["MODULES_TOTAL"] = int(payload["total"])
        elif step_code in state_prog and isinstance(state_prog[step_code], bool):
            state_prog[step_code] = True
        elif step_code == "GO_LIVE_DATE" and payload and "date" in payload:
            state_prog["GO_LIVE_DATE"] = payload["date"]
        else:
            # Step may belong to a different state (e.g., system completing a prior step)
            for state, s_prog in progress_data.items():
                if step_code in s_prog and isinstance(s_prog[step_code], bool):
                    s_prog[step_code] = True
                    break

        progress_data[current_state] = state_prog
        guided["progress_data"] = progress_data
        guided["last_action_at"] = datetime.now(timezone.utc).isoformat()
        guided["last_action_code"] = step_code

        # Rebuild partner with updated guided to re-evaluate
        updated_partner = dict(partner)
        updated_partner["guided"] = guided
        return StefaniaEngine.evaluate(updated_partner)

    @staticmethod
    def detect_stall(partner: dict) -> bool:
        """Return True if partner has been inactive for > STALL_THRESHOLD_HOURS."""
        guided = partner.get("guided", {})
        if not guided:
            return False
        last_action = guided.get("last_action_at")
        if not last_action:
            # Use state_updated_at as fallback
            last_action = guided.get("state_updated_at")
        if not last_action:
            return False
        try:
            last_dt = datetime.fromisoformat(last_action.replace("Z", "+00:00"))
            delta = datetime.now(timezone.utc) - last_dt
            return delta > timedelta(hours=StefaniaEngine.STALL_THRESHOLD_HOURS)
        except Exception:
            return False

    @staticmethod
    def escalate_reason(partner: dict) -> Optional[str]:
        """Return escalation reason string if partner needs escalation, else None."""
        if StefaniaEngine.detect_stall(partner):
            guided = partner.get("guided", {})
            state = guided.get("current_state", "?")
            step = guided.get("current_step", "?")
            return f"Inattività > 72h in stato {state} / step {step}"
        blocked = partner.get("guided", {}).get("blocked_reason")
        if blocked:
            return f"Bloccato: {blocked}"
        return None
