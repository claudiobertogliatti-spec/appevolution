# Workflow Systeme.io — Email Checkpoint Strategico (4 stati)

**Stato:** LOCK 17/5/2026. Decisione architettura: l'email "Sei allo Stato N" del Checkpoint Strategico viene inviata da **Systeme.io** (non più SMTP diretto). Backend applica il tag → Systeme triggera il workflow → email parte.

**Motivazione**: SMTP register.it ha problemi di DNS resolution da Cloud Run (errno -2). Systeme ha infrastruttura email gestita, retry, deliverability, open rate tracking nativo. Allineamento con strategia v5 "single source = Systeme".

---

## Setup su Systeme.io — 4 workflow paralleli

Tutti e 4 i workflow hanno la **stessa struttura**, cambiano solo trigger tag, subject e body.

**Tipo workflow**: Automazione → Quando un contatto riceve un tag → invia email immediata.

| # | Trigger tag (esatto)             | Subject                                                                          | File body                                          |
|---|----------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------|
| 1 | `ciak_checkpoint_stato_1`        | `{{contact.first_name}}, ho letto il tuo Checkpoint. Sei allo Stato 1.`         | sotto §Stato 1                                     |
| 2 | `ciak_checkpoint_stato_2`        | `{{contact.first_name}}, sei allo Stato 2. Ecco cosa significa.`                | sotto §Stato 2                                     |
| 3 | `ciak_checkpoint_stato_3`        | `{{contact.first_name}}, sei allo Stato 3. Il problema è diverso da quello che pensi.` | sotto §Stato 3                                     |
| 4 | `ciak_checkpoint_stato_4`        | `{{contact.first_name}}, sei allo Stato 4. Adesso la domanda cambia.`           | sotto §Stato 4                                     |

**Sender**: `Claudio Bertogliatti <info@evolution-pro.it>` (o quello che usi su Systeme per le altre campagne).
**Reply-To**: `claudio.bertogliatti@gmail.com`.

**CTA UTM**: ogni email link verso `https://www.ciak.io/ciak-blueprint` con UTM diverso per stato (vedi sotto). Questi UTM servono al funnel tracking di `masterclass-analytics`.

---

## Stato 1 — Definizione

**Subject**: `{{contact.first_name}}, ho letto il tuo Checkpoint. Sei allo Stato 1.`

**CTA URL**: `https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_1`

**Body HTML** (incolla così com'è — Systeme renderizza le `{{ }}` automaticamente):

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Stato 1 — Definizione</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Checkpoint Strategico — Risultato</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Stato 1 — Definizione</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">hai appena chiuso il Checkpoint Strategico. Grazie per il tempo — non è banale fermarsi 5 minuti a guardare dove sei davvero.</p>
      <p style="margin:0 0 16px;">Le tue risposte ti collocano in <strong>Stato 1</strong> — Definizione.</p>
      <p style="margin:0 0 16px;">Significa che sei in una fase di valutazione iniziale. La competenza c'è (altrimenti non saresti qui), ma il modello digitale intorno alla competenza non è ancora definito.</p>
      <p style="margin:0 0 16px;"><strong>E attenzione:</strong> questo non è un giudizio. È il punto di partenza più onesto. Saltarlo significa costruire su sabbia.</p>
      <p style="margin:0 0 16px;">Quello che NON funziona nello <strong>Stato 1</strong> è iniziare a "fare cose": aprire un profilo Instagram, registrare un video, comprare un funnel. Sembra produttivo ma non lo è — perché non hai ancora deciso quale offerta vuoi costruire, per chi, e a quale prezzo.</p>
      <p style="margin:0 0 16px;">Quello che FUNZIONA è fermarsi un attimo prima e definire la direzione.</p>
      <p style="margin:0 0 16px;">Il passo coerente con lo <strong>Stato 1</strong> è il <strong>Ciak Blueprint</strong>: 60 minuti di analisi 1-a-1 con me sulla tua situazione specifica + una <strong>Roadmap Operativa</strong> scritta su misura per i tuoi prossimi 90 giorni.</p>
      <p style="margin:0 0 16px;">Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai una direzione precisa, ti rimborso integralmente.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_1" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Prenota il tuo Ciak Blueprint →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio Bertogliatti</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
</body>
</html>
```

**Apri sempre con**: "Ciao {{contact.first_name|default:'ciao'}}," — Systeme lo prefissa al body. Se preferisci embeddarlo nel template, sostituisci il primo `<p>` con:
`<p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},<br><br>hai appena chiuso il Checkpoint Strategico...</p>`

---

## Stato 2 — Strutturazione

**Subject**: `{{contact.first_name}}, sei allo Stato 2. Ecco cosa significa.`

**CTA URL**: `https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_2`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Stato 2 — Strutturazione</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Checkpoint Strategico — Risultato</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Stato 2 — Strutturazione</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in <strong>Stato 2</strong> — Strutturazione.</p>
      <p style="margin:0 0 16px;">Significa che la tua competenza è reale, hai già clienti che la riconoscono, ma manca una struttura chiara e replicabile per trasformare quella competenza in un modello digitale sostenibile.</p>
      <p style="margin:0 0 16px;"><strong>E attenzione:</strong> lo <strong>Stato 2</strong> è la fase in cui si fanno gli errori più costosi.</p>
      <p style="margin:0 0 16px;">Si fanno corsi, si comprano funnel, si registrano video, si testano ads. Sembra che si stia "lavorando al business". Ma senza una struttura che tenga insieme tutti questi pezzi, ogni azione disperde energia invece di sommarla.</p>
      <p style="margin:0 0 16px;">Il passaggio successivo coerente con lo <strong>Stato 2</strong> NON è fare di più. È fissare la struttura PRIMA di accelerare.</p>
      <p style="margin:0 0 16px;">Il <strong>Ciak Blueprint</strong> serve esattamente a questo: 60 minuti di analisi 1-a-1 con me + una <strong>Roadmap Operativa</strong> che mette insieme posizionamento, offerta, funnel, prezzi. Tutto sulla TUA situazione, non su un template.</p>
      <p style="margin:0 0 16px;">Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai una direzione precisa, ti rimborso integralmente.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_2" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Prenota il tuo Ciak Blueprint →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio Bertogliatti</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
</body>
</html>
```

