"""
Cloudinary Integration Service
File uploads for photos and audio (used by HeyGen avatar feature)
"""

import os
import time
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Initialize Cloudinary from environment
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

def init_cloudinary():
    """Initialize Cloudinary configuration"""
    if all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        logger.info("Cloudinary initialized successfully")
        return True
    else:
        logger.warning("Cloudinary credentials not configured")
        return False

# Initialize on module load
_cloudinary_initialized = init_cloudinary()


def is_cloudinary_configured() -> bool:
    """Check if Cloudinary is properly configured"""
    return _cloudinary_initialized


def generate_upload_signature(
    resource_type: str = "image",
    folder: str = "avatar-uploads"
) -> Dict[str, Any]:
    """
    Generate signed upload parameters for frontend direct upload
    
    Args:
        resource_type: "image" or "video" (video for audio files too)
        folder: Target folder in Cloudinary
        
    Returns:
        Dict with signature, timestamp, cloud_name, api_key, folder
    """
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    # Validate allowed folders
    ALLOWED_FOLDERS = ("avatar-uploads", "partner-photos", "partner-audio", "lessons")
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        raise ValueError(f"Invalid folder path: {folder}")
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        CLOUDINARY_API_SECRET
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": CLOUDINARY_CLOUD_NAME,
        "api_key": CLOUDINARY_API_KEY,
        "folder": folder,
        "resource_type": resource_type
    }


async def upload_file_direct(
    file_data: bytes,
    filename: str,
    resource_type: str = "image",
    folder: str = "avatar-uploads"
) -> Dict[str, Any]:
    """
    Upload file directly from backend (for audio blobs, etc.)
    
    Args:
        file_data: Raw file bytes
        filename: Original filename
        resource_type: "image", "video", or "raw" (use "video" for audio)
        folder: Target folder
        
    Returns:
        Dict with public_id, secure_url, etc.
    """
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    try:
        # For audio files, use "video" resource type in Cloudinary
        actual_resource_type = resource_type
        if filename.lower().endswith(('.wav', '.mp3', '.m4a', '.ogg', '.webm')):
            actual_resource_type = "video"  # Cloudinary treats audio as video
        
        result = cloudinary.uploader.upload(
            file_data,
            folder=folder,
            resource_type=actual_resource_type,
            public_id=f"{int(time.time())}_{filename.rsplit('.', 1)[0]}",
        )
        
        return {
            "success": True,
            "public_id": result.get("public_id"),
            "secure_url": result.get("secure_url"),
            "url": result.get("url"),
            "resource_type": result.get("resource_type"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }
        
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def delete_file(public_id: str, resource_type: str = "image") -> Dict[str, Any]:
    """
    Delete a file from Cloudinary
    
    Args:
        public_id: Cloudinary public ID
        resource_type: "image" or "video"
        
    Returns:
        Dict with success status
    """
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
            invalidate=True
        )
        return {
            "success": result.get("result") == "ok",
            "result": result.get("result")
        }
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def get_cloudinary_status() -> Dict[str, Any]:
    """Get Cloudinary configuration status"""
    return {
        "configured": is_cloudinary_configured(),
        "cloud_name": CLOUDINARY_CLOUD_NAME if is_cloudinary_configured() else None
    }
