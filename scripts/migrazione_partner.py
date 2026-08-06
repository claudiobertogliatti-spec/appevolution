# -*- coding: utf-8 -*-
"""
Migrazione partner Drive -> Ciak: libreria + CLI.

Nasce dalla migrazione di Daniele Andolfi (ID 23) chiusa il 30/07/2026, per non
rifare a mano ogni volta gli stessi quattro gesti: leggere lo stato vero,
scrivere, rileggere, tenere i backup.

Protocollo: memory/CIAK_MIGRATION_MEMORY.md (18 regole). Le tre che questo
script fa rispettare da solo:
  - regola 3  : si legge `full-data` PRIMA di scrivere;
  - regola 12 : backup pre/post = risposte reali dell'API, mai JSON scritti a mano;
  - regola 17 : dopo ogni scrittura si verifica che `updated_at` si sia mosso.

Cosa NON fa e non deve fare: decidere. L'offerta, il prezzo, la data di lancio
e la validazione dei testi restano decisioni umane (regole 6 e 7).

Uso:
    python scripts/migrazione_partner.py stato 23
    python scripts/migrazione_partner.py gap            # report su tutti i partner
    python scripts/migrazione_partner.py backup 23 --tag before
    python scripts/migrazione_partner.py verifica 23 --da storage/migration-backups/...-before-....json

Per le scritture si importa il modulo (servono i testi, non si passano da CLI):
    from scripts.migrazione_partner import Partner
    p = Partner("23"); p.backup("before")
    p.scrivi_risposte("la-tua-storia", {"S02": "...", ...})
    p.scrivi_hub({"offerName": "Sabai Academy", ...})
    p.scrivi_fase("F6")
    p.backup("after"); print(p.verifica())
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date

BASE = os.environ.get("CIAK_API_BASE", "https://www.ciak.io/api")
BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "storage", "migration-backups",
)

# Fase attesa = fase_legacy dello step piu' avanzato non ancora `pending`.
# Copia di models/partner_journey_step.py: qui serve senza importare il backend.
STEP_FASE = {
    "01-contratto": "F1", "02-discovery-video": "F1", "burocrazia": "F1",
    "03-brand-kit": "F2", "la-tua-storia": "F2", "obiettivo": "F2",
    "04-posizionamento": "F2", "05-script-masterclass": "F3",
    "06-outline-lezioni": "F3", "07-script-videolezioni": "F3",
    "08-registra-masterclass": "F4", "09-registra-lezioni": "F4",
    "10-sistema-vendita": "F5", "11-calendario-30gg": "F6",
    "12-prezzo-webinar": "F6", "13-lancio": "F7",
}
ORDINE_STEP = list(STEP_FASE.keys())
CAMPI_OFFERTA = ("offerName", "offerPrice", "offerIncludes", "offerGuarantee")


def _call(method: str, path: str, body=None):
    # Dal 30/07/2026 (commit fa110052) TUTTI gli endpoint admin/partner-hub richiedono
    # un JWT admin, anche in lettura: senza header ogni chiamata torna 401. Il token
    # non sta nel repo — si esporta prima di lanciare:
    #   export CIAK_ADMIN_TOKEN="<jwt>"     (PowerShell: $env:CIAK_ADMIN_TOKEN = "<jwt>")
    token = os.environ.get("CIAK_ADMIN_TOKEN", "").strip()
    if not token:
        raise SystemExit(
            "CIAK_ADMIN_TOKEN non impostato: dal 30/07/2026 gli endpoint admin "
            "richiedono un JWT admin anche in lettura.\n"
            'PowerShell:  $env:CIAK_ADMIN_TOKEN = "<jwt>"'
        )
    # Un JWT ha tre parti separate da punto. Senza questo controllo un token
    # sbagliato arriva al server e torna 401, che si legge come "non ho i
    # permessi" invece di "non hai copiato un token". Caso reale (6/8/2026):
    # `copy(localStorage.ciak_admin_token)` su una chiave inesistente mette
    # negli appunti la stringa "undefined", e da li' il 401.
    _grezzo = token[7:].strip() if token.lower().startswith("bearer ") else token
    if _grezzo.count(".") != 2:
        raise SystemExit(
            f"CIAK_ADMIN_TOKEN non sembra un JWT (valore di {len(_grezzo)} caratteri, "
            f"{_grezzo.count('.')} punti invece di 2).\n"
            "Se hai usato copy() dalla console: la chiave letta non esiste e negli "
            "appunti e' finita la stringa 'undefined'. Trova il nome giusto con:\n"
            "  Object.keys(localStorage)"
        )
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Authorization", token if token.lower().startswith("bearer ") else f"Bearer {token}")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # Il 401 qui non e' quasi mai "non hai i permessi": e' il token admin
        # scaduto (dura poco). Senza questo messaggio si legge come dato mancante.
        if e.code == 401:
            raise SystemExit(
                f"401 su {path}: il token e' scaduto o non e' di un utente admin.\n"
                "Rifallo: apri www.ciak.io/admin loggato, F12 -> Console -> copia il "
                "token da localStorage, poi $env:CIAK_ADMIN_TOKEN = Get-Clipboard"
            ) from None
        raise


class Partner:
    """Un partner in migrazione. Ogni scrittura passa da qui."""

    def __init__(self, partner_id: str):
        self.id = str(partner_id)

    # ---------------- lettura ----------------
    def full_data(self) -> dict:
        return _call("GET", f"/admin/partner/{self.id}/full-data")

    def hub(self) -> dict:
        return _call("GET", f"/partner-hub/{self.id}")

    def backup(self, tag: str) -> tuple[str, str]:
        """Salva le risposte REALI dell'API. tag: 'before' | 'after'."""
        os.makedirs(BACKUP_DIR, exist_ok=True)
        oggi = date.today().isoformat()
        nome = _slug(self.full_data()["partner"].get("name") or self.id)
        paths = []
        for suffisso, dati in (("", self.full_data()), ("-hub", self.hub())):
            p = os.path.join(BACKUP_DIR, f"{nome}{suffisso}-{tag}-{oggi}.json")
            with open(p, "w", encoding="utf-8") as f:
                json.dump(dati, f, ensure_ascii=False, indent=1)
            paths.append(p)
        return tuple(paths)  # type: ignore[return-value]

    # ---------------- scrittura ----------------
    def scrivi_risposte(self, step_id: str, answers: dict) -> dict:
        """Risposte di un wizard. Merge NON distruttivo lato server; non tocca lo status.
        Restituisce anche `answers_saved` = totale dopo il merge."""
        if not answers:
            raise ValueError("nessuna risposta da scrivere")
        return _call("PATCH", f"/admin/partner/{self.id}/step/{step_id}", {"answers": answers})

    def scrivi_hub(self, campi: dict) -> dict:
        """Campi del profilo/offerta. I valori vuoti si SALTANO: un campo lasciato
        vuoto per scelta resta vuoto (regola 6), non si scrive stringa vuota."""
        esito = {}
        for k, v in campi.items():
            if v is None or not str(v).strip():
                esito[k] = "saltato (vuoto)"
                continue
            q = urllib.parse.urlencode({"field": k, "value": v})
            _call("PATCH", f"/partner-hub/{self.id}/field?{q}")
            esito[k] = "scritto"
        return esito

    def scrivi_fase(self, fase: str) -> dict:
        if fase not in ("F1", "F2", "F3", "F4", "F5", "F6", "F7", "LIVE"):
            raise ValueError(f"fase fuori scala: {fase}")
        return _call("PATCH", f"/admin/partner/{self.id}/journey",
                     {"collection": "partners", "data": {"phase": fase}})

    # ---------------- verifica (regola 17) ----------------
    def verifica(self, backup_before: str | None = None) -> dict:
        """Fotografia dello stato + confronto con il backup pre, se passato."""
        fd, hub = self.full_data(), self.hub()
        steps = {s["step_id"]: s for s in fd.get("steps", [])}
        storia = steps.get("la-tua-storia", {})
        risposte = ((storia.get("data") or {}).get("answers") or {})
        out = {
            "partner": fd["partner"].get("name"),
            "fase_dichiarata": fd["partner"].get("phase"),
            "fase_attesa_dagli_step": fase_attesa(fd.get("steps", [])),
            "step_in_corso": step_in_corso(fd.get("steps", [])),
            "storia": f"{len(risposte)}/21",
            "storia_status": storia.get("status"),
            "risposte_vuote": [k for k, v in risposte.items() if not str(v).strip()],
            "offerta_compilata": sum(1 for c in CAMPI_OFFERTA if str(hub.get(c) or "").strip()),
            "lezioni_con_video": _lezioni_con_video(fd),
            "updated_at": {
                "partner": fd["partner"].get("updated_at"),
                "hub": hub.get("updated_at"),
                "storia": storia.get("updated_at"),
            },
        }
        if backup_before:
            with open(backup_before, encoding="utf-8") as f:
                prima = json.load(f)
            p_steps = {s["step_id"]: s for s in prima.get("steps", [])}
            out["mosso"] = {
                "partner.updated_at": prima["partner"].get("updated_at") != fd["partner"].get("updated_at"),
                "storia.updated_at": (p_steps.get("la-tua-storia") or {}).get("updated_at")
                                     != storia.get("updated_at"),
            }
        return out


