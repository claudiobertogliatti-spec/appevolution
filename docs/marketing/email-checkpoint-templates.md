# Email Systeme — Post Checkpoint Strategico

Template per i **4 workflow Systeme.io** che partono al submit del Checkpoint
Strategico (5 domande post-masterclass). Il backend (`routers/checkpoint.py`)
emette i tag `ciak_checkpoint_done` + `ciak_checkpoint_stato_<n>` (n=1|2|3|4).

**Voice lock**: `claudio_voice_style.md` (14/5/2026). Diretto, niente fluff,
niente motivazionale. Pattern: setup-e-correzione, "E attenzione:", esempi
concreti, frasi corte.

**Brand lock**: `ciak_brand_copy_framework.md` (12/5/2026). Termini:
- ✅ Ciak Blueprint (mai "Analisi Strategica")
- ✅ Stato Strategico Attuale / Stato 1-4
- ✅ Roadmap Operativa
- ❌ Mai "informazione", "test", "quiz", "report"

**Link CTA standard** (da inserire identico in tutte e 4):
`https://www.ciak.io/ciak-blueprint`

---

## Workflow 1 — Stato 1 (Definizione)

**Trigger**: tag `ciak_checkpoint_stato_1` aggiunto al contatto
**Mittente**: Claudio Bertogliatti
**From email**: claudio@ciak.io (o quello configurato)

### Oggetto
```
{{ contact.first_name }}, ho letto il tuo Checkpoint. Sei allo Stato 1.
```

### Body

```
Ciao {{ contact.first_name }},

hai appena chiuso il Checkpoint Strategico. Grazie per il tempo — non è banale
fermarsi 5 minuti a guardare dove sei davvero.

Le tue risposte ti collocano in **Stato 1 — Definizione**.

Significa che sei in una fase di valutazione iniziale. La competenza c'è
(altrimenti non saresti qui), ma il modello digitale intorno alla competenza
non è ancora definito.

E attenzione: questo non è un giudizio. È il punto di partenza più onesto.
Saltarlo significa costruire su sabbia.

Quello che NON funziona nello Stato 1 è iniziare a "fare cose": aprire un
profilo Instagram, registrare un video, comprare un funnel. Sembra
produttivo ma non lo è — perché non hai ancora deciso quale offerta vuoi
costruire, per chi, e a quale prezzo.

Quello che FUNZIONA è fermarsi un attimo prima e definire la direzione.

Il passo coerente con lo Stato 1 è il **Ciak Blueprint**: 60 minuti di
analisi 1-a-1 con me sulla tua situazione specifica + una Roadmap Operativa
scritta su misura per i tuoi prossimi 90 giorni.

Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai
una direzione precisa, ti rimborso integralmente.

→ {{ Prenota il tuo Ciak Blueprint: https://www.ciak.io/ciak-blueprint }}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
```

---

## Workflow 2 — Stato 2 (Strutturazione)

**Trigger**: tag `ciak_checkpoint_stato_2` aggiunto al contatto

### Oggetto
```
{{ contact.first_name }}, sei allo Stato 2. Ecco cosa significa.
```

### Body

```
Ciao {{ contact.first_name }},

hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in
**Stato 2 — Strutturazione**.

Significa che la tua competenza è reale, hai già clienti che la riconoscono,
ma manca una struttura chiara e replicabile per trasformare quella competenza
in un modello digitale sostenibile.

E attenzione: lo Stato 2 è la fase in cui si fanno gli errori più costosi.

Si fanno corsi, si comprano funnel, si registrano video, si testano ads.
Sembra che si stia "lavorando al business". Ma senza una struttura che
tenga insieme tutti questi pezzi, ogni azione disperde energia invece di
sommarla.

Il passaggio successivo coerente con lo Stato 2 NON è fare di più. È fissare
la struttura PRIMA di accelerare.

Il **Ciak Blueprint** serve esattamente a questo: 60 minuti di analisi 1-a-1
con me + una Roadmap Operativa che mette insieme posizionamento, offerta,
funnel, prezzi. Tutto sulla TUA situazione, non su un template.

Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai
una direzione precisa, ti rimborso integralmente.

→ {{ Prenota il tuo Ciak Blueprint: https://www.ciak.io/ciak-blueprint }}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
```

---

## Workflow 3 — Stato 3 (Validazione)

**Trigger**: tag `ciak_checkpoint_stato_3` aggiunto al contatto

### Oggetto
```
{{ contact.first_name }}, sei allo Stato 3. Il problema è diverso da quello che pensi.
```

### Body

