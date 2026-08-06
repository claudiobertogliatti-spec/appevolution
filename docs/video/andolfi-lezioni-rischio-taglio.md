# Andolfi — classificazione delle 32 lezioni per RISCHIO DI TAGLIO

**30/07/2026.** Prodotto prima di montare le 31 lezioni rimanenti, per non applicare
alla cieca il taglio dei silenzi che ha funzionato sul pilota M1 L1.

> ⛔ Regola di riferimento: `recipe-lezione-cut.md` §3 — *"le lezioni contengono esercizi di
> respirazione, rilassamento o meditazione con silenzi VOLUTI. Non sono tempi morti: NON vanno
> MAI tagliati. Nel dubbio → PRESERVA sempre."*

## 🔴 Il problema di metodo: i cue di CHIUSURA non esistono

La ricetta prevede di delimitare l'esercizio fra un cue di apertura ("chiudi gli occhi",
"porta l'attenzione al respiro") e uno di **chiusura** ("riapri gli occhi", "quando sei pronto",
"torniamo"). Contati sui trascritti reali di tutte e 32:

**i cue di chiusura sono ZERO in 31 lezioni su 32** (solo `m2_l3` ne ha 2).

👉 **Daniele non chiude verbalmente gli esercizi.** Quindi *dove finisce una pratica guidata non
è rilevabile in automatico*: si può solo stimare una finestra attorno al cue di apertura.
Questo vale probabilmente anche per **altri partner** che insegnano pratiche (meditazione, yoga,
respirazione): **verificare la presenza dei cue di chiusura prima di fidarsi di un taglio
automatico dei silenzi**, su chiunque.

## Classificazione (conteggio dei cue di pratica guidata sul trascritto)

| Rischio | N | Lezioni | Politica di taglio applicata |
|---|---|---|---|
| 🔴 **ALTO** | **8** | `m2_l3` `m3_l3` · **tutto il Modulo 4** (`m4_l1..l3`) · **tutto il Modulo 5** (`m5_l1..l3`) | **Nessun taglio di silenzio.** Solo filler e false partenze. |
| 🟠 medio | 11 | `m1_l2` `m2_l1` `m3_l1` `m3_l2` `m6_l3` `m7_l2` `m7_l3` `m8_l2` `m11_l1` `m11_l3` `m12_l1` | Tagli solo **fuori** da una finestra di ±25s attorno a ogni cue. |
| 🟢 basso | 13 | `m1_l1` `m1_l3` `m2_l2` `m6_l1` `m6_l2` `m7_l1` `m8_l1` `m9_l1` `m9_l2` `m9_l3` `m10_l1` `m10_l2` `m11_l2` | Come il pilota: silenzi >1,3s + filler. |

**I casi estremi**: `m5_l1 "Respiro di pancia"` = **47 cue** (23 *espira* + 22 *respira*) —
è una pratica guidata dall'inizio alla fine. `m5_l2` = 32, `m4_l2` = 23, `m4_l3` = 22.

ℹ️ **M1 L1 era il caso più facile di tutti**: unica lezione con **0 cue**, puramente concettuale.
Il fatto che il taglio automatico ci abbia funzionato **non dice nulla** sulle altre 31.

## Stato dell'editing in Ciak (snapshot del 30/07, prima del blocco auth)

| | |
|---|---|
| Con montato/render esistente | **1** (`m1_l1`, approvato il 3/7) |
| Con trascritto word-level + tagli gia' calcolati | **3** (`m1_l1`, `m1_l2`, `m1_l3`) |
| `editing_status: standby` | **31** |
| Con embed YouTube | 32 — ⚠️ ma sono i **video vecchi montati male**, da sostituire |

⚠️ I tagli precalcolati di `m1_l2` (16) e `m1_l3` (31) sono stati prodotti **prima** dello
standard del 17/7: vanno ri-vagliati con la protezione esercizi, non riusati così.

## Pipeline — `scripts/video/`

