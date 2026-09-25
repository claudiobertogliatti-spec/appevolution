"""Il mittente delle email Ciak deve seguire SMTP_FROM quando CIAK_EMAIL_FROM manca.

Dopo il passaggio a Brevo (17/9/2026) in produzione e' impostato solo SMTP_FROM
(`info@evolution-pro.it`). Se un sender ripiega su `<SMTP_USER>` l'header From diventa
l'utente tecnico Brevo (`...@smtp-brevo.com`), dominio non verificato: il relay puo'
rifiutare la mail e il chiamante (che non solleva) risponde comunque 200. Caso reale:
"Rimandami l'accesso" per Linda Pavia non e' mai arrivato.
"""
import smtplib

import pytest

from services import ciak_bonus_reminder, ciak_client_reengagement, ciak_start_delivery

pytestmark = pytest.mark.unit

TECH_USER = "9948b1001@smtp-brevo.com"
VERIFIED_FROM = "info@evolution-pro.it"


class _FakeSMTP:
    sent: list = []

    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self):
        pass

    def login(self, user, password):
        pass

    def send_message(self, message):
        _FakeSMTP.sent.append(message)


@pytest.fixture(autouse=True)
def _smtp(monkeypatch):
    _FakeSMTP.sent = []
    monkeypatch.setattr(smtplib, "SMTP", _FakeSMTP)
    monkeypatch.setenv("SMTP_USER", TECH_USER)
    monkeypatch.setenv("SMTP_PASSWORD", "x")
    monkeypatch.delenv("CIAK_EMAIL_FROM", raising=False)
    monkeypatch.delenv("SMTP_FROM", raising=False)


def _send_reengagement():
    return ciak_client_reengagement._send(
        "linda@example.com", "Linda Pavia", "Il tuo accesso", "Ciao {primo}", "https://ciak.io/x"
    )


def _send_start_delivery():
    ok, _err = ciak_start_delivery._send_email(
        "linda@example.com", "Linda", "https://ciak.io/x", "2026-09-25T10:00:00+00:00"
    )
    return ok


def _send_bonus_reminder():
    return ciak_bonus_reminder._send_reminder("linda@example.com", "Linda", 12, "https://ciak.io/x")


SENDERS = [_send_reengagement, _send_start_delivery, _send_bonus_reminder]


@pytest.mark.parametrize("send", SENDERS)
def test_usa_smtp_from_se_ciak_email_from_manca(monkeypatch, send):
    monkeypatch.setenv("SMTP_FROM", VERIFIED_FROM)
    assert send() is True
    assert _FakeSMTP.sent[0]["From"] == VERIFIED_FROM


@pytest.mark.parametrize("send", SENDERS)
def test_ciak_email_from_ha_la_precedenza(monkeypatch, send):
    monkeypatch.setenv("SMTP_FROM", VERIFIED_FROM)
    monkeypatch.setenv("CIAK_EMAIL_FROM", "Claudio <claudio@evolution-pro.it>")
    assert send() is True
    assert _FakeSMTP.sent[0]["From"] == "Claudio <claudio@evolution-pro.it>"


@pytest.mark.parametrize("send", SENDERS)
def test_senza_nessuna_variabile_ripiega_sull_utente_smtp(send):
    assert send() is True
    assert TECH_USER in _FakeSMTP.sent[0]["From"]
