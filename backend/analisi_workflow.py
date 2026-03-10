"""
analisi_workflow.py
Gestisce l'intero ciclo di vita dell'Analisi Strategica:
validazione → AI → DOCX → email → notifica
"""

import os
import json
import asyncio
import subprocess
from datetime import datetime, timezone
from pathlib import Path
import logging

# Directory per i file DOCX generati
DOCX_DIR = Path("/app/backend/static/analisi")
DOCX_DIR.mkdir(parents=True, exist_ok=True)

# Config
TEAM_EMAIL = os.environ.get("TEAM_EMAIL", "claudio@evolution-pro.it")
APP_URL = os.environ.get("APP_URL", os.environ.get("REACT_APP_BACKEND_URL", "https://app.evolution-pro.it"))

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — VALIDAZIONE RISPOSTE
# ═══════════════════════════════════════════════════════════════════════════════

# Campi con lunghezza minima richiesta (caratteri)
CAMPI_OBBLIGATORI = {
    "expertise":            {"min": 20, "label": "In cosa sei esperto"},
    "cliente_ideale":       {"min": 20, "label": "Il tuo cliente ideale"},
    "pubblico_esistente":   {"min": 15, "label": "Presenza online"},
    "esperienze_passate":   {"min": 15, "label": "Esperienze di vendita online"},
    "ostacolo_principale":  {"min": 20, "label": "L'ostacolo principale"},
    "obiettivo_12_mesi":    {"min": 25, "label": "Obiettivo 12 mesi"},
    "perche_adesso":        {"min": 20, "label": "Perché proprio adesso"},
}

# Risposte generiche da bloccare
RISPOSTE_VIETATE = [
    "non lo so", "boh", "aiuto tutti", "voglio guadagnare",
    "non saprei", "tutto", "vari", "chiunque", "tutti",
    "non so", "dipende", "vediamo", "forse",
]

def valida_risposte(risposte: dict) -> dict:
    """
    Ritorna: { "ok": bool, "campi_ko": [{"campo": str, "motivo": str}] }
    """
    campi_ko = []

    for campo, cfg in CAMPI_OBBLIGATORI.items():
        valore = risposte.get(campo, "").strip()

        # Campo mancante o vuoto
        if not valore:
            campi_ko.append({
                "campo": cfg["label"],
                "motivo": "campo non compilato"
            })
            continue

        # Troppo corto
        if len(valore) < cfg["min"]:
            campi_ko.append({
                "campo": cfg["label"],
                "motivo": f"risposta troppo breve ({len(valore)} caratteri, minimo {cfg['min']})"
            })
            continue

        # Risposta generica
        valore_lower = valore.lower()
        for vietata in RISPOSTE_VIETATE:
            if valore_lower == vietata or (len(valore) < 30 and vietata in valore_lower):
                campi_ko.append({
                    "campo": cfg["label"],
                    "motivo": f"risposta troppo generica ('{valore}')"
                })
                break

    return {"ok": len(campi_ko) == 0, "campi_ko": campi_ko}


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — GENERAZIONE TESTO AI (Claude via Emergent)
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT_ANALISI = """Sei Claudio Bertogliatti, fondatore di Evolution PRO.
Ricevi le risposte di un professionista al questionario pre-analisi.
Il tuo compito è arricchire le sue risposte con considerazioni strategiche
PERSONALIZZATE, concrete, non generiche.

NON usare frasi fatte come "ottimo profilo" o "grande potenziale".
Sii diretto, specifico, usa i dati reali che ti sono stati forniti.

Rispondi SOLO con JSON valido, senza markdown, senza testo extra."""

