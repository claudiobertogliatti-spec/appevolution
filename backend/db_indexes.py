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


class CriticalIndexError(RuntimeError):
    """Un vincolo dati indispensabile non e' stato reso disponibile."""

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

_CRITICAL_COMPOUND_INDEXES = [
    (
        "partner_launch_calendar_versions",
        [("partner_id", 1), ("version", 1)],
        {"unique": True, "name": "partner_launch_calendar_versions_partner_version_unique"},
    ),
    (
        "partner_document_versions",
        [
            ("partner_id", 1),
            ("kind", 1),
            ("source_version", 1),
        ],
        {
            "unique": True,
            "name": "partner_document_versions_workbook_source_unique",
            "partialFilterExpression": {
                "provenance.calendar_version": {"$exists": True},
            },
        },
    ),
    (
        "partner_document_version_counters",
        [("partner_id", 1), ("kind", 1)],
        {
            "unique": True,
            "name": "partner_document_version_counters_partner_kind_unique",
        },
    ),
    (
        "partner_phase2_output_versions",
        [
            ("partner_id", 1),
            ("step_id", 1),
            ("template_id", 1),
            ("template_version", 1),
            ("checksum", 1),
            ("source_checksum", 1),
        ],
        {"unique": True, "name": "phase2_output_identity_unique"},
    ),
    (
        "partner_phase2_output_counters",
        [("partner_id", 1), ("step_id", 1)],
        {"unique": True, "name": "phase2_output_counter_unique"},
    ),
    (
        "partner_phase2_migration_reports",
        [("report_id", 1)],
        {"unique": True, "name": "phase2_migration_report_id_unique"},
    ),
    (
        "partner_phase2_migration_snapshots",
        [("report_id", 1)],
        {"unique": True, "name": "phase2_migration_snapshot_report_unique"},
    ),
    (
        "partner_phase2_migration_audit",
        [("report_id", 1)],
        {"unique": True, "name": "phase2_migration_audit_report_unique"},
    ),
]

_RETIRED_CRITICAL_INDEXES = [
    (
        "partner_document_versions",
        "partner_document_versions_workbook_calendar_unique",
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
    for coll, index_name in _RETIRED_CRITICAL_INDEXES:
        collection = db[coll]
        index_information = getattr(collection, "index_information", None)
        if not callable(index_information):
            continue
        try:
            indexes = await index_information()
            if index_name in indexes:
                try:
                    await collection.drop_index(index_name)
                except Exception:
                    # Startup concorrenti possono averlo gia' rimosso: conta lo
                    # stato finale, non chi ha vinto la migrazione.
                    indexes = await index_information()
                    if index_name in indexes:
                        raise
        except Exception as exc:
            raise CriticalIndexError(
                f"Impossibile ritirare l'indice critico obsoleto {index_name}"
            ) from exc
    for coll, fields, options in _CRITICAL_COMPOUND_INDEXES:
        try:
            await db[coll].create_index(fields, **options)
            created += 1
        except Exception as exc:
            index_name = options.get("name", "compound index")
            label = "calendar version index" if coll == "partner_launch_calendar_versions" else index_name
            raise CriticalIndexError(
                f"Impossibile creare l'indice critico {label} {coll}.{fields}"
            ) from exc
    total = len(_INDEXES) + len(_CRITICAL_COMPOUND_INDEXES)
    logger.info(f"[INDEXES] ensure_indexes: {created} ok, {failed} falliti su {total}")
    return {"ok": created, "failed": failed, "total": total}
