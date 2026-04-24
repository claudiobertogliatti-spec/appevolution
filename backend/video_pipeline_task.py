"""
VIDEO PIPELINE TASK
-------------------
Pipeline automatica per video partner:
1. Download da Google Drive / WeTransfer
2. FFmpeg: silence removal + loudnorm EBU R128
3. OpenAI Whisper: transcript + filler word detection (IT)
4. GPT-4: smart edit — autocorrezioni + ripetizioni
5. FFmpeg: taglio filler + smart edit segments
6. Upload YouTube unlisted + aggiunta playlist partner
7. Salvataggio DB + notifica Telegram admin
"""

import os
import re
import json
import logging
import asyncio
import subprocess
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict

import random
import httpx

from celery_app import celery_app
try:
    from key_moments_extractor import extract_key_moments
except ImportError:
    async def extract_key_moments(**kwargs):
        return []
try:
    from remotion_client import render_partner_video
except ImportError:
    async def render_partner_video(**kwargs):
        return None

logger = logging.getLogger(__name__)

# Filler words italiani da rilevare e tagliare
FILLER_WORDS_IT = {
    "uhm", "uh", "ah", "eh", "mh", "hmm", "mm", "mmm", "hm",
    "cioè", "allora", "tipo", "diciamo", "praticamente",
    "fondamentalmente", "sostanzialmente", "praticamente",
    "insomma", "ecco", "quindi",  # solo quando isolati come filler
}

# ═══════════════════════════════════════════════════════════════════
# HELPERS: DOWNLOAD
# ═══════════════════════════════════════════════════════════════════

def extract_gdrive_file_id(url: str) -> str | None:
    """Estrae l'ID file da un URL Google Drive di qualsiasi formato"""
    # https://drive.google.com/file/d/{ID}/view
    m = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)
    # https://drive.google.com/open?id={ID} o /uc?id={ID}
    m = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)
    # https://drive.usercontent.google.com/download?id={ID}
    m = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)
    return None


def resolve_gdrive_url(url: str) -> str:
    """Converte URL Google Drive share in URL download diretto."""
    file_id = extract_gdrive_file_id(url)
    if file_id:
        return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0"
    return url


def extract_gdrive_confirm_url(html_text: str, file_id: str) -> Optional[str]:
    """Estrae URL di conferma dalla pagina 'virus scan warning' di Google Drive per file grandi."""
    # Cerca uuid nel form hidden input
    m = re.search(r'name=["\']uuid["\']\s+value=["\']([^"\']+)["\']', html_text)
    if m:
        uuid_val = m.group(1)
        return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t&uuid={uuid_val}"
    # Fallback: cerca confirm= nell'azione del form
    m = re.search(r'[?&]confirm=([^&"\']+)', html_text)
    if m:
        confirm = m.group(1)
        return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm={confirm}"
    # Ultimo fallback: prova confirm=t senza uuid (funziona per alcuni file)
    return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t"


async def _stream_to_file(client: httpx.AsyncClient, url: str, dest_path: str, offset: int = 0) -> int:
    """Stream URL → file con supporto Range per resume. Ritorna bytes scritti."""
    req_headers = {}
    if offset > 0:
        req_headers["Range"] = f"bytes={offset}-"
        logger.info(f"[VIDEO-PIPE] Resume da {offset/1e6:.1f}MB")

    async with client.stream("GET", url, headers=req_headers) as resp:
        if resp.status_code == 416:  # Range Not Satisfiable — file già completo
            return 0
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "")
        if "text/html" in ct:
            raise ValueError(
                "Google Drive richiede autenticazione — file non condiviso correttamente. "
                "Assicurati che sia condiviso come 'Chiunque abbia il link'."
            )
        # 206 = range accettato → append; 200 = range ignorato → sovrascrittura
        mode = "ab" if offset > 0 and resp.status_code == 206 else "wb"
        written = 0
        with open(dest_path, mode) as f:
            async for chunk in resp.aiter_bytes(chunk_size=2 * 1024 * 1024):
                f.write(chunk)
                written += len(chunk)
    return written


async def download_from_gcs(gcs_url: str, dest_path: str) -> int:
    """Scarica file da GCS direttamente. gs://bucket/path"""
    try:
        from google.cloud import storage as gcs_storage
    except ImportError:
        raise RuntimeError("google-cloud-storage non installato — aggiungere al requirements.txt")
    without_prefix = gcs_url[5:]  # rimuove "gs://"
    bucket_name, _, blob_name = without_prefix.partition("/")
    logger.info(f"[VIDEO-PIPE] Download GCS: bucket={bucket_name} blob={blob_name}")
    client = gcs_storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: blob.download_to_filename(dest_path))
    size = os.path.getsize(dest_path)
    logger.info(f"[VIDEO-PIPE] GCS download completo: {size/1e6:.1f}MB")
    return size


