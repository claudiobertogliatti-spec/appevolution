import importlib.util
import sys
import types
from pathlib import Path


def _load_partner_rewards():
    fastapi = types.ModuleType("fastapi")

    class _Router:
        def __init__(self, *args, **kwargs):
            pass

        def get(self, *args, **kwargs):
            return lambda fn: fn

    class _HTTPException(Exception):
        def __init__(self, status_code=None, detail=None):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    fastapi.APIRouter = _Router
    fastapi.HTTPException = _HTTPException
    responses = types.ModuleType("fastapi.responses")
    responses.Response = object

    sys.modules.setdefault("fastapi", fastapi)
    sys.modules.setdefault("fastapi.responses", responses)

    path = Path("backend/routers/partner_rewards.py")
    spec = importlib.util.spec_from_file_location("partner_rewards_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


partner_rewards = _load_partner_rewards()


def test_rewards_use_the_three_evo_phases():
    labels = {phase: meta["label"] for phase, meta in partner_rewards.PHASE_META.items()}

    assert labels == {
        "esamina": "Esamina",
        "valida": "Valida",
        "ottimizza": "Ottimizza",
    }


def test_project_book_sections_enrich_across_the_full_path():
    ctx = {
        "partner": {"name": "Partner Test", "business_name": "Metodo Test"},
        "steps_by_id": {
            "la-tua-storia": {"data": {"sintesi": "Storia professionale chiara."}},
            "04-posizionamento": {"data": {"target": "Consulenti", "promessa": "Risultato concreto."}},
            "03-brand-kit": {"data": {"tono": "Diretto e semplice."}},
            "05-script-masterclass": {"data": {"titolo": "Masterclass Test"}},
            "06-outline-lezioni": {"data": {"outline": "Modulo 1, Modulo 2"}},
            "07-script-videolezioni": {"data": {"script_videolezioni": "Script lezione 1"}},
            "10-sistema-vendita": {"data": {"note_sistema_vendita": "Dominio, legal e funnel pronti."}},
            "11-calendario-30gg": {"data": {"summary": "30 giorni di lancio"}},
            "12-prezzo-webinar": {"data": {"prezzo": "497 euro"}},
        },
    }

    sections = partner_rewards._project_sections(ctx)
    titles = [section["title"] for section in sections]

    assert titles == [
        "Identita' professionale",
        "Target",
        "Problema e promessa",
        "Brand",
        "Masterclass",
        "Corso",
        "Script videolezioni",
        "Sistema di vendita",
        "Calendario di lancio",
        "Webinar e offerta",
        "Ottimizzazione",
    ]
    assert "Dominio, legal e funnel pronti." in [section["body"] for section in sections]
