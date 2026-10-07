/**
 * Ciak Admin — Clienti Start (pipeline).
 *
 * Una colonna per "di chi e' la prossima mossa": aspetta il cliente, da preparare,
 * da approvare, completato. Un clic sulla card apre l'account del cliente
 * (`/admin/start/:clientId`). Come la Pipeline Partner, ma sul percorso Start.
 *
 * Backend: GET /api/admin/ciak/start/pipeline
 * Design: quello dell'admin Ciak (card bianche, Poppins dallo shell). Rosso e
 * ambra sono semantici (scaduta / entro 48 ore), mai decorativi.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { apiGet } from "../api";

const COLONNA = {
  attesa_cliente: { testa: "bg-slate-50", nota: "Non puoi fare niente: tocca a lui" },
  da_preparare: { testa: "bg-sky-50", nota: "Gli input ci sono: genera le bozze" },
  da_approvare: { testa: "bg-amber-50", nota: "Leggi e approva: il cliente aspetta te" },
  completato: { testa: "bg-emerald-50", nota: "Tutti i materiali approvati" },
};

function Scadenza({ s }) {
  if (!s) return null;
  const base = "text-[11px] font-semibold px-2 py-0.5 rounded border";
  let tono = "bg-slate-100 text-slate-600 border-slate-200";
  let testo = `Tappa ${s.tappa} · ${s.data_promessa}`;
  if (s.giorni < 0) {
    tono = "bg-red-50 text-red-700 border-red-200";
    testo = `Tappa ${s.tappa} · in ritardo di ${-s.giorni} ${s.giorni === -1 ? "giorno" : "giorni"}`;
  } else if (s.giorni <= 2) {
    tono = "bg-amber-50 text-amber-800 border-amber-200";
    testo = `Tappa ${s.tappa} · ${s.giorni === 0 ? "oggi" : `fra ${s.giorni} ${s.giorni === 1 ? "giorno" : "giorni"}`}`;
  }
  return <span className={`${base} ${tono}`}>{testo}</span>;
}

function Card({ c, onApri }) {
  return (
    <button
      type="button"
      onClick={() => onApri(c)}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
    >
      <p className="text-sm font-semibold text-slate-900">{c.nome || c.email}</p>
      {c.nome && <p className="text-xs text-slate-500 break-all">{c.email}</p>}
      <p className="mt-2 text-sm text-slate-700">{c.prossima_azione}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-white text-slate-600 border-slate-200">
          {c.approvati} di {c.totale} approvati
        </span>
        <Scadenza s={c.prossima_scadenza} />
      </div>
    </button>
  );
}

export function PipelineStart({ onAuthExpired }) {
  const navigate = useNavigate();
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [cerca, setCerca] = useState("");

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

  const colonne = useMemo(() => {
    if (!dati) return [];
    const q = cerca.trim().toLowerCase();
    if (!q) return dati.colonne;
    return dati.colonne.map((col) => ({
      ...col,
      clienti: col.clienti.filter((c) => `${c.nome || ""} ${c.email || ""}`.toLowerCase().includes(q)),
    }));
  }, [dati, cerca]);

  if (errore) {
    return (
      <div className="p-10 max-w-6xl">
        <p className="text-slate-700 mb-4">Errore nel caricamento: {errore}</p>
        <button
          onClick={carica}
          className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800"
        >
          Riprova
        </button>
      </div>
    );
  }
  if (!dati) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10 max-w-7xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Clienti Start</h1>
      <p className="text-slate-500 mb-6">
        {dati.totale} {dati.totale === 1 ? "cliente" : "clienti"}, in colonna per di chi è la prossima mossa. Clicca un
        cliente per aprire il suo account.
      </p>

      <label className="relative block max-w-sm mb-6">
        <span className="sr-only">Cerca un cliente</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca per nome o email"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        />
      </label>

      {dati.totale === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-slate-900 font-medium mb-1">Nessun cliente Ciak Start attivo.</p>
          <p className="text-slate-500 text-sm">Compaiono qui appena un cliente riceve l'accesso a Start.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {colonne.map((col) => (
            <section key={col.id} className="rounded-2xl border border-gray-200 bg-gray-50/50">
              <header className={`rounded-t-2xl px-4 py-3 ${COLONNA[col.id]?.testa || ""}`}>
                <h2 className="text-sm font-semibold text-slate-900">
                  {col.titolo} <span className="text-slate-500 font-medium">· {col.clienti.length}</span>
                </h2>
                <p className="text-xs text-slate-500">{COLONNA[col.id]?.nota}</p>
              </header>
              <div className="space-y-3 p-3">
                {col.clienti.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-slate-400">Nessuno</p>
                ) : (
                  col.clienti.map((c) => (
                    <Card key={c.client_id} c={c} onApri={(x) => navigate(`/admin/start/${x.client_id}`)} />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <button
        onClick={carica}
        className="mt-6 text-xs font-semibold px-4 py-2 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 transition"
      >
        Aggiorna
      </button>
    </div>
  );
}
