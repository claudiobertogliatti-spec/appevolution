"""
Contract Signing Router - Evolution PRO
Gestione firma digitale contratto di partnership
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
from io import BytesIO

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contract", tags=["contract"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'evolution_pro')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')


class ContractSignRequest(BaseModel):
    partner_id: str
    signature_base64: str
    clausole_vessatorie_approved: bool = True
    contract_version: str = "1.0"


class ContractStatusResponse(BaseModel):
    signed: bool
    signed_at: Optional[str] = None
    contract_version: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# CONTRACT TEXT (same as frontend)
# ═══════════════════════════════════════════════════════════════════════════════

CONTRACT_TEXT = """Contratto di Collaborazione in Partnership per la Creazione, Promozione e Vendita di Videocorsi Digitali

TRA
Evolution PRO LLC, con sede legale in 8 The Green, Ste A, Dover, DE 19901, USA, File Number 2394173 Delaware Division of Corporations, EIN 30-1375330, in persona del legale rappresentante Claudio Bertogliatti, di seguito "Evolution PRO" o anche "Agenzia";

e

Il Partner sottoscrittore del presente contratto digitale.

[... TESTO COMPLETO DEL CONTRATTO ...]

ARTICOLO 16 – ACCETTAZIONE CONSAPEVOLE DEL MODELLO

