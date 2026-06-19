"""
Celery task — Sollecito motivazionale del percorso operativo (deadline 21 giorni).

Modulo separato (registrato in celery_app include) per non appesantire
celery_tasks.py. Gira ogni giorno via Celery Beat.

Per ogni partner con journey attivo calcola i giorni dall'attivazione
(payment_at/contract_signed_at dello step 01-contratto). Alle soglie
G7 / G14 / G18, se il milestone atteso non è ancora completato, invia un
sollecito motivazionale (voce Claudio) e lo registra con data in
`ciak_partnership_emails`.

- Tono motivante, mai accusatorio: rimette il partner sul focus corretto
  (la prossima singola azione), non rimprovera il ritardo.
- Idempotente: ogni soglia parte una volta sola per partner. Un tentativo
  fallito (SMTP ko) viene riprovato al run successivo.
- Valore legale: il record datato dimostra che Evolution ha accompagnato
  il partner verso il lancio nei 21 giorni previsti.
"""
import logging
from datetime import datetime, timezone
from celery import shared_task

from celery_tasks import get_db, run_async, send_telegram_notification

logger = logging.getLogger(__name__)

DEADLINE_GIORNI = 21
# In ordine crescente: (giorno_soglia, step_id_atteso entro quella soglia)
SOGLIE = [
    (7,  "04-posizionamento"),
    (14, "08-registra-lezioni"),
    (18, "13-lancio"),
]


def _parse_anchor(v):
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def check_partner_journey_solleciti(self):
    try:
        async def _run():
            from services.ciak_sollecito_email import send_sollecito_async
            from services.ciak_partnership_email import set_db as _set_email_db
            from models.partner_journey_step import JOURNEY_STEPS_DEFINITION

            client, db = get_db()
            _set_email_db(db)  # garantisce l'audit log anche nel processo Celery
            now = datetime.now(timezone.utc)

            label_by_step = {s["step_id"]: s["label"] for s in JOURNEY_STEPS_DEFINITION}
            order_by_step = {s["step_id"]: s["step_number"] for s in JOURNEY_STEPS_DEFINITION}

            inviati = 0
            anchors = await db.partner_journey_steps.find(
                {"step_id": "01-contratto", "status": "done"}
            ).to_list(1000)

            for a in anchors:
                pid = a.get("partner_id")
                if not pid:
                    continue
                data = a.get("data") or {}
                anchor_dt = _parse_anchor(
                    data.get("payment_at")
                    or data.get("contract_signed_at")
                    or a.get("completed_at")
                )
                if not anchor_dt:
                    continue
                giorni = (now - anchor_dt).days
                if giorni < SOGLIE[0][0]:
                    continue

                lancio = await db.partner_journey_steps.find_one(
                    {"partner_id": pid, "step_id": "13-lancio"}, {"status": 1}
                )
                if lancio and lancio.get("status") == "done":
                    continue

                soglia_attiva, step_atteso = None, None
                for soglia, step_id in SOGLIE:
                    if giorni >= soglia:
                        soglia_attiva, step_atteso = soglia, step_id
                if soglia_attiva is None:
                    continue

                step_doc = await db.partner_journey_steps.find_one(
                    {"partner_id": pid, "step_id": step_atteso}, {"status": 1}
                )
                if step_doc and step_doc.get("status") == "done":
                    continue

                kind = f"sollecito_g{soglia_attiva}"
                already = await db.ciak_partnership_emails.find_one(
                    {"partner_id": pid, "kind": kind, "$or": [{"sent": True}, {"pending_smtp": True}]}
                )
                if already:
                    continue

                partner = await db.partners.find_one({"id": pid}, {"name": 1, "email": 1})
                if not partner or not partner.get("email"):
                    continue

                steps = await db.partner_journey_steps.find(
                    {"partner_id": pid}, {"step_id": 1, "status": 1}
                ).to_list(50)
                steps.sort(key=lambda s: order_by_step.get(s.get("step_id"), 99))
                prossima = next((s for s in steps if s.get("status") != "done"), None)
                prossima_label = (
                    label_by_step.get(prossima.get("step_id"), "il prossimo passo")
                    if prossima else "il prossimo passo"
                )

                giorni_rimanenti = max(0, DEADLINE_GIORNI - giorni)
                ok = await send_sollecito_async(
                    email=partner["email"],
                    nome=partner.get("name"),
                    partner_id=pid,
                    soglia=soglia_attiva,
                    giorno=giorni,
                    giorni_rimanenti=giorni_rimanenti,
                    prossima_azione=prossima_label,
                )
                if ok:
                    inviati += 1
                    logger.info(
                        "[SOLLECITO] partner %s — G%s inviato (giorno %s, prossima: %s)",
                        pid, soglia_attiva, giorni, prossima_label
                    )

            if inviati > 0:
                try:
                    await send_telegram_notification(
                        f"📨 <b>Solleciti percorso 21gg</b>\nInviati: {inviati}"
                    )
                except Exception:
                    pass
            return {"solleciti_inviati": inviati}

        return run_async(_run())
    except Exception as e:
        logger.error(f"[CELERY] Error in check_partner_journey_solleciti: {e}")
        return {"solleciti_inviati": 0}
