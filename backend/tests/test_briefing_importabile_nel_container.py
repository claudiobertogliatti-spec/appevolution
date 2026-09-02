"""
Il briefing deve importarsi come si importa DENTRO il container.

Il 2/9/2026 il task delle 7:45 e' partito davvero — Celery Beat funzionava — ed
e' morto su:

    [LUCA_BRIEFING] Errore: No module named 'briefing_luca'

Il codice era corretto e i test erano verdi. Ma i test giravano dalla root del
repo, dove `scripts/` esiste; il deploy builda con `gcloud run deploy
--source ./backend`, e in produzione quella cartella non c'e'.

Questo test riproduce l'ambiente vero: un processo separato che vede **solo**
`backend/`. Se qualcuno rimette una dipendenza da `scripts/`, fallisce qui
invece che alle 7:45 di una mattina qualsiasi.
"""

import subprocess
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parents[1]


def _importa_con_solo_backend(codice: str):
    """
    Esegue `codice` in un processo con cwd=backend e senza la root nel path:
    e' quello che vede il container.
    """
    return subprocess.run(
        [sys.executable, "-c", codice],
        cwd=str(BACKEND),
        capture_output=True,
        text=True,
        timeout=90,
    )


def test_la_raccolta_dati_si_importa_dentro_il_container():
    esito = _importa_con_solo_backend(
        "import briefing_luca; print(callable(briefing_luca.raccogli))"
    )

    assert esito.returncode == 0, (
        f"il modulo non si importa con solo backend/ nel path:\n{esito.stderr[-600:]}"
    )
    assert "True" in esito.stdout


def test_anche_i_sensori_sono_nel_container():
    """`briefing_luca` importa `sensori`: se resta fuori, il fallimento e' identico."""
    esito = _importa_con_solo_backend("import sensori; print(hasattr(sensori, 'leggi_ciak'))")

    assert esito.returncode == 0, esito.stderr[-600:]
    assert "True" in esito.stdout


def test_il_task_carica_la_raccolta_senza_scripts():
    """
    E' esattamente la chiamata che ha fallito in produzione:
    `_carica_raccolta()` dentro il task Celery.
    """
    esito = _importa_con_solo_backend(
        "import luca_briefing_task as t; m = t._carica_raccolta(); "
        "print(callable(m.raccogli))"
    )

    assert esito.returncode == 0, (
        f"_carica_raccolta() fallisce come il 2/9 in produzione:\n{esito.stderr[-600:]}"
    )
    assert "True" in esito.stdout
