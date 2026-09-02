#!/usr/bin/env python3
"""
Carica crediti e obiettivo di cassa dentro Ciak, da un file locale.

Perche' esiste (2/9/2026): gli accordi di rientro e il piano dei 10k vivevano
in lettere Word sul desktop e nella memoria di Claudio. Il sistema per leggerli
c'era gia' -- le collection `crediti` e `obiettivi`, il briefing di Luca, la sua
chat -- ma dentro non c'era niente, quindi Luca ogni mattina leggeva zero.

⛔ I DATI NON STANNO IN QUESTO REPOSITORY, CHE E' PUBBLICO.
Nomi di persone, importi dovuti e motivi di una sospensione dal sollecito sono
dati personali, e alcuni riguardano la salute. Questo file contiene solo la
meccanica; i valori stanno in un JSON sul disco di Claudio, che lo script
rifiuta di leggere se si trova dentro la cartella del repo (§ `_fuori_dal_repo`).

Uso:
    python scripts/carica_amministrazione.py "C:\\percorso\\dati.json"
    python scripts/carica_amministrazione.py dati.json --dry-run
    python scripts/carica_amministrazione.py dati.json --base-url http://localhost:8080

Autenticazione, in ordine: la variabile d'ambiente CIAK_ADMIN_TOKEN, altrimenti
email e password chieste a video (la password non compare mentre si digita).

Rieseguirlo non duplica nulla: gli endpoint fanno upsert sull'id, quindi
correggere un importo significa modificare il JSON e rilanciare.

Solo stdlib.
"""

import argparse
import getpass
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE_URL = "https://www.ciak.io"
TIMEOUT = 30


def _fuori_dal_repo(percorso: Path) -> bool:
    """
    Il file dei dati non deve stare nel repository.

    Non e' una precauzione teorica: il 5/8/2026 delle credenziali di produzione
    sono finite nella cronologia pubblica di questo stesso repo. Un JSON con la
    situazione debitoria dei partner avrebbe la stessa strada -- un `git add .`
    distratto -- e la stessa impossibilita' di tornare indietro.
    """
    repo = Path(__file__).resolve().parents[1]
    try:
        percorso.resolve().relative_to(repo)
        return False
    except ValueError:
        return True


def _chiama(base_url, token, metodo, path, corpo=None):
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        method=metodo,
        data=json.dumps(corpo).encode("utf-8") if corpo is not None else None,
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        dettaglio = e.read().decode("utf-8", "replace")[:300]
        raise SystemExit(f"⛔ {metodo} {path} -> HTTP {e.code}: {dettaglio}")
    except urllib.error.URLError as e:
        raise SystemExit(f"⛔ {metodo} {path} -> irraggiungibile: {e.reason}")


def _token_buono(base_url, token):
    """
    Il token e' valido E ha il ruolo admin?

    Va chiesto al server prima di scrivere. Il JWT di Ciak dura 24 ore, quindi
    una variabile d'ambiente impostata ieri e' quasi sempre scaduta -- e
    `decode_token` che fallisce produce un **403** ("Accesso riservato agli
    admin"), non un 401: dal codice di errore non si distingue un token scaduto
    da un utente senza permessi. Ci si prova su un endpoint in sola lettura, che
    non cambia niente se va male.
    """
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/admin/ciak/crediti",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT):
            return True
    except Exception:
        return False


def _token(base_url):
    token = os.environ.get("CIAK_ADMIN_TOKEN")
    if token:
        if _token_buono(base_url, token):
            print("Uso il token da CIAK_ADMIN_TOKEN.")
            return token
        # ⛔ Non si muore qui: un token scaduto e' la normalita' dopo 24 ore, e
        # far ripartire tutto da capo per questo sarebbe solo fastidio.
        print("Il token in CIAK_ADMIN_TOKEN non e' valido o e' scaduto: faccio il login.")
    else:
        print("Nessun CIAK_ADMIN_TOKEN: faccio il login.")

    email = input("Email admin: ").strip()
    # getpass e non input(): la password non deve restare nella cronologia del
    # terminale ne' comparire in uno screenshot condiviso.
    password = getpass.getpass("Password: ")
    risposta = _chiama(
        base_url, None, "POST", "/api/auth/login", {"email": email, "password": password}
    )
    token = risposta.get("access_token")
    if not token:
        raise SystemExit(f"⛔ login senza access_token: {risposta}")
    return token


