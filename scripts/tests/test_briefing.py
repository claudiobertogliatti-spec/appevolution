"""Test dell'orchestratore. Nessun test tocca la rete."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import briefing_luca
import sensori


def _ciak_ok(base_url, key, path, nome, fetch_fn=None):
    return sensori.busta(nome, True, {"eco": path})


def _ciak_ko(base_url, key, path, nome, fetch_fn=None):
    return sensori.busta(nome, False, errore="HTTP 401 (chiave assente)")


def _sito_ok(**kwargs):
    return sensori.busta("sito", True, {"url": {}, "tutte_ok": True})


class TestRaccogli(unittest.TestCase):
    def test_output_mantiene_report_e_acq_top_level(self):
        out, errore = briefing_luca.raccogli(
            "https://x", "k", leggi_ciak_fn=_ciak_ok, leggi_sito_fn=_sito_ok
        )
        self.assertIsNone(errore)
        self.assertIn("report", out)
        self.assertIn("acq", out)

    def test_report_e_acq_contengono_il_DATO_non_la_busta(self):
        """La regressione piu' cara che questo file possa avere.

        Se in `report`/`acq` finisse la BUSTA invece del suo `dati`, il prompt che
        gira in produzione leggerebbe una struttura diversa da quella che si aspetta
        e il briefing di domani sarebbe vuoto — passando tutti gli altri test.
        Sostituendo la riga `{nome: fonti[nome]["dati"] ...}` con `{nome: fonti[nome] ...}`
        questo test FALLISCE, gli altri no.
        """
        out, _ = briefing_luca.raccogli(
            "https://x", "k", leggi_ciak_fn=_ciak_ok, leggi_sito_fn=_sito_ok
        )
        self.assertEqual(out["report"], {"eco": "/api/admin/luca/daily-report"})
        self.assertEqual(out["acq"], {"eco": "/api/admin/ciak/acquisizione-command-center"})
        for chiave in sensori.CHIAVI_BUSTA:
            self.assertNotIn(
                chiave, out["report"], "qui deve esserci il dato, non la busta che lo avvolge"
            )

    def test_output_aggiunge_le_buste_in_fonti(self):
        out, _ = briefing_luca.raccogli(
            "https://x", "k", leggi_ciak_fn=_ciak_ok, leggi_sito_fn=_sito_ok
        )
        self.assertEqual(set(out["fonti"]), {"report", "acq", "sito"})
        for b in out["fonti"].values():
            self.assertEqual(set(b), set(sensori.CHIAVI_BUSTA))

    def test_ciak_caduta_aborta_tutto(self):
        out, errore = briefing_luca.raccogli(
            "https://x", "k", leggi_ciak_fn=_ciak_ko, leggi_sito_fn=_sito_ok
        )
        self.assertIsNone(out)
        self.assertIn("401", errore)

    def test_sito_caduto_non_aborta_ma_si_dichiara(self):
        def sito_ko(**kwargs):
            return sensori.busta("sito", False, errore="timeout")

        out, errore = briefing_luca.raccogli(
            "https://x", "k", leggi_ciak_fn=_ciak_ok, leggi_sito_fn=sito_ko
        )
        self.assertIsNone(errore)
        self.assertFalse(out["fonti"]["sito"]["ok"])
        self.assertEqual(out["fonti"]["sito"]["errore"], "timeout")


if __name__ == "__main__":
    unittest.main()
