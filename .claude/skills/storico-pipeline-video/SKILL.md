---
name: storico-pipeline-video
description: "Storico tecnico della pipeline video partner (GCS, extract_audio, timeout subprocess, retry, caso Daniele Andolfi aprile 2026), token YouTube, standard di editing Descript. Caricala prima di fare debug o modifiche su pipeline video, upload YouTube o editing lezioni."
user-invocable: false
---

> Contenuto spostato alla lettera da `CLAUDE.md` il 30/9/2026. Sono note di sessione con
> la loro data: descrivono lo stato di allora. Prima di agire verifica sul codice attuale.

## Sessione 2026-04-22 — Fix pipeline GCS + debug multi-sessione Daniele Andolfi

### Problema: `await` in funzione sync `resolve_gdrive_url` (problema #11)
**Sintomo**: `SyntaxError: 'await' outside async function (video_pipeline_task.py, line 76)` — il worker Celery crashava all'import.

**Causa**: una sessione precedente aveva aggiunto via CM6 il codice GCS dentro `resolve_gdrive_url()` (che è `def`, non `async def`), mettendo `await download_from_gcs(...)` in una funzione sincrona.

**Fix**: rimosso il blocco errato da `resolve_gdrive_url()`, riportandola alla forma originale (commit `eb27d65` + `da4acec` per triggerare rebuild).

### Problema: URL GCS non gestito in `download_video()` (problema #12)
**Sintomo**: pipeline va in `error` con `"Request URL has an unsupported protocol 'gs://'"`. Lo stato scende da `queued` a `error` quasi immediatamente.

**Causa**: `download_from_gcs()` esisteva nel file ma non veniva mai chiamata da `download_video()`. Quando il fix del problema #11 ha rimosso il blocco errato da `resolve_gdrive_url()`, non c'era più nessun codice path per gestire URL `gs://`.

**Fix** (commit `585b468`): aggiunto in cima a `download_video()`:
```python
# GCS diretto
if url.startswith("gs://"):
    return await download_from_gcs(url, dest_path)
```
Deve essere inserito PRIMA della riga `file_id = extract_gdrive_file_id(url)` dentro `download_video()` (non dentro `resolve_gdrive_url()`).

### ⚠️ Rischio CM6: `doc.indexOf(TARGET)` trova la PRIMA occorrenza
In `video_pipeline_task.py` ci sono DUE occorrenze di `file_id = extract_gdrive_file_id(url)`:
- Indice ~2189 → dentro `resolve_gdrive_url()` (funzione SYNC — non mettere `await`)
- Indice ~5724 → dentro `download_video()` (funzione ASYNC — ok per `await`)

`doc.indexOf(...)` trova sempre la prima. Per targetare la seconda usare:
```js
const idx1 = doc.indexOf(TARGET);
const idx2 = doc.indexOf(TARGET, idx1 + 1); // seconda occorrenza
```
oppure usare un contesto più ampio e unico come anchor.

### Risultato finale (2026-04-22)
Dopo il deploy della revisione `evolution-pro-backend-00223-zpm`:
- Pipeline di Daniele Andolfi (partner ID "23") avanzata correttamente: `queued` → `downloading` → `cleaning`
- Il GCS download ha funzionato — il video (`masterclass 2.mp4`) è stato scaricato da `gs://gen-lang-client-0744698012_cloudbuild/raw_videos/23/masterclass/ad035e094bd946cea7ac19df6eef97e2.mp4`
- FFmpeg `cleaning` in corso al momento della chiusura sessione

### Commit in questa sessione
- `eb27d65` — rimosso await errato da resolve_gdrive_url
- `da4acec` — trigger rebuild (commento aggiunto)
- `585b468` — aggiunto GCS URL handling in download_video()

### Recovery se pipeline si blocca dopo cleaning
Se pipeline finisce in `error` durante `transcribing`, `cutting_fillers`, o `uploading_youtube`:
1. `POST /api/partner-journey/masterclass/reset-pipeline?partner_id=23` — reset stato
2. `POST /api/admin/partner/23/retrigger-video?video_type=masterclass` — retrigger
3. Se il video ha già l'URL YouTube ma il partner deve ancora approvarlo: usare Plan B bypass (PATCH journey con `pipeline_status: "ready_for_review"` + `video_youtube_url` + `video_embed_url`)


## Sessione 2026-04-22 (continuazione) — Pipeline Daniele Andolfi avanzata

### Task stuck in `queued` dopo retrigger precedente (problema risolto)
**Sintomo**: dopo il deploy del commit `d4c8d68` e il retrigger (task `437c536c`), la pipeline era rimasta in `queued` per ore.

**Causa**: il task era stato consumato dal worker silenziosamente — il worker lo preleva da Redis, tenta di eseguirlo, ma fallisce PRIMA di chiamare `set_status("downloading")`. Il DB rimane in `queued` e il task sparisce da Redis (default `task_acks_late=False` → task rimosso da Redis al momento del pickup, non al completamento).

