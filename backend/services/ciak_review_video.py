"""Anteprima del grezzo nella pagina di revisione dei tagli (lettore video sincronizzato col testo).

Il browser non puo mandare l'header Authorization da un tag <video>, quindi l'admin ottiene un indirizzo con un
gettone BREVE e a scopo unico (partner + lezione + 30 minuti) firmato col segreto JWT. Il gettone NON ha `sub`:
`decode_token` lo rifiuta, quindi non puo servire come accesso ad altro. Il file si serve a pezzi (Range) da GCS.

Funzioni pure: gettone, intervallo Range, indirizzo gs://.
"""
from __future__ import annotations

import time
from typing import Optional, Tuple

PURPOSE = "lesson-review-video"
TOKEN_TTL_S = 1800
MAX_CHUNK = 8 * 1024 * 1024        # un pezzo di risposta; il browser richiede i successivi


def make_token(jwt_mod, secret: str, algorithm: str, partner_id: str, lesson_id: str,
               ttl_s: int = TOKEN_TTL_S, now: Optional[float] = None) -> str:
    now = time.time() if now is None else now
    return jwt_mod.encode({"purpose": PURPOSE, "pid": str(partner_id), "lid": str(lesson_id),
                           "exp": int(now + ttl_s)}, secret, algorithm=algorithm)


def verify_token(jwt_mod, secret: str, algorithm: str, token: str, partner_id: str, lesson_id: str) -> bool:
    try:
        claims = jwt_mod.decode(token or "", secret, algorithms=[algorithm])
    except Exception:
        return False
    return (claims.get("purpose") == PURPOSE and claims.get("pid") == str(partner_id)
            and claims.get("lid") == str(lesson_id) and "sub" not in claims)


def parse_range(header: Optional[str], size: int, max_chunk: int = MAX_CHUNK) -> Optional[Tuple[int, int]]:
    """'bytes=0-' / 'bytes=100-199' / 'bytes=-500' -> (start, end) inclusi, limitato a `max_chunk`.
    None se l'intervallo non e soddisfacibile (416). Senza header: tutto il file (0, size-1) in un pezzo limitato."""
    if size <= 0:
        return None
    if not header:
        return 0, min(size, max_chunk) - 1
    h = header.strip().lower()
    if not h.startswith("bytes=") or "," in h:
        return None
    a, _, b = h[6:].partition("-")
    try:
        if a == "":
            n = int(b)
            if n <= 0:
                return None
            start, end = max(size - n, 0), size - 1
        else:
            start = int(a)
            end = int(b) if b else size - 1
    except ValueError:
        return None
    if start >= size or start < 0 or end < start:
        return None
    end = min(end, size - 1, start + max_chunk - 1)
    return start, end


def split_gs_url(url: str) -> Optional[Tuple[str, str]]:
    if not url or not str(url).startswith("gs://"):
        return None
    bucket, _, blob = str(url)[5:].partition("/")
    return (bucket, blob) if bucket and blob else None
