---
name: storico-journey-partner
description: "Storico di journey e area partner: MasterclassPage, AdminPartnerJourneyEditor, fix del 20/4, posizionamento 6 campi e API partner-hub (10/6), fix 'I Miei File' (19/6). Caricala prima di toccare journey partner, masterclass, posizionamento o file del partner."
user-invocable: false
---

> Contenuto spostato alla lettera da `CLAUDE.md` il 30/9/2026. Sono note di sessione con
> la loro data: descrivono lo stato di allora. Prima di agire verifica sul codice attuale.

## Architettura MasterclassPage (2026-04-20)

### Vista Admin — sequenza 4 card numerate
File: `frontend/src/components/partner/MasterclassPage.jsx`

La vista admin (`isAdmin=true`) mostra 4 card in sequenza verticale:
1. **Creazione Script** — `AdminMasterclassPanel` (7 domande + Genera Script AI + Segna Pronto). Verde quando `fullScript` esiste.
2. **Approvazione Script** — script + bottone giallo "Approva Script" (chiama `approveScript(true)`). Verde quando `dyfStatus === "approvato"`.
3. **Creazione Video** — stato pipeline (`videoData?.pipeline_status`). Verde quando `ready_for_review` o `approved`.
4. **Approvazione Video** — bottone verde grande "Approva il Video Masterclass" visibile solo quando `pipeline_status === "ready_for_review"`. Chiama `handleApproveVideo` definito in `MasterclassPage`.

Stato colori card: grigio (non attivo) → bordo giallo (attivo) → bordo/sfondo verde (completato).

`handleApproveVideo` è in `MasterclassPage` (non in `AdminMasterclassPanel`). Chiama `POST /api/partner-journey/masterclass/approve-video?partner_id=`.

`approveScript` e `isApprovingScript` vengono da `useDoneForYou(partnerId, "masterclass")` destructurato al top del componente.

### Vista Partner — sequenza unificata 4 step
La vista partner (non admin) è una **singola pagina** con 4 card sempre visibili (non schermate separate).

**Flusso reale**: il team Evolution crea lo script e fa tutto l'editing; il partner registra il grezzo e approva il risultato.

1. **Script pronto** — spinner se in corso, verde quando `dyfStatus === "pronto" || "approvato"`
2. **Approva lo Script** — script + bottone verde "Approva lo Script" (chiama `approveScript(false)`). Si sblocca quando step 1 completato.
3. **Invia il Video Grezzo** — istruzioni Drive + `VideoSubmissionCard`. Dopo invio: "Video ricevuto — il team sta lavorando all'editing" (nessuna label tecnica pipeline visibile al partner).
4. **Approva il Video Definitivo** — embed YouTube + bottone verde "Approva il Video — Tutto ok!" (chiama `handleApproveVideo`). Si sblocca quando `pipeline_status === "ready_for_review"`.

Roadmap visiva nell'header scuro in cima mostra i 4 step con colori aggiornati in tempo reale.

**NON usare più** `VideoUploadPhase` o `FinalVideoReviewPhase` come schermate separate — esistono nel file ma non vengono chiamate.

### Flusso video — Masterclass e Videocorso (identico per entrambi)

**Il partner NON fa editing.** Il flusso corretto è:
1. Team Evolution crea lo script (admin panel)
2. Partner approva lo script
3. Partner registra il video grezzo → carica su Google Drive → entra in piattaforma e invia il link Drive
4. Team Evolution scarica, edita, carica su YouTube (unlisted) sul canale Evolution PRO
5. Partner guarda il video su YouTube e lo approva cliccando "Approva il Video — Tutto ok!"

**Visibilità pipeline al partner**: mostrare SOLO "Video ricevuto — il team sta lavorando all'editing". MAI mostrare label tecniche come "Trascrizione AI", "Taglio filler words", "Upload YouTube".

**Questo flusso vale identicamente per ogni lezione del Videocorso** (stesso pattern: grezzo Drive → editing team → YouTube → approvazione partner).

