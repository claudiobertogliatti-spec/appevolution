"""
Briefing di Luca (AD) lato server — gira su Celery Beat, non sul PC di Claudio.

Perche' esiste (31/8/2026): il briefing girava come azione programmata dell'app
desktop (`C:\\Users\\berto\\Claude\\Scheduled\\briefing-luca-ad`). Due limiti
strutturali lo rendevano inaffidabile proprio quando serviva di piu':

1. le azioni programmate locali girano SOLO ad app aperta -> con il portatile
   chiuso (ferie, 15-31/8/2026) il briefing non parte affatto;
2. il task locale ha `approvedPermissions: 0`, quindi si fermava alla prima
   richiesta di permesso senza nessuno a cui chiederla: partiva e non scriveva
   niente (`stato/numeri.csv` fermo al 14/8 con una sola riga).

Qui il briefing legge le stesse fonti con la stessa chiave di sola lettura, ma
in un processo che non dipende dalla macchina di Claudio.

LIMITE DICHIARATO: questo task produce il REPORT, non l'AD. I passi di
`SKILL.md` in cui Luca decide ed esegue (PASSO 5) restano nell'agente: qui non
c'e' nessun LLM. Serve a garantire che i numeri arrivino ogni mattina comunque,
non a sostituire il ragionamento.
"""

import os
import sys
import logging
from datetime import datetime, timezone
from pathlib import Path

from celery import shared_task

logger = logging.getLogger(__name__)

# `scripts/briefing_luca.py` resta la fonte di verita' della raccolta dati:
# si importa invece di riscriverla, per non avere una terza copia della logica
# (ce n'e' gia' una accanto al prompt dell'azione programmata).
_SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"


def _carica_raccolta():
    if str(_SCRIPTS) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS))
    import briefing_luca  # noqa: E402  (path aggiunto sopra di proposito)

    return briefing_luca


