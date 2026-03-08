# PARTE 3: BACKEND SERVICES

## 📁 /app/backend/services/pdf_generator.py
```python
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
```

## 📁 /app/backend/cloudinary_service.py
```python
"""
Cloudinary Integration Service
File uploads for photos and audio (used by HeyGen avatar feature)
"""

import os
import time
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Initialize Cloudinary from environment
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

def init_cloudinary():
    """Initialize Cloudinary configuration"""
    if all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        logger.info("Cloudinary initialized successfully")
        return True
    else:
        logger.warning("Cloudinary credentials not configured")
        return False

# Initialize on module load
_cloudinary_initialized = init_cloudinary()


def is_cloudinary_configured() -> bool:
    """Check if Cloudinary is properly configured"""
    return _cloudinary_initialized


def generate_upload_signature(
    resource_type: str = "image",
    folder: str = "avatar-uploads"
) -> Dict[str, Any]:
    """
    Generate signed upload parameters for frontend direct upload
    
    Args:
        resource_type: "image" or "video" (video for audio files too)
        folder: Target folder in Cloudinary
        
    Returns:
        Dict with signature, timestamp, cloud_name, api_key, folder
    """
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    # Validate allowed folders
    ALLOWED_FOLDERS = ("avatar-uploads", "partner-photos", "partner-audio", "lessons")
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        raise ValueError(f"Invalid folder path: {folder}")
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        CLOUDINARY_API_SECRET
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": CLOUDINARY_CLOUD_NAME,
        "api_key": CLOUDINARY_API_KEY,
        "folder": folder,
        "resource_type": resource_type
    }


async def upload_file_direct(
    file_data: bytes,
    filename: str,
    resource_type: str = "image",
    folder: str = "avatar-uploads"
) -> Dict[str, Any]:
    """
    Upload file directly from backend (for audio blobs, etc.)
    
    Args:
        file_data: Raw file bytes
        filename: Original filename
        resource_type: "image", "video", or "raw" (use "video" for audio)
        folder: Target folder
        
    Returns:
        Dict with public_id, secure_url, etc.
    """
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    try:
        # For audio files, use "video" resource type in Cloudinary
        actual_resource_type = resource_type
        if filename.lower().endswith(('.wav', '.mp3', '.m4a', '.ogg', '.webm')):
            actual_resource_type = "video"  # Cloudinary treats audio as video
        
        result = cloudinary.uploader.upload(
            file_data,
            folder=folder,
            resource_type=actual_resource_type,
            public_id=f"{int(time.time())}_{filename.rsplit('.', 1)[0]}",
        )
        
        return {
            "success": True,
            "public_id": result.get("public_id"),
            "secure_url": result.get("secure_url"),
            "url": result.get("url"),
            "resource_type": result.get("resource_type"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }
        
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def delete_file(public_id: str, resource_type: str = "image") -> Dict[str, Any]:
    """
    Delete a file from Cloudinary
    
    Args:
        public_id: Cloudinary public ID
        resource_type: "image" or "video"
        
    Returns:
        Dict with success status
    """
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
            invalidate=True
        )
        return {
            "success": result.get("result") == "ok",
            "result": result.get("result")
        }
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def get_cloudinary_status() -> Dict[str, Any]:
    """Get Cloudinary configuration status"""
    return {
        "configured": is_cloudinary_configured(),
        "cloud_name": CLOUDINARY_CLOUD_NAME if is_cloudinary_configured() else None
    }
```

