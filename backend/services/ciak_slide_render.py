"""Rendering delle slide dei caroselli editoriali.

Template HTML brandizzato → PNG (Playwright/chromium, già nel container) → upload
Cloudinary. Formato quadrato 1080x1080 (Instagram/Facebook/LinkedIn). Multi-brand:
usa la palette del brand (fallback slate/giallo Ciak). Non solleva: se manca l'infra
(chromium o Cloudinary) ritorna quello che riesce e logga, senza bloccare il chiamante.
"""
from __future__ import annotations

import asyncio
import html as _html
import io
import logging
from typing import Any

logger = logging.getLogger(__name__)

_W = 1080
_H = 1080

_DEFAULT_BG = "#0F172A"
_DEFAULT_ACCENT = "#FACC15"
_DEFAULT_TEXT = "#FFFFFF"


def _palette(brand: dict) -> tuple[str, str, str]:
    pal = brand.get("palette") or []
    bg = pal[0] if len(pal) > 0 and pal[0] else _DEFAULT_BG
    accent = pal[1] if len(pal) > 1 and pal[1] else _DEFAULT_ACCENT
    return bg, accent, _DEFAULT_TEXT


def render_slide_html(brand: dict, slide: dict, index: int, total: int) -> str:
    bg, accent, text = _palette(brand)
    title = _html.escape((slide.get("title") or "").strip())
    body = _html.escape((slide.get("body") or "").strip())
    brand_name = _html.escape((brand.get("name") or "").strip())
    body_html = f'<p>{body}</p>' if body else ''
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  html,body{{width:{_W}px;height:{_H}px}}
  body{{font-family:'Poppins',sans-serif;background:{bg};color:{text};
    padding:96px 88px;display:flex;flex-direction:column;justify-content:center;position:relative}}
  .kicker{{font-size:26px;font-weight:600;color:{accent};text-transform:uppercase;letter-spacing:.12em}}
  h1{{font-size:82px;font-weight:700;line-height:1.05;margin-top:24px}}
  p{{font-size:40px;font-weight:400;line-height:1.4;margin-top:32px;opacity:.92}}
  .foot{{position:absolute;left:88px;right:88px;bottom:64px;display:flex;justify-content:space-between;
    align-items:center;font-size:24px;color:{accent};font-weight:600}}
  .dot{{opacity:.6;color:{text}}}
</style></head>
<body>
  <div class="kicker">{brand_name}</div>
  <h1>{title}</h1>
  {body_html}
  <div class="foot"><span>{brand_name}</span><span class="dot">{index}/{total}</span></div>
</body></html>"""


async def _html_to_png(html_str: str) -> bytes:
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            page = await browser.new_page(viewport={"width": _W, "height": _H})
            await page.set_content(html_str, wait_until="networkidle")
            return await page.screenshot(
                type="png", clip={"x": 0, "y": 0, "width": _W, "height": _H}
            )
        finally:
            await browser.close()


def _upload_png(png: bytes) -> str:
    import cloudinary.uploader
    res = cloudinary.uploader.upload(
        io.BytesIO(png), folder="ciak-editorial", resource_type="image", format="png"
    )
    return res.get("secure_url") or res.get("url") or ""


async def render_content_slides(brand: dict, content: dict) -> dict:
    """Renderizza le slide del contenuto → PNG → Cloudinary.

    Ritorna {cover_url, image_urls, slides:[{..., image_url}]}. Per post/reel senza
    slide crea una singola cover dal topic/caption. Non solleva.
    """
    slides = content.get("slides") or []
    if not slides:
        slides = [{"title": content.get("topic") or content.get("caption") or "", "body": ""}]

    total = len(slides)
    rendered: list[dict] = []
    image_urls: list[str] = []
    cover_url = None
    for i, slide in enumerate(slides, start=1):
        url = None
        try:
            html_str = render_slide_html(brand, slide, i, total)
            png = await _html_to_png(html_str)
            url = await asyncio.to_thread(_upload_png, png)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[EDITORIALE] render/upload slide {i} fallito: {e}")
        item = dict(slide)
        item["image_url"] = url
        rendered.append(item)
        if url:
            image_urls.append(url)
            if cover_url is None:
                cover_url = url
    return {"cover_url": cover_url, "image_urls": image_urls, "slides": rendered}
