"""
Evolution PRO OS - Database & Shared Dependencies
Provides MongoDB connection and common utilities for all routers
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - Always use MongoDB Atlas
ATLAS_URL = "mongodb+srv://evolution_admin:Evoluzione74@cluster0.4cgj8wx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
ATLAS_DB = "evolution_pro"

# Force Atlas connection for consistency between preview and production
mongo_url = ATLAS_URL
db_name = ATLAS_DB

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

def get_db():
    """Get database instance for dependency injection"""
    return db
