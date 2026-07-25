from pathlib import Path
import importlib.util
import sys
import types


ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def load_evo_booster():
    fastapi = types.ModuleType("fastapi")

    class HTTPException(Exception):
        def __init__(self, status_code=None, detail=None):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class APIRouter:
        def __init__(self, *args, **kwargs):
            pass

        def get(self, *args, **kwargs):
            return lambda fn: fn

        def post(self, *args, **kwargs):
            return lambda fn: fn

    def Depends(value=None):
        return value

    fastapi.APIRouter = APIRouter
    fastapi.Depends = Depends
    fastapi.HTTPException = HTTPException
    sys.modules["fastapi"] = fastapi

    security = types.ModuleType("fastapi.security")

    class HTTPBearer:
        def __init__(self, *args, **kwargs):
            pass

    class HTTPAuthorizationCredentials:
        pass

    security.HTTPBearer = HTTPBearer
    security.HTTPAuthorizationCredentials = HTTPAuthorizationCredentials
    sys.modules["fastapi.security"] = security

    stripe = types.ModuleType("stripe")
    stripe.api_key = None
    stripe.checkout = types.SimpleNamespace(Session=types.SimpleNamespace(create=lambda **_: None))
    sys.modules["stripe"] = stripe

    spec = importlib.util.spec_from_file_location("evo_booster_for_test", ROOT / "backend/routers/evo_booster.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_backend_post12_plans_include_recover_and_three_scaling_levels():
    mod = load_evo_booster()

    assert mod.EVO_S_PLANS["recover"]["amount"] == 14700
    assert mod.EVO_S_PLANS["start"]["amount"] == 29700
    assert mod.EVO_S_PLANS["grow"]["amount"] == 49700
    assert mod.EVO_S_PLANS["scale"]["amount"] == 79700


def test_post12_page_explains_each_plan_minimum_six_months_without_guru_copy():
    text = read("frontend/src/ciak/partner/sections/EvoSPage.jsx")

    for expected in [
        "Inside",
        "147 € / mese",
        "Pro",
        "297 € / mese",
        "Premium",
        "497 € / mese",
        "Elite",
        "797 € / mese",
        "Impegno minimo 6 mesi",
        "Cosa comprende",
        "Cosa non comprende",
    ]:
        assert expected in text

    forbidden = ["soldi facili", "risultati garantiti", "segreto", "esplodere", "passivo automatico"]
    lowered = text.lower()
    for term in forbidden:
        assert term not in lowered
