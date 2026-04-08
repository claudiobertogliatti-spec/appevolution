"""
Generatore PDF per Analisi Strategica Evolution PRO.
Usa reportlab per controllo completo su struttura, branding e copy.
"""
import io
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

YELLOW     = HexColor("#FFD24D")
DARK       = HexColor("#1A1F24")
MUTED      = HexColor("#6B7280")
BG_LIGHT   = HexColor("#FAFAF7")
GREEN      = HexColor("#10B981")
RED        = HexColor("#EF4444")
ORANGE     = HexColor("#F59E0B")

LABEL_ESPERIENZA = {"meno_1": "Meno di 1 anno", "1_3": "1-3 anni", "3_5": "3-5 anni", "oltre_5": "Oltre 5 anni"}
LABEL_PUBBLICO   = {"no": "Nessun pubblico", "piccolo": "< 1.000", "medio": "1.000-10.000", "grande": "> 10.000"}
LABEL_VENDITE    = {"no": "Nessuna", "provato": "Tentativi", "attivo": "Ricorrente", "avanzato": "> 50k/anno"}


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("EPTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=DARK, spaceAfter=6, alignment=TA_LEFT))
    styles.add(ParagraphStyle("EPSubtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=11, textColor=MUTED, spaceAfter=16, alignment=TA_LEFT))
    styles.add(ParagraphStyle("EPH2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14, textColor=DARK, spaceBefore=18, spaceAfter=8))
    styles.add(ParagraphStyle("EPBody", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=DARK, leading=15, spaceAfter=6))
    styles.add(ParagraphStyle("EPBullet", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=DARK, leading=15, leftIndent=16, bulletIndent=6, spaceAfter=4))
    styles.add(ParagraphStyle("EPFooter", parent=styles["Normal"], fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER))
    return styles


def genera_pdf_analisi(quiz: dict, scoring: dict, analisi: dict, cliente_nome: str = "", cliente_email: str = "") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm)
    styles = _get_styles()
    elements = []

    # Header
    elements.append(Paragraph("EVOLUTION<font color='#D4A017'>PRO</font>", styles["EPTitle"]))
    elements.append(Paragraph("Analisi Strategica Personalizzata", styles["EPSubtitle"]))
    elements.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceAfter=12))

    if cliente_nome or cliente_email:
        info = []
        if cliente_nome: info.append(["Cliente:", cliente_nome])
        if cliente_email: info.append(["Email:", cliente_email])
        info.append(["Data:", datetime.now(timezone.utc).strftime("%d/%m/%Y")])
        t = Table(info, colWidths=[60, 300])
        t.setStyle(TableStyle([("FONTNAME", (0,0),(0,-1),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),10),("TEXTCOLOR",(0,0),(0,-1),MUTED),("TEXTCOLOR",(1,0),(1,-1),DARK),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
        elements.append(t)
        elements.append(Spacer(1, 12))

    # Scoring
    elements.append(Paragraph("Scoring Lead", styles["EPH2"]))
    score_data = [
        ["Dimensione", "Punteggio", "Valore"],
        ["Esperienza", f"{scoring['breakdown']['esperienza']['punteggio']}/10", LABEL_ESPERIENZA.get(quiz.get("esperienza",""),"")],
        ["Pubblico", f"{scoring['breakdown']['pubblico']['punteggio']}/10", LABEL_PUBBLICO.get(quiz.get("pubblico",""),"")],
        ["Vendite", f"{scoring['breakdown']['vendite']['punteggio']}/10", LABEL_VENDITE.get(quiz.get("vendite_online",""),"")],
        ["Chiarezza problema", f"{scoring['breakdown']['chiarezza_problema']['punteggio']}/10", ""],
        ["TOTALE", f"{scoring['totale']}/{scoring['max']} ({scoring['percentuale']}%)", scoring.get("classificazione","").replace("_"," ")],
    ]
    st = Table(score_data, colWidths=[140, 100, 200])
    st.setStyle(TableStyle([("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),("BACKGROUND",(0,0),(-1,0),YELLOW),("TEXTCOLOR",(0,0),(-1,0),DARK),("BACKGROUND",(0,-1),(-1,-1),BG_LIGHT),("GRID",(0,0),(-1,-1),0.5,HexColor("#E5E7EB")),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8)]))
    elements.append(st)
    elements.append(Spacer(1, 16))

    # Analisi
    elements.append(Paragraph("Analisi Strategica", styles["EPH2"]))
    elements.append(Paragraph("<b>Sintesi del Progetto</b>", styles["EPBody"]))
    elements.append(Paragraph(analisi.get("sintesi_progetto",""), styles["EPBody"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("<b>Punti di Forza</b>", styles["EPBody"]))
    for p in analisi.get("punti_di_forza", []): elements.append(Paragraph(f"&bull; {p}", styles["EPBullet"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("<b>Criticità</b>", styles["EPBody"]))
    for c in analisi.get("criticita", []): elements.append(Paragraph(f"&bull; {c}", styles["EPBullet"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("<b>Livello di Maturità</b>", styles["EPBody"]))
    elements.append(Paragraph(analisi.get("livello_maturita",""), styles["EPBody"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("<b>Direzione Consigliata</b>", styles["EPBody"]))
    elements.append(Paragraph(analisi.get("direzione_consigliata",""), styles["EPBody"]))
    elements.append(Spacer(1, 16))

    # Dati questionario
    elements.append(Paragraph("Dati Raccolti", styles["EPH2"]))
    qdata = [["Ambito",quiz.get("ambito","")],["Target",quiz.get("target","")],["Problema",quiz.get("problema","")],["Obiettivo",quiz.get("obiettivo","")],["Canale",quiz.get("canale_principale","N/A")],["Vendite",quiz.get("vendite_dettaglio","N/A")]]
    qt = Table(qdata, colWidths=[120, 320])
    qt.setStyle(TableStyle([("FONTNAME",(0,0),(0,-1),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),("TEXTCOLOR",(0,0),(0,-1),MUTED),("VALIGN",(0,0),(-1,-1),"TOP"),("GRID",(0,0),(-1,-1),0.5,HexColor("#E5E7EB")),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8)]))
    elements.append(qt)
    elements.append(Spacer(1, 20))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=1, color=HexColor("#E5E7EB"), spaceAfter=8))
    elements.append(Paragraph(f"Evolution PRO — Analisi Strategica — {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC", styles["EPFooter"]))
    elements.append(Paragraph("Documento riservato e confidenziale.", styles["EPFooter"]))

    doc.build(elements)
    return buf.getvalue()
