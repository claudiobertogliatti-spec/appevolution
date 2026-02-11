"""
EVOLUTION PRO - YouTube Upload Module
OAuth2 flow for uploading videos to Evolution PRO YouTube channel
SEO Automation with predefined tags + Whisper keywords extraction
"""

import os
import json
import pickle
import logging
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime, timezone
import asyncio

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# OAuth2 Scopes
SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/drive.file'
]

# SEO Tags predefiniti per Evolution PRO
DEFAULT_SEO_TAGS = [
    "Evolution PRO",
    "Business Automation",
    "Videocorso Professionale",
    "Scalabilità AI",
    "Formazione High-Ticket",
    "Workflow Automazione",
    "Corso Online",
    "Digital Business",
    "Coaching Business"
]

# Storage paths
STORAGE_PATH = Path("/app/storage")
CREDENTIALS_PATH = STORAGE_PATH / "youtube_credentials.pickle"
CLIENT_SECRET_PATH = STORAGE_PATH / "client_secret.json"


class YouTubeUploader:
    """Handles YouTube upload with OAuth2 and SEO optimization"""
    
    def __init__(self):
        self.credentials: Optional[Credentials] = None
        self.service = None
        self._client_config = None
    
    def set_client_config(self, config: dict):
        """Set OAuth client configuration from uploaded JSON"""
        self._client_config = config
        # Save to file for future use
        with open(CLIENT_SECRET_PATH, 'w') as f:
            json.dump(config, f)
        logger.info("YouTube client config saved")
    
    def get_auth_url(self) -> str:
        """Generate OAuth2 authorization URL for user to authorize"""
        if not self._client_config and CLIENT_SECRET_PATH.exists():
            with open(CLIENT_SECRET_PATH, 'r') as f:
                self._client_config = json.load(f)
        
        if not self._client_config:
            raise ValueError("Client config not set. Upload client_secret.json first.")
        
        flow = InstalledAppFlow.from_client_config(
            self._client_config,
            SCOPES,
            redirect_uri='urn:ietf:wg:oauth:2.0:oob'  # For installed apps
        )
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return auth_url
    
    def complete_auth(self, auth_code: str) -> bool:
        """Complete OAuth flow with authorization code"""
        if not self._client_config and CLIENT_SECRET_PATH.exists():
            with open(CLIENT_SECRET_PATH, 'r') as f:
                self._client_config = json.load(f)
        
        if not self._client_config:
            raise ValueError("Client config not set")
        
        try:
            flow = InstalledAppFlow.from_client_config(
                self._client_config,
                SCOPES,
                redirect_uri='urn:ietf:wg:oauth:2.0:oob'
            )
            
            flow.fetch_token(code=auth_code)
            self.credentials = flow.credentials
            
            # Save credentials
            with open(CREDENTIALS_PATH, 'wb') as f:
                pickle.dump(self.credentials, f)
            
            logger.info("YouTube OAuth completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"OAuth completion failed: {e}")
            return False
    
    def _load_credentials(self) -> bool:
        """Load saved credentials"""
        if CREDENTIALS_PATH.exists():
            with open(CREDENTIALS_PATH, 'rb') as f:
                self.credentials = pickle.load(f)
            
            # Refresh if expired
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                try:
                    self.credentials.refresh(Request())
                    with open(CREDENTIALS_PATH, 'wb') as f:
                        pickle.dump(self.credentials, f)
                except Exception as e:
                    logger.error(f"Token refresh failed: {e}")
                    return False
            
            return self.credentials is not None and self.credentials.valid
        
        return False
    
    def is_authenticated(self) -> bool:
        """Check if we have valid credentials"""
        if self.credentials and self.credentials.valid:
            return True
        return self._load_credentials()
    
    def _get_service(self):
        """Get authenticated YouTube service"""
        if not self.is_authenticated():
            raise ValueError("Not authenticated. Complete OAuth flow first.")
        
        if not self.service:
            self.service = build('youtube', 'v3', credentials=self.credentials)
        
        return self.service
    
    def generate_seo_tags(self, partner_name: str, transcription_text: str = "") -> List[str]:
        """Generate SEO tags from predefined list + extracted keywords"""
        tags = DEFAULT_SEO_TAGS.copy()
        
        # Add partner name
        tags.append(partner_name)
        
        # Extract keywords from transcription (simple approach)
        if transcription_text:
            # Common business/coaching keywords to look for
            keywords_to_find = [
                "coaching", "business", "marketing", "vendita", "strategia",
                "crescita", "mindset", "leadership", "successo", "obiettivi",
                "clienti", "fatturato", "team", "produttività", "automazione",
                "digital", "online", "formazione", "consulenza", "imprenditore"
            ]
            
            text_lower = transcription_text.lower()
            for keyword in keywords_to_find:
                if keyword in text_lower and keyword.capitalize() not in tags:
                    tags.append(keyword.capitalize())
        
        # Limit to 30 tags (YouTube limit is 500 chars total)
        return tags[:30]
    
    def generate_description(self, partner_name: str, partner_niche: str, 
                            lesson_title: str, module_title: str) -> str:
        """Generate SEO-optimized description"""
        return f"""🎓 {lesson_title} | {module_title}

Videocorso professionale di {partner_name} ({partner_niche})
Prodotto da Evolution PRO LLC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 In questo video imparerai:
• Contenuti esclusivi del videocorso
• Strategie pratiche da applicare subito
• Framework testati sul campo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 Iscriviti al canale per non perdere i prossimi video!

📱 Seguici:
• Sito: https://evolutionpro.ai
• Instagram: @evolution_pro_llc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#EvolutionPRO #Videocorso #{partner_niche.replace(' ', '')} #{partner_name.replace(' ', '')}

© {datetime.now().year} Evolution PRO LLC - Tutti i diritti riservati
"""
    
    async def upload_video(
        self,
        video_path: str,
        title: str,
        partner_name: str,
        partner_niche: str,
        lesson_title: str,
        module_title: str,
        transcription_text: str = "",
        privacy_status: str = "unlisted"  # unlisted by default for Systeme.io
    ) -> Dict:
        """
        Upload video to YouTube with SEO optimization.
        
        Args:
            video_path: Path to video file
            title: Video title
            partner_name: Partner name for tags
            partner_niche: Partner niche for description
            lesson_title: Lesson title
            module_title: Module title
            transcription_text: Whisper transcription for keyword extraction
            privacy_status: 'private', 'unlisted', or 'public'
        
        Returns:
            Dict with video ID and URL
        """
        if not Path(video_path).exists():
            return {"success": False, "error": f"Video file not found: {video_path}"}
        
        try:
            service = self._get_service()
            
            # Generate SEO content
            tags = self.generate_seo_tags(partner_name, transcription_text)
            description = self.generate_description(
                partner_name, partner_niche, lesson_title, module_title
            )
            
            # Video metadata
            body = {
                'snippet': {
                    'title': title,
                    'description': description,
                    'tags': tags,
                    'categoryId': '27',  # Education category
                    'defaultLanguage': 'it',
                    'defaultAudioLanguage': 'it'
                },
                'status': {
                    'privacyStatus': privacy_status,
                    'selfDeclaredMadeForKids': False
                }
            }
            
            # Upload
            media = MediaFileUpload(
                video_path,
                mimetype='video/mp4',
                resumable=True,
                chunksize=1024*1024  # 1MB chunks
            )
            
            request = service.videos().insert(
                part=','.join(body.keys()),
                body=body,
                media_body=media
            )
            
            # Execute upload with progress
            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    logger.info(f"Upload progress: {int(status.progress() * 100)}%")
            
            video_id = response['id']
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            logger.info(f"Video uploaded successfully: {video_url}")
            
            return {
                "success": True,
                "video_id": video_id,
                "video_url": video_url,
                "title": title,
                "privacy_status": privacy_status,
                "tags": tags,
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            
        except HttpError as e:
            error_msg = f"YouTube API error: {e.error_details if hasattr(e, 'error_details') else str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        except Exception as e:
            logger.exception(f"Upload failed: {e}")
            return {"success": False, "error": str(e)}
    
    def revoke_credentials(self):
        """Revoke stored credentials"""
        if CREDENTIALS_PATH.exists():
            CREDENTIALS_PATH.unlink()
        self.credentials = None
        self.service = None
        logger.info("YouTube credentials revoked")


# Singleton instance
youtube_uploader = YouTubeUploader()
