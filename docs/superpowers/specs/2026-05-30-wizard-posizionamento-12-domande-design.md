# Wizard Posizionamento — 12 domande in 4 sezioni

**Data:** 2026-05-30
**Stato:** Approvato in brainstorming, pronto per implementation plan
**Riferimento aperto:** sessione 30/5/2026 PM, aperto #1 della sessione ponte-posizionamento-approvazione
**Spec collegata:** [`2026-05-30-ponte-posizionamento-approvazione-design.md`](2026-05-30-ponte-posizionamento-approvazione-design.md) — l'infrastruttura PDF + coda admin è già deployata (backend rev `00303-vwh`)

## Contesto

Lo step `04-posizionamento` del journey partner usa oggi 8 domande textarea generiche (`Step04Posizionamento.jsx`):
`nicchia, promessa, cliente_tipo, problema_chiave, trasformazione, differenza, metodo_proprio, prova_sociale`.

Tre di queste **sovrappongono** le domande del Ciak gate che il partner ha già compilato pre-firma (durante il funnel €67):
- `nicchia` ≈ Q1 Ciak (competenza) + Q5 Ciak (target)
- `cliente_tipo` ≈ Q5 Ciak (target)
- `problema_chiave` ≈ Q6 Ciak (problema)

Risultato: il partner si trova a rispondere due volte alle stesse domande, in due momenti diversi del percorso, senza che il sistema riconosca il lavoro già fatto. Più: il documento generato non è abbastanza ricco per servire i tre destinatari operativi reali (team funnel, Matteo AI per gli step successivi, partner stesso come north star).

## Obiettivo

Sostituire le 8 domande attuali con un **set di 12 domande organizzate in 4 sezioni**, con **pre-compilazione** dei campi sovrapposti dalle risposte già date al Ciak gate. Il documento PDF approvato deve servire simultaneamente:

1. **Team funnel** (Antonella + Valentina) — copy headline-ready, ICP scolpito, prezzo+formato, prova sociale concreta
2. **Matteo AI** (step successivi 5-8) — materiale narrativo strutturato per generare script masterclass + outline lezioni
3. **Partner stesso** — north star da rileggere, origin story, contrarian view, voce riconoscibile

## Out of scope

- Migrazione dati per partner con vecchio set di risposte (zero partner reali hanno completato Step04 — feature deployata oggi 30/5, solo `deploy-check-evo` di test ne ha versioni vecchie).
- Generazione AI-assistita della bozza (opzione scartata in brainstorming).
- Pre-fill su domande diverse dalle 2 mappate al Ciak gate (resto delle 10 nuove resta blank).
- Modifiche al Ciak gate o alle 8 domande pre-firma (sono LOCK 5/5 per il funnel €67).

## Set di 12 domande (LOCK)

### Sezione 1 — A chi parli

Header UI: **A chi parli** · Sottotitolo: *"L'obiettivo è chiaro: tre risposte che scolpiscono il tuo cliente ideale."*

| # | key | Domanda | Hint | Min char | Pre-fill |
|---|---|---|---|---|---|
| 1 | `nicchia` | Qual è la nicchia precisa che vuoi servire? | Non "consulenti", ma "consulenti finanziari indipendenti italiani 35-50 anni che operano per conto proprio". | 30 | ✅ da Ciak Q1+Q5 |
| 2 | `momento_di_vita` | In che momento della loro vita o carriera ti cercano? | Stanno per cambiare, sono in crisi, hanno appena fallito, stanno scalando? Quando "scattano" e ti vengono a cercare. | 25 | — |
| 3 | `livello_consapevolezza` | Quanto sanno già del problema quando ti incontrano? | Non sanno di averlo (devi spiegarglielo)? Sanno di averlo ma cercano soluzioni sbagliate? Hanno già provato cose che non hanno funzionato? | 25 | — |

### Sezione 2 — Cosa vendi

Header UI: **Cosa vendi** · Sottotitolo: *"Non un corso. Un risultato. Tre risposte che lo rendono ineluttabile."*

| # | key | Domanda | Hint | Min char | Pre-fill |
|---|---|---|---|---|---|
| 4 | `promessa` | Qual è la promessa in 1 frase? | Headline-ready. Non "ti aiuto a stare meglio", ma "in 90 giorni esci dal lavoro a ore e crei un'offerta che vendi anche mentre dormi". Specifica, misurabile, con un tempo. | 40 | ✅ da Ciak Q4+Q6 |
| 5 | `trasformazione_90gg` | Cosa è cambiato concretamente nella vita del cliente dopo 90 giorni? | Numeri, comportamenti, sensazioni misurabili. Non "si sente più sicuro", ma "ha la sua agenda piena di call qualificate, fattura 3-5k al mese ricorrenti, smette di rincorrere clienti". | 50 | — |
| 6 | `prezzo_e_formato` | A che prezzo lo vendi e in che formato? | Range realistico (es. "tra 497€ e 1.490€"), formato (corso self-paced, gruppo coaching 8 settimane, 1-1 6 mesi). Se ancora non lo sai, scrivi quello che IMMAGINI di vendere — lo affineremo insieme. | 30 | — |

