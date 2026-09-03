#!/usr/bin/env python3
"""
Sostituisce la chiave API di Systeme sul servizio, ma solo se funziona davvero.

Perche' esiste (3/9/2026): la chiave sul backend era scaduta -- verosimilmente
nella rotazione dopo l'incidente credenziali del 5/8 -- e da allora ogni opt-in
alla masterclass finiva in Ciak **senza mai arrivare nella lista email**. Un mese
di iscritti che non hanno ricevuto niente, invisibile perche' la chiamata a
Systeme e' fire-and-forget: fallisce e non ferma nulla.

⛔ Ma il motivo per cui questo script esiste al posto di un comando e' un altro:
i tre tentativi fatti a mano in PowerShell sono andati storti tutti e tre, e
ogni volta in un modo diverso.

1. `Get-Content` su un file inesistente non ferma la riga: la sottoespressione
   diventa vuota e `gcloud` **esegue lo stesso**, scrivendo una variabile rotta
   in produzione.
2. Le virgolette doppie interpolano: una chiave che contiene `$` viene alterata
   in silenzio e arriva a destinazione lunga uguale e sbagliata.
3. Incollando negli appunti, la chiave e' finita al posto del NOME della
   variabile -- e cosi' e' comparsa in chiaro a schermo, bruciandola.

Nessuno di questi e' colpa di chi digita: e' un comando fragile per
un'operazione che deve essere noiosa.

Qui la chiave si legge da un file, **si prova contro Systeme**, e solo se il
server la accetta si tocca Cloud Run. Una chiave morta non arriva mai in
produzione, e il valore non viene mai stampato.

Uso:
    python scripts/aggiorna_chiave_systeme.py
    python scripts/aggiorna_chiave_systeme.py --file "C:\\percorso\\chiave.txt"
    python scripts/aggiorna_chiave_systeme.py --solo-prova   # non scrive niente

Solo stdlib (+ gcloud gia' installato e autenticato).
"""

import argparse
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

SERVIZIO = "evolution-pro-backend"
REGIONE = "europe-west1"
PROGETTO = "gen-lang-client-0744698012"
FILE_DEFAULT = Path.home() / "OneDrive" / "Desktop" / "systeme-key.txt"
# ⚠️ limit=10 e non 1: il minimo consentito da Systeme e
# 10, e con 1 risponde 422 anche a una chiave perfettamente valida.
PROVA_URL = "https://api.systeme.io/api/contacts?limit=10"
MIN_LUNGHEZZA = 30


def _ripulisci(grezzo: str) -> str:
    """Toglie virgolette, spazi e a-capo che un incolla si porta dietro."""
    t = grezzo.strip().strip('"').strip("'").strip()
    return "".join(t.split())


def _funziona(chiave: str):
    """(ok, dettaglio) — la chiave e' accettata da Systeme?"""
    req = urllib.request.Request(PROVA_URL, headers={"X-API-Key": chiave})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return True, f"HTTP {r.status}"
    except urllib.error.HTTPError as e:
        # ⛔ SOLO 401/403 significano "chiave rifiutata". Qualunque altro codice
        # arriva DOPO l'autenticazione, quindi la chiave e' buona e il problema
        # e' la richiesta.
        #
        # Il 3/9/2026 questo script ha bloccato una chiave valida su un 422,
        # causato da `limit=1` sotto il minimo di Systeme. E' lo stesso errore
        # che avevo appena denunciato altrove: confondere "credenziale
        # rifiutata" con "richiesta malformata".
        if e.code in (401, 403):
            return False, f"HTTP {e.code}: Systeme non la riconosce"
        return True, f"HTTP {e.code} — autenticazione passata (il resto e' la mia richiesta)"
    except Exception as e:
        return False, f"rete: {e}"


def main():
    ap = argparse.ArgumentParser(description="Aggiorna la chiave Systeme sul servizio")
    ap.add_argument("--file", default=str(FILE_DEFAULT), help="file con la sola chiave")
    ap.add_argument(
        "--solo-prova", action="store_true",
        help="prova la chiave e basta, senza toccare Cloud Run",
    )
    args = ap.parse_args()

    percorso = Path(args.file).expanduser()
    if not percorso.is_file():
        raise SystemExit(
            f"ERRORE: non trovo {percorso}\n"
            "   Crea il file, incollaci dentro la sola chiave e salva."
        )

    chiave = _ripulisci(percorso.read_text(encoding="utf-8"))
    if len(chiave) < MIN_LUNGHEZZA:
        raise SystemExit(
            f"ERRORE: il file contiene {len(chiave)} caratteri, troppo pochi.\n"
            "   Probabilmente e' vuoto o non e' stato salvato."
        )

    # ⛔ Il valore non si stampa mai: e' gia' successo di bruciarne una cosi'.
    print(f"Chiave letta da {percorso.name}: {len(chiave)} caratteri.")
    print("La provo su Systeme prima di installarla...")

    ok, dettaglio = _funziona(chiave)
    if not ok:
        raise SystemExit(
            f"ERRORE: questa chiave NON funziona ({dettaglio}).\n"
            "   Non tocco la produzione. Genera una chiave nuova su Systeme\n"
            "   (Impostazioni -> API), rimettila nel file e rilancia."
        )
    print(f"OK, Systeme la accetta ({dettaglio}).")

    if args.solo_prova:
        print("--solo-prova: non ho scritto niente.")
        return 0

    print(f"Aggiorno {SERVIZIO}...")

    # Su Windows `gcloud` e' `gcloud.CMD`, un batch: con shell=False Python
    # cerca un .exe e fallisce con "file non trovato" DOPO aver gia' validato
    # la chiave. `which` restituisce il percorso completo, che si esegue.
    # ⛔ Non si passa a shell=True per aggirarlo: la chiave tornerebbe a
    # transitare da una shell che la interpreta, ed e' il difetto che questo
    # script esiste per evitare.
    eseguibile = shutil.which("gcloud")
    if not eseguibile:
        raise SystemExit(
            "ERRORE: non trovo gcloud nel PATH.\n"
            "   La chiave e' valida: manca solo lo strumento per installarla."
        )

    esito = subprocess.run(
        [
            eseguibile, "run", "services", "update", SERVIZIO,
            "--region", REGIONE, "--project", PROGETTO,
            # La chiave passa come argomento di lista: nessuna shell la
            # interpreta, quindi un `$` dentro non viene mangiato.
            "--update-env-vars", f"SYSTEME_API_KEY={chiave}",
        ],
        capture_output=True, text=True, shell=False,
    )
    if esito.returncode != 0:
        # ⛔ Lo stderr puo' contenere l'argomento e quindi la chiave.
        errore = esito.stderr.replace(chiave, "<chiave>")[-500:]
        raise SystemExit(f"ERRORE: gcloud ha fallito:\n{errore}")

    print("Fatto: il servizio riparte con la chiave nuova.")
    print("\nAdesso:")
    print("  1. cancella il file della chiave")
    print("  2. gli iscritti dal 9 agosto NON sono mai arrivati in Systeme:")
    print("     vanno recuperati a mano, la chiave nuova non li recupera.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
