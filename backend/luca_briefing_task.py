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

def _carica_raccolta():
    """
    La raccolta dati vive in `backend/briefing_luca.py`.

    Fino al 2/9/2026 veniva importata da `scripts/`, e il briefing delle 7:45 e'
    morto in produzione su `No module named 'briefing_luca'`: il deploy builda
    con `--source ./backend`, quindi quella cartella nel container non esiste.
    Il codice era corretto e i test verdi -- ma i test giravano dove il file
    c'era.
    """
    import briefing_luca  # noqa: E402

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

# Quanti lead servono prima di consigliare il cambio di obiettivo campagna.
# Meta esce dalla fase di apprendimento intorno ai ~50 eventi/settimana; a 10 in
# 30 giorni non ci siamo, ma e' abbastanza per dire che la conversione ARRIVA --
# che e' la domanda a cui questo segnale risponde. Sotto questa soglia cambiare
# obiettivo fa cercare all'algoritmo qualcosa che non riceve.
SOGLIA_LEAD_PER_CAMBIO_OBIETTIVO = 10


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
        # Sette giorni, non uno: il delta con ieri dice come va il business, lo
        # storico dice come va IL BRIEFING. Un difetto suo (una fonte che non
        # risponde, una diagnosi che si ripete senza effetto) si vede solo
        # guardando piu' giorni di fila.
        precedenti = (
            await db.luca_stato_giornaliero.find({"data": {"$lt": oggi}})
            .sort("data", -1)
            .limit(7)
            .to_list(7)
        )
        return (precedenti[0] if precedenti else None), precedenti
    finally:
        client.close()


def _conta_azioni(azioni, tipi):
    """Somma le conversioni Meta dei tipi indicati. 0 quando il dato non c'e'."""
    totale = 0
    for a in azioni or []:
        if a.get("action_type") in tipi:
            try:
                totale += int(float(a.get("value") or 0))
            except (TypeError, ValueError):
                continue
    return totale


async def _leggi_meta():
    """
    Campagne attive e spesa degli ultimi 30 giorni, lette con la Marketing API.

    Perche' qui e non via MCP: i tool `mcp__meta-ads__*` vivono in una sessione
    Claude, non in un task Celery. Luca server-side deve chiamare l'API con un
    token proprio, altrimenti resta cieco fuori da Ciak — che e' esattamente il
    punto dove il 31/8/2026 si e' scoperto che la campagna era rimasta su
    `OUTCOME_TRAFFIC` per 41 giorni senza che nessuno lo notasse.

    Serve un token in **sola lettura** (`ads_read`): Luca misura e propone, non
    tocca le campagne. Restituisce la stessa busta delle altre fonti.
    """
    token = os.environ.get("META_ADS_TOKEN")
    account = os.environ.get("META_AD_ACCOUNT_ID")
    if not token or not account:
        return {
            "fonte": "meta",
            "ok": False,
            "dati": {},
            "errore": "META_ADS_TOKEN / META_AD_ACCOUNT_ID non configurati sul worker",
        }

    try:
        from ads_api_integration import MetaAdsClient

        client = MetaAdsClient(token, account)
        campagne = await client.get_campaigns()
        attive = [c for c in (campagne or []) if c.get("status") == "ACTIVE"]
        insights = await client.get_account_insights_aggregated(days_back=30)
        riga = (insights.get("data") or [{}])[0]

        return {
            "fonte": "meta",
            "ok": True,
            "errore": None,
            "dati": {
                "campagne_attive": [
                    {"nome": c.get("name"), "obiettivo": c.get("objective")} for c in attive
                ],
                "spesa_30gg": riga.get("spend"),
                "ctr": riga.get("ctr"),
                "cpc": riga.get("cpc"),
                "clic": riga.get("clicks"),
                # Gli eventi Lead che Meta ha DAVVERO ricevuto. Sono il segnale
                # che dice quando ha senso cambiare l'obiettivo della campagna:
                # farlo prima, con zero conversioni in ingresso, fa cercare
                # all'algoritmo qualcosa che non arriva mai e brucia il budget.
                "lead_30gg": _conta_azioni(riga.get("actions"), ("lead", "onsite_conversion.lead_grouped")),
            },
        }
    except Exception as e:
        # Una fonte che cade si dichiara: il briefing esce lo stesso.
        return {"fonte": "meta", "ok": False, "dati": {}, "errore": str(e)[:200]}


