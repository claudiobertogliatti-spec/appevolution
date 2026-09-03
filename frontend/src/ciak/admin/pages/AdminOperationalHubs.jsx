import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Megaphone,
  PlayCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiGet } from "../api";
import { attoEvo } from "../evo";
import { PageHeader } from "../components/ui/PageHeader";

function euro(v) {
  if (v == null || v === "" || Number(v) === 0) return "-";
  return `EUR ${Number(v).toLocaleString("it-IT")}`;
}

function fmtDate(s) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(s);
  }
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}


function ActionCard({ to, title, desc, icon: Icon }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 inline-flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-slate-900 group-hover:text-blue-700">{title}</span>
          <span className="block text-sm text-slate-500 leading-snug mt-1">{desc}</span>
        </span>
      </div>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
        Apri <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
}

function OperationalHub({ eyebrow, title, subtitle, icon, cards }) {
  return (
    <div className="p-8">
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card) => (
          <ActionCard key={card.to + card.title} {...card} />
        ))}
      </div>
    </div>
  );
}

export function AcquisizioneCalendarioHub() {
  return (
    <OperationalHub
      eyebrow="Acquisizione"
      title="Calendario Editoriale"
      subtitle="Regia contenuti e traffico per Acquisizione Evolution: organico, paid, nuovi lead e archivio lista fredda congelato."
      icon={CalendarDays}
      cards={[
        { to: "/admin/acq-campagne-ads", title: "Campagne Ads", desc: "Creativita, hook e traffico paid.", icon: Megaphone },
        { to: "/admin/lista-fredda", title: "Lista Fredda", desc: "Archivio congelato: custom audience Meta, analisi segmenti e studio mercato.", icon: Users },
        { to: "/admin/lead-manager", title: "New Lead", desc: "Inserimento e lavorazione nuovi contatti.", icon: ClipboardCheck },
        { to: "/admin/pipeline", title: "Acquisizione Evolution", desc: "Blueprint, call, recuperi e checkpoint del progetto pilota madre.", icon: TrendingUp },
        { to: "/admin/template-email", title: "Template Email", desc: "Copy email modificabile senza deploy.", icon: FileText },
      ]}
    />
  );
}

export function DeliveryMasterclassHub() {
  return (
    <OperationalHub
      eyebrow="Delivery"
      title="Masterclass"
      subtitle="Controllo produzione masterclass: materiale partner, revisione testi, montaggio e approvazione finale."
      icon={PlayCircle}
      cards={[
        { to: "/admin/documenti-partner", title: "File partner", desc: "Materiali caricati e approvazioni documenti.", icon: FileText },
        { to: "/admin/video-pipeline", title: "Monitor pipeline", desc: "Job video, errori, riavvii e stato elaborazione.", icon: TrendingUp },
        { to: "/admin/video-review", title: "Approvazione video", desc: "Video pronti da controllare e pubblicare.", icon: PlayCircle },
        { to: "/admin/partner", title: "Pipeline Partner", desc: "Apri scheda e journey del partner.", icon: Users },
      ]}
    />
  );
}

export function DeliveryLezioniHub() {
  return (
    <OperationalHub
      eyebrow="Delivery"
      title="Video Lezioni"
      subtitle="Produzione lezioni videocorso: monitor job, riavvio pipeline, revisione e approvazione dei video."
      icon={PlayCircle}
      cards={[
        { to: "/admin/video-pipeline", title: "Monitor pipeline", desc: "Stato lavorazioni e retry per le lezioni.", icon: TrendingUp },
        { to: "/admin/video-review", title: "Approvazione video", desc: "Lezioni pronte per revisione finale.", icon: PlayCircle },
        { to: "/admin/partner", title: "Scheda partner", desc: "Journey, corso, materiali e note operative.", icon: Users },
      ]}
    />
  );
}

export function TrattativeKoHub() {
  return (
    <OperationalHub
      eyebrow="Vendite"
      title="Trattative KO"
      subtitle="Il backend oggi non ha uno stadio KO separato: per non perdere contesto, questa vista porta alle liste dove si intercettano recuperi e decisioni."
      icon={TrendingUp}
      cards={[
        { to: "/admin/vendite-call", title: "Call di vendita", desc: "Call prenotate o fatte da qualificare.", icon: Users },
        { to: "/admin/vendite-trattativa", title: "In trattativa", desc: "Proposte inviate, viste o accettate.", icon: TrendingUp },
        { to: "/admin/clienti-ciak", title: "Clienti Ciak", desc: "Blueprint, Start e upgrade Partnership.", icon: ClipboardCheck },
        { to: "/admin/leads", title: "Archivio lead", desc: "Storico contatti e dettaglio diagnostico.", icon: FileText },
      ]}
    />
  );
}

export function CasiStudio({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/partners")
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const candidates = useMemo(() => {
    return (partners || [])
      .filter((p) => (p.stato || "attivo") === "attivo")
      .filter((p) => attoEvo(p.phase) === "Ottimizza" || Number(p.revenue || 0) > 0)
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
  }, [partners]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;

  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Casi studio"
        title="Candidati casi studio"
        subtitle="Partner in Ottimizza o con revenue tracciata: da qui passi a KPI e scheda partner per validare il caso."
        icon={ClipboardCheck}
      />
      {!partners ? (
        <div className="text-slate-400">Caricamento...</div>
      ) : candidates.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun candidato pronto.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Atto</th>
                <th className="px-5 py-3 font-semibold">Revenue</th>
                <th className="px-5 py-3 font-semibold text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((p) => (
                <tr key={p.id || p.email} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold">
                        {initials(p.name)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{p.name || "-"}</div>
                        <div className="text-xs text-slate-500">{p.niche || p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{attoEvo(p.phase) || "-"}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{euro(p.revenue)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to="/admin/metriche" className="text-xs font-semibold text-blue-700 hover:text-blue-800 mr-4">
                      KPI
                    </Link>
                    <Link to="/admin/partner" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                      Partner
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DateContratti({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/partners")
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const rows = useMemo(() => {
    return (partners || [])
      .filter((p) => p.contract || p.contract_signed || p.contratto_firmato_at || p.pagamento_completato_at)
      .sort((a, b) =>
        String(b.contratto_firmato_at || b.pagamento_completato_at || b.created_at || "").localeCompare(
          String(a.contratto_firmato_at || a.pagamento_completato_at || a.created_at || "")
        )
      );
  }, [partners]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;

  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Back office"
        title="Date contratti"
        subtitle="Registro operativo dei partner con contratto o pagamento collegato."
        icon={CalendarDays}
      />
      {!partners ? (
        <div className="text-slate-400">Caricamento...</div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun contratto tracciato.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Contratto</th>
                <th className="px-5 py-3 font-semibold">Pagamento</th>
                <th className="px-5 py-3 font-semibold">Piano</th>
                <th className="px-5 py-3 font-semibold text-right">Scheda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id || p.email} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{p.name || "-"}</div>
                    <div className="text-xs text-slate-500">{p.email || "-"}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {p.contract_signed ? "Firmato" : p.contract || "-"}
                    <div className="text-xs text-slate-400">{fmtDate(p.contratto_firmato_at)}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{fmtDate(p.pagamento_completato_at || p.pagato_at)}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {p.piano_pagamento
                      ? `${p.piano_pagamento.rate_pagate || 0}/${p.piano_pagamento.rate_totali || 0} rate`
                      : "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to="/admin/partner" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                      Apri partner
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
