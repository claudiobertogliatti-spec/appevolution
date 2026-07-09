import os
from typing import Mapping


ALLOW_LISTA_FREDDA_SYSTEME_IMPORT_ENV = "ALLOW_LISTA_FREDDA_SYSTEME_IMPORT"

_TRUTHY = {"1", "true", "yes", "on"}


def is_lista_fredda_systeme_import_allowed(env: Mapping[str, str] | None = None) -> bool:
    source_env = os.environ if env is None else env
    raw = (source_env.get(ALLOW_LISTA_FREDDA_SYSTEME_IMPORT_ENV) or "").strip().lower()
    return raw in _TRUTHY


def get_allowed_systeme_sources(env: Mapping[str, str] | None = None) -> list[str]:
    sources = ["google_places"]
    if is_lista_fredda_systeme_import_allowed(env):
        sources.append("lista_fredda")
    return sources


def get_systeme_daily_queue_match(env: Mapping[str, str] | None = None) -> dict:
    if is_lista_fredda_systeme_import_allowed(env):
        return {"status": "pending"}
    return {"status": "pending", "source": {"$ne": "lista_fredda"}}


def get_lista_fredda_freeze_message() -> str:
    return (
        "Lista fredda 13k congelata per Acquisizione Evolution: niente email massive, "
        "drip o sequenze cold non personalizzate. Uso consentito solo per custom audience "
        "Meta, analisi segmenti e studio mercato."
    )
