"""
EVOLUTION PRO - Video Editor Service (ANDREA)
Interactive video editing with subtitles generation
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

# Storage paths
STORAGE_PATH = Path("/app/storage")
EDITOR_PATH = STORAGE_PATH / "editor"
UPLOADS_PATH = EDITOR_PATH / "uploads"
PROJECTS_PATH = EDITOR_PATH / "projects"
EXPORTS_PATH = EDITOR_PATH / "exports"
SUBTITLES_PATH = EDITOR_PATH / "subtitles"

# Create directories
for path in [UPLOADS_PATH, PROJECTS_PATH, EXPORTS_PATH, SUBTITLES_PATH]:
    path.mkdir(parents=True, exist_ok=True)


class VideoEditorService:
    """
    Andrea's Video Editor - Basic editing operations
    - Trim/Cut video segments
    - Merge multiple clips
    - Add intro/outro
    - Auto-generate subtitles (Whisper)
    - Burn subtitles or export SRT
    - Add text overlays
    """
    
    def __init__(self):
        self.projects = {}  # In-memory project state
    
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
    
    def get_video_info(self, video_path: str) -> Dict:
        """Get video metadata"""
        probe = self._run_ffprobe(video_path)
        
        if not probe:
            return {"error": "Could not read video file"}
        
        video_stream = next((s for s in probe.get("streams", []) if s["codec_type"] == "video"), {})
        audio_stream = next((s for s in probe.get("streams", []) if s["codec_type"] == "audio"), {})
        format_info = probe.get("format", {})
        
        return {
            "duration": float(format_info.get("duration", 0)),
            "size_bytes": int(format_info.get("size", 0)),
            "width": int(video_stream.get("width", 0)),
            "height": int(video_stream.get("height", 0)),
            "fps": eval(video_stream.get("r_frame_rate", "30/1")),
            "video_codec": video_stream.get("codec_name", "unknown"),
            "audio_codec": audio_stream.get("codec_name", "unknown"),
            "audio_channels": int(audio_stream.get("channels", 2)),
            "bitrate": int(format_info.get("bit_rate", 0))
        }
    
    # ===========================================
    # TRIM / CUT OPERATIONS
    # ===========================================
    
    def trim_video(self, input_path: str, output_path: str, 
                   start_time: float, end_time: float) -> Dict:
        """
        Trim video to specific segment
        
        Args:
            input_path: Source video path
            output_path: Output video path
            start_time: Start time in seconds
            end_time: End time in seconds
        """
        try:
            duration = end_time - start_time
            
            cmd = [
                "-ss", str(start_time),
                "-i", str(input_path),
                "-t", str(duration),
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "192k",
                str(output_path)
            ]
            
            self._run_ffmpeg(cmd)
            
            return {
                "success": True,
                "output_path": output_path,
                "duration": duration
            }
        except Exception as e:
            logger.error(f"Trim failed: {e}")
            return {"success": False, "error": str(e)}
    
    def cut_segment(self, input_path: str, output_path: str,
                    cut_start: float, cut_end: float) -> Dict:
        """
        Remove a segment from video (keep everything before and after)
        
        Args:
            input_path: Source video path
            output_path: Output video path
            cut_start: Start of segment to remove (seconds)
            cut_end: End of segment to remove (seconds)
        """
        try:
            info = self.get_video_info(input_path)
            total_duration = info.get("duration", 0)
            
            # Create temp files for segments
            temp_before = PROJECTS_PATH / f"temp_before_{datetime.now().timestamp()}.mp4"
            temp_after = PROJECTS_PATH / f"temp_after_{datetime.now().timestamp()}.mp4"
            concat_list = PROJECTS_PATH / f"concat_{datetime.now().timestamp()}.txt"
            
            segments = []
            
            # Extract before segment
            if cut_start > 0.1:
                cmd_before = [
                    "-i", str(input_path),
                    "-t", str(cut_start),
                    "-c:v", "libx264", "-preset", "fast",
                    "-c:a", "aac",
                    str(temp_before)
                ]
                self._run_ffmpeg(cmd_before)
                segments.append(str(temp_before))
            
            # Extract after segment
            if cut_end < total_duration - 0.1:
                cmd_after = [
                    "-ss", str(cut_end),
                    "-i", str(input_path),
                    "-c:v", "libx264", "-preset", "fast",
                    "-c:a", "aac",
                    str(temp_after)
                ]
                self._run_ffmpeg(cmd_after)
                segments.append(str(temp_after))
            
            if not segments:
                return {"success": False, "error": "No segments to keep"}
            
            if len(segments) == 1:
                shutil.move(segments[0], output_path)
            else:
                # Concat segments
                with open(concat_list, 'w') as f:
                    for seg in segments:
                        f.write(f"file '{seg}'\n")
                
                cmd_concat = [
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_list),
                    "-c", "copy",
                    str(output_path)
                ]
                self._run_ffmpeg(cmd_concat)
            
            # Cleanup
            for f in [temp_before, temp_after, concat_list]:
                if Path(f).exists():
                    Path(f).unlink()
            
            return {
                "success": True,
                "output_path": output_path,
                "removed_duration": cut_end - cut_start
            }
            
        except Exception as e:
            logger.error(f"Cut failed: {e}")
            return {"success": False, "error": str(e)}
    
    # ===========================================
    # MERGE OPERATIONS
    # ===========================================
    
    def merge_videos(self, video_paths: List[str], output_path: str,
                     transition: str = "none") -> Dict:
        """
        Merge multiple videos into one
        
        Args:
            video_paths: List of video paths to merge
            output_path: Output video path
            transition: Transition type (none, fade, dissolve)
        """
        try:
            if len(video_paths) < 2:
                return {"success": False, "error": "Need at least 2 videos to merge"}
            
            # Re-encode all to same format first
            temp_files = []
            for i, vp in enumerate(video_paths):
                temp_file = PROJECTS_PATH / f"temp_merge_{i}_{datetime.now().timestamp()}.mp4"
                cmd = [
                    "-i", str(vp),
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-b:a", "192k",
                    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                    "-ar", "48000",
                    str(temp_file)
                ]
                self._run_ffmpeg(cmd)
                temp_files.append(str(temp_file))
            
            # Create concat list
            concat_list = PROJECTS_PATH / f"concat_merge_{datetime.now().timestamp()}.txt"
            with open(concat_list, 'w') as f:
                for tf in temp_files:
                    f.write(f"file '{tf}'\n")
            
            # Concat
            if transition == "none":
                cmd_concat = [
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_list),
                    "-c", "copy",
                    str(output_path)
                ]
            else:
                # With crossfade transition (more complex)
                # For now, use simple concat
                cmd_concat = [
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_list),
                    "-c", "copy",
                    str(output_path)
                ]
            
            self._run_ffmpeg(cmd_concat)
            
            # Cleanup
            for tf in temp_files:
                Path(tf).unlink()
            concat_list.unlink()
            
            return {
                "success": True,
                "output_path": output_path,
                "videos_merged": len(video_paths)
            }
            
        except Exception as e:
            logger.error(f"Merge failed: {e}")
            return {"success": False, "error": str(e)}
    
    # ===========================================
    # INTRO / OUTRO
    # ===========================================
    
    def add_intro_outro(self, input_path: str, output_path: str,
                        intro_path: Optional[str] = None,
                        outro_path: Optional[str] = None,
                        partner_name: str = "Partner") -> Dict:
        """
        Add intro and/or outro to video
        """
        try:
            videos_to_concat = []
            temp_files = []
            
            # Get main video info for sizing
            info = self.get_video_info(input_path)
            width = info.get("width", 1920)
            height = info.get("height", 1080)
            
            # Generate default intro if not provided
            if intro_path and Path(intro_path).exists():
                videos_to_concat.append(intro_path)
            elif intro_path == "auto":
                temp_intro = PROJECTS_PATH / f"intro_{datetime.now().timestamp()}.mp4"
                self._generate_slate(str(temp_intro), f"Evolution PRO\n{partner_name}", 3, width, height)
                videos_to_concat.append(str(temp_intro))
                temp_files.append(str(temp_intro))
            
            # Main video
            videos_to_concat.append(input_path)
            
            # Generate default outro if not provided
            if outro_path and Path(outro_path).exists():
                videos_to_concat.append(outro_path)
            elif outro_path == "auto":
                temp_outro = PROJECTS_PATH / f"outro_{datetime.now().timestamp()}.mp4"
                self._generate_slate(str(temp_outro), "Evolution PRO\nScopri di più", 5, width, height)
                videos_to_concat.append(str(temp_outro))
                temp_files.append(str(temp_outro))
            
            # Merge
            result = self.merge_videos(videos_to_concat, output_path)
            
            # Cleanup temp files
            for tf in temp_files:
                if Path(tf).exists():
                    Path(tf).unlink()
            
            return result
            
        except Exception as e:
            logger.error(f"Add intro/outro failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _generate_slate(self, output_path: str, text: str, 
                        duration: float, width: int, height: int):
        """Generate a branded video slate"""
        # Evolution PRO Yellow on Dark
        cmd = [
            "-f", "lavfi",
            "-i", f"color=c=0x1a2332:s={width}x{height}:d={duration}",
            "-f", "lavfi",
            "-i", f"anullsrc=r=48000:cl=stereo:d={duration}",
            "-vf", (
                f"drawtext=text='{text}':"
                f"fontcolor=0xF5C518:fontsize={height//10}:"
                f"x=(w-text_w)/2:y=(h-text_h)/2:"
                "font='sans-serif'"
            ),
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac",
            "-shortest",
            str(output_path)
        ]
        self._run_ffmpeg(cmd)
    
    # ===========================================
    # SUBTITLES (WHISPER)
    # ===========================================
    
    async def generate_subtitles(self, video_path: str, 
                                  language: str = "it") -> Dict:
        """
        Generate subtitles using OpenAI Whisper API via emergentintegrations
        Returns SRT content and segments
        """
        api_key = os.environ.get('EMERGENT_LLM_KEY', '')
        
        if not api_key:
            return {"success": False, "error": "API key not configured"}
        
        # Extract audio
        temp_audio = PROJECTS_PATH / f"audio_{datetime.now().timestamp()}.mp3"
        
        try:
            extract_cmd = [
                "-i", str(video_path),
                "-vn", "-acodec", "libmp3lame", "-q:a", "4",
                "-ar", "16000", "-ac", "1",
                str(temp_audio)
            ]
            self._run_ffmpeg(extract_cmd)
            
            # Use emergentintegrations for Whisper
            from emergentintegrations.llm.openai import OpenAISpeechToText
            
            stt = OpenAISpeechToText(api_key=api_key)
            
            with open(temp_audio, 'rb') as audio_file:
                response = await stt.transcribe(
                    file=audio_file,
                    model="whisper-1",
                    response_format="verbose_json",
                    language=language,
                    timestamp_granularities=["segment"]
                )
            
            # Extract segments from response
            segments = []
            raw_segments = getattr(response, 'segments', None) or []
            for seg in raw_segments:
                # Handle both dict and object segments
                if isinstance(seg, dict):
                    segments.append({
                        "start": seg.get("start", 0),
                        "end": seg.get("end", 0),
                        "text": seg.get("text", "")
                    })
                else:
                    segments.append({
                        "start": getattr(seg, 'start', 0),
                        "end": getattr(seg, 'end', 0),
                        "text": getattr(seg, 'text', "")
                    })
            
            text = getattr(response, 'text', "") or ""
            
            # Convert to SRT format
            srt_content = self._segments_to_srt(segments)
            
            # Save SRT file
            srt_filename = f"subtitles_{datetime.now().timestamp()}.srt"
            srt_path = SUBTITLES_PATH / srt_filename
            with open(srt_path, 'w', encoding='utf-8') as f:
                f.write(srt_content)
            
            return {
                "success": True,
                "text": text,
                "segments": segments,
                "srt_content": srt_content,
                "srt_path": str(srt_path),
                "srt_filename": srt_filename,
                "language": language
            }
            
        except Exception as e:
            logger.error(f"Subtitle generation failed: {e}")
            return {"success": False, "error": str(e)}
        finally:
            if temp_audio.exists():
                temp_audio.unlink()
    
    def _segments_to_srt(self, segments: List[Dict]) -> str:
        """Convert Whisper segments to SRT format"""
        srt_lines = []
        
        for i, seg in enumerate(segments, 1):
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "").strip()
            
            start_srt = self._seconds_to_srt_time(start)
            end_srt = self._seconds_to_srt_time(end)
            
            srt_lines.append(f"{i}")
            srt_lines.append(f"{start_srt} --> {end_srt}")
            srt_lines.append(text)
            srt_lines.append("")
        
        return "\n".join(srt_lines)
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def burn_subtitles(self, video_path: str, srt_path: str, 
                       output_path: str,
                       font_size: int = 24,
                       font_color: str = "white",
                       outline_color: str = "black",
                       position: str = "bottom") -> Dict:
        """
        Burn subtitles into video (hardcoded)
        
        Args:
            video_path: Source video
            srt_path: SRT subtitle file
            output_path: Output video with burned subtitles
            font_size: Subtitle font size
            font_color: Text color
            outline_color: Outline color for readability
            position: bottom, center, top
        """
        try:
            # Position mapping
            positions = {
                "bottom": "y=h-th-40",
                "center": "y=(h-th)/2",
                "top": "y=40"
            }
            y_position = positions.get(position, positions["bottom"])
            
            # Build subtitle filter
            # Escape path for FFmpeg
            srt_escaped = str(srt_path).replace(":", "\\:").replace("'", "\\'")
            
            subtitle_filter = (
                f"subtitles='{srt_escaped}':"
                f"force_style='FontSize={font_size},"
                f"PrimaryColour=&H00FFFFFF,"
                f"OutlineColour=&H00000000,"
                f"BorderStyle=3,"
                f"Outline=2,"
                f"Shadow=1,"
                f"MarginV=30'"
            )
            
            cmd = [
                "-i", str(video_path),
                "-vf", subtitle_filter,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "copy",
                str(output_path)
            ]
            
            self._run_ffmpeg(cmd)
            
            return {
                "success": True,
                "output_path": output_path
            }
            
        except Exception as e:
            logger.error(f"Burn subtitles failed: {e}")
            return {"success": False, "error": str(e)}
    
    # ===========================================
    # TEXT OVERLAYS
    # ===========================================
    
    def add_text_overlay(self, video_path: str, output_path: str,
                         text: str,
                         start_time: float = 0,
                         end_time: Optional[float] = None,
                         position: str = "center",
                         font_size: int = 48,
                         font_color: str = "white",
                         bg_color: Optional[str] = None) -> Dict:
        """
        Add text overlay to video
        
        Args:
            video_path: Source video
            output_path: Output video
            text: Text to display
            start_time: When to start showing text (seconds)
            end_time: When to stop showing text (None = until end)
            position: center, top, bottom, top-left, top-right, bottom-left, bottom-right
            font_size: Font size
            font_color: Text color
            bg_color: Background box color (None = no background)
        """
        try:
            info = self.get_video_info(video_path)
            duration = info.get("duration", 0)
            
            if end_time is None:
                end_time = duration
            
            # Position mapping
            position_map = {
                "center": "x=(w-text_w)/2:y=(h-text_h)/2",
                "top": "x=(w-text_w)/2:y=50",
                "bottom": "x=(w-text_w)/2:y=h-text_h-50",
                "top-left": "x=50:y=50",
                "top-right": "x=w-text_w-50:y=50",
                "bottom-left": "x=50:y=h-text_h-50",
                "bottom-right": "x=w-text_w-50:y=h-text_h-50"
            }
            pos = position_map.get(position, position_map["center"])
            
            # Build drawtext filter
            text_escaped = text.replace("'", "\\'").replace(":", "\\:")
            
            filter_parts = [
                f"drawtext=text='{text_escaped}'",
                f"fontsize={font_size}",
                f"fontcolor={font_color}",
                pos,
                f"enable='between(t,{start_time},{end_time})'"
            ]
            
            if bg_color:
                filter_parts.append(f"box=1:boxcolor={bg_color}@0.7:boxborderw=10")
            
            text_filter = ":".join(filter_parts)
            
            cmd = [
                "-i", str(video_path),
                "-vf", text_filter,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "copy",
                str(output_path)
            ]
            
            self._run_ffmpeg(cmd)
            
            return {
                "success": True,
                "output_path": output_path
            }
            
        except Exception as e:
            logger.error(f"Add text overlay failed: {e}")
            return {"success": False, "error": str(e)}
    
    # ===========================================
    # PROJECT MANAGEMENT
    # ===========================================
    
    def create_project(self, project_id: str, name: str, partner_id: str) -> Dict:
        """Create a new editing project"""
        project = {
            "id": project_id,
            "name": name,
            "partner_id": partner_id,
            "created_at": datetime.now().isoformat(),
            "status": "active",
            "clips": [],
            "timeline": [],
            "subtitles": None,
            "exports": []
        }
        self.projects[project_id] = project
        
        # Create project folder
        project_folder = PROJECTS_PATH / project_id
        project_folder.mkdir(exist_ok=True)
        
        return {"success": True, "project": project}
    
    def save_project(self, project_id: str, db_collection) -> Dict:
        """Save project to MongoDB"""
        if project_id not in self.projects:
            return {"success": False, "error": "Project not found"}
        
        project = self.projects[project_id]
        project["updated_at"] = datetime.now().isoformat()
        
        db_collection.update_one(
            {"id": project_id},
            {"$set": project},
            upsert=True
        )
        
        return {"success": True, "project_id": project_id}


# Singleton instance
video_editor = VideoEditorService()
