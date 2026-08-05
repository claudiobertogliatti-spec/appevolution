"""Test per services/ciak_edit_project.py — helper puri, nessun I/O.

⚠️ Questi test IMPORTANO il modulo ed eseguono le funzioni vere (non riscrivono la
logica): un test che non importa il codice che testa non è un test.
"""
import sys
import pathlib

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from services import ciak_edit_project as ep  # noqa: E402

# ⚠️ Senza questo marker `tests/conftest.py` li salta tutti: gira solo cio' che e' 'unit'.
pytestmark = pytest.mark.unit


# Documento "vecchio stile": è la forma che la pipeline scrive oggi in produzione.
LEGACY_LESSON = {
    "pipeline_status": "ready_for_review",
    "video_raw_url": "gs://bucket/raw_videos/p1/videocorso/l1/abc.mp4",
    "video_raw_duration_s": 450,
    "review_transcript": "Ciao e benvenuti ehm parliamo di vendita",
    "review_words": [
        {"text": "Ciao", "start": 0.2, "end": 0.5},
        {"text": "ehm", "start": 1.2, "end": 1.6},
    ],
    "review_cut_segments": [
        {"id": 0, "start": 1.2, "end": 1.6, "type": "filler", "reason": "intercalare",
         "word": "ehm", "enabled": True},
        {"id": 1, "start": 9.0, "end": 9.4, "type": "smart", "reason": "ripetizione",
         "word": "", "enabled": False},
    ],
    "review_filler_report": {"count": 1, "segments": [], "time_saved_s": 0.4},
    "output_version": 3,
    "output_gcs_url": "https://storage.googleapis.com/bucket/edited/v3.mp4",
    "video_ciak_url": "https://www.ciak.io/api/lesson-video/p1/l1",
    "video_final_duration_s": 449,
    "pipeline_completed_at": "2026-08-05T10:00:00Z",
    "updated_at": "2026-08-05T10:00:00Z",
}


class TestStatusMapping:
    def test_stati_di_montaggio_collassano_su_montaggio(self):
        for s in ("downloading", "cutting_fillers", "uploading_gcs", "uploading_youtube"):
            assert ep.map_pipeline_status(s) == "montaggio", s

    def test_qualsiasi_errore_diventa_error(self):
        for s in ("error", "error_gcs", "error_youtube", "ERROR_QUALCOSA"):
            assert ep.map_pipeline_status(s) == "error", s

    def test_ready_for_review_e_pronto(self):
        assert ep.map_pipeline_status("ready_for_review") == "pronto"

    def test_stato_ignoto_o_vuoto_non_esplode(self):
        assert ep.map_pipeline_status(None) == "da_revisionare"
        assert ep.map_pipeline_status("boh") == "da_revisionare"

    def test_lo_stato_prodotto_e_sempre_ammesso(self):
        for s in ("downloading", "error_gcs", "ready_for_review", None, "boh", "published"):
            assert ep.map_pipeline_status(s) in ep.REVIEW_STATUS


class TestRetrocompatibilita:
    """Il punto critico: i documenti già in produzione non hanno edit_project."""

    def test_ricostruisce_dai_campi_legacy(self):
        proj = ep.read_edit_project(LEGACY_LESSON)
        src = proj["sources"][0]
        assert src["gcs_path"] == LEGACY_LESSON["video_raw_url"]
        assert src["transcript"] == LEGACY_LESSON["review_transcript"]
        assert len(src["words"]) == 2
        assert len(src["cut_segments"]) == 2
        assert proj["review_status"] == "pronto"
        assert proj["output"]["ciak_url"] == LEGACY_LESSON["video_ciak_url"]

    def test_documento_vuoto_non_esplode(self):
        proj = ep.read_edit_project({})
        assert proj["sources"] == []
        assert proj["review_status"] == "da_revisionare"
        assert ep.primary_source({})["cut_segments"] == []

    def test_edit_project_esistente_vince_sul_legacy(self):
        doc = dict(LEGACY_LESSON)
        doc["edit_project"] = ep.build_edit_project(
            sources=[ep.build_source(source_id="src_99", transcript="nuovo")],
            review_status="montaggio",
        )
        proj = ep.read_edit_project(doc)
        assert proj["sources"][0]["source_id"] == "src_99"
        assert proj["review_status"] == "montaggio"

    def test_edit_project_senza_sources_ricade_sul_legacy(self):
        doc = dict(LEGACY_LESSON)
        doc["edit_project"] = {"version": 1, "sources": []}
        assert ep.read_edit_project(doc)["sources"][0]["gcs_path"] == LEGACY_LESSON["video_raw_url"]


