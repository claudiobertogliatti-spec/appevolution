# Fatture passive dei collaboratori — Design

**Data:** 2026-07-13  
**Stato:** approvato da Claudio  
**Ambito:** Ciak Admin → Back office → Collaboratori

## 1. Obiettivo

Ciak deve permettere a Claudio di controllare e archiviare le fatture emesse da Antonella per le sue prestazioni lavorative e, in seguito, da altri collaboratori o fornitori.

Antonella non e' una cliente e non e' una partner. Nel dominio applicativo e' una **collaboratrice/fornitrice**: svolge attivita', matura un compenso calcolato sulle ore approvate, emette fattura a Evolution PRO e riceve il pagamento tramite bonifico.

La nuova funzione gestisce quindi **fatture passive ricevute**, distinte dalle fatture attive/courtesy invoice che Ciak genera per clienti e partner nella pagina `Fatture`.

## 2. Decisioni confermate

- Il controllo interno mantiene sia il compenso calcolato sia l'importo della fattura.
- Il compenso matura su periodi settimanali o quindicinali; la frequenza e' configurabile per collaboratore.
- Antonella emette una fattura per ogni pagamento.
- Solo Claudio/amministrazione carica fatture e dati del bonifico.
- Antonella non accede ai documenti contabili o bancari.
- Se fattura e compenso calcolato non coincidono, Ciak segnala la differenza ma consente il pagamento solo dopo l'inserimento di una nota obbligatoria.
- La fattura e' il documento fiscale ufficiale; ore e tariffa sono il controllo gestionale interno.

## 3. Approccio scelto

La funzione viene integrata nella pagina `Collaboratori`, non nella pagina delle fatture attive. Ogni collaboratore avra' due aree logicamente separate:

1. **Attivita' e compensi**: task, ore effettive, ore approvate e compenso maturato.
2. **Fatture e pagamenti**: liquidazioni periodiche, fattura ricevuta, controllo differenze e bonifico.

La prima versione supporta pienamente Antonella, ma modello dati e API usano un `collaborator_id` generico per accogliere altri collaboratori senza duplicare codice.

## 4. Modello di dominio

### 4.1 Profilo collaboratore

Il profilo contiene almeno:

- `collaborator_id` stabile, per Antonella `antonella`;
- nome e ruolo;
- tariffa oraria;
- modello di pagamento `ore_effettive_approvate`;
- frequenza di liquidazione: `weekly`, `biweekly` o `monthly`;
- stato attivo/inattivo.

La frequenza predefinita di Antonella verra' impostata in configurazione amministrativa. La chiusura manuale di un periodo resta possibile, così Claudio puo' scegliere di volta in volta tra una settimana e quindici giorni senza alterare le ore sottostanti.

### 4.2 Liquidazione

Una liquidazione rappresenta un unico ciclo compenso → fattura → bonifico. Documento MongoDB proposto: `collaborator_settlements`.

Campi principali:

- `settlement_id`;
- `collaborator_id`;
- `period_start`, `period_end`;
- `task_ids` delle attivita' approvate incluse;
- `approved_minutes`;
- `hourly_rate_snapshot`;
- `calculated_amount`;
- dati fattura: numero, data, importo, scadenza, file, nome originale;
- `difference_amount` e `difference_note`;
- dati pagamento: data, importo, riferimento CRO/TRN facoltativo, distinta facoltativa;
- stato;
- `created_at`, `updated_at`, autore delle operazioni.

La tariffa e il compenso vengono salvati come snapshot: una futura modifica della tariffa non deve cambiare liquidazioni gia' chiuse.

Ogni task approvato puo' appartenere a una sola liquidazione. Il backend impedisce periodi sovrapposti che riutilizzano lo stesso task.

## 5. Stati e transizioni

Gli stati utente sono:

