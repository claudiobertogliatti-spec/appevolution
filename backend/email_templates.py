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
    },
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # SEQUENZA EMAIL VENDITA ANALISI €67 (per Lead Discovery)
    # ═══════════════════════════════════════════════════════════════════════════════
    
    "lead_sequence_email_1": {
        "subject": "{{nome}}, hai mai pensato a quanto vale davvero la tua expertise?",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 30px; background: #fff;">
        <p style="font-size: 16px;">Ciao {{nome}},</p>
        
        <p>Mi chiamo Claudio e sono il fondatore di <strong>Evolution PRO</strong>.</p>
        
        <p>Ti scrivo perché ho notato il tuo lavoro nel campo {{niche}} e credo che tu abbia un potenziale enorme... che probabilmente non stai ancora sfruttando al 100%.</p>
        
        <p>La verità? <strong>La maggior parte degli esperti come te guadagna una frazione di quello che potrebbe.</strong></p>
        
        <p>Non perché manchino le competenze, ma perché manca un <strong>sistema</strong> per trasformare quella expertise in un asset scalabile.</p>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F2C418;">
            <p style="margin: 0;"><strong>La domanda è:</strong> preferisci continuare a scambiare tempo per soldi... o vuoi costruire qualcosa che lavori anche quando tu non lavori?</p>
        </div>
        
        <p>Nei prossimi giorni ti racconterò come aiutiamo esperti come te a costruire la loro <strong>Accademia Digitale</strong>.</p>
        
        <p>Ma prima, una domanda: <strong>qual è il tuo obiettivo principale per i prossimi 12 mesi?</strong></p>
        
        <p>Rispondimi - leggo personalmente ogni email.</p>
        
        <p style="margin-top: 30px;">
            A presto,<br>
            <strong>Claudio Bertogliatti</strong><br>
            <span style="color: #666; font-size: 14px;">Founder, Evolution PRO</span>
        </p>
    </div>
    
    <div style="padding: 15px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee;">
        <p style="margin: 0;">Evolution PRO - Trasforma la tua expertise in un business scalabile</p>
        <p style="margin: 5px 0 0 0;"><a href="{{unsubscribe_link}}" style="color: #999;">Disiscriviti</a></p>
    </div>
</body>
</html>
""",
        "description": "Email 1 della sequenza vendita - Presentazione e problema",
        "variables": ["nome", "niche", "unsubscribe_link"],
        "category": "lead_sequence"
    },
    
    "lead_sequence_email_2": {
        "subject": "Come Marco ha generato €47.000 in 90 giorni (partendo da zero online)",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 30px; background: #fff;">
        <p style="font-size: 16px;">Ciao {{nome}},</p>
        
        <p>Ieri ti ho parlato del potenziale inespresso della tua expertise.</p>
        
        <p>Oggi voglio raccontarti la storia di <strong>Marco</strong>, un business coach che 18 mesi fa era esattamente dove sei tu ora.</p>
        
        <div style="background: #FFF8E7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #FF9800;">
            <h3 style="color: #1E2128; margin-top: 0;">📊 I numeri di Marco (prima vs dopo)</h3>
            <p><strong>PRIMA:</strong> Consulenze 1:1, €3.000-5.000/mese, nessuna prevedibilità</p>
            <p><strong>DOPO 90 GIORNI:</strong> Videocorso + Funnel automatizzato, €47.000 dal lancio</p>
            <p style="margin-bottom: 0;"><strong>OGGI:</strong> €15.000/mese ricorrenti con 3-4 ore di lavoro al giorno</p>
        </div>
        
        <p>Cosa ha fatto di diverso?</p>
        
        <ol style="padding-left: 20px;">
            <li><strong>Ha smesso di vendere tempo</strong> e ha iniziato a vendere trasformazione</li>
            <li><strong>Ha creato un sistema</strong> che qualifica i clienti automaticamente</li>
            <li><strong>Ha costruito un asset</strong> (il videocorso) che vende 24/7</li>
        </ol>
        
        <p>La cosa interessante? Marco non è un genio del marketing. Non sapeva nulla di funnel o automazioni.</p>
        
        <p>Aveva solo una cosa: <strong>l'expertise giusta e qualcuno che lo guidasse passo dopo passo</strong>.</p>
        
        <div style="background: #E8F5E9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <p style="margin: 0;"><strong>La domanda:</strong> Se Marco ce l'ha fatta partendo da zero... cosa ti impedisce di fare lo stesso?</p>
        </div>
        
        <p>Domani ti mostrerò esattamente come capire se questo percorso fa per te.</p>
        
        <p style="margin-top: 30px;">
            Claudio<br>
            <span style="color: #666; font-size: 14px;">Evolution PRO</span>
        </p>
    </div>
    
    <div style="padding: 15px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee;">
        <p style="margin: 0;"><a href="{{unsubscribe_link}}" style="color: #999;">Disiscriviti</a></p>
    </div>
</body>
</html>
""",
        "description": "Email 2 della sequenza vendita - Caso studio",
        "variables": ["nome", "unsubscribe_link"],
        "category": "lead_sequence"
    },
    
    "lead_sequence_email_3": {
        "subject": "{{nome}}, ecco come scoprire il tuo potenziale reale (€67)",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 30px; background: #fff;">
        <p style="font-size: 16px;">Ciao {{nome}},</p>
        
        <p>Nelle email precedenti ti ho parlato del potenziale della tua expertise e della storia di Marco.</p>
        
        <p>Oggi voglio farti una proposta concreta.</p>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 20px 0; color: white;">
            <h2 style="margin-top: 0; color: white;">🎯 Analisi Strategica Personalizzata</h2>
            <p>Un documento di 15+ pagine che analizza:</p>
            <ul style="margin-bottom: 15px;">
                <li>Il tuo posizionamento attuale nel mercato</li>
                <li>I 3 asset nascosti che puoi monetizzare subito</li>
                <li>La roadmap personalizzata per i prossimi 90 giorni</li>
                <li>Il potenziale di fatturato realistico nel tuo settore</li>
            </ul>
            <p style="margin-bottom: 0;"><strong>Prezzo: €67</strong> (invece di €197)</p>
        </div>
        
        <p><strong>Perché solo €67?</strong></p>
        
        <p>Perché so che una volta che vedrai il tuo potenziale nero su bianco, vorrai sapere come realizzarlo. E a quel punto potremo parlare di come posso aiutarti.</p>
        
        <p>È un investimento minimo per capire se e quanto puoi guadagnare dalla tua expertise.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{link_checkout}}" style="display: inline-block; background: #F2C418; color: #1E2128; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px;">
                → Ottieni la tua Analisi Strategica
            </a>
        </div>
        
        <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>⚡ Bonus incluso:</strong> Dopo l'analisi, potrai prenotare una videocall strategica con il nostro team per discutere i risultati.</p>
        </div>
        
        <p>Se hai domande, rispondimi direttamente.</p>
        
        <p style="margin-top: 30px;">
            Claudio<br>
            <span style="color: #666; font-size: 14px;">Evolution PRO</span>
        </p>
    </div>
    
    <div style="padding: 15px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee;">
        <p style="margin: 0;"><a href="{{unsubscribe_link}}" style="color: #999;">Disiscriviti</a></p>
    </div>
