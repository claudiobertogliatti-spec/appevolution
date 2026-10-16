"""La playlist YouTube del partner si popola DOPO il controllo umano del montaggio.

Sequenza voluta (Claudio, 13/10/2026):
    editing fatto da Ciak → verifica di Antonella → playlist su YouTube → caricamento su Systeme

Prima di questo modulo la playlist veniva popolata dall'approvazione admin, che poteva arrivare
anche prima che qualcuno avesse guardato il montaggio: il video finiva nella playlist del partner
senza che nessuno l'avesse visto per intero.

Qui sta solo la regola («questa lezione e' stata verificata?») piu' il wrapper attorno alle
funzioni di rete, che restano in video_pipeline_task. La parte decisionale e' pura e testabile.
"""
import asyncio
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def verificata(esito: Optional[dict]) -> bool:
    """True solo se il controllo umano su QUESTA versione del montaggio e' andato a buon fine."""
    return bool(esito) and esito.get("esito") == "verificata"


def motivo_attesa(esito: Optional[dict]) -> str:
    """Perche' il video non va ancora in playlist (testo per il team, mai per il partner)."""
    if not esito:
        return "in attesa del controllo del montaggio"
    if esito.get("esito") == "da_correggere":
        return "segnalata da correggere: si rimonta"
    return f"esito non riconosciuto: {esito.get('esito')!r}"


async def aggiungi_video(db, partner_id: str, yt_id: str) -> Dict[str, Any]:
    """Crea la playlist del partner se manca e aggiunge il video. Non solleva mai.

    Ritorna {"ok", "playlist_id", "motivo"}. Un errore di rete non deve far fallire l'azione
    che l'ha chiamata (la verifica di Antonella e' gia' stata registrata).
    """
    if not yt_id:
        return {"ok": False, "playlist_id": None, "motivo": "nessun id YouTube sulla lezione"}
    try:
        from video_pipeline_task import create_youtube_playlist_sync, add_to_youtube_playlist_sync
        partner = await db.partners.find_one({"id": str(partner_id)}, {"_id": 0, "name": 1, "youtube_playlist_id": 1}) or {}
        playlist_id = partner.get("youtube_playlist_id")
        loop = asyncio.get_event_loop()
        if not playlist_id:
            playlist_id = await loop.run_in_executor(
                None, create_youtube_playlist_sync, partner.get("name", str(partner_id)))
            if playlist_id:
                await db.partners.update_one(
                    {"id": str(partner_id)},
                    {"$set": {"youtube_playlist_id": playlist_id,
                              "youtube_playlist_url": f"https://www.youtube.com/playlist?list={playlist_id}"}})
        if not playlist_id:
            return {"ok": False, "playlist_id": None, "motivo": "playlist non disponibile"}
        await loop.run_in_executor(None, add_to_youtube_playlist_sync, yt_id, playlist_id)
        return {"ok": True, "playlist_id": playlist_id, "motivo": "aggiunto"}
    except Exception as e:  # noqa: BLE001 — mai bloccante
        logger.warning("[PLAYLIST] non aggiunto: %s", type(e).__name__)
        return {"ok": False, "playlist_id": None, "motivo": f"errore tecnico: {type(e).__name__}"}
