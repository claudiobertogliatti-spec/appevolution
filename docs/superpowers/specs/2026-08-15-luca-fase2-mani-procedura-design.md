# Luca Fase 2 — le mani e la procedura del mattino

**Data:** 15/8/2026 · **Stato:** approvato nelle decisioni, da implementare
**Fase 1:** in esercizio dal 14/8 — spec `2026-08-14-luca-agente-esecutivo-design.md`, PR #26

---

## 1. Da dove si parte, verificato alla fonte

### 1.1 La Fase 1 gira ma stamattina non ha prodotto memoria
- Il task è partito: `lastRunAt = 2026-08-15T05:50:14Z` (07:50 locali).
- `approvedPermissions` su `briefing-luca-ad`: **0** (`gaia-motore-vendite` ne ha 5).
- `stato\numeri.csv` contiene **solo la riga del 14/8**: nessuna riga di oggi.
- Il meccanismo **non è rotto**: riprodotto su una copia della cartella viva, la scrittura riesce e
  `confronta()` restituisce delta reali.

🔎 **Deduzione, dichiarata come tale** (il log di quell'esecuzione non è accessibile): il passo che
scrive la memoria sta **a valle** del passo che chiama i tool MCP, e quei tool non hanno permessi.
Un task automatico che incontra una richiesta di approvazione non ha nessuno a cui chiederla.

⚠️ **Il difetto è strutturale, non istruzionale, ed è nato dalla correzione finale della Fase 1**:
è stata messa la memoria a valle del passo più fragile. La memoria dipende **solo** dai dati Ciak,
che funzionano: non aveva ragione di morire con Meta. **Una regola nel prompt non lo risolve**,
perché un blocco per permessi non è un errore che l'agente può intercettare — è l'agente che si ferma.

### 1.2 «Luca esegue dentro Ciak» oggi è impossibile
Il mandato del 12/8 (`LUCA_AD_SYSTEM`, righe 61-64) dice che Luca esegue l'operatività dentro Ciak:
rigenera documenti, assegna task, ricostruisce stati. **Non può.** Il commit `fa110052` del 30/7 ha
chiuso 61 endpoint admin: ogni scrittura sui dati partner richiede un JWT admin che vive dietro il
login di Claudio. La regola registrata è esplicita: *"Claude prepara il payload, Claudio esegue"* ·
*"non tentare di aggirare l'auth: la chiusura è una decisione di sicurezza voluta"*.

**È lo stesso schema della chat senza tool**: un mandato scritto che l'infrastruttura non consente.
Stavolta però il muro è una scelta di sicurezza corretta, non una dimenticanza.

### 1.3 Cosa Luca può davvero eseguire, oggi
| Azione | Può | Con cosa |
|---|---|---|
| Cambiare l'obiettivo di una campagna Meta | ✅ | `meta_update_campaign` |
| Pubblicare su IG/FB | ✅ | `ig_publish_carousel` · `fb_publish_post` (provato il 14/8) |
| Gestire coda e registro | ✅ | file locali |
| Scrivere dentro Ciak | ⛔ | token admin, di Claudio |

---

## 2. Decisioni

| # | Decisione | Da chi |
|---|---|---|
| D1 | Le mani restano **sull'acquisizione**. Dentro Ciak Luca **prepara**, esegue Claudio. | Claudio, 15/8 |
| D2 | Non si costruisce un canale di scrittura verso Ciak in questa fase. | Claudio, 15/8 |
| D3 | La memoria si scrive **prima** del passo fragile, e si aggiorna dopo (upsert). | Luca |
| D4 | Le mani sono una **whitelist di azioni con nome**, non il principio "è reversibile". | Luca |
| D5 | `LUCA_AD_SYSTEM` va corretto: dentro Ciak **prepara**, non esegue. | Luca |

---

## 3. Architettura

### 3.1 La memoria non dipende più dal passo fragile
`scrivi_numeri()` fa già **upsert sulla data**: due scritture nello stesso giorno aggiornano la riga
invece di duplicarla. Si sfrutta quella proprietà per scrivere **due volte**:

⚠️ **I passi si rinumerano in sequenza pulita.** Oggi il file vivo ha `1 → 1-BIS → 1-TER → 2`, una
numerazione già cresciuta per aggiunte successive; invertire l'ordine con quei nomi produrrebbe un
`1-TER` che viene prima di un `1-BIS`. In Fase 2 il `SKILL.md` viene comunque riscritto sui sei passi:
si passa a numeri interi consecutivi.

```
PASSO 1 — Ciak (HTTP)                 → dati interni
PASSO 2 — scrivi lo stato             → riga di oggi: interni valorizzati, esterni a None
PASSO 3 — Meta / Systeme (MCP)        → dati esterni
PASSO 4 — aggiorna lo stato (upsert)  → la STESSA riga, colonne esterne riempite
PASSO 5 — decidi ed esegui            → whitelist, cancello, registro
PASSO 6 — il messaggio a Claudio
```

👉 **Se tutto ciò che viene dopo muore, la riga di oggi esiste comunque.** Vale anche a permessi
concessi: un'API cade quando vuole. ⛔ Le colonne esterne non riempite restano **vuote, mai `0`**.

### 3.2 La procedura del mattino — sei passi, sempre gli stessi
1. **LEGGI** le cinque fonti. Ogni fonte caduta si dichiara.
2. **CONFRONTA** con `numeri.csv`: cosa si è mosso, cosa è fermo e **da quanti giorni**.
3. **TROVA IL COLLO DI BOTTIGLIA**: l'unico numero che, se cambiasse, sposterebbe gli altri.
4. **CLASSIFICA** ogni azione: porta a due vie → la faccio · porta a una via → la preparo per Claudio.
5. **ESEGUI** le porte a due vie **che sono in whitelist**, e registra cosa/perché/risultato.
6. **CONSEGNA** un messaggio solo: cosa ho fatto · cosa aspetta te · l'unica mossa di oggi ·
   distanza dal gate.

I 20 principi di `LUCA_AD_SYSTEM` **non si toccano**: smettono di essere una vetrina e diventano il
*come* dei sei passi. Bezos (Type 1/Type 2) nel passo 4, Grove (leva) nel 6, Toyota (vai a vedere)
nell'1, Dalio (registro) nel 5.

### 3.3 Le mani — una whitelist, e il cancello sta nel CODICE
⛔ **Non** "Luca esegue ciò che è reversibile": troppo vago per un agente che tocca un account
pubblicitario vero. Una lista di azioni **con nome**, e tutto ciò che non è in lista si prepara.

| `tipo` | Cosa fa | Reversibile perché | Attesa fra due esecuzioni |
|---|---|---|---|
| `campagna_obiettivo` | rimette una campagna Meta su un obiettivo di tipo Lead | si rimette com'era | **7 giorni** |
| `pubblica_post` | pubblica un contenuto **già in coda e approvato** | un post si cancella | **1 giorno** |
| `coda_apri` / `coda_chiudi` | apre o chiude un'azione in coda | file locale | nessuna |

🔑 **La differenza di progetto che conta:** il cancello non è una frase nel prompt, è **una funzione
Python testabile senza rete**. `SKILL.md` istruisce, `stato.py` **autorizza e registra**. Un prompt
si può interpretare male; una funzione che restituisce `False` no.

⛔ **Fuori dalle mani, invariato dal 12/8:** budget e spesa · ricariche di credito · prezzi e sconti ·
contratti · credenziali · deploy · **qualunque messaggio 1:1 verso una persona** · **ogni scrittura
dentro Ciak**.

**Perché l'attesa non è burocrazia:** cambiare l'obiettivo di una campagna azzera l'apprendimento di
Meta. Un agente che "ottimizza" ogni mattina su tre giorni di rumore fa più danno di uno fermo.

### 3.4 Nuove funzioni in `stato.py`
| Funzione | Contratto |
|---|---|
| `AZIONI_CONSENTITE` | dict `{tipo: {"attesa_giorni": int, "descrizione": str}}` |
| `azione_permessa(tipo, adesso)` | `(True, "")` oppure `(False, motivo)` — nega se il tipo non è in whitelist **o** se l'attesa non è scaduta |
| `registra_azione(tipo, cosa, perche, risultato)` | scrive in `azioni.json` **e** in `registro.md` con una sola chiamata; solleva `ValueError` se il tipo non è in whitelist |
| `ultima_azione(tipo)` | l'ultima azione di quel tipo, o `None` |
| `azioni_dal(data_iso)` | le azioni registrate **dopo** quella data, in ordine cronologico — è la riga *"cosa ho già fatto"* del messaggio |

⚠️ **`azioni_dal()` prende la data esplicitamente, non la indovina.** Una firma tipo
*"azioni dall'ultimo briefing"* dovrebbe dedurre quale sia l'ultimo briefing, e dal 3.1 la riga di
oggi viene scritta **all'inizio** della giornata: "l'ultima riga" sarebbe quella di oggi e la funzione
restituirebbe sempre zero azioni. Il `SKILL.md` le passa la data della **penultima** riga di
`numeri.csv` — cioè il giorno del briefing precedente.

**Due file, due consumatori diversi, una sola chiamata che li scrive entrambi:** `azioni.json` è
leggibile dalla macchina (serve per l'attesa e per il conteggio), `registro.md` è la narrazione che
legge Claudio. ⛔ Scriverne uno solo dei due non è consentito: un'azione che non è in entrambi non è
verificabile né annullabile.

### 3.5 Il registro come vincolo
Un'azione **non è fatta finché non è registrata**. Nel `SKILL.md`: si chiama `azione_permessa()`
**prima**, si esegue, si chiama `registra_azione()` **subito dopo**, e solo allora la si riporta nel
messaggio. Un'azione eseguita e non registrata è un'azione che domani nemmeno Luca sa di aver fatto.

### 3.6 La correzione di onestà su `LUCA_AD_SYSTEM`
Le righe 61-64 promettono un'esecuzione dentro Ciak che non è possibile. Vanno riscritte: dentro Ciak
Luca **prepara** (payload validati offline, brief, materiali) e **esegue Claudio**; le mani sono
sull'acquisizione, con la whitelist. ⚠️ È un file del backend: il merge su `main` fa partire un
deploy automatico. **Ultimo passo del piano, dichiarato.**

---

## 4. Perimetro

**Dentro:** robustezza della memoria (3.1) · procedura a 6 passi (3.2) · whitelist + cancello in
codice (3.3, 3.4) · registro come vincolo (3.5) · correzione del prompt (3.6).

**Fuori:** qualunque scrittura verso Ciak · canale di scrittura nuovo · Fase 3 (la chat di Ciak che
legge la stessa coda).

---

## 5. Errori e casi limite

| Caso | Comportamento |
|---|---|
| `azione_permessa()` nega per attesa non scaduta | non si esegue; si **riporta nel messaggio** che l'azione è dovuta ma in attesa, con la data in cui si sblocca |
| Tipo non in whitelist | `registra_azione()` solleva `ValueError`; l'azione si prepara per Claudio |
| L'azione Meta fallisce a metà | si registra comunque con `risultato` = l'errore testuale: un tentativo fallito è un fatto, non un non-evento |
| `azioni.json` assente | trattato come lista vuota, creato alla prima scrittura |
| Il passo MCP non parte (permessi) | la riga di oggi è **già scritta** (3.1); le colonne esterne restano vuote e il messaggio lo dichiara |
| Nessuna azione eseguita oggi | la riga *"cosa ho fatto"* dice **"nessuna azione"**, non si omette |

⛔ Restano in vigore i divieti della Fase 1: niente web, niente browser per rimediare, niente stime,
niente riuso dei numeri di ieri, niente briefing "indicativo".

---

## 6. Collaudo

| Test | Come si verifica |
|---|---|
| Whitelist | un tipo inventato → `ValueError`; i tre tipi noti → accettati |
| Attesa | eseguita oggi `campagna_obiettivo`, `azione_permessa()` nega per 7 giorni e concede l'8° |
| Doppia scrittura | `registra_azione()` scrive in **entrambi** i file; nessuno dei due resta indietro |
| Memoria a monte | simulando il fallimento totale del passo MCP, la riga di oggi **esiste** con gli interni valorizzati e gli esterni vuoti |
| Upsert | la seconda scrittura **aggiorna** la riga, non ne aggiunge una |
| `azioni_dall_ultimo_briefing()` | con azioni prima e dopo l'ultima riga, restituisce solo quelle dopo |
| Controprova (per ogni test protettivo) | rompere di proposito la proprietà e verificare **(a)** che il test diventi rosso **e (b)** che gli altri restino verdi |

**Il criterio di riuscita, in una frase:** *il briefing riporta di aver rimesso la campagna su Lead,
con il motivo, e il registro lo conferma.*

---

## 7. Limiti dichiarati

1. **Niente di tutto questo parte senza i permessi MCP** sul task `briefing-luca-ad` (oggi **zero**).
   Senza, non c'è né lettura esterna né azione su Meta: resta la memoria, che dopo il punto 3.1
   funziona comunque.
2. **Gira solo ad app desktop aperta.** Invariato dalla Fase 1.
3. **Dentro Ciak Luca non esegue**, e dopo 3.6 il prompt smette di dire il contrario. Riaprirlo è una
   decisione di sicurezza di Claudio, non un'estensione tecnica.
4. **La whitelist è volutamente piccola.** Si allarga quando un'azione ha dimostrato di servire, non
   prima: è la stessa regola del "niente infrastruttura prima della validazione".
