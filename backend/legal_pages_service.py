"""
EVOLUTION PRO - Legal Pages Generator (ANDREA)
AI-powered generation of legal documents for partner websites
"""

import os
import logging
from datetime import datetime
from typing import Dict, Optional
import httpx

logger = logging.getLogger(__name__)


# Legal document templates (Italian)
LEGAL_TEMPLATES = {
    "privacy_policy": {
        "title": "Informativa sulla Privacy",
        "sections": [
            "Titolare del trattamento",
            "Dati raccolti",
            "Finalità del trattamento",
            "Base giuridica",
            "Destinatari dei dati",
            "Trasferimento dati extra-UE",
            "Conservazione dei dati",
            "Diritti dell'interessato",
            "Cookie",
            "Modifiche all'informativa",
            "Contatti"
        ]
    },
    "terms_conditions": {
        "title": "Termini e Condizioni",
        "sections": [
            "Premessa",
            "Definizioni",
            "Oggetto del servizio",
            "Registrazione e accesso",
            "Obblighi dell'utente",
            "Proprietà intellettuale",
            "Limitazione di responsabilità",
            "Garanzie e rimborsi",
            "Recesso",
            "Foro competente",
            "Legge applicabile"
        ]
    },
    "cookie_policy": {
        "title": "Cookie Policy",
        "sections": [
            "Cosa sono i cookie",
            "Tipi di cookie utilizzati",
            "Cookie tecnici",
            "Cookie analitici",
            "Cookie di profilazione",
            "Cookie di terze parti",
            "Come gestire i cookie",
            "Consenso",
            "Aggiornamenti"
        ]
    },
    "disclaimer": {
        "title": "Disclaimer",
        "sections": [
            "Esclusione di responsabilità",
            "Contenuti informativi",
            "Risultati non garantiti",
            "Link esterni",
            "Proprietà intellettuale",
            "Limitazioni"
        ]
    }
}


