"""Documenti legali del funnel: venditore Evolution, rimborso 14 giorni, mai segnaposto."""
import re

import pytest

import services.legal_documents as ld

pytestmark = pytest.mark.unit


def _docs(**kw):
    args = dict(partner_name="Daniele Andolfi", course_title="Metodo Sabai", updated="02/10/2026")
    args.update(kw)
    return ld.render_documents(**args)


def test_three_documents_with_the_seller_the_author_and_the_course():
    docs = _docs()
    assert list(docs) == ["privacy", "cookie", "termini"]
    termini = docs["termini"]["html"]
    assert "Evolution Pro LLC" in termini and "8 The Green, Suite A, Dover" in termini
    assert "Daniele Andolfi" in termini and "Metodo Sabai" in termini
    assert "Rimborso entro 14 giorni" in termini
    assert "Evolution Pro LLC" in docs["privacy"]["html"] and "Systeme" in docs["privacy"]["html"]


def test_no_placeholders_no_empty_values_no_braces_left():
    for doc in _docs().values():
        html = doc["html"]
        assert not re.search(r"\{[a-z_]+\}|\[\s*\]|\bTODO\b|XXX|___", html), doc["title"]
        assert "None" not in html and "mailto:\"" not in html


def test_missing_data_raises_instead_of_printing_blanks():
    with pytest.raises(ld.LegalDataError):
        _docs(course_title="  ")
    with pytest.raises(ld.LegalDataError):
        _docs(partner_name="")
    with pytest.raises(ld.LegalDataError):
        _docs(seller={"email": ""})


def test_refund_cannot_be_shorter_than_the_legal_minimum_and_can_be_longer():
    with pytest.raises(ld.LegalDataError):
        _docs(refund_days=7)
    assert "Rimborso entro 30 giorni" in _docs(refund_days=30)["termini"]["html"]


def test_values_are_escaped():
    html = _docs(course_title='<script>alert(1)</script>')["privacy"]["html"]
    assert "<script>" not in html and "&lt;script&gt;" in html


def test_cookie_policy_only_claims_what_the_funnel_does():
    cookie = _docs()["cookie"]["html"]
    assert "non usano cookie di profilazione" in cookie and "solo quando premi" in cookie
    for invented in ("Google Analytics", "Facebook Pixel", "Meta Pixel", "Hotjar"):
        assert invented not in cookie


def test_terms_do_not_state_vat_treatment_or_the_dead_odr_platform():
    termini = _docs()["termini"]["html"]
    assert "IVA" not in termini and "ec.europa.eu/consumers/odr" not in termini