async def download_video(url: str, dest_path: str, max_retries: int = 4) -> int:
    """Scarica video da URL (Google Drive o qualsiasi link diretto).
    Usa gdown per Google Drive (gestisce auth e virus-scan page in modo affidabile).
    Per altri URL usa httpx con retry e Range header.
    Ritorna dimensione totale in bytes.
    """
    # GCS diretto
    if url.startswith("gs://"):
        return await download_from_gcs(url, dest_path)

    file_id = extract_gdrive_file_id(url)

    # ── Google Drive → gdown Python API (gestisce auth e virus-scan page) ──
    if file_id:
        logger.info(f"[VIDEO-PIPE] Google Drive file_id={file_id} — uso gdown Python API")
        # Installa gdown a runtime se non presente nel container (layer cache)
        try:
            import gdown as _gdown
        except ImportError:
            logger.info("[VIDEO-PIPE] gdown non trovato — installo ora...")
            subprocess.run(
                ["pip", "install", "gdown", "--break-system-packages", "-q"],
                check=True, timeout=120
            )
            import gdown as _gdown
            logger.info("[VIDEO-PIPE] gdown installato correttamente")

        loop = asyncio.get_event_loop()
        for attempt in range(max_retries):
            try:
                drive_url = f"https://drive.google.com/file/d/{file_id}/view"
                logger.info(f"[VIDEO-PIPE] gdown download tentativo {attempt+1}: {drive_url}")
                # gdown.download è sincrono — eseguito in executor per non bloccare l'event loop
                result_path = await loop.run_in_executor(
                    None,
                    lambda: _gdown.download(url=drive_url, output=dest_path, quiet=False, fuzzy=True)
                )
                if not result_path or not os.path.exists(dest_path) or os.path.getsize(dest_path) == 0:
                    raise ValueError("gdown completato ma file assente o vuoto")
                size = os.path.getsize(dest_path)
                logger.info(f"[VIDEO-PIPE] gdown completo: {size/1e6:.1f}MB")
                return size
            except Exception as e:
                logger.warning(f"[VIDEO-PIPE] gdown tentativo {attempt+1} fallito: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(10 * (attempt + 1))
                else:
                    raise ValueError(f"gdown fallito dopo {max_retries} tentativi: {e}")

    # ── Tutti gli altri URL (WeTransfer, Dropbox, link diretti) → httpx con retry ──
    download_url = url
    logger.info(f"[VIDEO-PIPE] Download diretto URL: {download_url[:100]}")

    base_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
    }

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(connect=30, read=600, write=30, pool=30),
        headers=base_headers,
    ) as client:
        for attempt in range(max_retries):
            offset = os.path.getsize(dest_path) if os.path.exists(dest_path) else 0
            try:
                written = await _stream_to_file(client, download_url, dest_path, offset=offset)
                total = (offset + written) if written else os.path.getsize(dest_path)
                logger.info(f"[VIDEO-PIPE] Download completo: {total/1e6:.1f}MB")
                return total
            except (httpx.RemoteProtocolError, httpx.ReadError, httpx.ConnectError, OSError) as e:
                current = os.path.getsize(dest_path) if os.path.exists(dest_path) else 0
                if attempt < max_retries - 1:
                    wait = 5 * (attempt + 1)
                    logger.warning(
                        f"[VIDEO-PIPE] Drop connessione a {current/1e6:.1f}MB "
                        f"(tentativo {attempt+1}/{max_retries}) — retry in {wait}s: {e}"
                    )
                    await asyncio.sleep(wait)
                else:
                    raise ValueError(
                        f"Download interrotto dopo {max_retries} tentativi "
                        f"(scaricati {current/1e6:.0f}MB): {e}"
                    )


# ═══════════════════════════════════════════════════════════════════
# HELPERS: FFMPEG
# ═══════════════════════════════════════════════════════════════════

def get_video_duration(video_path: str) -> float:
    """Ritorna durata video in secondi via ffprobe"""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-analyzeduration", "10000000",   # max 10s di analisi stream
        "-probesize", "10000000",          # max 10MB di probe
        "-print_format", "json",
        "-show_entries", "format=duration",
        video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except subprocess.TimeoutExpired:
        logger.warning("[VIDEO-PIPE] ffprobe timeout su %s — durata non disponibile, proseguo", video_path)
        return 0.0
    except Exception:
        return 0.0


