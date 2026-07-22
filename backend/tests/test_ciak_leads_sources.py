from routers.ciak_leads import ALLOWED_SOURCES


def test_masterclass_landing_is_an_allowed_lead_source():
    assert "masterclass_landing" in ALLOWED_SOURCES
