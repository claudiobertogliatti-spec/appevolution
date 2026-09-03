"""
Publisher social server-side — pubblica la coda `ciak_social_queue` su Instagram
E sulla Pagina Facebook collegata, dallo stesso passaggio.

Perche' esiste (4/9/2026): la pubblicazione social si e' fermata il 26/6 perche'
la coda non veniva ricaricata e i task vivevano nell'app desktop (girano solo a
portatile aperto). Non e' autonomia. Questo motore gira **server-side** sotto
APScheduler (Celery e' spento in prod, `CELERY_ENABLED=false`) e pubblica da solo
il contenuto GIA' APPROVATO che trova in coda, lun/mer/ven. Il team ricarica la
coda, Claudio approva il mese, il motore spedisce, Luca coordina.

⛔ Due canali, un passaggio: se un post esce su Instagram ma non su Facebook la
pagina resta ferma col compleanno in cima — il problema che questo motore risolve.
Per ogni canale si salva il permalink LETTO dalla piattaforma, non un "success":
un post che non lascia un permalink non e' pubblicato.

## La ricetta (validata dal vivo il 4/9/2026, non dedotta)
- Immagini su Cloudinary. ⛔ Instagram vuole **JPEG** (il PNG dava Graph 500 code=2):
  si serve la trasformazione `f_jpg`. ⛔ **Pre-scaldare** ogni URL prima di
  pubblicare, o Meta le scarica lente e la publish va in timeout.
- Instagram carosello: un container per immagine (`is_carousel_item`) -> container
  album (`CAROUSEL`, `children`) -> `media_publish` -> si rilegge il `permalink`.
- Facebook album: ogni foto caricata **non pubblicata** (`published=false`) ->
  post sul feed con `attached_media` -> si rilegge `permalink_url`.

Prerequisito (fail-closed): `IG_BUSINESS_ID` + `META_PAGE_ACCESS_TOKEN` sul servizio
(lo stesso Page token pubblica su entrambi i canali). Se mancano, il motore NON
tocca la coda: i post restano `pending`, non `failed`.
"""

import logging
import os
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com/v21.0"
COLLECTION = "ciak_social_queue"
CANALI_DEFAULT = ["instagram", "facebook"]


def _cfg() -> tuple[str | None, str | None]:
    """(ig_business_id, page_access_token) dal servizio. None se non configurato."""
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
        except Exception as e:
            logger.warning(f"[SOCIAL] prewarm fallito per {u[:60]}: {e}")


async def _graph_post(client: httpx.AsyncClient, path: str, data: dict) -> dict:
    r = await client.post(f"{GRAPH}/{path}", data=data, timeout=60)
    j = r.json()
    if r.status_code >= 400 or "error" in j:
        raise RuntimeError(f"Graph API {r.status_code}: {j.get('error', j)}")
    return j


async def _graph_get(client: httpx.AsyncClient, path: str, params: dict) -> dict:
    r = await client.get(f"{GRAPH}/{path}", params=params, timeout=30)
    return r.json()


# ─── Instagram ────────────────────────────────────────────────────────────────
async def _pubblica_ig(client, ig, token, image_urls: list[str], caption: str) -> dict:
    """Ritorna {media_id, permalink}. Carosello se >1 immagine, altrimenti singola."""
    if len(image_urls) == 1:
        cont = await _graph_post(client, f"{ig}/media", {
            "image_url": image_urls[0], "caption": caption, "access_token": token})
        creation = cont["id"]
    else:
        if not (2 <= len(image_urls) <= 10):
            raise ValueError(f"un carosello IG vuole 2-10 immagini, ricevute {len(image_urls)}")
        child_ids = []
        for url in image_urls:
            j = await _graph_post(client, f"{ig}/media", {
                "image_url": url, "is_carousel_item": "true", "access_token": token})
            child_ids.append(j["id"])
        album = await _graph_post(client, f"{ig}/media", {
            "media_type": "CAROUSEL", "children": ",".join(child_ids),
            "caption": caption, "access_token": token})
        creation = album["id"]
    pub = await _graph_post(client, f"{ig}/media_publish", {
        "creation_id": creation, "access_token": token})
    media_id = pub["id"]
    info = await _graph_get(client, media_id, {"fields": "permalink", "access_token": token})
    return {"media_id": media_id, "permalink": info.get("permalink")}


# ─── Facebook (Pagina collegata) ────────────────────────────────────────────────
async def _fb_page_id(client, token: str) -> str:
    """L'ID della Pagina: /me con un Page token restituisce la Pagina stessa."""
    j = await _graph_get(client, "me", {"fields": "id", "access_token": token})
    if "id" not in j:
        raise RuntimeError(f"Non ricavo il page_id dal token: {j.get('error', j)}")
    return j["id"]


