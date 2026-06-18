"""Ponte Masterclass → I Miei File.

Rende lo script approvato della masterclass in un PDF brandizzato (estetica Ciak:
navy #0F172A + giallo #FACC15, Poppins), lo carica su Cloudinary e registra il
record in db.files (category 'masterclass', step_ref '05-masterclass', status
'approved') così da comparire in "I Miei File" come Posizionamento e Brand Kit.

Riusa html_to_pdf (services/ciak_pdf.py) su playwright/chromium gia' nel container.
Best-effort: il chiamante avvolge in try/except e non blocca mai l'approvazione.
"""
from __future__ import annotations

import html as _html
import logging
import re as _re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .ciak_pdf import html_to_pdf

logger = logging.getLogger(__name__)

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
:root{--navy:#0F172A;--yellow:#FACC15;--slate-200:#E2E8F0;--slate-400:#94A3B8;--slate-600:#475569;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Poppins',sans-serif;color:var(--navy);line-height:1.6;background:#fff;}
.container{max-width:900px;margin:0 auto;}
.cover{padding:90px 60px 60px;text-align:center;}
.cover .logo{font-size:13px;font-weight:700;letter-spacing:2px;color:var(--slate-400);text-transform:uppercase;margin-bottom:40px;}
.cover h1{font-size:42px;font-weight:700;line-height:1.1;}
.highlight-pill{background:var(--yellow);padding:2px 16px;border-radius:30px;display:inline-block;}
.cover .course{margin-top:18px;display:inline-block;background:var(--yellow);color:var(--navy);font-weight:700;font-size:14px;padding:6px 18px;border-radius:30px;}
.cover .sub{color:var(--navy);font-size:16px;font-weight:600;margin-top:18px;}
.cover .who{color:var(--slate-600);font-size:13px;margin-top:6px;}
.page{padding:20px 60px 60px;}
.section{margin-bottom:26px;page-break-inside:avoid;}
.section-num{font-size:11px;font-weight:700;color:#B8860B;letter-spacing:1px;display:block;margin-bottom:4px;}
.section h3{font-size:17px;font-weight:600;margin-bottom:8px;border-bottom:2px solid var(--yellow);padding-bottom:6px;}
.section p{color:var(--slate-600);font-size:13.5px;white-space:pre-wrap;margin-bottom:6px;}
.footer{margin-top:36px;padding-top:22px;border-top:1px solid var(--slate-200);color:var(--slate-400);font-size:12px;text-align:center;}
"""


def _esc(s: Any) -> str:
    return _html.escape(str(s or ""))


def render_masterclass_html(sections: List[Dict[str, Any]], nome: str, corso: str = "") -> str:
    blocks = []
    for i, s in enumerate(sections or [], start=1):
        num = f"{int(s.get('id', i)):02d}" if str(s.get("id", i)).isdigit() else f"{i:02d}"
        title = _esc(s.get("title", f"Sezione {i}"))
        content = _esc(s.get("content", "")).strip() or "<em style='color:var(--slate-400)'>Vuoto</em>"
        blocks.append(
            f'<section class="section"><span class="section-num">{num}</span>'
            f'<h3>{title}</h3><p>{content}</p></section>'
        )
    course_pill = f'<div class="course">{_esc(corso)}</div>' if corso else ""
    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><style>{_CSS}</style></head>
<body><div class="container">
<header class="cover">
  <div class="logo">Script Masterclass &middot; Metodo EVO&trade;</div>
  <h1>Script della <span class="highlight-pill">Masterclass</span></h1>
  {course_pill}
  <div class="sub">Fondamento Masterclass &middot; Fase 2</div>
  <div class="who">Preparato per {_esc(nome)}</div>
</header>
<div class="page">
  {''.join(blocks)}
  <div class="footer">Documento generato dal Metodo EVO&trade; &middot; Evolution PRO &middot; ciak.io</div>
</div></div></body></html>"""


async def genera_masterclass_pdf(sections: List[Dict[str, Any]], nome: str, corso: str = "") -> bytes:
    return await html_to_pdf(render_masterclass_html(sections, nome, corso))


async def save_approved_script_pdf(db, partner_id: str, script_text: str) -> Optional[str]:
    """Render PDF + upload Cloudinary + record db.files. Ritorna file_id o None."""
    try:
        from cloudinary_service import upload_file_direct, is_cloudinary_configured
    except Exception:
        logger.warning("[MASTERCLASS] cloudinary_service non disponibile")
        return None

    rec = await db.masterclass_factory.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    sections = rec.get("script_sections") or []
    if not sections and script_text:
        sections = [{"id": 1, "title": "Script Masterclass", "content": script_text}]

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0}) or {}
    nome = partner.get("name") or partner.get("nome") or "Partner"
    corso = partner.get("corso_titolo") or ""

    pdf_bytes = await genera_masterclass_pdf(sections, nome, corso)

    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%d-%H%M%S")
    safe_pid = _re.sub(r"[^A-Za-z0-9_-]", "_", str(partner_id))[:64]
    filename = f"masterclass-{safe_pid}-{ts}.pdf"

    if not is_cloudinary_configured():
        raise RuntimeError("Cloudinary non configurato")

    res = await upload_file_direct(
        file_data=pdf_bytes,
        filename=filename,
        resource_type="raw",
        folder=f"evolution-pro/partners/{partner_id}/masterclass",
    )
    if not res.get("success"):
        raise RuntimeError(res.get("error", "upload Cloudinary fallito"))

    internal_url = res.get("secure_url") or res.get("url", "")
    public_id = res.get("public_id", "")

    # I precedenti file masterclass diventano superseded
    await db.files.update_many(
        {"partner_id": str(partner_id), "category": "masterclass", "superseded": {"$ne": True}},
        {"$set": {"superseded": True}},
    )

    file_id = uuid.uuid4().hex
    file_doc = {
        "file_id": file_id,
        "partner_id": str(partner_id),
        "category": "masterclass",
        "file_type": "document",
        "original_name": f"Script Masterclass - {nome}.pdf",
        "stored_name": filename,
        "internal_url": internal_url,
        "public_id": public_id,
        "status": "approved",
        "step_ref": "05-masterclass",
        "approved_by": "admin@evolution-pro",
        "approved_at": now.isoformat(),
        "rejection_note": None,
        "rejected_at": None,
        "superseded": False,
        "uploaded_at": now.isoformat(),
        "size": len(pdf_bytes),
        "size_readable": f"{len(pdf_bytes) // 1024} KB",
    }
    await db.files.insert_one(file_doc)
    logger.info(f"[MASTERCLASS] Script PDF registrato in I Miei File per {partner_id}: {file_id}")
    return file_id
