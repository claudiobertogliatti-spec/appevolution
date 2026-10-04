import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import "../insider/insider.css";
import ContractAccept, { PassiContratto } from "../insider/ContractAccept";
import { offerData } from "../insider/offerData";
import { formatDeadlineWithTime } from "../insider/timeline";
import { clientPost } from "./api";

/**
 * Contratto e pagamento della Partnership, dentro la pagina Partnership dell'area cliente.
 *
 * Stesso flusso gia' in produzione sulla pagina di chiusura (ora ritirata), con le stesse chiamate e gli stessi gate:
 *   proposta del cliente -> /accetta -> contratto in 4 passi (leggi, dati personali -> /dati-contratto, approva le clausole, paga)
 *   -> /firma-contratto (doppia sottoscrizione: accettazione + approvazione specifica) -> /pagamento-stripe -> Stripe.
 * La proposta la ottiene il cliente da qui (`POST /api/ciak/client/partnership/proposta`): se ne esiste gia' una attiva
 * si riusa; se ne esisteva una scaduta NON se ne crea un'altra (la scadenza e' reale, la riapre il team).
 *
 * Mai un finto successo: ogni errore e' detto com'e', e dopo la firma un errore di pagamento riporta al contratto
 * senza far ripartire da capo.
 */
const SUPPORT_EMAIL = "assistenza@evolution-pro.it";

async function responseError(response) {
  const data = await response.json().catch(() => ({}));
  return data?.detail?.message || (typeof data?.detail === "string" ? data.detail : `Errore ${response.status}`);
}

function friendly(e) {
  if (e?.message === "AUTH_EXPIRED") return "La tua sessione è scaduta: riapri il link ricevuto via email.";
  return e?.message || "Errore";
}

export function PartnershipCheckout({ proposta, checkoutReadiness, onProposta }) {
  // 'idle' -> 'working' -> 'contract' -> 'processing'. Dopo la firma un errore riporta a 'contract'.
  const [step, setStep] = useState("idle");
  const [error, setError] = useState("");
  const [prop, setProp] = useState(proposta?.token ? proposta : null);
  const busy = useRef(false);

  const enabled = checkoutReadiness?.partnership?.enabled === true;
  const closedMessage =
    checkoutReadiness?.message || "Il pagamento non è ancora disponibile. Il team ti avviserà quando potrai procedere.";
  const scaduta = proposta?.scaduta === true && !prop;
  const completata = proposta?.stato === "pagamento_completato";
  const scadenza = prop?.scadenza ? formatDeadlineWithTime(prop.scadenza) : null;

  async function handleStart() {
    if (!enabled || step !== "idle" || busy.current) return;
    busy.current = true;
    setError("");
    setStep("working");
    try {
      let current = prop;
      if (!current?.token) {
        current = await clientPost("/partnership/proposta");
        setProp(current);
        if (onProposta) onProposta(current);
      }
      const res = await fetch(`/api/proposta/${current.token}/accetta`, { method: "POST" });
      if (!res.ok) throw new Error(await responseError(res));
      setStep("contract");
    } catch (e) {
      setError(friendly(e));
      setStep("idle");
    } finally {
      busy.current = false;
    }
  }

  // Passo 2 del contratto: i dati anagrafici vanno al server PRIMA dei consensi, legati alla proposta.
  async function handleDati(dati) {
    if (!enabled || !prop?.token) throw new Error("Proposta non disponibile");
    const res = await fetch(`/api/proposta/${prop.token}/dati-contratto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dati),
    });
    if (!res.ok) throw new Error(await responseError(res));
  }

  // Doppia sottoscrizione: ogni consenso arriva dalla scelta reale del cliente nel contratto, mai da un `true` fisso.
  async function handleConfirm({ consenso_contratto, approvazione_specifica_clausole, dichiarazione_imprenditoriale, piva } = {}) {
    if (!enabled || busy.current || !prop?.token) return;
    busy.current = true;
    setError("");
    setStep("processing");
    try {
      const signRes = await fetch(`/api/proposta/${prop.token}/firma-contratto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consenso_checkbox: consenso_contratto === true,
          clausole_vessatorie_approved: approvazione_specifica_clausole === true,
          approvazione_specifica_clausole: approvazione_specifica_clausole === true,
          dichiarazione_imprenditoriale: dichiarazione_imprenditoriale === true,
          piva: piva || "",
        }),
      });
      if (!signRes.ok) throw new Error(await responseError(signRes));

      const payRes = await fetch(`/api/proposta/${prop.token}/pagamento-stripe`, { method: "POST" });
      if (!payRes.ok) throw new Error(await responseError(payRes));
      const payData = await payRes.json();
      if (!payData.checkout_url) throw new Error("Checkout non disponibile");
      window.location.href = payData.checkout_url;
    } catch (e) {
      // Torna al contratto (non a 'idle'): la proposta resta accettata, non si riparte da capo.
      setError(friendly(e));
      setStep("contract");
      busy.current = false;
    }
  }

  if (completata) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6" id="attiva">
        <p className="text-sm text-slate-700">Hai già completato la Partnership: trovi tutto nella tua area riservata.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-yellow-400 bg-white p-7" id="attiva" data-testid="partnership-checkout">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Entra in Partnership</p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Se ti torna, il passo è breve</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{offerData.partnership.payNote}</p>

      {scaduta ? (
        <p role="alert" className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La tua proposta è scaduta. Scrivici a {SUPPORT_EMAIL} e la riapriamo.
        </p>
      ) : (
        <>
          {/* Anteprima dei passi PRIMA di iniziare: dentro il percorso li mostra gia' ContractAccept. */}
          {step === "contract" || step === "processing" ? null : (
            <div className="mt-5">
              <PassiContratto />
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            {scadenza
              ? `La tua proposta è aperta fino a ${scadenza}.`
              : "Premendo si apre la tua proposta, con una scadenza reale che vedi subito."}{" "}
            Puoi fermarti e fare domande in qualsiasi momento.
          </p>

          {step === "contract" || step === "processing" ? (
            <div className="mt-5">
              <ContractAccept
                partnerId={prop?.partner_id}
                onDati={handleDati}
                onConfirm={handleConfirm}
                disabled={!enabled || step === "processing"}
              />
            </div>
          ) : (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleStart}
                disabled={!enabled || step !== "idle"}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-yellow-400 px-7 text-[15px] font-bold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === "working" ? "Un attimo…" : offerData.partnership.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          {!enabled ? <p role="alert" className="mt-3 text-sm text-rose-600">{closedMessage}</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </>
      )}
    </section>
  );
}