def build_prompt_ai(risposte: dict, nome: str) -> str:
    return f"""Analizza questo professionista e arricchisci le sue risposte.

NOME: {nome}
COMPETENZA: {risposte.get("expertise", "")}
TARGET: {risposte.get("cliente_ideale", "")}
PUBBLICO: {risposte.get("pubblico_esistente", "")}
ESPERIENZA ONLINE: {risposte.get("esperienze_passate", "")}
OSTACOLO: {risposte.get("ostacolo_principale", "")}
OBIETTIVO 12 MESI: {risposte.get("obiettivo_12_mesi", "")}
PERCHÉ ORA: {risposte.get("perche_adesso", "")}

Produci questo JSON (tutte le chiavi obbligatorie):
{{
  "COMPETENZA_ARRICCHITA": "espandi e contestualizza la competenza del professionista in 1-2 frasi concrete",
  "TARGET_ARRICCHITO": "espandi la descrizione del target con dettagli sul problema specifico che vogliono risolvere",
  "PUBBLICO_ARRICCHITO": "commenta la situazione attuale del pubblico e cosa significa per il lancio",
  "ESPERIENZA_ARRICCHITA": "contestualizza le esperienze passate e cosa manca per sistematizzarle",
  "OSTACOLO_ARRICCHITO": "nomina l'ostacolo specifico e cosa lo ha causato",
  "OBIETTIVO_ARRICCHITO": "traduci l'obiettivo in numeri concreti (es: X vendite a €Y = €Z/mese)",
  "PERCHE_ORA_ARRICCHITO": "interpreta il momento di urgenza e cosa significa strategicamente"
}}"""


