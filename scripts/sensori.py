#!/usr/bin/env python3
"""
Sensori Python del briefing di Luca: leggono cio' che si raggiunge via HTTP.

Le fonti che vivono dietro un tool MCP (Meta Ads, Meta Social, Systeme) NON
stanno qui: quei tool esistono solo dentro la sessione dell'agente, non in un
processo Python headless. Le legge Luca stesso, guidato da SKILL.md, e produce
buste con la stessa identica forma di queste.

Solo stdlib: questo script gira su una macchina dove non si installa nulla.
"""
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

CHIAVI_BUSTA = ("fonte", "ok", "letto_a", "dati", "errore")
TIMEOUT_SECONDS = 60

_SPIEGAZIONI_HTTP = {
    401: "chiave assente o non configurata sul server",
    403: "chiave non valida per questo endpoint",
    503: "il backend non ha il database collegato",
}


def busta(fonte, ok, dati=None, errore=None):
    """La forma unica di ogni lettura, da qualunque sensore arrivi.

    Chi consuma non deve sapere se il dato viene da HTTP o da un tool MCP.
    """
    return {
        "fonte": fonte,
        "ok": bool(ok),
        "letto_a": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dati": dati if dati is not None else {},
        "errore": errore,
    }


def _fetch_http(url, key):
    request = urllib.request.Request(
        url, headers={"X-Report-Key": key, "Accept": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def leggi_ciak(base_url, key, path, nome, fetch_fn=None):
    """Legge un endpoint di sola lettura di Ciak con la chiave X-Report-Key."""
    fetch_fn = fetch_fn or _fetch_http
    url = f"{base_url.rstrip('/')}{path}"
    try:
        return busta(nome, True, fetch_fn(url, key))
    except urllib.error.HTTPError as err:
        spiegazione = _SPIEGAZIONI_HTTP.get(err.code, "risposta inattesa dal backend")
        return busta(nome, False, errore=f"HTTP {err.code} ({spiegazione})")
    except urllib.error.URLError as err:
        return busta(nome, False, errore=f"backend irraggiungibile: {err.reason}")
    except (ValueError, OSError) as err:
        return busta(nome, False, errore=f"risposta illeggibile: {err}")


URL_SITO = (
    "https://www.ciak.io/",
    "https://www.ciak.io/masterclass",
    "https://www.ciak.io/api/health",
)
TIMEOUT_SITO = 20


def _fetch_status(url):
    request = urllib.request.Request(url, headers={"User-Agent": "briefing-luca"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SITO) as response:
        return response.status


def leggi_sito(urls=URL_SITO, fetch_fn=None):
    """Misura status code e tempo di risposta delle pagine che devono essere vive.

    Nessun parsing del contenuto: un funnel che risponde 200 con la pagina
    sbagliata e' un problema di Fase 2, non di questo sensore.
    """
    fetch_fn = fetch_fn or _fetch_status
    esiti = {}
    for url in urls:
        inizio = time.monotonic()
        try:
            status, errore = fetch_fn(url), None
        except urllib.error.HTTPError as err:
            status, errore = err.code, None
        except (urllib.error.URLError, OSError) as err:
            status, errore = None, f"non raggiunto: {getattr(err, 'reason', err)}"
        esiti[url] = {
            "status": status,
            "ms": round((time.monotonic() - inizio) * 1000),
            "errore": errore,
        }
    tutte_ok = all(e["status"] == 200 for e in esiti.values())
    return busta("sito", True, {"url": esiti, "tutte_ok": tutte_ok})
