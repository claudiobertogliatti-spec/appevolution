"""Partner rewards: certificates, project book and bonus PDFs."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models.partner_journey_step import MACRO_PHASES_DEFINITION, REQUIRED_STEP_IDS_BY_PHASE
from services.partner_rewards_pdf import (
    render_bonus_pdf,
    render_certificate_pdf,
    render_project_book_pdf,
)
from services.project_book_html import genera_project_book_pdf


router = APIRouter(prefix="/api/partner-rewards", tags=["partner-rewards"])
security = HTTPBearer(auto_error=False)
db = None


def set_db(database):
    global db
    db = database


async def _latest_document(partner_id: str, kind: str):
    return await db.partner_document_versions.find_one(
        {"partner_id": partner_id, "kind": kind}, {"_id": 0}, sort=[("version", -1)]
    )


async def _require_partner_access(partner_id: str, credentials):
    # Import lazy: partner_journey usa a sua volta gli helper rewards per gli
    # sblocchi, quindi un import top-level creerebbe un ciclo durante il boot.
    from routers.partner_journey import require_partner_or_admin_for_partner
    return await require_partner_or_admin_for_partner(partner_id, credentials)


PHASE_META = {
    "esamina": {
        "label": "Esamina",
        "result": "Il progetto ha fondamenta chiare: identita', storia, brand e posizionamento.",
        "next_step": "Ora trasformiamo questa direzione in masterclass, corso e sistema di vendita.",
        "bonus_title": "Mappa del tuo Posizionamento",
        "bonus_bullets": [
            "Chi sei e perche' il mercato dovrebbe ascoltarti.",
            "A chi parli: il pubblico che ha piu' bisogno della tua competenza.",
            "La promessa centrale da portare nella masterclass.",
        ],
    },
    "valida": {
        "label": "Valida",
        "result": "Il progetto e' diventato un sistema reale: masterclass, corso, script lezioni, sistema di vendita e lancio.",
        "next_step": "Da qui leggiamo i dati e miglioriamo il sistema con continuita'.",
        "bonus_title": "Checklist Lancio del tuo Modello Digitale",
        "bonus_bullets": [
            "Controlla video, dominio, legal pages, pagine, checkout e comunicazioni prima del go-live.",
            "Prepara il pubblico con contenuti semplici e coerenti.",
            "Tieni pronta la traccia della live e il follow-up.",
        ],
    },
    "ottimizza": {
        "label": "Ottimizza",
        "result": "Il modello digitale e' online: ora il lavoro passa su dati, vendite e miglioramento continuo.",
        "next_step": "Leggiamo i numeri reali, miglioriamo il funnel e costruiamo continuita' nei 12 mesi.",
        "bonus_title": "Piano 90 Giorni per Crescere",
        "bonus_bullets": [
            "Mantieni un ritmo editoriale semplice tra una live e l'altra.",
            "Analizza cosa converte e migliora un punto alla volta.",
            "Usa la live ricorrente come motore prevedibile di vendita.",
        ],
    },
}


def _normalize_phase(phase: str) -> str:
    return "ottimizza" if phase == "golive" else phase


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _days_between(values: list[Any]) -> Optional[int]:
    dates = sorted([d for d in (_parse_dt(v) for v in values) if d])
    if len(dates) < 2:
        return None
    return max(1, (dates[-1] - dates[0]).days + 1)


async def _load_context(partner_id: str) -> dict[str, Any]:
    if db is None:
        raise HTTPException(500, "Database non inizializzato")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0}) or {}
    steps = await db.partner_journey_steps.find(
        {"partner_id": partner_id}, {"_id": 0}
    ).sort("step_number", 1).to_list(length=40)

    if not partner and not steps:
        raise HTTPException(404, "Partner non trovato")

    # Il libretto raccontava un progetto vuoto perche' leggeva solo gli step: i
    # contenuti veri (brand kit, masterclass, corso, offerta) vivono nelle loro
    # collection e nell'hub. Senza queste letture il PDF usciva con sei sezioni su
    # undici a "si completera' nella prossima fase" (rilevato su Andolfi, 30/07/2026).
    hub = await db.partner_hub.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    masterclass = await db.masterclass_factory.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    videocorso = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    brand_kit = await db.partner_brand_kits.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    funnel = await db.partner_funnel.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    launch_calendar_document = await db.partner_launch_calendar_versions.find_one(
        {"partner_id": partner_id, "status": "approved"},
        {"_id": 0},
        sort=[("version", -1)],
    ) or {}
    from services.journey_completion import approved_launch_calendar_context
    launch_calendar_evidence = approved_launch_calendar_context(launch_calendar_document)
    launch_calendar = (
        launch_calendar_document.get("calendar")
        if launch_calendar_evidence.get("launch_calendar_approved")
        else {}
    )

    return {
        "partner": partner,
        "steps": steps,
        "steps_by_id": {s.get("step_id"): s for s in steps},
        "hub": hub,
        "masterclass": masterclass,
        "videocorso": videocorso,
        "brand_kit": brand_kit,
        "funnel": funnel,
        "launch_calendar": launch_calendar,
        "launch_calendar_version": launch_calendar_evidence.get("calendar_version"),
        "launch_calendar_checksum": launch_calendar_evidence.get("calendar_checksum"),
        "launch_calendar_approved_at": launch_calendar_evidence.get("approved_at"),
    }


def _phase_step_ids(phase: str) -> list[str]:
    phase = _normalize_phase(phase)
    if phase == "ottimizza":
        return ["13-lancio"]
    for mp in MACRO_PHASES_DEFINITION:
        if mp["id"] == phase:
            return mp.get("step_ids", [])
    return []


def _is_step_done(step: dict[str, Any] | None) -> bool:
    return bool(step and step.get("status") in ("done", "skipped"))


def _phase_unlocked(ctx: dict[str, Any], phase: str) -> bool:
    phase = _normalize_phase(phase)
    steps_by_id = ctx["steps_by_id"]
    if phase == "ottimizza":
        step = steps_by_id.get("13-lancio")
        return _is_step_done(step) and bool((step.get("data") or {}).get("launched_at") or step.get("completed_at"))
    required_ids = REQUIRED_STEP_IDS_BY_PHASE.get(phase, _phase_step_ids(phase))
    return bool(required_ids) and all(_is_step_done(steps_by_id.get(sid)) for sid in required_ids)


def _phase_days(ctx: dict[str, Any], phase: str) -> Optional[int]:
    ids = _phase_step_ids(phase)
    values = []
    for sid in ids:
        step = ctx["steps_by_id"].get(sid) or {}
        values.extend([step.get("started_at"), step.get("completed_at"), step.get("updated_at")])
    return _days_between(values)


def _partner_name(partner: dict[str, Any]) -> str:
    return partner.get("name") or partner.get("nome") or partner.get("business_name") or "Partner Ciak"


def _answers(step: dict[str, Any] | None) -> dict[str, Any]:
    """Le risposte dei wizard stanno in `data.answers`, non in `data`."""
    return ((step or {}).get("data") or {}).get("answers") or {}


def _primo(*valori: Any) -> str:
    for v in valori:
        if v is None:
            continue
        testo = str(v).strip()
        if testo:
            return testo
    return ""


def _pulisci_markdown(testo: str) -> str:
    """Gli script arrivano in markdown: nel PDF i `##` e i `**` vanno tolti."""
    import re

    testo = re.sub(r"^#{1,6}\s*", "", testo, flags=re.MULTILINE)
    testo = re.sub(r"\*\*(.+?)\*\*", r"\1", testo, flags=re.DOTALL)
    testo = re.sub(r"^-{3,}$", "", testo, flags=re.MULTILINE)
    return re.sub(r"\n{3,}", "\n\n", testo).strip()


def _estratto(testo: str, limite: int = 1200) -> str:
    """Taglia a fine frase, non a meta' parola."""
    testo = testo.strip()
    if len(testo) <= limite:
        return testo
    taglio = testo[:limite]
    for sep in (". ", "\n", " "):
        pos = taglio.rfind(sep)
        if pos > limite * 0.6:
            taglio = taglio[:pos + 1]
            break
    return taglio.rstrip() + " […]"


