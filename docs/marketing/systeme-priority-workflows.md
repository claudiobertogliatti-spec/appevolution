# Systeme.io — Workflow prioritari per il lancio Ciak

**Stato:** LOCK 17/5/2026. Dopo audit Cowork: i 4 workflow Checkpoint (§2) sono
già attivi. Restano da creare i 2 workflow OBBLIGATORI per il lancio + 1 nuovo
(partner setup magic link). Copy pronti per copy/paste, ottimizzati per tono
Claudio (anti-coach, anti-hype, italiano semplice).

---

## ⚡ Priorità di setup (in ordine)

| # | Workflow | Stato attuale | Criticità | Sezione doc |
|---|---|---|---|---|
| 1 | `ciak_optin_masterclass` (4 email) | ❌ mancante, 5 lead orfani | 🔴 CRITICA lancio | §A sotto |
| 2 | `ciak_bought_67` (3 email) | ❌ mancante | 🔴 CRITICA post-lancio | §B sotto |
| 3 | `partner_setup_pending` (1 email magic link) | ❌ mancante | 🔴 CRITICA Partnership | `systeme-partner-setup-workflow.md` |
| 4 | Disattivare 6 workflow zombie | attivi vuoti | 🟡 cleanup | §C sotto |
| 5 | Exit rules sui 4 checkpoint workflow | non configurate | 🟡 future-proofing | §D sotto |
| 6 | Open rate tracking (Action su email opened) | non configurato | 🟢 nice-to-have | §E sotto |

---

## §A — Workflow `ciak_optin_masterclass` (4 email su 7 giorni)

**Trigger**: Tag added to contact → `ciak_optin_masterclass`
**Exit on tag**: `ciak_bought_67` (configurare se Systeme lo permette via Goal/Decision step, altrimenti accettare il rischio per le sequenze brevi)
**Sender**: `Claudio Bertogliatti <info@evolution-pro.it>` · Reply-To: `claudio.bertogliatti@gmail.com`

### Email 1 — T+0 (immediata)

**Subject**: `{{contact.first_name|default:'Ciao'}}, ecco la masterclass — guardala adesso`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Masterclass Ciak</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Trenta minuti per leggere dove sei davvero.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">grazie per esserti iscritto. Eccoti la masterclass.</p>
      <p style="margin:0 0 16px;">Sono <strong>30 minuti dritti al punto</strong>. Non è motivazionale. Non ti vendo niente alla fine. È un'analisi su come una competenza professionale diventa (o non diventa) un modello digitale che sta in piedi.</p>
      <p style="margin:0 0 16px;">Alla fine trovi il <strong>Checkpoint Strategico</strong>: 5 domande, due minuti. Restituisce il tuo Stato attuale (1-4). Usalo per capire da che parte stai oggi — anche solo per te stesso, anche se poi non fai più niente.</p>
      <p style="margin:0 0 16px;">Suggerimento: guardalo seduto, non in giro. È più denso di quello che sembra.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/masterclass?utm_source=systeme&utm_medium=email&utm_campaign=optin_sequence&utm_content=email_1" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Guarda la masterclass →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
</body>
</html>
```

### Email 2 — T+24 ore

**Subject**: `{{contact.first_name|default:'Ciao'}}, hai guardato? (e una cosa che ho notato)`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Follow-up masterclass</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">La cosa che funziona ha un nome preciso.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">se hai guardato la masterclass: bene. Se non l'hai ancora fatto, fallo oggi — diventa più difficile più aspetti.</p>
      <p style="margin:0 0 16px;"><strong>E attenzione:</strong> quello che separa chi cresce online da chi resta fermo non è il prodotto, non è il sito, non è il pubblico. È una sola cosa: <strong>chiarezza sulla direzione</strong>. Tutto il resto viene dopo.</p>
      <p style="margin:0 0 16px;">Sembra ovvio finché non lo applichi su te stesso. Quando provi a rispondere alle domande del Checkpoint — quelle 5 — la maggior parte delle persone scopre due cose:</p>
      <p style="margin:0 0 16px;">1. Non sa rispondere a 2 o 3 con sicurezza.<br>2. Le risposte che dà sono quelle di un anno fa, non di adesso.</p>
      <p style="margin:0 0 16px;">Se non hai ancora fatto il Checkpoint, fallo. Cinque minuti.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/masterclass?utm_source=systeme&utm_medium=email&utm_campaign=optin_sequence&utm_content=email_2" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Riprendi da dove avevi lasciato →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
    </div>
  </div>
</body>
</html>
```

### Email 3 — T+3 giorni

