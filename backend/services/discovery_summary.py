"""Esito onesto di una ricerca/import discovery: riuscita / parziale / fallita.

Funzione pura, senza dipendenze (niente DB), così è testabile ovunque. Nasce per
correggere il falso `success=True` che l'endpoint /search-places restituiva anche
quando TUTTE le query andavano in errore: la UI mostrava un successo inesistente.
"""


def summarize_places_run(queries_total: int, queries_failed: int, new_leads: int) -> dict:
    """Distingue l'esito reale di una ricerca a più query.

    - failed  = tutte le query tentate sono andate in errore (nessun esito utile);
    - partial = alcune query in errore ma non tutte;
    - ok      = nessun errore.

    `success` è False solo per 'failed', così la UI può mostrare l'esito reale
    invece di un box verde in ogni caso. `new_leads` è informativo (non cambia lo
    stato: una ricerca senza errori ma con 0 nuovi lead resta 'ok', non 'fallita').
    """
    total = int(queries_total or 0)
    failed = int(queries_failed or 0)
    if total and failed >= total:
        status = "failed"
    elif failed > 0:
        status = "partial"
    else:
        status = "ok"
    return {
        "success": status != "failed",
        "status": status,
        "queries_total": total,
        "queries_failed": failed,
        "new_leads": int(new_leads or 0),
    }
