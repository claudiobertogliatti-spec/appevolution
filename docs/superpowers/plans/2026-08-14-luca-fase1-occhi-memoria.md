# Luca Fase 1 — Occhi e Memoria · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare al briefing quotidiano di Luca cinque fonti invece di due, e una memoria che sopravvive alla notte, così che domani mattina il report mostri da solo la campagna Meta ferma su Traffico.

**Architecture:** Due sensori per vincolo tecnico, non per scelta: `briefing_luca.py` è stdlib pura e headless, quindi legge Ciak e il sito via HTTP; Meta, Systeme e i social arrivano da tool MCP che esistono solo dentro la sessione dell'agente e sono guidati da `SKILL.md`. Entrambi i sensori producono la stessa busta a 5 chiavi. Tre file di stato in `stato/` rendono calcolabile il confronto con ieri.

**Tech Stack:** Python 3.12.10 (verificato), **solo stdlib** a runtime, `unittest` per i test (non pytest: nessuna dipendenza da installare).

**Spec:** `docs/superpowers/specs/2026-08-14-luca-agente-esecutivo-design.md` (commit `515b75c4`)

## Global Constraints

- **Runtime solo stdlib.** Nessun `pip install` sulla macchina che esegue il briefing. Vincolo ereditato dallo script esistente, non negoziabile.
- **Test con `unittest`**, eseguiti con `python -m unittest`. Nessun pytest.
- **Nessun test tocca la rete.** Le funzioni di lettura accettano una funzione di fetch iniettabile.
- **Assente ≠ zero.** Una fonte caduta lascia la cella **vuota** in `numeri.csv`. Zero è una misura, vuoto è un punto cieco. Confonderli è l'errore che questo progetto esiste per non fare.
- **Pavimento su Ciak.** Se cade una delle due fonti Ciak si aborta tutto con exit ≠ 0, esattamente come oggi. Le altre fonti degradano dichiarandosi.
- **Retrocompatibilità obbligatoria:** l'output JSON deve continuare ad avere le chiavi top-level `report` e `acq`, perché il `SKILL.md` in produzione le legge. Si **aggiunge** `fonti`, non si sostituisce nulla.
- **Due copie da tenere sincronizzate:** `appevolution/scripts/` è la fonte di verità, `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\` è ciò che gira. Se cambia una, si ricopia l'altra (regola del 30/7).
- **Lingua:** messaggi all'utente e commenti in italiano, nomi di file/funzioni e messaggi di commit in inglese.
- **Path assoluti** in `SKILL.md`: la cartella di lavoro configurata nel task non è affidabile.

## File Structure

| File | Responsabilità |
|---|---|
| `scripts/sensori.py` *(nuovo)* | La busta uniforme e i due sensori Python: Ciak e sito. Non sa niente di stato né di orchestrazione. |
| `scripts/stato.py` *(nuovo)* | L'unico modulo che legge e scrive i 3 file di stato. Nessun altro file tocca `stato/`. |
| `scripts/briefing_luca.py` *(modificato)* | Orchestratore: chiama i sensori, applica il pavimento, stampa un JSON solo. |
| `scripts/tests/test_sensori.py` *(nuovo)* | Test della busta e dei due sensori, con fetch iniettato. |
| `scripts/tests/test_stato.py` *(nuovo)* | Test dei 3 file di stato, su cartella temporanea. |
| `Claude\Scheduled\briefing-luca-ad\SKILL.md` *(modificato)* | Il sensore MCP e la scrittura dello stato: è l'interfaccia che l'agente esegue. |

**Preparazione (una volta sola, prima della Task 1):**

```bash
git -C /c/Users/berto/appevolution checkout -b cc/luca-fase1-occhi-memoria
```

Il branch parte da `515b75c4`, che contiene già la spec.

---

### Task 1: La busta uniforme e il sensore Ciak

**Files:**
- Create: `scripts/sensori.py`
- Test: `scripts/tests/test_sensori.py`

**Interfaces:**
- Consumes: niente (è il primo mattone)
- Produces:
  - `busta(fonte: str, ok: bool, dati: dict | None = None, errore: str | None = None) -> dict` — restituisce sempre le 5 chiavi `fonte`, `ok`, `letto_a`, `dati`, `errore`
  - `leggi_ciak(base_url: str, key: str, path: str, nome: str, fetch_fn=None) -> dict` — busta con `dati` = il JSON dell'endpoint
  - `CHIAVI_BUSTA: tuple[str, ...]`
  - `TIMEOUT_SECONDS: int`

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_sensori.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: FAIL con `ModuleNotFoundError: No module named 'sensori'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/sensori.py`:

```python
#!/usr/bin/env python3
"""
Sensori Python del briefing di Luca: leggono cio' che si raggiunge via HTTP.

Le fonti che vivono dietro un tool MCP (Meta Ads, Meta Social, Systeme) NON
stanno qui: quei tool esistono solo dentro la sessione dell'agente, non in un
processo Python headless. Le legge Luca stesso, guidato da SKILL.md, e produce
buste con la stessa identica forma di queste.

Solo stdlib: questo script gira su una macchina dove non si installa nulla.
"""
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

