# Wiring UI admin Evolution/Ciak — piano d'implementazione (T15-T19)

> Da eseguire **nell'ambiente frontend** (dove c'è `frontend/node_modules`), con **prova visiva**
> (dev server → screenshot desktop 1440/1280 + mobile 390) e **coordinato con la sessione
> partner-sereno** (stesso frontend, LIVE su ciak.io). Pelle **invariata** (logo reale Ciak, sidebar
> bianca, Poppins, navy `#0F172A` / giallo `#FACC15` / slate `#64748B` / hairline `#E5E7EB`): cambia
> solo l'organizzazione. Mockup di riferimento renderizzati: `direzione_mockup.html` (T15/T16),
> `partner_coda_mockup.html` (T17/T18).

**Vincolo di verifica:** `.venv-ops`/worktree non hanno `node_modules` → build e jest girano solo
nel repo con node_modules. Nessun merge in `main` senza build verde + screenshot autenticato.

**Coordinamento partner-sereno:** loro toccano il partner-FACING (`SerenoJourney`, flag
`REACT_APP_PARTNER_SERENO`); questo wiring tocca l'ADMIN (`CiakAdminApp`, `PartnerHub`,
`PartnerDetailModal`, `DepartmentRoom`, `CabinaRegia`). File attesi disgiunti, ma prima di iniziare:
`git fetch` + verificare che non abbiano PR aperte sugli stessi file; mergiare `main` nel branch
prima di lavorare e prima del merge finale (mai rebase su branch pushato).

---

## T15 — Navigazione (GIÀ SCRITTO)
Branch `codex/evolution-admin-riorg`, commit `60571888`: `CiakAdminApp.jsx` NAV con `persone[]`+`agenti[]`,
`MacroRoster`, Direzione, casi studio dentro Delivery, Carlo+Marco. **Resta**: build + render (sidebar
desktop/mobile) + allineare `departmentRooms.js` (DepartmentRoomIntro ha ancora `agent` singolo vecchio:
portarlo agli stessi agenti, o farlo leggere dal NAV).

## T16 — Direzione (dashboard) · file `pages/CabinaRegia.jsx`
Evoluzione dell'attuale dashboard, pelle invariata. Ordine: **coda decisioni in cima** → cassa → 4 reparti.
- La sezione "Cosa aspetta il tuo OK" diventa la **coda delle decisioni** con: pallino urgenza · persona/
  problema · da quanto · responsabile · **[Apri e decidi]**. Fonte: `GET /api/agent-tasks/approvals` (già usata)
  + i blocchi delle code reparto (task `blocked` con `next_action.owner_id`).
- Le 4 card reparto mostrano persone + "Agenti: X,Y" (stesso formato del NAV) + 2-3 KPI + blocco prioritario.
- Verifica: `CabinaRegia.test.jsx` esteso; nessun KPI senza periodo/fonte (regola dashboard T16 del piano motore).

## T17 — Scheda partner operativa · file `pages/PartnerDetailModal.jsx` (2590 righe) + `pages/PartnerHub.jsx`

### 17a. Header operativo (nuovo, in cima al modal)
Nuovo blocco `PartnerOpHeader` che apre su: **Situazione · Prossimo risultato · Blocco · Responsabile ·
Scadenza · [azione principale]**. Deriva dai dati GIÀ presenti in `data` (partner, funnel, masterclass,
videocorso, pagamenti):
- Situazione ← `partner.phase` (F1-F6) mappata a label leggibile (riusare `attoEvo`).
- Prossimo risultato ← prossima milestone dell'atto EVO corrente.
- Blocco ← primo step incompleto / materiale mancante (riusare la logica di `DeliveryAudit`/`PercorsoEvoPanel`).
- Responsabile ← agente/collaboratrice del reparto o owner del task.
- Scadenza ← `piano.prossima_scadenza` o data milestone. ⚠️ **Dato mancante**: se non esiste una
  "prossima azione"/"blocco" strutturata, **derivarla**, NON inventarla; dove serve un campo nuovo, aggiungere
  un endpoint di sola lettura, non un placeholder.

