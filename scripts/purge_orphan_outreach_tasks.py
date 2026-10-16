#!/usr/bin/env python3
"""
Pulisce dalla coda approvazioni i task-guscio di outreach automatico orfano
(`valentina_auto_*` / type `auto_outreach_lead`) creati da `daily_hot_leads_outreach`
quando `discovery_leads` era vuota/churning. Sono senza titolo/descrizione e senza
consumatore: intasano "Cosa aspetta il tuo OK" e non producono niente.

Usa l'API sanzionata dell'app (`/api/agent-tasks/{id}/dismiss`, shippato con questa PR),
non tocca il DB direttamente. Dry-run di default; con --apply scarta davvero.

Uso:
    python scripts/purge_orphan_outreach_tasks.py            # dry-run: elenca cosa scarterebbe
    python scripts/purge_orphan_outreach_tasks.py --apply    # scarta
    python scripts/purge_orphan_outreach_tasks.py --base https://www.ciak.io --apply
"""
import argparse
import io
import sys
import urllib.request
import json

# Windows cp1252 uccide le emoji su stdout: forza UTF-8 (come collaudo.py).
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass

BASE_DEFAULT = "https://www.ciak.io"
REVIEWER = "Claudio"
REASON = "Scartato: task automatico orfano (lead inesistente in discovery_leads). Pulizia coda approvazioni."


def _get(url: str):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def _post(url: str, payload: dict):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def is_orphan(t: dict) -> bool:
    tid = str(t.get("id") or t.get("task_id") or "")
    return tid.startswith("valentina_auto_") or t.get("type") == "auto_outreach_lead"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE_DEFAULT)
    ap.add_argument("--apply", action="store_true", help="scarta davvero (senza, e' dry-run)")
    args = ap.parse_args()

    data = _get(args.base + "/api/agent-tasks/approvals")
    tasks = data.get("tasks", [])
    orfani = [t for t in tasks if is_orphan(t)]

    print(f"Coda approvazioni: {len(tasks)} task, di cui orfani da scartare: {len(orfani)}")
    for t in orfani:
        print("  -", t.get("id") or t.get("task_id"), "|", t.get("agent"), "|", t.get("title") or "(senza titolo)")

    if not args.apply:
        print("\nDRY-RUN: nessuna azione. Rilancia con --apply per scartare.")
        return 0

    ok = ko = 0
    for t in orfani:
        tid = t.get("id") or t.get("task_id")
        try:
            r = _post(args.base + f"/api/agent-tasks/{tid}/dismiss", {"reviewer": REVIEWER, "reason": REASON})
            if r.get("status") == "dismissed":
                ok += 1
            else:
                ko += 1
                print("  inatteso:", tid, "->", r.get("status"))
        except Exception as e:
            ko += 1
            print("  ERRORE", tid, ":", e)

    after = _get(args.base + "/api/agent-tasks/approvals")
    print(f"\nScartati: {ok} | falliti: {ko}")
    print(f"Coda ora: {after.get('count')} task")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
