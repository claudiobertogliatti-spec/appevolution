# Runbook — Ri-autenticazione YouTube (pipeline video)

## Sintomo
Le lezioni del videocorso / la masterclass restano in **`error_youtube`** (o `error`).
Nei log di Cloud Run (`evolution-pro-backend`):
```
google.auth.exceptions.RefreshError: ('invalid_grant: Bad Request', ...)
  File "video_pipeline_task.py", in upload_to_youtube_sync -> creds.refresh(Request())
```

## Causa
Il **refresh token OAuth di YouTube** non e' piu' valido: scaduto o revocato.
Causa ricorrente: la **schermata di consenso OAuth in modalita' "Testing"** fa
scadere i refresh token dopo **7 giorni**.

## Dove vive il token
- Secret Manager: **`youtube-user-credentials`** (key `latest`).
- Montato in Cloud Run su `/secrets/youtube_credentials.pickle`, copiato all'avvio
  in `/app/storage/youtube_credentials.pickle` da `backend/server.py` ([YT-BOOTSTRAP]).
- Il backend carica le credenziali con `services/secure_credentials.py` (JSON con
  chiavi: token, refresh_token, token_uri, client_id, client_secret, scopes).

## Fix permanente (recurrence)
Pubblicare la **schermata di consenso OAuth in "Production"** (GCP Console →
Google Auth Platform → Pubblico → Pubblica app). In Production i refresh token
NON scadono piu' a 7 giorni. (Gli scope YouTube sono "sensibili": si puo'
pubblicare comunque come Production *non verificata* — basta a togliere la scadenza.)

> IMPORTANTE: un token emesso quando l'app era in "Testing" eredita la scadenza a
> 7 giorni anche dopo aver pubblicato. Quindi DOPO aver pubblicato in Production,
> **rigenerare una volta** il token (vedi sotto) cosi' nasce permanente.

## Procedura di ri-autenticazione (loopback, NON OOB — l'OOB e' deprecato)
Da una macchina locale (apre il browser per il consenso):
```bash
# 1) Client OAuth: usa un client del progetto gen-lang-client-0744698012.
#    Consigliato: crea un client tipo "App desktop" e scarica il JSON come client_secret.json.
#    (Per un client "web" aggiungi http://localhost:8765/ tra le redirect URI.)
pip install google-auth-oauthlib google-auth
python scripts/youtube_reauth.py client_secret.json
#    -> accedi col canale Evolution PRO, "Consenti" -> crea youtube_credentials.json
#       (deve stampare: refresh_token presente: True)

# 2) Aggiorna il secret + ridistribuisci
gcloud secrets versions add youtube-user-credentials \
  --data-file=youtube_credentials.json --project gen-lang-client-0744698012
gcloud run deploy evolution-pro-backend --source ./backend --region europe-west1
```

## Verifica
- `GET /api/youtube/status` -> `authenticated: true`.
- Retrigger di una lezione: `POST /api/admin/partner/{id}/retrigger-video?video_type=lesson&lesson_id=...`
  -> deve arrivare a `ready_for_review` (non piu' `error_youtube`).

## Backlog / quota
La YouTube Data API ha una **quota giornaliera** (`video.insert` ~1600 unita';
default ~10.000/giorno => ~6 upload/giorno). Retriggerare il backlog **a lotti
(~6/giorno)**, oppure richiedere a Google un **aumento di quota**.

## Stato (2026-06-09)
- Token rigenerato, secret `youtube-user-credentials` v5, deploy `00334`,
  `authenticated=true`, lezione `m3_l1` caricata su YouTube. ✅
- Consent screen pubblicata in **Production**. ✅
- TODO: **rigenerare il token una volta sotto Production** (il token v5 era
  emesso in Testing -> scade a 7 giorni). Poi proseguire il retrigger del backlog.
