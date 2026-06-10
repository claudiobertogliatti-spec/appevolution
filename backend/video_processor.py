"""
EVOLUTION PRO - Video Processing Module (ANDREA & GAIA)
Surgical Cut Pipeline: Auto-Trim, Pace-Maker, Branding, Normalization

CLOUD VERSION: Uses OpenAI Whisper API instead of local model

REV 2026-06-09 — Fix qualità editing:
- Match filler ESATTO (non substring) + filler "soft" tagliati solo se isolati tra pause
- Padding sui tagli: i silenzi vengono accorciati lasciando una pausa residua naturale
- Niente più speed per-segmento (causava desync A/V cumulativo): un solo pass finale
- Micro-fade audio (30ms) su ogni giunzione: niente click
- Intro/outro concatenati con RE-ENCODE e normalizzazione parametri (niente -c copy)
- Output CFR alla fps del sorgente (gestisce sorgenti VFR da smartphone/screen rec)
- QA automatico: delta sync A/V + ratio di taglio → flag needs_review
"""

import os
import subprocess
import json
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import tempfile
import shutil
import httpx

logger = logging.getLogger(__name__)

# --- Filler words (italiano) ---------------------------------------------
# HARD: suoni puri di esitazione → tagliati se c'è anche una minima pausa attorno
FILLER_WORDS_HARD = {
    "ehm", "ehmm", "ehh", "eh", "uhm", "uhh", "mmm", "mhm", "ahm",
}
# SOFT: parole italiane VERE usate anche come intercalari.
# Tagliate SOLO se isolate tra due pause evidenti (altrimenti sono parte della frase).
FILLER_WORDS_SOFT = {
    "cioè", "cioe", "praticamente", "allora", "tipo",
    "insomma", "diciamo", "ecco", "quindi", "niente",
}
# Bigrammi intercalari (valgono come SOFT)
FILLER_BIGRAMS = {
    ("va", "bene"), ("ok", "ok"), ("sì", "sì"), ("si", "si"),
}

# --- Processing settings ---------------------------------------------------
SILENCE_THRESHOLD_DB = -35   # dB threshold for silence detection
SILENCE_MIN_DURATION = 1.0   # taglia solo silenzi >= 1s (0.4 mangiava le pause naturali)
SILENCE_KEEP = 0.30          # pausa residua lasciata su ciascun lato del silenzio tagliato
HARD_PAUSE = 0.08            # pausa minima attorno a un filler HARD per tagliarlo
SOFT_PAUSE = 0.25            # pausa minima attorno a un filler SOFT per tagliarlo
FILLER_PAD_MAX = 0.10        # estensione max del taglio filler dentro la pausa adiacente
MIN_KEEP_SEGMENT = 0.25      # segmenti tenuti più corti di così vengono assorbiti nel taglio
AUDIO_FADE = 0.03            # micro-crossfade audio per giunzione (anti-click)
SPEED_FACTOR = 1.15          # Pace-Maker: applicato UNA volta sul file finale, mai per segmento
TARGET_LUFS = -14            # Audio normalization target
INTRO_DURATION = 3           # seconds
OUTRO_DURATION = 5           # seconds


def _clean_word(raw: str) -> str:
    """lowercase + rimozione punteggiatura, preservando le lettere accentate"""
    w = raw.strip().lower()
    return ''.join(c for c in w if c.isalnum() or c.isspace()).strip()


