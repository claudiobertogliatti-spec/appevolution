#!/usr/bin/env python3
"""
Interfaccia a riga di comando del briefing di Luca.

⛔ La logica NON sta qui: sta in `backend/briefing_luca.py`, perche' e' quella
che gira nel container (il deploy builda con `--source ./backend`). Questo file
la importa, cosi' non esistono due copie che divergono.

Uso:
    python scripts/briefing_luca.py            # legge LUCA_REPORT_KEY dall'ambiente
    python scripts/briefing_luca.py --base-url http://localhost:8001
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from briefing_luca import DEFAULT_BASE_URL, ENDPOINTS, main, raccogli  # noqa: E402,F401

if __name__ == "__main__":
    raise SystemExit(main())
