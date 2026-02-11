"""
EVOLUTION PRO - TTS Audio Generator Module
Uses OpenAI TTS via Emergent LLM Key for intro/outro voice generation
"""

import os
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Storage paths
STORAGE_PATH = Path("/app/storage")
INTROS_PATH = STORAGE_PATH / "intros"
OUTROS_PATH = STORAGE_PATH / "outros"

# Ensure directories exist
INTROS_PATH.mkdir(parents=True, exist_ok=True)
OUTROS_PATH.mkdir(parents=True, exist_ok=True)

# Default voice settings
DEFAULT_MODEL = "tts-1-hd"  # HD quality for professional output
DEFAULT_VOICE = "onyx"  # Deep, authoritative voice
DEFAULT_SPEED = 1.0


class TTSGenerator:
    """Generates TTS audio for intro/outro using OpenAI via Emergent LLM Key"""
    
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY", "")
        if not self.api_key:
            logger.warning("EMERGENT_LLM_KEY not found in environment")
    
    async def generate_audio(
        self,
        text: str,
        output_path: str,
        model: str = DEFAULT_MODEL,
        voice: str = DEFAULT_VOICE,
        speed: float = DEFAULT_SPEED
    ) -> dict:
        """
        Generate TTS audio file.
        
        Args:
            text: Text to convert to speech
            output_path: Path to save MP3 file
            model: 'tts-1' (fast) or 'tts-1-hd' (HD quality)
            voice: Voice name (alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer)
            speed: Speed factor 0.25-4.0
        
        Returns:
            Dict with success status and file info
        """
        if not self.api_key:
            return {"success": False, "error": "EMERGENT_LLM_KEY not configured"}
        
        if len(text) > 4096:
            return {"success": False, "error": "Text exceeds 4096 character limit"}
        
        try:
            from emergentintegrations.llm.openai import OpenAITextToSpeech
            
            tts = OpenAITextToSpeech(api_key=self.api_key)
            
            audio_bytes = await tts.generate_speech(
                text=text,
                model=model,
                voice=voice,
                speed=speed,
                response_format="mp3"
            )
            
            # Save to file
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'wb') as f:
                f.write(audio_bytes)
            
            logger.info(f"TTS audio generated: {output_path}")
            
            return {
                "success": True,
                "file_path": str(output_file),
                "file_size": len(audio_bytes),
                "model": model,
                "voice": voice,
                "text_length": len(text)
            }
            
        except Exception as e:
            logger.exception(f"TTS generation failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_intro(
        self,
        partner_name: str,
        custom_text: Optional[str] = None,
        voice: str = DEFAULT_VOICE
    ) -> dict:
        """Generate intro audio for a partner"""
        text = custom_text or f"Benvenuto nel videocorso di {partner_name}, powered by Evolution PRO."
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"intro_{partner_name.replace(' ', '_')}_{timestamp}.mp3"
        output_path = INTROS_PATH / filename
        
        result = await self.generate_audio(text, str(output_path), voice=voice)
        
        if result["success"]:
            result["internal_url"] = f"/api/files/intros/{filename}"
        
        return result
    
    async def generate_outro(
        self,
        partner_name: str,
        custom_text: Optional[str] = None,
        voice: str = DEFAULT_VOICE
    ) -> dict:
        """Generate outro audio for a partner"""
        text = custom_text or f"Grazie per aver guardato. Questo videocorso è stato prodotto da Evolution PRO per {partner_name}. A presto!"
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outro_{partner_name.replace(' ', '_')}_{timestamp}.mp3"
        output_path = OUTROS_PATH / filename
        
        result = await self.generate_audio(text, str(output_path), voice=voice)
        
        if result["success"]:
            result["internal_url"] = f"/api/files/outros/{filename}"
        
        return result
    
    def list_available_voices(self) -> list:
        """List available TTS voices"""
        return [
            {"id": "alloy", "description": "Neutral, balanced"},
            {"id": "ash", "description": "Clear, articulate"},
            {"id": "coral", "description": "Warm, friendly"},
            {"id": "echo", "description": "Smooth, calm"},
            {"id": "fable", "description": "Expressive, storytelling"},
            {"id": "nova", "description": "Energetic, upbeat"},
            {"id": "onyx", "description": "Deep, authoritative"},
            {"id": "sage", "description": "Wise, measured"},
            {"id": "shimmer", "description": "Bright, cheerful"},
        ]


# Singleton instance
tts_generator = TTSGenerator()