</body>
</html>
""",
        "description": "Email 3 della sequenza vendita - Presentazione offerta €67 con CTA",
        "variables": ["nome", "link_checkout", "unsubscribe_link"],
        "category": "lead_sequence"
    },
    
    "lead_sequence_email_4": {
        "subject": "Ultima occasione: la tua Analisi Strategica ti aspetta",
        "body_html": """
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 30px; background: #fff;">
        <p style="font-size: 16px;">Ciao {{nome}},</p>
        
        <p>Questa è l'ultima email che ti invio su questo argomento.</p>
        
        <p>Qualche giorno fa ti ho parlato dell'<strong>Analisi Strategica</strong> — il documento che ti mostra esattamente quanto vale la tua expertise e come monetizzarla.</p>
        
        <p>So che potresti avere dei dubbi. Forse pensi:</p>
        
        <ul style="color: #666;">
            <li><em>"Non ho tempo adesso"</em></li>
            <li><em>"Ci penserò più avanti"</em></li>
            <li><em>"Non sono sicuro che faccia per me"</em></li>
        </ul>
        
        <p>Ti capisco. Ma lasciami essere diretto:</p>
        
        <div style="background: #FFEBEE; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F44336;">
            <p style="margin: 0;"><strong>Ogni giorno che passa senza un piano chiaro è un giorno in cui la tua expertise perde valore.</strong></p>
            <p style="margin: 10px 0 0 0;">I tuoi potenziali clienti stanno cercando soluzioni ORA. Se non le trovano da te, le troveranno altrove.</p>
        </div>
        
        <p>L'Analisi Strategica costa <strong>€67</strong>. Meno di una cena fuori.</p>
        
        <p>Ma il valore che ricevi può cambiarti la prospettiva sul tuo business per sempre.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{link_checkout}}" style="display: inline-block; background: #F44336; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px;">
                → Sì, voglio la mia Analisi
            </a>
        </div>
        
        <p>Se decidi di non procedere, va benissimo. Ti auguro il meglio per il tuo business.</p>
        
        <p>Ma se una parte di te sa che potresti fare di più... questa è la tua occasione per scoprire come.</p>
        
        <p style="margin-top: 30px;">
            In bocca al lupo,<br>
            <strong>Claudio</strong><br>
            <span style="color: #666; font-size: 14px;">Evolution PRO</span>
        </p>
    </div>
    
    <div style="padding: 15px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee;">
        <p style="margin: 0;"><a href="{{unsubscribe_link}}" style="color: #999;">Disiscriviti</a></p>
    </div>
</body>
</html>
""",
        "description": "Email 4 della sequenza vendita - Reminder finale con urgenza",
        "variables": ["nome", "link_checkout", "unsubscribe_link"],
        "category": "lead_sequence"
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
