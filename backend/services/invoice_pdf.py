"""
invoice_pdf.py — Generazione fatture di cortesia (PDF) per Evolution PRO LLC.

Le fatture sono SENZA IVA: Evolution PRO LLC è una società di diritto
statunitense (Delaware) priva di partita IVA e stabile organizzazione in
Italia. Per le cessioni verso soggetti passivi IVA italiani l'imposta è
assolta dal committente in reverse charge ove applicabile.

Questo modulo NON emette fattura elettronica verso lo SDI: produce un PDF di
cortesia ben formattato (numero, data, intestazione cliente/emittente, righe,
totale, estremi di pagamento). L'invio elettronico, se necessario, resta a
carico del commercialista.

Libreria: ReportLab (già dipendenza del backend, usata anche in contract.py).
"""
import io
import logging
import os
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


# ─── Dati EMITTENTE (default, sovrascrivibili da ciak_invoice_settings) ─────
# Fonte: backend/routers/contract.py (Art. premesse) + contratto template.
EMITTENTE_DEFAULT = {
    "ragione_sociale": "Evolution PRO LLC",
    "indirizzo": "8 The Green, Ste A",
    "citta": "Dover, DE 19901",
    "paese": "USA",
    "file_number": "2394173 (Delaware Division of Corporations)",
    "ein": "30-1375330",
    "rappresentante": "Claudio Bertogliatti",
    "sede_operativa": "Torino, Italia",
    "email": "amministrazione@evolution-pro.it",
    "iban": "LT94 3250 0974 4929 5781",
    "banca": "Revolut Bank UAB",
    "intestatario_conto": "Evolution PRO LLC",
    # Nota fiscale stampata in calce alla fattura.
    "nota_fiscale": (
        "Operazione non soggetta a IVA. Evolution PRO LLC è una società di "
        "diritto statunitense (Stato del Delaware, USA), priva di partita IVA "
        "e di stabile organizzazione in Italia. Per le prestazioni rese a "
        "soggetti passivi IVA stabiliti in Italia, l'imposta è assolta dal "
        "committente mediante inversione contabile (reverse charge), ove "
        "applicabile ai sensi dell'art. 7-ter e 17, c. 2, DPR 633/1972."
    ),
    "valuta": "EUR",
    "numero_prefix": "",  # es. "EVO-" → EVO-2026/001 ; vuoto → 2026/001
}


def _euro(v, valuta: str = "EUR") -> str:
    try:
        n = float(v or 0)
    except (TypeError, ValueError):
        n = 0.0
    simbolo = {"EUR": "€", "USD": "$"}.get(valuta, "")
    return f"{simbolo} {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_date(iso: Optional[str]) -> str:
    if not iso:
        return datetime.now().strftime("%d/%m/%Y")
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%d/%m/%Y")
    except Exception:
        # già in formato data semplice?
        return str(iso)[:10]


