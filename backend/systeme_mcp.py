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
    
    async def get_tags(self) -> Dict:
        """Recupera tutti i tag"""
        return await self._request("GET", "/tags")
    
    async def create_tag(self, name: str) -> Dict:
        """Crea nuovo tag"""
        return await self._request("POST", "/tags", {"name": name})
    
    async def add_tag_to_contact(self, contact_id: str, tag_id: str) -> Dict:
        """Aggiunge tag a un contatto"""
        return await self._request("POST", f"/contacts/{contact_id}/tags", {"tagId": tag_id})
    
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
# HELPER FUNCTIONS PER GLI AGENTI
# ==========================================================================

def get_systeme_client() -> SystemeMCPClient:
    """Factory function per ottenere client Systeme.io"""
    return SystemeMCPClient()


# Mapping agenti -> operazioni permesse
AGENT_PERMISSIONS = {
    "VALENTINA": ["get_contacts", "get_tags", "get_courses", "get_funnels"],
    "STEFANIA": ["get_contacts", "get_tags", "create_tag", "add_tag_to_contact", "get_campaigns"],
    "ANDREA": ["get_courses", "get_course_students", "enroll_student"],
    "GAIA": ["get_funnels", "get_funnel", "get_contacts", "create_contact"],
    "MARTA": ["get_contacts", "create_contact", "update_contact", "get_tags", "add_tag_to_contact", "remove_tag_from_contact", "get_orders"],
    "ORION": ["get_contacts", "get_products", "get_orders"],
    "ATLAS": ["get_courses", "get_course_students", "get_contacts"],
    "LUCA": ["get_contacts", "get_tags"]  # Solo lettura per compliance
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
