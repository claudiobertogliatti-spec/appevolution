# Simulatore obiettivo partner — Fase 1 (Esamina)

**Data:** 2026-07-22
**Stato:** design approvato (mockup validato), spec in review
**Agente guida:** Simona (id interno `STEFANIA`)

---

## 1. Perché

Serve una leva che spinga il partner a **lavorare settimana per settimana** con
costanza. Non è un "quanto potrei guadagnare" da sogno: il numero da sogno
motiva un giorno e demotiva il resto del mese. Questo simulatore fa l'opposto —
parte dalla meta e la traduce in **un gesto settimanale concreto e ripetibile**,
poi mostra che il risultato arriva *solo* se il ritmo si mantiene.

Va posizionato **in apertura di Fase 1, subito prima del Posizionamento**: prima
si fissa la meta (Simona), poi si costruisce il primo mattone per raggiungerla
(Valentina, Posizionamento). È una staffetta narrativa deliberata.

Distinto dal **Simulatore Fatturato €1M admin** (`simulatoreFatturato.js`), che è
il cockpit di direzione (coorti, provvigioni, EVO-S). Quello non si tocca.

## 2. Cosa fa (obiettivo-first)

1. Il partner dichiara **quanto vuole fatturare al mese** con la sua academy
   (scelta rapida 3k / 10k / 20k + slider personalizzato).
2. Il simulatore lavora **a ritroso** e restituisce **un solo numero-chiave**:
   *quante persone nuove deve portare ogni settimana*.
3. Mostra la **curva della costanza**: ritmo costante → raggiunge l'obiettivo
   entro N mesi; "parti e molli" → resta a metà. Qui sta la leva psicologica.
4. Chiude passando la palla a Valentina per il Posizionamento.

### Catena di calcolo

```
obiettivo €/mese
  ÷ prezzo offerta        → vendite / mese
  ÷ conversione vendita   → partecipanti al webinar / mese
  ÷ tasso di presenza     → iscritti nuovi / mese
  ÷ 4,33                  → ISCRITTI NUOVI / SETTIMANA   ← numero-chiave
```

I tre parametri (prezzo, conversione, presenza) sono **default tarati sul
metodo**, nascosti sotto un accordion "Come ho calcolato questo numero" e
modificabili. Target poco digitalizzato → in prima battuta si vede *un input e
un numero*, il resto è opzionale (coerente con il pattern wizard low-literacy).

## 3. Rischio principale: la calibrazione (da validare con Claudio)

