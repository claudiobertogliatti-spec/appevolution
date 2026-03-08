"""
PDF Generator Service for Evolution PRO Analysis Documents
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
import os
import re

# Brand colors
BRAND_YELLOW = colors.HexColor("#F5C518")
BRAND_DARK = colors.HexColor("#1E2128")
BRAND_GRAY = colors.HexColor("#5F6572")
BRAND_LIGHT_BG = colors.HexColor("#FAFAF7")

def create_styles():
    """Create custom styles for the PDF"""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontSize=24,
        leading=30,
        textColor=BRAND_DARK,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Helvetica-Bold'
    ))
    
    # Section Header (H2)
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontSize=16,
        leading=20,
        textColor=BRAND_DARK,
        spaceBefore=25,
        spaceAfter=12,
        fontName='Helvetica-Bold',
        borderColor=BRAND_YELLOW,
        borderWidth=0,
        borderPadding=0,
    ))
    
    # Subsection Header (H3)
    styles.add(ParagraphStyle(
        name='SubHeader',
        fontSize=13,
        leading=16,
        textColor=BRAND_DARK,
        spaceBefore=15,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontSize=10,
        leading=14,
        textColor=BRAND_GRAY,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
        fontName='Helvetica'
    ))
    
    # Bold body text
    styles.add(ParagraphStyle(
        name='BodyBold',
        fontSize=10,
        leading=14,
        textColor=BRAND_DARK,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    ))
    
    # List item
    styles.add(ParagraphStyle(
        name='ListItem',
        fontSize=10,
        leading=14,
        textColor=BRAND_GRAY,
        leftIndent=15,
        spaceAfter=4,
        fontName='Helvetica',
        bulletIndent=5
    ))
    
    # Consideration box text
    styles.add(ParagraphStyle(
        name='Consideration',
        fontSize=10,
        leading=13,
        textColor=BRAND_DARK,
        fontName='Helvetica-Oblique',
        leftIndent=10,
        rightIndent=10,
        spaceBefore=8,
        spaceAfter=12
    ))
    
    # Footer style
    styles.add(ParagraphStyle(
        name='Footer',
        fontSize=9,
        textColor=BRAND_GRAY,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    ))
    
    # Esito style
    styles.add(ParagraphStyle(
        name='Esito',
        fontSize=14,
        leading=18,
        textColor=BRAND_DARK,
        alignment=TA_CENTER,
        spaceBefore=15,
        spaceAfter=15,
        fontName='Helvetica-Bold',
        backColor=colors.HexColor("#FEF9E7"),
        borderPadding=10
    ))
    
    return styles

def parse_markdown_to_elements(markdown_text, styles):
    """Parse markdown text and convert to ReportLab elements"""
    elements = []
    lines = markdown_text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            elements.append(Spacer(1, 6))
            i += 1
            continue
        
        # Main title (# )
        if line.startswith('# '):
            title = line[2:].strip()
            elements.append(Paragraph(title, styles['DocTitle']))
            elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_YELLOW, spaceBefore=5, spaceAfter=15))
            i += 1
            continue
        
        # Section header (## )
        if line.startswith('## '):
            header = line[3:].strip()
            elements.append(Spacer(1, 10))
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#ECEDEF"), spaceBefore=5, spaceAfter=5))
            elements.append(Paragraph(header, styles['SectionHeader']))
            i += 1
            continue
        
        # Subsection header (### )
        if line.startswith('### '):
            header = line[4:].strip()
            elements.append(Paragraph(header, styles['SubHeader']))
            i += 1
            continue
        
        # Horizontal rule
        if line == '---':
            elements.append(Spacer(1, 10))
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#ECEDEF"), spaceBefore=10, spaceAfter=10))
            i += 1
            continue
        
        # List items (- )
        if line.startswith('- '):
            item_text = line[2:].strip()
            item_text = process_inline_formatting(item_text)
            elements.append(Paragraph(f"• {item_text}", styles['ListItem']))
            i += 1
            continue
        
        # Numbered list items
        if re.match(r'^\d+\.\s', line):
            item_text = re.sub(r'^\d+\.\s', '', line).strip()
            item_text = process_inline_formatting(item_text)
            num = re.match(r'^(\d+)\.', line).group(1)
            elements.append(Paragraph(f"{num}. {item_text}", styles['ListItem']))
            i += 1
            continue
        
        # Bold lines (starts with **)
        if line.startswith('**') and ':**' in line:
            # This is a label: value pair
            text = process_inline_formatting(line)
            elements.append(Paragraph(text, styles['BodyBold']))
            i += 1
            continue
        
        # Consideration text
        if line.lower().startswith('**considerazioni:**') or line.lower().startswith('considerazioni:'):
            text = line.replace('**Considerazioni:**', '').replace('**considerazioni:**', '').replace('Considerazioni:', '').strip()
            text = process_inline_formatting(text)
            elements.append(Paragraph(f"💡 {text}", styles['Consideration']))
            i += 1
            continue
        
        # Check for esito (verdict)
        if '🟢' in line or '🟡' in line or '🔴' in line:
            text = process_inline_formatting(line)
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(text, styles['Esito']))
            elements.append(Spacer(1, 10))
            i += 1
            continue
        
        # Regular paragraph
        text = process_inline_formatting(line)
        elements.append(Paragraph(text, styles['CustomBody']))
        i += 1
    
    return elements

def process_inline_formatting(text):
    """Process inline markdown formatting (bold, italic)"""
    # Replace **text** with <b>text</b>
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    # Replace *text* with <i>text</i>
    text = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', text)
    # Handle emojis - keep them as is
    return text

def generate_analysis_pdf(analysis_text: str, cliente_nome: str, cliente_cognome: str) -> bytes:
    """Generate a branded PDF from the analysis markdown text"""
    
    buffer = BytesIO()
    
    # Create document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm
    )
    
    styles = create_styles()
    elements = []
    
    # Add logo header
    logo_path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'logo_evolutionpro.png')
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=5*cm, height=1.5*cm)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 20))
        except Exception as e:
            print(f"Could not load logo: {e}")
    
    # Parse and add markdown content
    content_elements = parse_markdown_to_elements(analysis_text, styles)
    elements.extend(content_elements)
    
    # Add footer section
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_YELLOW, spaceBefore=20, spaceAfter=15))
    
    footer_text = """<b>Evolution PRO</b><br/>
    Trasformiamo competenze reali in asset digitali sostenibili<br/>
    con metodo, serietà e visione di lungo periodo"""
    elements.append(Paragraph(footer_text, styles['Footer']))
    
    # Build PDF
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