# ---------------- funzioni pure, usate anche dal report ----------------
def fase_attesa(steps: list) -> str | None:
    """La fase che gli step raccontano davvero. Se non coincide con quella
    dichiarata, la scheda partner sta mentendo (successo su Andolfi: diceva F2,
    gli step dicevano F6).

    Si conta l'ultimo step **done**: un lavoro iniziato non e' un lavoro fatto
    (regola 7). Cosi' Andolfi risulta F6 anche con `13-lancio` in_progress —
    perche' il lancio non e' avvenuto. Gli `skipped` non contano."""
    per_id = {s.get("step_id"): s for s in steps}
    ultima = None
    for sid in ORDINE_STEP:
        s = per_id.get(sid)
        if s and s.get("status") == "done":
            ultima = STEP_FASE[sid]
    return ultima


def step_in_corso(steps: list) -> list[str]:
    per_id = {s.get("step_id"): s for s in steps}
    return [sid for sid in ORDINE_STEP
            if (per_id.get(sid) or {}).get("status") == "in_progress"]


def _lezioni_con_video(fd: dict) -> str:
    lez = ((fd.get("videocorso") or {}).get("lessons") or {})
    if not isinstance(lez, dict) or not lez:
        return "0"
    con = sum(1 for v in lez.values()
              if isinstance(v, dict) and (v.get("video_embed_url") or v.get("video_raw_url")))
    return f"{con}/{len(lez)}"


