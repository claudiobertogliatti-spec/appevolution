/**
 * Reparto Delivery — Panoramica.
 *
 * La home "capire al volo" del reparto: quanti partner in produzione e online,
 * la catena EVO (Esamina → Valida → Ottimizza → Online), i recuperi (fermi,
 * output da approvare, materiali mancanti), i prossimi live, l'handoff alla
 * continuità (EVO-S). Il reparto riceve il partner firmato+pagato e lo porta LIVE.
 *
 * Speculare a VenditePanoramica. Dati reali dagli endpoint esistenti:
 *  - GET /delivery-audit        → una riga per partner attivo + counters
 *  - GET /partner-sales-engine  → prossima_live_at (calendario lanci)
 * Responsabile = Simona.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Rocket, Gauge, AlertTriangle, ClipboardCheck, CalendarClock, Handshake,
} from "lucide-react";
import { apiGet } from "../api";
import { DeliverySubNav } from "../components/DeliverySubNav";

const ATTI = [
  { key: "esamina", label: "Esamina" },
  { key: "valida", label: "Valida" },
  { key: "ottimizza", label: "Ottimizza" },
];

function fmtData(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export function DeliveryPanoramica({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [pse, setPse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/delivery-audit")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
    // Secondario (prossimi live): se fallisce non blocca la home.
    apiGet("/partner-sales-engine").then(setPse).catch(() => {});
  }, [onAuthExpired]);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const counters = data?.counters || {};

  const perAtto = useMemo(() => {
    const c = { esamina: 0, valida: 0, ottimizza: 0 };
    items.forEach((i) => { if (c[i.macro_phase] != null) c[i.macro_phase] += 1; });
    return c;
  }, [items]);
  const online = useMemo(() => items.filter((i) => i.phase === "LIVE").length, [items]);

  const fermi = useMemo(() => items.filter((i) => i.blocked || i.stale), [items]);
  const serveClaudio = useMemo(() => items.filter((i) => i.owner === "Team/Claudio"), [items]);
  const materialiMancanti = useMemo(
    () => items.filter((i) => (i.asset_mancanti?.length || 0) > 0).length,
    [items]
  );

  const prossimiLive = useMemo(() => {
    const list = Array.isArray(pse?.items) ? pse.items : [];
    return list
      .map((p) => ({ name: p.name, at: p.ottimizza?.prossima_live_at, weeks: p.ottimizza?.settimane_alla_live }))
      .filter((p) => p.at)
      .sort((a, b) => String(a.at).localeCompare(String(b.at)))
      .slice(0, 6);
  }, [pse]);

  if (error) return <div className="p-8"><DeliverySubNav active="Home" /><p className="text-slate-600 mt-6">Errore: {error}</p></div>;
  if (!data) return <div className="p-8"><DeliverySubNav active="Home" /><p className="text-slate-400 mt-6">Caricamento panoramica...</p></div>;

  const totale = data.total ?? items.length;

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <DeliverySubNav active="Home" />

      {/* HERO + north-star */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Reparto · Simona</p>
          <h1 className="text-3xl font-semibold mt-1">Delivery</h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Dal partner firmato e pagato fino alla messa online, fase per fase del Metodo EVO.
            Poi subentra la continuità (EVO-S).
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.06] border border-white/10 px-5 py-4 min-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">Partner in produzione</p>
          <p className="text-4xl font-bold mt-1 leading-none">{totale}</p>
          <p className="text-xs text-slate-400 mt-2">
            {online} online · {fermi.length} fermi da sbloccare
          </p>
        </div>
      </div>

      {/* CATENA DI PRODUZIONE EVO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">La catena di produzione</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Dove sono i partner nel Metodo EVO. L'atto più affollato è dove si accumula il lavoro.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {ATTI.map((a) => (
            <div key={a.key} className="rounded-xl bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{a.label}</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{perAtto[a.key] ?? 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">partner in fase</div>
            </div>
          ))}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Online</div>
            <div className="text-2xl font-semibold text-emerald-700 mt-1">{online}</div>
            <div className="text-[11px] text-slate-400 mt-1">già live</div>
          </div>
        </div>
        <p className="text-[12px] text-slate-400 mt-4">
          Il dettaglio fase per fase è nell'<Link to="/admin/delivery-audit" className="text-blue-700 font-medium">Audit</Link> e nella <Link to="/admin/partner" className="text-blue-700 font-medium">pipeline Partner</Link>.
        </p>
      </div>

      {/* RECUPERI / DA LAVORARE OGGI */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-yellow-300 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="text-base font-semibold text-slate-900">Partner fermi</h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">Bloccati o fermi oltre soglia: ogni giorno fermo allontana il lancio.</p>
          </div>
          {fermi.length === 0 ? (
            <div className="p-5 text-sm text-emerald-600">Nessun partner fermo. La produzione scorre.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {fermi.slice(0, 8).map((p) => (
                <Link key={p.id} to="/admin/partner"
                  className="group flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{p.name || "—"}</p>
                    <p className="text-xs text-slate-500 truncate">{p.next_action || p.current_step || p.phase}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                    Apri <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-semibold text-slate-900">Output da approvare</h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">Aspettano il tuo via: sbloccarli fa ripartire il partner.</p>
          </div>
          {serveClaudio.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Niente in attesa di approvazione.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {serveClaudio.slice(0, 8).map((p) => (
                <Link key={p.id} to="/admin/partner"
                  className="group flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{p.name || "—"}</p>
                    <p className="text-xs text-slate-500 truncate">{p.current_step || p.next_action || p.phase}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                    Apri <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLLI DI BOTTIGLIA (counters) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900">Dove si inceppa la produzione</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { k: "Materiali mancanti", v: materialiMancanti, h: "asset da caricare" },
            { k: "Offerta mancante", v: counters.offerta_mancante ?? 0, h: "senza offerta definita" },
            { k: "Videocorso a zero", v: counters.videocorso_zero ?? 0, h: "nessuna lezione" },
            { k: "Funnel mancante", v: counters.funnel_mancante ?? 0, h: "non ancora online" },
          ].map((m) => (
            <div key={m.k} className="rounded-xl bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{m.k}</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{m.v}</div>
              <div className="text-[11px] text-slate-400 mt-1">{m.h}</div>
            </div>
          ))}
        </div>
        {counters.incoerenze > 0 && (
          <p className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            {counters.incoerenze} incoerenze tra fase dichiarata e materiali reali — da allineare nell'Audit.
          </p>
        )}
      </div>

      {/* PROSSIMI LIVE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Prossimi live</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">I lanci in calendario. Portarli online è il traguardo del reparto.</p>
        {prossimiLive.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Nessun live in calendario. Dettaglio nel <Link to="/admin/motore-vendite-partner" className="text-blue-700 font-medium">Motore Vendite Partner</Link>.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {prossimiLive.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-bold tabular-nums text-slate-900 w-14 flex-shrink-0">{fmtData(p.at)}</span>
                  <p className="font-semibold text-slate-900 truncate">{p.name || "—"}</p>
                </div>
                {p.weeks != null && <span className="text-xs text-slate-400 whitespace-nowrap">tra {p.weeks} sett.</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HANDOFF alla continuità */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Handshake className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="font-semibold">Dopo il lancio → continuità</p>
            <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Partner online e stabili passano alla gestione continuativa EVO-S (dal mese 10-12). Da lì è Back office.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-400 leading-none">{online}</div>
          <div className="text-xs text-slate-400 mt-1">già online</div>
        </div>
      </div>
    </div>
  );
}

export default DeliveryPanoramica;
