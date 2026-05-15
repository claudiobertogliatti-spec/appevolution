/**
 * Ciak.io /masterclass — LIV 2 lead magnet.
 *
 * Copy lockato 2026-05-12. Riferimento memory/ciak_brand_copy_framework.md.
 *
 * 3 stati visuali della stessa pagina, attivati dal flusso utente:
 *   STATO 1 — Pre-opt-in (cold): hero + email gate
 *   STATO 2 — Post-opt-in: player YouTube + sticky bar che appare a 20min
 *   STATO 3 — Post-Checkpoint: già inglobato dal componente CheckpointStrategico
 *
 * Sticky bar a 20:00 (~67% del video ~30min; non onEnded — perderemmo utenti
 * buoni che non arrivano al 100%).
 */
import { useState, useEffect } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { CheckpointStrategico } from "../components/CheckpointStrategico";

// Masterclass Ciak definitiva — video prodotto e approvato da Claudio (14/5/2026).
// Transcript verbatim: docs/marketing/masterclass-transcript-final.md
const MASTERCLASS_YOUTUBE_ID = "E2XDEdJgzcQ";
const CHECKPOINT_UNLOCK_SECONDS = 20 * 60; // 20 minuti (video ~30 min, sticky al ~67%)
// Dev override: ?fast=1 nello URL → timer abbassato a 5s per testing.
const FAST_CHECKPOINT_SECONDS = 5;

