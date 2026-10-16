# Pagina di chiusura post-call "Evolution Insider" (V1) — design

- **Data:** 2026-09-09
- **Autore:** Claudio + Claude
- **Stato:** design in revisione (pre-plan) — aggiornato con le decisioni di Claudio
- **Branch:** `cc/ciak-pre-partnership-close`

## 1. Problema

Il collo di bottiglia dove si perde fatturato è **subito dopo la call di analisi**. Il cliente che ha appena ricevuto la sua analisi **raramente decide subito**. Serve una **sales page a risposta diretta** che trasformi il momento post-call in una decisione.

**Obiettivo di business:** aumentare la conversione post-call (Start o Partnership), in tempo utile per il piano **€10k entro il 30/9**. Metrica primaria: % di lead "call fatta" che acquista entro N giorni dall'accesso.

## 2. Cosa esiste già (si riusa, non si reinventa) — VERIFICATO nel codice

- Route frontend **`/proposta/:token` → `frontend/src/ciak/pages/Proposta.jsx`** (il token È l'accesso: nessun login).
- Backend proposta (`backend/routers/proposta.py`): `genera` (crea token), `GET /{token}`, `/{token}/accetta`, **`/{token}/firma-contratto`**, `/{token}/pagamento-stripe`, `/{token}/conferma-stripe`.
- ⭐ **Il meccanismo "contratto stile banca" della decisione #4 ESISTE GIÀ** in `firma-contratto`: richiede il **flag di accettazione** (`clausole_vessatorie_approved: true`), registra **IP + timestamp + versione** (prova legale), **genera il PDF** (`routers/contract.generate_contract_pdf`), lo **persiste** (`contratto_pdf_url` sulla proposta + `contract` sul partner) e manda **email col PDF allegato** (+ notifica Telegram admin + tag Systeme `contratto_firmato`).
- **Start**: `start_checkout` / `ensure_start_checkout_allowed` in `routers/ciak_clients` (+ `frontend/src/ciak/client/pages/StartPage.jsx`).
- **Analisi** del lead: già generata dal funnel (8 domande → scoring AI interno "Carlo").
- **Contratto**: template reale (`backend/contratto_template_unpacked/`), 12 mesi, pagamento alla firma o max 3 rate, royalty 10%, DPA.
- **Chat**: `SerenoAssistenza` (area partner sereno, già live).
- **Materiali partner**: `PartnerFilesPage` legge da `partner_posizionamento.materiali` + `partner-rewards`.

➡️ La V1 **estende la pagina proposta a token** in una **sales page Insider personalizzata**, **aggiunge la seconda offerta (Start)** e **adatta** il flusso firma esistente al modello "flag + PDF in Materiali". Non crea nuovo auth/checkout/PDF-engine.

## 3. Decisioni di Claudio (9/9) — recepite

1. **Video:** ancora **da creare** → in V1 uno **slot video** (placeholder gestito, si accende quando c'è l'URL). Non blocca il resto.
2. **Telegram Insider:** lo **crea Claudio** → in V1 CTA "entra nel gruppo" con URL configurabile.
3. **Formato offerta:** **sales page LUNGA**, enfasi sullo **Start come preambolo alla Partnership**, con **dettaglio ottimo dei servizi inclusi** per entrambi. **Start e Partnership acquistabili direttamente** dalla pagina. (Guardrail anti-ancoraggio: pur enfatizzando lo Start come porta, la Partnership resta l'obiettivo — leva = lo Start è **credito** verso la Partnership, i €390 si riscalano.)
4. **Contratto "stile banca online":** **flag di accettazione** + testo piccolo + **link al contratto** da leggere. **Dopo pagamento + accettazione** → **PDF precompilato e "firmato" generato e salvato nella sezione Materiali** del cliente. → **riuso** del `firma-contratto` esistente, **adattato**: l'accettazione (checkbox) è l'atto vincolante (oggi richiede una firma disegnata `signature_base64` → si rende opzionale/sostituita dal consenso esplicito, mantenendo IP+timestamp+versione come prova), e il `contratto_pdf_url` va **esposto nei Materiali**.

## 4. Scopo

### In V1
- **Sales page Insider a token**: benvenuto caldo col nome ("sei in **Evolution Insider**" + CTA Telegram) → slot **video** → **rilettura dell'analisi** ("ecco cosa abbiamo visto di te") → **sezioni lunghe di vendita** con dettaglio servizi → **doppia offerta** Start (preambolo) / Partnership (obiettivo), entrambe acquistabili.
- **Checkout**: Start → `start_checkout`; Partnership → `accetta` → **accettazione clausole (checkbox + link contratto)** → `pagamento-stripe` → **PDF firmato generato e salvato in Materiali**.
- **Personalizzazione** dallo scoring di Carlo: enfasi/copy adattati allo stato (preambolo Start più forte per i tiepidi; Partnership più diretta per i pronti). Nessun punteggio mostrato.
- **Chat** = `SerenoAssistenza` già live.

### Fuori V1 → V2 (dichiarato)
- **Video personalizzato** per cliente.
- **Nurture automatico** (community Systeme + sequenze). In V1 la community è solo il **link Telegram**. ⚠️ chiave Systeme morta (incidente 3/9), da rimettere a posto prima.

## 5. ⚖️ Guardrail legale (gate prima del go-live con soldi veri)

Il meccanismo tecnico c'è, ma la **correttezza legale della vendita online a un consumatore** resta da chiudere — non è codice, è contenuto/consulenza:
- **Diritto di recesso** (Codice del Consumo / dir. Consumer Rights): per contratti a distanza col consumatore serve gestire il recesso (14 gg, salvo servizio iniziato con consenso espresso e informativa). **Oggi non c'è.**
- **Informazioni precontrattuali** presentate prima dell'acquisto.
- **Testo del contratto**: la memoria segnala che "[si legge come acquisto di un corso](documenti_commerciali_ufficiali.md)" → va riletto/sistemato prima di farlo accettare online in scala.

➡️ **Raccomandazione:** costruire il meccanismo in V1, ma **gate legale** (recesso + revisione testo) prima di accenderlo su pagamenti reali. È una decisione/consulenza di Claudio, non un blocco tecnico.

## 6. Architettura V1 (unità isolate)

| Unità | Cosa fa | Riuso / dipendenza |
|---|---|---|
| **Accesso a token** | `/:token` autentica il lead senza login | `GET /api/proposta/:token` |
| **`InsiderSalesPage`** (nuova, o estende `Proposta.jsx`) | Orchestra le sezioni; carica proposta+analisi; sceglie enfasi da scoring | dati proposta/analisi |
| **`InsiderWelcome`** | Benvenuto personalizzato + CTA Telegram | nome, `telegram_group_url` |
| **`VideoSlot`** | Video standard (placeholder finché non c'è l'URL) | URL video (V1 vuoto gestito) |
| **`AnalysisRecap`** | Rilettura persuasiva dell'analisi già generata | analisi del lead |
| **`OfferSections`** | Sezioni lunghe: Start (preambolo, servizi inclusi) + Partnership (obiettivo, servizi inclusi), copy scala/credito, CTA | listino reale (Start €390 / Partnership €2.990) |
| **`ContractAccept`** | Checkbox accettazione + testo piccolo + link al contratto | adatta `firma-contratto` (checkbox-as-consent; IP+ts+versione) |
| **CTA checkout** | Start → `start_checkout`; Partnership → `accetta`/`pagamento-stripe` | backend esistente |
| **PDF → Materiali** | Il `contratto_pdf_url` generato compare nella sezione Materiali del cliente | estende la fetch di `PartnerFilesPage` |
| **Chat** | Riuso `SerenoAssistenza` | già live |

La logica "enfasi offerta dallo scoring" è una **funzione pura** testabile.

## 7. Flusso dati

```
call fatta → admin/Carlo genera l'accesso (riuso proposta/genera, esteso: Start + analisi)
  → lead apre /:token → GET proposta {cliente, analisi, stato, offerte}
  → InsiderSalesPage: welcome + video-slot + analisi + sezioni offerta (enfasi da stato)
  → CTA:
      Start       → start_checkout (Stripe) → cliente Start (credito verso Partnership)
      Partnership → accetta → [checkbox accettazione + link contratto] → pagamento-stripe
                  → firma-contratto adattato: genera PDF precompilato "firmato" (IP/ts/versione)
                  → PDF salvato + esposto nei Materiali del cliente → diventa partner
  → sempre: Chat (SerenoAssistenza) + link gruppo Telegram Insider
```

⚠️ **Da confermare in fase di plan:** che `GET /api/proposta/:token` restituisca già analisi+scoring (o estenderlo); se la proposta oggi è Partnership-only (aggiungere ramo Start); ordine esatto pagamento↔firma (Claudio: "dopo pagamento e accettazione"); cosa fa esattamente `generate_contract_pdf` e dove salva.

## 8. Stati ed errori (pattern sereno, onesti)

- **Analisi non pronta / token scaduto / già acquistato** → messaggi onesti, niente placeholder finti, niente crash.
- **Backend giù al pagamento/firma** → errore onesto + riprova + ripiego Telegram. **Mai** dichiarare un acquisto/firma non riusciti.
- **PDF non generato** → non dire "contratto firmato" finché il PDF non esiste davvero (anti collaudo-catene).

## 9. Confini (chi fa cosa)

- **Claude (codice):** sales page + offerte + personalizzazione + adattamento firma (checkbox) + PDF nei Materiali + wiring + test.
- **Claudio (sue credenziali):** creare il **gruppo Telegram**; creare/fornire il **video**; **decisione legale** su recesso + revisione testo contratto (gate go-live).
- **Legale (gate):** recesso + condizioni di vendita + revisione contratto consumer-clean.

## 10. Domande aperte

1. **Route**: nuova `/insider/:token` (riusa endpoint) o estensione di `Proposta.jsx`? (proposta: nuova pagina, per non rischiare il flusso proposta attuale).
2. **Mapping scoring → enfasi** (stato 1-4 → quanto spingere Start-preambolo vs Partnership).
3. **Firma**: confermato che l'**accettazione checkbox sostituisce la firma disegnata** (mantenendo IP+timestamp+versione come prova)? o si tiene anche la firma disegnata opzionale?
4. **Recesso**: si aggiunge già in V1 (clausola + eventuale finestra) o è parte del gate legale prima del go-live?

## 11. Test

- Funzione pura **enfasi(stato)** (controprova: cambia stato → cambia enfasi).
- Render offerte: prezzi **reali** (Start €390, Partnership €2.990) + copy credito; nessun prezzo inventato.
- `ContractAccept`: il CTA pagamento è **bloccato finché il checkbox non è spuntato**; l'accettazione registra prova (mock).
- Wiring (fetch mockato): Start→`start_checkout`; Partnership→`accetta`/`pagamento-stripe`; PDF firmato compare nei Materiali.
- Stati onesti (analisi mancante, token scaduto, già acquistato, PDF non pronto). Nessun test tocca pagamenti reali.

## 12. Metrica di successo

- **Primaria:** conversione post-call (Start+Partnership) / accessi, entro N giorni.
- **Secondaria:** quota Partnership (sorveglia l'anti-ancoraggio).
- **Guardrail:** zero claim non veri; credito Start→Partnership rispettato in cassa; nessun "contratto firmato" dichiarato senza PDF reale.