class VideoProcessor:
    """Handles all video processing operations for Evolution PRO"""

    def __init__(self, storage_path: str = "/app/storage"):
        self.storage_path = Path(storage_path)
        self.raw_path = self.storage_path / "videos" / "raw"
        self.processed_path = self.storage_path / "videos" / "processed"
        self.approved_path = self.storage_path / "videos" / "approved"
        self.temp_path = self.storage_path / "temp"
        self.intros_path = self.storage_path / "intros"
        self.outros_path = self.storage_path / "outros"

        # Create directories
        for path in [self.raw_path, self.processed_path, self.approved_path,
                     self.temp_path, self.intros_path, self.outros_path]:
            path.mkdir(parents=True, exist_ok=True)

    def _run_ffmpeg(self, args: List[str], check: bool = True) -> subprocess.CompletedProcess:
        """Run FFmpeg command"""
        cmd = ["ffmpeg", "-y"] + args
        logger.debug(f"Running FFmpeg: {' '.join(cmd)}")
        return subprocess.run(cmd, capture_output=True, text=True, check=check)

    def _run_ffprobe(self, input_path: str) -> dict:
        """Get video metadata using ffprobe"""
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            str(input_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return json.loads(result.stdout) if result.returncode == 0 else {}

    def _get_video_fps(self, probe: dict, default: float = 30.0) -> float:
        """Fps del sorgente da r_frame_rate (es. '30000/1001'). Serve per forzare CFR in output."""
        try:
            vstream = next((s for s in probe.get("streams", [])
                            if s.get("codec_type") == "video"), {})
            rate = vstream.get("avg_frame_rate") or vstream.get("r_frame_rate") or ""
            if "/" in rate:
                num, den = rate.split("/")
                fps = float(num) / float(den) if float(den) else default
            else:
                fps = float(rate) if rate else default
            # sorgenti VFR riportano valori assurdi → clamp su range sensato
            if not (10.0 <= fps <= 120.0):
                fps = default
            return round(fps, 3)
        except Exception:
            return default

    def detect_silences(self, input_path: str) -> List[Tuple[float, float]]:
        """
        Detect silence segments in audio using FFmpeg's silencedetect filter.
        Returns list of (start, end) tuples for each silence segment.
        """
        cmd = [
            "ffmpeg", "-i", str(input_path),
            "-af", f"silencedetect=noise={SILENCE_THRESHOLD_DB}dB:d={SILENCE_MIN_DURATION}",
            "-f", "null", "-"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        stderr = result.stderr

        silences = []
        current_start = None

        for line in stderr.split('\n'):
            if 'silence_start:' in line:
                try:
                    current_start = float(line.split('silence_start:')[1].strip().split()[0])
                except (IndexError, ValueError):
                    pass
            elif 'silence_end:' in line and current_start is not None:
                try:
                    end = float(line.split('silence_end:')[1].strip().split()[0])
                    silences.append((current_start, end))
                    current_start = None
                except (IndexError, ValueError):
                    pass

        logger.info(f"Detected {len(silences)} silence segments")
        return silences

    def shrink_silence_cuts(self, silences: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """
        Accorcia ogni silenzio lasciando SILENCE_KEEP secondi di pausa residua
        per lato. Evita l'effetto "mitragliatrice" e protegge dai timestamp
        imprecisi (le sillabe non vengono più mozzate).
        """
        cuts = []
        for start, end in silences:
            new_start = start + SILENCE_KEEP
            new_end = end - SILENCE_KEEP
            if new_end - new_start > 0.05:
                cuts.append((new_start, new_end))
        return cuts

    async def transcribe_audio_cloud(self, input_path: str) -> dict:
        """
        Transcribe audio using OpenAI Whisper API (cloud).
        Returns transcription with word-level timestamps.
        """
        api_key = os.environ.get('EMERGENT_LLM_KEY', '')

        if not api_key:
            logger.warning("No EMERGENT_LLM_KEY found, skipping transcription")
            return {"text": "", "segments": []}

        # Extract audio to temporary file
        temp_audio = self.temp_path / f"audio_{datetime.now().timestamp()}.mp3"

        try:
            # Extract audio using FFmpeg
            extract_cmd = [
                "-i", str(input_path),
                "-vn", "-acodec", "libmp3lame", "-q:a", "4",
                "-ar", "16000", "-ac", "1",
                str(temp_audio)
            ]
            self._run_ffmpeg(extract_cmd)

            # Call OpenAI Whisper API via Emergent
            async with httpx.AsyncClient(timeout=120.0) as client:
                with open(temp_audio, 'rb') as audio_file:
                    files = {'file': ('audio.mp3', audio_file, 'audio/mpeg')}
                    data = {
                        'model': 'whisper-1',
                        'language': 'it',
                        'response_format': 'verbose_json',
                        'timestamp_granularities[]': 'word'
                    }

                    response = await client.post(
                        'https://api.openai.com/v1/audio/transcriptions',
                        headers={'Authorization': f'Bearer {api_key}'},
                        files=files,
                        data=data
                    )

                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"Transcription completed: {len(result.get('text', ''))} chars")
                        return result
                    else:
                        logger.error(f"Whisper API error: {response.status_code} - {response.text}")
                        return {"text": "", "segments": []}

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return {"text": "", "segments": []}
        finally:
            if temp_audio.exists():
                temp_audio.unlink()

    def detect_filler_segments(self, transcription: dict,
                               total_duration: float = 0) -> List[Tuple[float, float]]:
        """
        Detect filler word segments from transcription.

        Regole (fix tagli a metà parola):
        - match ESATTO sulla parola pulita, mai substring
        - filler HARD (ehm/uhm/...) → tagliati se hanno >= HARD_PAUSE di pausa per lato
        - filler SOFT (allora/quindi/...) → tagliati SOLO se isolati tra pause >= SOFT_PAUSE
          (altrimenti sono parole vere della frase e NON vanno toccate)
        - il taglio si estende leggermente dentro le pause adiacenti (max FILLER_PAD_MAX)
          così i timestamp imprecisi di Whisper non mozzano le parole vicine
        """
        # Handle both local Whisper and API response formats
        words = transcription.get("words", [])
        if not words:
            for segment in transcription.get("segments", []):
                words.extend(segment.get("words", []))

        # normalizza in lista di (clean_word, start, end) valide
        norm = []
        for w in words:
            start = w.get("start")
            end = w.get("end")
            text = _clean_word(w.get("word", ""))
            if text and start is not None and end is not None and end > start:
                norm.append((text, float(start), float(end)))

        filler_segments: List[Tuple[float, float]] = []
        n = len(norm)
        consumed = set()  # indici già coperti da un bigramma

        def gaps(i: int, j: int) -> Tuple[float, float]:
            """pausa prima della parola i e dopo la parola j"""
            before = norm[i][1] - (norm[i - 1][2] if i > 0 else 0.0)
            after = (norm[j + 1][1] if j + 1 < n else (total_duration or norm[j][2] + 10)) - norm[j][2]
            return max(before, 0.0), max(after, 0.0)

        def add_cut(i: int, j: int, gap_before: float, gap_after: float):
            start = norm[i][1] - min(gap_before / 2, FILLER_PAD_MAX)
            end = norm[j][2] + min(gap_after / 2, FILLER_PAD_MAX)
            filler_segments.append((max(start, 0.0), end))
            logger.debug(f"Cut filler '{' '.join(norm[k][0] for k in range(i, j + 1))}' "
                         f"at {start:.2f}-{end:.2f}")

        # 1) bigrammi (va bene / ok ok / sì sì) — regola SOFT
        for i in range(n - 1):
            if i in consumed or (i + 1) in consumed:
                continue
            if (norm[i][0], norm[i + 1][0]) in FILLER_BIGRAMS:
                gb, ga = gaps(i, i + 1)
                if gb >= SOFT_PAUSE and ga >= SOFT_PAUSE:
                    add_cut(i, i + 1, gb, ga)
                    consumed.update((i, i + 1))

        # 2) parole singole — match ESATTO
        for i in range(n):
            if i in consumed:
                continue
            word = norm[i][0]
            if word in FILLER_WORDS_HARD:
                gb, ga = gaps(i, i)
                if gb >= HARD_PAUSE and ga >= HARD_PAUSE:
                    add_cut(i, i, gb, ga)
            elif word in FILLER_WORDS_SOFT:
                gb, ga = gaps(i, i)
                if gb >= SOFT_PAUSE and ga >= SOFT_PAUSE:
                    add_cut(i, i, gb, ga)

        logger.info(f"Detected {len(filler_segments)} filler word segments")
        return filler_segments

    def merge_segments_to_keep(self, duration: float, segments_to_cut: List[Tuple[float, float]],
                               min_gap: float = 0.1) -> List[Tuple[float, float]]:
        """
        Convert segments to cut into segments to keep.
        Merges overlapping/adjacent cut segments.
        Segmenti tenuti più corti di MIN_KEEP_SEGMENT vengono assorbiti nel taglio
        (un "blip" di 3 frame tra due tagli è peggio di un taglio unico).
        """
        if not segments_to_cut:
            return [(0, duration)]

        # Sort and merge overlapping cut segments
        sorted_cuts = sorted(segments_to_cut, key=lambda x: x[0])
        merged_cuts = []

        for start, end in sorted_cuts:
            start = max(0.0, start)
            end = min(duration, end)
            if end <= start:
                continue
            if merged_cuts and start <= merged_cuts[-1][1] + min_gap:
                merged_cuts[-1] = (merged_cuts[-1][0], max(merged_cuts[-1][1], end))
            else:
                merged_cuts.append((start, end))

        # Convert to segments to keep
        keep_segments = []
        current_pos = 0.0

        for cut_start, cut_end in merged_cuts:
            if cut_start > current_pos:
                keep_segments.append((current_pos, cut_start))
            current_pos = max(current_pos, cut_end)

        if current_pos < duration:
            keep_segments.append((current_pos, duration))

        # assorbi i micro-segmenti
        keep_segments = [(s, e) for s, e in keep_segments if e - s >= MIN_KEEP_SEGMENT]
        if not keep_segments:
            keep_segments = [(0, duration)]

        return keep_segments

    def create_filter_complex(self, keep_segments: List[Tuple[float, float]],
                              fps: float = 30.0) -> str:
        """
        Create FFmpeg filter_complex string for trimming.

        FIX DESYNC: niente più speed per segmento. setpts/(speed) sul video e
        atempo sull'audio arrotondano in modo diverso → su decine di segmenti
        lo sfasamento si accumula. La velocità ora si applica UNA volta sul
        file finale (vedi apply_speed_pass). Qui solo trim + micro-fade audio
        anti-click + fps CFR in uscita.
        """
        if not keep_segments:
            return ""

        video_parts = []
        audio_parts = []

        for i, (start, end) in enumerate(keep_segments):
            seg_dur = end - start
            fade_out_start = max(seg_dur - AUDIO_FADE, 0)
            video_parts.append(
                f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}]"
            )
            audio_parts.append(
                f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,"
                f"afade=t=in:st=0:d={AUDIO_FADE},"
                f"afade=t=out:st={fade_out_start:.3f}:d={AUDIO_FADE}[a{i}]"
            )

        n = len(keep_segments)
        concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(n))

        filter_complex = ";".join(video_parts + audio_parts)
        filter_complex += f";{concat_inputs}concat=n={n}:v=1:a=1[cv][outa]"
        # CFR alla fps del sorgente: gestisce sorgenti VFR (smartphone/screen rec)
        filter_complex += f";[cv]fps=fps={fps}[outv]"

        return filter_complex

    def apply_speed_pass(self, input_path: str, output_path: str,
                         speed_factor: float = SPEED_FACTOR) -> bool:
        """
        Pace-Maker: velocità applicata in UN SOLO pass sull'intero file.
        Un'unica coppia setpts/atempo → nessun drift cumulativo A/V.
        """
        if abs(speed_factor - 1.0) < 1e-3:
            shutil.copy(str(input_path), str(output_path))
            return True
        cmd = [
            "-i", str(input_path),
            "-filter_complex",
            f"[0:v]setpts=PTS/{speed_factor}[v];[0:a]atempo={speed_factor}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k",
            str(output_path)
        ]
        try:
            self._run_ffmpeg(cmd)
            return True
        except Exception as e:
            logger.error(f"Speed pass failed: {e}")
            return False

    def normalize_audio(self, input_path: str, output_path: str, target_lufs: float = TARGET_LUFS) -> bool:
        """
        Normalize audio to target LUFS using FFmpeg loudnorm filter (two-pass).
        """
        # First pass - measure
        measure_cmd = [
            "ffmpeg", "-i", str(input_path),
            "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-"
        ]
        result = subprocess.run(measure_cmd, capture_output=True, text=True)

        # Parse loudnorm stats from stderr
        stderr = result.stderr
        json_start = stderr.rfind('{')
        json_end = stderr.rfind('}') + 1

        if json_start == -1 or json_end <= json_start:
            logger.warning("Could not parse loudnorm stats, applying single-pass")
            stats = None
        else:
            try:
                stats = json.loads(stderr[json_start:json_end])
            except json.JSONDecodeError:
                stats = None

        # Second pass - apply normalization
        if stats:
            af = (
                f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:"
                f"measured_I={stats.get('input_i')}:"
                f"measured_TP={stats.get('input_tp')}:"
                f"measured_LRA={stats.get('input_lra')}:"
                f"measured_thresh={stats.get('input_thresh')}:"
                f"offset={stats.get('target_offset')}:linear=true"
            )
        else:
            af = f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11"

        norm_cmd = [
            "-i", str(input_path),
            "-af", af,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            str(output_path)
        ]

        try:
            self._run_ffmpeg(norm_cmd)
            return True
        except Exception as e:
            logger.error(f"Audio normalization failed: {e}")
            return False

    def add_intro_outro(self, input_path: str, output_path: str, partner_name: str,
                        intro_path: Optional[str] = None,
                        outro_path: Optional[str] = None) -> bool:
        """
        Add intro and outro to video. If no custom intro/outro provided,
        generates a simple branded slate.

        FIX DESYNC: il vecchio concat demuxer con -c copy richiede parametri
        codec IDENTICI tra slate e video (fps, timebase, profilo, audio) —
        in pratica non lo erano mai → timestamp rotti e desync dal primo
        secondo. Ora: concat via filter_complex con RE-ENCODE e
        normalizzazione esplicita di risoluzione, SAR, fps e audio per
        ciascun input.
        """
        temp_intro = None
        temp_outro = None

        try:
            # Get video properties
            probe = self._run_ffprobe(input_path)
            video_stream = next((s for s in probe.get("streams", []) if s["codec_type"] == "video"), {})
            width = int(video_stream.get("width", 1920))
            height = int(video_stream.get("height", 1080))
            fps = self._get_video_fps(probe)

            # Generate intro if not provided
            if not intro_path or not os.path.exists(intro_path):
                temp_intro = self.temp_path / f"intro_{datetime.now().timestamp()}.mp4"
                self._generate_branded_slate(
                    str(temp_intro),
                    f"Evolution PRO\n{partner_name}",
                    INTRO_DURATION, width, height
                )
                intro_path = str(temp_intro)

            # Generate outro if not provided
            if not outro_path or not os.path.exists(outro_path):
                temp_outro = self.temp_path / f"outro_{datetime.now().timestamp()}.mp4"
                self._generate_branded_slate(
                    str(temp_outro),
                    f"Evolution PRO\nScopri di più",
                    OUTRO_DURATION, width, height
                )
                outro_path = str(temp_outro)

            # Concat con re-encode: ogni input normalizzato a stessi
            # parametri video (WxH, SAR, fps) e audio (48k stereo)
            parts = []
            for j in range(3):
                parts.append(
                    f"[{j}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=fps={fps}[v{j}]"
                )
                parts.append(
                    f"[{j}:a]aresample=48000,"
                    f"aformat=sample_fmts=fltp:channel_layouts=stereo[a{j}]"
                )
            filter_complex = ";".join(parts)
            filter_complex += ";[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[outv][outa]"

            concat_cmd = [
                "-i", str(intro_path),
                "-i", str(input_path),
                "-i", str(outro_path),
                "-filter_complex", filter_complex,
                "-map", "[outv]", "-map", "[outa]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "192k",
                str(output_path)
            ]

            self._run_ffmpeg(concat_cmd)

            return True

        except Exception as e:
            logger.error(f"Add intro/outro failed: {e}")
            return False
        finally:
            # Cleanup temp files
            if temp_intro and Path(temp_intro).exists():
                Path(temp_intro).unlink()
            if temp_outro and Path(temp_outro).exists():
                Path(temp_outro).unlink()

    def _generate_branded_slate(self, output_path: str, text: str,
                                duration: float, width: int, height: int):
        """Generate a simple branded video slate with text"""
        # Evolution PRO colors: Yellow #F5C518 on Dark Navy #1a2332
        cmd = [
            "-f", "lavfi",
            "-i", f"color=c=0x1a2332:s={width}x{height}:d={duration}",
            "-f", "lavfi",
            "-i", f"anullsrc=r=48000:cl=stereo:d={duration}",
            "-vf", (
                f"drawtext=text='{text}':"
                f"fontcolor=0xF5C518:fontsize={height//12}:"
                f"x=(w-text_w)/2:y=(h-text_h)/2:"
                "font='sans-serif'"
            ),
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac",
            "-shortest",
            str(output_path)
        ]
        self._run_ffmpeg(cmd)

    def qa_check(self, final_path: str, original_duration: float,
                 keep_segments: List[Tuple[float, float]]) -> Dict:
        """
        QA automatico post-render. Se passa, il video può essere
        auto-approvato; se no, va in review con i motivi già indicati.
        - av_sync_delta: differenza durata stream video vs audio (desync)
        - cut_ratio: % di contenuto rimosso (troppo = editing sospetto)
        """
        report = {"passed": True, "issues": []}
        try:
            probe = self._run_ffprobe(final_path)
            v_dur = a_dur = None
            for s in probe.get("streams", []):
                d = s.get("duration")
                if d is None:
                    continue
                if s.get("codec_type") == "video":
                    v_dur = float(d)
                elif s.get("codec_type") == "audio":
                    a_dur = float(d)

            if v_dur is not None and a_dur is not None:
                delta = abs(v_dur - a_dur)
                report["av_sync_delta_s"] = round(delta, 3)
                if delta > 0.15:
                    report["passed"] = False
                    report["issues"].append(
                        f"Desync A/V: {delta:.2f}s di differenza tra stream video e audio")

            if original_duration > 0 and keep_segments:
                kept = sum(e - s for s, e in keep_segments)
                cut_ratio = 1.0 - (kept / original_duration)
                report["cut_ratio"] = round(cut_ratio, 3)
                if cut_ratio > 0.40:
                    report["passed"] = False
                    report["issues"].append(
                        f"Tagliato il {cut_ratio*100:.0f}% del video: probabile over-cutting")

            report["segments_count"] = len(keep_segments)
        except Exception as e:
            report["passed"] = False
            report["issues"].append(f"QA check error: {e}")
        return report

    async def process_video(self, video_id: str, input_filename: str,
                            partner_name: str,
                            auto_trim: bool = True,
                            remove_fillers: bool = True,
                            apply_speed: bool = True,
                            normalize: bool = True,
                            add_branding: bool = True) -> Dict:
        """
        Main video processing pipeline.
        Returns processing result with output path and metadata.
        """
        input_path = self.raw_path / input_filename

        if not input_path.exists():
            return {"success": False, "error": f"Input file not found: {input_path}"}

        result = {
            "video_id": video_id,
            "input_file": input_filename,
            "partner_name": partner_name,
            "processing_steps": [],
            "success": False
        }

        try:
            # Get video duration + fps
            probe = self._run_ffprobe(str(input_path))
            duration = float(probe.get("format", {}).get("duration", 0))
            fps = self._get_video_fps(probe)
            result["original_duration"] = duration

            # Step 1: Detect segments to cut
            segments_to_cut = []

            if auto_trim:
                silences = self.detect_silences(str(input_path))
                silence_cuts = self.shrink_silence_cuts(silences)
                segments_to_cut.extend(silence_cuts)
                result["processing_steps"].append({
                    "step": "silence_detection",
                    "silences_found": len(silences),
                    "silences_cut": len(silence_cuts)
                })

            if remove_fillers:
                # Use cloud Whisper API
                transcription = await self.transcribe_audio_cloud(str(input_path))
                fillers = self.detect_filler_segments(transcription, duration)
                segments_to_cut.extend(fillers)
                result["processing_steps"].append({
                    "step": "filler_detection",
                    "fillers_found": len(fillers),
                    "transcription_text": transcription.get("text", "")[:500]
                })

            # Step 2: Calculate segments to keep
            keep_segments = self.merge_segments_to_keep(duration, segments_to_cut)

            # Step 3: Apply cuts (NO speed here — vedi apply_speed_pass)
            temp_output = self.temp_path / f"temp_{video_id}.mp4"

            if segments_to_cut and keep_segments:
                filter_complex = self.create_filter_complex(keep_segments, fps)

                trim_cmd = [
                    "-i", str(input_path),
                    "-filter_complex", filter_complex,
                    "-map", "[outv]", "-map", "[outa]",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-b:a", "192k",
                    str(temp_output)
                ]

                self._run_ffmpeg(trim_cmd)
                result["processing_steps"].append({
                    "step": "trim",
                    "segments_kept": len(keep_segments)
                })
            else:
                # Just copy if no trimming needed
                shutil.copy(str(input_path), str(temp_output))

            # Step 3b: Pace-Maker in un solo pass sull'intero file (fix desync)
            if apply_speed:
                speed_output = self.temp_path / f"speed_{video_id}.mp4"
                if self.apply_speed_pass(str(temp_output), str(speed_output)):
                    temp_output.unlink()
                    temp_output = speed_output
                    result["processing_steps"].append({
                        "step": "speed_single_pass",
                        "speed_factor": SPEED_FACTOR
                    })

            # Step 4: Normalize audio
            if normalize:
                normalized_output = self.temp_path / f"normalized_{video_id}.mp4"
                if self.normalize_audio(str(temp_output), str(normalized_output)):
                    temp_output.unlink()
                    temp_output = normalized_output
                    result["processing_steps"].append({
                        "step": "audio_normalization",
                        "target_lufs": TARGET_LUFS
                    })

            # Step 5: Add intro/outro
            final_output = self.processed_path / f"processed_{video_id}.mp4"

            if add_branding:
                if self.add_intro_outro(str(temp_output), str(final_output), partner_name):
                    result["processing_steps"].append({
                        "step": "branding",
                        "intro_duration": INTRO_DURATION,
                        "outro_duration": OUTRO_DURATION
                    })
                else:
                    # Fallback: just copy without branding
                    shutil.copy(str(temp_output), str(final_output))
            else:
                shutil.copy(str(temp_output), str(final_output))

            # Cleanup temp file
            if temp_output.exists():
                temp_output.unlink()

            # Get final duration
            final_probe = self._run_ffprobe(str(final_output))
            final_duration = float(final_probe.get("format", {}).get("duration", 0))

            # Step 6: QA automatico → se passa, candidato all'auto-approve
            qa = self.qa_check(str(final_output), duration, keep_segments)
            result["qa"] = qa
            result["needs_review"] = not qa["passed"]

            result["success"] = True
            result["output_file"] = f"processed_{video_id}.mp4"
            result["output_path"] = str(final_output)
            result["final_duration"] = final_duration
            result["time_saved"] = duration - final_duration + INTRO_DURATION + OUTRO_DURATION

            return result

        except Exception as e:
            logger.exception(f"Video processing failed: {e}")
            result["error"] = str(e)
            return result

    def approve_video(self, video_id: str) -> Dict:
        """
        Move processed video to approved folder.
        Returns approved video info with internal URL.
        """
        processed_file = self.processed_path / f"processed_{video_id}.mp4"

        if not processed_file.exists():
            return {"success": False, "error": "Processed video not found"}

        approved_file = self.approved_path / f"approved_{video_id}.mp4"
        shutil.move(str(processed_file), str(approved_file))

        return {
            "success": True,
            "video_id": video_id,
            "approved_path": str(approved_file),
            "internal_url": f"/api/files/videos/approved/approved_{video_id}.mp4",
            "ready_for_youtube": True
        }


# Singleton instance
video_processor = VideoProcessor()
