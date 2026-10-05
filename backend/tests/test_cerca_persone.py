"""
Unit test: /api/admin/ciak/cerca - ricerca unica per persona (lead, cliente Start, partner).

Perche' (5/10/2026): per trovare "Rossi" bisognava sapere in quale delle ~17 pagine
cercare. Qui una sola ricerca, una riga per email, ruolo dalla stessa funzione della
scheda lead (`ruolo_contatto`).

Il punto delicato e' l'account commerciale (Mariangela): puo' leggere solo i lead
inbound, quindi la ricerca per lei NON deve rivelare clienti ne' partner, nemmeno
come etichetta. Mongo finto, nessuna rete: gira in CI.
"""
import asyncio
from types import SimpleNamespace

import pytest

import routers.ciak_admin as ca
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

CLAUDIO = SimpleNamespace(admin_type="claudio", user_id="u-claudio", role="admin")
MARIANGELA = SimpleNamespace(admin_type="mariangela", user_id="u-mariangela", role="admin")


def _db(**extra):
    base = dict(ciak_leads=[], diagnostic_sessions=[], ciak_clients=[], partners=[], users=[])
    base.update(extra)
    return FakeDb(**base)


def _cerca(q, admin=CLAUDIO, **cols):
    ca.db = _db(**cols)
    return asyncio.run(ca.ciak_cerca_persone(q=q, admin=admin))


def _by_email(res):
    return {i["email"]: i for i in res["items"]}


def test_trova_per_nome_parziale_senza_badare_alle_maiuscole():
    res = _cerca("rossi", ciak_leads=[{"email": "a@x.it", "nome": "Giulia ROSSI"}])
    assert [i["nome"] for i in res["items"]] == ["Giulia ROSSI"]


def test_trova_per_email_e_la_normalizza_in_minuscolo():
    res = _cerca("MARIO@", diagnostic_sessions=[
        {"user_email": "Mario@Ciak.IT", "user_name": "Mario", "current_state": "call_booked"},
    ])
    assert list(_by_email(res)) == ["mario@ciak.it"]
    assert _by_email(res)["mario@ciak.it"]["stato"] == "call_booked"


def test_una_sola_riga_per_persona_anche_se_sta_in_piu_collezioni():
    res = _cerca(
        "luca",
        ciak_leads=[{"email": "luca@x.it", "nome": "Luca Verdi"}],
        diagnostic_sessions=[{"user_email": "LUCA@x.it", "user_name": "Luca Verdi", "current_state": "call_done"}],
    )
    assert len(res["items"]) == 1
    assert res["items"][0]["ha_scheda"] is True


def test_ruolo_cliente_start_e_partner_dalla_stessa_regola_della_scheda():
    res = _cerca(
        "an",
        ciak_leads=[
            {"email": "ana@x.it", "nome": "Ana Lead"},
            {"email": "anto@x.it", "nome": "Anto Start"},
            {"email": "anna@x.it", "nome": "Anna Partner"},
        ],
        ciak_clients=[{"email": "anto@x.it", "name": "Anto Start", "start_purchased_at": "2026-09-30T10:00:00Z"}],
        partners=[{"id": "p1", "email": "anna@x.it", "name": "Anna Partner", "phase": "F2"}],
    )
    by = _by_email(res)
    assert by["ana@x.it"]["tipo"] == "lead"
    assert by["anto@x.it"]["tipo"] == "cliente_start"
    assert by["anna@x.it"]["tipo"] == "partner"
    assert by["anna@x.it"]["partner_id"] == "p1"


def test_chi_e_lead_ma_ha_un_account_con_nome_diverso_viene_completato_per_email():
    # La ricerca "bianchi" trova solo il lead; il cliente Start e' registrato con un
    # altro nome: il ruolo deve comunque essere "cliente Start", non "lead".
    res = _cerca(
        "bianchi",
        ciak_leads=[{"email": "p@x.it", "nome": "Paola Bianchi"}],
        ciak_clients=[{"email": "P@x.it", "name": "P. B.", "start_purchased_at": "2026-09-30T10:00:00Z"}],
    )
    assert res["items"][0]["tipo"] == "cliente_start"


