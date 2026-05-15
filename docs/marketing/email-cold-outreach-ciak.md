# Email Systeme — Cold Outreach Ciak

Due campagne distinte da configurare su **Systeme.io dashboard** dopo aver
ricablato il job `daily_systeme_import` (commit 15/5/2026). Trigger basati
sui nuovi tag separati per source.

**Voice lock**: `claudio_voice_style.md` (14/5/2026)
**Brand lock**: `ciak_brand_copy_framework.md` (12/5/2026)

CTA standard in tutte: `https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=<campagna>`

---

## CAMPAGNA A — Cold Outreach Places (primo contatto)

**Trigger Systeme**: tag `ciak_cold_outreach_places` aggiunto al contatto
**Sequenza**: 4 email, cadenza T+0 / T+3 / T+7 / T+14 giorni
**Target**: professionisti raccolti via Google Places (mai contattati, intent
alto sul mercato locale Italia)

### Email A1 — T+0 (subito al tag)

**Oggetto**: `{{ contact.first_name | default:'Ciao' }}, ti scrivo da Ciak.`

```
Ciao {{ contact.first_name | default:'' }},

ti scrivo direttamente. Niente automation con il tuo nome ripetuto 4 volte,
niente "ho notato che il tuo studio è straordinario".

Sono Claudio Bertogliatti. Lavoro da 22 anni nella vendita per brand di
pregio in 13 settori — €6M di fatturato generato, 25.000 trattative chiuse.
Negli ultimi 7 anni mi sono concentrato sulla cosa più difficile:
trasformare una competenza professionale reale in un modello digitale che
funziona davvero.

Non un corso. Non un'agenzia marketing.

Una direzione strategica chiara, prima di investire in implementazione.

Ho appena pubblicato una masterclass gratuita di 30 minuti che spiega i
5 errori più comuni che vedo fare a chi ha competenza vera ma fatica a
costruire un modello digitale sostenibile.

Se ti interessa, ti lascio qui il link diretto:

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_places_a1 }}

Se non ti interessa, ignora pure questa email. Non ti rispondo per
costringerti a iscriverti.

Claudio
```

### Email A2 — T+3 giorni

**Oggetto**: `{{ first_name }}, una cosa che osservo da 7 anni.`

```
Ciao {{ contact.first_name | default:'' }},

una cosa che osservo da 7 anni di lavoro con consulenti e professionisti:

la competenza c'è quasi sempre. Quello che manca quasi mai è la struttura.

Si studia per anni una materia, si diventa bravi davvero. Poi si arriva
online e si fa una cosa strana: si copia il funnel di qualcun altro,
si compra un corso di marketing, si registra un video. Sembra produttivo.

Non lo è. Perché senza una direzione strategica chiara — chi sei, per chi
parli, cosa vendi, a quale prezzo — ogni azione disperde energia invece
di sommarla.

Ho fatto questa masterclass per spiegarlo. 30 minuti, gratuita. Non vendo
nulla dentro. Ti dico esattamente cosa NON fare e perché.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_places_a2 }}

Claudio
```

### Email A3 — T+7 giorni

**Oggetto**: `{{ first_name }}, il Checkpoint Strategico in 5 minuti.`

```
Ciao {{ contact.first_name | default:'' }},

la masterclass dura 30 minuti. Se non li hai, c'è una versione più corta
del valore che vorrei lasciarti: il Checkpoint Strategico.

Sono 5 domande. Ti collocano in uno dei 4 stati di maturità strategica
in cui mettiamo chi lavora con la propria competenza online:

- Stato 1 — Definizione: stai ancora capendo cosa costruire
- Stato 2 — Strutturazione: hai clienti ma manca un sistema
- Stato 3 — Validazione: hai un'offerta digitale che non scala
- Stato 4 — Evoluzione: hai un modello solido, vuoi farlo crescere

In base allo stato in cui sei, le priorità cambiano. Le persone in Stato 2
che fanno cose da Stato 3 perdono mesi.

Il Checkpoint è gratuito, in fondo alla masterclass. Se non vuoi guardare
30 minuti, vai dritto lì:

→ {{ Vai al Checkpoint: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_places_a3 }}

Claudio
```

### Email A4 — T+14 giorni (ultimo tentativo)

**Oggetto**: `{{ first_name }}, ultima volta che ti scrivo da Ciak.`

```
Ciao {{ contact.first_name | default:'' }},

questa è l'ultima email automatica che ti arriva da me. Dopo, esci dalla
sequenza e non ti scrivo più — a meno che tu non venga a cercarmi.

Quattro email in due settimane è il massimo che mi permetto di chiedere.
Sotto questo numero perdo persone che avrebbero risposto. Sopra divento
quello che non voglio essere.

Se mai vorrai capire dove sei davvero con la tua competenza online, il
punto di accesso resta lo stesso: 30 minuti di masterclass + 5 minuti
di Checkpoint Strategico, tutto gratis.

→ {{ Masterclass + Checkpoint: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_places_a4 }}

Se invece preferisci non sentirmi più, ti basta cliccare "annulla
iscrizione" qui sotto. Niente di personale — è il modo in cui voglio
gestire i miei contatti.

A presto,
Claudio
```

---

## CAMPAGNA B — Cold Outreach Legacy (lista fredda 13k)

**Trigger Systeme**: tag `ciak_cold_outreach_legacy` aggiunto al contatto
**Sequenza**: 4 email, cadenza T+0 / T+5 / T+12 / T+21 giorni
**Target**: contatti vecchi della lista fredda Evolution PRO 13k. Probabile
che siano già stati contattati in passato. Tono: trasparente sul fatto che
qualcosa è cambiato.

### Email B1 — T+0

**Oggetto**: `{{ first_name }}, una cosa è cambiata.`

