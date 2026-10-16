"""La vista percorso non mostra gli step della vecchia numerazione (valido per tutti i partner).

Caso reale (13/10/2026): tutti i 25 partner avevano in fondo al percorso righe come
«Non richiesto → 09-funnel-asset», cioè l'ID grezzo. Erano step di una numerazione
precedente, archiviati come `skipped` dalla migrazione e mai tolti dalla vista.
"""
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.partner_journey as pj

pytestmark = pytest.mark.unit

# i quattro ID visti in produzione, con lo stato reale (sempre skipped, a volte con dati)
LEGACY = ["07-registra-masterclass", "08-registra-lezioni", "09-funnel-asset", "10-funnel-team-work"]


def test_legacy_steps_are_hidden_but_canonical_ones_stay():
    steps = [{"step_id": "01-contratto", "status": "done"},
             {"step_id": "10-sistema-vendita", "status": "in_progress"},
             {"step_id": "20-ottimizzazione", "status": "pending"}]
    steps += [{"step_id": sid, "status": "skipped", "data": {"admin_documents": [{"url": "x"}]}} for sid in LEGACY]
    visti = [s["step_id"] for s in pj.visible_journey_steps(steps)]
    assert visti == ["01-contratto", "10-sistema-vendita", "20-ottimizzazione"]
    for sid in LEGACY:
        assert sid not in visti


def test_an_unknown_step_id_is_hidden_too():
    """Senza definizione la label diventa l'ID: al partner non si mostra mai un codice."""
    assert pj.visible_journey_steps([{"step_id": "99-mai-visto", "status": "pending"}]) == []
    assert pj.visible_journey_steps([{"step_id": None, "status": "pending"}]) == []


def test_every_canonical_step_survives_the_filter():
    from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
    steps = [{"step_id": d["step_id"], "status": "pending"} for d in JOURNEY_STEPS_DEFINITION]
    assert len(pj.visible_journey_steps(steps)) == len(JOURNEY_STEPS_DEFINITION) == 20


def test_the_hidden_ones_are_exactly_the_migration_sources():
    """Il filtro riusa l'elenco della migrazione: nessuna seconda lista da tenere allineata."""
    assert set(pj._LEGACY_STEP_IDS) == {old for old, _ in pj._LEGACY_STEP_MIGRATIONS} == set(LEGACY)
