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


class TestLeggiSito(unittest.TestCase):
    def test_tre_url_tutte_200(self):
        b = sensori.leggi_sito(fetch_fn=lambda url: 200)
        self.assertTrue(b["ok"])
        self.assertTrue(b["dati"]["tutte_ok"])
        self.assertEqual(len(b["dati"]["url"]), 3)

    def test_un_404_non_e_un_punto_cieco_ma_una_misura(self):
        def fetch(url):
            return 404 if url.endswith("/masterclass") else 200

        b = sensori.leggi_sito(fetch_fn=fetch)
        self.assertTrue(b["ok"], "misurare un 404 e' comunque una misura riuscita")
        self.assertFalse(b["dati"]["tutte_ok"])
        self.assertEqual(b["dati"]["url"]["https://www.ciak.io/masterclass"]["status"], 404)

    def test_url_irraggiungibile_registra_errore_e_status_none(self):
        def fetch(url):
            raise urllib.error.URLError("dns fallito")

        b = sensori.leggi_sito(fetch_fn=fetch)
        primo = b["dati"]["url"][sensori.URL_SITO[0]]
        self.assertIsNone(primo["status"])
        self.assertIn("dns fallito", primo["errore"])
        self.assertFalse(b["dati"]["tutte_ok"])

    def test_registra_i_millisecondi(self):
        b = sensori.leggi_sito(fetch_fn=lambda url: 200)
        for esito in b["dati"]["url"].values():
            self.assertIsInstance(esito["ms"], int)

    def test_404_reale_solleva_httperror_ed_e_comunque_una_misura(self):
        """Il ramo di PRODUZIONE: urlopen su un 404 SOLLEVA HTTPError, non ritorna 404.

        Senza questo test, fondere i due except (`except (URLError, OSError, HTTPError)`)
        passerebbe lo stesso, e ogni 404 reale diventerebbe un punto cieco.
        """
        def fetch(url):
            if url.endswith("/masterclass"):
                raise urllib.error.HTTPError(url, 404, "Not Found", {}, None)
            return 200

        b = sensori.leggi_sito(fetch_fn=fetch)
        masterclass = b["dati"]["url"]["https://www.ciak.io/masterclass"]
        self.assertTrue(b["ok"])
        self.assertEqual(masterclass["status"], 404)
        self.assertIsNone(masterclass["errore"], "un 404 e' una misura, non un errore di lettura")
        self.assertFalse(b["dati"]["tutte_ok"])


if __name__ == "__main__":
    unittest.main()
