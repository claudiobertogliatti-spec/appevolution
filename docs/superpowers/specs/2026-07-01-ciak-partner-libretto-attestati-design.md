# Ciak Partner · Libretto di Progetto e Attestati

Data: 2026-07-01  
Stato: design approvato in chat, in attesa di review finale prima del piano tecnico  
Scope: sezione partner `ciak.io/partner`, percorso Metodo EVO

## Obiettivo

Rendere il percorso partner più motivante e più semplice da percepire per professionisti con basse competenze digitali.

Il partner non deve vedere solo una lista di step. Deve sentire che sta costruendo un progetto reale, seguito dal team Ciak.io, con risultati tangibili che si accumulano fase dopo fase.

La soluzione scelta è la B:

- mantenere gli attestati di fase;
- aggiungere un `Libretto di Progetto Ciak` unico, personalizzato e progressivo;
- mostrare questi elementi anche prima del completamento come premi da sbloccare.

## Principio UX

La UI deve comunicare:

> Non devi gestire un progetto complesso. Devi solo fare il prossimo passo. Il team Ciak.io tiene traccia di tutto e trasforma il tuo lavoro in materiali concreti.

Per questo, la sezione partner deve alleggerire il journey visivo:

- Home con una sola azione principale;
- percorso raccontato in 3 macro-fasi: Esamina, Valida, Ottimizza;
- dettagli tecnici visibili solo quando servono;
- premi e materiali percepiti come avanzamento reale.

## Elementi Nuovi

### 1. Libretto di Progetto Ciak

Un PDF professionale, personalizzato, che cataloga il progetto del partner mentre prende forma.

Il partner lo vede da subito come elemento bloccato/sbloccabile, con messaggio motivante:

> Qui raccoglieremo, fase dopo fase, le caratteristiche del modello digitale che stiamo costruendo insieme.

Il libretto si aggiorna a fine fase, o quando i dati minimi sono disponibili.

### 2. Attestati di Fase

Tre attestati PDF:

- fine fase Esamina;
- fine fase Valida;
- Go Live.

Gli attestati sono visibili prima come premio bloccato e scaricabili solo quando la fase è completata.

### 3. Bonus PDF Collegati Alla Fase

Ogni fase può sbloccare anche una risorsa bonus:

- Esamina: `Mappa del tuo Posizionamento`;
- Valida: `Checklist Lancio del tuo Modello Digitale`;
- Go Live: `Piano 90 Giorni per Crescere`.

I bonus devono essere percepiti come strumenti utili, non come gadget.

## Contenuto Libretto

### Copertina

La copertina include:

- logo Ciak.io;
- nome partner;
- nome progetto/accademia, se disponibile;
- data inizio lavori;
- fase attuale;
- claim: `Il tuo modello digitale prende forma`;
- visual coerente con brand Ciak: sfondo grigio chiaro, bordo giallo, accento blu.

### Pagine Interne

Il contenuto si compone progressivamente:

1. Identità professionale
2. Target
3. Problema che il partner risolve
4. Promessa
5. Posizionamento
6. Tono e stile del brand
7. Struttura masterclass
8. Struttura corso
9. Offerta e prezzo
10. Sistema di vendita
11. Calendario di lancio
12. Webinar/live
13. Prossimi obiettivi post-lancio

Le pagine senza dati completi non devono mostrare vuoti tecnici. Devono usare uno stato elegante:

> Questa sezione si completerà nella prossima fase del percorso.

## Stati UI

### Bloccato

Mostrato prima del completamento fase.

Esempio copy:

> Premio in preparazione. Completa la fase Esamina per scaricare il tuo primo attestato e aggiornare il Libretto di Progetto.

### Sbloccato

Mostrato quando la fase è completata.

Esempio copy:

> Complimenti, hai completato la fase Esamina. Il tuo attestato è pronto e il Libretto di Progetto è stato aggiornato.

### In Aggiornamento

Usato quando il PDF deve essere generato o rigenerato.

Esempio copy:

> Stiamo preparando il tuo documento. Di solito bastano pochi secondi.

### Errore

Il partner non deve vedere dettagli tecnici.

Esempio copy:

> Non siamo riusciti a preparare il PDF. Scrivi al team Ciak.io e lo sistemiamo noi.

## Inserimento Nella Sezione Partner

### Home Partner

La home resta centrata su:

