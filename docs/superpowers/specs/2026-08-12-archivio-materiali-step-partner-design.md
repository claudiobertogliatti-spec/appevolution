# Archivio dei materiali per step partner — Design

Data: 2026-08-12

Stato: approvato in conversazione, in attesa di revisione della specifica scritta

Ambito: sezione partner `Percorso`, materiali prodotti nei singoli step completati

## Obiettivo

Sostituire la finestra generica aperta dagli step completati con un Archivio dello step che mostri
il materiale reale prodotto: documenti, dati, immagini, video e pagine pubbliche. Il partner deve
poter consultare tutto attraverso Ciak, scaricare i materiali consentiti e sapere che al termine
del percorso riceverà anche il Workbook completo.

Il flusso è:

`step completato → Archivio dello step → anteprima interna / download → playlist YouTube per i video → Workbook completo a fine percorso`

## Principi architetturali

- Ciak è la fonte unica di verità e il punto di accesso all'intero progetto del partner.
- YouTube ospita e distribuisce masterclass e videolezioni per evitare di appesantire Ciak.
- Systeme.io resta la piattaforma di pubblicazione del corso, ma non viene collegato da questa
  funzionalità.
- Google Drive può essere usato soltanto come sorgente tecnica temporanea o strumento di migrazione.
- Nessun URL Drive o GCS può essere esposto nell'interfaccia partner.
- La UI apre soltanto URL Ciak autenticati oppure, per i video completati, la playlist YouTube
  ufficiale del partner.
- Consultazione del materiale e richiesta di modifica sono azioni distinte.
- I dati mostrati devono essere reali: nessuna sintesi generica inventata quando il materiale manca.

## Esperienza del partner

### Accesso

Negli step completati, il pulsante `Rivedi / Modifica Dati` diventa `Visualizza materiali`.

Il click apre una finestra interna a Ciak con:

- titolo e stato dello step;
- elenco dei materiali reali;
- anteprima del materiale selezionato;
- versione e data di produzione;
- download, quando consentito;
- eventuale azione separata per richiedere una modifica;
- avviso sul Workbook finale.

Testo fisso dell'avviso:

> Puoi consultare e scaricare questo materiale ora. Al termine del percorso riceverai anche il
> Workbook completo, con tutti gli output ordinati fase per fase.

### Tipi di visualizzazione

Il visualizzatore riconosce cinque tipi:

- `pdf`: anteprima PDF incorporata e download;
- `image`: anteprima immagine e download;
- `data`: scheda leggibile con campi strutturati; download solo se esiste un documento derivato;
- `video`: player incorporato o riepilogo video, senza download;
- `public_page`: anteprima/riepilogo e link al dominio pubblico finale.

Se uno step contiene più materiali, la finestra mostra un elenco di schede o tab. Il partner non
viene trasferito automaticamente su un servizio esterno.

### Stati vuoti e di errore

Se lo step è completato ma non esiste un materiale consultabile, mostrare:

> Materiale non ancora disponibile. Il team sta completando l'archiviazione di questo step.

Non mostrare sintesi generiche, link di ripiego verso Drive o pulsanti disabilitati senza
spiegazione. Un errore di caricamento deve essere distinguibile dall'assenza del materiale e deve
offrire `Riprova`.

## Mappatura degli step

### Step 01 — Contratto e distinta d'ingresso

- contratto firmato;
- riepilogo dei dati iniziali registrati.

### Step 02 — Video di benvenuto e visione

- player interno o riferimento video ufficiale;
- eventuale materiale introduttivo allegato.

### Step 03 — Dati burocratici e aziendali

- scheda riepilogativa dei dati inseriti;
- documenti derivati, se presenti.

I dati sensibili vengono restituiti solo nei campi strettamente necessari e non sono trasformati
automaticamente in file scaricabili.

### Step 04 — Brand Kit e identità visiva

- PDF del Brand Kit;
- logo;
- palette;
- font e altri asset approvati.

### Step 05 — Storia e missione

- documento prodotto;
- dati approvati che ne costituiscono la fonte.

### Step 06 — Posizionamento strategico

- documento strategico definitivo;
- eventuali allegati approvati.

### Step 07 — Script Masterclass

- script approvato;
- PDF o formato scaricabile disponibile.

### Step 08 — Outline videocorso

