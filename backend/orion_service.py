# =============================================================================
# ORION - LEAD SCORING & INTELLIGENCE SERVICE
# Evolution PRO AI Agent for Sales Intelligence
# =============================================================================

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)

class LeadTemperature(str, Enum):
    HOT = "hot"          # Ready to buy (score >= 70)
    WARM = "warm"        # Interested, needs nurturing (score 40-69)
    COLD = "cold"        # Low engagement (score 20-39)
    FROZEN = "frozen"    # No activity (score < 20)

class OrionLeadScoring:
    """
    ORION - Sales Intelligence Agent
    Analyzes leads and assigns scores based on behavior and engagement
    """
    
    # Scoring weights
    SCORING_RULES = {
        # Engagement signals (positive)
        "email_opened": 5,
        "email_clicked": 15,
        "page_visited": 10,
        "form_submitted": 20,
        "video_watched": 25,
        "webinar_attended": 35,
        "tripwire_purchased": 50,
        "consultation_booked": 60,
        
        # Recency multipliers
        "activity_last_7_days": 2.0,
        "activity_last_30_days": 1.5,
        "activity_last_90_days": 1.0,
        "activity_older": 0.5,
        
        # Decay factors
        "days_inactive_penalty": -1,  # Per day of inactivity
        "max_decay": -30,
        
        # Source quality
        "source_organic": 10,
        "source_referral": 15,
        "source_paid_targeted": 8,
        "source_paid_broad": 3,
        "source_unknown": 0,
    }
    
    # Tag mappings for Systeme.io
    TAG_SCORE_MAP = {
        # ============================================
        # EVOLUTION PRO - PIPELINE COMMERCIALE COMPLETA
        # ============================================
        
        # FASI PARTNER (Fase0-10) - Partner attivi, ESCLUDI da lead
        "fase10_scalabilita": 200,   # Partner avanzato
        "fase9_ottimizzazione": 190,
        "fase8_lancio": 180,
        "fase7_pre_lancio": 170,
        "fase6_accademia": 160,
        "fase5_registrazione": 150,
        "fase4_outline": 140,
        "fase3_copy_core": 130,
        "fase2_masterclass": 120,
        "fase1_allineamento": 110,
        "fase0_attivazione": 100,
        "fase_pre_onboarding": 90,   # Pre-partner
        
        # ACTIONS - Segnali di engagement
        "action_acquisto_67": 85,    # Ha comprato tripwire €7 - HOT!
        "action_call_fatta": 80,     # Call completata - HOT!
        "action_call_fissata": 75,   # Call fissata - HOT!
        "action_questionario": 60,   # Ha compilato questionario - WARM
        "action_optin": 40,          # Si è iscritto - WARM
        "action_click": 30,          # Ha cliccato - WARM
        "action_aperto_60g": 20,     # Ha aperto email ultimi 60g - WARM
        "action_partner_attivo": 200, # Partner attivo - ESCLUDI
        
        # STATI - Status del contatto
        "stato_cliente": 200,        # Cliente - ESCLUDI da lead
        "stato_ex_cliente": 50,      # Ex cliente - potenziale re-engagement
        "stato_partner_attivo": 200, # Partner attivo - ESCLUDI
        "stato_ex_partner": 40,      # Ex partner - potenziale re-engagement
        "stato_dormiente": 10,       # Dormiente - COLD
        "stato_attivo": 60,          # Attivo ma non partner - WARM
        
        # LEAD SCORING LEGACY (backward compatibility)
        "hot_lead": 80,
        "warm_lead": 50,
        "cold_lead": 20,
        
        # Acquisti / Pagamenti
        "acquisto": 85,
        "pagamento": 100,
        "purchased": 100,
        "customer": 100,
        "tripwire": 70,
        
        # Engagement generici
        "opened": 5,
        "clicked": 15,
        "watched": 25,
        "downloaded": 20,
        "webinar": 35,
        "masterclass": 35,
        
        # Newsletter/Base
        "newsletter": 10,
        "optin": 15,
        
        # Negative tags
        "unsubscribed": -50,
        "bounced": -100,
        "complained": -100,
        "spam": -100,
        "dormiente": -10,
    }
    
    # Tags che identificano PARTNER ATTIVI (da escludere dai lead)
    PARTNER_TAGS = [
        "fase0_attivazione", "fase1_allineamento", "fase2_masterclass", 
        "fase3_copy_core", "fase4_outline", "fase5_registrazione",
        "fase6_accademia", "fase7_pre_lancio", "fase8_lancio",
        "fase9_ottimizzazione", "fase10_scalabilita",
        "stato_cliente", "stato_partner_attivo", "action_partner_attivo"
    ]
    
    def __init__(self, db):
        self.db = db
        
    async def score_lead(self, lead_data: Dict) -> Dict:
        """
        Calculate lead score based on available data
        Returns: {score, temperature, signals, recommendations}
        """
        score = 0
        signals = []
        
        # 1. Tag-based scoring
        tags = lead_data.get("tags", [])
        for tag in tags:
            # Handle both string tags and dict tags
            if isinstance(tag, dict):
                tag_name = tag.get("name", tag.get("tag", str(tag)))
            else:
                tag_name = str(tag)
            
            tag_lower = tag_name.lower().replace(" ", "_")
            for key, points in self.TAG_SCORE_MAP.items():
                if key in tag_lower:
                    score += points
                    signals.append(f"Tag '{tag_name}': +{points}")
                    break
        
        # 2. Activity recency
        last_activity = lead_data.get("last_activity") or lead_data.get("updated_at")
        if last_activity:
            try:
                if isinstance(last_activity, str):
                    last_dt = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
                else:
                    last_dt = last_activity
                    
                days_ago = (datetime.now(timezone.utc) - last_dt).days
                
                if days_ago <= 7:
                    multiplier = self.SCORING_RULES["activity_last_7_days"]
                    signals.append(f"Attivo negli ultimi 7 giorni: x{multiplier}")
                elif days_ago <= 30:
                    multiplier = self.SCORING_RULES["activity_last_30_days"]
                    signals.append(f"Attivo negli ultimi 30 giorni: x{multiplier}")
                elif days_ago <= 90:
                    multiplier = self.SCORING_RULES["activity_last_90_days"]
                    signals.append(f"Attivo negli ultimi 90 giorni: x{multiplier}")
                else:
                    multiplier = self.SCORING_RULES["activity_older"]
                    decay = max(self.SCORING_RULES["max_decay"], 
                               self.SCORING_RULES["days_inactive_penalty"] * (days_ago - 90))
                    score += decay
                    signals.append(f"Inattivo da {days_ago} giorni: {decay}")
                
                score = int(score * multiplier)
            except Exception as e:
                logger.warning(f"Error parsing activity date: {e}")
        
        # 3. Email engagement (if available)
        email_opens = lead_data.get("email_opens", 0)
        email_clicks = lead_data.get("email_clicks", 0)
        
        if email_opens:
            score += email_opens * self.SCORING_RULES["email_opened"]
            signals.append(f"Email aperte ({email_opens}): +{email_opens * 5}")
            
        if email_clicks:
            score += email_clicks * self.SCORING_RULES["email_clicked"]
            signals.append(f"Click email ({email_clicks}): +{email_clicks * 15}")
        
        # 4. Source quality
        source = lead_data.get("source", "").lower()
        if "organic" in source or "seo" in source:
            score += self.SCORING_RULES["source_organic"]
        elif "referral" in source:
            score += self.SCORING_RULES["source_referral"]
        elif "facebook" in source or "instagram" in source:
            score += self.SCORING_RULES["source_paid_targeted"]
        
        # 5. Normalize score (0-100)
        score = max(0, min(100, score))
        
        # 6. Determine temperature
        if score >= 70:
            temperature = LeadTemperature.HOT
        elif score >= 40:
            temperature = LeadTemperature.WARM
        elif score >= 20:
            temperature = LeadTemperature.COLD
        else:
            temperature = LeadTemperature.FROZEN
        
        # 7. Generate recommendations
        recommendations = self._generate_recommendations(score, temperature, signals)
        
        return {
            "score": score,
            "temperature": temperature.value,
            "signals": signals,
            "recommendations": recommendations,
            "scored_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _generate_recommendations(self, score: int, temp: LeadTemperature, signals: List[str]) -> List[str]:
        """Generate actionable recommendations based on score"""
        recs = []
        
        if temp == LeadTemperature.HOT:
            recs.append("🔥 AZIONE IMMEDIATA: Invia offerta diretta")
            recs.append("📞 Considera chiamata di follow-up")
            recs.append("💰 Proponi tripwire €7 o offerta principale")
            
        elif temp == LeadTemperature.WARM:
            recs.append("📧 Inserisci in sequenza nurturing")
            recs.append("🎁 Offri contenuto di valore gratuito")
            recs.append("⏰ Ricontatta tra 3-5 giorni")
            
        elif temp == LeadTemperature.COLD:
            recs.append("📨 Invia email di riattivazione")
            recs.append("🎯 Segmenta per interesse specifico")
            recs.append("💡 Testa nuovo lead magnet")
            
        else:  # FROZEN
            recs.append("❄️ Tentativo finale di riattivazione")
            recs.append("🧹 Considera pulizia lista dopo 30 giorni")
            recs.append("📊 Analizza motivo disengagement")
        
        return recs
    
    async def batch_score_leads(self, leads: List[Dict]) -> Dict:
        """
        Score multiple leads and return aggregated stats
        """
        results = {
            "total": len(leads),
            "hot": [],
            "warm": [],
            "cold": [],
            "frozen": [],
            "average_score": 0,
            "scored_at": datetime.now(timezone.utc).isoformat()
        }
        
        total_score = 0
        
        for lead in leads:
            scored = await self.score_lead(lead)
            lead_result = {
                "email": lead.get("email", ""),
                "name": lead.get("name", ""),
                "score": scored["score"],
                "temperature": scored["temperature"],
                "recommendations": scored["recommendations"][:2]  # Top 2 recs
            }
            
            total_score += scored["score"]
            
            if scored["temperature"] == "hot":
                results["hot"].append(lead_result)
            elif scored["temperature"] == "warm":
                results["warm"].append(lead_result)
            elif scored["temperature"] == "cold":
                results["cold"].append(lead_result)
            else:
                results["frozen"].append(lead_result)
        
        results["average_score"] = round(total_score / len(leads), 1) if leads else 0
        
        # Sort by score descending
        for temp in ["hot", "warm", "cold", "frozen"]:
            results[temp] = sorted(results[temp], key=lambda x: x["score"], reverse=True)
        
        return results
    
    async def analyze_systeme_contacts(self, contacts: List[Dict]) -> Dict:
        """
        Analyze contacts from Systeme.io and generate scoring report
        """
        # Transform Systeme.io contact format to lead format
        leads = []
        for contact in contacts:
            lead = {
                "email": contact.get("email", ""),
                "name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                "tags": contact.get("tags", []),
                "source": contact.get("source", ""),
                "created_at": contact.get("created_at"),
                "updated_at": contact.get("updated_at"),
                "last_activity": contact.get("updated_at")  # Use updated_at as proxy
            }
            leads.append(lead)
        
        return await self.batch_score_leads(leads)
    
    async def get_monetization_segments(self, scored_leads: Dict) -> Dict:
        """
        Generate monetization-focused segments from scored leads
        """
        return {
            "immediate_revenue": {
                "segment": "HOT - Offerta Diretta",
                "count": len(scored_leads["hot"]),
                "action": "Invia offerta tripwire €7 OGGI",
                "expected_conversion": "15-25%",
                "leads": scored_leads["hot"][:50]  # Top 50
            },
            "nurture_sequence": {
                "segment": "WARM - Sequenza Nurturing",
                "count": len(scored_leads["warm"]),
                "action": "Inserisci in sequenza 5 email",
                "expected_conversion": "5-10%",
                "leads": scored_leads["warm"][:100]
            },
            "reactivation_campaign": {
                "segment": "COLD - Riattivazione",
                "count": len(scored_leads["cold"]),
                "action": "Campagna 3 wave riattivazione",
                "expected_conversion": "2-5%",
                "leads": scored_leads["cold"][:200]
            },
            "cleanup_candidates": {
                "segment": "FROZEN - Pulizia Lista",
                "count": len(scored_leads["frozen"]),
                "action": "Email finale + rimuovi non responders",
                "expected_conversion": "<1%",
                "leads": scored_leads["frozen"][:100]
            }
        }


# Singleton instance (will be initialized with db)
orion_scoring = None

def init_orion(db):
    global orion_scoring
    orion_scoring = OrionLeadScoring(db)
    return orion_scoring
