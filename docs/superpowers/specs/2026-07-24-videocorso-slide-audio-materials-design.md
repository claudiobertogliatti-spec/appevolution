# Videocorso Ciak — slide, audio e materiali Systeme.io

**Data:** 2026-07-24
**Stato:** approvato da Claudio
**Ambito:** generazione, approvazione, montaggio e pubblicazione dei materiali di supporto per ogni lezione del videocorso
**Esclusioni:** NotebookLM e NotebookLM Enterprise; modifiche al system prompt di Matteo

## 1. Obiettivo

Per ogni lezione del videocorso, Ciak deve produrre oltre allo script:

- un deck 16:9 in PowerPoint modificabile;
- un PDF di anteprima;
- immagini 1920×1080 delle slide approvate;
- un video definitivo nel quale l'AI inserisce le slide a schermo intero mentre l'audio originale continua;
- l'audio originale estratto dal video definitivo;
- un ripasso audio AI con due voci neutre Ciak;
- i relativi file e player nella lezione corretta dell'account Systeme.io del partner.

Il partner è l'unico soggetto che approva slide, video definitivo e ripasso audio. Ciak conserva file, stati e versioni come fonte di verità; Systeme.io è il canale di fruizione dello studente.

## 2. Flusso funzionale

1. Ciak genera lo script della lezione con il flusso esistente.
2. Il partner approva lo script.
3. Ciak genera il deck della lezione in PPTX e PDF.
4. Il partner visualizza il PDF, scarica il PPTX e può:
   - approvare il deck;
   - chiedere una rigenerazione con indicazioni;
   - correggere il PPTX e ricaricarlo.
5. L'approvazione congela la versione del deck.
6. Soltanto dopo l'approvazione delle slide si abilita il caricamento del video grezzo.
7. La pipeline trascrive il video, associa i concetti pronunciati alle slide approvate e calcola gli inserti.
8. Le slide selezionate appaiono a schermo intero in formato 16:9; l'audio del relatore prosegue senza interruzioni.
9. Il partner approva il video definitivo.
10. Ciak estrae dal video approvato l'audio originale della lezione.
11. Ciak genera un dialogo di ripasso con due voci neutre e costanti.
12. Il partner ascolta e approva separatamente il ripasso audio.
13. Ciak pubblica o aggiorna nella lezione Systeme.io:
    - video definitivo;
    - player dell'audio originale;
    - player del ripasso audio, solo se approvato;
    - PPTX;
    - PDF;
    - eventuali altri allegati della lezione.
14. Gli stessi asset approvati sono disponibili nei Materiali del partner.

Una modifica successiva alle slide crea una nuova versione, revoca la validità del precedente piano di montaggio e richiede una nuova generazione del video.

## 3. Regole di generazione delle slide

Le uniche fonti ammesse sono:

- script approvato della lezione;
- struttura approvata del corso;
- posizionamento e brand kit verificati del partner;
- materiali sorgente esplicitamente associati alla lezione.

Regole:

- formato 16:9;
- una slide per concetto;
- testo breve e leggibile durante la spiegazione;
- numero di slide deciso dall'AI in base a durata prevista e densità dei concetti;
- nessuna informazione, statistica, promessa o citazione non presente nelle fonti;
- nessun obbligo di utilizzare nel video tutte le slide approvate;
- grafica del brand kit del partner;
- fallback grafico Ciak quando il brand kit è incompleto;
- oggetti, testi e forme del PPTX devono rimanere modificabili;
- PDF e immagini devono derivare dalla stessa versione del PPTX.

Il modello dati di ogni slide contiene almeno:

- `slide_id`;
- `order`;
- `title`;
- `body`;
- `visual_direction`;
- `source_excerpt`;
- `concept_key`;
- `speaker_note`;
- `approved`;
- `version`.

## 4. Sincronizzazione e montaggio video

Il motore di sincronizzazione riceve:

- trascrizione con timestamp;
- slide approvate;
- `concept_key`, `source_excerpt` e note relatore di ogni slide.

Il motore:

