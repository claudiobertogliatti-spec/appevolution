# Luca Fase 2 — Mani e procedura · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare a Luca le mani sull'acquisizione con un cancello che sta nel codice, e rendere la memoria indipendente dal passo che stamattina l'ha uccisa.

**Architecture:** `stato.py` guadagna una whitelist di azioni **nominate** e una funzione che autorizza o nega, testabile senza rete; `SKILL.md` viene rinumerato in sei passi consecutivi e scrive la memoria **prima** del passo MCP, aggiornandola dopo con l'upsert che esiste già. Il prompt istruisce, il codice autorizza e registra.

**Tech Stack:** Python 3.12.10, **solo stdlib**, `unittest`. Il prompt operativo è un Markdown fuori dal repo.

**Spec:** `docs/superpowers/specs/2026-08-15-luca-fase2-mani-procedura-design.md` (commit `681ce5b2`)

## Global Constraints

- **Runtime solo stdlib.** Nessun `pip install` sulla macchina che esegue il briefing.
- **Test con `unittest`**, eseguiti con `python -m unittest discover -s scripts/tests -v`. Mai pytest.
- **Nessun test tocca la rete.** Le azioni Meta sono eseguite dall'agente via MCP: il codice **autorizza e registra**, non chiama Meta. È ciò che rende il cancello testabile.
- **Assente ≠ zero.** Una colonna che una fonte caduta non ha dato si scrive **vuota**, mai `0`.
- **Lingua:** messaggi, commenti e docstring in **italiano**; nomi di dominio in italiano (convenzione bilingue reale del repo, 391 file `.py`); **messaggi di commit in inglese**.
- **`SKILL.md` è senza accenti** (`e'`, `perche'`, `puo'`): è una scelta del file, mantenerla.
- **Due copie sincronizzate:** `appevolution/scripts/` è la fonte di verità, `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\` è ciò che gira. Se cambia una, si ricopia l'altra e si verifica con `diff`.
- ⛔ **`git add` sui file nominati, mai `-A`**: `scripts/stato/` è stato di runtime ed è in `.gitignore`.
- ⛔ **Il backup `SKILL.md.bak-fase1` non si tocca mai**: è la via d'uscita se il briefing si rompe.

## ⚠️ Due agenti nello stesso working tree

Il 15/8 un altro agente lavorava su `codex/partner-materials-release` **nella stessa cartella**, e un commit di questo progetto è finito sul suo branch. Verificato: quel branch **non tocca** i file di Luca.
👉 **Prima di ogni commit: `git rev-parse --abbrev-ref HEAD`** e verificare di essere su `cc/luca-fase1-occhi-memoria`. Se non lo sei, **non committare**: segnalalo.

## File Structure

| File | Responsabilità |
|---|---|
| `scripts/stato.py` *(modificato)* | Aggiunge la whitelist, il cancello e la registrazione delle azioni. Resta l'unico modulo che tocca `stato/`. |
| `scripts/tests/test_stato.py` *(modificato)* | Nuova classe `TestAzioni`. |
| `Claude\Scheduled\briefing-luca-ad\SKILL.md` *(riscritto)* | Sei passi consecutivi, memoria a monte, mani con il cancello. |
| `scripts/scheduled/briefing-luca-ad/SKILL.md` *(modificato)* | La copia versionata, da tenere identica. |
| `backend/routers/admin_luca.py` *(modificato, Task 7)* | `LUCA_AD_SYSTEM`: dentro Ciak Luca **prepara**. |

**L'ordine dei task rispetta la lezione della Fase 1:** il sistema vivo deve restare funzionante **dopo ognuno**, non solo alla fine. Per questo `stato.py` viene copiato nella cartella viva (Task 3) **prima** che `SKILL.md` lo usi (Task 4-5).

---

### Task 1: La whitelist e il cancello

**Files:**
- Modify: `scripts/stato.py`
- Test: `scripts/tests/test_stato.py`

**Interfaces:**
- Consumes: `cartella_stato()`, `_adesso()` (già presenti)
- Produces:
  - `AZIONI_CONSENTITE: dict[str, dict]` — chiavi `attesa_giorni: int`, `descrizione: str`
  - `_file_azioni() -> Path`
  - `leggi_azioni() -> list[dict]`
  - `ultima_azione(tipo: str) -> dict | None`
  - `azione_permessa(tipo: str, adesso: datetime | None = None) -> tuple[bool, str]`

**Nota di progetto:** il cancello sta **nel codice, non nel prompt**. Un'istruzione scritta si può interpretare male, dimenticare, o sovrascrivere con una riga successiva; una funzione che restituisce `False` no. Luca tocca un account pubblicitario vero.

- [ ] **Step 1: Write the failing test**

Aggiungere in fondo a `scripts/tests/test_stato.py`, prima del blocco `if __name__`:

```python
class TestCancello(BaseStato):
    def _scrivi_azioni(self, azioni):
        """Scrive azioni.json a mano: chi lo scrive davvero arriva nella Task 2."""
        percorso = stato.cartella_stato() / "azioni.json"
        percorso.write_text(json.dumps(azioni, ensure_ascii=False), encoding="utf-8")

    def test_azione_sconosciuta_e_negata_e_dice_quali_sono_consentite(self):
        ok, motivo = stato.azione_permessa("cancella_tutto")
        self.assertFalse(ok)
        self.assertIn("cancella_tutto", motivo)
        self.assertIn("campagna_obiettivo", motivo, "il motivo deve elencare le azioni consentite")

    def test_azione_consentita_mai_eseguita_e_permessa(self):
        ok, motivo = stato.azione_permessa("campagna_obiettivo")
        self.assertTrue(ok)
        self.assertEqual(motivo, "")

    def test_attesa_non_scaduta_nega_e_dice_quanto_manca(self):
        ieri = datetime(2026, 8, 14, 9, 0, tzinfo=timezone.utc)
        self._scrivi_azioni([{"tipo": "campagna_obiettivo", "quando": ieri.isoformat()}])
        adesso = datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc)
        ok, motivo = stato.azione_permessa("campagna_obiettivo", adesso=adesso)
        self.assertFalse(ok)
        self.assertIn("6", motivo, "deve dire quanti giorni mancano")

    def test_attesa_scaduta_permette(self):
        vecchia = datetime(2026, 8, 1, 9, 0, tzinfo=timezone.utc)
        self._scrivi_azioni([{"tipo": "campagna_obiettivo", "quando": vecchia.isoformat()}])
        adesso = datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc)
        ok, _ = stato.azione_permessa("campagna_obiettivo", adesso=adesso)
        self.assertTrue(ok)

    def test_azione_senza_attesa_non_e_mai_bloccata(self):
        adesso = datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc)
        self._scrivi_azioni([{"tipo": "coda_apri", "quando": adesso.isoformat()}])
        ok, _ = stato.azione_permessa("coda_apri", adesso=adesso)
        self.assertTrue(ok)

    def test_l_attesa_di_un_tipo_non_blocca_un_altro_tipo(self):
        adesso = datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc)
        self._scrivi_azioni([{"tipo": "campagna_obiettivo", "quando": adesso.isoformat()}])
        ok, _ = stato.azione_permessa("pubblica_post", adesso=adesso)
        self.assertTrue(ok, "l'attesa e' per tipo, non globale")

    def test_ultima_azione_prende_la_piu_recente_dello_stesso_tipo(self):
        self._scrivi_azioni([
            {"tipo": "pubblica_post", "quando": "2026-08-10T09:00:00+00:00", "cosa": "vecchia"},
            {"tipo": "campagna_obiettivo", "quando": "2026-08-11T09:00:00+00:00", "cosa": "altra"},
            {"tipo": "pubblica_post", "quando": "2026-08-12T09:00:00+00:00", "cosa": "recente"},
        ])
        self.assertEqual(stato.ultima_azione("pubblica_post")["cosa"], "recente")
        self.assertIsNone(stato.ultima_azione("mai_fatta"))
