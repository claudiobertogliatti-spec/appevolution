# Ciak Editing Studio — Design (2026-07-11)

## Obiettivo

Risolvere il collo di bottiglia dell'**editing** dei video-lezione in Ciak. Oggi la
pipeline monta in automatico (AssemblyAI + euristiche filler/silenzi + FFmpeg +
Shotstack) e la qualità è mediocre ("gli ultimi montaggi non andavano bene"). Vogliamo:

1. **Tagli in stile Descript** (intercalari, ripetizioni, false partenze, pause) proposti
   da un motore AI e **rivedibili/correggibili** prima del montaggio.
2. **Intro/outro con voce unica Ciak** (via HeyGen, già nel processo).
3. Ogni lezione come **progetto di montaggio vivo**: riapribile e ri-montabile nel tempo
   (aggiungere girato, ritoccare) **senza far ricaricare il partner**.
4. **Niente YouTube**: il montato resta su GCS e si pubblica con un **link servito da Ciak**
   (copia-incolla nell'area corsi Systeme) + **salvato nei File del partner**.

Non-obiettivi: montaggi creativi complessi (multicamera, color grading spinto); resta editing
di pulizia + intro/outro. Systeme non espone API video → la pubblicazione è copia-incolla.

## Principio di brand voice / tagli

Scope dei tagli = **pulizia** (intercalari, ripetizioni, false partenze, pause lunghe),
**non** ristrutturazione del contenuto. Rispettare la brand voice Ciak (anti-fuffa) nei testi
intro/outro generati.

---

## Architettura: la lezione = "progetto di montaggio vivo"

Estende il documento lezione esistente (`partner_videocorso.lessons.{lesson_id}`).
**Il modello dati è progettato completo da subito (multi-clip + intro/outro)**; le Fasi 1–2
ne implementano il sottoinsieme a singola sorgente.

```
lessons.{lesson_id}.edit_project = {
  version: int,                 # +1 ad ogni (ri)montaggio
  sources: [                    # Fase 1/2 usano 1 elemento; Fase 3 abilita N
    {
      source_id: str,
      gcs_path: str,            # gs://.../raw_videos/{pid}/videocorso/{lesson_id}/<uuid>.mp4
      original_name: str|null,
      duration_s: float|null,
      transcript: str,
      words: [{text,start,end}],
      filler_report: {...},
      cut_segments: [{id,start,end,type,reason,word,enabled}],  # tagli di QUESTA sorgente
      order: int,               # posizione nella sequenza finale
      added_at: iso,
    }
  ],
  intro: { enabled: bool, script: str, generated: bool, media_gcs: str|null },
  outro: { enabled: bool, script: str, media_gcs: str|null },
  review_status: "da_revisionare" | "montaggio" | "pronto" | "pubblicato" | "error",
  output: { gcs_path: str|null, ciak_url: str|null, duration_s: float|null, montaged_at: iso|null },
  updated_at: iso,
}
```

Compatibilità: i campi attuali (`review_transcript`, `review_words`, `review_cut_segments`,
`pipeline_status`) restano validi; il checkpoint di pipeline scrive dentro `sources[0]` e mantiene
gli alias legaci finché il frontend non è migrato. Nessuna migrazione distruttiva.

## I 4 stadi

1. **Ingest** *(già esistente)* — grezzo su GCS (`raw_videos/...`) + trascrizione AssemblyAI.
2. **Taglio AI v2** — nuovo `services/ciak_cut_engine.py`.
3. **Revisione & correzione** — estende la UI `MasterclassReview` (già costruita) — **gate principale**.
4. **Montaggio + pubblicazione** — montage v2 → GCS → link Ciak + File partner.

---

## Componenti (interfacce e responsabilità)

### `services/ciak_cut_engine.py` — Taglio AI v2 (Stadio 2)
- **Cosa fa**: dato `transcript` + `words` (timings) + segmenti di silenzio (FFmpeg), un LLM
  (Claude, via `services/ciak_llm.py`) propone i tagli: intercalari, ripetizioni, false
  partenze, riempitivi; unione con pause/silenzi euristici. Output = `cut_segments`
  nello **stesso schema di oggi** (così la UI di revisione non cambia).
- **Interfaccia**: `propose_cuts(transcript, words, silence_segments, *, aggressiveness="clean") -> list[cut_segment]`. Puro rispetto all'LLM (LLM iniettabile per i test).
- **Dipendenze**: `ciak_llm`. Nessun I/O DB. Rimpiazza `detect_smart_edit_segments`.
- **Fallback**: se l'LLM fallisce → euristiche attuali (filler+silenzi), con flag `ai_cuts=false`.

### `MasterclassReview.jsx` (esteso) — Revisione & correzione (Stadio 3)
- Già rende trascrizione + tagli con toggle + "Approva e monta" (per masterclass **e** lezioni).
- **Aggiunte**: campo testo **intro** editabile (Fase 2); (Fase 3) pannello clip: aggiungi
  sorgente, riordina, rimuovi. Anteprima durata/risparmio già presente.
- **Gate**: "Approva e monta" → `POST /videocorso/review-approve` → Stadio 4.

### `services/ciak_montage.py` — Montaggio v2 (Stadio 4)
- **Cosa fa**: costruisce il finale = `[intro?] + [per ogni source in order: taglia i segmenti enabled] + [outro?]`
  → concat FFmpeg → MP4 finale → upload su **GCS** (`edited_videos/{pid}/{lesson_id}/v{version}.mp4`).
  Aggiorna `output.gcs_path` + `output.ciak_url`, `review_status="pronto"`, `version+=1`.
- **Interfaccia**: `montage_lesson(partner_id, lesson_id) -> {gcs_path, ciak_url}` (task Celery
  `apply_approved_cuts` v2, riusa `acks_late`/timeouts esistenti).
- **Idempotente/ri-montabile**: rileggibile dallo stato; ogni run bumpa `version`.
- **Niente YouTube** nel path videocorso.

### `services/ciak_intro_outro.py` — Intro/outro HeyGen (Stadio 4, Fase 2)
- **Config globale**: `CIAK_VOICE_ID` (voce HeyGen del protocollo), asset **card brandizzata**
  (GCS), **template outro**.
- **Intro dinamica**: LLM genera 1 frase — "In questa lezione {partner} ti mostrerà {topic}. Buona visione." —
  `topic` da titolo lezione + sintesi trascrizione. `generated=true`, editabile in revisione.
- **Outro template**: "Grazie per aver seguito la Lezione {n} del Modulo {m}… ti aspettiamo alla prossima."
- **Render**: HeyGen TTS (voce Ciak) → audio → overlay su card brandizzata (FFmpeg) → clip MP4.
  Cache: intro per-lezione; outro riusa il render col solo cambio numeri.
- **Fallback**: se HeyGen fallisce → montaggio **senza** intro/outro + flag visibile all'admin (non blocca).

### Pubblicazione — link servito da Ciak + File partner (Stadio 4)
- **Endpoint**: `GET /api/lesson-video/{partner_id}/{lesson_id}` (router nuovo) → **stream/redirect
  da GCS** (signed URL interno o proxy). Link **stabile e permanente**, controllabile/loggabile.
- **Admin**: nella card lezione mostra il link + bottone **Copia** + snippet `<video>` pronto
  (per il blocco HTML custom di Systeme). Systeme non ha API video → copia-incolla manuale.
- **File del partner**: alla pubblicazione, crea un record nei "File del partner" (I Miei File)
  con `title`, `lesson_id`, `ciak_url`, `type="lezione_video"`. *(Collezione esatta da confermare
  in implementazione: `partner_documents`/`materials`.)*

---

## Flusso dati (E2E)

```
Partner carica grezzo → GCS (raw_videos/...)               [già]
  → confirm-upload → pipeline: download + AssemblyAI        [già]
  → Taglio AI v2 (ciak_cut_engine) → cut_segments           [NUOVO]
  → stop a "da_revisionare" (sources[0])                     [già, mia estensione]
Admin apre "Revisione del taglio":
  → aggiusta tagli + (F2) ritocca intro → "Approva e monta"  [UI esistente + estesa]
  → review-approve → montage_lesson:
     [intro HeyGen] + [source cuts] + [outro HeyGen] → MP4   [NUOVO]
     → GCS (edited_videos/...) → ciak_url                    [NUOVO]
     → record nei File partner                               [NUOVO]
Admin: approvazione finale (ok/rifai) + Copia link → Systeme [UI]
Ri-editing futuro: riapri progetto → aggiungi/aggiusta → ri-montaggio (version+1)
```

## Integrazione col codice esistente
- `video_pipeline_task.py`: il checkpoint `da_revisionare` (già mio) chiama `ciak_cut_engine`;
  `_apply_approved_cuts` (ramo videocorso, già mio) viene sostituito da `ciak_montage` con
  **output GCS invece di YouTube**.
- `routers/partner_journey.py`: `videocorso/review-data` e `videocorso/review-approve` (già miei)
  estesi con intro + trigger montaggio.
- Card admin **video-pipeline-health** + pagina **Stato Sistema** (già mie) mostrano gli stati.
- Systeme: nessuna API video → copia-incolla (snippet fornito).

## Config
- `CIAK_VOICE_ID` (HeyGen) — env/Site Config.
- Card brandizzata intro/outro (asset GCS).
- Template outro (stringa).
- `GCS_BUCKET` (già esistente) — sub-path `edited_videos/`.

## Gestione errori
- Ogni stadio in try/except; i fallimenti emergono nella card **Salute pipeline video** (già).
- Ri-montaggio **idempotente** (version bump); il grezzo su GCS non si perde.
- HeyGen/LLM degradano con grazia (fallback documentati sopra), senza bloccare la lezione.

## Testing
- **Unit**: `ciak_cut_engine.propose_cuts` (trascrizione mock + LLM iniettato → tagli sensati,
  fallback su euristiche); `ciak_montage` decision/order logic; generatore script intro/outro;
  builder del link Ciak; record File partner.
- **Endpoint**: estensione dei test esistenti su review-data/review-approve lezione.
- **E2E**: ripetere il test reale già fatto (submit → da_revisionare → revisione → montaggio →
  link GCS) col nuovo motore, su una lezione di Daniele.

---

## Fasi di build

### Fase 1 — Core (fix del collo di bottiglia) ← primo spec/plan
- `ciak_cut_engine` (taglio AI v2) integrato nel checkpoint `da_revisionare`.
- `ciak_montage` (singola sorgente): applica tagli approvati → **GCS** (no YouTube).
- Endpoint `GET /api/lesson-video/{pid}/{lesson_id}` (link servito da Ciak).
- Salvataggio link nei **File del partner** + snippet copia-incolla in admin.
- Modello dati scritto come `edit_project.sources[0]` (compat con campi legacy).
- Test unit + E2E su una lezione Daniele.

### Fase 2 — Intro/outro HeyGen
- `ciak_intro_outro` (voce Ciak unica, intro dinamica, outro template, card brandizzata).
- Campo intro editabile nella UI di revisione.
- Montaggio con `[intro] + source + [outro]`.
- Config `CIAK_VOICE_ID` + card + template.

### Fase 3 — Multi-clip (editor "vero")
- UI clip: aggiungi nuovo girato (nuovo upload GCS come `sources[n]`), riordina, inserisci.
- Montaggio concat multi-sorgente.
- Ri-editing di lezioni già pubblicate.

## Rischi / questioni aperte
- **Costo/latenza LLM** sul taglio (transcript lunghi) — mitigabile con chunking; da misurare.
- **HeyGen**: capacità TTS voce-sola vs avatar; confermare voce Ciak e resa card. (Fase 2)
- **Systeme**: confermare se il campo "video da URL" accetta MP4 diretto o serve blocco HTML custom.
- **Serving GCS**: signed URL (scadenza) vs proxy Ciak — scelto **proxy/redirect servito da Ciak**
  per link permanente; verificare banda/costi egress.
- **Collezione File partner** esatta da confermare in implementazione.
```