Il modello è aritmetica banale; il valore sta tutto nei **default**. Se sbagliati,
il numero-chiave esce assurdo e **demotiva** (es. "245 persone a settimana"
spaventa un partner all'esordio).

Dato accertato nel codice: il prezzo del corso **non è fisso** — lo genera Andrea
per partner dal Posizionamento (`Step12PrezzoWebinar.jsx`), con esempi
**listino ~297€ / promo ~197€**. Quindi il default €990 del mockup è sbagliato.

**Vincolo di design:** i default vanno scelti in modo che, per l'obiettivo
"sano" (10k), il ritmo risultante cada in un range **credibile e incoraggiante**
(indicativamente 30–60 persone/settimana). Si lavora a ritroso da lì per fissare
prezzo/conversione/presenza realistici. **Questi tre numeri li conferma Claudio
in review** — la spec non li congela.

Valori di partenza proposti (da validare):

| Parametro | Default proposto | Fonte / nota |
|---|---|---|
| Prezzo offerta | 297 € | listino tipico `Step12PrezzoWebinar` |
| Conversione partecipante → vendita | 8 % | benchmark webinar, da confermare |
| Tasso di presenza iscritto → webinar | 40 % | benchmark, da confermare |

Se con questi il ritmo esce troppo alto, le leve sono: prezzo più alto (upsell),
conversione più alta (pubblico caldo/piccolo), o cadenza webinar (mensile con
accumulo, non settimanale). Decisione di Claudio.

## 4. Dove si innesta (tecnico)

Nuovo step del journey, fase `esamina`, tra `la-tua-storia` e `04-posizionamento`.

- **`backend/models/partner_journey_step.py`**
  - nuovo step, id proposto `obiettivo`, `macro_phase: "esamina"`, label
    "Il tuo obiettivo", inserito nell'ordine tra step 5 e 6 (rinumerare a valle).
  - aggiungere l'id a `step_ids` della fase `esamina`, **prima** di
    `04-posizionamento`.
- **`frontend/src/ciak/partner/operativo/agents.js`**
  - `STEP_TO_AGENT["obiettivo"] = "STEFANIA"` (Simona).
- **`frontend/src/ciak/partner/operativo/PartnerOperativo.jsx`**
  - registrare `"obiettivo"` in `STEP_COMPONENTS` → `StepObiettivo` (lazy).

### Modello puro + componente

- **`frontend/src/ciak/partner/operativo/obiettivoModel.js`** — modulo PURO
  (nessuna dipendenza React), come `simulatoreFatturato.js`. Espone i default,
  `computeRitmo({goal, price, conv, show})` → `{sales, attend, leads, perWeek}`,
  e `etaMesi(perWeek)`. **Testabile in isolamento.**
- **`obiettivoModel.test.js`** — copre catena di calcolo, arrotondamenti, guardie
  divisione-per-zero, monotonìa (obiettivo ↑ ⇒ perWeek ↑).
- **`frontend/src/ciak/partner/operativo/steps/StepObiettivo.jsx`** — usa
  `StepBase`, header voce di Simona, la UX del mockup. `onSaveDraft` a ogni
  cambio, `onComplete` alla conferma.

### Persistenza (accountability)

Nessun endpoint backend nuovo: si riusa il salvataggio step esistente
(`useJourneyState` → `completeStep`/`saveDraft`, scrive su `partner_journey_steps`).

`step.data` salva:

```json
{
  "goal": 10000,
  "params": { "price": 297, "conv": 8, "show": 40 },
  "perWeek": 52,
  "etaMonths": 4
}
```

Così Simona può **richiamare l'obiettivo dopo** ("il tuo ritmo era 52/settimana")
e diventa accountability continua, non una schermata una-tantum. (Uso futuro
lato chat/agente fuori scope qui, ma il dato resta pronto.)

## 5. UI/UX

Riferimento: mockup `simulatore-obiettivo-partner.html` (artifact
`6554087b-5891-400f-9050-9e0bf2589e8a`). Brand Ciak: Poppins, slate + giallo
`#FACC15`. Blocchi impilati:

1. Header Simona (avatar "S", ruolo, bolla che introduce).
2. Card obiettivo: pillole 3k/10k/20k + slider custom.
3. **Hero scuro**: numero-chiave enorme in giallo + "persone nuove ogni
   settimana" + tag "arrivi entro N mesi".
4. Accordion "Come ho calcolato": catena a ritroso + 3 parametri editabili.
5. Card costanza: canvas con due curve (costante vs molla) + interruttore
   "se salto le settimane" + verdetto testuale.
6. CTA staffetta → Valentina / Posizionamento.

Accessibilità: `prefers-reduced-motion`, focus visibile, contrasto in entrambi i
temi.

## 6. Fuori scope

- Modifiche al simulatore admin €1M.
- Modifiche al funnel Ciak.
- Nuovi endpoint backend / modelli AI.
- Uso dell'obiettivo salvato dentro la chat di Simona (dato pronto, consumo poi).
- Variante "vendita diretta senza webinar": si tiene il modello webinar (motore
  del metodo EVO verso cui il partner costruisce); il copy lo chiarisce.

## 7. Testing

- Unit sul modulo puro (`obiettivoModel.test.js`), come per il simulatore admin.
- Verifica visiva del componente nella preview (chiaro/scuro, mobile).
- Check di calibrazione: per goal 10k con i default confermati, il perWeek deve
  cadere nel range concordato con Claudio.
