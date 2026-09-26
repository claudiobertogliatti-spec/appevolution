"""
Tetto ai tentativi automatici della pipeline video — helper PURI (nessun I/O).

Perché esiste: se un video manda in "memory limit exceeded" il worker Cloud Run,
il container viene ucciso, Celery riconsegna lo stesso messaggio
(acks_late + reject_on_worker_lost) e il watchdog `check_stuck_video_pipelines`
lo riaccoda ogni 30 minuti. Senza un tetto il ciclo non finisce mai e tiene il
worker sempre acceso a piena CPU.

Il contatore vive nel documento del job (masterclass_factory / lezione del
videocorso): `pipeline_attempts`, `pipeline_attempts_since`, `pipeline_attempts_url`.
Un nuovo caricamento (URL diverso) o una finestra scaduta lo azzerano, così un
retry manuale voluto dall'admin dopo un fix non resta bloccato per sempre.

Consumatori:
  - video_pipeline_task._run_pipeline  (conta il tentativo prima del lavoro pesante)
  - celery_tasks.check_stuck_video_pipelines  (non riaccoda se il tetto è raggiunto)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

MAX_PIPELINE_ATTEMPTS = 3
ATTEMPT_WINDOW = timedelta(hours=6)


def _parse(iso: Optional[str]) -> Optional[datetime]:
    if not iso or not isinstance(iso, str):
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _count(value) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return 0
    return n if n > 0 else 0


def _in_window(since_iso: Optional[str], now: datetime) -> bool:
    since = _parse(since_iso)
    return since is not None and (now - since) <= ATTEMPT_WINDOW


def next_attempt(
    prev_count,
    prev_since_iso: Optional[str],
    prev_url: Optional[str],
    video_url: str,
    now: datetime,
) -> Tuple[int, str]:
    """
    Restituisce (numero_tentativo, inizio_finestra_iso) per l'avvio che sta per partire.

    Riparte da 1 se: URL cambiato, finestra scaduta o inizio finestra mancante/illeggibile.
    """
    same_job = (prev_url or "") == (video_url or "")
    if same_job and _in_window(prev_since_iso, now):
        return _count(prev_count) + 1, prev_since_iso  # type: ignore[return-value]
    return 1, now.isoformat()


def attempts_exhausted(count, since_iso: Optional[str], now: datetime) -> bool:
    """True se nella finestra corrente i tentativi hanno già raggiunto il tetto."""
    return _in_window(since_iso, now) and _count(count) >= MAX_PIPELINE_ATTEMPTS
