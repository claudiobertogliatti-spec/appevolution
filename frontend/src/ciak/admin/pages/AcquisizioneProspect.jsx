/**
 * Reparto Acquisizione — Prospect (ACQUISIZIONE contatti, "la fabbrica").
 *
 * Una schermata, azione primaria = Ricerca lead. Qui si FANNO ENTRARE i contatti
 * (ricerca Google Places, aggiungi a mano, importa CSV); la lista e la gestione
 * stanno in Pipeline. Riusa gli endpoint discovery esistenti.
 */
import { useEffect, useState } from "react";
import { Search, UserPlus, Upload, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiGet, adminFetch } from "../api";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

async function postJson(path, body) {
  const r = await adminFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export function AcquisizioneProspect({ onAuthExpired }) {
  const [ritmo, setRitmo] = useState({ oggi: 0, target: 20 });
  // Ricerca lead
  const [q, setQ] = useState({ profession: "", city: "", all_italy: false, only_with_website: false, max_results: 50 });
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState(null);
  // Aggiungi a mano
  const [showAdd, setShowAdd] = useState(false);
  const [lead, setLead] = useState({ display_name: "", email: "", phone: "", website_url: "", niche_detected: "", bio: "" });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState(null);
  // Importa
  const [importMsg, setImportMsg] = useState(null);
  const [importing, setImporting] = useState(false);

  const guard = (e) => { if (e?.message === "AUTH_EXPIRED") onAuthExpired?.(); };

  useEffect(() => {
    apiGet("/acquisizione-command-center")
      .then((r) => {
        const a = r.activity_today || {};
        setRitmo({ oggi: a.new_leads || 0, target: a.target_new_contacts || r.routine?.daily_new_contacts || 20 });
      })
      .catch(guard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async () => {
    if (searching || !q.profession.trim() || !q.city.trim()) return;
    setSearching(true); setSearchMsg(null);
    try {
      const { ok, data } = await postJson("/api/discovery/search-places", {
        profession: q.profession.trim(), city: q.city.trim(),
        max_results: Number(q.max_results) || 50, all_italy: q.all_italy, only_with_website: q.only_with_website,
      });
      if (!ok) { setSearchMsg({ err: true, text: data.detail || "Errore nella ricerca." }); return; }
      const imp = data.imported ?? data.total_imported ?? data.new ?? 0;
      const skip = data.skipped ?? data.total_skipped ?? 0;
      const hot = data.hot ?? data.total_hot ?? 0;
      setSearchMsg({ err: false, text: `Trovati e aggiunti ${imp} professionisti${skip ? ` (${skip} già presenti)` : ""}${hot ? ` · ${hot} caldi` : ""}. Lavorali in Pipeline.` });
    } catch (e) { guard(e); setSearchMsg({ err: true, text: "Errore di rete." }); }
    finally { setSearching(false); }
  };

  const addLead = async () => {
    if (adding || !lead.email.trim()) return;
    setAdding(true); setAddMsg(null);
    try {
      const { ok, data } = await postJson("/api/discovery/import", {
        leads: [{ ...lead, source: "manual" }], auto_score: false,
      });
      if (!ok) { setAddMsg({ err: true, text: data.detail || "Errore." }); return; }
      setAddMsg({ err: false, text: "Contatto aggiunto. Lo trovi in Pipeline." });
      setLead({ display_name: "", email: "", phone: "", website_url: "", niche_detected: "", bio: "" });
    } catch (e) { guard(e); setAddMsg({ err: true, text: "Errore di rete." }); }
    finally { setAdding(false); }
  };

  const importCsv = async (file) => {
    if (!file || importing) return;
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await adminFetch("/api/discovery/import-csv", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setImportMsg({ err: true, text: data.detail || "Errore import." }); return; }
      const imp = data.imported ?? data.total_imported ?? 0;
      setImportMsg({ err: false, text: `Importati ${imp} contatti. Li lavori in Pipeline.` });
    } catch (e) { guard(e); setImportMsg({ err: true, text: "Errore di rete." }); }
    finally { setImporting(false); }
  };

  const input = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400";
  const Msg = ({ m }) => m ? (
    <div className={`mt-3 text-sm flex items-center gap-2 ${m.err ? "text-red-600" : "text-emerald-600"}`}>
      {!m.err && <CheckCircle2 className="w-4 h-4" />}{m.text}
    </div>
  ) : null;

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-4xl">
      <AcquisizioneSubNav active="Prospect" />

      <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center gap-5 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">Ritmo di oggi</div>
          <div className="text-2xl font-bold leading-none mt-1">{ritmo.oggi} / {ritmo.target}</div>
        </div>
        <div className="flex-1 min-w-[140px] h-2 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-yellow-400" style={{ width: `${Math.min(100, Math.round((ritmo.oggi / (ritmo.target || 1)) * 100))}%` }} />
        </div>
        <div className="text-xs text-slate-400">nuovi contatti mirati</div>
      </div>

      {/* RICERCA LEAD — azione primaria */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Trova nuovi contatti</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Cerca professionisti reali per professione e zona (Google Places).</p>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <input className={input} placeholder="Professione — es. business coach" value={q.profession} onChange={(e) => setQ({ ...q, profession: e.target.value })} />
          <input className={input} placeholder="Città — es. Milano" value={q.city} onChange={(e) => setQ({ ...q, city: e.target.value })} disabled={q.all_italy} />
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          <button type="button" onClick={() => setQ({ ...q, all_italy: !q.all_italy })}
            className={`text-[12.5px] rounded-full px-3.5 py-1.5 border transition ${q.all_italy ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold" : "bg-white border-slate-200 text-slate-600"}`}>Tutta Italia</button>
          <button type="button" onClick={() => setQ({ ...q, only_with_website: !q.only_with_website })}
            className={`text-[12.5px] rounded-full px-3.5 py-1.5 border transition ${q.only_with_website ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold" : "bg-white border-slate-200 text-slate-600"}`}>Solo con sito web</button>
          <select className="text-[12.5px] rounded-full px-3 py-1.5 border border-slate-200 text-slate-600" value={q.max_results} onChange={(e) => setQ({ ...q, max_results: e.target.value })}>
            <option value={20}>Max 20</option><option value={50}>Max 50</option><option value={100}>Max 100</option>
          </select>
        </div>
        <div className="mt-4">
          <button onClick={runSearch} disabled={searching || !q.profession.trim() || (!q.city.trim() && !q.all_italy)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-5 py-2.5 hover:bg-yellow-300 transition disabled:opacity-50">
            <Search className="w-4 h-4" /> {searching ? "Cerco…" : "Cerca professionisti"}
          </button>
        </div>
        <Msg m={searchMsg} />
      </div>

      {/* AGGIUNGI A MANO + IMPORTA */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-yellow-600" />
            <h3 className="text-base font-semibold text-slate-900">Aggiungi a mano</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">Un singolo contatto (referral, DM, incontro).</p>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition">＋ Aggiungi un contatto</button>
          ) : (
            <div className="mt-3 space-y-2">
              <input className={input} placeholder="Nome" value={lead.display_name} onChange={(e) => setLead({ ...lead, display_name: e.target.value })} />
              <input className={input} placeholder="Email *" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className={input} placeholder="Telefono" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
                <input className={input} placeholder="Nicchia" value={lead.niche_detected} onChange={(e) => setLead({ ...lead, niche_detected: e.target.value })} />
              </div>
              <input className={input} placeholder="Sito web" value={lead.website_url} onChange={(e) => setLead({ ...lead, website_url: e.target.value })} />
              <div className="flex gap-2 pt-1">
                <button onClick={addLead} disabled={adding || !lead.email.trim()} className="text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-4 py-2 hover:bg-yellow-300 transition disabled:opacity-50">{adding ? "Salvo…" : "Salva"}</button>
                <button onClick={() => setShowAdd(false)} className="text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition">Chiudi</button>
              </div>
            </div>
          )}
          <Msg m={addMsg} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-yellow-600" />
            <h3 className="text-base font-semibold text-slate-900">Importa liste</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">Carichi un CSV → i contatti entrano pronti da lavorare.</p>
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition cursor-pointer">
            {importing ? "Importo…" : "Carica un CSV"}
            <input type="file" accept=".csv" className="hidden" disabled={importing} onChange={(e) => importCsv(e.target.files?.[0])} />
          </label>
          <p className="text-[11px] text-slate-400 mt-2">Colonne: display_name, email, source, platform_username, bio, website_url, niche_detected.</p>
          <p className="text-[11px] text-slate-400 mt-1">Import da liste esistenti (13k / Lista Fredda / Systeme): in arrivo.</p>
          <Msg m={importMsg} />
        </div>
      </div>

      <div className="text-center text-[12.5px] text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-3">
        I contatti aggiunti qui si <span className="font-semibold">lavorano in Pipeline</span> <ArrowRight className="w-3.5 h-3.5 inline -mt-0.5" /> (stato, priorità, contatto e invii).
      </div>
    </div>
  );
}

export default AcquisizioneProspect;