### Sezione 3 — Il tuo metodo

Header UI: **Il tuo metodo** · Sottotitolo: *"Non per sembrare diverso. Per essere riconoscibile. Tre risposte che danno forma al tuo modo di lavorare."*

| # | key | Domanda | Hint | Min char | Pre-fill |
|---|---|---|---|---|---|
| 7 | `metodo_nome` | Come si chiama il tuo metodo? (anche provvisorio) | Un nome breve, memorabile, che dica qualcosa. Es: "Metodo EVO", "Sistema Profit-First", "Approccio Anti-Fuffa". Se non ce l'hai ancora, scrivi 2-3 idee separate da virgola — lo affineremo insieme. | 5 | — |
| 8 | `metodo_step` | In 3-5 step, come funziona? | Le tappe concrete che il cliente attraversa, in ordine. Una riga per step. Es: 1. Diagnosi del posizionamento attuale 2. Costruzione offerta core 3. Funnel di acquisizione live 4. Primi 10 clienti paganti 5. Sistema di scaling. | 80 | — |
| 9 | `prova_sociale_concreta` | Un caso reale con un numero o un risultato concreto. | Nome + cosa è cambiato + tempo. Es: "Marco R., consulente assicurativo: da 0 a 8 clienti paganti in 45 giorni dopo il primo lancio. Fatturato +6.200€/mese." Se non hai casi, scrivi quello del cliente più vicino al risultato (anche tuo, se sei partito da zero). | 50 | — |

### Sezione 4 — Perché tu

Header UI: **Perché tu** · Sottotitolo: *"Quello che ti rende difficile da copiare. Tre risposte che diventano la tua voce."*

| # | key | Domanda | Hint | Min char | Pre-fill |
|---|---|---|---|---|---|
| 10 | `origin_story` | Perché sei tu a fare questo? Cosa ti è successo che ti ha portato qui? | Una storia vera, anche piccola. Il momento in cui hai capito che dovevi farlo, la frustrazione che ti ha spinto, il fallimento da cui hai imparato. Non per fare "lo storytelling": è quello che ti rende umano e credibile agli occhi del tuo pubblico. | 80 | — |
| 11 | `contrarian_view` | Cosa pensi che gli altri nel tuo settore sbaglino? | Non per attaccare nessuno. Per piantare bandiera. Es: "Tutti vendono templates di funnel. Io penso che senza un posizionamento solido il template è la cosa meno importante." Una frase netta, riconoscibile. | 50 | — |
| 12 | `differenza_riconoscibile` | Se un cliente parlasse di te a un amico, come ti descriverebbe in 1 frase? | Non "il migliore di tutti", ma una caratteristica concreta. Es: "Quello che ti fa fare lo schema su carta prima di toccare un funnel." "Quella che non ti molla finché non hai chiuso il primo cliente." Specifica, riconoscibile, vera. | 40 | — |

## Pre-fill dal Ciak gate

Quando il partner apre lo Step04 per la **prima volta** (cioè `step.data.answers` è vuoto/mancante), il backend deve seed-are due campi prendendo le risposte già date al Ciak gate. Usiamo solo i **testi liberi** (Q1 e Q6), NON i livelli enum (Q4 idea / Q5 target) — gli enum producono frasi awkward ("Idea dichiarata: Sì confusa.") che peggiorano l'UX invece di aiutare.

- `nicchia` ← `competenza_raw` (Q1 Ciak), testo libero così com'è. Il partner lo affina specificandolo (la hint sotto la domanda dice di passare da "consulenti" a "consulenti finanziari indipendenti italiani 35-50 anni…").
- `promessa` ← frase fatta dal `problema_raw` (Q6 Ciak). Formula:
  > "Aiuto le persone a risolvere questo problema: {problema_raw}."

  Il partner la trasforma in una promessa headline-ready ("in 90 giorni esci dal lavoro a ore…").

