"""
MongoDB Aggregated Views for Evolution PRO
Creates unified views for partner data across multiple collections.

This avoids modifying the underlying data structure while providing
a clean, unified interface for reading partner information.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def create_partner_unified_view(db):
    """
    Creates an aggregated view that unifies partner data from multiple collections.
    
    Collections aggregated:
    - partners (base info)
    - partner_posizionamento (course structure)
    - partner_masterclass (masterclass scripts)
    - partner_funnel (funnel content)
    - pipeline_jobs (video production)
    - partner_payments (payment history)
    - heygen_jobs (HeyGen video jobs)
    """
    
    try:
        # Drop existing view if exists
        try:
            await db.drop_collection("partner_unified_view")
            logger.info("[VIEW] Dropped existing partner_unified_view")
        except Exception:
            pass
        
        # Create the aggregated view
        pipeline = [
            # Start with partners collection
            {"$match": {}},
            
            # Lookup posizionamento data
            {"$lookup": {
                "from": "partner_posizionamento",
                "localField": "id",
                "foreignField": "partner_id",
                "as": "posizionamento_data"
            }},
            {"$addFields": {
                "posizionamento": {"$arrayElemAt": ["$posizionamento_data", 0]}
            }},
            
            # Lookup masterclass data
            {"$lookup": {
                "from": "partner_masterclass",
                "localField": "id",
                "foreignField": "partner_id",
                "as": "masterclass_data"
            }},
            {"$addFields": {
                "masterclass": {"$arrayElemAt": ["$masterclass_data", 0]}
            }},
            
            # Lookup funnel data
            {"$lookup": {
                "from": "partner_funnel",
                "localField": "id",
                "foreignField": "partner_id",
                "as": "funnel_data"
            }},
            {"$addFields": {
                "funnel": {"$arrayElemAt": ["$funnel_data", 0]}
            }},
            
            # Lookup pipeline jobs (video production)
            {"$lookup": {
                "from": "pipeline_jobs",
                "localField": "id",
                "foreignField": "partner_id",
                "as": "pipeline_jobs"
            }},
            {"$addFields": {
                "latest_pipeline_job": {"$arrayElemAt": [
                    {"$sortArray": {"input": "$pipeline_jobs", "sortBy": {"created_at": -1}}},
                    0
                ]},
                "pipeline_jobs_count": {"$size": "$pipeline_jobs"},
                "completed_videos_count": {
                    "$size": {
                        "$filter": {
                            "input": "$pipeline_jobs",
                            "as": "job",
                            "cond": {"$eq": ["$$job.status", "completed"]}
                        }
                    }
                }
            }},
            
            # Lookup HeyGen jobs
            {"$lookup": {
                "from": "heygen_jobs",
                "localField": "id",
                "foreignField": "partner_id",
                "as": "heygen_jobs"
            }},
            {"$addFields": {
                "heygen_videos_count": {"$size": "$heygen_jobs"}
            }},
            
            # Lookup payment history
            {"$lookup": {
                "from": "partner_payments",
                "localField": "id",
                "foreignField": "partner_id",
                "as": "payments"
            }},
            {"$addFields": {
                "total_payments": {
                    "$sum": "$payments.amount"
                },
                "payments_count": {"$size": "$payments"}
            }},
            
            # Calculate derived fields
            {"$addFields": {
                # Progress percentage based on phase
                "progress_pct": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$phase", "F0"]}, "then": 0},
                            {"case": {"$eq": ["$phase", "F1"]}, "then": 10},
                            {"case": {"$eq": ["$phase", "F2"]}, "then": 20},
                            {"case": {"$eq": ["$phase", "F3"]}, "then": 30},
                            {"case": {"$eq": ["$phase", "F4"]}, "then": 40},
                            {"case": {"$eq": ["$phase", "F5"]}, "then": 50},
                            {"case": {"$eq": ["$phase", "F6"]}, "then": 60},
                            {"case": {"$eq": ["$phase", "F7"]}, "then": 70},
                            {"case": {"$eq": ["$phase", "F8"]}, "then": 80},
                            {"case": {"$eq": ["$phase", "F9"]}, "then": 90},
                            {"case": {"$eq": ["$phase", "LIVE"]}, "then": 100}
                        ],
                        "default": 0
                    }
                },
                
                # Has active video production
                "has_active_production": {
                    "$gt": [
                        {"$size": {
                            "$filter": {
                                "input": {"$ifNull": ["$pipeline_jobs", []]},
                                "as": "job",
                                "cond": {"$in": ["$$job.status", ["queued", "generating_video", "polling_video", "uploading_youtube"]]}
                            }
                        }},
                        0
                    ]
                },
                
                # Content completion flags
                "has_posizionamento": {"$ne": [{"$type": "$posizionamento"}, "missing"]},
                "has_masterclass": {"$ne": [{"$type": "$masterclass"}, "missing"]},
                "has_funnel": {"$ne": [{"$type": "$funnel"}, "missing"]},
                
                # Avatar ready flag
                "avatar_ready": {"$in": ["$avatar_status", ["VERIFIED", "ACTIVE"]]}
            }},
            
            # Clean up temporary arrays
            {"$project": {
                "posizionamento_data": 0,
                "masterclass_data": 0,
                "funnel_data": 0,
                "pipeline_jobs": 0,
                "heygen_jobs": 0,
                "payments": 0,
                "_id": 0
            }}
        ]
        
        # Create the view
        await db.create_collection(
            "partner_unified_view",
            viewOn="partners",
            pipeline=pipeline
        )
        
        logger.info("[VIEW] Created partner_unified_view successfully")
        return True
        
    except Exception as e:
        logger.error(f"[VIEW] Error creating partner_unified_view: {e}")
        return False


async def get_partner_unified(db, partner_id: str):
    """Get unified partner data from the view"""
    partner = await db.partner_unified_view.find_one({"id": partner_id})
    return partner


async def get_all_partners_unified(db, filters: dict = None, limit: int = 100):
    """Get all partners from the unified view with optional filters"""
    query = filters or {}
    partners = await db.partner_unified_view.find(query).limit(limit).to_list(limit)
    return partners


async def get_partners_by_production_status(db, has_active: bool = True):
    """Get partners filtered by active production status"""
    return await get_all_partners_unified(db, {"has_active_production": has_active})


async def get_partners_needing_content(db):
    """Get partners who are missing content (posizionamento, masterclass, or funnel)"""
    return await get_all_partners_unified(db, {
        "$or": [
            {"has_posizionamento": False},
            {"has_masterclass": False},
            {"has_funnel": False}
        ]
    })


async def get_partners_ready_for_video(db):
    """Get partners who have avatar ready but no active production"""
    return await get_all_partners_unified(db, {
        "avatar_ready": True,
        "has_active_production": False,
        "has_masterclass": True
    })


# ═══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

async def initialize_views(db):
    """Initialize all aggregated views on startup"""
    logger.info("[VIEW] Initializing MongoDB aggregated views...")
    
    success = await create_partner_unified_view(db)
    
    if success:
        logger.info("[VIEW] All views initialized successfully")
    else:
        logger.warning("[VIEW] Some views failed to initialize")
    
    return success
