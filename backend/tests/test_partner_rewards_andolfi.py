import os
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test_db")
os.environ.setdefault("REACT_APP_BACKEND_URL", "http://localhost:8000")
import json
import pytest
from pathlib import Path
from routers.partner_rewards import _phase_unlocked

BACKUP_PATH = Path(__file__).parent.parent.parent / "storage" / "migration-backups" / "daniele-andolfi-after-2026-07-30.json"

@pytest.fixture
def andolfi_ctx():
    with open(BACKUP_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    steps = data.get("steps", [])
    steps_by_id = {s.get("step_id"): s for s in steps}
    return {
        "partner_id": "23",
        "partner": data.get("partner", {}),
        "steps": steps,
        "steps_by_id": steps_by_id,
        "hub": data.get("partner", {}),
        "masterclass": data.get("masterclass", {}),
        "videocorso": data.get("videocorso", {}),
        "brand_kit": {},
        "funnel": data.get("funnel", {}),
    }

@pytest.mark.unit
def test_andolfi_esamina_unlocked_with_option_a(andolfi_ctx):
    # Con l'Opzione A (step bloccanti: 02-discovery-video, burocrazia, 03-brand-kit, 04-posizionamento),
    # Esamina si sblocca anche se la-tua-storia (in_progress) e obiettivo (pending) non sono completi.
    assert _phase_unlocked(andolfi_ctx, "esamina") is True

@pytest.mark.unit
def test_andolfi_valida_locked_because_in_progress(andolfi_ctx):
    # Con l'Opzione A (step bloccanti di Valida: 05-script-masterclass .. 12-prezzo-webinar),
    # Valida resta bloccata se 12-prezzo-webinar (in_progress) o altri step core non sono completati.
    assert _phase_unlocked(andolfi_ctx, "valida") is False
