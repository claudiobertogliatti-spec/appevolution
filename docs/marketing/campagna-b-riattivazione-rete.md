# Campagna B — Riattivazione Rete (VERSIONE ATTIVA APPROVATA)

**Approvata da Claudio: 2026-06-26.** Sostituisce la sezione "CAMPAGNA B — Cold
Outreach Legacy" di `email-cold-outreach-ciak.md` (quella vecchia apriva con
"hai lasciato i tuoi dati", non vero per questa lista).

## Contesto lista
Target = rubrica personale di lavoro di Claudio (export Google Contatti, ~14.6k
record). Pulita e pronta all'import: **13.195 email** uniche, validate,
deduplicate. **Escluse**: etichetta `Amici` (382 amici/conoscenti/parenti),
etichetta `Partner Evolution` (22 partner), domini usa-e-getta, 16 email fake
del `fake_hitlist_FINAL.csv`. File import: `lista_fredda_FINAL_import.csv`
(formato `email,first_name,last_name,phone,tag,date_registered`).

Non sono lead della masterclass: sono persone che **conoscono Claudio** dai suoi
22 anni di vendita. Per questo il copy è "riattivazione rete" (riconoscimento),
non "hai lasciato i dati".

## Configurazione Systeme
- **Trigger**: tag `ciak_cold_outreach_legacy` aggiunto al contatto.
- **Mittente (tutte e 5)**: `Evolution PRO - Claudio Bertogliatti` — molti
  riconoscono il nome, è la leva dell'apertura.
- **Reply-To**: `info@evolution-pro.it`.
- **Cadenza**: 5 mail, **ogni 3 giorni** → T+0 / +3 / +6 / +9 / +12.
- **Throttle ingresso**: job `daily_systeme_import` a 300/giorno (tag applicato
  in Systeme per i contatti della coda `systeme_daily_queue`).
- **Regola d'uscita**: quando viene aggiunto `ciak_optin_masterclass`, annullare
  l'iscrizione alla campagna (chi converte non riceve più i solleciti).
- **CTA unica**: `https://www.ciak.io/masterclass`.

## Voice lock
`claudio_voice_style.md` (7 punti). Niente emoji/CAPS/grassetti nel corpo, frasi
brevi, anti-fuffa, firma "Claudio", chiusura che restituisce libertà.

---

### B1 — Riconoscimento (T+0)
**Oggetto**: `{{ contact.first_name | default:'Ciao' }}, forse ti ricordi di me.`

```
Ciao {{ contact.first_name | default:'' }},

in questi anni ci siamo incrociati — una trattativa, un progetto, un
contatto nel mondo della vendita. Probabilmente ti ricordi di me, o almeno
del mio nome.

Sono Claudio Bertogliatti. 22 anni nella vendita, €6M di fatturato
generato, oltre 25.000 trattative.

Ti scrivo perché negli ultimi 7 anni mi sono concentrato su una cosa sola:
trasformare una competenza professionale reale in un modello digitale che
funziona davvero.

Non un corso. Non un'agenzia marketing.

Una direzione strategica chiara, prima di investire in implementazione.

Ho appena pubblicato una masterclass gratuita di 30 minuti sui 5 errori più
comuni che vedo fare a chi ha competenza vera ma fatica a costruire un
modello online sostenibile.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=legacy_b1 }}

Se non ti interessa, ignora pure questa email. Niente follow-up aggressivi.

Claudio
```

### B2 — Il problema (T+3)
**Oggetto**: `{{ contact.first_name | default:'Ciao' }}, perché i bravi non scalano.`

```
Ciao {{ contact.first_name | default:'' }},

una cosa che osservo da 7 anni: nei professionisti la competenza c'è quasi
sempre. Quello che manca quasi sempre è la struttura.

Si studia una materia per anni, si diventa bravi davvero. Poi si arriva
online e si fa una cosa strana: si copia il funnel di un altro, si compra
un corso, si registra un video a caso. Sembra di muoversi.

Non è così. Senza una direzione chiara — chi sei, per chi parli, cosa
vendi, a quale prezzo — ogni azione disperde energia invece di sommarla.

La masterclass che ho registrato spiega esattamente questo. 30 minuti,
gratis, non vendo niente dentro. Ti dico cosa NON fare e perché.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=legacy_b2 }}

Claudio
```

### B3 — Dove sei davvero (T+6)
**Oggetto**: `{{ contact.first_name | default:'Ciao' }}, in 5 minuti dove sei davvero.`

```
Ciao {{ contact.first_name | default:'' }},

se 30 minuti adesso non li hai, c'è una versione più corta: 5 domande che
ti collocano in uno dei 4 stati in cui si trova chi lavora con la propria
competenza online.

- Stato 1 — stai ancora capendo cosa costruire
- Stato 2 — hai clienti ma manca un sistema
- Stato 3 — hai un'offerta digitale che non scala
- Stato 4 — hai un modello solido e vuoi farlo crescere

In base allo stato in cui sei, le priorità cambiano. Chi è in Stato 2 e fa
cose da Stato 3 perde mesi. È l'errore che vedo più spesso.

Le 5 domande sono gratuite, in fondo alla masterclass. Se vuoi andarci
dritto:

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=legacy_b3 }}

Claudio
```

### B4 — Cosa faccio oggi (T+9)
**Oggetto**: `{{ contact.first_name | default:'Ciao' }}, cosa faccio oggi.`

```
Ciao {{ contact.first_name | default:'' }},

così sai con chi stai parlando, senza giri di parole.

Lavoro 1-a-1 con consulenti, coach, formatori e professionisti che hanno
una competenza vera e vogliono costruirci sopra un modello digitale. Non
gli insegno a farlo: lo costruiamo insieme — posizionamento, offerta,
contenuti, lancio.

Il punto di partenza, però, è gratuito e senza impegno: prima capisci dove
sei, e solo dopo decidi se ha senso lavorare insieme. Quel punto di accesso
è la masterclass.

Nessun upsell automatico, nessun "scopri il segreto". Solo una direzione
chiara, e la libertà di usarla come vuoi.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=legacy_b4 }}

Claudio
```

### B5 — Ultima (T+12)
**Oggetto**: `{{ contact.first_name | default:'Ciao' }}, ultima email.`

```
Ciao {{ contact.first_name | default:'' }},

questa è l'ultima email che ti arriva da me in automatico. Dopo esci dalla
sequenza e non ti scrivo più, a meno che non venga tu a cercarmi.

Cinque email è il massimo che mi permetto. Sotto perdo persone che
avrebbero risposto; sopra divento quello che non voglio essere.

Se mai vorrai capire dove sei davvero con la tua competenza online, il
punto d'accesso resta lo stesso: 30 minuti di masterclass, gratis.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=legacy_b5 }}

Se preferisci non sentirmi più, ti basta "annulla iscrizione" qui sotto.
Niente di personale — è il modo in cui voglio gestire i miei contatti.

Claudio
```
