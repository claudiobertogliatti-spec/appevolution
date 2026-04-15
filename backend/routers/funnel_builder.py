# /app/backend/routers/funnel_builder.py
# Modulo Fase 4: Landing Page Builder + Documenti Legali

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date
import logging
import os
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey/funnel", tags=["funnel-builder"])

db = None

def set_db(database):
    global db
    db = database


# ════════════════════════════════════════
# PYDANTIC MODELS
# ════════════════════════════════════════

class LandingPageParams(BaseModel):
    PARTNER_NOME: str = ""
    PARTNER_NICCHIA: str = ""
    PARTNER_BIO: str = ""
    PARTNER_FOTO_URL: str = ""
    COLORE_PRIMARIO: str = "#1a1a2e"
    COLORE_SECONDARIO: str = "#e94560"
    COLORE_ACCENT: str = "#f5a623"
    URGENCY_TEXT: str = ""
    HEADLINE_PRINCIPALE: str = ""
    HEADLINE_SPAN: str = ""
    SOTTOTITOLO: str = ""
    CTA_TESTO_PRINCIPALE: str = ""
    CTA_LINK: str = ""
    SOTTO_CTA_TESTO: str = ""
    VIDEO_ID: str = ""
    PROBLEMA_HEADLINE: str = ""
    PROBLEMA_TESTO_1: str = ""
    PROBLEMA_TESTO_2: str = ""
    DOLORE_1: str = ""
    DOLORE_2: str = ""
    DOLORE_3: str = ""
    DOLORE_4: str = ""
    SOLUZIONE_HEADLINE: str = ""
    SOLUZIONE_SPAN: str = ""
    SOLUZIONE_TESTO: str = ""
    STAT_1_NUMERO: str = ""
    STAT_1_TESTO: str = ""
    STAT_2_NUMERO: str = ""
    STAT_2_TESTO: str = ""
    STAT_3_NUMERO: str = ""
    STAT_3_TESTO: str = ""
    CORSO_NOME: str = ""
    MODULO_1_TITOLO: str = ""
    MODULO_1_DESC: str = ""
    MODULO_2_TITOLO: str = ""
    MODULO_2_DESC: str = ""
    MODULO_3_TITOLO: str = ""
    MODULO_3_DESC: str = ""
    MODULO_4_TITOLO: str = ""
    MODULO_4_DESC: str = ""
    MODULO_5_TITOLO: str = ""
    MODULO_5_DESC: str = ""
    TESTIMONIANZA_1_TESTO: str = ""
    TESTIMONIANZA_1_NOME: str = ""
    TESTIMONIANZA_1_RUOLO: str = ""
    TESTIMONIANZA_2_TESTO: str = ""
    TESTIMONIANZA_2_NOME: str = ""
    TESTIMONIANZA_2_RUOLO: str = ""
    TESTIMONIANZA_3_TESTO: str = ""
    TESTIMONIANZA_3_NOME: str = ""
    TESTIMONIANZA_3_RUOLO: str = ""
    CORSO_PREZZO_ORIGINALE: str = ""
    CORSO_PREZZO: str = ""
    PREZZO_NOTE: str = "pagamento unico · accesso a vita"
    INCLUSO_1: str = ""
    INCLUSO_2: str = ""
    INCLUSO_3: str = ""
    INCLUSO_4: str = ""
    INCLUSO_5: str = ""
    CTA_TESTO_OFFERTA: str = "Accedi al Corso Ora →"
    GARANZIA_TESTO: str = "Garanzia soddisfatti o rimborsati 30 giorni"
    FAQ_1_DOMANDA: str = ""
    FAQ_1_RISPOSTA: str = ""
    FAQ_2_DOMANDA: str = ""
    FAQ_2_RISPOSTA: str = ""
    FAQ_3_DOMANDA: str = ""
    FAQ_3_RISPOSTA: str = ""
    FAQ_4_DOMANDA: str = ""
    FAQ_4_RISPOSTA: str = ""
    CTA_FINALE_HEADLINE: str = ""
    CTA_FINALE_TESTO: str = ""
    ANNO: str = "2026"
    LINK_PRIVACY: str = "#"
    LINK_TERMINI: str = "#"


class DocumentiLegaliParams(BaseModel):
    titolare_nome: str = ""
    titolare_cognome: str = ""
    piva: str = ""
    codice_fiscale: str = ""
    indirizzo: str = ""
    citta: str = ""
    cap: str = ""
    email_legale: str = ""
    sito_url: str = ""
    nome_sito: str = ""


class LandingPageRequest(BaseModel):
    dati: dict
    genera_html: bool = False
    stato: Optional[str] = None


class DocumentiLegaliRequest(BaseModel):
    dati: dict
    genera: bool = False


# ════════════════════════════════════════
# RENDERING FUNCTIONS
# ════════════════════════════════════════

def _render(template: str, params: dict) -> str:
    for key, value in params.items():
        template = template.replace("{" + key + "}", str(value) if value else "")
    # Unescape double braces (used in legal templates for literal CSS braces)
    template = template.replace("{{", "{").replace("}}", "}")
    return template


def genera_landing_page(params: dict) -> str:
    return _render(LANDING_PAGE_TEMPLATE, params)


def genera_documenti_legali(params: dict) -> dict:
    p = dict(params)
    p["data_oggi"] = date.today().strftime("%d/%m/%Y")
    p["anno"] = str(date.today().year)
    return {
        "cookie_policy": _render(COOKIE_POLICY_TEMPLATE, p),
        "privacy_policy": _render(PRIVACY_POLICY_TEMPLATE, p),
        "condizioni_vendita": _render(CONDIZIONI_VENDITA_TEMPLATE, p)
    }


# ════════════════════════════════════════
# ENDPOINTS — LANDING PAGE
# ════════════════════════════════════════

