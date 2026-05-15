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
**Sequenza**: 5 email, cadenza T+0 / T+4 / T+9 / T+16 / T+25 giorni
**Target**: contatti vecchi della lista fredda Evolution PRO 13k. Già
contattati in passato. Tono trasparente, narrative dell'utente (lock
15/5/2026, basata sulle 4 email originali Claudio).

**Obiettivo unico**: farli atterrare su `/masterclass`. Niente Blueprint
diretto in queste 5 email — la masterclass è il filtro qualificante che
poi propone Checkpoint + Blueprint a chi arriva fino in fondo.

**Anti-spam Google checklist applicata**:
- Niente €/numeri specifici nei subject (numeri solo nel body come prova)
- 1 solo link CTA per email
- Tono asciutto, niente CAPS, niente emoji
- Mittente identificabile + Reply-To attivo
- Disiscrizione visibile (auto-aggiunta da Systeme)
- Frequenza media: 5 email in 25 giorni = sotto soglia bot detection
- Body 150-280 parole (sweet spot deliverability)

### Email B1 — T+0 (Reintroduzione)

**Oggetto**: `{{ first_name }}, hai lasciato i tuoi dati qualche tempo fa.`

```
Ciao {{ contact.first_name | default:'' }},

un po' di tempo fa hai lasciato i tuoi contatti, probabilmente attraverso
una campagna o un contenuto di Evolution PRO.

Non ti ho scritto subito. Lo faccio adesso perché quello che facciamo è
cambiato, e quello che posso lasciarti oggi è molto più concreto di allora.

Evolution PRO esiste ancora. Resta il sistema di partnership con cui lavoro
1-a-1 con consulenti, coach, formatori, naturopati che vogliono costruire
un modello digitale partendo dalla propria competenza professionale.

Quello che è nuovo è il punto di partenza: Ciak. Una direzione strategica
gratuita per chi vuole prima capire dove si trova, e solo dopo decidere se
investire.

Nei prossimi giorni ti mando qualcosa di specifico. Niente upsell
automatici, niente "scopri il segreto". Solo materiale concreto.

Se nel frattempo vuoi farti un'idea, c'è una masterclass gratuita di 30
minuti che spiega i 5 errori più comuni che osservo da 7 anni:

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b1 }}

Se non ti interessa, ignora pure. Niente follow-up aggressivi.

Claudio
```

### Email B2 — T+4 giorni (Il problema)

**Oggetto**: `{{ first_name }}, perché i professionisti bravi non scalano.`

```
Ciao {{ contact.first_name | default:'' }},

c'è un pattern che osservo da 7 anni in chi lavora con la propria
competenza professionale.

Lavorano tanto. Ottengono risultati. I clienti sono soddisfatti.

Eppure i mesi sono irregolari, il passaparola non basta, e l'idea di
"scalare" sembra impossibile senza lavorare il doppio.

E attenzione: il problema non è la competenza. La competenza c'è quasi
sempre — altrimenti i clienti non tornerebbero.

Il problema è che nessuno ha mai insegnato a queste persone come
trasformare quello che sanno fare in un sistema che acquisisce clienti
in modo prevedibile, vende online, e continua a funzionare anche quando
non sono davanti a uno schermo.

È esattamente il punto su cui lavoriamo con Ciak. E la prima cosa che
serve non è uno strumento — è una direzione strategica chiara.

Nella masterclass di 30 minuti ti racconto i 5 errori che bloccano questa
trasformazione, e perché si ripetono sempre uguali:

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b2 }}

Domani ti mostro un caso concreto.

Claudio
```

### Email B3 — T+9 giorni (Caso studio Giulia)

**Oggetto**: `{{ first_name }}, cosa è successo a Giulia in 4 mesi.`

```
Ciao {{ contact.first_name | default:'' }},

ieri ti accennavo a un caso concreto. Eccolo.

Giulia è una life coach con anni di esperienza. Quando è arrivata da me
non aveva una presenza online strutturata. Nessun funnel, nessun prodotto
digitale. Solo competenza vera e voglia di smettere di dipendere dal
passaparola.

In 4 mesi, seguendo il metodo che insegno nella masterclass, ha costruito
il suo posizionamento, lanciato la sua prima offerta online, e chiuso i
primi clienti paganti.

Oggi i numeri di Giulia stanno crescendo in modo stabile, e sta lavorando
sull'ottimizzazione del sistema invece che sulla sopravvivenza mensile.

Non è stata fortuna. Non era una persona particolarmente "fortunata", né
con un network preesistente.

È stato metodo. Specificamente: avere chiara la direzione strategica
prima di investire energia in implementazione.

Quel metodo lo spiego nella masterclass — gratis, 30 minuti, senza che
serva acquistare nulla per capire se fa per te:

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b3 }}

Claudio
```

