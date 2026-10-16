"""
Guardia sul peso dei video della pipeline — helper PURI (nessuna rete, nessun DB).

Perché esiste: su Cloud Run `/tmp` sta nella RAM del container. Il worker ha 4 GiB e
la pipeline tiene in `/tmp` il video grezzo (`raw.mp4`) PIÙ il montato (`final.mp4`)
più i file intermedi (sottotitoli, ritardo audio, copertina lezione). Un video molto
pesante saturava la memoria, Cloud Run uccideva il worker e il task rientrava in
coda (loop del 27/9/2026, vedi `video_retry_guard`). Il tetto ai tentativi ferma il
ciclo ma non lo evita: qui si rifiuta il file PRIMA di lavorarlo, con un messaggio
chiaro al posto di un crash.

Il tetto è configurabile: se la memoria del worker aumenta basta alzare
`VIDEO_PIPELINE_MAX_RAW_BYTES` (byte) senza toccare il codice.

Consumatori: video_pipeline_task (_run_pipeline e apply-approved-cuts).
"""
from __future__ import annotations

import os
import shutil
from typing import Optional

# Con picco ~2x (grezzo + montato, dopo `link_or_copy` e `free_file`) un grezzo da
# 1,5 GB usa ~3 GB di RAM: resta sotto i 4 GiB del worker con margine per ffmpeg.
DEFAULT_MAX_RAW_BYTES = 1_500_000_000
ENV_VAR = "VIDEO_PIPELINE_MAX_RAW_BYTES"


class VideoTooHeavy(ValueError):
    """Il video supera il peso che il worker riesce a elaborare in sicurezza."""


def max_raw_bytes() -> int:
    """Tetto in byte: da env se valido e positivo, altrimenti il default."""
    try:
        value = int(os.environ.get(ENV_VAR, ""))
    except (TypeError, ValueError):
        return DEFAULT_MAX_RAW_BYTES
    return value if value > 0 else DEFAULT_MAX_RAW_BYTES


def _mb(n: int) -> str:
    return f"{n / 1e6:,.0f} MB".replace(",", ".")


def check_size(size_bytes: Optional[int], limit: Optional[int] = None) -> None:
    """Solleva VideoTooHeavy se il peso è noto e supera il tetto. Peso ignoto = ok."""
    if not size_bytes or size_bytes <= 0:
        return
    cap = limit if limit and limit > 0 else max_raw_bytes()
    if size_bytes > cap:
        raise VideoTooHeavy(
            f"File troppo pesante ({_mb(size_bytes)}, massimo {_mb(cap)}): "
            f"comprimilo o dividilo in parti e ricaricalo."
        )


def link_or_copy(src: str, dst: str) -> None:
    """Rende `dst` identico a `src` SENZA raddoppiare i byte in RAM.

    Prima prova un hard link (stesso file, zero byte in più); se il filesystem non lo
    permette ripiega sulla copia. Se `dst` esiste già viene tolto prima (un hard link
    sullo stesso file farebbe fallire `shutil.copy` con SameFileError).
    """
    if os.path.lexists(dst):
        os.remove(dst)
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy(src, dst)


def free_file(path: str, keep: Optional[str] = None) -> bool:
    """Cancella un file intermedio per liberare RAM. Non tocca `keep` né file assenti.

    Ritorna True se ha cancellato qualcosa. Non solleva mai: liberare memoria è
    un'ottimizzazione, non deve far fallire il job.
    """
    try:
        if keep and os.path.abspath(path) == os.path.abspath(keep):
            return False
        if os.path.lexists(path):
            os.remove(path)
            return True
    except OSError:
        return False
    return False
