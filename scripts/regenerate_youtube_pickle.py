"""
Rigenera il pickle OAuth YouTube. Uso una-tantum quando il refresh_token nel
Secret Manager è invalidato (rotation client_secret, app in Testing scaduta a
7gg, revoca utente).

USO:
  1. Scarica client_secret.json dal Secret Manager Google Cloud:
       gcloud secrets versions access latest --secret=youtube-client-secret \
         --project=gen-lang-client-0744698012 > client_secret.json
  2. python scripts/regenerate_youtube_pickle.py
  3. Si apre il browser, autorizza con il tuo Google account
  4. Pickle scritto in storage/youtube_credentials.pickle
  5. Comunica al CI/script di upload nel Secret Manager
"""
import os
import pickle
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.readonly",
]

ROOT = Path(__file__).resolve().parent.parent
CLIENT_SECRET = ROOT / "client_secret.json"
PICKLE_OUT = ROOT / "storage" / "youtube_credentials.pickle"

if not CLIENT_SECRET.exists():
    sys.exit(
        f"ERRORE: {CLIENT_SECRET} non trovato. Scaricalo prima:\n"
        f"  gcloud secrets versions access latest --secret=youtube-client-secret "
        f"--project=gen-lang-client-0744698012 > client_secret.json"
    )

PICKLE_OUT.parent.mkdir(parents=True, exist_ok=True)

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
# Web-type OAuth client: NON usa porte random (port=0 dà redirect_uri_mismatch).
# Serve una porta fissa che corrisponda esattamente a una "Authorized redirect URI"
# configurata sul Cloud Console. Default 8080. Se Google rifiuta, vai sulla
# Console e aggiungi http://localhost:8080/ (slash finale incluso).
print(f"[OAUTH] === IMPORTANTE ===")
print(f"[OAUTH] Se il browser NON si apre da solo, copia l'URL qui sotto e incollalo nel browser.")
print(f"[OAUTH] Redirect URI atteso: http://localhost:8080/  (deve essere in 'Authorized redirect URIs' su Cloud Console)")
print(f"[OAUTH] ==================\n")
creds = flow.run_local_server(
    port=8080,
    prompt="consent",
    access_type="offline",
    open_browser=False,
    authorization_prompt_message="\n>>> APRI QUESTO URL NEL BROWSER:\n{url}\n",
    success_message="OK autorizzato — torna al terminale.",
)

with open(PICKLE_OUT, "wb") as f:
    pickle.dump(creds, f)

print(f"[OAUTH] OK pickle scritto in {PICKLE_OUT}")
print(f"[OAUTH] Has refresh_token: {bool(creds.refresh_token)}")
print(f"[OAUTH] Scopes: {list(creds.scopes) if creds.scopes else '?'}")
print(f"[OAUTH] Carica nel Secret Manager con:")
print(f"  gcloud secrets versions add youtube-user-credentials \\")
print(f"    --data-file={PICKLE_OUT} --project=gen-lang-client-0744698012")
