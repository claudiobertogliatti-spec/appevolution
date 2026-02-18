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
    
    # =====================================================
    # PLAYLIST MANAGEMENT FOR PARTNERS
    # =====================================================
    
    def get_or_create_partner_playlist(self, partner_name: str, partner_id: str) -> Dict:
        """
        Get existing playlist for partner or create a new one.
        
        Args:
            partner_name: Partner's display name
            partner_id: Partner's unique ID
            
        Returns:
            Dict with playlist_id, title, and url
        """
        try:
            service = self._get_service()
            
            # Search for existing playlist with partner name
            playlist_title = f"Evolution PRO - {partner_name}"
            
            # List all playlists
            playlists_response = service.playlists().list(
                part="snippet,contentDetails",
                mine=True,
                maxResults=50
            ).execute()
            
            # Check if playlist exists
            for playlist in playlists_response.get("items", []):
                if partner_name in playlist["snippet"]["title"] or partner_id in playlist["snippet"].get("description", ""):
                    return {
                        "success": True,
                        "playlist_id": playlist["id"],
                        "title": playlist["snippet"]["title"],
                        "url": f"https://www.youtube.com/playlist?list={playlist['id']}",
                        "video_count": playlist["contentDetails"]["itemCount"],
                        "created": False
                    }
            
            # Create new playlist
            playlist_body = {
                "snippet": {
                    "title": playlist_title,
                    "description": f"Videocorso di {partner_name} - Partner Evolution PRO\nPartner ID: {partner_id}",
                    "defaultLanguage": "it"
                },
                "status": {
                    "privacyStatus": "unlisted"  # Unlisted for Systeme.io embedding
                }
            }
            
            new_playlist = service.playlists().insert(
                part="snippet,status",
                body=playlist_body
            ).execute()
            
            logger.info(f"Created new playlist for {partner_name}: {new_playlist['id']}")
            
            return {
                "success": True,
                "playlist_id": new_playlist["id"],
                "title": new_playlist["snippet"]["title"],
                "url": f"https://www.youtube.com/playlist?list={new_playlist['id']}",
                "video_count": 0,
                "created": True
            }
            
        except HttpError as e:
            logger.error(f"Playlist operation failed: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.exception(f"Playlist error: {e}")
            return {"success": False, "error": str(e)}
    
    def add_video_to_playlist(self, video_id: str, playlist_id: str, position: int = None) -> Dict:
        """
        Add a video to a playlist.
        
        Args:
            video_id: YouTube video ID
            playlist_id: YouTube playlist ID
            position: Optional position in playlist (0 = first)
            
        Returns:
            Dict with success status
        """
        try:
            service = self._get_service()
            
            body = {
                "snippet": {
                    "playlistId": playlist_id,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
            
            if position is not None:
                body["snippet"]["position"] = position
            
            response = service.playlistItems().insert(
                part="snippet",
                body=body
            ).execute()
            
            logger.info(f"Added video {video_id} to playlist {playlist_id}")
            
            return {
                "success": True,
                "playlist_item_id": response["id"],
                "position": response["snippet"].get("position", 0)
            }
            
        except HttpError as e:
            logger.error(f"Add to playlist failed: {e}")
            return {"success": False, "error": str(e)}
    
    def get_playlist_videos(self, playlist_id: str) -> Dict:
        """
        Get all videos in a playlist.
        
        Args:
            playlist_id: YouTube playlist ID
            
        Returns:
            Dict with list of videos
        """
        try:
            service = self._get_service()
            
            videos = []
            next_page_token = None
            
            while True:
                response = service.playlistItems().list(
                    part="snippet,contentDetails",
                    playlistId=playlist_id,
                    maxResults=50,
                    pageToken=next_page_token
                ).execute()
                
                for item in response.get("items", []):
                    snippet = item["snippet"]
                    videos.append({
                        "playlist_item_id": item["id"],
                        "video_id": snippet["resourceId"]["videoId"],
                        "title": snippet["title"],
                        "description": snippet["description"][:200] + "..." if len(snippet.get("description", "")) > 200 else snippet.get("description", ""),
                        "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                        "position": snippet["position"],
                        "added_at": snippet["publishedAt"],
                        "url": f"https://www.youtube.com/watch?v={snippet['resourceId']['videoId']}"
                    })
                
                next_page_token = response.get("nextPageToken")
                if not next_page_token:
                    break
            
            return {
                "success": True,
                "playlist_id": playlist_id,
                "videos": videos,
                "total": len(videos)
            }
            
        except HttpError as e:
            logger.error(f"Get playlist videos failed: {e}")
            return {"success": False, "error": str(e), "videos": []}
    
    def remove_video_from_playlist(self, playlist_item_id: str) -> Dict:
        """
        Remove a video from a playlist.
        
        Args:
            playlist_item_id: The playlist item ID (not video ID)
            
        Returns:
            Dict with success status
        """
        try:
            service = self._get_service()
            
            service.playlistItems().delete(id=playlist_item_id).execute()
            
            logger.info(f"Removed item {playlist_item_id} from playlist")
            return {"success": True}
            
        except HttpError as e:
            logger.error(f"Remove from playlist failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_partner_video(
        self,
        video_path: str,
        partner_id: str,
        partner_name: str,
        partner_niche: str,
        video_title: str,
        lesson_title: str = "",
        module_title: str = "",
        transcription_text: str = "",
        add_to_playlist: bool = True
    ) -> Dict:
        """
        Upload video and automatically add to partner's playlist.
        
        Args:
            video_path: Path to video file
            partner_id: Partner's unique ID
            partner_name: Partner's display name
            partner_niche: Partner's niche/industry
            video_title: Title for the video
            lesson_title: Optional lesson title
            module_title: Optional module title
            transcription_text: Optional transcription for SEO
            add_to_playlist: Whether to add to partner playlist
            
        Returns:
            Dict with upload result and playlist info
        """
        # Upload video
        upload_result = await self.upload_video(
            video_path=video_path,
            title=video_title,
            partner_name=partner_name,
            partner_niche=partner_niche,
            lesson_title=lesson_title or video_title,
            module_title=module_title or "Videocorso",
            transcription_text=transcription_text,
            privacy_status="unlisted"
        )
        
        if not upload_result.get("success"):
            return upload_result
        
        # Add to playlist if requested
        playlist_info = None
        if add_to_playlist:
            # Get or create partner playlist
            playlist_result = self.get_or_create_partner_playlist(partner_name, partner_id)
            
            if playlist_result.get("success"):
                # Add video to playlist
                add_result = self.add_video_to_playlist(
                    upload_result["video_id"],
                    playlist_result["playlist_id"]
                )
                
                playlist_info = {
                    "playlist_id": playlist_result["playlist_id"],
                    "playlist_url": playlist_result["url"],
                    "playlist_title": playlist_result["title"],
                    "added_to_playlist": add_result.get("success", False)
                }
        
        return {
            **upload_result,
            "playlist_info": playlist_info
        }


# Singleton instance
youtube_uploader = YouTubeUploader()