@router.get("/{partner_id}/landing-page")
async def get_landing_page(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    landing = partner.get("landing_page", {})

    # Pre-fill from partner profile
    prefill = {
        "PARTNER_NOME": partner.get("name", ""),
        "PARTNER_NICCHIA": partner.get("niche", "") or partner.get("nicchia", ""),
        "PARTNER_BIO": partner.get("bio", ""),
        "PARTNER_FOTO_URL": partner.get("photo_url", "") or partner.get("avatar", ""),
    }

    return {
        "dati": landing.get("dati", {}),
        "html_generato": landing.get("html_generato", ""),
        "ultimo_aggiornamento": landing.get("ultimo_aggiornamento", ""),
        "stato": landing.get("stato", "bozza"),
        "prefill": prefill
    }


@router.post("/{partner_id}/landing-page")
async def save_landing_page(partner_id: str, body: LandingPageRequest):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "id": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "landing_page.dati": body.dati,
        "landing_page.ultimo_aggiornamento": now
    }

    html = ""
    if body.genera_html:
        html = genera_landing_page(body.dati)
        update["landing_page.html_generato"] = html
        update["landing_page.stato"] = "pronta"
        # Audit log
        await db.audit_log.insert_one({
            "partner_id": partner_id,
            "azione": "landing_generata",
            "timestamp": now,
            "campi_compilati": len([v for v in body.dati.values() if v])
        })
    else:
        update["landing_page.stato"] = body.stato or "bozza"

    if body.stato:
        update["landing_page.stato"] = body.stato

    await db.partners.update_one({"id": partner_id}, {"$set": update})

    return {
        "success": True,
        "html_generato": html,
        "stato": update.get("landing_page.stato", "bozza"),
        "ultimo_aggiornamento": now
    }


# ════════════════════════════════════════
# ENDPOINT — GENERA COPY CON AI
# ════════════════════════════════════════

@router.post("/{partner_id}/genera-ai")
async def genera_ai(partner_id: str):
    """
    Genera automaticamente i campi copy della landing page usando Claude AI,
    basandosi sui dati del profilo partner (nome, nicchia, bio, fase).
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    api_key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key AI non configurata")

    nome = partner.get("name", "")
    nicchia = partner.get("niche", "") or partner.get("nicchia", "")
    bio = partner.get("bio", "")
    fase_num = partner.get("phase", partner.get("fase", 1))

    FASE_LABELS = {
        1: "Posizionamento", 2: "Masterclass", 3: "Videocorso",
        4: "Funnel", 5: "Lancio", 6: "Ottimizzazione", 7: "Continuità"
    }
    fase_label = FASE_LABELS.get(int(fase_num) if fase_num else 1, "Posizionamento")

    prompt = f"""Sei un copywriter esperto di digital marketing italiano per Evolution PRO, una piattaforma B2B per professionisti che lanciano accademie online.

Devi generare il copy completo per la landing page di vendita di un videocorso del seguente partner:

NOME: {nome}
NICCHIA: {nicchia}
BIO: {bio or "Professionista esperto nel suo settore"}
FASE: {fase_label}

Genera un JSON con ESATTAMENTE questi campi (tutti in italiano, tono professionale e persuasivo):

{{
  "HEADLINE_PRINCIPALE": "headline potente e specifica per la nicchia, max 10 parole",
  "HEADLINE_SPAN": "parola o frase breve da evidenziare in colore nella headline, max 3 parole",
  "SOTTOTITOLO": "sottotitolo che espande la headline, max 20 parole, beneficio principale",
  "URGENCY_TEXT": "testo breve per barra urgenza tipo 'Posti limitati – chiude venerdì'",
  "CTA_TESTO_PRINCIPALE": "testo bottone CTA principale, 3-5 parole tipo 'Accedi Subito al Corso'",
  "SOTTO_CTA_TESTO": "testo sotto il CTA, rassicurante, tipo 'Garanzia 30 giorni · Accesso immediato'",
  "PROBLEMA_HEADLINE": "headline sezione problema, max 8 parole",
  "PROBLEMA_TESTO_1": "primo paragrafo problema che il target affronta, 2-3 frasi empatiche",
  "PROBLEMA_TESTO_2": "secondo paragrafo che agita il problema, 2-3 frasi",
  "DOLORE_1": "punto dolore specifico, max 8 parole",
  "DOLORE_2": "punto dolore specifico, max 8 parole",
  "DOLORE_3": "punto dolore specifico, max 8 parole",
  "DOLORE_4": "punto dolore specifico, max 8 parole",
  "SOLUZIONE_HEADLINE": "headline sezione soluzione, max 8 parole",
  "SOLUZIONE_SPAN": "parola chiave da evidenziare nella headline soluzione",
  "SOLUZIONE_TESTO": "descrizione della soluzione, 2-3 frasi che presentano il corso come la risposta",
  "STAT_1_NUMERO": "statistica rilevante per la nicchia (es. '87%')",
  "STAT_1_TESTO": "cosa rappresenta la statistica, max 8 parole",
  "STAT_2_NUMERO": "seconda statistica (es. '3x')",
  "STAT_2_TESTO": "cosa rappresenta, max 8 parole",
  "STAT_3_NUMERO": "terza statistica (es. '12.000+')",
  "STAT_3_TESTO": "cosa rappresenta, max 8 parole",
  "CORSO_NOME": "nome del videocorso specifico per la nicchia, 3-6 parole",
  "MODULO_1_TITOLO": "titolo modulo 1, 3-5 parole",
  "MODULO_1_DESC": "descrizione modulo 1, 1 frase",
  "MODULO_2_TITOLO": "titolo modulo 2, 3-5 parole",
  "MODULO_2_DESC": "descrizione modulo 2, 1 frase",
  "MODULO_3_TITOLO": "titolo modulo 3, 3-5 parole",
  "MODULO_3_DESC": "descrizione modulo 3, 1 frase",
  "MODULO_4_TITOLO": "titolo modulo 4, 3-5 parole",
  "MODULO_4_DESC": "descrizione modulo 4, 1 frase",
  "MODULO_5_TITOLO": "titolo modulo 5, 3-5 parole",
  "MODULO_5_DESC": "descrizione modulo 5, 1 frase",
  "INCLUSO_1": "cosa è incluso nel corso, 1 riga",
  "INCLUSO_2": "cosa è incluso, 1 riga",
  "INCLUSO_3": "cosa è incluso, 1 riga",
  "INCLUSO_4": "cosa è incluso, 1 riga",
  "INCLUSO_5": "cosa è incluso, 1 riga",
  "FAQ_1_DOMANDA": "domanda frequente tipica del target",
  "FAQ_1_RISPOSTA": "risposta convincente, 2-3 frasi",
  "FAQ_2_DOMANDA": "domanda frequente 2",
  "FAQ_2_RISPOSTA": "risposta, 2-3 frasi",
  "FAQ_3_DOMANDA": "domanda frequente 3",
  "FAQ_3_RISPOSTA": "risposta, 2-3 frasi",
  "FAQ_4_DOMANDA": "domanda frequente 4",
  "FAQ_4_RISPOSTA": "risposta, 2-3 frasi",
  "CTA_FINALE_HEADLINE": "headline CTA finale, 5-8 parole, urgenza e beneficio",
  "CTA_FINALE_TESTO": "testo sotto il CTA finale, 1-2 frasi motivanti"
}}

