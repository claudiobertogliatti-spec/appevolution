"""Ponte fra gli AGENTI e i DELIVERABLE che producono.

⚠️ Perché esiste (12/8/2026). Gli agenti hanno un system prompt ufficiale in
`agent_prompts.py`, con il loro ruolo e i loro framework, e al partner vengono
presentati come specialisti (`frontend/.../operativo/agents.js`: Valentina =
"Brand & Posizionamento"). Ma quel prompt lo usava **solo la chat**: tutti e 9 i
generatori di contenuto (posizionamento, storia, masterclass, curriculum,
webinar, calendario editoriale, analisi, case study, descrizioni lezioni) si
scrivevano un system prompt anonimo per conto proprio.

Risultato: l'agente era esperto quando ci parlavi e generico quando produceva il
documento che il partner paga. Da qui si compone invece:

    system = prompt ufficiale dell'agente + istruzioni del singolo deliverable

Il prompt dell'agente resta la fonte unica: se lo si arricchisce (nuovi framework,
nuove competenze), **tutti i deliverable di quell'agente ne beneficiano subito**,
senza toccare i generatori.

Chi produce cosa (mapping dalle macro-fasi in `models/partner_journey_step.py` e
da `STEP_TO_AGENT` nel frontend):
  VALENTINA → brand kit, storia, posizionamento
  ANDREA    → script masterclass, outline e script videolezioni
  MARCO     → post-lancio, ottimizzazione
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Agente responsabile per tipo di deliverable. Allineato a STEP_TO_AGENT.
DELIVERABLE_AGENT = {
    # generatore                        agente        stato
    "posizionamento": "VALENTINA",   # posizionamento_statement.py  ✅ cablato
    "storia": "VALENTINA",           # storia_narrativa.py          ✅ cablato
    "masterclass_script": "ANDREA",  # masterclass_script.py        ✅ cablato
    "curriculum": "ANDREA",          # curriculum_outline.py        ✅ cablato
    "calendario_editoriale": "ANDREA",  # editorial_calendar.py     ✅ cablato
    "webinar": "VALENTINA",          # webinar_strategy.py          ✅ cablato
    "case_study": "MARCO",           # case_study_engine.py         ✅ cablato
    "analisi": "MATTEO",             # analisi_generator.py         ✅ cablato
    # `brand_kit_pdf_renderer` e `lesson_description` non chiamano un modello:
    # sono deterministici, non hanno un agente da firmare.
}


def prompt_agente(agent_id: str) -> str:
    """System prompt ufficiale dell'agente. Stringa vuota se non recuperabile:
    il generatore deve poter funzionare comunque con le sole istruzioni sue."""
    try:
        from agent_prompts import get_agent_prompt
        return (get_agent_prompt(agent_id) or "").strip()
    except Exception as e:  # noqa: BLE001
        logger.warning("[AGENT] prompt di %s non recuperato: %s", agent_id, e)
        return ""


def system_blocks(agent_id: str, istruzioni: str) -> list[dict]:
    """Blocchi `system` per l'API Anthropic: identità dell'agente + compito.

    Il prompt dell'agente è lungo e stabile, quindi va in un blocco proprio con
    `cache_control`: si paga una volta e vale per tutte le generazioni successive.
    Le istruzioni del deliverable cambiano poco, ma stanno dopo perché è l'ultimo
    blocco a pesare di più sul comportamento.
    """
    blocchi: list[dict] = []
    base = prompt_agente(agent_id)
    if base:
        blocchi.append({
            "type": "text",
            "text": base + (
                "\n\n════════════════════════\n"
                "Quanto sopra definisce chi sei e come lavori. Quello che segue è il "
                "documento che devi produrre adesso per un partner: applicaci le tue "
                "competenze, non limitarti a eseguire il formato."
            ),
            "cache_control": {"type": "ephemeral"},
        })
    blocchi.append({"type": "text", "text": istruzioni, "cache_control": {"type": "ephemeral"}})
    return blocchi
