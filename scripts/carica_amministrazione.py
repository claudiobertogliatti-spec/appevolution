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
    python scripts/carica_amministrazione.py dati.json --verifica
    python scripts/carica_amministrazione.py dati.json --token-file token.txt

Autenticazione, in ordine: `--token-file`, poi la variabile d'ambiente
CIAK_ADMIN_TOKEN, e in ultimo email e password chieste a video.

⚠️ Il token si prende da `localStorage.ciak_admin_token` su ciak.io/admin, e la
strada che funziona sempre e' incollarlo in un file di testo: la console di
Chrome al primo uso pretende che si digiti "allow pasting", e `getpass` in
PowerShell non mostra nulla mentre si scrive -- il 3/9/2026 entrambe hanno
bloccato il caricamento, e in nessuno dei due casi era un guasto.

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
        raise SystemExit(f"ERRORE: {metodo} {path} -> HTTP {e.code}: {dettaglio}")
    except urllib.error.URLError as e:
        raise SystemExit(f"ERRORE: {metodo} {path} -> irraggiungibile: {e.reason}")


def _ripulisci(token: str) -> str:
    """
    Toglie da un token incollato a mano tutto cio' che non e' il token.

    Il 3/9/2026: **DevTools "Copy value" copia il valore con le virgolette
    incluse**, quindi nel file finisce `"eyJ..."` e l'header parte malformato.
    Stessa storia per un `Bearer ` copiato per abitudine, o per gli a-capo che
    il Blocco Note aggiunge in fondo. Sono tutti errori invisibili: il file
    "sembra giusto" a guardarlo.
    """
    t = token.strip().strip('"').strip("'").strip()
    if t.lower().startswith("bearer "):
        t = t[7:].strip()
    return "".join(t.split())  # spazi e a-capo interni: un JWT non ne ha


def _prova_token(base_url, token):
    """
    Restituisce (ok, motivo) — il motivo serve quanto l'esito.

    Il JWT di Ciak dura 24 ore, quindi un token del giorno prima e' quasi sempre
    scaduto. E i codici ingannano: `decode_token` che fallisce produce un **403**
    ("Accesso riservato agli admin"), lo stesso di un utente senza permessi,
    mentre un header malformato o assente da' **401**. Dire solo "non e' valido"
    manda a cercare nel posto sbagliato.
    """
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/admin/ciak/crediti",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT):
            return True, "ok"
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return False, "l'header di autorizzazione non arriva al server (401)"
        # ⚠️ Verificato il 3/9 mandando un token inventato: risponde 403, non 401.
        # `decode_token` restituisce None sia per un token scaduto sia per uno
        # malformato o troncato, e require_ciak_admin le tratta uguali -- percio'
        # qui si elencano tutte e tre le cause invece di indicarne una sola.
        if e.code == 403:
            return False, (
                "scaduto, troncato, o non e' il token di un admin (403). "
                "I JWT durano 24 ore"
            )
        return False, f"il server risponde HTTP {e.code}"
    except urllib.error.URLError as e:
        return False, f"server irraggiungibile: {e.reason}"


def _token_buono(base_url, token):
    return _prova_token(base_url, token)[0]


def _login(base_url):
    email = input("Email admin: ").strip()
    # getpass e non input(): la password non deve restare nella cronologia del
    # terminale ne' comparire in uno screenshot condiviso.
    #
    # ⚠️ Nasconde TUTTO, nemmeno gli asterischi: sullo schermo non si muove
    # niente mentre si digita, e sembra che il terminale sia bloccato. Il 3/9
    # e' successo esattamente questo, quindi il prompt lo dice.
    print("   (mentre digiti non compare nulla, nemmeno i puntini: e' normale.")
    print("    In PowerShell si incolla col TASTO DESTRO, non con Ctrl+V.")
    print("    In alternativa: --token-file con dentro il token, e rilancia.)")
    password = getpass.getpass("Password: ")
    risposta = _chiama(
        base_url, None, "POST", "/api/auth/login", {"email": email, "password": password}
    )
    token = risposta.get("access_token")
    if not token:
        raise SystemExit(f"ERRORE: login senza access_token: {risposta}")
    return token