def main():
    ap = argparse.ArgumentParser(description="Carica crediti e obiettivo dentro Ciak")
    ap.add_argument("dati", help="percorso del JSON con crediti e obiettivo")
    ap.add_argument("--base-url", default=os.environ.get("CIAK_BASE_URL", DEFAULT_BASE_URL))
    ap.add_argument(
        "--dry-run", action="store_true",
        help="mostra cosa verrebbe scritto senza scrivere niente",
    )
    args = ap.parse_args()

    percorso = Path(args.dati).expanduser()
    if not percorso.is_file():
        raise SystemExit(f"⛔ file non trovato: {percorso}")
    if not _fuori_dal_repo(percorso):
        raise SystemExit(
            "⛔ Il file dei dati sta dentro il repository, che e' PUBBLICO.\n"
            "   Spostalo fuori (es. sul Desktop) e rilancia."
        )

    dati = json.loads(percorso.read_text(encoding="utf-8"))
    crediti = dati.get("crediti") or []
    obiettivo = dati.get("obiettivo")

    print(f"\nDa caricare: {len(crediti)} crediti" + (" + 1 obiettivo" if obiettivo else ""))
    for c in crediti:
        rate = c.get("rate") or []
        residuo = sum(
            float(r.get("importo") or 0) for r in rate if r.get("stato") != "incassata"
        )
        print(
            f"  - {c['id']:<22} {c.get('nome', '?'):<24} "
            f"{len(rate)} rate, residuo EUR {residuo:.0f}"
            + ("  [NON SOLLECITARE]" if c.get("non_sollecitare") else "")
        )
    if obiettivo:
        leve = obiettivo.get("leve") or []
        print(
            f"  - obiettivo {obiettivo['id']}: target EUR {obiettivo.get('target', 0):.0f} "
            f"- {len(leve)} leve"
        )

    if args.dry_run:
        print("\n--dry-run: non ho scritto niente.")
        return 0

    token = _token(args.base_url)

    print("\nScrivo...")
    for c in crediti:
        _chiama(args.base_url, token, "PUT", f"/api/admin/ciak/crediti/{c['id']}", c)
        print(f"  ok  {c['id']}")
    if obiettivo:
        _chiama(
            args.base_url, token, "PUT",
            f"/api/admin/ciak/obiettivo/{obiettivo['id']}", obiettivo,
        )
        print(f"  ok  obiettivo {obiettivo['id']}")

    # Rilettura: la conferma che conta non e' "ho inviato", e' "il server lo
    # dice". Sono gli stessi endpoint che legge Luca, quindi cio' che appare qui
    # e' esattamente cio' che vedra' domattina.
    print("\n== Come lo vede Luca ==")
    r = _chiama(args.base_url, token, "GET", "/api/admin/ciak/crediti/riepilogo")
    print(
        f"Mese {r.get('mese')}: previsto EUR {r.get('previsto_nel_mese', 0):.0f} - "
        f"gia' entrato EUR {r.get('gia_incassato_nel_mese', 0):.0f} - "
        f"residuo totale EUR {r.get('residuo_totale', 0):.0f}"
    )
    for rata in r.get("scade_oggi") or []:
        print(f"  >> SCADE OGGI: {rata.get('nome')} EUR {float(rata.get('importo', 0)):.0f}")
    for rata in r.get("in_ritardo") or []:
        print(
            f"  !  in ritardo: {rata.get('nome')} "
            f"EUR {float(rata.get('importo', 0)):.0f} (scadeva {rata.get('scadenza')})"
        )
    for voce in r.get("sospese_dal_sollecito") or []:
        print(f"  -  dovuto ma da NON sollecitare: {voce.get('nome')}")

    if obiettivo:
        s = _chiama(
            args.base_url, token, "GET",
            f"/api/admin/ciak/obiettivo/{obiettivo['id']}",
        )
        print(
            f"\n{s.get('titolo')}: manca EUR {s.get('gap', 0):.0f} in "
            f"{s.get('giorni_rimasti')} giorni "
            f"(EUR {s.get('ritmo_necessario') or 0:.0f} al giorno)"
        )
        if s.get("leve_coprono_il_gap"):
            print(f"Le leve valgono EUR {s.get('valore_leve_vive', 0):.0f}: coprono il gap.")
        else:
            print(
                f"Le leve valgono EUR {s.get('valore_leve_vive', 0):.0f}: "
                f"SCOPERTI EUR {s.get('scoperto', 0):.0f}."
            )
        for f in s.get("leve_ferme") or []:
            print(f"  !  ferma da {f.get('giorni_fermi')} giorni: {f.get('nome')}")

    print("\nFatto. Il briefing di domattina parte da questi numeri.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
