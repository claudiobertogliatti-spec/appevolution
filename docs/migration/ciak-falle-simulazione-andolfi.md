# Falle di Ciak emerse simulando il percorso EVO su Daniele Andolfi (ID 23)

**30/07/2026.** Daniele è il caso reale di test del funzionamento di Ciak: il percorso è stato
**eseguito dentro il sistema** (endpoint reali, token admin), non riempito da fuori. Ogni voce qui
sotto è un comportamento osservato, con la chiamata che lo riproduce.

Evidenza principale: la dispensa scaricata da `GET /api/partner-rewards/23/project-book`
(HTTP 200, 18.668 byte, 6 pagine) — **il documento che il partner riceve al lancio.**

---

## 🔴 A — La dispensa contiene prezzi che non sono i suoi
Sezione *10.0 Webinar e offerta*: «Il corso è in vendita a **97€**… chi acquista entro [SCADENZA]
lo prende a **67€**». L'offerta reale di Daniele, decisa da Claudio il 29/7 e scritta nell'hub, è
**297€ con listino 497€**.
Il webinar è stato generato dall'AI prima che l'offerta esistesse, e la dispensa lo pubblica come
se fosse la sua. **È il rischio più concreto: un documento che va al cliente con il prezzo sbagliato.**
👉 La generazione del webinar va rifatta dopo l'offerta, e la dispensa deve leggere il prezzo
dall'hub, non dal contenuto generato.

## 🔴 B — Dump di dizionario Python dentro il PDF
Sempre la 10.0 stampa `{'webinar': {'titolo': '…', 'fasi': [{'fase': 'Apertura', …}]}}` per due
pagine intere: apici, parentesi graffe, chiavi. Il contenuto generato è ottimo, la resa è illeggibile.
Causa: `str(webinar.get("strategia"))` in `backend/routers/partner_rewards.py` → `_project_sections`.

## 🔴 C — Tag HTML grezzi in copertina
Prima pagina: `<b>Preparato per:</b> Daniele Andolfi`, `<b>Progetto / Accademia:</b>`… I tag sono
stampati come testo. È la prima cosa che il partner vede.

## 🟠 D — La dispensa non legge le fonti reali: 6 sezioni su 11 sono placeholder
Su un partner che ha brand kit completo, posizionamento a 20 risposte, masterclass approvata e
12 moduli girati, il PDF dice:
| Sezione | Cosa stampa | Cosa esiste davvero |
|---|---|---|
| 2.0 Target | "Stiamo definendo il pubblico più adatto" | `04-posizionamento` completo |
| 3.0 Problema e promessa | "verrà aggiornata dal posizionamento" | idem |
| 4.0 Brand | "Logo, colori e stile saranno raccolti qui" | brand kit completo (logo, palette, font, tone of voice) |
| 5.0 Masterclass | "si completerà nella fase Valida" | girata, montata, `video_pipeline_status: approved` |
| 6.0 Corso | "verrà aggiunta dopo l'outline" | 12 moduli / 32 lezioni in `partner_videocorso.course_data` |
| 9.0 Calendario di lancio | "verrà aggiunto quando generato" | mai generato (vero) |

Causa: `_project_sections` legge `steps[<id>].data.<chiave>` (es. `pos.get("target")`,
`story.get("sintesi")`, `masterclass.get("titolo")`), ma i dati veri stanno in
**`data.answers`** (posizionamento e storia) oppure in **altre collection**
(`masterclass_factory`, `partner_videocorso`, `partner_brand_kits`). Cerca nel posto sbagliato.

## 🟠 E — Nome del progetto non trovato
Copertina: *"Progetto / Accademia: **Il tuo modello digitale**"* — il fallback. Il progetto si
chiama **Sabai Academy** (hub) / **Metodo Sabai** (course_data). `_project_name` cerca
`03-brand-kit.data.nome_progetto`, chiave che non esiste.

## 🟠 F — Script videolezioni incollati grezzi e troncati
Sezione 7.0: tre moduli di script con `**APERTURA:**` e `##` non interpretati, e il testo si
interrompe a metà frase («non riesci a ferma»). Nessun limite, nessuna formattazione.

## 🟠 G — Dispensa e certificati bloccati a 0/3 con 12 step su 17 completati
`unlocked_sections: 0/3`, nessun certificato, nessun bonus. `_phase_unlocked` pretende **tutti**
gli step della macro-fase `done`: bastano `obiettivo` (pending) e `la-tua-storia` (in_progress) a
bloccare Esamina, e con essa tutto il resto. Un percorso quasi completo non sblocca nulla.

## 🟠 H — Due motori di stato che si contraddicono
`GET /api/partner-journey/progress/23` dice `masterclass: {started: false, video_approved: false}`
e `videocorso: {completed: false}` — mentre `masterclass_factory` ha script, video approvato ed
embed YouTube, e ci sono 32 lezioni caricate. La vista `progress` non legge le collection reali.

## 🟠 I — Il partner vede il percorso fermo al quinto step
`GET /api/partner-journey/operativo/state/23` → `current_step: "la-tua-storia"` (step 5 di 17)
con `completed_count: 12`. `current_step` = primo step non-`done`, quindi **un solo step lasciato
in_progress a metà percorso riporta indietro la vista di tutto il journey.**
È lo stesso fenomeno segnalato su Michele Baggio (fase 3 EVO, Ciak mostra F1): non è un dato
sbagliato del partner, **è come il sistema calcola dove sei.**

---

## Cosa dice questo collaudo
Le falle non sono di Daniele: sono di Ciak, e le vedrebbero **tutti i partner** al lancio.
Tre riguardano il deliverable che esce dall'azienda (la dispensa) e vanno risolte per prime: A, B, C.
D ed E la rendono povera; G e I falsano il percorso che il partner vede.

**Non ancora eseguiti** (prossimo giro della simulazione): `funnel/generate`,
`lancio/generate-plan`, e la ripresa della pipeline di editing bloccata su `pilot_blocked_drive_access`.