def _token(base_url, token_file=None):
    # Un file e' la strada che funziona sempre: nel Blocco Note l'incolla non ha
    # trappole, mentre la console di Chrome al primo uso pretende che si digiti
    # "allow pasting", e getpass in PowerShell non mostra nulla mentre si scrive.
    # Il 3/9 entrambe hanno bloccato il caricamento.
    if token_file:
        percorso = Path(token_file).expanduser()
        if not percorso.is_file():
            raise SystemExit(f"ERRORE: file del token non trovato: {percorso}")
        token = _ripulisci(percorso.read_text(encoding="utf-8"))
        if not token:
            raise SystemExit(f"ERRORE: il file del token e' vuoto: {percorso}")
        ok, motivo = _prova_token(base_url, token)
        if ok:
            print(f"Uso il token da {percorso.name}.")
            return token
        print(f"Il token in {percorso.name} non va bene: {motivo}.")
        print(f"   (letti {len(token)} caratteri; un token buono ne ha qualche centinaio")
        print(f"    e comincia per 'eyJ'. Il tuo comincia per '{token[:3]}'.)")
        return _login(base_url)

    token = _ripulisci(os.environ.get("CIAK_ADMIN_TOKEN") or "")
    if token:
        ok, motivo = _prova_token(base_url, token)
        if ok:
            print("Uso il token da CIAK_ADMIN_TOKEN.")
            return token
        # ⛔ Non si muore qui: un token scaduto e' la normalita' dopo 24 ore, e
        # far ripartire tutto da capo per questo sarebbe solo fastidio.
        print(f"Il token in CIAK_ADMIN_TOKEN non va bene: {motivo}.")
        print("Faccio il login.")
    else:
        print("Nessun CIAK_ADMIN_TOKEN: faccio il login.")

    return _login(base_url)