def test_un_blueprint_gratuito_resta_lead():
    res = _cerca("sara", ciak_leads=[{"email": "s@x.it", "nome": "Sara"}],
                 ciak_clients=[{"email": "s@x.it", "name": "Sara", "access_level": "cliente_blueprint"}])
    assert res["items"][0]["tipo"] == "lead"


# ── Account commerciale: solo lead, mai clienti/partner ─────────────────────

def test_mariangela_non_vede_ne_clienti_ne_partner():
    res = _cerca(
        "an", admin=MARIANGELA,
        ciak_leads=[{"email": "ana@x.it", "nome": "Ana Lead"}],
        ciak_clients=[{"email": "anto@x.it", "name": "Anto Start", "start_purchased_at": "2026-09-30T10:00:00Z"}],
        partners=[{"id": "p1", "email": "anna@x.it", "name": "Anna Partner"}],
    )
    assert [i["email"] for i in res["items"]] == ["ana@x.it"]


def test_mariangela_non_scopre_che_un_suo_lead_e_diventato_cliente_o_partner():
    # Il lead e' nella sua lista, ma e' anche cliente Start: per lei resta "Lead".
    res = _cerca(
        "paola", admin=MARIANGELA,
        ciak_leads=[{"email": "p@x.it", "nome": "Paola"}],
        ciak_clients=[{"email": "p@x.it", "name": "Paola", "start_purchased_at": "2026-09-30T10:00:00Z"}],
        partners=[{"id": "p9", "email": "p@x.it", "name": "Paola"}],
    )
    item = res["items"][0]
    assert (item["tipo"], item["label"]) == ("lead", "Lead")
    assert item["partner_id"] is None


def test_il_percorso_e_nell_elenco_dell_account_commerciale_ma_solo_quello_esatto():
    assert ca._path_allowed_for_commercial("/api/admin/ciak/cerca") is True
    assert ca._path_allowed_for_commercial("/api/admin/ciak/cerca/altro") is False
    assert ca._path_allowed_for_commercial("/api/admin/ciak/cerca\n") is False


# ── Robustezza ───────────────────────────────────────────────────────────────

def test_sotto_i_due_caratteri_non_cerca_niente():
    assert _cerca("a", ciak_leads=[{"email": "a@x.it", "nome": "Anna"}])["items"] == []
    assert _cerca("  ", ciak_leads=[{"email": "a@x.it", "nome": "Anna"}])["items"] == []


def test_i_caratteri_speciali_non_diventano_un_filtro_che_prende_tutto():
    res = _cerca(".*", ciak_leads=[{"email": "a@x.it", "nome": "Anna"}, {"email": "b@x.it", "nome": "Bruno"}])
    assert res["items"] == []


def test_prima_chi_inizia_con_il_testo_cercato():
    res = _cerca("mar", ciak_leads=[
        {"email": "1@x.it", "nome": "Giorgio Marchi"},
        {"email": "2@x.it", "nome": "Marta Neri"},
    ])
    assert [i["nome"] for i in res["items"]] == ["Marta Neri", "Giorgio Marchi"]


def test_risposta_con_tetto_e_senza_dati_sensibili():
    leads = [{"email": f"u{i}@x.it", "nome": f"Persona {i:02d}"} for i in range(30)]
    clienti = [{"email": "u1@x.it", "name": "Persona 01", "password_hash": "SEGRETO", "stripe_customer_id": "cus_x"}]
    res = _cerca("persona", ciak_leads=leads, ciak_clients=clienti)
    assert len(res["items"]) <= ca._CERCA_MAX
    assert "SEGRETO" not in str(res) and "cus_x" not in str(res)
    assert set(res["items"][0]) == {"email", "nome", "tipo", "label", "stato", "ha_scheda", "partner_id"}
