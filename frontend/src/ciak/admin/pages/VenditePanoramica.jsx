/**
 * Reparto Vendite — Panoramica.
 *
 * La home "capire al volo" del reparto: north-star (Partnership firmate del mese),
 * la spina commerciale (pronto → Partnership · non pronto → Ciak Start), la catena
 * call → proposta → firma → pagato con l'anello debole, i recuperi, il ritmo,
 * l'handoff a Delivery. Il reparto inizia a "call prenotata" (caldo da Acquisizione
 * col Report Carlo) e finisce a firmato + pagato + consegnato.
 *
 * Speculare a AcquisizionePanoramica. Riusa `/acquisizione-command-center` (fonte
 * unica dei numeri, già calcolati): finché non esiste un vendite-command-center
 * dedicato, i campi funnel/target/priorities sono quelli condivisi col reparto.
 *
 * In cima: sotto-nav a tab verso le sotto-pagine del reparto.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Gauge, Target, Handshake, AlertTriangle, TrendingUp, Route,
} from "lucide-react";
import { apiGet } from "../api";
import { VenditeSubNav } from "../components/VenditeSubNav";

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

// La catena della vendita: dove i soldi si bloccano tra la call prenotata e il
// pagamento. L'anello con la conversione peggiore è il collo di bottiglia.
function SalesChain({ funnel }) {
  const steps = [
    { name: "Call prenotata", value: funnel.call_booked, sub: "da Acquisizione" },
    { name: "Call fatta", value: funnel.call_done, sub: "consegna Report" },
    { name: "Proposta", value: funnel.proposals_open, sub: "inviata" },
    { name: "Pagato", value: funnel.contracts_paid, sub: "firmato + saldato" },
  ];
  const convs = steps.slice(1).map((s, i) => pct(s.value, steps[i].value));
  const worst = convs.length ? convs.indexOf(Math.min(...convs)) : -1;

  return (
    <div className="flex flex-wrap items-stretch gap-y-3">
      {steps.map((s, i) => (
        <div key={s.name} className="flex items-stretch">
          <div className="px-3">
            <div className="text-3xl font-semibold text-slate-900 leading-none">{s.value ?? 0}</div>
            <div className="text-[13px] font-medium text-slate-700 mt-1">{s.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center justify-center px-2 min-w-[64px]">
              <span className={`text-xs font-semibold ${worst === i ? "text-red-600" : "text-slate-600"}`}>
                {convs[i]}%
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 mt-0.5" />
              {worst === i && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 mt-1">
                  collo
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function VenditePanoramica({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/acquisizione-command-center")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const acquistatoSenzaCall = useMemo(
    () => (Array.isArray(data?.priorities?.purchased_no_call) ? data.priorities.purchased_no_call : []),
    [data]
  );

  if (error) return <div className="p-8"><VenditeSubNav active="Home" /><p className="text-slate-600 mt-6">Errore: {error}</p></div>;
  if (!data) return <div className="p-8"><VenditeSubNav active="Home" /><p className="text-slate-400 mt-6">Caricamento panoramica...</p></div>;

  const target = data.target || {};
  const funnel = data.funnel || {};
  const bottlenecks = Array.isArray(data.bottlenecks) ? data.bottlenecks : [];

  const firmateMese = target.partnerships_closed ?? 0;
  const gap = target.gap ?? 0;

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <VenditeSubNav active="Home" />

      {/* HERO + north-star */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Reparto · Gaia</p>
          <h1 className="text-3xl font-semibold mt-1">Vendite</h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Da "call prenotata" (caldo da Acquisizione col Report Carlo) fino al partner
            firmato, pagato e consegnato a Delivery. Chiude di fatto Claudio.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.06] border border-white/10 px-5 py-4 min-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">Partnership firmate · mese</p>
          <p className="text-4xl font-bold mt-1 leading-none">{firmateMese}</p>
          <p className="text-xs text-slate-400 mt-2">
            target 3 min · 4 ottimale · {gap > 0 ? `${gap} ancora al target` : "target raggiunto"}
          </p>
        </div>
      </div>

      {/* SPINA COMMERCIALE — la regola che evita gli insoluti del passato */}
      <div className="bg-white border border-yellow-300 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">La regola d'ingaggio</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Lo instradamento nasce dal questionario ed emerge nel Blueprint. Decide l'offerta e i termini.
        </p>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Pronto</p>
            <p className="text-base font-semibold text-slate-900 mt-1">Partnership Evolution</p>
            <p className="text-[13px] text-slate-600 mt-1">Pagamento unico o <b>massimo 3 rate</b>. Mai rate lunghe: sono ciò che ha generato gli insoluti.</p>
          </div>
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-700">Non pronto</p>
            <p className="text-base font-semibold text-slate-900 mt-1">Ciak Start €390</p>
            <p className="text-[13px] text-slate-600 mt-1">Il gradino per chi non è ancora pronto — vale come credito verso la Partnership.</p>
          </div>
        </div>
      </div>

      {/* LA CATENA DELLA VENDITA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">La catena della vendita</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Dove crolla la conversione questo mese: è l'anello da lavorare.</p>
        <div className="mt-5">
          <SalesChain funnel={funnel} />
        </div>
        <p className="text-[12px] text-slate-400 mt-4">
          Le trattative aperte, stadio per stadio, sono nel board <Link to="/admin/trattative" className="text-blue-700 font-medium">Pipeline</Link>.
        </p>
      </div>

      {/* RECUPERI */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-yellow-300 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-yellow-600" />
              <h3 className="text-base font-semibold text-slate-900">Ha comprato, call non fatta</h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">Hanno già dato fiducia (e soldi): la call è il passo che chiude.</p>
          </div>
          {acquistatoSenzaCall.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Nessuno fermo con acquisto senza call.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {acquistatoSenzaCall.map((item) => (
                <Link
                  key={item.email}
                  to={`/admin/leads/${encodeURIComponent(item.email)}`}
                  className="group flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{item.nome || item.email}</p>
                    <p className="text-xs text-slate-500 truncate">{item.email}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                    Apri <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-semibold text-slate-900">Colli di bottiglia</h3>
          </div>
          {bottlenecks.length === 0 ? (
            <p className="text-sm text-emerald-600 mt-4">Nessun collo di bottiglia critico.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {bottlenecks.map((b) => (
                <div key={b.title} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{b.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RITMO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Ritmo call → firma</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Se le call si accumulano senza diventare firme, il collo è nella chiusura.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { k: "Call fatte", v: funnel.call_done ?? 0, h: "questo mese" },
            { k: "Proposte", v: funnel.proposals_open ?? 0, h: "inviate" },
            { k: "Pagati", v: funnel.contracts_paid ?? 0, h: "firmato + saldato" },
            { k: "Firme / target", v: `${firmateMese} / ${firmateMese + gap}`, h: "partnership del mese" },
          ].map((m) => (
            <div key={m.k} className="rounded-xl bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{m.k}</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{m.v}</div>
              <div className="text-[11px] text-slate-400 mt-1">{m.h}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HANDOFF a Delivery */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Handshake className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="font-semibold">Consegnato a Delivery</p>
            <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Partner firmati e pagati, pronti per la messa online. Da qui in poi è Delivery (Simona).
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-400 leading-none">{firmateMese}</div>
          <div className="text-xs text-slate-400 mt-1">chiusi questo mese</div>
        </div>
      </div>
    </div>
  );
}

export default VenditePanoramica;
