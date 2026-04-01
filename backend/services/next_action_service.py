"""
Next Action Service — Evolution PRO Guided System
===================================================
Translates internal step codes into partner-facing action objects.
This is the "Valentina layer": Stefania decides, this service translates.

Rules:
- ACTIONABLE steps → show a concrete action with CTA
- WAITING/INTERNAL steps → show "in attesa di revisione" state
- BLOCKED steps → show blocking reason with no CTA
- COMPLETE state → show next-state preview
"""

from typing import Optional
from .agent_dispatcher import get_assigned_agent, get_agent_profile

# ── Action catalog ─────────────────────────────────────────────────────────────
# Maps step_code → NextAction template
# Variables: {partner_name}, {agent_name} are substituted at render time

_ACTION_CATALOG: dict[str, dict] = {

    # ── ONBOARDING ──────────────────────────────────────────────────────────
    "UPLOAD_DOCS": {
        "title": "Carica i tuoi documenti",
        "description": "Per attivare il tuo percorso abbiamo bisogno di un documento d'identità valido. Servono pochi minuti.",
        "cta": "Carica documento",
        "time_estimate": "5 min",
        "action_type": "UPLOAD",
        "action_key": "upload_identity_docs",
    },
    "CONFIRM_NICHE": {
        "title": "Conferma la tua nicchia",
        "description": "Dicci in quale settore operi. Questa informazione guida tutta la tua strategia.",
        "cta": "Conferma nicchia",
        "time_estimate": "3 min",
        "action_type": "FORM",
        "action_key": "confirm_niche",
    },

    # ── POSITIONING ─────────────────────────────────────────────────────────
    "BIO_COMPLETED": {
        "title": "Racconta chi sei",
        "description": "Scrivi una breve presentazione professionale. Sarà la base del tuo posizionamento.",
        "cta": "Scrivi la tua bio",
        "time_estimate": "15 min",
        "action_type": "FORM",
        "action_key": "complete_bio",
    },
    "TARGET_DEFINED": {
        "title": "Definisci il tuo cliente ideale",
        "description": "Descrivi la persona che trae il massimo beneficio dal tuo lavoro. Più sei specifico, meglio funziona.",
        "cta": "Definisci il target",
        "time_estimate": "20 min",
        "action_type": "WIZARD",
        "action_key": "define_target",
    },
    "TRANSFORMATION_DEFINED": {
        "title": "Qual è la trasformazione che offri?",
        "description": "Prima e dopo: dove si trova il tuo cliente adesso e dove lo porti. Questo è il cuore della tua offerta.",
        "cta": "Definisci la trasformazione",
        "time_estimate": "20 min",
        "action_type": "WIZARD",
        "action_key": "define_transformation",
    },
    "POSITIONING_CONFIRMED": {
        "title": "Conferma il tuo posizionamento",
        "description": "Leggi il riepilogo del tuo posizionamento e confermalo. Se qualcosa non va, puoi modificarlo prima di procedere.",
        "cta": "Conferma posizionamento",
        "time_estimate": "10 min",
        "action_type": "REVIEW",
        "action_key": "confirm_positioning",
    },

    # ── MASTERCLASS ─────────────────────────────────────────────────────────
    "SCRIPT_WRITTEN": {
        "title": "Scrivi lo script della tua Masterclass",
        "description": "Ti guidiamo blocco per blocco. Non devi essere uno scrittore: rispondi alle domande e il tuo script prende forma.",
        "cta": "Inizia lo script",
        "time_estimate": "45 min",
        "action_type": "BUILDER",
        "action_key": "write_masterclass_script",
    },
    "VIDEO_RECORDED": {
        "title": "Registra la tua Masterclass",
        "description": "Hai lo script pronto. Ora registra il video seguendo la struttura. Non deve essere perfetto: lo rivisitiamo insieme.",
        "cta": "Carica il video",
        "time_estimate": "30 min",
        "action_type": "UPLOAD",
        "action_key": "upload_masterclass_video",
    },

    # ── VIDEOCORSO ──────────────────────────────────────────────────────────
    "STRUCTURE_DEFINED": {
        "title": "Struttura il tuo videocorso",
        "description": "Quanti moduli? Quali argomenti? Ti aiutiamo a costruire uno schema logico che mantiene lo studente coinvolto.",
        "cta": "Definisci la struttura",
        "time_estimate": "30 min",
        "action_type": "BUILDER",
        "action_key": "define_course_structure",
    },
    "MODULES_UPLOADED": {
        "title": "Carica i video del tuo corso",
        "description": "Carica i video uno alla volta seguendo l'ordine della struttura. Andrea verificherà la qualità.",
        "cta": "Carica il prossimo video",
        "time_estimate": "15 min per video",
        "action_type": "UPLOAD",
        "action_key": "upload_course_module",
    },

    # ── FUNNEL ──────────────────────────────────────────────────────────────
    "COPY_WRITTEN": {
        "title": "Scrivi il copy della pagina di vendita",
        "description": "Testo del titolo, dei benefici, delle testimonianze e del prezzo. Ti guidiamo sezione per sezione.",
        "cta": "Scrivi il copy",
        "time_estimate": "60 min",
        "action_type": "BUILDER",
        "action_key": "write_funnel_copy",
    },

    # ── LANCIO ──────────────────────────────────────────────────────────────
    "CALENDAR_CREATED": {
        "title": "Crea il calendario dei contenuti",
        "description": "30 giorni di post, reel e email. Marco ti aiuta a pianificare ogni giorno prima del lancio.",
        "cta": "Crea il calendario",
        "time_estimate": "45 min",
        "action_type": "CALENDAR",
        "action_key": "create_launch_calendar",
    },
    "CONTENT_READY": {
        "title": "Prepara i contenuti del lancio",
        "description": "Segui il calendario: crea i post, scrivi le email e prepara i reel. Marco verifica che tutto sia pronto.",
        "cta": "Segna come pronti",
        "time_estimate": "Vari giorni",
        "action_type": "CHECKLIST",
        "action_key": "mark_content_ready",
    },

    # ── POST_LAUNCH ─────────────────────────────────────────────────────────
    "FUNNEL_OPTIMIZED": {
        "title": "Ottimizza il tuo funnel",
        "description": "Hai i primi dati. Analizza i punti di abbandono e apporta le correzioni suggerite da Marco.",
        "cta": "Inizia ottimizzazione",
        "time_estimate": "2h",
        "action_type": "FORM",
        "action_key": "optimize_funnel",
    },

    # ── SCALING ─────────────────────────────────────────────────────────────
    "ADV_ACTIVATED": {
        "title": "Attiva la tua prima campagna ADV",
        "description": "È il momento di investire in pubblicità. Antonella ti guida nella configurazione del primo budget.",
        "cta": "Attiva campagna",
        "time_estimate": "30 min",
        "action_type": "FORM",
        "action_key": "activate_adv",
    },
    "UPSELL_DEFINED": {
        "title": "Definisci il tuo upsell",
        "description": "Cosa offri ai clienti che hanno già comprato? Costruiamo insieme il prossimo prodotto.",
        "cta": "Definisci l'upsell",
        "time_estimate": "45 min",
        "action_type": "FORM",
        "action_key": "define_upsell",
    },
    "SECOND_PRODUCT_STARTED": {
        "title": "Avvia il secondo prodotto",
        "description": "La base è solida. Costruiamo ora un secondo prodotto per aumentare il LTV dei tuoi clienti.",
        "cta": "Inizia il secondo prodotto",
        "time_estimate": "In corso",
        "action_type": "FORM",
        "action_key": "start_second_product",
    },
    "COMMUNITY_ACTIVE": {
        "title": "Attiva la community",
        "description": "Una community aumenta la retention e genera referral. Antonella ti guida nella configurazione.",
        "cta": "Attiva community",
        "time_estimate": "1h",
        "action_type": "FORM",
        "action_key": "activate_community",
    },
}

