/**
 * Ciak Admin — Clienti (chi ha comprato Start).
 *
 * Una tabella: una riga per cliente, le colonne dicono di chi e' la prossima mossa
 * (Aspetta il cliente · Da preparare · Da approvare · Completato). Il punto colorato
 * marca dove si trova adesso. Un clic sulla riga apre il suo account
 * (`/admin/start/:clientId`). Chi compra Start ci arriva da solo dalla pagina Lead.
 *
 * Nessuna spunta sulle fasi "superate": Start non ha un ordine rigido (una bozza puo'
 * essere approvata prima di un'altra), quindi una spunta potrebbe dire il falso.
 *
 * Backend: GET /api/admin/ciak/start/pipeline (la colonna la decide
 * `services/start_pipeline.py`). Rosso e ambra sono semantici (scaduta / entro 48 ore).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { apiGet } from "../api";
import { StatusPill } from "../components/ui/StatusPill";

const BTN = "rounded-lg border border-slate-900 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";

function scadenza(s) {
  if (!s) return { tone: "neutral", label: "Aspetta" };
  if (s.giorni < 0) return { tone: "critical", label: `Tappa ${s.tappa} in ritardo di ${-s.giorni} ${s.giorni === -1 ? "giorno" : "giorni"}` };
  if (s.giorni <= 2) return { tone: "warning", label: `Tappa ${s.tappa} ${s.giorni === 0 ? "oggi" : `fra ${s.giorni} ${s.giorni === 1 ? "giorno" : "giorni"}`}` };
  return { tone: "neutral", label: `Tappa ${s.tappa} · ${s.data_promessa}` };
}

export function PipelineStart({ onAuthExpired }) {
  const navigate = useNavigate();
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [fase, setFase] = useState("tutti");
  const [testo, setTesto] = useState("");

  const carica = useCallback(() => {
    setErrore(null);
    apiGet("/start/pipeline")
      .then(setDati)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setErrore(e.message);
      });
  }, [onAuthExpired]);

  useEffect(carica, [carica]);

  const colonne = useMemo(() => dati?.colonne || [], [dati]);
  // Una riga per cliente, con la colonna in cui si trova; in ogni colonna il backend ha gia' ordinato per urgenza.
  const tutti = useMemo(
    () => colonne.flatMap((c, i) => c.clienti.map((cl) => ({ ...cl, _fase: c.id, _indice: i }))),
    [colonne],
  );
  const visibili = useMemo(() => {
    const q = testo.trim().toLowerCase();
    return tutti.filter(
      (c) => (fase === "tutti" || c._fase === fase) && (!q || `${c.nome || ""} ${c.email || ""}`.toLowerCase().includes(q)),
    );
  }, [tutti, fase, testo]);

  if (errore) {
    return (
      <div className="p-10 max-w-6xl">
        <p className="mb-4 text-slate-700">Errore nel caricamento: {errore}</p>
        <button type="button" className={BTN} onClick={carica}>Riprova</button>
      </div>
    );
  }
  if (!dati) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Clienti</h1>
      <p className="mb-6 max-w-2xl text-slate-500">
        Chi ha comprato Start. Il punto dice di chi è la prossima mossa. Un clic su una riga apre il suo account.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Cerca un cliente</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Cerca per nome o email"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per fase">
          {[{ id: "tutti", titolo: "Tutti", n: tutti.length }, ...colonne.map((c) => ({ id: c.id, titolo: c.titolo, n: c.clienti.length }))].map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={fase === f.id}
              onClick={() => setFase(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${fase === f.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
            >
              {f.titolo} <span className="opacity-70">{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {dati.totale === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="mb-1 font-medium text-slate-900">Nessun cliente Ciak Start attivo.</p>
          <p className="text-sm text-slate-500">Compaiono qui appena un cliente riceve l'accesso a Start.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th scope="col" className="px-5 py-3 text-left font-semibold">Cliente</th>
                {colonne.map((c) => (
                  <th key={c.id} scope="col" className="px-2 py-3 text-center font-semibold">{c.titolo}</th>
                ))}
                <th scope="col" className="px-5 py-3 text-right font-semibold"><span className="sr-only">Account</span></th>
              </tr>
            </thead>
            <tbody>
              {visibili.length === 0 && (
                <tr><td colSpan={colonne.length + 2} className="px-5 py-8 text-center text-slate-500">Nessun cliente corrisponde alla ricerca.</td></tr>
              )}
              {visibili.map((c) => (
                <tr
                  key={c.client_id}
                  onClick={() => navigate(`/admin/start/${c.client_id}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/admin/start/${c.client_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block font-semibold text-slate-900 hover:underline underline-offset-2"
                    >
                      {c.nome || c.email}
                    </Link>
                    <span className="block text-[13px] text-slate-500">
                      {c.prossima_azione} · {c.approvati} di {c.totale} approvati
                    </span>
                  </td>
                  {colonne.map((col, i) => (
                    <td key={col.id} className="px-2 py-3.5 text-center">
                      {i === c._indice ? (
                        <StatusPill tone={scadenza(c.prossima_scadenza).tone} label={scadenza(c.prossima_scadenza).label} />
                      ) : (
                        <span className="text-slate-300" aria-hidden>·</span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-block rounded-lg border border-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-900">Apri l'account</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-sm text-slate-500">
        Chi compra Start arriva qui da solo dalla pagina <Link to="/admin/lead" className="font-semibold text-slate-900 underline underline-offset-2">Lead</Link>.
      </p>
      <button type="button" onClick={carica} className={`mt-4 ${BTN}`}>Aggiorna</button>
    </div>
  );
}
