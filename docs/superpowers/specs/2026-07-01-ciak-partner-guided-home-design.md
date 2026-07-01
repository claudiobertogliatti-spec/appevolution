# Spec — Ciak Partner Guided Home

**Data:** 2026-07-01  
**Scope:** restyling definitivo della home partner Ciak, coerente con la grafica pubblica di ciak.io.  
**Owner:** Claudio Bertogliatti  
**Stato:** direzione visuale approvata in companion browser, da trasformare in piano implementativo.

## 1. Visione

La home partner non deve sembrare un portale software. Deve sembrare una stanza guidata.

Il partner entra e percepisce subito tre cose:

1. **So cosa devo fare adesso.**
2. **C'è un agente AI specifico che mi segue in questa fase.**
3. **Dietro l'agente c'è il team umano Evolution PRO, raggiungibile nel gruppo Telegram personale.**

Questa direzione estende la spec `2026-05-17-operativo-stefania-design.md`: resta il principio "una cosa alla volta", ma la presenza dell'agente di fase diventa il centro visivo ed emotivo dell'esperienza.

## 2. Principio guida

**AI davanti, team umano dietro, un solo prossimo passo.**

Non vendiamo "accesso a una piattaforma". Facciamo percepire un percorso accompagnato.

La home deve comunicare:

- ordine operativo, perché Ciak tiene insieme step, materiali e avanzamento;
- presenza, perché l'agente AI ha volto, nome, ruolo e chat in evidenza;
- rassicurazione, perché Telegram collega il partner al team umano Evolution PRO.

## 3. Layout approvato

Direzione scelta: **B2 — agente grande + chat live + gruppo Telegram personale**.

### Primo accesso: video di benvenuto

Il primo accesso del partner è uno stato speciale di onboarding, non una pagina permanente.

Al primo login:

1. la home mostra **Stefania** come agente principale;
2. il blocco centrale è **"Benvenuto nel Metodo EVO"**;
3. il video di Claudio è ben visibile;
4. la CTA primaria è **"Ho visto il video, inizia il percorso"**.

Dopo il click:

- salvare sul profilo/percorso partner `welcome_video_seen = true`;
- passare automaticamente alla **Fase 1 · Esamina**;
- l'agente principale diventa **Valentina**;
- il prossimo passo diventa il primo step reale della fase Esamina.

Accessi successivi:

- il video non blocca più la home;
- resta recuperabile da **Materiali** o da un link secondario "Rivedi il video di benvenuto";
- se il partner non ha completato la visione, resta in cima come primo task.

Copy approvato:

```text
Benvenuto nel Metodo EVO
Prima di iniziare, Claudio ti spiega come funziona il percorso e cosa succede nelle prossime settimane.

[Guarda il video]
[Ho visto il video, inizia il percorso]
```

Primo viewport desktop:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Sidebar corta                                                          │
│ Home · Il mio percorso · Materiali · Gruppo Telegram · Servizi extra   │
├────────────────────────────────────────────────────────────────────────┤
│ Ciao Marco, oggi sei seguito da Andrea.             Progress 6/14      │
│ Andrea ti accompagna nella fase video.                                 │
│                                                                        │
│ ┌──────────────────────┐ ┌───────────────────────────────────────────┐ │
│ │ Foto grande Andrea   │ │ Prossimo passo: Registra la masterclass   │ │
│ │ Nome + ruolo         │ │ Spiegazione semplice                      │ │
│ │ [Fai una domanda]    │ │ Chat live con Andrea in evidenza          │ │
│ └──────────────────────┘ └───────────────────────────────────────────┘ │
│                                                                        │
│ ┌ Gruppo Telegram ┐ ┌ Team umano collegato ┐ ┌ Cosa succede dopo ┐     │
└────────────────────────────────────────────────────────────────────────┘
```

Mobile:

- agente di fase in alto, foto grande;
- prossimo passo subito sotto;
- chat live visibile prima del percorso completo;
- Telegram personale sempre raggiungibile con CTA chiara.

## 4. Navigazione

La sidebar deve essere corta, identitaria e orientata al modello di business. Il partner non deve vedere tutta l'architettura interna.

Direzione visuale approvata:

- sfondo pagina grigio chiaro;
- sidebar bianca;
- bordo giallo Ciak con alone morbido;
- vero logo Ciak in alto, asset `/ciak/logo.webp`;
- tasti pieni blu con icone di riferimento;
- bottone Telegram in blu Telegram;
- nessun menu scuro generico.

Voci principali:

1. **Home**
2. **Il mio percorso**
3. **Materiali**
4. **Il team Ciak.io**
5. **Gruppo Telegram**

Sotto le voci principali, la sidebar deve raccontare la progressione commerciale in modo naturale:

```text
Protocollo EVO · 12 mesi
Il tuo investimento include costruzione, lancio e accompagnamento.

Se vuoi accelerare
Servizi extra
ADV, video premium, copy, automazioni, contenuti.

