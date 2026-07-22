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
   (scelta rapida 2k / 5k / 10k + slider personalizzato).
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

**Regola prezzo (Claudio, LOCK):** i corsi/offerte dei partner venduti ai loro
clienti stanno **tra 97€ e 297€** (min 97, tetto 297). Nel simulatore il prezzo
offerta è vincolato a questo range; default 297€ (tetto). Il €990 del mockup è
quindi sbagliato. La regola vale anche per il prezzo generato da Andrea in
`Step12PrezzoWebinar.jsx`.

**Conseguenza da sciogliere:** con il tetto a 297€, obiettivi alti richiedono
molti clienti → ritmo settimanale alto. Esempi (conv 8% / presenza 40%):

| Obiettivo/mese | a 297€ | iscritti nuovi/sett |
|---|---|---|
| 3.000 € | 10 vendite | ~73 |
| 5.000 € | 17 vendite | ~121 |
| 10.000 € | 34 vendite | ~243 |

243/sett a 10k **spaventa** un esordiente. Leve per riportarlo in range
motivante: obiettivi di default più bassi + conversioni da webinar caldo
(conv 12–15%, presenza 50%). Scelta di Claudio (vedi §3 tabella).

**Calibrazione confermata da Claudio (LOCK):**

| Parametro | Default | Nota |
|---|---|---|
| Prezzo offerta | 297 € | vincolato al range 97–297 € |
| Conversione partecipante → vendita | 15 % | webinar a pubblico caldo/piccolo |
| Tasso di presenza iscritto → webinar | 50 % | con nurturing |
| Obiettivi di default (pillole) | 2.000 / 5.000 / 10.000 € | 2k "per partire", 5k "sano", 10k "solida" |

Ritmo risultante con questi default: **~21 / ~52 / ~104** iscritti nuovi a
settimana. Fattibile e incoraggiante sugli obiettivi tipici; 10k resta
l'ambizione. Il prezzo è editabile ma **clampato a [97, 297]**.

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
