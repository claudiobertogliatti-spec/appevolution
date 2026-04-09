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
    story.append(Paragraph("EVOLUTION PRO", ParagraphStyle(
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
# 4. TEMPLATE SCRIPT MASTERCLASS
# ═══════════════════════════════════════════════════════════
def _template_script_masterclass(story, styles):
    _header(story, styles,
            "Template Script Masterclass",
            "Questo template ti guida nella creazione della tua masterclass. "
            "Non devi essere perfetto. Devi essere chiaro e utile.")

    blocks = [
        ("BLOCCO 1 — Apertura", "Cosa dire nei primi 30 secondi",
         ["Chi sei", "Cosa fai", "Per chi e' questo contenuto"],
         'Ciao, sono [nome] e aiuto [target] a [risultato].\nIn questo video vedremo come [beneficio].'),
        ("BLOCCO 2 — Problema", "Descrivi il problema del tuo pubblico",
         ["Qual e' la situazione attuale", "Cosa non funziona"], None),
        ("BLOCCO 3 — Errore comune", "Cosa fanno tutti ma non funziona",
         ["L'errore piu' diffuso", "Perche' non porta risultati"], None),
        ("BLOCCO 4 — Soluzione", "Spiega il tuo metodo",
         ["Step 1: _______________", "Step 2: _______________", "Step 3: _______________"], None),
        ("BLOCCO 5 — Esempio", "Fai un esempio concreto",
         ["Racconta un caso reale o un risultato ottenuto"], None),
        ("BLOCCO 6 — Transizione", "Porta verso il corso",
         [], 'Se vuoi approfondire questo percorso, nel corso completo trovi [beneficio].'),
        ("BLOCCO 7 — Chiusura", "Invito all'azione",
         ["Call to action chiara", "Cosa deve fare lo spettatore ORA"], None),
    ]

    for title, subtitle, points, example in blocks:
        story.append(Paragraph(title, styles["SectionHead"]))
        story.append(Paragraph(subtitle, styles["BrandBody"]))
        for p in points:
            story.append(Paragraph(f"&bull; {p}", styles["BrandBody"]))
        if example:
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"Esempio: {example}", styles["Example"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph("Scrivi qui:", styles["BrandBody"]))
        story.append(Paragraph("_______________________________________________", styles["FillIn"]))
        story.append(Spacer(1, 6))


# ═══════════════════════════════════════════════════════════
# 5. STRUTTURA MASTERCLASS TIPO
# ═══════════════════════════════════════════════════════════
def _struttura_masterclass_tipo(story, styles):
    _header(story, styles,
            "Struttura Masterclass Tipo",
            "Una buona masterclass NON e' teoria. E' un percorso guidato. "
            "Segui questa struttura per creare contenuti efficaci.")

    sections = [
        ("1. Introduzione", "1-2 min", "Chi sei, cosa fai, cosa vedranno"),
        ("2. Problema", "2-3 min", "Descrizione chiara della situazione reale del pubblico"),
        ("3. Errori comuni", "2-3 min", "Cosa fanno tutti e perche' non funziona"),
        ("4. Soluzione", "5-10 min", "Il tuo metodo spiegato in modo semplice"),
        ("5. Esempio", "3-5 min", "Caso pratico e dimostrazione concreta"),
        ("6. Transizione", "2 min", "Collegamento al corso completo"),
        ("7. Chiusura", "1 min", "Call to action finale"),
    ]

    data = [["Sezione", "Durata", "Contenuto"]]
    for title, dur, desc in sections:
        data.append([title, dur, desc])

    t = Table(data, colWidths=[4*cm, 2.5*cm, 10*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#FFFFFF")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E8E4DC")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FFFFFF"), BRAND_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)

    story.append(Spacer(1, 16))
    story.append(Paragraph("Durata totale consigliata: 15-25 minuti", styles["GoldBox"]))

    story.append(Spacer(1, 12))
    story.append(Paragraph("REGOLE D'ORO", styles["SectionHead"]))
    rules = [
        "Una sola idea per sezione",
        "Linguaggio semplice e diretto",
        "Esempi concreti, non astratti",
        "Il pubblico deve pensare: 'Questo mi serve'",
    ]
    for r in rules:
        story.append(Paragraph(f"&bull; {r}", styles["BrandBody"]))


# ═══════════════════════════════════════════════════════════
# 6. CONSIGLI PER LA REGISTRAZIONE
# ═══════════════════════════════════════════════════════════
def _consigli_registrazione(story, styles):
    _header(story, styles,
            "Consigli per la Registrazione",
            "Non serve essere perfetti. Serve essere chiari. "
            "Segui questi consigli pratici per registrare senza ansia.")

    tips = [
        ("1. Audio", ["Usa un microfono (anche del telefono)", "Evita ambienti rumorosi", "Fai un test prima di iniziare"]),
        ("2. Luce", ["Luce frontale (finestra o lampada davanti a te)", "Evita controluce", "Luce naturale e' la migliore"]),
        ("3. Camera", ["Guarda in camera", "Tieni lo sguardo stabile", "Posiziona la camera all'altezza degli occhi"]),
        ("4. Linguaggio", ["Parla semplice", "Evita termini complessi", "Come se spiegassi a un amico"]),
        ("5. Errori", ["Se sbagli, continua", "Puoi tagliare dopo", "Meglio naturale che perfetto"]),
        ("6. Energia", ["Parla come se stessi spiegando a una persona", "Non leggere in modo monotono", "Sorridi, fai pause"]),
        ("7. Durata", ["Meglio chiaro che lungo", "15-25 minuti totali", "Se dura troppo, taglia"]),
    ]

    for title, points in tips:
        story.append(Paragraph(title, styles["SectionHead"]))
        for p in points:
            story.append(Paragraph(f"&bull; {p}", styles["BrandBody"]))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "La tua masterclass non deve essere perfetta. Deve essere utile.",
        styles["GoldBox"]
    ))


# ═══════════════════════════════════════════════════════════
# ROUTING
# ═══════════════════════════════════════════════════════════
MATERIAL_MAP = {
    "posizionamento": {
        "guida": ("guida_posizionamento.pdf", _guida_posizionamento),
        "template-target": ("template_target_ideale.pdf", _template_target),
        "esempi": ("esempi_posizionamento.pdf", _esempi_posizionamento),
    },
    "masterclass": {
        "template-script": ("template_script_masterclass.pdf", _template_script_masterclass),
        "struttura-tipo": ("struttura_masterclass_tipo.pdf", _struttura_masterclass_tipo),
        "consigli-registrazione": ("consigli_registrazione.pdf", _consigli_registrazione),
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
