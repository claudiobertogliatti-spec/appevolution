"""
EVOLUTION PRO - Video Processing Module (ANDREA & GAIA)
Surgical Cut Pipeline: Auto-Trim, Pace-Maker, Branding, Normalization
"""

import os
import subprocess
import json
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import whisper
import tempfile
import shutil

logger = logging.getLogger(__name__)

# Italian filler words to detect and potentially remove
FILLER_WORDS_IT = [
    "ehm", "ehh", "uhm", "uhh", "mmm",
    "cioè", "cioe",
    "praticamente",
    "allora",
    "tipo",
    "insomma",
    "diciamo",
    "ecco",
    "quindi",
    "niente",
    "va bene",
    "ok ok",
    "sì sì",
]

# Processing settings
SILENCE_THRESHOLD_DB = -35  # dB threshold for silence detection
SILENCE_MIN_DURATION = 0.4  # Minimum silence duration to cut (seconds)
SPEED_FACTOR = 1.15  # Pace-Maker speed increase
TARGET_LUFS = -14  # Audio normalization target
INTRO_DURATION = 3  # seconds
OUTRO_DURATION = 5  # seconds

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
        
        # Initialize Whisper model (use "base" for balance of speed/accuracy)
        self.whisper_model = None
        
    def _ensure_whisper_model(self):
        """Lazy load Whisper model"""
        if self.whisper_model is None:
            logger.info("Loading Whisper model (base)...")
            self.whisper_model = whisper.load_model("base")
            logger.info("Whisper model loaded successfully")
        return self.whisper_model
    
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
    
    def transcribe_audio(self, input_path: str) -> dict:
        """
        Transcribe audio using local Whisper model.
        Returns transcription with word-level timestamps.
        """
        model = self._ensure_whisper_model()
        
        logger.info(f"Transcribing audio: {input_path}")
        result = model.transcribe(
            str(input_path),
            language="it",
            word_timestamps=True,
            verbose=False
        )
        
        return result
    
    def detect_filler_segments(self, transcription: dict) -> List[Tuple[float, float]]:
        """
        Detect filler word segments from Whisper transcription.
        Returns list of (start, end) tuples for filler segments.
        """
        filler_segments = []
        
        for segment in transcription.get("segments", []):
            for word_info in segment.get("words", []):
                word = word_info.get("word", "").strip().lower()
                # Remove punctuation
                word_clean = ''.join(c for c in word if c.isalnum() or c.isspace())
                
                for filler in FILLER_WORDS_IT:
                    if filler in word_clean:
                        start = word_info.get("start", 0)
                        end = word_info.get("end", 0)
                        if end > start:
                            filler_segments.append((start, end))
                            logger.debug(f"Found filler '{word}' at {start:.2f}-{end:.2f}")
                        break
        
        logger.info(f"Detected {len(filler_segments)} filler word segments")
        return filler_segments
    
    def merge_segments_to_keep(self, duration: float, segments_to_cut: List[Tuple[float, float]], 
                                min_gap: float = 0.1) -> List[Tuple[float, float]]:
        """
        Convert segments to cut into segments to keep.
        Merges overlapping/adjacent cut segments.
        """
        if not segments_to_cut:
            return [(0, duration)]
        
        # Sort and merge overlapping cut segments
        sorted_cuts = sorted(segments_to_cut, key=lambda x: x[0])
        merged_cuts = []
        
        for start, end in sorted_cuts:
            if merged_cuts and start <= merged_cuts[-1][1] + min_gap:
                merged_cuts[-1] = (merged_cuts[-1][0], max(merged_cuts[-1][1], end))
            else:
                merged_cuts.append((start, end))
        
        # Convert to segments to keep
        keep_segments = []
        current_pos = 0
        
        for cut_start, cut_end in merged_cuts:
            if cut_start > current_pos:
                keep_segments.append((current_pos, cut_start))
            current_pos = cut_end
        
        if current_pos < duration:
            keep_segments.append((current_pos, duration))
        
        return keep_segments
    
    def create_filter_complex(self, keep_segments: List[Tuple[float, float]], 
                               speed_factor: float = SPEED_FACTOR) -> str:
        """
        Create FFmpeg filter_complex string for trimming and speed adjustment.
        """
        if not keep_segments:
            return ""
        
        video_parts = []
        audio_parts = []
        
        for i, (start, end) in enumerate(keep_segments):
            # Video trim and speed
            video_parts.append(
                f"[0:v]trim=start={start}:end={end},setpts=(PTS-STARTPTS)/{speed_factor}[v{i}]"
            )
            # Audio trim, speed with pitch correction (atempo)
            audio_parts.append(
                f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,atempo={speed_factor}[a{i}]"
            )
        
        # Concat all parts
        n = len(keep_segments)
        concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(n))
        
        filter_complex = ";".join(video_parts + audio_parts)
        filter_complex += f";{concat_inputs}concat=n={n}:v=1:a=1[outv][outa]"
        
        return filter_complex
    
    def normalize_audio(self, input_path: str, output_path: str, target_lufs: float = TARGET_LUFS) -> bool:
        """
        Normalize audio to target LUFS using FFmpeg loudnorm filter (two-pass).
        """
        # First pass - measure
        measure_cmd = [
            "-i", str(input_path),
            "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-"
        ]
        result = self._run_ffmpeg(measure_cmd, check=False)
        
        # Parse loudnorm output
        try:
            # Find JSON in stderr
            stderr = result.stderr
            json_start = stderr.rfind('{')
            json_end = stderr.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                stats = json.loads(stderr[json_start:json_end])
            else:
                stats = {}
        except json.JSONDecodeError:
            stats = {}
        
        # Second pass - apply normalization
        loudnorm_filter = f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11"
        if stats:
            loudnorm_filter += (
                f":measured_I={stats.get('input_i', -23)}"
                f":measured_TP={stats.get('input_tp', -1)}"
                f":measured_LRA={stats.get('input_lra', 7)}"
                f":measured_thresh={stats.get('input_thresh', -33)}"
                f":offset={stats.get('target_offset', 0)}"
                ":linear=true"
            )
        
        normalize_cmd = [
            "-i", str(input_path),
            "-af", loudnorm_filter,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            str(output_path)
        ]
        
        try:
            self._run_ffmpeg(normalize_cmd)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Audio normalization failed: {e}")
            return False
    
    def add_intro_outro(self, input_path: str, output_path: str, 
                        partner_name: str, intro_path: Optional[str] = None,
                        outro_path: Optional[str] = None) -> bool:
        """
        Add intro and outro to video. If no custom intro/outro provided,
        generates a simple branded slate.
        """
        temp_intro = None
        temp_outro = None
        
        try:
            # Get video properties
            probe = self._run_ffprobe(input_path)
            video_stream = next((s for s in probe.get("streams", []) if s["codec_type"] == "video"), {})
            width = int(video_stream.get("width", 1920))
            height = int(video_stream.get("height", 1080))
            
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
            
            # Create concat file
            concat_file = self.temp_path / f"concat_{datetime.now().timestamp()}.txt"
            with open(concat_file, 'w') as f:
                f.write(f"file '{intro_path}'\n")
                f.write(f"file '{input_path}'\n")
                f.write(f"file '{outro_path}'\n")
            
            # Concat videos
            concat_cmd = [
                "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                str(output_path)
            ]
            
            self._run_ffmpeg(concat_cmd)
            
            # Cleanup
            if concat_file.exists():
                concat_file.unlink()
            
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
            # Get video duration
            probe = self._run_ffprobe(str(input_path))
            duration = float(probe.get("format", {}).get("duration", 0))
            result["original_duration"] = duration
            
            # Step 1: Detect segments to cut
            segments_to_cut = []
            
            if auto_trim:
                silences = self.detect_silences(str(input_path))
                segments_to_cut.extend(silences)
                result["processing_steps"].append({
                    "step": "silence_detection",
                    "silences_found": len(silences)
                })
            
            if remove_fillers:
                # Run transcription in thread pool to not block
                loop = asyncio.get_event_loop()
                transcription = await loop.run_in_executor(
                    None, self.transcribe_audio, str(input_path)
                )
                fillers = self.detect_filler_segments(transcription)
                segments_to_cut.extend(fillers)
                result["processing_steps"].append({
                    "step": "filler_detection",
                    "fillers_found": len(fillers),
                    "transcription_text": transcription.get("text", "")[:500]
                })
            
            # Step 2: Calculate segments to keep
            keep_segments = self.merge_segments_to_keep(duration, segments_to_cut)
            
            # Step 3: Apply cuts and speed adjustment
            temp_output = self.temp_path / f"temp_{video_id}.mp4"
            
            if keep_segments and (len(segments_to_cut) > 0 or apply_speed):
                filter_complex = self.create_filter_complex(
                    keep_segments, 
                    SPEED_FACTOR if apply_speed else 1.0
                )
                
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
                    "step": "trim_and_speed",
                    "segments_kept": len(keep_segments),
                    "speed_factor": SPEED_FACTOR if apply_speed else 1.0
                })
            else:
                # Just copy if no trimming needed
                shutil.copy(str(input_path), str(temp_output))
            
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
