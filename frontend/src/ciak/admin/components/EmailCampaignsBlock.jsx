/**
 * Ciak Admin — blocco "Campagne email" per la pagina Oggi.
 *
 * Mostra le ultime campagne email con KPI (inviate, aperture %, click %, spam).
 * Dati: GET /api/admin/ciak/email-campaigns, alimentato dal task giornaliero
 * che legge le statistiche da Systeme.io (collection email_campaign_stats).
 */
import { useState, useEffect } from "react";
import { adminFetch } from "../api";

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

export default function EmailCampaignsBlock() {
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch("/api/admin/ciak/email-campaigns?limit=8");
        if (r.ok) {
          const d = await r.json();
          setCampaigns(d.items || []);
        }
      } catch {
        /* silenzioso */
      }
      setLoaded(true);
    })();
  }, []);

  // Non mostrare nulla finché non abbiamo provato a caricare (evita flash vuoto)
  if (!loaded) return null;

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-200">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Campagne email — ultime inviate
        </span>
      </div>
      <div className="p-5">
        {campaigns.length === 0 ? (
          <div className="text-sm text-slate-400">Nessuna campagna recente</div>
        ) : (
          <div className="space-y-1">
            {campaigns.map((c) => {
              const del =
                c.delivered != null
                  ? c.delivered
                  : Math.max((c.sent || 0) - (c.bounced || 0), 0);
              const apert = pct(c.opened || 0, del);
              const click = pct(c.clicked || 0, del);
              const dataInvio = c.sent_at
                ? new Date(c.sent_at).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                  })
                : "—";
              return (
                <div
                  key={c.mailing_id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate text-slate-900">
                      {c.subject || "(senza oggetto)"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {dataInvio} · {(c.sent || 0).toLocaleString("it-IT")} inviate
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <div className="font-mono font-semibold text-sm text-slate-900">
                        {apert}%
                      </div>
                      <div className="text-[10px] text-slate-400">aperture</div>
                    </div>
                    <div>
                      <div
                        className={`font-mono font-semibold text-sm ${
                          click > 0 ? "text-slate-900" : "text-red-500"
                        }`}
                      >
                        {click}%
                      </div>
                      <div className="text-[10px] text-slate-400">click</div>
                    </div>
                    {(c.spam || 0) > 0 && (
                      <div>
                        <div className="font-mono font-semibold text-sm text-red-500">
                          {c.spam}
                        </div>
                        <div className="text-[10px] text-slate-400">spam</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