### YouTube Playlist
- Creata automaticamente dalla pipeline Celery al primo video processato
- Nome: `"Evolution PRO - {partner_name}"` (file: `backend/video_pipeline_task.py`, funzione `create_youtube_playlist_sync`)
- ID salvato in `partner.youtube_playlist_id`, URL in `partner.youtube_playlist_url`
- La stessa playlist viene riusata per tutte le lezioni del videocorso dello stesso partner
- Aggiunta video alla playlist: `add_to_youtube_playlist_sync(youtube_id, playlist_id)`

### Daniele Andolfi — masterclass (2026-04-20)
- Partner ID: `"23"`, email: `andolfi3275@gmail.com`
- Video grezzo: `masterclass 2.mp4` (Google Drive ID `1_5iI-JsEWue-CUVu3SoIMkdJknQYB1UY`)
- Pipeline fallita con `SoftTimeLimitExceeded` — fix timeout deployato il 2026-04-20, pipeline riavviata automaticamente
- Quando arriva a `ready_for_review`: admin vede il video in Video Review panel (sezione "Da approvare") e in MasterclassPage step 4
- Prima masterclass reale del sistema — usarla per verificare qualità produzione

### AdminSidebarLight — ⚠️ OBSOLETO (vecchio admin Evolution PRO)
`frontend/src/components/admin/AdminSidebarLight.jsx` **non è** la sidebar attiva (non esiste più su `origin/main`). La struttura "GIORNALIERO / ACQUISIZIONE / PARTNER / MARKETING / SISTEMA" era l'admin Evolution PRO. La sidebar admin di **ciak.io** vive interamente nell'array `NAV` di `frontend/src/ciak/admin/CiakAdminApp.jsx` → struttura corrente a 5 macro-reparti documentata nella sezione "Sidebar admin Ciak — 5 macro-reparti" in fondo a questo file.

## AdminPartnerJourneyEditor — Editor Journey Admin (2026-04-20)

### Cosa fa
Editor full-page per modificare tutti i dati journey di un singolo partner. Pensato per migrare i dati dei 23 partner in onboarding senza bloccarsi.

### File
- `frontend/src/components/admin/AdminPartnerJourneyEditor.jsx` — componente principale
- Montato in `App.js` come `nav==="journey-editor"` (richiede `selectedPartner`)

### Come aprirlo
Dalla lista partner (nav `"partner"`) → bottone viola **"Journey"** nella colonna Azioni. Passa `selectedPartner` e naviga a `nav="journey-editor"`.

### Struttura accordion — 6 step
1. **Posizionamento** → `partner_posizionamento` (corso_titolo, corso_descrizione, avatar, target, USP)
2. **Funnel Light** → `partner_funnel` (funnel_url, optin_url, is_published)
3. **Masterclass** — Script + Video:
   - Script: `dyf_status` dropdown + textarea script → `masterclass_factory`
   - Video: `pipeline_status` dropdown (bypass manuale), YouTube URL (con embed preview + auto-estrazione ID), Drive URL → `masterclass_factory`
4. **Videocorso** → `partner_videocorso` — editor per-lezione (title, pipeline_status, YouTube URL) + "Aggiungi lezione"
5. **Funnel Vendita** → `partner_funnel` (vendita_url, checkout_url, thankyou_url, is_active)
6. **Lancio** → `partners` (launch_date, launch_notes)

Header: fase dropdown → salva su `partners.phase`.

### API usata
- Lettura: `GET /api/admin/partner/{partner_id}/full-data`
- Scrittura: `PATCH /api/admin/partner/{partner_id}/journey` con `{collection, data}`

## Sessione 2026-04-20 — Fix applicati e funzionalità aggiunte

