"""
Morning Lead Briefing — daily digest alle 7:00 CET per Claudio.
Importato da celery_tasks.py via include.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from celery import shared_task

logger = logging.getLogger(__name__)


def get_db():
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    return client, client[os.environ.get('DB_NAME', 'evolution_pro')]


def run_async(coro):
    import asyncio
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.close()
        except Exception:
            pass


async def _send_telegram(message: str):
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8001/api/notify/telegram",
                json={"message": message},
                timeout=10
            )
    except Exception as e:
        logger.error(f"[MORNING_BRIEFING] Telegram error: {e}")


@shared_task(bind=True, max_retries=2, default_retry_delay=120, name="morning_lead_briefing")
def morning_lead_briefing(self):
    """
    Digest giornaliero alle 7:00 per Claudio.
    Analizza lead nuovi + bloccati + lista fredda.
    Genera messaggi personalizzati con ELENA e li invia via Telegram.
    """
    try:
        async def _briefing():
            client, db = get_db()
            try:
                now = datetime.now(timezone.utc)
                ieri = (now - timedelta(hours=24)).isoformat()
                sette_giorni_fa = (now - timedelta(days=7)).isoformat()

                # 1. Nuovi registrati nelle ultime 24h
                nuovi = await db.users.find({
                    "user_type": "cliente_analisi",
                    "data_registrazione": {"$gte": ieri}
                }, {
                    "nome": 1, "cognome": 1, "email": 1, "data_registrazione": 1,
                    "questionario_compilato": 1, "pagamento_analisi": 1,
                    "intro_questionario_seen": 1
                }).to_list(50)

                # 2. Questionario fatto, non ha pagato €67 (ultimi 7gg)
                bloccati_pagamento = await db.users.find({
                    "user_type": "cliente_analisi",
                    "questionario_compilato": True,
                    "pagamento_analisi": {"$ne": True},
                    "data_registrazione": {"$gte": sette_giorni_fa}
                }, {"nome": 1, "cognome": 1, "email": 1, "data_registrazione": 1}).to_list(20)

                # 3. Ha pagato €67, non ha prenotato call (ultimi 7gg)
                bloccati_call = await db.users.find({
                    "user_type": "cliente_analisi",
                    "pagamento_analisi": True,
                    "call_prenotata": {"$ne": True},
                    "data_registrazione": {"$gte": sette_giorni_fa}
                }, {"nome": 1, "cognome": 1, "email": 1, "data_registrazione": 1,
                    "analisi_generata": 1}).to_list(20)

                # 4. Lista fredda — candidati al risveglio di oggi (max 10)
                da_risvegliare = await db.lista_fredda.find({
                    "$or": [
                        {"ultimo_contatto": {"$exists": False}},
                        {"ultimo_contatto": None},
                        {"risveglio_inviato": {"$ne": True}}
                    ],
                    "email": {"$exists": True, "$ne": ""}
                }).sort("data_aggiunta", 1).limit(10).to_list(10)

                # 5. Genera messaggi con ELENA via Claude Haiku
                messaggi_pronti = ""
                leads_context = []

                for u in (nuovi or [])[:5]:
                    nome = f"{u.get('nome', '')} {u.get('cognome', '')}".strip()
                    stato = (
                        "ha compilato il questionario" if u.get("questionario_compilato")
                        else "ha visto l'intro" if u.get("intro_questionario_seen")
                        else "si e appena registrato"
                    )
                    leads_context.append(f"- CALDO: {nome} ({u.get('email', '')}) — {stato}, registrato <24h")

                for u in (bloccati_pagamento or [])[:5]:
                    nome = f"{u.get('nome', '')} {u.get('cognome', '')}".strip()
                    leads_context.append(f"- TIEPIDO: {nome} ({u.get('email', '')}) — questionario compilato, NON ha pagato i 67 euro")

                for u in (bloccati_call or [])[:5]:
                    nome = f"{u.get('nome', '')} {u.get('cognome', '')}".strip()
                    leads_context.append(f"- CALDO: {nome} ({u.get('email', '')}) — ha pagato 67 euro, NON ha prenotato la call")

                for c in (da_risvegliare or [])[:5]:
                    nome = c.get("nome") or c.get("name") or "Lead"
                    settore = c.get("settore") or c.get("niche") or "formazione"
                    leads_context.append(f"- FREDDO: {nome} ({c.get('email', '')}) — lista fredda, settore: {settore}")

                if leads_context:
                    try:
                        from emergentintegrations.llm.chat import LlmChat, UserMessage
                        from agent_prompts import ELENA_SYSTEM_PROMPT

                        api_key = os.environ.get("ANTHROPIC_API_KEY")
                        if api_key:
                            llm = LlmChat(
                                session_id=f"elena_morning_{now.strftime('%Y%m%d')}",
                                system_prompt=ELENA_SYSTEM_PROMPT,
                                api_key=api_key
                            ).with_model("anthropic", "claude-haiku-4-5-20251001")

                            prompt = (
                                "Genera un messaggio di primo contatto personalizzato per ciascuno "
                                "di questi lead. Per ogni lead: indica temperatura, tocco (1/2/3), "
                                "canale suggerito (email/WhatsApp) e il messaggio pronto da inviare. "
                                "Sii conciso — un lead per paragrafo.\n\n"
                                "[CONTESTO LEAD]\n" + "\n".join(leads_context)
                            )

                            risposta = await llm.chat(UserMessage(content=prompt))
                            testo = risposta.text if hasattr(risposta, "text") else str(risposta)
                            messaggi_pronti = testo[:1200] + ("..." if len(testo) > 1200 else "")

                    except Exception as llm_err:
                        logger.warning(f"[MORNING_BRIEFING] LLM non disponibile: {llm_err}")

                # 6. Componi messaggio Telegram
                data_it = now.strftime("%d/%m/%Y")
                linee = [f"Buongiorno Claudio.\n*MORNING BRIEFING — {data_it}*\n"]

                if nuovi:
                    linee.append(f"Nuovi registrati (24h): {len(nuovi)}")
                    for u in nuovi[:6]:
                        nome = f"{u.get('nome', '')} {u.get('cognome', '')}".strip() or u.get("email", "—")
                        if u.get("questionario_compilato"):
                            stato = "questionario fatto"
                        elif u.get("intro_questionario_seen"):
                            stato = "intro visto"
                        else:
                            stato = "appena registrato"
                        linee.append(f"  {nome} — {stato}")
                    linee.append("")

                if bloccati_pagamento:
                    linee.append(f"Bloccati al pagamento 67 euro: {len(bloccati_pagamento)}")
                    for u in bloccati_pagamento[:5]:
                        nome = f"{u.get('nome', '')} {u.get('cognome', '')}".strip() or u.get("email", "—")
                        linee.append(f"  {nome}")
                    linee.append("")

                if bloccati_call:
                    linee.append(f"Pagato, non prenotato call: {len(bloccati_call)}")
                    for u in bloccati_call[:5]:
                        nome = f"{u.get('nome', '')} {u.get('cognome', '')}".strip() or u.get("email", "—")
                        linee.append(f"  {nome}")
                    linee.append("")

                if da_risvegliare:
                    linee.append(f"Lista fredda — candidati oggi: {len(da_risvegliare)}")
                    for c in da_risvegliare[:5]:
                        nome = c.get("nome") or c.get("name") or c.get("email", "—")
                        linee.append(f"  {nome}")
                    linee.append("")

                totale = len(nuovi) + len(bloccati_pagamento) + len(bloccati_call) + len(da_risvegliare)

                if totale == 0:
                    linee.append("Nessuna azione urgente oggi. Buona giornata.")
                else:
                    linee.append(f"Totale azioni: {totale}")

                if messaggi_pronti:
                    linee.append(f"\nMessaggi suggeriti da ELENA:\n{messaggi_pronti}")

                await _send_telegram("\n".join(linee))

                # 7. Log
                await db.celery_job_logs.insert_one({
                    "job": "morning_lead_briefing",
                    "data": data_it,
                    "nuovi": len(nuovi),
                    "bloccati_pagamento": len(bloccati_pagamento),
                    "bloccati_call": len(bloccati_call),
                    "lista_fredda_candidati": len(da_risvegliare),
                    "messaggi_generati": bool(messaggi_pronti),
                    "executed_at": now.isoformat()
                })

                logger.info(f"[MORNING_BRIEFING] Completato: {totale} azioni")
                return {"success": True, "azioni": totale}

            finally:
                client.close()

        return run_async(_briefing())

    except Exception as e:
        logger.error(f"[MORNING_BRIEFING] Error: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        return {"error": str(e)}
