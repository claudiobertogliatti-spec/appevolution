"""
Generatore PDF per Analisi Strategica Evolution PRO.
Struttura a 11 sezioni: Titolo, Sintesi, Diagnosi, Punti di forza,
Criticità, Livello, Conseguenze, Direzione, Intro soluzione, Esito, Prossimo passo.
Max 10-12 pagine. Frasi brevi. Linguaggio diretto.
"""
import io
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

YELLOW     = HexColor("#FFD24D")
YELLOW_BG  = HexColor("#FFF8E1")
DARK       = HexColor("#1A1F24")
MUTED      = HexColor("#6B7280")
BG_LIGHT   = HexColor("#FAFAF7")
GREEN      = HexColor("#10B981")
RED        = HexColor("#EF4444")
ORANGE     = HexColor("#F59E0B")
BORDER     = HexColor("#E5E7EB")

LABEL_ESPERIENZA = {"meno_1": "Meno di 1 anno", "1_3": "1-3 anni", "3_5": "3-5 anni", "oltre_5": "Oltre 5 anni"}
LABEL_PUBBLICO   = {"no": "Nessun pubblico", "piccolo": "< 1.000", "medio": "1.000-10.000", "grande": "> 10.000"}
LABEL_VENDITE    = {"no": "Nessuna", "provato": "Tentativi", "attivo": "Ricorrente", "avanzato": "> 50k/anno"}


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("EPTitle", parent=styles["Title"],
        fontName="Helvetica-Bold", fontSize=24, textColor=DARK,
        spaceAfter=4, alignment=TA_CENTER, leading=30))
    styles.add(ParagraphStyle("EPSubtitle", parent=styles["Normal"],
        fontName="Helvetica", fontSize=12, textColor=MUTED,
        spaceAfter=4, alignment=TA_CENTER))
    styles.add(ParagraphStyle("EPClientName", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=16, textColor=DARK,
        spaceAfter=20, alignment=TA_CENTER))
    styles.add(ParagraphStyle("EPH2", parent=styles["Heading2"],
        fontName="Helvetica-Bold", fontSize=15, textColor=DARK,
        spaceBefore=20, spaceAfter=10))
    styles.add(ParagraphStyle("EPH3", parent=styles["Heading3"],
        fontName="Helvetica-Bold", fontSize=12, textColor=DARK,
        spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle("EPBody", parent=styles["Normal"],
        fontName="Helvetica", fontSize=10.5, textColor=DARK,
        leading=16, spaceAfter=6))
    styles.add(ParagraphStyle("EPBullet", parent=styles["Normal"],
        fontName="Helvetica", fontSize=10.5, textColor=DARK,
        leading=16, leftIndent=20, bulletIndent=8, spaceAfter=4))
    styles.add(ParagraphStyle("EPHighlight", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=11, textColor=DARK,
        leading=16, spaceAfter=6, backColor=YELLOW_BG,
        borderPadding=(8, 8, 8, 8)))
    styles.add(ParagraphStyle("EPLabel", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=9, textColor=MUTED,
        spaceAfter=2, spaceBefore=12))
    styles.add(ParagraphStyle("EPFooter", parent=styles["Normal"],
        fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER))
    styles.add(ParagraphStyle("EPEsito", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=18, textColor=DARK,
        alignment=TA_CENTER, spaceAfter=8, spaceBefore=12))
    return styles


def _section_block(elements, styles, title, content_fn):
    """Helper per creare un blocco sezione coerente."""
    elements.append(Paragraph(title, styles["EPH2"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=YELLOW, spaceAfter=10))
    content_fn()
    elements.append(Spacer(1, 10))


def genera_pdf_analisi(quiz: dict, scoring: dict, analisi: dict,
                       cliente_nome: str = "", cliente_email: str = "") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=2*cm, bottomMargin=2*cm,
        leftMargin=2.5*cm, rightMargin=2.5*cm)
    styles = _get_styles()
    el = []

    # ═══ PAGINA 1: COPERTINA ════════════════════════════════════════
    el.append(Spacer(1, 80))
    el.append(HRFlowable(width="40%", thickness=3, color=YELLOW, spaceAfter=20))
    el.append(Paragraph("EVOLUTION<font color='#D4A017'>PRO</font>", styles["EPTitle"]))
    el.append(Spacer(1, 12))
    el.append(Paragraph("Analisi Strategica Personalizzata", styles["EPSubtitle"]))
    el.append(Spacer(1, 20))
    if cliente_nome:
        el.append(Paragraph(cliente_nome, styles["EPClientName"]))
    el.append(Spacer(1, 30))

    # Info box
    info_rows = []
    if cliente_email:
        info_rows.append(["Email:", cliente_email])
    info_rows.append(["Data:", datetime.now(timezone.utc).strftime("%d/%m/%Y")])
    info_rows.append(["Scoring:", f"{scoring['totale']}/{scoring['max']} ({scoring['percentuale']}%)"])
    info_rows.append(["Esito:", analisi.get("esito", scoring.get("classificazione", "")).replace("_", " ")])

    if info_rows:
        t = Table(info_rows, colWidths=[80, 340])
        t.setStyle(TableStyle([
            ("FONTNAME", (0,0),(0,-1), "Helvetica-Bold"),
            ("FONTNAME", (1,0),(1,-1), "Helvetica"),
            ("FONTSIZE", (0,0),(-1,-1), 10),
            ("TEXTCOLOR", (0,0),(0,-1), MUTED),
            ("TEXTCOLOR", (1,0),(1,-1), DARK),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("TOPPADDING", (0,0),(-1,-1), 6),
            ("BACKGROUND", (0,0),(-1,-1), BG_LIGHT),
            ("BOX", (0,0),(-1,-1), 0.5, BORDER),
            ("LEFTPADDING", (0,0),(-1,-1), 10),
        ]))
        el.append(t)

    el.append(Spacer(1, 40))
    el.append(Paragraph("Documento riservato e confidenziale.", styles["EPFooter"]))
    el.append(PageBreak())

    # ═══ SEZIONE 1: SINTESI DEL PROGETTO ════════════════════════════
    def _sintesi():
        el.append(Paragraph(analisi.get("sintesi_progetto", ""), styles["EPBody"]))
        # Dati strutturati sotto
        quiz_rows = [
            ["Ambito:", quiz.get("ambito", "")],
            ["Target:", quiz.get("target", "")],
            ["Problema:", quiz.get("problema", "")],
        ]
        qt = Table(quiz_rows, colWidths=[80, 360])
        qt.setStyle(TableStyle([
            ("FONTNAME", (0,0),(0,-1), "Helvetica-Bold"),
            ("FONTSIZE", (0,0),(-1,-1), 10),
            ("TEXTCOLOR", (0,0),(0,-1), MUTED),
            ("TEXTCOLOR", (1,0),(1,-1), DARK),
            ("VALIGN", (0,0),(-1,-1), "TOP"),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("TOPPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING", (0,0),(-1,-1), 8),
            ("GRID", (0,0),(-1,-1), 0.5, BORDER),
        ]))
        el.append(qt)
    _section_block(el, styles, "1. Sintesi del Progetto", _sintesi)

    # ═══ SEZIONE 2: DIAGNOSI ════════════════════════════════════════
    def _diagnosi():
        el.append(Paragraph(analisi.get("diagnosi", ""), styles["EPBody"]))
    _section_block(el, styles, "2. Diagnosi", _diagnosi)

    # ═══ SEZIONE 3: PUNTI DI FORZA ═════════════════════════════════
    def _forza():
        for p in analisi.get("punti_di_forza", []):
            el.append(Paragraph(f"<font color='#10B981'>&bull;</font>  {p}", styles["EPBullet"]))
    _section_block(el, styles, "3. Punti di Forza", _forza)

    # ═══ SEZIONE 4: CRITICITÀ ══════════════════════════════════════
    def _criticita():
        for c in analisi.get("criticita", []):
            el.append(Paragraph(f"<font color='#EF4444'>&bull;</font>  {c}", styles["EPBullet"]))
    _section_block(el, styles, "4. Criticità", _criticita)

    # ═══ SEZIONE 5: LIVELLO DEL PROGETTO ═══════════════════════════
    def _livello():
        livello = analisi.get("livello_progetto", "Intermedio")
        color_map = {"Base": RED, "Intermedio": ORANGE, "Avanzato": GREEN}
        col = color_map.get(livello, ORANGE)
        badge = Table([[livello]], colWidths=[120])
        badge.setStyle(TableStyle([
            ("FONTNAME", (0,0),(0,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0),(0,0), 14),
            ("TEXTCOLOR", (0,0),(0,0), col),
            ("BACKGROUND", (0,0),(0,0), BG_LIGHT),
            ("ALIGN", (0,0),(0,0), "CENTER"),
            ("BOX", (0,0),(0,0), 1, col),
            ("TOPPADDING", (0,0),(0,0), 8),
            ("BOTTOMPADDING", (0,0),(0,0), 8),
        ]))
        el.append(badge)
        el.append(Spacer(1, 8))
        el.append(Paragraph(analisi.get("livello_spiegazione", ""), styles["EPBody"]))
    _section_block(el, styles, "5. Livello del Progetto", _livello)

    # ═══ SEZIONE 6: CONSEGUENZE ════════════════════════════════════
    def _conseguenze():
        el.append(Paragraph(analisi.get("conseguenze", ""), styles["EPBody"]))
    _section_block(el, styles, "6. Conseguenze (se non cambia nulla)", _conseguenze)

    el.append(PageBreak())

    # ═══ SEZIONE 7: DIREZIONE CONSIGLIATA ══════════════════════════
    def _direzione():
        el.append(Paragraph(analisi.get("direzione_consigliata", ""), styles["EPBody"]))
    _section_block(el, styles, "7. Direzione Consigliata", _direzione)

    # ═══ SEZIONE 8: INTRODUZIONE SOLUZIONE ═════════════════════════
    def _soluzione():
        el.append(Paragraph(analisi.get("introduzione_soluzione", ""), styles["EPBody"]))
    _section_block(el, styles, "8. La Soluzione", _soluzione)

    # ═══ SEZIONE 9: ESITO ══════════════════════════════════════════
    def _esito():
        esito = analisi.get("esito", scoring.get("classificazione", "")).replace("_", " ")
        color_map = {"IDONEO": GREEN, "IDONEO CON RISERVA": ORANGE, "NON IDONEO": RED}
        col = color_map.get(esito, ORANGE)

        badge = Table([[esito]], colWidths=[200])
        badge.setStyle(TableStyle([
            ("FONTNAME", (0,0),(0,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0),(0,0), 18),
            ("TEXTCOLOR", (0,0),(0,0), col),
            ("BACKGROUND", (0,0),(0,0), BG_LIGHT),
            ("ALIGN", (0,0),(0,0), "CENTER"),
            ("BOX", (0,0),(0,0), 2, col),
            ("TOPPADDING", (0,0),(0,0), 12),
            ("BOTTOMPADDING", (0,0),(0,0), 12),
        ]))
        el.append(badge)
    _section_block(el, styles, "9. Esito", _esito)

    # ═══ SEZIONE 10: PROSSIMO PASSO ════════════════════════════════
    def _prossimo():
        el.append(Paragraph(analisi.get("prossimo_passo", ""), styles["EPBody"]))
    _section_block(el, styles, "10. Prossimo Passo", _prossimo)

    # ═══ SEZIONE 11: SCORING DETTAGLIATO ═══════════════════════════
    def _scoring():
        score_data = [
            ["Dimensione", "Punteggio", "Dettaglio"],
            ["Esperienza", f"{scoring['breakdown']['esperienza']['punteggio']}/10",
             LABEL_ESPERIENZA.get(quiz.get("esperienza",""),"")],
            ["Pubblico", f"{scoring['breakdown']['pubblico']['punteggio']}/10",
             LABEL_PUBBLICO.get(quiz.get("pubblico",""),"")],
            ["Vendite", f"{scoring['breakdown']['vendite']['punteggio']}/10",
             LABEL_VENDITE.get(quiz.get("vendite_online",""),"")],
            ["Chiarezza problema", f"{scoring['breakdown']['chiarezza_problema']['punteggio']}/10", ""],
            ["TOTALE", f"{scoring['totale']}/{scoring['max']} ({scoring['percentuale']}%)",
             analisi.get("esito", scoring.get("classificazione","")).replace("_", " ")],
        ]
        st = Table(score_data, colWidths=[140, 100, 200])
        st.setStyle(TableStyle([
            ("FONTNAME", (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTNAME", (0,-1),(-1,-1), "Helvetica-Bold"),
            ("FONTSIZE", (0,0),(-1,-1), 9.5),
            ("BACKGROUND", (0,0),(-1,0), YELLOW),
            ("TEXTCOLOR", (0,0),(-1,0), DARK),
            ("BACKGROUND", (0,-1),(-1,-1), BG_LIGHT),
            ("GRID", (0,0),(-1,-1), 0.5, BORDER),
            ("TOPPADDING", (0,0),(-1,-1), 7),
            ("BOTTOMPADDING", (0,0),(-1,-1), 7),
            ("LEFTPADDING", (0,0),(-1,-1), 8),
        ]))
        el.append(st)
    _section_block(el, styles, "Appendice — Scoring Dettagliato", _scoring)

    # ═══ FOOTER FINALE ══════════════════════════════════════════════
    el.append(Spacer(1, 30))
    el.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=10))
    el.append(Paragraph(
        f"Evolution PRO — Analisi Strategica — "
        f"{datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC",
        styles["EPFooter"]))
    el.append(Paragraph("Documento riservato e confidenziale.", styles["EPFooter"]))

    doc.build(el)
    return buf.getvalue()