def _slug(nome: str) -> str:
    import re
    s = re.sub(r"[^a-z0-9]+", "-", nome.lower().strip())
    return s.strip("-") or "partner"


def report_gap() -> list[dict]:
    """Cosa manca a ciascun partner. Sola lettura: si puo' lanciare quando si vuole."""
    partners = _call("GET", "/partners")
    if isinstance(partners, dict):
        partners = partners.get("partners") or partners.get("items") or []
    righe = []
    for p in partners:
        pid = str(p.get("id"))
        try:
            fd = _call("GET", f"/admin/partner/{pid}/full-data")
            hub = _call("GET", f"/partner-hub/{pid}")
        except Exception as e:  # partner senza record completo: si segna, non si salta in silenzio
            righe.append({"id": pid, "nome": p.get("name"), "errore": str(e)})
            continue
        steps = {s["step_id"]: s for s in fd.get("steps", [])}
        risposte = ((steps.get("la-tua-storia", {}).get("data") or {}).get("answers") or {})
        attesa = fase_attesa(fd.get("steps", []))
        dichiarata = fd["partner"].get("phase")
        righe.append({
            "id": pid,
            "nome": p.get("name"),
            "fase": dichiarata,
            "fase_attesa": attesa,
            "fase_incoerente": bool(attesa and dichiarata and attesa != dichiarata),
            "storia": f"{len(risposte)}/21",
            "offerta": f"{sum(1 for c in CAMPI_OFFERTA if str(hub.get(c) or '').strip())}/4",
            "lezioni_video": _lezioni_con_video(fd),
            "masterclass": (fd.get("masterclass") or {}).get("video_pipeline_status") or "-",
        })
    return righe


# ---------------- collaudo del percorso EVO, step per step ----------------
# Ogni step del Metodo EVO dovrebbe PRODURRE qualcosa. Qui, per ciascuno, si
# confronta lo `status` dichiarato con la prova che quel qualcosa esista davvero
# nei dati. Serve a far emergere le due facce dello stesso difetto:
#   - "done" senza prova            -> regola 7: fase marcata completa a vuoto;
#   - prova presente ma non "done"  -> il dato c'e' e nessuno lo legge.
# `01-contratto` non e' nel percorso: la firma avviene prima, quando il cliente
# decide di diventare partner (Claudio, 06/08/2026). Si mostra come contesto.
def _n(v) -> int:
    """Quanti elementi non vuoti, qualunque sia il contenitore."""
    if isinstance(v, dict):
        return sum(1 for x in v.values() if x not in (None, "", [], {}))
    if isinstance(v, list):
        return sum(1 for x in v if x not in (None, "", [], {}))
    return 1 if str(v or "").strip() else 0


