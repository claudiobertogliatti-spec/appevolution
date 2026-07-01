import { ArrowRight, CheckCircle2, FolderOpen, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function TelegramSupportPage({ partner }) {
  const telegramUrl =
    partner?.telegram_group_url ||
    partner?.telegram_url ||
    partner?.telegramGroupUrl ||
    "";

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
            Supporto umano
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 mt-2">Il tuo gruppo Telegram</h1>
          <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-2xl">
            Ciak tiene ordinati percorso, materiali e prossimi passi. Telegram serve per il contatto
            umano rapido con il team Evolution PRO, quando hai bisogno di una conferma o di un confronto.
          </p>
        </header>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center flex-shrink-0">
              <Send className="w-8 h-8 text-sky-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">
                {telegramUrl ? "Apri il gruppo personale" : "Colleghiamo il tuo gruppo personale"}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                {telegramUrl
                  ? "Usalo per messaggi rapidi, conferme e supporto umano. Le decisioni operative e i materiali restano dentro Ciak."
                  : "Se il gruppo non è ancora collegato al tuo profilo, richiedilo qui: il team ti aiuterà ad attivarlo e a collegarlo al percorso."}
              </p>
            </div>
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 transition"
              >
                Apri Telegram
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <Link
                to="/partner/team-ciak"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Richiedi collegamento
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-3" />
            <p className="text-sm font-semibold text-slate-900">Conferme rapide</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Quando ti serve una risposta breve dal team umano.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <Users className="w-5 h-5 text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-slate-900">Presenza del team</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Hai la percezione di essere seguito anche fuori dalle schermate operative.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <FolderOpen className="w-5 h-5 text-yellow-600 mb-3" />
            <p className="text-sm font-semibold text-slate-900">Ordine dentro Ciak</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              File, consegne e prossimi passi restano sempre rintracciabili qui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelegramSupportPage;
