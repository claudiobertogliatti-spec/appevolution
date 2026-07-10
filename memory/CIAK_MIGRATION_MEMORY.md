# Ciak Migration Memory

## Sarah Arensi - caso pilota migrato

Data: 2026-07-10

Sarah Arensi e il primo partner usato come caso pilota per la migrazione reale Drive -> Ciak.

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
  - `partner_posizionamento`
  - `partner_videocorso`
  - `partner_funnel`
  - `masterclass_factory`
  - `files`
- Registrati 14 materiali Drive come allegati approvati.

### Stato Sarah

Stato operativo: migrata in Ciak, pronta al lancio con gap operativi.

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

- video finali del corso;
- masterclass definitiva / YouTube;
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
4. Salvare backup locale pre/post in `storage/migration-backups`.
5. Aggiornare le collection journey corrette.
6. Registrare i materiali Drive in `files`.
7. Verificare con `GET /api/admin/partner/{id}/full-data`.
8. Aggiornare `docs/migration`.

Prossimo partner operativo: Cosimo Filieri.