def ffmpeg_clean(input_path: str, output_path: str) -> dict:
    """
    Silence removal + loudnorm EBU R128.
    Ritorna stats: duration_before, duration_after.
    """
    duration_before = get_video_duration(input_path)
    tmp_silence = output_path.replace(".mp4", "_s.mp4")

    # Passo 1: rimuovi silenzi > 0.5s
    cmd_s = [
        "ffmpeg", "-y", "-i", input_path,
        "-af", "silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-45dB",
        "-c:v", "copy", tmp_silence
    ]
    try:
        r = subprocess.run(cmd_s, capture_output=True, text=True, timeout=180)
    except subprocess.TimeoutExpired:
        logger.warning("[VIDEO-PIPE] silenceremove timeout (3min) — uso file originale")
        r = type("obj",(object,),{"returncode":1})()
    source = tmp_silence if r.returncode == 0 and Path(tmp_silence).exists() else input_path

    # Passo 2: loudnorm EBU R128 — analisi
    cmd_a = [
        "ffmpeg", "-y", "-i", source,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-"
    ]
    try:
        ra = subprocess.run(cmd_a, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        logger.warning("[VIDEO-PIPE] loudnorm analysis timeout — salta normalizzazione")
        ra = type("obj",(object,),{"returncode":1,"stderr":""})()

    # Estrai JSON da stderr
    stats = {}
    try:
        stderr = ra.stderr
        j_start = stderr.rfind("{")
        j_end = stderr.rfind("}") + 1
        if j_start >= 0:
            stats = json.loads(stderr[j_start:j_end])
    except Exception:
        pass

    # Passo 3: loudnorm — applica
    if stats:
        af = (
            f"loudnorm=I=-16:TP=-1.5:LRA=11"
            f":measured_I={stats.get('input_i', -23)}"
            f":measured_LRA={stats.get('input_lra', 7)}"
            f":measured_TP={stats.get('input_tp', -2)}"
            f":measured_thresh={stats.get('input_thresh', -33)}"
            f":offset={stats.get('target_offset', 0)}"
            f":linear=true:print_format=summary"
        )
    else:
        af = "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true"

    cmd_n = [
        "ffmpeg", "-y", "-i", source,
        "-af", af, "-c:v", "copy", output_path
    ]
    try:
        rn = subprocess.run(cmd_n, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        logger.warning("[VIDEO-PIPE] loudnorm apply timeout — copia file senza normalizzazione")
        shutil.copy(source, output_path)
        rn = type("obj",(object,),{"returncode":0})()

    if rn.returncode != 0:
        shutil.copy(source, output_path)

    # Cleanup tmp
    try:
        if Path(tmp_silence).exists():
            Path(tmp_silence).unlink()
    except Exception:
        pass

    duration_after = get_video_duration(output_path)
    return {"duration_before": duration_before, "duration_after": duration_after}


def extract_audio_for_whisper(video_path: str, audio_path: str) -> bool:
    """Estrae audio mono 16kHz MP3 per Whisper API (< 25MB per 30 min)"""
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-ac", "1", "-ar", "16000", "-ab", "64k",
        "-f", "mp3", audio_path
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        logger.warning("[VIDEO-PIPE] extract_audio timeout (5min) — transcript saltato")
        return False
    return r.returncode == 0 and Path(audio_path).exists()


def detect_filler_words(words: list) -> List[Dict]:
    """Riconosce filler words da word-level timestamps Whisper"""
    segments = []
    for w in words:
        word_text = w.get("word", "").strip().lower().rstrip(".,!?;:")
        if word_text in FILLER_WORDS_IT:
            start = w.get("start", 0)
            end = w.get("end", 0)
            segments.append({
                "start": max(0.0, start - 0.08),
                "end": end + 0.08,
                "word": word_text
            })

    if not segments:
        return []

    # Merge segmenti contigui (gap < 200ms)
    merged = [segments[0].copy()]
    for seg in segments[1:]:
        if seg["start"] - merged[-1]["end"] < 0.2:
            merged[-1]["end"] = seg["end"]
            merged[-1]["word"] += f"+{seg['word']}"
        else:
            merged.append(seg.copy())

    return merged


def detect_smart_edit_segments(words: list, transcript: str, openai_key: str) -> List[Dict]:
    """
    GPT-4 analizza la trascrizione e identifica:
    - Autocorrezioni: speaker dice 'aspetta', 'no', 'ricominciamo', riprende la frase
    - Ripetizioni: stessa frase/concetto detto due volte di seguito
    Ritorna lista [{start, end, reason}] da tagliare.
    """
    if not openai_key or not words or len(words) < 10:
        return []

    try:
        import openai
        client_oai = openai.OpenAI(api_key=openai_key)

        # Raggruppa parole in frasi (pausa > 0.8s = nuova frase)
        sentences = []
        current_words = []
        for i, w in enumerate(words):
            current_words.append(w)
            is_last = (i == len(words) - 1)
            next_gap = (words[i+1].get("start", 0) - w.get("end", 0)) if not is_last else 9999
            if next_gap > 0.8 or is_last:
                if current_words:
                    text = " ".join(x.get("word", "") for x in current_words).strip()
                    sentences.append({
                        "start": current_words[0].get("start", 0),
                        "end": current_words[-1].get("end", 0),
                        "text": text
                    })
                    current_words = []

        if not sentences:
            return []

        # Formatta per GPT-4
        numbered = "\n".join(
            f"[{i+1}] ({s['start']:.1f}s-{s['end']:.1f}s) {s['text']}"
            for i, s in enumerate(sentences)
        )

        resp = client_oai.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sei un editor video professionale per contenuti in italiano. "
                        "Analizza la trascrizione e identifica i segmenti DA TAGLIARE perché: "
                        "1) AUTOCORREZIONE: lo speaker fa un errore, si ferma, ricomincia "
                        "(segnali: 'aspetta', 'no', 'cioè no', 'ricominciamo', 'scusa', "
                        "o frase troncata seguita dalla stessa frase corretta). "
                        "2) RIPETIZIONE: stesso concetto o frase detto due volte di fila "
                        "senza aggiungere informazioni nuove. "
                        "NON tagliare: enfasi, riformulazioni didattiche, transizioni normali. "
                        "Rispondi SOLO con JSON: "
                        '{\"cuts\": [{\"seg_start\": N, \"seg_end\": N, \"reason\": \"...\"}]} '
                        "dove N sono i numeri di riga del segmento. "
                        "Se non ci sono tagli, rispondi con {\"cuts\": []}."
                    )
                },
                {"role": "user", "content": f"Trascrizione:\n{numbered}"}
            ],
            max_tokens=800,
            response_format={"type": "json_object"}
        )

        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        cuts_raw = data.get("cuts", [])

        # Converti seg_start/seg_end in timestamp reali
        result = []
        for cut in cuts_raw:
            s_idx = int(cut.get("seg_start", 0)) - 1
            e_idx = int(cut.get("seg_end", 0)) - 1
            if 0 <= s_idx < len(sentences) and 0 <= e_idx < len(sentences):
                result.append({
                    "start": max(0.0, sentences[s_idx]["start"] - 0.1),
                    "end": sentences[e_idx]["end"] + 0.1,
                    "reason": cut.get("reason", "autocorrezione/ripetizione")
                })

        logger.info(f"[VIDEO-PIPE] Smart edit: {len(result)} tagli GPT-4")
        return result

    except Exception as e:
        logger.warning(f"[VIDEO-PIPE] Smart edit GPT-4 error: {e}")
        return []