def _autodiagnosi(oggi, storico):
    """
    Cosa Luca nota SU SE STESSO, guardando i propri ultimi giorni.

    Non e' un riassunto del business: e' il controllo che il briefing stia
    ancora misurando qualcosa. Il 31/8/2026 una fonte rispondeva 404 e un intero
    stadio del funnel era invisibile: se n'e' accorto Claude leggendo il codice,
    non Luca guardando i propri dati. Questo lo chiude.

    Restituisce una lista di rilievi da PROPORRE a Claudio. Luca non corregge ne'
    se stesso ne' il sistema: mandato del 31/8, "misura e propone".
    """
    rilievi = []
    giorni = [oggi] + list(storico or [])

    # 1. Una fonte che non risponde da piu' giorni non e' un intoppo, e' un guasto.
    ko_oggi = set(oggi.get("fonti_ko") or [])
    for fonte in sorted(ko_oggi):
        di_fila = 1
        for g in storico or []:
            if fonte in set(g.get("fonti_ko") or []):
                di_fila += 1
            else:
                break
        if di_fila >= 2:
            rilievi.append(
                f"la fonte *{fonte}* non risponde da {di_fila} giorni: "
                f"finche' e' cosi' quei numeri non li sto guardando"
            )

    # 2. Un campo sempre vuoto e' un dato che nessuno sta misurando.
    for campo in ("ingressi_evo_mese", "lead_oggi", "partner_attivi"):
        letti = [g for g in giorni if g.get(campo) is not None]
        if giorni and not letti:
            rilievi.append(
                f"*{campo}* non e' mai stato letto negli ultimi {len(giorni)} giorni: "
                f"o la fonte e' rotta, o quel numero non lo misura nessuno"
            )

    # 3. Una campagna che spende su un obiettivo che non porta lead.
    #    Non e' un rilievo "di sistema" come gli altri: e' l'unica azione della
    #    whitelist di Luca (`campagna_obiettivo`), quindi qui la propone.
    obiettivo = oggi.get("meta_obiettivo")
    if obiettivo and "LEAD" not in str(obiettivo).upper():
        di_fila = 1
        for g in storico or []:
            if g.get("meta_obiettivo") == obiettivo:
                di_fila += 1
            else:
                break

        # Due situazioni opposte che il conteggio nudo confonde.
        # Con ZERO lead in ingresso cambiare obiettivo e' dannoso: l'algoritmo
        # ottimizzerebbe su una conversione che non riceve mai. Il problema, in
        # quel caso, e' a monte -- dove atterra il traffico.
        # Quando i lead iniziano ad arrivare, invece, il cambio diventa la cosa
        # giusta da fare e va detto senza aspettare che qualcuno se ne accorga.
        lead = oggi.get("meta_lead_30gg")
        if lead and lead >= SOGLIA_LEAD_PER_CAMBIO_OBIETTIVO:
            rilievi.append(
                f"la campagna Meta e' ancora su *{obiettivo}* ma sta gia' portando "
                f"{lead} lead in 30 giorni: **ora ha senso passarla a un obiettivo "
                f"Lead**, l'algoritmo ha qualcosa su cui imparare"
            )
        else:
            rilievi.append(
                f"la campagna Meta e' su *{obiettivo}* da almeno {di_fila} "
                f"{'giorno' if di_fila == 1 else 'giorni'} di briefing: su questo obiettivo "
                f"si comprano clic, non iscritti. ⛔ Non cambiare obiettivo finche' i lead "
                f"restano {lead or 0}: prima deve arrivare la conversione, poi si ottimizza"
            )

    # 4. Lo stesso tappo per giorni = quello che stiamo facendo non lo sposta.
    tappo = oggi.get("tappo")
    if tappo:
        di_fila = 1
        for g in storico or []:
            if g.get("tappo") == tappo:
                di_fila += 1
            else:
                break
        if di_fila >= 3:
            rilievi.append(
                f"il tappo e' *{tappo}* da {di_fila} giorni di fila: ripeterlo non lo sposta, "
                f"serve una decisione diversa da quella presa finora"
            )

    return rilievi


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