**Recovery**: reset + retrigger fresco (task `f6d5df3b`, ore 13:53:13 UTC 2026-04-22).

### Progressione pipeline confermata (2026-04-22 ~13:53 UTC)
- `13:53:13` — retrigger eseguito (task `f6d5df3b-3a59-47fb-bff8-d373166bb80a`)
- `13:53:24` — status `downloading` ✓ (worker ha preso il task in ~11 secondi)
- `13:53:46` — status `cleaning` ✓ (GCS download completato in ~22 secondi)
- `cleaning` in corso con FFmpeg nel thread executor (fix #13 funziona)

**Nota**: il GCS download da `gs://gen-lang-client-0744698012_cloudbuild/...` è molto rapido (stessa infrastruttura GCP) — circa 20 secondi anche per file grandi.

### Recovery se cleaning si blocca ancora
Se `cleaning` dura più di 40 minuti senza andare in `error` o `transcribing`:
1. Verificare che il container sia aggiornato: `GET /api/celery/status` → `worker_pid` deve essere quello del nuovo deploy
2. Se il container è vecchio: attendere o forzare nuovo deploy con commit vuoto
3. Se container nuovo ma ancora bloccato: usare Plan B bypass con YouTube URL manuale

## Sessione 2026-04-22 (seconda continuazione) — Fix timeout subprocess + monitoraggio cleaning

### Fix subprocess timeouts troppo bassi per Cloud Run lento (problema #14 — commit su main)
**Sintomo**: su Cloud Run con CPU throttling, FFmpeg per video 13 min impiega ~15-21+ min. I timeout subprocess erano troppo bassi e rischiavano di far fallire il processing.

**Fix applicato** (commit `fix: increase ffmpeg subprocess timeouts (900→3600s, 300→1200s) for slow Cloud Run CPU`):
- `cmd_s` silenceremove: `timeout=900` → `timeout=3600` (1h)
- `cmd_a` loudnorm analysis: `timeout=300` → `timeout=1200` (20 min)
- `cmd_n` loudnorm apply: `timeout=900` → `timeout=3600` (1h)
- `cmd` extract_audio_for_whisper: `timeout=300` → `timeout=1200` (20 min)
- `cmd_c` cut_filler_segments: `timeout=300` → `timeout=1200` (20 min)

**Nota**: questo fix non impatta la pipeline in corso (Cloud Build ~10 min) — vale per le prossime esecuzioni.

### Osservazione: secondo tentativo (retry 1) in cleaning da 21+ min senza errore (14:37 UTC)
Con il fix `run_in_executor` (commit `d4c8d68`), un timeout subprocess propagherebbe l'eccezione correttamente e imposterebbe `error`. Il fatto che il status sia ancora `cleaning` senza errore a 21+ min significa che **silenceremove è completato con successo** entro i 900s. Il processing è probabilmente in fase loudnorm apply.

**Stima completion cleaning**: ~14:44-14:55 UTC.


## Sessione 2026-04-22 (terza continuazione) — Diagnosi timeout extract_audio + Retry 2

### Causa root del fallimento al secondo tentativo (confermata)
**Sintomo**: cleaning→downloading a 14:53:58 UTC, dopo 38 min 34 sec = 2314 secondi.

**Calcolo**: 2314s corrisponde ESATTAMENTE a:
- silenceremove: ~900s (timeout massimo)
- loudnorm analysis: ~300s (timeout massimo)
- loudnorm apply: ~814s (completato prima del limite)
- **extract_audio_for_whisper: 300s timeout scattato** ← causa root

`extract_audio_for_whisper` estrae l'audio per Whisper (ffmpeg -vn -acodec copy). Per un video da 13 min su Cloud Run con CPU throttling, 300s non è sufficiente. **Il fix corretto era alzarlo a 1200s** — già committato.

### Retry 2 (ultimo automatico — max_retries=2)
- Downloading a 14:53:58 UTC
- Cleaning a ~14:54:45 UTC

**Se il nuovo container (timeout fix deployato ~14:40) ha preso il task** → extract_audio avrà 1200s → cleaning completo ~15:29-15:35 → transcribing → success.
**Se il vecchio container ha preso il task** → stesso fallimento a ~15:32, poi serve reset+retrigger manuale.

### Recovery se retry 2 fallisce
```
POST /api/partner-journey/masterclass/reset-pipeline?partner_id=23
POST /api/admin/partner/23/retrigger-video?video_type=masterclass
```
Il retrigger manuale avvierà un task fresco sul container con timeout=1200s.


## ⏳ TODO YouTube — rigenerare il token sotto "Production" (fix scadenza 7 giorni)

La pipeline video carica su YouTube con un token OAuth in `youtube-user-credentials`
(Secret Manager, montato in `/secrets/youtube_credentials.pickle`). Se le lezioni
finiscono in `error_youtube` con `invalid_grant`, il token e' scaduto/revocato.

Fix fatto il 2026-06-09: token rigenerato (v5), deploy `00334`, consent screen
pubblicata in **Production**. **RESTA DA FARE**: il token v5 era emesso quando
l'app era ancora in "Testing", quindi eredita la scadenza a 7 giorni. Va
**rigenerato una volta ORA che l'app e' Production** per renderlo permanente.

Procedura completa: `docs/runbooks/youtube-reauth.md` (+ `scripts/youtube_reauth.py`).
In breve: `python scripts/youtube_reauth.py client_secret.json` (consenso col canale
Evolution PRO) -> `gcloud secrets versions add youtube-user-credentials
--data-file=youtube_credentials.json` -> redeploy backend.


## Standard editing video — Descript (2026-06-16)

Standard ufficiale di editing per masterclass e ogni lezione videocorso di ogni partner. Approvato da Claudio sul pilota "Modulo1_L1 - Benvenuto al corso". Questo è il **nuovo flusso** che sostituisce, lato qualità, la vecchia pipeline Celery FFmpeg/Shotstack.

### Ricetta-standard (ordine di applicazione)
1. **Pulizia**: rimuovere intercalari, ripetizioni inutili e pause troppo lunghe per stringere il ritmo. **Eccezione ferrea**: NON tagliare silenzi/pause durante meditazioni guidate o esercizi di respirazione. Verificare sempre che il discorso resti logico e di senso compiuto in italiano.
2. **Studio Sound** sulla voce del relatore (audio "da studio"). Sostituisce il solo loudnorm.
3. **NIENTE sottotitoli** (scelta di Claudio — nessuna caption da nessuna parte).
4. **Intro brandizzata** (title card): sfondo antracite `#1A1F24`, titolo giallo `#FFD24D` (font Manrope Bold) col **nome della lezione**, sottotitolo **"Modulo X - Lezione Y"** (NON "Evolution PRO"), musica soft con ducking. Voiceover AI **voce Cedric** che introduce in 2-3 frasi il contenuto (script ricavato dalla trascrizione).
5. **Outro brandizzato** (stessa grafica) con voiceover Cedric, testo fisso: "Grazie per aver seguito questa lezione. Ci vediamo nella prossima."
6. **Livelli**: voiceover intro/outro allineati al parlato della lezione (stessi LUFS), musica ~15% con ducking. Nessun salto di volume.
7. **Sincronia audio/video sempre preservata** — vincolo non negoziabile.

### ⚠️ Regola di sicurezza ferrea (anti-distruzione)
**MAI fare trim sulla traccia script.** Un trim sulla traccia script durante il pilota ha distrutto il corpo lezione (composizione ridotta a 5s, recuperata con undo). La durata dell'intro si regola **solo spostando il confine di scena**, mai tagliando lo script.

### Limite del connettore Descript (MCP) in Cowork
In questa sessione MCP la **generazione audio TTS e l'assegnazione delle voci AI sono disabilitate**: l'agente scrive i testi dei segmenti intro/outro ma NON può assegnare la voce Cedric né renderizzare l'audio. Passaggio **manuale** in Descript (2 clic): selezionare il segmento scratch → pannello Speaker → scegliere **Cedric** (per intro e outro). Implicazione strategica: per l'automazione end-to-end (Strada 2, pipeline propria) la voce intro/outro va generata via API TTS (es. ElevenLabs italiano), non via connettore Descript.

### Sequenza operativa per lezione (Strada 1 — Descript via connettore)
1. Video grezzo in un progetto Descript (import se necessario).
2. Applicare la ricetta-standard via `prompt_project_agent` (cleanup + Studio Sound + intro/outro brandizzati + livelli; no sottotitoli).
3. **Claudio**: assegnare voce Cedric a intro/outro in Descript (2 clic) → audio generato.
4. Pubblicare link riservato Descript (unlisted) come artefatto di review: `publish_project` 1080p, access `unlisted`. **MAI su YouTube prima dell'approvazione di Claudio.**
5. **Claudio** approva, esporta in alta e carica manualmente sulla playlist YT del partner.

### Strumenti connettore Descript (server MCP)
`list_projects`, `get_project`, `prompt_project_agent` (usare `conversation_id` per continuare la stessa conversazione), `wait_for_job` (timeout client ~180s — se scade, usare `list_jobs` per leggere lo stato), `publish_project`, `import_media`. Per modifiche successive sulla stessa composizione, riusare il `conversation_id` restituito dal primo job.

### Pilota di riferimento (2026-06-16)
Progetto Descript `b7e11cff-7c07-4bc1-99d0-8fc3fd46a374` ("Modulo1_L1_pilotaautomatico", videocorso mindfulness, 3 lezioni: L1 Pilota automatico / L2 Fare vs Essere / L3 Tornare ai sensi). Composizione approvata: "Modulo1_L1 - Benvenuto al corso" (id `acbf9a4d-bad3-4105-a9ff-af6459f9d512`).
