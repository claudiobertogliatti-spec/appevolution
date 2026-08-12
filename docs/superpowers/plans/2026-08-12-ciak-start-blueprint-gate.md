# Ciak Start Blueprint Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consentire Ciak Start solo come decisione esplicita successiva a Blueprint pagato, analisi consegnata e call conclusa.

**Architecture:** `recommended_offer` resta un suggerimento derivato dallo scoring; `offer_decision` diventa l'unica autorizzazione commerciale. Il checkout verifica anche la provenienza Blueprint e gli stati persistiti della consegna analisi e della call.

**Tech Stack:** FastAPI, MongoDB, Stripe Checkout, pytest, React.

## Global Constraints

- Blueprint pagato e collegato al medesimo `ciak_clients`.
- Analisi con stato `inviata` e disponibilita pubblica.
- Diagnostic session in stato `call_done`.
- `offer_decision="ciak_start"` esplicita, auditata e successiva alla call.
- Il punteggio e `recommended_offer` non autorizzano mai il checkout.
- Nessun acquisto Start reale o dato produzione viene creato nei test.

---

### Task 1: Normalizzazione scoring

**Files:**
- Modify: `backend/services/ciak_client_accounts.py`
- Test: `backend/tests/test_ciak_client_accounts.py`

- [ ] Scrivere test RED per score numerico 0..15, incluso 13/14/15 monotono.
- [ ] Correggere `_score_from_session` usando `score_percentuale` quando presente e convertendo sempre `score_numerico` dalla scala 0..15.
- [ ] Eseguire i test mirati fino al GREEN.

### Task 2: Gate commerciale Start

**Files:**
- Modify: `backend/routers/ciak_clients.py`
- Test: `backend/tests/test_ciak_clients_router.py`

- [ ] Scrivere test RED per assenza pagamento Blueprint, analisi non consegnata, call non conclusa, decisione assente e decisione Partnership.
- [ ] Richiedere tutte le precondizioni e autorizzare solo `offer_decision="ciak_start"`.
- [ ] Impedire che flag legacy o `recommended_offer` aggirino la decisione finale.
- [ ] Eseguire i test mirati fino al GREEN.

### Task 3: Decisione admin coerente con la call

**Files:**
- Modify: `backend/routers/ciak_clients.py`
- Test: `backend/tests/test_ciak_clients_router.py`

- [ ] Scrivere test RED: decisione prima di `call_done` rifiutata.
- [ ] Persistire snapshot di stato, score e analisi con actor e timestamp.
- [ ] Eseguire regressione checkout e dashboard.

### Task 4: Comunicazione UI e rilascio

**Files:**
- Modify: `frontend/src/ciak/client/pages/StartPage.jsx`
- Modify: `frontend/src/ciak/admin/pages/ClientiCiak.jsx`
- Modify: `docs/agents/HANDOFF.md`

- [ ] Mostrare Start come esito confermato, non come automatismo del punteggio.
- [ ] Build frontend, suite backend, compile, diff check e secret scan.
- [ ] Commit esplicito, push `main`, CI, deploy e smoke live.
