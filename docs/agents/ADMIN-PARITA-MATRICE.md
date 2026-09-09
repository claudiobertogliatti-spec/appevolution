# Admin — Matrice di parità (semplificazione)

**Autore:** Claude Code (Luca). **Branch:** `cc/admin-semplificazione`, worktree `.worktrees/cc-admin-semplificazione`.
**Base:** `e55a6dd6` (blocco 1 di Codex, sopra origin/main `20f43d4d`). **Data:** 2026-09-09.

Documento **vivente**: si aggiorna a ogni blocco. Regola: nessuna funzione può restare senza destinazione o
senza test di raggiungibilità a fine lavoro. Due accessi si unificano solo dopo prova che portano alla stessa
capacità, conservando l'unione delle azioni. Tutte le affermazioni sono ancorate a file:linea letti nel worktree.

> ⚠️ **Vincolo verificatore:** `docs/agents/evidence/verify-admin-parity.cjs` (blocco 1) pretende il blocco
> `NAV` byte-identico alla base. Era una guardia del solo blocco 1. La riorganizzazione delle voci per reparto
> **cambierà** il NAV: quella guardia va sostituita da questa matrice (parità per *raggiungibilità*, non per
> congelamento del testo). Finché il NAV non cambia, il verificatore resta valido.

---

## 1. Inventario route-level (spina dorsale)

Fonte verificata di prima mano: `frontend/src/ciak/admin/CiakAdminApp.jsx` (NAV `:111-210`, Routes `:579-739`).
Path relativi a `/admin`. `hideFor:["antonella"]` = macro nascosta ad Antonella (route comunque registrata).

### Reparti in sidebar (NAV) e loro voci

