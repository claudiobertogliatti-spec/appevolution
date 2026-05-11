import { Link } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakNotFound() {
  return (
    <>
      <CiakHeader />
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-3">Errore 404</p>
          <h1 className="text-3xl font-semibold mb-3">Questa pagina non esiste.</h1>
          <p className="text-slate-600 mb-6">Probabilmente hai seguito un link vecchio o sbagliato.</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition">
            Torna alla home →
          </Link>
        </div>
      </div>
      <CiakFooter />
    </>
  );
}
