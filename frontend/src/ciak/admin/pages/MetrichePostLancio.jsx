/**
 * Ciak Admin — KPI Partner (atto EVO Ottimizza).
 *
 * Dati REALI per partner da GET /api/partner-journey/ottimizzazione/{id}.
 * Niente più dati demo: si mostra solo ciò che il backend traccia davvero
 * (visite, contatti/lead, studenti, vendite, fatturato, conversione + la fonte),
 * e si dichiara onestamente "non ancora disponibile" dove non c'è una fonte
 * (LTV, completamento corso, churn) — stesso principio del backend
 * (academy_metrics.py restituisce {disponibile:false, motivo:"..."}).
 *
 * I KPI principali si alimentano, in ordine di priorità: KPI manuali inseribili
 * dal dettaglio partner (PartnerDetailModal → PATCH /api/partners/{id} kpi_manual),
 * dati interni (partner_visits, payments) o Systeme.io.
 *
 * Lista partner: GET /api/admin/ciak/partners (filtro atto Ottimizza via attoEvo).
 */
import { useState, useEffect } from "react";
import { Users, TrendingUp, DollarSign, Eye, MousePointerClick, ShoppingCart, Star, Info } from "lucide-react";
import { adminFetch } from "../api";
import { attoEvo } from "../evo";

const FONTE_LABEL = {
  manuale: "KPI inseriti a mano",
  interno: "Dati interni (tracking)",
  systeme: "Systeme.io live",
  nessuna: "Nessun dato ancora",
};

const fmtNum = (n) => Number(n ?? 0).toLocaleString("it-IT");
const fmtEur = (n) => "€" + Number(n ?? 0).toLocaleString("it-IT");
const fmtDate = (s) => {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return null; }
};

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">KPI Partner</h1>
      <p className="text-sm text-slate-500 mt-0.5">Metriche reali dei partner in atto Ottimizza (post-lancio).</p>
    </div>
  );
}

export function MetrichePostLancio({ partners: partnersProp, onAuthExpired }) {
  const [partners, setPartners] = useState(partnersProp || []);
  const [sel, setSel] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carica la lista partner se non passata via prop.
  useEffect(() => {
    if (partnersProp) { setPartners(partnersProp); return; }
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/ciak/partners`);
        const d = await res.json();
        setPartners(d.items || []);
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      }
    })();
  }, [partnersProp, onAuthExpired]);

  const launched = partners.filter((p) => attoEvo(p.phase) === "Ottimizza");

  // Seleziona il primo partner disponibile.
  useEffect(() => {
    if (!sel && launched.length > 0) setSel(launched[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners]);

  // Carica le metriche reali del partner selezionato.
  useEffect(() => {
    if (!sel) { setData(null); return; }
    setLoading(true);
    (async () => {
      try {
        const res = await adminFetch(`/api/partner-journey/ottimizzazione/${sel}`);
        setData(await res.json());
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [sel, onAuthExpired]);

  if (launched.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <Header />
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-lg font-semibold text-slate-700 mb-1">Nessun partner in atto Ottimizza</div>
          <div className="text-sm text-slate-400">
            Le metriche post-lancio compaiono quando un partner raggiunge l'atto Ottimizza (post-lancio).
          </div>
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {};
  const academy = data?.academy || {};
  const caso = data?.caso_studio || {};
  const fonte = kpi.fonte || academy.fonte || "nessuna";

  const cards = [
    { l: "Visite landing", v: fmtNum(kpi.visite), icon: Eye },
    { l: "Contatti / Lead", v: fmtNum(kpi.contatti), icon: MousePointerClick },
    { l: "Studenti", v: fmtNum(academy.studenti), icon: Users },
    { l: "Vendite", v: fmtNum(kpi.vendite), icon: ShoppingCart },
    { l: "Fatturato", v: fmtEur(academy.fatturato), icon: DollarSign },
    { l: "Conversione", v: `${Number(kpi.conversione ?? 0)}%`, icon: TrendingUp },
  ];

  // Metriche che il backend dichiara non ancora disponibili (onestà sui dati).
  const nonDisp = [
    ["LTV medio", academy.ltv],
    ["Completamento corso", academy.completion],
    ["Churn", academy.churn],
  ].filter(([, o]) => o && o.disponibile === false);

  return (
    <div className="p-8 space-y-6">
      <Header />

      {/* Selettore partner */}
      <div className="flex gap-2 flex-wrap">
        {launched.map((p) => (
          <button
            key={p.id}
            onClick={() => setSel(p.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              sel === p.id
                ? "bg-yellow-400 text-slate-900"
                : "bg-white border border-gray-200 text-slate-600 hover:border-yellow-300"
            }`}
          >
            {p.name} · {attoEvo(p.phase)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-slate-400">
          Caricamento metriche…
        </div>
      ) : (
        <>
          {/* Fonte dati + stato partnership */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                fonte === "nessuna" ? "bg-gray-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fonte === "nessuna" ? "bg-slate-400" : "bg-emerald-500"}`} />
              Fonte dati: {FONTE_LABEL[fonte] || fonte}
            </span>
            {kpi.aggiornato_at && <span className="text-xs text-slate-400">Aggiornato {fmtDate(kpi.aggiornato_at)}</span>}
            {data?.partnership?.stato && (
              <span className="text-xs text-slate-400">
                Partnership: {data.partnership.stato}
                {data.partnership.giorni_rimanenti != null ? ` · ${data.partnership.giorni_rimanenti}gg rimanenti` : ""}
              </span>
            )}
          </div>

          {fonte === "nessuna" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <span>
                Nessun dato ancora per questo partner. Inserisci i KPI dal dettaglio partner
                (Pipeline Partner → apri il partner → KPI: visite, lead, vendite, conversione),
                oppure arriveranno automaticamente da tracking interno / Systeme.io.
              </span>
            </div>
          )}

          {/* KPI reali */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cards.map((c) => (
              <div key={c.l} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <c.icon className="w-4 h-4 text-yellow-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.l}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Prossima azione + recensioni */}
          <div className="grid md:grid-cols-2 gap-4">
            {data?.prossima_azione && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Prossima azione consigliata
                </div>
                <div className="text-sm text-slate-700">{data.prossima_azione}</div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recensioni raccolte</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{fmtNum(caso.recensioni)}</div>
            </div>
          </div>

          {/* Metriche non ancora disponibili (onestà sui dati) */}
          {nonDisp.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Non ancora disponibili
              </div>
              <div className="space-y-2">
                {nonDisp.map(([label, o]) => (
                  <div key={label} className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-slate-600 w-44 flex-shrink-0">{label}</span>
                    <span className="text-slate-400">{o.motivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MetrichePostLancio;
