"""
Email Templates Management for Evolution PRO
Allows admin to edit email templates without deploy.
Templates are stored in MongoDB and cached in memory.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# Default templates - used if no custom template exists in DB
DEFAULT_TEMPLATES = {
    "partnership_welcome": {
        "subject": "Benvenuto in Evolution PRO — ecco come funziona il tuo spazio di lavoro",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #F2C418 0%, #FADA5E 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #1E2128; margin: 0; font-size: 24px;">Benvenuto in Evolution PRO!</h1>
    </div>
    
    <div style="padding: 30px; background: #fff; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 16px;">Ciao <strong>{{nome}}</strong>! 👋</p>
        
        <p>Hai ora accesso a <strong>due strumenti</strong> che lavorano insieme per costruire la tua Accademia Digitale:</p>
        
        <div style="background: #FAFAF7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F2C418;">
            <h3 style="color: #1E2128; margin-top: 0;">📱 App Evolution PRO</h3>
            <p style="margin-bottom: 0;">È il tuo <strong>pannello di controllo</strong>. Qui trovi il tuo percorso, i materiali, il supporto del team e monitori i tuoi progressi.</p>
            <p style="margin-top: 10px; margin-bottom: 0;"><strong>Accedi con:</strong> {{email}} e la password che hai scelto</p>
            <p style="margin-top: 10px;"><a href="https://app.evolution-pro.it" style="color: #F2C418; font-weight: bold;">→ Accedi all'App</a></p>
        </div>
        
        <div style="background: #FFF8E7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #FF9800;">
            <h3 style="color: #1E2128; margin-top: 0;">🎓 Systeme.io</h3>
            <p style="margin-bottom: 0;">È la piattaforma dove costruiamo il tuo funnel, le tue email automatiche e la tua area corsi. Il team Evolution lavora qui per te.</p>
            <p style="margin-top: 10px; margin-bottom: 0;"><strong>Riceverai a breve</strong> un invito separato da Systeme per attivare il tuo account.</p>
        </div>
        
        <div style="background: #E8F5E9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #1E2128; margin-top: 0;">✅ Non devi fare nulla ora</h3>
            <p style="margin-bottom: 0;">Il nostro team configurerà tutto per te. Ti avviseremo a ogni step del percorso.</p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Se hai domande, parla con <strong>Stefania</strong> direttamente dall'app — è il tuo assistente AI personale!
        </p>
    </div>
    
    <div style="background: #1E2128; padding: 20px; text-align: center; color: #999; font-size: 12px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0;">© 2026 Evolution PRO - Tutti i diritti riservati</p>
        <p style="margin: 5px 0 0 0; color: #F2C418;">Claudio Bertogliatti & Team</p>
    </div>
</body>
</html>
""",
        "description": "Email di benvenuto inviata quando viene attivata una partnership",
        "variables": ["nome", "email"],
        "category": "partnership"
    },
    
    "analisi_welcome": {
        "subject": "🎉 La tua Analisi Strategica è in preparazione!",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">La tua Analisi Strategica</h1>
    </div>
    
    <div style="padding: 30px; background: #fff; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 16px;">Ciao <strong>{{nome}}</strong>! 👋</p>
        
        <p>Grazie per aver acquistato l'Analisi Strategica! Il nostro team di AI sta elaborando il tuo profilo personalizzato.</p>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #1E2128; margin-top: 0;">🎁 Il tuo Bonus</h3>
            <p>Come ringraziamento, hai accesso al nostro mini-corso gratuito "I 5 Pilastri dell'Accademia Digitale".</p>
            <p><a href="{{bonus_link}}" style="color: #667eea; font-weight: bold;">→ Accedi al Bonus</a></p>
        </div>
        
        <div style="background: #FFF8DC; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F2C418;">
            <h3 style="color: #1E2128; margin-top: 0;">📞 Prenota la tua Videocall</h3>
            <p>Tra 48 ore potrai prenotare una videocall strategica con il nostro team per discutere la tua analisi.</p>
            <p style="color: #666; font-size: 14px;">Il link sarà attivo dal {{booking_available_date}}.</p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Nota importante:</strong> L'analisi completa sarà discussa durante la videocall. Non riceverai il documento via email.
        </p>
    </div>
    
    <div style="background: #1E2128; padding: 20px; text-align: center; color: #999; font-size: 12px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0;">© 2026 Evolution PRO</p>
    </div>
</body>
</html>
""",
        "description": "Email di benvenuto dopo il pagamento dell'analisi €67",
        "variables": ["nome", "bonus_link", "booking_available_date"],
        "category": "analisi"
    },
    
    "analisi_reminder_48h": {
        "subject": "🔔 La tua Analisi Strategica ti aspetta!",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FF9800 0%, #F44336 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Non perdere la tua Analisi!</h1>
    </div>
    
    <div style="padding: 30px; background: #fff; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 16px;">Ciao <strong>{{nome}}</strong>!</p>
        
        <p>La tua <strong>Analisi Strategica</strong> è pronta da 48 ore ma non hai ancora prenotato la videocall per discuterla insieme.</p>
        
        <div style="background: #FFF3E0; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #FF9800;">
            <h3 style="color: #1E2128; margin-top: 0;">📞 Prenota Ora</h3>
            <p>Non perdere l'opportunità di ricevere feedback personalizzato sul tuo progetto!</p>
            <p><a href="{{booking_link}}" style="display: inline-block; background: #FF9800; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">→ Prenota la Videocall</a></p>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            Se hai domande, rispondi a questa email.
        </p>
    </div>
    
    <div style="background: #1E2128; padding: 20px; text-align: center; color: #999; font-size: 12px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0;">© 2026 Evolution PRO</p>
    </div>
</body>
</html>
""",
        "description": "Reminder inviato 48h dopo l'analisi se non c'è stata prenotazione",
        "variables": ["nome", "booking_link"],
        "category": "analisi"
    }
}