def _project_name(ctx: dict[str, Any]) -> str:
    partner = ctx.get("partner") or {}
    steps_by_id = ctx.get("steps_by_id") or {}
    brand = (steps_by_id.get("03-brand-kit") or {}).get("data") or {}
    pos = _answers(steps_by_id.get("04-posizionamento"))
    corso = (ctx.get("videocorso") or {}).get("course_data") or {}
    return _primo(
        (ctx.get("hub") or {}).get("offerName"),
        corso.get("titolo_corso"),
        corso.get("titolo"),
        brand.get("nome_progetto"),
        brand.get("brand_name"),
        pos.get("metodo_nome"),
        partner.get("project_name"),
        partner.get("business_name"),
    ) or "Il tuo modello digitale"


def _start_date(ctx: dict[str, Any]) -> str:
    dates = []
    for step in ctx["steps"]:
        dates.extend([_parse_dt(step.get("started_at")), _parse_dt(step.get("completed_at")), _parse_dt(step.get("updated_at"))])
    clean = sorted([d for d in dates if d])
    if not clean:
        return "In preparazione"
    return clean[0].strftime("%d/%m/%Y")


def _reward_state(ctx: dict[str, Any]) -> dict[str, Any]:
    phases = []
    for phase in ("esamina", "valida", "ottimizza"):
        meta = PHASE_META[phase]
        unlocked = _phase_unlocked(ctx, phase)
        phases.append({
            "id": phase,
            "label": meta["label"],
            "unlocked": unlocked,
            "days": _phase_days(ctx, phase),
            "certificate_url": f"/api/partner-rewards/{ctx['partner_id']}/certificate/{phase}" if unlocked else None,
            "bonus_title": meta["bonus_title"],
            "bonus_url": f"/api/partner-rewards/{ctx['partner_id']}/bonus/{phase}" if unlocked else None,
        })
    return phases


