# Ciak — Generazione Analisi + Roadmap personalizzata (design)

**Data**: 2026-05-28
**Autori**: Claudio + Claude
**Status**: approvato, pronto per implementation plan
**Contesto**: deliverable centrale del Ciak Blueprint €67, perno della conversione cliente → partner €2.790

---

## 1. Obiettivo

Generare automaticamente, dalle risposte alle **8 Domande Ciak**, un'analisi strategica **professionale e illuminante** con **roadmap personalizzata** verso la creazione dell'Accademia Digitale del cliente. L'analisi è il valore concreto del Ciak Blueprint €67 e prepara la conversione alla partnership Evolution PRO (€2.790).

Effetto target sul cliente: un **arco narrativo** che porta a un "click" mentale →
`dove sei e cosa ti frena → cosa c'è nel mercato → la tua accademia possibile → come arrivarci (roadmap) → la partnership come veicolo`.

## 2. Decisioni di prodotto (lockate con Claudio 2026-05-28)

| Tema | Decisione |
|---|---|
| **Input** | Solo le 8 Domande Ciak + **ricerca web AI** (zero attrito per il cliente) |
| **Motore AI** | **Anthropic API nativa** (stessa di Matteo, key già attiva) + **web search tool**. Emergent/OpenClaw SONO ESCLUSI dal progetto da mesi → codice legacy morto, non riusare |
| **Artefatti** | 3: ① bozza PDF (auto) ② analisi definitiva web (validata) ③ script call (interno) |
| **Timing bozza** | Subito post-€67, automatica, senza revisione |
| **Timing definitiva** | Generata subito post-€67 ma in stato `da_validare`; validata da Claudio e inviata **dopo la call** |
| **Script call** | Generato post-€67 per Claudio, per convertire €67 → partner €2.790 |
| **Formato** | Bozza = PDF; definitiva = pagina web `/analisi/:token` (PDF opzionale fase 2) |
| **Consegna definitiva** | Sbloccata quando Claudio valida/invia post-call |

## 3. I 3 artefatti

### ① Bozza analisi — PDF, automatica post-€67
Versione **teaser** dell'arco narrativo: 1-2 bullet per capitolo. Dimostra valore e crea attesa senza svelare la profondità (mercato dettagliato, accademia disegnata, roadmap completa restano per la definitiva). Brandizzata Ciak. Generata e inviata in automatico via email.

### ② Analisi definitiva — pagina web, validata da Claudio, post-call
Arco narrativo completo, professionale, in **6 capitoli**:
1. **Il tuo punto di partenza** — sintesi profilo dalle 8 domande
2. **Dove sei adesso** — stato reale (stato 1-4) + limite del modello attuale (tempo=denaro) + **costo di restare fermo** (leva 1)
3. **Il tuo mercato** — settore, domanda, competitor reali, fascia prezzo, spazio non presidiato (da **ricerca web**) (leva 2)
4. **La tua Accademia Digitale** — nome percorso possibile, promessa di trasformazione, struttura moduli, pricing realistico tarato sul mercato (leva 3)
5. **La roadmap** — fasi, tempi, priorità concrete per costruire l'accademia
6. **Il prossimo passo** — la partnership Evolution PRO come veicolo che realizza la roadmap (ponte conversione)

### ③ Script di call — interno (admin), per la conversione €2.790
Canovaccio per Claudio durante la call: agganci personalizzati sul cliente, i 3 momenti illuminanti da far emergere, obiezioni probabili + risposte, come presentare la partnership €2.790, domande di chiusura.

## 4. Architettura

Nuovo servizio **`backend/services/ciak_analisi.py`** (gemello di `ciak_matteo.py`). Stesso client Anthropic, stessa gestione errori (`*ServiceError`), stesso pattern prompt-store versionato (prompt editabili da admin senza deploy).

Funzioni:
- `genera_research_brief(session)` → ricerca web → brief strutturato JSON
- `genera_analisi_definitiva(session, brief)` → 6 capitoli
- `genera_bozza(analisi_definitiva)` → sintesi bullet (teaser)
- `genera_script_call(session, analisi_definitiva)` → canovaccio vendita

## 5. Pipeline di generazione (4 step)

1. **Research brief (web search)** — chiamata Claude con web search tool. Dominio estratto da `q1 competenza` + `q6 problema` + `q5 target`. Query: dimensione/trend settore, competitor reali, fascia prezzo corsi simili, posizionamenti. Output JSON salvato in `research_data` (trasparenza + riuso + audit).
2. **Analisi definitiva** — 8 domande + brief → 6 capitoli. La ricerca alimenta cap. 3 (mercato/competitor/prezzi reali) e cap. 4 (pricing accademia).
3. **Bozza** — derivata dalla definitiva (sintesi bullet) → coerenza garantita.
4. **Script call** — dalla definitiva + stato cliente → canovaccio.

