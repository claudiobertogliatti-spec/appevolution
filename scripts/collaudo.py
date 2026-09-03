#!/usr/bin/env python3
"""
Legge il collaudo delle catene di Ciak dalla produzione, senza token admin.

Perche' esiste (3/9/2026 sera): misurare lo stato delle catene richiedeva un JWT
admin che dura 24 ore, quindi ogni verifica passava da Claudio che apriva il
browser e copiava un token. Il collo di bottiglia dichiarato in
[[ciak_collaudo_catene]]: la diagnosi procedeva a singhiozzo.

Ma l'endpoint /api/admin/ciak/collaudo accetta gia' `require_admin_or_report_key`,
cioe' anche la chiave di SOLA LETTURA nata per il briefing di Luca. La chiave vive
sul servizio Cloud Run: si rilegge da li' invece di tenerne una copia sul disco.

⛔ La chiave non viene mai stampata.

Uso:
    python scripts/collaudo.py
    python scripts/collaudo.py --json          # output grezzo
    python scripts/collaudo.py --salva out.json
"""

import argparse
import json
import subprocess
import shutil
import sys
import urllib.error
import urllib.request

SERVIZIO = "evolution-pro-backend"
REGIONE = "europe-west1"
PROGETTO = "gen-lang-client-0744698012"
BASE = "https://www.ciak.io"
PATH_DEFAULT = "/api/admin/ciak/collaudo"
# Gli endpoint che accettano la chiave di sola lettura (grep
# `require_admin_or_report_key`): non sono due come diceva la nota del 30/7,
# sono almeno questi. Tutti GET, nessuno scrive.
NOTI = {
    "collaudo": "/api/admin/ciak/collaudo",
    "acquisizione": "/api/admin/ciak/acquisizione-command-center",
    "funnel": "/api/admin/ciak/funnel-metrics",
    "luca": "/api/admin/luca/daily-report",
}


def chiave_dal_servizio() -> str:
    """Rilegge LUCA_REPORT_KEY dalla revisione che serve il traffico."""
    gcloud = shutil.which("gcloud")
    if not gcloud:
        raise SystemExit("ERRORE: gcloud non e' nel PATH.")
    esito = subprocess.run(
        [gcloud, "run", "services", "describe", SERVIZIO,
         "--region", REGIONE, "--project", PROGETTO,
         "--format", "json(spec.template.spec.containers[0].env)"],
        capture_output=True, text=True, shell=False,
    )
    if esito.returncode != 0:
        raise SystemExit(f"ERRORE gcloud:\n{esito.stderr[-400:]}")
    envs = json.loads(esito.stdout)["spec"]["template"]["spec"]["containers"][0]["env"]
    for e in envs:
        if e["name"] == "LUCA_REPORT_KEY":
            if "value" not in e:
                raise SystemExit("ERRORE: LUCA_REPORT_KEY e' un secret, non un valore inline.")
            return e["value"]
    raise SystemExit("ERRORE: LUCA_REPORT_KEY non e' impostata sul servizio.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="stampa il JSON grezzo")
    ap.add_argument("--salva", help="salva il JSON in un file")
    ap.add_argument("--che", default="collaudo", choices=sorted(NOTI),
                    help="quale report leggere")
    ap.add_argument("--path", help="path arbitrario, se non e' fra quelli noti")
    args = ap.parse_args()

    path = args.path or NOTI[args.che]
    req = urllib.request.Request(BASE + path, headers={"X-Report-Key": chiave_dal_servizio()})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            dati = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ERRORE HTTP {e.code}: {e.read().decode()[:400]}")

    if args.salva:
        with open(args.salva, "w", encoding="utf-8") as f:
            json.dump(dati, f, indent=2, ensure_ascii=False)
        print(f"Salvato in {args.salva}")
    if args.json or not args.salva:
        print(json.dumps(dati, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
