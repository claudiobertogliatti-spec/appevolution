import { Link } from "react-router-dom";

/**
 * Footer Ciak.io — struttura lockata 2026-05-12.
 *
 * Footer link approvati:
 *   Masterclass Gratuita · Ciak Blueprint · Chi è Evolution PRO · Privacy · Condizioni
 *
 * "Chi è Evolution PRO" è link ESTERNO a www.evolution-pro.it (target=_blank,
 * separazione mondi Ciak/Evolution).
 *
 * I link legali Privacy/Cookie/Condizioni aprono la modale globale `epOpenPolicy`
 * iniettata dal CookieBanner. Idempotente: se il banner non è ancora montato,
 * l'handler diventa no-op.
 *
 * Riferimento: memory/ciak_brand_copy_framework.md (footer struttura definitiva).
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
            Il percorso diagnostico per consulenti, coach e professionisti che vogliono leggere
            con maggiore lucidità il proprio progetto digitale prima di investire in implementazione.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3 text-white">Percorso</h4>
          <ul className="space-y-2 opacity-80">
            <li>
              <Link to="/masterclass" className="hover:text-yellow-400">
                Masterclass Gratuita
              </Link>
            </li>
            <li>
              <Link to="/ciak-blueprint" className="hover:text-yellow-400">
                Ciak Blueprint
              </Link>
            </li>
            <li>
              <a
                href="https://www.evolution-pro.it"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-400"
              >
                Chi è Evolution PRO
              </a>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3 text-white">Informazioni legali</h4>
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
