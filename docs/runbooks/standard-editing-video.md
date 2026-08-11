# Standard di editing video — Descript

Estratto da `CLAUDE.md` l'11/8/2026. Approvato da Claudio il 16/6/2026 sul pilota
"Modulo1_L1 - Benvenuto al corso".

**Vale per**: masterclass e ogni lezione videocorso di ogni partner.
**Rapporto con la pipeline Celery**: questo è lo standard di *qualità*; la pipeline
automatica (`backend/video_pipeline_task.py`) è il percorso di *produzione*. Dove i due
divergono, la qualità di riferimento è questa.

---

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
