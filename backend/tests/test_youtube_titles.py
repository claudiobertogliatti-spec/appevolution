"""Test del costruttore titoli YouTube (services/youtube_titles.py).

Gira dove gira il codice: nessuna rete, nessun DB, solo dati in memoria.
La controprova e' esplicita: un titolo atteso sbagliato deve far fallire.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

pytestmark = pytest.mark.unit

from services.youtube_titles import (  # noqa: E402
    build_title_plan,
    lesson_title,
    masterclass_title,
    partner_label,
    playlist_removal_plan,
    youtube_id_from_url,
)

PARTNER = {"id": "23", "name": "Daniele Andolfi"}


def test_cognome_e_ultima_parola():
    assert partner_label(PARTNER) == "Andolfi"
    assert partner_label({"nome": "Cosimo Filieri"}) == "Filieri"
    assert partner_label({}) == "Partner"


def test_id_da_url():
    assert youtube_id_from_url("https://www.youtube.com/watch?v=abc123&t=5") == "abc123"
    assert youtube_id_from_url("https://youtu.be/xYz_9?si=1") == "xYz_9"
    assert youtube_id_from_url("https://www.youtube.com/embed/EMBED1") == "EMBED1"
    assert youtube_id_from_url(None) is None


def test_titolo_lezione_convenzione():
    t = lesson_title("Andolfi", "m1_l1", {"title": "Il pilota automatico"})
    assert t == "Andolfi · M01·L01 — Il pilota automatico"
    # Zero-padding a due cifre su modulo e lezione.
    t2 = lesson_title("Andolfi", "m12_l3", {"title": "Ascoltare il corpo"})
    assert t2 == "Andolfi · M12·L03 — Ascoltare il corpo"


def test_titolo_lezione_senza_titolo_resta_pulito():
    assert lesson_title("Andolfi", "m2_l1", {}) == "Andolfi · M02·L01"


def test_lesson_id_non_standard_non_si_inventa():
    # Se non riconosco modulo/lezione, NON produco un titolo a caso: ritorno None.
    assert lesson_title("Andolfi", "intro", {"title": "Benvenuto"}) is None


def test_titolo_masterclass():
    assert masterclass_title("Andolfi", {"title": "Mindfulness per il burnout"}) == (
        "Andolfi · MASTERCLASS — Mindfulness per il burnout"
    )
    assert masterclass_title("Andolfi", {}) == "Andolfi · MASTERCLASS"


def test_piano_completo_ordinato_e_solo_finali():
    videocorso = {
        "lessons": {
            # Fuori ordine di proposito: il piano deve riordinare per modulo/lezione.
            "m2_l1": {"title": "Lo stress nel corpo", "video_youtube_id": "V_m2l1"},
            "m1_l1": {"title": "Il pilota automatico", "video_youtube_id": "V_m1l1"},
            # Senza video finale: non deve comparire (niente da rinominare).
            "m1_l2": {"title": "Non ancora montata"},
            # id via URL invece che id secco.
            "m1_l3": {"title": "Terza", "video_youtube_url": "https://youtu.be/V_m1l3"},
        }
    }
    masterclass = {"title": "Mindfulness", "video_youtube_id": "V_mc"}
    plan = build_title_plan(PARTNER, videocorso, masterclass)

    # Masterclass prima, poi lezioni ordinate m1_l1, m1_l3, m2_l1.
    assert [p["video_id"] for p in plan] == ["V_mc", "V_m1l1", "V_m1l3", "V_m2l1"]
    assert plan[0]["target_title"] == "Andolfi · MASTERCLASS — Mindfulness"
    assert plan[1]["target_title"] == "Andolfi · M01·L01 — Il pilota automatico"
    assert plan[2]["target_title"] == "Andolfi · M01·L03 — Terza"
    assert plan[3]["target_title"] == "Andolfi · M02·L01 — Lo stress nel corpo"
    # La lezione senza finale non c'e'.
    assert all(p["lesson_id"] != "m1_l2" for p in plan)


def test_playlist_removal_tiene_i_finali_toglie_il_resto():
    keep = ["FIN1", "FIN2", "MC"]  # 2 lezioni + masterclass finale
    items = [
        {"video_id": "FIN1", "playlist_item_id": "pi1", "title": "M01·L01"},
        {"video_id": "OLD1", "playlist_item_id": "pi2", "title": "render vecchio"},
        {"video_id": "MC", "playlist_item_id": "pi3", "title": "Masterclass definitiva"},
        {"video_id": "OLDMC", "playlist_item_id": "pi4", "title": "Masterclass 04/2026"},
        {"video_id": "FIN2", "playlist_item_id": "pi5", "title": "M01·L02"},
        # stesso finale duplicato nella playlist: si tiene (video in keep)
        {"video_id": "FIN1", "playlist_item_id": "pi6", "title": "dup"},
        # voce malformata (senza item id): ignorata
        {"video_id": "X", "title": "senza item id"},
    ]
    rem = playlist_removal_plan(keep, items)
    assert {r["playlist_item_id"] for r in rem} == {"pi2", "pi4"}
    assert all(r["video_id"] not in keep for r in rem)


if __name__ == "__main__":
    # Esecuzione diretta senza pytest: stampa il piano d'esempio e verifica.
    demo_vc = {
        "lessons": {
            "m1_l1": {"title": "Il pilota automatico", "video_youtube_id": "aaa"},
            "m1_l2": {"title": "Lo stress che si accumula", "video_youtube_id": "bbb"},
            "m4_l1": {"title": "Perché il respiro cambia tutto", "video_youtube_id": "ccc"},
            "m12_l1": {"title": "Conclusione del percorso", "video_youtube_id": "ddd"},
        }
    }
    demo_mc = {"title": "Come la mindfulness mi ha fatto lasciare il posto fisso", "video_youtube_id": "mc0"}
    for p in build_title_plan(PARTNER, demo_vc, demo_mc):
        print(f"  {p['video_id']:>6}  ->  {p['target_title']}")
    print("OK demo")
