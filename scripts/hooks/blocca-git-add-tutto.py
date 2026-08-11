#!/usr/bin/env python3
"""Hook PreToolUse (Bash): blocca `git add .` e `git add -A`.

PROTOCOL.md §3.1 lo vieta da sempre, ma era una regola affidata alla buona volonta'
di chi legge: il repo contiene artefatti locali, archivi e file di credenziali, e un
`add .` li spedisce su un repository pubblico. Qui la regola smette di dipendere dalla
memoria e diventa un rifiuto del tool.

Blocca solo l'aggiunta indiscriminata. `git add <file>`, `git add ./backend/x.py`,
`git add .gitignore` passano: sono esattamente il modo giusto di lavorare.

Input: JSON dell'hook su stdin. Output: JSON con permissionDecision, oppure niente.
"""

import json
import re
import sys

# Segmenta sui separatori di shell: `cd x && git add .` va intercettato come `git add .`.
SEPARATORI = re.compile(r"&&|\|\||[;\n|]")
INIZIO_GIT_ADD = re.compile(r"^git\s+add\b(.*)$", re.DOTALL)


def aggiunge_tutto(argomenti: str) -> bool:
    """True se fra gli argomenti di `git add` ce n'e' uno che significa "tutto"."""
    for token in argomenti.split():
        if token in (".", "--all", "-A"):
            return True
        # Flag corti raggruppati: -Av, -uA, ...
        if token.startswith("-") and not token.startswith("--") and "A" in token:
            return True
    return False


def main() -> int:
    try:
        dati = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # payload illeggibile: non e' compito di questo hook fallire

    comando = (dati.get("tool_input") or {}).get("command") or ""

    for segmento in SEPARATORI.split(comando):
        match = INIZIO_GIT_ADD.match(segmento.strip())
        if match and aggiunge_tutto(match.group(1)):
            json.dump(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": (
                            "PROTOCOL.md §3.1: mai `git add .` o `git add -A` su questo repo. "
                            "Contiene artefatti locali, archivi e file di credenziali, ed e' "
                            "pubblico. Aggiungi i file per nome: `git add <file> <file>`. "
                            "Usa `git status --short` per vedere cosa c'e' da aggiungere."
                        ),
                    }
                },
                sys.stdout,
            )
            return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
