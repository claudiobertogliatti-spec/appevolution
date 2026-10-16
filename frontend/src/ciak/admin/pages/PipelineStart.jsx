/**
 * Ciak Admin — Clienti (chi ha comprato Start).
 *
 * Serve a rispondere a una domanda: "i clienti Start stanno costruendo il loro
 * pacchetto, o si sono fermati?". Una riga per cliente:
 *   - Pacchetto: i 6 materiali, uno per segmento, colorati per stato (approvato,
 *     da approvare, in preparazione, errore, da fare) + "N di 6 approvati";
 *   - Prossima mossa: cosa succede adesso e di chi e' (tuo, del cliente);
 *   - Ultimo movimento: quanti giorni fa si e' mosso qualcosa, con "Fermo" oltre la
 *     soglia decisa dal backend (`fermo`, `services/start_pipeline.SOGLIA_FERMO_GIORNI`).
 * Un clic sulla riga apre il suo account (`/admin/start/:clientId`). Chi compra Start
 * ci arriva da solo dalla pagina Lead.
 *
 * Nessuna spunta sulle fasi "superate": Start non ha un ordine rigido (una bozza puo'
 * essere approvata prima di un'altra). Lo stato e' sempre scritto a parole, mai il solo
 * colore. Rosso e ambra sono semantici (errore / fermo).
 *
 * Backend: GET /api/admin/ciak/start/pipeline (la fase e il "fermo" li decide
 * `services/start_pipeline.py`).
 */
import { IntestazioneAgente } from "../components/ui/IntestazioneAgente";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { apiGet } from "../api";
import { StatusPill } from "../components/ui/StatusPill";

const BTN = "rounded-lg border border-slate-900 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";

// Stato di un materiale → colore del segmento e parola (la stessa nella legenda).
const STATO = {
  approvato: { cls: "bg-slate-900", label: "Approvato" },
  da_approvare: { cls: "bg-yellow-400", label: "Da approvare" },
  in_generazione: { cls: "bg-slate-400", label: "In preparazione" },
  errore: { cls: "bg-red-500", label: "Errore" },
  da_fare: { cls: "bg-slate-200", label: "Da fare" },
};

// Di chi e' la mossa, a parole.
const MOSSA = {
  da_approvare: { chi: "Tocca a te", tone: "warning" },
  da_preparare: { chi: "Tocca a te", tone: "warning" },
  attesa_cliente: { chi: "Tocca al cliente", tone: "neutral" },
  completato: { chi: "Pacchetto completo", tone: "good" },
};

const FILTRO_FERMI = "fermi";

function giorniFa(n) {
  if (n == null) return null;
  if (n === 0) return "oggi";
  if (n === 1) return "ieri";
  return `${n} giorni fa`;
}

