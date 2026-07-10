# Ciak Migration Memory

## Sarah Arensi - caso pilota migrato

Data: 2026-07-10

Sarah Arensi e il primo partner usato come caso pilota per la migrazione reale Drive -> Ciak.

Correzione importante: Sarah non va considerata pronta al lancio. La migrazione consiste nel simulare il percorso Ciak completo con i dati disponibili e lasciare vuoti/marcati come mancanti tutti i blocchi non provati.

### Cosa e stato fatto

- Riordinata la cartella Drive Sarah Arensi.
- Create/validate sezioni Drive:
  - `01 - Documenti`
  - `02 - Masterclass`
  - `03 - Videocorso`
  - `04 - Calendario Editoriale`
  - `05 - Immagini`
  - `06 - Funnel e Follow-up`
- Migrati in Ciak i dati su partner ID `4`.
- Aggiornate collection:
  - `partners`
  - `partner_posizionamento`
  - `partner_videocorso`
  - `partner_funnel`
  - `masterclass_factory`
  - `files`
- Registrati 14 materiali Drive come allegati approvati.
- Fase 1 aggiornata il 2026-07-10 con stato `fase1_posizionamento_storia_brand_compilati_con_gap`.
- Dati web pubblici integrati: sito ufficiale, P.IVA pubblica `IT08577240966`, contatto pubblico, profili Instagram/Facebook/LinkedIn e profilo Arte Laguna.
- Contratto/distinta riletti come fonti primarie: formula Partnership Professional, 3.480 EUR in tre rate da 1.160 EUR, ripartizione 50/50, distinta 1/3 accreditata il 25/04/2025.
- Posizionamento compilato usando come fonte primaria `PosizionamentoSarahArensi.pdf` da Drive.
- Storia compilata in bozza usando posizionamento Drive + fonti web pubbliche.
- Brand kit compilato come parziale: la cartella `05 - Immagini` e vuota, ma gli asset visuali sono nelle cartelle storiche/lancio. In Ciak sono stati agganciati foto/hero visuale, direzione palette oro/fucsia/blu, tone of voice e note su logo `SA / Sarah Arensi` incorporato negli asset; logo standalone, foto isolate e font ufficiali restano da validare.

### Stato Sarah

Stato operativo: migrazione parziale in Ciak, percorso non completo.

Materiali presenti:

- posizionamento;
- contratto/distinta;
- call argomenti;
- struttura corso `La Matrice Creativa / Galactic Creativity`;
- descrizioni videocorso;
- calendario editoriale lancio;
- prompt contenuti lancio;
- email funnel;
- sequenza follow-up;
- archivio storico `LaMatriceCreativa`.

Gap residui:

- codice fiscale personale;
- documento identita fronte/retro;
- IBAN partner;
- sede legale/anagrafica fiscale completa;
- conferma social ufficiali da usare nel progetto Ciak;
- storia in formato Ciak approvata;
- posizionamento validato da Sarah;
- brand kit definitivo: logo standalone, foto professionali isolate, palette/font ufficiali;
- masterclass verificata;
- video finali del corso;
- bonus;
- cover;
- immagini branding;
- checkout 299/699/1399;
- Calendly/coaching premium;
- automazioni definitive Systeme.io.

### Regola per i prossimi partner

Per ogni partner:

1. Riordinare prima Drive senza cancellare nulla.
2. Spostare solo file certi nella struttura corretta.
3. Leggere `full-data` Ciak prima di scrivere.
4. Simulare tutto il percorso Ciak: dati/documenti, storia, posizionamento, brand kit, masterclass, videocorso, funnel, lancio/ottimizzazione.
5. Compilare solo i campi supportati da materiali reali o da deduzione ragionevole.
6. Lasciare vuoto o segnare come mancante cio che non abbiamo.
7. Non marcare una fase come pronta/completa solo perche esiste un materiale parziale.
8. Leggere contratto firmato e distinta come fonti primarie per formula, importi, date, durata e pagamento.
9. Usare ricerca web pubblica per sito, bio, P.IVA pubblica, social, profili e autorita, citando la fonte.
10. Non ricostruire codice fiscale o dati sensibili: inserirli solo se presenti in documenti ufficiali o materiali firmati.
11. Per il brand kit, non fermarsi alla cartella `05 - Immagini`: cercare anche in cartelle storiche, calendario editoriale, reel/storie/caroselli, funnel e materiali live.
12. Salvare backup locale pre/post in `storage/migration-backups`.
13. Aggiornare le collection journey corrette.
14. Registrare i materiali Drive in `files`.
15. Verificare con `GET /api/admin/partner/{id}/full-data`.
16. Aggiornare `docs/migration`.

Prossimo partner operativo: Cosimo Filieri.
