"""Shared helpers for the Claude Code hooks of this repo.

A PreToolUse hook receives the tool call as JSON on stdin. These helpers work
out which git checkout a Bash command is aimed at, so the hooks behave the same
from the main checkout, from a worktree, or with `git -C <path>` / `cd <path> &&`.
"""
import json
import re
import shlex
import subprocess
import sys


def read_event():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def command_of(event):
    return str((event.get("tool_input") or {}).get("command") or "")


def target_dir(event, command):
    """Directory the command runs in: `git -C <p>` > leading `cd <p> &&` > hook cwd."""
    m = re.search(r"\bgit\s+-C\s+(\"[^\"]+\"|'[^']+'|\S+)", command)
    if not m:
        m = re.match(r"\s*cd\s+(\"[^\"]+\"|'[^']+'|[^\s;&]+)\s*(&&|;)", command)
    if m:
        try:
            return shlex.split(m.group(1))[0]
        except ValueError:
            return m.group(1).strip("\"'")
    return event.get("cwd") or "."


def git(repo, *args):
    """Run git in `repo`; return stdout, or None if git fails."""
    try:
        out = subprocess.run(
            ["git", "-C", repo, *args],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
        )
    except Exception:
        return None
    return out.stdout if out.returncode == 0 else None


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def warn(message):
    """Let the command run, but show a message to the user."""
    print(json.dumps({"systemMessage": message}))
    sys.exit(0)