- struttura di moduli e lezioni;
- documento scaricabile, quando prodotto.

### Step 09 — Script e teleprompter videolezioni

- script delle lezioni;
- teleprompter e documenti derivati.

### Step 10 — Registrazione Masterclass

- player interno della masterclass approvata, se disponibile;
- link YouTube ufficiale della masterclass;
- link alla playlist ufficiale del partner, quando presente.

Non mostrare video grezzi, versioni rifiutate o URL tecnici.

### Step 11 — Registrazione moduli corso

- riepilogo di moduli, lezioni e stato di completamento;
- link alla playlist YouTube ufficiale del partner.

In questa prima versione non mostrare collegamenti a Systeme.io. Se la playlist non è disponibile,
mostrare `Playlist ufficiale in preparazione` senza fallback verso Drive.

### Step 12 — Sistema di vendita

- riepilogo degli asset prodotti;
- anteprima o link alle sole pagine pubbliche finali.

Non mostrare editor, dashboard interne del fornitore o URL di archiviazione.

### Step 13 — Calendario lancio

- calendario prodotto;
- documenti e materiali operativi scaricabili.

### Step 14 — Lancio

- riepilogo degli asset pubblicati;
- risultati disponibili e materiali conclusivi.

## Archivio centralizzato

Il frontend non deve conoscere endpoint diversi per ogni tipologia di materiale. Usa un unico
contratto:

```text
GET /api/partner-journey/operativo/step-materials/{partner_id}/{step_id}
```

Risposta normalizzata:

```json
{
  "step_id": "03-brand-kit",
  "title": "Brand Kit & Identità Visiva",
  "status": "done",
  "materials": [
    {
      "id": "file-123",
      "type": "pdf",
      "title": "Brand Kit definitivo",
      "preview_url": "/api/partner-step-materials/file-123/preview",
      "download_url": "/api/partner-step-materials/file-123/download",
      "public_url": null,
      "version": 2,
      "created_at": "2026-08-12T10:00:00Z",
      "is_current": true,
      "metadata": {}
    }
  ],
  "workbook_notice": "Puoi consultare e scaricare questo materiale ora. Al termine del percorso riceverai anche il Workbook completo, con tutti gli output ordinati fase per fase."
}
```

Regole del contratto:

- `preview_url` e `download_url` sono sempre URL Ciak autenticati;
- `public_url` è ammesso solo per YouTube o una pagina web realmente pubblica;
- URL Drive e GCS vengono scartati o trasformati in endpoint proxy prima della risposta;
- `download_url` è assente per i video;
- per i dati strutturati, `metadata` contiene solo campi ammessi da una whitelist per step;
- per default vengono restituite solo le versioni correnti e approvate.

## Fonte dei materiali

### Nuovi output

Ogni nuovo documento o asset registra direttamente:

- `partner_id`;
- `step_id`;
- `category`;
- tipo visualizzabile;
- versione;
- stato di approvazione;
- riferimento allo storage interno;
- data di creazione.

### Materiali storici

Una mappa backend associa le categorie esistenti agli step. La mappa è centralizzata e testabile,
non duplicata nel frontend. Comprende almeno:

- Brand Kit → `03-brand-kit`;
- storia/missione → `la-tua-storia`;
- posizionamento → `04-posizionamento`;
- script Masterclass → `05-script-masterclass`;
- outline → `06-outline-lezioni`;
- script videolezioni e teleprompter → `07-script-videolezioni`;
- masterclass approvata → `08-registra-masterclass`;
- videolezioni e playlist → `09-registra-lezioni`;
- funnel e asset vendita → `10-sistema-vendita`;
- calendario → `11-calendario-30gg`;
- materiali lancio → `13-lancio`.

Gli ID sono quelli canonici di `partner_journey_steps`; le etichette numeriche mostrate nella
pagina Percorso non vengono usate come chiavi dati.

## Preview e download autenticati

I file non pubblici vengono serviti tramite endpoint Ciak che:

- verificano token e appartenenza del `partner_id`;
- risolvono il riferimento storage internamente;
- impostano il `Content-Type` corretto;
- usano `Content-Disposition: inline` per l'anteprima;
- usano `Content-Disposition: attachment` per il download;
- non restituiscono l'URL originario dello storage.

Il download è consentito per PDF, immagini e documenti prodotti. I video sono consultabili in
streaming o tramite YouTube e non sono scaricabili in questa fase.