# ── Waiting messages ───────────────────────────────────────────────────────────
# Shown when the current step is INTERNAL (waiting for agent/admin)

_WAITING_MESSAGES: dict[str, dict] = {
    "VERIFY_IDENTITY": {
        "title": "Verifica documento in corso",
        "description": "Il tuo documento è stato caricato. Il team lo sta verificando — di solito entro poche ore.",
        "waiting_for": "Team Evolution PRO",
    },
    "SCRIPT_APPROVED": {
        "title": "Script in revisione",
        "description": "Hai consegnato lo script. Valentina lo sta leggendo e ti darà feedback entro 24 ore.",
        "waiting_for": "Valentina",
    },
    "VIDEO_APPROVED": {
        "title": "Video in revisione",
        "description": "Il video è stato caricato. Andrea sta verificando qualità e contenuto. Ti notificheremo.",
        "waiting_for": "Andrea",
    },
    "CONTENT_APPROVED": {
        "title": "Contenuti in revisione",
        "description": "I tuoi video sono stati caricati. Andrea sta verificando l'intero corso. Ci vorrà qualche giorno.",
        "waiting_for": "Andrea",
    },
    "COPY_APPROVED": {
        "title": "Copy in revisione",
        "description": "Il tuo copy è stato inviato. Il team lo sta revisionando prima di procedere con la pagina.",
        "waiting_for": "Team",
    },
    "FUNNEL_BUILT": {
        "title": "Pagina di vendita in costruzione",
        "description": "Gaia sta costruendo la tua pagina su Systeme.io. Riceverai il link per verificarla entro 48 ore.",
        "waiting_for": "Gaia",
    },
    "PAYMENT_CONFIGURED": {
        "title": "Pagamento in configurazione",
        "description": "Gaia sta configurando il sistema di pagamento. Ti avviseremo quando sarà pronto per il test.",
        "waiting_for": "Gaia",
    },
    "CHECKOUT_TEST_PASSED": {
        "title": "Test checkout in corso",
        "description": "Stiamo verificando che il processo di acquisto funzioni correttamente. Ci vorrà poco.",
        "waiting_for": "Sistema",
    },
    "LAUNCH_APPROVED": {
        "title": "In attesa di approvazione lancio",
        "description": "Hai fatto tutto. Claudio verificherà l'intero setup prima di darti il via libera al lancio.",
        "waiting_for": "Claudio",
    },
    "WENT_LIVE": {
        "title": "Lancio in attivazione",
        "description": "Il team sta completando le ultime verifiche tecniche per la messa online.",
        "waiting_for": "Team",
    },
    "FIRST_WEEK_DONE": {
        "title": "Prima settimana in corso",
        "description": "Il tuo corso è online! Marco sta monitorando i primi dati. Parlagli di come sta andando.",
        "waiting_for": "Marco",
    },
    "KPI_BASELINE_SET": {
        "title": "Raccolta dati iniziali",
        "description": "Il sistema sta raccogliendo i tuoi primi KPI. Torneremo da te appena abbiamo una baseline.",
        "waiting_for": "Sistema",
    },
    "FIRST_SALE": {
        "title": "In attesa della prima vendita",
        "description": "Tutto è pronto. Marco ti aiuta a portare traffico e convertire i tuoi primi studenti.",
        "waiting_for": "In corso",
    },
    "REVIEW_CALL_DONE": {
        "title": "Call di revisione da programmare",
        "description": "È il momento della call con Marco per analizzare i risultati e pianificare i prossimi passi.",
        "waiting_for": "Marco",
    },
}

