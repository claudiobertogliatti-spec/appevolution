import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

const SECTIONS = [
  {
    header: "A chi parli",
    items: [
      {
        key: "nicchia",
        label: "Qual è la nicchia precisa che vuoi servire?",
        hint: "Non \"consulenti\" in generale, ma il gruppo preciso di persone. Più sei specifico, meglio è.",
        example:
          "Consulenti finanziari indipendenti, 35-50 anni, che lavorano per conto proprio e vogliono smettere di rincorrere clienti.",
        minChar: 30,
      },
      {
        key: "momento_di_vita",
        label: "In che momento della loro vita o carriera ti cercano?",
        hint: "Quando \"scatta\" qualcosa e ti vengono a cercare: una crisi, un cambiamento, un fallimento, una crescita.",
        example:
          "Mi cercano quando hanno appena perso un cliente importante o capiscono che il passaparola non basta più per crescere.",
        minChar: 25,
      },
      {
        key: "livello_consapevolezza",
        label: "Quanto sanno già del problema quando ti incontrano?",
        hint: "Non sanno di averlo? Lo sanno ma cercano soluzioni sbagliate? Hanno già provato cose che non hanno funzionato?",
        example:
          "Sanno di avere il problema e hanno già provato corsi e agenzie che non hanno funzionato, quindi sono diffidenti.",
        minChar: 25,
      },
    ],
  },
  {
    header: "Cosa vendi",
    items: [
      {
        key: "promessa",
        label: "Qual è la tua promessa in una frase?",
        hint: "Specifica, con un risultato e un tempo. Non \"ti aiuto a stare meglio\".",
        example:
          "In 90 giorni costruisci un'offerta chiara e un sistema che ti porta call qualificate ogni settimana, senza inseguire nessuno.",
        minChar: 40,
      },
      {
        key: "trasformazione_90gg",
        label: "Cosa è cambiato nella vita del cliente dopo 90 giorni?",
        hint: "Cose concrete e misurabili: numeri, comportamenti, sensazioni. Non \"si sente più sicuro\".",
        example:
          "Ha l'agenda piena di call qualificate, fattura 3-5k al mese ricorrenti e smette di abbassare i prezzi per chiudere.",
        minChar: 50,
      },
      {
        key: "prezzo_e_formato",
        label: "A che prezzo lo vendi e in che formato?",
        hint: "Un prezzo indicativo va benissimo. Se ancora non lo sai, scrivi quello che immagini: lo affiniamo insieme.",
        example:
          "Percorso di gruppo di 8 settimane, tra 990€ e 1.490€. Più avanti vorrei aggiungere un 1-1 premium.",
        minChar: 30,
      },
    ],
  },
  {
    header: "Il tuo metodo",
    items: [
      {
        key: "metodo_nome",
        label: "Come si chiama il tuo metodo? (anche provvisorio)",
        hint: "Un nome breve e memorabile. Se non ce l'hai, scrivi 2-3 idee: lo scegliamo insieme.",
        example: "Metodo Cliente Magnete (è provvisorio, ma mi piace).",
        minChar: 5,
      },
      {
        key: "metodo_step",
        label: "In 3-5 passi, come funziona?",
        hint: "Le tappe che il cliente attraversa, in ordine. Una riga per passo.",
        example:
          "1. Mettiamo a fuoco il posizionamento. 2. Costruiamo l'offerta. 3. Creiamo il funnel di acquisizione. 4. Portiamo i primi 10 clienti. 5. Sistematizziamo per crescere.",
        minChar: 80,
      },
      {
        key: "prova_sociale_concreta",
        label: "Un caso reale, con un numero o un risultato.",
        hint: "Nome + cosa è cambiato + in quanto tempo. Se non hai casi, scrivi quello più vicino al risultato (anche il tuo).",
        example:
          "Marco R., consulente assicurativo: da 0 a 8 clienti paganti in 45 giorni dopo il primo lancio, +6.200€/mese.",
        minChar: 50,
      },
    ],
  },
  {
    header: "Perché tu",
    items: [
      {
        key: "origin_story",
        label: "Perché sei proprio tu a fare questo?",
        hint: "Una storia vera, anche piccola: il momento in cui hai capito che dovevi farlo. È quello che ti rende credibile.",
        example:
          "Per anni ho vissuto di passaparola: un mese pieno, il dopo vuoto. Quando ho perso il cliente più grosso ho capito che mi serviva un sistema, non la fortuna. Da lì ho costruito il mio metodo.",
        minChar: 80,
      },
      {
        key: "contrarian_view",
        label: "Cosa pensi che gli altri nel tuo settore sbaglino?",
        hint: "Non per attaccare nessuno: per piantare la tua bandiera. Una frase netta.",
        example:
          "Tutti vendono template di funnel. Io penso che senza un posizionamento solido il funnel sia la cosa meno importante.",
        minChar: 50,
      },
      {
        key: "differenza_riconoscibile",
        label: "Come ti descriverebbe un cliente a un amico, in una frase?",
        hint: "Non \"il migliore di tutti\", ma una caratteristica concreta e riconoscibile.",
        example:
          "Quello che ti fa fare lo schema su carta prima di toccare qualsiasi strumento.",
        minChar: 40,
      },
    ],
  },
];

