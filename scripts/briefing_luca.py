#!/usr/bin/env python3
"""
Scarica i dati del briefing mattutino di Luca (AD) senza browser e senza login.

Perche' esiste: il briefing delle 7:45 girava dentro una tab Chrome loggata su
ciak.io/admin, leggendo il JWT dal localStorage. Quel canale e' interattivo: se
il browser non e' connesso o il token e' scaduto (dura 24h) il briefing salta.
Il 30/7/2026 e' saltato esattamente cosi'.

Questo script parla direttamente col backend usando la chiave di sola lettura
(header X-Report-Key), quindi funziona headless.

Uso:
    python scripts/briefing_luca.py            # legge LUCA_REPORT_KEY dall'ambiente
    python scripts/briefing_luca.py --base-url http://localhost:8001

Stampa su stdout un unico JSON {"report": ..., "acq": ...}.
Esce con codice != 0 e un messaggio chiaro su stderr se i dati non sono
disponibili: meglio fallire in modo evidente che produrre un briefing a meta'.
Solo stdlib: nessuna dipendenza da installare sulla macchina che lo esegue.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "https://www.ciak.io"
ENDPOINTS = {
    "report": "/api/admin/luca/daily-report",
    "acq": "/api/admin/ciak/acquisizione-command-center",
}
TIMEOUT_SECONDS = 60


def fetch(base_url, path, key):
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"X-Report-Key": key, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="Dati del briefing mattutino di Luca")
    parser.add_argument(
        "--base-url", default=os.environ.get("CIAK_BASE_URL", DEFAULT_BASE_URL)
    )
    args = parser.parse_args()

    key = os.environ.get("LUCA_REPORT_KEY", "")
    if not key:
        print(
            "LUCA_REPORT_KEY non e' impostata su questa macchina: senza chiave non si "
            "leggono i dati del briefing.",
            file=sys.stderr,
        )
        return 2

    out = {}
    for name, path in ENDPOINTS.items():
        try:
            out[name] = fetch(args.base_url, path, key)
        except urllib.error.HTTPError as err:
            hint = {
                401: "chiave assente o non configurata sul server",
                403: "chiave non valida per questo endpoint",
                503: "il backend non ha il database collegato",
            }.get(err.code, "risposta inattesa dal backend")
            print(f"{path} -> HTTP {err.code} ({hint})", file=sys.stderr)
            return 1
        except urllib.error.URLError as err:
            print(f"{path} -> backend irraggiungibile: {err.reason}", file=sys.stderr)
            return 1

    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