def add_to_youtube_playlist_sync(video_id: str, playlist_id: str) -> bool:
    """Aggiunge un video a una playlist YouTube. Ritorna True se ok."""
    try:
        from googleapiclient.discovery import build
        from services.secure_credentials import load_credentials, save_credentials
        from google.auth.transport.requests import Request

        creds_path = "/app/storage/youtube_credentials.pickle"
        creds = load_credentials(creds_path)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                save_credentials(creds, creds_path)
            else:
                return False

        service = build('youtube', 'v3', credentials=creds)
        service.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": playlist_id,
                    "resourceId": {"kind": "youtube#video", "videoId": video_id}
                }
            }
        ).execute()
        return True
    except Exception as e:
        logger.warning(f"[VIDEO-PIPE] Playlist insert error: {e}")
        return False


def create_youtube_playlist_sync(partner_name: str) -> Optional[str]:
    """Crea una playlist YouTube unlisted per il partner. Ritorna playlist_id o None."""
    try:
        from googleapiclient.discovery import build
        from services.secure_credentials import load_credentials, save_credentials
        from google.auth.transport.requests import Request

        creds_path = "/app/storage/youtube_credentials.pickle"
        creds = load_credentials(creds_path)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                save_credentials(creds, creds_path)
            else:
                return None

        service = build('youtube', 'v3', credentials=creds)
        resp = service.playlists().insert(
            part="snippet,status",
            body={
                "snippet": {
                    "title": f"Evolution PRO - {partner_name}",
                    "description": f"Masterclass e video corsi {partner_name} — Evolution PRO"
                },
                "status": {"privacyStatus": "unlisted"}
            }
        ).execute()
        return resp.get("id")
    except Exception as e:
        logger.warning(f"[VIDEO-PIPE] Create playlist error: {e}")
        return None


def cut_filler_segments(input_path: str, output_path: str, filler_segs: List[Dict], duration: float) -> bool:
    """Rimuove segmenti filler usando FFmpeg concat"""
    if not filler_segs:
        shutil.copy(input_path, output_path)
        return True

    # Costruisci segmenti da TENERE
    keep = []
    cursor = 0.0
    for seg in sorted(filler_segs, key=lambda x: x["start"]):
        if seg["start"] > cursor + 0.05:
            keep.append({"start": cursor, "end": seg["start"]})
        cursor = seg["end"]
    if cursor < duration - 0.05:
        keep.append({"start": cursor, "end": duration})

    if not keep:
        shutil.copy(input_path, output_path)
        return True

    tmp_dir = Path(input_path).parent
    seg_files = []

    for i, seg in enumerate(keep):
        seg_path = str(tmp_dir / f"seg_{i:04d}.mp4")
        dur = seg["end"] - seg["start"]
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(seg["start"]),
            "-t", str(max(0.1, dur)),
            "-i", input_path,
            "-c", "copy", seg_path
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if r.returncode == 0 and Path(seg_path).exists():
            seg_files.append(seg_path)

    if not seg_files:
        shutil.copy(input_path, output_path)
        return True

    concat_file = str(tmp_dir / "concat.txt")
    with open(concat_file, "w") as f:
        for sp in seg_files:
            f.write(f"file '{sp}'\n")

    cmd_c = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_file, "-c", "copy", output_path
    ]
    r = subprocess.run(cmd_c, capture_output=True, text=True, timeout=1200)

    for sp in seg_files:
        try:
            Path(sp).unlink()
        except Exception:
            pass

    if r.returncode != 0:
        shutil.copy(input_path, output_path)
    return True


# ═══════════════════════════════════════════════════════════════════
# HELPERS: YOUTUBE UPLOAD (sync, per Celery)
# ═══════════════════════════════════════════════════════════════════

def upload_to_youtube_sync(video_path: str, title: str, partner_name: str) -> Optional[str]:
    """Upload sincrono su YouTube unlisted. Ritorna URL o None."""
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from services.secure_credentials import load_credentials, save_credentials
        from google.auth.transport.requests import Request

        creds_path = "/app/storage/youtube_credentials.pickle"
        creds = load_credentials(creds_path)
        if not creds:
            logger.error("[VIDEO] YouTube: credenziali mancanti")
            return None

        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                save_credentials(creds, creds_path)
            else:
                logger.error("[VIDEO] YouTube: token scaduto")
                return None

        service = build('youtube', 'v3', credentials=creds)

        body = {
            'snippet': {
                'title': title[:100],
                'description': f"Video Evolution PRO — {partner_name}\n#EvolutionPRO #Formazione",
                'tags': ['Evolution PRO', 'Formazione', partner_name],
                'categoryId': '27'
            },
            'status': {
                'privacyStatus': 'unlisted',
                'selfDeclaredMadeForKids': False
            }
        }

        media = MediaFileUpload(
            video_path, mimetype='video/mp4',
            resumable=True, chunksize=5 * 1024 * 1024
        )
        request = service.videos().insert(
            part=','.join(body.keys()),
            body=body,
            media_body=media
        )

        response = None
        while response is None:
            _, response = request.next_chunk()

        video_id = response.get('id')
        return f"https://www.youtube.com/watch?v={video_id}"

    except Exception as e:
        logger.error(f"[VIDEO] YouTube upload error: {e}", exc_info=True)
        return None


# ═══════════════════════════════════════════════════════════════════
# SHOTSTACK — watermark Evolution PRO in basso-destra (solo masterclass)
# ═══════════════════════════════════════════════════════════════════

EVOLUTION_PRO_LOGO_URL = "https://storage.googleapis.com/gen-lang-client-0744698012_cloudbuild/assets/evolution-pro-logo-white.png"