---

## Stato 3 — Validazione

**Subject**: `{{contact.first_name}}, sei allo Stato 3. Il problema è diverso da quello che pensi.`

**CTA URL**: `https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_3`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Stato 3 — Validazione</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Checkpoint Strategico — Risultato</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Stato 3 — Validazione</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in <strong>Stato 3</strong> — Validazione.</p>
      <p style="margin:0 0 16px;">Significa che hai già un'offerta digitale attiva, qualche cliente, qualche risultato. Ma percepisci che qualcosa non sta crescendo come dovrebbe.</p>
      <p style="margin:0 0 16px;"><strong>E attenzione:</strong> nello <strong>Stato 3</strong> il problema è quasi sempre diverso da quello che sembra.</p>
      <p style="margin:0 0 16px;">Sembra un problema di traffico (mi servono più lead). Sembra un problema di copy (devo scrivere meglio). Sembra un problema di prezzo (forse costo troppo).</p>
      <p style="margin:0 0 16px;">Nella maggior parte dei casi che vedo, è un collo di bottiglia strutturale nascosto. Un punto preciso del modello in cui l'energia si disperde — e finché non lo identifichi, ogni leva nuova (più ads, più contenuti, più funnel) rende meno di quello che potrebbe.</p>
      <p style="margin:0 0 16px;">Il <strong>Ciak Blueprint</strong> serve a leggere lucidamente cosa sta funzionando e dove intervenire prima. 60 minuti 1-a-1 con me + una <strong>Roadmap Operativa</strong> focalizzata sul collo di bottiglia che sta limitando la tua crescita.</p>
      <p style="margin:0 0 16px;">Non vendo un percorso. Vendo chiarezza. Se al termine dei 60 minuti non hai una direzione precisa, ti rimborso integralmente.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_3" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Prenota il tuo Ciak Blueprint →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio Bertogliatti</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
</body>
</html>
```

---

## Stato 4 — Evoluzione Strategica

**Subject**: `{{contact.first_name}}, sei allo Stato 4. Adesso la domanda cambia.`

**CTA URL**: `https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_4`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Stato 4 — Evoluzione Strategica</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Checkpoint Strategico — Risultato</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Stato 4 — Evoluzione Strategica</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">hai chiuso il Checkpoint Strategico. Le tue risposte ti collocano in <strong>Stato 4</strong> — Evoluzione Strategica.</p>
      <p style="margin:0 0 16px;">Significa che hai già un modello strutturato e genera risultati concreti. Non sei più in cerca di "come iniziare". Sei in cerca di "dove concentrare attenzione e risorse per crescere mantenendo solidità".</p>
      <p style="margin:0 0 16px;"><strong>E attenzione:</strong> nello <strong>Stato 4</strong> il rischio non è la velocità. È perdere sostenibilità mentre si cresce.</p>
      <p style="margin:0 0 16px;">Più i numeri salgono, più ogni decisione strategica pesa: che leva attivare, che offerta scalare, dove smettere di disperdere. È la fase in cui un confronto strategico esterno vale più di qualsiasi nuovo strumento.</p>
      <p style="margin:0 0 16px;">Il <strong>Ciak Blueprint</strong> in <strong>Stato 4</strong> è un'analisi 1-a-1 profonda — 90 minuti invece dei 60 standard — orientata a identificare i 2-3 fuochi di concentrazione strategica per i prossimi 12 mesi. Output: una <strong>Roadmap Operativa</strong> che ti dice non cosa fare, ma cosa SMETTERE di fare e dove raddoppiare.</p>
      <p style="margin:0 0 16px;">Non vendo un percorso. Vendo chiarezza. Se al termine dell'analisi non hai una direzione precisa, ti rimborso integralmente.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://www.ciak.io/ciak-blueprint?utm_source=systeme&utm_medium=email&utm_campaign=checkpoint_email&utm_content=stato_4" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Prenota il tuo Ciak Blueprint →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">A presto,<br>Claudio Bertogliatti</p>
      <p style="margin:0;font-style:italic;">Ciak. Una direzione strategica per la tua competenza professionale.</p>
    </div>
  </div>
</body>
</html>
```

---

## Checklist verifica post-configurazione

Dopo aver creato i 4 workflow su Systeme:

1. **Test manuale ogni stato**: completa il Checkpoint su ciak.io scegliendo risposte che portano allo Stato 1, poi 2, poi 3, poi 4 (puoi usare `?fast=1` per saltare il timer video). Verifica che arrivino 4 email diverse.
2. **Subject corretti**: Systeme deve interpolare `{{contact.first_name}}` (controlla un'email dove il contatto ha nome).
3. **CTA UTM**: clicca il CTA da ogni email → atterri su `/ciak-blueprint` con `utm_content=stato_<n>`.
4. **Analytics admin Ciak**: `ciak.io/admin/masterclass-analytics` mostra "Email inviate" > 0 nella tabella open rate.

## Backend: cosa NON serve più configurare

Le env var SMTP su Cloud Run (`SMTP_HOST`, `SMTP_USER`, ecc.) restano per compatibilità con altri service (Partnership emails) ma per il checkpoint sono **ignorate** dal 17/5/2026. Vedi commit nel diff `services/ciak_checkpoint_email.py`.
