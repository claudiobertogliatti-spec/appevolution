#!/usr/bin/env python3
"""
Script di seed — importa/aggiorna i 22 partner in MongoDB (upsert mode)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
import json

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'evolution_pro')

# Legge i partner dal file JSON
with open('/tmp/extracted/partners_import.json', 'r') as f:
    partners_data = json.load(f)

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db['partners']

    inserted = 0
    updated = 0
    
    for p in partners_data:
        p['updated_at'] = datetime.utcnow().isoformat()
        
        # Upsert: aggiorna se esiste (per id), altrimenti inserisce
        result = await collection.update_one(
            {"id": p['id']},
            {"$set": p, "$setOnInsert": {"created_at": datetime.utcnow().isoformat()}},
            upsert=True
        )
        
        if result.upserted_id:
            inserted += 1
        elif result.modified_count > 0:
            updated += 1

    print(f'✅ Seed completato: {inserted} nuovi, {updated} aggiornati')

    # Riepilogo per fase
    from collections import defaultdict
    by_phase = defaultdict(list)
    for p in partners_data:
        by_phase[p['phase']].append(p['name'])
    
    print('\n📊 Riepilogo per fase:')
    for phase in sorted(by_phase.keys()):
        print(f'   {phase}: {len(by_phase[phase])} partner')

    # Conta totale nel DB
    total = await collection.count_documents({})
    print(f'\n📦 Totale partner nel DB: {total}')

    client.close()

if __name__ == '__main__':
    asyncio.run(seed())
