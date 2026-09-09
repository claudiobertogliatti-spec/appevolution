def build_contract_acceptance(body: dict, ip: str, now_iso: str) -> dict:
    """Pura: valida consenso (checkbox o firma) e costruisce contract_data. Solleva ValueError se invalido."""
    if not isinstance(body, dict):
        raise ValueError("accettazione non valida")
    declaration = body.get("dichiarazione_imprenditoriale", False)
    if type(declaration) is not bool:
        raise ValueError("la dichiarazione imprenditoriale deve essere un booleano")
    piva = body.get("piva", "")
    if not isinstance(piva, str) or len(piva) > 32:
        raise ValueError("partita IVA non valida")
    if body.get("clausole_vessatorie_approved") is not True:
        raise ValueError("clausole vessatorie non approvate")
    sig = body.get("signature_base64")
    consenso = body.get("consenso_checkbox") is True
    if not sig and not consenso:
        raise ValueError("serve l'accettazione (checkbox) o la firma")
    return {
        "version": "v1.0",
        "signed_at": now_iso,
        "signature_base64": sig or "",
        "metodo": "signature" if sig else "checkbox",
        "ip_address": ip,
        "clausole_vessatorie_approved": True,
        # Opzione A' (B2B senza P.IVA obbligatoria): dichiarazione di finalita'
        # imprenditoriale + P.IVA facoltativa. Campi OPZIONALI in input: la
        # Proposta.jsx legacy non li manda e non deve rompersi.
        "dichiarazione_imprenditoriale": declaration,
        "piva": piva.strip(),
    }


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
