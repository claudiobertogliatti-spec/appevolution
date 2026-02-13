"""
HeyGen Integration Service
Avatar video generation with voice cloning
"""

import os
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

HEYGEN_API_KEY = os.environ.get('HEYGEN_API_KEY', '')
HEYGEN_BASE_URL = "https://api.heygen.com"

class HeyGenService:
    """Service for HeyGen API integration"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or HEYGEN_API_KEY
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": self.api_key
        }
    
    async def get_avatars(self) -> Dict[str, Any]:
        """Get list of available avatars"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{HEYGEN_BASE_URL}/v2/avatars",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def get_voices(self) -> Dict[str, Any]:
        """Get list of available voices"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{HEYGEN_BASE_URL}/v2/voices",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def create_avatar_from_photo(
        self, 
        photo_url: str, 
        name: str = "Partner Avatar"
    ) -> Dict[str, Any]:
        """
        Create an instant avatar from a photo URL
        Uses Avatar IV (single photo instant avatar)
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{HEYGEN_BASE_URL}/v2/photo_avatar",
                headers=self.headers,
                json={
                    "name": name,
                    "image_url": photo_url
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def clone_voice(
        self,
        audio_url: str,
        voice_name: str = "Partner Voice"
    ) -> Dict[str, Any]:
        """
        Clone a voice from audio sample
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{HEYGEN_BASE_URL}/v2/voices/clone",
                headers=self.headers,
                json={
                    "name": voice_name,
                    "audio_url": audio_url
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def generate_video(
        self,
        script: str,
        avatar_id: str,
        voice_id: str,
        title: str = "Generated Video",
        test: bool = False
    ) -> Dict[str, Any]:
        """
        Generate a video with avatar and voice
        
        Args:
            script: The text the avatar will speak
            avatar_id: ID of the avatar to use
            voice_id: ID of the voice to use
            title: Title of the video
            test: If True, generates a shorter test video
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{HEYGEN_BASE_URL}/v2/video/generate",
                headers=self.headers,
                json={
                    "title": title,
                    "video_inputs": [{
                        "character": {
                            "type": "avatar",
                            "avatar_id": avatar_id,
                            "avatar_style": "normal"
                        },
                        "voice": {
                            "type": "text",
                            "input_text": script,
                            "voice_id": voice_id
                        }
                    }],
                    "dimension": {
                        "width": 1920,
                        "height": 1080
                    },
                    "test": test
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_video_status(self, video_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{HEYGEN_BASE_URL}/v2/video_status.get",
                headers=self.headers,
                params={"video_id": video_id}
            )
            response.raise_for_status()
            return response.json()
    
    async def generate_sample_video(
        self,
        photo_url: str,
        audio_url: str,
        partner_name: str = "Partner"
    ) -> Dict[str, Any]:
        """
        Generate a 30-second sample video for free trial
        
        This is the main method for the free trial feature:
        1. Creates instant avatar from photo
        2. Clones voice from audio sample
        3. Generates a short sample video
        """
        try:
            # Step 1: Create avatar from photo
            logger.info(f"Creating avatar from photo for {partner_name}")
            avatar_result = await self.create_avatar_from_photo(
                photo_url=photo_url,
                name=f"{partner_name} Avatar"
            )
            avatar_id = avatar_result.get("data", {}).get("avatar_id")
            
            if not avatar_id:
                # If instant avatar creation fails, use a default talking photo approach
                logger.warning("Instant avatar creation failed, using talking photo")
                avatar_id = "talking_photo"
            
            # Step 2: Clone voice from audio
            logger.info(f"Cloning voice for {partner_name}")
            voice_result = await self.clone_voice(
                audio_url=audio_url,
                voice_name=f"{partner_name} Voice"
            )
            voice_id = voice_result.get("data", {}).get("voice_id")
            
            if not voice_id:
                # Use a default Italian voice if cloning fails
                logger.warning("Voice cloning failed, using default voice")
                voice_id = "it-IT-IsabellaNeural"  # Default Italian voice
            
            # Step 3: Generate sample video with a short script
            sample_script = f"""
            Ciao! Sono {partner_name}. 
            Benvenuto nel mio corso! 
            In questo percorso ti guiderò passo dopo passo verso i tuoi obiettivi.
            Sono entusiasta di condividere con te tutto quello che ho imparato.
            """
            
            logger.info(f"Generating sample video for {partner_name}")
            video_result = await self.generate_video(
                script=sample_script.strip(),
                avatar_id=avatar_id,
                voice_id=voice_id,
                title=f"Sample - {partner_name}",
                test=True  # Generate test/sample video
            )
            
            return {
                "success": True,
                "avatar_id": avatar_id,
                "voice_id": voice_id,
                "video_id": video_result.get("data", {}).get("video_id"),
                "status": "processing"
            }
            
        except Exception as e:
            logger.error(f"Error generating sample video: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_lesson_video(
        self,
        avatar_id: str,
        voice_id: str,
        script: str,
        lesson_title: str,
        partner_name: str
    ) -> Dict[str, Any]:
        """
        Generate a full lesson video (paid service)
        """
        try:
            video_result = await self.generate_video(
                script=script,
                avatar_id=avatar_id,
                voice_id=voice_id,
                title=f"{partner_name} - {lesson_title}",
                test=False  # Full quality video
            )
            
            return {
                "success": True,
                "video_id": video_result.get("data", {}).get("video_id"),
                "status": "processing"
            }
            
        except Exception as e:
            logger.error(f"Error generating lesson video: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
heygen_service = HeyGenService()


async def get_heygen_service() -> HeyGenService:
    """Get HeyGen service instance"""
    return heygen_service
