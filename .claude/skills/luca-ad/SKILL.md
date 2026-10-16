---
name: luca-ad
description: "Luca, l'agente AD: sessione del 29/6 (Luca AD + revisione video stile Descript) e STATO DI LUCA aggiornato al 15/8/2026, che supera le note precedenti. Caricala prima di lavorare su Luca, briefing, chat Luca o sue azioni."
user-invocable: false
---

> Contenuto spostato alla lettera da `CLAUDE.md` il 30/9/2026. Sono note di sessione con
> la loro data: descrivono lo stato di allora. Prima di agire verifica sul codice attuale.

## Sessione 2026-06-29 — Luca AD + Revisione Video stile-Descript (provata end-to-end)

### 1. Luca = Amministratore Delegato AI (Fase 2 FATTA, live in produzione)
- Backend `backend/routers/admin_luca.py`: prefix `/api/admin/luca`, endpoint `/chat` e `/history` (GET+DELETE), require_admin. Registrato in `server.py` subito dopo `admin_stefania`. Storico in collezione `admin_luca_conversations`. Modello claude-sonnet-4-6.
- Prompt AD con "sistema operativo" rubato dai migliori AD del mondo = 20 principi attribuiti (Grove output/OKR/leva, Bezos working-backwards/Type1-2/disagree-commit/input-metrics, Collins first-who/fatti-brutali/flywheel, Wickman EOS Rocks/L10/IDS, Slootman Amp-It-Up, Dalio believability/registro-errori, Benioff V2MOM, Doerr OKR/CFR, Hastings context-not-control/keeper-test, Campbell+Lencioni squadra, Lean gemba/PDCA/Hoshin, Drucker efficacia) + ritmo operativo giorno/settimana/trimestre + protocollo decisionale. Modalita SOLA CONSULENZA: legge i 4 reparti, consiglia, NON esegue/approva.
- Contesto live (build_luca_context) legge: partner/fasi/inattivi/step (Delivery), lead + analisi 67 EUR (ciak_leads/diagnostic_sessions), MRR/health (agent_hub_service), semaforo approvazioni (approval_workflow).
- Frontend `LucaChat.jsx`, pannello in CabinaRegia (home /admin). Avatar = SVG inline monogramma L oro su antracite. NOTA: il connettore GitHub NON carica file binari -> il luca.jpg generato e stato rimosso, foto reale da caricare a mano.

### 2. Verifica onesta del sistema agenti (analisi, non codice)
- Gli agenti NON dialogano tra loro: sono personaggi (swap del system prompt via target_agent) con cronologia separata. Coordinano via STATO CONDIVISO nel DB (partners, agent_tasks/coda approvazione) + Claudio umano-nel-loop. Lo smistamento di Stefania (route_message) e solo un consiglio, non innesca nessun agente. run_daily_monitoring produce etichette, non azioni.
- Luca NON e un orchestratore: e read+advise. Per coordinamento vero (futuro): bus task agente-verso-agente, Luca Fase 3 con poteri approva/assegna, memoria condivisa di squadra.

---

## ⚠️ STATO DI LUCA — aggiornato il 15/8/2026. Questo riquadro SUPERA le due righe "SOLA CONSULENZA" qui sopra.

Le note del 27 e 29 giugno restano com'erano scritte: erano vere allora. Cos'e' cambiato:

**Ci sono DUE Luca, e solo uno ha le mani.**

1. **Luca in chat** (`/api/admin/luca/chat`, `LucaChat.jsx`) — **continua a NON eseguire**, e ora il suo
   prompt lo dice invece di promettere il contrario. Motivo tecnico, non scelta: quella chiamata non
   passa `tools` a Anthropic, quindi non ha strumenti; e il cancello delle azioni vive sul PC di
   Claudio, non su Cloud Run. Qui Luca legge lo stato live e **prepara** — cioe' scrive in chiaro cosa
   va fatto, su quale entita', con quali valori e perche'. ⛔ Non deve dire "me ne occupo io".
