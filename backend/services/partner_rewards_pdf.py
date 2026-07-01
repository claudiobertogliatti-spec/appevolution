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
    from reportlab.platypus import PageBreak, Spacer
    from reportlab.lib.units import cm

    styles = _styles()
    buf, doc = _doc()
    nome = _safe(payload.get("partner_name"), "Partner Ciak")
    project_name = _safe(payload.get("project_name"), "Il tuo modello digitale")
    start_date = _safe(payload.get("start_date"), "Data in preparazione")
    sections = payload.get("sections") or []

    story = [
        Spacer(1, 1.1 * cm),
        _paragraph("Libretto di Progetto Ciak", styles["CiakSubtitle"]),
        _paragraph(project_name, styles["CiakTitle"]),
        _paragraph(f"Preparato per {nome} · Inizio lavori: {start_date}", styles["CiakSubtitle"]),
        _paragraph(
            "Questo documento raccoglie, fase dopo fase, le caratteristiche del modello digitale "
            "che stiamo costruendo insieme.",
            styles["CiakBody"],
        ),
        PageBreak(),
    ]

    for section in sections:
        story.append(_paragraph(_safe(section.get("title"), "Sezione progetto"), styles["CiakSection"]))
        story.append(_paragraph(_safe(section.get("body"), "Questa sezione si completera' nella prossima fase del percorso."), styles["CiakBody"]))

    story.append(Spacer(1, 0.5 * cm))
    story.append(_paragraph("Versione generata da Ciak.io. Il libretto si aggiorna mentre il progetto avanza.", styles["CiakSmall"]))
    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buf.getvalue()
