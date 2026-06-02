"""
Partner di TEST per girare end-to-end la Fase 1 — Esamina (agente Valentina)
nel percorso Operativo Ciak: 01-contratto · 02-discovery-video · burocrazia ·
03-brand-kit · 04-posizionamento.

Crea un partner finto, marcato in modo inequivocabile (_qa_seed="esamina"), con
un magic-link di setup password così Claudio può loggarsi in UI e cliccare tutti
gli step come un partner vero. Idempotente. Lo stesso script verifica lo stato e
fa pulizia completa.

USO (dove c'è accesso al Mongo di prod — shell prod o Cloud Run):
    cd backend
    python -m scripts.seed_test_partner_esamina --mode seed       # crea + stampa magic link
    python -m scripts.seed_test_partner_esamina --mode verify     # stato dei 5 step Esamina
    python -m scripts.seed_test_partner_esamina --mode cleanup     # rimuove tutto il test

ENV richieste:
    MONGO_URL (o MONGODB_URI / MONGO_ATLAS_URL)
    DB_NAME (default: evolution_pro)

NOTE
- Niente segreti hardcoded. Non tocca nessun partner reale: opera SOLO sui record
  con id == TEST_PARTNER_ID o flag _qa_seed == TEST_TAG.
- Il magic link riusa lo stesso schema del flusso reale (proposta.py): la pagina
  /partner/setup-password?token=... fa scegliere la password e attiva il login.
- Gli step con AI/PDF (brand-kit, posizionamento) usano il render Playwright che
  gira solo nel container di prod: lancia lo script in prod per testarli davvero.
"""
import argparse
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Permetti import dal parent dir quando lanciato come modulo (python -m scripts.x)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from models.partner_journey_step import (  # noqa: E402
    JOURNEY_STEPS_DEFINITION,
    MACRO_PHASES_DEFINITION,
)
from services.journey_seed import seed_partner_journey  # noqa: E402

# Identità di test deterministica → seed/verify/cleanup trovano sempre lo stesso record.
TEST_PARTNER_ID = "qa-esamina-test-partner"
TEST_EMAIL = "qa.esamina@ciak.io"
TEST_NAME = "QA Esamina (test)"
TEST_TAG = "esamina"  # valore di _qa_seed

# Le collezioni che gli step Esamina possono toccare (per il cleanup).
PARTNER_SCOPED_COLLECTIONS = [
    "partner_journey_steps",
    "files",
    "alerts",
    "stefania_conversations",
]

# step_ids della fase Esamina (presi dalla definizione canonica, non hardcodati a mano).
ESAMINA_STEP_IDS = next(
    mp["step_ids"] for mp in MACRO_PHASES_DEFINITION if mp["id"] == "esamina"
)


def _db():
    mongo_url = (
        os.environ.get("MONGO_URL")
        or os.environ.get("MONGODB_URI")
        or os.environ.get("MONGO_ATLAS_URL")
    )
    db_name = os.environ.get("DB_NAME", "evolution_pro")
    if not mongo_url:
        print("ERROR: MONGO_URL (o MONGODB_URI / MONGO_ATLAS_URL) non impostata", file=sys.stderr)
        sys.exit(1)
    client = AsyncIOMotorClient(mongo_url)
    return client, client[db_name]


