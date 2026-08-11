#!/usr/bin/env python3
"""Hook Stop: ricorda di aggiornare HANDOFF.md quando ci sono commit che non lo toccano.

"Chi non aggiorna l'handoff rompe la catena per tutti gli altri" (PROTOCOL.md §1). Il
promemoria arriva solo se serve davvero: ci sono commit oltre la base e nessuno di
questi ha toccato la staffetta. Non blocca mai — al massimo scrive una riga.

Se non c'e' nulla da ricordare l'hook non stampa niente: un promemoria a ogni stop
verrebbe ignorato dopo due giorni.
"""

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HANDOFF = "docs/agents/HANDOFF.md"


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


def base() -> str:
    """Il ramo da cui misurare il lavoro di questa sessione."""
    for riferimento in ("origin/main", "main"):
        if git("rev-parse", "--verify", "--quiet", riferimento):
            return riferimento
    return ""


def main() -> int:
    riferimento = base()
    if not riferimento:
        return 0

    commit = [r for r in git("log", "--format=%h", f"{riferimento}..HEAD").splitlines() if r]
    if not commit:
        return 0  # niente di nuovo rispetto alla base: nulla da raccontare

    toccato_nei_commit = bool(
        git("log", "--format=%h", f"{riferimento}..HEAD", "--", HANDOFF)
    )
    toccato_nel_working_tree = bool(git("status", "--porcelain", "--", HANDOFF))

    if toccato_nei_commit or toccato_nel_working_tree:
        return 0

    json.dump(
        {
            "systemMessage": (
                f"📋 {len(commit)} commit su questo branch, nessuno tocca {HANDOFF}. "
                "PROTOCOL.md §1: la staffetta va aggiornata prima di chiudere. "
                "Voce nuova in cima, con DICHIARATO e VERIFICATO separati, e APERTO per "
                "cio' che resta."
            )
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
