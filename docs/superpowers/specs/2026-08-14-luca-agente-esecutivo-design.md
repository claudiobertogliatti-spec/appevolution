# Luca, agente esecutivo — design

**Data:** 14/8/2026 · **Stato:** approvato nelle decisioni, da implementare
**Mandato:** Claudio, 14/8/2026 — *"Luca deve avere il cervello di Bezos (o altri fai tu) e ogni giorno
essere autonomo nel settore acquisizioni — saper esattamente cosa fare per coordinare il team nella
delivery e propormi soluzioni efficaci nella gestione del business analizzando i numeri prodotti"*

---

## 1. Il problema, verificato alla fonte

Quattro fatti, ognuno con la sua prova. Nessuno è dedotto.

### 1.1 Luca dentro Ciak non ha mani
`backend/routers/admin_luca.py:432` chiama `client.messages.create(model, max_tokens, system, messages)`.
`grep -n "tools" backend/routers/admin_luca.py` → **zero occorrenze**.

La "doppia modalità — ESEGUE" scritta in `LUCA_AD_SYSTEM` il 12/8 (righe 61-72) è un mandato dato a un
agente che fisicamente non può eseguire nulla. Può solo scrivere che lo farebbe.

**Corollario:** la riga 206 del prompt — *"COSA HAI GIÀ FATTO TU dall'ultimo briefing"* — è oggi
**impossibile da eseguire due volte**: niente tool per fare, niente memoria per ricordare.

### 1.2 Il briefing schedulato funziona, ma è cieco fuori casa
`lastRunAt = 2026-08-14T05:50:22Z` — gira davvero, il canale headless del 30/7 regge.
Ma `briefing_luca.py:30-33` ha esattamente due fonti, entrambe interne a Ciak:
`/api/admin/luca/daily-report` e `/api/admin/ciak/acquisizione-command-center`.

### 1.3 La prova che il buco è reale (misurata il 14/8, dopo il briefing delle 07:45)
Due chiamate MCP hanno trovato due fatti che il briefing di stamattina non poteva vedere:

- 🔴 **Campagna Meta ancora su Traffico.** ID `120251843794950188`, `OUTCOME_TRAFFIC`, `ACTIVE`,
  attiva dal **15/6/2026** → 60 giorni su un obiettivo che non ottimizza per i Lead.
  *(La memoria del 14/8 la dava a 24 giorni dal fix: alla fonte, il fix non è mai atterrato.)*
- 🟢 **Social non più fermo.** Ultimo post IG: **14/8/2026 10:34** (carosello "5 errori",
  `DcBHFoQHDUZ`). Il precedente: 26/6/2026. Il silenzio di 49 giorni si è chiuso stamattina.

**Un report che guarda solo dentro casa non è un report.**

### 1.4 Nessuna memoria e nessun permesso
- Il briefing produce un messaggio che muore lì: nessuna coda, nessun registro, nessuna serie storica.
- Nel registro `scheduled-tasks.json`, il task `briefing-luca-ad` ha **`approvedPermissions` assente**
  (`gaia-motore-vendite` ne ha 5). Un task senza permessi approvati non può usare tool MCP da solo.
- `userSelectedFolders` include `C:\Users\berto\Desktop\appevolution`, che **non esiste**.

### 1.5 Diagnosi
Ci sono due Luca, in due corpi, e **chi vede non può agire mentre chi potrebbe agire non vede**:

| | Occhi | Mani | Memoria |
|---|---|---|---|
| Luca-in-Ciak (`/chat`) | contesto live 4 reparti | ⛔ nessun tool | storico chat su Mongo |
| Luca-schedulato (7:45) | ⛔ 2 endpoint interni | 🟡 potenziali, zero permessi | ⛔ azzerata ogni notte |

---

## 2. Decisioni prese