# Frasi usate quando una sezione non ha ancora contenuto: servono a distinguere
# una sezione compilata da un segnaposto.
_SEGNAPOSTO = (
    "si completera'",
    "verra' aggiornata",
    "verra' aggiunt",
    "saranno raccolti qui",
    "stiamo definendo",
    "qui entreranno",
    "non e' ancora stata definita",
)


def _numeri(testo: str) -> set[str]:
    """Le cifre presenti in una stringa di prezzo, per confrontare importi."""
    import re

    return set(re.findall(r"\d+", testo or ""))


def _normalizza(testo: str) -> str:
    """Le frasi di `_SEGNAPOSTO` sono scritte con l'apostrofo (`e'`, `completera'`).
    I testi ora escono con gli accenti veri: si normalizza prima di confrontare,
    altrimenti un segnaposto accentato passerebbe per sezione compilata."""
    for accentata, piatta in (("à", "a'"), ("è", "e'"), ("é", "e'"), ("ì", "i'"), ("ò", "o'"), ("ù", "u'")):
        testo = testo.replace(accentata, piatta)
    return testo


def _e_segnaposto(body: str) -> bool:
    testo = _normalizza((body or "").strip().lower())
    return not testo or any(testo.startswith(p) or p in testo[:120] for p in _SEGNAPOSTO)


def _sezioni_compilate(ctx: dict[str, Any]) -> int:
    return sum(1 for s in _project_sections(ctx) if not _e_segnaposto(s.get("body", "")))