| Script | Fase |
|---|---|
| `classifica_esercizi.py` | classifica le lezioni per rischio dai trascritti (produce la tabella qui sopra) |
| `analizza.py` | trascrive word-level (faster-whisper) e **propone** i tagli applicando la protezione esercizi |
| `taglia.py` | applica **solo** i tagli `attivo: true` e produce il girato montato |
| `make_cover.py` · `gen_vo.py` | slide di copertina dal BrandKit + voce narrante Andrew |
| `monta_lezione.py` | copertina + girato, concat senza ricodifica |
| `verifica.py` | **QC gate automatico** sul consegnato: durata, frame rate, risoluzione, audio, pareggio LUFS |
| `lezioni.json` | ID Drive + rischio per tutte e 32 |

ℹ️ `verifica.py` tollera uno scarto dello 0,5% sul frame rate medio: su sorgenti VFR normalizzate
resta **sempre** un residuo frazionario (es. 25,0008), che non è un difetto. Conta che
`r_frame_rate` sia `25/1` e che la durata torni.

Grezzi scaricati da Drive con `rclone backend copyid` (~32 GB a ~15 MB/s; `rclone` è già
configurato sul remote `gdrive:`).

**Due scelte di progetto dentro gli script:**
1. I tagli bloccati dalla protezione **non vengono buttati**: restano nel file di analisi con
   `attivo: false` + il motivo, così sono ispezionabili invece di sparire silenziosamente.
2. `taglia.py` ha una **soglia di 4 secondi**: se i tagli attivi valgono meno, il girato viene
   **copiato senza ricodifica**. I grezzi sono 1080p a ~18 Mbps — ricodificare 8 minuti per
   recuperarne 3 è una perdita di qualità gratuita.
   ⚠️ Conseguenza attesa: su parecchie lezioni (soprattutto le 8 ad ALTO, dove restano solo i
   filler) il "montaggio" sarà **copertina + girato intatto**. È la conseguenza corretta della
   regola sui silenzi, non una scorciatoia.

## 🔎 Prova che il montaggio automatico pre-17/7 NON era conservativo
Su `m1_l2` (rischio **medio**, non alto) la protezione blocca **5 tagli su 8**: ne restano 3 per
3,7s. La pipeline vecchia, i cui risultati sono ancora in Ciak, per la stessa lezione aveva
calcolato **16 tagli** — sarebbe entrata nei passaggi "rilassa".
👉 **Non riusare i `review_cut_segments` già presenti in Ciak** (`m1_l1`, `m1_l2`, `m1_l3`):
sono precedenti allo standard e vanno ricalcolati.

## ⛔ Decisioni di Claudio del 30/07
1. **Sulle 8 lezioni a rischio ALTO non si taglia NULLA** — nemmeno i filler. Si consegnano
   intatte, con la sola copertina davanti. `analizza.py` le marca tutte `attivo: false`.
2. **I 31 copioni di copertina li scrive Claude.** Fatti, in `scripts/video/copioni.json`
   (32 testi, media 39 parole ≈ 17,5s), derivati dai trascritti reali e collaudati
   ritrascrivendo l'audio generato.

## 🐛 Difetto dati da correggere in Ciak
**`m9_l2` "Fame vera e fame emotiva" ha il trascritto SBAGLIATO**: `video_transcript` è una
**copia byte-identica di quello di `m8_l1`** (parla di linguaggio interiore e effetto placebo,
non di fame). Verificato il 30/07 con un confronto diretto delle due stringhe.
👉 Il copione di `m9_l2` è stato scritto dalla logica del percorso e **va ricontrollato
sull'audio vero**. Il campo in Ciak va comunque rigenerato.

## 📉 LA RESA DEL TAGLIO È MINIMA — il valore aggiunto è la copertina, non le forbici

Misurato sulle prime **9 lezioni** analizzate (~64 minuti di girato): **48 secondi tagliati in
totale.** Dettaglio: `m7_l1` **0 candidati**, `m6_l2` 1 candidato e 0 attivi, `m2_l2` 0,1s,
il massimo è `m11_l2` con 13,7s. **5 lezioni su 9 restano sotto la soglia dei 4s** e vengono
quindi copiate senza ricodifica.