class TestTagli:
    def test_solo_i_tagli_enabled_e_ordinati(self):
        cuts = ep.enabled_cuts(LEGACY_LESSON)
        assert len(cuts) == 1
        assert cuts[0]["word"] == "ehm"

    def test_stesso_risultato_del_filtro_usato_oggi_dalla_pipeline(self):
        atteso = [s for s in LEGACY_LESSON["review_cut_segments"] if s.get("enabled")]
        atteso.sort(key=lambda x: x.get("start", 0))
        assert ep.enabled_cuts(LEGACY_LESSON) == atteso


class TestAggiornamenti:
    def test_la_pipeline_non_cancella_output_e_intro_esistenti(self):
        doc = dict(LEGACY_LESSON)
        doc["edit_project"] = ep.build_edit_project(
            sources=[ep.build_source(gcs_path="gs://x/a.mp4")],
            intro={"enabled": True, "script": "In questa lezione...", "generated": True, "media_gcs": "gs://x/intro.mp4"},
            output={"gcs_path": "gs://x/v1.mp4", "ciak_url": "u", "duration_s": 10, "montaged_at": "t"},
        )
        out = ep.project_from_pipeline(doc=doc, transcript="nuova trascrizione",
                                       pipeline_status="cutting_fillers")
        assert out["intro"]["script"] == "In questa lezione..."
        assert out["output"]["gcs_path"] == "gs://x/v1.mp4"
        assert out["review_status"] == "montaggio"
        assert out["sources"][0]["transcript"] == "nuova trascrizione"

    def test_argomenti_none_non_sovrascrivono(self):
        out = ep.project_from_pipeline(doc=LEGACY_LESSON)
        assert out["sources"][0]["transcript"] == LEGACY_LESSON["review_transcript"]
        assert len(out["sources"][0]["cut_segments"]) == 2

    def test_il_montaggio_bumpa_la_version_e_mette_pronto(self):
        out = ep.project_after_montage(doc=LEGACY_LESSON, gcs_path="gs://x/v4.mp4",
                                       ciak_url="https://ciak/x", final_duration_s=449,
                                       montaged_at="2026-08-05T12:00:00Z")
        assert out["version"] == 4  # legacy output_version = 3
        assert out["review_status"] == "pronto"
        assert out["output"]["gcs_path"] == "gs://x/v4.mp4"

    def test_il_montaggio_conserva_le_sorgenti(self):
        out = ep.project_after_montage(doc=LEGACY_LESSON)
        assert out["sources"][0]["transcript"] == LEGACY_LESSON["review_transcript"]


class TestReteDiSicurezza:
    """safe_set_fields non deve MAI sollevare: e' cio' che rende additiva l'introduzione."""

    def test_builder_che_esplode_ritorna_dict_vuoto(self):
        def boom(**kwargs):
            raise RuntimeError("boom")
        assert ep.safe_set_fields(boom, lesson_key="lessons.l1", doc={}) == {}

    def test_argomenti_sbagliati_non_sollevano(self):
        assert ep.safe_set_fields(ep.project_after_montage, argomento_inesistente=1) == {}

    def test_percorso_buono_produce_il_campo(self):
        f = ep.safe_set_fields(ep.project_from_pipeline, lesson_key="lessons.l1",
                               doc=LEGACY_LESSON, transcript="x")
        assert list(f.keys()) == ["lessons.l1.edit_project"]
        assert f["lessons.l1.edit_project"]["sources"][0]["transcript"] == "x"


class TestScritturaMongo:
    def test_prefisso_lezione(self):
        f = ep.mongo_set_fields({"version": 1}, lesson_key="lessons.l1")
        assert list(f.keys()) == ["lessons.l1.edit_project"]

    def test_senza_prefisso_per_masterclass(self):
        assert list(ep.mongo_set_fields({"version": 1}).keys()) == ["edit_project"]

    def test_non_tocca_i_campi_legacy(self):
        """La garanzia additiva: mongo_set_fields scrive SOLO edit_project."""
        f = ep.mongo_set_fields({"version": 1}, lesson_key="lessons.l1")
        assert len(f) == 1
        assert not any("review_" in k or "video_" in k for k in f)