def _sezione_offerta(ctx: dict[str, Any]) -> str:
    """Offerta ufficiale + traccia del webinar.

    La fonte del prezzo e' SEMPRE la scheda partner (hub). La traccia del webinar
    viene spesso generata prima che l'offerta sia decisa: pubblicarne i prezzi
    significherebbe consegnare al cliente un listino che non esiste. Su Andolfi il
    libretto riportava 97 EUR / 67 EUR mentre l'offerta reale era 297 EUR (listino
    497 EUR). Quando i due non coincidono si stampa l'offerta vera e si segnala che
    la traccia va riallineata. (30/07/2026)
    """
    hub = ctx.get("hub") or {}
    webinar_step = ((ctx["steps_by_id"].get("12-prezzo-webinar") or {}).get("data") or {})
    strategia = webinar_step.get("strategia")

    righe: list[str] = []
    nome, prezzo = _primo(hub.get("offerName")), _primo(hub.get("offerPrice"))
    if nome or prezzo:
        righe.append(f"Offerta: {nome or 'da definire'} — {prezzo or 'prezzo da definire'}")
        if _primo(hub.get("offerIncludes")):
            righe.append(f"Cosa include:\n{hub['offerIncludes'].strip()}")
        righe.append(
            f"Garanzia: {hub['offerGuarantee'].strip()}" if _primo(hub.get("offerGuarantee"))
            else "Garanzia: nessuna garanzia prevista."
        )
    else:
        righe.append("L'offerta non è ancora stata definita: nome, prezzo e contenuto vanno decisi prima del lancio.")

    if isinstance(strategia, dict):
        prezzo_traccia = strategia.get("prezzo") or {}
        listino_traccia = _primo(prezzo_traccia.get("listino"))
        promo_traccia = _primo(prezzo_traccia.get("promo_webinar"), prezzo_traccia.get("promo"))
        # Confronto sui numeri, non sul testo: "97€" e' sottostringa di "297€" e il
        # controllo per sottostringa lasciava passare proprio il caso da segnalare.
        numeri_offerta = _numeri(prezzo)
        numeri_traccia = _numeri(f"{listino_traccia} {promo_traccia}")
        if numeri_traccia and numeri_offerta and not (numeri_traccia & numeri_offerta):
            detta = " / ".join(x for x in (listino_traccia, promo_traccia) if x)
            righe.append(
                f"\nNota: la traccia del webinar e' stata scritta con prezzi diversi "
                f"({detta}) da quelli dell'offerta attuale ({prezzo}). "
                "Vale l'offerta qui sopra: la traccia va riallineata prima della live."
            )
        for bonus in (prezzo_traccia.get("bonus") or []):
            righe.append(f"- Bonus: {_estratto(str(bonus), 220)}")
    elif strategia:
        righe.append("\n" + _estratto(_pulisci_markdown(str(strategia)), 900))

    return "\n".join(righe)


def _sezione_webinar(ctx: dict[str, Any]) -> list[str]:
    """Traccia della live: titolo, durata e fasi. Il prezzo sta nella sezione Offerta."""
    strategia = ((ctx["steps_by_id"].get("12-prezzo-webinar") or {}).get("data") or {}).get("strategia")
    if not isinstance(strategia, dict):
        return []
    web = strategia.get("webinar") or {}
    righe: list[str] = []
    if web.get("titolo"):
        durata = web.get("durata_min")
        righe.append(f"{web['titolo']}" + (f" ({durata} minuti)" if durata else ""))
    for fase in (web.get("fasi") or []):
        if not isinstance(fase, dict):
            continue
        titolo = _primo(fase.get("fase"), "Fase")
        minuti = _primo(fase.get("minuti"))
        obiettivo = _primo(fase.get("obiettivo"))
        righe.append(f"- {titolo}{f' ({minuti})' if minuti else ''}: {obiettivo}")
    return righe


def _fase_attuale(ctx: dict[str, Any]) -> str:
    """La macro-fase EVO in corso, per la copertina del libretto."""
    for phase in ("esamina", "valida", "ottimizza"):
        if not _phase_unlocked(ctx, phase):
            return PHASE_META[phase]["label"]
    return "Percorso completato"


