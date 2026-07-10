from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def test_ottimizza_hub_explains_month_12_calendar_live_and_done_for_you_cta():
    text = read("frontend/src/ciak/partner/operativo/steps/OperativoContinuo.jsx")

    assert "fino al mese 12" in text
    assert "calendario continuativo" in text
    assert "live ogni 2 mesi" in text
    assert "lo facciamo noi" in text
    assert "/partner/servizi-extra" in text


def test_ottimizza_calendar_workspace_has_paid_content_cta():
    text = read("frontend/src/ciak/partner/operativo/ottimizza/CalendarioTrimestrale.jsx")

    assert "90 giorni" in text
    assert "mese 12" in text
    assert "contenuti gia pronti" in text
    assert "post, reel, caroselli, email" in text
    assert "/partner/servizi-extra" in text


def test_ottimizza_live_workspace_has_paid_live_cta():
    text = read("frontend/src/ciak/partner/operativo/ottimizza/CicloLive8Settimane.jsx")

    assert "8 settimane" in text
    assert "mese 12" in text
    assert "organizzazione, testi, email e follow-up" in text
    assert "Facciamo noi" in text
    assert "/partner/servizi-extra" in text
