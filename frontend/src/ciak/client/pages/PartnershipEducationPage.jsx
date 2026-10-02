import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { clientPost } from "../api";
import { PRICING } from "../../pricing";
import { offerData } from "../../insider/offerData";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

// Contenuti presi dal contratto e dall'offerta approvata (offerData): niente promesse, niente
// numeri inventati. Dove serve un articolo c'e' la sua sintesi in parole semplici.
const capire = [
  {
    titolo: "Cosa succede dentro la Partnership",
    punti: [
      "Un percorso di 12 mesi basato sulla collaborazione attiva di entrambi: non è un servizio chiavi in mano.",
      "Si lavora in tre fasi, il Metodo EVO: Esamina, Valida, Ottimizza.",
      "L'accademia online si costruisce insieme in circa 3-4 settimane, come indicato nella tua proposta.",
      "Dopo il lancio il supporto è strategico e di consulenza, non operativo continuativo.",
    ],
  },
  {
    titolo: "Cosa costruiamo noi",
    punti: offerData.partnership.servizi,
  },
  {
    titolo: "Cosa fai tu",
    punti: [
      "Ci dai i materiali che servono, partecipi agli incontri e approvi o commenti nei tempi concordati.",
      "I contenuti che consegni sono tuoi e leciti.",
      "Nel lancio fai un minimo di attività commerciale: pubblichi i contenuti del piano, rispondi ai contatti, partecipi alle attività di lancio.",
      "Se resti inattivo per oltre 30 giorni consecutivi il progetto può essere sospeso, e il corrispettivo resta dovuto.",
    ],
  },
  {
    titolo: "Cosa non è incluso",
    punti: [
      "Gestione continuativa dei social e delle campagne pubblicitarie.",
      "Chiusura delle vendite al posto tuo e assistenza ai tuoi clienti.",
      "Produzione video e foto professionale, e contenuti oltre il programma.",
      "La pubblicità a pagamento non è obbligatoria e i costi sono a tuo carico. I servizi extra si chiedono a parte, con preventivo.",
    ],
  },
  {
    titolo: "A chi resta cosa",
    punti: [
      "Sono tuoi il corso, i materiali formativi e i contenuti originali.",
      "Restano di Evolution PRO il Metodo EVO, la piattaforma Ciak.io, i funnel, le automazioni, i template e gli agenti AI.",
      "A fine contratto puoi continuare a vendere il corso con strumenti tuoi, o chiedere il trasferimento di dati e asset tecnicamente trasferibili. Migrazione e supporto tecnico dopo il contratto sono a preventivo.",
      "Dopo la fine cessa l'accesso a Ciak.io, agli agenti AI, ai workflow e ai template.",
    ],
  },
  {
    titolo: "Il 10% per 12 mesi",
    punti: [
      "È il 10% dell'importo netto che incassi dalle vendite del tuo corso, per 12 mesi dalla firma. Poi finisce.",
      "\"Netto\" vuol dire i soldi davvero accreditati, tolti rimborsi, storni e commissioni di pagamento.",
      "Una parte del nostro compenso dipende dalle tue vendite: per questo abbiamo interesse che tu venda.",
    ],
  },
  {
    titolo: "Da sapere prima di decidere",
    punti: [
      "Nessun guadagno è garantito: ci impegniamo sul lavoro, non sul risultato.",
      "Una volta avviata l'esecuzione il corrispettivo non è rimborsabile, e non c'è un recesso ordinario.",
      "Per tutta la durata e per 90 giorni dopo non vendi per conto tuo lo stesso corso o contenuti equivalenti. Consulenze, workshop, formazione dal vivo e percorsi diversi restano liberi.",
      "Il contratto lo leggi per intero prima di firmare, e puoi farlo leggere al tuo consulente.",
    ],
  },
];

export function PartnershipEducationPage({ dashboard }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const access = dashboard.client?.access_level;
  const isPartner = dashboard.partner_area?.status === "attiva";
  const recommended = dashboard.diagnostic?.recommended_offer;
  const canUpgrade = isPartner || access === "cliente_start" || recommended === "partnership";
  const pricing = dashboard.pricing?.partnership || {};
  const fullAmount = pricing.full_amount_cents ?? PRICING.partnership.cents;
  const creditAmount = pricing.credit_amount_cents ?? PRICING.start.cents;
  const dueAmount = pricing.due_amount_cents ?? PRICING.upgradeFromStart.cents;

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");
      const data = await clientPost("/partnership/checkout");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("Checkout non disponibile");
    } catch (e) {
      setError(e.message || "Errore avvio checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Verso la Partnership</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isPartner ? "Partnership attiva" : "Capisci prima cosa succede dopo"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isPartner
            ? "La tua Partnership e' attiva. L'area partner dedicata resta il punto operativo principale."
            : "Questa sezione ti accompagna nel capire il percorso completo. L'area partner si apre solo dopo l'attivazione della Partnership."}
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>{isPartner ? "Area partner gia' attiva." : "Area partner disponibile solo dopo attivazione."}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2" aria-label="Cosa comporta la Partnership">
        {capire.map((blocco) => (
          <div key={blocco.titolo} className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">{blocco.titolo}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              {blocco.punti.map((punto) => (
                <li key={punto} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{punto}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {creditAmount > 0 ? "Credito Start garantito" : "Il prezzo"}
        </h2>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <span>Partnership completa, una tantum</span>
            <strong>{euro(fullAmount)}</strong>
          </div>
          {creditAmount > 0 ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <span>Credito Ciak Start</span>
                <strong>-{euro(creditAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-yellow-200 pt-3 text-base text-slate-900">
                <span>Totale upgrade</span>
                <strong>{euro(dueAmount)}</strong>
              </div>
            </>
          ) : (
            <p className="text-slate-600">
              Se parti da Ciak Start, i {euro(PRICING.start.cents)} si scalano interi dalla Partnership.
            </p>
          )}
        </div>
        {!isPartner && canUpgrade ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Apro il checkout..." : "Attiva la Partnership"}
              <ArrowRight className="h-4 w-4" />
            </button>
            {creditAmount > 0 ? (
              <p className="text-sm text-slate-600">Per i clienti Start l'upgrade resta a {euro(dueAmount)}.</p>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>
    </div>
  );
}
