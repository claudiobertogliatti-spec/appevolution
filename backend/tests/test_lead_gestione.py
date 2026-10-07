"""
Lead in gestione: chi e' in quale fase e quando esce. Funzioni pure.
Regola chiave: il Blueprint e' gratuito, quindi chi lo riceve RESTA lead; esce solo chi compra.
"""
from datetime import datetime, timezone

import pytest

from services.lead_gestione import build_lead_board

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 7, tzinfo=timezone.utc)


def _col(id_, *items):
    return {"id": id_, "items": list(items)}


def _e(email, nome="X", **kw):
    return {"email": email, "nome": nome, "updated_at": "2026-10-01T00:00:00+00:00", **kw}


def _board(prospect=None, colonne=None, compratori=()):
    return build_lead_board(prospect or {}, colonne or [], set(compratori), now=NOW)


def _fasi(b):
    return {c["id"]: [r["email"] for r in c["lead"]] for c in b["colonne"]}


def test_le_quattro_fasi_in_ordine():
    b = _board()
    assert [c["id"] for c in b["colonne"]] == ["questionario", "call_fissata", "call_fatta", "trattativa"]
    assert b["totale"] == 0


def test_questionario_completato_e_analisi_pronta_sono_questionario_ma_l_iscritto_no():
    p = {
        "a@x.it": _e("a@x.it", stage="diagnostica"),
        "b@x.it": _e("b@x.it", stage="report"),
        "c@x.it": _e("c@x.it", stage="iscritto"),  # solo iscritto: non e' in gestione
    }
    assert _fasi(_board(prospect=p))["questionario"] == ["a@x.it", "b@x.it"]


def test_call_e_trattativa_dalla_pipeline_vendite():
    cols = [_col("call_prenotata", _e("p@x.it")), _col("call_fatta", _e("f@x.it")),
            _col("in_trattativa", _e("t@x.it"))]
    f = _fasi(_board(colonne=cols))
    assert f["call_fissata"] == ["p@x.it"] and f["call_fatta"] == ["f@x.it"] and f["trattativa"] == ["t@x.it"]


def test_chi_riceve_il_blueprint_gratuito_resta_lead():
    # call fatta + Blueprint consegnato, ma nessun acquisto: e' ancora in gestione
    b = _board(colonne=[_col("call_fatta", _e("g@x.it"))], compratori=())
    assert _fasi(b)["call_fatta"] == ["g@x.it"] and b["usciti"] == 0


def test_chi_compra_start_esce_da_ogni_fase_e_si_conta():
    cols = [_col("call_fatta", _e("s@x.it")), _col("in_trattativa", _e("ok@x.it"))]
    b = _board(prospect={"q@x.it": _e("q@x.it", stage="diagnostica")}, colonne=cols, compratori={"S@x.it", "q@x.it"})
    f = _fasi(b)
    assert f["call_fatta"] == [] and f["questionario"] == [] and f["trattativa"] == ["ok@x.it"]
    assert b["usciti"] == 2 and b["totale"] == 1


def test_contratto_pagato_partnership_esce_anche_senza_acquisto_registrato_altrove():
    b = _board(colonne=[_col("in_trattativa", _e("p@x.it")), _col("contratto_pagato", _e("p@x.it"))])
    assert _fasi(b)["trattativa"] == [] and b["usciti"] == 1


def test_stessa_persona_in_due_pipeline_vale_la_fase_piu_avanzata():
    b = _board(prospect={"a@x.it": _e("a@x.it", stage="report")}, colonne=[_col("call_prenotata", _e("a@x.it"))])
    f = _fasi(b)
    assert f["call_fissata"] == ["a@x.it"] and f["questionario"] == [] and b["totale"] == 1


def test_email_in_maiuscolo_e_account_senza_email():
    b = _board(colonne=[_col("call_fatta", _e("Mix@X.it"), {"nome": "senza"})], compratori={"mix@x.it"})
    assert b["totale"] == 0 and b["usciti"] == 1


def test_ordine_prima_chi_aspetta_da_piu_giorni_senza_data_in_fondo():
    cols = [_col("call_fatta",
                 _e("nuovo@x.it", stage_since="2026-10-06T00:00:00+00:00"),
                 _e("senza@x.it", updated_at=None),
                 _e("vecchio@x.it", stage_since="2026-09-20T00:00:00+00:00"))]
    r = _board(colonne=cols)["colonne"][2]["lead"]
    assert [x["email"] for x in r] == ["vecchio@x.it", "nuovo@x.it", "senza@x.it"]
    assert r[0]["giorni"] == 17 and r[2]["giorni"] is None