class LegalPagesGenerator:
    """
    Generates legal pages (Privacy Policy, T&C, Cookie Policy, Disclaimer)
    using AI for personalization based on business data
    """
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY', '')
    
    async def generate_legal_page(
        self,
        page_type: str,
        business_data: Dict,
        custom_sections: Optional[list] = None
    ) -> Dict:
        """
        Generate a legal page using AI
        
        Args:
            page_type: privacy_policy, terms_conditions, cookie_policy, disclaimer
            business_data: Dictionary with business information:
                - business_name: Nome azienda
                - owner_name: Nome titolare
                - vat_number: P.IVA
                - address: Indirizzo sede legale
                - email: Email contatto
                - pec: PEC (optional)
                - phone: Telefono (optional)
                - website: URL sito web
                - business_type: Tipo di business (es. "vendita corsi online")
                - data_collected: Tipi di dati raccolti (es. ["email", "nome", "telefono"])
                - third_party_services: Servizi terzi usati (es. ["Stripe", "Mailchimp"])
            custom_sections: Additional sections to include
            
        Returns:
            Dict with HTML content, plain text, and metadata
        """
        if page_type not in LEGAL_TEMPLATES:
            return {
                "success": False,
                "error": f"Unknown page type: {page_type}. Valid types: {list(LEGAL_TEMPLATES.keys())}"
            }
        
        if not self.api_key:
            return {"success": False, "error": "API key not configured"}
        
        template = LEGAL_TEMPLATES[page_type]
        
        # Build prompt for AI
        prompt = self._build_legal_prompt(page_type, template, business_data, custom_sections)
        
        try:
            # Call Claude API via Emergent
            content = await self._call_claude(prompt)
            
            if not content:
                return {"success": False, "error": "AI generation failed"}
            
            # Parse and format response
            html_content = self._format_as_html(content, template["title"], business_data)
            
            return {
                "success": True,
                "page_type": page_type,
                "title": template["title"],
                "content_html": html_content,
                "content_text": content,
                "generated_at": datetime.now().isoformat(),
                "business_name": business_data.get("business_name", ""),
                "sections": template["sections"]
            }
            
        except Exception as e:
            logger.error(f"Legal page generation failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _build_legal_prompt(
        self,
        page_type: str,
        template: Dict,
        business_data: Dict,
        custom_sections: Optional[list]
    ) -> str:
        """Build the prompt for legal page generation"""
        
        sections = template["sections"]
        if custom_sections:
            sections = sections + custom_sections
        
        # Business context
        business_context = f"""
DATI AZIENDALI:
- Ragione sociale: {business_data.get('business_name', '[NOME AZIENDA]')}
- Titolare: {business_data.get('owner_name', '[NOME TITOLARE]')}
- P.IVA: {business_data.get('vat_number', '[P.IVA]')}
- Sede legale: {business_data.get('address', '[INDIRIZZO]')}
- Email: {business_data.get('email', '[EMAIL]')}
- PEC: {business_data.get('pec', '[PEC]') or 'Non specificata'}
- Telefono: {business_data.get('phone', '[TELEFONO]') or 'Non specificato'}
- Sito web: {business_data.get('website', '[SITO WEB]')}
- Tipo di business: {business_data.get('business_type', 'vendita corsi online')}
"""
        
        data_collected = business_data.get('data_collected', ['email', 'nome', 'cognome'])
        third_party = business_data.get('third_party_services', [])
        
        if page_type == "privacy_policy":
            specific_context = f"""
DATI RACCOLTI: {', '.join(data_collected)}
SERVIZI TERZI UTILIZZATI: {', '.join(third_party) if third_party else 'Nessuno specificato'}
"""
        elif page_type == "terms_conditions":
            specific_context = f"""
TIPO DI SERVIZIO: {business_data.get('business_type', 'vendita corsi online')}
POLITICA RIMBORSI: {business_data.get('refund_policy', '14 giorni dalla data di acquisto')}
"""
        elif page_type == "cookie_policy":
            cookies_used = business_data.get('cookies_used', ['tecnici', 'analitici'])
            specific_context = f"""
TIPI DI COOKIE UTILIZZATI: {', '.join(cookies_used)}
SERVIZI ANALITICI: {', '.join([s for s in third_party if 'analytics' in s.lower() or 'google' in s.lower()]) or 'Google Analytics'}
"""
        else:  # disclaimer
            specific_context = f"""
TIPO DI CONTENUTI: {business_data.get('content_type', 'corsi di formazione e consulenza')}
"""
        
        prompt = f"""Sei un avvocato esperto in diritto digitale e GDPR italiano. 
Genera una {template['title']} professionale, completa e conforme alla normativa italiana ed europea.

{business_context}
{specific_context}

SEZIONI DA INCLUDERE:
{chr(10).join(f'- {s}' for s in sections)}

REQUISITI:
1. Il documento deve essere in italiano formale e professionale
2. Deve essere conforme al GDPR (Regolamento UE 2016/679)
3. Deve essere conforme al D.Lgs. 196/2003 (Codice Privacy italiano)
4. Deve includere tutti i riferimenti normativi necessari
5. Deve essere completo e pronto per la pubblicazione
6. Usa i dati aziendali forniti dove appropriato
7. Data di ultimo aggiornamento: {datetime.now().strftime('%d/%m/%Y')}

Genera il documento completo con tutte le sezioni richieste.
Usa markdown per la formattazione (## per titoli sezione, ### per sottosezioni, elenchi puntati dove appropriato).
"""
        
        return prompt
    
    async def _call_claude(self, prompt: str) -> str:
        """Call Claude API via Emergent"""
        try:
            # Use emergentintegrations for Claude
            from emergentintegrations.llm.anthropic import AnthropicClient
            
            client = AnthropicClient(api_key=self.api_key)
            response = await client.generate(
                prompt=prompt,
                model="claude-sonnet-4-20250514",
                max_tokens=8000
            )
            
            return response
            
        except ImportError:
            # Fallback to direct API call
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 8000,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("content", [{}])[0].get("text", "")
                else:
                    logger.error(f"Claude API error: {response.status_code} - {response.text}")
                    return ""
        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
            return ""
    
    def _format_as_html(self, markdown_content: str, title: str, business_data: Dict) -> str:
        """Convert markdown content to styled HTML"""
        import re
        
        # Basic markdown to HTML conversion
        html = markdown_content
        
        # Headers
        html = re.sub(r'^### (.+)$', r'<h3 class="legal-h3">\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.+)$', r'<h2 class="legal-h2">\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.+)$', r'<h1 class="legal-h1">\1</h1>', html, flags=re.MULTILINE)
        
        # Bold and italic
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
        
        # Lists
        html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
        html = re.sub(r'(<li>.*</li>\n)+', r'<ul class="legal-list">\g<0></ul>', html)
        
        # Paragraphs
        paragraphs = html.split('\n\n')
        processed = []
        for p in paragraphs:
            p = p.strip()
            if p and not p.startswith('<'):
                p = f'<p class="legal-paragraph">{p}</p>'
            processed.append(p)
        html = '\n'.join(processed)
        
        # Wrap in styled container
        styled_html = f"""
<div class="legal-document" style="font-family: 'Georgia', serif; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 40px;">
    <style>
        .legal-document h1.legal-h1 {{ font-size: 28px; color: #1a2332; margin-bottom: 30px; border-bottom: 2px solid #F5C518; padding-bottom: 15px; }}
        .legal-document h2.legal-h2 {{ font-size: 20px; color: #1a2332; margin-top: 30px; margin-bottom: 15px; }}
        .legal-document h3.legal-h3 {{ font-size: 16px; color: #444; margin-top: 20px; margin-bottom: 10px; }}
        .legal-document p.legal-paragraph {{ margin-bottom: 15px; text-align: justify; }}
        .legal-document ul.legal-list {{ margin-left: 20px; margin-bottom: 15px; }}
        .legal-document li {{ margin-bottom: 8px; }}
        .legal-document strong {{ color: #1a2332; }}
        .legal-header {{ background: #1a2332; color: white; padding: 20px; margin: -40px -40px 30px -40px; }}
        .legal-header h1 {{ color: #F5C518; margin: 0; font-size: 24px; }}
        .legal-footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
    </style>
    
    <div class="legal-header">
        <h1>{title}</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">{business_data.get('business_name', '')}</p>
    </div>
    
    {html}
    
    <div class="legal-footer">
        <p><strong>Ultimo aggiornamento:</strong> {datetime.now().strftime('%d/%m/%Y')}</p>
        <p><strong>Titolare:</strong> {business_data.get('business_name', '')} - P.IVA {business_data.get('vat_number', '')}</p>
        <p><strong>Contatti:</strong> {business_data.get('email', '')}</p>
    </div>
</div>
"""
        return styled_html
    
    async def generate_all_legal_pages(self, business_data: Dict) -> Dict:
        """Generate all legal pages at once"""
        results = {}
        
        for page_type in LEGAL_TEMPLATES.keys():
            logger.info(f"Generating {page_type}...")
            result = await self.generate_legal_page(page_type, business_data)
            results[page_type] = result
        
        success_count = sum(1 for r in results.values() if r.get("success"))
        
        return {
            "success": success_count == len(LEGAL_TEMPLATES),
            "pages_generated": success_count,
            "total_pages": len(LEGAL_TEMPLATES),
            "results": results,
            "generated_at": datetime.now().isoformat()
        }
    
    def get_template_info(self, page_type: str) -> Dict:
        """Get template information for a page type"""
        if page_type not in LEGAL_TEMPLATES:
            return {"error": f"Unknown page type: {page_type}"}
        
        return {
            "page_type": page_type,
            **LEGAL_TEMPLATES[page_type]
        }
    
    def list_available_templates(self) -> Dict:
        """List all available legal page templates"""
        return {
            "templates": [
                {
                    "type": k,
                    "title": v["title"],
                    "sections_count": len(v["sections"])
                }
                for k, v in LEGAL_TEMPLATES.items()
            ]
        }


# Singleton instance
legal_generator = LegalPagesGenerator()
