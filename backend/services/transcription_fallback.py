"""
Trascrizione di riserva per la pipeline video: AssemblyAI → Groq (Whisper, piano gratuito).

Perché esiste: il 1/10/2026 AssemblyAI ha risposto 400 "account balance is negative" e,
senza trascrizione word-level, ogni videolezione si è fermata in `error_transcription`
(lo standard `ciak-lesson-v1` non pubblica un montato senza tempi per parola). Un conto
in negativo non deve più bloccare l'editing: se AssemblyAI fallisce per qualunque motivo
(saldo, chiave, limite, timeout) si prova Groq, gratuito.

Il risultato ha ESATTAMENTE la forma di `assemblyai_transcribe` (transcript, words con
start/end in SECONDI, filler_segments, silence_segments) + `provider`: il resto della
pipeline non cambia.

Limiti noti di Groq/Whisper, dichiarati e non nascosti:
  - Whisper tende a NON trascrivere gli intercalari ("ehm", "uh"): i tagli di filler
    saranno meno numerosi. Le pause lunghe si ricavano dai tempi fra le parole e restano
    corrette; per le lezioni sono comunque ricalcolate da `enforce_lesson_policy`.
  - Piano gratuito: 25 MB per file (≈ 50 min di mp3 mono 64 kbps), 20 richieste/minuto,
    7.200 secondi di audio/ora e 28.800/giorno. Sopra il limite si solleva errore e vale il
    comportamento di sempre (nessun montato).

Configurazione: variabile d'ambiente `GROQ_API_KEY` sul servizio worker (una tantum).
Modello: `GROQ_WHISPER_MODEL` (default `whisper-large-v3`).
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Awaitable, Callable, Dict, List, Optional

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
DEFAULT_MODEL = "whisper-large-v3"
MAX_FILE_BYTES = 24 * 1024 * 1024          # sotto i 25 MB del piano gratuito
MAX_RATE_LIMIT_RETRIES = 3
MAX_RETRY_AFTER_S = 90                     # oltre, il limite è orario/giornaliero: inutile aspettare

# Stessi intercalari e stessa soglia di pausa di `assemblyai_transcribe`.
FILLERS = {"um", "uh", "eh", "ehm", "allora", "tipo", "cioè", "quindi", "insomma",
           "praticamente", "diciamo", "appunto"}
SILENCE_MIN_GAP_S = 0.5


class TranscriptionUnavailable(RuntimeError):
    """Nessun provider di trascrizione disponibile o tutti falliti."""


def build_result(transcript: str, words: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Dalla lista parole (secondi) alla struttura attesa dalla pipeline."""
    filler_segs = [
        {"start": w["start"], "end": w["end"], "word": w["word"]}
        for w in words if w["word"].lower().strip(".,!?") in FILLERS
    ]
    silence_segs = []
    for cur, nxt in zip(words, words[1:]):
        gap = nxt["start"] - cur["end"]
        if gap > SILENCE_MIN_GAP_S:
            silence_segs.append({"start": cur["end"], "end": nxt["start"], "duration": gap})
    return {"transcript": transcript, "words": words,
            "filler_segments": filler_segs, "silence_segments": silence_segs}


def parse_groq_words(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parole dal JSON `verbose_json` di Groq. Accetta `word` o `text`; tempi in secondi."""
    out: List[Dict[str, Any]] = []
    for item in payload.get("words") or []:
        text = str(item.get("word", item.get("text", "")) or "").strip()
        try:
            start, end = float(item["start"]), float(item["end"])
        except (KeyError, TypeError, ValueError):
            continue
        if not text or end < start:
            continue
        out.append({"word": text, "start": start, "end": end})
    if not out:
        raise ValueError("Groq non ha restituito i tempi per parola")
    return out


async def groq_transcribe(audio_path: str, api_key: str, *,
                          client: Optional[httpx.AsyncClient] = None,
                          sleep: Callable[[float], Awaitable[None]] = asyncio.sleep) -> Dict[str, Any]:
    """Trascrive via Groq (Whisper) con tempi per parola. Solleva su qualunque errore."""
    size = os.path.getsize(audio_path)
    if size > MAX_FILE_BYTES:
        raise TranscriptionUnavailable(
            f"Audio troppo grande per Groq gratuito ({size / 1e6:.1f} MB, massimo {MAX_FILE_BYTES / 1e6:.0f} MB)")
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    model = os.environ.get("GROQ_WHISPER_MODEL") or DEFAULT_MODEL
    data = {"model": model, "language": "it", "response_format": "verbose_json",
            "timestamp_granularities[]": "word", "temperature": "0"}
    headers = {"Authorization": f"Bearer {api_key}"}

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=httpx.Timeout(connect=15, read=300, write=120, pool=30))
    try:
        for attempt in range(MAX_RATE_LIMIT_RETRIES + 1):
            resp = await http.post(GROQ_URL, headers=headers, data=data,
                                   files={"file": (os.path.basename(audio_path) or "audio.mp3", audio_bytes, "audio/mpeg")})
            if resp.status_code == 429 and attempt < MAX_RATE_LIMIT_RETRIES:
                try:
                    wait = float(resp.headers.get("retry-after", "5"))
                except ValueError:
                    wait = 5.0
                if wait > MAX_RETRY_AFTER_S:
                    raise TranscriptionUnavailable(f"Groq: limite di utilizzo raggiunto (riprova fra {wait:.0f}s)")
                await sleep(wait)
                continue
            if resp.status_code >= 400:
                raise TranscriptionUnavailable(f"Groq {resp.status_code}: {resp.text[:300]}")
            payload = resp.json()
            break
    finally:
        if own_client:
            await http.aclose()

    words = parse_groq_words(payload)
    result = build_result(str(payload.get("text", "")).strip(), words)
    result["provider"] = "groq"
    return result


async def transcribe_with_fallback(audio_path: str, assemblyai_key: str, groq_key: str,
                                   assemblyai_fn: Callable[[str, str], Awaitable[Dict[str, Any]]],
                                   *, groq_fn: Optional[Callable[..., Awaitable[Dict[str, Any]]]] = None,
                                   log: Optional[Callable[[str], None]] = None) -> Dict[str, Any]:
    """AssemblyAI per primo; se manca la chiave o fallisce, Groq. Mai in silenzio: logga il motivo."""
    note = log or (lambda _m: None)
    groq_fn = groq_fn or groq_transcribe
    errors: List[str] = []

    if assemblyai_key:
        try:
            result = await assemblyai_fn(audio_path, assemblyai_key)
            result.setdefault("provider", "assemblyai")
            return result
        except Exception as exc:
            errors.append(f"AssemblyAI: {exc}")
            note(f"[TRANSCRIBE] AssemblyAI fallito ({str(exc)[:200]}) — provo Groq" if groq_key
                 else f"[TRANSCRIBE] AssemblyAI fallito ({str(exc)[:200]}) e GROQ_API_KEY non configurata")
    else:
        errors.append("AssemblyAI: chiave non configurata")

    if groq_key:
        try:
            result = await groq_fn(audio_path, groq_key)
            note("[TRANSCRIBE] trascrizione fatta con Groq (riserva gratuita)")
            return result
        except Exception as exc:
            errors.append(f"Groq: {exc}")
    else:
        errors.append("Groq: GROQ_API_KEY non configurata")

    raise TranscriptionUnavailable(" | ".join(errors))