1. `draft` — **Da chiudere**: periodo creato, ancora modificabile.
2. `awaiting_invoice` — **In attesa fattura**: ore e compenso congelati.
3. `to_verify` — **Da verificare**: fattura caricata; occorre confermare il confronto.
4. `to_pay` — **Da pagare**: verifica completata, bonifico non registrato.
5. `paid` — **Pagata**: bonifico registrato.
6. `cancelled` — **Annullata**: liquidazione esclusa dai totali operativi, conservata per audit.

Flusso normale:

`Da chiudere → In attesa fattura → Da verificare → Da pagare → Pagata`

Regole:

- La chiusura congela task, minuti, tariffa e compenso.
- Il caricamento fattura porta a `to_verify`.
- Se `invoice_amount != calculated_amount`, la conferma della verifica richiede `difference_note` non vuota.
- Registrare il pagamento richiede almeno data e importo pagato.
- La distinta e il CRO/TRN sono facoltativi.
- Una liquidazione pagata non si modifica: una correzione richiede annullamento amministrativo motivato e nuova liquidazione, conservando la cronologia.

## 6. Interfaccia amministrativa

La pagina `Back office → Collaboratori` mantiene la vista delle ore e aggiunge una scheda o sezione **Fatture e pagamenti**.

### 6.1 Riepilogo

Indicatori per periodo selezionato:

- compenso maturato;
- totale fatturato;
- totale da pagare;
- totale pagato;
- numero anomalie da verificare.

### 6.2 Elenco liquidazioni

Ogni riga mostra:

- collaboratore;
- periodo di competenza;
- ore approvate;
- compenso calcolato;
- importo fattura;
- differenza evidenziata;
- stato;
- azione successiva.

Filtri minimi: collaboratore, stato, intervallo date.

### 6.3 Creazione e chiusura periodo

Claudio seleziona data iniziale e finale. Ciak propone i task approvati e non ancora liquidati compresi nel periodo, mostra ore e totale e consente di chiudere la liquidazione.

Non si selezionano automaticamente task solo in base alla data di creazione: il riferimento e' `approved_at`, perche' il compenso nasce con l'approvazione. Prima della conferma l'elenco dei task inclusi e' visibile.

### 6.4 Caricamento fattura

Form amministrativo:

- PDF obbligatorio;
- numero fattura obbligatorio;
- data fattura obbligatoria;
- importo totale obbligatorio e positivo;
- scadenza facoltativa;
- nota libera facoltativa.

Dopo il caricamento Ciak mostra affiancati `Calcolato`, `Fatturato` e `Differenza`.

### 6.5 Registrazione bonifico

Form amministrativo:

- data pagamento obbligatoria;
- importo pagato obbligatorio e positivo;
- CRO/TRN o riferimento facoltativo;
- distinta PDF/immagine facoltativa;
- nota facoltativa.

Il pagamento resta registrato anche se differisce dalla fattura; in quel caso viene richiesta una nota di pagamento obbligatoria.

## 7. File e sicurezza

- Fatture e distinte sono documenti privati, mai esposti tramite URL pubblici permanenti.
- I file vengono salvati nel bucket GCS gia' usato da Ciak, sotto prefissi separati per collaboratore e liquidazione.
- Il database conserva object key, metadati, content type, dimensione e checksum; non conserva il PDF in base64.
- Download e visualizzazione passano da endpoint admin autenticati che verificano `require_ciak_admin`.
- Tipi ammessi: fattura `application/pdf`; distinta PDF, PNG o JPEG.
- Limite iniziale: 10 MB per file.
- I nomi originali vengono sanificati e non determinano la object key.
- Le operazioni di creazione, verifica, pagamento e annullamento registrano autore e timestamp.
- Le pagine e API contabili rimangono nascoste e inaccessibili all'account Antonella (`admin_type=antonella`).

## 8. API proposte

Tutti gli endpoint sono sotto `/api/ciak/admin/collaboratori` e richiedono un admin Ciak autorizzato alla contabilità.

