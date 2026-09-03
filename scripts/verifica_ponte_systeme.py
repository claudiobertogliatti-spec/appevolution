#!/usr/bin/env python3
"""
Il ponte Ciak -> Systeme sta producendo, o gira a vuoto?

Perche' esiste (3/9/2026): la chiave Systeme e' stata sostituita in produzione e
lo script di installazione ha detto "OK". Ma "la chiave risponde 200" e "gli
iscritti arrivano nella lista email" sono due affermazioni diverse, e in Ciak la
seconda e' quella che conta: l'invio e' fire-and-forget (`asyncio.create_task`),
quindi un fallimento non ferma l'iscrizione e non si vede da nessuna parte.

E' il difetto di famiglia descritto in [[ciak_collaudo_catene]]: il pezzo gira,
dichiara successo, non produce niente. Qui si guarda il FONDO della catena --
chi e' davvero atterrato in Systeme e quando -- non l'esecuzione.

⛔ La chiave si rilegge dal servizio e non viene mai stampata.

Uso:
    python scripts/verifica_ponte_systeme.py
    python scripts/verifica_ponte_systeme.py --giorni 30
"""

import argparse
import io
import json
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

SERVIZIO = "evolution-pro-backend"
REGIONE = "europe-west1"
PROGETTO = "gen-lang-client-0744698012"
BASE = "https://api.systeme.io/api"
# ⚠️ Systeme rifiuta limit < 10 con un 422 che sembra un problema di chiave.
LIMITE = 100


# Su Windows lo stdout predefinito e' cp1252 e una sola emoji fa morire lo
# strumento con UnicodeEncodeError -- dopo aver gia' stampato la diagnosi,
# quindi con un codice di uscita che dice 'fallito' su un lavoro riuscito.
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def chiave_dal_servizio(nome: str = "SYSTEME_API_KEY") -> str:
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
        if e["name"] == nome:
            if "value" not in e:
                raise SystemExit(f"ERRORE: {nome} e' un secret, non un valore inline.")
            return e["value"]
    raise SystemExit(f"ERRORE: {nome} non e' impostata sul servizio.")


def chiedi(chiave: str, path: str, params: dict):
    url = f"{BASE}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"X-API-Key": chiave})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        # Solo 401/403 parlano della credenziale: tutto il resto arriva DOPO
        # l'autenticazione, quindi la chiave ha gia' funzionato.
        return e.code, {"errore": e.read().decode()[:300]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--giorni", type=int, default=40, help="finestra da guardare")
    args = ap.parse_args()

    chiave = chiave_dal_servizio()
    print(f"Chiave letta dal servizio {SERVIZIO} ({len(chiave)} caratteri, mai stampata).\n")

    stato, dati = chiedi(chiave, "contacts", {"limit": LIMITE, "order": "desc"})
    if stato in (401, 403):
        raise SystemExit(f"⛔ HTTP {stato}: Systeme RIFIUTA la chiave del servizio. Il ponte e' chiuso.")
    if stato != 200:
        raise SystemExit(f"HTTP {stato} — autenticazione passata, richiesta da correggere: {dati}")

    items = dati.get("items", []) if isinstance(dati, dict) else dati
    print(f"HTTP 200 — Systeme accetta la chiave del servizio. Contatti letti: {len(items)}\n")

    soglia = datetime.now(timezone.utc) - timedelta(days=args.giorni)
    righe = []
    for c in items:
        grezza = c.get("registeredAt") or c.get("createdAt") or ""
        try:
            quando = datetime.fromisoformat(grezza.replace("Z", "+00:00"))
        except ValueError:
            continue
        tags = [t.get("name") for t in (c.get("tags") or [])]
        righe.append((quando, c.get("email", "?"), tags))

    righe.sort(reverse=True)
    if not righe:
        print("⛔ Nessun contatto con data leggibile.")
        return 1

    piu_recente = righe[0][0]
    eta = (datetime.now(timezone.utc) - piu_recente).days
    print(f"Contatto piu' recente in Systeme: {piu_recente.date()}  ({eta} giorni fa)")

    recenti = [r for r in righe if r[0] >= soglia]
    print(f"Contatti registrati negli ultimi {args.giorni} giorni: {len(recenti)}\n")
    for quando, email, tags in recenti[:15]:
        mascherata = email[:2] + "***" + email[email.find("@"):] if "@" in email else email
        print(f"  {quando.date()}  {mascherata:<28} tag: {', '.join(tags) or '(nessuno)'}")

    print()
    if eta <= 1:
        print("✅ IL PONTE PRODUCE: e' arrivato qualcuno oggi/ieri.")
    else:
        print(f"⚠️  Ultimo arrivo {eta} giorni fa. La chiave funziona, ma da allora")
        print("    o non si e' iscritto nessuno, o il ponte non passa. Le due cose")
        print("    si distinguono guardando gli opt-in in Ciak nello stesso periodo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