```
Ciao {{ contact.first_name }},

hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in
**Stato 3 — Validazione**.

Significa che hai già un'offerta digitale attiva, qualche cliente, qualche
risultato. Ma percepisci che qualcosa non sta crescendo come dovrebbe.

E attenzione: nello Stato 3 il problema è quasi sempre diverso da quello
che sembra.

Sembra un problema di traffico (mi servono più lead). Sembra un problema di
copy (devo scrivere meglio). Sembra un problema di prezzo (forse costo troppo).

Nella maggior parte dei casi che vedo, è un collo di bottiglia strutturale
nascosto. Un punto preciso del modello in cui l'energia si disperde — e
finché non lo identifichi, ogni leva nuova (più ads, più contenuti, più
funnel) rende meno di quello che potrebbe.

Il **Ciak Blueprint** serve a leggere lucidamente cosa sta funzionando e
dove intervenire prima. 60 minuti 1-a-1 con me + una Roadmap Operativa
focalizzata sul collo di bottiglia che sta limitando la tua crescita.

Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai
una direzione precisa, ti rimborso integralmente.

→ {{ Prenota il tuo Ciak Blueprint: https://www.ciak.io/ciak-blueprint }}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
```

---

## Workflow 4 — Stato 4 (Evoluzione Strategica)

**Trigger**: tag `ciak_checkpoint_stato_4` aggiunto al contatto

### Oggetto
```
{{ contact.first_name }}, sei allo Stato 4. Adesso la domanda cambia.
```

### Body

```
Ciao {{ contact.first_name }},

hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in
**Stato 4 — Evoluzione Strategica**.

Significa che hai già un modello strutturato e genera risultati concreti.
Non sei più in cerca di "come iniziare". Sei in cerca di "dove concentrare
attenzione e risorse per crescere mantenendo solidità".

E attenzione: nello Stato 4 il rischio non è la velocità. È perdere
sostenibilità mentre si cresce.

Più i numeri salgono, più ogni decisione strategica pesa: che leva attivare,
che offerta scalare, dove smettere di disperdere. È la fase in cui un
confronto strategico esterno vale più di qualsiasi nuovo strumento.

Il **Ciak Blueprint** in Stato 4 è un'analisi 1-a-1 profonda — 90 minuti
invece dei 60 standard — orientata a identificare i 2-3 fuochi di
concentrazione strategica per i prossimi 12 mesi. Output: una Roadmap
Operativa che ti dice non cosa fare, ma cosa SMETTERE di fare e dove
raddoppiare.

Non vendo un percorso. Vendo chiarezza. Se al termine dell'analisi non hai
una direzione precisa, ti rimborso integralmente.

→ {{ Prenota il tuo Ciak Blueprint: https://www.ciak.io/ciak-blueprint }}

A presto,
Claudio

—
Ciak. Una direzione strategica per la tua competenza professionale.
```

---

## Configurazione Systeme.io

Per ognuno dei 4 workflow:

1. **Crea Automation** → "Da zero"
2. **Trigger**: "Quando un tag è aggiunto" → seleziona `ciak_checkpoint_stato_<n>`
3. **Action**: "Invia email"
4. **Mittente**: Claudio Bertogliatti / claudio@ciak.io
5. **Oggetto** e **Body**: copia da sopra
6. **Wait/delay**: NESSUNO (l'email parte immediatamente al submit)
7. **Salva e attiva**

### Merge tag dinamici Systeme

- `{{ contact.first_name }}` → nome del contatto (catturato dal form opt-in)
- Se non disponibile, fallback su "ciao"

### Variabili Subject A/B test (opzionale)

Variante alternativa per ogni Stato, da testare in A/B se vuoi:

| Stato | A (sopra) | B alternativa |
|-------|-----------|---------------|
| 1 | `{{first_name}}, ho letto il tuo Checkpoint. Sei allo Stato 1.` | `{{first_name}}, il punto di partenza più onesto è questo.` |
| 2 | `{{first_name}}, sei allo Stato 2. Ecco cosa significa.` | `{{first_name}}, lo Stato 2 è dove si fanno gli errori più costosi.` |
| 3 | `{{first_name}}, sei allo Stato 3. Il problema è diverso da quello che pensi.` | `{{first_name}}, lo Stato 3 ha un collo di bottiglia nascosto.` |
| 4 | `{{first_name}}, sei allo Stato 4. Adesso la domanda cambia.` | `{{first_name}}, in Stato 4 il rischio non è la velocità.` |

### Tracking

- Aprire workflow → "Statistiche" → Open rate, Click rate (CTA Blueprint),
  Booking rate (incrocia con Cal.com data)
- KPI obiettivo (assunto, da validare a T+30 dal lancio 6/6):
  - Open rate: ≥45% (post-Checkpoint = aspettativa alta)
  - Click rate CTA Blueprint: ≥15% (filtri Stato 3-4 più alti di 1-2)
  - Conversione Blueprint €67 da email: ≥3% del totale tag emessi

---

## Follow-up sequence (Workflow 5 — opzionale, da decidere)

Per chi non clicca la CTA Blueprint entro 48h dal primo invio, una sequenza
nurture di 2-3 email aggiuntive. Pattern: stesso copy ma con angolo diverso
ogni volta (testimonial, FAQ, ultima chiamata). Da scrivere a parte dopo il
test del flusso base.

**Stato 1-2**: 3 email follow-up (cadenza T+3 / T+7 / T+14 giorni)
**Stato 3-4**: 2 email follow-up (cadenza T+2 / T+5 giorni — più caldi)

Dopo T+14 senza click → tag `nurture_completed` + uscita dalla sequenza
auto. NON ri-invio campagne ads di retargeting sulla stessa email (waste
di budget).
