# Workflow Systeme.io — Setup password partner (post-pagamento €2.790)

**Stato:** LOCK 17/5/2026. Decisione architettura: l'email "Imposta la tua
password" del partner Ciak post-pagamento viene mandata da **Systeme.io**
tramite workflow innescato dal tag `partner_setup_pending`. Backend NON manda
più SMTP per questa email (SMTP register.it ha problemi DNS in Cloud Run).

**Pattern**: backend genera magic link, lo salva come custom field Systeme +
applica tag → workflow Systeme manda email con link interpolato.

---

## ⚠️ PRIMA cosa fare (UNA VOLTA, ~3 min)

Setup custom field Systeme `partner_setup_url`:

1. Systeme dashboard → **Contacts → Custom fields**
2. Click **"Add custom field"**
3. Configurazione:
   - **Name**: `Partner Setup URL`
   - **Slug**: `partner_setup_url` (deve essere ESATTAMENTE questo, lowercase + underscore)
   - **Type**: `Text` (URL non è un type su Systeme, va bene Text)
   - **Required**: No
4. **Save**

⚠️ Senza questo custom field, il backend non riesce a passare il link al template
email. La PATCH al contatto Systeme verrà ignorata silenziosamente e il workflow
manderà un'email con `{{contact.partner_setup_url}}` come testo letterale.

Verifica: vai su Contacts → apri un contatto qualsiasi → scrolla a "Custom fields"
e dovrebbe esserci il nuovo campo.

---

## Workflow da creare (~10 min)

1. **Automations → Workflows → Create**
2. **Name**: `Ciak Partner — Setup password (post-pagamento)`
3. **Trigger**: "Tag added to contact" → tag `partner_setup_pending`
   - ⚠️ Tag potrebbe non esistere ancora se nessun partner ha pagato post-deploy.
     In tal caso CREALO PRIMA: Contacts → Tags → Create con nome esatto
     `partner_setup_pending` (case-sensitive, underscore).
4. **Action**: "Send email" → "Create new email"
   - Vedi §"Email content" sotto per subject + HTML
5. **Save & activate**

### Email content

**Subject**:
```
{{contact.first_name}}, benvenuto in Partnership Ciak. Imposta la tua password.
```

**Sender**:
- From: `Claudio Bertogliatti <info@evolution-pro.it>`
- Reply-To: `assistenza@evolution-pro.it`

**Body HTML** (incolla in modalità source/code editor):

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Imposta la tua password</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1f24;line-height:1.6;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e8e4dc;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#d4a017;margin-bottom:8px;">Partnership Ciak — Setup account</div>
    <div style="font-size:22px;font-weight:700;color:#1a1f24;margin-bottom:24px;letter-spacing:-0.02em;">Benvenuto in Partnership.</div>
    <div style="font-size:15px;color:#3d4148;">
      <p style="margin:0 0 16px;">Ciao {{contact.first_name|default:'ciao'}},</p>
      <p style="margin:0 0 16px;">grazie per aver scelto la Partnership Ciak. Il pagamento è confermato e il tuo account partner è già pronto.</p>
      <p style="margin:0 0 16px;">L'unica cosa che ti chiediamo prima di iniziare è <strong>scegliere la tua password</strong>. Clicca il bottone qui sotto: una pagina ti chiederà di impostarla in 30 secondi. Da lì entri direttamente nella tua area partner.</p>
      <p style="margin:0 0 16px;">Il link è personale, scade tra 7 giorni e funziona una sola volta. Se ti scade prima di averlo usato, scrivici e te ne mandiamo uno nuovo.</p>
    </div>
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="{{contact.partner_setup_url}}" style="display:inline-block;background:#1a1f24;color:#ffd24d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;font-size:15px;">Imposta la mia password →</a>
    </div>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:12px;color:#8b8680;line-height:1.5;">
      <p style="margin:0 0 8px;">Se il bottone non funziona, copia questo link nel browser:<br>
      <span style="word-break:break-all;color:#3d4148;">{{contact.partner_setup_url}}</span></p>
      <p style="margin:8px 0 0;">A presto,<br>Claudio Bertogliatti e il team Evolution PRO</p>
    </div>
  </div>
  <div style="text-align:center;font-size:11px;color:#9ca3af;padding:0 28px 32px;max-width:560px;margin:0 auto;">
    Hai ricevuto questa email perché hai completato l'acquisto della Partnership Ciak su www.ciak.io.
  </div>
</body>
</html>
```

---

## Test rapido

1. Vai su un contatto Systeme di test (es. claudio.bertogliatti+partnersetup1@gmail.com)
2. Apply tag manualmente: `partner_setup_pending`
3. ⚠️ Il custom field `partner_setup_url` sarà vuoto (lo popola il backend al pagamento reale). Per test setta a mano un valore tipo `https://www.ciak.io/partner/setup-password?token=TEST_TOKEN_FAKE` editando il custom field del contatto.
4. Verifica che l'email arrivi entro 1-2 min con il link cliccabile
5. (Se il custom field manca o non è popolato, vedi nel body letteralmente
   `{{contact.partner_setup_url}}` → ricontrolla setup field §1)

Per test e2e completo del flusso pagamento → setup password: serve un pagamento Stripe reale (o test mode) della Partnership €2.790.

---

## Fallback se workflow non funziona

L'admin Ciak ha un widget dedicato per recuperare i magic link manualmente:

**URL**: `https://www.ciak.io/admin/partner-setup-pending`

Mostra:
- Lista partner in attesa di setup
- Magic link copiabile per ognuno (bottone "Copia link")
- Stato: in attesa / scaduto / completato

Se un partner non riceve l'email Systeme (workflow disattivato, deliverability,
contatto non sincronizzato), Claudio/Antonella:
1. Vanno su `/admin/partner-setup-pending`
2. Copiano il link del partner
3. Lo mandano via WhatsApp/email manuale al partner
4. Partner completa il setup → status passa a "completato"

---

## Cosa NON fare

- ❌ Non rimuovere il workflow vecchio "Benvenuto Partnership" (se esiste) finché
  non hai confermato che questo nuovo flow funziona per i prossimi partner
- ❌ Non mandare email Systeme su tag `acquisto_partnership` o `contratto_firmato`:
  quelle sono ancora gestite dal backend (transactional con PDF). Doppio invio = pessima UX.
- ❌ Non rinominare lo slug del custom field (`partner_setup_url`): il backend
  fa PATCH su quello slug specifico. Cambiarlo = link non passa.

---

## Recovery: token scaduto

Se un partner non clicca il link entro 7 giorni:
- Lo vedi in `/admin/partner-setup-pending` come "Scaduto"
- Soluzione corrente: rigenera manualmente via DB MongoDB (collection `users`,
  campo `partner_setup_token` = nuovo uuid + `partner_setup_expires_at` = now + 7gg)
  + applica di nuovo tag `partner_setup_pending` su Systeme
- Futuro (TODO): endpoint admin `POST /api/admin/ciak/regenerate-partner-setup-link/{partner_id}`
