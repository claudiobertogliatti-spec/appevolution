"""Pagine del funnel owned: masterclass, grazie, e nessuna prova sociale inventata."""
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import funnel_factory
from funnel_templates_pro import render_masterclass, render_grazie, render_optin

pytestmark = pytest.mark.unit


def test_masterclass_embeds_the_real_video_and_links_to_the_offer():
    html = render_masterclass({"PARTNER_NOME": "Dani", "VIDEO_ID": "abc123XYZ_-"}, "#112233")
    assert "youtube-nocookie.com/embed/abc123XYZ_-" in html and 'href="/offerta.html"' in html
    assert "DA DEFINIRE" not in html and "#112233" in html and "{" not in html.split("<style>")[0]


def test_masterclass_without_video_shows_todo_never_a_made_up_one():
    html = render_masterclass({"PARTNER_NOME": "Dani", "VIDEO_ID": ""})
    assert "DA DEFINIRE" in html and "<iframe" not in html


def test_masterclass_rejects_unsafe_video_id():
    html = render_masterclass({"VIDEO_ID": '"><script>alert(1)</script>'})
    assert "<script>" not in html and "DA DEFINIRE" in html


def test_grazie_uses_real_contact_and_escapes():
    html = render_grazie({"PARTNER_NOME": "<b>x</b>", "CONTATTO_EMAIL": "a@b.it"})
    assert 'mailto:a@b.it' in html and "<b>x</b>" not in html
    assert "DA DEFINIRE" in render_grazie({"PARTNER_NOME": "Dani"})


def test_optin_has_no_invented_social_proof():
    html = render_optin({"PARTNER_NOME": "Dani"})
    assert "+200" not in html and 'class="proof"' not in html and "avatars" not in html.split("</style>")[1]
    assert 'class="proof"' in render_optin({"PROOF_STRONG": "12 clienti", "PROOF_TESTO": "seguiti"})


def test_factory_produces_every_review_page():
    files = funnel_factory.build_funnel_files(sales={"PARTNER_NOME": "Dani"})
    for name in ("index.html", "guarda.html", "grazie.html", "vendita.html", "privacy.html", "cookie.html", "termini.html"):
        assert name in files and files[name].strip()