def get_db():
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo_url = os.environ.get("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    return client, client[os.environ.get("DB_NAME", "evolution_pro")]


def run_async(coro):
    import asyncio

    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.close()
        except Exception:
            pass


# Il container espone la 8080 (Dockerfile: uvicorn --port 8080), non la 8001.
# `scheduler.py` e `morning_briefing_task.py` puntano ancora a localhost:8001 e
# infatti in produzione ogni loro job muore con [Errno 111] Connection refused —
# verificato il 31/8/2026 nei log di `evolution-pro-worker`. Qui si usa la porta
# giusta, sovrascrivibile dall'ambiente per non ricascarci se cambia.
INTERNAL_API = os.environ.get("INTERNAL_API_BASE", "http://localhost:8080")


async def _send_telegram(message: str):
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            risposta = await client.post(
                f"{INTERNAL_API}/api/notify/telegram",
                json={"message": message},
                timeout=15,
            )
            if risposta.status_code >= 400:
                # Un briefing che non arriva deve lasciare traccia: senza questo
                # il fallimento e' indistinguibile dall'invio riuscito.
                logger.error(
                    f"[LUCA_BRIEFING] Telegram ha risposto {risposta.status_code}: "
                    f"{risposta.text[:200]}"
                )
    except Exception as e:
        logger.error(f"[LUCA_BRIEFING] Telegram error: {e}")


async def _salva_stato(dati):
    """
    Una riga al giorno, upsert sulla data: rieseguire il task aggiorna la riga
    di oggi invece di aggiungerne una seconda. Sostituisce `stato/numeri.csv`,
    che vivendo sul disco di Claudio spariva dai radar appena il PC era spento.
    """
    client, db = get_db()
    try:
        oggi = datetime.now(timezone.utc).date().isoformat()
        await db.luca_stato_giornaliero.update_one(
            {"data": oggi},
            {"$set": {**dati, "data": oggi, "scritto_a": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        precedenti = (
            await db.luca_stato_giornaliero.find({"data": {"$lt": oggi}})
            .sort("data", -1)
            .limit(1)
            .to_list(1)
        )
        return precedenti[0] if precedenti else None
    finally:
        client.close()


def _delta(oggi, ieri, campo):
    """None quando il confronto non esiste: un buco si dichiara, non si stima."""
    if not ieri or campo not in ieri or ieri.get(campo) is None:
        return None
    if oggi.get(campo) is None:
        return None
    try:
        return oggi[campo] - ieri[campo]
    except TypeError:
        return None


@shared_task(bind=True, max_retries=2, default_retry_delay=300, name="luca_daily_briefing")
def luca_daily_briefing(self):
    """
    Briefing AD delle 7:45 CET. Legge Ciak + sito pubblico con la chiave di sola
    lettura, salva lo stato del giorno e manda il report via Telegram.

    Se cade Ciak NON produce un briefing parziale: manda una riga d'errore e
    termina. Un briefing mancato e' un problema piccolo, un briefing con numeri
    inventati e' un problema grosso -- Claudio decide su quei numeri.
    """
    try:
        chiave = os.environ.get("LUCA_REPORT_KEY")
        if not chiave:
            msg = "[LUCA] Briefing non eseguito: LUCA_REPORT_KEY non configurata sull'ambiente."
            logger.error(msg)
            run_async(_send_telegram(msg))
            return {"success": False, "error": "LUCA_REPORT_KEY mancante"}

        briefing_luca = _carica_raccolta()
        base_url = os.environ.get("LUCA_BASE_URL", "https://www.ciak.io")

        output, errore = briefing_luca.raccogli(base_url, chiave)
        if errore:
            msg = f"[LUCA] Briefing non prodotto: Ciak non risponde.\n{errore}"
            logger.error(msg)
            run_async(_send_telegram(msg))
            return {"success": False, "error": errore}

        report = output.get("report") or {}
        acquisizione = report.get("acquisition") or {}
        delivery = report.get("delivery") or {}
        sito = (output.get("fonti", {}).get("sito") or {}).get("dati") or {}

        numeri = {
            "ingressi_evo_mese": acquisizione.get("ingressi_mese"),
            "lead_oggi": acquisizione.get("leads_today"),
            "diagnosi_oggi": acquisizione.get("diagnostics_today"),
            "partner_attivi": delivery.get("partner_attivi"),
            "partner_fermi": delivery.get("fermi"),
            "partner_attesa_ok": delivery.get("serve_ok"),
            "sito_ok": sito.get("tutte_ok"),
        }

        ieri = run_async(_salva_stato(numeri))

        righe = [f"*Briefing Luca — {datetime.now(timezone.utc).strftime('%d/%m/%Y')}*", ""]
        if numeri["sito_ok"] is False:
            url_ko = [
                f"{u.get('url')} ({u.get('status')})"
                for u in (sito.get("url") or [])
                if u.get("status") != 200
            ]
            righe += ["*SITO GIU'* — " + (", ".join(url_ko) or "URL non dettagliati"), ""]

        for etichetta, campo in (
            ("Ingressi EVO nel mese", "ingressi_evo_mese"),
            ("Lead oggi", "lead_oggi"),
            ("Diagnosi oggi", "diagnosi_oggi"),
            ("Partner attivi", "partner_attivi"),
            ("Partner fermi", "partner_fermi"),
            ("Aspettano un OK", "partner_attesa_ok"),
        ):
            valore = numeri.get(campo)
            d = _delta(numeri, ieri, campo)
            if d is None:
                confronto = "prima misurazione" if not ieri else "non confrontabile"
            else:
                confronto = f"{d:+d} vs ieri"
            righe.append(f"- {etichetta}: {valore if valore is not None else 'non letto'} ({confronto})")

        fermi_nomi = delivery.get("fermi_nomi") or []
        if fermi_nomi:
            righe += ["", "*Fermi:* " + ", ".join(fermi_nomi[:8])]

        righe += [
            "",
            "_Report automatico server-side. Le fonti fuori Ciak (Meta, social, "
            "Systeme) NON sono in questo messaggio: le legge Luca nella sua "
            "sessione, dove ha i tool MCP._",
        ]

        messaggio = "\n".join(righe)
        run_async(_send_telegram(messaggio))

        logger.info("[LUCA_BRIEFING] Briefing inviato")
        return {"success": True, "numeri": numeri, "confronto_disponibile": bool(ieri)}

    except Exception as e:
        logger.error(f"[LUCA_BRIEFING] Errore: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        run_async(_send_telegram(f"[LUCA] Briefing fallito: {e}"))
        return {"success": False, "error": str(e)}