Il Partner dichiara di aver compreso e accettato che:
- la Partnership ha natura di collaborazione strategica e operativa e non costituisce prestazione di risultato
- il successo economico del progetto dipende da molteplici fattori non controllabili da Evolution PRO
- il corrispettivo iniziale remunera l'accesso al sistema, al know-how e alle attività operative, indipendentemente dai risultati economici
- eventuali contestazioni relative a performance, vendite o risultati non costituiscono inadempimento contrattuale
"""


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/sign")
async def sign_contract(request: ContractSignRequest, req: Request):
    """
    Firma digitale del contratto di partnership.
    
    - Salva la firma nel documento partner
    - Genera PDF del contratto firmato
    - Invia email di conferma al partner
    """
    try:
        # Verifica partner esistente
        partner = await db.partners.find_one({"id": request.partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner non trovato")
        
        # Verifica se già firmato
        if partner.get("contract", {}).get("signed_at"):
            return {
                "success": True,
                "message": "Contratto già firmato",
                "signed_at": partner["contract"]["signed_at"]
            }
        
        # Estrai informazioni client
        client_ip = req.client.host if req.client else "unknown"
        user_agent = req.headers.get("user-agent", "unknown")
        
        now = datetime.now(timezone.utc)
        
        # Prepara dati contratto
        contract_data = {
            "version": request.contract_version,
            "signed_at": now.isoformat(),
            "signature_base64": request.signature_base64,
            "ip_address": client_ip,
            "user_agent": user_agent,
            "clausole_vessatorie_approved": request.clausole_vessatorie_approved
        }
        
        # Aggiorna partner con dati contratto
        await db.partners.update_one(
            {"id": request.partner_id},
            {"$set": {
                "contract": contract_data,
                "contract_signed": True,
                "contract_signed_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        
        # Genera PDF del contratto
        pdf_url = None
        try:
            pdf_url = await generate_contract_pdf(partner, contract_data)
        except Exception as e:
            logger.error(f"Errore generazione PDF: {e}")
        
        # Invia email di conferma
        try:
            await send_contract_email(partner, pdf_url)
        except Exception as e:
            logger.error(f"Errore invio email: {e}")
        
        # Log evento
        await db.contract_events.insert_one({
            "partner_id": request.partner_id,
            "partner_name": partner.get("name", ""),
            "event": "contract_signed",
            "contract_version": request.contract_version,
            "ip_address": client_ip,
            "timestamp": now.isoformat()
        })
        
        logger.info(f"[CONTRACT] Contratto firmato da {partner.get('name', '')} ({request.partner_id})")
        
        return {
            "success": True,
            "message": "Contratto firmato con successo",
            "signed_at": now.isoformat(),
            "pdf_url": pdf_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CONTRACT] Errore firma: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{partner_id}")
async def get_contract_status(partner_id: str):
    """
    Verifica stato firma contratto per un partner.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "contract": 1})
    
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")
    
    contract = partner.get("contract", {})
    
    # Handle case where contract is not a dict
    if not isinstance(contract, dict):
        contract = {}
    
    return {
        "signed": bool(contract.get("signed_at")),
        "signed_at": contract.get("signed_at"),
        "contract_version": contract.get("version")
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_contract_pdf(partner: dict, contract_data: dict) -> Optional[str]:
    """
    Genera PDF del contratto firmato usando ReportLab.
    Carica su Cloudinary e ritorna l'URL.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
        from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='ContractTitle',
            parent=styles['Heading1'],
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        styles.add(ParagraphStyle(
            name='ContractBody',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=14
        ))
        styles.add(ParagraphStyle(
            name='ArticleTitle',
            parent=styles['Heading2'],
            fontSize=11,
            spaceBefore=15,
            spaceAfter=8
        ))
        
        story = []
        
        # Titolo
        story.append(Paragraph(
            "CONTRATTO DI COLLABORAZIONE IN PARTNERSHIP",
            styles['ContractTitle']
        ))
        story.append(Spacer(1, 20))
        
        # Info Partner
        story.append(Paragraph(
            f"<b>Partner:</b> {partner.get('name', 'N/A')}",
            styles['ContractBody']
        ))
        story.append(Paragraph(
            f"<b>Email:</b> {partner.get('email', 'N/A')}",
            styles['ContractBody']
        ))
        story.append(Paragraph(
            f"<b>Data firma:</b> {contract_data.get('signed_at', 'N/A')}",
            styles['ContractBody']
        ))
        story.append(Paragraph(
            f"<b>Versione contratto:</b> {contract_data.get('version', '1.0')}",
            styles['ContractBody']
        ))
        story.append(Spacer(1, 20))
        
        # Testo contratto (semplificato per il PDF)
        for line in CONTRACT_TEXT.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line.startswith('ARTICOLO'):
                story.append(Paragraph(line, styles['ArticleTitle']))
            else:
                # Escape caratteri speciali per ReportLab
                line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(line, styles['ContractBody']))
        
        story.append(Spacer(1, 30))
        
        # Firma (immagine base64)
        story.append(Paragraph("<b>Firma del Partner:</b>", styles['ContractBody']))
        story.append(Spacer(1, 10))
        
        # Decodifica firma e aggiungi al PDF
        try:
            sig_data = contract_data.get('signature_base64', '')
            if sig_data.startswith('data:image'):
                sig_data = sig_data.split(',')[1]
            sig_bytes = base64.b64decode(sig_data)
            sig_buffer = BytesIO(sig_bytes)
            sig_img = RLImage(sig_buffer, width=200, height=80)
            story.append(sig_img)
        except Exception as e:
            logger.warning(f"Impossibile aggiungere firma al PDF: {e}")
            story.append(Paragraph("[Firma digitale applicata]", styles['ContractBody']))
        
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            f"IP: {contract_data.get('ip_address', 'N/A')}",
            styles['ContractBody']
        ))
        
        # Build PDF
        doc.build(story)
        
        # Upload to Cloudinary
        pdf_bytes = buffer.getvalue()
        
        try:
            import cloudinary
            import cloudinary.uploader
            
            cloudinary.config(
                cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
                api_key=os.environ.get('CLOUDINARY_API_KEY'),
                api_secret=os.environ.get('CLOUDINARY_API_SECRET')
            )
            
            result = cloudinary.uploader.upload(
                pdf_bytes,
                resource_type="raw",
                folder="contracts",
                public_id=f"contract_{partner.get('id')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                format="pdf"
            )
            
            return result.get('secure_url')
            
        except Exception as e:
            logger.warning(f"Cloudinary upload failed: {e}")
            # Salva localmente come fallback
            local_path = f"/tmp/contract_{partner.get('id')}.pdf"
            with open(local_path, 'wb') as f:
                f.write(pdf_bytes)
            return local_path
        
    except ImportError:
        logger.warning("ReportLab non installato, skip generazione PDF")
        return None
    except Exception as e:
        logger.error(f"Errore generazione PDF: {e}")
        return None


async def send_contract_email(partner: dict, pdf_url: Optional[str] = None):
    """
    Invia email di conferma firma contratto al partner.
    """
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP non configurato, skip invio email")
        return
    
    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.application import MIMEApplication
        
        partner_email = partner.get('email')
        partner_name = partner.get('name', 'Partner')
        
        if not partner_email:
            logger.warning("Email partner non disponibile")
            return
        
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = partner_email
        msg['Subject'] = f"Contratto Partnership firmato - Evolution PRO"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10B981;">Contratto firmato con successo!</h2>
                
                <p>Ciao <strong>{partner_name}</strong>,</p>
                
                <p>Grazie per aver firmato il Contratto di Collaborazione in Partnership con Evolution PRO.</p>
                
                <p>La tua firma digitale è stata registrata con successo. Da questo momento inizia ufficialmente la nostra collaborazione!</p>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1F2937;">Prossimi passi:</h3>
                    <ol style="margin: 0; padding-left: 20px;">
                        <li>Accedi alla tua dashboard partner</li>
                        <li>Completa il questionario di posizionamento</li>
                        <li>Preparati per la sessione di onboarding</li>
                    </ol>
                </div>
                
                {"<p>In allegato trovi copia del contratto firmato.</p>" if pdf_url else ""}
                
                <p>Per qualsiasi domanda, contattaci a <a href='mailto:assistenza@evolution-pro.it'>assistenza@evolution-pro.it</a></p>
                
                <p style="margin-top: 30px;">
                    A presto,<br>
                    <strong>Il Team Evolution PRO</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Allega PDF se disponibile
        if pdf_url and pdf_url.startswith('/tmp/'):
            try:
                with open(pdf_url, 'rb') as f:
                    pdf_attachment = MIMEApplication(f.read(), _subtype='pdf')
                    pdf_attachment.add_header('Content-Disposition', 'attachment', 
                                            filename=f'Contratto_Partnership_{partner_name}.pdf')
                    msg.attach(pdf_attachment)
            except Exception as e:
                logger.warning(f"Impossibile allegare PDF: {e}")
        
        # Invia email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        logger.info(f"[CONTRACT] Email inviata a {partner_email}")
        
    except Exception as e:
        logger.error(f"Errore invio email: {e}")
        raise
