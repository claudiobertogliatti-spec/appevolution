import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { adminFetch, apiGet, apiPost } from "../api";

export const formatCents = (cents) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(cents || 0) / 100);

export function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

const dayLabel = (iso) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) : "—");
const payByLabel = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });
const currentMonth = () => new Date().toISOString().slice(0, 7);

const TILES = [
  ["call_fatta", "Call fatte"],
  ["start", "Esiti Start"],
  ["partnership", "Esiti Partnership"],
  ["upgrade", "Upgrade"],
];

export function GettoniMariangela({ onAuthExpired }) {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await apiGet("/collaboratori/mariangela/gettoni", { month }));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    }
  }, [month, onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  const attribute = async (email) => {
    setBusy(email);
    try {
      await apiPost("/collaboratori/mariangela/attribuzioni", { email, nota: "Attribuzione manuale da Back office" });
      toast.success("Lead attribuito a Mariangela");
      await load();
    } catch (e) {
      toast.error("Attribuzione non riuscita: " + e.message);
    } finally { setBusy(""); }
  };

  const remove = async (email) => {
    setBusy(email);
    try {
      const res = await adminFetch(`/api/admin/ciak/collaboratori/mariangela/attribuzioni/${encodeURIComponent(email)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      toast.success("Attribuzione rimossa");
      await load();
    } catch (e) {
      toast.error("Rimozione non riuscita: " + e.message);
    } finally { setBusy(""); }
  };

  if (error) return <p className="mt-6 text-sm text-red-600">Gettoni non disponibili: {error}</p>;
  if (!data) return <p className="mt-6 text-sm text-slate-400">Caricamento gettoni...</p>;

  const rates = data.rates.importi_cents;
  return (
    <section className="mt-6 space-y-6" aria-label="Gettoni di Mariangela">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Mese precedente" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <h2 className="min-w-40 text-center text-lg font-semibold capitalize text-slate-900">{monthLabel(month)}</h2>
            <button type="button" aria-label="Mese successivo" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= currentMonth()} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="mt-3 text-sm text-slate-500">Da pagare entro il <strong className="text-slate-900">{payByLabel(data.pay_by)}</strong>, sul fatturato incassato.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Gettoni maturati</p>
          <p className="text-4xl font-semibold text-slate-900">{formatCents(data.total_cents)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatCents(data.totals_cents[key])}</p>
            <p className="mt-1 text-xs text-slate-500">{formatCents(rates[key])} ciascuno</p>
          </div>
        ))}
      </div>

      {data.to_verify.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Call fatte senza attribuzione: spettano a Mariangela?</p>
          <p className="mt-1 text-xs text-amber-700">Non entrano nel totale finché non le attribuisci. Il link con <code>utm_source=mariangela</code> le attribuisce da solo.</p>
          <ul className="mt-3 divide-y divide-amber-200">
            {data.to_verify.map((l) => (
              <li key={l.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-800">{l.nome} <span className="text-slate-500">· {l.email} · {dayLabel(l.data)}</span></span>
                <button type="button" disabled={busy === l.email} onClick={() => attribute(l.email)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-yellow-400 disabled:opacity-50">Attribuisci a Mariangela</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">Dettaglio del mese</div>
        {data.events.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Nessun gettone maturato in questo mese.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <tr><th className="px-5 py-2">Data</th><th className="px-5 py-2">Lead</th><th className="px-5 py-2">Evento</th><th className="px-5 py-2">Attribuzione</th><th className="px-5 py-2 text-right">Gettone</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.events.map((e, i) => (
                  <tr key={`${e.email}-${e.tipo}-${i}`}>
                    <td className="px-5 py-3 text-slate-500">{dayLabel(e.data)}</td>
                    <td className="px-5 py-3 text-slate-900">{e.nome}<span className="block text-xs text-slate-500">{e.email}</span></td>
                    <td className="px-5 py-3 text-slate-700">{e.etichetta}</td>
                    <td className="px-5 py-3 text-slate-500">{e.attribuzione === "manuale" ? "Manuale" : "Link"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCents(e.importo_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.attributions_manual.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Lead attribuiti a mano</p>
          <ul className="mt-2 divide-y divide-slate-100">
            {data.attributions_manual.map((email) => (
              <li key={email} className="flex items-center justify-between py-2 text-sm text-slate-700">
                {email}
                <button type="button" disabled={busy === email} onClick={() => remove(email)} className="text-xs font-semibold text-slate-500 underline disabled:opacity-50">Rimuovi</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Regole in vigore dal {payByLabel(data.rates.valido_dal)}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Il gettone sulla call vale solo per la call <strong>fatta</strong> (presentata). Una call solo fissata non dà nulla.</li>
          <li>Start {formatCents(rates.start)} · Partnership {formatCents(rates.partnership)} · Upgrade Start→Partnership {formatCents(rates.upgrade)} (Start + upgrade = Partnership piena).</li>
          <li>Si maturano solo su lead attribuiti a Mariangela e su incassi veri.</li>
        </ul>
        <p className="mt-3 text-xs text-amber-700">Fonte: {data.rates.fonte} Verifica l&apos;Allegato firmato prima di pagare.</p>
      </div>
    </section>
  );
}

export default GettoniMariangela;
