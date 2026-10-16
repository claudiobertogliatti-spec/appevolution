/**
 * Ciak Admin — Lead.
 *
 * I lead IN GESTIONE, in una tabella: una riga per lead, le fasi come colonne
 * (Questionario · Call fissata · Call fatta · Trattativa). Il Blueprint e'
 * gratuito: chi lo riceve resta qui. Chi ACQUISTA esce da solo e compare in
 * Clienti (Start) o Partner (Partnership): lo decide il backend
 * (`GET /lead-gestione`, `services/lead_gestione.py`).
 *
 * A destra un solo pulsante "Azioni" con TUTTE le funzioni che esistono gia' sul
 * lead. Non le riscrive: le voci aprono la scheda lead (`/admin/leads/:email`)
 * sulla sezione giusta (`?vai=`). Modifica ed Elimina sono qui, in due finestre.
 * Chi ha compilato il questionario si vede sempre: le risposte sono nella scheda.
 *
 * Le regole di visualizzazione stanno in `leadModel.js` e sono provate li'.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { adminFetch, apiGet, errorDetail, getAdminUser } from "../api";
import { StatusPill } from "../components/ui/StatusPill";
import { Finestra, ModificaLead, BTN, BTN_ORO } from "../components/ModificaLead";
import {
  FASI, conteggi, filtra, indirizzoScheda, indiceFase, nomeVisibile, righe, vociPer,
} from "../leadModel";


function fmtQuando(iso) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
  }).format(new Date(iso));
}

// ── Menu Azioni ─────────────────────────────────────────────────────────────

function AzioniMenu({ riga, adminType, onVai, onModifica, onElimina }) {
  const [aperto, setAperto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const bottone = useRef(null);
  const menu = useRef(null);
  const gruppi = useMemo(() => vociPer(adminType), [adminType]);
  const consigliato = FASI[indiceFase(riga.fase)]?.consigliato;

  const chiudi = useCallback((ridaiFocus = false) => {
    setAperto(false);
    if (ridaiFocus) bottone.current?.focus();
  }, []);

  // Sempre dentro la finestra: sotto il pulsante se c'e' posto, sopra se no, altrimenti incollato al bordo.
  useLayoutEffect(() => {
    if (!aperto || !menu.current || !bottone.current) return;
    const r = bottone.current.getBoundingClientRect();
    const h = menu.current.offsetHeight;
    const w = menu.current.offsetWidth;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 10) {
      top = r.top - 6 - h >= 10 ? r.top - 6 - h : Math.max(10, window.innerHeight - h - 10);
    }
    setPos({ top, left: Math.max(10, Math.min(r.right - w, window.innerWidth - w - 10)) });
    menu.current.querySelector('[role="menuitem"]')?.focus();
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return undefined;
    const fuori = (e) => {
      if (!menu.current?.contains(e.target) && !bottone.current?.contains(e.target)) setAperto(false);
    };
    const chiudiSenzaFocus = () => setAperto(false);
    document.addEventListener("mousedown", fuori);
    window.addEventListener("scroll", chiudiSenzaFocus, true);
    window.addEventListener("resize", chiudiSenzaFocus);
    return () => {
      document.removeEventListener("mousedown", fuori);
      window.removeEventListener("scroll", chiudiSenzaFocus, true);
      window.removeEventListener("resize", chiudiSenzaFocus);
    };
  }, [aperto]);

  const tasti = (e) => {
    const voci = [...menu.current.querySelectorAll('[role="menuitem"]')];
    const i = voci.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); chiudi(true); }
    if (e.key === "ArrowDown") { e.preventDefault(); voci[(i + 1) % voci.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); voci[(i - 1 + voci.length) % voci.length].focus(); }
  };

  const scegli = (v) => {
    chiudi();
    if (v.id === "modifica") onModifica(riga);
    else if (v.id === "elimina") onElimina(riga);
    else onVai(riga, v.vai);
  };

  return (
    <>
      <button
        ref={bottone}
        type="button"
        className={`${BTN} inline-flex items-center gap-1.5`}
        aria-haspopup="menu"
        aria-expanded={aperto}
        aria-label={`Azioni su ${nomeVisibile(riga)}`}
        onClick={() => setAperto((v) => !v)}
      >
        Azioni <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {aperto && (
        <div
          ref={menu}
          role="menu"
          aria-label={`Azioni su ${nomeVisibile(riga)}`}
          onKeyDown={tasti}
          style={{ position: "fixed", top: pos.top, left: pos.left, maxHeight: "calc(100vh - 20px)" }}
          className="z-50 w-[330px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
        >
          {gruppi.map((g, i) => (
            <div key={g.gruppo}>
              {i > 0 && <div className="mx-1 my-1.5 h-px bg-slate-200" />}
              <p className="px-3 pb-1 pt-2.5 text-xs font-semibold text-slate-500">{g.gruppo}</p>
              {g.voci.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="menuitem"
                  title={v.info || undefined}
                  onClick={() => scegli(v)}
                  className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${v.pericolo ? "text-red-700" : "text-slate-900"}`}
                >
                  {v.label}
                  {v.vai && v.vai === consigliato && (
                    <span className="ml-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[11px] font-semibold text-slate-900">Consigliato</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Finestre ────────────────────────────────────────────────────────────────

function EliminaLead({ riga, onChiudi, onEliminato, onAuthExpired }) {
  const [conAccount, setConAccount] = useState(false);
  const [errore, setErrore] = useState(null);
  const [busy, setBusy] = useState(false);

  const elimina = async () => {
    setBusy(true);
    setErrore(null);
    try {
      const qs = new URLSearchParams({ email: riga.email, elimina_account: conAccount ? "true" : "false" });
      const res = await adminFetch(`/api/admin/ciak/lead?${qs}`, { method: "DELETE" });
      if (!res.ok) { setErrore(await errorDetail(res)); return; }
      toast.success(`${nomeVisibile(riga)} eliminato.`);
      onEliminato();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore("Non sono riuscito a eliminarlo. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Finestra id="elimina-lead-t" titolo="Eliminare questo lead?" sottotitolo={`${nomeVisibile(riga)} · ${riga.email}`} onChiudi={onChiudi}>
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
        <b>Non si può annullare.</b> Sparisce da Lead e da ogni elenco.
      </p>
      <p className="mb-1.5 mt-4 text-sm font-semibold text-slate-900">Verranno eliminati:</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-600">
        <li>la scheda del lead e i suoi dati</li>
        <li>il questionario e l'analisi</li>
        <li>la cronologia degli eventi</li>
      </ul>
      {riga.ha_account && (
        <label className="mt-4 flex items-start gap-3 text-sm text-slate-900">
          <input type="checkbox" className="mt-1" checked={conAccount} onChange={(e) => setConAccount(e.target.checked)} />
          <span>
            Elimina anche il suo <b>account Blueprint gratuito</b> (non ha acquistato).
            <span className="block text-slate-500">Se non lo elimini, il lead sparisce da qui ma l'accesso resta attivo.</span>
          </span>
        </label>
      )}
      {errore && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className={BTN} onClick={onChiudi}>Annulla</button>
        <button type="button" disabled={busy} onClick={elimina}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400">
          {busy ? "Elimino…" : "Elimina il lead"}
        </button>
      </div>
    </Finestra>
  );
}

// ── Pagina ──────────────────────────────────────────────────────────────────

export function LeadHub({ onAuthExpired }) {
  const navigate = useNavigate();
  const adminType = getAdminUser()?.admin_type || "claudio";
  // undefined = in caricamento · null = non disponibile · oggetto = dati veri
  const [board, setBoard] = useState(undefined);
  const [fase, setFase] = useState("tutti");
  const [testo, setTesto] = useState("");
  const [inModifica, setInModifica] = useState(null);
  const [inElimina, setInElimina] = useState(null);

  const carica = useCallback(() => {
    apiGet("/lead-gestione")
      .then(setBoard)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setBoard(null);
      });
  }, [onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  const tutte = useMemo(() => righe(board), [board]);
  const n = useMemo(() => conteggi(tutte), [tutte]);
  const visibili = useMemo(() => filtra(tutte, { fase, testo }), [tutte, fase, testo]);
  const vaiAScheda = (r, vai) => navigate(indirizzoScheda(r.email, vai));

  if (board === undefined) return <div className="p-10 text-slate-400">Caricamento…</div>;
  if (board === null) {
    return (
      <div className="p-10 max-w-6xl">
        <p className="mb-4 text-slate-700">Dato non disponibile.</p>
        <button type="button" className={BTN} onClick={() => { setBoard(undefined); carica(); }}>Riprova</button>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Lead</h1>
      <p className="mb-6 max-w-2xl text-slate-500">
        Chi stai seguendo e non ha ancora comprato. Ogni riga è un lead: il segno scuro dice dove si trova adesso.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Cerca un lead</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Cerca per nome o email"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per fase">
          {[{ id: "tutti", label: "Tutti" }, ...FASI].map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={fase === f.id}
              onClick={() => setFase(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${fase === f.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
            >
              {f.label} <span className="opacity-70">{n[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {tutte.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="mb-1 font-medium text-slate-900">Nessun lead in gestione.</p>
          <p className="text-sm text-slate-500">Compaiono qui appena qualcuno completa il questionario.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th scope="col" className="px-5 py-3 text-left font-semibold">Lead</th>
                {FASI.map((f) => (
                  <th key={f.id} scope="col" className="px-2 py-3 text-center font-semibold">{f.label}</th>
                ))}
                <th scope="col" className="px-5 py-3 text-right font-semibold"><span className="sr-only">Azioni</span></th>
              </tr>
            </thead>
            <tbody>
              {visibili.length === 0 && (
                <tr><td colSpan={FASI.length + 2} className="px-5 py-8 text-center text-slate-500">Nessun lead corrisponde alla ricerca.</td></tr>
              )}
              {visibili.map((r) => {
                const corrente = indiceFase(r.fase);
                return (
                  <tr key={r.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <Link to={indirizzoScheda(r.email)} className="block font-semibold text-slate-900 hover:underline underline-offset-2">
                        {nomeVisibile(r)}
                      </Link>
                      <span className="block text-[13px] text-slate-500">
                        {r.fase === "call_fissata" && r.call_starts_at ? `Call ${fmtQuando(r.call_starts_at)}` : r.email}
                      </span>
                    </td>
                    {FASI.map((f, i) => (
                      <td key={f.id} className="px-2 py-3.5 text-center">
                        {i < corrente ? (
                          <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-slate-600" role="img" aria-label="Fase superata">
                            <Check className="h-3 w-3" aria-hidden />
                          </span>
                        ) : i === corrente ? (
                          <StatusPill tone={r._cella.tone} label={r._cella.label} />
                        ) : (
                          <span className="text-slate-300" aria-hidden>·</span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-3.5 text-right">
                      <AzioniMenu riga={r} adminType={adminType} onVai={vaiAScheda} onModifica={setInModifica} onElimina={setInElimina} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
        <p>
          <b className="text-slate-900">Quando un lead compra</b> esce da qui da solo: Start lo porta in <b className="text-slate-900">Clienti</b>,
          la Partnership in <b className="text-slate-900">Partner</b>. Il Blueprint è gratuito, quindi chi lo riceve resta qui.
          {board.usciti > 0 && ` Oggi ${board.usciti} ${board.usciti === 1 ? "è già uscito" : "sono già usciti"}.`}
        </p>
        <p className="mt-2">
          <Link to="/admin/leads" className="font-semibold text-slate-900 underline underline-offset-2">Iscritti senza questionario</Link>
          {" · "}
          <Link to="/admin/pipeline" className="font-semibold text-slate-900 underline underline-offset-2">Cerca nuovi contatti</Link>
        </p>
      </div>

      {inModifica && (
        <ModificaLead riga={inModifica} onAuthExpired={onAuthExpired} onChiudi={() => setInModifica(null)}
          onSalvato={() => { setInModifica(null); carica(); }} />
      )}
      {inElimina && (
        <EliminaLead riga={inElimina} onAuthExpired={onAuthExpired} onChiudi={() => setInElimina(null)}
          onEliminato={() => { setInElimina(null); carica(); }} />
      )}
    </div>
  );
}

export default LeadHub;
