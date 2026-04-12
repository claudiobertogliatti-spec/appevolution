"""
VIDEO PIPELINE TASK
-------------------
Pipeline automatica per video partner:
1. Download da Google Drive / WeTransfer
2. FFmpeg: silence removal + loudnorm EBU R128
3. OpenAI Whisper: transcript + filler word detection (IT)
4. FFmpeg: taglio filler words
5. Upload YouTube unlisted
6. Salvataggio DB + notifica Telegram admin
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

import httpx

from celery_app import celery_app

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

def resolve_gdrive_url(url: str) -> str:
    """Converte URL Google Drive share in URL download diretto"""
    # https://drive.google.com/file/d/{ID}/view
    match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
    # https://drive.google.com/open?id={ID}
    match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
    return url


async def download_video(url: str, dest_path: str) -> int:
    """Scarica video da URL. Ritorna dimensione in bytes."""
    download_url = resolve_gdrive_url(url)

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(connect=30, read=600, write=30, pool=30),
        headers={"User-Agent": "Mozilla/5.0 (compatible; EvolutionPRO/1.0)"}
    ) as client:
        async with client.stream("GET", download_url) as response:
            response.raise_for_status()
            total = 0
            with open(dest_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=2 * 1024 * 1024):
                    f.write(chunk)
                    total += len(chunk)
    return total


# ═══════════════════════════════════════════════════════════════════
# HELPERS: FFMPEG
# ═══════════════════════════════════════════════════════════════════

def get_video_duration(video_path: str) -> float:
    """Ritorna durata video in secondi via ffprobe"""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
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
    r = subprocess.run(cmd_s, capture_output=True, text=True, timeout=900)
    source = tmp_silence if r.returncode == 0 and Path(tmp_silence).exists() else input_path

    # Passo 2: loudnorm EBU R128 — analisi
    cmd_a = [
        "ffmpeg", "-y", "-i", source,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-"
    ]
    ra = subprocess.run(cmd_a, capture_output=True, text=True, timeout=300)

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
    rn = subprocess.run(cmd_n, capture_output=True, text=True, timeout=900)

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
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
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
    r = subprocess.run(cmd_c, capture_output=True, text=True, timeout=300)

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

@celery_app.task(name="process_partner_video", bind=True, max_retries=2, default_retry_delay=120)
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


async def _run_pipeline(task, partner_id: str, video_url: str, video_type: str, lesson_id: Optional[str]):
    from motor.motor_asyncio import AsyncIOMotorClient

    MONGO_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("MONGODB_DB", "evolution_pro")
    OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")

    mongo = AsyncIOMotorClient(MONGO_URL)
    db = mongo[DB_NAME]

    job_id = uuid.uuid4().hex[:8]
    tmp_dir = Path(f"/tmp/vp_{partner_id}_{job_id}")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    raw_path = str(tmp_dir / "raw.mp4")
    clean_path = str(tmp_dir / "clean.mp4")
    final_path = str(tmp_dir / "final.mp4")
    audio_path = str(tmp_dir / "audio.mp3")

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

        # 1. Download
        size = await download_video(video_url, raw_path)
        raw_dur = get_video_duration(raw_path)
        logger.info(f"[VIDEO-PIPE] Downloaded {size/1e6:.1f}MB, {raw_dur:.0f}s")

        # 2. FFmpeg clean
        await set_status("cleaning")
        ffmpeg_clean(raw_path, clean_path)
        clean_dur = get_video_duration(clean_path)
        silence_saved = raw_dur - clean_dur

        # 3. Whisper transcript + filler detection
        filler_report = {"count": 0, "segments": [], "time_saved_s": 0}
        transcript = ""

        if OPENAI_KEY and extract_audio_for_whisper(clean_path, audio_path):
            audio_size = Path(audio_path).stat().st_size
            if audio_size < 25 * 1024 * 1024:  # Whisper limit 25MB
                await set_status("transcribing")
                try:
                    import openai
                    client_oai = openai.OpenAI(api_key=OPENAI_KEY)
                    with open(audio_path, "rb") as af:
                        result = client_oai.audio.transcriptions.create(
                            model="whisper-1",
                            file=af,
                            response_format="verbose_json",
                            timestamp_granularities=["word"],
                            language="it"
                        )
                    transcript = result.text or ""
                    words = [{"word": w.word, "start": w.start, "end": w.end}
                             for w in (result.words or [])]
                    filler_segs = detect_filler_words(words)

                    filler_time = sum(s["end"] - s["start"] for s in filler_segs)
                    filler_report = {
                        "count": len(filler_segs),
                        "segments": filler_segs[:50],  # max 50 in DB
                        "time_saved_s": round(filler_time, 1),
                        "words_found": list({s["word"] for s in filler_segs})
                    }

                    logger.info(f"[VIDEO-PIPE] Filler: {len(filler_segs)} ({filler_time:.1f}s)")

                    if filler_segs:
                        await set_status("cutting_fillers")
                        cut_filler_segments(clean_path, final_path, filler_segs, clean_dur)
                    else:
                        shutil.copy(clean_path, final_path)

                except Exception as e:
                    logger.warning(f"[VIDEO-PIPE] Whisper error: {e}")
                    shutil.copy(clean_path, final_path)
            else:
                logger.info(f"[VIDEO-PIPE] Audio too large ({audio_size/1e6:.1f}MB), skipping Whisper")
                shutil.copy(clean_path, final_path)
        else:
            shutil.copy(clean_path, final_path)

        final_dur = get_video_duration(final_path)
        total_saved = raw_dur - final_dur

        # 4. YouTube upload
        await set_status("uploading_youtube")
        ts = datetime.now().strftime("%m/%Y")
        yt_title = f"{name} — {label.replace('_', ' ').title()} {ts}"
        youtube_url = upload_to_youtube_sync(final_path, yt_title, name)

        if not youtube_url:
            # YouTube fallback: salva path locale, notifica
            await set_status("error_youtube")
            await telegram(
                f"⚠️ <b>YouTube upload fallito</b>\n👤 {name} — {label}\n"
                f"✅ Video pulito ma non su YouTube. Controllare credenziali."
            )
            return

        # 5. Salva in DB
        youtube_id = youtube_url.split("v=")[-1]
        embed_url = f"https://www.youtube.com/embed/{youtube_id}"
        systeme_embed = f'<iframe src="{embed_url}" width="560" height="315" frameborder="0" allowfullscreen></iframe>'

        base_data = {
            "video_raw_url": video_url,
            "video_youtube_url": youtube_url,
            "video_youtube_id": youtube_id,
            "video_embed_url": embed_url,
            "video_systeme_embed": systeme_embed,
            "video_transcript": transcript[:5000],  # primi 5000 chars in DB
            "video_filler_report": filler_report,
            "video_raw_duration_s": int(raw_dur),
            "video_final_duration_s": int(final_dur),
            "video_time_saved_s": int(total_saved),
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

        # 6. Telegram admin
        m, s = divmod(int(total_saved), 60)
        rdm, rds = divmod(int(raw_dur), 60)
        fdm, fds = divmod(int(final_dur), 60)

        msg = (
            f"✅ <b>VIDEO PRONTO PER REVIEW</b>\n\n"
            f"👤 <b>{name}</b> — {label}\n"
            f"⏱ Originale: {rdm}:{rds:02d}  →  Pulito: {fdm}:{fds:02d}\n"
            f"✂️ Risparmiato: {m}:{s:02d} "
            f"(silenzio: {int(silence_saved)}s + filler: {filler_report['count']})\n\n"
            f"📺 <a href='{youtube_url}'>Guarda su YouTube (unlisted)</a>\n\n"
            f"→ Evolution Admin → approva → copia embed Systeme"
        )
        await telegram(msg)
        logger.info(f"[VIDEO-PIPE] DONE {name} — YouTube: {youtube_url}")

    except Exception as e:
        logger.error(f"[VIDEO-PIPE] Error: {e}", exc_info=True)
        await set_status("error")
        await telegram(f"❌ <b>Errore pipeline video</b>\n👤 {partner_id}\n🔴 {str(e)[:300]}")
        raise

    finally:
        shutil.rmtree(str(tmp_dir), ignore_errors=True)
        mongo.close()