class EmailTemplateManager:
    """Manager for email templates stored in MongoDB"""
    
    def __init__(self, db):
        self.db = db
        self._cache = {}
        self._cache_time = None
        self._cache_ttl = 300  # 5 minutes cache
    
    async def get_template(self, template_id: str) -> Optional[Dict]:
        """Get a template by ID, with caching"""
        import time
        
        # Check cache
        now = time.time()
        if self._cache_time and (now - self._cache_time) < self._cache_ttl:
            if template_id in self._cache:
                return self._cache[template_id]
        
        # Load from DB
        template = await self.db.email_templates.find_one({"template_id": template_id}, {"_id": 0})
        
        # Fall back to default if not in DB
        if not template:
            template = DEFAULT_TEMPLATES.get(template_id)
            if template:
                template = {**template, "template_id": template_id, "is_default": True}
        
        # Update cache
        if template:
            self._cache[template_id] = template
            self._cache_time = now
        
        return template
    
    async def render_template(self, template_id: str, variables: Dict[str, str]) -> tuple:
        """Render a template with variables, returns (subject, html_body)"""
        template = await self.get_template(template_id)
        
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        subject = template.get("subject", "")
        body = template.get("body_html", "")
        
        # Replace variables
        for key, value in variables.items():
            placeholder = "{{" + key + "}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        
        return subject, body
    
    async def save_template(self, template_id: str, subject: str, body_html: str, 
                           description: str = None, variables: list = None):
        """Save or update a template"""
        doc = {
            "template_id": template_id,
            "subject": subject,
            "body_html": body_html,
            "description": description or "",
            "variables": variables or [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_default": False
        }
        
        await self.db.email_templates.update_one(
            {"template_id": template_id},
            {"$set": doc},
            upsert=True
        )
        
        # Invalidate cache
        self._cache.pop(template_id, None)
        
        logger.info(f"[EMAIL_TEMPLATE] Saved template: {template_id}")
        return doc
    
    async def list_templates(self) -> list:
        """List all templates (DB + defaults)"""
        # Get custom templates from DB
        custom = await self.db.email_templates.find({}, {"_id": 0}).to_list(100)
        custom_ids = {t["template_id"] for t in custom}
        
        # Add defaults that aren't customized
        result = list(custom)
        for tid, tdata in DEFAULT_TEMPLATES.items():
            if tid not in custom_ids:
                result.append({
                    **tdata,
                    "template_id": tid,
                    "is_default": True
                })
        
        return result
    
    async def reset_to_default(self, template_id: str) -> bool:
        """Reset a template to its default version"""
        if template_id not in DEFAULT_TEMPLATES:
            return False
        
        await self.db.email_templates.delete_one({"template_id": template_id})
        self._cache.pop(template_id, None)
        
        logger.info(f"[EMAIL_TEMPLATE] Reset template to default: {template_id}")
        return True


# Global instance - initialized in server.py
email_template_manager: Optional[EmailTemplateManager] = None


def get_email_template_manager(db) -> EmailTemplateManager:
    """Get or create the email template manager"""
    global email_template_manager
    if email_template_manager is None:
        email_template_manager = EmailTemplateManager(db)
    return email_template_manager
