# Fase Valida (Metodo EVO) → 5 Workspace

Stato: pilota WS1 in produzione (2026-06-30). Decisione di Claudio: la Fase 2 "Valida"
non è un elenco di 9 pagine/step, ma **5 Workspace**, ognuno un obiettivo con dentro
tutte le attività per completarlo.

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

## Mappatura 9 step → 5 Workspace (confermata da Claudio)

| Workspace | Titolo | Step assorbiti | Agente |
|---|---|---|---|
| 1 | Creiamo la tua Masterclass | 05-script + 07-registra-masterclass | Andrea |
| 2 | Organizziamo il tuo Corso | 06-outline + 08-registra-lezioni | Andrea |
| 3 | Costruiamo il Sistema di Vendita | 09-funnel-asset + 10-funnel-team-work + prezzo (da 12) | Gaia |
| 4 | Prepariamo il Lancio | 11-calendario-30gg + webinar (da 12) | Marco |
| 5 | Andiamo Online | 13-lancio + go-live + report | Marco |

Lo step 12-prezzo-webinar è sciolto: prezzo → WS3 (checkout), webinar → WS4 (lancio).

## Pilota WS1 — file e contratti (in produzione)

Backend `backend/routers/workspace_valida.py` (prefix `/api/partner-journey/workspace`),
registrato in `server.py` dopo il blocco email_campaigns:
- `GET /{partner_id}/masterclass` → stato aggregato (ai_tasks, partner_tasks, deliverables, video, progress%)
- `POST /{partner_id}/masterclass/generate/{task_id}` → genera task AI dedicata (storyboard | slide_spec | regia | checklist): LLM via `services.ciak_llm` + deliverable PDF (`ciak_pdf.html_to_pdf` + Cloudinary + `db.files`)
- `POST /{partner_id}/masterclass/mark-read` → segna "Leggere lo script"

Riusa i motori esistenti (NON duplicati):
- script: `POST /api/partner-journey/masterclass/generate-script`
- video grezzo: flusso GCS resumable `/video/request-upload-session` + `/video/confirm-upload` (pipeline Celery)
- approvazione: `POST /api/partner-journey/masterclass/approve-video`

Dati: collezione `masterclass_factory`, nuovo campo `production_kit` per storyboard/slide/regia/checklist.
Le prime 6 task AI (analisi brand/posizionamento, strategia, titolo, promessa, script)
sono completate quando esiste lo script; le ultime 4 hanno generatore dedicato.

Frontend:
- `frontend/src/ciak/partner/operativo/WorkspaceShell.jsx` — componente riusabile a 8 sezioni (antracite #1A1F24 + giallo #FFD24D)
- `frontend/src/ciak/partner/operativo/Workspace1Masterclass.jsx` — WS1 con dati reali
- `PartnerOperativo.jsx` — deep-link `viewingStepId === "ws1-masterclass"` (inerte di default)

## Come testare il pilota

Da console browser su www.ciak.io loggato come partner (o vista admin partner):
```js
localStorage.setItem("ciak_partner_initial_step", "ws1-masterclass");
location.reload();
```
Partner consigliato per il test: Daniele Andolfi (id "23", ha già masterclass+video).

## Prossimi passi

1. Verificare il pilota WS1 in produzione (deploy Cloud Build + Vercel ~10 min).
2. Replicare il pattern su WS2 (Corso), WS3 (Vendita), WS4 (Lancio), WS5 (Online) — stesso WorkspaceShell.
3. Cutover: la fase Valida in `JourneyMap` mostra 5 card Workspace invece delle card step singole.
4. Generatori AI mancanti per gli altri WS: testi descrittivi/bonus/materiali (WS2), dominio/privacy/cookie/termini (WS3), reel/post/caroselli + check social (WS4), tracking/monitoraggio/report 30gg (WS5).
