"""Modifica di un lead: nome, cognome, email, telefono.

Regole (decise con Claudio il 7/10/2026):
  - `nome` resta SEMPRE il nome per intero ("Nome Cognome"): e' il campo che leggono
    tutte le pagine di oggi (Lead in arrivo, Trattative, proposte). Il cognome si
    salva in piu' (`nome_proprio` + `cognome`), cosi' nessuna pagina mostra mezzo nome.
  - Se arriva solo `nome` (la vecchia modifica da Trattative) vale per intero e non
    tocca `nome_proprio`/`cognome`.
  - Il telefono si scrive in `telefono` (come l'iscrizione) e in `phone` (come la
    vecchia modifica): chi legge uno dei due vede lo stesso numero.
  - L'email cambia solo con un controllo prima (vedi `ciak_lead_edit`): lega scheda,
    questionario e cronologia.

Funzione pura: valida e restituisce cosa scrivere. Le query stanno nel router.
"""
from __future__ import annotations

import re
from typing import Optional

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_NOME = 120
MAX_TELEFONO = 40


class ModificaNonValida(ValueError):
    """Dato non valido: il messaggio e' in italiano e va mostrato cosi' com'e'."""


def _pulito(valore: Optional[str]) -> Optional[str]:
    return None if valore is None else " ".join(str(valore).split())


def prepara_modifica(
    *,
    nome: Optional[str] = None,
    cognome: Optional[str] = None,
    telefono: Optional[str] = None,
    nuova_email: Optional[str] = None,
) -> dict:
    """Ritorna {"lead": {...campi di ciak_leads}, "nome_completo": str|None, "email": str|None}."""
    lead: dict = {}
    nome_p, cognome_p = _pulito(nome), _pulito(cognome)
    nome_completo: Optional[str] = None

    if nome_p is not None:
        if not nome_p:
            raise ModificaNonValida("Il nome non puo' essere vuoto.")
        if len(nome_p) > MAX_NOME or len(cognome_p or "") > MAX_NOME:
            raise ModificaNonValida(f"Nome e cognome: al massimo {MAX_NOME} caratteri.")
        if cognome_p is None:
            nome_completo = nome_p  # vecchia modifica: il nome vale per intero
        else:
            nome_completo = " ".join(x for x in (nome_p, cognome_p) if x)
            lead["nome_proprio"] = nome_p
            lead["cognome"] = cognome_p
        lead["nome"] = nome_completo
    elif cognome_p is not None:
        raise ModificaNonValida("Per cambiare il cognome serve anche il nome.")

    if telefono is not None:
        tel = (telefono or "").strip()
        if len(tel) > MAX_TELEFONO:
            raise ModificaNonValida(f"Telefono: al massimo {MAX_TELEFONO} caratteri.")
        lead["telefono"] = tel
        lead["phone"] = tel

    email: Optional[str] = None
    if nuova_email is not None:
        email = (nuova_email or "").strip().lower()
        if not EMAIL_RE.match(email):
            raise ModificaNonValida("L'email non e' valida.")

    if not lead and email is None:
        raise ModificaNonValida("Niente da aggiornare.")
    return {"lead": lead, "nome_completo": nome_completo, "email": email}
