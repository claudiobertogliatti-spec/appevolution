"""
Client Python per il remotion-service.
Risolve il problema file:// tra container separati:
1. Carica il video processato su GCS con signed URL temporaneo
2. Passa l'URL al remotion-service (accessibile pubblicamente per 1h)
3. Scarica il video renderizzato dal signed URL restituito
4. Pulisce i file GCS temporanei
"""
import os
import logging
import httpx
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

REMOTION_SERVICE_URL = os.environ.get(
    "REMOTION_SERVICE_URL", ""
)
GCS_BUCKET = os.environ.get("GCS_BUCKET", "gen-lang-client-0744698012_cloudbuild")
GCS_TEMP_PREFIX = "remotion_temp"


async def _upload_to_gcs_signed(local_path: str, gcs_path: str) -> Optional[str]:
    """Carica un file su GCS e restituisce un signed URL pubblico valido 1h."""
    try:
        from google.cloud import storage as gcs
        client = gcs.Client()
        bucket = client.bucket(GCS_BUCKET)
        blob = bucket.blob(gcs_path)
        blob.upload_from_filename(local_path, content_type="video/mp4")

        import datetime
        url = blob.generate_signed_url(
            expiration=datetime.timedelta(hours=1),
            method="GET",
            version="v4",
        )
        logger.info(f"[REMOTION_CLIENT] Uploaded source → gs://{GCS_BUCKET}/{gcs_path}")
        return url
    except Exception as e:
        logger.error(f"[REMOTION_CLIENT] GCS upload failed: {e}")
        return None


async def _delete_gcs_file(gcs_path: str) -> None:
    """Cancella un file temporaneo da GCS (best-effort)."""
    try:
        from google.cloud import storage as gcs
        client = gcs.Client()
        client.bucket(GCS_BUCKET).blob(gcs_path).delete()
    except Exception:
        pass


async def render_partner_video(
    partner_id: str,
    local_video_path: str,
    partner_name: str,
    partner_niche: str,
    duration_s: float,
    words: List[Dict],
    key_moments: List[Dict],
    output_path: str,
    outro_cta_text: str = "Scopri il corso completo",
    outro_cta_url: str = "evolution-pro.it",
    primary_color: str = "#FFD24D",
    music_volume: float = 0.12,
    show_subtitles: bool = True,
    show_music: bool = True,
    music_track: str = "promo_1",
) -> Optional[str]:
    """
    Renderizza il video finale con Remotion.

    Args:
        partner_id: ID partner (per naming file GCS)
        local_video_path: path locale del video processato (final.mp4)
        partner_name, partner_niche: dati partner per intro/outro
        duration_s: durata del video processato in secondi
        words: transcript Whisper [{word, start, end}]
        key_moments: key moments estratti [{startSec, endSec, text, type}]
        output_path: path locale dove scrivere il video renderizzato
        outro_cta_*: testo e URL del bottone outro
        primary_color: colore brand (default giallo Evolution PRO)
        music_volume: volume musica 0.0-1.0

    Returns:
        output_path se successo, None se fallisce (pipeline continua senza Remotion)
    """
    if not REMOTION_SERVICE_URL:
        logger.info("[REMOTION_CLIENT] REMOTION_SERVICE_URL non configurato, skip rendering")
        return None

    # Step 1: carica video sorgente su GCS per renderlo accessibile al remotion-service
    from datetime import datetime
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    gcs_source_path = f"{GCS_TEMP_PREFIX}/{partner_id}/source_{ts}.mp4"
    gcs_output_path = f"remotion_renders/{partner_id}/rendered_{ts}.mp4"

    source_url = await _upload_to_gcs_signed(local_video_path, gcs_source_path)
    if not source_url:
        logger.warning("[REMOTION_CLIENT] Upload sorgente fallito, skip rendering")
        return None

    props = {
        "videoUrl": source_url,
        "partnerName": partner_name,
        "partnerNiche": partner_niche,
        "durationInSeconds": round(duration_s, 3),
        "words": words,
        "keyMoments": key_moments,
        "primaryColor": primary_color,
        "musicVolume": music_volume,
        "outroCtaText": outro_cta_text,
        "outroCtaUrl": outro_cta_url,
        "showSubtitles": show_subtitles,
        "showMusic": show_music,
        "musicTrack": music_track,
    }

    # Step 2: chiama remotion-service
    # Timeout: 3s per ogni secondo di video + overhead rendering
    timeout = max(600, int(duration_s * 4))

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{REMOTION_SERVICE_URL}/render",
                json={"props": props, "outputGcsPath": gcs_output_path},
            )

        if response.status_code != 200:
            logger.error(
                f"[REMOTION_CLIENT] Service error {response.status_code}: {response.text[:400]}"
            )
            return None

        data = response.json()
        download_url = data.get("downloadUrl")
        elapsed = data.get("elapsedSec", "?")
        logger.info(f"[REMOTION_CLIENT] Render completato in {elapsed}s")

        if not download_url:
            logger.error("[REMOTION_CLIENT] Nessun downloadUrl nella risposta")
            return None

        # Step 3: scarica il video renderizzato
        async with httpx.AsyncClient(timeout=300) as client:
            dl = await client.get(download_url)

        if dl.status_code != 200:
            logger.error(f"[REMOTION_CLIENT] Download fallito: {dl.status_code}")
            return None

        Path(output_path).write_bytes(dl.content)
        size_mb = len(dl.content) / 1e6
        logger.info(f"[REMOTION_CLIENT] Video scaricato: {output_path} ({size_mb:.1f}MB)")

        return output_path

    except httpx.ConnectError:
        logger.warning("[REMOTION_CLIENT] Servizio non raggiungibile — video non editato")
        return None
    except httpx.TimeoutException:
        logger.warning(f"[REMOTION_CLIENT] Timeout dopo {timeout}s — video non editato")
        return None
    except Exception as e:
        logger.error(f"[REMOTION_CLIENT] Errore render: {e}", exc_info=True)
        return None
    finally:
        # Step 4: pulizia file temporaneo sorgente GCS (best-effort)
        await _delete_gcs_file(gcs_source_path)