async def genera_testo_ai(risposte: dict, nome: str) -> dict:
    """Chiama Claude per arricchire le risposte con considerazioni personalizzate."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            system_prompt=SYSTEM_PROMPT_ANALISI
        ).with_model("anthropic", "claude-sonnet-4-20250514")
        
        response = await chat.send_message_async(
            UserMessage(text=build_prompt_ai(risposte, nome))
        )
        
        testo = response.strip()
        # Pulizia backtick markdown se presenti
        if "```" in testo:
            testo = testo.split("```")[1]
            if testo.startswith("json"):
                testo = testo[4:]
        return json.loads(testo.strip())
    except Exception as e:
        logging.error(f"[AI] Errore generazione testo: {e}")
        # Fallback: usa le risposte originali senza arricchimento
        return {
            "COMPETENZA_ARRICCHITA":  risposte.get("expertise", ""),
            "TARGET_ARRICCHITO":      risposte.get("cliente_ideale", ""),
            "PUBBLICO_ARRICCHITO":    risposte.get("pubblico_esistente", ""),
            "ESPERIENZA_ARRICCHITA":  risposte.get("esperienze_passate", ""),
            "OSTACOLO_ARRICCHITO":    risposte.get("ostacolo_principale", ""),
            "OBIETTIVO_ARRICCHITO":   risposte.get("obiettivo_12_mesi", ""),
            "PERCHE_ORA_ARRICCHITO":  risposte.get("perche_adesso", ""),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — GENERAZIONE DOCX (via Node.js)
# ═══════════════════════════════════════════════════════════════════════════════

async def genera_docx(cliente: dict, testo_ai: dict, risposte: dict) -> tuple:
    """
    Chiama genera_analisi.js passando i dati come JSON.
    Ritorna (path assoluto, nome file).
    """
    nome = cliente.get("nome", "Cliente")
    cognome = cliente.get("cognome", "")
    nome_completo = f"{nome} {cognome}".strip()
    nome_pulito = nome_completo.replace(" ", "_")
    data_str = datetime.now().strftime("%Y-%m-%d")
    nome_file = f"Analisi_Strategica_{nome_pulito}_{data_str}.docx"
    output_path = str(DOCX_DIR / nome_file)

    dati_docx = {
        "NOME_CLIENTE": nome_completo,
        "AMBITO": risposte.get("expertise", ""),
        "DATA_ANALISI": datetime.now().strftime("%d %B %Y"),
        # Risposte originali
        "RISPOSTA_EXPERTISE": risposte.get("expertise", ""),
        "RISPOSTA_TARGET": risposte.get("cliente_ideale", ""),
        "RISPOSTA_PUBBLICO": risposte.get("pubblico_esistente", ""),
        "RISPOSTA_ESPERIENZA": risposte.get("esperienze_passate", ""),
        "RISPOSTA_OSTACOLO": risposte.get("ostacolo_principale", ""),
        "RISPOSTA_OBIETTIVO": risposte.get("obiettivo_12_mesi", ""),
        "RISPOSTA_PERCHE_ORA": risposte.get("perche_adesso", ""),
        # Arricchimenti AI
        "COMPETENZA_ARRICCHITA": testo_ai.get("COMPETENZA_ARRICCHITA", ""),
        "TARGET_ARRICCHITO": testo_ai.get("TARGET_ARRICCHITO", ""),
        "PUBBLICO_ARRICCHITO": testo_ai.get("PUBBLICO_ARRICCHITO", ""),
        "ESPERIENZA_ARRICCHITA": testo_ai.get("ESPERIENZA_ARRICCHITA", ""),
        "OSTACOLO_ARRICCHITO": testo_ai.get("OSTACOLO_ARRICCHITO", ""),
        "OBIETTIVO_ARRICCHITO": testo_ai.get("OBIETTIVO_ARRICCHITO", ""),
        "PERCHE_ORA_ARRICCHITO": testo_ai.get("PERCHE_ORA_ARRICCHITO", ""),
    }

    script_path = Path(__file__).parent / "genera_analisi.js"

    result = subprocess.run(
        ["node", str(script_path), json.dumps(dati_docx), output_path],
        capture_output=True, text=True, timeout=60
    )

    if result.returncode != 0:
        raise RuntimeError(f"Errore generazione DOCX: {result.stderr}")

    return output_path, nome_file


# ═══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATORE PRINCIPALE
# ═══════════════════════════════════════════════════════════════════════════════

async def esegui_workflow_analisi(cliente_id: str, db) -> dict:
    """
    Punto di ingresso chiamato dall'endpoint API.
    Gestisce l'intero flusso e aggiorna MongoDB ad ogni step.

    Ritorna: { "status": str, "dettaglio": str, "docx_url"?: str }
    """
    from bson import ObjectId

    # Carica cliente da MongoDB
    try:
        cliente = await db.clienti.find_one({"id": cliente_id})
        if not cliente:
            # Prova con _id
            cliente = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
    except:
        cliente = await db.clienti.find_one({"id": cliente_id})
    
    if not cliente:
        return {"status": "errore", "dettaglio": "Cliente non trovato"}

    risposte = cliente.get("questionario", {}).get("risposte", {})
    nome = cliente.get("nome", "")
    cognome = cliente.get("cognome", "")
    email = cliente.get("email", "")
    nome_completo = f"{nome} {cognome}".strip()
    client_id = cliente.get("id") or str(cliente.get("_id", ""))

    # ── STEP 1: VALIDAZIONE ────────────────────────────────────────────────────
    await db.clienti.update_one(
        {"id": client_id},
        {"$set": {"workflow_status": "validazione", "workflow_updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    validazione = valida_risposte(risposte)

    if not validazione["ok"]:
        # Aggiorna stato
        campi_ko_str = ", ".join([c["campo"] for c in validazione["campi_ko"]])
        await db.clienti.update_one(
            {"id": client_id},
            {"$set": {
                "workflow_status": "validazione_fallita",
                "validazione_campi_ko": validazione["campi_ko"],
                "workflow_updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "status": "validazione_fallita",
            "dettaglio": f"Risposte incomplete: {campi_ko_str}",
            "campi_ko": validazione["campi_ko"]
        }

    # ── STEP 2: GENERAZIONE AI ─────────────────────────────────────────────────
    await db.clienti.update_one(
        {"id": client_id},
        {"$set": {"workflow_status": "generazione_ai", "workflow_updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    testo_ai = await genera_testo_ai(risposte, nome_completo)

    # ── STEP 3: GENERAZIONE DOCX ───────────────────────────────────────────────
    await db.clienti.update_one(
        {"id": client_id},
        {"$set": {"workflow_status": "generazione_docx", "workflow_updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    try:
        docx_path, nome_file = await genera_docx(cliente, testo_ai, risposte)
        docx_url = f"/static/analisi/{nome_file}"
        docx_url_completo = f"{APP_URL}/api{docx_url}"
    except Exception as e:
        logging.error(f"[DOCX] Errore generazione: {e}")
        await db.clienti.update_one(
            {"id": client_id},
            {"$set": {
                "workflow_status": "errore_docx",
                "workflow_error": str(e),
                "workflow_updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"status": "errore", "dettaglio": f"Errore generazione DOCX: {e}"}

    # ── STEP 4: AGGIORNA MONGODB ───────────────────────────────────────────────
    await db.clienti.update_one(
        {"id": client_id},
        {"$set": {
            "docx_analisi_url": docx_url,
            "docx_analisi_path": docx_path,
            "testo_ai": testo_ai,
            "analisi_generata_at": datetime.now(timezone.utc).isoformat(),
            "workflow_status": "completato",
            "stato": "analisi_pronta",
            "workflow_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "status": "completato",
        "dettaglio": "Analisi generata con successo",
        "docx_url": docx_url,
        "nome_file": nome_file
    }