| # | Decisione | Da chi | Motivo |
|---|---|---|---|
| D1 | Il Luca esecutivo vive nel **task schedulato**, non nella chat di Ciak | implicita nella richiesta | "ogni giorno autonomo" richiede un corpo che si svegli da solo; la chat è reattiva |
| D2 | **Non si aggiunge un 21° framework** al cervello | Luca, accettato | Bezos è già dentro (principi 3-6) insieme ad altri 19. Un prompt che elenca framework produce risposte che li citano invece di decidere |
| D3 | Su acquisizione Luca **pubblica e corregge** da solo, Meta inclusa | Claudio, 14/8 | Lettura piena del richiamo: chi fa l'analisi deve poter rimediare |
| D4 | Si parte da **occhi + memoria** (Fase 1) | Claudio, 14/8 | Le mani senza memoria non sanno cosa hanno già fatto |
| D5 | Il perimetro fuori resta quello del 12/8 | invariato | soldi, budget, prezzi, contratti, credenziali, deploy, **e ogni messaggio 1:1 a una persona** |

### Il confine, invariato
Non è *"quanto è importante"* ma **"è reversibile?"**. Una campagna rimessa su Lead si rimette su
Traffico. Un post si cancella. Un DM a un lead no, un budget speso no.

---

## 3. Architettura — Il Ciclo Giornaliero

Tre organi più una procedura. Ogni organo ha uno scopo solo e un'interfaccia dichiarata.

```
07:45  ┌─────────────┐   ┌──────────────┐   ┌───────────┐   ┌──────────┐
  ───► │ OCCHI       │──►│ PROCEDURA    │──►│ MANI      │──►│ MEMORIA  │
       │ 5 fonti     │   │ 6 passi      │   │ reversib. │   │ 3 file   │
       └─────────────┘   └──────────────┘   └───────────┘   └────┬─────┘
              ▲                                                   │
              └───────────── confronto con ieri ──────────────────┘
                                     │
                                     ▼
                        messaggio a Claudio (una volta)
```

### 3.1 OCCHI — due sensori, non uno

**Vincolo che determina l'architettura:** `briefing_luca.py` è stdlib pura e headless; i tool MCP
esistono solo dentro la sessione dell'agente. Gli occhi sono quindi necessariamente due.

**Sensore A — Python (`briefing_luca.py`)**, ciò che si legge via HTTP:

| Fonte | Come | Nuovo? |
|---|---|---|
| Ciak · daily-report | `X-Report-Key` | esistente |
| Ciak · acquisizione-command-center | `X-Report-Key` | esistente |
| Sito ciak.io · funnel vivo | `GET` su 3 URL, si registra lo status code | **nuovo** |

Le 3 URL del sensore sito, esplicite perché non si indovinino:
`https://www.ciak.io/` · `https://www.ciak.io/masterclass` · `https://www.ciak.io/api/health`.
Si registra **solo lo status code e il tempo di risposta** — nessun parsing del contenuto: un funnel
che risponde 200 con la pagina sbagliata è un problema di Fase 2, non di questo sensore.

**Sensore B — MCP (chiamato da Luca, guidato da `SKILL.md`)**:

| Fonte | Tool | Cosa risponde |
|---|---|---|
| Meta Ads | `meta_list_campaigns`, `meta_get_insights` | obiettivo, stato, spesa, lead |
| Meta Social | `ig_list_media`, `fb_list_posts` | ultimo post, giorni di silenzio |
| Systeme | `get_contacts`, `get_tags` | contatti, tag, crescita lista |

**Contratto uniforme.** Ogni fonte, da qualunque sensore, produce la stessa busta:

```json
{ "fonte": "meta_ads", "ok": true, "letto_a": "2026-08-14T05:45:00Z",
  "dati": { }, "errore": null }
```

Chi consuma non deve sapere da quale sensore arriva un dato.

**Degradazione parziale — la regola che concilia i due vincoli.**
Oggi lo script è tutto-o-niente: una fonte che cade uccide il briefing. Con 5 fonti sarebbe fragile.
Ma `SKILL.md` vieta i briefing parziali, e giustamente.

La conciliazione sta nella distinzione tra **assente** e **inventato**:

- una fonte che fallisce viene riportata **esplicitamente** come *"Meta Ads: non letta — <errore>"*;
- **non** è un briefing parziale con numeri inventati: è un briefing che **dichiara il proprio punto cieco**;
- ⛔ resta assolutamente vietato stimare, dedurre o riusare i numeri di ieri per riempire il buco;
- **pavimento:** se cade **Ciak** (la fonte centrale), si aborta tutto — comportamento identico a oggi.

### 3.2 MEMORIA — tre file, fuori dal repo