function giorniDa(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

// In cima: prima chi aspetta te (bozze), poi chi e' fermo, poi gli altri; in fondo i completi.
function priorita(c) {
  if (c._fase === "completato") return 3;
  if (c._fase === "da_approvare") return 0;
  if (c.fermo) return 1;
  return 2;
}

function Pacchetto({ c }) {
  return (
    <div>
      <ul className="flex gap-1" aria-label={`Pacchetto di ${c.nome || c.email}: ${c.approvati} di ${c.totale} materiali approvati`}>
        {(c.materiali || []).map((m) => {
          const st = STATO[m.stato] || STATO.da_fare;
          return (
            <li key={m.type} title={`${m.titolo}: ${st.label}`} className={`h-2.5 w-7 rounded-full ${st.cls}`}>
              <span className="sr-only">{m.titolo}: {st.label}</span>
            </li>
          );
        })}
      </ul>
      <span className="mt-1.5 block text-[13px] text-slate-600">
        <b className="font-semibold text-slate-900">{c.approvati} di {c.totale}</b> approvati
      </span>
    </div>
  );
}

function UltimoMovimento({ c }) {
  const um = c.ultimo_movimento;
  if (!um || um.giorni == null) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-sm text-slate-700">
        {um.da_acquisto ? `Nessun movimento dall'acquisto (${giorniFa(um.giorni)})` : giorniFa(um.giorni)}
      </span>
      {c.fermo && <StatusPill tone="warning" label="Fermo" />}
    </div>
  );
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
  const tutti = useMemo(
    () =>
      colonne
        .flatMap((c) => c.clienti.map((cl) => ({ ...cl, _fase: c.id })))
        .sort((a, b) => priorita(a) - priorita(b)),
    [colonne],
  );
  const visibili = useMemo(() => {
    const q = testo.trim().toLowerCase();
    return tutti.filter((c) => {
      const inFase = fase === "tutti" || (fase === FILTRO_FERMI ? c.fermo : c._fase === fase);
      return inFase && (!q || `${c.nome || ""} ${c.email || ""}`.toLowerCase().includes(q));
    });
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

  const filtri = [
    { id: "tutti", titolo: "Tutti", n: tutti.length },
    { id: FILTRO_FERMI, titolo: "Fermi", n: tutti.filter((c) => c.fermo).length },
    ...colonne.map((c) => ({ id: c.id, titolo: c.titolo, n: c.clienti.length })),
  ];

  return (
    <div className="px-5 py-8 sm:px-10 lg:px-16 lg:py-12 max-w-6xl">
      <IntestazioneAgente
        agente="stefania"
        titolo="Clienti"
        sotto="Chi ha comprato Start e a che punto è con il suo pacchetto: se avanza o si è fermato. Un clic su una riga apre il suo account."
      />

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
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra">
          {filtri.map((f) => (
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
                <th scope="col" className="px-3 py-3 text-left font-semibold">Pacchetto</th>
                <th scope="col" className="px-3 py-3 text-left font-semibold">Prossima mossa</th>
                <th scope="col" className="px-3 py-3 text-left font-semibold">Ultimo movimento</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold"><span className="sr-only">Account</span></th>
              </tr>
            </thead>
            <tbody>
              {visibili.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Nessun cliente corrisponde.</td></tr>
              )}
              {visibili.map((c) => {
                const mossa = MOSSA[c._fase] || MOSSA.attesa_cliente;
                const compratoDa = giorniFa(giorniDa(c.acquistato_il));
                return (
                  <tr
                    key={c.client_id}
                    onClick={() => navigate(`/admin/start/${c.client_id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 align-top">
                      <Link
                        to={`/admin/start/${c.client_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block font-semibold text-slate-900 hover:underline underline-offset-2"
                      >
                        {c.nome || c.email}
                      </Link>
                      {compratoDa && <span className="block text-[13px] text-slate-500">Ha comprato {compratoDa}</span>}
                    </td>
                    <td className="px-3 py-4 align-top"><Pacchetto c={c} /></td>
                    <td className="px-3 py-4 align-top">
                      <StatusPill tone={mossa.tone} label={mossa.chi} />
                      <span className="mt-1.5 block text-[13px] text-slate-600">{c.prossima_azione}</span>
                    </td>
                    <td className="px-3 py-4 align-top"><UltimoMovimento c={c} /></td>
                    <td className="px-5 py-4 text-right align-top">
                      <span className="inline-block rounded-lg border border-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-900">Apri l'account</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-slate-600" aria-label="Legenda del pacchetto">
        {Object.entries(STATO).map(([id, s]) => (
          <li key={id} className="inline-flex items-center gap-2">
            <span className={`inline-block h-2.5 w-5 rounded-full ${s.cls}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm text-slate-500">
        I 6 segmenti sono i materiali del pacchetto, nell'ordine: Chi sei e cosa offri · Il tuo marchio · I profili social · La pagina web · Il calendario dei 60 giorni · Il controllo finale.
        Chi compra Start arriva qui da solo dalla pagina <Link to="/admin/lead" className="font-semibold text-slate-900 underline underline-offset-2">Lead</Link>.
      </p>
      <button type="button" onClick={carica} className={`mt-4 ${BTN}`}>Aggiorna</button>
    </div>
  );
}
