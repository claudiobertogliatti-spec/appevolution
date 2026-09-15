"""Robustezza di youtube_uploader sul loop lungo di rinomina.

Il bug reale (15/9): rinominando 32 lezioni la connessione httplib2 riusata cade
(BrokenPipe / SSL EOF) e avvelena il service in cache -> ogni chiamata successiva
fallisce e l'intero batch va in 500. Qui si verifica che:
  - _execute_with_retry ricostruisce il service e riprova sugli errori di rete;
  - dopo i tentativi, rilancia (non maschera un guasto persistente);
  - rename_video NON solleva mai: ritorna un dict, così un video rotto non ferma
    il batch (e la ri-esecuzione idempotente completa i rimanenti).
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

pytestmark = pytest.mark.unit

from youtube_uploader import YouTubeUploader  # noqa: E402


def _uploader_with_service(svc):
    u = YouTubeUploader()
    u._get_service = lambda: svc
    u._fresh_service = lambda: svc  # stesso fake: il contatore persiste tra i retry
    return u


def test_retry_recupera_da_broken_pipe():
    calls = {"n": 0}

    class Req:
        def execute(self):
            calls["n"] += 1
            if calls["n"] == 1:
                raise BrokenPipeError(32, "broken pipe")
            return {"ok": True}

    class Svc:
        def videos(self):
            class V:
                def list(self, **kw):
                    return Req()
            return V()

    u = _uploader_with_service(Svc())
    res = u._execute_with_retry(lambda s: s.videos().list(part="snippet", id="x"))
    assert res == {"ok": True}
    assert calls["n"] == 2  # primo tentativo fallito, secondo ok


def test_retry_si_arrende_e_solleva():
    class Req:
        def execute(self):
            raise BrokenPipeError(32, "broken pipe")

    class Svc:
        def videos(self):
            class V:
                def list(self, **kw):
                    return Req()
            return V()

    u = _uploader_with_service(Svc())
    with pytest.raises(BrokenPipeError):
        u._execute_with_retry(lambda s: s.videos().list(), attempts=2)


def test_rename_video_manda_snippet_pulito():
    """L'update deve togliere i campi read-only (che danno 400
    invalidVideoMetadata) e preservare title/categoryId/description/tags."""
    captured = {}

    class Svc:
        def videos(self):
            class V:
                def list(self, **kw):
                    class R:
                        def execute(self):
                            return {"items": [{"snippet": {
                                "title": "vecchio",
                                "categoryId": "22",
                                "description": "desc importante",
                                "tags": ["a", "b"],
                                "thumbnails": {"x": 1},
                                "publishedAt": "2026-01-01",
                                "localized": {"title": "x"},
                                "channelId": "ch1",
                                "liveBroadcastContent": "none",
                            }}]}
                    return R()

                def update(self, **kw):
                    captured.update(kw.get("body", {}))

                    class R:
                        def execute(self):
                            return {}
                    return R()
            return V()

    u = _uploader_with_service(Svc())
    res = u.rename_video("vid", "Andolfi · M01·L01 — Nuovo")
    assert res["success"] is True
    snip = captured["snippet"]
    assert snip["title"] == "Andolfi · M01·L01 — Nuovo"
    assert snip["categoryId"] == "22"          # preservato
    assert snip["description"] == "desc importante"  # preservato
    assert snip["tags"] == ["a", "b"]          # preservato
    for ro in ("thumbnails", "publishedAt", "localized", "channelId",
               "liveBroadcastContent"):
        assert ro not in snip                  # read-only rimossi


def test_rename_video_non_solleva_su_errore_di_rete():
    class Req:
        def execute(self):
            raise BrokenPipeError(32, "broken pipe")

    class Svc:
        def videos(self):
            class V:
                def list(self, **kw):
                    return Req()

                def update(self, **kw):
                    return Req()
            return V()

    u = _uploader_with_service(Svc())
    res = u.rename_video("vid123", "Andolfi · M01·L01 — Titolo")
    assert res["success"] is False
    assert "connessione" in res["error"].lower()
