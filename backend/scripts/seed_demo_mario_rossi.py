"""
Partner DEMO "Mario Rossi" per registrare il videocorso di onboarding Ciak.

Stesso identico meccanismo di seed_test_partner_esamina.py (scrive SOLO su Mongo,
non tocca Systeme, non manda email, idempotente, con cleanup mirato) ma con
identità presentabile a schermo: "Mario Rossi" invece di "QA Esamina (test)".

USO (dove c'è accesso al Mongo di prod):
    cd backend
    python -m scripts.seed_demo_mario_rossi --mode seed       # crea + stampa magic link
    python -m scripts.seed_demo_mario_rossi --mode verify     # stato degli step
    python -m scripts.seed_demo_mario_rossi --mode cleanup     # rimuove tutto il demo

ENV richieste: MONGO_URL (o MONGODB_URI / MONGO_ATLAS_URL), DB_NAME (default: evolution_pro)

Opera SOLO sui record con id == DEMO_PARTNER_ID o flag _qa_seed == DEMO_TAG.
"""
import argparse
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from models.partner_journey_step import (  # noqa: E402
    JOURNEY_STEPS_DEFINITION,
    MACRO_PHASES_DEFINITION,
)
from services.journey_seed import seed_partner_journey  # noqa: E402

# Identità demo deterministica (presentabile nel video).
DEMO_PARTNER_ID = "demo-mario-rossi"
DEMO_EMAIL = "mario.rossi.demo@ciak.io"
DEMO_NAME = "Mario Rossi"
DEMO_TAG = "demo-mario"  # valore di _qa_seed

PARTNER_SCOPED_COLLECTIONS = [
    "partner_journey_steps",
    "files",
    "alerts",
    "stefania_conversations",
]

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

    await db.users.update_one(
        {"id": DEMO_PARTNER_ID},
        {
            "$set": {
                "id": DEMO_PARTNER_ID,
                "email": DEMO_EMAIL,
                "name": DEMO_NAME,
                "nome": DEMO_NAME,
                "role": "partner",
                # Necessario: require_partner_or_admin_for_partner() proietta
                # {"_id":0,"partner_id":1}; senza il campo il doc torna {} (falsy)
                # e la guardia risponde 404 "Utente non trovato".
                "partner_id": DEMO_PARTNER_ID,
                "stato_funnel": "pagamento_completato",
                "_qa_seed": DEMO_TAG,
                "updated_at": now,
            },
            # Solo alla creazione: un re-run non deve invalidare la password
            # già scelta col magic link né rigenerare il token.
            "$setOnInsert": {
                "partner_setup_token": setup_token,
                "partner_setup_expires_at": setup_expires,
                "partner_setup_created_at": now.isoformat(),
                "partner_setup_consumed_at": None,
                "password_hash": None,
                "must_change_password": False,
            },
        },
        upsert=True,
    )

    await db.partners.update_one(
        {"id": DEMO_PARTNER_ID},
        {"$set": {
            "id": DEMO_PARTNER_ID,
            "name": DEMO_NAME,
            "email": DEMO_EMAIL,
            "role": "partner",
            "active": True,
            "phase": "F1",
            "stato_funnel": "pagamento_completato",
            "partnership_pagata": True,
            "partnership_data_pagamento": now,
            "partnership_metodo": "demo-seed",
            "documents_status": "pending",
            "_qa_seed": DEMO_TAG,
            "updated_at": now,
        }},
        upsert=True,
    )

    created = await seed_partner_journey(db, DEMO_PARTNER_ID, start_step_number=2)
    await db.partner_journey_steps.update_many(
        {"partner_id": DEMO_PARTNER_ID},
        {"$set": {"_qa_seed": DEMO_TAG}},
    )
    await db.partner_journey_steps.update_one(
        {"partner_id": DEMO_PARTNER_ID, "step_id": "01-contratto"},
        {"$set": {
            "status": "done",
            "started_at": now,
            "completed_at": now,
            "updated_at": now,
            "data.source": "demo-seed",
        }},
    )
    await db.partners.update_one(
        {"id": DEMO_PARTNER_ID},
        {"$set": {"journey_current_step": "02-discovery-video"}},
    )

    print("OK Partner DEMO creato/aggiornato")
    print(f"   partner_id : {DEMO_PARTNER_ID}")
    print(f"   nome       : {DEMO_NAME}")
    print(f"   email      : {DEMO_EMAIL}")
    print(f"   journey    : {created} step seedati (re-run = 0, idempotente)")
    print()
    print("MAGIC LINK per impostare la password ed entrare (scadenza 7gg):")
    print(f"   {setup_url}")
    print()
    print("   Cleanup:  python -m scripts.seed_demo_mario_rossi --mode cleanup")