def esegui_briefing():
    """
    Il briefing vero e proprio, senza Celery attorno.

    Estratto dal task l'1/9/2026 perche' **Celery non parte**: Redis Upstash e'
    rate-limited e `start_celery_worker()` cade sul fallback. Lo scheduler custom
    (`backend/scheduler.py`, APScheduler) invece gira -- l'1/9 alle 07:00 ha
    consegnato il report di Stefania -- e non dipende da Redis.

    Cosi' la stessa logica ha due inneschi e una sola implementazione: il task
    Celery quando la coda torna, l'endpoint HTTP nel frattempo. Duplicare il
    corpo avrebbe fatto divergere i due briefing al primo cambiamento.

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

        # Le fonti che non hanno risposto oggi, e il tappo dichiarato: si salvano
        # con i numeri perche' l'autodiagnosi di domani li rilegga. Senza traccia,
        # "questa fonte e' giu' da tre giorni" non e' calcolabile.
        fonti_buste = output.get("fonti") or {}
        numeri["fonti_ko"] = sorted(
            nome for nome, busta in fonti_buste.items() if not (busta or {}).get("ok")
        )
        funnel_stadi = (
            ((output.get("funnel") or {}).get("pre_acquisto") or {}).get("stadi") or []
        )
        con_coda = [s for s in funnel_stadi if s.get("fermi_oltre_14gg")]
        numeri["tappo"] = (
            max(con_coda, key=lambda s: s["fermi_oltre_14gg"])["label"] if con_coda else None
        )

        # Meta: unica fonte che il briefing legge da solo, senza passare da
        # `raccogli()`. Sta fuori da Ciak e non ha un endpoint interno.
        meta = run_async(_leggi_meta())
        if not meta.get("ok"):
            numeri["fonti_ko"] = sorted(set(numeri["fonti_ko"]) | {"meta"})
        campagne = (meta.get("dati") or {}).get("campagne_attive") or []
        numeri["meta_obiettivo"] = campagne[0]["obiettivo"] if campagne else None
        numeri["meta_lead_30gg"] = (meta.get("dati") or {}).get("lead_30gg")

        ieri, storico = run_async(_salva_stato(numeri))
        rilievi = _autodiagnosi(numeri, storico)

        righe = [f"*Briefing Luca — {datetime.now(timezone.utc).strftime('%d/%m/%Y')}*", ""]
        if numeri["sito_ok"] is False:
            url_ko = [
                f"{u.get('url')} ({u.get('status')})"
                for u in (sito.get("url") or [])
                if u.get("status") != 200
            ]
            righe += ["*SITO GIU'* — " + (", ".join(url_ko) or "URL non dettagliati"), ""]

        # L'obiettivo apre il briefing: e' la domanda a cui tutti gli altri numeri
        # rispondono. Metterlo in fondo lo avrebbe reso una nota a margine.
        obj = output.get("obiettivo") or {}
        if obj:
            righe += ["", f"*{obj.get('titolo') or 'Obiettivo'}*"]
            righe.append(
                f"- Incassato €{obj.get('incassato', 0):.0f} · mancano "
                f"*€{obj.get('gap', 0):.0f}* in {obj.get('giorni_rimasti', '?')} giorni"
            )
            if obj.get("ritmo_necessario"):
                righe.append(f"- Servono €{obj['ritmo_necessario']:.0f} al giorno")
            proi = obj.get("proiezione_al_ritmo_attuale")
            if proi is not None:
                scarto = obj.get("target", 0) - proi
                righe.append(
                    f"- Al ritmo attuale chiudi a *€{proi:.0f}*"
                    + (f" — {scarto:.0f} sotto il target" if scarto > 0 else " — sopra il target")
                )
            if not obj.get("leve_coprono_il_gap"):
                righe.append(
                    f"- ⚠️ Le leve aperte valgono €{obj.get('valore_leve_vive', 0):.0f}: "
                    f"**scoperti €{obj.get('scoperto', 0):.0f}** che oggi non hanno una voce"
                )
            for l in (obj.get("leve_ferme") or [])[:3]:
                righe.append(
                    f"  → *{l['nome']}* €{l['valore']:.0f} ferma da {l['giorni_fermi']} giorni"
                    + (f" ({l['dipende_da']})" if l.get("dipende_da") else "")
                )
            righe.append("")

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

        # Funnel pre-acquisto: e' il pezzo che mancava. Senza, il briefing parla
        # solo degli stadi dopo l'iscrizione e sembra che non entri nessuno.
        funnel = (output.get("funnel") or {}).get("pre_acquisto") or {}
        stadi = funnel.get("stadi") or []
        if stadi:
            righe += ["", f"*Funnel pre-acquisto* ({funnel.get('totale', 0)} in tutto)"]
            for s in stadi:
                if not s.get("totale"):
                    continue
                dettagli = [f"{s['ultimi_30gg']} negli ultimi 30gg"]
                if s.get("fermi_oltre_14gg"):
                    dettagli.append(f"{s['fermi_oltre_14gg']} fermi da oltre 14gg")
                if s.get("piu_vecchio_giorni") is not None:
                    dettagli.append(f"il piu' vecchio da {s['piu_vecchio_giorni']}gg")
                righe.append(f"- {s['label']}: {s['totale']} ({', '.join(dettagli)})")
            # Lo stadio che accumula di piu' e' quello su cui intervenire: dirlo
            # esplicitamente, perche' una lista di numeri non e' una decisione.
            tappo = max(stadi, key=lambda s: s.get("fermi_oltre_14gg") or 0)
            if tappo.get("fermi_oltre_14gg"):
                righe.append(
                    f"  → il tappo e' *{tappo['label']}*: {tappo['fermi_oltre_14gg']} "
                    f"fermi li' da oltre due settimane."
                )
        else:
            righe += ["", "_Funnel pre-acquisto: fonte non letta._"]

        fermi_nomi = delivery.get("fermi_nomi") or []
        if fermi_nomi:
            righe += ["", "*Fermi:* " + ", ".join(fermi_nomi[:8])]

        # Amministrazione: cosa scade oggi e cosa e' gia' scaduto senza esito.
        # Va PRIMA di Meta di proposito: una rata che salta e' cassa che non
        # entra oggi, la campagna e' una decisione che puo' aspettare domani.
        cred = output.get("crediti") or {}
        if cred:
            scade_oggi = cred.get("scade_oggi") or []
            in_ritardo = cred.get("in_ritardo") or []
            righe += ["", "*Amministrazione*"]
            righe.append(
                f"- Previsto questo mese: €{cred.get('previsto_nel_mese', 0):.0f} "
                f"({cred.get('rate_nel_mese', 0)} rate) · gia' incassato: "
                f"€{cred.get('gia_incassato_nel_mese', 0):.0f}"
            )
            ric = cred.get("ricorrente_nel_mese") or 0
            if ric:
                righe.append(f"  di cui mensilita' ricorrenti: €{ric:.0f}")
            if scade_oggi:
                for r in scade_oggi:
                    righe.append(f"  → *OGGI scade: {r.get('nome')} €{float(r.get('importo', 0)):.0f}*")
            if in_ritardo:
                righe.append(
                    f"- ⚠️ {len(in_ritardo)} rate scadute senza esito, "
                    f"€{cred.get('importo_in_ritardo', 0):.0f} in tutto:"
                )
                for r in in_ritardo[:4]:
                    righe.append(
                        f"  · {r.get('nome')} €{float(r.get('importo', 0)):.0f} "
                        f"(scaduta il {(r.get('scadenza') or '')[:10]})"
                    )
            a_cond = cred.get("a_condizione") or []
            if a_cond:
                tot = sum(float(r.get("importo") or 0) for r in a_cond)
                righe.append(f"- Legate a un evento (senza data): €{tot:.0f}")
                for r in a_cond[:3]:
                    righe.append(
                        f"  · {r.get('nome')} €{float(r.get('importo', 0)):.0f} "
                        f"— {r.get('condizione') or 'condizione non indicata'}"
                    )
            sospese = cred.get("sospese_dal_sollecito") or []
            if sospese:
                tot_s = sum(float(r.get("importo") or 0) for r in sospese)
                righe.append(
                    f"- ⛔ €{tot_s:.0f} dovuti ma da NON sollecitare "
                    f"({', '.join(r.get('nome') or '?' for r in sospese[:3])})"
                )
            righe.append(
                f"- Residuo totale da recuperare: €{cred.get('residuo_totale', 0):.0f} "
                f"su {cred.get('crediti_aperti', 0)} posizioni"
            )
        else:
            righe += ["", "_Amministrazione: fonte non letta._"]

        # Meta: spesa e resa. Il dato che conta davvero e' l'obiettivo della
        # campagna, che finisce nei rilievi se non e' di tipo Lead.
        if meta.get("ok"):
            d = meta["dati"]
            pezzi = []
            for etichetta, valore, unita in (
                ("spesa 30gg", d.get("spesa_30gg"), "€"),
                ("CTR", d.get("ctr"), "%"),
                ("CPC", d.get("cpc"), "€"),
                ("lead 30gg", d.get("lead_30gg"), ""),
            ):
                if valore is not None:
                    pezzi.append(
                        f"{etichetta} {unita}{valore}" if unita == "€"
                        else f"{etichetta} {valore}{unita}"
                    )
            righe += ["", "*Meta* — " + (" · ".join(pezzi) if pezzi else "nessun dato nel periodo")]
            for c in (d.get("campagne_attive") or []):
                righe.append(f"- {c['nome']}: obiettivo *{c['obiettivo']}*")
            if not d.get("campagne_attive"):
                righe.append("- nessuna campagna attiva")
        else:
            righe += ["", f"_Meta non letta: {meta.get('errore')}_"]

        # Quello che Luca nota su se stesso. Va in fondo di proposito: i numeri
        # del business vengono prima, ma un briefing che non dichiara i propri
        # punti ciechi e' peggio di uno che manca.
        if rilievi:
            righe += ["", "*Da sistemare nel briefing stesso*"]
            righe += [f"- {r}" for r in rilievi]
            righe.append("_Li propongo, non li tocco: la decisione e' tua._")

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
        run_async(_send_telegram(f"[LUCA] Briefing fallito: {e}"))
        return {"success": False, "error": str(e)}


@shared_task(bind=True, max_retries=2, default_retry_delay=300, name="luca_daily_briefing")
def luca_daily_briefing(self):
    """
    Innesco Celery del briefing delle 7:45. Oggi NON parte -- Redis e' bloccato e
    il worker cade sul fallback BackgroundTasks -- ma resta registrato: quando la
    coda torna, questo ridiventa il percorso principale.
    ⛔ Se entrambi gli inneschi girano, il briefing arriva due volte: quando Celery
    riparte, va tolto il job da `scheduler.py`.
    """
    try:
        return esegui_briefing()
    except Exception as e:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        return {"success": False, "error": str(e)}