Rispondi SOLO con il JSON, nessun altro testo."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        llm = LlmChat(
            api_key=api_key,
            session_id=f"funnel_ai_{partner_id}_{datetime.now().timestamp()}",
            system_message="Sei un copywriter esperto di digital marketing italiano. Rispondi sempre e solo con JSON valido."
        ).with_model("anthropic", "claude-sonnet-4-6")

        risposta = await llm.send_message(UserMessage(text=prompt))

        # Estrai JSON dalla risposta
        testo = risposta.strip()
        if testo.startswith("```"):
            testo = testo.split("```")[1]
            if testo.startswith("json"):
                testo = testo[4:]
        testo = testo.strip()

        campi = json.loads(testo)

        # Aggiungi campi fissi dal profilo
        campi["PARTNER_NOME"] = nome
        campi["PARTNER_NICCHIA"] = nicchia
        if bio:
            campi["PARTNER_BIO"] = bio

        logger.info(f"[FUNNEL_AI] Generati {len(campi)} campi per partner {partner_id}")
        return {"success": True, "campi": campi}

    except json.JSONDecodeError as e:
        logger.error(f"[FUNNEL_AI] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Errore nel parsing della risposta AI")
    except Exception as e:
        logger.error(f"[FUNNEL_AI] Errore generazione AI: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione AI: {str(e)}")


# ════════════════════════════════════════
# ENDPOINTS — DOCUMENTI LEGALI
# ════════════════════════════════════════

@router.get("/{partner_id}/documenti-legali")
async def get_documenti_legali(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    docs_legali = partner.get("documenti_legali", {})

    # Pre-fill from partner profile + onboarding documents
    name_parts = (partner.get("name", "") or "").split(" ", 1)
    onboarding = partner.get("documents", {})

    prefill = {
        "titolare_nome": name_parts[0] if name_parts else "",
        "titolare_cognome": name_parts[1] if len(name_parts) > 1 else "",
        "email_legale": partner.get("email", ""),
        "nome_sito": partner.get("niche", "") or partner.get("nicchia", ""),
        "piva": partner.get("piva", ""),
        "codice_fiscale": partner.get("codice_fiscale", ""),
    }

    # Try to get landing page URL if generated
    lp = partner.get("landing_page", {})
    if lp.get("dati", {}).get("CTA_LINK"):
        prefill["sito_url"] = lp["dati"]["CTA_LINK"]

    return {
        "dati": docs_legali.get("dati", {}),
        "cookie_policy_html": docs_legali.get("cookie_policy_html", ""),
        "privacy_policy_html": docs_legali.get("privacy_policy_html", ""),
        "condizioni_vendita_html": docs_legali.get("condizioni_vendita_html", ""),
        "stato": docs_legali.get("stato", "non_generato"),
        "prefill": prefill
    }


@router.post("/{partner_id}/documenti-legali")
async def save_documenti_legali(partner_id: str, body: DocumentiLegaliRequest):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "id": 1})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "documenti_legali.dati": body.dati,
    }

    result = {}
    if body.genera:
        docs = genera_documenti_legali(body.dati)
        update["documenti_legali.cookie_policy_html"] = docs["cookie_policy"]
        update["documenti_legali.privacy_policy_html"] = docs["privacy_policy"]
        update["documenti_legali.condizioni_vendita_html"] = docs["condizioni_vendita"]
        update["documenti_legali.stato"] = "generato"
        result = docs
        # Audit log
        await db.audit_log.insert_one({
            "partner_id": partner_id,
            "azione": "documenti_legali_generati",
            "timestamp": now,
        })
    else:
        update["documenti_legali.stato"] = "non_generato"

    await db.partners.update_one({"id": partner_id}, {"$set": update})

    return {
        "success": True,
        "cookie_policy_html": result.get("cookie_policy", ""),
        "privacy_policy_html": result.get("privacy_policy", ""),
        "condizioni_vendita_html": result.get("condizioni_vendita", ""),
        "stato": update.get("documenti_legali.stato", "non_generato")
    }


# ════════════════════════════════════════
# ENDPOINT — GENERA DOCUMENTI LEGALI AUTO
# ════════════════════════════════════════

