"""Journey del tier `start` e regole di accesso per tier.

Perche' un modulo separato e non un'aggiunta a `partner_journey_step.py`:
i 20 step canonici F-1..F-20 sono stati rinumerati e migrati in produzione su
26 partner il 12/8/2026 (commit `cb014425`). `JOURNEY_STEPS_DEFINITION` e' un
contratto gia' scritto nel database: qui si aggiunge accanto, non si modifica.

Modello (deciso il 30/7, area unica a livelli):
  - un solo account, una sola area;
  - la vista deriva da cosa hai pagato (`partners.tier`), non da quale porta sei
    entrato;
  - gli step della Partnership restano VISIBILI ma lucchettati per chi e' a
    livello Start: il lucchetto e' la leva di upgrade;
  - l'upgrade e' additivo. Gli step_id riusati (`03-brand-kit`,
    `04-posizionamento`) conservano numero e codice canonici, cosi' il seed
    partner li salta e la journey resta ordinata.
"""
from __future__ import annotations

from typing import Any

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION

TIER_BLUEPRINT = "blueprint"
TIER_START = "start"
TIER_PARTNERSHIP = "partnership"
TIER_EVO_S = "evo_s"

# Scala di accesso: piu' alto = piu' aperto.
_TIER_ORDER: dict[str, int] = {
    TIER_BLUEPRINT: 0,
    TIER_START: 1,
    TIER_PARTNERSHIP: 2,
    TIER_EVO_S: 3,
}

# I 26 partner in produzione non hanno il campo `tier`: l'assenza vale
# "partnership", altrimenti questo commit li chiuderebbe fuori tutti insieme.
_TIER_WHEN_ABSENT = TIER_PARTNERSHIP

# Un valore non riconosciuto non deve concedere piu' di Start: sbagliare in
# senso permissivo aprirebbe i 14 step partner a un cliente da 499 EUR.
_TIER_WHEN_UNKNOWN = TIER_START


# I 4 step che esistono solo per Ciak Start. Numerati in decimali fra il
# posizionamento (7) e il primo step di Valida (8): `step_number` e' un float
# nel modello, e cosi' l'ordine resta coerente anche dopo l'upgrade.
START_ONLY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {
        "step_id": "start-profili",
        "step_number": 7.1,
        "code": "S-1",
        "fase_legacy": "F2",
        "macro_phase": "esamina",
        "label": "Profili social",
        "owner": "VALENTINA",
        "completion_policy": "social_profiles_ready",
        "material_categories": ["profili_social"],
    },
    {
        "step_id": "start-vetrina",
        "step_number": 7.2,
        "code": "S-2",
        "fase_legacy": "F2",
        "macro_phase": "esamina",
        "label": "Sito vetrina",
        "owner": "GAIA",
        "completion_policy": "showcase_site_live",
        "material_categories": ["sito_vetrina"],
    },
    {
        "step_id": "start-contenuti-90",
        "step_number": 7.3,
        "code": "S-3",
        "fase_legacy": "F2",
        "macro_phase": "esamina",
        "label": "Strategia e calendario 90 giorni",
        "owner": "MARCO",
        "completion_policy": "content_plan_90d_approved",
        "material_categories": ["strategia_contenuti", "calendario_contenuti"],
    },
    {
        "step_id": "start-readiness",
        "step_number": 7.4,
        "code": "S-4",
        "fase_legacy": "F2",
        "macro_phase": "esamina",
        "label": "Readiness partnership",
        "owner": "MARCO",
        "completion_policy": "partnership_readiness_reviewed",
        "material_categories": ["readiness_partnership"],
    },
]

# Gli step canonici che il cliente Start condivide con i partner. Riusati per
# step_id, non ricreati: i motori che li servono (brand kit, posizionamento)
# leggono da `partner_journey_steps` con quello slug.
START_REUSED_STEP_IDS: tuple[str, ...] = ("03-brand-kit", "04-posizionamento")

