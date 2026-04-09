import { useState, useEffect } from "react";
import axios from "axios";
import {
  Sparkles, Check, ArrowRight, Loader2, RefreshCw, Eye,
  ChevronDown, ChevronRight, Mail, Globe, ShoppingCart,
  Users, FileText, Shield, HelpCircle, User, Zap, Copy, Layout
} from "lucide-react";

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

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-8 text-center" data-testid="funnel-completed-banner"
         style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: "rgba(255,255,255,0.2)" }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Blueprint Academy approvato!</h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Il tuo funnel, le email e l'area studenti sono pronti. Ora puoi procedere al Lancio.
      </p>
      <button onClick={onContinue} data-testid="go-to-lancio-btn"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: "white", color: "#2D9F6F" }}>
        Vai al Lancio <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export function FunnelPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [inputs, setInputs] = useState({ bio_partner: "", garanzia: "" });
  const [blueprint, setBlueprint] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("landing");
  const [expandedEmails, setExpandedEmails] = useState([0]);
  const [expandedFaqs, setExpandedFaqs] = useState([]);

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/funnel/${partnerId}`);
        const data = res.data;
        if (data.inputs) setInputs(prev => ({ ...prev, ...data.inputs }));
        if (data.blueprint) setBlueprint(data.blueprint);
        if (data.is_approved) setIsApproved(true);
      } catch (e) {
        console.error("Error loading funnel:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleGenerate = async () => {
    if (!partnerId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/partner-journey/funnel/generate`, {
        partner_id: partnerId,
        ...inputs,
      });
      setBlueprint(res.data.blueprint);
      setActiveTab("landing");
    } catch (e) {
      console.error("Error generating blueprint:", e);
      setError(e.response?.data?.detail || "Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setBlueprint(null);
  };

  const handleApprove = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      await axios.post(`${API}/api/partner-journey/funnel/approve-blueprint?partner_id=${partnerId}`);
      setIsApproved(true);
      if (onComplete) onComplete();
    } catch (e) {
      console.error("Error approving:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEmail = (idx) => {
    setExpandedEmails(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };
  const toggleFaq = (idx) => {
    setExpandedFaqs(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-8" data-testid="funnel-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Costruiamo il tuo Funnel e la tua Academy
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il sistema userà il tuo posizionamento, la masterclass e il videocorso per generare
            automaticamente tutto il materiale necessario: landing page, sequenza email e area studenti.
            <br /><br />
            <strong>Non devi costruire nulla. Devi solo validare.</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {/* ADMIN VIEW */}
        {isAdmin && (
          <div className="space-y-4" data-testid="admin-panoramic-funnel">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
                Vista Admin — Blueprint Academy
              </span>
            </div>
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>Input Partner</div>
              <div className="space-y-2 text-sm">
                <div><span style={{ color: "#9CA3AF" }}>Bio:</span> <span style={{ color: "#1E2128" }}>{inputs.bio_partner || "Non fornita"}</span></div>
                <div><span style={{ color: "#9CA3AF" }}>Garanzia:</span> <span style={{ color: "#1E2128" }}>{inputs.garanzia || "Non fornita"}</span></div>
              </div>
            </div>
            {blueprint && <BlueprintOutput blueprint={blueprint} activeTab={activeTab} setActiveTab={setActiveTab}
              expandedEmails={expandedEmails} toggleEmail={toggleEmail}
              expandedFaqs={expandedFaqs} toggleFaq={toggleFaq} />}
            {isApproved && <CompletedBanner onContinue={() => onNavigate("lancio")} />}
          </div>
        )}

        {/* PARTNER VIEW */}
        {!isAdmin && (
          <>
            {isApproved ? (
              <>
                {blueprint && <BlueprintOutput blueprint={blueprint} activeTab={activeTab} setActiveTab={setActiveTab}
                  expandedEmails={expandedEmails} toggleEmail={toggleEmail}
                  expandedFaqs={expandedFaqs} toggleFaq={toggleFaq} />}
                <div className="mt-6">
                  <CompletedBanner onContinue={() => onNavigate("lancio")} />
                </div>
              </>
            ) : blueprint ? (
              /* OUTPUT */
              <div data-testid="funnel-output">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
                    <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
                  </div>
                  <h2 className="text-xl font-black" style={{ color: "#1E2128" }}>Il tuo Blueprint è pronto</h2>
                </div>

                <BlueprintOutput blueprint={blueprint} activeTab={activeTab} setActiveTab={setActiveTab}
                  expandedEmails={expandedEmails} toggleEmail={toggleEmail}
                  expandedFaqs={expandedFaqs} toggleFaq={toggleFaq} />

                {/* ACTIONS */}
                <div className="flex gap-3 mt-6">
                  <button onClick={handleApprove} disabled={isSaving} data-testid="approve-blueprint-btn"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "#34C77B", color: "white" }}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    {isSaving ? "Salvataggio..." : "APPROVA BLUEPRINT"}
                  </button>
                  <button onClick={handleRegenerate} data-testid="regenerate-blueprint-btn"
                    className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold transition-all hover:bg-gray-50"
                    style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                    <RefreshCw className="w-5 h-5" /> Rigenera
                  </button>
                </div>
              </div>
            ) : (
              /* INPUT */
              <div data-testid="funnel-input-section">
                <h2 className="text-lg font-black mb-4" style={{ color: "#1E2128" }}>
                  Ultime informazioni
                </h2>

                {/* Bio */}
                <div className="bg-white rounded-xl border p-5 mb-4" style={{ borderColor: "#ECEDEF" }}>
                  <label className="flex items-start gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{ background: inputs.bio_partner.length >= 10 ? "#34C77B" : "#F2C418",
                                   color: inputs.bio_partner.length >= 10 ? "white" : "#1E2128" }}>
                      {inputs.bio_partner.length >= 10 ? <Check className="w-3.5 h-3.5" /> : "1"}
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#1E2128" }}>
                      La tua bio (chi sei, cosa fai, la tua storia in breve)
                    </span>
                  </label>
                  <textarea
                    value={inputs.bio_partner}
                    onChange={e => setInputs(p => ({ ...p, bio_partner: e.target.value }))}
                    placeholder="Es: Sono un coach di fitness con 10 anni di esperienza. Ho aiutato più di 200 persone a raggiungere i loro obiettivi..."
                    rows={4}
                    data-testid="input-bio"
                    className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C418]"
                    style={{ background: "#FAFAF7", borderColor: "#ECEDEF", color: "#1E2128" }}
                  />
                </div>

                {/* Garanzia */}
                <div className="bg-white rounded-xl border p-5 mb-8" style={{ borderColor: "#ECEDEF" }}>
                  <label className="flex items-start gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{ background: "#F2C418", color: "#1E2128" }}>
                      2
                    </span>
                    <div>
                      <span className="text-sm font-bold" style={{ color: "#1E2128" }}>
                        Garanzia offerta
                      </span>
                      <span className="text-xs ml-2" style={{ color: "#9CA3AF" }}>(opzionale)</span>
                    </div>
                  </label>
                  <textarea
                    value={inputs.garanzia}
                    onChange={e => setInputs(p => ({ ...p, garanzia: e.target.value }))}
                    placeholder="Es: Soddisfatti o rimborsati entro 30 giorni, nessuna domanda."
                    rows={2}
                    data-testid="input-garanzia"
                    className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C418]"
                    style={{ background: "#FAFAF7", borderColor: "#ECEDEF", color: "#1E2128" }}
                  />
                </div>

                {/* CTA */}
                <button
                  onClick={handleGenerate}
                  disabled={inputs.bio_partner.trim().length < 10 || isGenerating}
                  data-testid="generate-blueprint-btn"
                  className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-black text-lg transition-all ${
                    inputs.bio_partner.trim().length >= 10 && !isGenerating ? "hover:scale-[1.02]" : "opacity-50 cursor-not-allowed"
                  }`}
                  style={{ background: "#F2C418", color: "#1E2128" }}>
                  {isGenerating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Generazione in corso...</>
                  ) : (
                    <><Sparkles className="w-6 h-6" /> GENERA BLUEPRINT ACADEMY</>
                  )}
                </button>
                {inputs.bio_partner.trim().length < 10 && (
                  <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>
                    Inserisci la tua bio (min. 10 caratteri) per generare il blueprint
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ Blueprint Output Component ═══ */
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
                color: isActive ? "#F2C418" : "#5F6572"
              }}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* LANDING TAB */}
      {activeTab === "landing" && (
        <div className="space-y-3" data-testid="tab-landing-content">
          {/* Hero */}
          {ls.hero && (
            <div className="rounded-2xl p-6" style={{ background: "#1E2128" }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#F2C418" }}>Hero</div>
              <h3 className="text-xl font-black text-white mb-2">{ls.hero.headline}</h3>
              <p className="text-sm mb-3" style={{ color: "#9CA3AF" }}>{ls.hero.subheadline}</p>
              <span className="inline-block px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#F2C418", color: "#1E2128" }}>
                {ls.hero.cta_text}
              </span>
            </div>
          )}
          {/* Problema */}
          {ls.problema && (
            <SectionCard title="Problema" color="#EF4444" headline={ls.problema.headline} body={ls.problema.body} />
          )}
          {/* Promessa */}
          {ls.promessa && (
            <SectionCard title="Promessa" color="#34C77B" headline={ls.promessa.headline} body={ls.promessa.body} />
          )}
          {/* Moduli */}
          {ls.moduli && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Moduli del corso</div>
              <h4 className="text-sm font-bold mb-3" style={{ color: "#1E2128" }}>{ls.moduli.headline}</h4>
              <ul className="space-y-1.5">
                {(ls.moduli.items || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#F2C418" }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Bonus */}
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
          {/* Garanzia */}
          {ls.garanzia && (
            <SectionCard title="Garanzia" color="#3B82F6" headline={ls.garanzia.headline} body={ls.garanzia.body} icon={Shield} />
          )}
          {/* FAQ */}
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
          {/* Bio */}
          {ls.bio && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Bio Partner</div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#F2C41830" }}>
                  <User className="w-6 h-6" style={{ color: "#F2C418" }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: "#1E2128" }}>{ls.bio.name}</h4>
                  <p className="text-sm" style={{ color: "#5F6572" }}>{ls.bio.bio}</p>
                </div>
              </div>
            </div>
          )}
          {/* CTA Finale */}
          {ls.cta_finale && (
            <div className="rounded-2xl p-6" style={{ background: "#FFF8E1", border: "1px solid #F2C41830" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92700C" }}>CTA Finale</div>
              <h4 className="text-base font-black mb-2" style={{ color: "#1E2128" }}>{ls.cta_finale.headline}</h4>
              <p className="text-sm mb-3" style={{ color: "#5F6572" }}>{ls.cta_finale.body}</p>
              <div className="flex items-center gap-4 mb-3">
                {ls.cta_finale.offerta && (
                  <span className="text-2xl font-black" style={{ color: "#1E2128" }}>{ls.cta_finale.offerta}</span>
                )}
                {ls.cta_finale.prezzo && (
                  <span className="text-base line-through" style={{ color: "#9CA3AF" }}>{ls.cta_finale.prezzo}</span>
                )}
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
                        Email {email.id} — {cfg.label}
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
          {/* Welcome */}
          {area.welcome_message && (
            <div className="rounded-xl p-5" style={{ background: "#FFF8E1", border: "1px solid #F2C41830" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92700C" }}>Messaggio di benvenuto</div>
              <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>{area.welcome_message}</p>
            </div>
          )}
          {/* Modules */}
          {(area.modules || []).map((mod, idx) => (
            <div key={idx} className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "#F2C418", color: "#1E2128" }}>
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
          {/* Bonus */}
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
          {/* Resources */}
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

export default FunnelPage;