Tempo: ~30-60s (1 chiamata con web search è la più lenta). Gira in background post-€67, non blocca nulla.

## 6. Vincoli anti-fuffa (qualità "professionale")

- **Honesty policy / verità brutale**: se il modello è debole o il target generico, lo dichiara. Niente adulazione.
- **No dati inventati**: solo numeri/competitor dalla ricerca web reale; se un dato manca, lo dichiara.
- **Specificità**: cita competitor e fasce prezzo reali, non "il mercato è in crescita".
- **Personalizzazione**: riferimenti diretti alle risposte del cliente.
- **Voice**: italiano professionale-consulenziale, no coach-speak (riusa tabella termini vietati del prompt Matteo: ROI→guadagno, funnel→percorso, ecc.), no superlativi, frasi asciutte.

## 7. Data flow

```
Cliente paga €67
   ↓
Stripe webhook (checkout.session.completed, tipo ciak_blueprint)
   ↓
trova diagnostic_session (per session_token in metadata, fallback email)
   ↓  [background, non blocca il webhook; idempotente]
   ├─ research brief → analisi definitiva → stato "da_validare"
   ├─ bozza (da definitiva) → PDF → EMAIL immediata al cliente
   └─ script call → salvato per admin
```

Definitiva + script generati subito post-€67 ma in `da_validare`: Claudio li trova pronti per la call, li rifinisce, valida/invia dopo.

## 8. Storage — collection `ciak_analisi` (una per cliente)

- `session_token` (link alle 8 domande) + `email`
- `research_data` (risultati ricerca web)
- `bozza` (contenuto + url PDF) + `bozza_inviata_at`
- `analisi_definitiva` (6 capitoli strutturati) + `stato`: `da_validare` | `inviata` | `errore` ("Valida e invia" è un'azione unica → niente stato `validata` intermedio)
- `script_call` (contenuto, solo admin)
- timestamp + `errori` (per retry)

## 9. Collegamento pagamento ↔ 8 domande

Il webhook ritrova le 8 domande via `session_token` passato nei metadata Stripe, con fallback su email. **Da verificare/cablare nel piano**: che il link Report → checkout porti il `session_token` (`checkout/create-session` lo accetta già come opzionale). Se assente, aggancio via email.

## 10. Generazione PDF (bozza)

Riusare il meccanismo PDF già presente nel backend (la Proposta/contratto genera già PDF — **da verificare nel piano**) invece di aggiungere dipendenze. PDF brandizzato Ciak.

## 11. Consegna definitiva

Pagina web personale **`/analisi/:token`** (gemello di `/report`), brandizzata Ciak, sbloccata quando Claudio valida/invia post-call. Email al cliente con il link. Bottone "scarica PDF" → fase 2.

## 12. Admin (`ciak.io/admin`)

Riusa il pattern Pipeline / KB Matteo editor:
- **Lista "Analisi da validare"** (clienti paganti, stato `da_validare`)
- **Dettaglio**: 6 capitoli editabili + research brief + tab script call (solo Claudio)
- **"Valida e invia"** → stato `inviata`, sblocca `/analisi/:token` + email cliente. Premuto dopo la call.
- **Rigenera** — rilancia la pipeline
- **Prompt editor** — editi i prompt bozza/definitiva/script senza deploy (come KB Matteo)

## 13. Error handling (il cliente ha pagato — non resta a mani vuote)

- **Ricerca web ko** → analisi generata comunque senza dati web, nota interna "ricerca non disponibile" (degrada, non blocca)
- **Anthropic ko** → stato `errore` in admin + retry manuale + alert a Claudio
- **Bozza/PDF/email ko** → log + alert a Claudio (sa che quel cliente non ha ricevuto la bozza)
- **Idempotenza**: webhook può arrivare più volte → non rigenerare se l'analisi esiste già

## 14. Testing

- Test e2e (come per Matteo): simulo pagamento su `diagnostic_session` reale → verifico bozza (+PDF), definitiva (`da_validare`), script generati
- Web search tool risponde con la key Anthropic
- Generazione PDF
- Caso degradato: ricerca web ko → analisi esce comunque

## 15. Fuori scope (questo lavoro)

- Email +48h di prenotazione call + invio mail conferma call → modulo "prenotazione call" separato (prossimo)
- Cleanup codice morto `flusso_analisi.py` / `master_prompt_analisi.py` / `openclaw_research` → cleanup dedicato
- PDF della definitiva (solo web in fase 1)
- Script call avanzato con personalizzazione per obiezioni specifiche → iterazione successiva

## 16. Dipendenze da verificare nel piano

1. Web search tool Anthropic disponibile con la key/account corrente
2. Meccanismo PDF già esistente nel backend (Proposta/contratto)
3. `session_token` passato Report → checkout → webhook
4. Pattern prompt-store versionato riutilizzabile (`ciak_matteo_prompt_store`)
