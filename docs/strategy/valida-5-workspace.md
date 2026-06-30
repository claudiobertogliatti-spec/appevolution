# Fase Valida (Metodo EVO) → 5 Workspace

Stato (2026-06-30): WS1 Masterclass e WS2 Corso in produzione. Decisione di Claudio:
la Fase 2 "Valida" non è un elenco di 9 pagine/step, ma **5 Workspace**, ognuno un
obiettivo con dentro tutte le attività per completarlo.

## Struttura fissa di ogni Workspace (8 componenti)

1. Introduzione dell'agente AI (cosa faremo, perché conta, che risultato ottieni)
2. Obiettivo del Workspace (semplice, orientato al risultato, mai tecnico)
3. Task automatiche degli Agenti AI (checklist con stato ○ da iniziare / 🟡 in elaborazione / ✅ completata; alcune con pulsante "Genera")
4. Attività del Partner (registrare, caricare, revisionare, approvare, compilare)
5. Upload (drag & drop, file richiesti)
6. Deliverable (materiali ricevuti, apribili e scaricabili)
7. Pulsante principale (sempre uno solo, l'azione più importante)
8. Avanzamento (% completamento del Workspace)

Regole: deve sembrare di lavorare con un team, non un elenco di task. Task AI
visivamente separate dalle attività del partner. Avanzamento, deliverable e prossimo
passo sempre visibili. Carico decisionale del partner minimo.

Componente riusabile: `frontend/src/ciak/partner/operativo/WorkspaceShell.jsx`.

## Mappatura 9 step → 5 Workspace (confermata da Claudio)

| Workspace | Titolo | Step assorbiti | Agente | Stato |
|---|---|---|---|---|
| 1 | Creiamo la tua Masterclass | 05-script + 07-registra-masterclass | Andrea | ✅ in produzione |
| 2 | Organizziamo il tuo Corso | 06-outline + 08-registra-lezioni | Andrea | ✅ in produzione |
| 3 | Costruiamo il Sistema di Vendita | 09-funnel-asset + 10-funnel-team-work + prezzo (da 12) | Gaia | da fare |
| 4 | Prepariamo il Lancio | 11-calendario-30gg + webinar (da 12) | Marco | da fare |
| 5 | Andiamo Online | 13-lancio + go-live + report | Marco | da fare |

Lo step 12-prezzo-webinar è sciolto: prezzo → WS3 (checkout), webinar → WS4 (lancio).

## Backend — router (prefix `/api/partner-journey/workspace`)

Helper condivisi (LLM + deliverable PDF) in `workspace_valida.py`: `_llm_generate`,
`_save_kit_deliverable` (ciak_llm + ciak_pdf.html_to_pdf + Cloudinary + db.files).
Ogni router è registrato in `server.py` dopo il blocco email_campaigns.

WS1 — `backend/routers/workspace_valida.py`:
- `GET /{id}/masterclass` (stato), `POST /{id}/masterclass/generate/{task}` (storyboard|slide_spec|regia|checklist), `POST /{id}/masterclass/mark-read`
- riusa: `/masterclass/generate-script`, flusso video GCS, `/masterclass/approve-video`
- dati: `masterclass_factory.production_kit`

WS2 — `backend/routers/workspace_corso.py`:
- `GET /{id}/corso` (stato), `POST /{id}/corso/generate/{task}` (script_lez|testi|materiali|regia_lez)
- riusa: `/videocorso/generate-course`, `/videocorso/approve-course`, upload GCS per-lezione (video_type=videocorso, lesson_id), `/videocorso/approve-lesson`
- dati: `partner_videocorso.production_kit`; lezioni = dict keyed by lesson_id (lez-1, lez-2…)

## Frontend

`WorkspaceShell.jsx` (8 sezioni), `Workspace1Masterclass.jsx`, `Workspace2Corso.jsx`.
`PartnerOperativo.jsx` monta i workspace via mappa deep-link `WORKSPACE_COMPONENTS`
(`ws1-masterclass`, `ws2-corso`) — inerte di default. Per i prossimi WS basta aggiungere
l'import + una entry nella mappa.

## Come testare

Da console browser su www.ciak.io loggato come partner (o vista admin partner):
```js
localStorage.setItem("ciak_partner_initial_step", "ws1-masterclass"); // o "ws2-corso"
location.reload();
```
Partner consigliato: Daniele Andolfi (id "23").

## Prossimi passi

1. Verificare WS1+WS2 in produzione dopo il deploy (Cloud Build + Vercel ~10 min).
2. WS3 "Costruiamo il Sistema di Vendita" (agente Gaia): riusa `/funnel/generate` + `/funnel/publish` + Systeme.io; generatori per dominio/privacy/cookie/termini come task tracciate.
3. WS4 "Prepariamo il Lancio" (Marco): riusa `/editorial_calendar`, `/lancio/generate-plan`; generatori reel/post/caroselli + check social.
4. WS5 "Andiamo Online" (Marco): publish funnel, controllo tracking/automazioni, monitoraggio, report primi 30gg.
5. Cutover: la fase Valida in `JourneyMap` mostra 5 card Workspace invece delle card step singole.
