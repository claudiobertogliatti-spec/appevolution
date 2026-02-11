"""
EVOLUTION PRO - File Storage Module (Native File Manager)
Eliminates Google Drive dependency with internal storage system
"""

import os
import shutil
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict
from fastapi import UploadFile
import aiofiles
import logging

logger = logging.getLogger(__name__)

# Supported file types
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'}
DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.md'}
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}

# Max file sizes (in bytes)
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500 MB
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


class FileStorageManager:
    """Manages all file storage operations for Evolution PRO"""
    
    def __init__(self, base_path: str = "/app/storage"):
        self.base_path = Path(base_path)
        self.videos_raw = self.base_path / "videos" / "raw"
        self.videos_processed = self.base_path / "videos" / "processed"
        self.videos_approved = self.base_path / "videos" / "approved"
        self.docs_pending = self.base_path / "documents" / "pending"
        self.docs_verified = self.base_path / "documents" / "verified"
        self.temp_path = self.base_path / "temp"
        
        # Ensure all directories exist
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Create all required directories"""
        for path in [
            self.videos_raw, self.videos_processed, self.videos_approved,
            self.docs_pending, self.docs_verified, self.temp_path
        ]:
            path.mkdir(parents=True, exist_ok=True)
    
    def _get_file_hash(self, content: bytes) -> str:
        """Generate SHA256 hash for file content"""
        return hashlib.sha256(content).hexdigest()[:16]
    
    def _get_file_type(self, filename: str) -> str:
        """Determine file type from extension"""
        ext = Path(filename).suffix.lower()
        if ext in VIDEO_EXTENSIONS:
            return "video"
        elif ext in DOCUMENT_EXTENSIONS:
            return "document"
        elif ext in IMAGE_EXTENSIONS:
            return "image"
        return "unknown"
    
    def _validate_file(self, filename: str, size: int) -> tuple[bool, str]:
        """Validate file type and size"""
        file_type = self._get_file_type(filename)
        
        if file_type == "unknown":
            return False, f"Unsupported file type: {Path(filename).suffix}"
        
        if file_type == "video" and size > MAX_VIDEO_SIZE:
            return False, f"Video too large. Max: {MAX_VIDEO_SIZE // (1024*1024)} MB"
        elif file_type == "document" and size > MAX_DOCUMENT_SIZE:
            return False, f"Document too large. Max: {MAX_DOCUMENT_SIZE // (1024*1024)} MB"
        elif file_type == "image" and size > MAX_IMAGE_SIZE:
            return False, f"Image too large. Max: {MAX_IMAGE_SIZE // (1024*1024)} MB"
        
        return True, ""
    
    async def upload_file(self, file: UploadFile, partner_id: str, 
                         category: str = "document") -> Dict:
        """
        Upload a file to the storage system.
        
        Args:
            file: FastAPI UploadFile object
            partner_id: Partner ID for organization
            category: 'video' or 'document'
        
        Returns:
            Dict with file info and internal URL
        """
        try:
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Validate
            is_valid, error_msg = self._validate_file(file.filename, file_size)
            if not is_valid:
                return {"success": False, "error": error_msg}
            
            # Generate unique filename
            file_hash = self._get_file_hash(content)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            ext = Path(file.filename).suffix.lower()
            safe_filename = f"{partner_id}_{timestamp}_{file_hash}{ext}"
            
            # Determine destination path
            file_type = self._get_file_type(file.filename)
            if file_type == "video":
                dest_dir = self.videos_raw
                internal_path = f"videos/raw/{safe_filename}"
            else:
                dest_dir = self.docs_pending
                internal_path = f"documents/pending/{safe_filename}"
            
            dest_path = dest_dir / safe_filename
            
            # Write file
            async with aiofiles.open(dest_path, 'wb') as f:
                await f.write(content)
            
            # Get MIME type
            mime_type, _ = mimetypes.guess_type(file.filename)
            
            return {
                "success": True,
                "file_id": file_hash,
                "original_name": file.filename,
                "stored_name": safe_filename,
                "file_type": file_type,
                "mime_type": mime_type,
                "size": file_size,
                "size_readable": self._format_size(file_size),
                "internal_path": internal_path,
                "internal_url": f"/api/files/{internal_path}",
                "partner_id": partner_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending" if file_type == "document" else "raw"
            }
            
        except Exception as e:
            logger.exception(f"File upload failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _format_size(self, size: int) -> str:
        """Format file size for display"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
    
    def list_files(self, category: str = "all", status: str = "all", 
                   partner_id: Optional[str] = None) -> List[Dict]:
        """
        List files in storage.
        
        Args:
            category: 'video', 'document', or 'all'
            status: 'pending', 'verified', 'raw', 'processed', 'approved', or 'all'
            partner_id: Filter by partner (optional)
        """
        files = []
        
        # Define paths to scan based on category and status
        paths_to_scan = []
        
        if category in ["video", "all"]:
            if status in ["raw", "all"]:
                paths_to_scan.append((self.videos_raw, "video", "raw"))
            if status in ["processed", "all"]:
                paths_to_scan.append((self.videos_processed, "video", "processed"))
            if status in ["approved", "all"]:
                paths_to_scan.append((self.videos_approved, "video", "approved"))
        
        if category in ["document", "all"]:
            if status in ["pending", "all"]:
                paths_to_scan.append((self.docs_pending, "document", "pending"))
            if status in ["verified", "all"]:
                paths_to_scan.append((self.docs_verified, "document", "verified"))
        
        for path, file_category, file_status in paths_to_scan:
            if not path.exists():
                continue
            
            for file_path in path.iterdir():
                if file_path.is_file():
                    # Extract partner_id from filename (format: partner_timestamp_hash.ext)
                    parts = file_path.stem.split('_')
                    file_partner_id = parts[0] if len(parts) >= 3 else "unknown"
                    
                    # Filter by partner if specified
                    if partner_id and file_partner_id != partner_id:
                        continue
                    
                    stat = file_path.stat()
                    mime_type, _ = mimetypes.guess_type(str(file_path))
                    
                    files.append({
                        "file_id": parts[2] if len(parts) >= 3 else file_path.stem,
                        "filename": file_path.name,
                        "original_name": file_path.name,  # We don't store original name separately
                        "category": file_category,
                        "status": file_status,
                        "partner_id": file_partner_id,
                        "size": stat.st_size,
                        "size_readable": self._format_size(stat.st_size),
                        "mime_type": mime_type,
                        "internal_url": f"/api/files/{file_category}s/{file_status}/{file_path.name}",
                        "created_at": datetime.fromtimestamp(stat.st_ctime, timezone.utc).isoformat(),
                        "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
                    })
        
        # Sort by modified date descending
        files.sort(key=lambda x: x["modified_at"], reverse=True)
        return files
    
    def get_file_path(self, internal_path: str) -> Optional[Path]:
        """Get full file path from internal path"""
        full_path = self.base_path / internal_path
        if full_path.exists() and full_path.is_file():
            return full_path
        return None
    
    def verify_document(self, filename: str) -> Dict:
        """Move document from pending to verified"""
        source = self.docs_pending / filename
        if not source.exists():
            return {"success": False, "error": "Document not found in pending"}
        
        dest = self.docs_verified / filename
        shutil.move(str(source), str(dest))
        
        return {
            "success": True,
            "filename": filename,
            "new_status": "verified",
            "internal_url": f"/api/files/documents/verified/{filename}"
        }
    
    def reject_document(self, filename: str, reason: str = "") -> Dict:
        """Delete a pending document (rejected)"""
        source = self.docs_pending / filename
        if not source.exists():
            return {"success": False, "error": "Document not found in pending"}
        
        source.unlink()
        
        return {
            "success": True,
            "filename": filename,
            "action": "rejected",
            "reason": reason
        }
    
    def delete_file(self, internal_path: str) -> Dict:
        """Delete a file from storage"""
        full_path = self.base_path / internal_path
        if not full_path.exists():
            return {"success": False, "error": "File not found"}
        
        full_path.unlink()
        return {"success": True, "deleted": internal_path}
    
    def get_storage_stats(self) -> Dict:
        """Get storage usage statistics"""
        def get_dir_size(path: Path) -> int:
            total = 0
            if path.exists():
                for f in path.rglob('*'):
                    if f.is_file():
                        total += f.stat().st_size
            return total
        
        videos_size = sum([
            get_dir_size(self.videos_raw),
            get_dir_size(self.videos_processed),
            get_dir_size(self.videos_approved)
        ])
        
        docs_size = sum([
            get_dir_size(self.docs_pending),
            get_dir_size(self.docs_verified)
        ])
        
        return {
            "videos": {
                "raw_count": len(list(self.videos_raw.glob('*'))) if self.videos_raw.exists() else 0,
                "processed_count": len(list(self.videos_processed.glob('*'))) if self.videos_processed.exists() else 0,
                "approved_count": len(list(self.videos_approved.glob('*'))) if self.videos_approved.exists() else 0,
                "total_size": videos_size,
                "total_size_readable": self._format_size(videos_size)
            },
            "documents": {
                "pending_count": len(list(self.docs_pending.glob('*'))) if self.docs_pending.exists() else 0,
                "verified_count": len(list(self.docs_verified.glob('*'))) if self.docs_verified.exists() else 0,
                "total_size": docs_size,
                "total_size_readable": self._format_size(docs_size)
            },
            "total_size": videos_size + docs_size,
            "total_size_readable": self._format_size(videos_size + docs_size)
        }


# Singleton instance
file_storage = FileStorageManager()
