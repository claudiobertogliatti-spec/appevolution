# =============================================================================
# VALENTINA MEMORY SYSTEM
# Persistent Memory, Knowledge Base & Learning from Feedback
# =============================================================================

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection - Use Atlas if local not available
ATLAS_URL = "mongodb+srv://evolution_admin:Evoluzione74@cluster0.4cgj8wx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
ATLAS_DB = "evolution_pro"

_mongo_url = os.environ.get("MONGO_URL", "")
_db_name = os.environ.get("DB_NAME", "")

if not _mongo_url or 'localhost' in _mongo_url or '127.0.0.1' in _mongo_url:
    MONGO_URL = ATLAS_URL
    DB_NAME = ATLAS_DB
else:
    MONGO_URL = _mongo_url
    DB_NAME = _db_name or "evolution_pro"

class ValentinaMemory:
    """
    Sistema di memoria persistente per VALENTINA.
    
    3 livelli di memoria:
    1. Conversational Memory - storico conversazioni
    2. Knowledge Base - decisioni, preferenze, regole
    3. Feedback Learning - correzioni e miglioramenti
    """
    
    def __init__(self):
        self.client = None
        self.db = None
        
    async def connect(self):
        """Connect to MongoDB"""
        if not self.client:
            self.client = AsyncIOMotorClient(MONGO_URL)
            self.db = self.client[DB_NAME]
            
    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
    
    # =========================================================================
    # 1. CONVERSATIONAL MEMORY - Storico conversazioni
    # =========================================================================
    
    async def save_conversation(self, user_id: str, role: str, content: str, 
                                 context: dict = None, is_important: bool = False):
        """Salva un messaggio nella memoria conversazionale"""
        await self.connect()
        
        message = {
            "user_id": user_id,
            "role": role,  # "user" or "assistant"
            "content": content,
            "context": context or {},
            "is_important": is_important,  # Flag per messaggi da ricordare sempre
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.valentina_conversations.insert_one(message)
        
        # Se è importante, salvalo anche nella knowledge base
        if is_important:
            await self.add_knowledge(
                user_id=user_id,
                category="conversation_highlight",
                content=content,
                source="auto_detected"
            )
    
    async def get_recent_conversations(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Recupera le conversazioni recenti"""
        await self.connect()
        
        messages = await self.db.valentina_conversations.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return list(reversed(messages))  # Ordine cronologico
    
    async def get_important_conversations(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Recupera solo i messaggi importanti"""
        await self.connect()
        
        messages = await self.db.valentina_conversations.find(
            {"user_id": user_id, "is_important": True},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return list(reversed(messages))
    
    async def mark_as_important(self, user_id: str, content_snippet: str):
        """Marca un messaggio come importante"""
        await self.connect()
        
        await self.db.valentina_conversations.update_many(
            {"user_id": user_id, "content": {"$regex": content_snippet, "$options": "i"}},
            {"$set": {"is_important": True}}
        )
    
    # =========================================================================
    # 2. KNOWLEDGE BASE - Decisioni, preferenze, regole
    # =========================================================================
    
    async def add_knowledge(self, user_id: str, category: str, content: str, 
                           source: str = "manual", metadata: dict = None):
        """
        Aggiunge una conoscenza alla knowledge base.
        
        Categories:
        - preference: Preferenze utente (es. "report brevi")
        - rule: Regole operative (es. "non contattare weekend")
        - decision: Decisioni prese (es. "tripwire a €7")
        - fact: Fatti importanti (es. "13k lead da Systeme")
        - correction: Correzioni a comportamenti errati
        - conversation_highlight: Estratti importanti dalle conversazioni
        """
        await self.connect()
        
        knowledge = {
            "user_id": user_id,
            "category": category,
            "content": content,
            "source": source,  # "manual", "auto_detected", "feedback"
            "metadata": metadata or {},
            "active": True,
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Evita duplicati
        existing = await self.db.valentina_knowledge.find_one({
            "user_id": user_id,
            "category": category,
            "content": content
        })
        
        if existing:
            await self.db.valentina_knowledge.update_one(
                {"_id": existing["_id"]},
                {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                 "$inc": {"usage_count": 1}}
            )
        else:
            await self.db.valentina_knowledge.insert_one(knowledge)
    
    async def get_knowledge(self, user_id: str, category: str = None, 
                           limit: int = 50) -> List[Dict]:
        """Recupera conoscenze dalla knowledge base"""
        await self.connect()
        
        query = {"user_id": user_id, "active": True}
        if category:
            query["category"] = category
        
        knowledge = await self.db.valentina_knowledge.find(
            query,
            {"_id": 0}
        ).sort("usage_count", -1).limit(limit).to_list(limit)
        
        return knowledge
    
    async def get_all_knowledge_for_prompt(self, user_id: str) -> str:
        """
        Genera una stringa con tutta la knowledge base per il prompt.
        Formattata per essere inclusa nel system prompt di VALENTINA.
        """
        await self.connect()
        
        knowledge = await self.db.valentina_knowledge.find(
            {"user_id": user_id, "active": True},
            {"_id": 0}
        ).sort("usage_count", -1).limit(30).to_list(30)
        
        if not knowledge:
            return ""
        
        sections = {
            "preference": [],
            "rule": [],
            "decision": [],
            "fact": [],
            "correction": []
        }
        
        for k in knowledge:
            cat = k.get("category", "fact")
            if cat in sections:
                sections[cat].append(k["content"])
            elif cat == "conversation_highlight":
                sections["fact"].append(k["content"])
        
        result = []
        
        if sections["preference"]:
            result.append("📝 PREFERENZE DI CLAUDIO:")
            for p in sections["preference"][:5]:
                result.append(f"  - {p}")
        
        if sections["rule"]:
            result.append("\n⚠️ REGOLE OPERATIVE:")
            for r in sections["rule"][:5]:
                result.append(f"  - {r}")
        
        if sections["decision"]:
            result.append("\n✅ DECISIONI PRESE:")
            for d in sections["decision"][:5]:
                result.append(f"  - {d}")
        
        if sections["fact"]:
            result.append("\n📊 FATTI IMPORTANTI:")
            for f in sections["fact"][:5]:
                result.append(f"  - {f}")
        
        if sections["correction"]:
            result.append("\n🔧 CORREZIONI DA RICORDARE:")
            for c in sections["correction"][:5]:
                result.append(f"  - {c}")
        
        return "\n".join(result)
    
    async def deactivate_knowledge(self, user_id: str, content_snippet: str):
        """Disattiva una conoscenza (non la elimina)"""
        await self.connect()
        
        await self.db.valentina_knowledge.update_many(
            {"user_id": user_id, "content": {"$regex": content_snippet, "$options": "i"}},
            {"$set": {"active": False}}
        )
    
    # =========================================================================
    # 3. FEEDBACK LEARNING - Correzioni e miglioramenti
    # =========================================================================
    
    async def save_feedback(self, user_id: str, original_response: str, 
                           correction: str, feedback_type: str = "correction"):
        """
        Salva un feedback per migliorare le risposte future.
        
        feedback_type:
        - correction: Risposta sbagliata da correggere
        - improvement: Suggerimento per migliorare
        - positive: Feedback positivo (risposta buona da replicare)
        """
        await self.connect()
        
        feedback = {
            "user_id": user_id,
            "original_response": original_response,
            "correction": correction,
            "feedback_type": feedback_type,
            "applied": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.valentina_feedback.insert_one(feedback)
        
        # Se è una correzione, aggiungila alla knowledge base
        if feedback_type == "correction":
            await self.add_knowledge(
                user_id=user_id,
                category="correction",
                content=f"NON dire: '{original_response[:100]}...' → INVECE: '{correction[:100]}...'",
                source="feedback"
            )
    
    async def get_corrections(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Recupera le correzioni recenti per evitare errori ripetuti"""
        await self.connect()
        
        corrections = await self.db.valentina_feedback.find(
            {"user_id": user_id, "feedback_type": "correction"},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return corrections
    
    async def get_positive_examples(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Recupera esempi positivi da replicare"""
        await self.connect()
        
        examples = await self.db.valentina_feedback.find(
            {"user_id": user_id, "feedback_type": "positive"},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return examples
    
    # =========================================================================
    # UTILITY METHODS
    # =========================================================================
    
    async def get_full_context_for_prompt(self, user_id: str) -> str:
        """
        Genera il contesto completo per il prompt di VALENTINA.
        Include: conversazioni recenti, knowledge base, correzioni.
        """
        await self.connect()
        
        parts = []
        
        # 1. Knowledge Base
        knowledge_str = await self.get_all_knowledge_for_prompt(user_id)
        if knowledge_str:
            parts.append("=== MEMORIA KNOWLEDGE BASE ===")
            parts.append(knowledge_str)
        
        # 2. Conversazioni importanti recenti
        important = await self.get_important_conversations(user_id, limit=5)
        if important:
            parts.append("\n=== CONVERSAZIONI IMPORTANTI RECENTI ===")
            for msg in important[-3:]:  # Ultimi 3
                role = "Claudio" if msg["role"] == "user" else "VALENTINA"
                parts.append(f"{role}: {msg['content'][:200]}...")
        
        # 3. Correzioni da evitare
        corrections = await self.get_corrections(user_id, limit=3)
        if corrections:
            parts.append("\n=== ERRORI DA NON RIPETERE ===")
            for c in corrections:
                parts.append(f"❌ Non dire: {c['original_response'][:100]}...")
                parts.append(f"✅ Invece: {c['correction'][:100]}...")
        
        return "\n".join(parts) if parts else ""
    
    async def auto_detect_important_content(self, content: str) -> bool:
        """
        Rileva automaticamente se un contenuto è importante da ricordare.
        """
        important_keywords = [
            "ricorda", "importante", "regola", "sempre", "mai", "decisione",
            "preferisco", "voglio", "non voglio", "d'ora in poi", "da oggi",
            "strategia", "obiettivo", "priorità", "budget", "deadline"
        ]
        
        content_lower = content.lower()
        return any(kw in content_lower for kw in important_keywords)
    
    async def extract_and_save_knowledge(self, user_id: str, message: str):
        """
        Estrae automaticamente conoscenze da un messaggio e le salva.
        """
        message_lower = message.lower()
        
        # Rileva preferenze
        if any(kw in message_lower for kw in ["preferisco", "mi piace", "voglio"]):
            await self.add_knowledge(user_id, "preference", message, "auto_detected")
        
        # Rileva regole
        if any(kw in message_lower for kw in ["sempre", "mai", "regola", "d'ora in poi"]):
            await self.add_knowledge(user_id, "rule", message, "auto_detected")
        
        # Rileva decisioni
        if any(kw in message_lower for kw in ["decido", "decisione", "facciamo così", "procediamo"]):
            await self.add_knowledge(user_id, "decision", message, "auto_detected")


# Singleton instance
valentina_memory = ValentinaMemory()