async def shotstack_add_watermark(video_url: str, api_key: str, duration: float, sandbox: bool = False) -> str:
    base_url = "https://api.shotstack.io/stage" if sandbox else "https://api.shotstack.io/v1"
    headers = {"x-api-key": api_key, "content-type": "application/json"}
    payload = {"timeline": {"tracks": [{"clips": [{"asset": {"type": "video", "src": video_url}, "start": 0, "length": duration}]}, {"clips": [{"asset": {"type": "image", "src": EVOLUTION_PRO_LOGO_URL}, "start": 0, "length": duration, "position": "bottomRight", "offset": {"x": -0.02, "y": 0.02}, "scale": 0.15, "opacity": 0.75}]}]}, "output": {"format": "mp4", "resolution": "1080"}}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{base_url}/render", headers=headers, json=payload)
        r.raise_for_status()
        render_id = r.json()["response"]["id"]
        for _ in range(180):
            await asyncio.sleep(5)
            poll = await client.get(f"{base_url}/render/{render_id}", headers=headers, timeout=30)
            res = poll.json()["response"]
            if res.get("status") == "done": return res["url"]
            if res.get("status") == "failed": raise ValueError(f"Shotstack failed: {res.get('error')}")
    raise TimeoutError("Shotstack timeout")


# ═══════════════════════════════════════════════════════════════════
# ASSEMBLYAI — Trascrizione + filler + silenzi (sostituisce FFmpeg)
# ═══════════════════════════════════════════════════════════════════

async def assemblyai_transcribe(audio_path: str, api_key: str) -> dict:
    """Transcribe audio via AssemblyAI REST API.

    Hard 5-minute deadline on the whole operation (upload + create + poll).
    Raises TimeoutError on deadline OR persistent API errors so the caller
    falls back to raw video upload instead of blocking the pipeline forever.
    Transient poll errors are retried within the deadline.
    """
    AAI_BASE = "https://api.assemblyai.com/v2"
    headers = {"authorization": api_key, "content-type": "application/json"}
    import time as _t
    _aai_deadline = _t.time() + 300  # hard 5 min cap on entire operation

    def _check_deadline(stage: str):
        if _t.time() > _aai_deadline:
            raise TimeoutError(f"AAI timeout 5min during {stage} — fallback raw video")

    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=15, read=120, write=120, pool=30)) as client:
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        logger.info(f"[VIDEO-PIPE] AAI upload: {len(audio_bytes)/1e6:.1f}MB")
        _check_deadline("pre-upload")
        up = await client.post(f"{AAI_BASE}/upload", headers={"authorization": api_key}, content=audio_bytes)
        up.raise_for_status()
        _check_deadline("post-upload")
        # NOTE: removed "disfluencies": True — caused 400 on the default speech_model.
        # Italian fillers are still detected via the local FILLERS set below on word.text,
        # so removing the AAI-side flag only loses ~uh/um auto-tagging by the model.
        tr = await client.post(
            f"{AAI_BASE}/transcript",
            headers=headers,
            json={"audio_url": up.json()["upload_url"], "language_code": "it",
                  "speech_model": "best", "punctuate": True, "format_text": True},
        )
        tr.raise_for_status()
        tid = tr.json()["id"]
        logger.info(f"[VIDEO-PIPE] AAI transcript created tid={tid}, polling...")
        res = {}
        consecutive_poll_errors = 0
        while True:
            _check_deadline("polling")
            await asyncio.sleep(5)
            try:
                poll = await client.get(f"{AAI_BASE}/transcript/{tid}", headers={"authorization": api_key})
                poll.raise_for_status()
                res = poll.json()
                consecutive_poll_errors = 0
            except Exception as poll_err:
                consecutive_poll_errors += 1
                logger.warning(f"[VIDEO-PIPE] AAI poll error #{consecutive_poll_errors} (retrying): {poll_err}")
                if consecutive_poll_errors >= 6:
                    raise ValueError(f"AAI polling failed {consecutive_poll_errors}x in a row: {poll_err}")
                continue
            status = res.get("status")
            if status == "completed":
                logger.info(f"[VIDEO-PIPE] AAI transcript completed tid={tid}")
                break
            if status == "error":
                raise ValueError(f"AAI error: {res.get('error')}")
    words_raw = res.get("words", [])
    FILLERS = {"um","uh","eh","ehm","allora","tipo","cioè","quindi","insomma","praticamente","diciamo","appunto"}
    filler_segs = [{"start":w["start"]/1000,"end":w["end"]/1000,"word":w["text"]} for w in words_raw if w.get("type")=="filler" or w["text"].lower().strip(".,!?") in FILLERS]
    silence_segs = []
    for i in range(len(words_raw)-1):
        gap = (words_raw[i+1]["start"] - words_raw[i]["end"]) / 1000
        if gap > 0.5:
            silence_segs.append({"start":words_raw[i]["end"]/1000,"end":words_raw[i+1]["start"]/1000,"duration":gap})
    return {"transcript": res.get("text",""), "words": [{"word":w["text"],"start":w["start"]/1000,"end":w["end"]/1000} for w in words_raw], "filler_segments": filler_segs, "silence_segments": silence_segs}


# ═══════════════════════════════════════════════════════════════════
# HELPERS: TELEGRAM
# ═══════════════════════════════════════════════════════════════════

async def telegram(msg: str):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"}
            )
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════
# CELERY TASK
# ═══════════════════════════════════════════════════════════════════