- agente attivo;
- prossimo passo;
- chat live;
- avanzamento.

Sotto il blocco principale si aggiunge un modulo compatto:

`Il tuo Libretto di Progetto`

Contiene:

- mini anteprima copertina;
- stato delle 3 fasi;
- CTA principale contestuale:
  - bloccato: `Vedi cosa sbloccherai`;
  - sbloccato: `Scarica il libretto`;
  - aggiornamento: `Aggiorna libretto`.

### Metodo EVO

La pagina Metodo EVO mostra le 3 macro-fasi con:

- agente;
- risultato della fase;
- attestato collegato;
- bonus collegato;
- stato: bloccato, in corso, sbloccato.

Questa pagina deve orientare, non diventare una dashboard pesante.

### Fine Fase

Quando una fase viene completata, mostrare una schermata celebrativa o un banner:

- foto agente;
- messaggio di complimenti;
- `Scarica attestato`;
- `Scarica/aggiorna Libretto`;
- `Continua alla prossima fase`.

## Regole Di Sblocco

### Fine Esamina

Si considera completata quando tutti gli step Esamina sono `done`:

- Benvenuto;
- Contratto + distinta;
- I tuoi dati;
- Brand kit;
- La tua storia;
- Posizionamento.

Sblocca:

- attestato Esamina;
- bonus Mappa del Posizionamento;
- Libretto con sezioni strategiche.

### Fine Valida

Si considera completata quando lo step `13-lancio` è pronto o quando tutti gli step Valida sono `done`.

Sblocca:

- attestato Valida;
- bonus Checklist Lancio;
- Libretto con masterclass, corso, funnel, prezzo, webinar, calendario.

### Go Live

Si considera completato quando `13-lancio` viene chiuso con `launched_at`.

Sblocca:

- attestato Go Live;
- bonus Piano 90 Giorni;
- Libretto completo;
- accesso naturale alla fase Ottimizza.

## Dati Necessari

I dati possono arrivare da fonti già presenti:

- `partner_journey_steps.data`;
- partner profile;
- brand kit;
- posizionamento;
- masterclass factory;
- partner videocorso;
- funnel blueprint;
- calendario 30 giorni;
- prezzo/webinar;
- dati Ottimizza, se disponibili.

La prima versione può usare fallback eleganti quando un dato manca.

## Architettura Proposta

### Frontend

Nuovi componenti:

- `ProjectBookCard`
- `PhaseRewardCard`
- `PhaseCompletionReward`

Aggiornamenti:

- `GuidedHome.jsx`: aggiungere card Libretto sotto il blocco principale;
- `MetodoEvoPage.jsx`: aggiungere premi per fase;
- `StepFinaleCelebrativa.jsx`: aggiungere download libretto e attestato Go Live.

### Backend

Nuovo router consigliato:

- `backend/routers/partner_rewards.py`

Endpoint:

- `GET /api/partner-rewards/{partner_id}/state`
- `POST /api/partner-rewards/{partner_id}/certificate/{phase}`
- `POST /api/partner-rewards/{partner_id}/project-book`

La prima versione può generare PDF on demand e salvarli nella collection `files` o in storage esistente.

### PDF

Riutilizzare pattern già esistenti nel progetto per PDF/HTML quando possibile.

Output:

- attestato fase;
- libretto progetto;
- bonus fase.

Stile:

- logo Ciak.io;
- sfondo grigio chiaro;
- bordo giallo con alone leggero;
- CTA/accents blu;
- firma `Claudio Bertogliatti e il team Ciak.io`.

## Error Handling

- Se il backend non riesce a generare PDF: mostra messaggio umano e link a supporto.
- Se mancano dati: generare comunque il PDF con sezioni `in preparazione`.
- Se storage fallisce: non bloccare il percorso, mostra stato temporaneo.

## Testing

Verifiche minime:

- stato bloccato/sbloccato per Esamina, Valida, Go Live;
- generazione PDF per partner con dati completi;
- generazione PDF per partner con dati parziali;
- UI mobile senza overflow;
- build frontend;
- py_compile backend sui nuovi router/servizi.

## Fuori Scope Per La Prima Versione

- editor manuale completo del libretto;
- firma digitale dentro attestato;
- invio automatico via email degli attestati;
- design PDF multi-template avanzato;
- dashboard admin per modificare ogni pagina del libretto.

Questi elementi possono arrivare dopo, nella revisione admin.