In `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\stato\`, accanto al task che li usa.

| File | Scopo | Interfaccia |
|---|---|---|
| `coda.json` | le azioni aperte | `{id, cosa, chi, entro, stato, aperta_il, chiusa_il}` — `chi` è **sempre UNO** (principio 10) |
| `registro.md` | cosa Luca ha fatto | append-only: `data · cosa · perché · risultato` — è il registro degli errori di Dalio |
| `numeri.csv` | serie storica | una riga al giorno, una colonna per numero-guida |

**Le colonne di `numeri.csv`, esplicite** (una per numero-guida, così l'implementazione non le sceglie da sé):

`data` · `lead_oggi` · `diagnosi_oggi` · `ingressi_evo_mese` · `partner_attivi` · `partner_fermi` ·
`partner_attesa_ok` · `checkout_non_pagati` · `meta_campagna_obiettivo` · `meta_spesa_giorno` ·
`meta_lead_giorno` · `giorni_silenzio_social` · `contatti_systeme` · `sito_ok`

Una colonna che una fonte caduta non ha si scrive **vuota**, mai zero: zero è una misura, vuoto è
un punto cieco, e confonderli è esattamente l'errore che questo progetto esiste per non fare.

**Perché `numeri.csv` conta più di quanto sembri:** rende *"su o giù rispetto a ieri"* un valore
**calcolato** invece che dichiarato. È la differenza tra un AD che misura e uno che ricorda a sensazione.

**Ed è ciò che rende finalmente eseguibile la riga 206 del prompt.**

### 3.3 MANI — cosa Luca fa da solo

**Acquisizione — esegue** (carta bianca 14/8, decisione D3):
- pubblica sui canali del brand e tiene calendario editoriale e coda
- **corregge ciò che trova rotto e reversibile** — es. campagna su obiettivo sbagliato → la rimette su Lead
- misura e riporta i numeri, non le bozze

**Delivery — esegue e coordina** (reversibile e dentro Ciak):
- assegna task a reparti e agenti: **chi (UNO) · cosa · entro quando**, scritto in `coda.json`
- rigenera documenti del percorso, ricostruisce stati incoerenti e lo segnala

**Business — prepara soltanto** (invariato dal 12/8):
- 2-3 opzioni coi numeri e una raccomandazione. Non esegue.

⛔ **Fuori dalle mani, sempre:** soldi, budget e ricariche · prezzi e sconti · contratti · credenziali ·
deploy in produzione · **qualunque messaggio 1:1 verso una persona**.

### 3.4 LA PROCEDURA DEL MATTINO — il pezzo di cervello mancante

Non un ventunesimo nome. Un algoritmo deterministico, gli stessi sei passi ogni giorno:

1. **LEGGI** — le 5 fonti, entrambi i sensori. Ogni fonte caduta si dichiara.
2. **CONFRONTA** — contro `numeri.csv`: cosa si è mosso, cosa è fermo e **da quanti giorni**.
3. **TROVA IL COLLO DI BOTTIGLIA** — l'unico numero che, se cambiasse, sposterebbe tutti gli altri.
4. **CLASSIFICA** ogni azione: porta a due vie → la faccio adesso · porta a una via → la preparo per Claudio.
5. **ESEGUI** le porte a due vie dentro il perimetro, e scrivi in `registro.md`: cosa · perché · risultato.
6. **CONSEGNA** un messaggio solo: cosa ho fatto · cosa aspetta te · l'unica mossa di oggi · distanza dal gate.

I 20 principi **restano dove sono e non si toccano**. Cambiano ruolo: da vetrina a *come* si eseguono
i sei passi. Bezos (Type 1/Type 2) sta nel passo 4, Grove (leva) nel 6, Toyota (vai a vedere) nell'1,
Dalio (registro) nel 5.

---

## 4. Fase 1 — perimetro di questa implementazione (D4)

**Dentro:** occhi + memoria. **Fuori:** mani e procedura, che arrivano in Fase 2.

| # | Consegna | Dove |
|---|---|---|
| F1.1 | `briefing_luca.py` → busta uniforme + sensore sito + degradazione parziale con pavimento su Ciak | `Claude\Scheduled\briefing-luca-ad\` + copia in `scripts\` |
| F1.2 | `stato.py` — lettura/scrittura dei 3 file, unico punto che tocca lo stato | `Claude\Scheduled\briefing-luca-ad\` |
| F1.3 | I 3 file inizializzati con i valori misurati oggi | `stato\` |
| F1.4 | `SKILL.md` — istruzioni per il sensore MCP e per scrivere lo stato | `Claude\Scheduled\briefing-luca-ad\` |

**Perché la fonte di verità dello script resta doppia:** `scripts/briefing_luca.py` nel repo è la
fonte, la copia fuori è ciò che gira (il checkout principale sta spesso su altri branch). **Se cambia
una, si ricopia l'altra** — regola già stabilita il 30/7.

### Prerequisiti che sono di Claudio, non miei
1. 🔑 **Approvare i permessi MCP** del task `briefing-luca-ad` (Meta Ads, Meta Social, Systeme).
   Oggi `approvedPermissions` è assente: senza, alle 7:45 Luca si ferma a chiedere il permesso a nessuno.
2. 🧹 Togliere `C:\Users\berto\Desktop\appevolution` da `userSelectedFolders` (non esiste).
3. ⏰ Valutare lo spostamento dell'orario: quattro task si accavallano tra 7:30 e 8:00 e
   `briefing-luca-ad` ha già 2 skip registrati per `global_limit`.

---

## 5. Errori e casi limite

| Caso | Comportamento |
|---|---|
| Una fonte MCP non risponde | si dichiara *"non letta: <errore>"*, il briefing prosegue |
| **Ciak** non risponde | si aborta tutto, una riga con l'errore testuale — come oggi |
| `LUCA_REPORT_KEY` assente | exit 2 con messaggio esplicito (già implementato) |
| `stato\` non esiste | `stato.py` lo crea con file vuoti validi al primo run |
| `numeri.csv` senza storico | il confronto si dichiara *"prima misurazione, nessun confronto"* — **non** si inventa un trend |
| Un dato manca | *"dato da recuperare"* + come si recupera. **Mai una stima.** |

⛔ **Vietato in ogni caso, dal `SKILL.md` esistente:** cercare sul web, aprire il browser per rimediare,
stimare o riusare numeri di briefing precedenti, scrivere un briefing "indicativo".

---

## 6. Collaudo

| Test | Come si verifica |
|---|---|
| Busta uniforme | ogni fonte restituisce le 5 chiavi, anche quando fallisce |
| Degradazione | staccando Meta il briefing esce comunque e **dichiara** il buco |
| Pavimento | con `LUCA_REPORT_KEY` errata → exit ≠ 0, nessun output parziale |
| Memoria | due run consecutivi: il secondo **calcola** la differenza, non la dichiara |
| Primo run | su `stato\` vuoto non esplode e non inventa un confronto |
| End-to-end | un run reale confrontato con i numeri letti a mano dalle fonti |

**Il test che conta davvero:** il briefing di domani deve mostrare la campagna Meta ferma su Traffico
da 61 giorni. Se non la mostra, la Fase 1 non ha risolto il problema per cui è nata.

---

## 7. Limiti dichiarati

1. **Gira solo ad app desktop aperta.** Un Luca quotidiano salta i giorni a PC spento. Renderlo
   indipendente è un altro cantiere (Cloud Run) e va deciso a parte.
2. **Stripe resta fuori.** Nessun MCP disponibile e le chiavi sono di Claudio → la cassa ricorrente non
   censita (buco aperto il 4/8) **non si chiude qui**. Dato da recuperare, non da stimare.
3. **Luca-in-Ciak resta consulente.** La chat non guadagna tool in questa fase: restano due Luca. Il
   rischio che dicano cose diverse si chiude in Fase 3 facendo leggere alla chat la stessa `coda.json`.
4. **La continuità la fanno i file, non una presenza.** Chi apre una sessione come Luca legge il piano
   prima di agire, non si fida del ricordo.

---

## 8. Fasi successive (non in questo perimetro)

- **Fase 2 — mani e procedura:** `SKILL.md` riscritto sui 6 passi; Luca esegue le porte a due vie e
  scrive nel registro. È qui che la campagna Meta la rimette lui su Lead.
- **Fase 3 — un cervello, due interfacce:** la chat di Ciak legge `coda.json` e `registro.md`, così
  Luca-in-Ciak e Luca-schedulato smettono di essere due.