@router.post("/{partner_id}/documenti-legali/genera-auto")
async def genera_documenti_legali_auto(partner_id: str):
    """
    Genera automaticamente i 3 documenti legali (cookie, privacy, condizioni di vendita)
    raccogliendo tutti i dati disponibili dal profilo partner senza input manuale.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner non trovato")

    # Costruisci dati dal profilo
    name_parts = (partner.get("name", "") or "").split(" ", 1)
    titolare_nome = name_parts[0] if name_parts else ""
    titolare_cognome = name_parts[1] if len(name_parts) > 1 else ""

    # Indirizzo: prova onboarding documents o campo diretto
    onboarding = partner.get("documents", {}) or {}
    indirizzo = (
        partner.get("indirizzo", "")
        or onboarding.get("indirizzo", "")
        or ""
    )
    citta = (
        partner.get("citta", "")
        or partner.get("città", "")
        or onboarding.get("citta", "")
        or ""
    )
    cap = (
        partner.get("cap", "")
        or onboarding.get("cap", "")
        or ""
    )

    # sito_url: preferisci systeme_subdomain, poi CTA_LINK della landing, poi placeholder
    subdomain = partner.get("systeme_subdomain", "")
    lp_cta = (partner.get("landing_page", {}) or {}).get("dati", {}).get("CTA_LINK", "")
    if subdomain:
        sito_url = f"https://{subdomain}.systeme.io"
    elif lp_cta:
        sito_url = lp_cta
    else:
        sito_url = ""

    nicchia = partner.get("niche", "") or partner.get("nicchia", "")

    dati = {
        "titolare_nome": titolare_nome,
        "titolare_cognome": titolare_cognome,
        "piva": partner.get("piva", ""),
        "codice_fiscale": partner.get("codice_fiscale", ""),
        "indirizzo": indirizzo,
        "citta": citta,
        "cap": cap,
        "email_legale": partner.get("email", ""),
        "sito_url": sito_url,
        "nome_sito": nicchia or titolare_nome,
    }

    now = datetime.now(timezone.utc).isoformat()
    docs = genera_documenti_legali(dati)

    # Campi mancanti da segnalare (non bloccanti)
    campi_mancanti = [k for k, v in dati.items() if not v]

    await db.partners.update_one({"id": partner_id}, {"$set": {
        "documenti_legali.dati": dati,
        "documenti_legali.cookie_policy_html": docs["cookie_policy"],
        "documenti_legali.privacy_policy_html": docs["privacy_policy"],
        "documenti_legali.condizioni_vendita_html": docs["condizioni_vendita"],
        "documenti_legali.stato": "generato",
        "documenti_legali.ultimo_aggiornamento": now,
    }})

    await db.audit_log.insert_one({
        "partner_id": partner_id,
        "azione": "documenti_legali_auto_generati",
        "timestamp": now,
        "campi_mancanti": campi_mancanti,
    })

    logger.info(f"[DOCS_AUTO] Documenti generati per {partner_id}. Mancanti: {campi_mancanti}")

    return {
        "success": True,
        "cookie_policy_html": docs["cookie_policy"],
        "privacy_policy_html": docs["privacy_policy"],
        "condizioni_vendita_html": docs["condizioni_vendita"],
        "dati_usati": dati,
        "campi_mancanti": campi_mancanti,
        "stato": "generato",
    }


# ════════════════════════════════════════
# TEMPLATES
# ════════════════════════════════════════

LANDING_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{CORSO_NOME} — {PARTNER_NOME}</title>
<style>
:root{--colore-primario:{COLORE_PRIMARIO};--colore-secondario:{COLORE_SECONDARIO};--colore-accent:{COLORE_ACCENT};--colore-testo:#1a1a1a;--colore-testo-chiaro:#555;--colore-sfondo:#f9f9f9}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:var(--colore-testo);background:#fff;line-height:1.6}
.urgency-bar{background:var(--colore-secondario);color:#fff;text-align:center;padding:10px 20px;font-size:14px;font-weight:600}
.hero{background:linear-gradient(135deg,var(--colore-primario) 0%,#2d2d44 100%);color:#fff;padding:70px 20px 60px;text-align:center}
.hero .nicchia-badge{display:inline-block;background:var(--colore-secondario);color:#fff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 16px;border-radius:20px;margin-bottom:24px}
.hero h1{font-size:clamp(28px,5vw,52px);font-weight:800;line-height:1.15;max-width:820px;margin:0 auto 20px}
.hero h1 span{color:var(--colore-accent)}
.hero .sottotitolo{font-size:clamp(16px,2.5vw,20px);opacity:.88;max-width:640px;margin:0 auto 36px;line-height:1.5}
.cta-principale{display:inline-block;background:var(--colore-accent);color:#fff;font-size:18px;font-weight:700;padding:18px 44px;border-radius:6px;text-decoration:none;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .2s}
.cta-principale:hover{transform:translateY(-2px)}
.sotto-cta{font-size:13px;opacity:.7;margin-top:12px}
.video-section{background:var(--colore-sfondo);padding:60px 20px;text-align:center}
.video-wrapper{max-width:760px;margin:0 auto;position:relative;padding-bottom:56.25%;height:0;border-radius:10px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.15)}
.video-wrapper iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
.problema{padding:70px 20px;max-width:760px;margin:0 auto}
.sezione-label{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--colore-secondario);margin-bottom:12px}
.problema h2{font-size:clamp(24px,4vw,36px);font-weight:800;margin-bottom:24px;line-height:1.2}
.problema p{font-size:17px;color:var(--colore-testo-chiaro);margin-bottom:16px}
.lista-dolori{list-style:none;margin-top:28px}
.lista-dolori li{display:flex;align-items:flex-start;gap:12px;font-size:16px;padding:10px 0;border-bottom:1px solid #eee}
.lista-dolori li::before{content:"\\2717";color:var(--colore-secondario);font-weight:700;font-size:18px;flex-shrink:0}
.soluzione{background:linear-gradient(135deg,var(--colore-primario) 0%,#2d2d44 100%);color:#fff;padding:70px 20px;text-align:center}
.soluzione h2{font-size:clamp(24px,4vw,38px);font-weight:800;max-width:700px;margin:0 auto 20px;line-height:1.2}
.soluzione h2 span{color:var(--colore-accent)}
.soluzione p{font-size:17px;opacity:.88;max-width:620px;margin:0 auto 40px}
.trasformazioni{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;max-width:860px;margin:0 auto;text-align:left}
.trasformazione-card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:24px}
.trasformazione-card .numero{font-size:36px;font-weight:900;color:var(--colore-accent);line-height:1;margin-bottom:8px}
.moduli{padding:70px 20px;max-width:860px;margin:0 auto}
.moduli-header{text-align:center;margin-bottom:48px}
.moduli-header h2{font-size:clamp(24px,4vw,36px);font-weight:800}
.modulo-item{display:flex;align-items:flex-start;gap:20px;background:#fff;border:1px solid #e8e8e8;border-radius:10px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.04);margin-bottom:16px}
.modulo-numero{background:var(--colore-primario);color:#fff;font-size:14px;font-weight:700;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.modulo-content h3{font-size:17px;font-weight:700;margin-bottom:6px}
.modulo-content p{font-size:14px;color:var(--colore-testo-chiaro)}
.testimonianze{background:var(--colore-sfondo);padding:70px 20px}
.testimonianze-header{text-align:center;margin-bottom:48px}
.testimonianze-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;max-width:960px;margin:0 auto}
.testimonianza-card{background:#fff;border-radius:10px;padding:28px;box-shadow:0 2px 16px rgba(0,0,0,.06);position:relative}
.testimonianza-card .virgolette{font-size:48px;color:var(--colore-secondario);opacity:.2;position:absolute;top:12px;left:20px;line-height:1}
.testimonianza-card p{font-size:15px;line-height:1.7;margin-bottom:20px;position:relative;z-index:1}
.autore{font-weight:700;font-size:14px}
.ruolo{font-size:13px;color:var(--colore-testo-chiaro)}
.bio{padding:70px 20px;max-width:860px;margin:0 auto;display:grid;grid-template-columns:200px 1fr;gap:48px;align-items:start}
.bio img{width:200px;height:200px;border-radius:50%;object-fit:cover;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.bio h2{font-size:clamp(22px,3vw,30px);font-weight:800;margin-bottom:16px}
.bio p{font-size:16px;color:var(--colore-testo-chiaro);line-height:1.7}
.offerta{background:linear-gradient(135deg,var(--colore-primario) 0%,#2d2d44 100%);color:#fff;padding:70px 20px;text-align:center}
.offerta h2{font-size:clamp(24px,4vw,36px);font-weight:800;margin-bottom:40px}
.pricing-box{background:#fff;color:var(--colore-testo);border-radius:16px;padding:48px 40px;max-width:480px;margin:0 auto 40px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.corso-nome{font-size:20px;font-weight:700;margin-bottom:24px;color:var(--colore-primario)}
.prezzo-originale{font-size:18px;color:#aaa;text-decoration:line-through;margin-bottom:4px}
.prezzo{font-size:56px;font-weight:900;color:var(--colore-primario);line-height:1;margin-bottom:8px}
.prezzo-note{font-size:14px;color:var(--colore-testo-chiaro);margin-bottom:32px}
.incluso-lista{list-style:none;text-align:left;margin-bottom:32px}
.incluso-lista li{display:flex;align-items:center;gap:10px;font-size:15px;padding:8px 0;border-bottom:1px solid #f0f0f0}
.incluso-lista li::before{content:"\\2713";color:#22c55e;font-weight:700;font-size:16px;flex-shrink:0}
.cta-offerta{display:block;background:var(--colore-secondario);color:#fff;font-size:18px;font-weight:700;padding:18px 32px;border-radius:8px;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:transform .2s}
.offerta .garanzia{font-size:14px;opacity:.75;margin-top:20px}
.faq{padding:70px 20px;max-width:720px;margin:0 auto}
.faq h2{font-size:clamp(22px,3.5vw,32px);font-weight:800;text-align:center;margin-bottom:40px}
.faq-item{border-bottom:1px solid #e8e8e8;padding:20px 0;cursor:pointer}
.faq-domanda{font-size:16px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:12px}
.faq-domanda::after{content:"+";font-size:22px;color:var(--colore-secondario);flex-shrink:0;transition:transform .2s}
.faq-item.aperta .faq-domanda::after{transform:rotate(45deg)}
.faq-risposta{font-size:15px;color:var(--colore-testo-chiaro);line-height:1.7;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease}
.faq-item.aperta .faq-risposta{max-height:300px;padding-top:12px}
.cta-finale{background:var(--colore-sfondo);padding:70px 20px;text-align:center}
.cta-finale h2{font-size:clamp(24px,4vw,38px);font-weight:800;max-width:640px;margin:0 auto 16px}
.cta-finale p{font-size:17px;color:var(--colore-testo-chiaro);max-width:520px;margin:0 auto 32px}
.cta-finale a{display:inline-block;background:var(--colore-secondario);color:#fff;font-size:18px;font-weight:700;padding:18px 44px;border-radius:6px;text-decoration:none;box-shadow:0 4px 20px rgba(0,0,0,.15)}
footer{background:var(--colore-primario);color:rgba(255,255,255,.6);text-align:center;padding:24px 20px;font-size:13px}
footer a{color:rgba(255,255,255,.5);text-decoration:none}
@media(max-width:640px){.bio{grid-template-columns:1fr;text-align:center}.bio img{margin:0 auto}.pricing-box{padding:32px 24px}}
</style>
</head>
<body>
<div class="urgency-bar">{URGENCY_TEXT}</div>
<section class="hero">
<div class="nicchia-badge">{PARTNER_NICCHIA}</div>
<h1>{HEADLINE_PRINCIPALE}<br><span>{HEADLINE_SPAN}</span></h1>
<p class="sottotitolo">{SOTTOTITOLO}</p>
<a href="{CTA_LINK}" class="cta-principale">{CTA_TESTO_PRINCIPALE}</a>
<p class="sotto-cta">{SOTTO_CTA_TESTO}</p>
</section>
<section class="video-section">
<div class="video-wrapper">
<iframe src="https://www.youtube.com/embed/{VIDEO_ID}?rel=0&modestbranding=1" allowfullscreen loading="lazy"></iframe>
</div>
</section>
<section class="problema">
<p class="sezione-label">Il problema</p>
<h2>{PROBLEMA_HEADLINE}</h2>
<p>{PROBLEMA_TESTO_1}</p>
<p>{PROBLEMA_TESTO_2}</p>
<ul class="lista-dolori">
<li>{DOLORE_1}</li><li>{DOLORE_2}</li><li>{DOLORE_3}</li><li>{DOLORE_4}</li>
</ul>
</section>
<section class="soluzione">
<h2>{SOLUZIONE_HEADLINE} <span>{SOLUZIONE_SPAN}</span></h2>
<p>{SOLUZIONE_TESTO}</p>
<div class="trasformazioni">
<div class="trasformazione-card"><div class="numero">{STAT_1_NUMERO}</div><p>{STAT_1_TESTO}</p></div>
<div class="trasformazione-card"><div class="numero">{STAT_2_NUMERO}</div><p>{STAT_2_TESTO}</p></div>
<div class="trasformazione-card"><div class="numero">{STAT_3_NUMERO}</div><p>{STAT_3_TESTO}</p></div>
</div>
</section>
<section class="moduli">
<div class="moduli-header"><p class="sezione-label">Il programma</p><h2>Cosa impari in {CORSO_NOME}</h2></div>
<div class="modulo-item"><div class="modulo-numero">01</div><div class="modulo-content"><h3>{MODULO_1_TITOLO}</h3><p>{MODULO_1_DESC}</p></div></div>
<div class="modulo-item"><div class="modulo-numero">02</div><div class="modulo-content"><h3>{MODULO_2_TITOLO}</h3><p>{MODULO_2_DESC}</p></div></div>
<div class="modulo-item"><div class="modulo-numero">03</div><div class="modulo-content"><h3>{MODULO_3_TITOLO}</h3><p>{MODULO_3_DESC}</p></div></div>
<div class="modulo-item"><div class="modulo-numero">04</div><div class="modulo-content"><h3>{MODULO_4_TITOLO}</h3><p>{MODULO_4_DESC}</p></div></div>
<div class="modulo-item"><div class="modulo-numero">05</div><div class="modulo-content"><h3>{MODULO_5_TITOLO}</h3><p>{MODULO_5_DESC}</p></div></div>
</section>
<section class="testimonianze">
<div class="testimonianze-header"><p class="sezione-label">Cosa dicono</p><h2>Risultati reali da persone reali</h2></div>
<div class="testimonianze-grid">
<div class="testimonianza-card"><div class="virgolette">"</div><p>{TESTIMONIANZA_1_TESTO}</p><div class="autore">{TESTIMONIANZA_1_NOME}</div><div class="ruolo">{TESTIMONIANZA_1_RUOLO}</div></div>
<div class="testimonianza-card"><div class="virgolette">"</div><p>{TESTIMONIANZA_2_TESTO}</p><div class="autore">{TESTIMONIANZA_2_NOME}</div><div class="ruolo">{TESTIMONIANZA_2_RUOLO}</div></div>
<div class="testimonianza-card"><div class="virgolette">"</div><p>{TESTIMONIANZA_3_TESTO}</p><div class="autore">{TESTIMONIANZA_3_NOME}</div><div class="ruolo">{TESTIMONIANZA_3_RUOLO}</div></div>
</div>
</section>
<section class="bio">
<img src="{PARTNER_FOTO_URL}" alt="{PARTNER_NOME}">
<div><p class="sezione-label">Chi sono</p><h2>{PARTNER_NOME}</h2><p>{PARTNER_BIO}</p></div>
</section>
<section class="offerta">
<h2>Inizia oggi. <span style="color:var(--colore-accent)">Risultati reali.</span></h2>
<div class="pricing-box">
<div class="corso-nome">{CORSO_NOME}</div>
<div class="prezzo-originale">&euro;{CORSO_PREZZO_ORIGINALE}</div>
<div class="prezzo">&euro;{CORSO_PREZZO}</div>
<div class="prezzo-note">{PREZZO_NOTE}</div>
<ul class="incluso-lista">
<li>{INCLUSO_1}</li><li>{INCLUSO_2}</li><li>{INCLUSO_3}</li><li>{INCLUSO_4}</li><li>{INCLUSO_5}</li>
</ul>
<a href="{CTA_LINK}" class="cta-offerta">{CTA_TESTO_OFFERTA}</a>
</div>
<p class="garanzia">{GARANZIA_TESTO}</p>
</section>
<section class="faq">
<h2>Domande frequenti</h2>
<div class="faq-item"><div class="faq-domanda">{FAQ_1_DOMANDA}</div><div class="faq-risposta">{FAQ_1_RISPOSTA}</div></div>
<div class="faq-item"><div class="faq-domanda">{FAQ_2_DOMANDA}</div><div class="faq-risposta">{FAQ_2_RISPOSTA}</div></div>
<div class="faq-item"><div class="faq-domanda">{FAQ_3_DOMANDA}</div><div class="faq-risposta">{FAQ_3_RISPOSTA}</div></div>
<div class="faq-item"><div class="faq-domanda">{FAQ_4_DOMANDA}</div><div class="faq-risposta">{FAQ_4_RISPOSTA}</div></div>
</section>
<section class="cta-finale">
<h2>{CTA_FINALE_HEADLINE}</h2>
<p>{CTA_FINALE_TESTO}</p>
<a href="{CTA_LINK}">{CTA_TESTO_PRINCIPALE}</a>
</section>
<footer>
<p>&copy; {ANNO} {PARTNER_NOME} &middot; <a href="{LINK_PRIVACY}">Privacy Policy</a> &middot; <a href="{LINK_TERMINI}">Termini di Vendita</a></p>
</footer>
<script>
document.querySelectorAll('.faq-item').forEach(item=>{
item.querySelector('.faq-domanda').addEventListener('click',()=>{
const aperta=item.classList.contains('aperta');
document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('aperta'));
if(!aperta)item.classList.add('aperta');
});
});
</script>
</body>
</html>"""


