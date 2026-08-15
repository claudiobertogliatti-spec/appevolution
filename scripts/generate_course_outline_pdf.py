"""Genera il PDF canonico dell'outline corso dai dati partner_videocorso."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


YELLOW = colors.HexColor("#FFD24D")
INK = colors.HexColor("#1A1F24")
SLATE = colors.HexColor("#56616B")
CREAM = colors.HexColor("#F5F3EE")


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(YELLOW)
    canvas.setLineWidth(1.2)
    canvas.line(18 * mm, 13 * mm, 192 * mm, 13 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SLATE)
    canvas.drawString(18 * mm, 8 * mm, "Evolution PRO - Outline corso")
    canvas.drawRightString(192 * mm, 8 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def build_pdf(source: Path, output: Path, partner_name: str) -> None:
    raw = source.read_text(encoding="utf-8").replace("—", "-").replace("–", "-").replace("‑", "-")
    payload = json.loads(raw)
    course = (payload.get("videocorso") or {}).get("course_data") or {}
    modules = course.get("moduli") or []
    if not modules:
        raise ValueError("Nessun modulo trovato in videocorso.course_data.moduli")

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=20 * mm,
        title=f"Outline corso - {partner_name}", author="Evolution PRO",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleCiak", parent=styles["Title"], fontName="Helvetica-Bold",
                           fontSize=25, leading=29, textColor=INK, alignment=TA_CENTER, spaceAfter=8)
    subtitle = ParagraphStyle("SubtitleCiak", parent=styles["BodyText"], fontSize=11,
                              leading=16, textColor=SLATE, alignment=TA_CENTER, spaceAfter=16)
    module_title = ParagraphStyle("ModuleTitle", parent=styles["Heading2"], fontName="Helvetica-Bold",
                                  fontSize=14, leading=18, textColor=INK, spaceAfter=5)
    body = ParagraphStyle("BodyCiak", parent=styles["BodyText"], fontSize=9.5, leading=14,
                          textColor=INK)
    small = ParagraphStyle("SmallCiak", parent=body, fontSize=8.5, leading=12, textColor=SLATE)

    story = [Spacer(1, 10 * mm), Paragraph("OUTLINE DEL CORSO", title)]
    course_title = course.get("titolo_corso") or course.get("titolo") or "Corso"
    story += [Paragraph(str(course_title), ParagraphStyle("Course", parent=title, fontSize=18, leading=23)),
              Paragraph(partner_name, subtitle)]
    promise = course.get("promessa") or course.get("sottotitolo")
    if promise:
        story.append(Table([[Paragraph(f"<b>Promessa del percorso</b><br/>{promise}", body)]],
                           colWidths=[168 * mm], style=TableStyle([
                               ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                               ("BOX", (0, 0), (-1, -1), 1, YELLOW),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (-1, -1), 9),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                           ])))
    story += [Spacer(1, 6 * mm), Paragraph(
        f"{len(modules)} moduli - {sum(len(m.get('lezioni') or []) for m in modules)} lezioni",
        subtitle), PageBreak()]

    for idx, module in enumerate(modules, 1):
        lessons = module.get("lezioni") or []
        block = [Paragraph(f"MODULO {module.get('numero', idx)}", small),
                 Paragraph(str(module.get("titolo") or f"Modulo {idx}"), module_title)]
        if module.get("obiettivo"):
            block.append(Paragraph(f"<b>Obiettivo:</b> {module['obiettivo']}", body))
            block.append(Spacer(1, 2 * mm))
        rows = [[Paragraph("Lezione", small), Paragraph("Titolo e contenuto", small)]]
        for lesson_idx, lesson in enumerate(lessons, 1):
            number = lesson.get("numero", lesson_idx)
            lesson_text = f"<b>{lesson.get('titolo', f'Lezione {number}')}</b>"
            if lesson.get("descrizione"):
                lesson_text += f"<br/><font color='#56616B'>{lesson['descrizione']}</font>"
            rows.append([Paragraph(str(number), body), Paragraph(lesson_text, body)])
        table = Table(rows, colWidths=[17 * mm, 151 * mm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), INK), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8DDE1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        block += [table, Spacer(1, 7 * mm)]
        story.append(KeepTogether(block))

    story += [Spacer(1, 3 * mm), Table([[Paragraph(
        "<b>Stato del documento</b><br/>Master operativo ricavato dalla struttura reale del videocorso. "
        "Titoli, ordine e contenuti vanno aggiornati nel journey quando il partner approva una revisione.", body)]],
        colWidths=[168 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7D6")),
            ("BOX", (0, 0), (-1, -1), 1, YELLOW),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))]
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--partner-name", required=True)
    args = parser.parse_args()
    build_pdf(args.source, args.output, args.partner_name)