```
Ciao {{ contact.first_name | default:'' }},

ti scrivo dopo un po' di silenzio. Una cosa è cambiata da quando ci eravamo
incrociati l'ultima volta.

Il progetto Evolution PRO esiste ancora — è il sistema di partnership con
cui lavoro con chi vuole costruire la propria offerta digitale insieme al
mio team. Quella parte resta.

Quello che è nuovo è il punto di partenza: Ciak. Una direzione strategica
gratuita per chi vuole capire prima di acquistare qualcosa.

Niente upsell automatici. Niente "scopri il segreto". Una masterclass di
30 minuti che ti dice esattamente cosa NON fare quando vuoi trasformare
una competenza in un modello digitale, e perché.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b1 }}

Se non interessa, ignora. Niente follow-up aggressivi.

Claudio
```

### Email B2 — T+5 giorni

**Oggetto**: `{{ first_name }}, perché Ciak (e perché ora).`

```
Ciao {{ contact.first_name | default:'' }},

ti rispondo a una domanda che mi farei al tuo posto: perché un nuovo brand
adesso, dopo Evolution PRO.

Negli ultimi 7 anni ho visto un pattern che si ripete. Le persone che
vengono da me sono già brave nel proprio mestiere. Hanno clienti reali,
risultati reali. Ma quando provano a strutturare un modello digitale,
saltano sempre lo stesso passaggio: definire la direzione PRIMA di
investire in implementazione.

E si trovano a comprare strumenti che non servono al loro stato attuale.
Funnel da Stato 4 quando sono in Stato 2. Ads da Stato 3 quando sono in
Stato 1. Energia dispersa, soldi bruciati.

Ciak nasce per occupare quello spazio: il "prima". 30 minuti di
masterclass + 5 di Checkpoint per capire dove sei davvero — senza vendere
niente.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b2 }}

Se ti interessa solo Evolution PRO, esiste ancora — ma il passaggio
naturale per arrivarci adesso è Ciak prima.

Claudio
```

### Email B3 — T+12 giorni

**Oggetto**: `{{ first_name }}, 5 domande, 5 minuti, niente da comprare.`

```
Ciao {{ contact.first_name | default:'' }},

se 30 minuti di masterclass sono troppi, c'è una versione corta del valore
che vorrei lasciarti: il Checkpoint Strategico.

5 domande. Ti collocano in uno dei 4 stati di maturità strategica e ti
dicono cosa ha senso fare PRIMA — e cosa NON fare ancora.

Lo trovi alla fine della masterclass, ma puoi anche andare dritto lì:

→ {{ Vai al Checkpoint: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b3 }}

Niente acquisti dopo. Solo chiarezza sulla tua situazione attuale.

Claudio
```

### Email B4 — T+21 giorni (ultimo tentativo)

**Oggetto**: `{{ first_name }}, chiudo qui la conversazione.`

```
Ciao {{ contact.first_name | default:'' }},

questa è l'ultima email automatica della sequenza. Dopo esci dalla lista
attiva — non ti scrivo più finché non sei tu a cercarmi.

Se in queste tre settimane non hai trovato il momento di guardare la
masterclass, va bene così. Significa che il momento non è quello.

Ti lascio il link al volo, per quando vorrai:

→ {{ Masterclass + Checkpoint: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b4 }}

E se preferisci uscire del tutto, c'è il link di disiscrizione in fondo.
Nessun problema.

A presto,
Claudio
```

---

## Configurazione Systeme.io

Per ogni campagna:

1. Crea **Automation** "Da zero"
2. Trigger: "Quando un tag è aggiunto" →
   - Campagna A: `ciak_cold_outreach_places`
   - Campagna B: `ciak_cold_outreach_legacy`
3. Aggiungi 4 step "Invia email" con i delay:
   - A: T+0, T+3 gg, T+7 gg, T+14 gg
   - B: T+0, T+5 gg, T+12 gg, T+21 gg
4. Per ogni step, copia oggetto + body dal file
5. Mittente: Claudio Bertogliatti / claudio@ciak.io
6. Aggiungi un **exit condition** prima di ogni email:
   - "Se contatto ha tag `ciak_optin_masterclass`" → esci dalla sequenza
     (ha già visto la masterclass, smetti di proporgliela)
7. Salva e attiva

---

## Riattivare il job `daily-systeme-import`

Dopo aver attivato entrambe le campagne A e B su Systeme:

1. `backend/celery_app.py` → de-commentare le righe `'daily-systeme-import': ...`
2. Redeploy worker Celery (`gcloud run deploy evolution-pro-worker ...`)
3. Il giorno successivo alle 09:00 il job riprende, con i nuovi tag separati
4. Verifica logs: dovresti vedere `tag_applied: ciak_cold_outreach_places` (o legacy)
   nei documenti `systeme_daily_queue`

---

## Tracking & KPI (assunti, da validare T+30)

| Metrica | Campagna A (Places) | Campagna B (Legacy) |
|---------|---------------------|---------------------|
| Email 1 open rate | ≥40% (nuovo contatto, curiosità) | ≥25% (lista vecchia, sospetto) |
| Email 1 → masterclass click | ≥10% | ≥5% |
| Sequenza completa → optin masterclass | ≥8% del totale tag | ≥3% del totale tag |
| Optin → checkpoint completato | ≥60% (chi vede il video → arriva al fondo) | ≥50% |
| Checkpoint Stato 3-4 → Blueprint €67 | ≥5% | ≥3% |

KPI overall: ogni 300 contatti/giorno taggati, attesi 24 optin (A) + 9 (B) ~ 33 lead caldi/giorno alla masterclass. Quindi ~14 Checkpoint completati/giorno. Quindi ~0.7-1.5 Blueprint vendite/giorno (~20-45/mese in steady state).
