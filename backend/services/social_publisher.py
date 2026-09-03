"""
Publisher social server-side — pubblica la coda `ciak_social_queue` su Instagram.

Perche' esiste (4/9/2026): la pubblicazione social si e' fermata il 26/6 perche'
la coda non veniva ricaricata e i task vivevano nell'app desktop di Claudio (girano
solo a portatile aperto). Non e' autonomia. Questo motore gira **server-side** sotto
APScheduler (Celery e' spento in prod, `CELERY_ENABLED=false`) e pubblica da solo il
contenuto GIA' APPROVATO che trova in coda, lun/mer/ven. Il team ricarica la coda,
Claudio approva il mese, il motore spedisce, Luca coordina.

⛔ Guarda il FONDO della catena: dopo la pubblicazione salva `permalink` e `media_id`
letti da Instagram, non si fida di un "success". Un post che non lascia un permalink
non e' pubblicato — e' lo stesso inganno che il collaudo delle catene smaschera.

## La ricetta di pubblicazione (validata dal vivo il 4/9/2026, non dedotta)
1. Le immagini stanno su Cloudinary. ⛔ Instagram vuole **JPEG**, non PNG (il PNG
   dava Graph API 500 code=2): si serve la trasformazione `f_jpg`.
2. ⛔ **Pre-scaldare** ogni URL prima di pubblicare: da fredde Meta le scarica lente
   e la publish va in timeout. Una GET per URL basta a metterle in cache.
3. Carosello Graph API: un container per immagine (`is_carousel_item`) -> container
   album (`media_type=CAROUSEL`, `children`) -> `media_publish` -> si rilegge il
   `permalink`.

Prerequisito (fail-closed): `IG_BUSINESS_ID` + `META_PAGE_ACCESS_TOKEN` sul servizio.
Se mancano, il motore NON tocca la coda e la lascia `pending` per quando arriveranno
il token e' di Claudio: il difetto di famiglia sarebbe segnare "failed" cio' che non
si e' nemmeno provato a spedire.
"""

import logging
import os
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com/v21.0"
COLLECTION = "ciak_social_queue"


def _cfg() -> tuple[str | None, str | None]:
    """(ig_business_id, access_token) dal servizio. None se non configurato."""
    ig = os.environ.get("IG_BUSINESS_ID") or os.environ.get("INSTAGRAM_BUSINESS_ID")
    token = os.environ.get("META_PAGE_ACCESS_TOKEN")
    return (ig or None), (token or None)


def is_meta_publish_configured() -> bool:
    ig, token = _cfg()
    return bool(ig and token)


def _oggi_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


async def _prewarm(client: httpx.AsyncClient, urls: list[str]) -> None:
    """Mette in cache le trasformazioni Cloudinary: senza, Meta va in timeout."""
    for u in urls:
        try:
            await client.get(u, timeout=30)
        except Exception as e:  # best-effort: se fallisce, la publish lo dira'
            logger.warning(f"[SOCIAL] prewarm fallito per {u[:60]}: {e}")


async def _graph_post(client: httpx.AsyncClient, path: str, data: dict) -> dict:
    r = await client.post(f"{GRAPH}/{path}", data=data, timeout=60)
    j = r.json()
    if r.status_code >= 400 or "error" in j:
        raise RuntimeError(f"Graph API {r.status_code}: {j.get('error', j)}")
    return j


async def _pubblica_carosello_ig(
    client: httpx.AsyncClient, ig: str, token: str, image_urls: list[str], caption: str
) -> tuple[str, str | None]:
    """Ritorna (media_id, permalink). Solleva se qualcosa non produce."""
    if not (2 <= len(image_urls) <= 10):
        raise ValueError(f"un carosello vuole 2-10 immagini, ricevute {len(image_urls)}")
    # 1) un container per ogni slide
    child_ids: list[str] = []
    for url in image_urls:
        j = await _graph_post(client, f"{ig}/media", {
            "image_url": url, "is_carousel_item": "true", "access_token": token,
        })
        child_ids.append(j["id"])
    # 2) container album
    album = await _graph_post(client, f"{ig}/media", {
        "media_type": "CAROUSEL",
        "children": ",".join(child_ids),
        "caption": caption,
        "access_token": token,
    })
    # 3) publish
    pub = await _graph_post(client, f"{ig}/media_publish", {
        "creation_id": album["id"], "access_token": token,
    })
    media_id = pub["id"]
    # 4) rilegge il permalink: e' la prova che e' davvero uscito
    permalink = None
    try:
        r = await client.get(f"{GRAPH}/{media_id}",
                             params={"fields": "permalink", "access_token": token}, timeout=30)
        permalink = r.json().get("permalink")
    except Exception as e:
        logger.warning(f"[SOCIAL] permalink non letto per {media_id}: {e}")
    return media_id, permalink


