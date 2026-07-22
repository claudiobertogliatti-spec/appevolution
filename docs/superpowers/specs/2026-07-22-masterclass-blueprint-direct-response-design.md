# Funnel pubblico Ciak — Vetrina, Masterclass e Blueprint

**Data:** 22 luglio 2026

**Stato:** design definitivo approvato da Claudio

**Obiettivo:** trasformare il traffico verso Ciak in un percorso misurabile, credibile e progressivo, separando presentazione del brand, acquisizione del lead e vendita del Blueprint.

## 1. Architettura definitiva

Il funnel pubblico usa tre livelli con responsabilità distinte:

1. **`/` — Vetrina Ciak:** spiega che cos'è Ciak, a chi serve e come funziona. La sola CTA commerciale porta alla masterclass.
2. **`/masterclass` — Landing di acquisizione:** raccoglie esclusivamente Nome + Email e ottimizza sull'evento `Lead`.
3. **`/blueprint` — Offerta a 27 €:** converte lead, retargeting e pubblico più consapevole in un'analisi strategica individuale.

Il contenuto video vive su **`/masterclass/guarda`**. La conferma acquisto vive su **`/blueprint/grazie`**.

Percorsi principali:

- traffico freddo: `Meta Ads → /masterclass → opt-in valido → /blueprint?source=masterclass_optin`;
- traffico organico, branded e referral: `/ → /masterclass → opt-in valido → /blueprint?source=masterclass_optin`;
- bridge post-opt-in: acquisto Blueprint oppure `Non ora, guarda la masterclass → /masterclass/guarda`;
- accesso email: inviato comunque dopo l'opt-in, indipendentemente dalla scelta sul Blueprint.

## 2. Contratto URL

URL canonici:

- `/`
- `/masterclass`
- `/masterclass/guarda`
- `/blueprint`
- `/blueprint/grazie`

Redirect legacy permanenti, diretti e con query string preservata dove necessario:

- `/ciak-blueprint` → `/blueprint`
- `/ciak-blueprint/grazie` → `/blueprint/grazie`
- `/analisi` → `/blueprint`
- `/analisi/grazie` → `/blueprint/grazie`
- `/analisi-strategica` → `/blueprint`

Backend, checkout, CAPI, email e link interni devono emettere direttamente gli URL canonici. I redirect non sono un meccanismo applicativo ordinario.

## 3. Pubblico e problema

Le pagine parlano a:

- professionisti, consulenti e formatori con una competenza reale ma senza un'offerta digitale chiara;
- chi ha già creato un corso, una consulenza o un funnel ma non riesce a venderli;
- chi produce contenuti o ha acquistato strumenti senza un percorso coerente verso la vendita.

Tesi centrale:

> Il problema non è il corso. È aver iniziato a costruirlo prima di chiarire cosa vendere, a chi e perché dovrebbero scegliere te.

Il copy è direct response, incisivo e concreto, ma resta professionale e anti-fuffa. Sono vietati promesse di fatturato, risultati non verificati, urgenza artificiale e linguaggio da guru.

## 4. Naming e autorevolezza

- **Ciak** è il sistema, la piattaforma e il brand.
- **Metodo EVO** è il metodo: Esamina, Valida, Ottimizza.
- **Claudio Bertogliatti** è il creatore di Ciak e del Metodo EVO.
- La formula **“Metodo Ciak” è vietata** in tutto il funnel.

Posizionamento guida:

> Ho creato Ciak e il Metodo EVO dopo aver visto troppi professionisti partire dal punto sbagliato: registrano lezioni, aprono profili e costruiscono funnel prima di avere chiarito cosa vendere, a chi e perché il mercato dovrebbe scegliere loro.

## 5. Prova e trasparenza

Non si pubblicano numeri, risultati economici, quantità di partner o anzianità del programma senza una fonte live verificabile.

In particolare, il claim **“Evolution esiste da 14 mesi” non va usato**: è in conflitto con dati storici già presenti e non è necessario per sostenere l'offerta.

La fiducia si costruisce con:

- processo mostrato chiaramente;
- asset e lavoro reali;
- responsabilità personale di Claudio;
- chiarezza su cosa il prodotto può e non può fare;
- garanzia specifica e operativamente sostenibile sul Blueprint.

## 6. Landing Masterclass — `/masterclass`

### Obiettivo

Ottenere un opt-in Nome + Email da traffico freddo. Il telefono non è richiesto al primo contatto; potrà essere raccolto più avanti, per esempio nelle 8 Domande o nella prenotazione.

### Hero

**Eyebrow**

`Masterclass gratuita · 30 minuti`

**Headline**

`Da competenza o corso fermo a un'offerta digitale che il mercato può capire e acquistare.`

**Subheadline**

`Scopri perché partire dalle lezioni, dalla piattaforma o dai contenuti può bloccare il progetto prima ancora della vendita — e quali decisioni chiarire prima di investire altro tempo.`

**CTA**

`Guarda la masterclass gratuita`

**Microcopy**

`Accesso immediato · Nessuna carta richiesta · Contenuto operativo`