COOKIE_POLICY_TEMPLATE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cookie Policy — {nome_sito}</title>
<style>
body{{font-family:'Segoe UI',system-ui,sans-serif;max-width:860px;margin:0 auto;padding:40px 24px;color:#1a1a1a;line-height:1.7}}
h1{{font-size:28px;font-weight:800;margin-bottom:8px}}
h2{{font-size:18px;font-weight:700;margin:32px 0 12px;padding-top:16px;border-top:1px solid #eee}}
p{{margin-bottom:14px;font-size:15px;color:#374151}}
table{{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}}
th{{background:#1a1a2e;color:#fff;padding:10px 14px;text-align:left}}
td{{padding:10px 14px;border-bottom:1px solid #e5e7eb}}
tr:nth-child(even){{background:#f9fafb}}
.data{{font-size:13px;color:#6b7280;margin-bottom:32px}}
a{{color:#e94560}}
</style>
</head>
<body>
<h1>Cookie Policy</h1>
<p class="data">Ultimo aggiornamento: {data_oggi}</p>
<p>Il sito <strong>{sito_url}</strong>, gestito da <strong>{titolare_nome} {titolare_cognome}</strong>, utilizza cookie e tecnologie simili. Questa policy spiega cosa sono, come vengono usati e come puoi gestirli.</p>
<h2>1. Cosa sono i cookie</h2>
<p>I cookie sono piccoli file di testo che i siti web salvano sul tuo dispositivo quando li visiti. Servono a far funzionare il sito correttamente, a ricordare le tue preferenze e a raccogliere informazioni statistiche sull'utilizzo.</p>
<h2>2. Tipologie di cookie utilizzati</h2>
<table>
<tr><th>Categoria</th><th>Nome</th><th>Scopo</th><th>Durata</th></tr>
<tr><td><strong>Tecnici</strong></td><td>session_id</td><td>Gestione sessione utente</td><td>Sessione</td></tr>
<tr><td><strong>Tecnici</strong></td><td>cookie_consent</td><td>Memorizzazione preferenze cookie</td><td>12 mesi</td></tr>
<tr><td><strong>Analitici</strong></td><td>_ga, _gid</td><td>Google Analytics — statistiche anonime</td><td>2 anni / 24h</td></tr>
<tr><td><strong>Marketing</strong></td><td>fbp, _fbq</td><td>Facebook Pixel — misurazione campagne</td><td>3 mesi</td></tr>
</table>
<h2>3. Cookie di terze parti</h2>
<p>Il sito utilizza servizi di terze parti che possono installare propri cookie:</p>
<p><strong>Google Analytics</strong> (Google LLC) — statistiche di utilizzo anonime. Privacy policy: <a href="https://policies.google.com/privacy" target="_blank">policies.google.com/privacy</a></p>
<p><strong>YouTube</strong> (Google LLC) — riproduzione video incorporati. Attivi solo se presenti video nella pagina.</p>
<p><strong>Systeme.io</strong> — piattaforma e-commerce per la gestione degli ordini.</p>
<h2>4. Come gestire i cookie</h2>
<p>Puoi rifiutare i cookie non essenziali tramite il banner che appare alla prima visita. Puoi anche gestirli direttamente dal tuo browser:</p>
<p>Chrome: Impostazioni &rarr; Privacy e sicurezza &rarr; Cookie<br>Firefox: Impostazioni &rarr; Privacy e sicurezza<br>Safari: Preferenze &rarr; Privacy<br>Edge: Impostazioni &rarr; Cookie e autorizzazioni sito</p>
<p>Disabilitare i cookie tecnici può compromettere il funzionamento del sito.</p>
<h2>5. Titolare del trattamento</h2>
<p>{titolare_nome} {titolare_cognome}<br>{indirizzo}, {cap} {citta}<br>P.IVA: {piva}<br>Email: <a href="mailto:{email_legale}">{email_legale}</a></p>
<h2>6. Aggiornamenti</h2>
<p>Questa policy può essere aggiornata. La data in cima alla pagina indica l'ultima versione. Modifiche sostanziali saranno comunicate tramite avviso sul sito.</p>
</body>
</html>"""


PRIVACY_POLICY_TEMPLATE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Policy — {nome_sito}</title>
<style>
body{{font-family:'Segoe UI',system-ui,sans-serif;max-width:860px;margin:0 auto;padding:40px 24px;color:#1a1a1a;line-height:1.7}}
h1{{font-size:28px;font-weight:800;margin-bottom:8px}}
h2{{font-size:18px;font-weight:700;margin:32px 0 12px;padding-top:16px;border-top:1px solid #eee}}
p,li{{margin-bottom:12px;font-size:15px;color:#374151}}
ul{{padding-left:20px;margin-bottom:16px}}
.data{{font-size:13px;color:#6b7280;margin-bottom:32px}}
a{{color:#e94560}}
.box{{background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 20px;border-radius:4px;margin:20px 0}}
</style>
</head>
<body>
<h1>Informativa sulla Privacy</h1>
<p class="data">Ultimo aggiornamento: {data_oggi} — ai sensi del Regolamento UE 2016/679 (GDPR)</p>
<div class="box"><strong>Titolare del Trattamento:</strong> {titolare_nome} {titolare_cognome} — {indirizzo}, {cap} {citta} — P.IVA {piva} — <a href="mailto:{email_legale}">{email_legale}</a></div>
<h2>1. Dati raccolti</h2>
<p>Il sito <strong>{sito_url}</strong> raccoglie i seguenti dati personali:</p>
<ul>
<li><strong>Dati di contatto</strong>: nome, cognome, indirizzo email, numero di telefono (forniti volontariamente tramite form)</li>
<li><strong>Dati di navigazione</strong>: indirizzo IP, tipo di browser, pagine visitate, orari di accesso (raccolti automaticamente)</li>
<li><strong>Dati di acquisto</strong>: informazioni necessarie al completamento dell'ordine (gestite da Systeme.io e Stripe)</li>
</ul>
<h2>2. Finalità e basi giuridiche del trattamento</h2>
<ul>
<li><strong>Erogazione del servizio acquistato</strong> (base: esecuzione contratto — art. 6.1.b GDPR)</li>
<li><strong>Comunicazioni di marketing</strong> tramite email, solo con consenso esplicito (base: consenso — art. 6.1.a GDPR)</li>
<li><strong>Adempimenti fiscali e legali</strong> (base: obbligo legale — art. 6.1.c GDPR)</li>
<li><strong>Statistiche di utilizzo anonime</strong> tramite Google Analytics (base: legittimo interesse — art. 6.1.f GDPR)</li>
</ul>
<h2>3. Conservazione dei dati</h2>
<ul>
<li>Dati contrattuali: 10 anni (obbligo fiscale)</li>
<li>Email marketing: fino a revoca del consenso</li>
<li>Dati di navigazione: 26 mesi (Google Analytics)</li>
<li>Dati acquisto: 10 anni (art. 2220 c.c.)</li>
</ul>
<h2>4. Comunicazione a terzi</h2>
<p>I dati non vengono venduti. Possono essere comunicati a:</p>
<ul>
<li><strong>Systeme.io</strong> — piattaforma e-commerce (hosting UE/USA con Standard Contractual Clauses)</li>
<li><strong>Stripe Inc.</strong> — processore pagamenti (certificazione PCI-DSS)</li>
<li><strong>Google LLC</strong> — analytics e video (Data Processing Agreement attivo)</li>
<li>Commercialisti e consulenti legali, per adempimenti obbligatori</li>
</ul>
<h2>5. Diritti dell'interessato</h2>
<p>Ai sensi degli artt. 15-22 GDPR hai diritto di:</p>
<ul>
<li>Accedere ai tuoi dati personali</li>
<li>Rettificarli o aggiornarli</li>
<li>Richiederne la cancellazione ("diritto all'oblio")</li>
<li>Opporti al trattamento per marketing</li>
<li>Richiedere la portabilità dei dati</li>
<li>Revocare il consenso in qualsiasi momento</li>
</ul>
<p>Per esercitare i tuoi diritti scrivi a: <a href="mailto:{email_legale}">{email_legale}</a>. Risponderemo entro 30 giorni.</p>
<h2>6. Reclamo all'Autorità</h2>
<p>Hai il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank">garanteprivacy.it</a>).</p>
<h2>7. Modifiche</h2>
<p>Questa informativa può essere aggiornata. La versione vigente è sempre disponibile su questa pagina con la data di aggiornamento.</p>
</body>
</html>"""


CONDIZIONI_VENDITA_TEMPLATE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Condizioni di Vendita — {nome_sito}</title>
<style>
body{{font-family:'Segoe UI',system-ui,sans-serif;max-width:860px;margin:0 auto;padding:40px 24px;color:#1a1a1a;line-height:1.7}}
h1{{font-size:28px;font-weight:800;margin-bottom:8px}}
h2{{font-size:18px;font-weight:700;margin:32px 0 12px;padding-top:16px;border-top:1px solid #eee}}
p,li{{margin-bottom:12px;font-size:15px;color:#374151}}
ul{{padding-left:20px;margin-bottom:16px}}
.data{{font-size:13px;color:#6b7280;margin-bottom:32px}}
a{{color:#e94560}}
.box{{background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:4px;margin:20px 0;font-size:14px}}
</style>
</head>
<body>
<h1>Condizioni Generali di Vendita</h1>
<p class="data">Ultimo aggiornamento: {data_oggi}</p>
<p>Le presenti Condizioni Generali di Vendita regolano l'acquisto di prodotti digitali (videocorsi, materiali formativi) sul sito <strong>{sito_url}</strong>, gestito da <strong>{titolare_nome} {titolare_cognome}</strong>, P.IVA {piva}, con sede in {indirizzo}, {cap} {citta} (di seguito "Venditore").</p>
<h2>1. Oggetto del contratto</h2>
<p>Il Venditore offre prodotti digitali in formato videocorso, accessibili online tramite la piattaforma indicata al momento dell'acquisto. I contenuti sono descritti nelle rispettive pagine di vendita.</p>
<h2>2. Processo di acquisto</h2>
<p>L'acquisto si perfeziona con:</p>
<ul>
<li>Selezione del prodotto e inserimento dei dati richiesti</li>
<li>Scelta del metodo di pagamento</li>
<li>Conferma dell'ordine tramite il pulsante di acquisto</li>
<li>Ricezione dell'email di conferma con le istruzioni di accesso</li>
</ul>
<p>L'email di conferma costituisce accettazione dell'ordine e conclusione del contratto.</p>
<h2>3. Prezzi e pagamento</h2>
<p>I prezzi sono espressi in Euro (&euro;) IVA inclusa, salvo diversa indicazione. Il Venditore si riserva il diritto di modificare i prezzi in qualsiasi momento; il prezzo applicato è quello indicato al momento dell'acquisto.</p>
<p>I pagamenti vengono processati in modo sicuro tramite <strong>Stripe</strong> (carte di credito/debito) o altri metodi indicati in fase di checkout. Il Venditore non memorizza i dati della carta di pagamento.</p>
<h2>4. Consegna del prodotto digitale</h2>
<p>I prodotti digitali vengono resi disponibili immediatamente dopo la conferma del pagamento tramite invio di email con credenziali di accesso o link diretto. In caso di mancata ricezione entro 24 ore, contattare: <a href="mailto:{email_legale}">{email_legale}</a>.</p>
<h2>5. Diritto di recesso</h2>
<div class="box"><strong>Importante:</strong> Ai sensi dell'art. 59, lett. o) del D.Lgs. 206/2005 (Codice del Consumo), il diritto di recesso è <strong>escluso</strong> per i contenuti digitali la cui esecuzione è iniziata con il consenso espresso del consumatore e con la sua espressa rinuncia al diritto di recesso.</div>
<h2>6. Garanzia di soddisfazione</h2>
<p>Pur non essendo obbligato per legge, il Venditore offre una <strong>garanzia di rimborso di 30 giorni</strong> dalla data di acquisto, a propria discrezione e per motivate ragioni. Per richiedere il rimborso: <a href="mailto:{email_legale}">{email_legale}</a>.</p>
<h2>7. Proprietà intellettuale</h2>
<p>Tutti i contenuti (video, testi, immagini, materiali) sono di proprietà esclusiva del Venditore e protetti dalle leggi sul diritto d'autore (L. 633/1941). È vietata qualsiasi riproduzione, distribuzione, condivisione o utilizzo commerciale senza autorizzazione scritta.</p>
<h2>8. Limitazione di responsabilità</h2>
<p>I risultati descritti nelle pagine di vendita sono indicativi e non garantiti, in quanto dipendono dall'impegno personale dell'acquirente.</p>
<h2>9. Foro competente e legge applicabile</h2>
<p>Le presenti condizioni sono regolate dalla legge italiana. Per qualsiasi controversia è competente il Foro di {citta}, salvo diversa previsione di legge per i consumatori (art. 66-bis Codice del Consumo).</p>
<h2>10. Risoluzione alternativa delle controversie</h2>
<p>In caso di controversia, il consumatore può ricorrere alla piattaforma ODR della Commissione Europea: <a href="https://ec.europa.eu/consumers/odr" target="_blank">ec.europa.eu/consumers/odr</a>.</p>
<h2>11. Contatti</h2>
<p>{titolare_nome} {titolare_cognome}<br>{indirizzo}, {cap} {citta}<br>P.IVA: {piva}<br>Email: <a href="mailto:{email_legale}">{email_legale}</a></p>
</body>
</html>"""
