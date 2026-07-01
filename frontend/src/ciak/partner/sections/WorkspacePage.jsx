/**
 * Ciak Partner — Workspace.
 *
 * Spazio del partner allineato al Metodo EVO. Quattro sezioni top-level:
 *  - Identità       → PartnerProfileHub (section="identity")
 *  - Brand Kit      → PartnerProfileHub (section="brand")
 *  - Posizionamento → PartnerProfileHub (section="positioning")
 *  - Risultati      → F7Ottimizzazione (KPI / ottimizzazione)
 *  - I Miei File    → PartnerFilesPage (upload / archivio file del percorso)
 *
 * Il Supporto Team (chat Stefania) NON è qui: vive come ultima voce della
 * sidebar nera (PartnerSidebar → /partner/supporto), perché è trasversale a
 * tutto il percorso, non una sezione del workspace.
 */
import { useState } from "react";
import { User, Palette, Target, TrendingUp, FolderOpen } from "lucide-react";
import { PartnerProfileHub } from "./PartnerProfileHub";
import { PartnerFilesPage } from "./PartnerFilesPage";
import { F7Ottimizzazione } from "../phases/F7Ottimizzazione";

const TABS = [
  { id: "identity", label: "Identità", Icon: User },
  { id: "brand", label: "Brand Kit", Icon: Palette },
  { id: "positioning", label: "Posizionamento", Icon: Target },
  { id: "risultati", label: "Risultati", Icon: TrendingUp },
  { id: "file", label: "Materiali", Icon: FolderOpen },
];

export function WorkspacePage({ partnerId, initialTab = "identity" }) {
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "identity");
  const partner = { id: partnerId };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1 text-slate-900">Materiali e profilo</h1>
        <p className="text-sm text-slate-500 mb-6">
          Qui trovi identità, brand kit, posizionamento, risultati e materiali del percorso.
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
        {tab === "identity" && <PartnerProfileHub partner={partner} section="identity" />}
        {tab === "brand" && <PartnerProfileHub partner={partner} section="brand" />}
        {tab === "positioning" && <PartnerProfileHub partner={partner} section="positioning" />}
        {tab === "risultati" && <F7Ottimizzazione partnerId={partnerId} />}
        {tab === "file" && <PartnerFilesPage partner={partner} />}
      </div>
    </div>
  );
}

export default WorkspacePage;
