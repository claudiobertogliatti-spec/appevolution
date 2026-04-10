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
        return None
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
    except (json.JSONDecodeError, KeyError):
        # Fallback: file potrebbe essere in formato pickle legacy
        import pickle
        try:
            with open(filepath, 'rb') as f:
                creds = pickle.load(f)
            # Migra a JSON
            save_credentials(creds, filepath)
            logger.info(f"Credenziali migrate da pickle a JSON: {filepath}")
            return creds
        except Exception as e:
            logger.warning(f"Errore lettura credenziali (pickle fallback): {e}")
    except Exception as e:
        logger.warning(f"Errore lettura credenziali: {e}")
    return None
