/**
 * Ciak Admin — Percorso EVO (panoramica partner per atto).
 *
 * Promuove la vista EVO da modale (PercorsoEvoPanel dentro PartnerDetailModal) a
 * pagina di primo livello: tutti i partner attivi raggruppati nei 3 atti del
 * Metodo EVO — Esamina / Valida / Ottimizza — così l'admin vede a colpo d'occhio
 * "chi è dove". L'atto è derivato dalla fase legacy del partner via la stessa
 * macroFaseLabel usata in Pipeline Partner (canonico: F1-F2 Esamina, F3-F7
 * Valida, oltre Ottimizza). Cliccando un partner si apre la scheda sul tab
 * Journey (PercorsoEvoPanel) per gestire i 14 step.
 */
import { useEffect, useState, useCallback } from "react";
import { Search, Rocket, TrendingUp } from "lucide-react";
import { apiGet } from "../api";
import { PartnerDetailModal } from "./PartnerDetailModal";
import { attoEvo } from "../evo";

const ATTI = [
  {
    id: "Esamina",
    icon: Search,
    tagline: "Chiarisci chi sei e a chi parli",
    agent: "Valentina",
    accent: "border-sky-200",
    head: "bg-sky-50",
    headText: "text-sky-700",
  },
  {
    id: "Valida",
    icon: Rocket,
    tagline: "Costruisci e testa online in 21 giorni",
    agent: "Andrea",
    accent: "border-amber-200",
    head: "bg-amber-50",
    headText: "text-amber-700",
  },
  {
    id: "Ottimizza",
    icon: TrendingUp,
    tagline: "Diventa il riferimento in 12 mesi",
    agent: "Marco",
    accent: "border-emerald-200",
    head: "bg-emerald-50",
    headText: "text-emerald-700",
  },
];

const STATO_BADGE = {
  attivo: "bg-emerald-100 text-emerald-700",
  quarantena: "bg-red-100 text-red-700",
  ex: "bg-gray-200 text-slate-500",
};

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PartnerCard({ p, onOpen }) {
  const stato = p.stato || "attivo";
  return (
    <button
      onClick={() => onOpen(p)}
      className="w-full text-left rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-slate-900 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(p.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 truncate">{p.name || "—"}</div>
          <div className="text-xs text-slate-500 truncate">{p.niche || p.email}</div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {p.phase && (
            <span className="text-[10px] font-mono text-slate-400">{p.phase}</span>
          )}
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              STATO_BADGE[stato] || STATO_BADGE.attivo
            }`}
          >
            {stato}
          </span>
        </div>
      </div>
    </button>
  );
}

export function PercorsoEvo({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);
  const [detailPartner, setDetailPartner] = useState(null);

  const load = useCallback(() => {
    setPartners(null);
    apiGet("/partners")
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  // Gli ex partner non sono più sul percorso: esclusi dalle colonne, contati a parte.
  const attivi = partners.filter((p) => (p.stato || "attivo") !== "ex");
  const exCount = partners.length - attivi.length;

  // Partner senza fase impostata = appena onboardato → inizio percorso (Esamina).
  const byAtto = (id) => attivi.filter((p) => (attoEvo(p.phase) || "Esamina") === id);

  return (
    <>
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Percorso EVO</h1>
        <p className="text-slate-500 mb-6">
          {attivi.length} partner sul percorso, raggruppati per atto del Metodo EVO.
          Clicca un partner per gestire i 14 step.
          {exCount > 0 && (
            <span className="text-slate-400"> · {exCount} ex partner non mostrati.</span>
          )}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {ATTI.map((atto) => {
            const list = byAtto(atto.id);
            const Icon = atto.icon;
            return (
              <div
                key={atto.id}
                className={`rounded-2xl border ${atto.accent} overflow-hidden bg-white`}
              >
                <div className={`px-4 py-3 border-b border-gray-200 ${atto.head}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${atto.headText}`} />
                    <span className={`font-bold ${atto.headText}`}>{atto.id}</span>
                    <span className="ml-auto text-sm font-semibold text-slate-600">
                      {list.length}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {atto.tagline} · Agente: <strong>{atto.agent}</strong>
                  </div>
                </div>

                <div className="p-3 space-y-2 min-h-[120px]">
                  {list.length === 0 ? (
                    <p className="text-xs text-slate-400 px-1 py-6 text-center">
                      Nessun partner in questa fase.
                    </p>
                  ) : (
                    list.map((p) => (
                      <PartnerCard key={p.id || p.email} p={p} onOpen={setDetailPartner} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PartnerDetailModal
        partner={detailPartner}
        isOpen={!!detailPartner}
        initialTab="journey"
        onClose={() => setDetailPartner(null)}
        onUpdate={load}
        onDelete={() => {
          setDetailPartner(null);
          load();
        }}
        onAuthExpired={onAuthExpired}
      />
    </>
  );
}

export default PercorsoEvo;
