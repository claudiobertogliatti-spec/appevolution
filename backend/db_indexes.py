"""Creazione idempotente degli indici Mongo per le query calde.

Chiamato una volta allo startup (server.py, `start_background_services`).
`create_index` è idempotente: creare un indice già esistente è un no-op.

Gli indici a campo singolo sono NON unique di proposito: velocizzano le lookup
senza rischiare un fallimento di build su eventuali duplicati nei dati esistenti.
Le nuove risorse versionate dichiarano invece il proprio vincolo unico. Ogni
indice è protetto da try/except: il fallimento di uno non blocca gli altri né lo
startup.

Coprono i campi usati nei `find`/`find_one` più frequenti del backend.
"""
import logging

logger = logging.getLogger(__name__)

# (collection, campo) — indici a campo singolo, ascendente.
_INDEXES = [
    ("partners", "id"),
    ("partners", "evolution_id"),
    ("users", "id"),
    ("users", "email"),
    ("clienti_analisi", "id"),
    ("clienti_analisi", "email"),
    ("masterclass_factory", "partner_id"),
    ("masterclass_factory", "video_pipeline_status"),
    ("partner_videocorso", "partner_id"),
    ("partner_journey_steps", "partner_id"),
    ("diagnostic_sessions", "session_token"),
    ("diagnostic_sessions", "user_email"),
    ("pipeline_jobs", "job_id"),
    ("pipeline_jobs", "status"),
    ("ciak_leads", "email"),
    ("stripe_events", "event_id"),
    ("collaborator_settlements", "settlement_id"),
    ("collaborator_settlements", "collaborator_id"),
    ("collaborator_settlements", "status"),
    ("agent_tasks", "collaborator_settlement_id"),
]

_COMPOUND_INDEXES = [
    (
        "partner_launch_calendar_versions",
        [("partner_id", 1), ("version", 1)],
        {"unique": True, "name": "partner_launch_calendar_versions_partner_version_unique"},
    ),
]

async def ensure_indexes(db):
    """Crea (idempotente) gli indici sulle collezioni calde. Ritorna un riepilogo."""
    created = 0
    failed = 0
    for coll, field in _INDEXES:
        try:
            await db[coll].create_index(field)
            created += 1
        except Exception as e:  # pragma: no cover - difensivo, non deve bloccare lo startup
            failed += 1
            logger.warning(f"[INDEXES] {coll}.{field}: {e}")
    for coll, fields, options in _COMPOUND_INDEXES:
        try:
            await db[coll].create_index(fields, **options)
            created += 1
        except Exception as e:  # pragma: no cover - difensivo, non deve bloccare lo startup
            failed += 1
            logger.warning(f"[INDEXES] {coll}.{fields}: {e}")
    total = len(_INDEXES) + len(_COMPOUND_INDEXES)
    logger.info(f"[INDEXES] ensure_indexes: {created} ok, {failed} falliti su {total}")
    return {"ok": created, "failed": failed, "total": total}
