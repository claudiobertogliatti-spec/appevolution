import React, { useState, useEffect } from "react";
import {
  Mail, Play, Pause, Clock, Users,
  Send, ChevronRight, ChevronDown, Loader2,
  Check, Sparkles
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const TRIGGER_LABELS = {
  new_subscriber: "Nuovo Iscritto",
  purchase: "Nuovo Acquisto",
  tag_added: "Tag Aggiunto",
  form_submitted: "Form Compilato",
  cart_abandoned: "Carrello Abbandonato",
  sequence: "Sequenza Email"
};

function EmailContent({ automations, sequences, expandedSequence, setExpandedSequence }) {
  if ((!automations || automations.length === 0) && (!sequences || sequences.length === 0)) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta configurando le automazioni email per te.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="email-content">
      {/* Automazioni attive */}
      {automations && automations.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
            Automazioni configurate dal team
          </div>
          <div className="space-y-2">
            {automations.map((a, idx) => (
              <div key={idx} className="bg-white rounded-xl border p-4 flex items-center gap-3"
                style={{ borderColor: "#ECEDEF" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: a.is_active ? "#34C77B20" : "#EF444420" }}>
                  {a.is_active ? <Play className="w-4 h-4" style={{ color: "#34C77B" }} /> : <Pause className="w-4 h-4" style={{ color: "#EF4444" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "#1E2128" }}>{a.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {TRIGGER_LABELS[a.trigger] || a.trigger}
                    </span>
                    {a.delay_hours && (
                      <span className="text-xs flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                        <Clock className="w-3 h-3" /> {a.delay_hours}h
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{
                    background: a.is_active ? "#DCFCE7" : "#FEE2E2",
                    color: a.is_active ? "#166534" : "#991B1B"
                  }}>
                  {a.is_active ? "Attiva" : "In pausa"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sequenze */}
      {sequences && sequences.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
            Sequenze email preparate dal team
          </div>
          <div className="space-y-2">
            {sequences.map((seq, idx) => (
              <div key={idx} className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: expandedSequence === idx ? "#FFD24D40" : "#ECEDEF" }}>
                <button onClick={() => setExpandedSequence(expandedSequence === idx ? null : idx)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-all">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#3B82F620" }}>
                    <Send className="w-4 h-4" style={{ color: "#3B82F6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: "#1E2128" }}>{seq.name}</div>
                    <div className="text-xs" style={{ color: "#9CA3AF" }}>
                      {seq.emails?.length || 0} email nella sequenza
                    </div>
                  </div>
                  {expandedSequence === idx ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
                </button>
                {expandedSequence === idx && seq.emails && (
                  <div className="px-4 pb-4 space-y-2">
                    {seq.emails.map((email, ei) => (
                      <div key={ei} className="rounded-xl p-3" style={{ background: "#FAFAF7", border: "1px solid #F0EDE8" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "#E8E4DC", color: "#5F6572" }}>
                            Email {ei + 1}
                          </span>
                          {email.delay && (
                            <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                              <Clock className="w-3 h-3 inline mr-1" />{email.delay}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold" style={{ color: "#1E2128" }}>
                          {email.subject}
                        </div>
                        {email.body && (
                          <p className="text-xs mt-1 line-clamp-3" style={{ color: "#5F6572" }}>
                            {email.body}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailAutomation({ partner, isAdmin }) {
  const [automations, setAutomations] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSequence, setExpandedSequence] = useState(null);
  const partnerId = partner?.id;

  useEffect(() => {
    const loadData = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const [autoRes, seqRes] = await Promise.all([
          fetch(`${API}/api/email-automation/list?partner_id=${partnerId}`),
          fetch(`${API}/api/email-automation/sequences?partner_id=${partnerId}`)
        ]);
        if (autoRes.ok) {
          const d = await autoRes.json();
          setAutomations(d.automations || []);
        }
        if (seqRes.ok) {
          const d = await seqRes.json();
          setSequences(d.sequences || []);
        }
      } catch (e) {
        console.error("Error loading email data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [partnerId]);

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
        <div className="mb-6" data-testid="email-hero">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#db277820" }}>
              <Mail className="w-6 h-6" style={{ color: "#db2778" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Automazione Email
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Le email automatiche sono configurate e gestite dal team per te
              </p>
            </div>
          </div>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="email"
          stepTitle="Email Automatiche"
          stepIcon={Mail}
          nextStepLabel={null}
          onContinue={null}
          isAdmin={isAdmin}
        >
          <EmailContent
            automations={automations}
            sequences={sequences}
            expandedSequence={expandedSequence}
            setExpandedSequence={setExpandedSequence}
          />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default EmailAutomation;
