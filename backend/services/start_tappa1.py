"""Tappa 1 di Ciak Start: posizionamento e marchio, come materiali del cliente.

Fino a qui la tappa 1 non aveva un prodotto nel sistema: il team doveva fare i
documenti a mano e segnarli "consegnati", e il cliente non vedeva niente in area.
Qui nascono i due materiali, con lo stesso ciclo degli altri (bozza -> approvazione
del team -> visibile al cliente):

  - `positioning`: la frase di posizionamento e i suoi cinque elementi, dalle
    risposte del cliente;
  - `brand_kit`: il marchio come l'ha scelto il cliente (colori, lettere, voce,
    parole, logo, foto). Nessuna AI: e' la sua scelta, messa in ordine.

Regola: questi documenti NON riscrivono mai `data` dello step 03/04, che contiene
le risposte e le scelte del cliente (a differenza degli altri output Start, lo
step qui e' anche l'archivio dell'input).
"""
from __future__ import annotations

from typing import Any

from services.ciak_start_marchio import FONT, PALETTE, TONI


def build_start_positioning(statement: dict[str, Any], answers: dict[str, Any]) -> dict[str, Any]:
    """Posizionamento del cliente: frase e cinque elementi (gia' sintetizzati)."""
    elementi = {
        k: " ".join(str(statement.get(k) or "").split())
        for k in ("brand", "categoria", "idea_differenziante", "a_differenza_di", "vantaggio_cliente")
    }
    return {
        "type": "positioning",
        "status": "ready_for_review",
        "frase": " ".join(str(statement.get("frase") or "").split()),
        "elementi": elementi,
        # Se la sintesi automatica non e' riuscita, lo si dice (il team la compone a mano).
        "fallback": bool(statement.get("_fallback")),
        "promessa": " ".join(str(answers.get("promessa") or "").split()),
    }


def build_start_brand(data: dict[str, Any]) -> dict[str, Any]:
    """Il marchio scelto dal cliente, in una scheda pronta da approvare e mostrare."""
    palette = next((p for p in PALETTE if p["id"] == data.get("palette_id")), None)
    font = next((f for f in FONT if f["id"] == data.get("font_id")), None)
    tono = next((t for t in TONI if t["id"] == data.get("tono_id")), None)
    colori = list(data.get("colors") or (palette or {}).get("colori") or [])
    return {
        "type": "brand_kit",
        "status": "ready_for_review",
        "palette": {
            "nome": (palette or {}).get("nome") or "I tuoi colori",
            "colori": colori,
        },
        "font": {
            "nome": (font or {}).get("nome") or data.get("font") or "",
            "famiglia": data.get("font") or (font or {}).get("famiglia") or "",
        },
        "tono": {"nome": (tono or {}).get("nome") or "", "frase": data.get("tone_of_voice") or ""},
        "parole_chiave": [str(p) for p in (data.get("parole_chiave") or []) if str(p).strip()],
        "logo_url": data.get("logo_url") or "",
        "foto_url": data.get("foto_url") or "",
    }
