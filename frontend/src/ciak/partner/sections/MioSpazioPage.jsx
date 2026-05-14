/**
 * Ciak Partner — Il Mio Spazio.
 * Porting di components/partner/MioSpazioPage.jsx. Re-skin palette Ciak.
 *
 * Hub tabbed: "Profilo" (PartnerProfileHub) + "I Miei File" (PartnerFilesPage).
 * Riceve partnerId come prop; costruisce un oggetto partner minimale per i
 * sotto-componenti, che caricano i dati completi dai propri endpoint.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, FolderOpen } from "lucide-react";
import { PartnerProfileHub } from "./PartnerProfileHub";
import { PartnerFilesPage } from "./PartnerFilesPage";

export function MioSpazioPage({ partnerId }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("profilo");
  const partner = { id: partnerId };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>

        <h1 className="text-2xl font-semibold mb-6 text-slate-900">Il Mio Spazio</h1>

        {/* Tab pills */}
        <div className="flex gap-2 mb-8">
          {[
            { id: "profilo", label: "Profilo", Icon: User },
            { id: "file", label: "I Miei File", Icon: FolderOpen },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border ${
                tab === t.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-gray-200"
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
      </div>
    </div>
  );
}

export default MioSpazioPage;