CHIAVI_BUSTA = ("fonte", "ok", "letto_a", "dati", "errore")
TIMEOUT_SECONDS = 60

_SPIEGAZIONI_HTTP = {
    401: "chiave assente o non configurata sul server",
    403: "chiave non valida per questo endpoint",
    503: "il backend non ha il database collegato",
}


def busta(fonte, ok, dati=None, errore=None):
    """La forma unica di ogni lettura, da qualunque sensore arrivi.

    Chi consuma non deve sapere se il dato viene da HTTP o da un tool MCP.
    """
    return {
        "fonte": fonte,
        "ok": bool(ok),
        "letto_a": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dati": dati if dati is not None else {},
        "errore": errore,
    }


def _fetch_http(url, key):
    request = urllib.request.Request(
        url, headers={"X-Report-Key": key, "Accept": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def leggi_ciak(base_url, key, path, nome, fetch_fn=None):
    """Legge un endpoint di sola lettura di Ciak con la chiave X-Report-Key."""
    fetch_fn = fetch_fn or _fetch_http
    url = f"{base_url.rstrip('/')}{path}"
    try:
        return busta(nome, True, fetch_fn(url, key))
    except urllib.error.HTTPError as err:
        spiegazione = _SPIEGAZIONI_HTTP.get(err.code, "risposta inattesa dal backend")
        return busta(nome, False, errore=f"HTTP {err.code} ({spiegazione})")
    except urllib.error.URLError as err:
        return busta(nome, False, errore=f"backend irraggiungibile: {err.reason}")
    except (ValueError, OSError) as err:
        return busta(nome, False, errore=f"risposta illeggibile: {err}")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: PASS, 6 test

- [ ] **Step 5: Commit**

```bash
git add scripts/sensori.py scripts/tests/test_sensori.py
git commit -m "feat(luca): add the uniform reading envelope and the Ciak sensor"
```

---

### Task 2: Il sensore del sito

**Files:**
- Modify: `scripts/sensori.py`
- Test: `scripts/tests/test_sensori.py`

**Interfaces:**
- Consumes: `busta()` dalla Task 1
- Produces:
  - `URL_SITO: tuple[str, str, str]`
  - `leggi_sito(urls=URL_SITO, fetch_fn=None) -> dict` — busta con `dati = {"url": {<url>: {"status": int|None, "ms": int|None, "errore": str|None}}, "tutte_ok": bool}`

**Nota di progetto — perché `ok` è quasi sempre `True` qui:** `ok` dice *"sono riuscito a misurare"*, non *"il sito sta bene"*. Un sito che risponde 500 è **una misura riuscita di una brutta notizia**, e va in `dati`. Se mettessimo `ok=False` il briefing lo tratterebbe come un punto cieco e la brutta notizia sparirebbe: esattamente il contrario di quello che serve.

- [ ] **Step 1: Write the failing test**

Append to `scripts/tests/test_sensori.py`, prima del blocco `if __name__`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: FAIL con `AttributeError: module 'sensori' has no attribute 'leggi_sito'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere `import time` al blocco import in cima al file (non in fondo: gli import stanno tutti insieme), poi appendere il resto a `scripts/sensori.py`:

```python
# import time  <-- va aggiunto al blocco import in cima, non qui

URL_SITO = (
    "https://www.ciak.io/",
    "https://www.ciak.io/masterclass",
    "https://www.ciak.io/api/health",
)
TIMEOUT_SITO = 20


def _fetch_status(url):
    request = urllib.request.Request(url, headers={"User-Agent": "briefing-luca"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SITO) as response:
        return response.status


def leggi_sito(urls=URL_SITO, fetch_fn=None):
    """Misura status code e tempo di risposta delle pagine che devono essere vive.

    Nessun parsing del contenuto: un funnel che risponde 200 con la pagina
    sbagliata e' un problema di Fase 2, non di questo sensore.
    """
    fetch_fn = fetch_fn or _fetch_status
    esiti = {}
    for url in urls:
        inizio = time.monotonic()
        try:
            status, errore = fetch_fn(url), None
        except urllib.error.HTTPError as err:
            status, errore = err.code, None
        except (urllib.error.URLError, OSError) as err:
            status, errore = None, f"non raggiunto: {getattr(err, 'reason', err)}"
        esiti[url] = {
            "status": status,
            "ms": round((time.monotonic() - inizio) * 1000),
            "errore": errore,
        }
    tutte_ok = all(e["status"] == 200 for e in esiti.values())
    return busta("sito", True, {"url": esiti, "tutte_ok": tutte_ok})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: PASS, 10 test

- [ ] **Step 5: Commit**

```bash
git add scripts/sensori.py scripts/tests/test_sensori.py
git commit -m "feat(luca): measure the public site as a fifth source"
```

---

### Task 3: `numeri.csv` — la serie storica e il confronto

**Files:**
- Create: `scripts/stato.py`
- Test: `scripts/tests/test_stato.py`

**Interfaces:**
- Consumes: niente
- Produces:
  - `COLONNE: tuple[str, ...]` — le 14 colonne, `data` per prima
  - `cartella_stato() -> Path` — legge `LUCA_STATO_DIR` a ogni chiamata, default `<dir di stato.py>/stato`
  - `scrivi_numeri(riga: dict) -> None` — upsert sulla chiave `data`
  - `leggi_numeri() -> list[dict]`
  - `confronta(oggi: dict) -> dict` — `{"prima_misurazione": True}` se non c'è storico, altrimenti `{colonna: {"oggi", "ieri", "delta"}}`

**Nota di progetto — la regola che vale più di tutto il file:** una colonna che una fonte caduta non ha si scrive **vuota**, mai zero. E `confronta` **non calcola un delta** se una delle due celle è vuota: restituisce `delta: None`. Zero è una misura, vuoto è un punto cieco.

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_stato.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: FAIL con `ModuleNotFoundError: No module named 'stato'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/stato.py`:

```python
#!/usr/bin/env python3
"""
I tre file che danno a Luca una memoria che sopravvive alla notte.

Senza questi, ogni mattina Luca riparte da zero e la riga piu' importante del
suo prompt — "cosa hai gia' fatto dall'ultimo briefing" — e' impossibile.

E' l'UNICO modulo che tocca la cartella stato/. Solo stdlib.
"""
import csv
import json
import os
from pathlib import Path

COLONNE = (
    "data",
    "lead_oggi",
    "diagnosi_oggi",
    "ingressi_evo_mese",
    "partner_attivi",
    "partner_fermi",
    "partner_attesa_ok",
    "checkout_non_pagati",
    "meta_campagna_obiettivo",
    "meta_spesa_giorno",
    "meta_lead_giorno",
    "giorni_silenzio_social",
    "contatti_systeme",
    "sito_ok",
)


def cartella_stato():
    """Letta a ogni chiamata, non all'import: i test la spostano su una tmpdir."""
    default = Path(__file__).resolve().parent / "stato"
    cartella = Path(os.environ.get("LUCA_STATO_DIR") or default)
    cartella.mkdir(parents=True, exist_ok=True)
    return cartella


def _file_numeri():
    return cartella_stato() / "numeri.csv"


def _cella(valore):
    """None diventa stringa vuota, MAI zero: vuoto e' un punto cieco, zero e' una misura."""
    return "" if valore is None else str(valore)


def leggi_numeri():
    percorso = _file_numeri()
    if not percorso.exists():
        return []
    with percorso.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def scrivi_numeri(riga):
    """Upsert sulla data: due run nello stesso giorno aggiornano, non duplicano."""
    data = riga.get("data")
    if not data:
        raise ValueError("la riga dei numeri deve avere una 'data'")

    righe = [r for r in leggi_numeri() if r.get("data") != data]
    righe.append({colonna: _cella(riga.get(colonna)) for colonna in COLONNE})
    righe.sort(key=lambda r: r["data"])

    with _file_numeri().open("w", encoding="utf-8", newline="") as f:
        scrittore = csv.DictWriter(f, fieldnames=list(COLONNE))
        scrittore.writeheader()
        scrittore.writerows(righe)


def _numero(valore):
    if valore in (None, ""):
        return None
    try:
        return float(valore)
    except (TypeError, ValueError):
        return None


def confronta(oggi):
    """Confronta i numeri di oggi con l'ultima riga precedente.

    Nessun delta se una delle due celle e' vuota o non numerica: preferiamo un
    "non confrontabile" esplicito a un trend inventato.
    """
    precedenti = [r for r in leggi_numeri() if r.get("data") != oggi.get("data")]
    if not precedenti:
        return {"prima_misurazione": True}

    ieri = precedenti[-1]
    esito = {}
    for colonna in COLONNE:
        if colonna == "data":
            continue
        valore_oggi = oggi.get(colonna)
        valore_ieri = ieri.get(colonna)
        n_oggi, n_ieri = _numero(valore_oggi), _numero(valore_ieri)
        esito[colonna] = {
            "oggi": valore_oggi,
            "ieri": valore_ieri if valore_ieri != "" else None,
            "delta": None if n_oggi is None or n_ieri is None else n_oggi - n_ieri,
        }
    return esito
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: PASS, 17 test

- [ ] **Step 5: Commit**

```bash
git add scripts/stato.py scripts/tests/test_stato.py
git commit -m "feat(luca): keep a daily history so trends are computed, not recalled"
```

---

### Task 4: `coda.json` e `registro.md`

**Files:**
- Modify: `scripts/stato.py`
- Test: `scripts/tests/test_stato.py`

**Interfaces:**
- Consumes: `cartella_stato()` dalla Task 3
- Produces:
  - `leggi_coda() -> list[dict]`
  - `apri_azione(cosa: str, chi: str, entro: str) -> dict` — solleva `ValueError` se `chi` contiene una virgola o " e "
  - `chiudi_azione(id_azione: str, esito: str) -> dict`
  - `registra(cosa: str, perche: str, risultato: str) -> None` — append a `registro.md`
  - `leggi_registro() -> str`

**Nota di progetto — perché `chi` rifiuta due nomi:** è il principio 10 del prompt di Luca (*"un solo responsabile per cosa"*) reso impossibile da violare. Se ci pensano tutti, non ci pensa nessuno.

- [ ] **Step 1: Write the failing test**

Append to `scripts/tests/test_stato.py`, prima del blocco `if __name__`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: FAIL con `AttributeError: module 'stato' has no attribute 'leggi_coda'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere `import uuid` e `from datetime import datetime, timezone` al blocco import in cima al file, poi appendere il resto a `scripts/stato.py`:

```python
# import uuid
# from datetime import datetime, timezone
#   ^-- vanno aggiunti al blocco import in cima, non qui


def _file_coda():
    return cartella_stato() / "coda.json"


def _file_registro():
    return cartella_stato() / "registro.md"


def _adesso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def leggi_coda():
    percorso = _file_coda()
    if not percorso.exists():
        return []
    return json.loads(percorso.read_text(encoding="utf-8") or "[]")


def _scrivi_coda(azioni):
    _file_coda().write_text(
        json.dumps(azioni, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def apri_azione(cosa, chi, entro):
    """Un'azione ha SEMPRE un solo responsabile: principio 10, reso non violabile."""
    if "," in chi or " e " in f" {chi} ":
        raise ValueError(
            f"'{chi}' sono piu' persone: un'azione ha un solo responsabile, "
            "altrimenti non ce l'ha nessuno"
        )
    azione = {
        "id": uuid.uuid4().hex[:8],
        "cosa": cosa,
        "chi": chi,
        "entro": entro,
        "stato": "aperta",
        "aperta_il": _adesso(),
        "chiusa_il": None,
        "esito": None,
    }
    azioni = leggi_coda()
    azioni.append(azione)
    _scrivi_coda(azioni)
    return azione


def chiudi_azione(id_azione, esito):
    azioni = leggi_coda()
    for azione in azioni:
        if azione["id"] == id_azione:
            azione.update(stato="chiusa", esito=esito, chiusa_il=_adesso())
            _scrivi_coda(azioni)
            return azione
    raise KeyError(f"azione '{id_azione}' non trovata in coda")


def registra(cosa, perche, risultato):
    """Il registro degli errori di Dalio: append-only, non si riscrive il passato."""
    percorso = _file_registro()
    if not percorso.exists():
        percorso.write_text("# Registro di Luca\n\n", encoding="utf-8")
    with percorso.open("a", encoding="utf-8") as f:
        f.write(f"- **{_adesso()}** · {cosa} · _perche':_ {perche} · _risultato:_ {risultato}\n")


def leggi_registro():
    percorso = _file_registro()
    return percorso.read_text(encoding="utf-8") if percorso.exists() else ""
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: PASS, 25 test

- [ ] **Step 5: Commit**

```bash
git add scripts/stato.py scripts/tests/test_stato.py
git commit -m "feat(luca): add the work queue and the append-only decision log"
```

---

### Task 5: L'orchestratore — 5 fonti, pavimento su Ciak, retrocompatibilità

**Files:**
- Modify: `scripts/briefing_luca.py`
- Test: `scripts/tests/test_briefing.py` (create)

**Interfaces:**
- Consumes: `sensori.leggi_ciak`, `sensori.leggi_sito`, `sensori.busta`
- Produces:
  - `raccogli(base_url: str, key: str, leggi_ciak_fn=None, leggi_sito_fn=None) -> tuple[dict | None, str | None]` — `(output, None)` se Ciak risponde, `(None, messaggio_errore)` se una delle due fonti Ciak cade
  - Output JSON con chiavi `report`, `acq` (retrocompatibili) **e** `fonti`

**Nota di progetto — la conciliazione dei due vincoli:** `SKILL.md` vieta i briefing parziali, e ha ragione. Ma con 5 fonti il tutto-o-niente è fragile. La conciliazione sta nella differenza tra **assente** e **inventato**: una fonte caduta si dichiara, e dichiarare un punto cieco non è un briefing parziale. Il pavimento resta su Ciak: se cade la fonte centrale si aborta, come oggi.

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_briefing.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: FAIL con `AttributeError: module 'briefing_luca' has no attribute 'raccogli'`

- [ ] **Step 3: Write minimal implementation**

Replace the body of `scripts/briefing_luca.py` from the `import` block onward, keeping the module docstring and updating it. The full new file:

```python
#!/usr/bin/env python3
"""
Scarica i dati del briefing mattutino di Luca (AD) senza browser e senza login.

Perche' esiste: il briefing delle 7:45 girava dentro una tab Chrome loggata su
ciak.io/admin, leggendo il JWT dal localStorage. Quel canale e' interattivo: se
il browser non e' connesso o il token e' scaduto (dura 24h) il briefing salta.
Il 30/7/2026 e' saltato esattamente cosi'.

Dal 14/8/2026 non legge piu' solo dentro Ciak: aggiunge il sito pubblico, e le
fonti che vivono dietro un tool MCP (Meta, Systeme, social) le legge Luca
stesso, guidato da SKILL.md, con buste della stessa forma. Un report che guarda
solo dentro casa non e' un report.

Uso:
    python scripts/briefing_luca.py            # legge LUCA_REPORT_KEY dall'ambiente
    python scripts/briefing_luca.py --base-url http://localhost:8001

Stampa su stdout un unico JSON {"report": ..., "acq": ..., "fonti": ...}.
Le chiavi "report" e "acq" restano al primo livello per non rompere SKILL.md.
Esce con codice != 0 se cade Ciak: meglio fallire in modo evidente che produrre
un briefing a meta'. Solo stdlib.
"""
import argparse
import json
import os
import sys

import sensori

DEFAULT_BASE_URL = "https://www.ciak.io"
ENDPOINTS = {
    "report": "/api/admin/luca/daily-report",
    "acq": "/api/admin/ciak/acquisizione-command-center",
}


def raccogli(base_url, key, leggi_ciak_fn=None, leggi_sito_fn=None):
    """Legge le fonti Python e restituisce (output, errore).

    Pavimento: se cade una delle due fonti Ciak si aborta tutto. Le altre fonti
    degradano dichiarandosi, perche' dichiarare un punto cieco non e' un
    briefing parziale: inventare un numero lo sarebbe.
    """
    leggi_ciak_fn = leggi_ciak_fn or sensori.leggi_ciak
    leggi_sito_fn = leggi_sito_fn or sensori.leggi_sito

    fonti = {}
    for nome, path in ENDPOINTS.items():
        fonti[nome] = leggi_ciak_fn(base_url, key, path, nome)
        if not fonti[nome]["ok"]:
            return None, f"{path} -> {fonti[nome]['errore']}"

    fonti["sito"] = leggi_sito_fn()

    output = {nome: fonti[nome]["dati"] for nome in ENDPOINTS}
    output["fonti"] = fonti
    return output, None


def main():
    parser = argparse.ArgumentParser(description="Dati del briefing mattutino di Luca")
    parser.add_argument(
        "--base-url", default=os.environ.get("CIAK_BASE_URL", DEFAULT_BASE_URL)
    )
    args = parser.parse_args()

    key = os.environ.get("LUCA_REPORT_KEY", "")
    if not key:
        print(
            "LUCA_REPORT_KEY non e' impostata su questa macchina: senza chiave non si "
            "leggono i dati del briefing.",
            file=sys.stderr,
        )
        return 2

    output, errore = raccogli(args.base_url, key)
    if errore:
        print(errore, file=sys.stderr)
        return 1

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: PASS, 29 test

- [ ] **Step 5: Verify against the live backend**

```bash
cd /c/Users/berto/appevolution && python scripts/briefing_luca.py > /tmp/briefing.json; echo "exit=$?"; python -c "import json;d=json.load(open('/tmp/briefing.json'));print('chiavi:',sorted(d));print('fonti:',{k:v['ok'] for k,v in d['fonti'].items()});print('sito:',d['fonti']['sito']['dati']['tutte_ok'])"
```

Expected: `exit=0`, chiavi `['acq', 'fonti', 'report']`, tutte le fonti `True`.
Se `sito.tutte_ok` è `False`, **non è un bug del codice**: è il primo dato utile che il briefing produce. Annotarlo e proseguire.

- [ ] **Step 6: Commit**

```bash
git add scripts/briefing_luca.py scripts/tests/test_briefing.py
git commit -m "feat(luca): read five sources with a Ciak floor and declared blind spots"
```

---

### Task 6: `SKILL.md` — il sensore MCP e la scrittura dello stato

**Files:**
- Modify: `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\SKILL.md`

**Interfaces:**
- Consumes: l'output di `briefing_luca.py` (Task 5) e le funzioni di `stato.py` (Task 3-4)
- Produces: il comportamento che l'agente esegue alle 7:45

⛔ **In questa task NON si riscrive la procedura a 6 passi** (è Fase 2) e **non si toccano le proibizioni esistenti** — restano parola per parola.

- [ ] **Step 1: Read the current file end to end**

```bash
cat "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
```

Serve per non perdere nessuna delle proibizioni del PASSO 1, che restano invariate.

- [ ] **Step 2: Insert the MCP sensor step**

Inserire subito **dopo** il blocco delle proibizioni del PASSO 1 (la riga che finisce con *"Claudio decide su quei numeri."*), prima di `PASSO 2`:

```markdown
PASSO 1-BIS — Guarda anche FUORI casa. I due endpoint sopra vedono solo dentro Ciak: il 14/8/2026 tutto cio' che era rotto (campagna su obiettivo sbagliato da 60 giorni, social fermi 49 giorni) stava fuori e il briefing non lo vedeva. Un report che guarda solo dentro casa non e' un report.

Leggi queste tre fonti con i tool MCP, una alla volta:
- Meta Ads: `meta_list_campaigns` (obiettivo e stato di ogni campagna attiva) e `meta_get_account_info` (saldo maturato, stato account).
- Meta Social: `ig_list_media` con limit 3 e `fb_list_posts` con limit 3 -> ti serve la data dell'ultimo post per calcolare i GIORNI DI SILENZIO.
- Systeme: `get_contacts` con limit 1 -> ti serve solo il totale dei contatti.

Regole di questo passo, senza eccezioni:
- Una fonte che non risponde si DICHIARA ("Meta Ads: non letta - <errore testuale>") e si va avanti. Dichiarare un punto cieco NON e' un briefing parziale.
- ⛔ E' VIETATO stimare, dedurre o riusare il valore di ieri per riempire un buco. Vale qui esattamente come nel PASSO 1.
- ⛔ Se cade Ciak (PASSO 1) ci si ferma comunque: quello e' il pavimento, queste fonti non lo sostituiscono.
- Il "Saldo" di `meta_get_account_info` NON e' credito residuo: e' spesa maturata non ancora addebitata, e cresce mentre la campagna gira.
```

- [ ] **Step 3: Add the state-writing step**

Aggiungere in fondo al file, **dopo** il blocco `Regole:` finale:

```markdown
PASSO 3 — Scrivi lo stato, sempre, anche quando il briefing e' tutto verde. Senza questo passo domani mattina riparti da zero e non puoi dire cosa e' cambiato.

Esegui con lo strumento PowerShell, sostituendo i valori con quelli letti (usa `None` per ogni numero che una fonte caduta non ti ha dato — MAI zero: zero e' una misura, vuoto e' un punto cieco):

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato; stato.scrivi_numeri({'data':'AAAA-MM-GG','lead_oggi':N,'diagnosi_oggi':N,'ingressi_evo_mese':N,'partner_attivi':N,'partner_fermi':N,'partner_attesa_ok':N,'checkout_non_pagati':N,'meta_campagna_obiettivo':'OUTCOME_X','meta_spesa_giorno':N,'meta_lead_giorno':N,'giorni_silenzio_social':N,'contatti_systeme':N,'sito_ok':True})"

Poi, PRIMA di scrivere il messaggio a Claudio, leggi il confronto con ieri:

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato, json; print(json.dumps(stato.confronta({'data':'AAAA-MM-GG'}), ensure_ascii=False))"

Usa quel confronto per dire "su o giu' rispetto a ieri" con il numero vero. Se risponde `prima_misurazione`, scrivi "prima misurazione, nessun confronto" — non inventare un andamento. Se un `delta` e' `null`, quella colonna NON e' confrontabile: dillo, non arrotondare.
```

- [ ] **Step 4: Verify the prohibitions survived**

```bash
grep -c "VIETATO\|vietato" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
grep -n "cercare sul web" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
```

Expected: il divieto originale di cercare sul web è ancora presente e testuale.

- [ ] **Step 5: Commit**

`SKILL.md` vive fuori dal repo, quindi si copia dentro per versionarlo:

```bash
mkdir -p /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad
cp "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md" /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad/SKILL.md
cd /c/Users/berto/appevolution && git add scripts/scheduled/briefing-luca-ad/SKILL.md && git commit -m "docs(luca): teach the morning task to read outside the house and persist state"
```

---

### Task 7: Messa in esercizio e collaudo end-to-end

**Files:**
- Modify: `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\` (copia dei 3 moduli)
- Create: `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\stato\` (primo popolamento)

**Interfaces:**
- Consumes: tutto quanto sopra
- Produces: il briefing di domani mattina che gira sul codice nuovo

- [ ] **Step 1: Copy the three modules to the running location**

```bash
cd /c/Users/berto/appevolution && cp scripts/sensori.py scripts/stato.py scripts/briefing_luca.py "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/" && ls -la "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/"
```

Expected: i 3 `.py` più `SKILL.md`.

- [ ] **Step 2: Run from the running location, exactly as the task does**

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python briefing_luca.py > /tmp/run.json; echo "exit=$?"; python -c "import json;d=json.load(open('/tmp/run.json'));print({k:v['ok'] for k,v in d['fonti'].items()})"
```

Expected: `exit=0` e tutte le fonti `True`. Se fallisce qui ma funzionava dal repo, il problema è il path degli import — `sensori.py` deve stare nella stessa cartella.

- [ ] **Step 3: Seed today's row and verify the comparison is honest**

Sostituire ogni `N` con il valore letto al passo 2 (dentro `report` e `acq`) e i valori MCP con quelli letti a mano adesso. Lasciare `None` — **mai `0`** — per ogni numero che non si è riusciti a leggere:

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python -c "
import stato
stato.scrivi_numeri({
    'data': '2026-08-15',
    'lead_oggi': N, 'diagnosi_oggi': N, 'ingressi_evo_mese': N,
    'partner_attivi': N, 'partner_fermi': N, 'partner_attesa_ok': N,
    'checkout_non_pagati': N,
    'meta_campagna_obiettivo': 'OUTCOME_TRAFFIC',
    'meta_spesa_giorno': N, 'meta_lead_giorno': N,
    'giorni_silenzio_social': N, 'contatti_systeme': N,
    'sito_ok': True,
})
print(stato.leggi_numeri())
"
```

⚠️ `meta_campagna_obiettivo` va scritto `OUTCOME_TRAFFIC`: è il valore **vero** misurato il 14/8 sulla campagna `120251843794950188`. Scrivere il valore che vorremmo invece di quello che c'è renderebbe inutile tutto il resto.

Poi verificare che il confronto del giorno dopo sia onesto:

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python -c "import stato, json; print(json.dumps(stato.confronta({'data':'2026-08-16'}), ensure_ascii=False, indent=2))" | head -20
```

Expected: **non** `prima_misurazione` (esiste già la riga di ieri), e i delta calcolati solo dove entrambe le celle hanno un numero.

- [ ] **Step 4: Verify the state files exist and are valid**

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/stato" && ls -la && head -2 numeri.csv && python -c "import json;print(len(json.load(open('coda.json'))),'azioni in coda')"
```

Expected: `numeri.csv` con le 14 colonne, `coda.json` una lista valida.

- [ ] **Step 5: Run the full test suite one last time**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v
```

Expected: PASS, 29 test.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/berto/appevolution && git add -A scripts/ && git commit -m "chore(luca): put phase 1 into service and record the first measurement"
```

- [ ] **Step 7: Hand the three prerequisites back to Claudio**

Non sono implementabili da qui: richiedono l'interfaccia dell'app desktop o una sua decisione.

1. 🔑 **Approvare i permessi MCP** del task `briefing-luca-ad` per `meta_list_campaigns`, `meta_get_account_info`, `ig_list_media`, `fb_list_posts`, `get_contacts`. Oggi `approvedPermissions` è **assente** su questo task (`gaia-motore-vendite` ne ha 5). **Senza questo passo il PASSO 1-BIS non gira e la Fase 1 resta cieca esattamente come oggi.**
2. 🧹 Togliere `C:\Users\berto\Desktop\appevolution` da `userSelectedFolders` — non esiste.
3. ⏰ Valutare lo spostamento dell'orario: 4 task fra 7:30 e 8:00, e questo ha già 2 skip per `global_limit`.

---

## Criterio di riuscita

**Il briefing del mattino successivo deve mostrare da solo la campagna Meta ferma su Traffico da N giorni, senza che nessuno gliel'abbia chiesto.** Se non la mostra, la Fase 1 non ha risolto il problema per cui è nata — e il punto da guardare è il prerequisito 1, non il codice.

## Cosa resta fuori (Fase 2)

Le mani e la procedura a 6 passi: Luca che *esegue* le porte a due vie — cioè che la campagna la rimette lui su Lead — e che scrive in `registro.md` cosa ha fatto e perché. Questa fase gli dà gli occhi per vederla e la memoria per ricordare da quanti giorni è così.