- individua nella trascrizione il passaggio semanticamente corrispondente;
- assegna un punteggio di confidenza;
- sceglie quali slide usare;
- evita saluti, passaggi personali, transizioni e call to action;
- calcola una durata basata su tempo di lettura e durata della spiegazione;
- applica un minimo di 4 secondi e un massimo ordinario di 12 secondi;
- consente durate maggiori per slide procedurali complesse;
- non sovrappone gli inserti;
- produce un report interno con slide, inizio, fine, confidenza e motivazione.

Sotto la soglia di confidenza configurata la slide non viene inserita. Il video resta valido anche se nessuna slide raggiunge la soglia.

Il compositore FFmpeg:

- renderizza ogni slide a 1920×1080;
- sostituisce temporaneamente l'immagine del relatore con la slide;
- conserva integralmente e senza tagli la traccia audio della lezione;
- ritorna al relatore al termine dell'inserto;
- mantiene risoluzione, frame rate e sincronizzazione audio/video del master.

## 5. Audio originale e ripasso audio Ciak

### 5.1 Audio originale

Viene estratto automaticamente dal video definitivo approvato. È il contenuto fedele della lezione e non richiede una seconda approvazione.

### 5.2 Ripasso audio Ciak

È un contenuto aggiuntivo, non un sostituto fedele della lezione.

Regole:

- dialogo tra due voci italiane neutre e costanti;
- nessun nome, avatar o associazione con gli agenti Ciak esistenti;
- tono professionale, semplice e anti-fuffa;
- durata obiettivo pari al 25–40% della lezione;
- uso esclusivo di script e slide approvati;
- nessuna informazione nuova;
- domande e risposte usate per chiarire, collegare e riepilogare;
- pubblicazione solo dopo approvazione separata del partner.

La generazione avviene in due passaggi isolati:

1. creazione del copione strutturato del dialogo;
2. sintesi delle due voci e composizione dell'audio.

La sintesi vocale usa un adapter dedicato con due voci italiane configurate. La prima implementazione usa Google Cloud Text-to-Speech, coerente con l'infrastruttura GCP esistente. L'adapter permette di cambiare provider senza modificare il dominio applicativo.

## 6. Componenti

### `LessonDeckGenerator`

Trasforma le fonti approvate in un deck strutturato. Non crea file binari.

### `LessonDeckRenderer`

Produce PPTX 16:9, PDF e immagini. Verifica apertura, dimensioni, font e presenza di overflow.

### `LessonMaterialVersionService`

Calcola hash, assegna versioni, congela gli asset approvati e conserva lo storico.

### `SlideTimingEngine`

Associa slide e trascrizione, genera il piano degli inserti e i punteggi di confidenza.

### `VideoSlideComposer`

Applica il piano degli inserti al video definitivo senza modificare l'audio.

### `OriginalAudioExtractor`

Estrae e normalizza la traccia audio dal master approvato.

### `CiakAudioRecapGenerator`

Genera copione, due tracce vocali e file audio finale del ripasso.

### `SystemeLessonMaterialsPublisher`

Pubblica o aggiorna gli asset nella lezione esistente usando l'account e `systeme_course_id` del partner. Le operazioni sono idempotenti.

### `PartnerMaterialsPublisher`

Espone gli stessi asset approvati nei Materiali del partner senza duplicare i file binari.

## 7. Persistenza e stati

I dati sono memorizzati nella lezione corrispondente di `partner_videocorso`, con un sottodocumento `learning_materials`.

Stati del deck:

`not_started → generating → review_required → approved → superseded`

Stati del montaggio:

`waiting_slides → ready_for_video → timing → composing → video_review_required → approved`

Stati del ripasso:

`waiting_video → generating → review_required → approved → published`

Stati Systeme.io:

`not_ready → queued → publishing → published → retrying → error`

Ogni asset conserva:

- `version`;
- `sha256`;
- `storage_path`;
- `content_type`;
- `size_bytes`;
- `created_at`;
- `approved_at`;
- `approved_by`;
- `source_versions`.

