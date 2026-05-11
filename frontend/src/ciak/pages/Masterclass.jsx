/**
 * Ciak.io /masterclass — LIV 2 lead magnet zero
 * Video 60' embedded YouTube unlisted. Email gate light se non già catturata in /.
 * Dopo visualizzazione: CTA verso /analisi (€67).
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

// TODO: rimpiazzare con video YouTube reale della masterclass (sessione masterclass-spec)
const MASTERCLASS_YOUTUBE_ID = "REPLACE_ME";

export function CiakMasterclass() {
  const [email, setEmail] = useState(localStorage.getItem("ciak_lead_email") || "");
  const [unlocked, setUnlocked] = useState(!!localStorage.getItem("ciak_lead_email"));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (unlocked && email) {
      // Best-effort: emette ciak_optin_masterclass se l'utente atterra qui senza
      // passare dalla landing (es. via link diretto). Idempotente lato backend:
      // se l'email e' gia' in ciak_leads, non ri-emette il tag su Systeme.
      const qs = new URLSearchParams(window.location.search);
      fetch("/api/ciak/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
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
  }, [unlocked, email]);

  const unlock = () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Inserisci un'email valida");
      return;
    }
    localStorage.setItem("ciak_lead_email", email.trim());
    setUnlocked(true);
    setError(null);
  };

  return (
    <>
      <CiakHeader />

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Masterclass gratuita · 60 minuti · on demand
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold mb-4">
            I 5 errori che fanno perdere clienti ai consulenti.
          </h1>
          <p className="text-slate-300 mb-8">
            Una lezione completa per capire se sei pronto a vendere online il tuo sapere e cosa serve davvero per
            iniziare. Niente fronzoli, niente promesse facili.
          </p>

          {!unlocked ? (
            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-8 max-w-xl">
              <h3 className="text-xl font-semibold mb-2">Sblocca la masterclass</h3>
              <p className="text-slate-600 text-sm mb-5">
                Inserisci la tua email per accedere. Niente spam: ti scriviamo solo se davvero serve.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && unlock()}
                  placeholder="la-tua-email@esempio.it"
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900"
                />
                <button
                  onClick={unlock}
                  className="px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
                >
                  Guarda gratis →
                </button>
              </div>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </div>
          ) : (
            <div className="bg-black rounded-2xl overflow-hidden aspect-video max-w-4xl">
              {MASTERCLASS_YOUTUBE_ID === "REPLACE_ME" ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <p className="text-lg font-medium mb-2">Video in caricamento</p>
                  <p className="text-sm">La masterclass sarà disponibile entro il <strong>4 giugno 2026</strong>.</p>
                </div>
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${MASTERCLASS_YOUTUBE_ID}?rel=0`}
                  title="Masterclass Ciak"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* POST-VIDEO CTA verso Analisi €67 */}
      {unlocked && (
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-3">
              Hai guardato la masterclass?
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
              Vuoi un'Analisi Strategica fatta su di te?
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Una call di 90 minuti con Claudio + un PDF di 8-12 pagine consegnato in 72 ore. Capisci esattamente cosa fare
              per partire bene — o se non è ancora il momento. <strong className="text-slate-900">€67 una tantum.</strong>
            </p>
            <Link
              to="/analisi"
              className="inline-block px-8 py-4 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
            >
              Scopri l'Analisi Strategica →
            </Link>
            <p className="text-xs text-slate-500 mt-4">
              Garanzia: se entro la call decidi che non fa per te, ti rimborsiamo entro 7 giorni.
            </p>
          </div>
        </section>
      )}

      <CiakFooter />
    </>
  );
}
