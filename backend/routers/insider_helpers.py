def enrich_proposta_for_insider(proposta: dict, sess: dict | None) -> dict:
    """Pura: aggiunge analisi + scoring_stato del lead alla proposta (sess già letta)."""
    proposta = dict(proposta)
    analisi = None
    stato = None
    if sess:
        analisi = sess.get("analisi") or sess.get("analysis")
        stato = (sess.get("scoring") or {}).get("stato")
    proposta["analisi"] = analisi
    proposta["scoring_stato"] = stato
    return proposta
