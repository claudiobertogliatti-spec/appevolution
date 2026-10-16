"""PreToolUse hook: scan outgoing commits with gitleaks before `git push`.

The repo is public: a secret pushed to any branch is exposed the moment it
reaches GitHub, before CI (which also runs gitleaks) has a chance to fail.
This hook scans only the commits that are about to leave the machine
(`@{upstream}..HEAD`, or `origin/main..HEAD` for a new branch) with the repo's
own .gitleaks.toml, and blocks the push if it finds anything.

If gitleaks is not installed the push goes ahead with a warning
(install: `winget install Gitleaks.Gitleaks`).
"""
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import command_of, deny, git, read_event, target_dir, warn  # noqa: E402

GIT_PUSH = re.compile(r"\bgit\b(\s+-C\s+\S+)?[^\n|;&]*\bpush\b")


def find_gitleaks():
    exe = shutil.which("gitleaks")
    if exe:
        return exe
    local = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\gitleaks.exe")
    return local if os.path.exists(local) else None


def main():
    event = read_event()
    command = command_of(event)
    if not GIT_PUSH.search(command):
        return

    repo = target_dir(event, command)
    top = (git(repo, "rev-parse", "--show-toplevel") or "").strip()
    if not top:
        return

    exe = find_gitleaks()
    if not exe:
        warn("gitleaks non installato: push NON controllato per segreti "
             "(winget install Gitleaks.Gitleaks).")

    has_upstream = git(top, "rev-parse", "--abbrev-ref", "@{upstream}") is not None
    commit_range = "@{upstream}..HEAD" if has_upstream else "origin/main..HEAD"
    if not (git(top, "rev-list", commit_range) or "").strip():
        return  # nothing new to push

    cmd = [exe, "git", top, "--log-opts=" + commit_range, "--redact", "--no-banner", "--exit-code", "1"]
    config = os.path.join(top, ".gitleaks.toml")
    if os.path.exists(config):
        cmd += ["-c", config]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                             errors="replace", timeout=120)
    except Exception as exc:
        warn(f"gitleaks non eseguito ({exc}): push NON controllato per segreti.")

    if res.returncode == 1:
        report = (res.stdout + res.stderr).strip()[-3000:]
        deny(
            "Push bloccato: gitleaks ha trovato possibili segreti nei commit "
            f"in uscita ({commit_range}). Il repo e' pubblico: rimuovi il segreto dal "
            "commit (non basta un commit successivo che lo cancella) e ruota la "
            "credenziale se e' reale.\n\n" + report
        )
    if res.returncode != 0:
        warn(f"gitleaks e' uscito con codice {res.returncode}: push NON controllato. "
             + (res.stderr or "").strip()[-500:])


if __name__ == "__main__":
    main()
