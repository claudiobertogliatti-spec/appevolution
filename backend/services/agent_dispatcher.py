"""
Agent Dispatcher — Evolution PRO Guided System
================================================
Maps (state, step) → assigned_agent visible to the partner.
Stefania coordinates internally but is NEVER exposed to the partner as their assigned agent.
"""

from typing import Literal

AgentName = Literal["VALENTINA", "ANDREA", "GAIA", "MARCO", "CLAUDIO", "ANTONELLA"]

# ── Canonical agent descriptions (shown to partner) ──────────────────────────

AGENT_PROFILES: dict[str, dict] = {
    "VALENTINA": {
        "name": "Valentina",
        "role": "Strategia e onboarding",
        "description": "Ti guida nelle prime fasi e ti aiuta a impostare correttamente le basi del tuo progetto.",
        "color": "#F2C418",
        "emoji": "🟡",
    },
    "ANDREA": {
        "name": "Andrea",
        "role": "Produzione contenuti",
        "description": "Ti supporta nella creazione dei materiali e nella costruzione del tuo percorso formativo.",
        "color": "#3B82F6",
        "emoji": "🟡",
    },
    "GAIA": {
        "name": "Gaia",
        "role": "Supporto tecnico",
        "description": "Gestisce la parte operativa e tecnica necessaria alla costruzione della piattaforma.",
        "color": "#10B981",
        "emoji": "🟡",
    },
    "MARCO": {
        "name": "Marco",
        "role": "Accountability settimanale",
        "description": "Ti aiuta a mantenere continuità, ordine e avanzamento durante tutto il processo.",
        "color": "#8B5CF6",
        "emoji": "🟡",
    },
    "CLAUDIO": {
        "name": "Claudio",
        "role": "Supervisione e call strategiche",
        "description": "Interviene nei momenti decisionali e nella direzione del progetto.",
        "color": "#1E2128",
        "emoji": "👤",
    },
    "ANTONELLA": {
        "name": "Antonella",
        "role": "Comunicazione e social",
        "description": "Supporta la strategia dei contenuti e la comunicazione verso l'esterno.",
        "color": "#F97316",
        "emoji": "👤",
    },
}

# ── Dispatch table: (state, step) → assigned_agent ───────────────────────────
# Rules:
# - VALENTINA handles all onboarding, positioning, and masterclass partner-facing steps
# - ANDREA handles video production approval and videocorso
# - GAIA handles funnel technical steps
# - MARCO handles lancio, post-launch accountability
# - CLAUDIO only at GO_LIVE (final approval gate)
# - ANTONELLA handles scaling and content strategy

_DISPATCH: dict[tuple[str, str], AgentName] = {
    # ONBOARDING
    ("ONBOARDING", "UPLOAD_DOCS"):       "VALENTINA",
    ("ONBOARDING", "VERIFY_IDENTITY"):   "VALENTINA",
    ("ONBOARDING", "CONFIRM_NICHE"):     "VALENTINA",

    # POSITIONING
    ("POSITIONING", "BIO_COMPLETED"):            "VALENTINA",
    ("POSITIONING", "TARGET_DEFINED"):           "VALENTINA",
    ("POSITIONING", "TRANSFORMATION_DEFINED"):   "VALENTINA",
    ("POSITIONING", "POSITIONING_CONFIRMED"):    "VALENTINA",

    # MASTERCLASS
    ("MASTERCLASS", "SCRIPT_WRITTEN"):   "VALENTINA",
    ("MASTERCLASS", "SCRIPT_APPROVED"):  "VALENTINA",  # Valentina does the review
    ("MASTERCLASS", "VIDEO_RECORDED"):   "VALENTINA",
    ("MASTERCLASS", "VIDEO_APPROVED"):   "ANDREA",     # Andrea approves video quality

    # VIDEOCORSO
    ("VIDEOCORSO", "STRUCTURE_DEFINED"): "VALENTINA",
    ("VIDEOCORSO", "MODULES_UPLOADED"):  "ANDREA",
    ("VIDEOCORSO", "CONTENT_APPROVED"):  "ANDREA",

    # FUNNEL
    ("FUNNEL", "COPY_WRITTEN"):          "VALENTINA",
    ("FUNNEL", "COPY_APPROVED"):         "VALENTINA",
    ("FUNNEL", "FUNNEL_BUILT"):          "GAIA",
    ("FUNNEL", "PAYMENT_CONFIGURED"):    "GAIA",
    ("FUNNEL", "CHECKOUT_TEST_PASSED"):  "GAIA",

    # LANCIO
    ("LANCIO", "CALENDAR_CREATED"):      "MARCO",
    ("LANCIO", "CONTENT_READY"):         "MARCO",
    ("LANCIO", "LAUNCH_APPROVED"):       "CLAUDIO",
    ("LANCIO", "WENT_LIVE"):             "MARCO",
    ("LANCIO", "FIRST_WEEK_DONE"):       "MARCO",

    # POST_LAUNCH
    ("POST_LAUNCH", "KPI_BASELINE_SET"):     "MARCO",
    ("POST_LAUNCH", "FIRST_SALE"):           "MARCO",
    ("POST_LAUNCH", "FUNNEL_OPTIMIZED"):     "GAIA",
    ("POST_LAUNCH", "REVIEW_CALL_DONE"):     "MARCO",

    # SCALING
    ("SCALING", "ADV_ACTIVATED"):            "ANTONELLA",
    ("SCALING", "UPSELL_DEFINED"):           "ANTONELLA",
    ("SCALING", "SECOND_PRODUCT_STARTED"):   "VALENTINA",
    ("SCALING", "COMMUNITY_ACTIVE"):         "ANTONELLA",
}

_DEFAULT_AGENT: dict[str, AgentName] = {
    "ONBOARDING":   "VALENTINA",
    "POSITIONING":  "VALENTINA",
    "MASTERCLASS":  "VALENTINA",
    "VIDEOCORSO":   "ANDREA",
    "FUNNEL":       "GAIA",
    "LANCIO":       "MARCO",
    "POST_LAUNCH":  "MARCO",
    "SCALING":      "ANTONELLA",
}


def get_assigned_agent(state: str, step: str) -> AgentName:
    """Return the partner-visible responsible agent for (state, step)."""
    return _DISPATCH.get((state, step), _DEFAULT_AGENT.get(state, "VALENTINA"))


def get_agent_profile(agent_name: str) -> dict:
    """Return the full profile dict for display to the partner."""
    return AGENT_PROFILES.get(agent_name, AGENT_PROFILES["VALENTINA"])
