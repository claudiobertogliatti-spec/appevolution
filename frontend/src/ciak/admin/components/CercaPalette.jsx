/**
 * Ricerca ⌘K — una finestra per trovare una persona (lead, cliente Start, partner)
 * o una pagina dell'admin senza sapere in quale delle ~17 pagine sta.
 *
 * Persone: GET /api/admin/ciak/cerca (una riga per email, ruolo dal backend).
 * Pagine: filtro locale sull'elenco gia' ristretto per ruolo dal guscio (un account
 * con accesso limitato non vede nemmeno le pagine che non sono sue).
 *
 * Tastiera: frecce scorrono, Invio apre, Esc chiude (le gestisce `useDrawer` nel
 * guscio: focus intrappolato, ritorno del focus sul pulsante). Ogni stato e'
 * scritto: scrivi di piu', cerco, nessun risultato, ricerca non disponibile.
 * Non nasconde niente dietro un'animazione e non usa il blur.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { apiGet } from "../api";
import { pulisciNome } from "../oggiModel";
import { CERCA_MIN, filtraPagine, hrefPersona, muovi, statoLabel, TIPO_TONE } from "../cercaModel";
import { StatusPill } from "./ui/StatusPill";

const ATTESA_MS = 250; // si aspetta che chi scrive si fermi un attimo

export function CercaPalette({ open, onClose, panelRef, pages = [], onSelect, onAuthExpired }) {
  const [q, setQ] = useState("");
  const [persone, setPersone] = useState([]);
  const [stato, setStato] = useState("idle"); // idle | loading | ok | error
  const [attivo, setAttivo] = useState(-1);
  const richiesta = useRef(0);

  const testo = q.trim();
  const pagine = useMemo(() => filtraPagine(pages, testo), [pages, testo]);

  // Ogni apertura riparte da zero.
  useEffect(() => {
    if (open) {
      setQ("");
      setPersone([]);
      setStato("idle");
      setAttivo(-1);
    }
  }, [open]);

  // Ricerca persone: parte quando chi scrive si ferma; una risposta vecchia non
  // sovrascrive mai una piu' recente.
  useEffect(() => {
    if (!open) return undefined;
    if (testo.length < CERCA_MIN) {
      richiesta.current += 1;
      setPersone([]);
      setStato("idle");
      return undefined;
    }
    // Mentre si cerca non restano righe del testo precedente: Invio non deve poter
    // aprire una persona che non corrisponde piu' a cio' che e' scritto.
    setStato("loading");
    setPersone([]);
    const id = ++richiesta.current;
    const timer = setTimeout(() => {
      apiGet("/cerca", { q: testo })
        .then((res) => {
          if (id !== richiesta.current) return;
          setPersone(res?.items || []);
          setStato("ok");
        })
        .catch((e) => {
          if (id !== richiesta.current) return;
          if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
          setPersone([]);
          setStato("error");
        });
    }, ATTESA_MS);
    return () => clearTimeout(timer);
  }, [testo, open, onAuthExpired]);

  const opzioni = useMemo(
    () => [
      ...persone.map((p) => ({ tipo: "persona", chiave: `p-${p.email}`, href: hrefPersona(p), dati: p })),
      ...pagine.map((p) => ({ tipo: "pagina", chiave: `g-${p.to}`, href: p.to, dati: p })),
    ],
    [persone, pagine]
  );

  // La selezione resta valida quando l'elenco cambia.
  useEffect(() => {
    setAttivo((i) => (i >= opzioni.length ? opzioni.length - 1 : i));
  }, [opzioni.length]);

  if (!open) return null;

  const apri = (opzione) => {
    if (!opzione) return;
    onSelect?.(opzione.href);
    onClose?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setAttivo((i) => muovi(i, e.key === "ArrowDown" ? 1 : -1, opzioni.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      apri(opzioni[attivo >= 0 ? attivo : 0]);
    }
  };

  const nPersone = persone.length;
  const indicePagina = (i) => nPersone + i;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh]">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cerca persone e pagine"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden />
          <input
            type="text"
            role="combobox"
            aria-expanded={opzioni.length > 0}
            aria-controls="cerca-lista"
            aria-activedescendant={attivo >= 0 ? `cerca-opt-${attivo}` : undefined}
            aria-label="Nome, email o pagina"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => { setQ(e.target.value); setAttivo(-1); }}
            onKeyDown={onKeyDown}
            placeholder="Cerca una persona o una pagina"
            className="h-14 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">Esc</kbd>
        </div>

        <div id="cerca-lista" role="listbox" aria-label="Risultati" className="max-h-[60vh] overflow-y-auto p-2">
          {testo.length < CERCA_MIN && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              Scrivi un nome o un'email (almeno {CERCA_MIN} lettere).
            </p>
          )}

          {testo.length >= CERCA_MIN && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Persone</p>
              {stato === "loading" && <p className="px-3 py-3 text-sm text-slate-500">Cerco…</p>}
              {stato === "error" && (
                <p className="px-3 py-3 text-sm text-slate-600">Ricerca non disponibile. Riprova scrivendo di nuovo.</p>
              )}
              {stato === "ok" && nPersone === 0 && (
                <p className="px-3 py-3 text-sm text-slate-500">Nessuna persona trovata.</p>
              )}
              {persone.map((p, i) => {
                const sel = i === attivo;
                const st = statoLabel(p.stato);
                return (
                  <div
                    key={`p-${p.email}`}
                    id={`cerca-opt-${i}`}
                    role="option"
                    aria-selected={sel}
                    onMouseEnter={() => setAttivo(i)}
                    onClick={() => apri(opzioni[i])}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${sel ? "bg-slate-100" : ""}`}
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{pulisciNome(p.nome)}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {p.email}{st ? ` · ${st}` : ""}
                      </span>
                    </div>
                    <span className="flex-shrink-0"><StatusPill tone={TIPO_TONE[p.tipo] || "neutral"} label={p.label} /></span>
                  </div>
                );
              })}

              {pagine.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Pagine</p>
                  {pagine.map((p, i) => {
                    const idx = indicePagina(i);
                    const sel = idx === attivo;
                    return (
                      <div
                        key={`g-${p.to}`}
                        id={`cerca-opt-${idx}`}
                        role="option"
                        aria-selected={sel}
                        onMouseEnter={() => setAttivo(idx)}
                        onClick={() => apri(opzioni[idx])}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${sel ? "bg-slate-100" : ""}`}
                      >
                        <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{p.label}</span>
                        <span className="flex-shrink-0 text-xs text-slate-500">{p.department}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {stato === "ok" ? `${nPersone} persone e ${pagine.length} pagine trovate` : ""}
        </p>
      </div>
    </div>
  );
}

export default CercaPalette;
