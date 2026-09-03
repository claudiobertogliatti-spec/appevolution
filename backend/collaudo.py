"""
Collaudo delle catene di Ciak — cosa PRODUCE, non cosa e' partito.

Perche' esiste (3/9/2026). Claudio: *"la macchina piu' che un carrarmato mi
sembra un triciclo che si rompe ogni 3 pedalate"*. Ma i guasti trovati nelle
ultime settimane non erano scollegati fra loro — avevano tutti la stessa firma:

- lo scheduler chiamava la porta 8001 mentre il server ascoltava sulla 8080:
  9 job morti in silenzio per mesi;
- l'outreach cercava `outreach_status: "pending"` su lead che quel campo non lo
  avevano: 564 lead fermi, e il job restituiva `success` ogni mattina;
- il briefing importava un modulo che nel container non esisteva;
- l'inserzione Meta atterrava sulla home invece che sulla masterclass;
- l'auto-approvazione aggancia solo `target_fit_level == "altissimo"`, match
  esatto su una stringa scritta a mano;
- i task di outreach per Valentina non li esegue nessuno e non compaiono
  nemmeno nella coda delle approvazioni.

**Ognuno di questi girava e dichiarava successo mentre non produceva niente.**
Il difetto vero non e' nessuno di loro preso singolarmente: e' che il sistema
non sa dire quando un suo pezzo gira a vuoto. Per questo si scoprono uno alla
volta, sempre settimane dopo, e sempre per caso.

Qui si guarda il **fondo della catena**: e' arrivato qualcosa nel database,
negli ultimi giorni? Un job che riporta `success` con zero risultati per giorni
consecutivi non e' un sistema in salute, e' un sistema rotto che nessuno ha
interrogato.

⛔ Questo modulo non ripara niente e non deve. Misura e dichiara: e' quello che
mancava.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

# Verdetti. Volutamente tre e non cinque: servono a decidere se guardare o no.
PRODUCE = "produce"          # e' arrivato qualcosa nella finestra attesa
A_VUOTO = "gira_a_vuoto"     # ha prodotto in passato, ora niente da troppo tempo
MAI = "mai_prodotto"         # non ha mai prodotto niente: probabilmente scollegato


def _iso(giorni_fa: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=giorni_fa)).isoformat()


def _giorni_da(iso: Optional[str]) -> Optional[int]:
    if not iso:
        return None
    try:
        quando = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if quando.tzinfo is None:
            quando = quando.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - quando).days
    except (ValueError, TypeError):
        return None


async def _catena(
    db,
    nome: str,
    collection: str,
    campo_data: str,
    filtro: dict,
    entro_giorni: int,
    a_cosa_serve: str,
    se_zero: str,
):
    """
    Una catena: quante cose sono arrivate in fondo nella finestra attesa.

    `se_zero` e' la parte che rende utile il collaudo: non basta dire "zero",
    bisogna dire cosa significa zero **per questa catena specifica**, altrimenti
    chi legge alle 7 del mattino non sa se e' un problema o una giornata calma.
    """
    coll = getattr(db, collection)
    query = {**filtro, campo_data: {"$gte": _iso(entro_giorni)}}

    prodotto = await coll.count_documents(query)
    totale = await coll.count_documents(filtro)

    # L'ultima volta che questa catena ha prodotto qualcosa. Serve a distinguere
    # "e' rotta da ieri" da "non ha mai funzionato": sono due indagini diverse.
    ultimo = None
    if totale:
        recenti = await coll.find(filtro, {"_id": 0, campo_data: 1}).sort(
            campo_data, -1
        ).to_list(1)
        if recenti:
            ultimo = recenti[0].get(campo_data)

    if prodotto > 0:
        verdetto = PRODUCE
    elif totale > 0:
        verdetto = A_VUOTO
    else:
        verdetto = MAI

    return {
        "catena": nome,
        "a_cosa_serve": a_cosa_serve,
        "prodotto_negli_ultimi_giorni": prodotto,
        "finestra_giorni": entro_giorni,
        "totale_storico": totale,
        "giorni_dall_ultimo": _giorni_da(ultimo),
        "verdetto": verdetto,
        "cosa_significa": None if verdetto == PRODUCE else se_zero,
    }


async def _censimento_lead(db) -> dict:
    """
    Quanti contatti ci sono, e in quale collection.

    Il 3/9/2026 il collaudo ha dato `discovery_leads` **vuota, storico zero** --
    mentre esistono 16 task di outreach che si creano leggendo proprio quella, e
    Claudio ha in mano una lista di 331 nomi. Le due cose non stanno insieme:
    o i contatti vivono altrove, o sono stati svuotati dopo.

    Un job che cerca nel posto sbagliato e' il guasto piu' frequente di Ciak --
    la porta 8001, il filtro dei 564 lead, il modulo fuori dal container. Quindi
    la domanda "dove sono davvero i dati" merita una risposta stampata, non una
    deduzione: qui si contano tutte le collection candidate, e chi legge vede
    subito se il motore sta guardando quella vuota.
    """
    fuori = {}
    for nome in ("discovery_leads", "ciak_leads", "lista_fredda", "leads", "clienti"):
        try:
            fuori[nome] = await getattr(db, nome).count_documents({})
        except Exception:
            fuori[nome] = None  # collection assente: si dichiara, non si finge 0
    return fuori


async def collauda(db) -> dict:
    """
    Passa in rassegna le catene che devono produrre cassa o lavoro.

    L'ordine non e' casuale: si parte da dove entrano i soldi e si scende. Una
    catena rotta in cima rende irrilevante tutto quello che sta sotto.
    """
    catene = [
        await _catena(
            db, "Lead scoperti", "discovery_leads", "created_at", {}, 7,
            "il carburante di tutto: senza lead nuovi non c'e' pipeline",
            "il motore di scoperta non porta piu' niente. Se gira e non trova, "
            "il filtro non aggancia: e' successo con i 564 lead fermi.",
        ),
        await _catena(
            db, "Lead auto-approvati", "discovery_leads", "auto_approved_at",
            {"auto_approved": True}, 7,
            "il passaggio da lead a contatto avviato, senza intervento umano",
            "l'auto-approvazione non aggancia nessuno. Aggancia solo "
            "target_fit_level == 'altissimo' con match ESATTO: se i lead hanno "
            "un altro valore o non ce l'hanno, gira ogni ora a vuoto.",
        ),
        await _catena(
            db, "Email partite", "email_logs", "sent_at", {"status": "sent_smtp"}, 7,
            "l'unica prova che qualcuno sia stato davvero contattato",
            "nessuna email e' uscita. Un contatto 'avviato' che non produce una "
            "email e' un contatto che non e' avvenuto.",
        ),
        await _catena(
            db, "Task di outreach eseguiti", "agent_tasks", "created_at",
            {"type": "auto_outreach_lead", "status": {"$nin": ["pending"]}}, 14,
            "i compiti creati per Valentina che sono stati davvero lavorati",
            "i task vengono creati e non li esegue nessuno: nel backend non "
            "esiste un consumatore di 'auto_outreach_lead', e nascono con status "
            "'pending' mentre la coda approvazioni cerca 'awaiting_approval'. "
            "Non sono ne' eseguibili ne' approvabili.",
        ),
        await _catena(
            db, "Tag Systeme applicati", "ciak_systeme_events", "at",
            {"applied_tags.0": {"$exists": True}}, 7,
            "il ponte fra Ciak e la lista email: senza, un iscritto non riceve nulla",
            "nessun tag e' arrivato a Systeme. Chi si iscrive resta nel database "
            "di Ciak e fuori dalla lista email: non entra in nessuna sequenza e "
            "non riceve niente. Verificato il 3/9/2026 interrogando Systeme: "
            "l'ultimo contatto e' dell'8 agosto. Prima cosa da guardare: la "
            "SYSTEME_API_KEY sul servizio, perche' la chiamata e' "
            "fire-and-forget e un errore non ferma nulla e non si vede.",
        ),
        await _catena(
            db, "Opt-in masterclass", "ciak_leads", "created_at", {}, 7,
            "chi arriva dal sito e lascia i dati: il primo gradino del funnel",
            "nessun opt-in. Da verificare dove atterra l'inserzione e se il form "
            "sulla pagina risponde.",
        ),
        # ⚠️ Il campo e' `scritto_a`, non `created_at`: questa collection fa upsert
        # su `data` e non usa la convenzione delle altre. Al primo giro vero
        # (3/9/2026) cercavo `created_at` e il collaudo dichiarava morto un
        # briefing che invece girava -- lo stesso difetto che deve smascherare.
        # Il nome di un campo si legge nel codice che scrive, non si presume.
        await _catena(
            db, "Briefing di Luca", "luca_stato_giornaliero", "scritto_a", {}, 2,
            "il rapporto delle 7:45: se manca, nessuno guarda i numeri",
            "il briefing non gira. Controllare che Celery Beat sia vivo e che "
            "Redis non sia sospeso.",
        ),
    ]

    rotte = [c for c in catene if c["verdetto"] != PRODUCE]
    return {
        "generato_at": datetime.now(timezone.utc).isoformat(),
        "catene": catene,
        "dove_stanno_i_lead": await _censimento_lead(db),
        "quante_rotte": len(rotte),
        # La riga che deve leggere chi ha trenta secondi.
        "in_sintesi": (
            "tutte le catene producono"
            if not rotte
            else "NON producono: " + ", ".join(c["catena"] for c in rotte)
        ),
    }