async def _pubblica_fb(client, page_id, token, image_urls: list[str], caption: str) -> dict:
    """Album sul feed della Pagina. Ritorna {post_id, permalink}."""
    # 1) ogni foto caricata NON pubblicata
    media_fbids = []
    for url in image_urls:
        j = await _graph_post(client, f"{page_id}/photos", {
            "url": url, "published": "false", "access_token": token})
        media_fbids.append(j["id"])
    # 2) post sul feed con le foto allegate
    attached = {f"attached_media[{i}]": f'{{"media_fbid":"{fid}"}}'
                for i, fid in enumerate(media_fbids)}
    post = await _graph_post(client, f"{page_id}/feed", {
        "message": caption, **attached, "access_token": token})
    post_id = post["id"]
    info = await _graph_get(client, post_id, {"fields": "permalink_url", "access_token": token})
    return {"post_id": post_id, "permalink": info.get("permalink_url")}


# ─── Orchestrazione ─────────────────────────────────────────────────────────────
async def _pubblica_post(client, ig, token, page_id, post: dict) -> tuple[dict, list[str]]:
    """
    Pubblica un post su tutti i suoi canali. Ritorna (results, errori):
    results = {canale: {..., permalink}}, errori = [canale: motivo].
    """
    urls = post.get("image_urls") or []
    caption = post.get("caption") or ""
    if not urls:
        raise ValueError("post senza immagini")
    canali = post.get("channels") or CANALI_DEFAULT

    await _prewarm(client, urls)
    results, errori = {}, []
    for canale in canali:
        try:
            if canale == "instagram":
                results["instagram"] = await _pubblica_ig(client, ig, token, urls, caption)
            elif canale == "facebook":
                results["facebook"] = await _pubblica_fb(client, page_id, token, urls, caption)
            else:
                errori.append(f"{canale}: canale sconosciuto")
        except Exception as e:
            errori.append(f"{canale}: {e}")
            logger.error(f"[SOCIAL] canale {canale} fallito: {e}")
    return results, errori


async def pubblica_coda_social(db, oggi: str | None = None, limit: int = 3) -> dict:
    """
    Pubblica i post in coda scaduti (scheduled_date <= oggi, status pending) su IG+FB.

    Stato risultante per post: `published` se TUTTI i canali sono usciti, `partial`
    se qualcuno si', qualcuno no (non si ritenta ciecamente: si guarda `results`),
    `failed` se nessuno. Fail-closed: senza token la coda non si tocca.
    """
    oggi = oggi or _oggi_iso()
    in_coda = await db[COLLECTION].count_documents(
        {"status": "pending", "scheduled_date": {"$lte": oggi}})

    ig, token = _cfg()
    if not (ig and token):
        logger.error("[SOCIAL] IG_BUSINESS_ID / META_PAGE_ACCESS_TOKEN non configurati: coda non toccata")
        return {"configurato": False, "in_coda_scaduti": in_coda, "pubblicati": 0, "falliti": 0,
                "nota": "manca il token di pubblicazione: la coda resta pending"}

    cursor = db[COLLECTION].find(
        {"status": "pending", "scheduled_date": {"$lte": oggi}}
    ).sort("scheduled_date", 1).limit(limit)
    dovuti = await cursor.to_list(length=limit)

    pubblicati, parziali, falliti, esiti = 0, 0, 0, []
    async with httpx.AsyncClient() as client:
        page_id = None
        try:
            page_id = await _fb_page_id(client, token)
        except Exception as e:
            logger.warning(f"[SOCIAL] page_id non ricavato ora: {e}")

        for post in dovuti:
            pid = post.get("post_id") or str(post.get("_id"))
            canali = post.get("channels") or CANALI_DEFAULT
            try:
                results, errori = await _pubblica_post(client, ig, token, page_id, post)
                usciti = list(results.keys())
                if len(usciti) == len(canali) and not errori:
                    stato = "published"
                    pubblicati += 1
                elif usciti:
                    stato = "partial"
                    parziali += 1
                else:
                    stato = "failed"
                    falliti += 1
                await db[COLLECTION].update_one({"_id": post["_id"]}, {"$set": {
                    "status": stato, "results": results,
                    "error": "; ".join(errori)[:500] or None,
                    "published_at": datetime.now(timezone.utc).isoformat(),
                }, "$inc": {"attempts": 1}})
                esiti.append({"post_id": pid, "stato": stato,
                              "permalink": {k: v.get("permalink") for k, v in results.items()},
                              "errori": errori})
                logger.info(f"[SOCIAL] {pid} -> {stato} ({', '.join(usciti) or 'nessuno'})")
            except Exception as e:
                await db[COLLECTION].update_one({"_id": post["_id"]}, {"$set": {
                    "status": "failed", "error": str(e)[:500]}, "$inc": {"attempts": 1}})
                falliti += 1
                esiti.append({"post_id": pid, "stato": "failed", "errori": [str(e)[:200]]})
                logger.error(f"[SOCIAL] FALLITO {pid}: {e}")

    return {"configurato": True, "in_coda_scaduti": in_coda,
            "pubblicati": pubblicati, "parziali": parziali, "falliti": falliti, "esiti": esiti}
