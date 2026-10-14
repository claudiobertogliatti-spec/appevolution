"""
Reel con HeyGen per i canali di Claudio (Instagram, Facebook, YouTube Shorts, LinkedIn).

Flusso: Andrea scrive lo script parlato -> Claudio lo legge, lo modifica e lo approva ->
solo allora parte la generazione HeyGen (verticale 1080x1920) con l'avatar e la voce che
Claudio ha scelto. Niente parte da solo e ogni generazione consuma crediti HeyGen, quindi
c'e' un tetto mensile (default 8) oltre il quale non si genera.

Lo script usa SOLO il brief e la Memoria Ciak: niente risultati, cifre o testimonianze inventati.

Funzioni pure (testabili senza rete): `valida_brief`, `prompt_script`, `parse_script`,
`valida_script`, `stima_secondi`, `tetto_raggiunto`, `mese_corrente`, `riga_reel`.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

BRIEF_MIN, BRIEF_MAX = 10, 1000
SCRIPT_MIN, SCRIPT_MAX = 40, 900          # caratteri dello script parlato
PAROLE_AL_SECONDO = 2.5                   # ~150 parole/minuto, come il resto del repo
DURATA_MIN_S, DURATA_MAX_S = 10, 60       # un reel sta in 60 secondi
TETTO_MENSILE_DEFAULT = 8
DIMENSIONE_REEL = {"width": 1080, "height": 1920}
MODELLO = "claude-sonnet-4-6"

STATI_CONTA_NEL_TETTO = {"in_generazione", "pronto", "pubblicato"}   # i falliti non consumano


def mese_corrente(now: Optional[datetime] = None) -> str:
    return (now or datetime.now(timezone.utc)).strftime("%Y-%m")


def valida_brief(brief: Any) -> str:
    if not isinstance(brief, str):
        raise ValueError("Scrivi di cosa parla il reel.")
    brief = " ".join(brief.split())
    if not (BRIEF_MIN <= len(brief) <= BRIEF_MAX):
        raise ValueError(f"Il brief deve avere tra {BRIEF_MIN} e {BRIEF_MAX} caratteri.")
    return brief


def stima_secondi(script: str) -> int:
    return round(len(script.split()) / PAROLE_AL_SECONDO)


def valida_script(script: Any) -> str:
    """Script pulito; ValueError leggibile se non e' adatto a un reel."""
    if not isinstance(script, str):
        raise ValueError("Manca lo script.")
    script = script.strip()
    if not (SCRIPT_MIN <= len(script) <= SCRIPT_MAX):
        raise ValueError(f"Lo script deve avere tra {SCRIPT_MIN} e {SCRIPT_MAX} caratteri.")
    secondi = stima_secondi(script)
    if secondi > DURATA_MAX_S:
        raise ValueError(f"Lo script dura circa {secondi} secondi: un reel sta in {DURATA_MAX_S}. Accorcialo.")
    if secondi < DURATA_MIN_S:
        raise ValueError(f"Lo script dura circa {secondi} secondi: troppo corto per un reel (minimo {DURATA_MIN_S}).")
    return script


def prompt_script(brief: str, memoria: str = "") -> tuple[str, str]:
    system = (
        "Sei ANDREA, il responsabile Contenuti AI di Ciak. Scrivi per Claudio Bertogliatti "
        "lo script PARLATO di un reel verticale con il suo avatar, e la didascalia.\n\n"
        "REGOLE (non derogabili):\n"
        "- Usa SOLO il brief e le regole della Memoria Ciak. Non inventare risultati, cifre, "
        "testimonianze, nomi di clienti, premi, prezzi o scadenze. Se il brief non basta per "
        "una cosa, scrivi senza quella cosa.\n"
        "- Lo script e' parlato in prima persona da Claudio, in italiano, dai del tu. Frasi corte.\n"
        "- Struttura: gancio nei primi 3 secondi (una domanda o un'affermazione che ferma lo scroll), "
        "un solo concetto, chiusura con un invito: andare sul sito. Non scrivere l'indirizzo: lo aggiunge il sistema.\n"
        "- Tra 35 e 90 parole in totale (20-40 secondi). Niente emoji, niente indicazioni di regia, "
        "niente parentesi: solo le parole che l'avatar dira'.\n"
        "- Didascalia: massimo 220 caratteri, niente hashtag oltre 3.\n"
        "- Rispondi SOLO con un oggetto JSON: {\"script\": \"...\", \"didascalia\": \"...\"}.\n"
    )
    if memoria:
        system += "\n" + memoria
    return system, f"BRIEF DEL REEL:\n{brief}"


def parse_script(raw: str) -> Optional[dict]:
    """{script, didascalia, secondi} dalla risposta del modello; None se non valida.
    Lo script deve passare gli stessi controlli dell'invio."""
    if not raw:
        return None
    testo = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    m = re.search(r"\{.*\}", testo, flags=re.DOTALL)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except ValueError:
        return None
    script, did = d.get("script"), d.get("didascalia")
    if not isinstance(script, str) or not isinstance(did, str):
        return None
    # Niente indicazioni di regia: se ci sono parentesi o asterischi l'avatar le leggerebbe.
    script = re.sub(r"[\(\[\*].*?[\)\]\*]", "", script).strip()
    script = " ".join(script.split())
    try:
        script = valida_script(script)
    except ValueError:
        return None
    did = did.strip()[:220]
    if not did:
        return None
    return {"script": script, "didascalia": did, "secondi": stima_secondi(script)}


def tetto_raggiunto(reel: list[dict], tetto: int, mese: str) -> bool:
    """True se i reel del mese che consumano crediti hanno gia' raggiunto il tetto."""
    usati = sum(1 for r in reel if r.get("mese") == mese and r.get("stato") in STATI_CONTA_NEL_TETTO)
    return usati >= tetto


def riga_reel(*, script: str, didascalia: str, avatar_id: str, voice_id: str, video_id: Optional[str],
              by: str, stato: str, errore: Optional[str] = None, now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(timezone.utc)
    return {
        "id": str(uuid.uuid4()),
        "mese": mese_corrente(now),
        "script": script,
        "didascalia": didascalia,
        "secondi_stimati": stima_secondi(script),
        "avatar_id": avatar_id,
        "voice_id": voice_id,
        "heygen_video_id": video_id,
        "video_url": None,
        "stato": stato,          # in_generazione | pronto | fallito | pubblicato
        "errore": errore,
        "creato_da": by,
        "creato_at": now.isoformat(),
    }
