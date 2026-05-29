/**
 * Ciak Partner — Workspace.
 *
 * Consolida in un'unica area tabbed le utility trasversali del partner:
 *  - Profilo        → PartnerProfileHub
 *  - I Miei File    → PartnerFilesPage
 *  - Risultati      → F7Ottimizzazione (KPI / ottimizzazione)
 *  - Supporto Team  → StefaniaChat
 *
 * Sostituisce le 3 voci separate (Il Mio Spazio / Risultati / Supporto Team)
 * nella sidebar. Le vecchie rotte restano raggiungibili.
 */
import { useState } from "react";
import { User, FolderOpen, TrendingUp, MessageCircle } from "lucide-react";
import { PartnerProfileHub } from "./PartnerProfileHub";
import { PartnerFilesPage } from "./PartnerFilesPage";
import { StefaniaChat } from "./StefaniaChat";
import { F7Ottimizzazione } from "../phases/F7Ottimizzazione";

const TABS = [
  { id: "profilo", label: "Profilo", Icon: User },
  { id: "file", label: "I Miei File", Icon: FolderOpen },
  { id: "risultati", label: "Risultati", Icon: TrendingUp },
  { id: "supporto", label: "Supporto Team", Icon: MessageCircle },
];

export function WorkspacePage({ partnerId, initialTab = "profilo" }) {
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "profilo");
  const partner = { id: partnerId };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1 text-slate-900">Workspace</h1>
        <p className="text-sm text-slate-500 mb-6">
          Il tuo spazio: profilo, file, risultati e supporto del team.
        </p>

        {/* Tab pills */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border ${
                tab === t.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-gray-200 hover:border-slate-300"
              }`}
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "profilo" && <PartnerProfileHub partner={partner} />}
        {tab === "file" && <PartnerFilesPage partner={partner} />}
        {tab === "risultati" && <F7Ottimizzazione partnerId={partnerId} />}
        {tab === "supporto" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Supporto Team</h2>
            <p className="text-slate-500 text-sm mb-4">
              Per dubbi rapidi scrivi a Stefania. Il tuo coordinatore ti segue lungo il percorso.
            </p>
            <StefaniaChat partner={partner} />
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspacePage;