```

Aggiungere anche gli import in cima al file, se mancano: `import json` e `from datetime import datetime, timezone`.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v 2>&1 | tail -5
```

Expected: FAIL con `AttributeError: module 'stato' has no attribute 'azione_permessa'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere in fondo a `scripts/stato.py`:

```python
# ─── Le mani di Luca: whitelist, cancello, registro delle azioni ──────────────

AZIONI_CONSENTITE = {
    "campagna_obiettivo": {
        "attesa_giorni": 7,
        "descrizione": "rimettere una campagna Meta su un obiettivo di tipo Lead",
    },
    "pubblica_post": {
        "attesa_giorni": 1,
        "descrizione": "pubblicare un contenuto gia' in coda e approvato",
    },
    "coda_apri": {"attesa_giorni": 0, "descrizione": "aprire un'azione in coda"},
    "coda_chiudi": {"attesa_giorni": 0, "descrizione": "chiudere un'azione in coda"},
}


def _file_azioni():
    return cartella_stato() / "azioni.json"


def leggi_azioni():
    percorso = _file_azioni()
    if not percorso.exists():
        return []
    return json.loads(percorso.read_text(encoding="utf-8") or "[]")


def ultima_azione(tipo):
    """L'ultima azione registrata di quel tipo, o None."""
    dello_stesso_tipo = [a for a in leggi_azioni() if a.get("tipo") == tipo]
    return dello_stesso_tipo[-1] if dello_stesso_tipo else None


