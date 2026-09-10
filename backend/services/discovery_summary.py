"""Esito onesto di ricerca/import discovery: riuscita / parziale / fallita.

Funzioni pure, senza dipendenze (niente DB/rete), così testabili ovunque. Nascono
per correggere il falso `success=True` che gli endpoint discovery restituivano anche
quando TUTTE le operazioni fallivano: la UI mostrava un successo inesistente.
"""


def summarize_run(total: int, failed: int, new_items: int) -> dict:
    """Distingue l'esito reale di un'operazione a più passi (query o righe).

    - failed  = tutti i passi tentati sono andati in errore (nessun esito utile);
    - partial = alcuni passi in errore ma non tutti;
    - ok      = nessun errore.

    `success` è False solo per 'failed', così la UI può mostrare l'esito reale
    invece di un box verde in ogni caso. `new_items` è informativo (non cambia lo
    stato: un'operazione senza errori ma con 0 nuovi record resta 'ok', non 'fallita').
    """
    total = int(total or 0)
    failed = int(failed or 0)
    if total <= 0:
        status = "empty"
    elif failed >= total:
        status = "failed"
    elif failed > 0:
        status = "partial"
    else:
        status = "ok"
    return {
        "success": status not in ("failed", "empty"),
        "status": status,
        "queries_total": total,
        "queries_failed": failed,
        "new_leads": int(new_items or 0),
    }


def aggregate_places_results(results) -> tuple:
    """Somma gli esiti delle query Places eseguite in parallelo.

    `results` = lista di dict: {ok: True, imported, skipped, hot} oppure
    {ok: False, error: "..."}. Ritorna (imported, skipped, hot, errors[]).
    """
    imported = sum(int(r.get("imported", 0)) for r in results if r.get("ok"))
    skipped = sum(int(r.get("skipped", 0)) for r in results if r.get("ok"))
    hot = sum(int(r.get("hot", 0)) for r in results if r.get("ok"))
    errors = [r.get("error", "errore sconosciuto") for r in results if not r.get("ok")]
    return imported, skipped, hot, errors
