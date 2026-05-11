import { Link } from "react-router-dom";

export function CiakFooter({ dark = true }) {
  return (
    <footer className={`mt-20 ${dark ? "bg-slate-900 text-slate-300" : "bg-gray-100 text-slate-700"}`}>
      <div className="mx-auto max-w-6xl px-6 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <img src="/ciak/logo.webp" alt="Ciak" className="h-8 w-auto mb-3 brightness-0 invert" />
          <p className="text-sm leading-relaxed opacity-70">
            Ciak è il punto di partenza per consulenti e coach che vogliono iniziare a vendere online il proprio
            sapere senza perderci la testa.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3 text-white">Percorso</h4>
          <ul className="space-y-2 opacity-80">
            <li><Link to="/masterclass" className="hover:text-yellow-400">Masterclass gratuita</Link></li>
            <li><Link to="/analisi" className="hover:text-yellow-400">Analisi Strategica €67</Link></li>
            <li><a href="https://www.evolution-pro.it" className="hover:text-yellow-400">Partnership Evolution PRO</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3 text-white">Info</h4>
          <ul className="space-y-2 opacity-80">
            <li><a href="https://www.evolution-pro.it/legal/privacy" className="hover:text-yellow-400">Privacy Policy</a></li>
            <li><a href="https://www.evolution-pro.it/legal/cookie" className="hover:text-yellow-400">Cookie Policy</a></li>
            <li><a href="https://www.evolution-pro.it/legal/termini" className="hover:text-yellow-400">Termini e Condizioni</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-50">
        © {new Date().getFullYear()} Evolution PRO S.r.l. — P.IVA in caricamento
      </div>
    </footer>
  );
}