async def _pubblica_immagine_ig(
    client: httpx.AsyncClient, ig: str, token: str, image_url: str, caption: str
) -> tuple[str, str | None]:
    cont = await _graph_post(client, f"{ig}/media", {
        "image_url": image_url, "caption": caption, "access_token": token,
    })
    pub = await _graph_post(client, f"{ig}/media_publish", {
        "creation_id": cont["id"], "access_token": token,
    })
    media_id = pub["id"]
    permalink = None
    try:
        r = await client.get(f"{GRAPH}/{media_id}",
                             params={"fields": "permalink", "access_token": token}, timeout=30)
        permalink = r.json().get("permalink")
    except Exception as e:
        logger.warning(f"[SOCIAL] permalink non letto per {media_id}: {e}")
    return media_id, permalink


async def _pubblica_uno(client: httpx.AsyncClient, ig: str, token: str, post: dict) -> tuple[str, str | None]:
    urls = post.get("image_urls") or []
    caption = post.get("caption") or ""
    if not urls:
        raise ValueError("post senza immagini")
    await _prewarm(client, urls)
    if post.get("type") == "image" or len(urls) == 1:
        return await _pubblica_immagine_ig(client, ig, token, urls[0], caption)
    return await _pubblica_carosello_ig(client, ig, token, urls, caption)


async def pubblica_coda_social(db, oggi: str | None = None, limit: int = 3) -> dict:
    """
    Pubblica i post in coda scaduti (scheduled_date <= oggi, status pending).

    Fail-closed: se il token Meta non c'e', NON tocca la coda -- i post restano
    `pending`, non diventano `failed`. Ritorna sempre un riepilogo leggibile dal
    collaudo, mai una promessa.
    """
    oggi = oggi or _oggi_iso()
    in_coda = await db[COLLECTION].count_documents(
        {"status": "pending", "scheduled_date": {"$lte": oggi}}
    )

    ig, token = _cfg()
    if not (ig and token):
        logger.error("[SOCIAL] IG_BUSINESS_ID / META_PAGE_ACCESS_TOKEN non configurati: coda non toccata")
        return {"configurato": False, "in_coda_scaduti": in_coda, "pubblicati": 0, "falliti": 0,
                "nota": "manca il token di pubblicazione: la coda resta pending"}

    cursor = db[COLLECTION].find(
        {"status": "pending", "scheduled_date": {"$lte": oggi}}
    ).sort("scheduled_date", 1).limit(limit)
    dovuti = await cursor.to_list(length=limit)

    pubblicati, falliti, esiti = 0, 0, []
    async with httpx.AsyncClient() as client:
        for post in dovuti:
            pid = post.get("post_id") or str(post.get("_id"))
            try:
                media_id, permalink = await _pubblica_uno(client, ig, token, post)
                await db[COLLECTION].update_one({"_id": post["_id"]}, {"$set": {
                    "status": "published", "media_id": media_id, "permalink": permalink,
                    "published_at": datetime.now(timezone.utc).isoformat(), "error": None,
                }, "$inc": {"attempts": 1}})
                pubblicati += 1
                esiti.append({"post_id": pid, "ok": True, "permalink": permalink})
                logger.info(f"[SOCIAL] pubblicato {pid} -> {permalink}")
            except Exception as e:
                await db[COLLECTION].update_one({"_id": post["_id"]}, {"$set": {
                    "status": "failed", "error": str(e)[:500],
                }, "$inc": {"attempts": 1}})
                falliti += 1
                esiti.append({"post_id": pid, "ok": False, "errore": str(e)[:200]})
                logger.error(f"[SOCIAL] FALLITO {pid}: {e}")

    return {"configurato": True, "in_coda_scaduti": in_coda,
            "pubblicati": pubblicati, "falliti": falliti, "esiti": esiti}
