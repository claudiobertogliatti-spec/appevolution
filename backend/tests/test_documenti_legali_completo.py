"""
Un documento legale è "generato" solo se ha l'identità del titolare (GDPR).

Audit affidabilità #5 (16/9): `genera-auto` marcava `stato="generato"` + `success`
anche con titolare/indirizzo/P.IVA vuoti → privacy/cookie pubblicabili ma
formalmente vuoti, considerati "pronti". Ora se mancano i campi critici lo stato
resta "incompleto" (la bozza si genera comunque). Qui si blocca la regola.
"""
import os
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://docs-legali-test.invalid:27017")
os.environ.setdefault("DB_NAME", "ciak_ci")
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-32-characters-long!!")
os.environ.setdefault("APP_ENV", "test")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routers.funnel_builder import documenti_legali_completo as completo  # noqa: E402

_BASE = {
    "titolare_nome": "Mario",
    "indirizzo": "Via Roma 1",
    "piva": "12345678901",
    "codice_fiscale": "",
}


def test_dati_completi_sono_generabili():
    ok, critici = completo(_BASE)
    assert ok is True and critici == []


def test_codice_fiscale_basta_senza_piva():
    ok, critici = completo({**_BASE, "piva": "", "codice_fiscale": "RSSMRA80A01H501U"})
    assert ok is True and critici == []


def test_senza_identificativo_fiscale_e_incompleto():
    ok, critici = completo({**_BASE, "piva": "", "codice_fiscale": ""})
    assert ok is False and "piva/codice_fiscale" in critici


def test_senza_titolare_o_indirizzo_e_incompleto():
    ok, critici = completo({**_BASE, "titolare_nome": "", "indirizzo": "  "})
    assert ok is False
    assert "titolare_nome" in critici and "indirizzo" in critici


def test_campi_assenti_del_tutto_sono_incompleti():
    ok, critici = completo({})
    assert ok is False
    assert set(critici) == {"titolare_nome", "indirizzo", "piva/codice_fiscale"}
