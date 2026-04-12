import { useState, useEffect } from "react";
import axios from "axios";
import {
  Check, ArrowRight, Loader2, Eye,
  ChevronDown, ChevronRight, Mail, Globe, ShoppingCart,
  Users, FileText, Shield, HelpCircle, User, Zap, Layout, Sparkles
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const EMAIL_TYPE_MAP = {
  consegna: { label: "Consegna", color: "#3B82F6", icon: Mail },
  problema: { label: "Problema", color: "#EF4444", icon: Users },
  errore: { label: "Errore comune", color: "#F59E0B", icon: HelpCircle },
  soluzione: { label: "Soluzione", color: "#22C55E", icon: Check },
  urgenza: { label: "Urgenza / CTA", color: "#8B5CF6", icon: Zap },
};

const TAB_CONFIG = [
  { id: "landing", label: "Landing Page", icon: Globe },
  { id: "email", label: "Email Sequence", icon: Mail },
  { id: "area", label: "Area Studenti", icon: Layout },
];

function BlueprintOutput({ blueprint, activeTab, setActiveTab, expandedEmails, toggleEmail, expandedFaqs, toggleFaq }) {
  if (!blueprint) return null;
  const ls = blueprint.landing_sections || {};
  const emails = blueprint.email_sequence || [];
  const area = blueprint.student_area || {};

  return (
    <div data-testid="blueprint-output">
      {/* TABS */}
      <div className="flex rounded-xl overflow-hidden mb-5" style={{ border: "1px solid #ECEDEF" }}>
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all"
              style={{
                background: isActive ? "#1E2128" : "white",
                color: isActive ? "#FFD24D" : "#5F6572"
              }}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* LANDING TAB */}
      {activeTab === "landing" && (
        <div className="space-y-3" data-testid="tab-landing-content">
          {ls.hero && (
            <div className="rounded-2xl p-6" style={{ background: "#1E2128" }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#FFD24D" }}>Hero</div>
              <h3 className="text-xl font-black text-white mb-2">{ls.hero.headline}</h3>
              <p className="text-sm mb-3" style={{ color: "#9CA3AF" }}>{ls.hero.subheadline}</p>
              <span className="inline-block px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#FFD24D", color: "#1E2128" }}>
                {ls.hero.cta_text}
              </span>
            </div>
          )}
          {ls.problema && <SectionCard title="Problema" color="#EF4444" headline={ls.problema.headline} body={ls.problema.body} />}
          {ls.promessa && <SectionCard title="Promessa" color="#34C77B" headline={ls.promessa.headline} body={ls.promessa.body} />}
          {ls.moduli && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Moduli del corso</div>
              <h4 className="text-sm font-bold mb-3" style={{ color: "#1E2128" }}>{ls.moduli.headline}</h4>
              <ul className="space-y-1.5">
                {(ls.moduli.items || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#FFD24D" }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ls.bonus && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Bonus</div>
              <h4 className="text-sm font-bold mb-3" style={{ color: "#1E2128" }}>{ls.bonus.headline}</h4>
              <ul className="space-y-1.5">
                {(ls.bonus.items || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#8B5CF6" }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ls.garanzia && <SectionCard title="Garanzia" color="#3B82F6" headline={ls.garanzia.headline} body={ls.garanzia.body} icon={Shield} />}
          {ls.faq && ls.faq.length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>FAQ</div>
              <div className="space-y-2">
                {ls.faq.map((faq, i) => (
                  <div key={i} className="rounded-lg" style={{ border: "1px solid #F0EDE8" }}>
                    <button onClick={() => toggleFaq(i)}
                      className="w-full flex items-center gap-2 p-3 text-left text-sm font-bold" style={{ color: "#1E2128" }}>
                      {expandedFaqs.includes(i) ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                      {faq.question}
                    </button>
                    {expandedFaqs.includes(i) && (
                      <div className="px-3 pb-3 pl-9 text-sm" style={{ color: "#5F6572" }}>{faq.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {ls.bio && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Bio Partner</div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#FFD24D30" }}>
                  <User className="w-6 h-6" style={{ color: "#FFD24D" }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: "#1E2128" }}>{ls.bio.name}</h4>
                  <p className="text-sm" style={{ color: "#5F6572" }}>{ls.bio.bio}</p>
                </div>
              </div>
            </div>
          )}
          {ls.cta_finale && (
            <div className="rounded-2xl p-6" style={{ background: "#FFF8E1", border: "1px solid #FFD24D30" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92700C" }}>CTA Finale</div>
              <h4 className="text-base font-black mb-2" style={{ color: "#1E2128" }}>{ls.cta_finale.headline}</h4>
              <p className="text-sm mb-3" style={{ color: "#5F6572" }}>{ls.cta_finale.body}</p>
              <div className="flex items-center gap-4 mb-3">
                {ls.cta_finale.offerta && <span className="text-2xl font-black" style={{ color: "#1E2128" }}>{ls.cta_finale.offerta}</span>}
                {ls.cta_finale.prezzo && <span className="text-base line-through" style={{ color: "#9CA3AF" }}>{ls.cta_finale.prezzo}</span>}
              </div>
              <span className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#34C77B", color: "white" }}>
                {ls.cta_finale.cta_text}
              </span>
            </div>
          )}
        </div>
      )}

      {/* EMAIL TAB */}
      {activeTab === "email" && (
        <div className="space-y-3" data-testid="tab-email-content">
          {emails.map((email, idx) => {
            const cfg = EMAIL_TYPE_MAP[email.type] || { label: email.type, color: "#5F6572", icon: Mail };
            const Icon = cfg.icon;
            const isOpen = expandedEmails.includes(idx);
            return (
              <div key={idx} className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? cfg.color + "40" : "#ECEDEF"}` }}>
                <button onClick={() => toggleEmail(idx)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-all">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.color + "15" }}>
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: cfg.color + "15", color: cfg.color }}>
                        Email {email.id || idx + 1} — {cfg.label}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{email.delay}</span>
                    </div>
                    <div className="text-sm font-bold truncate" style={{ color: "#1E2128" }}>{email.subject}</div>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pl-15">
                    <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "#FAFAF7", color: "#1E2128", border: "1px solid #F0EDE8" }}>
                      {email.body}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AREA STUDENTI TAB */}
      {activeTab === "area" && (
        <div className="space-y-3" data-testid="tab-area-content">
          {area.welcome_message && (
            <div className="rounded-xl p-5" style={{ background: "#FFF8E1", border: "1px solid #FFD24D30" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92700C" }}>Messaggio di benvenuto</div>
              <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>{area.welcome_message}</p>
            </div>
          )}
          {(area.modules || []).map((mod, idx) => (
            <div key={idx} className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "#FFD24D", color: "#1E2128" }}>
                  {idx + 1}
                </span>
                <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{mod.title}</span>
              </div>
              <ul className="space-y-1.5 pl-9">
                {(mod.lessons || []).map((l, li) => (
                  <li key={li} className="text-sm flex items-center gap-2" style={{ color: "#5F6572" }}>
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3B82F6" }} /> {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {area.bonus_section && area.bonus_section.length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>Sezione Bonus</div>
              <ul className="space-y-1.5">
                {area.bonus_section.map((b, i) => (
                  <li key={i} className="text-sm flex items-center gap-2" style={{ color: "#5F6572" }}>
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#8B5CF6" }} /> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {area.resources_section && area.resources_section.length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>Risorse Scaricabili</div>
              <ul className="space-y-1.5">
                {area.resources_section.map((r, i) => (
                  <li key={i} className="text-sm flex items-center gap-2" style={{ color: "#5F6572" }}>
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22C55E" }} /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, color, headline, body, icon: IconComp }) {
  const Icon = IconComp || Globe;
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: color + "30" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</span>
      </div>
      <h4 className="text-sm font-bold mb-2" style={{ color: "#1E2128" }}>{headline}</h4>
      <p className="text-sm leading-relaxed" style={{ color: "#5F6572" }}>{body}</p>
    </div>
  );
}

export function FunnelPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("landing");
  const [expandedEmails, setExpandedEmails] = useState([0]);
  const [expandedFaqs, setExpandedFaqs] = useState([]);
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/funnel/${partnerId}`);
        if (res.data.blueprint) setBlueprint(res.data.blueprint);
      } catch (e) {
        console.error("Error loading funnel:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const toggleEmail = (idx) => {
    setExpandedEmails(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };
  const toggleFaq = (idx) => {
    setExpandedFaqs(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* HERO */}
        <div className="mb-8" data-testid="funnel-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Il tuo Funnel e la tua Academy
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il team utilizza il tuo posizionamento, la masterclass e il videocorso per creare
            automaticamente tutto il materiale: landing page, sequenza email e area studenti.
            <br /><br />
            <strong>Non devi costruire nulla. Devi solo approvare.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="funnel"
          stepTitle="Blueprint Academy"
          stepIcon={Globe}
          nextStepLabel="Vai al Lancio"
          onContinue={() => onNavigate("lancio")}
          isAdmin={isAdmin}
        >
          {blueprint ? (
            <BlueprintOutput
              blueprint={blueprint}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              expandedEmails={expandedEmails}
              toggleEmail={toggleEmail}
              expandedFaqs={expandedFaqs}
              toggleFaq={toggleFaq}
            />
          ) : (
            <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
              Il team sta preparando il tuo Blueprint Academy.
            </div>
          )}
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default FunnelPage;
