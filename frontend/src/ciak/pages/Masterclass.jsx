/**
 * Ciak.io /masterclass — LIV 2 lead magnet.
 *
 * Flusso (riordinato 2026-05-27 con Claudio):
 *   STATO 1 — GATE FORM: nome + email + telefono OBBLIGATORI per sbloccare
 *   STATO 2 — VIDEO masterclass (YouTube)
 *   STATO 3 — POST-VIDEO: CTA "Scopri da dove partire" → 8 Domande (/diagnostica)
 *
 * Le 8 Domande Ciak (lead magnet approfondito che classifica → CTA €67) sono
 * ora DOPO la masterclass, non più dopo il pagamento.
 *
 * Copy hero lockato 2026-05-12. Riferimento memory/ciak_brand_copy_framework.md.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

// Masterclass Ciak definitiva — video prodotto e approvato da Claudio (14/5/2026).
const MASTERCLASS_YOUTUBE_ID = "E2XDEdJgzcQ";
const CTA_UNLOCK_SECONDS = 20 * 60; // 20 min (video ~30 min, CTA al ~67%)
const FAST_CTA_SECONDS = 5; // ?fast=1 per testing

// Domini palesemente non-deliverable: Systeme.io li rifiuta con 422.
const FAKE_DOMAINS = new Set([
  "example.com", "example.it", "example.org",
  "test.com", "test.it",
  "mailinator.com", "yopmail.com", "guerrillamail.com",
  "trashmail.com", "10minutemail.com", "tempmail.com",
  "fake.com", "fakeinbox.com", "asdf.com",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasGate() {
  try {
    return (
      !!localStorage.getItem("ciak_lead_email") &&
      !!localStorage.getItem("ciak_lead_phone")
    );
  } catch {
    return false;
  }
}

export function CiakMasterclass() {
  const isFastMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("fast") === "1";
  const unlockSeconds = isFastMode ? FAST_CTA_SECONDS : CTA_UNLOCK_SECONDS;

  const [nome, setNome] = useState(localStorage.getItem("ciak_lead_name") || "");
  const [email, setEmail] = useState(localStorage.getItem("ciak_lead_email") || "");
  const [telefono, setTelefono] = useState(localStorage.getItem("ciak_lead_phone") || "");
  const [error, setError] = useState(null);

  // phase: "form" | "video"
  const [phase, setPhase] = useState(hasGate() ? "video" : "form");
  // CTA 8 domande disponibile (a fine video o timer fallback)
  const [ctaAvailable, setCtaAvailable] = useState(false);

  // Idempotent lead-capture quando il gate è completo (email+telefono).
  useEffect(() => {
    if (phase !== "video" || !email) return;
    const qs = new URLSearchParams(window.location.search);
    fetch("/api/ciak/lead-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        nome: nome || null,
        telefono: telefono || null,
        source: "masterclass_gate",
        utm_source: qs.get("utm_source"),
        utm_medium: qs.get("utm_medium"),
        utm_campaign: qs.get("utm_campaign"),
        utm_term: qs.get("utm_term"),
        utm_content: qs.get("utm_content"),
        referrer: document.referrer || null,
      }),
    }).catch(() => null);
  }, [phase, email, nome, telefono]);

  // Timer fallback per CTA 8 domande (se l'utente non arriva a ENDED).
  useEffect(() => {
    if (phase !== "video") return;
    const t = setTimeout(() => setCtaAvailable(true), unlockSeconds * 1000);
    return () => clearTimeout(t);
  }, [phase, unlockSeconds]);

  // Auto-mostra CTA 8 domande a fine video (YouTube IFrame API).
  useEffect(() => {
    if (phase !== "video") return;
    if (MASTERCLASS_YOUTUBE_ID === "REPLACE_ME") return;

    let player = null;
    let cancelled = false;

    const onEnded = () => {
      setCtaAvailable(true);
      setTimeout(() => {
        document.getElementById("ep-cta-8domande")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };

    const initPlayer = () => {
      if (cancelled || !window.YT || !window.YT.Player) return;
      player = new window.YT.Player("yt-masterclass", {
        events: {
          onStateChange: (e) => {
            if (e.data === 0) onEnded(); // 0 = ENDED
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
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
  }, [phase]);

  const submitGate = () => {
    const n = nome.trim();
    const e = email.trim().toLowerCase();
    const tel = telefono.trim();

    if (n.length < 2) {
      setError("Inserisci il tuo nome");
      return;
    }
    if (!EMAIL_RE.test(e)) {
      setError("Inserisci un'email valida");
      return;
    }
    if (FAKE_DOMAINS.has(e.split("@")[1])) {
      setError("Questa email non riceve messaggi. Inserisci l'indirizzo che usi davvero — il Checkpoint te lo mandiamo lì.");
      return;
    }
    // Telefono: almeno 6 cifre (accetta +, spazi, trattini, parentesi)
    const digits = tel.replace(/[^\d]/g, "");
    if (digits.length < 6) {
      setError("Inserisci un numero di telefono valido");
      return;
    }

    try {
      localStorage.setItem("ciak_lead_name", n);
      localStorage.setItem("ciak_lead_email", e);
      localStorage.setItem("ciak_lead_phone", tel);
    } catch { /* ignore */ }

    setNome(n);
    setEmail(e);
    setTelefono(tel);
    setError(null);
    setPhase("video");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  return (
    <>
      <CiakHeader />

      {/* STATO 1 — GATE FORM */}
      {phase === "form" && (
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

              <div className="mt-3 mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-slate-800 leading-relaxed">
                  <strong className="text-slate-900">Inserisci dati reali.</strong> Subito dopo ti
                  portiamo alla masterclass. Con dati finti non possiamo raggiungerti e il follow-up resta a metà.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitGate()}
                  placeholder="Il tuo nome"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitGate()}
                  placeholder="La tua email"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900"
                />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitGate()}
                  placeholder="Il tuo telefono"
                  autoComplete="tel"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900"
                />
                <button
                  onClick={submitGate}
                  className="mt-1 px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
                >
                  Accedi alla masterclass
                </button>
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

      {/* STATO 2 — VIDEO + STATO 3 — CTA 8 DOMANDE */}
      {phase === "video" && (
        <>
          <section className="bg-slate-900 text-white">
            <div className="mx-auto max-w-5xl px-6 pt-10 pb-6">
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Masterclass Ciak
              </p>
              <p className="text-slate-300 mb-6 leading-relaxed max-w-3xl">
                Quando avrai finito di guardare, ti proponiamo le 8 Domande Ciak: in pochi minuti
                scopri il tuo stato attuale e capisci quale passo ha senso fare prima di investire.
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

          {/* CTA 8 DOMANDE — appare a fine video o dopo il timer fallback */}
          {ctaAvailable && (
            <section id="ep-cta-8domande" className="bg-white">
              <div className="mx-auto max-w-3xl px-6 py-16 text-center">
                <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-3">
                  Prossimo passo
                </p>
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 leading-tight">
                  Scopri il tuo stato attuale
                </h2>
                <p className="text-slate-600 leading-relaxed mb-8 max-w-xl mx-auto">
                  Rispondi alle 8 Domande Ciak (2-3 minuti). Prima di pensare a strumenti,
                  campagne o percorsi più grandi, capisci dove sei e da quale direzione partire.
                </p>
                <Link
                  to="/diagnostica"
                  className="inline-block px-8 py-4 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
                >
                  Inizia le 8 Domande Ciak →
                </Link>
              </div>
            </section>
          )}

          {/* Sticky bar fallback */}
          {ctaAvailable && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-yellow-400 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] z-40">
              <div className="mx-auto max-w-5xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm md:text-base text-slate-700 leading-snug">
                  Hai visto abbastanza: ora scopri il tuo stato attuale.
                </p>
                <Link
                  to="/diagnostica"
                  className="flex-shrink-0 px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition text-sm md:text-base"
                >
                  Vai alle 8 Domande Ciak →
                </Link>
              </div>
            </div>
          )}

          {ctaAvailable && <div className="h-24" />}
        </>
      )}

      <CiakFooter />
    </>
  );
}