def render_invoice_pdf(invoice: dict, emittente: Optional[dict] = None) -> bytes:
    """
    Renderizza la fattura in PDF e ritorna i bytes.

    invoice: {
      numero, data_emissione (ISO), valuta,
      cliente: { nome, ragione_sociale, indirizzo, cap, citta, provincia,
                 paese, codice_fiscale, partita_iva, email, pec },
      righe: [ { descrizione, quantita, prezzo_unitario, importo } ],
      totale, note, fonte_label
    }
    emittente: dict come EMITTENTE_DEFAULT (eventuale override).
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    )
    from reportlab.lib.enums import TA_RIGHT, TA_LEFT

    em = {**EMITTENTE_DEFAULT, **(emittente or {})}
    valuta = invoice.get("valuta") or em.get("valuta") or "EUR"

    DARK = colors.HexColor("#1A1F24")
    GOLD = colors.HexColor("#C9A227")
    GREY = colors.HexColor("#6B7280")
    LIGHT = colors.HexColor("#F3F4F6")

    styles = getSampleStyleSheet()
    s_normal = ParagraphStyle("n", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13, textColor=DARK)
    s_small = ParagraphStyle("s", parent=s_normal, fontSize=8, textColor=GREY, leading=11)
    s_label = ParagraphStyle("l", parent=s_normal, fontSize=7.5, textColor=GOLD, spaceAfter=2)
    s_h1 = ParagraphStyle("h1", parent=s_normal, fontName="Helvetica-Bold", fontSize=22, textColor=DARK)
    s_right = ParagraphStyle("r", parent=s_normal, alignment=TA_RIGHT)
    s_emit = ParagraphStyle("e", parent=s_small, fontSize=8, leading=11)
    s_emit_name = ParagraphStyle("en", parent=s_normal, fontName="Helvetica-Bold", fontSize=11)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=f"Fattura {invoice.get('numero','')}",
    )
    el = []

    # ── Header: emittente (sx) + FATTURA + numero/data (dx) ──────────────
    emit_block = [
        Paragraph(em["ragione_sociale"], s_emit_name),
        Paragraph(
            f"{em['indirizzo']}<br/>{em['citta']} — {em['paese']}<br/>"
            f"EIN {em['ein']} · File No. {em['file_number']}<br/>"
            f"Sede operativa: {em['sede_operativa']}<br/>{em['email']}",
            s_emit,
        ),
    ]
    numero = invoice.get("numero", "")
    data_em = _fmt_date(invoice.get("data_emissione"))
    fattura_block = [
        Paragraph("FATTURA", s_h1),
        Spacer(1, 4),
        Paragraph(f"<b>N.</b> {numero}", s_right),
        Paragraph(f"<b>Data</b> {data_em}", s_right),
    ]
    head = Table([[emit_block, fattura_block]], colWidths=[100 * mm, 74 * mm])
    head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    el.append(head)
    el.append(Spacer(1, 6 * mm))
    el.append(Table([[""]], colWidths=[174 * mm], style=TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1.4, GOLD),
    ])))
    el.append(Spacer(1, 5 * mm))

    # ── Destinatario ─────────────────────────────────────────────────────
    c = invoice.get("cliente", {}) or {}
    intest = c.get("ragione_sociale") or c.get("nome") or "—"
    riga2 = []
    if c.get("indirizzo"):
        loc = " ".join(x for x in [c.get("cap"), c.get("citta"), (f"({c.get('provincia')})" if c.get("provincia") else "")] if x)
        riga2.append(f"{c['indirizzo']}, {loc}".strip().strip(","))
    if c.get("paese") and c.get("paese") != "Italia":
        riga2.append(c["paese"])
    fisc = []
    if c.get("partita_iva"):
        fisc.append(f"P.IVA {c['partita_iva']}")
    if c.get("codice_fiscale"):
        fisc.append(f"C.F. {c['codice_fiscale']}")
    contatti = []
    if c.get("email"):
        contatti.append(c["email"])
    if c.get("pec"):
        contatti.append(f"PEC {c['pec']}")

    dest_lines = "<br/>".join(
        [f"<b>{intest}</b>"]
        + riga2
        + ([" · ".join(fisc)] if fisc else [])
        + ([" · ".join(contatti)] if contatti else [])
    )
    dest = Table(
        [[Paragraph("INTESTATARIO", s_label)], [Paragraph(dest_lines, s_normal)]],
        colWidths=[174 * mm],
    )
    dest.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 1), (0, 1), 8),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    el.append(dest)
    el.append(Spacer(1, 6 * mm))

    # ── Righe ────────────────────────────────────────────────────────────
    header_row = ["Descrizione", "Q.tà", "Prezzo", "Importo"]
    data_rows = [header_row]
    for r in invoice.get("righe", []) or []:
        data_rows.append([
            Paragraph(str(r.get("descrizione", "")), s_normal),
            str(r.get("quantita", 1)),
            _euro(r.get("prezzo_unitario"), valuta),
            _euro(r.get("importo"), valuta),
        ])
    tbl = Table(data_rows, colWidths=[104 * mm, 16 * mm, 27 * mm, 27 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
    ]))
    el.append(tbl)
    el.append(Spacer(1, 3 * mm))

    # ── Totale ───────────────────────────────────────────────────────────
    tot = Table(
        [["", "Totale", _euro(invoice.get("totale"), valuta)]],
        colWidths=[120 * mm, 27 * mm, 27 * mm],
    )
    tot.setStyle(TableStyle([
        ("FONTNAME", (1, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (1, 0), (-1, 0), 11),
        ("ALIGN", (1, 0), (-1, 0), "RIGHT"),
        ("TEXTCOLOR", (1, 0), (-1, 0), DARK),
        ("BACKGROUND", (1, 0), (-1, 0), colors.HexColor("#FFF8E1")),
        ("TOPPADDING", (1, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (1, 0), (-1, 0), 8),
    ]))
    el.append(tot)
    el.append(Spacer(1, 8 * mm))

    # ── Nota IVA + pagamento ─────────────────────────────────────────────
    el.append(Paragraph(em["nota_fiscale"], s_small))
    el.append(Spacer(1, 4 * mm))
    pay = (
        f"<b>Estremi di pagamento</b><br/>"
        f"Beneficiario: {em['intestatario_conto']}<br/>"
        f"Banca: {em['banca']} — IBAN: {em['iban']}"
    )
    if invoice.get("note"):
        pay += f"<br/><br/><b>Note</b><br/>{invoice['note']}"
    el.append(Paragraph(pay, s_small))

    doc.build(el)
    return buf.getvalue()


def upload_invoice_pdf_to_cloudinary(pdf_bytes: bytes, numero: str) -> Optional[str]:
    """
    Backup durevole su Cloudinary (best-effort). Ritorna secure_url o None.
    Non blocca l'emissione se Cloudinary non è configurato.
    """
    try:
        import cloudinary
        import cloudinary.uploader
        if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
            return None
        cloudinary.config(
            cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
            api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
            api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
        )
        safe = (numero or "fattura").replace("/", "-")
        result = cloudinary.uploader.upload(
            io.BytesIO(pdf_bytes),
            resource_type="raw",
            folder="evolution_pro/fatture",
            public_id=f"fattura_{safe}",
            format="pdf",
            overwrite=True,
        )
        return result.get("secure_url")
    except Exception as e:  # noqa
        logger.warning(f"[INVOICE] Cloudinary upload fallito: {e}")
        return None