### Email B4 — T+16 giorni (Anteprima contenuto)

**Oggetto**: `{{ first_name }}, cosa c'è dentro i 30 minuti.`

```
Ciao {{ contact.first_name | default:'' }},

ti scrivo per essere preciso su cosa contiene la masterclass — così
decidi se vale 30 minuti del tuo tempo o no.

Sono 3 cose, in 3 blocchi:

1. I 5 errori che fermano la maggior parte dei professionisti prima
   ancora di iniziare. Errori concreti, non concetti generici. Esempi: il
   "lancio prima di posizionarsi", il "funnel da Stato 4 quando sei in
   Stato 2", il "delegare prima di capire cosa".

2. I 4 livelli di maturità strategica che vedo ricorrere negli ultimi
   anni. Definizione, Strutturazione, Validazione, Evoluzione. In quale
   stato sei tu — e perché ogni stato ha priorità diverse.

3. La differenza tra costruire una vetrina online (visibilità) e
   costruire un modello digitale sostenibile (sistema). Sembra una
   sfumatura: in realtà è il passaggio che separa chi guadagna a sprazzi
   da chi costruisce qualcosa che dura.

Niente vendite forzate dentro. Alla fine c'è un Checkpoint Strategico di
5 domande che ti dice in quale stato ti trovi — anche quello gratis.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b4 }}

Claudio
```

### Email B5 — T+25 giorni (Chiusura)

**Oggetto**: `{{ first_name }}, chiudo qui la conversazione.`

```
Ciao {{ contact.first_name | default:'' }},

questa è l'ultima email automatica della sequenza. Dopo esci dalla lista
attiva — non ti scrivo più finché non sei tu a cercarmi.

Cinque email in tre settimane è il massimo che mi permetto di chiedere.
Sotto questo numero perdo persone che avrebbero risposto. Sopra divento
quello che non voglio essere.

Se in questo tempo non hai trovato il momento di guardare la masterclass,
va bene così. Significa che il momento non è ora. Senza problema.

Se invece vorrai capire dove sei davvero con la tua competenza online, il
punto di accesso resta lo stesso: 30 minuti, gratis, senza acquisti
necessari per concludere il valore.

→ {{ Masterclass: https://www.ciak.io/masterclass?utm_source=systeme_email&utm_medium=email&utm_campaign=cold_legacy_b5 }}

Se invece preferisci uscire del tutto dalla lista, c'è il link di
disiscrizione qui sotto. Niente di personale — è il modo in cui voglio
gestire i miei contatti.

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
3. Aggiungi gli step "Invia email" con i delay:
   - **Campagna A** (4 email): T+0 / T+3 gg / T+7 gg / T+14 gg
   - **Campagna B** (5 email): T+0 / T+4 gg / T+9 gg / T+16 gg / T+25 gg
4. Per ogni step, copia oggetto + body dal file
5. Mittente: Claudio Bertogliatti / claudio@ciak.io
6. Aggiungi un **exit condition** prima di ogni email:
   - "Se contatto ha tag `ciak_optin_masterclass`" → esci dalla sequenza
     (ha già visto la masterclass, smetti di proporgliela)
7. Salva e attiva

---

## Riattivare il job `daily-systeme-import`

**Daily limit lockato: 500 contatti/giorno** (15/5/2026 — scelta Claudio
"restare calmi" sulla lista 13k per preservare reputazione mittente Google).

Dopo aver attivato entrambe le campagne A e B su Systeme:

1. `backend/celery_app.py` → de-commentare le righe `'daily-systeme-import': ...`
   (kwarg `daily_limit: 500` già impostato)
2. Redeploy worker Celery (`gcloud run deploy evolution-pro-worker ...`)
3. Il giorno successivo alle 09:00 il job riprende, con i nuovi tag separati
4. Verifica logs: dovresti vedere `tag_applied: ciak_cold_outreach_places` (o legacy)
   nei documenti `systeme_daily_queue`

### Esaurimento lista a 500/giorno

| Source | Stima totale | Giorni a esaurire | Note |
|--------|-------------|--------------------|------|
| `lista_fredda` legacy 13k | ~13.000 | ~26 giorni lavorativi | Campagna B 5 email × 13k = 65k email totali in ~7 settimane |
| `google_places` ongoing | continuo (scraping) | mai, finché lo scraper gira | Campagna A 4 email × N/giorno |

Con `daily_limit: 500` la priorità nel job è google_places PRIMA, poi
lista_fredda. Se Google Places produce 200/giorno di lead nuovi, restano
300 slot per lista_fredda → ~43 giorni per esaurire tutti i 13k. Tempi
realistici, niente picchi anomali per Google.

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