## 📁 /app/backend/systeme_mcp.py
```python
"""
Systeme.io MCP Integration Module
Permette agli agenti AI (GAIA, STEFANIA, MARTA, VALENTINA) di operare su Systeme.io
"""

import os
import httpx
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone

# Configurazione
SYSTEME_API_KEY = os.environ.get("SYSTEME_API_KEY", "")
SYSTEME_MCP_KEY = os.environ.get("SYSTEME_MCP_KEY", "")
SYSTEME_BASE_URL = "https://api.systeme.io/api"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SystemeMCPClient:
    """Client MCP per Systeme.io - utilizzato da tutti gli agenti AI"""
    
    def __init__(self, api_key: str = None, mcp_key: str = None):
        self.api_key = api_key or SYSTEME_API_KEY
        self.mcp_key = mcp_key or SYSTEME_MCP_KEY
        self.base_url = SYSTEME_BASE_URL
        self.headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        # Header aggiuntivo per operazioni MCP avanzate
        if self.mcp_key:
            self.headers["X-MCP-KEY"] = self.mcp_key
    
    async def _request(self, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
        """Esegue una richiesta all'API Systeme.io"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}{endpoint}"
            logger.info(f"Systeme.io MCP Request: {method} {url}")
            
            try:
                if method == "GET":
                    response = await client.get(url, headers=self.headers, params=params)
                elif method == "POST":
                    response = await client.post(url, headers=self.headers, json=data)
                elif method == "PUT":
                    response = await client.put(url, headers=self.headers, json=data)
                elif method == "PATCH":
                    response = await client.patch(url, headers=self.headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=self.headers)
                else:
                    raise ValueError(f"Metodo non supportato: {method}")
                
                logger.info(f"Response status: {response.status_code}")
                
                if response.status_code >= 400:
                    logger.error(f"Errore API: {response.text[:500]}")
                    return {"error": True, "status": response.status_code, "message": response.text[:200]}
                
                return response.json() if response.text else {"success": True}
                
            except Exception as e:
                logger.error(f"Errore richiesta: {e}")
                return {"error": True, "message": str(e)}
    
    # ==========================================================================
    # CONTATTI (usato da MARTA - CRM)
    # ==========================================================================
    
    async def get_contacts(self, limit: int = 100, page: int = 1) -> Dict:
        """Recupera lista contatti"""
        return await self._request("GET", f"/contacts?limit={limit}&page={page}")
    
    async def get_contact(self, contact_id: str) -> Dict:
        """Recupera singolo contatto"""
        return await self._request("GET", f"/contacts/{contact_id}")
    
    async def create_contact(self, email: str, first_name: str = None, last_name: str = None, tags: List[str] = None) -> Dict:
        """Crea nuovo contatto"""
        data = {"email": email}
        if first_name:
            data["firstName"] = first_name
        if last_name:
            data["lastName"] = last_name
        return await self._request("POST", "/contacts", data)
    
    async def update_contact(self, contact_id: str, data: Dict) -> Dict:
        """Aggiorna contatto esistente"""
        return await self._request("PUT", f"/contacts/{contact_id}", data)
    
    async def delete_contact(self, contact_id: str) -> Dict:
        """Elimina contatto"""
        return await self._request("DELETE", f"/contacts/{contact_id}")
    
    # ==========================================================================
    # TAG (usato da MARTA e STEFANIA)
    # ==========================================================================
    
    async def get_tags(self, limit: int = 100) -> Dict:
        """Recupera tutti i tag (con paginazione)"""
        all_tags = []
        page = 1
        while True:
            result = await self._request("GET", f"/tags?limit={limit}&page={page}")
            items = result.get("items", [])
            if not items:
                break
            all_tags.extend(items)
            if len(items) < limit:
                break
            page += 1
        return {"items": all_tags, "total": len(all_tags)}
    
    async def create_tag(self, name: str) -> Dict:
        """Crea nuovo tag"""
        return await self._request("POST", "/tags", {"name": name})
    
    async def add_tag_to_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Aggiunge tag a un contatto"""
        # tagId deve essere int
        return await self._request("POST", f"/contacts/{contact_id}/tags", {"tagId": int(tag_id)})
    
    async def remove_tag_from_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Rimuove tag da un contatto"""
        return await self._request("DELETE", f"/contacts/{contact_id}/tags/{tag_id}")
    
    # ==========================================================================
    # FUNNEL (usato da GAIA)
    # ==========================================================================
    
    async def get_funnels(self) -> Dict:
        """Recupera lista funnel"""
        return await self._request("GET", "/funnels")
    
    async def get_funnel(self, funnel_id: str) -> Dict:
        """Recupera dettagli funnel"""
        return await self._request("GET", f"/funnels/{funnel_id}")
    
    # ==========================================================================
    # CORSI (usato da ANDREA e ATLAS)
    # ==========================================================================
    
    async def get_courses(self) -> Dict:
        """Recupera lista corsi"""
        return await self._request("GET", "/courses")
    
    async def get_course(self, course_id: str) -> Dict:
        """Recupera dettagli corso"""
        return await self._request("GET", f"/courses/{course_id}")
    
    async def get_course_students(self, course_id: str, limit: int = 100) -> Dict:
        """Recupera studenti di un corso"""
        return await self._request("GET", f"/courses/{course_id}/students?limit={limit}")
    
    async def enroll_student(self, course_id: str, contact_id: str) -> Dict:
        """Iscrive studente a un corso"""
        return await self._request("POST", f"/courses/{course_id}/students", {"contactId": contact_id})
    
    # ==========================================================================
    # EMAIL CAMPAIGNS (usato da STEFANIA)
    # ==========================================================================
    
    async def get_campaigns(self) -> Dict:
        """Recupera campagne email"""
        return await self._request("GET", "/campaigns")
    
    async def get_campaign(self, campaign_id: str) -> Dict:
        """Recupera dettagli campagna"""
        return await self._request("GET", f"/campaigns/{campaign_id}")
    
    async def subscribe_to_campaign(self, campaign_id: str, contact_id: str) -> Dict:
        """Iscrive un contatto a una campagna email (automation)"""
        return await self._request("POST", f"/campaigns/{campaign_id}/subscribers", {"contactId": contact_id})
    
    # ==========================================================================
    # PRODOTTI E ORDINI (usato da ORION e MARTA)
    # ==========================================================================
    
    async def get_products(self) -> Dict:
        """Recupera lista prodotti"""
        return await self._request("GET", "/products")
    
    async def get_orders(self, limit: int = 100) -> Dict:
        """Recupera lista ordini"""
        return await self._request("GET", f"/orders?limit={limit}")
    
    async def get_order(self, order_id: str) -> Dict:
        """Recupera dettagli ordine"""
        return await self._request("GET", f"/orders/{order_id}")
    
    # ==========================================================================
    # AUTOMAZIONI E WORKFLOW (WRITE ACTIONS)
    # ==========================================================================
    
    async def trigger_automation(self, contact_id: str, tag_name: str) -> Dict:
        """
        Triggera un'automazione aggiungendo un tag specifico a un contatto.
        In Systeme.io, le automazioni sono collegate ai tag.
        """
        # Prima crea il tag se non esiste
        tags_result = await self.get_tags()
        tags = tags_result.get("items", [])
        
        tag_id = None
        for tag in tags:
            if tag.get("name", "").lower() == tag_name.lower():
                tag_id = tag.get("id")
                break
        
        if not tag_id:
            # Crea il tag
            create_result = await self.create_tag(tag_name)
            tag_id = create_result.get("id")
        
        if tag_id:
            return await self.add_tag_to_contact(contact_id, str(tag_id))
        
        return {"error": True, "message": "Impossibile creare/trovare il tag"}
    
    async def bulk_add_tag(self, contact_ids: List[str], tag_id: str) -> Dict:
        """Aggiunge un tag a multipli contatti"""
        results = []
        for contact_id in contact_ids:
            result = await self.add_tag_to_contact(contact_id, tag_id)
            results.append({"contact_id": contact_id, "result": result})
        return {"success": True, "results": results, "count": len(results)}
    
    async def move_contact_to_phase(self, contact_id: str, phase: str) -> Dict:
        """
        Sposta un contatto a una nuova fase del programma Evolution PRO.
        Rimuove tag fase precedente e aggiunge nuovo tag fase.
        """
        phase_tags = {
            "F0": "Fase_PRE_ONBOARDING",
            "F1": "Fase_ATTIVAZIONE", 
            "F2": "Fase_ALLINEAMENTO",
            "F3": "Fase_COPY_CORE",
            "F4": "Fase_OUTLINE",
            "F5": "Fase_REGISTRAZIONE",
            "F6": "Fase_ACCADEMIA",
            "F7": "Fase_PRE_LANCIO",
            "F8": "Fase_LANCIO",
            "F9": "Fase_OTTIMIZZAZIONE",
            "F10": "Fase_SCALABILITA"
        }
        
        target_tag = phase_tags.get(phase.upper())
        if not target_tag:
            return {"error": True, "message": f"Fase {phase} non valida"}
        
        # Ottieni tutti i tag
        tags_result = await self.get_tags()
        tags = tags_result.get("items", [])
        
        # Trova ID del tag target
        target_tag_id = None
        phase_tag_ids = []
        
        for tag in tags:
            tag_name = tag.get("name", "")
            if tag_name == target_tag:
                target_tag_id = tag.get("id")
            if tag_name.startswith("Fase_"):
                phase_tag_ids.append(tag.get("id"))
        
        # Rimuovi tutti i tag fase esistenti dal contatto
        for tag_id in phase_tag_ids:
            try:
                await self.remove_tag_from_contact(contact_id, str(tag_id))
            except:
                pass  # Ignora errori se il tag non era assegnato
        
        # Aggiungi il nuovo tag fase
        if target_tag_id:
            result = await self.add_tag_to_contact(contact_id, str(target_tag_id))
            return {
                "success": True, 
                "contact_id": contact_id, 
                "new_phase": phase,
                "tag_added": target_tag,
                "result": result
            }
        else:
            # Crea il tag se non esiste
            create_result = await self.create_tag(target_tag)
            new_tag_id = create_result.get("id")
            if new_tag_id:
                result = await self.add_tag_to_contact(contact_id, str(new_tag_id))
                return {
                    "success": True,
                    "contact_id": contact_id,
                    "new_phase": phase,
                    "tag_created": target_tag,
                    "result": result
                }
        
        return {"error": True, "message": "Impossibile aggiornare la fase"}
    
    async def send_notification_email(self, contact_id: str, notification_type: str) -> Dict:
        """
        Invia una notifica email aggiungendo un tag trigger.
        Le email sono configurate come automazioni in Systeme.io.
        """
        notification_tags = {
            "welcome": "Notify_Welcome",
            "phase_complete": "Notify_PhaseComplete",
            "reminder": "Notify_Reminder",
            "deadline": "Notify_Deadline",
            "feedback_request": "Notify_FeedbackRequest",
            "course_access": "Notify_CourseAccess",
            "payment_reminder": "Notify_PaymentReminder"
        }
        
        tag_name = notification_tags.get(notification_type.lower())
        if not tag_name:
            return {"error": True, "message": f"Tipo notifica '{notification_type}' non valido", "valid_types": list(notification_tags.keys())}
        
        return await self.trigger_automation(contact_id, tag_name)
    
    async def create_contact_with_phase(self, email: str, first_name: str, last_name: str, phase: str = "F1") -> Dict:
        """Crea un nuovo contatto e lo assegna a una fase specifica"""
        # Crea il contatto
        contact_result = await self.create_contact(email, first_name, last_name)
        
        if contact_result.get("error"):
            return contact_result
        
        contact_id = contact_result.get("id")
        if not contact_id:
            return {"error": True, "message": "Contatto creato ma ID non restituito"}
        
        # Assegna la fase
        phase_result = await self.move_contact_to_phase(str(contact_id), phase)
        
        return {
            "success": True,
            "contact": contact_result,
            "phase_assignment": phase_result
        }
    
    async def get_contacts_by_phase(self, phase: str, limit: int = 100) -> Dict:
        """Recupera tutti i contatti in una specifica fase"""
        phase_tags = {
            "F0": "Fase_PRE_ONBOARDING",
            "F1": "Fase_ATTIVAZIONE",
            "F2": "Fase_ALLINEAMENTO", 
            "F3": "Fase_COPY_CORE",
            "F4": "Fase_OUTLINE",
            "F5": "Fase_REGISTRAZIONE",
            "F6": "Fase_ACCADEMIA",
            "F7": "Fase_PRE_LANCIO",
            "F8": "Fase_LANCIO",
            "F9": "Fase_OTTIMIZZAZIONE",
            "F10": "Fase_SCALABILITA"
        }
        
        tag_name = phase_tags.get(phase.upper())
        if not tag_name:
            return {"error": True, "message": f"Fase {phase} non valida"}
        
        # Ottieni il tag ID
        tags_result = await self.get_tags()
        tags = tags_result.get("items", [])
        
        tag_id = None
        for tag in tags:
            if tag.get("name") == tag_name:
                tag_id = tag.get("id")
                break
        
        if not tag_id:
            return {"contacts": [], "phase": phase, "message": "Nessun contatto in questa fase"}
        
        # Recupera contatti con questo tag
        return await self._request("GET", f"/contacts?tagId={tag_id}&limit={limit}")


# ==========================================================================
# HELPER FUNCTIONS PER GLI AGENTI
# ==========================================================================

def get_systeme_client() -> SystemeMCPClient:
    """Factory function per ottenere client Systeme.io"""
    return SystemeMCPClient()


# Mapping agenti -> operazioni permesse (incluse azioni WRITE)
AGENT_PERMISSIONS = {
    "VALENTINA": [
        "get_contacts", "get_tags", "get_courses", "get_funnels",
        "move_contact_to_phase", "send_notification_email", "get_contacts_by_phase"
    ],
    "STEFANIA": [
        "get_contacts", "get_tags", "create_tag", "add_tag_to_contact", "get_campaigns",
        "subscribe_to_campaign", "trigger_automation", "bulk_add_tag", "send_notification_email"
    ],
    "ANDREA": [
        "get_courses", "get_course_students", "enroll_student",
        "send_notification_email"
    ],
    "GAIA": [
        "get_funnels", "get_funnel", "get_contacts", "create_contact",
        "create_contact_with_phase", "trigger_automation"
    ],
    "MARTA": [
        "get_contacts", "create_contact", "update_contact", "get_tags", 
        "add_tag_to_contact", "remove_tag_from_contact", "get_orders",
        "create_contact_with_phase", "move_contact_to_phase", "bulk_add_tag",
        "get_contacts_by_phase", "send_notification_email"
    ],
    "ORION": [
        "get_contacts", "get_products", "get_orders",
        "trigger_automation", "send_notification_email"
    ],
    "ATLAS": [
        "get_courses", "get_course_students", "get_contacts",
        "enroll_student", "send_notification_email"
    ],
    "LUCA": ["get_contacts", "get_tags", "get_contacts_by_phase"]  # Solo lettura per compliance
}


async def agent_systeme_action(agent_name: str, action: str, **kwargs) -> Dict:
    """
    Esegue un'azione Systeme.io per conto di un agente
    
    Args:
        agent_name: Nome dell'agente (VALENTINA, STEFANIA, ecc.)
        action: Nome dell'azione da eseguire
        **kwargs: Parametri per l'azione
    
    Returns:
        Risultato dell'operazione
    """
    # Verifica permessi
    allowed_actions = AGENT_PERMISSIONS.get(agent_name.upper(), [])
    if action not in allowed_actions:
        return {
            "error": True,
            "message": f"Agente {agent_name} non autorizzato per l'azione {action}",
            "allowed_actions": allowed_actions
        }
    
    # Esegui azione
    client = get_systeme_client()
    method = getattr(client, action, None)
    
    if not method:
        return {"error": True, "message": f"Azione {action} non trovata"}
    
    try:
        result = await method(**kwargs)
        return {
            "success": True,
            "agent": agent_name,
            "action": action,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "error": True,
            "agent": agent_name,
            "action": action,
            "message": str(e)
        }
```