def _project_sections(ctx: dict[str, Any]) -> list[dict[str, str]]:
    steps = ctx["steps_by_id"]
    partner = ctx["partner"]
    hub = ctx.get("hub") or {}
    brand_kit = ctx.get("brand_kit") or {}
    mc = ctx.get("masterclass") or {}
    corso = (ctx.get("videocorso") or {}).get("course_data") or {}
    funnel_coll = ctx.get("funnel") or {}

    pos = _answers(steps.get("04-posizionamento"))
    story = _answers(steps.get("la-tua-storia"))
    brand_step = (steps.get("03-brand-kit") or {}).get("data") or {}
    vendita = (steps.get("10-sistema-vendita") or {}).get("data") or {}
    calendar = ctx.get("launch_calendar") or {}
    launch = (steps.get("13-lancio") or {}).get("data") or {}
    ott = partner.get("ottimizzazione") or {}

    identita = _primo(hub.get("whoYouAre"), hub.get("bio"), partner.get("bio"), story.get("S01"))
    if story.get("S18"):
        identita = (identita + "\n\n" + str(story["S18"])).strip() if identita else str(story["S18"])

    if not identita:
        identita = "Identità e storia del partner in corso di definizione e validazione narrativa."
    elif not _is_step_done(steps.get("la-tua-storia")):
        identita = identita + "\n\n(Nota: La storia e l'identità dettagliata verranno aggiornate a completamento dello step La Tua Storia)"

    target = _primo(hub.get("targetAudience"), pos.get("nicchia"), pos.get("momento_di_vita"), pos.get("desideri_avatar"))
    problema = _primo(hub.get("problem"), pos.get("costo_del_no"), pos.get("paure_avatar"))
    promessa = _primo(hub.get("solution"), pos.get("promessa"), pos.get("trasformazione_90gg"), hub.get("pitch"))

    posizionamento_righe = []
    for etichetta, valore in (
        ("Nicchia", _primo(hub.get("niche"), pos.get("nicchia"))),
        ("Metodo", _primo(pos.get("metodo_nome"))),
        ("Differenziatore", _primo(hub.get("differentiator"), pos.get("differenza_riconoscibile"))),
        ("Pitch", _primo(hub.get("pitch"))),
        ("Trasformazione a 90 giorni", _primo(pos.get("trasformazione_90gg"))),
        ("Prova concreta", _primo(pos.get("prova_sociale_concreta"))),
    ):
        if valore:
            posizionamento_righe.append(f"{etichetta}: {valore}")

    # Il brand kit compilato nel Percorso vive nello step `03-brand-kit.data`, con
    # `colors` (lista), `tone_of_voice`, `logo_url`, `parole_chiave`: leggendo solo
    # l'hub e la collection brand kit la sezione usciva vuota anche a brand completo
    # (rilevato in produzione su Andolfi il 30/07/2026).
    colori_step = brand_step.get("colors") if isinstance(brand_step.get("colors"), list) else []
    palette = " · ".join(filter(None, [
        _primo(hub.get("primaryColor"), brand_kit.get("primary_color"), colori_step[0] if colori_step else ""),
        _primo(hub.get("accentColor"), brand_kit.get("accent_color"), colori_step[1] if len(colori_step) > 1 else ""),
    ]))
    parole = brand_step.get("parole_chiave")
    brand_righe = []
    for etichetta, valore in (
        ("Palette", palette),
        ("Font", " / ".join(filter(None, [hub.get("fontPrimary"), hub.get("fontSecondary"),
                                          brand_kit.get("font_primary")]))),
        ("Parole chiave", ", ".join(parole) if isinstance(parole, list) else _primo(parole)),
        ("Tono di voce", _primo(hub.get("toneOfVoice"), brand_step.get("tone_of_voice"), brand_step.get("tono"))),
        ("Logo", "presente" if _primo(hub.get("logo"), brand_kit.get("logo"), brand_step.get("logo_url")) else ""),
    ):
        if valore:
            brand_righe.append(f"{etichetta}: {valore}")

    webinar_righe = _sezione_webinar(ctx)

    mc_righe = []
    if _primo(mc.get("titolo"), mc.get("script_title")):
        mc_righe.append(_primo(mc.get("titolo"), mc.get("script_title")))
    if mc.get("video_approved") or mc.get("video_pipeline_status") == "approved":
        mc_righe.append("Video registrato e approvato.")
    if _primo(mc.get("video_youtube_url"), mc.get("video_embed_url")):
        mc_righe.append(f"Online: {_primo(mc.get('video_youtube_url'), mc.get('video_embed_url'))}")
    # Lo script non va nel corpo: ha il suo box monospaziato (vedi sotto).

    corso_righe = []
    if corso:
        titolo = _primo(corso.get("titolo_corso"), corso.get("titolo"))
        if titolo:
            corso_righe.append(titolo)
        if corso.get("sottotitolo"):
            corso_righe.append(str(corso["sottotitolo"]))
        moduli = corso.get("moduli") or corso.get("outline_moduli") or []
        if moduli:
            n_lezioni = sum(len(m.get("lezioni") or []) for m in moduli if isinstance(m, dict))
            corso_righe.append(f"\nStruttura: {len(moduli)} moduli, {n_lezioni} lezioni.")
            for m in moduli:
                if isinstance(m, dict):
                    corso_righe.append(f"- {_primo(m.get('numero'), '')}. {_primo(m.get('titolo'), 'Modulo')}")

    vendita_righe = []
    if _primo(funnel_coll.get("live_url"), funnel_coll.get("funnel_systeme_url")):
        vendita_righe.append(f"Funnel: {_primo(funnel_coll.get('live_url'), funnel_coll.get('funnel_systeme_url'))}")
    if funnel_coll.get("funnel_status"):
        vendita_righe.append(f"Stato: {funnel_coll['funnel_status']}")
    if _primo(vendita.get("note_sistema_vendita"), vendita.get("headline"), vendita.get("descrizione")):
        vendita_righe.append(_primo(vendita.get("note_sistema_vendita"), vendita.get("headline"), vendita.get("descrizione")))

    calendario = _primo(calendar.get("calendario"), calendar.get("summary"), calendar.get("piano"))
    if not calendario and calendar.get("days"):
        calendario = "\n".join(
            f"Giorno {day.get('day')} · {day.get('format')}: {day.get('theme')} — CTA: {day.get('cta')}"
            for day in calendar["days"]
            if isinstance(day, dict)
        )

    # Le 13 sezioni, nell'ordine del design approvato il 01/07/2026
    # (docs/superpowers/specs/2026-07-01-ciak-partner-libretto-attestati-design.md).
    # "Problema" e "Promessa" sono due sezioni distinte, cosi' come "Offerta e prezzo"
    # e "Webinar/live"; gli script delle videolezioni non fanno parte del libretto.
    ATTESA = "Questa sezione si completerà nella prossima fase del percorso."

    # Gli script pronti all'uso non sono una sezione: vanno nel box "Script & Output AI"
    # previsto dallo standard (memory/CIAK_WORKBOOK_STRATEGICO_TEMPLATE.md).
    script_lez = _primo(
        ((steps.get("07-script-videolezioni") or {}).get("data") or {}).get("script_videolezioni"),
        ((ctx.get("videocorso") or {}).get("production_kit") or {}).get("script_lez"),
    )
    box_corso = [{"tipo": "script", "titolo": "SCRIPT VIDEOLEZIONI PRONTO ALL'USO",
                  "testo": _estratto(_pulisci_markdown(script_lez), 1400)}] if script_lez else []
    nota_operativa = _primo((ctx.get("videocorso") or {}).get("operational_note"))
    if nota_operativa:
        box_corso.append({"tipo": "tutor", "testo": nota_operativa})

    script_mc = _primo(mc.get("script"))
    box_mc = [{"tipo": "script", "titolo": "SCRIPT MASTERCLASS",
               "testo": _estratto(_pulisci_markdown(script_mc), 1400)}] if script_mc else []

    return [
        {"title": "Executive Summary & Identità", "body": identita or ATTESA},
        {"title": "Target & ICP", "body": target or ATTESA},
        {"title": "Problema che risolvi", "body": problema or ATTESA},
        {"title": "Promessa", "body": promessa or ATTESA},
        {"title": "Posizionamento Strategico", "body": "\n".join(posizionamento_righe) or ATTESA},
        {"title": "Brand Kit", "body": "\n".join(brand_righe) or ATTESA},
        {"title": "Struttura Masterclass", "body": "\n".join(mc_righe) or ATTESA, "boxes": box_mc},
        {"title": "Struttura Corso", "body": "\n".join(corso_righe) or ATTESA, "boxes": box_corso},
        {"title": "Offerta & Pricing", "body": _sezione_offerta(ctx)},
        {"title": "Sistema di Vendita", "body": "\n".join(vendita_righe) or ATTESA},
        {"title": "Calendario di Lancio", "body": _estratto(_pulisci_markdown(str(calendario))) if calendario else ATTESA},
        {"title": "Webinar & Live", "body": "\n".join(webinar_righe) or ATTESA},
        {"title": "Obiettivi Post-Lancio", "body": _primo(ott.get("summary"), launch.get("report")) or ATTESA},
    ]