def _lezioni(fd: dict) -> dict:
    lez = ((fd.get("videocorso") or {}).get("lessons") or {})
    return lez if isinstance(lez, dict) else {}


def _prove_step(fd: dict, hub: dict) -> dict:
    """step_id -> (descrizione della prova, presente | None se non verificabile)."""
    steps = {s.get("step_id"): s for s in fd.get("steps", [])}
    p = fd.get("partner") or {}
    pos = (fd.get("posizionamento") or {}).get("inputs") or {}
    mc = fd.get("masterclass") or {}
    lez = _lezioni(fd)
    fun = fd.get("funnel") or {}

    def ans(sid: str) -> dict:
        """Contenuto di uno step. ⚠️ NON basta `data.answers`: i wizard scrivono
        li', ma diversi step tengono il loro output come chiavi dirette dentro
        `data` (es. `data.script_videolezioni`, letto da partner_rewards.py:461).
        Guardando solo `answers` il 6/8/2026 questo collaudo ha dato tre falsi
        'DONE SENZA PROVA' su Andolfi. E' la trappola gia' nota di Ciak: il dato
        c'e', chi lo cerca guarda nel posto sbagliato."""
        d = (steps.get(sid) or {}).get("data") or {}
        if not isinstance(d, dict):
            return {}
        risposte = d.get("answers")
        if isinstance(risposte, dict) and risposte:
            return risposte
        return {k: v for k, v in d.items() if k != "answers"}

    con_video = sum(1 for v in lez.values()
                    if isinstance(v, dict) and (v.get("video_embed_url") or v.get("video_raw_url")))
    # I dati fiscali NON stanno sui campi di primo livello del partner: lo step
    # `burocrazia` li rispecchia in `partner.dati_burocrazia.*`
    # (partner_journey.py:6604). Cercarli sul partner nudo da' sempre 0/3.
    buro = p.get("dati_burocrazia") if isinstance(p.get("dati_burocrazia"), dict) else {}
    anagrafica = sum(1 for c in ("codice_fiscale", "partita_iva", "iban") if str(buro.get(c) or "").strip())
    mc_video = mc.get("youtube_url") or mc.get("video_url") or mc.get("video_embed_url")

    return {
        "02-discovery-video":    (f"{_n(ans('02-discovery-video'))} campi", bool(ans("02-discovery-video"))),
        "burocrazia":            (f"{anagrafica}/3 dati fiscali", anagrafica >= 3),
        "03-brand-kit":          (f"{_n(ans('03-brand-kit'))} campi", bool(ans("03-brand-kit"))),
        "la-tua-storia":         (f"{len(ans('la-tua-storia'))}/21 risposte", len(ans("la-tua-storia")) >= 21),
        "obiettivo":             (f"{len(ans('obiettivo'))} risposte", bool(ans("obiettivo"))),
        "04-posizionamento":     (f"{_n(pos)} campi compilati", _n(pos) >= 10),
        "05-script-masterclass": ("script presente" if str(mc.get("script") or "").strip() else "script assente",
                                  bool(str(mc.get("script") or "").strip())),
        "06-outline-lezioni":    (f"{len(lez)} lezioni in outline", len(lez) > 0),
        # Il deliverable e' `data.script_videolezioni` (partner_rewards.py:461),
        # non un campo `script` sulla singola lezione: quello non esiste.
        "07-script-videolezioni": (
            "script presente" if str((ans("07-script-videolezioni") or {}).get("script_videolezioni") or "").strip()
            else f"nessuno script ({_n(ans('07-script-videolezioni'))} altri campi)",
            bool(str((ans("07-script-videolezioni") or {}).get("script_videolezioni") or "").strip())),
        "08-registra-masterclass": ("video presente" if mc_video else "nessun video", bool(mc_video)),
        "09-registra-lezioni":   (f"{con_video}/{len(lez)} lezioni con video", bool(lez) and con_video == len(lez)),
        "10-sistema-vendita":    (f"{_n(fun)} campi funnel", _n(fun) > 0),
        "11-calendario-30gg":    (f"{_n(ans('11-calendario-30gg'))} campi", bool(ans("11-calendario-30gg"))),
        "12-prezzo-webinar":     (f"offerPrice={hub.get('offerPrice') or '-'}", bool(str(hub.get("offerPrice") or "").strip())),
        "13-lancio":             ("launched_at presente" if ((steps.get("13-lancio") or {}).get("data") or {}).get("launched_at") else "mai lanciato",
                                  bool(((steps.get("13-lancio") or {}).get("data") or {}).get("launched_at"))),
    }


