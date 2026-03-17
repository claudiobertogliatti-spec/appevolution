"""
Router per la Dashboard Operations (Antonella)
Gestisce: Partner attivi, Contenuti, Campagne ADV
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import logging

router = APIRouter(prefix="/api/operations", tags=["operations"])

# Database reference (verrà impostato da server.py)
db = None

def set_operations_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════
# MODELLI PYDANTIC
# ═══════════════════════════════════════════════════════════════

class CampagnaADVCreate(BaseModel):
    partner_id: str
    piattaforma: str  # Meta, Google, TikTok, LinkedIn, Altro
    nome_campagna: str
    budget_giornaliero: float = 0
    budget_totale: float = 0
    data_inizio: str
    data_fine: Optional[str] = None
    stato: str = "attiva"  # attiva, in_pausa, terminata
    note: Optional[str] = ""

class CampagnaADVUpdate(BaseModel):
    piattaforma: Optional[str] = None
    nome_campagna: Optional[str] = None
    budget_giornaliero: Optional[float] = None
    budget_totale: Optional[float] = None
    data_inizio: Optional[str] = None
    data_fine: Optional[str] = None
    stato: Optional[str] = None
    note: Optional[str] = None
    risultati: Optional[Dict[str, Any]] = None

class PartnerNoteUpdate(BaseModel):
    partner_id: str
    note: str

class ContenutoCommentoAdd(BaseModel):
    partner_id: str
    documento_tipo: str  # script_masterclass, copy_sales, email_sequence
    commento: str

class SocialCalendarUpdate(BaseModel):
    partner_id: str
    giorno: str
    stato: str  # bozza, approvato, pubblicato

# ═══════════════════════════════════════════════════════════════
# ENDPOINT PARTNER
# ═══════════════════════════════════════════════════════════════

@router.get("/partners")
async def get_partners_attivi():
    """
    Lista partner attivi (fase >= F1) per dashboard Antonella.
    
    FIX: Usa la collection 'partners' (non 'users') che contiene i record aggiornati.
    Filtra per phase != F0 (partner attivi in percorso).
    """
    try:
        # Cerca nella collection PARTNERS (non users!)
        # Filtra partner con phase attiva (diversa da F0 e non vuota)
        partners = await db.partners.find({
            "$or": [
                {"phase": {"$exists": True, "$nin": ["F0", "", None]}},
                {"fase": {"$exists": True, "$nin": ["F0", "", None]}}
            ]
        }, {"_id": 0}).to_list(200)
        
        # Se la collection partners è vuota, fallback su users
        if not partners:
            logging.warning("Collection 'partners' vuota, fallback su 'users'")
            partners = await db.users.find({
                "user_type": "partner",
                "$or": [
                    {"fase": {"$exists": True, "$nin": ["F0", "", None]}},
                    {"phase": {"$exists": True, "$nin": ["F0", "", None]}}
                ]
            }, {"_id": 0, "password": 0, "hashed_password": 0, "password_hash": 0}).to_list(200)
        
        # Normalizza campi (alcuni record usano 'phase', altri 'fase')
        oggi = datetime.now(timezone.utc)
        for p in partners:
            # Normalizza phase/fase
            if not p.get("phase") and p.get("fase"):
                p["phase"] = p["fase"]
            elif not p.get("fase") and p.get("phase"):
                p["fase"] = p["phase"]
            
            # Normalizza name/nome
            if not p.get("name"):
                nome = p.get("nome", "")
                cognome = p.get("cognome", "")
                p["name"] = f"{nome} {cognome}".strip() or "Partner"
            
            # Normalizza niche/nicchia
            if not p.get("niche"):
                p["niche"] = p.get("nicchia", "—")
            
            # Calcola ritardi
            ultimo_aggiornamento = p.get("ultimo_aggiornamento") or p.get("updated_at") or p.get("created_at")
            if ultimo_aggiornamento:
                try:
                    if isinstance(ultimo_aggiornamento, str):
                        ultimo_aggiornamento = datetime.fromisoformat(ultimo_aggiornamento.replace("Z", "+00:00"))
                    
                    # Gestisci datetime naive (aggiungi timezone)
                    if ultimo_aggiornamento.tzinfo is None:
                        ultimo_aggiornamento = ultimo_aggiornamento.replace(tzinfo=timezone.utc)
                    
                    giorni_da_ultimo = (oggi - ultimo_aggiornamento).days
                    p["giorni_da_ultimo_update"] = giorni_da_ultimo
                    p["in_ritardo"] = giorni_da_ultimo > 7
                except Exception as date_err:
                    logging.debug(f"Errore parsing data: {date_err}")
                    p["giorni_da_ultimo_update"] = None
                    p["in_ritardo"] = False
            else:
                p["giorni_da_ultimo_update"] = None
                p["in_ritardo"] = False
        
        logging.info(f"[Operations] Trovati {len(partners)} partner attivi")
        return {"success": True, "partners": partners, "total": len(partners)}
    except Exception as e:
        logging.error(f"Errore get_partners_attivi: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/partner/{partner_id}")
async def get_partner_dettaglio(partner_id: str):
    """Dettaglio singolo partner"""
    try:
        partner = await db.users.find_one(
            {"$or": [{"id": partner_id}, {"_id": ObjectId(partner_id) if len(partner_id) == 24 else None}], "user_type": "partner"},
            {"_id": 0, "password": 0, "hashed_password": 0}
        )
        if not partner:
            raise HTTPException(status_code=404, detail="Partner non trovato")
        
        # Carica note interne
        notes = await db.partner_notes.find_one({"partner_id": partner_id}, {"_id": 0})
        partner["note_interne"] = notes.get("note", "") if notes else ""
        
        return {"success": True, "partner": partner}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Errore get_partner_dettaglio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/partner/note")
async def update_partner_note(data: PartnerNoteUpdate):
    """Aggiorna note interne partner (solo Antonella)"""
    try:
        await db.partner_notes.update_one(
            {"partner_id": data.partner_id},
            {"$set": {
                "partner_id": data.partner_id,
                "note": data.note,
                "updated_by": "antonella",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        return {"success": True, "message": "Note aggiornate"}
    except Exception as e:
        logging.error(f"Errore update_partner_note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════
# ENDPOINT CONTENUTI
# ═══════════════════════════════════════════════════════════════

@router.get("/contenuti/{partner_id}")
async def get_contenuti_partner(partner_id: str):
    """Recupera tutti i contenuti di un partner"""
    try:
        # Script & Copy
        documenti = await db.partner_documenti.find(
            {"partner_id": partner_id},
            {"_id": 0}
        ).to_list(100)
        
        # Social Calendar
        calendar = await db.social_calendar.find(
            {"partner_id": partner_id},
            {"_id": 0}
        ).to_list(100)
        
        # Video & Materiali
        videos = await db.partner_videos.find(
            {"partner_id": partner_id},
            {"_id": 0}
        ).to_list(100)
        
        # Commenti Antonella
        commenti = await db.contenuti_commenti.find(
            {"partner_id": partner_id},
            {"_id": 0}
        ).to_list(100)
        
        return {
            "success": True,
            "documenti": documenti,
            "calendar": calendar,
            "videos": videos,
            "commenti": commenti
        }
    except Exception as e:
        logging.error(f"Errore get_contenuti_partner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/contenuti/commento")
async def add_contenuto_commento(data: ContenutoCommentoAdd):
    """Aggiunge commento di Antonella a un documento"""
    try:
        commento_doc = {
            "id": str(uuid.uuid4()),
            "partner_id": data.partner_id,
            "documento_tipo": data.documento_tipo,
            "commento": data.commento,
            "autore": "Antonella",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.contenuti_commenti.insert_one(commento_doc)
        # Remove MongoDB _id before returning
        if "_id" in commento_doc:
            del commento_doc["_id"]
        return {"success": True, "commento": commento_doc}
    except Exception as e:
        logging.error(f"Errore add_contenuto_commento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/contenuti/calendar")
async def update_social_calendar(data: SocialCalendarUpdate):
    """Aggiorna stato del social calendar"""
    try:
        await db.social_calendar.update_one(
            {"partner_id": data.partner_id, "giorno": data.giorno},
            {"$set": {
                "stato": data.stato,
                "updated_by": "antonella",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        return {"success": True, "message": "Calendario aggiornato"}
    except Exception as e:
        logging.error(f"Errore update_social_calendar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════
# ENDPOINT CAMPAGNE ADV
# ═══════════════════════════════════════════════════════════════

@router.get("/campagne")
async def get_campagne(partner_id: Optional[str] = None):
    """Lista campagne ADV, opzionalmente filtrate per partner"""
    try:
        query = {}
        if partner_id:
            query["partner_id"] = partner_id
        
        campagne = await db.campagne_adv.find(query, {"_id": 0}).to_list(200)
        
        # Calcola aggregati per partner se specificato
        aggregati = None
        if partner_id and campagne:
            totale_lead = sum(c.get("risultati", {}).get("lead", 0) for c in campagne)
            totale_budget = sum(c.get("budget_totale", 0) for c in campagne)
            totale_costo = sum(c.get("risultati", {}).get("lead", 0) * c.get("risultati", {}).get("costo_per_lead", 0) for c in campagne)
            campagne_attive = len([c for c in campagne if c.get("stato") == "attiva"])
            
            aggregati = {
                "totale_lead": totale_lead,
                "budget_investito": totale_budget,
                "cpl_medio": round(totale_costo / totale_lead, 2) if totale_lead > 0 else 0,
                "campagne_attive": campagne_attive
            }
        
        return {"success": True, "campagne": campagne, "aggregati": aggregati}
    except Exception as e:
        logging.error(f"Errore get_campagne: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campagne")
async def create_campagna(data: CampagnaADVCreate):
    """Crea nuova campagna ADV"""
    try:
        campagna = {
            "id": str(uuid.uuid4()),
            "partner_id": data.partner_id,
            "piattaforma": data.piattaforma,
            "nome_campagna": data.nome_campagna,
            "budget_giornaliero": data.budget_giornaliero,
            "budget_totale": data.budget_totale,
            "data_inizio": data.data_inizio,
            "data_fine": data.data_fine,
            "stato": data.stato,
            "risultati": {
                "impression": 0,
                "click": 0,
                "lead": 0,
                "costo_per_lead": 0,
                "conversioni": 0
            },
            "note": data.note or "",
            "creato_da": "antonella",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ultimo_aggiornamento": datetime.now(timezone.utc).isoformat()
        }
        
        await db.campagne_adv.insert_one(campagna)
        if "_id" in campagna:
            del campagna["_id"]
        
        return {"success": True, "campagna": campagna}
    except Exception as e:
        logging.error(f"Errore create_campagna: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/campagne/{campagna_id}")
async def update_campagna(campagna_id: str, data: CampagnaADVUpdate):
    """Aggiorna campagna ADV"""
    try:
        update_data = {"ultimo_aggiornamento": datetime.now(timezone.utc).isoformat()}
        
        if data.piattaforma is not None:
            update_data["piattaforma"] = data.piattaforma
        if data.nome_campagna is not None:
            update_data["nome_campagna"] = data.nome_campagna
        if data.budget_giornaliero is not None:
            update_data["budget_giornaliero"] = data.budget_giornaliero
        if data.budget_totale is not None:
            update_data["budget_totale"] = data.budget_totale
        if data.data_inizio is not None:
            update_data["data_inizio"] = data.data_inizio
        if data.data_fine is not None:
            update_data["data_fine"] = data.data_fine
        if data.stato is not None:
            update_data["stato"] = data.stato
        if data.note is not None:
            update_data["note"] = data.note
        if data.risultati is not None:
            update_data["risultati"] = data.risultati
        
        result = await db.campagne_adv.update_one(
            {"id": campagna_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Campagna non trovata")
        
        campagna = await db.campagne_adv.find_one({"id": campagna_id}, {"_id": 0})
        return {"success": True, "campagna": campagna}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Errore update_campagna: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/campagne/{campagna_id}")
async def delete_campagna(campagna_id: str):
    """Elimina campagna ADV"""
    try:
        result = await db.campagne_adv.delete_one({"id": campagna_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campagna non trovata")
        
        return {"success": True, "message": "Campagna eliminata"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Errore delete_campagna: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════
# ENDPOINT STATISTICHE
# ═══════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_operations_stats():
    """
    Statistiche generali per la dashboard operations.
    
    FIX: Usa collection 'partners' invece di 'users' per conteggio accurato.
    """
    try:
        # Conta partner attivi dalla collection PARTNERS
        partner_count = await db.partners.count_documents({
            "$or": [
                {"phase": {"$exists": True, "$nin": ["F0", "", None]}},
                {"fase": {"$exists": True, "$nin": ["F0", "", None]}}
            ]
        })
        
        # Fallback su users se partners è vuota
        if partner_count == 0:
            partner_count = await db.users.count_documents({
                "user_type": "partner",
                "$or": [
                    {"fase": {"$exists": True, "$nin": ["F0", "", None]}},
                    {"phase": {"$exists": True, "$nin": ["F0", "", None]}}
                ]
            })
        
        # Conta campagne attive
        campagne_attive = await db.campagne_adv.count_documents({"stato": "attiva"})
        
        # Partner in ritardo (>7 giorni senza update)
        oggi = datetime.now(timezone.utc)
        partners = await db.partners.find({
            "$or": [
                {"phase": {"$exists": True, "$nin": ["F0", "", None]}},
                {"fase": {"$exists": True, "$nin": ["F0", "", None]}}
            ]
        }, {"ultimo_aggiornamento": 1, "updated_at": 1}).to_list(200)
        
        in_ritardo = 0
        for p in partners:
            ultimo = p.get("ultimo_aggiornamento") or p.get("updated_at")
            if ultimo:
                try:
                    if isinstance(ultimo, str):
                        ultimo = datetime.fromisoformat(ultimo.replace("Z", "+00:00"))
                    if (oggi - ultimo).days > 7:
                        in_ritardo += 1
                except:
                    pass
        
        logging.info(f"[Operations Stats] Partner: {partner_count}, Campagne: {campagne_attive}, Ritardo: {in_ritardo}")
        
        return {
            "success": True,
            "stats": {
                "partner_attivi": partner_count,
                "campagne_attive": campagne_attive,
                "partner_in_ritardo": in_ritardo
            }
        }
    except Exception as e:
        logging.error(f"Errore get_operations_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
