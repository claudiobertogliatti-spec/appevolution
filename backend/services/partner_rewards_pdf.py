"""PDF renderer for Ciak partner rewards.

The first version intentionally avoids storage and renders small branded PDFs
on demand. Data can be partial: missing sections become "in preparazione" so the
partner always receives a polished document instead of an error.
"""
from __future__ import annotations

from io import BytesIO
from typing import Any


CIAK_BLUE = "#1D4ED8"
CIAK_YELLOW = "#FACC15"
CIAK_DARK = "#0F172A"
CIAK_GRAY = "#F8FAFC"


def _safe(value: Any, fallback: str = "In preparazione") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _first_line(value: Any, fallback: str = "In preparazione") -> str:
    text = _safe(value, fallback)
    return text.replace("\n", " ")[:260]


def _styles():
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CiakTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor(CIAK_DARK),
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=31,
        spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name="CiakSubtitle",
        parent=styles["BodyText"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#475569"),
        fontSize=11,
        leading=16,
        spaceAfter=18,
    ))
    styles.add(ParagraphStyle(
        name="CiakSection",
        parent=styles["Heading2"],
        textColor=colors.HexColor(CIAK_BLUE),
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=7,
    ))
    styles.add(ParagraphStyle(
        name="CiakBody",
        parent=styles["BodyText"],
        alignment=TA_LEFT,
        textColor=colors.HexColor(CIAK_DARK),
        fontSize=10.5,
        leading=15,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="CiakSmall",
        parent=styles["BodyText"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748B"),
        fontSize=8.5,
        leading=12,
    ))
    return styles


def _draw_page_frame(canvas, doc):
    from reportlab.lib import colors
    from reportlab.lib.units import cm

    canvas.saveState()
    width, height = doc.pagesize
    canvas.setFillColor(colors.HexColor(CIAK_GRAY))
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(colors.HexColor(CIAK_YELLOW))
    canvas.setLineWidth(2)
    canvas.roundRect(1.1 * cm, 1.1 * cm, width - 2.2 * cm, height - 2.2 * cm, 8, stroke=1, fill=0)
    canvas.setFillColor(colors.HexColor(CIAK_DARK))
    canvas.setFont("Helvetica-Bold", 15)
    canvas.drawString(1.45 * cm, height - 1.75 * cm, "Ciak.io")
    canvas.setFillColor(colors.HexColor(CIAK_YELLOW))
    canvas.circle(width - 1.65 * cm, height - 1.62 * cm, 4, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(width / 2, 0.65 * cm, "Claudio Bertogliatti e il team Ciak.io")
    canvas.restoreState()


def _doc():
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=1.7 * cm,
        leftMargin=1.7 * cm,
        topMargin=2.4 * cm,
        bottomMargin=1.7 * cm,
    )
    return buf, doc


def _paragraph(text: str, style):
    from xml.sax.saxutils import escape
    from reportlab.platypus import Paragraph

    return Paragraph(escape(text), style)


def _paragraph_html(text: str, style):
    """Paragrafo con markup reportlab (<b>, <i>) interpretato.

    `_paragraph` escapa tutto: passandogli un'etichetta in grassetto si finiva per
    stampare i tag come testo ("<b>Preparato per:</b> Daniele Andolfi" in copertina,
    rilevato il 30/07/2026). Il chiamante deve escapare i valori dinamici.
    """
    from reportlab.platypus import Paragraph

    return Paragraph(text, style)


def _paragraphs(text: str, style) -> list:
    """Un body su piu' righe diventa piu' paragrafi, invece di un blocco unico."""
    blocchi = [b.strip() for b in str(text).split("\n") if b.strip()]
    return [_paragraph(b, style) for b in blocchi] or [_paragraph(str(text), style)]


def render_certificate_pdf(payload: dict[str, Any]) -> bytes:
    from reportlab.platypus import Spacer
    from reportlab.lib.units import cm

    styles = _styles()
    buf, doc = _doc()
    nome = _safe(payload.get("partner_name"), "Partner Ciak")
    phase_label = _safe(payload.get("phase_label"), "Metodo EVO")
    days = payload.get("days")
    days_text = f" in {days} giorni" if isinstance(days, int) and days > 0 else ""

    story = [
        Spacer(1, 1.2 * cm),
        _paragraph("Attestato di completamento", styles["CiakSubtitle"]),
        _paragraph(f"Complimenti {nome}", styles["CiakTitle"]),
        _paragraph(
            f"Hai completato la fase {phase_label} del Metodo EVO{days_text}. "
            "Un passo alla volta, il tuo modello digitale sta prendendo forma.",
            styles["CiakSubtitle"],
        ),
        Spacer(1, 0.3 * cm),
        _paragraph("Risultato raggiunto", styles["CiakSection"]),
        _paragraph(_safe(payload.get("result")), styles["CiakBody"]),
        _paragraph("Prossimo passo", styles["CiakSection"]),
        _paragraph(_safe(payload.get("next_step")), styles["CiakBody"]),
        Spacer(1, 1.1 * cm),
        _paragraph("Questo documento certifica l'avanzamento del progetto nel percorso Ciak.io.", styles["CiakSmall"]),
    ]
    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buf.getvalue()


def render_bonus_pdf(payload: dict[str, Any]) -> bytes:
    from reportlab.platypus import Spacer
    from reportlab.lib.units import cm

    styles = _styles()
    buf, doc = _doc()
    nome = _safe(payload.get("partner_name"), "Partner Ciak")
    title = _safe(payload.get("title"), "Risorsa bonus Ciak")
    bullets = payload.get("bullets") or []

    story = [
        Spacer(1, 0.9 * cm),
        _paragraph("Bonus operativo", styles["CiakSubtitle"]),
        _paragraph(title, styles["CiakTitle"]),
        _paragraph(f"Preparato per {nome}. Usalo come guida pratica mentre continui il percorso.", styles["CiakSubtitle"]),
    ]
    for bullet in bullets:
        story.append(_paragraph(f"- {_first_line(bullet)}", styles["CiakBody"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(_paragraph("Il team Ciak.io resta al tuo fianco per trasformare questi punti in azioni concrete.", styles["CiakSmall"]))

    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buf.getvalue()


def render_project_book_pdf(payload: dict[str, Any]) -> bytes:
    from xml.sax.saxutils import escape
    from reportlab.platypus import PageBreak, Spacer, HRFlowable
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor

    styles = _styles()
    buf, doc = _doc()
    nome = _safe(payload.get("partner_name"), "Partner Ciak")
    project_name = _safe(payload.get("project_name"), "Il tuo modello digitale")
    start_date = _safe(payload.get("start_date"), "Data in preparazione")
    fase_attuale = _safe(payload.get("fase_attuale"), "In preparazione")
    sections = payload.get("sections") or []

    # Fallback usato solo se il render HTML ufficiale non e' disponibile
    # (services/project_book_html.py). Stessi titoli e metadati dello standard
    # `memory/CIAK_WORKBOOK_STRATEGICO_TEMPLATE.md`, resa piu' povera.
    story = [
        Spacer(1, 0.8 * cm),
        _paragraph("CIAK.io · PROTOCOLLO EVO™", styles["CiakSmall"]),
        Spacer(1, 0.4 * cm),
        HRFlowable(width="100%", thickness=14, color=HexColor("#FACC15"), spaceBefore=4, spaceAfter=14),
        _paragraph("WORKBOOK STRATEGICO", styles["CiakTitle"]),
        HRFlowable(width="100%", thickness=1, color=HexColor("#E2E8F0"), spaceBefore=4, spaceAfter=14),
        _paragraph("Una guida esclusiva per la realizzazione di accademie digitali di successo", styles["CiakSubtitle"]),
        Spacer(1, 1.2 * cm),
        _paragraph_html(f"<b>Preparato per:</b> {escape(nome)}", styles["CiakBody"]),
        _paragraph_html(f"<b>Progetto / Accademia:</b> {escape(project_name)}", styles["CiakBody"]),
        _paragraph_html(f"<b>Data Inizio Lavori:</b> {escape(start_date)}", styles["CiakBody"]),
        _paragraph_html(f"<b>Fase attuale:</b> {escape(fase_attuale)}", styles["CiakBody"]),
        _paragraph_html("<b>Tutor Strategico:</b> Claudio Bertogliatti &amp; Team CIAK.io", styles["CiakBody"]),
        Spacer(1, 1.5 * cm),
        _paragraph(
            "Qui raccogliamo, fase dopo fase, le caratteristiche del modello digitale "
            "che stiamo costruendo insieme.",
            styles["CiakSmall"],
        ),
        PageBreak(),
    ]

    for idx, section in enumerate(sections, 1):
        num_title = f"{idx}.0 {section.get('title', 'Sezione Progetto')}"
        story.append(_paragraph(num_title, styles["CiakSection"]))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
        story.extend(_paragraphs(
            _safe(section.get("body"), "Questa sezione si completera' nella prossima fase del percorso."),
            styles["CiakBody"],
        ))
        story.append(Spacer(1, 0.6 * cm))

    story.append(Spacer(1, 0.8 * cm))
    story.append(_paragraph("Documento Riservato — Generato da CIAK.io. Il Workbook si arricchisce a ogni step approvato.", styles["CiakSmall"]))
    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buf.getvalue()
