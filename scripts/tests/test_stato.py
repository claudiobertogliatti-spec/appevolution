"""Test dei file di stato di Luca. Girano tutti su una cartella temporanea."""
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import stato


class BaseStato(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        os.environ["LUCA_STATO_DIR"] = self._tmp.name

    def tearDown(self):
        os.environ.pop("LUCA_STATO_DIR", None)
        self._tmp.cleanup()


class TestNumeri(BaseStato):
    def test_prima_scrittura_crea_il_file_con_intestazione(self):
        stato.scrivi_numeri({"data": "2026-08-15", "lead_oggi": 3})
        righe = stato.leggi_numeri()
        self.assertEqual(len(righe), 1)
        self.assertEqual(righe[0]["lead_oggi"], "3")
        self.assertEqual(set(righe[0]), set(stato.COLONNE))

    def test_fonte_caduta_lascia_la_cella_vuota_non_zero(self):
        stato.scrivi_numeri({"data": "2026-08-15", "lead_oggi": 3, "meta_lead_giorno": None})
        riga = stato.leggi_numeri()[0]
        self.assertEqual(riga["meta_lead_giorno"], "")
        self.assertNotEqual(riga["meta_lead_giorno"], "0")

    def test_due_run_nello_stesso_giorno_non_duplicano_la_riga(self):
        stato.scrivi_numeri({"data": "2026-08-15", "lead_oggi": 3})
        stato.scrivi_numeri({"data": "2026-08-15", "lead_oggi": 7})
        righe = stato.leggi_numeri()
        self.assertEqual(len(righe), 1)
        self.assertEqual(righe[0]["lead_oggi"], "7")

    def test_senza_storico_dichiara_prima_misurazione(self):
        esito = stato.confronta({"data": "2026-08-15", "lead_oggi": 3})
        self.assertTrue(esito["prima_misurazione"])

    def test_con_storico_calcola_il_delta(self):
        stato.scrivi_numeri({"data": "2026-08-14", "lead_oggi": 2})
        esito = stato.confronta({"data": "2026-08-15", "lead_oggi": 5})
        self.assertNotIn("prima_misurazione", esito)
        self.assertEqual(esito["lead_oggi"]["delta"], 3)

    def test_cella_vuota_ieri_non_produce_un_delta_inventato(self):
        stato.scrivi_numeri({"data": "2026-08-14", "lead_oggi": None})
        esito = stato.confronta({"data": "2026-08-15", "lead_oggi": 5})
        self.assertIsNone(esito["lead_oggi"]["delta"])

    def test_valore_non_numerico_non_produce_delta(self):
        stato.scrivi_numeri({"data": "2026-08-14", "meta_campagna_obiettivo": "OUTCOME_TRAFFIC"})
        esito = stato.confronta({"data": "2026-08-15", "meta_campagna_obiettivo": "OUTCOME_LEADS"})
        self.assertIsNone(esito["meta_campagna_obiettivo"]["delta"])
        self.assertEqual(esito["meta_campagna_obiettivo"]["ieri"], "OUTCOME_TRAFFIC")


if __name__ == "__main__":
    unittest.main()
