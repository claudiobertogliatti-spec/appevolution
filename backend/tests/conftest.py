"""
Configurazione pytest condivisa.

La maggior parte dei test colpisce un backend live tramite REACT_APP_BACKEND_URL.
In CI (e in locale senza backend) quella variabile non e' impostata, quindi questi
test vengono saltati automaticamente. Restano eseguiti solo i test marcati `unit`.
Quando REACT_APP_BACKEND_URL e' valorizzata, vengono eseguiti TUTTI i test.
"""
import os
import pytest


def pytest_collection_modifyitems(config, items):
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return
    skip_integration = pytest.mark.skip(
        reason="richiede REACT_APP_BACKEND_URL (backend live); marca il test come 'unit' per la CI"
    )
    for item in items:
        if "unit" not in item.keywords:
            item.add_marker(skip_integration)
