import { Link } from "react-router-dom";

/**
 * Click handlers per i link legali: chiamano la funzione globale `epOpenPolicy`
 * iniettata dal CookieBanner. Se per qualsiasi motivo il banner non è ancora
 * montato, l'evento non rompe (handler diventa no-op).
 */
function openPolicy(tab) {
  if (typeof window !== "undefined" && typeof window.epOpenPolicy === "function") {
    window.epOpenPolicy(tab);
  }
}

export function CiakFooter({ dark = true }) {
  return (
    <footer className={`mt-20 ${dark ? "bg-slate-900 text-slate-300" : "bg-gray-100 text-slate-700"}`}>
      <div className="mx-auto max-w-6xl px-6 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <img src="/ciak/logo.webp" alt="Ciak" className="h-10 w-auto mb-3 brightness-0 invert" />
          <p className="text-sm leading-relaxed opacity-70">
            Ciak è il punto di partenza per consulenti e coach che vogliono iniziare a vendere online le proprie
            competenze senza perderci la testa.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3 text-white">Servizi</h4>
          <ul className="space-y-2 opacity-80">
            <li><Link to="/analisi" className="hover:text-yellow-400">Analisi Strategica €67</Link></li>
            <li><a href="https://www.evolution-pro.it" className="hover:text-yellow-400">Partnership Evolution PRO</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3 text-white">Info</h4>
          <ul className="space-y-2 opacity-80">
            <li>
              <button type="button" onClick={() => openPolicy("privacy")} className="hover:text-yellow-400 text-left">
                Privacy Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => openPolicy("cookie")} className="hover:text-yellow-400 text-left">
                Cookie Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => openPolicy("vendita")} className="hover:text-yellow-400 text-left">
                Condizioni di Vendita
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
        © {new Date().getFullYear()} <strong>Evolution Pro LLC</strong> · <a href="mailto:assistenza@evolution-pro.it" className="hover:text-yellow-400">assistenza@evolution-pro.it</a>
      </div>
    </footer>
  );
}
