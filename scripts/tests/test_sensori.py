"""Test dei sensori Python del briefing di Luca. Nessun test tocca la rete."""
import json
import sys
import unittest
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sensori


class TestBusta(unittest.TestCase):
    def test_busta_ha_sempre_le_cinque_chiavi(self):
        b = sensori.busta("meta_ads", True, {"campagne": 1})
        self.assertEqual(set(b), set(sensori.CHIAVI_BUSTA))

    def test_busta_fallita_ha_dati_vuoti_e_errore_valorizzato(self):
        b = sensori.busta("meta_ads", False, errore="timeout")
        self.assertFalse(b["ok"])
        self.assertEqual(b["dati"], {})
        self.assertEqual(b["errore"], "timeout")

    def test_letto_a_e_utc_iso(self):
        b = sensori.busta("sito", True)
        self.assertTrue(b["letto_a"].endswith("+00:00"))


class TestLeggiCiak(unittest.TestCase):
    def test_successo_mette_il_json_nei_dati(self):
        b = sensori.leggi_ciak(
            "https://www.ciak.io", "chiave", "/api/x", "report",
            fetch_fn=lambda url, key: {"leads_today": 3},
        )
        self.assertTrue(b["ok"])
        self.assertEqual(b["dati"], {"leads_today": 3})
        self.assertIsNone(b["errore"])

    def test_http_401_spiega_la_chiave(self):
        def boom(url, key):
            raise urllib.error.HTTPError(url, 401, "Unauthorized", {}, None)

        b = sensori.leggi_ciak("https://x", "k", "/api/x", "report", fetch_fn=boom)
        self.assertFalse(b["ok"])
        self.assertIn("401", b["errore"])
        self.assertIn("chiave", b["errore"])

    def test_backend_irraggiungibile_non_solleva(self):
        def boom(url, key):
            raise urllib.error.URLError("connessione rifiutata")

        b = sensori.leggi_ciak("https://x", "k", "/api/x", "acq", fetch_fn=boom)
        self.assertFalse(b["ok"])
        self.assertIn("irraggiungibile", b["errore"])


if __name__ == "__main__":
    unittest.main()
