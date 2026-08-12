"""Definizione journey per il tier `start` e regole di accesso per tier.

Il cliente Ciak Start (499 EUR) entra nella STESSA area del partner, con una
journey ridotta. Questi test fissano il contratto della definizione separata:
non tocca i 20 step canonici F-1..F-20, riusa gli step_id dei partner dove
esistono, e non fa mai sparire nulla a chi sale di livello.
"""
import pytest

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from models.start_journey import (
    START_JOURNEY_STEPS_DEFINITION,
    TIER_PARTNERSHIP,
    TIER_START,
    all_known_step_definitions,
    journey_definition_for_tier,
    locked_step_definitions_for_tier,
    min_tier_for_step,
    normalize_tier,
    tier_allows_step,
    tier_rank,
)

pytestmark = pytest.mark.unit


# ─── normalize_tier ────────────────────────────────────────────────────────────
# I 26 partner migrati stamattina non hanno il campo `tier`. Se l'assenza non
# valesse "partnership", la guardia e la journey si chiuderebbero in faccia a
# tutti loro nello stesso commit che apre Start.


def test_tier_assente_vale_partnership():
    assert normalize_tier(None) == TIER_PARTNERSHIP
    assert normalize_tier("") == TIER_PARTNERSHIP
    assert normalize_tier("   ") == TIER_PARTNERSHIP


def test_tier_sconosciuto_non_promuove_a_partnership():
    # Un valore non riconosciuto non deve concedere piu' di quanto concede Start:
    # sbagliare in senso permissivo qui aprirebbe i 14 step partner.
    assert tier_rank(normalize_tier("qualcosa-di-nuovo")) <= tier_rank(TIER_START)


def test_ordine_dei_tier():
    assert tier_rank("blueprint") < tier_rank(TIER_START) < tier_rank(TIER_PARTNERSHIP) < tier_rank("evo_s")


# ─── definizione start ─────────────────────────────────────────────────────────


def test_journey_start_ha_sei_step():
    assert len(START_JOURNEY_STEPS_DEFINITION) == 6


def test_journey_start_riusa_gli_step_id_dei_partner():
    ids = [d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION]
    assert "03-brand-kit" in ids
    assert "04-posizionamento" in ids
    assert {"start-profili", "start-vetrina", "start-contenuti-90", "start-readiness"} <= set(ids)


def test_step_riusati_conservano_numero_e_codice_canonici():
    """Se il numero divergesse, l'upgrade a partner lascerebbe la journey
    ordinata a caso: il seed salta gli step che esistono gia'."""
    canonical = {d["step_id"]: d for d in JOURNEY_STEPS_DEFINITION}
    for definition in START_JOURNEY_STEPS_DEFINITION:
        canon = canonical.get(definition["step_id"])
        if not canon:
            continue
        assert definition["step_number"] == canon["step_number"]
        assert definition["code"] == canon["code"]
        assert definition["macro_phase"] == canon["macro_phase"]


def test_step_solo_start_non_collidono_con_i_numeri_canonici():
    canonical_numbers = {d["step_number"] for d in JOURNEY_STEPS_DEFINITION}
    solo_start = [d for d in START_JOURNEY_STEPS_DEFINITION if d["step_id"].startswith("start-")]
    assert solo_start, "attesi step start-only"
    for definition in solo_start:
        assert definition["step_number"] not in canonical_numbers


def test_step_solo_start_stanno_dopo_il_posizionamento_e_prima_di_valida():
    posizionamento = next(d for d in JOURNEY_STEPS_DEFINITION if d["step_id"] == "04-posizionamento")
    primo_valida = next(d for d in JOURNEY_STEPS_DEFINITION if d["step_id"] == "05-script-masterclass")
    for definition in START_JOURNEY_STEPS_DEFINITION:
        if not definition["step_id"].startswith("start-"):
            continue
        assert posizionamento["step_number"] < definition["step_number"] < primo_valida["step_number"]


def test_i_20_step_canonici_non_sono_stati_toccati():
    """Guardia esplicita: la migrazione journey_f20 e' andata in produzione su
    26 partner stamattina. Questa definizione si aggiunge, non modifica."""
    assert len(JOURNEY_STEPS_DEFINITION) == 20
    codes = [d["code"] for d in JOURNEY_STEPS_DEFINITION]
    assert codes == [f"F-{n}" for n in range(1, 21)]


# ─── journey_definition_for_tier ───────────────────────────────────────────────


def test_definizione_per_tier_start():
    assert journey_definition_for_tier(TIER_START) == START_JOURNEY_STEPS_DEFINITION


def test_definizione_per_partner_senza_tier_resta_quella_canonica():
    assert journey_definition_for_tier(None) == JOURNEY_STEPS_DEFINITION
    assert journey_definition_for_tier(TIER_PARTNERSHIP) == JOURNEY_STEPS_DEFINITION
    assert journey_definition_for_tier("evo_s") == JOURNEY_STEPS_DEFINITION


def test_all_known_step_definitions_copre_canonici_e_start_only():
    known = {d["step_id"] for d in all_known_step_definitions()}
    assert known == {d["step_id"] for d in JOURNEY_STEPS_DEFINITION} | {
        d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION
    }


# ─── min_tier / gate ───────────────────────────────────────────────────────────


def test_min_tier_degli_step_start():
    for step_id in ("03-brand-kit", "04-posizionamento", "start-profili", "start-readiness"):
        assert min_tier_for_step(step_id) == TIER_START


def test_min_tier_degli_step_partner():
    for step_id in ("05-script-masterclass", "13-lancio", "20-ottimizzazione"):
        assert min_tier_for_step(step_id) == TIER_PARTNERSHIP


def test_start_non_puo_toccare_gli_step_partner():
    assert tier_allows_step(TIER_START, "05-script-masterclass") is False
    assert tier_allows_step(TIER_START, "20-ottimizzazione") is False


def test_start_puo_toccare_i_suoi_step():
    assert tier_allows_step(TIER_START, "04-posizionamento") is True
    assert tier_allows_step(TIER_START, "start-vetrina") is True


def test_partner_puo_toccare_tutto_compresi_gli_step_start_ereditati():
    """Chi sale a Partnership porta con se' i 4 step Start: devono restare
    accessibili, altrimenti l'upgrade fa sparire lavoro gia' fatto."""
    for step_id in ("start-profili", "04-posizionamento", "13-lancio"):
        assert tier_allows_step(TIER_PARTNERSHIP, step_id) is True
        assert tier_allows_step(None, step_id) is True


def test_step_sconosciuto_richiede_partnership():
    # Default chiuso: uno step non mappato non si apre a un cliente da 499 EUR.
    assert tier_allows_step(TIER_START, "step-che-non-esiste") is False


# ─── step lucchettati (leva di upgrade) ────────────────────────────────────────


def test_start_vede_lucchettati_gli_step_partner():
    locked = locked_step_definitions_for_tier(TIER_START)
    locked_ids = {d["step_id"] for d in locked}
    assert "05-script-masterclass" in locked_ids
    assert "13-lancio" in locked_ids
    # Nessuno step gia' suo puo' comparire lucchettato.
    assert locked_ids.isdisjoint({d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION})
    assert len(locked) == len(JOURNEY_STEPS_DEFINITION) - 2


def test_partner_non_ha_step_lucchettati():
    assert locked_step_definitions_for_tier(TIER_PARTNERSHIP) == []
    assert locked_step_definitions_for_tier(None) == []