def main():
    ap = argparse.ArgumentParser(description="Carica crediti e obiettivo dentro Ciak")
    ap.add_argument("dati", help="percorso del JSON con crediti e obiettivo")
    ap.add_argument("--base-url", default=os.environ.get("CIAK_BASE_URL", DEFAULT_BASE_URL))
    ap.add_argument(
        "--dry-run", action="store_true",
        help="mostra cosa verrebbe scritto senza scrivere niente",
    )
    ap.add_argument(
        "--verifica", action="store_true",
        help="non scrive: rilegge dal server e mostra cosa vede Luca adesso",
    )
    ap.add_argument(
        "--token-file",
        help="file di testo contenente il solo token admin (niente password da digitare)",
    )
    ap.add_argument(
        "--elenco", action="store_true",
        help="non scrive: elenca TUTTI i crediti sul server e segnala i possibili doppioni",
    )
    ap.add_argument(
        "--rimuovi", metavar="ID",
        help="cancella un credito (per i doppioni). Mostra il record e chiede conferma.",
    )
    args = ap.parse_args()

    percorso = Path(args.dati).expanduser()
    if not percorso.is_file():
        raise SystemExit(f"ERRORE: file non trovato: {percorso}")
    if not _fuori_dal_repo(percorso):
        raise SystemExit(
            "ERRORE: Il file dei dati sta dentro il repository, che e' PUBBLICO.\n"
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

    token = _token(args.base_url, args.token_file)

    if args.rimuovi:
        # ⛔ L'unica operazione distruttiva di questo script. Il record si vede
        # PRIMA, per intero: cancellare al buio un doppione e scoprire dopo di
        # aver colpito quello con dentro le note buone non si annulla.
        tutti = _chiama(args.base_url, token, "GET", "/api/admin/ciak/crediti")["crediti"]
        bersaglio = next((c for c in tutti if c["id"] == args.rimuovi), None)
        if not bersaglio:
            raise SystemExit(f"ERRORE: nessun credito con id '{args.rimuovi}'")

        print(f"\n== Sto per cancellare '{args.rimuovi}'. Ecco cosa contiene ==")
        print(json.dumps(bersaglio, indent=2, ensure_ascii=False))

        gemelli = [
            c["id"] for c in tutti
            if c["id"] != args.rimuovi
            and (c.get("nome") or "").strip().lower()[:6]
            == (bersaglio.get("nome") or "").strip().lower()[:6]
        ]
        if gemelli:
            # ⛔ Non basta dire QUALE resta: bisogna mostrare COSA resta.
            # Il 3/9 i due record di Falcone avevano lo stesso totale ma piani
            # diversi -- 6 rate da 179 dal 30/9 contro 3 da 358 dal 15/9 -- e
            # solo uno corrispondeva al PDF firmato. Un doppione non e' una
            # copia: e' spesso una versione precedente, e va scelta quella
            # giusta guardandole entrambe.
            print("\n== Cosa resta in piedi, per confronto ==")
            for gid in gemelli:
                resta = next(c for c in tutti if c["id"] == gid)
                print(f"\n-- {gid} --")
                print(f"   documento: {resta.get('documento') or '(nessuno)'}")
                for r in resta.get("rate") or []:
                    quando = r.get("scadenza") or f"[{r.get('condizione')}]"
                    print(f"   rata {r.get('numero')}: EUR {float(r.get('importo') or 0):.0f} {quando}")
            print("\n⚠️ Stesso totale NON vuol dire stesso piano: confronta date e importi,")
            print("   e tieni quello che corrisponde al documento firmato.")
        else:
            # Nessun gemello = non e' un doppione. Va detto forte: e' il caso in
            # cui si sta per perdere l'unica copia di una posizione.
            print("\n!! ATTENZIONE: nessun altro credito con un nome simile.")
            print("   Non stai togliendo un doppione: stai togliendo l'unica copia.")

        conferma = input(f"\nDigita l'id per confermare ({args.rimuovi}): ").strip()
        if conferma != args.rimuovi:
            raise SystemExit("Annullato: non ho cancellato niente.")

        _chiama(args.base_url, token, "DELETE", f"/api/admin/ciak/crediti/{args.rimuovi}")
        print(f"Cancellato {args.rimuovi}.")

        r = _chiama(args.base_url, token, "GET", "/api/admin/ciak/crediti/riepilogo")
        print(
            f"Ora: previsto EUR {r.get('previsto_nel_mese', 0):.0f} - "
            f"residuo totale EUR {r.get('residuo_totale', 0):.0f}"
        )
        return 0

    if args.elenco:
        # Il riepilogo somma TUTTO cio' che sta nella collection, non solo cio'
        # che ha caricato questo file. Il 3/9 il server dichiarava EUR 2.634 di
        # residuo in piu' della simulazione locale: c'era gia' roba dentro,
        # messa da un'altra sessione. Una posizione presente due volte con id
        # diversi si conta due volte, e il residuo diventa un numero falso --
        # che e' peggio di non averlo.
        tutti = _chiama(args.base_url, token, "GET", "/api/admin/ciak/crediti")["crediti"]
        miei = {c["id"] for c in crediti}
        print(f"\n== {len(tutti)} crediti sul server ==")
        for c in sorted(tutti, key=lambda x: (x.get("nome") or "").lower()):
            residuo = sum(
                float(r.get("importo") or 0)
                for r in (c.get("rate") or [])
                if r.get("stato_effettivo") != "incassata"
            )
            marchio = "  " if c["id"] in miei else " *"
            print(
                f"{marchio} {c['id']:<28} {(c.get('nome') or '?'):<24} "
                f"{c.get('stato', '?'):<12} residuo EUR {residuo:.0f}"
            )
        estranei = [c for c in tutti if c["id"] not in miei]
        if estranei:
            print(f"\n* {len(estranei)} non vengono da questo file: da controllare.")

        # Stesso nome, id diversi: quasi sempre la stessa persona caricata due
        # volte. Si segnala e basta -- cancellare al posto di Claudio no.
        per_nome = {}
        for c in tutti:
            per_nome.setdefault((c.get("nome") or "").strip().lower(), []).append(c["id"])
        doppi = {n: ids for n, ids in per_nome.items() if len(ids) > 1}
        if doppi:
            print("\n!! POSSIBILI DOPPIONI (stesso nome, id diversi):")
            for nome, ids in doppi.items():
                print(f"   {nome}: {', '.join(ids)}")
        else:
            print("\nNessun nome ripetuto.")
        return 0

    if args.verifica:
        # Serve a rispondere a "e' andata?" senza riscrivere. Riscrivere non
        # farebbe danni di per se' (sono upsert), ma riporterebbe le rate agli
        # stati del file, cancellando quelle segnate incassate nel frattempo.
        print("\n--verifica: non scrivo, guardo soltanto.")
    else:
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