### 17b. Retab (riorganizzare, NON rimuovere logica)
Tab attuali Profilo / Dati Journey / Documenti / Pagamenti → **Panoramica · Percorso EVO · Materiali e
revisioni · Pagamenti · Attività · Impostazioni**. Mappatura dei blocchi JSX esistenti (spostare, mantenendo
stato e handler):
| Nuovo tab | Da dove viene (attuale) |
|---|---|
| Panoramica | NUOVO: header operativo + prossima azione + attività recente |
| Percorso EVO | `PercorsoEvoPanel` (oggi in fondo alla scheda) → promosso a tab |
| Materiali e revisioni | sezioni posizionamento/masterclass/videocorso/funnel (oggi sotto "Dati Journey") |
| Pagamenti | tab Pagamenti esistente (invariato) |
| Attività | log attività (fonte dati da verificare; se assente, derivare da updated_at/eventi) |
| Impostazioni | ex "Profilo" + **identificativi tecnici** `systeme_subdomain`, `youtube_playlist_id` (oggi in cima → qui) |
- `initialTab` esteso ai nuovi valori; default di apertura **"panoramica"** (oggi "profilo"/"journey").
- ⛔ Conservare TUTTE le capacità di editing esistenti: è una riorganizzazione dei pannelli, non una riscrittura.

### 17c. Tabella partner (`PartnerHub.jsx` TableView)
Colonne operative: **Partner | Passaggio attuale | Prossima azione | Responsabile | Scadenza | Blocco**
(revenue/piano/contratto → colonna secondaria o dettaglio, non in prima fila). `contrattoLabel` invariato
(non spacciare una data per firma).

### 17d. URL / deep-link (audit)
`/admin/partner?partner=<id>&tab=<tab>` con `useSearchParams`: aprire la scheda **aggiorna l'URL**; refresh e
link storico riaprono scheda+tab; il ritorno conserva vista (atto/tabella) e `statoFilter`. Oggi la vista è in
`localStorage` (`ciak_admin_partner_view`): mantenerlo come fallback, ma la fonte diventa l'URL.

## T18 — Code reparto · componente nuovo `DepartmentQueue` (usato in `components/DepartmentRoom.jsx`)
Ogni reparto apre la **propria coda**: tabella `Partner | Passaggio attuale | Prossima azione | Responsabile |
Scadenza | Blocco`, con:
- filtri **Bloccati · Attesa approvazione · Oggi · In ritardo** (in URL, persistenti);
- ordinamento prioritario esplicito;
- **persona vs agente AI** distinti da un tag;
- etichette del piano: "Percorso partner", "Apri area partner", "Nuovi contatti", "Registra aggiornamento",
  "Registra mancato incasso".
Fonti dati per reparto: Delivery ← dataset partner (come PartnerHub); Acquisizione/Vendite ← pipeline
esistenti (`PipelineList`, `LeadManager`); Back office ← `Amministrazione`/scadenze.

## T19 — Coerenza (pass finale su tutti i componenti toccati)
Una sola azione primaria (giallo su navy) per vista · pill di stato semantiche (verde/giallo/rosso) ·
intestazioni tabella persistenti · id tecnici solo in Impostazioni · focus tastiera visibile · contrasto WCAG ·
touch target ≥44px · desktop 1440/1280 e mobile 390 senza scroll orizzontale · `prefers-reduced-motion`.
Cronometrare 3 scenari (partner bloccato · materiale da revisionare · incasso da seguire): obiettivo capire
in 30s, azione in ≤2 passaggi.

---

## Ordine di esecuzione e verifica (nell'ambiente build)
1. `git fetch origin main`, merge in `codex/evolution-admin-riorg`, coordinare con partner-sereno.
2. T15 build+render sidebar (desktop+390) → screenshot. Allineare `departmentRooms.js`.
3. T16 CabinaRegia → build + `CabinaRegia.test.jsx` + render.
4. T17 PartnerDetailModal retab + header + PartnerHub tabella + URL → jest (`PartnerHub.test.jsx` + nuovo
   `PartnerDetailModal` tab test) + render desktop/mobile, provando: refresh su scheda, dati lunghi, partner
   senza materiale, ruolo non autorizzato, modifiche non salvate, link storico.
5. T18 `DepartmentQueue` per i 4 reparti → test componenti + render.
6. T19 pass coerenza + cronometri.
7. Ogni step: `npm run build` verde + screenshot allegato. Merge in `main` solo a build verde e con l'ok di
   Claudio (il merge fa deploy Vercel del frontend).

## Rischi
- `PartnerDetailModal` è enorme (2590 righe): il retab va fatto spostando blocchi interi, con un test che
  verifica che ogni funzione di editing sia ancora raggiungibile. Non riscrivere da zero.
- Campi "prossima azione"/"blocco"/"scadenza" potrebbero non esistere strutturati: derivarli dai dati reali o
  aggiungere endpoint read-only; **mai** un valore placeholder.
- Collisione partner-sereno sul frontend: coordinare merge, mai rebase su branch pushato.
