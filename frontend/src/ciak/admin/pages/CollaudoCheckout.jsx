import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, KeyRound, TerminalSquare } from "lucide-react";
import { PRICING } from "../../pricing";

/**
 * Collaudo checkout — runbook della prova end-to-end del pagamento in TEST.
 *
 * Sola lettura. La prova con Stripe reale-test NON è automatizzabile da qui:
 * richiede le chiavi test, il webhook e i login (credenziali di Claudio). I
 * test automatici con Stripe finto coprono già il codice; questo pannello dice
 * cosa serve per il giro completo a mano, senza soldi veri.
 */

const IMPORTI = [
  { nome: "Ciak Start", importo: PRICING.start.label, endpoint: "POST /api/ciak/client/start/checkout" },
  { nome: "Partnership (cliente, con credito Start)", importo: PRICING.upgradeFromStart.label, endpoint: "POST /api/ciak/client/partnership/checkout" },
  { nome: "Partnership (proposta firmata)", importo: PRICING.partnership.label, endpoint: "POST /api/proposta/:token/pagamento-stripe" },
];

const SERVE = [
  "STRIPE_API_KEY = sk_test_… (stessa variabile per test e live: conta il prefisso)",
  "STRIPE_WEBHOOK_SECRET = whsec_… (il webhook /api/webhooks/stripe è fail-closed: senza, risponde 503)",
  "Stripe CLI: stripe listen --forward-to localhost:8001/api/webhooks/stripe",
  "Carta di test Stripe: 4242 4242 4242 4242 (qualsiasi data futura + CVC)",
  "JWT admin per fissare offer_decision (ciak_start / partnership) sul lead",
  "Backend vivo + MongoDB con il lead nello stato giusto (call_done, contratto firmato per la proposta)",
];

const COPERTO = [
  "test_ciak_clients_router.py — importi e gate di Start/Partnership (Stripe finto)",
  "test_proposta_security.py — la conferma NON attiva il partner se Stripe fallisce",
  "test_stripe_webhook_security.py — il webhook rifiuta senza firma valida",
];

export function CollaudoCheckout() {
  return (
    <div className="p-10 max-w-4xl">
      <Link
        to="/admin/reparto/acquisizione-vendita"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Acquisizione e vendita
      </Link>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        Acquisizione e vendita
      </p>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Collaudo checkout</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        Il runbook per provare il pagamento end-to-end <strong>in ambiente di test</strong>,
        senza soldi veri. Il giro reale usa le tue chiavi Stripe di test: non parte da qui.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <p className="text-sm font-medium text-slate-700 mb-4">Cosa addebita davvero il checkout</p>
        <div className="space-y-3">
          {IMPORTI.map((r) => (
            <div key={r.nome} className="flex items-baseline justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm text-slate-900">{r.nome}</p>
                <p className="text-xs text-slate-400 font-mono">{r.endpoint}</p>
              </div>
              <p className="text-lg font-semibold text-slate-900 whitespace-nowrap">{r.importo}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-4">
          <KeyRound className="w-4 h-4 text-slate-400" /> Cosa serve (tue credenziali)
        </p>
        <ul className="space-y-2">
          {SERVE.map((s) => (
            <li key={s} className="text-sm text-slate-600 leading-relaxed flex gap-2">
              <span className="text-slate-300 mt-0.5">▹</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-400 mb-4">
          <TerminalSquare className="w-4 h-4" /> Il giro, in ordine
        </p>
        <ol className="space-y-3 text-sm text-slate-200 leading-relaxed list-decimal list-inside">
          <li>Avvia il backend con le env di test e apri <span className="font-mono">stripe listen</span> verso il webhook.</li>
          <li>Da admin, fissa <span className="font-mono">offer_decision</span> del lead (Start o Partnership).</li>
          <li>Come cliente, apri il checkout e paga con la carta di test 4242…</li>
          <li>Verifica che il webhook firmato attivi l'account e generi il PDF firmato solo <strong>dopo</strong> il pagamento.</li>
          <li>Controlla che un abbandono a metà <strong>non</strong> lasci un account o un "contratto firmato" fantasma.</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-4">
          <ShieldCheck className="w-4 h-4 text-slate-400" /> Già coperto dai test automatici (Stripe finto)
        </p>
        <ul className="space-y-2">
          {COPERTO.map((s) => (
            <li key={s} className="text-sm text-slate-600 leading-relaxed font-mono flex gap-2">
              <span className="text-slate-300 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
