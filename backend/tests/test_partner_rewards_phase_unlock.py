"""Sblocco delle macro-fasi con l'Opzione A (`routers/partner_rewards._phase_unlocked`).

Dati: `fixtures/partner_steps_meta_percorso.json`, gli stati reali degli step di un
partner a meta' percorso, ridotti a step_id + status. Sostituisce il vecchio
`test_partner_rewards_andolfi.py`, che leggeva un backup completo del partner da
`storage/` (fuori da git, con dati personali) e quindi in CI non poteva girare.
"""
import json
from pathlib import Path

import pytest

from models.partner_journey_step import REQUIRED_STEP_IDS_BY_PHASE
from routers.partner_rewards import _phase_unlocked

pytestmark = pytest.mark.unit

FIXTURE = Path(__file__).parent / "fixtures" / "partner_steps_meta_percorso.json"


def _ctx(steps):
    return {"steps": steps, "steps_by_id": {s["step_id"]: s for s in steps}}


@pytest.fixture
def steps():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))["steps"]


def test_esamina_sbloccata_anche_con_step_non_bloccanti_aperti(steps):
    # Bloccanti di Esamina: discovery, burocrazia, brand kit, posizionamento (tutti done).
    # la-tua-storia (in_progress) e obiettivo (pending) non devono trattenerla.
    stati = {s["step_id"]: s["status"] for s in steps}
    assert stati["la-tua-storia"] == "in_progress"
    assert stati["obiettivo"] == "pending"
    assert _phase_unlocked(_ctx(steps), "esamina") is True


def test_valida_bloccata_finche_prezzo_webinar_e_lancio_sono_aperti(steps):
    stati = {s["step_id"]: s["status"] for s in steps}
    assert stati["12-prezzo-webinar"] == "in_progress"
    assert stati["13-lancio"] == "in_progress"
    assert _phase_unlocked(_ctx(steps), "valida") is False


def test_valida_si_sblocca_quando_tutti_i_bloccanti_sono_chiusi(steps):
    # Controprova: stessa base, chiudendo gli step bloccanti di Valida la fase si apre.
    # Senza questo, il test sopra passerebbe anche se _phase_unlocked restituisse sempre False.
    per_id = {s["step_id"]: dict(s) for s in steps}
    for sid in REQUIRED_STEP_IDS_BY_PHASE["valida"]:
        per_id[sid] = {"step_id": sid, "status": "done"}
    assert _phase_unlocked(_ctx(list(per_id.values())), "valida") is True


def test_uno_step_skipped_conta_come_chiuso(steps):
    per_id = {s["step_id"]: dict(s) for s in steps}
    for sid in REQUIRED_STEP_IDS_BY_PHASE["valida"]:
        per_id[sid] = {"step_id": sid, "status": "done"}
    per_id["12-prezzo-webinar"]["status"] = "skipped"
    assert _phase_unlocked(_ctx(list(per_id.values())), "valida") is True
