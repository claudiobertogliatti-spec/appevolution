"""Pubblicazione della bozza del funnel su Vercel (anteprima per il partner).

Pubblica file statici come progetto Vercel e restituisce l'indirizzo *.vercel.app.
Richiede la variabile d'ambiente VERCEL_TOKEN (opzionale VERCEL_TEAM_ID). Senza token non fa nulla
e lo dice in modo chiaro. Non tocca mai domini di partner: solo *.vercel.app.
"""
import os
import re
import unicodedata
from typing import Dict, List, Optional

import httpx

from services.partner_step_materials import allowed_funnel_preview_url

API = "https://api.vercel.com/v13/deployments"
PREFIX = "ciak-funnel-"
TIMEOUT = 60.0


class DeployError(RuntimeError):
    """Errore comprensibile per il team (mai il token)."""


def project_name(partner_id: str, nome: str = "") -> str:
    """Nome progetto Vercel: minuscolo, solo lettere/numeri/trattini, max 52 caratteri."""
    base = unicodedata.normalize("NFKD", nome or "").encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", f"{base}-{partner_id}".lower()).strip("-")
    return (PREFIX + slug)[:52].strip("-")


def prepare_files(files: Dict[str, str]) -> List[Dict[str, str]]:
    """File per l'API Vercel. La pagina di vendita del generatore diventa «offerta.html», cioè
    la pagina «L'offerta» della revisione. Le altre pagine della revisione (masterclass,
    grazie) non hanno ancora un generatore: vedi missing_pages()."""
    out = dict(files)
    if "vendita.html" in out and "offerta.html" not in out:
        out["offerta.html"] = out.pop("vendita.html")
    return [{"file": name, "data": html, "encoding": "utf-8"} for name, html in sorted(out.items())]


def missing_pages(files: Dict[str, str], pages) -> List[str]:
    """Pagine della revisione il cui file non viene pubblicato."""
    names = {f["file"] for f in prepare_files(files)}
    return [p["id"] for p in pages if (p["path"].lstrip("/") or "index.html") not in names]


def preview_address(resp: dict, name: str) -> Optional[str]:
    """Indirizzo pubblico stabile *.vercel.app (alias del progetto), altrimenti quello della versione."""
    cands = [f"https://{a}" for a in (resp.get("alias") or [])] + [f"https://{name}.vercel.app"]
    if resp.get("url"):
        cands.append(f"https://{resp['url']}")
    for c in cands:
        if allowed_funnel_preview_url(c):
            return c
    return None


async def deploy(files: Dict[str, str], name: str, client: Optional[httpx.AsyncClient] = None) -> Dict[str, str]:
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if not token:
        raise DeployError("VERCEL_TOKEN non è impostato sul backend.")
    params = {"skipAutoDetectionConfirmation": "1"}
    team = os.environ.get("VERCEL_TEAM_ID", "").strip()
    if team:
        params["teamId"] = team
    body = {"name": name, "files": prepare_files(files), "target": "production",
            "projectSettings": {"framework": None}}
    own = client is None
    client = client or httpx.AsyncClient(timeout=TIMEOUT)
    try:
        r = await client.post(API, params=params, json=body, headers={"Authorization": f"Bearer {token}"})
    except httpx.HTTPError as e:
        raise DeployError(f"Vercel non raggiungibile: {type(e).__name__}") from e
    finally:
        if own:
            await client.aclose()
    if r.status_code >= 400:
        try:
            msg = (r.json().get("error") or {}).get("message") or ""
        except ValueError:
            msg = ""
        raise DeployError(f"Vercel ha rifiutato la pubblicazione ({r.status_code}). {msg}".strip())
    data = r.json()
    url = preview_address(data, name)
    if not url:
        raise DeployError("Vercel non ha restituito un indirizzo *.vercel.app.")
    return {"url": url, "deployment_id": data.get("id", ""), "state": data.get("readyState", "")}
