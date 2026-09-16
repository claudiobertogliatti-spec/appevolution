"""
fire_and_forget tiene vivo il task fino alla fine (niente GC prima del completamento).

Audit affidabilità 16/9: gli endpoint emettevano i tag Systeme con
`asyncio.create_task(...)` "nudo" — un task di cui non si conserva il riferimento
puo' essere garbage-collected dal loop prima di finire, e il tag non parte.
fire_and_forget conserva il riferimento fino al done_callback.
"""
import asyncio
import os
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("SYSTEME_API_KEY", "")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.ciak_systeme import fire_and_forget, _in_flight  # noqa: E402


def test_fire_and_forget_porta_a_termine_la_coroutine():
    async def run():
        done = {"v": False}

        async def work():
            await asyncio.sleep(0.01)
            done["v"] = True

        fire_and_forget(work())
        assert len(_in_flight) >= 1, "il task deve essere tracciato mentre gira"
        # lascia completare il task in background
        for _ in range(50):
            if done["v"]:
                break
            await asyncio.sleep(0.01)
        assert done["v"] is True, "la coroutine deve arrivare in fondo"
        await asyncio.sleep(0)  # lascia scattare il done_callback
        assert len(_in_flight) == 0, "il riferimento va rilasciato a fine task"

    asyncio.run(run())