| Macro | Ruoli visibili | Voci (route → componente) | Stato |
|---|---|---|---|
| **Direzione** (`dashboard`, to `/admin`) | tutti | index → `CabinaRegia` (Antonella → `AntonellaDashboard`) | invariato |
| **Acquisizione** (`acquisizione`, landing) | no antonella | lead-manager→`LeadManager`; lista-fredda→`ListaFredda`; pipeline→`PipelineAcquisizione`; acq-campagne-ads→`AcqCampaignsPage`; acq-calendario→`AcquisizioneCalendarioHub` | invariato (proposta rinomina voci, §4) |
| **Acquisizione e vendita** (`acquisizione-vendita`, landing) | no antonella | chiusura-insider→`ChiusuraInsider`; listino-prezzi→`ListinoPrezzi`; collaudo-checkout→`CollaudoCheckout` | **proposto accorpamento in Vendite** (§4, audit #1) |
| **Vendite** (`vendite`, landing) | no antonella | pipeline-blueprint→`PipelineList`; clienti-ciak→`ClientiCiak`; analisi-da-validare→`AnalisiDaValidare`; vendite-call→`PipelineList`; vendite-trattativa→`PipelineList`; vendite-ok→`PipelineList`; vendite-ko→`TrattativeKoHub` | invariato (rinomina/tab §4) |
| **Delivery** (`delivery`, landing) | **anche antonella** | consegne-start→`ConsegneStart`; partner→`PartnerHub`; delivery-audit→`DeliveryAudit`; motore-vendite-partner→`PartnerSalesEngine`; quarantena-partner→`QuarantenaPartner`; ex-partner→`ExPartner`; documenti-partner→`PartnerDocumenti`; delivery-masterclass→`DeliveryMasterclassHub`; delivery-lezioni→`DeliveryLezioniHub`; calendario-editoriale→`CalendarioEditoriale`; campagne-ads→`StefaniaWarMode`; metriche→`MetrichePostLancio`; casi-studio→`CasiStudio` | invariato (Casi studio resta in Delivery; §4 unifica video) |
| **Back office** (`back-office`, landing) | no antonella | amministrazione→`Amministrazione`; transactions→`AdminTransactions`; fatture→`Fatture`; collaboratori→`Collaboratori`; date-contratti→`DateContratti`; servizi-extra→`ServiziExtraAdmin` | invariato (rinomina §4) |

### Route fuori sidebar (raggiungibili via URL) — DA CONSERVARE

`stefania`→`StefaniaAdmin`; `leads`→`AdminLeads`; `leads/:email`→`AdminLeadDetail` (contestuale);
`clienti-analisi`→`ClientiAnalisi`; `approvazioni`→`Approvazioni`; `video-review`→`VideoReview`;
`video-pipeline`→`VideoPipelineMonitor`; `partner-setup-pending`→`PartnerSetupPending`;
`consegne-mancate`→`ConsegneMancate`; `automazione`→`AgentDashboard`; `revisione-video/:partnerId(/:lessonId)`→`MasterclassReview`;
`sistema`→`SystemHealth`; `kb-matteo`→`MatteoKBEditor`; `analisi-prompt`→`AnalisiPromptEditor`;
`template-email`→`TemplateEmail`; `configurazione`→`SiteConfig`; `oggi`→`AntonellaOggi`/redirect;
`simulatore`→`SimulatoreFatturato`; `masterclass-analytics`→`MasterclassAnalytics`; `pipeline-prospect`→`PipelineList`.

### Redirect e stub

- `percorso-evo` → `Navigate /admin/partner` (redirect). **Conservare.**
- `cabina-regia` → `Navigate /admin` (redirect). **Conservare.**
- `partner/:id` → `SectionStub` (`CiakAdminApp.jsx:722`). ⛔ **Stub morto**: la scheda partner reale è il **modale** in `PartnerHub` via `?partner=<id>&tab=<tab>` (`PartnerHub.jsx:439-451`, `481-490`). Nessuna capacità dietro `partner/:id`.
- `*` → `Navigate /admin` (catch-all).

**Conteggio:** ~52 route statiche + 2 redirect + route contestuali (`leads/:email`, `partner/:id`, `revisione-video/:partnerId(/:lessonId)`), coerente con `verify-catalog.cjs`.

---

## 2. Inventario azioni annidate (aree in perimetro)

### 2A. Code reparto (`components/DepartmentQueue.jsx`, montaggio in `CiakAdminApp.jsx:469-496`)

| Coda | Fonte dati | id riga | Apre il record? (PRIMA) | Destinazione verificata | Stato |
|---|---|---|---|---|---|
| **Delivery** (`DeliveryQueue`) | `/delivery-audit`+`/partners`+overrides | partner id | ✅ sì: `onOpenPartner`→`/admin/partner?partner=<id>&tab=panoramica` (`CiakAdminApp.jsx:473`) | PartnerHub modale (esiste) | invariato |
| **Acquisizione** (`AcquisizioneQueue`) | `/api/discovery/leads` | lead id | riga non cliccabile; ma ha **Nuovo lead** inline (POST `/api/discovery/leads`) | — | invariato (Nuovo lead già reale) |
| **Vendite** (`VenditeQueue`) | `/pipeline-blueprint` | `email\|session_token\|nome` (`:287`) | ⛔ **NO**: `<VenditeQueue />` senza callback (`CiakAdminApp.jsx:485`) | `AdminLeadDetail` `/admin/leads/:email` (esiste, `:718`) | **blocco 2** |
| **Back office** (`BackOfficeQueue`) | `/crediti` | credito id (`:337`) | ⛔ **NO**: loader non inoltra `onOpenPartner` (`DepartmentQueue.jsx:359`) | `Amministrazione` `?credito=<id>` (serve deep-link, §3) | **blocco 2** |

Colonne code: Partner/Prossima azione/Responsabile/Scadenza/Blocco. Errore→"Coda non disponibile", loading→"Caricamento coda…", vuoto→"Nessun partner…" (distinti, `DepartmentQueue.jsx:109-112,232-233`).

### 2B. Coda approvazioni (`components/ApprovalsQueue.jsx`) — già funzionale

CTA riga: Visualizza/Approva (`POST …/approve`)/Rifiuta (modale motivo →`…/reject`)/Scarta (`…/dismiss`). Stato/errore via toast; loading/vuoto distinti. **Invariato.**

### 2C. Delivery — scheda partner e materiali (verificato subagent + fonti)

| Capacità | Accesso attuale | Endpoint | Reale/stub |
|---|---|---|---|
| Apri scheda partner | Modale in `PartnerHub` `?partner=<id>&tab=` | GET `/partners`,`/delivery-audit` | ✅ reale |
| Cambio stato | `PartnerHub.jsx:531` | `POST /api/admin/ciak/partner/{id}/stato` | ✅ reale |
| Elimina **account** partner | `PartnerHub.jsx:501` + ConfirmDialog | `DELETE /api/admin/ciak/partner/{id}` | ✅ reale (≠ elimina materiale) |
| Vista partner (impersonazione) | `openVista` `PartnerHub.jsx:119-130` | scrive token localStorage → `/partner` | ✅ reale |
| Modifica metadati journey | `PartnerDetailModal` tab materiali | `PATCH /api/admin/partner/{id}/journey` | ✅ reale |
| Upload video grezzo (masterclass) | `PartnerDetailModal.jsx:289-329` | GCS resumable (request-upload-session→PUT→confirm-upload) | ✅ reale |
| Documenti identità (verify/reject/upload) | `PartnerDetailModal` + `partner_documents.py` | Cloudinary upload (`:109-153`); verify/reject admin | ✅ reale |
| Lista/visualizza file partner | `PartnerDocumenti.jsx` | GET `/api/partner-documents/*`, `/api/files/partner/{id}` | ✅ read-only |
| **Caricamento diretto materiali (area partner)** | `PartnerFilesPage.jsx:539-553` | — | ⛔ **stub: rinvia a Telegram** |
| **Sostituzione versione / stato approvato-vs-bozza** | — | — | ⛔ **assente lato UI** |

### 2D. Discovery / acquisizione (verificato)

- Bottoni **Nuovo lead / Importa lista / Ricerca automatica**: già esposti (blocco 1) in `LeadManager.jsx`.
- `POST /api/discovery/import` (`discovery_engine.py:517`): input `{leads:[…], auto_score}`, dedup per username+source/email, genera email fittizia se assente, output `{success, imported, skipped, errors[]}`.
- `POST /api/discovery/import-csv` (`:327`): multipart file `.csv`, alias colonne, dedup, output `{success, imported, duplicates, errors, hot_leads}`. **CSV≠XLSX nativo.**
- `POST /api/discovery/search-places` (`:1315`): doppio loop città×categoria in una request; `all_italy` default true (`LeadManager.jsx:522`).

---

## 3. Blocco 2 — code Vendite/Back office collegate al record (in corso)

**Obiettivo (audit #3 + prompt §4):** una riga di coda apre il record preciso; consegna e rata restano distinte.

| Funzione | PRIMA | DOPO | Parità |
|---|---|---|---|
| Riga coda Vendite | non cliccabile | click → `/admin/leads/<email>` (scheda contatto/trattativa esistente) | nessuna colonna/azione rimossa; solo aggiunta apertura |
| Riga coda Back office | non cliccabile | click → `/admin/amministrazione?credito=<id>` (evidenzia il credito) | PATCH rate invariati; solo aggiunta apertura + deep-link |
| Deep-link Amministrazione | assente | `?credito=<id>` evidenzia/scrolla la posizione | additivo, nessuna azione persa |

**Guardie:** Vendite naviga solo se la riga ha una email valida (id non-email → riga non cliccabile, nessun 404).
Delivery invariata. `DepartmentQueue` ora passa al callback la **riga intera** (`onOpenPartner(row)`), così
ogni reparto sceglie la destinazione: Delivery `row.id`→partner, Vendite `row.email`→contatto, Back office `row.id`→credito.

**File toccati:** `components/DepartmentQueue.jsx` (contratto riga + `openable` Vendite + forward Back office),
`CiakAdminApp.jsx` (3 callback), `pages/Amministrazione.jsx` (deep-link `?credito=`),
`components/DepartmentQueue.test.jsx` (7 test originali conservati + 4 nuovi).

**Prova (2026-09-09):**
- Jest: `4 suite / 20 test PASS` (DepartmentQueue+LeadManager+navigationMatch+DepartmentRoom). I 7 test originali di
  `DepartmentQueue.test.jsx` conservati (1 rinominato per il nuovo contratto, stesso intento).
- `npm run build`: exit 0, postbuild rigenera le 5 landing `.ciak.html`.
- `verify-admin-parity.cjs`: PASS (NAV/Routes/handler identici alla base — nessuna route persa).
- `git diff --check`: exit 0; scansione pattern credenziali: nessun match.
- ⛔ **Da fare:** collaudo browser autenticato desktop/mobile (click riga Vendite→contatto; click riga Back office→credito
  evidenziato; Delivery invariata). Non eseguito in questo blocco (serve sessione admin + backend con dati reali).

---

## 4. Riorganizzazione voci per reparto — PROPOSTA (blocco successivo, non ancora applicata)

Ogni accorpamento conserva route e capacità; i vecchi URL restano con redirect/filtro. Da eseguire dopo blocco 2.

- **Direzione:** aggiungere voci esplicite (Decisioni e blocchi, Andamento reparti, Obiettivi, Cassa) come ingressi a `CabinaRegia`/`Amministrazione`/`SimulatoreFatturato` già esistenti — nessun nuovo motore.
- **Acquisizione e vendita → Vendite (audit #1, strategia "Direzione + 4 reparti"):** spostare chiusura-insider, listino-prezzi, collaudo-checkout dentro Vendite; rimuovere la 6ª macro; redirect da `/admin/reparto/acquisizione-vendita`. Tutte e 3 le route restano.
- **Vendite:** pipeline-blueprint/call/trattativa/ok sono già lo stesso `PipelineList` con filtri di stadio → presentarli come tab di un'unica "Trattative" conservando i vecchi URL (audit #7).
- **Delivery:** unificare Masterclass+Video Lezioni in "Produzione video" con filtro (audit #6); i due hub attuali sono solo elenchi di link.
- **Hub solo-link da svuotare/togliere dal percorso quotidiano:** `AcquisizioneCalendarioHub`, `TrattativeKoHub`, `DeliveryMasterclassHub`, `DeliveryLezioniHub` (audit #5/#6). Strumenti restano nelle sedi principali.

---

## 5. Registro gap distinti (NON perimetro riorg — documentati, non allargano lo scope)

1. ⛔ **Caricamento diretto materiali area partner** (`PartnerFilesPage.jsx:539`): stub Telegram. Richiede integrazione reale (endpoint upload esistono per identità/video, non per deliverable generici) → blocco backend separato, solo se richiesto.
2. ⛔ **Nessuna versione/stato "approvato vs bozza"** per i materiali lato UI → gap di prodotto, non di riorganizzazione.
3. 🔴 **Discovery: falso successo + timeout.** `success:true` hard-coded con errori accumulati (`discovery_engine.py:1366-1375`; idem import `:600`, import-csv `:459`); loop città×categoria sincrono in una request (`:1350-1364`). UI nasconde la parzialità (`LeadManager.jsx:643-660`). Fix = distinguere riuscita/parziale/fallita + valutare background. Diagnosi con log/test, **senza** avviare scraping reale.
4. 🔴 **Sicurezza — endpoint senza auth/ownership** (coerente con memoria endpoint aperti): `GET /api/files/partner/{id}`, `DELETE/PATCH /api/files/{file_id}`, `GET /api/files/{path}`, `GET /api/partner-documents/*` (server.py), route partner in `partner_documents.py` (upload/delete/status/submit-review), `POST /api/discovery/import` + `import-csv`. Perimetro sicurezza, **decide Claudio**; qui solo segnalato.
5. ⚠️ **KPI Cabina di Regia** (`CabinaRegia.jsx:67-94`): `oneOff` = conteggi×listino, non somma transazioni; mescolato con `mrr` reale nella "Plancia €1M" (audit #9). Riconciliazione = blocco stati/KPI.
6. ⚠️ **Chat reparto "in attivazione"** (vendite/casi-studio/back-office): `MiniCheckBox` copia-prompt senza backend (`DepartmentRoom.jsx:24-53`). Non è un servizio attivo.

---

## 6. Stato blocchi

| Blocco | Contenuto | Stato |
|---|---|---|
| 1 (Codex) | ricerca strumenti reparto, code prima del supporto, titolo unico, matching sidebar, pulsanti lead | ✅ fatto (`e55a6dd6`) |
| 2 (Claude) | code Vendite/Back office → record; deep-link `?credito=` | ✅ fatto (test 20 PASS, build 0, parità PASS); ⛔ resta collaudo browser |
| 3 | riorganizzazione voci per reparto + accorpamenti (§4) | ⏭️ prossimo |
| 4 | discovery affidabile + materiali delivery reali (§5.1, §5.3) | ⏭️ backend, dopo riorg |
| — | gap sicurezza/KPI (§5.4, §5.5) | 📋 registrati, decide Claudio |