Dopo i 12 mesi
Continua a scalare
Start, Grow, Scale · minimo 6 mesi.
```

Le aree commerciali come Booster EVO, EVO-S, Growth System e Accelera non devono competere con il prossimo passo operativo. Vanno riorganizzate così:

- **Booster EVO / Accelera / servizi extra** diventano mentalmente "Servizi extra": leve facoltative durante i 12 mesi per velocizzare o spingere le vendite.
- **EVO-S / Growth System post-percorso** diventano "Continua a scalare": tre soluzioni in abbonamento dopo i 12 mesi, con permanenza minima 6 mesi.

Il partner deve capire: "ho già un percorso incluso; se voglio andare più veloce ho servizi extra; quando finisce il percorso posso continuare a scalare".

### Il team Ciak.io

La sidebar deve includere una sezione **"Il team Ciak.io"** prima del gruppo Telegram.

Scopo:

- far percepire che il partner è seguito da un team AI specializzato;
- rendere gli agenti riconoscibili per nome, volto e ruolo;
- permettere una chat diretta con l'agente giusto;
- separare bene supporto AI e supporto umano.

Struttura sidebar:

```text
Il team Ciak.io
Stefania   Coordinatrice del percorso       [chat]
Valentina  Esamina · brand e posizionamento [chat]
Andrea     Valida · video e corso           [chat]
Gaia       Valida · funnel e tecnica        [chat]
Marco      Ottimizza · lancio e crescita    [chat]
```

Regole visuali:

- ogni agente appare in una finestra/card compatta;
- usare la foto reale gia presente in `/agents/{nome}.jpg`;
- mostrare nome, ruolo sintetico e icona/CTA chat;
- al click aprire la chat con `target_agent`;
- se la foto non carica, fallback all'iniziale su sfondo blu/giallo.

Gerarchia corretta:

```text
Home = agente attivo + prossimo passo
Il team Ciak.io = tutti gli agenti AI e chat diretta
Gruppo Telegram = supporto umano Evolution PRO
```

Il partner deve capire che gli agenti lavorano dentro Ciak, mentre Telegram è il filo diretto umano con Evolution PRO.

## 5. Agente di fase

Fonte dati: `frontend/src/ciak/partner/operativo/agents.js`.

La home mostra l'agente attivo in base alla fase/step corrente:

- **Stefania** — coordinatrice del percorso, orientamento generale.
- **Valentina** — brand, storia, posizionamento.
- **Andrea** — masterclass, corso, video e contenuti.
- **Gaia** — funnel, pagine, automazioni, parte tecnica.
- **Marco** — lancio, vendita, accountability, continuità.
- **Matteo** — analisi Blueprint e scoring.

Regole visuali:

- foto grande dell'agente, non avatar piccolo decorativo;
- nome e ruolo leggibili;
- frase di accompagnamento contestuale: "Oggi sei seguito da Andrea";
- CTA primaria: "Fai una domanda";
- CTA secondaria eventuale: "Vedi cosa ti segue in questa fase".

## 6. Chat live

La chat non deve essere nascosta come funzione avanzata. Deve stare nel primo viewport.

Uso previsto:

- il partner chiede dubbi pratici sullo step corrente;
- il backend continua a usare `POST /api/stefania/chat` con `target_agent`;
- il system prompt cambia in base all'agente attivo;
- la chat deve partire gia contestualizzata sullo step.

Esempio di apertura:

```text
Andrea:
Ciao Marco, partiamo semplice. Prima di registrare controlliamo scaletta, durata e luce. Vuoi che ti dica cosa tenere e cosa tagliare?
```

La chat deve sembrare una guida operativa, non un chatbot generico.

## 7. Telegram personale

Ogni partner deve poter collegare o aprire il proprio gruppo Telegram personale.

Ruolo del canale:

- **Ciak** = ordine, task, materiali, avanzamento, storico.
- **Telegram** = rapporto caldo, supporto umano, conferme rapide, presenza reale del team.

La home mostra un blocco dedicato:

```text
Gruppo Telegram personale
Canale umano con il team Evolution PRO. Qui arrivano conferme, note operative e risposte quando serve una persona vera.
[Apri Telegram]
```

Comportamento minimo v1:

- se il partner ha `telegram_group_url`, mostra "Apri Telegram";
- se manca, mostra "Richiedi collegamento Telegram";
- il bottone può aprire la pagina supporto o inviare richiesta al team se non esiste ancora un endpoint dedicato.

Non bloccare il restyling su una integrazione Telegram completa. Il collegamento può partire come URL per-partner e diventare automazione dopo.

## 8. Copy direction

Il copy deve proseguire la linea scelta: **motivante, semplice, professionale**.

Non motivazionale da palco. Non tecnico. Non freddo.

### Tono

- diretto;
- rassicurante;
- concreto;
- adulto;
- orientato all'azione;
- mai guru-speak.

### Formula base

Ogni blocco importante deve rispondere a quattro domande:

1. Dove sono?
2. Chi mi segue?
3. Cosa devo fare ora?
4. Cosa succede dopo?

### Esempi buoni

```text
Ciao Marco, oggi sei seguito da Andrea.
Andrea ti accompagna nella fase video. Il team Evolution PRO resta collegato nel tuo gruppo Telegram personale.
```

```text
Registra la masterclass
Ti guidiamo noi. Tu devi solo prepararti, registrare e caricare il video.
```

```text
Se ti blocchi, chiedi ad Andrea qui sotto. Se serve una persona del team, apri il gruppo Telegram personale.
```

```text
Il team sta lavorando al tuo materiale. Ti avvisiamo appena puoi rivederlo.
```

```text
Hai già il percorso incluso. Se vuoi velocizzare o spingere le vendite, qui trovi i servizi che il team può attivare per te.
```

```text
Dopo i 12 mesi puoi scegliere un piano di continuità: Start, Grow o Scale. Resti seguito dal team, con impegno minimo 6 mesi.
```

### Esempi da evitare

```text
Sblocca il tuo potenziale digitale.
```

Troppo generico, suona da corso motivazionale.

```text
Completa il workspace per procedere alla fase successiva del funnel asset.
```

Troppo tecnico, parla la lingua interna del prodotto.

```text
Ottimizza il tuo ecosistema di conversione omnicanale.
```

Fuffa. Il partner non capisce cosa deve fare.

```text
EVO-S
```

Come voce secca in sidebar non dice nulla a chi non ricorda l'offerta. Meglio usare "Continua a scalare" e spiegare dentro la pagina che si tratta di EVO-S.

### Parole da preferire

- passo
- percorso
- guida
- team
- materiale
- video
- pagina
- carica
- rivedi
- approva
- continua
- chiedi

### Parole da usare con cautela

- workspace
- funnel
- asset
- automazione
- KPI
- delivery
- growth
- booster

Queste parole possono esistere nel prodotto, ma non devono essere il primo linguaggio della home partner.

## 9. Visual direction

Coerenza con ciak.io pubblico e con la memory `CIAK_BLUEPRINT_LAYOUT.md`:

- base chiara;
- slate profondo per contrasto;
- giallo Ciak come accento operativo;
- bordi morbidi ma non giocattolosi;
- pochi elementi, gerarchia netta;
- nessun effetto dashboard enterprise;
- nessuna palette tutta blu o tutta gialla.

Componenti chiave:

- card agente scura, con foto grande e CTA gialla;
- card prossimo passo bianca con bordo giallo;
- chat live chiara, leggibile, rassicurante;
- card Telegram con accento azzurro Telegram, ma senza rompere la palette Ciak;
- team umano mostrato con foto/iniziali compatte.
- sidebar bianca con bordo giallo e alone;
- logo reale Ciak in alto;
- bottoni sidebar pieni blu, con icone e microcopy;
- sfondo generale grigio chiaro.
- sezione "Il team Ciak.io" con finestre agenti, foto, ruolo e chat cliccabile;

## 10. Relazione AI + umano

La home deve evitare due errori:

1. far sembrare che faccia tutto l'AI;
2. far sembrare che l'app sia solo un ticket system verso il team.

Il messaggio corretto:

```text
L'agente AI ti guida nel passo corrente.
Il team Evolution PRO supervisiona, interviene e lavora dietro le quinte.
Telegram è il tuo filo diretto umano.
```

Questa relazione deve essere visibile in UI:

- agente grande = guida immediata;
- chat agente = domande operative live;
- gruppo Telegram = contatto umano;
- "cosa succede dopo" = mostra il lavoro del team dietro le quinte.

## 11. Criteri di accettazione UX

1. Un partner poco digitale capisce entro 5 secondi cosa deve fare.
2. L'agente di fase è percepito come guida, non come mascotte.
3. La chat è visibile senza cercarla nel menu.
4. Il gruppo Telegram personale è raggiungibile dalla home.
5. La sidebar non mostra piu di 5 voci principali.
6. Il copy non usa gergo tecnico nel primo viewport.
7. La pagina mantiene la grafica premium leggera gia scelta per ciak.io.
8. La sidebar comunica chiaramente: incluso nei 12 mesi, servizi extra per accelerare, continuità post 12 mesi.
9. Il logo Ciak reale è visibile in alto nella sidebar.
10. I tasti della sidebar sono pieni blu con icone, non semplici link testuali.
11. La sidebar include "Il team Ciak.io" prima di Telegram, con foto, ruolo e chat per ogni agente.
12. Telegram è presentato come supporto umano Evolution PRO, distinto dalla chat AI degli agenti.

## 12. Implementazione successiva

Questa spec non implementa ancora codice.

La fase successiva deve produrre un piano che:

- parte da `origin/main`, non dal branch production divergente;
- porta dentro solo le parti utili del restyling pubblico da `chore/consolidate-evo-ciak`;
- aggiorna `PartnerOperativo.jsx`, `JourneyMap.jsx`, `PartnerSidebar.jsx`, `AgentDrawer.jsx` e `TeamSupportoPage.jsx`;
- valuta un campo per-partner `telegram_group_url`;
- verifica build frontend prima di qualsiasi deploy.