### Struttura

1. Hero e modulo Nome + Email.
2. Riconoscimento: competenze, contenuti o corso pronto senza strada chiara verso la vendita.
3. Errore di sequenza: costruzione prima della validazione.
4. Cosa impara l'utente.
5. Claudio, creatore di Ciak e del Metodo EVO.
6. Metodo EVO: Esamina, Valida, Ottimizza.
7. FAQ.
8. Secondo modulo con la stessa CTA.

L'evento browser `Lead` parte soltanto dopo risposta positiva di `/api/ciak/lead-capture`; Pixel e CAPI condividono lo stesso `event_id` per la deduplica. Il consenso marketing resta vincolante.

## 7. Masterclass video — `/masterclass/guarda`

La pagina contiene il video e il passaggio successivo già esistente verso le 8 Domande Ciak. Non contiene il vecchio gate con telefono.

L'accesso diretto deve restare possibile dal link email e dal pulsante secondario del bridge. La masterclass è realmente gratuita e non viene subordinata all'acquisto del Blueprint.

## 8. Landing Blueprint — `/blueprint`

### Hero

**Eyebrow**

`Ciak Blueprint · Analisi strategica individuale`

**Headline**

`Prima di costruire o rilanciare il tuo corso, scopri se l'offerta sta in piedi.`

**Subheadline**

`In 60 minuti analizziamo pubblico, problema, posizionamento e offerta. Entro 72 ore ricevi una roadmap concreta: cosa correggere, cosa costruire e quale passo fare per primo.`

**CTA**

`Voglio il mio Blueprint — 27 €`

**Riduzione del rischio**

`Pagamento unico · IVA inclusa · Rimborso se non ricevi una direzione utile`

### Variante post-opt-in

Con `source=masterclass_optin`, sopra l'hero compare:

> **Iscrizione completata. La masterclass è pronta.**
>
> Se vuoi andare oltre la teoria, possiamo applicare subito il Metodo EVO al tuo progetto.

Azioni visibili senza scroll:

- primaria: `Analizziamo il mio progetto — 27 €`;
- secondaria: `Non ora, guarda la masterclass` → `/masterclass/guarda`.

La secondaria è evidente, accessibile da tastiera e non viene attenuata per forzare l'acquisto.

### Cosa riceve il cliente

- 8 Domande Ciak;
- sessione individuale di 60 minuti con Claudio;
- analisi specifica di pubblico, problema, posizionamento e offerta;
- roadmap scritta entro 72 ore.

Messaggio di trasparenza:

> L'analisi può anche concludere che l'idea non sia ancora pronta. Meglio scoprirlo con 27 € che dopo mesi di produzione.

Garanzia proposta, da mantenere coerente con le condizioni operative e legali:

> Se al termine della sessione non hai maggiore chiarezza e un prossimo passo concreto, puoi richiedere il rimborso dei 27 €.

## 9. Tracking e attribuzione

Eventi minimi:

- `Lead` dopo opt-in accettato;
- `BlueprintBridgeView` una volta per visita con sorgente `masterclass_optin`;
- `BlueprintCheckoutStart` al click di acquisto;
- `Purchase` su `/blueprint/grazie`, deduplicato con CAPI.

Fonti ammesse nel checkout: `direct`, `masterclass_optin`, `retargeting`. Valori arbitrari ricevuti dal client non entrano nei metadata Stripe.

URL backend canonici:

- `success_url`: `/blueprint/grazie?session_id={CHECKOUT_SESSION_ID}`;
- `cancel_url`: `/blueprint?from=cancel`;
- `event_source_url` acquisto: `/blueprint/grazie`.

## 10. Ownership e ordine di rilascio

1. **FASE 1 — Claude, completata:** contratto route e redirect legacy, commit `871ade85`.
2. **FASE 2 — Codex:** split Masterclass, opt-in, bridge, copy Blueprint, checkout/CAPI canonici, test e verifica.
3. **FASE 3 — Claude:** nuova vetrina `/` e SEO multi-shell, dopo che `/masterclass` e l'evento `Lead` sono verificati.

Durante la FASE 2 Codex non modifica `frontend/src/ciak/pages/Landing.jsx`, salvo una successiva integrazione concordata. La rimozione definitiva del form dalla home appartiene alla FASE 3.

## 11. Criteri di accettazione

- `/masterclass` contiene solo Nome + Email e non mostra il video prima dell'opt-in.
- Opt-in valido salva il lead, emette un solo `Lead` deduplicabile e porta a `/blueprint?source=masterclass_optin`.
- Il bridge consente acquisto o accesso immediato a `/masterclass/guarda`.
- `/masterclass/guarda` mostra il video senza richiedere telefono.
- `/blueprint` funziona anche senza sorgente e non mostra il bridge in quel caso.
- Checkout e CAPI usano solo URL canonici `/blueprint*`.
- Nel funnel non compaiono “Metodo Ciak”, claim “14 mesi”, risultati inventati o scarsità artificiale.
- Redirect legacy continuano a funzionare senza catene.
- Test frontend/backend e build di produzione passano.
