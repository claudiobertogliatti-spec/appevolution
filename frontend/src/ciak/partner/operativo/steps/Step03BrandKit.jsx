import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";

async function uploadFile(file, partnerId) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/partner-journey/operativo/upload/${partnerId}`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error(`Upload fallito: ${r.status}`);
  return (await r.json()).url;
}

const DEFAULT_COLORS = ["#0F172A", "#FACC15", "#E5E7EB"];
const TONE_MIN = 40;
const PAROLE_CHIAVE_SLOTS = 5;
const PAROLE_CHIAVE_MIN = 3;
const PAROLE_EVITARE_SLOTS = 3;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const TONE_PAIRS = [
  ["Molto formale", "Informale"],
  ["Razionale", "Emotivo"],
  ["Istituzionale", "Personale"],
  ["Tecnico", "Accessibile"],
  ["Calmo", "Energico"],
  ["Prudente", "Audace"],
];
const EMOZIONI = ["Motivato", "Tranquillo", "Compreso", "Curioso", "Sicuro", "Ispirato", "Competente", "Fiducioso", "Stimolato ad agire"];
const ESPRESSIONI_SLOTS = 3;
const EMOZIONI_MAX = 5;

export default function Step03BrandKit({ step, partnerId, onComplete, onSaveDraft }) {
  const initial = step?.data || {};

  const [logo, setLogo] = useState(initial.logo_url || "");
  const [foto, setFoto] = useState(initial.foto_url || "");
  const [colors, setColors] = useState(initial.colors || DEFAULT_COLORS);
  const [tone, setTone] = useState(initial.tone_of_voice || "");
  const [paroleChiave, setParoleChiave] = useState(() => {
    const src = initial.parole_chiave || [];
    return Array.from({ length: PAROLE_CHIAVE_SLOTS }, (_, i) => src[i] || "");
  });
  const [paroleEvitare, setParoleEvitare] = useState(() => {
    const src = initial.parole_evitare || [];
    return Array.from({ length: PAROLE_EVITARE_SLOTS }, (_, i) => src[i] || "");
  });
  const [tonoScale, setTonoScale] = useState(() => {
    const src = initial.tono_scale || [];
    return Array.from({ length: TONE_PAIRS.length }, (_, i) => (typeof src[i] === "number" ? src[i] : 2));
  });
  const [espressioni, setEspressioni] = useState(() => {
    const src = initial.espressioni || [];
    return Array.from({ length: ESPRESSIONI_SLOTS }, (_, i) => src[i] || "");
  });
  const [emozioni, setEmozioni] = useState(initial.emozioni || []);

  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [doc, setDoc] = useState(null);
  const [done, setDone] = useState(
    step?.approval_status === "pending_review" || step?.approval_status === "approved"
  );

  useEffect(() => {
    if (!partnerId) return;
    axios
      .get(`${API}/api/partner/brand-kit/document/${partnerId}`)
      .then((r) => setDoc(r.data || null))
      .catch(() => {});
  }, [partnerId]);

  // Autosave con DEBOUNCE: accumula le modifiche e salva una sola volta dopo
  // 600ms di inattività. Senza questo, ogni battitura faceva una POST e le
  // scritture concorrenti arrivavano fuori ordine, troncando il valore salvato
  // (bug "il brand non salva le info").
  const saveTimer = useRef(null);
  const pendingPatch = useRef({});
  const onSaveDraftRef = useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;
  const flushSave = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const toSave = pendingPatch.current;
    pendingPatch.current = {};
    if (onSaveDraftRef.current && Object.keys(toSave).length) {
      onSaveDraftRef.current(toSave);
    }
  };
  const update = (patch) => {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 600);
  };
  // Salva l'ultima modifica pendente quando si lascia lo step.
  useEffect(() => () => flushSave(), []);

  const updateColor = (i, v) => {
    const next = [...colors];
    next[i] = v;
    setColors(next);
    update({ colors: next });
  };

  const updateParola = (list, setList, key, i, v) => {
    const next = [...list];
    next[i] = v;
    setList(next);
    update({ [key]: next });
  };
  const updateTono = (i, v) => {
    const next = [...tonoScale];
    next[i] = v;
    setTonoScale(next);
    update({ tono_scale: next });
  };
  const toggleEmozione = (em) => {
    setEmozioni((prev) => {
      let next;
      if (prev.includes(em)) next = prev.filter((x) => x !== em);
      else if (prev.length >= EMOZIONI_MAX) next = prev;
      else next = [...prev, em];
      update({ emozioni: next });
      return next;
    });
  };

  const handleUpload = async (kind, file) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile(file, partnerId);
      if (kind === "logo") {
        setLogo(url);
        update({ logo_url: url });
      } else {
        setFoto(url);
        update({ foto_url: url });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const validColors = colors.length === 3 && colors.every((c) => HEX_RE.test(c));
  const paroleChiaveFilled = paroleChiave.filter((p) => (p || "").trim()).length;
  const toneOk = tone.trim().length >= TONE_MIN;
  const canComplete =
    logo &&
    foto &&
    validColors &&
    toneOk &&
    paroleChiaveFilled >= PAROLE_CHIAVE_MIN &&
    !busy &&
    !submitting;

  const finalize = async () => {
    // Annulla un eventuale autosave pendente: il finalize invia già il payload completo.
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingPatch.current = {};
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        logo_url: logo,
        foto_url: foto,
        colors,
        tone_of_voice: tone,
        parole_chiave: paroleChiave.filter((p) => (p || "").trim()),
        parole_evitare: paroleEvitare.filter((p) => (p || "").trim()),
        tono_scale: tonoScale,
        espressioni: espressioni.filter((p) => (p || "").trim()),
        emozioni,
      };
      if (onSaveDraft) await onSaveDraft(payload);
      const res = await axios.post(`${API}/api/partner/brand-kit/finalize`, {
        partner_id: partnerId,
      });
      setDone(true);
      setDoc({
        file_id: res.data.file_id,
        internal_url: res.data.internal_url,
        status: res.data.status,
        rejection_note: null,
      });
      if (onComplete) onComplete({ ...payload, approval_status: res.data.approval_status });
    } catch (e) {
      if (e?.response?.status === 409) {
        setError(e.response.data?.detail || "Brand kit già approvato dal team.");
      } else if (e?.response?.status === 400) {
        setError(e.response.data?.detail || "Brand kit incompleto.");
      } else {
        setError("Errore tecnico durante la generazione del brand kit. Riprova tra qualche minuto.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StepBase
        step={step}
        title="Il tuo marchio è arrivato al team"
        ctaDisabled={true}
        onCta={() => {}}
        secondaryNote=""
      >
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="font-semibold text-slate-900 mb-1">✓ Brand kit generato</div>
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
      step={step}
      title="Il tuo marchio: logo, foto e colori"
      ctaLabel={submitting ? "Sto generando il brand kit..." : "Genera Brand Kit"}
      ctaDisabled={!canComplete}
      onCta={finalize}
      secondaryNote="Carichi quello che hai; al resto pensiamo noi. Servono a dare al tuo progetto un’immagine coerente."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {doc?.status === "rejected" && doc?.rejection_note && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="font-semibold text-red-900 mb-1">Note dal team</div>
          <div className="whitespace-pre-wrap text-sm text-red-800">{doc.rejection_note}</div>
          <div className="text-xs text-red-700 mt-2">
            Aggiorna le risposte e rigenera quando sei pronto.
          </div>
        </div>
      )}

      {/* IDENTITA' VISIVA */}
      <SectionHeader title="Identità visiva" subtitle="Logo, foto, colori." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <UploadSlot
          label="Logo (PNG/SVG con sfondo trasparente)"
          accept="image/*,.svg"
          url={logo}
          onPick={(f) => handleUpload("logo", f)}
        />
        <UploadSlot
          label="Foto personale"
          accept="image/*"
          url={foto}
          onPick={(f) => handleUpload("foto", f)}
        />
      </div>

      <div className="mb-7">
        <div className="text-sm font-medium text-slate-900 mb-2">Colori brand (3)</div>
        <div className="flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-24 text-xs border border-gray-200 rounded px-2 py-1 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* VOCE */}
      <SectionHeader
        title="La voce del tuo Brand"
        subtitle="Il modo in cui le persone ti riconoscono prima ancora del tuo nome."
      />
      <p className="text-sm text-slate-600 leading-relaxed -mt-2 mb-5">
        Non pensare a "come dovrebbe parlare un professionista". Pensa a come parli quando spieghi
        qualcosa a un cliente che ti ascolta con interesse.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          1. Come parla il tuo brand?
        </label>
        <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">
          Descrivilo in 5-10 righe. Pensa a: sei diretto o riflessivo? Insegni o ispiri?
          Provocatorio o rassicurante? Usi esempi concreti? Fai domande? Sei tecnico o accessibile?
        </p>
        <p className="text-xs text-slate-400 mb-1.5 leading-relaxed">
          Es: "Parlo in modo semplice e diretto. Preferisco esempi reali alla teoria. Niente parole
          complicate: voglio che chiunque capisca subito. Mi rivolgo alle persone con rispetto ma
          senza formalità, come in una consulenza uno a uno."
        </p>
        <textarea
          value={tone}
          rows={5}
          disabled={submitting}
          onChange={(e) => {
            setTone(e.target.value);
            update({ tone_of_voice: e.target.value });
          }}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y disabled:bg-gray-50"
          placeholder="Scrivi qui, con parole tue…"
        />
        <CharCounter value={tone} min={TONE_MIN} />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          2. Il tono della tua comunicazione
        </label>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Per ogni coppia scegli dove ti riconosci di più.
        </p>
        <div className="space-y-3">
          {TONE_PAIRS.map(([left, right], i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-700 w-24 text-right flex-shrink-0">{left}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {[0, 1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={submitting}
                    onClick={() => updateTono(i, v)}
                    aria-label={`${left} verso ${right}: ${v + 1} di 5`}
                    className={`w-5 h-5 rounded-full border transition ${
                      tonoScale[i] === v
                        ? "bg-yellow-400 border-yellow-500"
                        : "bg-white border-slate-300 hover:border-yellow-400"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400 w-24 flex-shrink-0">{right}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          3. Le parole che usi spesso (almeno {PAROLE_CHIAVE_MIN})
        </label>
        <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">
          Le parole del tuo linguaggio quotidiano.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {paroleChiave.map((p, i) => (
            <input
              key={i}
              type="text"
              value={p}
              disabled={submitting}
              onChange={(e) =>
                updateParola(paroleChiave, setParoleChiave, "parole_chiave", i, e.target.value)
              }
              className="border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-yellow-400 disabled:bg-gray-50"
              placeholder={`Parola ${i + 1}`}
            />
          ))}
        </div>
        <div className="text-xs mt-1">
          <span className={paroleChiaveFilled >= PAROLE_CHIAVE_MIN ? "text-green-600" : "text-amber-600"}>
            {paroleChiaveFilled}/{PAROLE_CHIAVE_SLOTS} compilate · min {PAROLE_CHIAVE_MIN}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          4. Le espressioni che ti rappresentano
        </label>
        <p className="text-xs text-slate-500 mb-1 leading-relaxed">
          Frasi che dici spesso in consulenze, video o corsi.
        </p>
        <p className="text-xs text-slate-400 mb-1.5 leading-relaxed">
          Es: "Partiamo dalle basi." · "Facciamolo in modo pratico." · "La teoria da sola non basta."
        </p>
        <div className="space-y-2">
          {espressioni.map((p, i) => (
            <input
              key={i}
              type="text"
              value={p}
              disabled={submitting}
              onChange={(e) =>
                updateParola(espressioni, setEspressioni, "espressioni", i, e.target.value)
              }
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 disabled:bg-gray-50"
              placeholder={`Espressione ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          5. Le parole da evitare
        </label>
        <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">
          Quelle che non ti rappresentano: troppo aggressive, troppo tecniche o non coerenti col tuo stile.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {paroleEvitare.map((p, i) => (
            <input
              key={i}
              type="text"
              value={p}
              disabled={submitting}
              onChange={(e) =>
                updateParola(paroleEvitare, setParoleEvitare, "parole_evitare", i, e.target.value)
              }
              className="border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-yellow-400 disabled:bg-gray-50"
              placeholder={`Da evitare ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          6. Come vuoi far sentire chi ti ascolta?
        </label>
        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
          Quando una persona legge un tuo contenuto o guarda un tuo video, come dovrebbe sentirsi? Scegli fino a {EMOZIONI_MAX}.
        </p>
        <div className="flex flex-wrap gap-2">
          {EMOZIONI.map((em) => {
            const sel = emozioni.includes(em);
            return (
              <button
                key={em}
                type="button"
                disabled={submitting}
                onClick={() => toggleEmozione(em)}
                className={`text-sm rounded-full px-3 py-1.5 border transition ${
                  sel
                    ? "bg-yellow-100 border-yellow-300 text-yellow-800 font-medium"
                    : "bg-white border-gray-200 text-slate-600 hover:border-yellow-400"
                }`}
              >
                {em}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-slate-400 mt-1.5">{emozioni.length}/{EMOZIONI_MAX} selezionate</div>
      </div>

      {busy && <p className="text-xs text-slate-500 mt-3">Upload in corso...</p>}
    </StepBase>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4 pb-2 border-b border-slate-100">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 italic">{subtitle}</p>
    </div>
  );
}

function CharCounter({ value, min }) {
  const len = (value || "").trim().length;
  const ok = len >= min;
  return (
    <div className={`text-xs mt-1 ${ok ? "text-green-600" : "text-amber-600"}`}>
      {len}/{min} min
    </div>
  );
}

function UploadSlot({ label, accept, url, onPick }) {
  return (
    <label
      className={`block border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition ${
        url ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-400 hover:border-yellow-400"
      }`}
    >
      <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="text-sm font-medium text-slate-900">{label}</div>
      {url ? (
        <img src={url} alt="" className="mt-2 max-h-20 mx-auto rounded" />
      ) : (
        <div className="text-xs text-slate-500 mt-2">⬆ Clicca o trascina</div>
      )}
    </label>
  );
}
