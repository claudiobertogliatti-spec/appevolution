import pytest

from services.start_final_deliverables import (
    build_partnership_readiness,
    build_start_content_plan,
)

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
async def test_piano_start_riusa_calendario_trimestrale_e_dichiara_fonti(monkeypatch):
    async def fake_calendar(answers, outline=None):
        return {"months": [{"mese": 1}, {"mese": 2}, {"mese": 3}], "source": "deterministic"}

    monkeypatch.setattr("services.start_final_deliverables.build_quarterly_calendar", fake_calendar)
    out = await build_start_content_plan({"answers": {"nicchia": "fisioterapia"}})
    assert len(out["calendar"]["months"]) == 3
    assert out["period_days"] == 90
    assert out["evidence"]["answers_present"] is True
    assert out["status"] == "ready_for_review"
    assert out["type"] == "content_plan_90d"


def test_readiness_resta_bloccata_se_manca_anche_un_deliverable_reale():
    out = build_partnership_readiness({
        "brand_kit": {"approved_at": "2026-08-01"},
        "positioning": {"approved_at": "2026-08-02"},
        "social_profiles": {"approved_at": "2026-08-03"},
        "showcase": {"live_url": "https://example.it"},
        "content_plan": None,
    })
    assert out["ready"] is False
    assert "content_plan_90d" in out["missing"]
    assert out["recommendation"] == "completa_start"


def test_readiness_con_evidenze_complete_prepara_upgrade_senza_promettere_risultati():
    out = build_partnership_readiness({
        "brand_kit": {"approved_at": "2026-08-01"},
        "positioning": {"approved_at": "2026-08-02"},
        "social_profiles": {"approved_at": "2026-08-03"},
        "showcase": {"live_url": "https://example.it", "approved_at": "2026-08-04"},
        "content_plan": {"approved_at": "2026-08-04"},
    })
    assert out["ready"] is True
    assert out["missing"] == []
    assert out["recommendation"] == "valuta_partnership"
    assert out["type"] == "partnership_readiness"
    assert "fatturato" not in str(out).lower()


def test_vetrina_live_ma_non_approvata_non_sblocca_readiness():
    out = build_partnership_readiness({
        "brand_kit": {"approved_at": "2026-08-01"},
        "positioning": {"approved_at": "2026-08-02"},
        "social_profiles": {"approved_at": "2026-08-03"},
        "showcase": {"live_url": "https://example.it"},
        "content_plan": {"approved_at": "2026-08-04"},
    })
    assert out["ready"] is False
    assert "showcase" in out["missing"]
