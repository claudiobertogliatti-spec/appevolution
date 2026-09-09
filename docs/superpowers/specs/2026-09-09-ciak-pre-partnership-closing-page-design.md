# Pagina di chiusura post-call "Evolution Insider" (V1) — design

- **Data:** 2026-09-09
- **Autore:** Claudio + Claude
- **Stato:** design in revisione (pre-plan)
- **Branch:** `cc/ciak-pre-partnership-close`

## 1. Problema

Il collo di bottiglia dove si perde fatturato è **subito dopo la call di analisi**. Il cliente che ha appena ricevuto la sua analisi **raramente decide subito**: oggi riceve un link proposta statico e "ci pensa". Serve una **pagina di chiusura a risposta diretta** che trasformi il momento post-call in una decisione.

**Obiettivo di business:** aumentare la conversione post-call (Start o Partnership), in tempo utile per il piano **€10k entro il 30/9**. Metrica primaria: % di lead "call fatta" che acquista (Start o Partnership) entro N giorni dall'accesso alla pagina.

## 2. Cosa esiste già (si riusa, non si reinventa)

Verificato nel codice:

- Route frontend **`/proposta/:token` → `frontend/src/ciak/pages/Proposta.jsx`** (il token È l'accesso: nessun login).
- Backend proposta: `POST /api/proposta/genera/{partner_id}` (crea token), `GET /api/proposta/{token}`, `POST /api/proposta/{token}/accetta`, `.../firma-contratto`, `.../pagamento-stripe` (+ `conferma-stripe`).
- **Start**: `start_checkout` / `ensure_start_checkout_allowed` in `routers/ciak_clients` (+ `frontend/src/ciak/client/pages/StartPage.jsx`).
- **Analisi** del cliente: già generata dal funnel (8 domande → scoring AI interno "Carlo").
- **Contratto**: template reale (durata 12 mesi, pagamento alla firma o max 3 rate, royalty 10%, DPA, firma digitale).
- **Chat**: `SerenoAssistenza` (area partner sereno, già live).

➡️ La V1 **estende la pagina proposta a token esistente** in un'esperienza Insider personalizzata e **aggiunge la seconda offerta (Start)**, riusando gli endpoint sopra. Non crea un nuovo sistema di auth né un nuovo checkout.

## 3. Scopo

### In V1
1. **Accesso pre-partnership via token** (riuso del meccanismo proposta; il link arriva post-call, generato da admin/Carlo).
2. **Pagina personalizzata** con, in ordine:
   - **Benvenuto Insider** caldo, col nome del cliente → "sei entrato in **Evolution Insider**" + CTA per unirsi al **gruppo Telegram**.
   - **Video persuasivo** (uno standard in V1).
   - **La SUA analisi**, riletta in chiave "ecco cosa abbiamo visto di te".
   - **La scala offerta**: **Start** (primo mattone, operativo subito) → **Partnership** (l'eroe: la tua Accademia Digitale personalizzata). Copy assumptive; leva onesta = **lo Start è credito verso la Partnership** (i €390 si riscalano; Upgrade derivato reale).
   - **CTA → flusso checkout/contratto ESISTENTE** (Start: `start_checkout`; Partnership: `accetta`/`firma-contratto`/`pagamento-stripe`).
   - **Chat** = `SerenoAssistenza` già live.
3. **Personalizzazione dallo scoring interno (Carlo)**: lo stato (pronto/tiepido) decide **quale offerta è l'eroe** (Partnership enfatizzata per i pronti; Start come rete per i tiepidi). Nessun punteggio mostrato al cliente.

### Fuori V1 → V2 (dichiarato)
- **Firma + condizioni di vendita self-serve inline riscritte consumer-clean** (Codice del Consumo: informazioni precontrattuali, **diritto di recesso**, accettazione termini) e revisione del contratto che oggi "si legge come acquisto di un corso". ⚠️ La V1 usa il flusso `firma-contratto`/`pagamento-stripe` **già esistente e già live**: non aggiunge nuova superficie legale, ma **non la corregge** — la correzione consumer-clean è V2.
- **Video personalizzato** per cliente.
- **Nurture automatico** (community Systeme + sequenze). In V1 la community è solo un **link Telegram**.

## 4. Principi di risposta diretta (guida al copy)

- **Assumptive close**: si dà per scontato il "sì" piccolo (Start), si apre al "sì" grande (Partnership).
- **Appartenenza (Insider)**: il Blueprint gratis è già un impegno → "sei già dei nostri" abbassa la difesa.
- **Scala, non aut-aut**: Start = pavimento a basso attrito; **Partnership = eroe raccomandato**; il **credito** è il ponte (togli il freno "e se mi pento").
- **Anti-ancoraggio**: la Partnership resta l'eroe visivo/testuale, per non cappare tutti a €390 (rischio per l'obiettivo €10k).
- ⛔ **Onestà (Codice del Consumo, artt. 21-23)**: nessuna recensione/percentuale/guadagno inventati; non dire "sei già partner" (è un lead con analisi gratuita); il credito Start→Partnership va dichiarato solo perché è **vero**.

## 5. Architettura V1 (unità isolate)

| Unità | Cosa fa | Dipende da |
|---|---|---|
| **Accesso a token** | Il link `/proposta/:token` (o nuova route `/insider/:token`) autentica il lead senza login | `GET /api/proposta/:token` |
| **`InsiderClosingPage`** (nuovo/esteso da `Proposta.jsx`) | Orchestra le sezioni della pagina; carica dati proposta+analisi; sceglie l'enfasi offerta dallo scoring | dati proposta/analisi |
| **`InsiderWelcome`** | Benvenuto personalizzato + CTA Telegram | nome cliente, `telegram_group_url` |
| **`VideoBlock`** | Video persuasivo standard | URL video (da fornire) |
| **`AnalysisRecap`** | Rilettura persuasiva dell'analisi già generata | analisi del lead |
| **`OfferLadder`** | Card Start + Partnership, copy scala/credito, enfasi da scoring, CTA | endpoint checkout esistenti |
| **CTA checkout** | Start → `start_checkout`; Partnership → `accetta`/`firma-contratto`/`pagamento-stripe` | backend esistente |
| **Chat** | Riuso `SerenoAssistenza` | già live |

Ogni unità è testabile in isolamento (dati in ingresso → render), la logica "quale offerta è l'eroe" è una **funzione pura** su `stato/scoring`.

## 6. Flusso dati

```
call fatta (stato call_done)
  → admin/Carlo genera l'accesso (riuso POST /api/proposta/genera/{id}, esteso per includere Start + analisi)
  → il lead riceve il link /insider/:token
  → apre → GET /api/proposta/:token restituisce {cliente, analisi, scoring/stato, offerte}
  → InsiderClosingPage rende benvenuto + video + analisi + OfferLadder (enfasi da stato)
  → CTA:
       Start       → start_checkout (Stripe) → diventa cliente Start (credito verso Partnership)
       Partnership → accetta → firma-contratto → pagamento-stripe → diventa partner
  → in qualunque momento: Chat (SerenoAssistenza) + link gruppo Telegram Insider
```

⚠️ **Da confermare in fase di plan** (no-guessing): che `GET /api/proposta/:token` restituisca già l'analisi e lo scoring, o se serve estenderlo; se il token proposta attuale copra anche il caso "solo Start"; il contenuto attuale esatto di `Proposta.jsx`.

## 7. Stati ed errori (riuso pattern sereno, onesti)

- **Analisi non pronta / mancante** → messaggio onesto, niente placeholder finti; CTA "ti avvisiamo appena pronta" / chat.
- **Token invalido o scaduto** → schermata chiara + contatto (no login, no crash).
- **Già acquistato** (Start o Partnership) → non ripropone il checkout; porta all'area partner sereno.
- **Backend giù al pagamento** → errore onesto + riprova + ripiego Telegram (come la chat sereno). **Mai** dichiarare un acquisto non andato a buon fine.

## 8. Confini (chi fa cosa)

- **Claude (codice, nel repo):** pagina Insider + OfferLadder + personalizzazione + wiring agli endpoint esistenti + test.
- **Claudio (dietro le sue credenziali):** creare il **gruppo Telegram Insider** (o la community Systeme); fornire l'**URL del video**; ⚠️ la **chiave Systeme è morta** (incidente 3/9) → va rimessa a posto prima di qualunque nurture Systeme.
- **Legale (V2):** riscrittura contratto consumer-clean + diritto di recesso + condizioni di vendita, prima di rendere la firma self-serve inline un flusso nuovo.

## 9. Domande aperte / decisioni

1. **Route**: estendere `Proposta.jsx` o nuova `/insider/:token`? (proposta: nuova pagina che riusa gli endpoint, per non rompere il flusso proposta attuale).
2. **Mapping scoring → offerta**: stato 1-4 di Carlo → enfasi Start vs Partnership. Regola esatta da concordare.
3. **Video**: un solo video standard per V1 — URL da fornire (YouTube/Cloudinary?).
4. **Telegram**: URL del gruppo Insider (da creare).
5. **Start come opzione nel token proposta**: il flusso proposta attuale è Partnership-only? Se sì, aggiungere il ramo Start.
6. **`firma-contratto` attuale**: è già una firma valida? va bene riusarla in V1 o è essa stessa il pezzo "si legge come un corso" da non spingere? (decide se V1 include davvero la firma o solo il pagamento con firma differita).

## 10. Test

- Funzione pura **offerta-eroe(stato)**: mapping scoring → enfasi (controprova: cambia stato, cambia eroe).
- Render `OfferLadder`: mostra prezzi **reali** (Start €390, Partnership €2.990) e copy credito; nessun prezzo inventato.
- Render personalizzazione: nome + analisi del lead compaiono; stati onesti (analisi mancante, token scaduto, già acquistato).
- Wiring (fetch mockato): il CTA Start chiama `start_checkout`; il CTA Partnership chiama `accetta`/`pagamento-stripe`.
- Nessun test tocca pagamenti reali (Stripe è esistente e non si tocca).

## 11. Metrica di successo

- **Primaria:** conversione post-call (Start+Partnership) / accessi alla pagina, entro N giorni.
- **Secondaria:** quota Partnership sul totale (per sorvegliare l'anti-ancoraggio: la Partnership deve restare l'eroe).
- **Guardrail:** zero reclami legati a claim non veri; il credito Start→Partnership rispettato in cassa.