async def verify(db) -> None:
    partner = await db.partners.find_one({"id": DEMO_PARTNER_ID}, {"_id": 0, "journey_current_step": 1})
    if not partner:
        print("Nessun partner demo trovato. Lancia prima --mode seed.")
        return

    steps = await db.partner_journey_steps.find(
        {"partner_id": DEMO_PARTNER_ID}, {"_id": 0, "step_id": 1, "status": 1}
    ).to_list(length=50)
    by_id = {s["step_id"]: s.get("status", "?") for s in steps}
    label_by_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
    icon = {"done": "[x]", "in_progress": "[~]", "pending": "[ ]"}

    print(f"Partner DEMO Mario Rossi  (step attivo: {partner.get('journey_current_step', '?')})")
    print("-" * 56)
    done = 0
    for sid in ESAMINA_STEP_IDS:
        st = by_id.get(sid, "MANCANTE")
        if st == "done":
            done += 1
        print(f"  {icon.get(st, '?')}  {sid:<22} {label_by_id.get(sid, ''):<18} [{st}]")
    print("-" * 56)
    print(f"  Esamina: {done}/{len(ESAMINA_STEP_IDS)} step done")


async def reset(db) -> None:
    """Riporta il partner demo all'INIZIO del percorso (fase Esamina, primo passo).

    Serve per registrare il videocorso partendo dal principio. Cancella e ricrea
    SOLO i journey step del demo: utente, password e magic link non si toccano.
    """
    now = datetime.now(timezone.utc)
    deleted = await db.partner_journey_steps.delete_many({"partner_id": DEMO_PARTNER_ID})
    created = await seed_partner_journey(db, DEMO_PARTNER_ID, start_step_number=2)
    await db.partner_journey_steps.update_many(
        {"partner_id": DEMO_PARTNER_ID},
        {"$set": {"_qa_seed": DEMO_TAG}},
    )
    # 01-contratto pre-completo come nel flusso reale post-pagamento.
    await db.partner_journey_steps.update_one(
        {"partner_id": DEMO_PARTNER_ID, "step_id": "01-contratto"},
        {"$set": {
            "status": "done",
            "started_at": now,
            "completed_at": now,
            "updated_at": now,
            "data.source": "demo-seed",
        }},
    )
    # IMPORTANTE: serve uno step in_progress. get_operativo_state() calcola
    # current_step = primo "in_progress"; se non ne trova NESSUNO ripiega su
    # steps[-1] (l'ultimo = 13-lancio) e l'area mostra la fase sbagliata.
    await db.partner_journey_steps.update_one(
        {"partner_id": DEMO_PARTNER_ID, "step_id": "02-discovery-video"},
        {"$set": {
            "status": "in_progress",
            "started_at": now,
            "completed_at": None,
            "updated_at": now,
        }},
    )
    await db.partners.update_one(
        {"id": DEMO_PARTNER_ID},
        {"$set": {
            "phase": "F1",
            "journey_current_step": "02-discovery-video",
            "updated_at": now,
        }},
    )
    print(f"Reset percorso: {deleted.deleted_count} step rimossi, {created} ricreati.")
    print("Mario Rossi a INIZIO percorso: 01-contratto done, '02-discovery-video' IN CORSO (Benvenuto/a).")


async def cleanup(db) -> None:
    selector = {"$or": [{"partner_id": DEMO_PARTNER_ID}, {"_qa_seed": DEMO_TAG}]}
    id_selector = {"$or": [{"id": DEMO_PARTNER_ID}, {"_qa_seed": DEMO_TAG}]}

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

    print(f"Cleanup completato. Totale record rimossi: {total}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Partner demo Mario Rossi per il videocorso")
    parser.add_argument("--mode", choices=["seed", "verify", "reset", "cleanup"], default="seed")
    args = parser.parse_args()

    client, db = _db()
    try:
        if args.mode == "seed":
            await seed(db)
        elif args.mode == "verify":
            await verify(db)
        elif args.mode == "reset":
            await reset(db)
        else:
            await cleanup(db)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