👉 **Daniele parla pulito**: poche pause morte, pochi intercalari. Sommato alle 8 lezioni ad ALTO
(zero tagli per decisione), la larga maggioranza delle 32 sarà **copertina + girato intatto**.

⚠️ **Da tenere presente prima di promettere un "montaggio" a un partner**: misurare la resa del
taglio su 2-3 lezioni *prima* di impegnarsi. Se il girato è già pulito, l'editing non accorcia
niente e ciò che si consegna è l'intestazione (copertina + voce narrante) — che è comunque il
requisito dello standard 17/7, ma è un'altra promessa rispetto a "ve lo montiamo".

## 💀 TRAPPOLA: i grezzi sono a frame rate VARIABILE, e `concat -c copy` sbaglia in silenzio

I grezzi di Daniele sono registrazioni da telefono: **dichiarano 60 fps ma ne hanno ~30 reali**
(`r_frame_rate=60/1`, `avg_frame_rate≈30.01`), `time_base=1/30000`, audio **16 kHz stereo**.
La copertina prodotta dalla pipeline è 25 fps, `1/12800`, 48 kHz mono.

Concatenandoli con `-f concat -c copy` **i tempi non vengono riscritti**: la lezione viene
riprodotta a 25 fps invece di 60 e il file esce lungo **2,4×** (60/25). Caso reale del 30/07:
`m7_l1` è uscito **18:41 invece di 7:57**.

☠️ **Il pericolo è che ffmpeg non segnala nulla**: exit code 0, file prodotto, nessun warning.
Senza controllare la durata si consegnano 31 lezioni lunghe il doppio.

**Rimedi applicati in `scripts/video/`:**
1. `taglia.py` — **anche il ramo "nessun taglio" ricodifica** (`-r 25 -vsync cfr
   -video_track_timescale 12800 -ar 48000 -ac 1`). La scorciatoia `-c copy` è stata rimossa:
   con sorgenti VFR non è utilizzabile. ⚠️ Questo **annulla il risparmio** della soglia dei 4s:
   tutte le lezioni vanno ricodificate comunque.
2. `monta_tutte.py` — **guardia sulla durata**: se il finale non è uguale a
   copertina + girato entro 1 secondo, il file viene cancellato e il montaggio si ferma.

👉 **Vale per ogni partner**: i grezzi arrivano da telefoni, quindi VFR e parametri disomogenei
sono la norma, non l'eccezione. **Non concatenare mai in copia senza aver confrontato
`avg_frame_rate`, `time_base` e i parametri audio delle due parti** — e comunque verificare
sempre la durata del risultato.

### 🪤 Secondo inganno silenzioso: `-t` prima di `-i` (anteprime rotte, 30/07)
`ffmpeg -ss 0 -t 28 -i file.mp4 ...` mette `-t` fra le opzioni di **ingresso**: è un limite sulla
lettura, non sulla durata d'uscita. Su un file prodotto da `concat` ha generato un'anteprima con
**47s di video e 28s di audio** — sembrava che il montaggio perdesse l'audio a metà, mentre le
lezioni erano corrette (contati i fotogrammi: 495 prima di 19,8s, 700 prima di 28s, 25 fps esatti).
✅ `-t` va **dopo `-i`**. Usare `scripts/video/estratto.py`, che genera l'anteprima e **la scarta**
se video e audio non combaciano.
⚠️ Anche qui `ffmpeg` esce con **codice 0 e nessun warning**: in questa pipeline è la seconda volta
in un giorno. **Non fidarsi mai dell'exit code — misurare l'output.**

## Carico reale misurato (30/07)
31 lezioni = **237 min di video** (media 7:38). Trascrizione a **1,30× realtime** per worker;
su 4 core si tengono **2 worker** → ~2,6 ore. Taglio+montaggio ~1 ora. Totale ~4 ore macchina.
