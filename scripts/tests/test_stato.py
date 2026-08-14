"""Test dei file di stato di Luca. Girano tutti su una cartella temporanea."""
import csv
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

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

    def test_una_scrittura_interrotta_non_distrugge_lo_storico(self):
        """Il CSV e' TUTTA la memoria: una scrittura fallita non deve troncarlo.

        Con la scrittura non atomica questo test FALLISCE: open(...,"w") sul file
        finale lo tronca prima ancora di scrivere, e resta la sola intestazione.
        """
        stato.scrivi_numeri({"data": "2026-08-14", "lead_oggi": 2})

        class DictWriterRotto(csv.DictWriter):
            def writerows(self, righe):
                raise OSError("disco pieno")

        with mock.patch.object(stato.csv, "DictWriter", DictWriterRotto):
            with self.assertRaises(OSError):
                stato.scrivi_numeri({"data": "2026-08-15", "lead_oggi": 9})

        righe = stato.leggi_numeri()
        self.assertEqual(len(righe), 1, "lo storico precedente deve sopravvivere")
        self.assertEqual(righe[0]["data"], "2026-08-14")
        self.assertEqual(righe[0]["lead_oggi"], "2")

    def test_confronta_con_la_sola_data_rilegge_la_riga_dal_csv(self):
        """E' la forma con cui la chiama il prompt del mattino.

        Con la vecchia versione questo test FALLISCE: tutti i delta erano None.
        """
        stato.scrivi_numeri({"data": "2026-08-14", "lead_oggi": 2})
        stato.scrivi_numeri({"data": "2026-08-15", "lead_oggi": 5})
        esito = stato.confronta({"data": "2026-08-15"})
        self.assertNotIn("prima_misurazione", esito)
        self.assertEqual(esito["lead_oggi"]["oggi"], "5")
        self.assertEqual(esito["lead_oggi"]["delta"], 3)

    def test_ieri_e_la_riga_piu_recente_non_la_piu_vecchia(self):
        """Con `precedenti[0]` al posto di `precedenti[-1]` i delta sarebbero
        plausibili e tutti sbagliati, e nessun altro test se ne accorgerebbe."""
        stato.scrivi_numeri({"data": "2026-08-12", "lead_oggi": 100})
        stato.scrivi_numeri({"data": "2026-08-13", "lead_oggi": 1})
        stato.scrivi_numeri({"data": "2026-08-14", "lead_oggi": 4})
        esito = stato.confronta({"data": "2026-08-14"})
        self.assertEqual(esito["lead_oggi"]["ieri"], "1", "deve confrontare col 13, non col 12")
        self.assertEqual(esito["lead_oggi"]["delta"], 3)

    def test_valore_non_numerico_non_produce_delta(self):
        stato.scrivi_numeri({"data": "2026-08-14", "meta_campagna_obiettivo": "OUTCOME_TRAFFIC"})
        esito = stato.confronta({"data": "2026-08-15", "meta_campagna_obiettivo": "OUTCOME_LEADS"})
        self.assertIsNone(esito["meta_campagna_obiettivo"]["delta"])
        self.assertEqual(esito["meta_campagna_obiettivo"]["ieri"], "OUTCOME_TRAFFIC")


class TestCoda(BaseStato):
    def test_coda_vuota_su_cartella_nuova(self):
        self.assertEqual(stato.leggi_coda(), [])

    def test_apri_azione_assegna_un_id_e_stato_aperta(self):
        azione = stato.apri_azione("Rimettere la campagna su Lead", "Luca", "2026-08-15")
        self.assertTrue(azione["id"])
        self.assertEqual(azione["stato"], "aperta")
        self.assertEqual(len(stato.leggi_coda()), 1)

    def test_due_responsabili_sono_rifiutati(self):
        with self.assertRaises(ValueError):
            stato.apri_azione("Cosa", "Luca, Claudio", "2026-08-15")
        with self.assertRaises(ValueError):
            stato.apri_azione("Cosa", "Luca e Claudio", "2026-08-15")

    def test_chiudi_azione_registra_esito_e_data(self):
        azione = stato.apri_azione("Cosa", "Luca", "2026-08-15")
        chiusa = stato.chiudi_azione(azione["id"], "fatto")
        self.assertEqual(chiusa["stato"], "chiusa")
        self.assertEqual(chiusa["esito"], "fatto")
        self.assertTrue(chiusa["chiusa_il"])

    def test_chiudere_un_id_inesistente_solleva(self):
        with self.assertRaises(KeyError):
            stato.chiudi_azione("non-esiste", "fatto")

    def test_una_scrittura_interrotta_non_distrugge_la_coda(self):
        """Un JSON troncato non e' leggibile a meta': si perde TUTTA la coda.

        Con la scrittura non atomica questo test FALLISCE: write_text sul file finale
        lo tronca prima ancora di scrivere.
        """
        stato.apri_azione("Prima azione", "Luca", "2026-08-15")

        def write_text_che_tronca_e_muore(self, *args, **kwargs):
            with self.open("w", encoding="utf-8"):
                pass  # come ogni scrittura reale: prima tronca, poi scrive
            raise OSError("disco pieno")

        with mock.patch.object(Path, "write_text", write_text_che_tronca_e_muore):
            with self.assertRaises(OSError):
                stato.apri_azione("Seconda azione", "Luca", "2026-08-15")

        azioni = stato.leggi_coda()
        self.assertEqual(len(azioni), 1, "la coda precedente deve sopravvivere")
        self.assertEqual(azioni[0]["cosa"], "Prima azione")

    def test_gli_id_non_si_ripetono(self):
        a = stato.apri_azione("A", "Luca", "2026-08-15")
        b = stato.apri_azione("B", "Luca", "2026-08-15")
        self.assertNotEqual(a["id"], b["id"])


class TestRegistro(BaseStato):
    def test_registro_e_append_only(self):
        stato.registra("Campagna su Lead", "60 giorni su Traffico", "obiettivo cambiato")
        stato.registra("Pubblicato carosello", "coda vuota", "post online")
        testo = stato.leggi_registro()
        self.assertIn("Campagna su Lead", testo)
        self.assertIn("Pubblicato carosello", testo)
        self.assertLess(testo.index("Campagna su Lead"), testo.index("Pubblicato carosello"))

    def test_registro_contiene_cosa_perche_risultato(self):
        stato.registra("C", "P", "R")
        testo = stato.leggi_registro()
        for pezzo in ("C", "P", "R"):
            self.assertIn(pezzo, testo)


if __name__ == "__main__":
    unittest.main()
