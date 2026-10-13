"""Coda di Antonella — lezioni montate da controllare e caricare su Systeme, con piano settimanale.

  - GET  /api/admin/ciak/coda          → coda, piano per settimane (dentro le ore concordate), lezioni da correggere
  - PUT  /api/admin/ciak/coda/config   → tetto settimanale e stime di tempo
  - POST /api/admin/ciak/coda/esito    → «verificata e caricata» oppure «da correggere» (con note)

La logica e' in services/coda_antonella.py (pura). Qui solo lettura/scrittura database.
Collezioni: `partner_videocorso` (sola lettura), `partners` (nomi), `ciak_coda_lezioni` (esiti, uno per lezione+versione),
`ciak_coda_config` (un documento).

Non cambia lo stato della lezione ne' la revisione del partner: la segnalazione «da correggere» resta una nota per il
team (avviso Telegram); la correzione del montaggio la avvia chi fa il montaggio, come oggi.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional

from routers.ciak_admin import require_ciak_admin, _week_start, _now_iso, ANTONELLA_RATE
from services import coda_antonella as coda

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak/coda", tags=["ciak-coda"])

db = None


def set_db(database) -> None:
    global db
    db = database


CONFIG_ID = "antonella"


async def _config() -> dict:
    doc = await db.ciak_coda_config.find_one({"_id": CONFIG_ID}, {"_id": 0}) or {}
    return coda.config_valida(doc)


async def _stato():
    cfg = await _config()
    nomi = {}
    async for p in db.partners.find({}, {"_id": 0, "id": 1, "name": 1}):
        if p.get("id"):
            nomi[p["id"]] = p.get("name")
    esiti = {}
    async for e in db.ciak_coda_lezioni.find({}, {"_id": 1, "esito": 1, "note": 1, "at": 1}):
        esiti[e["_id"]] = e
    docs = [d async for d in db.partner_videocorso.find({"lessons": {"$exists": True}}, {"_id": 0, "partner_id": 1, "lessons": 1})]
    gruppi = coda.lezioni_da_controllare(docs, nomi, esiti, cfg)
    return cfg, gruppi


@router.get("")
async def get_coda(_=Depends(require_ciak_admin)):
    cfg, gruppi = await _stato()
    altri = coda.minuti_altri_compiti([
        t async for t in db.agent_tasks.find({"assigned_to": "antonella", "week_start": _week_start()})
    ])
    piano = coda.piano_settimanale(gruppi["da_controllare"], cfg, minuti_gia_assegnati=altri)
    consegne = coda.raggruppa_per_partner(gruppi["da_controllare"])
    for c in consegne:
        c["pronta_entro"] = coda.prima_data_prevista(piano, c["partner_id"])
    return {
        "config": cfg,
        "tetto_settimana_min": cfg["minuti_settimana"],
        "altri_minuti_settimana": altri,
        "oggi": datetime.now(timezone.utc).date().isoformat(),
        "consegne": consegne,
        "piano": piano,
        "da_correggere": gruppi["da_correggere"],
        "stime_iniziali": True,
    }


class ConfigBody(BaseModel):
    minuti_settimana: Optional[int] = None
    rapporto_visione: Optional[float] = None
    minuti_fissi: Optional[int] = None


@router.put("/config")
async def put_config(body: ConfigBody, data=Depends(require_ciak_admin)):
    nuovo = coda.config_valida(body.dict(exclude_none=True))
    await db.ciak_coda_config.update_one(
        {"_id": CONFIG_ID},
        {"$set": {**nuovo, "updated_at": datetime.now(timezone.utc).isoformat(),
                  "updated_by": str(getattr(data, "user_id", "") or "")}},
        upsert=True,
    )
    return {"config": nuovo}


class EsitoBody(BaseModel):
    partner_id: str
    lesson_id: str
    output_version: int
    esito: str
    controlli: Dict[str, bool] = Field(default_factory=dict)
    note: Optional[str] = None
    minuti_reali: Optional[int] = None


@router.post("/esito")
async def post_esito(body: EsitoBody, data=Depends(require_ciak_admin)):
    try:
        esito = coda.valida_esito(body.dict())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    vc = await db.partner_videocorso.find_one({"partner_id": body.partner_id}, {"_id": 0, "lessons": 1}) or {}
    lesson = (vc.get("lessons") or {}).get(body.lesson_id)
    if not lesson:
        raise HTTPException(404, "Lezione non trovata")
    if int(lesson.get("output_version") or 0) != int(body.output_version):
        raise HTTPException(409, "Il video e' stato aggiornato: ricarica la pagina")
    chiave = coda.chiave_lezione(body.partner_id, body.lesson_id, body.output_version)
    now = datetime.now(timezone.utc).isoformat()
    partner = await db.partners.find_one({"id": body.partner_id}, {"_id": 0, "name": 1}) or {}
    titolo = lesson.get("title") or lesson.get("titolo") or body.lesson_id
    # FATTURAZIONE: prima l'attivita' con i minuti veri (stesso flusso di tutte le attivita' di Antonella: Claudio
    # approva i minuti, poi entrano nella liquidazione). Id stabile: ripetere l'invio non la duplica. Se questo
    # passo fallisce l'esito non viene salvato e la lezione resta in coda: nessuna ora puo' andare persa.
    stima = coda.stima_minuti(lesson.get("video_final_duration_s"), (await _config())["rapporto_visione"], (await _config())["minuti_fissi"])
    await db.agent_tasks.update_one(
        {"task_id": coda.id_attivita(chiave)},
        {"$setOnInsert": {
            "task_id": coda.id_attivita(chiave), "task_type": "lesson_check", "priority": "medium",
            "created_by_agent": "stefania", "assigned_to": "antonella", "entity_type": "collaborator",
            "entity_id": "antonella", "entity_name": "Antonella", "hourly_rate": ANTONELLA_RATE,
            "approved_minutes": 0, "time_entries": [], "active_timer_started_at": None, "created_at": now,
        }, "$set": {
            "title": f"Controllo lezione: {partner.get('name', body.partner_id)} — {titolo}",
            "description": "Lezione montata guardata e caricata su Systeme (coda lezioni).",
            "status": "completed", "work_category": "video", "estimated_minutes": stima,
            "actual_minutes": esito["minuti_reali"], "week_start": _week_start(), "updated_at": now,
            "resolution_notes": esito["note"] or "",
            "context": {"source": "coda_lezioni", "category": "video", "lesson_key": chiave,
                        "esito": esito["esito"], "estimated_minutes": stima},
        }},
        upsert=True,
    )
    await db.ciak_coda_lezioni.update_one(
        {"_id": chiave},
        {"$set": {"partner_id": body.partner_id, "lesson_id": body.lesson_id, "output_version": body.output_version,
                  "durata_s": lesson.get("video_final_duration_s"), **esito, "at": now,
                  "by": str(getattr(data, "user_id", "") or "")}},
        upsert=True,
    )
    # Verificata: e' il momento in cui il montaggio ha passato il controllo umano. Solo adesso il
    # video entra nella playlist YouTube del partner (sequenza: editing -> verifica -> playlist ->
    # Systeme). Se la playlist non risponde l'esito resta comunque salvato: non si perde il lavoro.
    playlist = None
    if esito["esito"] == "verificata":
        from services import youtube_playlist
        playlist = await youtube_playlist.aggiungi_video(
            db, body.partner_id, lesson.get("video_youtube_id") or "")

    if esito["esito"] == "da_correggere":
        try:
            from routers.partner_journey import notify_telegram
            await notify_telegram(
                f"🛠 LEZIONE DA CORREGGERE\n\n👤 {partner.get('name', body.partner_id)}\n"
                f"🎬 {lesson.get('title') or body.lesson_id} — v{body.output_version}\n📝 {esito['note']}"
            )
        except Exception:
            logger.exception("[CODA] avviso Telegram non inviato")
    return {"success": True, "esito": esito["esito"], "playlist": playlist}