## Video, YouTube e Systeme.io

Ciak conserva metadati, versioni, stato, approvazioni, `youtube_id`, `youtube_playlist_id` e URL
ufficiali; non conserva copie definitive dei video quando non necessarie alla pipeline.

Masterclass e videocorso completati possono aprire YouTube in una nuova scheda esclusivamente
tramite:

- URL ufficiale della masterclass approvata;
- `youtube_playlist_url` ufficiale del partner;
- singolo video approvato, solo quando serve.

Il link alla playlist viene letto dal record partner e non ricostruito dai singoli video.

Il collegamento diretto al sub-account Systeme.io è esplicitamente fuori ambito e richiederà un
design separato per autenticazione, sessioni, permessi e isolamento fra partner.

## Sicurezza e privacy

- Un partner può leggere soltanto materiali collegati al proprio `partner_id`.
- Admin e superadmin possono supervisionare tutti i partner.
- I campi sensibili dei dati burocratici sono inclusi solo mediante whitelist esplicita.
- Nessuna credenziale, cookie, token, path storage o URL firmato viene inviato al browser.
- I link pubblici vengono validati per schema e host consentito.
- L'endpoint non accetta un URL arbitrario dal frontend da usare come proxy.
- Gli eventi di preview e download possono essere auditati senza registrare contenuti sensibili.

## Versioni

- La vista predefinita mostra la versione approvata corrente.
- Le versioni superate non vengono mescolate a quella corrente.
- `Versioni precedenti` può essere esposto in una seconda iterazione senza cambiare il contratto.
- Un materiale ritirato o `superseded` non è scaricabile dal partner per default.

## Modifica dei materiali

La finestra è principalmente di consultazione. `Richiedi una modifica`:

- non modifica direttamente il documento;
- identifica step e materiale;
- porta allo step corretto quando esiste un flusso di revisione dedicato;
- altrimenti invia una richiesta strutturata al team.

Per le videolezioni usa il sistema di revisioni video descritto nella specifica
`2026-08-12-revisioni-partner-videolezioni-design.md`.

## Confini della prima versione

Sono inclusi:

- archivio centralizzato per step;
- mappatura dei materiali storici;
- preview interna e download dei file consentiti;
- dati strutturati;
- link YouTube ufficiali per masterclass e videocorso;
- stati vuoti e gestione errori;
- messaggio sul Workbook completo.

Non sono inclusi:

- generazione del Workbook finale;
- collegamento al sub-account Systeme.io;
- download dei video;
- editor documentale nel modal;
- migrazione o cancellazione automatica dei file Drive;
- storico versioni esposto nella UI.

## Criteri di accettazione

- Ogni step completato apre l'Archivio dello step.
- La vecchia sintesi generica non viene più mostrata.
- Documenti, immagini e dati reali sono consultabili dentro Ciak.
- PDF, immagini e documenti consentiti sono scaricabili.
- I video non presentano un comando di download.
- Masterclass e videocorso mostrano il collegamento YouTube ufficiale quando disponibile.
- Nessuna risposta API o elemento UI espone URL Drive o GCS.
- Le pagine pubbliche possono aprire soltanto domini finali consentiti.
- I materiali storici vengono associati allo step corretto.
- I nuovi output registrano `step_id` alla creazione.
- Uno step senza materiali mostra uno stato vuoto veritiero.
- Preview e download negano l'accesso a un partner diverso.
- L'interfaccia funziona su desktop e smartphone.
- Ogni finestra mostra l'avviso sul Workbook completo.

## Strategia di verifica

- Test unitari della mappa categoria → step e della normalizzazione dei tipi.
- Test unitari del filtro URL che rifiuta Drive, GCS e host non consentiti.
- Test API per autorizzazione partner/admin e isolamento fra partner.
- Test API per preview inline, download attachment e Content-Type.
- Test API per materiali storici, versioni correnti e stati vuoti.
- Test frontend per selezione materiale, preview, download e retry.
- Test frontend che verifica l'assenza di `window.open` verso Drive/GCS.
- Test della playlist YouTube presente e assente.
- Test end-to-end su almeno uno step dati, uno PDF, uno Brand Kit e uno video.
- Smoke live su `https://www.ciak.io/partner/percorso` con un partner reale autorizzato.