def azione_permessa(tipo, adesso=None):
    """Il cancello: (True, "") oppure (False, motivo).

    Sta nel CODICE e non nel prompt di proposito. Un'istruzione scritta si puo'
    interpretare male, dimenticare, o sovrascrivere con una riga successiva; una
    funzione che restituisce False no. Luca tocca un account pubblicitario vero.

    L'attesa non e' burocrazia: cambiare l'obiettivo di una campagna azzera
    l'apprendimento di Meta, e un agente che "ottimizza" ogni mattina su tre
    giorni di rumore fa piu' danno di uno fermo.
    """
    regola = AZIONI_CONSENTITE.get(tipo)
    if regola is None:
        consentite = ", ".join(sorted(AZIONI_CONSENTITE))
        return False, (
            f"'{tipo}' non e' un'azione consentita: si PREPARA per Claudio, non si esegue. "
            f"Consentite: {consentite}"
        )

    attesa = regola["attesa_giorni"]
    if attesa <= 0:
        return True, ""

    ultima = ultima_azione(tipo)
    if ultima is None:
        return True, ""

    adesso = adesso or datetime.now(timezone.utc)
    passati = (adesso - datetime.fromisoformat(ultima["quando"])).days
    if passati >= attesa:
        return True, ""

    return False, (
        f"'{tipo}' eseguita {passati} giorni fa e l'attesa e' di {attesa}: "
        f"mancano {attesa - passati} giorni. Riportalo nel messaggio come azione "
        f"dovuta ma in attesa, con la data in cui si sblocca."
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v 2>&1 | tail -3
```

Expected: PASS, 42 test

- [ ] **Step 5: Controprova — il cancello morde davvero**

Sostituire temporaneamente il corpo di `azione_permessa` con `return True, ""` e verificare che **quattro** test diventino rossi (`test_azione_sconosciuta...`, `test_attesa_non_scaduta...`) e che gli altri restino verdi. Poi ripristinare e verificare 42/42.
⚠️ Un test mai visto fallire non è provato. Riportare l'output di entrambe le esecuzioni nel report.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/berto/appevolution && git rev-parse --abbrev-ref HEAD
git add scripts/stato.py scripts/tests/test_stato.py
git commit -m "feat(luca): gate the hands in code, not in prose"
```

⛔ Se il branch non è `cc/luca-fase1-occhi-memoria`, non committare: riportalo.

---

### Task 2: Registrare un'azione nei due posti, con una sola chiamata

**Files:**
- Modify: `scripts/stato.py`
- Test: `scripts/tests/test_stato.py`

**Interfaces:**
- Consumes: `AZIONI_CONSENTITE`, `leggi_azioni()`, `_file_azioni()`, `registra()`, `_adesso()`
- Produces:
  - `registra_azione(tipo: str, cosa: str, perche: str, risultato: str) -> dict` — solleva `ValueError` se il tipo non è in whitelist
  - `azioni_dal(data_iso: str) -> list[dict]`

**Nota di progetto — perché due file e non uno:** `azioni.json` lo legge **la macchina** (serve al cancello e ai conteggi), `registro.md` lo legge **Claudio**. Una sola chiamata li scrive entrambi: un'azione presente in uno solo o non è verificabile o non è governabile.

- [ ] **Step 1: Write the failing test**

Aggiungere in fondo a `scripts/tests/test_stato.py`, prima del blocco `if __name__`:

```python
class TestRegistraAzione(BaseStato):
    def test_scrive_in_ENTRAMBI_i_file(self):
        stato.registra_azione(
            "campagna_obiettivo",
            "campagna 120251843794950188 da OUTCOME_TRAFFIC a OUTCOME_LEADS",
            "61 giorni su un obiettivo che non ottimizza per i lead",
            "obiettivo cambiato",
        )
        azioni = stato.leggi_azioni()
        self.assertEqual(len(azioni), 1)
        self.assertEqual(azioni[0]["tipo"], "campagna_obiettivo")
        testo = stato.leggi_registro()
        self.assertIn("campagna_obiettivo", testo, "l'azione deve comparire anche nel registro")
        self.assertIn("61 giorni", testo)

    def test_un_tipo_fuori_whitelist_solleva(self):
        with self.assertRaises(ValueError):
            stato.registra_azione("manda_email", "a un lead", "perche' si", "fatto")
        self.assertEqual(stato.leggi_azioni(), [], "nulla deve essere scritto")

    def test_ogni_azione_ha_id_e_quando(self):
        azione = stato.registra_azione("coda_apri", "cosa", "perche'", "risultato")
        self.assertTrue(azione["id"])
        self.assertTrue(azione["quando"].endswith("+00:00"))

    def test_dopo_averla_registrata_il_cancello_la_blocca(self):
        stato.registra_azione("campagna_obiettivo", "cosa", "perche'", "fatto")
        ok, motivo = stato.azione_permessa("campagna_obiettivo")
        self.assertFalse(ok, "l'attesa di 7 giorni deve scattare subito")
        self.assertIn("attesa", motivo)

    def test_azioni_dal_filtra_per_data(self):
        percorso = stato.cartella_stato() / "azioni.json"
        percorso.write_text(json.dumps([
            {"tipo": "coda_apri", "quando": "2026-08-13T09:00:00+00:00", "cosa": "vecchia"},
            {"tipo": "coda_apri", "quando": "2026-08-15T09:00:00+00:00", "cosa": "nuova"},
        ]), encoding="utf-8")
        recenti = stato.azioni_dal("2026-08-14")
        self.assertEqual([a["cosa"] for a in recenti], ["nuova"])

    def test_azioni_dal_senza_azioni_restituisce_lista_vuota(self):
        self.assertEqual(stato.azioni_dal("2026-08-14"), [])
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v 2>&1 | tail -5
```

Expected: FAIL con `AttributeError: module 'stato' has no attribute 'registra_azione'`

- [ ] **Step 3: Write minimal implementation**

Aggiungere in fondo a `scripts/stato.py`:

```python
def registra_azione(tipo, cosa, perche, risultato):
    """Registra un'azione eseguita nei DUE posti, con una sola chiamata.

    `azioni.json` la legge la macchina (il cancello, i conteggi), `registro.md` lo
    legge Claudio. Un'azione presente in uno solo o non e' verificabile o non e'
    governabile: per questo la scrittura e' una sola e li tocca entrambi.

    Un'azione NON e' fatta finche' non e' registrata: domani nemmeno Luca saprebbe
    di averla fatta.
    """
    if tipo not in AZIONI_CONSENTITE:
        raise ValueError(
            f"'{tipo}' non e' un'azione consentita: si prepara per Claudio, "
            f"non si registra come fatta"
        )

    azione = {
        "id": uuid.uuid4().hex[:8],
        "tipo": tipo,
        "cosa": cosa,
        "perche": perche,
        "risultato": risultato,
        "quando": _adesso(),
    }

    azioni = leggi_azioni()
    azioni.append(azione)
    percorso = _file_azioni()
    temporaneo = percorso.with_name(percorso.name + ".tmp")
    temporaneo.write_text(
        json.dumps(azioni, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporaneo, percorso)

    registra(f"[{tipo}] {cosa}", perche, risultato)
    return azione


def azioni_dal(data_iso):
    """Le azioni registrate DOPO quella data, in ordine cronologico.

    Prende la data esplicitamente e non la indovina: dalla Fase 2 la riga di oggi
    in numeri.csv viene scritta all'INIZIO della giornata, quindi "l'ultima riga"
    sarebbe quella di oggi e una funzione che la deducesse restituirebbe sempre
    zero azioni. Il prompt le passa la PENULTIMA riga di numeri.csv.

    Il confronto fra stringhe ISO funziona: "2026-08-15T09:00:00+00:00" > "2026-08-14".
    """
    return [a for a in leggi_azioni() if a.get("quando", "") > data_iso]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests -v 2>&1 | tail -3
```

Expected: PASS, 48 test

- [ ] **Step 5: Controprova — la doppia scrittura è davvero doppia**

Rimuovere temporaneamente la riga `registra(f"[{tipo}] {cosa}", perche, risultato)` e verificare che **`test_scrive_in_ENTRAMBI_i_file` fallisca** mentre gli altri restano verdi. Poi ripristinare e verificare 48/48.
⚠️ È la seconda condizione — gli altri verdi — a dimostrare che il test coglie proprio quella proprietà.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/berto/appevolution && git rev-parse --abbrev-ref HEAD
git add scripts/stato.py scripts/tests/test_stato.py
git commit -m "feat(luca): record an executed action for both readers at once"
```

---

### Task 3: Mettere in esercizio `stato.py` PRIMA che il prompt lo usi

**Files:**
- Modify: `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\stato.py` (copia)

**Interfaces:**
- Consumes: `scripts/stato.py` delle Task 1-2
- Produces: le nuove funzioni disponibili nella cartella viva

⚠️ **Questa task esiste per non ripetere il difetto della Fase 1**, dove il prompt vivo è stato modificato **prima** che i moduli che usa fossero copiati, lasciando il briefing rotto per un'ora. **I moduli si copiano prima, il prompt che li usa dopo.**

- [ ] **Step 1: Copy and verify**

```bash
cd /c/Users/berto/appevolution && cp scripts/stato.py "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/stato.py"
diff scripts/stato.py "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/stato.py" && echo "IDENTICI"
```

Expected: `IDENTICI`

- [ ] **Step 2: Verify the new functions work from the live folder**

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python -c "
import stato
print('whitelist:', sorted(stato.AZIONI_CONSENTITE))
print('cancello su tipo ignoto:', stato.azione_permessa('boh')[0])
print('cancello su campagna_obiettivo:', stato.azione_permessa('campagna_obiettivo'))
print('azioni registrate finora:', len(stato.leggi_azioni()))
"
```

Expected: whitelist con i 4 tipi, `False` sul tipo ignoto, `(True, '')` su `campagna_obiettivo`, `0` azioni.
⛔ **Non registrare nessuna azione in questo passo**: si sta collaudando il cancello, non usandolo.

- [ ] **Step 3: Verify the existing briefing still runs**

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python briefing_luca.py > /dev/null; echo "exit=$?"
```

Expected: `exit=0`. Se non lo è, fermarsi: la copia ha rotto qualcosa che prima funzionava.

- [ ] **Step 4: Commit**

Nessun file del repo cambia in questa task (la cartella viva è fuori da git). Verificare che sia così e non forzare un commit vuoto:

```bash
cd /c/Users/berto/appevolution && git status --porcelain scripts/
```

Expected: nessun output.

---

### Task 4: `SKILL.md` — rinumerazione e memoria a monte del passo fragile

**Files:**
- Modify: `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\SKILL.md`
- Modify: `scripts/scheduled/briefing-luca-ad/SKILL.md` (copia versionata)

**Interfaces:**
- Consumes: `stato.scrivi_numeri()`, `stato.confronta()` (già in esercizio dalla Task 3)
- Produces: l'ordine `PASSO 1 → 2 → 3 → 4` su cui la Task 5 aggiunge il PASSO 5

🔴 **Il file è il prompt di un'azione viva: domani alle 7:45 verrà eseguito così com'è.** Nessuno staging, nessun rollback automatico. Le **quattro proibizioni del PASSO 1** (web, browser, stimare/dedurre/riusare, briefing parziale) sono **intoccabili** e vanno preservate parola per parola.

**Cosa cambia, e perché:** oggi l'ordine è `1 (Ciak) → 1-BIS (MCP) → 1-TER (stato) → 2 (messaggio)`. Il 15/8 il briefing è partito e **non ha scritto memoria**: il passo dello stato sta a valle del passo MCP, che senza permessi blocca l'agente. La memoria dipende **solo** dai dati Ciak: non ha ragione di morire con Meta.

Nuovo ordine, con numeri interi consecutivi:

```
PASSO 1 — Ciak (HTTP)                 → dati interni
PASSO 2 — scrivi lo stato             → riga di oggi: interni valorizzati, esterni a None
PASSO 3 — Meta / Systeme (MCP)        → dati esterni
PASSO 4 — aggiorna lo stato (upsert)  → la STESSA riga, colonne esterne riempite + confronto
PASSO 5 — (Task 5) decidi ed esegui
PASSO 6 — il messaggio a Claudio
```

- [ ] **Step 1: Back up and read**

```bash
cp "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md.bak-pre-fase2"
cat "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
```

⛔ Il backup `SKILL.md.bak-fase1` **non si tocca**: è un file diverso e resta com'è.

- [ ] **Step 2: Renumber and move the state block**

1. `PASSO 1-BIS` → **`PASSO 3`** (contenuto invariato, cambia solo il numero e i riferimenti interni: la riga che dice *"Nel messaggio del PASSO 2"* diventa *"Nel messaggio del PASSO 6"*).
2. `PASSO 1-TER` → si **spezza in due**: il blocco che **scrive** diventa **`PASSO 2`** e va **prima** del PASSO 3; il blocco che **aggiorna e legge il confronto** diventa **`PASSO 4`** e va dopo.
3. `PASSO 2` (il messaggio) → **`PASSO 6`**, contenuto delle tre sezioni **invariato**.

Testo del nuovo **PASSO 2**:

```
PASSO 2 — Scrivi SUBITO lo stato con i dati che hai. Non aspettare le fonti esterne.

Il 15/8/2026 questo passo stava dopo il PASSO 3 e il briefing e' partito senza scrivere nulla: il passo MCP si e' bloccato e si e' portato dietro anche la memoria, che dipende solo dai dati Ciak. Un dato che hai in mano si scrive quando ce l'hai, non alla fine.

Esegui con lo strumento PowerShell, mettendo i valori dal PASSO 1 e `None` in TUTTE le colonne esterne (`meta_campagna_obiettivo`, `meta_spesa_giorno`, `meta_lead_giorno`, `giorni_silenzio_social`, `contatti_systeme`): al PASSO 4 le riempirai se arrivano.

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato; stato.scrivi_numeri({'data':'AAAA-MM-GG','lead_oggi':N,'diagnosi_oggi':N,'ingressi_evo_mese':N,'partner_attivi':N,'partner_fermi':N,'partner_attesa_ok':N,'checkout_non_pagati':N,'meta_campagna_obiettivo':None,'meta_spesa_giorno':None,'meta_lead_giorno':None,'giorni_silenzio_social':None,'contatti_systeme':None,'sito_ok':TUTTE_OK})"

⛔ `TUTTE_OK` e' un segnaposto: sostituiscilo con `True` o `False` copiando `fonti.sito.dati.tutte_ok` dall'output del PASSO 1. Se la busta `fonti.sito` manca o non e' `ok`, scrivi `None`.
```

Testo del nuovo **PASSO 4**:

```
PASSO 4 — Aggiorna la riga di oggi con cio' che il PASSO 3 ha portato, e leggi il confronto con ieri.

La scrittura fa UPSERT sulla data: rieseguirla aggiorna la riga di oggi, non ne aggiunge una seconda. Rimetti gli stessi valori interni del PASSO 2 e in piu' quelli esterni; per ogni fonte non letta lascia `None` — MAI `0`, che direbbe a Claudio che la campagna non ha speso.

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato; stato.scrivi_numeri({'data':'AAAA-MM-GG','lead_oggi':N,'diagnosi_oggi':N,'ingressi_evo_mese':N,'partner_attivi':N,'partner_fermi':N,'partner_attesa_ok':N,'checkout_non_pagati':N,'meta_campagna_obiettivo':'OUTCOME_X','meta_spesa_giorno':N,'meta_lead_giorno':N,'giorni_silenzio_social':N,'contatti_systeme':N,'sito_ok':TUTTE_OK})"

Poi leggi il confronto:

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato, json; print(json.dumps(stato.confronta({'data':'AAAA-MM-GG'}), ensure_ascii=False))"

Se il PASSO 3 non e' stato eseguito affatto, salta l'aggiornamento e leggi solo il confronto: la riga di oggi c'e' gia' dal PASSO 2 e va bene cosi', con le colonne esterne vuote.

Il confronto VA RIPORTATO nel messaggio del PASSO 6, dentro "1) ACQUISIZIONE": per ogni numero che si muove si dice di quanto rispetto a ieri, e le colonne con `delta` a `null` si dichiarano non confrontabili invece di essere omesse. Se risponde `prima_misurazione`, scrivi "prima misurazione, nessun confronto" — non inventare un andamento. Un confronto calcolato e non scritto e' un confronto che Claudio non ha.
```

- [ ] **Step 3: Copy to the repo and verify they are identical**

```bash
cp "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md" /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad/SKILL.md
diff "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md" /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad/SKILL.md && echo "IDENTICI"
```

- [ ] **Step 4: Verify the prohibitions and the order**

```bash
grep -n "cercare sul web" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
grep -n "^PASSO" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
grep -n "PASSO 1-BIS\|PASSO 1-TER" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
```

Expected: il divieto ancora testuale · l'ordine `PASSO 1 · PASSO 2 · PASSO 3 · PASSO 4 · PASSO 6` · **nessun** residuo di `1-BIS` o `1-TER`.
⛔ Se resta un riferimento a un numero vecchio, correggerlo: un rimando a un passo che non esiste più manda l'agente a cercare qualcosa che non c'è.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/berto/appevolution && git rev-parse --abbrev-ref HEAD
git add scripts/scheduled/briefing-luca-ad/SKILL.md
git commit -m "docs(luca): write the memory before the step that can block"
```

---

### Task 5: `SKILL.md` — la procedura a sei passi e le mani

**Files:**
- Modify: `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\SKILL.md`
- Modify: `scripts/scheduled/briefing-luca-ad/SKILL.md`

**Interfaces:**
- Consumes: `stato.azione_permessa()`, `stato.registra_azione()`, `stato.azioni_dal()`
- Produces: il `PASSO 5` e la riga *"cosa ho fatto"* nel messaggio

- [ ] **Step 1: Insert PASSO 5, between PASSO 4 and PASSO 6**

```
PASSO 5 — Decidi ed esegui. E' qui che smetti di essere un report e diventi un AD.

PRIMA DI TUTTO, TROVA IL COLLO DI BOTTIGLIA: fra tutti i numeri che hai davanti, qual e' l'UNICO che, se cambiasse, sposterebbe anche gli altri? Scrivilo in una riga. Non e' il numero peggiore: e' quello a monte. Esempio reale: se la campagna spende e porta zero lead, il collo di bottiglia non e' "pochi lead" ma l'obiettivo della campagna, e agire sui lead senza toccare l'obiettivo e' spingere una porta chiusa.
Tutto quello che decidi dopo deve puntare li'. Se una mossa non tocca il collo di bottiglia, probabilmente e' rumore.

Poi classifica ogni cosa che hai visto:
- PORTA A DUE VIE (reversibile): decidila subito e falla, se e' in whitelist.
- PORTA A UNA VIA (costosa o irreversibile): NON la fai. Porti 2-3 opzioni con i numeri e una raccomandazione, e decide Claudio.

Il confine non e' "quanto e' importante" ma "e' reversibile?". Un obiettivo di campagna si rimette com'era. Un messaggio partito a una persona no, un budget speso nemmeno.

PRIMA di ogni azione chiedi il permesso al codice, non a te stesso:

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato; print(stato.azione_permessa('TIPO'))"

⛔ `TIPO` e' un SEGNAPOSTO, non un valore: sostituiscilo con uno dei nomi della lista qui sotto (`campagna_obiettivo`, `pubblica_post`, `coda_apri`, `coda_chiudi`). Se lo lasci scritto cosi', il cancello risponde `False` perche' "TIPO" non e' un'azione consentita — ed e' giusto che risponda cosi'.

Se risponde `(False, motivo)` NON eseguire: riporta il motivo nel messaggio come azione dovuta ma in attesa. Se risponde `(True, '')` esegui, e SUBITO DOPO registra (anche qui `TIPO` va sostituito):

    python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato; stato.registra_azione('TIPO','cosa hai fatto','perche','risultato')"

⛔ Un'azione NON e' fatta finche' non e' registrata: domani nemmeno tu sapresti di averla fatta, e nessuno potrebbe annullarla.

LE AZIONI CHE PUOI FARE, e nessun'altra:
- `campagna_obiettivo` — se una campagna attiva NON ha un obiettivo di tipo Lead, rimettila su Lead con `meta_update_campaign`. E' il caso vero: la campagna 120251843794950188 e' su OUTCOME_TRAFFIC dal 15/6/2026 e spende senza ottimizzare per i contatti. Attesa fra due esecuzioni: 7 giorni, perche' cambiare obiettivo azzera l'apprendimento di Meta.
- `pubblica_post` — pubblica un contenuto GIA' in coda e GIA' approvato, con `ig_publish_carousel` o `fb_publish_post`. Attesa: 1 giorno. ⛔ Non inventare il contenuto: se la coda e' vuota, la mossa e' preparare il contenuto, non pubblicarne uno nuovo di tua iniziativa.
- `coda_apri` / `coda_chiudi` — assegna o chiudi un'azione, con UN SOLO responsabile.

⛔ FUORI DALLE TUE MANI, sempre: budget e ricariche · prezzi e sconti · contratti · credenziali · deploy · QUALUNQUE messaggio 1:1 verso una persona (un post si cancella, un DM no) · OGNI scrittura dentro Ciak, che passa dal token di Claudio. Su queste prepari e decide lui.
```

- [ ] **Step 2: Add the "what I did" line to PASSO 6**

Aggiungere come **primo** punto della sezione `1) ACQUISIZIONE` del PASSO 6:

```
   - COSA HO FATTO IO dall'ultimo briefing: leggi le azioni con
     python -c "import sys; sys.path.insert(0, r'C:\Users\berto\Claude\Scheduled\briefing-luca-ad'); import stato, json; print(json.dumps(stato.azioni_dal('DATA-PENULTIMA-RIGA'), ensure_ascii=False))"
     dove DATA-PENULTIMA-RIGA e' la data della penultima riga di numeri.csv, cioe' il giorno del briefing precedente. Per ognuna: cosa, perche', risultato. Se non ne hai fatta nessuna scrivi "nessuna azione" — non omettere la riga. Va per PRIMA: Claudio deve sapere cosa si e' mosso senza di lui prima di ogni altro numero.
```

- [ ] **Step 3: Copy to the repo and verify**

```bash
cp "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md" /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad/SKILL.md
diff "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md" /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad/SKILL.md && echo "IDENTICI"
grep -n "^PASSO" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
grep -c "azione_permessa\|registra_azione\|azioni_dal" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
grep -n "cercare sul web" "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
```

Expected: `IDENTICI` · ordine `1 · 2 · 3 · 4 · 5 · 6` · almeno 3 riferimenti alle nuove funzioni · divieto sul web ancora testuale.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/berto/appevolution && git rev-parse --abbrev-ref HEAD
git add scripts/scheduled/briefing-luca-ad/SKILL.md
git commit -m "docs(luca): give Luca named hands and make him ask the code first"
```

---

### Task 6: Collaudo end-to-end

**Files:** nessuno modificato — è una verifica.

- [ ] **Step 1: Full suite**

```bash
cd /c/Users/berto/appevolution && python -m unittest discover -s scripts/tests 2>&1 | tail -3
```

Expected: 48 test, OK.

- [ ] **Step 2: The gate says no to what it must**

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python -c "
import stato
for tipo in ('campagna_obiettivo','pubblica_post','coda_apri','manda_email_al_lead','deploy'):
    print(tipo, '->', stato.azione_permessa(tipo))
"
```

Expected: i primi tre `(True, '')`, gli ultimi due `(False, ...)` con un motivo che dice di prepararli per Claudio.

- [ ] **Step 3: The memory no longer depends on the fragile step**

Simulare la giornata: scrivere la riga di oggi con **solo** i dati interni (come farebbe il PASSO 2), poi verificare che esista e che le colonne esterne siano **vuote, non zero**.

```bash
cd "/c/Users/berto/Claude/Scheduled/briefing-luca-ad" && python -c "
import stato
righe = stato.leggi_numeri()
print('righe totali:', len(righe))
print('ultima riga:', righe[-1] if righe else 'nessuna')
"
```

Riportare l'output. ⛔ **Non inventare una riga per far tornare la prova**: se oggi il briefing non ha ancora scritto, si dichiara e basta.

- [ ] **Step 4: Verify the two copies match**

```bash
diff /c/Users/berto/appevolution/scripts/stato.py "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/stato.py"
diff /c/Users/berto/appevolution/scripts/scheduled/briefing-luca-ad/SKILL.md "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/SKILL.md"
ls -1 "/c/Users/berto/Claude/Scheduled/briefing-luca-ad/"
```

Expected: entrambi i `diff` vuoti; nella cartella `SKILL.md`, `SKILL.md.bak-fase1`, `SKILL.md.bak-pre-fase2`, i tre `.py`, `stato/`.

---

### Task 7: `LUCA_AD_SYSTEM` — dentro Ciak Luca PREPARA

**Files:**
- Modify: `backend/routers/admin_luca.py` (righe ~61-64, dentro `LUCA_AD_SYSTEM`)

⚠️ **È un file del backend: il merge su `main` fa partire un deploy automatico su Cloud Run.** Ultimo task apposta.

**Perché:** le righe 61-64 dicono a Luca che dentro Ciak esegue — rigenera documenti, assegna task, ricostruisce stati. **Non può:** il commit `fa110052` del 30/7 ha chiuso 61 endpoint admin e ogni scrittura sui dati partner richiede il JWT di Claudio. Un prompt che promette un'esecuzione impossibile fa promettere a Luca, in chat, cose che non farà.

- [ ] **Step 1: Read the current block**

```bash
cd /c/Users/berto/appevolution && sed -n '55,75p' backend/routers/admin_luca.py
```

- [ ] **Step 2: Replace the execution block**

Sostituire il blocco `── 1. ESECUZIONE — l'operativita' dentro Ciak. Qui AGISCI. ──` con:

```
── 1. ESECUZIONE — l'acquisizione. Qui AGISCI. ──
Su questa parte non chiedi il permesso di fare il tuo lavoro: fai, e poi riporti cosa hai fatto.
Rientrano: rimettere una campagna su un obiettivo di tipo Lead quando non lo e' · pubblicare sui canali social del brand un contenuto gia' in coda e approvato · tenere il calendario editoriale e la coda · assegnare un'azione a UN solo responsabile con una scadenza · verificare i numeri alla fonte.
Regola: prima di agire chiedi il permesso al codice (la whitelist e l'attesa fra due esecuzioni), poi fai, poi REGISTRI. Un'azione non registrata non e' fatta.

── 2. PREPARAZIONE — dentro Ciak e sul business. Qui PREPARI, decide Claudio. ──
⛔ Dentro Ciak NON puoi scrivere: dal 30/7/2026 ogni scrittura sui dati partner passa da un token admin che ha solo Claudio, ed e' una decisione di sicurezza voluta. Quindi documenti, stati del journey, task ai reparti: li PREPARI (payload validati, brief, materiali) e li esegue lui.
Rientrano anche: soldi, pagamenti, rimborsi, rateizzazioni · prezzi e sconti · contratti, firme, legale · QUALUNQUE comunicazione che esce verso una persona · abbandoni e sospensioni · credenziali · deploy.
Qui porti 2-3 opzioni con i numeri e una raccomandazione chiara. Non esegui.
```

⛔ **Non toccare** i 20 principi, il semaforo, gli obiettivi, il protocollo decisionale né `{context}`: il segnaposto viene sostituito con `.replace("{context}", ...)` e se sparisce Luca perde lo stato live **senza errori visibili**.

- [ ] **Step 3: Verify the file still compiles and the placeholder survives**

```bash
cd /c/Users/berto/appevolution && python -m py_compile backend/routers/admin_luca.py && echo "COMPILA"
grep -c "{context}" backend/routers/admin_luca.py
grep -n "20\. EFFICACIA" backend/routers/admin_luca.py
```

Expected: `COMPILA` · **almeno 2** occorrenze di `{context}` (la stringa nel prompt e la `.replace`) · il principio 20 ancora presente.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/berto/appevolution && git rev-parse --abbrev-ref HEAD
git add backend/routers/admin_luca.py
git commit -m "fix(luca): stop promising an execution the platform does not allow"
```

---

## Criterio di riuscita

**Il briefing riporta di aver rimesso la campagna su Lead, con il motivo, e `azioni.json` e `registro.md` lo confermano.**

⚠️ **Non succederà finché i permessi MCP non sono approvati** sul task `briefing-luca-ad` (oggi **zero**). Senza, il PASSO 3 non gira e nessuna azione su Meta è possibile. ✅ Ma dopo la Task 4 **la memoria si scrive comunque**, e questo si vede già domani: `numeri.csv` deve avere una riga nuova anche a permessi mancanti.

## Cosa resta fuori

Fase 3 — la chat di Ciak che legge la stessa coda e lo stesso registro, così Luca-in-Ciak e Luca-schedulato smettono di essere due.
