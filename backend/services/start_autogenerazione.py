"""Ciak Start: le bozze si preparano da sole, l'approvazione resta del team.

Prima il team doveva cliccare "Genera" una volta per materiale (6 pulsanti per
cliente) solo per far comparire una bozza. Ora, quando arrivano le risposte e/o le
scelte sul marchio, Ciak prepara le bozze con gli STESSI generatori del pannello e
avvisa il team (alert in-app + Telegram) che c'e' qualcosa da approvare.

Regole:
  - mai approvare: ogni bozza nasce `pending_review`, il cliente non la vede;
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


async def prepara_bozze(client_id: str) -> dict:
    """Genera le bozze mancanti per cui gli input ci sono. Ritorna {generati, errori}."""
    from fastapi import BackgroundTasks, HTTPException

    from routers import ciak_admin

    db = ciak_admin.db
    esito: dict = {"generati": [], "errori": {}}
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
        except HTTPException as exc:
            esito["errori"][tipo] = str(exc.detail)[:160]
        except Exception as exc:  # noqa: BLE001 - il task in background non propaga
            logger.exception("[START_AUTO] %s fallito per %s: %s", tipo, client_id, exc)
            esito["errori"][tipo] = str(exc)[:160]

    if esito["generati"]:
        try:
            from routers.partner_journey import _notify_admin_partner_activity

            elenco = ", ".join(ETICHETTE[t] for t in esito["generati"])
            await _notify_admin_partner_activity(
                client_id,
                f"ha le bozze Start pronte (preparate in automatico): {elenco}",
                requires_approval=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("[START_AUTO] avviso al team non inviato per %s: %s", client_id, exc)
    return esito
