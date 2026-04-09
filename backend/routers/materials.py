"""
Generazione PDF dei materiali operativi per i partner.
Ogni step ha i propri materiali scaricabili.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from io import BytesIO

router = APIRouter(prefix="/api/materials", tags=["materials"])

BRAND_DARK = HexColor("#1A1F24")
BRAND_GOLD = HexColor("#F5C518")
BRAND_GRAY = HexColor("#5F6572")
BRAND_LIGHT = HexColor("#F5F3EE")

def _base_styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(
        "BrandTitle", parent=ss["Title"], fontSize=22, textColor=BRAND_DARK,
        spaceAfter=6, fontName="Helvetica-Bold", alignment=0
    ))
    ss.add(ParagraphStyle(
        "BrandSubtitle", parent=ss["Normal"], fontSize=11, textColor=BRAND_GRAY,
        spaceAfter=14, leading=16
    ))
    ss.add(ParagraphStyle(
        "SectionHead", parent=ss["Heading2"], fontSize=14, textColor=BRAND_DARK,
        spaceBefore=18, spaceAfter=6, fontName="Helvetica-Bold"
    ))
    ss.add(ParagraphStyle(
        "BrandBody", parent=ss["Normal"], fontSize=11, textColor=BRAND_DARK,
        leading=16, spaceAfter=8
    ))
    ss.add(ParagraphStyle(
        "Example", parent=ss["Normal"], fontSize=11, textColor=HexColor("#2D9F6F"),
        leading=16, spaceAfter=4, leftIndent=20
    ))
    ss.add(ParagraphStyle(
        "Wrong", parent=ss["Normal"], fontSize=11, textColor=HexColor("#DC2626"),
        leading=16, spaceAfter=4, leftIndent=20
    ))
    ss.add(ParagraphStyle(
        "FillIn", parent=ss["Normal"], fontSize=12, textColor=BRAND_DARK,
        leading=20, spaceAfter=6, leftIndent=12, borderWidth=1, borderColor=HexColor("#E8E4DC"),
        borderPadding=8, backColor=BRAND_LIGHT
    ))
    ss.add(ParagraphStyle(
        "GoldBox", parent=ss["Normal"], fontSize=12, textColor=BRAND_DARK,
        leading=18, spaceAfter=8, fontName="Helvetica-Bold",
        backColor=HexColor("#FFF8E1"), borderPadding=10
    ))
    return ss


def _header(story, styles, title, subtitle):
    story.append(Paragraph(f"EVOLUTION PRO", ParagraphStyle(
        "Logo", parent=styles["Normal"], fontSize=9, textColor=BRAND_GOLD,
        fontName="Helvetica-Bold", spaceAfter=2
    )))
    story.append(Paragraph(title, styles["BrandTitle"]))
    story.append(Paragraph(subtitle, styles["BrandSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#E8E4DC"), spaceAfter=14))


def _build_pdf(build_fn, filename):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    story = []
    styles = _base_styles()
    build_fn(story, styles)
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ═══════════════════════════════════════════════════════════
# 1. GUIDA AL POSIZIONAMENTO
# ═══════════════════════════════════════════════════════════
def _guida_posizionamento(story, styles):
    _header(story, styles,
            "Guida al Posizionamento",
            "Questa guida serve per aiutarti a chiarire tre elementi fondamentali: "
            "chi sei, chi aiuti, quale problema risolvi. Non devi essere perfetto. Devi essere chiaro.")

    # BLOCCO 1
    story.append(Paragraph("BLOCCO 1 — Chi sei", styles["SectionHead"]))
    story.append(Paragraph("Scrivi in modo semplice: in cosa sei competente?", styles["BrandBody"]))
    story.append(Paragraph("Esempi:", styles["BrandBody"]))
    for ex in [
        "Aiuto professionisti a vendere online",
        "Aiuto donne over 40 a migliorare alimentazione",
        "Aiuto freelance a trovare clienti"
    ]:
        story.append(Paragraph(f"&bull; {ex}", styles["Example"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Scrivi la tua risposta qui:", styles["BrandBody"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))
    story.append(Spacer(1, 8))

    # BLOCCO 2
    story.append(Paragraph("BLOCCO 2 — Chi aiuti", styles["SectionHead"]))
    story.append(Paragraph("Chi e' il tuo cliente ideale? Non dire 'tutti'.", styles["BrandBody"]))
    story.append(Paragraph("Esempi:", styles["BrandBody"]))
    for ex in ["Liberi professionisti", "Coach", "Mamme lavoratrici", "Imprenditori"]:
        story.append(Paragraph(f"&bull; {ex}", styles["Example"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Scrivi il tuo target qui:", styles["BrandBody"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))
    story.append(Spacer(1, 8))

    # BLOCCO 3
    story.append(Paragraph("BLOCCO 3 — Problema", styles["SectionHead"]))
    story.append(Paragraph("Qual e' il problema concreto del tuo target? Non generico.", styles["BrandBody"]))
    story.append(Paragraph("NO: 'vogliono migliorare'", styles["Wrong"]))
    story.append(Paragraph("SI: 'non riescono a trovare clienti'", styles["Example"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Scrivi il problema qui:", styles["BrandBody"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))
    story.append(Spacer(1, 8))

    # BLOCCO 4
    story.append(Paragraph("BLOCCO 4 — La tua frase", styles["SectionHead"]))
    story.append(Paragraph("Unisci tutto in una frase:", styles["BrandBody"]))
    story.append(Paragraph("Aiuto [target] a [risultato] anche se [problema]", styles["GoldBox"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Esempio: Aiuto freelance a trovare clienti anche se non sanno vendersi.", styles["Example"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Scrivi la TUA frase qui:", styles["BrandBody"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))


# ═══════════════════════════════════════════════════════════
# 2. TEMPLATE TARGET IDEALE
# ═══════════════════════════════════════════════════════════
def _template_target(story, styles):
    _header(story, styles,
            "Template Target Ideale",
            "Definire il target e' fondamentale. Piu' sei specifico, piu' sara' facile vendere. "
            "Compila ogni sezione con risposte concrete.")

    sections = [
        ("SEZIONE 1 — Chi e'", [
            ("Eta':", "_______________________________________________"),
            ("Lavoro:", "_______________________________________________"),
            ("Situazione:", "_______________________________________________"),
        ]),
        ("SEZIONE 2 — Problema principale", [
            ("Qual e' il problema che vive oggi? Scrivi una frase concreta.", "_______________________________________________"),
        ]),
        ("SEZIONE 3 — Cosa ha gia' provato", [
            ("Cosa ha gia' tentato senza successo?", "_______________________________________________"),
        ]),
        ("SEZIONE 4 — Obiettivo", [
            ("Cosa vuole ottenere davvero?", "_______________________________________________"),
        ]),
        ("SEZIONE 5 — Frustrazione", [
            ("Cosa lo blocca oggi?", "_______________________________________________"),
        ]),
    ]

    for title, fields in sections:
        story.append(Paragraph(title, styles["SectionHead"]))
        for label, placeholder in fields:
            story.append(Paragraph(label, styles["BrandBody"]))
            story.append(Paragraph(placeholder, styles["FillIn"]))
            story.append(Spacer(1, 6))

    story.append(Spacer(1, 12))
    story.append(Paragraph("OUTPUT FINALE", styles["SectionHead"]))
    story.append(Paragraph("Il mio cliente ideale e':", styles["GoldBox"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))


# ═══════════════════════════════════════════════════════════
# 3. ESEMPI DI POSIZIONAMENTO
# ═══════════════════════════════════════════════════════════
def _esempi_posizionamento(story, styles):
    _header(story, styles,
            "Esempi di Posizionamento",
            "Qui trovi esempi reali. Non copiarli. Usali per capire la logica "
            "e costruire il tuo posizionamento unico.")

    examples = [
        ("Esempio 1", "Aiuto coach a vendere videocorsi anche se non hanno pubblico.",
         "Target: coach | Problema: nessun pubblico | Risultato: vendere videocorsi"),
        ("Esempio 2", "Aiuto mamme lavoratrici a organizzarsi anche se hanno poco tempo.",
         "Target: mamme lavoratrici | Problema: poco tempo | Risultato: organizzazione"),
        ("Esempio 3", "Aiuto freelance a trovare clienti senza fare pubblicita'.",
         "Target: freelance | Problema: difficolta' nell'acquisizione | Risultato: nuovi clienti"),
        ("Esempio 4", "Aiuto professionisti a comunicare meglio per aumentare clienti.",
         "Target: professionisti | Problema: comunicazione inefficace | Risultato: piu' clienti"),
        ("Esempio 5", "Aiuto artisti a vendere online senza piattaforme complicate.",
         "Target: artisti | Problema: piattaforme complesse | Risultato: vendite online"),
    ]

    for title, phrase, breakdown in examples:
        story.append(Paragraph(title, styles["SectionHead"]))
        story.append(Paragraph(f'"{phrase}"', styles["GoldBox"]))
        story.append(Paragraph(breakdown, ParagraphStyle(
            "Breakdown", parent=styles["BrandBody"], fontSize=10, textColor=BRAND_GRAY, leftIndent=12
        )))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 16))
    story.append(Paragraph("ORA CREA IL TUO", styles["SectionHead"]))
    story.append(Paragraph("Aiuto __________ a __________ anche se __________", styles["GoldBox"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Scrivi qui:", styles["BrandBody"]))
    story.append(Paragraph("_______________________________________________", styles["FillIn"]))


# ═══════════════════════════════════════════════════════════
# ROUTING
# ═══════════════════════════════════════════════════════════
MATERIAL_MAP = {
    "posizionamento": {
        "guida": ("guida_posizionamento.pdf", _guida_posizionamento),
        "template-target": ("template_target_ideale.pdf", _template_target),
        "esempi": ("esempi_posizionamento.pdf", _esempi_posizionamento),
    },
}


@router.get("/{step_id}/{material_id}")
async def download_material(step_id: str, material_id: str):
    step_materials = MATERIAL_MAP.get(step_id, {})
    material = step_materials.get(material_id)
    if not material:
        from fastapi import HTTPException
        raise HTTPException(404, f"Materiale '{material_id}' non trovato per step '{step_id}'")
    filename, build_fn = material
    return _build_pdf(build_fn, filename)
