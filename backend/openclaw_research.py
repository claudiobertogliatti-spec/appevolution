"""
openclaw_research.py
====================
OpenClaw Web Research Engine per Evolution PRO OS.

Sistema di Web Scraping e Ricerca interno alimentato da Claude Code.
Utilizza Playwright per navigare su Google, LinkedIn e siti competitor.
Claude funge da "cervello" che istruisce OpenClaw su cosa cercare e sintetizzare.

Funzionalità:
- Ricerca Google per competitor e posizionamento
- Analisi profili LinkedIn/social
- Scraping siti web competitor
- Sintesi intelligente con Claude

Autore: Evolution PRO OS
"""

import os
import asyncio
import logging
import json
import re
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURAZIONE
# ============================================================================

OPENCLAW_RESEARCH_CONFIG = {
    "max_google_results": 5,
    "max_linkedin_profiles": 3,
    "timeout_seconds": 30,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# ============================================================================
# HELPER: LLM per sintesi
# ============================================================================

async def get_research_llm():
    """Inizializza LLM per sintesi ricerca"""
    from emergentintegrations.llm.chat import LlmChat
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise Exception("EMERGENT_LLM_KEY non configurata")
    
    session_id = f"research_{datetime.now().timestamp()}"
    
    return LlmChat(
        api_key=api_key, 
        session_id=session_id,
        system_message="""Sei un analista di mercato esperto. Il tuo compito è sintetizzare 
informazioni raccolte dal web in insight strategici utili per l'analisi di un progetto digitale.
Sii preciso, obiettivo e critico. Non inventare dati."""
    ).with_model("anthropic", "claude-sonnet-4-20250514")


# ============================================================================
# CORE: Web Scraper con Playwright
# ============================================================================

class OpenClawResearcher:
    """
    Motore di ricerca web per analisi competitor e autocompletamento dati.
    Usa Playwright per navigazione headless e Claude per sintesi.
    """
    
    def __init__(self):
        self.browser = None
        self.context = None
        self.results = {
            "google_results": [],
            "competitor_analysis": [],
            "social_presence": [],
            "market_insights": [],
            "errors": []
        }
    
    async def __aenter__(self):
        """Context manager entry - avvia browser"""
        try:
            from playwright.async_api import async_playwright
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            self.context = await self.browser.new_context(
                user_agent=OPENCLAW_RESEARCH_CONFIG["user_agent"],
                viewport={"width": 1920, "height": 1080}
            )
            logger.info("[OpenClaw Research] Browser avviato")
        except Exception as e:
            logger.error(f"[OpenClaw Research] Errore avvio browser: {e}")
            self.browser = None
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - chiudi browser"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
        logger.info("[OpenClaw Research] Browser chiuso")
    
    async def search_google(self, query: str, num_results: int = 5) -> List[Dict]:
        """
        Esegue ricerca Google e restituisce risultati strutturati.
        """
        if not self.browser:
            return []
        
        results = []
        try:
            page = await self.context.new_page()
            
            # Vai su Google
            search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&hl=it"
            await page.goto(search_url, timeout=OPENCLAW_RESEARCH_CONFIG["timeout_seconds"] * 1000)
            await page.wait_for_timeout(2000)
            
            # Estrai risultati
            content = await page.content()
            soup = BeautifulSoup(content, 'lxml')
            
            # Cerca i risultati organici
            search_results = soup.select('div.g')[:num_results]
            
            for item in search_results:
                try:
                    title_elem = item.select_one('h3')
                    link_elem = item.select_one('a[href^="http"]')
                    snippet_elem = item.select_one('div[data-sncf], div.VwiC3b')
                    
                    if title_elem and link_elem:
                        results.append({
                            "title": title_elem.get_text(strip=True),
                            "url": link_elem.get('href', ''),
                            "snippet": snippet_elem.get_text(strip=True) if snippet_elem else ""
                        })
                except Exception as e:
                    logger.debug(f"Errore parsing risultato: {e}")
            
            await page.close()
            logger.info(f"[OpenClaw] Google search: {len(results)} risultati per '{query}'")
            
        except Exception as e:
            logger.error(f"[OpenClaw] Errore Google search: {e}")
            self.results["errors"].append(f"Google search error: {str(e)}")
        
        return results
    
    async def scrape_webpage(self, url: str) -> Dict:
        """
        Scrape contenuto da una pagina web.
        Estrae titolo, meta description, testo principale.
        """
        if not self.browser:
            return {"error": "Browser non disponibile"}
        
        result = {
            "url": url,
            "title": "",
            "meta_description": "",
            "main_content": "",
            "headings": [],
            "success": False
        }
        
        try:
            page = await self.context.new_page()
            await page.goto(url, timeout=OPENCLAW_RESEARCH_CONFIG["timeout_seconds"] * 1000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            soup = BeautifulSoup(content, 'lxml')
            
            # Titolo
            title_tag = soup.find('title')
            result["title"] = title_tag.get_text(strip=True) if title_tag else ""
            
            # Meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            result["meta_description"] = meta_desc.get('content', '') if meta_desc else ""
            
            # Headings
            for h in soup.find_all(['h1', 'h2', 'h3'])[:10]:
                result["headings"].append(h.get_text(strip=True))
            
            # Contenuto principale (rimuovi script, style, nav, footer)
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                tag.decompose()
            
            # Estrai testo da article o main, altrimenti body
            main_content = soup.find('article') or soup.find('main') or soup.find('body')
            if main_content:
                text = main_content.get_text(separator=' ', strip=True)
                # Limita a 3000 caratteri
                result["main_content"] = text[:3000] + "..." if len(text) > 3000 else text
            
            result["success"] = True
            await page.close()
            
        except Exception as e:
            logger.error(f"[OpenClaw] Errore scraping {url}: {e}")
            result["error"] = str(e)
        
        return result
    
    async def analyze_competitor(self, competitor_name: str, niche: str) -> Dict:
        """
        Analizza un competitor specifico.
        Cerca su Google e scrape il sito se trovato.
        """
        analysis = {
            "name": competitor_name,
            "found": False,
            "website": None,
            "positioning": "",
            "offerings": [],
            "strengths": [],
            "weaknesses": []
        }
        
        # Cerca il competitor su Google
        query = f"{competitor_name} {niche} corso online"
        google_results = await self.search_google(query, num_results=3)
        
        if google_results:
            analysis["found"] = True
            # Prendi il primo risultato come sito principale
            first_result = google_results[0]
            analysis["website"] = first_result.get("url", "")
            analysis["positioning"] = first_result.get("snippet", "")
            
            # Scrape il sito per più dettagli
            if analysis["website"]:
                site_data = await self.scrape_webpage(analysis["website"])
                if site_data.get("success"):
                    analysis["site_title"] = site_data.get("title", "")
                    analysis["site_description"] = site_data.get("meta_description", "")
                    analysis["site_headings"] = site_data.get("headings", [])
        
        return analysis
    
    async def research_market(self, expertise: str, target: str) -> Dict:
        """
        Ricerca di mercato per una nicchia specifica.
        """
        market_data = {
            "expertise": expertise,
            "target": target,
            "market_size_hint": "",
            "trends": [],
            "competitors_found": [],
            "opportunities": []
        }
        
        # Ricerca generica sul mercato
        queries = [
            f"corso online {expertise} Italia 2024",
            f"formazione {expertise} per {target}",
            f"mercato formazione digitale {expertise}"
        ]
        
        all_results = []
        for query in queries:
            results = await self.search_google(query, num_results=3)
            all_results.extend(results)
        
        # Estrai competitor dai risultati
        seen_domains = set()
        for r in all_results:
            url = r.get("url", "")
            if url:
                # Estrai dominio
                domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
                if domain_match:
                    domain = domain_match.group(1)
                    if domain not in seen_domains and 'google' not in domain:
                        seen_domains.add(domain)
                        market_data["competitors_found"].append({
                            "domain": domain,
                            "title": r.get("title", ""),
                            "snippet": r.get("snippet", "")
                        })
        
        return market_data


# ============================================================================
# FUNZIONE PRINCIPALE: Ricerca completa per Analisi Strategica
# ============================================================================

async def run_strategic_research(
    nome_partner: str,
    expertise: str,
    target: str,
    competitor_names: List[str] = None,
    website_partner: str = None,
    social_links: List[str] = None
) -> Dict:
    """
    Esegue ricerca completa per l'Analisi Strategica.
    
    Args:
        nome_partner: Nome del partner/professionista
        expertise: Area di competenza
        target: Target cliente
        competitor_names: Lista nomi competitor (opzionale)
        website_partner: Sito web del partner (opzionale)
        social_links: Link social del partner (opzionale)
    
    Returns:
        Dict con tutti i dati di ricerca strutturati
    """
    
    research_result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "partner_name": nome_partner,
        "expertise": expertise,
        "target": target,
        "partner_web_presence": None,
        "market_research": None,
        "competitor_analysis": [],
        "synthesis": None,
        "data_quality": "complete",
        "missing_data_alerts": [],
        "errors": []
    }
    
    try:
        async with OpenClawResearcher() as researcher:
            
            # 1. Ricerca presenza web del partner (se ha un sito)
            if website_partner:
                logger.info(f"[OpenClaw] Analisi sito partner: {website_partner}")
                research_result["partner_web_presence"] = await researcher.scrape_webpage(website_partner)
            else:
                # Cerca il partner su Google
                logger.info(f"[OpenClaw] Ricerca web partner: {nome_partner}")
                partner_search = await researcher.search_google(f"{nome_partner} {expertise}", num_results=3)
                if partner_search:
                    research_result["partner_web_presence"] = {
                        "found_via_search": True,
                        "results": partner_search
                    }
                else:
                    research_result["missing_data_alerts"].append({
                        "field": "presenza_web_partner",
                        "message": "Nessuna presenza web rilevata per il partner. Questo rappresenta una criticità primaria: invisibilità digitale."
                    })
            
            # 2. Ricerca di mercato
            logger.info(f"[OpenClaw] Ricerca mercato: {expertise} / {target}")
            research_result["market_research"] = await researcher.research_market(expertise, target)
            
            # 3. Analisi competitor
            if competitor_names:
                for comp_name in competitor_names[:3]:  # Max 3 competitor
                    logger.info(f"[OpenClaw] Analisi competitor: {comp_name}")
                    comp_analysis = await researcher.analyze_competitor(comp_name, expertise)
                    research_result["competitor_analysis"].append(comp_analysis)
            else:
                # Usa competitor trovati nella ricerca di mercato
                market_competitors = research_result.get("market_research", {}).get("competitors_found", [])
                if market_competitors:
                    research_result["competitor_analysis"] = market_competitors[:5]
                else:
                    research_result["missing_data_alerts"].append({
                        "field": "competitor",
                        "message": "Nessun competitor specifico identificato. La sezione analisi competitiva sarà limitata."
                    })
            
            # 4. Sintesi con Claude
            research_result["synthesis"] = await synthesize_research_with_claude(research_result)
            
            # Valuta qualità dati
            if len(research_result["missing_data_alerts"]) > 2:
                research_result["data_quality"] = "incomplete"
            elif len(research_result["missing_data_alerts"]) > 0:
                research_result["data_quality"] = "partial"
                
    except Exception as e:
        logger.error(f"[OpenClaw] Errore ricerca strategica: {e}")
        research_result["errors"].append(str(e))
        research_result["data_quality"] = "failed"
    
    return research_result


async def synthesize_research_with_claude(research_data: Dict) -> Dict:
    """
    Usa Claude per sintetizzare i dati di ricerca in insight strategici.
    """
    try:
        llm = await get_research_llm()
        from emergentintegrations.llm.chat import UserMessage
        
        prompt = f"""Analizza i seguenti dati di ricerca web e produci una sintesi strategica.

DATI RICERCA:
- Partner: {research_data.get('partner_name')}
- Expertise: {research_data.get('expertise')}
- Target: {research_data.get('target')}

PRESENZA WEB PARTNER:
{json.dumps(research_data.get('partner_web_presence', {}), indent=2, ensure_ascii=False)[:2000]}

RICERCA MERCATO:
{json.dumps(research_data.get('market_research', {}), indent=2, ensure_ascii=False)[:2000]}

COMPETITOR TROVATI:
{json.dumps(research_data.get('competitor_analysis', []), indent=2, ensure_ascii=False)[:2000]}

Produci una sintesi in JSON con questa struttura:
{{
    "posizionamento_mercato": "Valutazione del posizionamento attuale del partner nel mercato",
    "competitor_principali": ["Lista dei 3 competitor più rilevanti con breve descrizione"],
    "opportunita": ["Lista di 3 opportunità identificate"],
    "minacce": ["Lista di 3 minacce/rischi identificati"],
    "raccomandazioni_differenziazione": "Come il partner può differenziarsi",
    "visibilita_digitale_score": "1-10 (valutazione della presenza online del partner)",
    "note_critiche": "Eventuali criticità emerse dalla ricerca"
}}

Rispondi SOLO con il JSON, senza testo aggiuntivo."""

        response = await llm.chat([UserMessage(text=prompt)])
        response_text = response.text.strip()
        
        # Parse JSON
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            return json.loads(json_match.group())
        else:
            return {"error": "Sintesi non generata", "raw": response_text[:500]}
            
    except Exception as e:
        logger.error(f"[OpenClaw] Errore sintesi Claude: {e}")
        return {"error": str(e)}


# ============================================================================
# FUNZIONE: Autocompletamento dati mancanti
# ============================================================================

async def autocomplete_missing_data(
    questionario: Dict,
    fields_to_check: List[str] = None
) -> Dict:
    """
    Verifica campi mancanti nel questionario e tenta di recuperarli via web.
    
    Implementa il "Protocollo di Ricerca Investigativa" del Master Prompt:
    - Se dati assenti/generici → attiva ricerca web
    - Integra dati trovati con nota "Dati recuperati tramite analisi web"
    - Se anche web non produce risultati → segnala invisibilità digitale
    """
    
    result = {
        "original_data": questionario.copy(),
        "enriched_data": questionario.copy(),
        "data_sources": {},
        "missing_alerts": [],
        "enrichment_notes": []
    }
    
    # Campi critici da verificare
    critical_fields = fields_to_check or [
        "expertise",
        "cliente_target", 
        "risultato_promesso",
        "competitor",
        "sito_web",
        "social_links"
    ]
    
    nome = questionario.get("nome", "")
    cognome = questionario.get("cognome", "")
    expertise = questionario.get("expertise", "")
    
    for field in critical_fields:
        value = questionario.get(field, "")
        
        # Verifica se il campo è vuoto o generico
        is_empty = not value or value.strip() == ""
        is_generic = value and len(value) < 10
        
        if is_empty or is_generic:
            logger.info(f"[OpenClaw] Campo '{field}' mancante/generico, avvio ricerca web...")
            
            # Tenta recupero via web
            try:
                async with OpenClawResearcher() as researcher:
                    if field in ["sito_web", "website"]:
                        # Cerca sito web del partner
                        search_results = await researcher.search_google(
                            f"{nome} {cognome} {expertise} sito ufficiale",
                            num_results=3
                        )
                        if search_results:
                            result["enriched_data"]["sito_web"] = search_results[0].get("url", "")
                            result["data_sources"]["sito_web"] = "Recuperato tramite analisi web esterna"
                            result["enrichment_notes"].append(
                                f"Sito web identificato automaticamente: {search_results[0].get('url')}"
                            )
                        else:
                            result["missing_alerts"].append({
                                "field": field,
                                "severity": "high",
                                "message": f"[ANALISI SOSPESA: DATI MANCANTI] Campo '{field}' non compilato e non recuperabile via web. L'invisibilità digitale del partner rappresenta una criticità primaria."
                            })
                    
                    elif field == "competitor":
                        # Cerca competitor nel settore
                        if expertise:
                            market_data = await researcher.research_market(
                                expertise, 
                                questionario.get("cliente_target", "professionisti")
                            )
                            if market_data.get("competitors_found"):
                                competitors = [c.get("domain", c.get("title", "")) for c in market_data["competitors_found"][:3]]
                                result["enriched_data"]["competitor_auto"] = competitors
                                result["data_sources"]["competitor"] = "Recuperato tramite analisi web esterna"
                                result["enrichment_notes"].append(
                                    f"Competitor identificati automaticamente: {', '.join(competitors)}"
                                )
                            else:
                                result["missing_alerts"].append({
                                    "field": field,
                                    "severity": "medium",
                                    "message": f"[ANALISI SOSPESA: DATI MANCANTI] Nessun competitor identificato per il settore '{expertise}'."
                                })
                    
                    else:
                        # Campo generico non recuperabile
                        result["missing_alerts"].append({
                            "field": field,
                            "severity": "medium" if field in ["risultato_promesso", "cliente_target"] else "low",
                            "message": f"[ANALISI SOSPESA: DATI MANCANTI] Campo '{field}' non compilato. Questo dato è fondamentale per una valutazione accurata della scalabilità del progetto."
                        })
                        
            except Exception as e:
                logger.error(f"[OpenClaw] Errore autocompletamento {field}: {e}")
                result["missing_alerts"].append({
                    "field": field,
                    "severity": "low",
                    "message": f"Campo '{field}' non verificabile: {str(e)}"
                })
    
    return result


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    "OpenClawResearcher",
    "run_strategic_research",
    "autocomplete_missing_data",
    "synthesize_research_with_claude",
    "OPENCLAW_RESEARCH_CONFIG"
]