_CANONICAL_BY_ID: dict[str, dict[str, Any]] = {
    d["step_id"]: d for d in JOURNEY_STEPS_DEFINITION
}

START_JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = sorted(
    [dict(_CANONICAL_BY_ID[step_id]) for step_id in START_REUSED_STEP_IDS]
    + [dict(d) for d in START_ONLY_STEPS_DEFINITION],
    key=lambda d: d["step_number"],
)

START_STEP_IDS: frozenset[str] = frozenset(
    d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION
)

_ALL_STEPS_BY_ID: dict[str, dict[str, Any]] = {
    **_CANONICAL_BY_ID,
    **{d["step_id"]: d for d in START_ONLY_STEPS_DEFINITION},
}


def normalize_tier(value: Any) -> str:
    """Tier utilizzabile a partire da un valore grezzo del database."""
    if value is None:
        return _TIER_WHEN_ABSENT
    tier = str(value).strip().lower()
    if not tier:
        return _TIER_WHEN_ABSENT
    if tier not in _TIER_ORDER:
        return _TIER_WHEN_UNKNOWN
    return tier


def tier_rank(value: Any) -> int:
    return _TIER_ORDER[normalize_tier(value)]


def is_start_tier(value: Any) -> bool:
    return normalize_tier(value) == TIER_START


def min_tier_for_step(step_id: str) -> str:
    """Tier minimo per vedere e toccare uno step.

    Default chiuso: uno step non mappato richiede la Partnership.
    """
    if step_id in START_STEP_IDS:
        return TIER_START
    return TIER_PARTNERSHIP


def tier_allows_step(tier: Any, step_id: str) -> bool:
    return tier_rank(tier) >= _TIER_ORDER[min_tier_for_step(step_id)]


def journey_definition_for_tier(tier: Any) -> list[dict[str, Any]]:
    """Step da seedare per questo livello.

    Non e' un filtro su `min_tier`: un partner nuovo riceve i 20 canonici e non
    i 4 step Start, mentre chi arriva da Start se li tiene (il seed e'
    idempotente per `partner_id + step_id`).
    """
    if is_start_tier(tier):
        return START_JOURNEY_STEPS_DEFINITION
    return JOURNEY_STEPS_DEFINITION


def all_known_step_definitions() -> list[dict[str, Any]]:
    """Canonici + start-only, per arricchire di label/owner anche gli step
    ereditati da chi e' salito di livello."""
    return sorted(_ALL_STEPS_BY_ID.values(), key=lambda d: d["step_number"])


def step_definition(step_id: str) -> dict[str, Any] | None:
    return _ALL_STEPS_BY_ID.get(step_id)


def only_real_partners(query: dict[str, Any] | None = None) -> dict[str, Any]:
    """Query su `partners` che esclude i clienti Ciak Start.

    Il ponte di identita' crea un record `partners` per ogni cliente Start: e'
    cio' che permette ai motori esistenti di servirlo. Senza questo filtro un
    cliente da 499 EUR verrebbe contato come partner da 2.790 nel cockpit, nelle
    metriche e nei check diagnostici — cioe' un numero sbagliato in una call di
    vendita.

    `$ne` matcha anche i documenti SENZA il campo `tier`: i 26 partner migrati
    in produzione il 12/8 restano dentro senza bisogno di un backfill.
    """
    base = dict(query or {})
    if "tier" in base:
        # Non si sovrascrive un filtro esplicito sul livello: chi lo passa sa
        # gia' cosa sta chiedendo (es. la lista dei soli clienti Start).
        return base
    base["tier"] = {"$ne": TIER_START}
    return base


def locked_step_definitions_for_tier(tier: Any) -> list[dict[str, Any]]:
    """Step visibili ma non ancora acquistati. E' la leva di upgrade: si
    mostrano col lucchetto, non si seedano nel database."""
    if not is_start_tier(tier):
        return []
    return [
        dict(d)
        for d in JOURNEY_STEPS_DEFINITION
        if d["step_id"] not in START_STEP_IDS
    ]