// Lista piatta con metadati di sezione per la navigazione una-domanda-per-schermata
const FLAT = SECTIONS.flatMap((s) =>
  s.items.map((it, i) => ({
    ...it,
    section: s.header,
    posInSection: i + 1,
    sectionCount: s.items.length,
  }))
);
const TOTAL = FLAT.length;

export default function Step04Posizionamento({ step, partnerId, onComplete, onSaveDraft }) {
  const [answers, setAnswers] = useState(step?.data?.answers || {});
  const [cur, setCur] = useState(0);
  const [showExample, setShowExample] = useState(false);
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

  const q = FLAT[cur];
  const value = answers[q.key] || "";
  const len = value.trim().length;
  const curOk = len >= q.minChar;
  const isLast = cur === TOTAL - 1;
  const canComplete = FLAT.every((it) => (answers[it.key] || "").trim().length >= it.minChar);

  const goTo = (idx) => {
    setCur(idx);
    setShowExample(false);
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useExample = () => update(q.key, q.example);

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

  const handleNext = () => {
    if (!curOk || submitting) return;
    if (isLast) finalize();
    else goTo(cur + 1);
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

  let validClass = "text-slate-500";
  let validText = "Scrivi qualche parola per andare avanti";
  if (curOk) {
    validClass = "text-green-600";
    validText = "✓ Perfetto, puoi andare avanti";
  } else if (len > 0) {
    validText = "Ci sei quasi — aggiungi ancora un dettaglio";
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header di avanzamento */}
      <div className="bg-slate-900 text-white px-5 py-4">
        <div className="flex justify-between items-center text-[13px] font-medium">
          <span>
            Domanda <b>{cur + 1}</b> di {TOTAL}
          </span>
          <span className="text-yellow-400 font-semibold">{q.section}</span>
        </div>
        <div className="h-2.5 bg-white/15 rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-300"
            style={{ width: `${((cur + 1) / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* Voce dell'agente di fase */}
      <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-5 py-3.5">
        <div className="w-11 h-11 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
          V
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">Valentina · Fase Esamina</div>
          <div className="text-sm leading-snug text-slate-900">
            Una domanda alla volta. Non c'è risposta sbagliata: scrivi come parli.
          </div>
        </div>
      </div>

      {/* Corpo domanda */}
      <div className="px-5 pt-6 pb-2">
        <div className="text-[13px] font-semibold text-slate-400 mb-2">
          Sezione "{q.section}" · {q.posInSection} di {q.sectionCount}
        </div>
        <div className="text-2xl font-bold leading-tight tracking-tight text-slate-900 mb-3">
          {q.label}
        </div>
        <div className="text-[15px] text-slate-600 leading-relaxed mb-4">{q.hint}</div>

        {!showExample ? (
          <button
            type="button"
            onClick={() => setShowExample(true)}
            className="w-full bg-slate-900 text-white font-semibold text-[15px] py-3.5 rounded-xl mb-4 hover:bg-slate-800 transition"
          >
            Non sai cosa scrivere? <span className="text-yellow-400">Mostrami un esempio →</span>
          </button>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3.5 mb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              💡 Un esempio (puoi copiarlo e cambiarlo)
            </div>
            <div className="text-[14.5px] text-slate-900 leading-relaxed italic">"{q.example}"</div>
            <button
              type="button"
              onClick={useExample}
              className="mt-2.5 bg-white border-2 border-slate-900 text-slate-900 font-semibold text-[13.5px] px-3.5 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Usa questo come base ✎
            </button>
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => update(q.key, e.target.value)}
          disabled={submitting}
          placeholder="Scrivi qui la tua risposta…"
          className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-[17px] leading-relaxed resize-y min-h-[120px] focus:outline-none focus:border-yellow-400 disabled:bg-gray-50"
        />
        <div className={`mt-3 text-[15px] font-semibold flex items-center gap-2 min-h-[24px] ${validClass}`}>
          {validText}
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigazione */}
      <div className="flex gap-3 px-5 pt-4 pb-2">
        {cur > 0 && (
          <button
            type="button"
            onClick={() => goTo(cur - 1)}
            disabled={submitting}
            className="flex-[0_0_34%] bg-white border-2 border-slate-200 text-slate-600 font-bold text-[17px] py-4 rounded-xl hover:bg-slate-50 transition disabled:opacity-40"
          >
            ← Indietro
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!curOk || submitting}
          className="flex-1 bg-yellow-400 text-slate-900 font-bold text-[17px] py-4 rounded-xl hover:bg-yellow-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {isLast
            ? submitting
              ? "Sto generando il documento…"
              : "Genera il documento ✓"
            : "Avanti →"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onSaveDraft && onSaveDraft({ answers })}
        className="block w-full text-center text-[13.5px] text-slate-500 underline pt-2 pb-4 hover:text-slate-700"
      >
        Salva e continuo più tardi
      </button>
      <p className="text-[12.5px] text-slate-500 text-center pb-5 leading-relaxed px-5">
        Le tue risposte si salvano da sole. Quando hai finito tutte e {TOTAL}, ci pensa il team a
        costruire i tuoi materiali.
      </p>
    </div>
  );
}