# ── Public API ─────────────────────────────────────────────────────────────────

def build_next_action(guided: dict, partner_name: str = "") -> dict:
    """
    Build the complete next_action object from the evaluated guided state.

    Returns a dict with:
      - type: ACTIONABLE | WAITING | BLOCKED | COMPLETE
      - title, description, cta (cta is None for WAITING/BLOCKED)
      - time_estimate
      - action_type, action_key
      - step_code, state
      - assigned_agent (profile)
      - waiting_for (only if WAITING)
      - blocked_reason (only if BLOCKED)
    """
    current_state = guided.get("current_state", "ONBOARDING")
    current_step = guided.get("current_step", "UPLOAD_DOCS")
    blocked_reason = guided.get("blocked_reason")
    assigned_agent_name = guided.get("assigned_agent", "VALENTINA")

    agent_profile = get_agent_profile(assigned_agent_name)

    # ── BLOCKED ──────────────────────────────────────────────────────────────
    if blocked_reason:
        return {
            "type": "BLOCKED",
            "state": current_state,
            "step_code": current_step,
            "title": "Azione richiesta",
            "description": blocked_reason,
            "cta": None,
            "time_estimate": None,
            "action_type": None,
            "action_key": None,
            "assigned_agent": agent_profile,
            "waiting_for": None,
            "blocked_reason": blocked_reason,
        }

    # ── COMPLETE (all states done) ────────────────────────────────────────────
    if current_step == "__COMPLETE__":
        return {
            "type": "COMPLETE",
            "state": current_state,
            "step_code": "__COMPLETE__",
            "title": "Percorso completato",
            "description": "Hai completato tutte le fasi del programma. Il tuo sistema è attivo e in crescita.",
            "cta": None,
            "time_estimate": None,
            "action_type": None,
            "action_key": None,
            "assigned_agent": agent_profile,
            "waiting_for": None,
            "blocked_reason": None,
        }

    # ── WAITING (internal step) ───────────────────────────────────────────────
    waiting_msg = _WAITING_MESSAGES.get(current_step)
    if waiting_msg:
        return {
            "type": "WAITING",
            "state": current_state,
            "step_code": current_step,
            "title": waiting_msg["title"],
            "description": waiting_msg["description"],
            "cta": None,
            "time_estimate": None,
            "action_type": None,
            "action_key": None,
            "assigned_agent": agent_profile,
            "waiting_for": waiting_msg.get("waiting_for"),
            "blocked_reason": None,
        }

    # ── ACTIONABLE ────────────────────────────────────────────────────────────
    catalog_entry = _ACTION_CATALOG.get(current_step)
    if catalog_entry:
        return {
            "type": "ACTIONABLE",
            "state": current_state,
            "step_code": current_step,
            "title": catalog_entry["title"],
            "description": catalog_entry["description"].replace("{partner_name}", partner_name),
            "cta": catalog_entry["cta"],
            "time_estimate": catalog_entry["time_estimate"],
            "action_type": catalog_entry["action_type"],
            "action_key": catalog_entry["action_key"],
            "assigned_agent": agent_profile,
            "waiting_for": None,
            "blocked_reason": None,
        }

    # Fallback if step_code not in catalog
    return {
        "type": "ACTIONABLE",
        "state": current_state,
        "step_code": current_step,
        "title": f"Step: {current_step}",
        "description": "Completa questo step per avanzare nel percorso.",
        "cta": "Procedi",
        "time_estimate": None,
        "action_type": "GENERIC",
        "action_key": current_step.lower(),
        "assigned_agent": agent_profile,
        "waiting_for": None,
        "blocked_reason": None,
    }