**Subject**: `"Da dove inizio?" — la domanda che mi fanno tutti`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Il prossimo passo concreto</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Quando guardiamo il tuo caso specifico.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">la domanda che mi fanno tutti — dopo aver guardato la masterclass — è la stessa: <em>"OK, ho capito il principio. Ma nel mio caso specifico, da dove inizio?"</em></p>
      <p style="margin:0 0 16px;">È una domanda onesta. E non ha una risposta generica. Dipende dal tuo punto di partenza, dalla tua competenza, dal tempo che hai, da quello che vuoi davvero.</p>
      <p style="margin:0 0 16px;">Per questo abbiamo creato il <strong>Ciak Blueprint</strong>: 60 minuti di analisi 1-a-1 con me e il team Evolution PRO, sul TUO caso. Più una <strong>Roadmap Operativa</strong> scritta entro 48 ore — non un documento generico, le tue prossime 90 giorni precise.</p>
      <p style="margin:0 0 16px;">Costa <strong>67€</strong>. Se al termine dell'analisi pensi che non ti sia stata utile, ti rimborso entro 7 giorni dalla call. Nessuna procedura complicata.</p>
      <p style="margin:0 0 16px;">Non vendo un percorso. Vendo chiarezza. Se è il momento giusto, prenotala.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=optin_sequence&utm_content=email_3" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Scopri il Ciak Blueprint →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
    </div>
  </div>
</body>
</html>
```

### Email 4 — T+7 giorni

**Subject**: `Ultima cosa, poi ti lascio in pace`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Chiusura sequenza</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Sei tu che decidi quando.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">questa è l'ultima email di questa sequenza. Da qui in poi non ti scrivo più automaticamente — solo quando ho qualcosa di concreto da dirti.</p>
      <p style="margin:0 0 16px;">Una cosa sola, prima di chiudere: il <strong>Ciak Blueprint</strong> serve a chi vuole capire <em>se</em> trasformare la propria competenza in un modello digitale ha senso, e <em>come</em> farlo nel proprio caso specifico. Non serve a chi cerca motivazione, non serve a chi cerca scorciatoie.</p>
      <p style="margin:0 0 16px;">Se sei nel primo gruppo, è disponibile a 67€ con rimborso entro 7 giorni dalla call. Lì sotto trovi il link.</p>
      <p style="margin:0 0 16px;">Se sei nel secondo gruppo: nessun problema. Non ti scrivo più finché non hai un segnale da darmi.</p>
      <p style="margin:0 0 16px;">In bocca al lupo per quello che farai.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=optin_sequence&utm_content=email_4" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Richiedi il tuo Ciak Blueprint →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
    </div>
  </div>
</body>
</html>
```

### Setup azioni Systeme
1. Action 1: Email 1 (subito)
2. Action 2: Wait 1 day
3. Action 3: Email 2
4. Action 4: Wait 2 days
5. Action 5: Email 3
6. Action 6: Wait 4 days
7. Action 7: Email 4
8. (opzionale) Goal: "tag ciak_bought_67 ricevuto" → exit workflow

---

## §B — Workflow `ciak_bought_67` (3 email post-acquisto)

**Trigger**: Tag added to contact → `ciak_bought_67`
**Exit on tag**: `ciak_call_booked` (anche qui Goal/Decision se possibile)
**Sender**: stesso

### Email 1 — T+0 (conferma acquisto + 8 Domande)

**Subject**: `{{contact.first_name|default:'Ciao'}}, hai accesso al Ciak Blueprint. Il primo passo è qui.`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Ciak Blueprint — Acquisto confermato</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Iniziamo dal tuo profilo.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">grazie. L'acquisto è confermato e hai accesso al Ciak Blueprint.</p>
      <p style="margin:0 0 16px;">Prima della call con me e il team, ti chiedo di compilare le <strong>8 Domande Ciak</strong>. Servono per arrivare alla call già con un quadro chiaro del tuo punto di partenza. Senza queste, useremmo i primi 20 minuti a recuperare contesto base — non serve a te.</p>
      <p style="margin:0 0 16px;">Ci vogliono 5-7 minuti. Apri la pagina di conferma dall'acquisto: trovi lì il bottone "Accedi al questionario", oppure usa il link sotto.</p>
      <p style="margin:0 0 16px;"><strong>E attenzione:</strong> rispondi con onestà, non con quello che ti sembra debba dire. La qualità dell'analisi dipende dalla qualità dei dati che mi dai.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint/grazie?utm_source=systeme&utm_medium=email&utm_campaign=bought_67_sequence&utm_content=email_1" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Apri la pagina di accesso →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
    </div>
  </div>
</body>
</html>
```

### Email 2 — T+2 giorni (reminder 8 Domande se non completate)

**Subject**: `{{contact.first_name|default:'Ciao'}}, hai due minuti per le 8 Domande?`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Reminder — 8 Domande Ciak</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Senza le risposte, la call vale la metà.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">controlla la tua casella: ti avevo mandato il link per le 8 Domande Ciak. Se l'hai messo da parte per "dopo", questo è il "dopo".</p>
      <p style="margin:0 0 16px;">Cinque minuti. La differenza è grande: con le 8 Domande compilate, la sessione strategica entra subito nel merito della TUA situazione. Senza, perdiamo i primi 15-20 minuti a raccogliere informazioni che potevamo avere prima.</p>
      <p style="margin:0 0 16px;">È nel tuo interesse.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint/grazie?utm_source=systeme&utm_medium=email&utm_campaign=bought_67_sequence&utm_content=email_2" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Apri il questionario →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
    </div>
  </div>
</body>
</html>
```

