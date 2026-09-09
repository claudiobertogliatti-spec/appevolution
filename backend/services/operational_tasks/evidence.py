"""Prove, deduplicazione e riconciliazione degli effetti esterni (T07).

Due regole, prese dal comportamento reale del publisher social:

1. Un effetto (invio, pubblicazione) è riuscito SOLO con una prova verificabile
   riletta dal provider — un permalink, un id operazione confermato — mai con un
   flag ``success``. Un post senza permalink non è pubblicato.
2. Un tentativo dall'esito ambiguo (timeout/eccezione DOPO l'invio) è ``UNKNOWN``,
   non ``FAILED``: non si reinvia alla cieca. Si cerca l'operazione remota; se non
   è verificabile, si blocca per intervento umano. Solo ciò che è sicuramente
   ``FAILED`` (mai partito) si ripete.

Il modulo è puro: non parla con i provider, coordina soltanto prove ed esiti.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Iterable, List, Mapping, Optional

from .contracts import build_idempotency_key

__all__ = [
    "EffectOutcome",
    "EffectRecord",
    "EffectLedger",
    "classify_effect_outcome",
    "channels_to_retry",
    "channels_needing_reconciliation",
    "all_effects_verified",
    "build_idempotency_key",
]


class EffectOutcome(str, Enum):
    PRODUCED = "produced"   # effetto avvenuto E prova verificabile riletta
    FAILED = "failed"       # fallito PRIMA di raggiungere il provider: sicuro reinviare
    UNKNOWN = "unknown"     # inviato ma senza prova (timeout/ambiguo): riconciliare, non reinviare


def classify_effect_outcome(
    *,
    sent: bool,
    provider_ok: bool,
    evidence_ref: Optional[str],
) -> EffectOutcome:
    """Classifica l'esito di un singolo effetto.

    - ``PRODUCED``: il provider ha risposto ok e c'è una prova (``evidence_ref`` non vuoto).
    - ``FAILED``: non abbiamo mai raggiunto il provider (``sent`` falso) → reinviabile.
    - ``UNKNOWN``: inviato ma senza prova (provider ok senza ref, o eccezione dopo l'invio):
      non sappiamo se è passato → riconciliare, mai reinviare alla cieca.
    """
    if provider_ok and evidence_ref is not None and str(evidence_ref).strip():
        return EffectOutcome.PRODUCED
    if not sent:
        return EffectOutcome.FAILED
    return EffectOutcome.UNKNOWN


@dataclass(frozen=True)
class EffectRecord:
    channel: str
    idempotency_key: str
    outcome: EffectOutcome
    evidence_ref: Optional[str] = None
    operation_id: Optional[str] = None
    error: Optional[str] = None


def channels_to_retry(records: Iterable[EffectRecord]) -> List[str]:
    """Solo i canali ``FAILED`` (sicuramente mai partiti). ``PRODUCED`` e ``UNKNOWN`` NO:
    ripetere un ``UNKNOWN`` è esattamente ciò che crea i doppioni."""
    return [r.channel for r in records if r.outcome is EffectOutcome.FAILED]


def channels_needing_reconciliation(records: Iterable[EffectRecord]) -> List[str]:
    """Canali ``UNKNOWN``: vanno riconciliati (cerca l'operazione remota) o bloccati."""
    return [r.channel for r in records if r.outcome is EffectOutcome.UNKNOWN]


def all_effects_verified(records: Iterable[EffectRecord], required_channels: Iterable[str]) -> bool:
    """Completo solo se OGNI canale richiesto è ``PRODUCED`` con prova. Un solo canale
    ``UNKNOWN``/``FAILED``/senza prova → non completo."""
    by_channel: Dict[str, EffectRecord] = {r.channel: r for r in records}
    for channel in required_channels:
        record = by_channel.get(channel)
        if record is None or record.outcome is not EffectOutcome.PRODUCED:
            return False
        if not (record.evidence_ref and str(record.evidence_ref).strip()):
            return False
    return True


class EffectLedger:
    """Registro a chiave di idempotenza: un effetto per chiave.

    ``record_intent`` va chiamato PRIMA dell'effetto: se la chiave esiste già
    (tentativo o callback duplicato), ritorna ``False`` e il chiamante NON deve
    rifare l'effetto. ``resolve`` fissa l'esito una volta noto.
    """

    def __init__(self) -> None:
        self._by_key: Dict[str, EffectRecord] = {}

    def record_intent(
        self, idempotency_key: str, channel: str, *, operation_id: Optional[str] = None
    ) -> bool:
        if not isinstance(idempotency_key, str) or not idempotency_key.strip():
            raise ValueError("idempotency_key obbligatoria")
        if idempotency_key in self._by_key:
            return False
        self._by_key[idempotency_key] = EffectRecord(
            channel=channel,
            idempotency_key=idempotency_key,
            outcome=EffectOutcome.UNKNOWN,
            operation_id=operation_id,
        )
        return True

    def resolve(
        self,
        idempotency_key: str,
        outcome: EffectOutcome,
        *,
        evidence_ref: Optional[str] = None,
        operation_id: Optional[str] = None,
        error: Optional[str] = None,
    ) -> EffectRecord:
        existing = self._by_key.get(idempotency_key)
        if existing is None:
            raise KeyError(f"nessun intento registrato per {idempotency_key!r}")
        record = EffectRecord(
            channel=existing.channel,
            idempotency_key=idempotency_key,
            outcome=outcome,
            evidence_ref=evidence_ref,
            operation_id=operation_id or existing.operation_id,
            error=error,
        )
        self._by_key[idempotency_key] = record
        return record

    def get(self, idempotency_key: str) -> Optional[EffectRecord]:
        return self._by_key.get(idempotency_key)

    def records(self) -> List[EffectRecord]:
        return list(self._by_key.values())
