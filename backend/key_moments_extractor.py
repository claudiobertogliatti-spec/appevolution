"""
Estrae key moments dal transcript Whisper usando Claude API.
Integra lo script approvato come contesto per identificare
i concetti cardine voluti dal partner/admin.
"""
import os
import json
import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Sei un esperto di video editing per corsi online.
Il tuo compito è identificare i momenti chiave in una masterclass:
concetti cardine, definizioni importanti, promesse forti, cifre di impatto,
affermazioni trasformative che l'editore deve evidenziare visivamente
per mantenere l'attenzione e comunicare il valore del corso.

Restituisci SOLO JSON valido, nessun testo aggiuntivo."""

USER_TEMPLATE = """Partner: {partner_name} | Nicchia: {niche}

{script_section}TRANSCRIPT EFFETTIVO (parlato reale):
{transcript}

CAMPIONE PAROLE CON TIMESTAMP:
{words_sample}

Durata video: {duration_s:.0f} secondi

Identifica 5-8 key moments (max 3 secondi ciascuno) dove viene detto
qualcosa di ad alto impatto visivo: un concetto chiave, una cifra importante,
una promessa forte, il nome di un metodo/sistema, una trasformazione attesa.

Scegli momenti distribuiti lungo tutto il video, non solo all'inizio.

Rispondi SOLO con questo JSON:
{{
  "key_moments": [
    {{
      "startSec": 12.5,
      "endSec": 15.0,
      "text": "Testo breve (max 5 parole)",
      "type": "highlight"
    }}
  ]
}}

type: "both" per i 2 momenti più importanti, "highlight" per gli altri.
"zoom" solo se il contenuto visivo del video lo giustifica (es. grafica, schermo).
Assicurati che startSec e endSec siano all'interno di [0, {duration_s:.0f}]."""


async def extract_key_moments(
    transcript: str,
    words: List[Dict],
    partner_name: str,
    niche: str,
    video_duration_s: float,
    approved_script: Optional[str] = None,
) -> List[Dict]:
    """
    Chiama Claude API per estrarre key moments.

    Args:
        transcript: testo completo trascritto da Whisper
        words: lista dict {word, start, end} da Whisper verbose_json
        partner_name: nome del partner
        niche: nicchia del partner
        video_duration_s: durata del video pulito in secondi
        approved_script: (opzionale) script approvato prima della registrazione
                         — fornisce contesto sui concetti chiave voluti

    Returns:
        Lista di dict {startSec, endSec, text, type} compatibili con KeyMoment TS
    """
    ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    if not ANTHROPIC_KEY:
        logger.warning("[KEY_MOMENTS] ANTHROPIC_API_KEY non configurata, skip")
        return []

    if not transcript or len(transcript.strip()) < 80:
        logger.info("[KEY_MOMENTS] Transcript troppo breve, skip")
        return []

    try:
        import anthropic

        # Campione words: max 120 parole uniformemente distribuite
        step = max(1, len(words) // 120)
        words_sample = json.dumps(
            [
                {
                    "word": w["word"],
                    "start": round(w["start"], 1),
                    "end": round(w["end"], 1),
                }
                for w in words[::step][:120]
            ],
            ensure_ascii=False,
        )

        # Sezione script (opzionale)
        script_section = ""
        if approved_script and len(approved_script.strip()) > 50:
            script_preview = approved_script.strip()[:1500]
            script_section = (
                f"SCRIPT APPROVATO (struttura e concetti chiave previsti):\n"
                f"{script_preview}\n\n"
            )

        prompt = USER_TEMPLATE.format(
            partner_name=partner_name,
            niche=niche,
            script_section=script_section,
            transcript=transcript[:4000],
            words_sample=words_sample,
            duration_s=video_duration_s,
        )

        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()

        # Parse JSON
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", raw)
            if match:
                result = json.loads(match.group(0))
            else:
                logger.warning(f"[KEY_MOMENTS] JSON parse failed: {raw[:300]}")
                return []

        moments = result.get("key_moments", [])

        # Validazione e sanificazione
        valid = []
        for m in moments:
            try:
                start = float(m.get("startSec", 0))
                end = float(m.get("endSec", 0))
                text = str(m.get("text", "")).strip()[:60]
                moment_type = m.get("type", "highlight")

                if not text:
                    continue
                if not (0 <= start < end <= video_duration_s):
                    continue
                if (end - start) > 5:
                    end = start + 3  # tronca a 3s massimo
                if moment_type not in ("zoom", "highlight", "both"):
                    moment_type = "highlight"

                valid.append({
                    "startSec": round(start, 2),
                    "endSec": round(end, 2),
                    "text": text,
                    "type": moment_type,
                })
            except (ValueError, TypeError):
                continue

        logger.info(
            f"[KEY_MOMENTS] {len(valid)} key moments per {partner_name} "
            f"(script: {'sì' if approved_script else 'no'})"
        )
        return valid

    except Exception as e:
        logger.error(f"[KEY_MOMENTS] Errore: {e}", exc_info=True)
        return []
