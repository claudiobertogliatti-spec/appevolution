"""
Analisi dei video virali dei competitor (Andrea).

Andrea NON guarda il video: non esiste una fonte che lo porti in Ciak. Claudio incolla il testo
(trascrizione o parlato) e, se le ha, le cifre. Andrea scompone quello che c'e' scritto (gancio,
struttura, invito) e propone un reel NUOVO, con parole e angolo diversi, per il flusso reel.

Regole:
- Si ragiona solo su testo e cifre incollati. Le cifre le calcola il codice (tasso di
  interazione), non il modello. Il «perche' ha funzionato» e' sempre un'ipotesi, dichiarata come tale.
- Non si copia: il reel proposto non riusa frasi del competitor.

Funzioni pure: `valida_input`, `metriche`, `prompt`, `parse_analisi`.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

TESTO_MIN, TESTO_MAX = 40, 6000
PIATTAFORME = ("Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "Altro")
MODELLO = "claude-sonnet-4-6"


def _intero(v: Any) -> Optional[int]:
    if v in (None, ""):
        return None
    try:
        n = int(float(str(v).replace(".", "").replace(",", ".")))
    except ValueError:
        raise ValueError("Le cifre devono essere numeri (visualizzazioni, like, commenti).")
    if n < 0:
        raise ValueError("Le cifre non possono essere negative.")
    return n


def valida_input(*, piattaforma, competitor, link, testo, views, likes, commenti) -> dict:
    if piattaforma not in PIATTAFORME:
        raise ValueError("Scegli la piattaforma del video.")
    if not isinstance(testo, str):
        raise ValueError("Incolla il testo o la trascrizione del video.")
    testo = testo.strip()
    if not (TESTO_MIN <= len(testo) <= TESTO_MAX):
        raise ValueError(f"Il testo deve avere tra {TESTO_MIN} e {TESTO_MAX} caratteri.")
    link = (link or "").strip()
    if link and not re.match(r"^https?://", link):
        raise ValueError("Il link deve cominciare con http:// o https://.")
    return {
        "piattaforma": piattaforma, "competitor": (competitor or "").strip()[:100], "link": link[:500],
        "testo": testo, "views": _intero(views), "likes": _intero(likes), "commenti": _intero(commenti),
    }


def metriche(d: dict) -> dict:
    """Cifre cosi' come incollate + tasso di interazione calcolato qui (None se non calcolabile)."""
    views, likes, commenti = d.get("views"), d.get("likes"), d.get("commenti")
    tasso = None
    if views and (likes is not None or commenti is not None):
        tasso = round(((likes or 0) + (commenti or 0)) / views * 100, 2)
    return {"views": views, "likes": likes, "commenti": commenti, "tasso_interazione_pct": tasso}


def prompt(d: dict, memoria: str = "") -> tuple[str, str]:
    m = metriche(d)
    system = (
        "Sei ANDREA, il responsabile Contenuti AI di Ciak. Claudio Bertogliatti ti passa il testo di un "
        "video di un competitor andato bene e vuole capire cosa c'e' sotto e farne uno suo.\n\n"
        "REGOLE (non derogabili):\n"
        "- Ragiona SOLO sul testo e sulle cifre che ti do. Non hai visto il video: non descrivere immagini, "
        "montaggio, musica o tono di voce. Non inventare cifre, tempi o dettagli.\n"
        "- «perche_ha_funzionato» sono IPOTESI basate sul testo: scrivile come ipotesi, non come fatti.\n"
        "- Il reel che proponi e' ORIGINALE: altro angolo, altre parole. Non riusare frasi del competitor.\n"
        "- Usa solo i fatti della Memoria Ciak su Claudio e su Ciak: niente risultati, testimonianze o "
        "promesse inventati.\n"
        "- Italiano, dai del tu, concreto.\n"
        "- Rispondi SOLO con un oggetto JSON con questi campi: "
        "{\"gancio\": \"come apre e perche' ferma lo scroll\", "
        "\"struttura\": [\"passo 1\", \"passo 2\", \"...\"], "
        "\"perche_ha_funzionato\": [\"ipotesi 1\", \"ipotesi 2\"], "
        "\"da_non_copiare\": \"cosa e' specifico di quel competitor e non ti appartiene\", "
        "\"adattamento\": \"come lo rendi tuo, in 2-3 frasi\", "
        "\"brief_reel\": \"brief di 2-4 frasi per scrivere il tuo reel da 20-40 secondi: un solo concetto, "
        "a chi parla, cosa deve fare chi guarda\"}.\n"
    )
    if memoria:
        system += "\n" + memoria
    cifre = ", ".join(f"{k}: {v}" for k, v in m.items() if v is not None) or "nessuna cifra fornita"
    user = (
        f"Piattaforma: {d['piattaforma']}\nCompetitor: {d['competitor'] or 'non indicato'}\n"
        f"Cifre incollate da Claudio: {cifre}\n\nTESTO DEL VIDEO:\n{d['testo']}"
    )
    return system, user


def parse_analisi(raw: str) -> Optional[dict]:
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
    def s(k):
        v = d.get(k)
        return v.strip() if isinstance(v, str) and v.strip() else None
    def lista(k):
        v = d.get(k)
        return [x.strip() for x in v if isinstance(x, str) and x.strip()][:8] if isinstance(v, list) else []
    out = {
        "gancio": s("gancio"), "struttura": lista("struttura"), "perche_ha_funzionato": lista("perche_ha_funzionato"),
        "da_non_copiare": s("da_non_copiare"), "adattamento": s("adattamento"), "brief_reel": s("brief_reel"),
    }
    if not (out["gancio"] and out["struttura"] and out["brief_reel"] and len(out["brief_reel"]) >= 10):
        return None
    return out
