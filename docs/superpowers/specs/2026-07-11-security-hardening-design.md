# Ciak Security Hardening Design

## Obiettivo

Chiudere i rischi residui di configurazione, supply chain e autorizzazione prima di eseguire l'audit delle dipendenze e i test dinamici su `https://www.ciak.io`.

## Sequenza vincolante

1. Rendere JWT, Stripe e CORS fail-closed.
2. Aggiungere Gitleaks e i test di sicurezza alla CI.
3. Applicare header di sicurezza compatibili con l'app corrente.
4. Revisionare route pubbliche e autorizzazioni partner contro IDOR.
5. Solo dopo i primi quattro blocchi, eseguire audit dipendenze e test dinamici non distruttivi.

Ogni blocco produce un commit separato, test verdi e una verifica dedicata prima del push su `main`.

## Configurazione centralizzata

Un modulo backend dedicato espone la configurazione di sicurezza condivisa. `APP_ENV` accetta esclusivamente `production`, `development` e `test`; se assente, vale `production`.

In `production`:

- `JWT_SECRET_KEY` deve essere presente, non deve coincidere con il fallback storico e deve superare una soglia minima di robustezza;
- `STRIPE_WEBHOOK_SECRET` deve essere presente e iniziare con `whsec_`;
- `CORS_ORIGINS=*` è vietato;
- le origini aggiunte via ambiente devono usare HTTPS e non possono essere localhost.

In `development` e `test`:

- sono ammessi secret fittizi solo perché l'ambiente non-production è stato dichiarato esplicitamente;
- localhost è consentito nel CORS;
- il webhook Stripe senza secret non elabora mai payload non firmati e restituisce un errore controllato.

La validazione dei valori che renderebbero insicura l'intera applicazione avviene all'avvio. Il webhook Stripe mantiene anche un controllo locale fail-closed, così un'importazione isolata o una futura modifica del bootstrap non può riaprire il fallback JSON.

## JWT e Stripe

`backend/auth.py` riceve il secret JWT validato dal modulo centrale e non contiene più un valore predefinito utilizzabile. I test impostano `APP_ENV=test` e un secret esplicito.

`backend/routers/stripe_webhook.py` verifica sempre la firma mediante `stripe.Webhook.construct_event`. Secret assente o placeholder produce `503`; firma assente o non valida produce `400`. Nessun evento viene deserializzato ed eseguito senza verifica crittografica.

## CORS e header HTTP

Il backend costruisce la allowlist partendo dai domini Ciak/Evolution consentiti. Le origini localhost sono incluse solo fuori produzione. Le origini dinamiche vengono normalizzate, validate e deduplicate.

Gli header vengono impostati sulle due superfici che possono servire il frontend:

- `frontend/vercel.json`, produzione principale;
- `frontend/nginx.conf`, immagine Cloud Run storica/alternativa.

Header minimi:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` con camera, microfono e geolocalizzazione disabilitati;
- `Content-Security-Policy` inizialmente compatibile con React, Stripe, API Ciak, Google/YouTube e gli asset già usati;
- `frame-ancestors 'self'` nella CSP al posto del solo `X-Frame-Options`.

La CSP viene verificata contro build e flussi live prima di irrigidire ulteriormente `script-src` e `style-src`.

## CI e secret scanning

La CI aggiunge:

- Gitleaks bloccante sull'intera cronologia disponibile al checkout, con action fissata a commit SHA;
- configurazione `.gitleaks.toml` con allowlist solo per fixture esplicitamente finte;
- tutti i test classificati come security/auth/route guard;
- test dedicati per configurazione fail-closed, CORS e header;
- conservazione degli attuali controlli sintattici, lint e build frontend.

Un secret reale rilevato blocca PR e push su `main`.

## Revisione route e IDOR

La revisione produce un inventario delle route FastAPI classificate come:

- pubbliche intenzionali;
- utente autenticato;
- risorsa del partner corrente;
- amministrative;
- webhook firmati.

Per ogni route con `partner_id`, `user_id`, `cliente_id`, filename o identificatore equivalente viene tracciato il controllo di ownership fino alla query o mutazione. I test devono dimostrare che il partner A non può leggere o modificare risorse del partner B. Le route pubbliche vengono mantenute tali solo quando il flusso di prodotto lo richiede e non espongono dati riservati.

Si correggono soltanto vulnerabilità con percorso di sfruttamento concreto. I dubbi non confermati vengono documentati separatamente, senza introdurre regressioni nei funnel pubblici.

## Audit dipendenze e test dinamici

Questa fase parte solo dopo che i blocchi precedenti sono verdi e deployati.

- `pip-audit` sul backend;
- `npm audit` sul lockfile frontend;
- classificazione per raggiungibilità e impatto, senza aggiornamenti indiscriminati;
- verifica live di header, CORS, autenticazione e route pubbliche;
- webhook Stripe falsificato con payload innocuo, che deve essere respinto prima di ogni side effect;
- test IDOR non distruttivi con account e risorse autorizzate, oppure sola verifica negativa quando non sono disponibili due identità di test.

Nessun test dinamico crea pagamenti, elimina documenti reali o modifica dati di partner in produzione.

## Criteri di completamento

- Nessun fallback JWT utilizzabile in produzione.
- Nessun webhook Stripe non firmato elaborato in alcun ambiente.
- Nessun wildcard CORS in produzione.
- Header presenti su `www.ciak.io` e compatibili con i flussi principali.
- Gitleaks e suite security bloccanti in CI.
- Nessun IDOR partner confermato lasciato aperto.
- Audit dipendenze classificato e test dinamici completati senza side effect.
- `main` locale, GitHub e revisione Cloud Run risultano allineati.
