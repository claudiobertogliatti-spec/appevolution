import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

const SECTIONS = [
  {
    header: "A chi parli",
    subtitle: "L'obiettivo è chiaro: tre risposte che scolpiscono il tuo cliente ideale.",
    items: [
      {
        key: "nicchia",
        label: "Qual è la nicchia precisa che vuoi servire?",
        hint: "Non \"consulenti\", ma \"consulenti finanziari indipendenti italiani 35-50 anni che operano per conto proprio\".",
        minChar: 30,
      },
      {
        key: "momento_di_vita",
        label: "In che momento della loro vita o carriera ti cercano?",
        hint: "Stanno per cambiare, sono in crisi, hanno appena fallito, stanno scalando? Quando \"scattano\" e ti vengono a cercare.",
        minChar: 25,
      },
      {
        key: "livello_consapevolezza",
        label: "Quanto sanno già del problema quando ti incontrano?",
        hint: "Non sanno di averlo (devi spiegarglielo)? Sanno di averlo ma cercano soluzioni sbagliate? Hanno già provato cose che non hanno funzionato?",
        minChar: 25,
      },
    ],
  },
  {
    header: "Cosa vendi",
    subtitle: "Non un corso. Un risultato. Tre risposte che lo rendono ineluttabile.",
    items: [
      {
        key: "promessa",
        label: "Qual è la promessa in 1 frase?",
        hint: "Headline-ready. Non \"ti aiuto a stare meglio\", ma \"in 90 giorni esci dal lavoro a ore e crei un'offerta che vendi anche mentre dormi\". Specifica, misurabile, con un tempo.",
        minChar: 40,
      },
      {
        key: "trasformazione_90gg",
        label: "Cosa è cambiato concretamente nella vita del cliente dopo 90 giorni?",
        hint: "Numeri, comportamenti, sensazioni misurabili. Non \"si sente più sicuro\", ma \"ha la sua agenda piena di call qualificate, fattura 3-5k al mese ricorrenti, smette di rincorrere clienti\".",
        minChar: 50,
      },
      {
        key: "prezzo_e_formato",
        label: "A che prezzo lo vendi e in che formato?",
        hint: "Range realistico (es. \"tra 497€ e 1.490€\"), formato (corso self-paced, gruppo coaching 8 settimane, 1-1 6 mesi). Se ancora non lo sai, scrivi quello che IMMAGINI di vendere — lo affineremo insieme.",
        minChar: 30,
      },
    ],
  },
  {
    header: "Il tuo metodo",
    subtitle: "Non per sembrare diverso. Per essere riconoscibile. Tre risposte che danno forma al tuo modo di lavorare.",
    items: [
      {
        key: "metodo_nome",
        label: "Come si chiama il tuo metodo? (anche provvisorio)",
        hint: "Un nome breve, memorabile, che dica qualcosa. Es: \"Metodo EVO\", \"Sistema Profit-First\", \"Approccio Anti-Fuffa\". Se non ce l'hai ancora, scrivi 2-3 idee separate da virgola — lo affineremo insieme.",
        minChar: 5,
      },
      {
        key: "metodo_step",
        label: "In 3-5 step, come funziona?",
        hint: "Le tappe concrete che il cliente attraversa, in ordine. Una riga per step. Es: 1. Diagnosi del posizionamento attuale 2. Costruzione offerta core 3. Funnel di acquisizione live 4. Primi 10 clienti paganti 5. Sistema di scaling.",
        minChar: 80,
      },
      {
        key: "prova_sociale_concreta",
        label: "Un caso reale con un numero o un risultato concreto.",
        hint: "Nome + cosa è cambiato + tempo. Es: \"Marco R., consulente assicurativo: da 0 a 8 clienti paganti in 45 giorni dopo il primo lancio. Fatturato +6.200€/mese.\" Se non hai casi, scrivi quello del cliente più vicino al risultato (anche tuo, se sei partito da zero).",
        minChar: 50,
      },
    ],
  },
  {
    header: "Perché tu",
    subtitle: "Quello che ti rende difficile da copiare. Tre risposte che diventano la tua voce.",
    items: [
      {
        key: "origin_story",
        label: "Perché sei tu a fare questo? Cosa ti è successo che ti ha portato qui?",
        hint: "Una storia vera, anche piccola. Il momento in cui hai capito che dovevi farlo, la frustrazione che ti ha spinto, il fallimento da cui hai imparato. Non per fare \"lo storytelling\": è quello che ti rende umano e credibile agli occhi del tuo pubblico.",
        minChar: 80,
      },
      {
        key: "contrarian_view",
        label: "Cosa pensi che gli altri nel tuo settore sbaglino?",
        hint: "Non per attaccare nessuno. Per piantare bandiera. Es: \"Tutti vendono templates di funnel. Io penso che senza un posizionamento solido il template è la cosa meno importante.\" Una frase netta, riconoscibile.",
        minChar: 50,
      },
      {
        key: "differenza_riconoscibile",
        label: "Se un cliente parlasse di te a un amico, come ti descriverebbe in 1 frase?",
        hint: "Non \"il migliore di tutti\", ma una caratteristica concreta. Es: \"Quello che ti fa fare lo schema su carta prima di toccare un funnel.\" \"Quella che non ti molla finché non hai chiuso il primo cliente.\" Specifica, riconoscibile, vera.",
        minChar: 40,
      },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

export default function Step04Posizionamento({ step, partnerId, onComplete, onSaveDraft }) {
  const [answers, setAnswers] = useState(step?.data?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(
    step?.approval_status === "pending_review" || step?.approval_status === "approved"
  );

  // Pre-fill da Ciak gate alla prima visita (se nessuna risposta esistente)
  useEffect(() => {
    const existingKeys = Object.keys(step?.data?.answers || {}).filter(
      (k) => (step.data.answers[k] || "").trim().length > 0
    );
    if (existingKeys.length > 0 || !partnerId) return;
    axios
      .get(`${API}/api/partner/posizionamento/prefill/${partnerId}`)
      .then((r) => {
        const prefill = r.data || {};
        if (Object.keys(prefill).length === 0) return;
        setAnswers((prev) => {
          const next = { ...prev, ...prefill };
          if (onSaveDraft) onSaveDraft({ answers: next });
          return next;
        });
      })
      .catch(() => {
        // Silente: pre-fill è best-effort
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const update = (k, v) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    if (onSaveDraft) onSaveDraft({ answers: next });
  };

  const canComplete = ALL_ITEMS.every(
    (it) => (answers[it.key] || "").trim().length >= it.minChar
  );

  const finalize = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (onSaveDraft) await onSaveDraft({ answers });
      const res = await axios.post(`${API}/api/partner/posizionamento/finalize`, {
        partner_id: partnerId,
      });
      setDone(true);
      if (onComplete) onComplete({ answers, approval_status: res.data.approval_status });
    } catch (e) {
      if (e?.response?.status === 409) {
        setError(e.response.data?.detail || "Documento già approvato dal team.");
      } else if (e?.response?.status === 400) {
        setError(e.response.data?.detail || "Alcune risposte sono mancanti o troppo brevi.");
      } else {
        setError("Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StepBase
        eyebrow="Step 4 — Posizionamento"
        title="Documento inviato al team"
        ctaDisabled={true}
        onCta={() => {}}
        secondaryNote=""
      >
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="font-semibold text-slate-900 mb-1">✓ Documento generato</div>
          <p className="text-sm text-slate-600">
            Il team lo sta revisionando — di solito entro 24h.
            Nel frattempo puoi proseguire con lo step successivo.
            Lo trovi anche in <strong>I Miei File</strong>.
          </p>
        </div>
      </StepBase>
    );
  }

  return (
    <StepBase
      eyebrow="Step 4 — Posizionamento"
      title="Le fondamenta del tuo messaggio"
      ctaLabel={submitting ? "Sto generando il documento..." : "Genera Documento"}
      ctaDisabled={!canComplete || submitting}
      onCta={finalize}
      secondaryNote="12 domande in 4 sezioni. Rispondi con onestà — il team userà queste risposte per costruire i tuoi materiali."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.header} className="mb-8 pb-2 border-b border-slate-100 last:border-b-0">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">{section.header}</h3>
            <p className="text-xs text-slate-500 mt-1 italic">{section.subtitle}</p>
          </div>
          <div className="space-y-5">
            {section.items.map((it) => {
              const value = answers[it.key] || "";
              const len = value.trim().length;
              const ok = len >= it.minChar;
              return (
                <div key={it.key}>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    {it.label}
                  </label>
                  <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">{it.hint}</p>
                  <textarea
                    value={value}
                    onChange={(e) => update(it.key, e.target.value)}
                    rows={3}
                    disabled={submitting}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y disabled:bg-gray-50"
                  />
                  <div className={`text-[10px] mt-1 ${ok ? "text-slate-400" : "text-slate-500"}`}>
                    {len}/{it.minChar} min
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </StepBase>
  );
}
