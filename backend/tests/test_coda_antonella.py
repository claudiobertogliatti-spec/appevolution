"""Coda di Antonella: stime, coda, piano giornaliero dentro il budget, validazione esiti."""
from datetime import date

import pytest

pytestmark = pytest.mark.unit

from services import coda_antonella as c


def lez(version=1, durata=600, **extra):
    return {"output_version": version, "video_final_duration_s": durata, "title": "L", "pipeline_completed_at": "2026-10-01T10:00:00", **extra}


def test_stima_minuti_usa_rapporto_e_minuti_fissi():
    assert c.stima_minuti(600) == 20           # 10 min x 1,5 = 15 + 5
    assert c.stima_minuti(0) == c.MINUTI_SENZA_DURATA
    assert c.stima_minuti(None) == c.MINUTI_SENZA_DURATA
    assert c.stima_minuti(600, rapporto=2, fissi=0) == 20


def test_config_valida_rifiuta_valori_fuori_range():
    cfg = c.config_valida({"minuti_settimana": 99999, "rapporto_visione": 99, "minuti_fissi": -1})
    assert cfg["minuti_settimana"] == c.MINUTI_SETTIMANA == 300   # fuori range: resta il default (5 ore)
    assert cfg["rapporto_visione"] == c.RAPPORTO_VISIONE
    assert cfg["minuti_fissi"] == c.MINUTI_FISSI
    assert c.config_valida({"minuti_settimana": "180"})["minuti_settimana"] == 180


def test_coda_esclude_senza_video_in_revisione_e_gia_verificate():
    docs = [{"partner_id": "p1", "lessons": {
        "a": lez(), "b": {"output_version": 0}, "c": lez(active_revision_id="r1"), "d": lez(), "e": lez(),
    }}]
    esiti = {"p1|d|1": {"esito": "verificata"}, "p1|e|1": {"esito": "da_correggere", "note": "audio", "at": "x"}}
    r = c.lezioni_da_controllare(docs, {"p1": "Giulia"}, esiti)
    assert [t["lesson_id"] for t in r["da_controllare"]] == ["a"]
    assert [t["lesson_id"] for t in r["da_correggere"]] == ["e"]


def test_nuova_versione_torna_in_coda_anche_se_la_precedente_era_da_correggere():
    docs = [{"partner_id": "p1", "lessons": {"e": lez(version=2)}}]
    esiti = {"p1|e|1": {"esito": "da_correggere", "note": "audio"}}
    r = c.lezioni_da_controllare(docs, {}, esiti)
    assert len(r["da_controllare"]) == 1 and not r["da_correggere"]


def compiti(*minuti, partner="p1"):
    return [{"chiave": f"{partner}|{i}|1", "partner_id": partner, "partner_nome": partner, "lesson_id": str(i),
             "titolo": f"T{i}", "minuti": m, "durata_s": 0} for i, m in enumerate(minuti)]


LUN = date(2026, 10, 12)


def test_piano_non_supera_mai_il_tetto_della_settimana():
    piano = c.piano_settimanale(compiti(100, 100, 100, 100, 100), {"minuti_settimana": 300}, da=LUN)
    for w in piano["settimane"]:
        assert w["usati"] <= w["budget"]
    assert [len(w["compiti"]) for w in piano["settimane"]] == [3, 2]
    assert piano["settimane"][1]["inizio"] == "2026-10-19"


def test_la_settimana_parte_sempre_dal_lunedi_anche_se_si_guarda_di_venerdi():
    piano = c.piano_settimanale(compiti(60), da=date(2026, 10, 16))
    assert piano["settimane"][0]["inizio"] == "2026-10-12" and piano["settimane"][0]["fine"] == "2026-10-18"


def test_gli_altri_compiti_gia_assegnati_riducono_la_settimana_in_corso():
    piano = c.piano_settimanale(compiti(100, 100), da=LUN, minuti_gia_assegnati=270)
    # restano 30 minuti questa settimana: nessuna lezione entra, tutte slittano alla prossima (settimane vuote non mostrate)
    assert [len(w["compiti"]) for w in piano["settimane"]] == [2]
    assert piano["settimane"][0]["inizio"] == "2026-10-19"