async def archive_final_documents(partner_id: str) -> dict:
    """Genera e archivia F-18/F-19; i retry sulla stessa versione sono idempotenti."""
    from services.partner_document_versions import archive_document_version

    ctx = await _load_context(partner_id)
    launch = await db.partner_lancio.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    source_version = str(launch.get("launched_at") or launch.get("probe_verified_at") or "launch")
    meta = PHASE_META["valida"]
    certificate_pdf = render_certificate_pdf({
        "partner_name": _partner_name(ctx["partner"]), "phase_label": meta["label"],
        "days": _phase_days(ctx, "valida"), "result": meta["result"], "next_step": meta["next_step"],
    })
    certificate = await archive_document_version(
        db, partner_id, "certificate_valida", source_version, certificate_pdf
    )
    payload = {
        "partner_name": _partner_name(ctx["partner"]), "project_name": _project_name(ctx),
        "start_date": _start_date(ctx), "fase_attuale": _fase_attuale(ctx),
        "sections": _project_sections(ctx),
    }
    try:
        workbook_pdf = await genera_project_book_pdf(payload)
    except Exception:
        logging.exception("[project-book] render finale HTML fallito, fallback reportlab")
        workbook_pdf = render_project_book_pdf(payload)
    workbook = await archive_document_version(db, partner_id, "workbook_final", source_version, workbook_pdf)

    from routers.partner_journey import _OperativoCompleteBody, _complete_operativo_step_unchecked
    for step_id in ("18-certificato-valida", "19-workbook-finale"):
        current = await db.partner_journey_steps.find_one(
            {"partner_id": partner_id, "step_id": step_id}, {"_id": 0, "status": 1}
        )
        if current and current.get("status") != "done":
            await _complete_operativo_step_unchecked(
                partner_id, step_id, _OperativoCompleteBody(data={})
            )
    return {"certificate_version": certificate.version, "workbook_version": workbook.version}