def build_progress_summary(guided: dict) -> dict:
    """
    Build a lightweight progress summary for the partner home.
    Returns: state_label, step_label, percentage, phases_done, phases_total.
    """
    from .stefania_engine import STATE_ORDER

    STATE_LABELS = {
        "ONBOARDING":   "Attivazione",
        "POSITIONING":  "Posizionamento",
        "MASTERCLASS":  "Masterclass",
        "VIDEOCORSO":   "Videocorso",
        "FUNNEL":       "Funnel",
        "LANCIO":       "Lancio",
        "POST_LAUNCH":  "Post-Lancio",
        "SCALING":      "Crescita",
    }

    current_state = guided.get("current_state", "ONBOARDING")
    current_step = guided.get("current_step", "")
    pct = guided.get("completion_percentage", 0)
    state_idx = STATE_ORDER.index(current_state) if current_state in STATE_ORDER else 0

    return {
        "state": current_state,
        "state_label": STATE_LABELS.get(current_state, current_state),
        "step_code": current_step,
        "completion_percentage": pct,
        "phases_done": state_idx,
        "phases_total": len(STATE_ORDER),
        "states_ordered": [
            {"state": s, "label": STATE_LABELS.get(s, s), "done": i < state_idx}
            for i, s in enumerate(STATE_ORDER)
        ],
    }
