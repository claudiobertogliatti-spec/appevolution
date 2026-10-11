"""Il marchio del cliente Start.

Dall'11/10/2026 (decisione di Claudio) il cliente Start compila lo STESSO brand kit del
percorso EVO: tre colori, voce, tono a coppie, parole, espressioni, parole da evitare,
emozioni, logo e foto (questi ultimi due FACOLTATIVI in Start, obbligatori in EVO).
Restano valide anche le vecchie scelte pronte (palette/lettere/tono) per chi le aveva
gia' fatte: `normalizza` accetta entrambe le forme.

Prima: sceglieva fra poche opzioni gia' pronte (colori, lettere, modo di parlare).

Le scelte finiscono nello step `03-brand-kit` con DUE forme, per non rompere
nessuno:
  - la forma dei generatori Start (`colore_primario/secondario/accento`, `font`,
    `logo_url`, `foto_url`), che `start_vetrina.palette_da_brand_kit` legge;
  - la forma del brand kit partner (`colors` [3 esadecimali], `tone_of_voice`,
    `parole_chiave`), cosi' chi sale a Partnership la ritrova gia' compilata.

Le opzioni stanno SOLO qui: la pagina le legge dall'endpoint, non le duplica.
Il primario e' scuro di proposito: nella vetrina e' anche il colore del testo.
"""
from __future__ import annotations

import re
from typing import Any

STEP_ID = "03-brand-kit"

PALETTE: tuple[dict[str, Any], ...] = (
    {"id": "sicuro", "nome": "Sicuro e professionale", "descrizione": "Blu profondo e un tocco di oro. Ispira fiducia.",
     "colori": ["#0F2A4A", "#5B7C99", "#D9A441"]},
    {"id": "caldo", "nome": "Caldo e accogliente", "descrizione": "Marrone e terracotta. Fa sentire a casa.",
     "colori": ["#5A2E1E", "#B5651D", "#E8B98A"]},
    {"id": "naturale", "nome": "Naturale e sereno", "descrizione": "Verde bosco e sabbia. Calma e benessere.",
     "colori": ["#1F4D3A", "#6B9080", "#C9A66B"]},
    {"id": "deciso", "nome": "Energico e deciso", "descrizione": "Bordeaux e arancio. Dà energia.",
     "colori": ["#7A1F2B", "#C8553D", "#F2A65A"]},
    {"id": "sobrio", "nome": "Elegante e sobrio", "descrizione": "Grafite e bronzo. Pulito e raffinato.",
     "colori": ["#2B2B2B", "#6E6E6E", "#B08D57"]},
    {"id": "fresco", "nome": "Fresco e luminoso", "descrizione": "Petrolio e giallo sole. Moderno e leggero.",
     "colori": ["#0E4D64", "#2F8F9D", "#F4B942"]},
)

FONT: tuple[dict[str, str], ...] = (
    {"id": "moderno", "nome": "Moderno", "famiglia": "Poppins", "descrizione": "Pulito e chiaro, si legge bene ovunque."},
    {"id": "classico", "nome": "Classico", "famiglia": "Lora", "descrizione": "Con le grazie, elegante e di fiducia."},
    {"id": "deciso", "nome": "Deciso", "famiglia": "Montserrat", "descrizione": "Forte e sicuro, si fa notare."},
    {"id": "amichevole", "nome": "Amichevole", "famiglia": "Nunito", "descrizione": "Morbido e vicino alle persone."},
)

TONI: tuple[dict[str, str], ...] = (
    {"id": "semplice", "nome": "Semplice e diretto",
     "frase": "Parlo in modo semplice e diretto, con parole di tutti i giorni ed esempi concreti, senza giri di parole."},
    {"id": "caldo", "nome": "Caldo e rassicurante",
     "frase": "Parlo in modo caldo e rassicurante, con calma e vicinanza, perché chi mi ascolta si senta capito."},
    {"id": "preciso", "nome": "Preciso e professionale",
     "frase": "Parlo in modo preciso e professionale, spiegando bene le cose e dando indicazioni chiare e affidabili."},
)

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
MAX_PAROLA = 40
PAROLE_MIN = 3
PAROLE_MAX = 5

# Campi del brand kit EVO (stesse chiavi di `Step03BrandKit.jsx`).
TONO_MIN = 40            # caratteri minimi della voce scritta a mano (come in EVO)
TONO_MAX = 1500
ESPRESSIONI_MAX = 3
ESPRESSIONE_MAX = 160
PAROLE_EVITARE_MAX = 3
EMOZIONI = (
    "Motivato", "Tranquillo", "Compreso", "Curioso", "Sicuro", "Ispirato",
    "Competente", "Fiducioso", "Stimolato ad agire",
)
EMOZIONI_MAX = 5
TONO_COPPIE = 6          # coppie di toni (Formale/Informale ...), valori 0-4