- `GET /` — elenco profili collaboratori.
- `GET /{collaborator_id}` — riepilogo lavoro e configurazione.
- `GET /{collaborator_id}/settlements` — elenco e totali filtrabili.
- `POST /{collaborator_id}/settlements` — crea bozza da periodo e task eleggibili.
- `POST /{collaborator_id}/settlements/{settlement_id}/close` — congela il periodo.
- `POST /{collaborator_id}/settlements/{settlement_id}/invoice` — upload fattura e metadati (`multipart/form-data`).
- `POST /{collaborator_id}/settlements/{settlement_id}/verify` — conferma confronto; nota obbligatoria se esiste differenza.
- `POST /{collaborator_id}/settlements/{settlement_id}/payment` — registra bonifico e distinta.
- `GET /{collaborator_id}/settlements/{settlement_id}/files/{kind}` — download autenticato (`invoice` o `payment_receipt`).
- `POST /{collaborator_id}/settlements/{settlement_id}/cancel` — annulla con motivazione.

Le API esistenti `/collaboratori/antonella/tasks/*` restano compatibili nella prima iterazione. La generalizzazione completa dei task di altri collaboratori e' fuori scope, ma i nuovi endpoint di liquidazione non saranno hardcoded su Antonella.

## 9. Gestione errori e concorrenza

- Creazione rifiutata se non esistono task approvati eleggibili.
- Task gia' collegati a un'altra liquidazione non possono essere riutilizzati.
- Le transizioni controllano lo stato corrente per impedire doppi click e scritture fuori ordine.
- Il backend ricalcola importi e differenze; non accetta come fonte di verita' i totali inviati dal browser.
- Se l'upload GCS riesce ma il salvataggio MongoDB fallisce, il backend tenta la rimozione dell'oggetto orfano e registra l'errore.
- Un secondo invio identico della registrazione pagamento non crea duplicati.
- Errori leggibili spiegano quale dato manca o quale passaggio deve essere completato.

## 10. Migrazione e compatibilita'

Non serve migrare le fatture attive esistenti. I task di Antonella gia' approvati e non associati a una liquidazione diventano eleggibili per la prima liquidazione.

La pagina `Fatture` mantiene nome e comportamento attuali, aggiungendo una descrizione piu' esplicita (`Fatture emesse ai clienti`) solo se necessario a evitare ambiguita'. La pagina `Collaboratori` diventa la fonte di verita' per fatture passive e pagamenti dei collaboratori.

## 11. Verifica e test

### Backend

- calcolo liquidazione con piu' task e snapshot tariffa;
- esclusione task non approvati o gia' liquidati;
- rifiuto periodi/task duplicati;
- transizioni valide e non valide;
- fattura uguale al calcolato senza nota;
- fattura differente con nota obbligatoria;
- pagamento uguale e differente dalla fattura;
- autorizzazione: Claudio/admin ammesso, Antonella negata;
- validazione MIME, dimensione e campi;
- download autenticato dei file.

### Frontend

- indicatori e filtri;
- creazione periodo settimanale e quindicinale;
- anteprima task e totale;
- caricamento fattura;
- evidenza differenza e richiesta nota;
- registrazione bonifico e distinta;
- stati vuoti, caricamento ed errori;
- assenza della contabilità nella vista Antonella.

### Accettazione

Caso principale: Claudio chiude un periodo di Antonella, vede il compenso dalle ore approvate, carica la fattura ricevuta, giustifica un'eventuale differenza, registra il bonifico e ritrova fattura e distinta nello storico con stato `Pagata`.

## 12. Fuori scope della prima versione

- emissione automatica della fattura per conto del collaboratore;
- accesso del collaboratore all'archivio contabile;
- bonifici automatici o integrazione bancaria;
- lettura OCR automatica della fattura;
- IVA, ritenute e scritture contabili automatiche;
- sincronizzazione con software del commercialista;
- gestione completa di acquisti e fornitori non collegati a prestazioni tracciate in Ciak.