Note pratiche:
- Se la collezione `diagnostic_sessions` non ha record per il partner (es. partner entrato fuori funnel, o test partner come `deploy-check-evo`), il pre-fill è **silenziosamente saltato** — il campo resta vuoto, il partner lo compila da zero. Nessun errore mostrato.
- Match partner ↔ diagnostic session: per `email` (la collection `diagnostic_sessions` indicizza per `email`; il partner ha `partners.email`).
- Il pre-fill avviene **server-side** dentro `complete_operativo_step` o nel GET dello state journey, NON client-side (evita race con autosave drafts).
- Pre-fill **una volta sola**: alla prima visita. Se il partner cancella il pre-fill e salva vuoto, alle visite successive resta vuoto (rispetta la sua scelta). Implementazione: flag `data.prefilled_from_ciak: true` settato al primo pre-fill, controllato per evitare ri-pre-fill.

## Modifiche backend

### `backend/services/posizionamento_pdf_renderer.py`

Sostituire `SECTIONS` (lista flat di 8 tuple) con `SECTIONS_GROUPED` (lista di 4 dict, ciascuno con sezione + lista di item):

```python
SECTIONS_GROUPED = [
    {
        "header": "A chi parli",
        "subtitle": "L'ICP scolpito — chi, dove ti cerca, quanto sa.",
        "items": [
            ("nicchia",                "01", "Nicchia precisa"),
            ("momento_di_vita",        "02", "Momento di vita / carriera"),
            ("livello_consapevolezza", "03", "Livello di consapevolezza"),
        ],
    },
    {
        "header": "Cosa vendi",
        "subtitle": "Promessa, trasformazione, prezzo, formato.",
        "items": [
            ("promessa",            "04", "Promessa in 1 frase"),
            ("trasformazione_90gg", "05", "Trasformazione in 90 giorni"),
            ("prezzo_e_formato",    "06", "Prezzo e formato"),
        ],
    },
    {
        "header": "Il tuo metodo",
        "subtitle": "Il modo riconoscibile in cui produci risultati.",
        "items": [
            ("metodo_nome",            "07", "Nome metodo"),
            ("metodo_step",            "08", "Step del metodo"),
            ("prova_sociale_concreta", "09", "Prova sociale concreta"),
        ],
    },
    {
        "header": "Perché tu",
        "subtitle": "La voce che ti rende difficile da copiare.",
        "items": [
            ("origin_story",            "10", "Origin story"),
            ("contrarian_view",         "11", "Punto di vista contrarian"),
            ("differenza_riconoscibile","12", "Come ti descriverebbero"),
        ],
    },
]
```

`render_posizionamento_html` rinnovata: itera `SECTIONS_GROUPED`, per ogni gruppo renderizza un sub-header (`header` + `subtitle`) + le 3 item sezioni sotto. Le keys vecchie (`cliente_tipo`, `problema_chiave`, `trasformazione`, `differenza`, `metodo_proprio`, `prova_sociale`) NON vengono più cercate — un partner con risposte vecchie genererà un PDF a sezioni vuote (accettabile: solo il partner test `deploy-check-evo`).

### Pre-fill server-side

Aggiungere helper `_compute_prefill_from_ciak(partner_id) -> dict` in `backend/routers/posizionamento_approval.py` (o in un nuovo `services/posizionamento_prefill.py` se preferito per isolamento):

```python
async def _compute_prefill_from_ciak(partner_id: str) -> dict:
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1})
    if not partner or not partner.get("email"):
        return {}
    session = await db.diagnostic_sessions.find_one(
        {"email": partner["email"]},
        {"_id": 0, "answers": 1, "competenza_raw": 1, "problema_raw": 1},
        sort=[("created_at", -1)],
    )
    if not session:
        return {}
    competenza = (session.get("competenza_raw") or
                  (session.get("answers") or {}).get("competenza", "")).strip()
    problema = (session.get("problema_raw") or
                (session.get("answers") or {}).get("problema", "")).strip()
    out = {}
    if competenza:
        out["nicchia"] = competenza
    if problema:
        out["promessa"] = f"Aiuto le persone a risolvere questo problema: {problema}."
    return out
```

Integrazione: quando si serve lo state operativo o quando si fa autosave/draft del primo step 04-posizionamento, se `data.answers` è `{}` o mancante AND `data.prefilled_from_ciak != True`, calcolare i pre-fill, mergiarli in `data.answers`, e settare `data.prefilled_from_ciak = True`. Persistere atomicamente. Da ricalibrare durante writing-plans: il punto esatto di iniezione (GET state vs endpoint dedicato `/api/partner/posizionamento/prefill/{partner_id}`) è una decisione di plan, non di spec.

## Modifiche frontend

### `frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx`

