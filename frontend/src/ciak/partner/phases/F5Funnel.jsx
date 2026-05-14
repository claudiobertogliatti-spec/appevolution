/**
 * Ciak Partner — Fase 5: Funnel di Vendita (Blueprint Academy).
 * Porting di components/partner/FunnelPage.jsx (Fase 2c).
 * Usa DoneForYouWrapper. Endpoint: GET /api/partner-journey/funnel/:partnerId
 * 3 tab: Landing / Email Sequence / Area Studenti.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Loader2, ChevronDown, ChevronRight, Mail, Globe,
  Users, FileText, Shield, HelpCircle, User, Zap, Layout, Sparkles,
} from "lucide-react";
import { DoneForYouWrapper } from "../components/DoneForYouWrapper";

const EMAIL_TYPE_MAP = {
  consegna: { label: "Consegna", icon: Mail },
  problema: { label: "Problema", icon: Users },
  errore: { label: "Errore comune", icon: HelpCircle },
  soluzione: { label: "Soluzione", icon: Check },
  urgenza: { label: "Urgenza / CTA", icon: Zap },
};

const TABS = [
  { id: "landing", label: "Landing Page", icon: Globe },
  { id: "email", label: "Email Sequence", icon: Mail },
  { id: "area", label: "Area Studenti", icon: Layout },
];

function SectionCard({ title, headline, body, icon: IconComp }) {
  const Icon = IconComp || Globe;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
      </div>
      <h4 className="text-sm font-semibold mb-2 text-slate-900">{headline}</h4>
      <p className="text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function BlueprintOutput({ blueprint }) {
  const [activeTab, setActiveTab] = useState("landing");
  const [expandedEmails, setExpandedEmails] = useState([0]);
  const [expandedFaqs, setExpandedFaqs] = useState([]);
  if (!blueprint) return null;
  const ls = blueprint.landing_sections || {};
  const emails = blueprint.email_sequence || [];
  const area = blueprint.student_area || {};

  const toggleEmail = (i) =>
    setExpandedEmails((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const toggleFaq = (i) =>
    setExpandedFaqs((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <div>
      {/* TABS */}
      <div className="flex rounded-xl overflow-hidden mb-5 border border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                isActive ? "bg-slate-900 text-yellow-400" : "bg-white text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* LANDING */}
      {activeTab === "landing" && (
        <div className="space-y-3">
          {ls.hero && (
            <div className="rounded-2xl p-6 bg-slate-900">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-yellow-400">
                Hero
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{ls.hero.headline}</h3>
              <p className="text-sm mb-3 text-slate-400">{ls.hero.subheadline}</p>
              <span className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-yellow-400 text-slate-900">
                {ls.hero.cta_text}
              </span>
            </div>
          )}
          {ls.problema && <SectionCard title="Problema" headline={ls.problema.headline} body={ls.problema.body} />}
          {ls.promessa && <SectionCard title="Promessa" headline={ls.promessa.headline} body={ls.promessa.body} />}
          {ls.moduli && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                Moduli del corso
              </div>
              <h4 className="text-sm font-semibold mb-3 text-slate-900">{ls.moduli.headline}</h4>
              <ul className="space-y-1.5">
                {(ls.moduli.items || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ls.bonus && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                Bonus
              </div>
              <h4 className="text-sm font-semibold mb-3 text-slate-900">{ls.bonus.headline}</h4>
              <ul className="space-y-1.5">
                {(ls.bonus.items || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ls.garanzia && (
            <SectionCard title="Garanzia" headline={ls.garanzia.headline} body={ls.garanzia.body} icon={Shield} />
          )}
          {ls.faq && ls.faq.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">FAQ</div>
              <div className="space-y-2">
                {ls.faq.map((faq, i) => (
                  <div key={i} className="rounded-lg border border-gray-100">
                    <button
                      onClick={() => toggleFaq(i)}
                      className="w-full flex items-center gap-2 p-3 text-left text-sm font-medium text-slate-900"
                    >
                      {expandedFaqs.includes(i) ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )}
                      {faq.question}
                    </button>
                    {expandedFaqs.includes(i) && (
                      <div className="px-3 pb-3 pl-9 text-sm text-slate-600">{faq.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {ls.bio && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                Bio Partner
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-yellow-100">
                  <User className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1 text-slate-900">{ls.bio.name}</h4>
                  <p className="text-sm text-slate-600">{ls.bio.bio}</p>
                </div>
              </div>
            </div>
          )}
          {ls.cta_finale && (
            <div className="rounded-2xl p-6 bg-yellow-50 border border-yellow-200">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-yellow-700">
                CTA Finale
              </div>
              <h4 className="text-base font-semibold mb-2 text-slate-900">{ls.cta_finale.headline}</h4>
              <p className="text-sm mb-3 text-slate-600">{ls.cta_finale.body}</p>
              <div className="flex items-center gap-4 mb-3">
                {ls.cta_finale.offerta && (
                  <span className="text-2xl font-semibold text-slate-900">{ls.cta_finale.offerta}</span>
                )}
                {ls.cta_finale.prezzo && (
                  <span className="text-base line-through text-slate-400">{ls.cta_finale.prezzo}</span>
                )}
              </div>
              <span className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white">
                {ls.cta_finale.cta_text}
              </span>
            </div>
          )}
        </div>
      )}

      {/* EMAIL */}
      {activeTab === "email" && (
        <div className="space-y-3">
          {emails.map((email, idx) => {
            const cfg = EMAIL_TYPE_MAP[email.type] || { label: email.type, icon: Mail };
            const Icon = cfg.icon;
            const isOpen = expandedEmails.includes(idx);
            return (
              <div
                key={idx}
                className={`bg-white rounded-xl overflow-hidden border ${
                  isOpen ? "border-slate-300" : "border-gray-200"
                }`}
              >
                <button
                  onClick={() => toggleEmail(idx)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100 text-slate-500">
                        Email {email.id || idx + 1} — {cfg.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{email.delay}</span>
                    </div>
                    <div className="text-sm font-medium truncate text-slate-900">{email.subject}</div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 text-slate-800 border border-gray-100">
                      {email.body}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AREA STUDENTI */}
      {activeTab === "area" && (
        <div className="space-y-3">
          {area.welcome_message && (
            <div className="rounded-xl p-5 bg-yellow-50 border border-yellow-200">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-yellow-700">
                Messaggio di benvenuto
              </div>
              <p className="text-sm leading-relaxed text-slate-800">{area.welcome_message}</p>
            </div>
          )}
          {(area.modules || []).map((mod, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold bg-yellow-400 text-slate-900">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-900">{mod.title}</span>
              </div>
              <ul className="space-y-1.5 pl-9">
                {(mod.lessons || []).map((l, li) => (
                  <li key={li} className="text-sm flex items-center gap-2 text-slate-600">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" /> {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {area.bonus_section?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">
                Sezione Bonus
              </div>
              <ul className="space-y-1.5">
                {area.bonus_section.map((b, i) => (
                  <li key={i} className="text-sm flex items-center gap-2 text-slate-600">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {area.resources_section?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">
                Risorse Scaricabili
              </div>
              <ul className="space-y-1.5">
                {area.resources_section.map((r, i) => (
                  <li key={i} className="text-sm flex items-center gap-2 text-slate-600">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" /> {r}
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

export function F5Funnel({ partnerId }) {
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/partner-journey/funnel/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.blueprint) setBlueprint(data.blueprint);
        }
      } catch (e) {
        // best-effort
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-3 text-slate-900">
            Il tuo Funnel e la tua Academy
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Il team usa il tuo posizionamento, la masterclass e il videocorso per creare landing
            page, sequenza email e area studenti.
            <br />
            <br />
            <strong className="text-slate-900">Non devi costruire nulla. Devi solo approvare.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="funnel"
          stepTitle="Blueprint Academy"
          nextStepLabel="Vai al Lancio"
          onContinue={() => navigate("/partner/lancio")}
        >
          {blueprint ? (
            <BlueprintOutput blueprint={blueprint} />
          ) : (
            <div className="text-center py-6 text-sm text-slate-400">
              Il team sta preparando il tuo Blueprint Academy.
            </div>
          )}
        </DoneForYouWrapper>
      </div>
    </div>
  );
}
