"""
Base URL per le chiamate che il backend fa a se stesso.

Perche' esiste (31/8/2026): sparsi nel codice c'erano sei punti che chiamavano
`http://localhost:8001`, mentre il Dockerfile avvia `uvicorn server:app --port
8080`. Dentro il container la 8001 non risponde a nessuno, quindi ogni job
schedulato moriva con [Errno 111] Connection refused a ogni esecuzione — visto
nei log di `evolution-pro-worker`, dove falliva da mesi senza che nessuno se ne
accorgesse: il fallimento era solo una riga di log che nessuno leggeva.

Un numero di porta scritto a mano in sei file e' destinato a divergere. Qui sta
in un posto solo e si legge da `PORT`, che Cloud Run inietta.
"""

import os

DEFAULT_PORT = "8080"


def internal_api_base() -> str:
    """
    Origin da usare per le chiamate interne, SENZA slash finale e senza `/api`.

    `INTERNAL_API_BASE` ha la precedenza: serve quando il chiamante gira in un
    processo separato da quello che espone l'API e localhost non basta piu'.
    """
    esplicito = os.environ.get("INTERNAL_API_BASE")
    if esplicito:
        return esplicito.rstrip("/")
    return f"http://localhost:{os.environ.get('PORT', DEFAULT_PORT)}"


def internal_api_url(path: str) -> str:
    """Compone un URL interno: `internal_api_url("/api/notify/telegram")`."""
    return f"{internal_api_base()}/{path.lstrip('/')}"