@celery_app.task(
    name="process_partner_video",
    bind=True,
    acks_late=True,         # task rimane in Redis finché non completa — se worker muore viene re-accodato
    reject_on_worker_lost=True,  # se worker è killato da Cloud Run deploy, riaccodare
    max_retries=2,
    default_retry_delay=120,
    soft_time_limit=10800,  # 3 ore — download + FFmpeg + YouTube upload su file grandi
    time_limit=11100,       # 3h 5min hard limit
)
def process_partner_video(self, partner_id: str, video_url: str, video_type: str, lesson_id: Optional[str] = None):
    """
    Pipeline completa video partner.
    video_type: "masterclass" | "videocorso"
    lesson_id: richiesto solo per videocorso (es. "1-1")
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(
            _run_pipeline(self, partner_id, video_url, video_type, lesson_id)
        )
    except Exception as exc:
        logger.error(f"[VIDEO-PIPE] Task failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)
    finally:
        loop.close()


def run_pipeline_background(partner_id: str, video_url: str, video_type: str, lesson_id: Optional[str] = None):
    """
    Wrapper sync per FastAPI BackgroundTasks.
    Gira in thread pool — non blocca l'event loop principale.
    Usato su Cloud Run dove non girano worker Celery.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(
            _run_pipeline(None, partner_id, video_url, video_type, lesson_id)
        )
    except Exception as exc:
        logger.error(f"[VIDEO-PIPE] Background task failed: {exc}", exc_info=True)
    finally:
        loop.close()


