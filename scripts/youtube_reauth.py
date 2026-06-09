#!/usr/bin/env python3
"""
Rigenera il token OAuth di YouTube per la pipeline Ciak/Evolution PRO.

Flusso loopback moderno (run_local_server, porta FISSA) — NON l'OOB deprecato.
Funziona col client OAuth "Applicazione web" o "Desktop" (basta un client OAuth
dello stesso progetto: il file prodotto e' autosufficiente, contiene client_id +
client_secret + refresh_token, e il backend ci fa il refresh da quelli).

Produce 'youtube_credentials.json' nel formato atteso dal backend
(services/secure_credentials.py): token, refresh_token, token_uri, client_id,
client_secret, scopes.

USO:
  1) (consigliato) crea/usa un client OAuth tipo "App desktop" in GCP Console →
     scarica il JSON come client_secret.json accanto a questo file. In alternativa,
     per un client "web" aggiungi http://localhost:8765/ tra le redirect URI.
  2) pip install google-auth-oauthlib google-auth
  3) python youtube_reauth.py client_secret.json
     Si apre il browser: accedi col canale Evolution PRO e concedi l'accesso.
  4) youtube_credentials.json -> caricalo come nuova versione del secret
     'youtube-user-credentials' e ridistribuisci (vedi docs/runbooks/youtube-reauth.md).
"""
import json
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/drive.file",
]
PORT = 8765  # per client "web" registrare http://localhost:8765/ ; per "desktop" qualsiasi porta va bene

client_secret = sys.argv[1] if len(sys.argv) > 1 else "client_secret.json"
out = "youtube_credentials.json"

raw = json.load(open(client_secret, encoding="utf-8"))
if "web" in raw and "installed" not in raw:
    raw = {"installed": raw["web"]}

print(f"[reauth] client_secret = {client_secret}  (porta loopback {PORT})")
print("[reauth] Si aprira' il browser: accedi col canale Evolution PRO e concedi l'accesso...")

flow = InstalledAppFlow.from_client_config(raw, SCOPES)
creds = flow.run_local_server(port=PORT, access_type="offline", prompt="consent")

if not creds.refresh_token:
    print("\n[reauth] ATTENZIONE: nessun refresh_token. Revoca l'accesso da "
          "https://myaccount.google.com/permissions e riprova (serve prompt=consent).")

data = {
    "token": creds.token,
    "refresh_token": creds.refresh_token,
    "token_uri": creds.token_uri,
    "client_id": creds.client_id,
    "client_secret": creds.client_secret,
    "scopes": list(creds.scopes) if creds.scopes else SCOPES,
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f)

print(f"\n[reauth] OK -> {out}")
print(f"[reauth] refresh_token presente: {bool(creds.refresh_token)}")
print(f"[reauth] client_id: {creds.client_id}")
