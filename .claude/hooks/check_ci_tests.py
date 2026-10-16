"""PreToolUse hook: block `gh pr create` when a new test file would not run in CI.

A test can be silently skipped in two ways, and CI stays green in both:
  1. .github/workflows/ci.yml does not use test discovery: it runs an explicit
     list of backend files (pytest) and one of frontend files (jest). A file
     missing from that list never runs.
  2. backend/tests/conftest.py skips every backend test not marked `unit`
     when REACT_APP_BACKEND_URL is unset (always, in CI). A listed file without
     `pytestmark = pytest.mark.unit` shows up as "skipped", not as a failure.

This hook looks at the test files the branch ADDS compared to origin/main and
denies the PR if one of them hits either case.

Exempt on purpose (they need a live backend):
  - backend files that reference REACT_APP_BACKEND_URL or pytest.mark.integration
    and are NOT marked `unit`
  - any file containing the marker `ci-exempt` (write why next to it)
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import command_of, deny, git, read_event, target_dir  # noqa: E402

PR_CREATE = re.compile(r"\bgh\b[^\n|;&]*\bpr\s+create\b")
BACKEND_TEST = re.compile(r"^backend/(tests/test_[^/]+\.py)$")
FRONTEND_TEST = re.compile(r"^frontend/src/.*/([^/]+\.test\.jsx?)$|^frontend/src/([^/]+\.test\.jsx?)$")
INTEGRATION_MARKERS = ("REACT_APP_BACKEND_URL", "pytest.mark.integration")
UNIT_MARKER = re.compile(r"pytest\.mark\.unit\b")


def _is_suffix(token, path):
    """True if `token` names `path`: equal to it or to its tail after a '/'."""
    return path == token or path.endswith("/" + token)


def main():
    event = read_event()
    command = command_of(event)
    if not PR_CREATE.search(command):
        return

    repo = target_dir(event, command)
    top = (git(repo, "rev-parse", "--show-toplevel") or "").strip()
    if not top:
        return
    ci_path = os.path.join(top, ".github", "workflows", "ci.yml")
    if not os.path.exists(ci_path):
        return
    with open(ci_path, encoding="utf-8") as fh:
        ci = fh.read()

    # Every test path/pattern named in ci.yml: `tests/test_x.py`, `Foo.test.jsx`,
    # `admin/api.test.js`. jest treats them as patterns matched against the path.
    ci_tokens = set(re.findall(r"[\w./-]+(?:\.test\.jsx?|/test_\w+\.py)\b", ci))

    added = git(top, "diff", "--name-only", "--diff-filter=A", "origin/main...HEAD")
    if added is None:
        return

    missing, unmarked = [], []
    for path in added.splitlines():
        b = BACKEND_TEST.match(path)
        f = FRONTEND_TEST.match(path)
        if not (b or f):
            continue
        full = os.path.join(top, path)
        try:
            with open(full, encoding="utf-8", errors="replace") as fh:
                body = fh.read()
        except OSError:
            continue  # added then removed in a later commit
        if "ci-exempt" in body:
            continue
        if b and not UNIT_MARKER.search(body):
            if not any(m in body for m in INTEGRATION_MARKERS):
                unmarked.append(path)
            continue  # integration test: needs a live backend, not for CI
        if not any(_is_suffix(tok, path) for tok in ci_tokens):
            missing.append(path)

    problems = []
    if missing:
        problems.append(
            "questi test nuovi NON sono nell'elenco esplicito di .github/workflows/ci.yml, "
            "quindi in CI non girerebbero mai:\n  - " + "\n  - ".join(missing)
            + "\n  -> aggiungili a ci.yml (backend: riga `pytest -q`, frontend: riga `npm test --`)."
        )
    if unmarked:
        problems.append(
            "questi test backend non hanno `pytestmark = pytest.mark.unit`: conftest.py li "
            "salterebbe in CI (risultano 'skipped', non falliti):\n  - " + "\n  - ".join(unmarked)
            + "\n  -> aggiungi il marker (e il file a ci.yml) se sono test ermetici."
        )
    if problems:
        deny(
            "PR bloccata: " + "\n\n".join(problems)
            + "\n\nCommitta e riprova. Se un file non deve girare in CI (serve un backend live), "
            "scrivi nel file un commento con `ci-exempt` e il motivo."
        )


if __name__ == "__main__":
    main()
