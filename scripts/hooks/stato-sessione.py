#!/usr/bin/env python3
"""Hook SessionStart: mette davanti agli occhi lo stato del repo e l'ultima staffetta.

PROTOCOL.md §6 dice di leggere HANDOFF.md prima di tutto. Era una speranza: un agente
che non lo faceva non se ne accorgeva nessuno. Adesso l'ultima voce arriva da sola,
insieme a branch, ultimo commit e stato del working tree.

Volutamente corto: se stampa mezza pagina, smette di essere letto — lo stesso errore
che aveva gonfiato CLAUDE.md a 1320 righe.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HANDOFF = REPO / "docs/agents/HANDOFF.md"
MAX_RIGHE_VOCE = 14


def git(*argomenti: str) -> str:
    try:
        return subprocess.run(
            ["git", *argomenti],
            cwd=REPO,
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def ultima_voce_handoff() -> str:
    """La prima voce `### AAAA-MM-GG · ...` del file, troncata."""
    if not HANDOFF.exists():
        return "⛔ docs/agents/HANDOFF.md non trovato."

    righe = HANDOFF.read_text(encoding="utf-8").splitlines()
    inizio = next(
        (i for i, r in enumerate(righe) if re.match(r"^### \d{4}-\d{2}-\d{2} ", r)),
        None,
    )
    if inizio is None:
        return "⛔ Nessuna voce datata in HANDOFF.md."

    voce = []
    for riga in righe[inizio : inizio + MAX_RIGHE_VOCE]:
        if voce and riga.startswith("### "):
            break
        voce.append(riga)
    return "\n".join(voce).rstrip() + f"\n  […] resto in {HANDOFF.relative_to(REPO)}"


def main() -> int:
    branch = git("rev-parse", "--abbrev-ref", "HEAD") or "?"
    commit = git("log", "-1", "--format=%h %ad %s", "--date=short") or "?"
    sporchi = [r for r in git("status", "--porcelain").splitlines() if r]

    stato_tree = (
        "working tree pulito"
        if not sporchi
        else f"{len(sporchi)} file non committati (`git status --short`)"
    )

    contesto = f"""Stato del repo Evolution PRO / Ciak all'avvio della sessione:

- Branch: `{branch}` · {stato_tree}
- Ultimo commit: {commit}
- ⚠️ `main` e' in produzione: un push su `main` fa partire CI e deploy backend.

Ultima voce di HANDOFF.md (la staffetta fra agenti — va aggiornata prima di chiudere):

{ultima_voce_handoff()}

Ordine di lettura se non l'hai gia' fatto: docs/agents/PROTOCOL.md -> HANDOFF.md -> CLAUDE.md.
Prima di toccare dati partner: memory/CIAK_MIGRATION_MEMORY.md per intero."""

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": contesto,
            },
            "suppressOutput": True,
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
