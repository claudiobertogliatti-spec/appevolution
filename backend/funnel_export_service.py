"""
EVOLUTION PRO - Funnel Export Service
Generates formatted documents for Systeme.io manual import
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Storage for exports
EXPORTS_PATH = Path("/app/storage/funnel_exports")
EXPORTS_PATH.mkdir(parents=True, exist_ok=True)


class FunnelExportService:
    """
    Generates export documents for Systeme.io funnel creation
    - Structured HTML document with all copy
    - Section-by-section breakdown
    - Ready to copy/paste into Systeme.io builder
    """
    
    def generate_funnel_export(
        self,
        partner_data: Dict,
        funnel_sections: List[Dict],
        approved_sections: List[int]
    ) -> Dict:
        """
        Generate a complete funnel export document
        
        Args:
            partner_data: Partner info (name, niche, offer, etc.)
            funnel_sections: List of funnel section content
            approved_sections: List of approved section IDs
            
        Returns:
            Dict with HTML content, filename, and download path
        """
        partner_name = partner_data.get("name", "Partner")
        partner_niche = partner_data.get("niche", "coaching")
        
        # Generate HTML document
        html_content = self._generate_html_document(
            partner_data,
            funnel_sections,
            approved_sections
        )
        
        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"funnel_export_{partner_name.replace(' ', '_')}_{timestamp}.html"
        filepath = EXPORTS_PATH / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return {
            "success": True,
            "filename": filename,
            "filepath": str(filepath),
            "html_content": html_content,
            "sections_exported": len(approved_sections),
            "generated_at": datetime.now().isoformat(),
            "partner_name": partner_name
        }
    
    def _generate_html_document(
        self,
        partner_data: Dict,
        funnel_sections: List[Dict],
        approved_sections: List[int]
    ) -> str:
        """Generate the formatted HTML export document"""
        
        partner_name = partner_data.get("name", "Partner")
        partner_niche = partner_data.get("niche", "")
        offer_name = partner_data.get("offer_name", "Programma Acceleratore")
        offer_price = partner_data.get("offer_price", "297€")
        
        # Build sections HTML
        sections_html = ""
        
        for section in funnel_sections:
            section_id = section.get("id", 0)
            is_approved = section_id in approved_sections
            
            sections_html += self._render_section(section, is_approved)
        
        # Complete HTML document
        html = f"""<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Funnel Export - {partner_name} | Evolution PRO</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #f8f9fa; 
            color: #1a1a2e; 
            line-height: 1.6;
        }}
        .container {{ max-width: 900px; margin: 0 auto; padding: 40px 20px; }}
        
        /* Header */
        .header {{
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 40px;
            border-radius: 16px;
            margin-bottom: 30px;
        }}
        .header h1 {{ font-size: 28px; margin-bottom: 10px; }}
        .header p {{ opacity: 0.8; font-size: 14px; }}
        .header .badge {{
            display: inline-block;
            background: #F2C418;
            color: #1a1a2e;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 15px;
        }}
        
        /* Partner Info */
        .partner-info {{
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
            border-left: 4px solid #7B68AE;
        }}
        .partner-info h3 {{ color: #7B68AE; margin-bottom: 15px; }}
        .partner-info .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
        .partner-info .item {{ }}
        .partner-info .label {{ font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }}
        .partner-info .value {{ font-weight: 600; color: #1a1a2e; margin-top: 4px; }}
        
        /* Section */
        .section {{
            background: white;
            border-radius: 16px;
            margin-bottom: 25px;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }}
        .section.approved {{ border-color: #34C77B; }}
        .section.pending {{ border-color: #F59E0B; }}
        
        .section-header {{
            padding: 20px 25px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            gap: 15px;
        }}
        .section.approved .section-header {{ background: #EAFAF1; }}
        .section.pending .section-header {{ background: #FEF3C7; }}
        
        .section-icon {{ font-size: 28px; }}
        .section-title {{ font-weight: 700; font-size: 18px; }}
        .section-subtitle {{ font-size: 13px; color: #666; margin-top: 4px; }}
        .section-status {{
            margin-left: auto;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
        }}
        .section.approved .section-status {{ background: #34C77B; color: white; }}
        .section.pending .section-status {{ background: #F59E0B; color: white; }}
        
        .section-content {{ padding: 25px; }}
        
        /* Content blocks */
        .content-block {{
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 3px solid #7B68AE;
        }}
        .content-block:last-child {{ margin-bottom: 0; }}
        .content-label {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #7B68AE;
            font-weight: 700;
            margin-bottom: 8px;
        }}
        .content-value {{
            font-size: 15px;
            color: #1a1a2e;
        }}
        .content-value.headline {{
            font-size: 20px;
            font-weight: 700;
            line-height: 1.3;
        }}
        .content-value.cta {{
            display: inline-block;
            background: #7B68AE;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 700;
        }}
        
        /* List */
        .content-list {{
            list-style: none;
            padding: 0;
        }}
        .content-list li {{
            padding: 8px 0 8px 25px;
            position: relative;
            border-bottom: 1px solid #eee;
        }}
        .content-list li:last-child {{ border-bottom: none; }}
        .content-list li::before {{
            content: "✓";
            position: absolute;
            left: 0;
            color: #34C77B;
            font-weight: bold;
        }}
        
        /* Email sequence */
        .email-item {{
            display: flex;
            gap: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 10px;
        }}
        .email-timing {{
            background: #7B68AE;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            height: fit-content;
        }}
        .email-content {{ flex: 1; }}
        .email-subject {{ font-weight: 700; margin-bottom: 4px; }}
        .email-desc {{ font-size: 13px; color: #666; }}
        
        /* Footer */
        .footer {{
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 13px;
        }}
        .footer strong {{ color: #7B68AE; }}
        
        /* Copy button hint */
        .copy-hint {{
            background: #FFF8DC;
            border: 1px dashed #F2C418;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #8B7500;
        }}
        .copy-hint strong {{ color: #1a1a2e; }}
        
        /* Print styles */
        @media print {{
            body {{ background: white; }}
            .container {{ padding: 20px; }}
            .section {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📄 Funnel Export per Systeme.io</h1>
            <p>Documento generato da Evolution PRO — Pronto per l'importazione manuale</p>
            <span class="badge">PARTNER: {partner_name.upper()}</span>
        </div>
        
        <!-- Copy Hint -->
        <div class="copy-hint">
            <strong>💡 Come usare questo documento:</strong><br>
            Copia ogni sezione e incollala nel builder di Systeme.io. I testi sono già pronti — basta copiare!
        </div>
        
        <!-- Partner Info -->
        <div class="partner-info">
            <h3>👤 Informazioni Partner</h3>
            <div class="grid">
                <div class="item">
                    <div class="label">Nome</div>
                    <div class="value">{partner_name}</div>
                </div>
                <div class="item">
                    <div class="label">Nicchia</div>
                    <div class="value">{partner_niche or "Non specificata"}</div>
                </div>
                <div class="item">
                    <div class="label">Offerta</div>
                    <div class="value">{offer_name}</div>
                </div>
                <div class="item">
                    <div class="label">Prezzo</div>
                    <div class="value">{offer_price}</div>
                </div>
            </div>
        </div>
        
        <!-- Funnel Sections -->
        {sections_html}
        
        <!-- Footer -->
        <div class="footer">
            <p>Generato da <strong>Evolution PRO OS</strong> · {datetime.now().strftime("%d/%m/%Y alle %H:%M")}</p>
            <p>Copy approvato e pronto per Systeme.io</p>
        </div>
    </div>
</body>
</html>"""
        
        return html
    
    def _render_section(self, section: Dict, is_approved: bool) -> str:
        """Render a single funnel section to HTML"""
        
        section_id = section.get("id", 0)
        icon = section.get("icon", "📄")
        title = section.get("title", "Sezione")
        subtitle = section.get("subtitle", "")
        content = section.get("content", {})
        
        status_class = "approved" if is_approved else "pending"
        status_text = "✓ APPROVATO" if is_approved else "⏳ IN ATTESA"
        
        # Build content blocks based on section type
        content_html = ""
        
        if section_id == 1:  # Opt-in Page
            content_html = f"""
                <div class="content-block">
                    <div class="content-label">Headline principale</div>
                    <div class="content-value headline">{content.get('headline', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Sottotitolo</div>
                    <div class="content-value">{content.get('sottotitolo', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Promessa / Hook</div>
                    <div class="content-value">{content.get('promessa', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Testo introduttivo</div>
                    <div class="content-value">{content.get('quote', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Campi form</div>
                    <div class="content-value">{content.get('campi', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Call to Action (Pulsante)</div>
                    <div class="content-value cta">{content.get('cta', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Dopo invio form</div>
                    <div class="content-value">{content.get('dopoInvio', '')}</div>
                </div>
            """
        
        elif section_id == 2:  # Landing Masterclass
            struttura = content.get('struttura', [])
            struttura_html = "".join([f"<li>{item}</li>" for item in struttura])
            
            content_html = f"""
                <div class="content-block">
                    <div class="content-label">Titolo pagina</div>
                    <div class="content-value headline">{content.get('titolo', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Video</div>
                    <div class="content-value">{content.get('video', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Testo sotto video</div>
                    <div class="content-value">{content.get('sottoVideo', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Struttura pagina</div>
                    <ul class="content-list">{struttura_html}</ul>
                </div>
                <div class="content-block">
                    <div class="content-label">Call to Action</div>
                    <div class="content-value cta">{content.get('ctaText', '')}</div>
                </div>
            """
        
        elif section_id == 3:  # Ordine + Email
            include = content.get('include', [])
            include_html = "".join([f"<li>{item}</li>" for item in include])
            
            emails = content.get('emails', [])
            emails_html = ""
            for email in emails:
                emails_html += f"""
                    <div class="email-item">
                        <div class="email-timing">{email.get('timing', '')}</div>
                        <div class="email-content">
                            <div class="email-subject">{email.get('subject', '')}</div>
                            <div class="email-desc">{email.get('desc', '')}</div>
                        </div>
                    </div>
                """
            
            content_html = f"""
                <div class="content-block">
                    <div class="content-label">Nome offerta</div>
                    <div class="content-value headline">{content.get('offerta', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Prezzo</div>
                    <div class="content-value">
                        <span style="font-size: 24px; font-weight: 700; color: #34C77B;">{content.get('prezzo', '')}</span>
                        <span style="text-decoration: line-through; color: #999; margin-left: 10px;">{content.get('prezzoOriginale', '')}</span>
                        <span style="background: #EF4444; color: white; padding: 4px 10px; border-radius: 5px; margin-left: 10px; font-size: 12px;">{content.get('sconto', '')}</span>
                    </div>
                </div>
                <div class="content-block">
                    <div class="content-label">Scadenza offerta</div>
                    <div class="content-value">{content.get('scadenza', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Cosa include</div>
                    <ul class="content-list">{include_html}</ul>
                </div>
                <div class="content-block">
                    <div class="content-label">Metodo pagamento</div>
                    <div class="content-value">{content.get('pagamento', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Garanzia</div>
                    <div class="content-value">{content.get('garanzia', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">📧 Sequenza 6 Email Automatiche</div>
                    {emails_html}
                </div>
            """
        
        elif section_id == 4:  # Thank You
            passi = content.get('prossimiPassi', [])
            passi_html = ""
            for passo in passi:
                passi_html += f"""
                    <li><strong>Passo {passo.get('step', '')}:</strong> {passo.get('text', '')}</li>
                """
            
            content_html = f"""
                <div class="content-block">
                    <div class="content-label">Headline</div>
                    <div class="content-value headline">{content.get('headline', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Messaggio di conferma</div>
                    <div class="content-value">{content.get('messaggio', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Prossimi passi per il cliente</div>
                    <ul class="content-list">{passi_html}</ul>
                </div>
                <div class="content-block">
                    <div class="content-label">Video di benvenuto</div>
                    <div class="content-value">{content.get('video', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">Call to Action</div>
                    <div class="content-value cta">{content.get('cta', '')}</div>
                </div>
                <div class="content-block">
                    <div class="content-label">WhatsApp automatico</div>
                    <div class="content-value">{content.get('whatsapp', '')}</div>
                </div>
            """
        
        return f"""
        <div class="section {status_class}">
            <div class="section-header">
                <span class="section-icon">{icon}</span>
                <div>
                    <div class="section-title">{title}</div>
                    <div class="section-subtitle">{subtitle}</div>
                </div>
                <span class="section-status">{status_text}</span>
            </div>
            <div class="section-content">
                {content_html}
            </div>
        </div>
        """
    
    def list_exports(self, partner_id: Optional[str] = None) -> List[Dict]:
        """List all export files"""
        exports = []
        
        for file in EXPORTS_PATH.glob("*.html"):
            stat = file.stat()
            exports.append({
                "filename": file.name,
                "filepath": str(file),
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        
        return sorted(exports, key=lambda x: x["created_at"], reverse=True)


# Singleton instance
funnel_export_service = FunnelExportService()
