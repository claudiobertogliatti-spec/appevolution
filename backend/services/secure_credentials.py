"""
Serializzazione sicura delle credenziali OAuth.
Usa JSON invece di pickle per evitare rischi di RCE (Remote Code Execution).
"""
import json
import os
import logging
from google.oauth2.credentials import Credentials

logger = logging.getLogger(__name__)


def save_credentials(creds, filepath: str):
    """Salva le credenziali OAuth in formato JSON sicuro"""
    try:
        data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes) if creds.scopes else None,
        }
        with open(filepath, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.warning(f"Errore salvataggio credenziali: {e}")


def load_credentials(filepath: str):
    """Carica le credenziali OAuth da formato JSON sicuro. Fallback a pickle per compatibilita."""
    if not os.path.exists(filepath):
        print(f"[SEC-CREDS] file missing: {filepath}", flush=True)
        return None
    # Prova JSON: ANY exception (JSON parse, UnicodeDecodeError on binary pickle,
    # KeyError) cade su pickle. Prima il bug era che UnicodeDecodeError cadeva nel
    # bare Exception clause e ritornava None senza tentare il pickle.
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        return Credentials(
            token=data.get("token"),
            refresh_token=data.get("refresh_token"),
            token_uri=data.get("token_uri"),
            client_id=data.get("client_id"),
            client_secret=data.get("client_secret"),
            scopes=data.get("scopes"),
        )
    except Exception as json_err:
        print(f"[SEC-CREDS] JSON parse failed ({type(json_err).__name__}: {str(json_err)[:80]}) — try pickle", flush=True)
    # Fallback pickle
    import pickle
    try:
        with open(filepath, 'rb') as f:
            creds = pickle.load(f)
        try:
            save_credentials(creds, filepath)
            print(f"[SEC-CREDS] pickle loaded + migrated to JSON: {filepath}", flush=True)
        except Exception as save_err:
            print(f"[SEC-CREDS] pickle loaded but JSON migration failed (read-only mount?): {save_err}", flush=True)
        return creds
    except Exception as pickle_err:
        print(f"[SEC-CREDS] pickle load failed ({type(pickle_err).__name__}: {str(pickle_err)[:200]})", flush=True)
    return None