export function CiakMasterclass() {
  const isFastMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fast") === "1";
  const unlockSeconds = isFastMode ? FAST_CHECKPOINT_SECONDS : CHECKPOINT_UNLOCK_SECONDS;

  const [nome, setNome] = useState(localStorage.getItem("ciak_lead_name") || "");
  const [email, setEmail] = useState(localStorage.getItem("ciak_lead_email") || "");
  const [unlocked, setUnlocked] = useState(!!localStorage.getItem("ciak_lead_email"));
  const [error, setError] = useState(null);
  const [checkpointAvailable, setCheckpointAvailable] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  // Idempotent: emette ciak_optin_masterclass se l'utente atterra qui senza
  // passare dalla landing. Il backend dedupe per email.
  useEffect(() => {
    if (unlocked && email) {
      const qs = new URLSearchParams(window.location.search);
      fetch("/api/ciak/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nome: nome || null,
          source: "masterclass_gate",
          utm_source: qs.get("utm_source"),
          utm_medium: qs.get("utm_medium"),
          utm_campaign: qs.get("utm_campaign"),
          utm_term: qs.get("utm_term"),
          utm_content: qs.get("utm_content"),
          referrer: document.referrer || null,
        }),
      }).catch(() => null);
    }
  }, [unlocked, email, nome]);

  // Apertura automatica del Checkpoint a FINE VIDEO (YouTube IFrame API).
  // L'API emette `onStateChange` con data=0 (ENDED) quando il video finisce →
  // mostriamo direttamente la sezione Checkpoint (senza richiedere click).
  //
  // Timer fallback: se l'utente non arriva a ENDED (pausa, chiusura tab, ecc.)
  // dopo `unlockSeconds` (20 min default, 5s con ?fast=1) rendiamo comunque
  // disponibile la sticky bar come fallback manuale. Doppia rete.
  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(() => setCheckpointAvailable(true), unlockSeconds * 1000);
    return () => clearTimeout(t);
  }, [unlocked, unlockSeconds]);

  // Auto-show on video ended via YouTube IFrame API.
  useEffect(() => {
    if (!unlocked || showCheckpoint) return;
    if (MASTERCLASS_YOUTUBE_ID === "REPLACE_ME") return;

    let player = null;
    let cancelled = false;

    const onEnded = () => {
      setCheckpointAvailable(true);
      setShowCheckpoint(true);
      setTimeout(() => {
        document.getElementById("ep-checkpoint-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };

    const initPlayer = () => {
      if (cancelled || !window.YT || !window.YT.Player) return;
      // L'iframe deve esistere nel DOM con id="yt-masterclass" (vedi src sotto).
      player = new window.YT.Player("yt-masterclass", {
        events: {
          onStateChange: (e) => {
            // state === 0 → ENDED
            if (e.data === 0) onEnded();
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      // API già caricata (es. navigation client-side a /masterclass dopo first load).
      initPlayer();
    } else {
      // Carica IFrame API una sola volta. window.onYouTubeIframeAPIReady è un
      // callback globale ufficiale dell'API.
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        initPlayer();
      };
    }

    return () => {
      cancelled = true;
      try { if (player && player.destroy) player.destroy(); } catch (_) { /* noop */ }
    };
  }, [unlocked, showCheckpoint]);

  // Domini palesemente non-deliverable: Systeme.io li rifiuta con 422 e il
  // contatto non viene mai creato → nessuna sequenza email parte → tutto il
  // flusso post-checkpoint è muto. Blocchiamo lato client con un messaggio
  // chiaro invece di lasciare l'utente in errore silenzioso.
  const FAKE_DOMAINS = new Set([
    "example.com", "example.it", "example.org",
    "test.com", "test.it",
    "mailinator.com", "yopmail.com", "guerrillamail.com",
    "trashmail.com", "10minutemail.com", "tempmail.com",
    "fake.com", "fakeinbox.com", "asdf.com",
  ]);

  const unlock = () => {
    const n = nome.trim();
    const e = email.trim().toLowerCase();
    if (n.length < 2) {
      setError("Inserisci il tuo nome");
      return;
    }
    // Email rudimental check (formato + @ + dot dopo)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("Inserisci un'email valida");
      return;
    }
    const domain = e.split("@")[1];
    if (FAKE_DOMAINS.has(domain)) {
      setError("Questa email non riceve messaggi. Inserisci l'indirizzo che usi davvero — il Checkpoint te lo mandiamo lì.");
      return;
    }
    localStorage.setItem("ciak_lead_name", n);
    localStorage.setItem("ciak_lead_email", e);
    setNome(n);
    setEmail(e);
    setUnlocked(true);
    setError(null);
  };

  const goToCheckpoint = () => {
    setShowCheckpoint(true);
    setTimeout(() => {
      document.getElementById("ep-checkpoint-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <>
      <CiakHeader />

      {/* STATO 1 — PRE-OPT-IN */}
      {!unlocked && (
        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-4xl px-6 pt-16 pb-20">
            <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Masterclass Gratuita
            </p>
            <h1 className="text-3xl md:text-5xl font-semibold leading-[1.15] mb-6">
              Una masterclass per consulenti e professionisti che vogliono capire perché
              la propria competenza online non sta crescendo come dovrebbe.
            </h1>
            <p className="text-base md:text-lg text-slate-300 mb-10 leading-relaxed max-w-3xl">
              30 minuti di analisi diretta sui 5 errori più comuni che impediscono di trasformare
              una competenza professionale in un modello digitale sostenibile. Senza fluff,
              senza storytelling.
            </p>

            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-8 max-w-2xl mb-10">
              <h2 className="text-lg font-semibold mb-5">Cosa vedrai</h2>
              <ul className="space-y-4 text-sm md:text-base leading-relaxed">
                <li>
                  <strong className="text-slate-900">I 5 Errori</strong> che fermano la maggior parte dei consulenti prima ancora di iniziare.
                </li>
                <li>
                  I <strong className="text-slate-900">4 livelli ricorrenti di maturità strategica</strong> che abbiamo osservato negli ultimi anni.
                </li>
                <li>
                  La differenza tra <strong className="text-slate-900">costruire una vetrina online</strong> e <strong className="text-slate-900">costruire un modello digitale sostenibile</strong>.
                </li>
              </ul>
            </div>

            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Accedi alla masterclass
              </p>

              {/* Disclaimer prominente — perché servono nome + email vera */}
              <div className="mt-3 mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-slate-800 leading-relaxed">
                  <strong className="text-slate-900">Inserisci nome ed email reali.</strong> Alla fine della
                  masterclass ti arriva via email il <strong>Checkpoint Strategico</strong> con il tuo punteggio
                  e lo stato esatto in cui si trova la tua attività. Con dati finti non possiamo raggiungerti
                  e il risultato resta a metà.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && unlock()}
                  placeholder="Il tuo nome"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && unlock()}
                    placeholder="La tua email"
                    autoComplete="email"
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900"
                  />
                  <button
                    onClick={unlock}
                    className="px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
                  >
                    Accedi
                  </button>
                </div>
              </div>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                Niente spam, niente upsell automatici. Solo il Checkpoint e qualche nota di follow-up
                pertinente. Puoi disiscriverti in qualsiasi momento.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STATO 2 — VIDEO IN CORSO */}
      {unlocked && !showCheckpoint && (
        <>
          <section className="bg-slate-900 text-white">
            <div className="mx-auto max-w-5xl px-6 pt-10 pb-6">
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Masterclass Ciak
              </p>
              <p className="text-slate-300 mb-6 leading-relaxed max-w-3xl">
                Quando avrai finito di guardare, troverai un breve Checkpoint Strategico per fissare la tua posizione attuale.
              </p>
              <div className="bg-black rounded-2xl overflow-hidden aspect-video w-full">
                {MASTERCLASS_YOUTUBE_ID === "REPLACE_ME" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <p className="text-lg font-medium mb-2">Video in caricamento</p>
                    <p className="text-sm">La masterclass sarà disponibile entro il <strong>4 giugno 2026</strong>.</p>
                  </div>
                ) : (
                  <iframe
                    id="yt-masterclass"
                    src={`https://www.youtube.com/embed/${MASTERCLASS_YOUTUBE_ID}?rel=0&enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
                    title="Masterclass Ciak"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          </section>

          {/* STICKY BAR — fallback se il video non arriva a ENDED (chiusa tab,
              scrubbing, ecc.). Quando il video finisce normalmente il Checkpoint
              si apre da solo. */}
          {checkpointAvailable && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-yellow-400 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] z-40">
              <div className="mx-auto max-w-5xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm md:text-base text-slate-700 leading-snug">
                  Hai visto abbastanza per fissare la tua posizione attuale.
                </p>
                <button
                  type="button"
                  onClick={goToCheckpoint}
                  className="flex-shrink-0 px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition text-sm md:text-base"
                >
                  Vai al Checkpoint Strategico
                </button>
              </div>
            </div>
          )}

          {/* Spacer per non coprire contenuto con sticky bar */}
          {checkpointAvailable && <div className="h-24" />}
        </>
      )}

      {/* STATO 3 — CHECKPOINT STRATEGICO */}
      {unlocked && showCheckpoint && (
        <div id="ep-checkpoint-section">
          <CheckpointStrategico source="masterclass" />
        </div>
      )}

      <CiakFooter />
    </>
  );
}