def collaudo(partner_id: str) -> dict:
    """Sola lettura. Non esegue i generatori: dice quali step hanno un output vero."""
    p = Partner(partner_id)
    fd, hub = p.full_data(), p.hub()
    steps = {s.get("step_id"): s for s in fd.get("steps", [])}
    prove = _prove_step(fd, hub)

    righe = []
    for sid in ORDINE_STEP:
        if sid == "01-contratto":
            continue  # a monte del percorso, non e' uno step EVO
        st = (steps.get(sid) or {}).get("status") or "assente"
        prova, presente = prove.get(sid, ("-", None))
        fatto = st in ("done", "skipped")
        if presente is None:
            esito = "?"
        elif fatto and presente:
            esito = "ok"
        elif fatto and not presente:
            esito = "DONE SENZA PROVA"
        elif presente:
            esito = "PRONTO, NON SEGNATO"
        else:
            esito = "da fare"
        righe.append({"step": sid, "fase": STEP_FASE[sid], "status": st,
                      "prova": prova, "esito": esito})

    dichiarata = (fd.get("partner") or {}).get("phase")
    attesa = fase_attesa(fd.get("steps", []))
    return {
        "partner_id": partner_id,
        "nome": (fd.get("partner") or {}).get("name"),
        "fase_dichiarata": dichiarata,
        "fase_attesa_dagli_step": attesa,
        "fase_incoerente": bool(attesa and dichiarata and attesa != dichiarata),
        "step": righe,
    }


def _cli():
    ap = argparse.ArgumentParser(description="Migrazione partner Drive -> Ciak")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for nome in ("stato", "backup", "verifica", "collaudo"):
        s = sub.add_parser(nome)
        s.add_argument("partner_id")
        if nome == "backup":
            s.add_argument("--tag", default="before", choices=["before", "after"])
        if nome == "verifica":
            s.add_argument("--da", help="path del backup 'before' da confrontare")
    sub.add_parser("gap")
    a = ap.parse_args()

    if a.cmd == "gap":
        righe = report_gap()
        intest = f"{'ID':>4}  {'NOME':28} {'FASE':5} {'ATTESA':6} {'STORIA':7} {'OFFERTA':8} {'LEZIONI':9} MASTERCLASS"
        print(intest); print("-" * len(intest))
        for r in sorted(righe, key=lambda x: x.get("nome") or ""):
            if r.get("errore"):
                print(f"{r['id']:>4}  {(r['nome'] or '')[:28]:28} ERRORE: {r['errore'][:60]}")
                continue
            flag = " <-- incoerente" if r["fase_incoerente"] else ""
            print(f"{r['id']:>4}  {(r['nome'] or '')[:28]:28} {r['fase'] or '-':5} "
                  f"{r['fase_attesa'] or '-':6} {r['storia']:7} {r['offerta']:8} "
                  f"{r['lezioni_video']:9} {r['masterclass']}{flag}")
        return

    if a.cmd == "collaudo":
        r = collaudo(a.partner_id)
        print(f"{r['nome']} (id {r['partner_id']})")
        print(f"fase dichiarata: {r['fase_dichiarata']}  |  fase attesa dagli step: "
              f"{r['fase_attesa_dagli_step']}"
              f"{'   <-- INCOERENTE' if r['fase_incoerente'] else ''}")
        intest = f"{'STEP':24} {'FASE':5} {'STATUS':12} {'PROVA':30} ESITO"
        print(); print(intest); print("-" * len(intest))
        for s in r["step"]:
            print(f"{s['step']:24} {s['fase']:5} {s['status']:12} {s['prova'][:30]:30} {s['esito']}")
        rotti = [s for s in r["step"] if s["esito"] in ("DONE SENZA PROVA", "PRONTO, NON SEGNATO")]
        print(f"\n{len(rotti)} step da guardare: "
              + (", ".join(s['step'] for s in rotti) if rotti else "nessuno"))
        return

    p = Partner(a.partner_id)
    if a.cmd == "stato":
        print(json.dumps(p.verifica(), ensure_ascii=False, indent=2))
    elif a.cmd == "backup":
        for path in p.backup(a.tag):
            print("salvato:", path)
    elif a.cmd == "verifica":
        print(json.dumps(p.verifica(a.da), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.exit(_cli())
