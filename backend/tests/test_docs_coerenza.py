"""Guardia sulla memoria degli agenti.

`CLAUDE.md` viene caricato in ogni sessione di ogni agente: se marcisce, marcisce in
silenzio. L'11/8/2026 era arrivato a 1320 righe (~28k token) e citava 7 file frontend
cancellati mesi prima -- nessuno se ne era accorto perche' nulla lo verificava.

Questo test rende la memoria falsificabile come il codice. Tre invarianti:

1. **Peso**  -- il file resta sotto il limite di righe. Se sfora, si pota il vecchio.
2. **Path**  -- ogni percorso citato con una directory esiste davvero su disco.
3. **Chiavi** -- nessun valore che somigli a un segreto nei file di memoria
                (il repo e' pubblico; vedi PROTOCOL.md §3.5).

Ambito volutamente ristretto ai file *normativi*: quelli che un agente legge e da cui
prende istruzioni. Il diario storico (`docs/agents/DIARIO-2026.md`) e' escluso dal
controllo dei path: cita di proposito file che non esistono piu'.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

# Nessun backend live: sono controlli sul filesystem. Senza questo marker `conftest.py`
# li salta tutti (vedi pytest_collection_modifyitems).
pytestmark = pytest.mark.unit

REPO = Path(__file__).resolve().parents[2]

CLAUDE_MD = REPO / "CLAUDE.md"
MAX_RIGHE_CLAUDE_MD = 350

# File normativi: un agente li legge per sapere cosa fare.
FILE_NORMATIVI = [
    "CLAUDE.md",
    "docs/agents/PROTOCOL.md",
    "docs/deploy-playbook.md",
    "docs/runbooks/backend-problemi-noti.md",
    "docs/runbooks/funnel-systeme-partner.md",
    "docs/runbooks/standard-editing-video.md",
]

# Solo i riferimenti con una directory: `server.py` da solo e' ambiguo (sta in backend/),
# `backend/server.py` no. Il suffisso :NN o :NN,NN e' un rimando a riga, non fa parte del path.
ESTENSIONI = "py|js|jsx|ts|tsx|json|md|yml|yaml|html|css"
RIFERIMENTO_PATH = re.compile(
    r"`((?:[\w.-]+/)+[\w.-]+\.(?:" + ESTENSIONI + r"))(?::\d+(?:,\d+)*)?`"
)

# Assegnazione di un valore lungo a qualcosa che si chiama chiave/token/segreto.
# Il nome e/o il valore possono essere in backtick: in CLAUDE.md stavano scritti
# proprio cosi' (`NOME_API_KEY` = `valore`), ed e' il caso che va intercettato.
SEGRETO = re.compile(
    r"(?i)\b[\w]*(?:api[_-]?key|secret|token|password|passwd)[\w]*\b"
    r"[`\"']?\s*[=:]\s*[`\"']?[A-Za-z0-9_\-]{20,}"
)
# Prefissi inequivocabili, ovunque compaiano.
SEGRETO_PREFISSO = re.compile(r"\b(?:sk-ant-api\d{2}-[A-Za-z0-9_\-]{20,}|whsec_[A-Za-z0-9]{20,})")

# Valori palesemente fittizi usati come esempio nella documentazione.
PLACEHOLDER = re.compile(
    r"(?i)(?:x{6,}|\.{3}|<[^>]+>|your[_-]|placeholder|esempio|example|"
    r"sk-ant-api03-\.\.\.|ci-test-secret)"
)

# Artefatti generati: esistono solo dopo una build, non sono tracciati.
SEGMENTI_GENERATI = {"build", "dist", "node_modules", "__pycache__", ".next"}

# Path citati apposta perche' NON devono esistere. Toglierli dalla lista solo quando
# si toglie anche la regola che li nomina.
PATH_ASSENTI_DI_PROPOSITO = {
    # PROTOCOL.md §5-bis: il router API multi-provider e' una decisione chiusa il 27/7/2026.
    "scripts/ai_nazionale.py",
}


def _leggi(relpath: str) -> str:
    return (REPO / relpath).read_text(encoding="utf-8")


def test_claude_md_non_supera_il_limite_di_righe():
    """Sopra il limite il file smette di essere letto e diventa peso morto."""
    righe = len(CLAUDE_MD.read_text(encoding="utf-8").splitlines())
    assert righe <= MAX_RIGHE_CLAUDE_MD, (
        f"CLAUDE.md ha {righe} righe (limite {MAX_RIGHE_CLAUDE_MD}). "
        "Non alzare il limite: sposta la cronaca in docs/agents/DIARIO-2026.md e i "
        "workflow lunghi in docs/runbooks/. Vedi CLAUDE.md §8."
    )


@pytest.mark.parametrize("relpath", FILE_NORMATIVI)
def test_i_path_citati_esistono(relpath: str):
    """Un path morto in un file normativo manda un agente a cercare un file che non c'e'."""
    testo = _leggi(relpath)
    mancanti = sorted(
        {
            path
            for path in RIFERIMENTO_PATH.findall(testo)
            if "*" not in path
            and path not in PATH_ASSENTI_DI_PROPOSITO
            and not SEGMENTI_GENERATI.intersection(path.split("/"))
            and not (REPO / path).exists()
        }
    )
    assert not mancanti, (
        f"{relpath} cita path che non esistono: {mancanti}. "
        "Correggi il riferimento o togli la voce: se il file non c'e' piu', "
        "la regola che lo cita e' probabilmente superata."
    )


@pytest.mark.parametrize("relpath", FILE_NORMATIVI)
def test_nessun_segreto_nei_file_di_memoria(relpath: str):
    """Il repo e' pubblico. Le chiavi stanno in Secret Manager e nelle env var, non nei .md."""
    sospetti = []
    for n, riga in enumerate(_leggi(relpath).splitlines(), start=1):
        if PLACEHOLDER.search(riga):
            continue
        if SEGRETO.search(riga) or SEGRETO_PREFISSO.search(riga):
            sospetti.append(f"{relpath}:{n}")
    assert not sospetti, (
        f"Possibili credenziali in chiaro: {sospetti}. "
        "Cita il NOME della variabile e dove vive (Cloud Run / Secret Manager), mai il valore."
    )


def test_il_diario_non_e_un_file_normativo():
    """Il diario esiste e si dichiara non-normativo: e' cio' che gli evita di essere eseguito."""
    diario = REPO / "docs/agents/DIARIO-2026.md"
    assert diario.exists(), "docs/agents/DIARIO-2026.md manca: la cronaca e' tornata in CLAUDE.md?"
    intestazione = diario.read_text(encoding="utf-8")[:1500].lower()
    assert "non" in intestazione and "normativ" in intestazione, (
        "L'intestazione del diario deve dire a chiare lettere che non e' una fonte di regole."
    )