async def _run_pipeline(task, partner_id: str, video_url: str, video_type: str, lesson_id: Optional[str]):
    from motor.motor_asyncio import AsyncIOMotorClient

    # Usa sempre MONGO_ATLAS_URL se disponibile — evita il cluster Emergent morto
    MONGO_URL = os.environ.get("MONGO_ATLAS_URL") or os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("DB_NAME", os.environ.get("MONGODB_DB", "evolution_pro"))
    OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
    ASSEMBLYAI_KEY = os.environ.get("ASSEMBLYAI_API_KEY", "")
    SHOTSTACK_KEY = os.environ.get("SHOTSTACK_API_KEY", "")
    SHOTSTACK_SANDBOX = os.environ.get("SHOTSTACK_SANDBOX_KEY", "")

    mongo = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=60000,
        retryWrites=True,
    )
    db = mongo[DB_NAME]

    job_id = uuid.uuid4().hex[:8]
    tmp_dir = Path(f"/tmp/vp_{partner_id}_{job_id}")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    raw_path = str(tmp_dir / "raw.mp4")
    clean_path = str(tmp_dir / "clean.mp4")
    final_path = str(tmp_dir / "final.mp4")
    audio_path = str(tmp_dir / "audio.mp3")
    remotion_path = str(tmp_dir / "remotion.mp4")

    async def set_status(status: str, extra: dict = {}):
        now = datetime.now(timezone.utc).isoformat()
        if video_type == "masterclass":
            await db.masterclass_factory.update_one(
                {"partner_id": partner_id},
                {"$set": {"video_pipeline_status": status, "updated_at": now, **extra}},
                upsert=True
            )
        else:
            key = f"lessons.{lesson_id}"
            await db.partner_videocorso.update_one(
                {"partner_id": partner_id},
                {"$set": {f"{key}.pipeline_status": status, "updated_at": now,
                           **{f"{key}.{k}": v for k, v in extra.items()}}}
            )

    try:
        partner = await db.partners.find_one({"id": partner_id})
        name = partner.get("name", partner_id) if partner else partner_id
        label = f"{video_type}" + (f" lezione {lesson_id}" if lesson_id else "")

        logger.info(f"[VIDEO-PIPE] START {label} — {name}")
        await set_status("downloading")
        await telegram(f"⏬ <b>Pipeline video avviata</b>\n👤 {name} — {label}\nDownload in corso...")

        # Heartbeat: aggiorna pipeline_heartbeat_at ogni 30s — usato da check_stuck_video_pipelines
        # per distinguere task vivi da task morti silenziosamente (container killato da deploy).
        # upsert=True: garantisce che il primo heartbeat scriva anche se set_status non
        # ha ancora creato il doc. Errori loggati esplicitamente — niente swallow silenzioso
        # (la causa originale del bug "transcribing + heartbeat null" era che Mongo timeout
        # venivano persi in un except Exception: pass).
        _heartbeat_active = True
        _hb_coll = "masterclass_factory" if video_type == "masterclass" else "partner_videocorso"

        async def _write_heartbeat() -> bool:
            try:
                await db[_hb_coll].update_one(
                    {"partner_id": partner_id},
                    {"$set": {"pipeline_heartbeat_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True,
                )
                return True
            except Exception as hb_err:
                logger.warning(f"[VIDEO-PIPE] Heartbeat write failed: {hb_err}")
                return False

        # Primo heartbeat sincrono PRIMA di qualunque operazione lunga: serve come prova
        # che il task è vivo anche se blocca entro i primi 30s (es. su transcribing).
        await _write_heartbeat()

        async def _heartbeat_loop():
            while _heartbeat_active:
                try:
                    await asyncio.sleep(30)
                    if not _heartbeat_active:
                        break
                    await _write_heartbeat()
                except asyncio.CancelledError:
                    break
                except Exception as loop_err:
                    logger.warning(f"[VIDEO-PIPE] Heartbeat loop error: {loop_err}")
        _hb_task = asyncio.create_task(_heartbeat_loop())

        # 1. Download
        size = await download_video(video_url, raw_path)
        logger.info(f"[VIDEO-PIPE] Downloaded {size/1e6:.1f}MB")

        raw_dur = get_video_duration(raw_path)
        logger.info(f"[VIDEO-PIPE] Durata rilevata: {raw_dur:.0f}s")

        # 2. ASSEMBLYAI PIPELINE — extract audio + transcript + tagli (max 10 min)
        await set_status("cleaning")
        _loop = asyncio.get_event_loop()
        audio_ok = await _loop.run_in_executor(None, extract_audio_for_whisper, raw_path, audio_path)
        filler_report = {"count": 0, "segments": [], "time_saved_s": 0}
        smart_edit_report = {"count": 0, "segments": [], "time_saved_s": 0}
        transcript = ""
        words = []
        silence_saved = 0.0
        if ASSEMBLYAI_KEY and audio_ok:
            await set_status("transcribing")
            try:
                aai = await assemblyai_transcribe(audio_path, ASSEMBLYAI_KEY)
                transcript = aai["transcript"]
                words = aai["words"]
                filler_segs = aai["filler_segments"]
                silence_segs = [s for s in aai["silence_segments"] if s["duration"] > 1.0]
                filler_time = sum(s["end"] - s["start"] for s in filler_segs)
                filler_report = {"count": len(filler_segs), "segments": filler_segs[:50], "time_saved_s": round(filler_time, 1), "words_found": list({s["word"] for s in filler_segs})}
                smart_segs = []
                if OPENAI_KEY:
                    await set_status("smart_editing")
                    try:
                        smart_segs = detect_smart_edit_segments(words, transcript, OPENAI_KEY)
                        smart_time = sum(s["end"] - s["start"] for s in smart_segs)
                        smart_edit_report = {"count": len(smart_segs), "segments": [{"start":s["start"],"end":s["end"],"reason":s["reason"]} for s in smart_segs[:30]], "time_saved_s": round(smart_time, 1)}
                    except Exception as se:
                        logger.warning(f"[VIDEO-PIPE] Smart edit error: {se}")
                all_segs = filler_segs + silence_segs + smart_segs
                all_segs.sort(key=lambda x: x["start"])
                if all_segs:
                    await set_status("cutting_fillers")
                    await _loop.run_in_executor(None, cut_filler_segments, raw_path, final_path, all_segs, raw_dur)
                else:
                    shutil.copy(raw_path, final_path)
                silence_saved = raw_dur - get_video_duration(final_path)
            except Exception as e:
                logger.warning(f"[VIDEO-PIPE] AssemblyAI error: {e} — upload video raw")
                shutil.copy(raw_path, final_path)
        else:
            logger.info("[VIDEO-PIPE] AssemblyAI non config — upload video raw")
            shutil.copy(raw_path, final_path)
        final_dur = get_video_duration(final_path)
        total_saved = raw_dur - final_dur

        # 5b. Remotion: intro/outro brandizzato + sottotitoli + highlight + musica
        remotion_rendered = False
        youtube_source_path = final_path
        if transcript and words:
            await set_status("rendering")
            niche = (partner.get("niche") or partner.get("partner_niche") or "") if partner else ""

            # Script approvato — migliora qualità key moments
            approved_script = None
            if video_type == "masterclass":
                mc_doc = await db.masterclass_factory.find_one({"partner_id": partner_id})
                if mc_doc:
                    approved_script = mc_doc.get("script_content") or mc_doc.get("approved_script")
            elif video_type == "videocorso" and lesson_id:
                vc_doc = await db.partner_videocorso.find_one({"partner_id": partner_id})
                if vc_doc:
                    lesson_data = vc_doc.get("lessons", {}).get(lesson_id, {})
                    approved_script = lesson_data.get("script_content") or lesson_data.get("approved_script")

            # videocorso: no sottotitoli, no musica
            is_lesson = video_type == "videocorso"

            key_moments = await extract_key_moments(
                transcript=transcript,
                words=words,
                partner_name=name,
                niche=niche,
                video_duration_s=final_dur,
                approved_script=approved_script,
            )

            music_track = random.choice(["promo_1", "promo_2"]) if not is_lesson else "promo_1"

            rendered = await render_partner_video(
                partner_id=partner_id,
                local_video_path=final_path,
                partner_name=name,
                partner_niche=niche,
                duration_s=final_dur,
                words=words,
                key_moments=key_moments,
                output_path=remotion_path,
                show_subtitles=not is_lesson,
                show_music=not is_lesson,
                music_track=music_track,
            )
            if rendered:
                remotion_rendered = True
                youtube_source_path = remotion_path
                logger.info(f"[VIDEO-PIPE] Remotion render OK → {remotion_path}")
            else:
                logger.info("[VIDEO-PIPE] Remotion skip — upload video pulito")

        # 5c. Shotstack watermark Evolution PRO (solo masterclass, basso-destra)
        if video_type == "masterclass" and SHOTSTACK_KEY:
            try:
                from google.cloud import storage as _gcs
                _gcs_client = _gcs.Client()
                _bucket = _gcs_client.bucket("gen-lang-client-0744698012_cloudbuild")
                _blob_path = f"rendered/{partner_id}/masterclass/{uuid.uuid4().hex}.mp4"
                _blob = _bucket.blob(_blob_path)
                _blob.upload_from_filename(youtube_source_path, content_type="video/mp4")
                _blob.make_public()
                _gcs_url = _blob.public_url
                watermarked_url = await shotstack_add_watermark(_gcs_url, SHOTSTACK_KEY, final_dur)
                _wm_path = str(tmp_dir / "watermarked.mp4")
                async with httpx.AsyncClient(timeout=300) as _wc:
                    _wr = await _wc.get(watermarked_url)
                    with open(_wm_path, "wb") as _wf:
                        _wf.write(_wr.content)
                youtube_source_path = _wm_path
                logger.info(f"[SHOTSTACK] Watermark applicato ✅")
            except Exception as _se:
                logger.warning(f"[SHOTSTACK] Watermark error: {_se} — upload senza watermark")

        # 6. YouTube upload
        await set_status("uploading_youtube")
        ts = datetime.now().strftime("%m/%Y")
        yt_title = f"{name} — {label.replace('_', ' ').title()} {ts}"
        youtube_url = upload_to_youtube_sync(youtube_source_path, yt_title, name)

        if not youtube_url:
            await set_status("error_youtube")
            await telegram(
                f"⚠️ <b>YouTube upload fallito</b>\n👤 {name} — {label}\n"
                f"✅ Video pulito ma non su YouTube. Controllare credenziali."
            )
            return

        youtube_id = youtube_url.split("v=")[-1]
        embed_url = f"https://www.youtube.com/embed/{youtube_id}"
        systeme_embed = f'<iframe src="{embed_url}" width="560" height="315" frameborder="0" allowfullscreen></iframe>'

        # 7. Playlist per-partner
        playlist_id = partner.get("youtube_playlist_id") if partner else None
        playlist_url = None
        if not playlist_id:
            playlist_id = create_youtube_playlist_sync(name)
            if playlist_id:
                playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
                await db.partners.update_one(
                    {"id": partner_id},
                    {"$set": {"youtube_playlist_id": playlist_id, "youtube_playlist_url": playlist_url}}
                )
                logger.info(f"[VIDEO-PIPE] Nuova playlist creata: {playlist_id}")
        else:
            playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"

        if playlist_id:
            ok = add_to_youtube_playlist_sync(youtube_id, playlist_id)
            logger.info(f"[VIDEO-PIPE] Aggiunto a playlist {playlist_id}: {ok}")

        # 8. Salva in DB
        base_data = {
            "video_raw_url": video_url,
            "video_youtube_url": youtube_url,
            "video_youtube_id": youtube_id,
            "video_embed_url": embed_url,
            "video_systeme_embed": systeme_embed,
            "video_transcript": transcript[:5000],
            "video_filler_report": filler_report,
            "video_smart_edit_report": smart_edit_report,
            "video_raw_duration_s": int(raw_dur),
            "video_final_duration_s": int(final_dur),
            "video_time_saved_s": int(total_saved),
            "video_remotion_rendered": remotion_rendered,
            "video_approved": False,
            "pipeline_completed_at": datetime.now(timezone.utc).isoformat(),
        }

        if video_type == "masterclass":
            await db.masterclass_factory.update_one(
                {"partner_id": partner_id},
                {"$set": {"video_pipeline_status": "ready_for_review", **base_data}},
                upsert=True
            )
        else:
            lk = f"lessons.{lesson_id}"
            await db.partner_videocorso.update_one(
                {"partner_id": partner_id},
                {"$set": {
                    f"{lk}.pipeline_status": "ready_for_review",
                    f"{lk}.status": "ready_for_review",
                    **{f"{lk}.{k}": v for k, v in base_data.items()},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )

        # 9. Telegram admin
        m, s = divmod(int(total_saved), 60)
        rdm, rds = divmod(int(raw_dur), 60)
        fdm, fds = divmod(int(final_dur), 60)
        smart_line = f"🧠 Smart edit: {smart_edit_report['count']} tagli ({smart_edit_report['time_saved_s']}s)\n" if smart_edit_report['count'] else ""
        remotion_line = "🎬 Remotion: intro+outro+sottotitoli+highlight ✅\n" if remotion_rendered else "🎬 Remotion: skip (fallback video pulito)\n"
        playlist_line = f"📋 <a href='{playlist_url}'>Playlist partner</a>\n" if playlist_url else ""

        msg = (
            f"✅ <b>VIDEO PRONTO PER REVIEW</b>\n\n"
            f"👤 <b>{name}</b> — {label}\n"
            f"⏱ Originale: {rdm}:{rds:02d}  →  Pulito: {fdm}:{fds:02d}\n"
            f"✂️ Risparmiato: {m}:{s:02d} "
            f"(silenzio: {int(silence_saved)}s · filler: {filler_report['count']})\n"
            f"{smart_line}"
            f"{remotion_line}"
            f"\n📺 <a href='{youtube_url}'>Guarda su YouTube (unlisted)</a>\n"
            f"{playlist_line}"
            f"\n→ Evolution Admin → Video Review → Approva"
        )
        await telegram(msg)
        logger.info(f"[VIDEO-PIPE] DONE {name} — YouTube: {youtube_url}")

    except Exception as e:
        logger.error(f"[VIDEO-PIPE] Error: {e}", exc_info=True)
        try:
            await set_status("error", {"video_pipeline_error": str(e)[:500]})
        except Exception as e2:
            logger.error(f"[VIDEO-PIPE] set_status(error) failed (stale connection?): {e2}")
            try:
                _mongo_err = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
                _db_err = _mongo_err[DB_NAME]
                _now_err = datetime.utcnow()
                await _db_err.masterclass_factory.update_one(
                    {"partner_id": partner_id},
                    {"$set": {"video_pipeline_status": "error", "pipeline_error": str(e)[:500], "updated_at": _now_err}},
                    upsert=True
                )
            except Exception as e3:
                logger.error(f"[VIDEO-PIPE] fallback set_status also failed: {e3}")
        try:
            await telegram(f"❌ <b>Errore pipeline video</b>\n👤 {partner_id}\n🔴 {str(e)[:300]}")
        except Exception:
            pass
        raise

    finally:
        # Ferma il heartbeat loop
        try:
            _heartbeat_active = False
            _hb_task.cancel()
        except Exception:
            pass
        shutil.rmtree(str(tmp_dir), ignore_errors=True)
        try:
            mongo.close()
        except Exception:
            pass

# trigger rebuild