2. **Luca schedulato** (azione programmata delle 7:45, `C:\Users\berto\Claude\Scheduled\briefing-luca-ad\`,
   **fuori da questo repo**) — **questo AGISCE**, sull'acquisizione, entro una whitelist di azioni
   nominate: oggi rimettere una campagna Meta su un obiettivo di tipo Lead (attesa 7 giorni fra due
   esecuzioni, perche' il cambio azzera l'apprendimento). Ogni azione va registrata in `azioni.json` +
   `registro.md`, altrimenti non e' considerata fatta.

⛔ **Dentro Ciak Luca NON scrive, in nessuna delle due forme:** dal commit `fa110052` (30/7/2026) ogni
scrittura sui dati partner richiede il token admin di Claudio. E' una decisione di sicurezza voluta,
non si aggira: si prepara il contenuto e lo esegue lui.

🔑 **La frontiera dura non e' il codice, sono i permessi:** il cancello `azione_permessa()` non e' un
lucchetto — nulla impedisce tecnicamente a un agente di chiamare un tool MCP saltandolo. Cio' che
decide davvero cosa Luca puo' toccare e' **quali tool MCP sono approvati sul task schedulato**.

📄 Spec e piano: `docs/superpowers/specs/2026-08-14-luca-agente-esecutivo-design.md` (Fase 1: le fonti
e la memoria) e `docs/superpowers/specs/2026-08-15-luca-fase2-mani-procedura-design.md` (Fase 2: le mani).

### 3. Revisione Video stile-Descript dentro Ciak — COSTRUITA, DEPLOYATA, PROVATA
Idea: la pipeline si ferma DOPO la trascrizione; chi revisiona legge il testo contro lo SCRIPT del team (che il team Ciak produce gia), toglie i tagli sbagliati con un click, approva -> montaggio. Circa 1/10 del tempo vs guardarsi il video.
5 incrementi (tutti live):
- Inc1 `video_pipeline_task.py`: flag env VIDEO_REVIEW_ENABLED (default off). Checkpoint dopo all_segs (ramo trascrizione-OK) -> salva review_transcript/review_words/review_cut_segments + status da_revisionare, return (no taglio/upload). + Checkpoint CATCH-ALL dopo il blocco trascrizione (prima di YouTube): in review-mode ferma SEMPRE a da_revisionare anche se la trascrizione fallisce -> non pubblica mai il grezzo. Cap AssemblyAI alzato da 300 a 900s.
- Inc2 `partner_journey.py`: GET `/api/partner-journey/masterclass/review-data/{partner_id}` (transcript, words, cut_segments, script, raw_duration). POST `/api/partner-journey/masterclass/review-approve` body {partner_id, disabled_cut_ids} -> aggiorna enabled, status montaggio, avvia Fase B.
- Inc4 `video_pipeline_task.py` (in fondo): _apply_approved_cuts + task Celery apply_approved_cuts + run_apply_background. Ri-scarica il grezzo, taglia solo i segmenti enabled, upload YouTube, ready_for_review. Pipeline principale intatta.
- Inc3 `frontend/src/ciak/admin/pages/MasterclassReview.jsx`, route `/admin/revisione-video/:partnerId` in CiakAdminApp: script a sinistra, trascrizione coi tagli barrati (mappa parole-tempi, normalizza ms/s), lista tagli con toggle Taglia/Tieni, bollini controlla su smart/pause-lunghe, bottone Approva e monta.
- Inc5: route in `CiakAdminApp.jsx`; sezione "Da revisionare - taglio testo" con bottone Apri revisione in `VideoReview.jsx` (lo endpoint /api/admin/video-review gia ritorna tutti gli stati).
Campi DB nuovi (su masterclass_factory): review_transcript, review_words, review_cut_segments[{id,start,end,type(filler/silence/smart),reason,word,enabled}], review_filler_report, review_note, video_reviewed. Stati pipeline nuovi: da_revisionare, montaggio.

### 4. INFRA — scoperte critiche (LEGGERE prima di deployare il backend)
- ⚠️ **SUPERATO (verificato 2026-07-30): IL DEPLOY BACKEND ORA È AUTOMATICO.** Il testo qui
  sotto descriveva la situazione di giugno 2026 ed è obsoleto — si conserva solo come
  storico. Oggi esiste `.github/workflows/deploy-backend.yml`: su push a `main` che tocca
  `backend/**` deploya via Workload Identity sia `evolution-pro-backend` sia
  `evolution-pro-worker`, punta il traffico all'ultima revisione e fa uno smoke test su
  `/api/health`. **Non serve nessun `gcloud run deploy` manuale, e soprattutto non si
  deploya più dalla cartella locale**: il workflow builda da `origin/main`, quindi non è
  più possibile mandare in produzione una copia stale. Esiste anche `.github/workflows/ci.yml`
  (gitleaks + compileall + flake8 E9/F821 + unit test + build frontend) su ogni PR e push.
  *(Storico, NON più valido: «IL DEPLOY BACKEND NON E AUTOMATICO DA GITHUB: NON esiste
  trigger Cloud Build. Si deploya con `gcloud run deploy evolution-pro-backend --source
  ./backend`, che builda dalla CARTELLA LOCALE. La copia locale era 41 commit indietro ->
  per settimane i commit backend fatti via GitHub NON arrivavano in produzione.»
  La procedura che indicava di deployare da `C:\Users\berto\Desktop\appevolution` era
  doppiamente sbagliata: quella è la copia ritirata vietata in cima a questo file.)*
- Le build Cloud Run sono REGIONALI: gcloud builds list (global) mostra solo build vecchie; usare --region=europe-west1.
- Il worker Celery gira IN-PROCESS nel backend (GET /api/celery/status -> worker_running true, beat_running true). Il servizio separato evolution-pro-worker NON e il consumer attivo dei video: basta deployare evolution-pro-backend. Flag VIDEO_REVIEW_ENABLED=true messo su backend + worker (le env var persistono tra i deploy da source).
- Frontend: deploya da solo via Vercel su push a main (nessun gcloud).

### 5. Test reale Daniele Andolfi (partner_id "23") — PROVATO END-TO-END OK
- Grezzo: gs://gen-lang-client-0744698012_cloudbuild/raw_videos/23/masterclass/ad035e094bd946cea7ac19df6eef97e2.mp4 (1.26 GB, ~13.7 min).
- Comandi test PowerShell (endpoint aperti, niente token): reset = Invoke-RestMethod -Method Post -Uri ".../masterclass/reset-pipeline?partner_id=23"; submit = POST .../masterclass/submit-video-link body {partner_id:"23", video_url:gs://...}; stato = GET .../masterclass/video-status/23.
- RISULTATO: da_revisionare con transcript 7218 caratteri, 1159 parole, 46 tagli proposti. Schermata ciak.io/admin/revisione-video/23 piena. FUNZIONA.
- CAUSA dei fallimenti iniziali (error_youtube): account AssemblyAI con SALDO NEGATIVO (400 "balance negative", chiave d11bb60e...). RICARICATO -> trascrizione OK. Prima del catch-all, fallita la trascrizione, la pipeline tirava dritto fino a YouTube (token scaduto) -> error_youtube; ora il catch-all chiude il buco.

### 6. TODO residui (RIPRENDERE DA QUI)
1. TOKEN YOUTUBE scaduto: la Fase B (montaggio dopo Approva e monta) carica su YouTube e fallisce -> rigenerare il token (runbook docs/runbooks/youtube-reauth.md). Senza, la revisione funziona ma il montaggio non finisce online.
2. (Opzionale) esporre review_note / errore-trascrizione anche in review-data + schermata, cosi gli errori (es. credito AssemblyAI) si vedono in admin senza leggere i log.
3. Estendere la revisione testo al VIDEOCORSO (ora solo masterclass).
4. Foto reale Luca /agents/luca.jpg (ora solo monogramma SVG): caricare a mano o con generatore ritratti.
5. Pulizia working tree locale: git clean -fd per togliere i file temporanei _*_check.py / _*_check.jsx (non sono su GitHub).
6. Valutare trigger Cloud Build da main per auto-deploy backend.
7. Task ancora aperto: funnel-da-browser su Systeme (clone Template Master via Condividi + iniezione copy TipTap).
8. Futuro Luca: Fase 3 orchestratore (approva/assegna dalla chat) + bus task agente-verso-agente.

### Commit chiave (su main) e stato deploy
Luca: 7112e43 (admin_luca + LucaChat + CabinaRegia), 3d0a5b9 (server.py reg), 6625253 (CLAUDE.md Luca), 2cb9a11 (avatar SVG). Revisione video: 1ab2322 (checkpoint), 9611959 (Fase B), endpoint review-data/review-approve, b76074a (MasterclassReview), 207ac20 (route), c226e19 (VideoReview entry), dd2b61a (cap 15min + catch-all). Backend in produzione: revision evolution-pro-backend-00401 (deploy da source DOPO git reset --hard origin/main).
