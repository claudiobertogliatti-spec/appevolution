from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "marketing" / "lead-magnet-ci-penso-a-si.md"
OUTPUT = ROOT / "docs" / "marketing" / "lead-magnet-ci-penso-a-si.pdf"

NAVY = colors.HexColor("#1A1F24")
YELLOW = colors.HexColor("#FFD24D")
CREAM = colors.HexColor("#F5F3EE")
SLATE = colors.HexColor("#475569")


def _clean_inline(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = text.replace("€", "EUR ")
    text = text.replace("→", "->")
    text = text.replace("—", "-")
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("’", "'").replace("è", "e'")
    return text


def _styles():
    base = getSampleStyleSheet()
    return {
        "cover_logo": ParagraphStyle(
            "cover_logo",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=YELLOW,
            alignment=TA_CENTER,
            spaceAfter=22,
        ),
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=30,
            leading=34,
            textColor=colors.white,
            alignment=TA_CENTER,
            spaceAfter=16,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=colors.white,
            alignment=TA_CENTER,
            spaceAfter=28,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=NAVY,
            spaceBefore=14,
            spaceAfter=8,
            borderPadding=(0, 0, 4, 0),
        ),
        "h3": ParagraphStyle(
            "h3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=NAVY,
            spaceBefore=10,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=SLATE,
            alignment=TA_LEFT,
            spaceAfter=7,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            leftIndent=14,
            firstLineIndent=-8,
            textColor=SLATE,
            spaceAfter=5,
        ),
        "cta": ParagraphStyle(
            "cta",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=17,
            textColor=NAVY,
            alignment=TA_CENTER,
            backColor=CREAM,
            borderColor=YELLOW,
            borderWidth=1,
            borderPadding=12,
            spaceBefore=10,
            spaceAfter=8,
        ),
    }


def _parse_source(text: str):
    lines = text.splitlines()
    title = "Da 'ci penso' a 'si'"
    subtitle = ""
    body_lines: list[str] = []
    skip_meta = False

    for raw in lines:
        line = raw.strip()
        if not line:
            body_lines.append("")
            continue
        if line.startswith(">"):
            continue
        if line == "## Titolo":
            skip_meta = "title"
            continue
        if line == "## Sottotitolo":
            skip_meta = "subtitle"
            continue
        if line.startswith("## ") and skip_meta:
            skip_meta = False

        if skip_meta == "title":
            title = re.sub(r"\*\*", "", line)
            continue
        if skip_meta == "subtitle":
            subtitle = line
            continue
        body_lines.append(line)

    return title, subtitle, body_lines


def build_pdf() -> None:
    title, subtitle, lines = _parse_source(SOURCE.read_text(encoding="utf-8"))
    styles = _styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="Da ci penso a si",
        author="Claudio Bertogliatti - Ciak",
    )

    story = [
        Paragraph("CIAK x EVOLUTION PRO", styles["cover_logo"]),
        Paragraph(_clean_inline(title), styles["title"]),
        Paragraph(_clean_inline(subtitle), styles["subtitle"]),
        PageBreak(),
    ]

    for line in lines:
        if not line:
            story.append(Spacer(1, 0.15 * cm))
            continue
        if line.startswith("# "):
            continue
        if line.startswith("## "):
            text = line[3:].strip()
            if text.lower().startswith("chiusura"):
                story.append(Paragraph(_clean_inline(text), styles["h2"]))
            else:
                story.append(Paragraph(_clean_inline(text), styles["h2"]))
            continue
        if line.startswith("### "):
            story.append(Paragraph(_clean_inline(line[4:].strip()), styles["h3"]))
            continue
        if line.startswith("- "):
            story.append(Paragraph("• " + _clean_inline(line[2:].strip()), styles["bullet"]))
            continue
        if line.startswith("Prossimo passo:"):
            story.append(Paragraph(_clean_inline(line), styles["cta"]))
            continue
        story.append(Paragraph(_clean_inline(line), styles["body"]))

    doc.build(
        story,
        onFirstPage=_paint_background,
        onLaterPages=_paint_later_background,
    )


def _paint_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(YELLOW)
    canvas.rect(0, A4[1] - 0.35 * cm, A4[0], 0.35 * cm, stroke=0, fill=1)
    canvas.restoreState()


def _paint_later_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(YELLOW)
    canvas.rect(0, A4[1] - 0.18 * cm, A4[0], 0.18 * cm, stroke=0, fill=1)
    canvas.restoreState()


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