Riscrivere il componente:
- Sostituire la costante `QUESTIONS` con `SECTIONS` (array di 4 oggetti, ciascuno con `header`, `subtitle`, `items: [{key, label, hint, minChar}]`).
- Renderizzare ogni sezione con header + sottotitolo + cards delle 3 domande. Tra sezioni: separatore visivo (border-top o spacing maggiorato).
- Per ogni domanda: label + textarea + hint sotto (text-xs slate-500) + counter `{value.length}/{minChar} min`.
- Validazione `canComplete = TUTTE le 12 domande hanno value.trim().length >= minChar`.
- Pre-fill: il componente non fa nulla di speciale lato client — riceve `step.data.answers` già pre-compilato dal backend e lo passa come initial state.
- Resto invariato: CTA "Genera Documento", spinner, error 409, done state.

### Heights / scroll considerations

La pagina diventa più lunga (12 textarea + 4 header). Garantire:
- Scroll naturale, no nested scroll
- Eventuale "torna in cima" se la lunghezza supera ~2 viewport (NON in MVP)
- Salvataggio draft automatico ad ogni edit (già supportato via `onSaveDraft` esistente)

## Edge cases

| Scenario | Comportamento |
|---|---|
| Partner senza Ciak gate (es. test partner) | Pre-fill silenziosamente saltato, tutti i campi vuoti |
| Partner con Ciak gate ma `competenza_raw` vuoto | Solo `promessa` viene pre-fillata (se ha `problema_raw`), `nicchia` resta vuota |
| Partner ricarica la pagina dopo pre-fill | Autosave ha già persistito i 2 pre-fill come parte di `data.answers` + flag `prefilled_from_ciak=true`. Pre-fill non si ricalcola |
| Partner cancella il pre-fill e salva vuoto | Salvataggio vuoto rispettato. Flag `prefilled_from_ciak` resta true → niente ricalcolo |
| Partner aveva risposte vecchie (8 keys) | Le risposte vecchie restano in `data.answers` ma non corrispondono alle 12 nuove keys. Il PDF generato sarà a sezioni vuote (solo `deploy-check-evo`, accettabile) |
| PDF render con tutte le 12 vuote | Render comunque (con "Non compilato" come placeholder per ogni sezione) — non dovrebbe mai succedere se `canComplete` è enforced UI-side, ma defensive |

## Testing

Integration test pattern (`requests` + BASE_URL, come da convenzione repo):

- `test_step04_prefills_from_ciak_when_session_exists` — seed di `diagnostic_sessions` per `test@partner.it`, GET state, verifica `step.data.answers` contiene `nicchia` e `promessa` non vuoti
- `test_step04_no_prefill_when_no_ciak_session` — partner senza email match in diagnostic_sessions, GET state, `answers={}`
- `test_step04_prefill_runs_once_only` — secondo GET state con flag `prefilled_from_ciak=true` non ri-pre-fill
- `test_finalize_pdf_renders_all_12_sections` — finalize con tutte le 12 risposte, verifica HTTP 200 e response shape
- `test_finalize_400_if_any_question_missing` — finalize con una domanda vuota (es. `metodo_step`), verifica 400 (validazione lato server in aggiunta a quella client)

## Migration & compatibilità

- **Nessun partner reale ha completato Step04** (feature deployata oggi, prima del set 12-domande). L'unico record esistente è `deploy-check-evo` (test) — accettabile che il suo PDF non renderizzi.
- Per sicurezza: il backend Step04 NON deve crashare se trova risposte con keys vecchie — il filtro estrae solo le 12 keys nuove, le altre sono ignorate.
- Validazione `canComplete` server-side (nuovo): l'endpoint `/finalize` deve verificare che TUTTE le 12 keys nuove abbiano valore non vuoto, altrimenti 400. Sostituisce il check "any answer non vuota" attuale.

## Rollout

Una sola PR mergiabile:
1. Backend: aggiornare `posizionamento_pdf_renderer.SECTIONS_GROUPED` + render
2. Backend: aggiungere `_compute_prefill_from_ciak` + integrare in punto di ingresso (da decidere in plan)
3. Backend: aggiornare validazione `/finalize` per le 12 keys
4. Frontend: riscrivere `Step04Posizionamento.jsx` con 4 sezioni
5. Deploy backend + push frontend
6. Smoke test live via Claude-in-Chrome con `deploy-check-evo`

Nessuna migrazione dati richiesta.

## Aperti collegati

- Stesso pattern (set di domande strutturato per sezioni con pre-fill) potrebbe applicarsi a `03-brand-kit` (l'altro step in `_DOC_APPROVAL_STEPS`) — spec separata.
- Eventuale "Studio AI" per generare bozze AI da risposte parziali (l'opzione scartata in brainstorming, ma utilità riconosciuta). Future.
