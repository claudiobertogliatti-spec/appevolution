"""
Migrazione di consolidamento (2026-06-03): porta TUTTI i partner sul sistema
canonico `partner_journey_steps` e rimuove i sistemi legacy.

Contesto: prima del consolidamento coesistevano TRE sistemi di tracking step:
  1. partner_journey_steps  (CANONICO — unica fonte di verità)
  2. step_statuses           (legacy "done-for-you", RIMOSSO dal codice)
  3. partners.progress_details (legacy micro-step, RIMOSSO dal codice)

Questo script:
  - (opz. --reset-journey) cancella e riseeda i partner con journey canonico
    parziale/incoerente, partendo dal numero step derivato da partners.phase;
  - seeda i partner senza journey canonico;
  - riallinea partners.phase (F1..F7/LIVE) allo stato canonico (proiezione
    denormalizzata usata dal badge atto EVO in admin);
  - rimuove i campi/collezioni legacy: drop collection `step_statuses`,
    unset `partners.progress_details`.

SICUREZZA: di default gira in DRY-RUN (nessuna scrittura). Per applicare:
    cd backend
    python -m scripts.migrate_to_canonical_journey --apply
Aggiungi --reset-journey per cancellare+riseedare i journey già esistenti
(necessario per sanare incoerenze storiche; i draft `data` vengono persi).

Variabili ambiente richieste: MONGO_URL (o MONGODB_URI), DB_NAME (def: evolution_pro)
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from services.journey_seed import seed_partner_journey

# phase legacy -> numero step iniziale (in_progress) per partner non ancora lanciati.
# Conservativo: il partner può sempre riaprire uno step se trova buchi.
PHASE_TO_START_STEP = {
    "F1": 2,   # pagato, in onboarding (contratto done)
    "F2": 4,   # posizionamento/brand done
    "F3": 6,   # masterclass scriptata
    "F4": 8,   # registrazioni done
    "F5": 10,  # funnel asset in corso
    "F6": 12,  # calendario/prezzo
    "F7": 14,  # lancio
}
_TOTAL_STEPS = len(JOURNEY_STEPS_DEFINITION)  # 14
_FASE_BY_STEP = {d["step_id"]: d.get("fase_legacy", "F1") for d in JOURNEY_STEPS_DEFINITION}


def _start_step_for_phase(phase: str) -> int:
    if not phase:
        return 1
    if phase in ("LIVE", "live"):
        # già lanciato: tutti gli step done -> start oltre l'ultimo
        return _TOTAL_STEPS + 1
    # F1..F7 sono stati di Valida/Esamina ancora in corso (vedi commenti
    # PHASE_TO_START_STEP); F7=14 = step "lancio" in_progress, NON LIVE.
    return PHASE_TO_START_STEP.get(phase, 1)


async def _project_phase(db, partner_id: str, apply: bool):
    """Riallinea partners.phase allo stato canonico (come _project_legacy_phase
    nel router). Fase = fase_legacy dello step in_progress; tutti done -> LIVE."""
    steps = await db.partner_journey_steps.find(
        {"partner_id": partner_id}, {"_id": 0, "step_id": 1, "status": 1, "step_number": 1}
    ).sort("step_number", 1).to_list(length=50)
    if not steps:
        return None
    current = next((s for s in steps if s["status"] == "in_progress"), None)
    if current:
        phase = _FASE_BY_STEP.get(current["step_id"], "F1")
    elif all(s["status"] in ("done", "skipped") for s in steps):
        phase = "LIVE"
    else:
        done = [s for s in steps if s["status"] == "done"]
        last = done[-1] if done else steps[0]
        phase = _FASE_BY_STEP.get(last["step_id"], "F1")
    if apply:
        await db.partners.update_one({"id": partner_id}, {"$set": {"phase": phase}})
    return phase


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="esegue le scritture (default: dry-run)")
    ap.add_argument("--reset-journey", action="store_true",
                    help="cancella+riseeda i journey già esistenti (sana incoerenze; perde i draft)")
    args = ap.parse_args()
    apply = args.apply
    mode = "APPLY" if apply else "DRY-RUN"

    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DB_NAME", "evolution_pro")
    if not mongo_url:
        print("ERROR: MONGO_URL or MONGODB_URI not set", file=sys.stderr)
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"=== Migrazione canonico [{mode}] su DB '{db_name}' ===")
    if args.reset_journey:
        print("    reset-journey: ON (journey esistenti verranno ricreati)")

    partners = await db.partners.find({"active": True}).to_list(length=500)
    print(f"Partner attivi trovati: {len(partners)}")

    seeded = reseeded = projected = 0
    for p in partners:
        partner_id = p.get("id")
        phase = p.get("phase", "F1")
        start = _start_step_for_phase(phase)

        existing = await db.partner_journey_steps.count_documents({"partner_id": partner_id})
        incoherent = 0 < existing < _TOTAL_STEPS

        if args.reset_journey and (existing > 0) and (incoherent or True):
            if apply:
                await db.partner_journey_steps.delete_many({"partner_id": partner_id})
            existing = 0
            reseeded += 1
            print(f"  ~ reset {partner_id} ({p.get('name','?')}) - journey ricreato (phase={phase}, start={start})")

        if existing < _TOTAL_STEPS:
            if apply:
                created = await seed_partner_journey(db, partner_id, start_step_number=start)
            else:
                created = _TOTAL_STEPS - existing
            if created > 0:
                seeded += 1
                print(f"  + seed {partner_id} ({p.get('name','?')}): {created} step (start={start}, phase={phase})")

        new_phase = await _project_phase(db, partner_id, apply)
        if new_phase and new_phase != phase:
            projected += 1
            print(f"    phase {phase} -> {new_phase} (proiettata dal canonico)")

    # --- Rimozione dati legacy ---
    ss_count = await db.step_statuses.count_documents({})
    pd_count = await db.partners.count_documents({"progress_details": {"$exists": True}})
    print(f"\nLegacy da rimuovere: step_statuses={ss_count} doc | partners.progress_details={pd_count}")
    if apply:
        if ss_count:
            await db.step_statuses.drop()
            print("  drop collection step_statuses OK")
        if pd_count:
            await db.partners.update_many({}, {"$unset": {"progress_details": ""}})
            print("  unset partners.progress_details OK")

    print(f"\n[{mode}] Done. seedati={seeded} | reseedati={reseeded} | phase riproiettate={projected}")
    if not apply:
        print("Nessuna scrittura eseguita. Rilancia con --apply (e --reset-journey se vuoi sanare i journey esistenti).")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
