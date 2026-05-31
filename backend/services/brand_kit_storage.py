"""Upload del PDF Brand Kit: Cloudinary se configurato, fallback locale."""
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

LOCAL_DIR = "/tmp/brand_kit_pdfs"


def _ensure_local_dir() -> None:
    Path(LOCAL_DIR).mkdir(parents=True, exist_ok=True)


try:
    from cloudinary_service import upload_file_direct, is_cloudinary_configured  # noqa: F401
except Exception:
    async def upload_file_direct(*args, **kwargs):  # type: ignore
        return {"success": False, "error": "cloudinary not available"}

    def is_cloudinary_configured() -> bool:  # type: ignore
        return False


async def upload_brand_kit_pdf(pdf_bytes: bytes, partner_id: str, filename: str) -> dict:
    """Ritorna {url, public_id, storage} — 'cloudinary' o 'local'."""
    if is_cloudinary_configured():
        try:
            res = await upload_file_direct(
                file_data=pdf_bytes,
                filename=filename,
                resource_type="raw",
                folder=f"evolution-pro/partners/{partner_id}/brand-kit",
            )
            if res.get("success"):
                return {
                    "url": res.get("secure_url") or res.get("url", ""),
                    "public_id": res.get("public_id", ""),
                    "storage": "cloudinary",
                }
            raise RuntimeError(res.get("error", "upload failed"))
        except Exception as e:
            logger.warning(f"[BRAND-KIT] Cloudinary upload failed for {partner_id}: {e} — fallback locale")

    _ensure_local_dir()
    local_path = os.path.join(LOCAL_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(pdf_bytes)
    return {"url": local_path, "public_id": "", "storage": "local"}