@router.get("/{partner_id}/state")
async def get_rewards_state(
    partner_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    await _require_partner_access(partner_id, credentials)
    ctx = await _load_context(partner_id)
    ctx["partner_id"] = partner_id
    phases = _reward_state(ctx)
    workbook = await _latest_document(partner_id, "workbook_final")
    return {
        "success": True,
        "partner_id": partner_id,
        "project_book": {
            "title": "Libretto di Progetto Ciak",
            "project_name": _project_name(ctx),
            "download_url": f"/api/partner-rewards/{partner_id}/project-book",
            # Si contano le sezioni davvero compilate del libretto, non le fasi EVO
            # sbloccate: prima un partner con dieci sezioni piene leggeva "0 di 3".
            "unlocked_sections": _sezioni_compilate(ctx),
            "total_sections": len(_project_sections(ctx)),
            "fasi_sbloccate": sum(1 for phase in phases if phase["unlocked"]),
            "version": (workbook or {}).get("version"),
            "archived_at": (workbook or {}).get("created_at"),
        },
        "phases": phases,
    }


@router.get("/{partner_id}/certificate/{phase}")
async def download_certificate(
    partner_id: str,
    phase: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    await _require_partner_access(partner_id, credentials)
    phase = _normalize_phase(phase)
    if phase not in PHASE_META:
        raise HTTPException(404, "Fase non valida")
    archived = await _latest_document(partner_id, "certificate_valida") if phase == "valida" else None
    ctx = await _load_context(partner_id)
    if not _phase_unlocked(ctx, phase):
        raise HTTPException(403, "Attestato non ancora sbloccato")
    meta = PHASE_META[phase]
    pdf = archived.get("content") if archived else render_certificate_pdf({
        "partner_name": _partner_name(ctx["partner"]),
        "phase_label": meta["label"],
        "days": _phase_days(ctx, phase),
        "result": meta["result"],
        "next_step": meta["next_step"],
    })
    filename = f"attestato-ciak-{phase}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{partner_id}/bonus/{phase}")
async def download_bonus(
    partner_id: str,
    phase: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    await _require_partner_access(partner_id, credentials)
    phase = _normalize_phase(phase)
    if phase not in PHASE_META:
        raise HTTPException(404, "Fase non valida")
    ctx = await _load_context(partner_id)
    if not _phase_unlocked(ctx, phase):
        raise HTTPException(403, "Bonus non ancora sbloccato")
    meta = PHASE_META[phase]
    pdf = render_bonus_pdf({
        "partner_name": _partner_name(ctx["partner"]),
        "title": meta["bonus_title"],
        "bullets": meta["bonus_bullets"],
    })
    filename = f"bonus-ciak-{phase}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{partner_id}/project-book")
async def download_project_book(
    partner_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    await _require_partner_access(partner_id, credentials)
    archived = await _latest_document(partner_id, "workbook_final")
    if archived:
        return Response(
            content=archived["content"], media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="workbook-finale-ciak.pdf"'},
        )
    ctx = await _load_context(partner_id)
    # `filled` viaggia col payload: prima il renderer riderivava "sezione compilata"
    # con una sua euristica piu' debole e l'indice del PDF marcava Compilata anche
    # una sezione che diceva "l'offerta non e' ancora stata definita" (12/08/2026).
    # Un solo criterio, quello di `_e_segnaposto`.
    sezioni = [{**s, "filled": not _e_segnaposto(s.get("body", ""))} for s in _project_sections(ctx)]
    payload = {
        "partner_name": _partner_name(ctx["partner"]),
        "project_name": _project_name(ctx),
        "start_date": _start_date(ctx),
        "fase_attuale": _fase_attuale(ctx),
        "sections": sezioni,
    }
    # Standard ufficiale: HTML brandizzato -> Playwright (memory/CIAK_WORKBOOK_STRATEGICO_TEMPLATE.md).
    # Se chromium non e' disponibile si ripiega sul render reportlab, cosi' il partner
    # riceve comunque il documento invece di un errore.
    try:
        pdf = await genera_project_book_pdf(payload)
    except Exception:
        logging.exception("[project-book] render HTML fallito, fallback reportlab")
        pdf = render_project_book_pdf(payload)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="libretto-progetto-ciak.pdf"'},
    )