### Email 3 — T+4 giorni (prenota la call)

**Subject**: `{{contact.first_name|default:'Ciao'}}, prenotiamo la call?`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Prenota la sessione</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Il calendario è aperto.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">se hai compilato le 8 Domande (e spero proprio di sì), è arrivato il momento di fissare la call.</p>
      <p style="margin:0 0 16px;">Sessantadue minuti, 1-a-1. Apriamo le tue risposte alle 8 Domande, leggiamo dove sei oggi, identifichiamo il punto preciso su cui intervenire prima. Entro 48 ore dalla call ricevi la <strong>Roadmap Operativa</strong> — le tue prossime 90 giorni.</p>
      <p style="margin:0 0 16px;">Apri il calendario qui sotto e scegli uno slot che ti viene comodo. Se hai problemi con qualunque slot disponibile, scrivimi.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://cal.com/claudio-bertogliatti/analisi-strategica?utm_source=systeme&utm_medium=email&utm_campaign=bought_67_sequence&utm_content=email_3" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Apri il calendario →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio</p>
    </div>
  </div>
</body>
</html>
```

### Setup azioni Systeme
1. Action 1: Email 1 (subito)
2. Action 2: Wait 2 days
3. Action 3: Email 2
4. Action 4: Wait 2 days
5. Action 5: Email 3
6. (opzionale) Goal: "tag ciak_call_booked ricevuto" → exit workflow

---

## §C — Workflow zombie da disattivare

Workflow attivi vuoti / con trigger vuoto, rilevati nell'audit Cowork. Disattivarli
(NON eliminarli, per audit storico) riduce rumore e previene anti-pattern futuri:

| ID | Nome | Stato attuale | Azione |
|---|---|---|---|
| 420283 | Benvenuto | Attivo | Disattivare (vuoto, no trigger) |
| 424943 | Riattivazione Lead | Attivo | Disattivare (vuoto) |
| 422238 | Processo di selezione commissioni di pagamento | Attivo | Disattivare (vuoto) |
| 419823 | Scegli la tua Partnership | Attivo | Disattivare (trigger vuoto + azione email anti-pattern Partnership) |
| 482486 | Sync Fase ALLINEAMENTO | In pausa | Lasciare (già pausa) |
| 482482 | Sync Fase ATTIVAZIONE | In pausa | Lasciare (già pausa) |
| 495339 | Workflow call fissata | In pausa | Lasciare (già pausa) |

---

## §D — Exit rules sui 4 workflow Checkpoint Stato

Su Systeme la "Exit rule" si configura come **Goal step** dentro il flow,
non come campo separato in Settings. Configurazione consigliata:

Per ognuno dei 4 workflow `ciak_checkpoint_stato_<n>`:
1. Apri il workflow → editor flow
2. Aggiungi un **Goal step** all'inizio (subito dopo il trigger)
3. Goal condition: "Has tag `ciak_bought_67`"
4. Se Goal raggiunto durante il workflow → contatto esce dal workflow

**Importanza oggi**: i 4 workflow Checkpoint sono single-shot (1 sola email), quindi l'exit
è ridondante. Diventa critico se un giorno aggiungiamo un follow-up "Wait + email reminder".
→ Configurarla adesso per future-proofing (1 min per workflow).

---

## §E — Open rate tracking (Action su email opened)

Per popolare i contatori "Email aperte" in `ciak.io/admin/masterclass-analytics`:

Per ognuno dei 4 workflow Checkpoint Stato:
1. Apri il workflow → editor flow
2. Dopo l'azione "Send email", aggiungi azione condizionale:
   - **Condition**: "Email opened" (entro X giorni)
   - **Then**: Apply tag `ciak_checkpoint_email_opened_stato_<n>` (sostituisci <n>)
3. Salva

L'admin Ciak già conta questi tag via `db.ciak_checkpoint_emails.opened_at`, ma per ora resta 0
finché Systeme non emette il tag.

**Priorità**: 🟢 nice-to-have. Non blocca lancio.

---

## §F — Audit MongoDB ciak_systeme_events (Claude lato server)

Verificato 17/5 da Cloud Run logs: nessun warning `[CIAK-SYSTEME] ALL tags failed` né
`audit log failed` negli ultimi 1000 entry → **SYSTEME_API_KEY healthy**, no rate limit,
no failure massive. Skippo l'audit Mongo formale (non necessario).