I file binari sono conservati nello storage protetto Ciak/GCS. Systeme.io riceve allegati quando supportati; per file o player non supportati riceve URL firmati o endpoint autenticati gestiti da Ciak. I link pubblicati non devono esporre bucket o credenziali.

## 8. Interfaccia partner

Ogni lezione mostra una sequenza unica:

1. script;
2. slide;
3. registrazione e caricamento video;
4. video definitivo;
5. audio originale;
6. ripasso audio;
7. pubblicazione Systeme.io.

Azioni deck:

- anteprima PDF;
- scarica PPTX;
- carica PPTX corretto;
- rigenera con indicazioni;
- approva.

Azioni ripasso:

- ascolta;
- rigenera con indicazioni;
- approva.

La UI mostra messaggi comprensibili e non espone nomi di task, eccezioni, bucket o dettagli tecnici.

## 9. Pubblicazione Systeme.io

La pubblicazione è sempre successiva alle approvazioni e usa la lezione già associata al relativo `lesson_id`.

Requisiti:

- non creare moduli o lezioni duplicati;
- aggiornare gli stessi slot al cambio di versione;
- separare lo stato di ciascun asset;
- ritentare automaticamente gli errori temporanei;
- mantenere in Ciak lo stato approvato se Systeme.io non è disponibile;
- verificare dopo ogni scrittura che la lezione esponga la versione prevista;
- non pubblicare il ripasso audio se non approvato.

## 10. Error handling

- Uno script non approvato blocca la generazione del deck.
- Un deck non approvato blocca il caricamento del video.
- Un PPTX non valido o non 16:9 viene rifiutato con istruzione di correzione.
- Una nuova versione del deck invalida timing e video derivati.
- Un errore del ripasso non blocca video e audio originale.
- Un errore di un singolo asset Systeme.io non annulla gli asset già pubblicati.
- I retry usano backoff e chiavi idempotenti.
- Le versioni precedenti restano recuperabili.

## 11. Sicurezza e autorizzazioni

- Solo il partner proprietario e gli admin autorizzati possono leggere o modificare i materiali.
- Solo il partner può effettuare le approvazioni definitive.
- Upload validati per tipo, firma, dimensione e malware secondo i controlli di storage esistenti.
- URL firmati a durata limitata.
- Nessun contenuto del partner viene inviato a NotebookLM.
- I log non contengono file, script completi, token o URL firmati.

## 12. Verifica e criteri di accettazione

### Test automatici

- schema e grounding del deck;
- renderer PPTX 16:9 e apertura del file;
- PDF e immagini coerenti con la versione PPTX;
- upload e validazione del PPTX corretto;
- versionamento e invalidazione dei derivati;
- mapping concetto–timestamp;
- esclusione delle slide sotto soglia;
- continuità e durata della traccia audio dopo FFmpeg;
- estrazione dell'audio originale;
- copione del ripasso senza affermazioni fuori fonte;
- composizione delle due voci;
- guardie di autorizzazione;
- idempotenza e retry Systeme.io;
- assenza di duplicati nella lezione.

### Collaudo end-to-end

Una lezione demo completa deve dimostrare:

1. generazione PPTX/PDF;
2. correzione e ricaricamento PPTX;
3. approvazione del partner;
4. montaggio con almeno una slide;
5. audio continuo durante l'inserto;
6. approvazione video;
7. estrazione audio originale;
8. generazione e approvazione del ripasso a due voci;
9. pubblicazione di tutti gli asset nella lezione Systeme.io corretta;
10. presenza degli stessi asset nei Materiali del partner;
11. aggiornamento idempotente senza duplicati.

## 13. Rollout

1. Abilitazione tramite feature flag.
2. Pilota su una sola lezione demo.
3. Pilota su un partner reale consenziente.
4. Verifica costi, tempi di rendering e qualità.
5. Estensione progressiva ai nuovi videocorsi.

Il rollout non modifica retroattivamente i corsi esistenti. Un backfill sarà un'attività separata e dovrà essere esplicitamente autorizzato.
