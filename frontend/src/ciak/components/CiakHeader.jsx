import { Link } from "react-router-dom";

export function CiakHeader({ variant = "default" }) {
  const isLight = variant === "light";
  return (
    <header className={`w-full border-b ${isLight ? "border-white/10 bg-slate-900 text-white" : "border-gray-200 bg-white text-slate-900"}`}>
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/ciak/logo.webp" alt="Ciak" className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <Link to="/masterclass" className={isLight ? "hover:text-yellow-400" : "hover:text-slate-600"}>Masterclass</Link>
          <Link to="/analisi" className={isLight ? "hover:text-yellow-400" : "hover:text-slate-600"}>Analisi €67</Link>
          <a href="https://www.evolution-pro.it" className={isLight ? "hover:text-yellow-400 opacity-70" : "hover:text-slate-600 opacity-70"}>Evolution PRO</a>
        </nav>
      </div>
    </header>
  );
}
