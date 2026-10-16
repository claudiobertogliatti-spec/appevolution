"""Ciak Start: le bozze si preparano da sole, l'approvazione resta del team.

Prima il team doveva cliccare "Genera" una volta per materiale (6 pulsanti per
cliente) solo per far comparire una bozza. Ora, quando arrivano le risposte e/o le
scelte sul marchio, Ciak prepara le bozze con gli STESSI generatori del pannello e
avvisa il team (alert in-app + Telegram) che c'e' qualcosa da approvare.

Regole (aggiornate l'11/10/2026, decisione di Claudio):
  - approvazione AUTOMATICA solo per posizionamento, marchio, profili social e calendario
    (`AUTO_APPROVA`); sito vetrina (e dominio) e controllo finale restano A MANO;
  - una bozza con testo di ripiego (sintesi AI fallita) NON si approva da sola:
    resta `pending_review` e va rivista dal team prima che il cliente la veda;
  - il cliente riceve UNA sola email, quando tutti e quattro i materiali automatici
    sono approvati (non una per materiale);
  - si approva SOLO cio' che questa esecuzione ha appena generato: le bozze gia'
    esistenti restano come sono, qualunque stato abbiano;
  - mai sovrascrivere: un materiale gia' generato (bozza o approvato) non si tocca;
  - mai sollevare: gira dopo la risposta HTTP, un errore si logga e non blocca nulla;
  - ogni materiale parte solo quando ha i suoi input veri (non si genera a vuoto).

Input richiesti:
  positioning            risposte complete
  brand_kit              scelte sul marchio complete
  social_profiles        risposte + marchio (il generatore usa il brand kit)
  showcase               risposte + marchio (la pubblicazione online resta a mano)
  content_plan_90d       risposte + marchio (generazione lunga, per ultima)
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

SISTEMA = type("Sistema", (), {"email": "ciak-automatico"})()

# Materiali che vanno al cliente senza passare dal team. Il sito vetrina (con il dominio
# online) e il controllo finale restano da approvare a mano.
AUTO_APPROVA: tuple[str, ...] = ("positioning", "brand_kit", "social_profiles", "content_plan_90d")
APPROVATORE = "ciak-automatico"

ETICHETTE = {
    "positioning": "posizionamento",
    "brand_kit": "marchio",
    "social_profiles": "profili social",
    "showcase": "sito vetrina",
    "content_plan_90d": "calendario 60 giorni",
}


async def _completati(db, client_id: str) -> tuple[bool, bool]:
    risposte = await db.partner_journey_steps.find_one(
        {"partner_id": client_id, "step_id": "04-posizionamento"}, {"_id": 0, "data": 1}
    ) or {}
    marchio = await db.partner_journey_steps.find_one(
        {"partner_id": client_id, "step_id": "03-brand-kit"}, {"_id": 0, "data": 1}
    ) or {}
    return (
        bool((risposte.get("data") or {}).get("answers_completed_at")),
        bool((marchio.get("data") or {}).get("brand_completed_at")),
    )


def _e_di_ripiego(tipo: str, doc: dict) -> bool:
    """True se il testo e' quello di ripiego (la sintesi AI non e' riuscita)."""
    if tipo == "positioning":
        return bool(doc.get("fallback"))
    if tipo == "social_profiles":
        return bool(doc.get("_fallback"))
    if tipo == "content_plan_90d":
        # "ai" = scritto dal modello; qualunque altra origine (fallback o ignota) si rivede.
        return (doc.get("calendar") or {}).get("source") != "ai"
    return False


async def _auto_approva(db, ciak_admin, client_id: str, tipo: str, esito: dict) -> None:
    """Approva la bozza appena generata se e' tra quelle automatiche e non e' di ripiego."""
    if tipo not in AUTO_APPROVA:
        return
    try:
        doc = await db.ciak_start_deliverables.find_one({"partner_id": client_id, "type": tipo}, {"_id": 0})
        if not doc or _e_di_ripiego(tipo, doc):
            esito["da_rivedere"].append(tipo)
            return
        await ciak_admin._approva_start_deliverable(client_id, tipo, APPROVATORE, avvisa=False)
        esito["approvati"].append(tipo)
    except Exception as exc:  # noqa: BLE001 - se non riesce resta da approvare a mano
        logger.warning("[START_AUTO] approvazione automatica di %s fallita per %s: %s", tipo, client_id, exc)
        esito["da_rivedere"].append(tipo)


async def _una_email_per_gruppo(db, client_id: str, esito: dict) -> None:
    """UNA sola email, quando tutti i materiali automatici sono approvati."""
    if not esito["approvati"]:
        return
    try:
        client = await db.ciak_clients.find_one({"id": client_id}, {"_id": 0, "start_materiali_email_at": 1})
        if (client or {}).get("start_materiali_email_at"):
            return
        approvati = {
            d.get("type")
            async for d in db.ciak_start_deliverables.find(
                {"partner_id": client_id, "approval_status": "approved"}, {"_id": 0, "type": 1}
            )
        }
        if not set(AUTO_APPROVA) <= approvati:
            return  # manca ancora qualcosa (anche da rivedere a mano): niente email a meta'
        from datetime import datetime, timezone

        from services.ciak_client_reengagement import invia_materiali_pronti

        if await invia_materiali_pronti(db, client_id, list(AUTO_APPROVA)):
            await db.ciak_clients.update_one(
                {"id": client_id},
                {"$set": {"start_materiali_email_at": datetime.now(timezone.utc).isoformat()}},
            )
            esito["email"] = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("[START_AUTO] email unica non inviata per %s: %s", client_id, exc)


async def prepara_bozze(client_id: str) -> dict:
    """Genera le bozze mancanti per cui gli input ci sono. Ritorna {generati, errori}."""
    from fastapi import BackgroundTasks, HTTPException

    from routers import ciak_admin

    db = ciak_admin.db
    esito: dict = {"generati": [], "errori": {}, "approvati": [], "da_rivedere": [], "email": False}
    if db is None:
        return esito
    try:
        risposte_ok, marchio_ok = await _completati(db, client_id)
        esistenti = {
            d.get("type")
            async for d in db.ciak_start_deliverables.find({"partner_id": client_id}, {"_id": 0, "type": 1})
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("[START_AUTO] lettura stato fallita per %s: %s", client_id, exc)
        return esito

    async def _calendario():
        # La generazione lunga e' un BackgroundTask del router: qui siamo gia' in
        # background, quindi la si esegue fino in fondo.
        tasks = BackgroundTasks()
        await ciak_admin.genera_calendario_start(client_id, tasks, admin=SISTEMA)
        await tasks()

    piano = (
        ("positioning", risposte_ok, lambda: ciak_admin.genera_posizionamento_start(client_id, admin=SISTEMA)),
        ("brand_kit", marchio_ok, lambda: ciak_admin.genera_marchio_start(client_id, admin=SISTEMA)),
        ("social_profiles", risposte_ok and marchio_ok, lambda: ciak_admin.genera_profili_start(client_id, admin=SISTEMA)),
        ("showcase", risposte_ok and marchio_ok, lambda: ciak_admin.genera_vetrina_start(client_id, admin=SISTEMA)),
        ("content_plan_90d", risposte_ok and marchio_ok, _calendario),
    )
    for tipo, pronto, genera in piano:
        if not pronto or tipo in esistenti:
            continue
        try:
            await genera()
            esito["generati"].append(tipo)
            await _auto_approva(db, ciak_admin, client_id, tipo, esito)
        except HTTPException as exc:
            esito["errori"][tipo] = str(exc.detail)[:160]
        except Exception as exc:  # noqa: BLE001 - il task in background non propaga
            logger.exception("[START_AUTO] %s fallito per %s: %s", tipo, client_id, exc)
            esito["errori"][tipo] = str(exc)[:160]

    await _una_email_per_gruppo(db, client_id, esito)

    if esito["generati"]:
        try:
            from routers.partner_journey import _notify_admin_partner_activity

            elenco = ", ".join(ETICHETTE[t] for t in esito["generati"])
            testo = f"ha le bozze Start pronte (preparate in automatico): {elenco}"
            if esito["approvati"]:
                testo += ". Gia' al cliente (approvate in automatico): " + ", ".join(ETICHETTE[t] for t in esito["approvati"])
            da_vedere = [t for t in esito["generati"] if t not in esito["approvati"]]
            if da_vedere:
                testo += ". Da rivedere a mano: " + ", ".join(ETICHETTE[t] for t in da_vedere)
            await _notify_admin_partner_activity(client_id, testo, requires_approval=bool(da_vedere))
        except Exception as exc:  # noqa: BLE001
            logger.warning("[START_AUTO] avviso al team non inviato per %s: %s", client_id, exc)
    return esito
