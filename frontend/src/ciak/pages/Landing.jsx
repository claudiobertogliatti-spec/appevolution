/**
 * Ciak.io Landing — top funnel cold
 *
 * Obiettivo unico: portare il visitatore a guardare la Masterclass 60' gratis
 * (LIV 2 del funnel). Niente upsell aggressivo, niente "compra ora".
 * Tono: empatico, anti-coaching, parla a consulenti scarsamente digitalizzati.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const captureEmail = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Inserisci un'email valida");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Salva lead in backend (emette tag Systeme ciak_optin_masterclass) + redirect.
      // Best-effort: errori di rete non bloccano l'UX, l'email e' gia' in localStorage.
      const qs = new URLSearchParams(window.location.search);
      await fetch("/api/ciak/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "landing_hero",
          utm_source: qs.get("utm_source"),
          utm_medium: qs.get("utm_medium"),
          utm_campaign: qs.get("utm_campaign"),
          utm_term: qs.get("utm_term"),
          utm_content: qs.get("utm_content"),
          referrer: document.referrer || null,
        }),
      }).catch(() => null);
      // Salva email in localStorage per pre-fill su /masterclass
      localStorage.setItem("ciak_lead_email", email.trim());
      navigate("/masterclass");
    } catch (e) {
      setError("Errore di rete, riprova");
      setSubmitting(false);
    }
  };

  return (
    <>
      <CiakHeader />

      {/* HERO */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Per consulenti e coach che vogliono vendere online le proprie competenze
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-[1.1] mb-6">
            I 5 errori che fanno perdere<br />clienti ai consulenti.
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Una masterclass di 60 minuti, gratuita, senza fronzoli o tecnicismi.
            <br />Ti spiega come capire se sei pronto a vendere online il tuo lavoro.
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                placeholder="la-tua-email@esempio.it"
                className="flex-1 px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={captureEmail}
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
              >
                {submitting ? "..." : "Guarda gratis →"}
              </button>
            </div>
            {error && <p className="text-yellow-400 text-sm mt-2">{error}</p>}
            <p className="text-xs text-slate-400 mt-3 opacity-70">
              Nessuna carta. Nessun upsell. Nessuno spam.
            </p>
          </div>
        </div>
      </section>

      {/* COSA IMPARI */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-center text-slate-500 text-sm font-medium uppercase tracking-widest mb-3">
            Cosa scoprirai
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-center text-slate-900 mb-12">
            5 errori che probabilmente stai facendo<br />senza accorgertene
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { n: "01", t: "Provi a vendere a chiunque", d: "Senza un target chiaro, ogni messaggio si annacqua. Spendi tempo a parlare con persone che non compreranno mai." },
              { n: "02", t: "Hai paura di chiedere il giusto prezzo", d: "Svendi il tuo tempo per insicurezza. Risultato: lavori il triplo per guadagnare la metà." },
              { n: "03", t: "Pensi che 'farsi conoscere' basti", d: "Notorietà senza un sistema di vendita = chiacchiere. Ti chiamano per chiedere il preventivo, poi spariscono." },
              { n: "04", t: "Confondi competenza con offerta", d: "Sai fare il tuo lavoro. Ma il pacchetto che vendi non è chiaro nemmeno a te. Figurati al cliente." },
              { n: "05", t: "Non hai un metodo replicabile", d: "Ogni cliente è un caso a sé. Ricominci da zero ogni volta. Impossibile scalare, impossibile delegare." },
            ].map((item) => (
              <div key={item.n} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="text-yellow-400 font-semibold mb-2">{item.n}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.t}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA RIPETUTA */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
            Pronto a vederla?
          </h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            La masterclass dura 60 minuti. Puoi guardarla quando vuoi, senza prenotazioni.
          </p>
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && captureEmail()}
              placeholder="la-tua-email@esempio.it"
              className="flex-1 px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none border border-gray-300 focus:border-slate-900"
            />
            <button
              onClick={captureEmail}
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {submitting ? "..." : "Guarda gratis →"}
            </button>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
