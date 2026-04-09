import { useState } from "react";
import { User, FolderOpen } from "lucide-react";
import { PartnerProfileHub } from "./PartnerProfileHub";
import { PartnerFilesPage } from "./PartnerFilesPage";

export function MioSpazioPage({ partner, onNavigate }) {
  const [tab, setTab] = useState('profilo');

  return (
    <div data-testid="mio-spazio-page" className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-black mb-6" style={{ color: '#1A1F24' }}>
          Il Mio Spazio
        </h1>

        {/* Tab pills */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'profilo', label: 'Profilo', Icon: User },
            { id: 'file', label: 'I Miei File', Icon: FolderOpen },
          ].map(t => (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab === t.id ? '#1A1F24' : 'white',
                color: tab === t.id ? '#FFFFFF' : '#5F6572',
                border: `1px solid ${tab === t.id ? '#1A1F24' : '#ECEDEF'}`,
              }}
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'profilo' && <PartnerProfileHub partner={partner} onNavigate={onNavigate} />}
        {tab === 'file' && <PartnerFilesPage partner={partner} />}
      </div>
    </div>
  );
}