# Font di default quando il cliente non sceglie le lettere (il brand kit EVO non le chiede).
FONT_DEFAULT = "Poppins"


def opzioni() -> dict[str, Any]:
    return {
        "palette": [dict(p) for p in PALETTE],
        "font": [dict(f) for f in FONT],
        "toni": [{"id": t["id"], "nome": t["nome"]} for t in TONI],
    }


def _url_ok(valore: Any) -> str:
    """Solo https: l'indirizzo finisce in una pagina HTML pubblica."""
    v = str(valore or "").strip()
    return v if v.startswith("https://") and len(v) <= 600 and " " not in v else ""


def normalizza(valori: Any) -> dict[str, Any]:
    """Tiene solo scelte valide e le traduce nella forma salvata nello step.

    Cio' che non e' valido viene ignorato (non salvato): niente colori o
    indirizzi sporchi in una pagina pubblica.
    """
    if not isinstance(valori, dict):
        return {}
    out: dict[str, Any] = {}

    palette = {p["id"]: p for p in PALETTE}
    colori: list[str] | None = None
    if valori.get("palette_id") in palette:
        out["palette_id"] = valori["palette_id"]
        colori = list(palette[valori["palette_id"]]["colori"])
    elif valori.get("palette_id") == "miei":
        scelti = valori.get("colori_miei")
        if isinstance(scelti, list) and len(scelti) == 3 and all(isinstance(c, str) and HEX_RE.match(c) for c in scelti):
            out["palette_id"] = "miei"
            colori = [c.upper() for c in scelti]
    if colori:
        out["colors"] = colori
        out["colore_primario"], out["colore_secondario"], out["colore_accento"] = colori

    fonts = {f["id"]: f for f in FONT}
    if valori.get("font_id") in fonts:
        out["font_id"] = valori["font_id"]
        out["font"] = fonts[valori["font_id"]]["famiglia"]

    toni = {t["id"]: t for t in TONI}
    if valori.get("tono_id") in toni:
        out["tono_id"] = valori["tono_id"]
        out["tone_of_voice"] = toni[valori["tono_id"]]["frase"]

    # ── Forma EVO ────────────────────────────────────────────────────────────
    liberi = valori.get("colors")
    if (
        "colors" not in out
        and isinstance(liberi, list)
        and len(liberi) == 3
        and all(isinstance(c, str) and HEX_RE.match(c) for c in liberi)
    ):
        colori = [c.upper() for c in liberi]
        out["palette_id"] = "miei"
        out["colors"] = colori
        out["colore_primario"], out["colore_secondario"], out["colore_accento"] = colori

    if "tone_of_voice" not in out:
        # La bozza si salva di qualunque lunghezza (chi scrive piano non perde il testo se
        # chiude la pagina); i TONO_MIN caratteri servono solo per INVIARE (vedi `mancanti`).
        voce = " ".join(str(valori.get("tone_of_voice") or "").split())[:TONO_MAX]
        if voce:
            out["tone_of_voice"] = voce

    for chiave, massimo, lunghezza in (
        ("espressioni", ESPRESSIONI_MAX, ESPRESSIONE_MAX),
        ("parole_evitare", PAROLE_EVITARE_MAX, MAX_PAROLA),
    ):
        lista = valori.get(chiave)
        if isinstance(lista, list):
            out[chiave] = [" ".join(str(p).split())[:lunghezza] for p in lista if str(p or "").strip()][:massimo]

    emozioni = valori.get("emozioni")
    if isinstance(emozioni, list):
        out["emozioni"] = [e for e in dict.fromkeys(emozioni) if e in EMOZIONI][:EMOZIONI_MAX]

    scala = valori.get("tono_scale")
    if isinstance(scala, list) and len(scala) == TONO_COPPIE and all(isinstance(v, int) and 0 <= v <= 4 for v in scala):
        out["tono_scale"] = scala

    parole = valori.get("parole_chiave")
    if isinstance(parole, list):
        out["parole_chiave"] = [str(p).strip()[:MAX_PAROLA] for p in parole if str(p or "").strip()][:PAROLE_MAX]

    for chiave in ("logo_url", "foto_url"):
        if chiave in valori:
            out[chiave] = _url_ok(valori.get(chiave))
    return out


def mancanti(dati: dict[str, Any]) -> list[str]:
    """Le scelte obbligatorie non ancora fatte. Logo, foto e lettere sono facoltativi
    (le lettere, se mancano, sono Poppins: il brand kit EVO non le chiede)."""
    assenti = []
    if not dati.get("colore_primario"):
        assenti.append("palette_id")
    if len(str(dati.get("tone_of_voice") or "").strip()) < TONO_MIN:
        assenti.append("tono_id")
    if len([p for p in (dati.get("parole_chiave") or []) if str(p).strip()]) < PAROLE_MIN:
        assenti.append("parole_chiave")
    return assenti