### Fix applicati in questa sessione
1. **`backend/video_pipeline_task.py`** — MongoDB Atlas fallback in `_run_pipeline()` (problema #9)
2. **`frontend/src/components/partner/MasterclassPage.jsx`** — `VideoSubmissionCard`: rimosso label tecnico pipeline e raw error MongoDB esposti al partner
3. **`CLAUDE.md`** — aggiunto problema #9 + corretta sintassi CM6
4. **`frontend/src/components/admin/AdminPartnerJourneyEditor.jsx`** — nuovo file (editor full-page journey admin)
5. **`frontend/src/App.js`** — import + route `journey-editor` + bottone "Journey" in AdminPartners

### Daniele Andolfi (partner ID "23") — stato pipeline masterclass
- Video grezzo: `masterclass 2.mp4` (Drive ID `1_5iI-JsEWue-CUVu3SoIMkdJknQYB1UY`)
- Pipeline avviata dopo fix MongoDB — era in stato `downloading` a fine sessione
- Quando arriva a `ready_for_review`: admin vede in Video Review panel e in MasterclassPage step 4
- Se si blocca ancora: usare Plan B bypass (PATCH journey con YouTube URL manuale + status `ready_for_review`)

### CM6 editor GitHub — pattern corretto per commit via browser
```js
const tile = document.querySelector('.cm-content').cmTile;
window.__cmView = tile.view;
const doc = __cmView.state.doc.toString();
const OLD = 'OLD_TEXT';
const idx = doc.indexOf(OLD);
__cmView.dispatch({changes:{from:idx, to:idx+OLD.length, insert:'NEW_TEXT'}});
// Poi cliccare "Commit changes..." → nel dialog "Commit changes" (senza ...)
// Il button click va fatto in 2 passi: apri dialog, poi click final button
```

### Commit via browser (quando bash sandbox è down)
Endpoint GitHub: `tree-save` (non `update`). Token CSRF si trova in:
```js
const scripts = Array.from(document.querySelectorAll('script[data-target="react-app.embeddedData"]'));
const data = JSON.parse(scripts[0].textContent);
window.__tokens = data?.payload?.csrf_tokens; // chiave: /owner/repo/tree-save/main/path
```
Il flusso corretto: applica modifiche CM6 → click "Commit changes..." → click "Commit changes" nel dialog.

## Sessione 2026-06-10 — Posizionamento 6 campi completato per TUTTI i 24 partner + API partner-hub

### Stato
- I 6 campi Posizionamento (Chi sei, Per chi lavori, Problema che risolvi, La tua soluzione, Pitch 10 secondi, Differenziatore) sono inseriti e verificati (backend + UI) per tutti i 24 partner. Elena Perniola lasciata vuota (nessun documento su Drive né web — regola di Claudio).
- Testi sintetizzati fedelmente dai documenti Drive di ciascun partner: "DOCUMENTO DI POSIZIONAMENTO <Nome>" (questionario 46 domande) oppure "<Nome> Pos" (Piano Operativo Strategico). Mappatura questionario → campi: Q17→Chi sei · Q11→Per chi lavori · Q12→Problema · Q18/19→Soluzione · Q23 condensato→Pitch · Q20/24→Differenziatore.

### Metodo veloce per scrivere/leggere il Posizionamento (USARE QUESTO, non la UI campo-per-campo)

⚠️ **Dal 2026-07-30 questi endpoint RICHIEDONO autenticazione.** Prima erano aperti a
chiunque: `GET /api/partner-hub/{id}` restituiva l'anagrafica completa e
`PATCH .../field` scriveva qualunque campo, senza token. Ora passano solo admin/superadmin
(su qualunque partner) e il partner stesso (solo sul proprio `partner_id`).

- `GET /api/partner-hub/{partner_id}` — profilo hub completo
- `PUT /api/partner-hub/{partner_id}` — upsert (body JSON, solo campi non-null)
- `PATCH /api/partner-hub/{partner_id}/field?field=X&value=Y` — singolo campo (stessa chiamata delle matite UI)

Campi ammessi: `whoYouAre, targetAudience, problem, solution, pitch, differentiator`
(+ offerName, offerPrice, offerIncludes, offerGuarantee). `PATCH .../field` accetta **solo**
i campi del modello `PartnerProfileHub`; qualunque altro nome → 422.

Dalla console del browser, loggati come admin su www.ciak.io, va aggiunto l'header:

```js
const t = localStorage.getItem("ciak_admin_token");
const H = { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
await fetch(`/api/partner-hub/${id}`, { headers: H }).then(r => r.json());
await fetch(`/api/partner-hub/${id}/field?field=pitch&value=${encodeURIComponent(v)}`,
            { method: "PATCH", headers: H });
```

Resta ~100× più veloce della UI; la tab Posizionamento storicamente bloccava gli screenshot CDP.
`GET /api/partners` (lista partner con id) è su un altro prefisso e non è toccato da questa modifica.

Vista admin dell'area partner senza passare dal selettore: `localStorage.setItem('ciak_partner_view_id', JSON.stringify({id,name}))` poi navigare su /partner/mio-spazio.

### ID partner (giu 2026)
| Partner | ID |
|---------|----|
| Arianna Aceto | 2 |
| Marco Orlandi | 3 |
| Sarah Arensi | 4 |
| Valter Romani | 9 |
| Simone Riccò | 10 |
| Daphne Oliveti | 11 |
| Mariantonietta Tornello | 12 |
| Cosimo Filieri | 13 |
| Annamaria Depalma | 14 |
| Marco Lamanna | 15 |
| Giuseppe Sarno | 16 |
| Elena Perniola | 17 |
| Maria Giulia Falcone | 18 |
| Michele Baggio | 19 |
| Alice Conventi | 20 |
| Silvia Sedda | 21 |
| Eva Gugliucciello | 22 |
| Daniele Andolfi | 23 |
| Sara Stella Due | 00435c30-cc6a-4667-a2b8-015c972661cd |
| Filadelfio Vasi | 38999296-0c07-4409-a2ff-c2df8be7680e |
| Federica Arimatea | fd1d56a7-2499-4be7-b39c-3b89caf6137d |
| Loris Bonomi | eb88d08c-9b23-478c-b759-e40bdef483cc |
| Marco Serra | 177e74e7-ec19-4ad2-98d4-b64a2d85c9ef |
| Andrea Fredi | 045f338e-74a0-46b4-b928-2ace47b092f5 |

### Note Drive
- Le cartelle partner sono sparse su più alberi: cercare con `title contains '<cognome>'`. Parent ricorrenti: `1sN2AADdLgSsqY92sQMj9QypOM0TKVx-H` e `1VJKKwveD6hAWpw68Jy6K4z2KzZxBVeAB`.
- app.evolution-pro.it risultava irraggiungibile (giu 2026): l'app operativa è ciak-frontend.vercel.app (/admin e /partner).

## Sessione 2026-06-19 — Fix "I Miei File": Visualizza rotto per file caricati dal partner

### Causa root (due bug concorrenti)
1. **Frontend (`PartnerFilesPage.jsx`)**: `handleView`/`Scarica` facevano `url.replace("/api","")` sugli URL relativi. Ma Vercel proxa **solo** `/api/* -> Cloud Run`; `/files/...` senza prefisso cadeva sulla SPA (index.html) -> il file non si apriva. Fix: aprire l'URL **as-is** (`window.open(url)`), senza togliere `/api`. Vale anche per il contratto PDF (`/api/contract/pdf-download/{id}`).
2. **Backend (`/api/files/upload` -> `file_storage.upload_file`)**: gli upload del partner finivano **solo su disco locale** di Cloud Run (effimero). `internal_url = /api/files/documents/pending/...`. Al riciclo dell'istanza i byte spariscono -> GET 404 (content-type `application/json`). I file ufficiali (contratto PDF in `db.contract_pdfs`, distinta su Cloudinary) erano già durevoli e infatti funzionavano.

### Fix applicato
- **Frontend**: rimosso `.replace("/api","")` in entrambi i punti.
- **Backend**: `upload_file` ora legge i byte una volta (`await file.read()` + `file.seek(0)`) e li carica anche su **Cloudinary** (`upload_file_direct`, folder `evolution_pro/partner_files/{partner_id}`, resource_type per estensione: image/video/raw). `internal_url` = `secure_url` Cloudinary; disco locale resta come fallback best-effort.
- **Cleanup**: rimosse via `DELETE /api/files/{file_id}` le 3 voci morte 404 di Luigi (Calafiore1/2.jpeg, Distinta_Calafiore.jpeg — foto-sorgente grezze, irrecuperabili perché su disco effimero). Restano i 2 file ufficiali durevoli (contratto PDF + distinta), entrambi 200.

### Regola generale (anti-ricorrenza)
**Mai affidarsi al disco locale di Cloud Run per file persistenti**: è effimero e per-istanza. Ogni file che deve sopravvivere va su Cloudinary/GCS. Se in futuro "Visualizza" torna a dare 404 con content-type `application/json`, è quasi certamente un file finito solo su disco locale.