async def seed(db) -> None:
    now = datetime.now(timezone.utc)
    setup_token = uuid.uuid4().hex
    setup_expires = (now + timedelta(days=7)).isoformat()
    setup_url = f"https://www.ciak.io/partner/setup-password?token={setup_token}"

    # users: ruolo partner + magic link di setup password (niente password in chiaro)
    await db.users.update_one(
        {"id": TEST_PARTNER_ID},
        {"$set": {
            "id": TEST_PARTNER_ID,
            "email": TEST_EMAIL,
            "name": TEST_NAME,
            "nome": TEST_NAME,
            "role": "partner",
            "stato_funnel": "pagamento_completato",
            "partner_setup_token": setup_token,
            "partner_setup_expires_at": setup_expires,
            "partner_setup_created_at": now.isoformat(),
            "partner_setup_consumed_at": None,
            "password_hash": None,
            "must_change_password": False,
            "_qa_seed": TEST_TAG,
            "updated_at": now,
        }},
        upsert=True,
    )

    # partners: attivo, fase F1, pagamento simulato
    await db.partners.update_one(
        {"id": TEST_PARTNER_ID},
        {"$set": {
            "id": TEST_PARTNER_ID,
            "name": TEST_NAME,
            "email": TEST_EMAIL,
            "role": "partner",
            "active": True,
            "phase": "F1",
            "stato_funnel": "pagamento_completato",
            "partnership_pagata": True,
            "partnership_data_pagamento": now,
            "partnership_metodo": "test-seed",
            "documents_status": "pending",
            "_qa_seed": TEST_TAG,
            "updated_at": now,
        }},
        upsert=True,
    )

    # Journey: step 1 (contratto) pre-completo, parte da 02-discovery-video — come il flusso reale.
    created = await seed_partner_journey(db, TEST_PARTNER_ID, start_step_number=2)
    # Marca i journey steps come test (per il cleanup mirato).
    await db.partner_journey_steps.update_many(
        {"partner_id": TEST_PARTNER_ID},
        {"$set": {"_qa_seed": TEST_TAG}},
    )
    # Forza 01-contratto = done (dati finti) come fa la conferma pagamento.
    await db.partner_journey_steps.update_one(
        {"partner_id": TEST_PARTNER_ID, "step_id": "01-contratto"},
        {"$set": {
            "status": "done",
            "started_at": now,
            "completed_at": now,
            "updated_at": now,
            "data.source": "test-seed",
        }},
    )
    await db.partners.update_one(
        {"id": TEST_PARTNER_ID},
        {"$set": {"journey_current_step": "02-discovery-video"}},
    )

    print("✅ Partner di test creato/aggiornato")
    print(f"   partner_id : {TEST_PARTNER_ID}")
    print(f"   email      : {TEST_EMAIL}")
    print(f"   journey    : {created} step seedati (re-run = 0, idempotente)")
    print(f"   step attivo: 02-discovery-video (01-contratto pre-completo)")
    print()
    print("🔑 Magic link per loggarti come questo partner (scadenza 7gg):")
    print(f"   {setup_url}")
    print()
    print("   Apri il link → scegli una password → entri nell'area partner e")
    print("   clicchi i 5 step di Esamina come un partner vero.")
    print()
    print("   Al termine:  python -m scripts.seed_test_partner_esamina --mode cleanup")


async def verify(db) -> None:
    partner = await db.partners.find_one({"id": TEST_PARTNER_ID}, {"_id": 0, "journey_current_step": 1})
    if not partner:
        print("⚠️  Nessun partner di test trovato. Lancia prima --mode seed.")
        return

    steps = await db.partner_journey_steps.find(
        {"partner_id": TEST_PARTNER_ID}, {"_id": 0, "step_id": 1, "status": 1}
    ).to_list(length=50)
    by_id = {s["step_id"]: s.get("status", "?") for s in steps}

    label_by_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
    icon = {"done": "✅", "in_progress": "🟡", "pending": "⬜"}

    print(f"Fase 1 — ESAMINA · partner di test  (step attivo: {partner.get('journey_current_step', '?')})")
    print("─" * 56)
    done = 0
    for sid in ESAMINA_STEP_IDS:
        st = by_id.get(sid, "MANCANTE")
        if st == "done":
            done += 1
        print(f"  {icon.get(st, '❓')}  {sid:<22} {label_by_id.get(sid, ''):<18} [{st}]")
    print("─" * 56)
    print(f"  Esamina: {done}/{len(ESAMINA_STEP_IDS)} step done")

    # Documenti generati (brand-kit / posizionamento → coll. files)
    files = await db.files.find(
        {"partner_id": TEST_PARTNER_ID}, {"_id": 0, "category": 1, "status": 1, "filename": 1}
    ).to_list(length=50)
    if files:
        print(f"\n  File generati ({len(files)}):")
        for f in files:
            print(f"    • {f.get('filename', '?')}  [{f.get('category', '?')} / {f.get('status', '?')}]")


async def cleanup(db) -> None:
    selector = {"$or": [{"partner_id": TEST_PARTNER_ID}, {"_qa_seed": TEST_TAG}]}
    id_selector = {"$or": [{"id": TEST_PARTNER_ID}, {"_qa_seed": TEST_TAG}]}

    total = 0
    for coll in PARTNER_SCOPED_COLLECTIONS:
        res = await db[coll].delete_many(selector)
        if res.deleted_count:
            print(f"  - {coll}: {res.deleted_count} record rimossi")
        total += res.deleted_count

    for coll in ("partners", "users"):
        res = await db[coll].delete_many(id_selector)
        if res.deleted_count:
            print(f"  - {coll}: {res.deleted_count} record rimossi")
        total += res.deleted_count

    print(f"🧹 Cleanup completato. Totale record rimossi: {total}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Partner di test per la Fase Esamina")
    parser.add_argument("--mode", choices=["seed", "verify", "cleanup"], default="seed")
    args = parser.parse_args()

    client, db = _db()
    try:
        if args.mode == "seed":
            await seed(db)
        elif args.mode == "verify":
            await verify(db)
        else:
            await cleanup(db)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