def test_compito_piu_lungo_del_tetto_va_negli_avvisi():
    piano = c.piano_settimanale(compiti(400, 20), {"minuti_settimana": 300}, da=LUN)
    assert [n["lesson_id"] for n in piano["non_pianificati"]] == ["0"]
    assert piano["avvisi"] and "400" in piano["avvisi"][0]
    assert piano["settimane"][0]["compiti"][0]["lesson_id"] == "1"


def test_ordine_di_arrivo_non_si_inverte():
    # il compito grande non entra dopo il primo -> va alla settimana dopo; il piccolo successivo non lo scavalca
    piano = c.piano_settimanale(compiti(200, 150, 10), {"minuti_settimana": 300}, da=LUN)
    assert [[t["lesson_id"] for t in w["compiti"]] for w in piano["settimane"]] == [["0"], ["1", "2"]]


def test_tetto_zero_non_pianifica_nulla():
    piano = c.piano_settimanale(compiti(20), {"minuti_settimana": 0}, da=LUN)
    assert piano["settimane"] == [] and len(piano["non_pianificati"]) == 1


def test_pronta_entro_e_la_fine_della_settimana_dell_ultima_lezione():
    piano = c.piano_settimanale(compiti(200, 200), {"minuti_settimana": 300}, da=LUN)
    assert c.prima_data_prevista(piano, "p1") == "2026-10-25"


def test_valida_esito():
    tutti = {k: True for k in c.CONTROLLI}
    assert c.valida_esito({"esito": "verificata", "controlli": tutti, "minuti_reali": 22})["minuti_reali"] == 22
    with pytest.raises(ValueError):
        c.valida_esito({"esito": "verificata", "controlli": {**tutti, "audio": False}, "minuti_reali": 20})
    with pytest.raises(ValueError):
        c.valida_esito({"esito": "da_correggere", "note": "no", "minuti_reali": 5})
    with pytest.raises(ValueError):
        c.valida_esito({"esito": "boh", "minuti_reali": 5})
    with pytest.raises(ValueError):
        c.valida_esito({"esito": "da_correggere", "note": "audio basso", "minuti_reali": -3})
    assert c.valida_esito({"esito": "da_correggere", "note": "audio basso", "minuti_reali": 7})["esito"] == "da_correggere"


def test_i_minuti_veri_sono_obbligatori_perche_il_lavoro_e_pagato_a_ore():
    tutti = {k: True for k in c.CONTROLLI}
    for mancante in (None, "", 0):
        with pytest.raises(ValueError):
            c.valida_esito({"esito": "verificata", "controlli": tutti, "minuti_reali": mancante})
    with pytest.raises(ValueError):
        c.valida_esito({"esito": "verificata", "controlli": tutti})


def test_id_attivita_e_stabile_e_distingue_le_versioni():
    assert c.id_attivita("p1|l1|2") == c.id_attivita("p1|l1|2")
    assert c.id_attivita("p1|l1|2") != c.id_attivita("p1|l1|3")


def test_minuti_altri_compiti_ignora_la_coda_lezioni_e_i_chiusi():
    t = [
        {"estimated_minutes": 90, "status": "open"},
        {"estimated_minutes": 60, "status": "in_progress"},
        {"estimated_minutes": 60, "status": "completed"},
        {"estimated_minutes": 30, "status": "open", "context": {"source": "coda_lezioni"}},
        {"status": "open", "context": {"estimated_minutes": 15}},
    ]
    assert c.minuti_altri_compiti(t) == 165


def test_raggruppa_per_partner_somma_minuti():
    g = c.raggruppa_per_partner(compiti(20, 30) + compiti(10, partner="p2"))
    assert [(x["partner_id"], x["minuti"], len(x["lezioni"])) for x in g] == [("p1", 50, 2), ("p2", 10, 1)]


def test_stato_per_partner_non_espone_note_e_non_inventa():
    assert c.stato_per_partner(True, {"esito": "verificata", "note": "x"}) == "online"
    assert c.stato_per_partner(True, {"esito": "da_correggere", "note": "audio basso"}) == "sistemando"
    assert c.stato_per_partner(True, None) == "in_controllo"
    assert c.stato_per_partner(False, None) is None
