/**
 * Reparto Vendite — Catalogo servizi completo.
 *
 * Sostituisce la vecchia pagina "Listino". Struttura e descrizioni dal catalogo
 * ufficiale Evolution/Ciak (Catalogo-Evolution.pdf); i PREZZI sono allineati alla
 * SSOT del sistema:
 *  - core (una tantum): ciak_offers.py + pricing.js → Blueprint GRATUITO (il €27 è
 *    storico, il funnel nuovo è gratuito), Start €390, Partnership €2.990, Upgrade €2.600;
 *  - EVO-S mensili: 147/297/497/797;
 *  - extra: servizi_extra.py (coincidono col PDF).
 * ⛔ Prezzi vecchi del PDF (Blueprint €27, Start €499, Partnership €2.790, Upgrade
 *    €2.291) NON usati: sono morti (memory prezzi_offerta_attuali).
 */
import { ClipboardList } from "lucide-react";
import { VenditeSubNav } from "../components/VenditeSubNav";

const CATALOGO = [
  {
    titolo: "Porta d'ingresso",
    tag: "Gratuito",
    servizi: [
      {
        nome: "Masterclass Ciak", prezzo: "Gratis",
        descrizione: "Video on-demand di 30 minuti: come trasformare una competenza professionale in un'accademia digitale. Accesso lasciando nome ed email.",
      },
    ],
  },
  {
    titolo: "Il percorso",
    tag: "Offerte una tantum",
    servizi: [
      {
        nome: "Ciak Blueprint", prezzo: "Gratuito",
        descrizione: "Analisi strategica digitale e roadmap personalizzata per posizionamento, offerta e sviluppo del progetto. Consegnata dopo la call conoscitiva.",
      },
      {
        nome: "Ciak Start", prezzo: "€ 390",
        descrizione: "Percorso guidato in 7 passi dentro la piattaforma per costruire le fondamenta del progetto — con istruzioni, esempi e assistenza a ogni passo. L'importo si scala dalla Partnership.",
        include: [
          "Posizionamento — chi sei, a chi parli, perché scelgono te",
          "Brand — nome, colori, identità visiva coerente",
          "Profili — i canali dove stanno davvero i tuoi clienti",
          "Sito vetrina — dove il progetto si presenta (creato da zero o rivisto)",
          "Strategia contenuti — cosa raccontare e cosa non regalare",
          "Calendario editoriale — il ritmo da tenere costante",
          "Verifica di prontezza per la Partnership",
        ],
      },
      {
        nome: "Partnership Ciak", prezzo: "€ 2.990",
        descrizione: "Progettazione, produzione e lancio dell'offerta digitale secondo il percorso Ciak. Programma di 12 mesi con fee del 10% sui ricavi generati dal funnel; dal 13° mese l'accademia è di proprietà al 100% del partner.",
        include: [
          "Fase 1 · Posizionamento — Metodo EVO, USP, naming (2–3 settimane)",
          "Fase 2 · Masterclass — script, copy landing, sequenza email (2 settimane)",
          "Fase 3 · Videocorso — struttura moduli, brief video, checklist qualità (4–6 settimane)",
          "Fase 4 · Funnel — landing live, automazioni email, checkout (2 settimane)",
          "Fase 5 · Lancio — piano editoriale 30gg, primi post, campagna ADV (2 settimane)",
        ],
      },
      {
        nome: "Upgrade a Partnership", prezzo: "€ 2.600",
        descrizione: "Passaggio da Ciak Start alla Partnership, al netto del credito Ciak Start già versato.",
      },
    ],
  },
  {
    titolo: "Gestione continuativa — EVO-S",
    tag: "Abbonamenti mensili",
    nota: "Disponibili dopo i 12 mesi di Partnership. Permanenza minima 6 mesi. Budget advertising, strumenti e licenze esterne esclusi; nessuna garanzia di risultato.",
    servizi: [
      { nome: "EVO-S Inside", prezzo: "€ 147/mese", descrizione: "Per rimettere ordine nell'organizzazione e nella gestione del corso al termine del primo anno." },
      { nome: "EVO-S Pro", prezzo: "€ 297/mese", descrizione: "Il tuo lavoro viene seguito e protetto ogni mese, con guida costante degli specialisti." },
      { nome: "EVO-S Premium", prezzo: "€ 497/mese", descrizione: "Creiamo materiali pronti e miglioriamo le pagine ogni due settimane per accelerare gli iscritti." },
      { nome: "EVO-S Elite", prezzo: "€ 797/mese", descrizione: "La soluzione completa: gestione pubblicità social, nuovi corsi e affiancamento dedicato." },
    ],
  },
  {
    titolo: "Contenuti & Social",
    tag: "Extra",
    servizi: [
      { nome: "Calendario Editoriale PRO", prezzo: "€ 297/mese", descrizione: "20 contenuti/mese pronti da pubblicare." },
      { nome: "Pacchetto Starter", prezzo: "€ 97", descrizione: "Primo mese di prova — 10 contenuti." },
      { nome: "Creazione contenuti Reel, Post e Caroselli", prezzo: "€ 497", descrizione: "Pacchetto di contenuti social pronti, coerenti con calendario e brand." },
      { nome: "Consulenza contenuti Antonella — 1 sessione", prezzo: "€ 179", descrizione: "Sessione 1:1 su contenuti, reel, caroselli e calendario editoriale." },
      { nome: "Consulenza contenuti Antonella — 3 sessioni", prezzo: "€ 399", descrizione: "Tre sessioni per dare ritmo, continuità e qualità ai contenuti." },
    ],
  },
  {
    titolo: "Advertising & Funnel",
    tag: "Extra",
    servizi: [
      { nome: "Gestione Campagne", prezzo: "€ 348/mese", descrizione: "Gestione mensile delle campagne Meta e Google. Canone + 10% sulle vendite generate; budget partner separato." },
      { nome: "Booster Checkout", prezzo: "€ 197", descrizione: "Order bump aggiunto al checkout del corso per aumentare il valore medio per cliente." },
      { nome: "Upsell Post-Acquisto", prezzo: "€ 297", descrizione: "Pagina upsell one-click subito dopo l'acquisto del corso." },
      { nome: "Offerta di Recupero", prezzo: "€ 197", descrizione: "Downsell mostrato a chi rifiuta l'upsell: versione più leggera dell'offerta." },
    ],
  },
  {
    titolo: "Eventi Live",
    tag: "Extra",
    servizi: [
      { nome: "Live Promo — 3 eventi", prezzo: "€ 1.490", descrizione: "3 webinar live promo con script di vendita, landing, sequenza email e regia." },
      { nome: "Live Promo — 6 eventi", prezzo: "€ 2.490", descrizione: "6 webinar live promo (–16% sul singolo evento)." },
      { nome: "Live Promo — 12 eventi", prezzo: "€ 3.990", descrizione: "12 webinar live promo su 12 mesi (–33% sul singolo evento)." },
    ],
  },
  {
    titolo: "Prodotti derivati dal corso",
    tag: "Extra",
    servizi: [
      { nome: "Ebook del Corso", prezzo: "€ 497", descrizione: "Versione ebook del videocorso: formattazione, copertina, distribuzione." },
      { nome: "Audiobook", prezzo: "€ 697", descrizione: "Versione audio professionale del corso, fruibile ovunque." },
      { nome: "Audiolezioni", prezzo: "€ 397", descrizione: "Estrazione audio episodica dalle lezioni del corso." },
      { nome: "Avatar + Videocorso", prezzo: "€ 1.490", descrizione: "Creazione dell'avatar AI e produzione di un videocorso breve con lezioni pronte." },
    ],
  },
  {
    titolo: "Produzione media",
    tag: "Extra",
    servizi: [
      { nome: "Video Premium", prezzo: "€ 590", descrizione: "Montaggio e rifinitura professionale di un video strategico." },
      { nome: "Shooting Fotografico", prezzo: "€ 490", descrizione: "Servizio fotografico professionale per sito, social e funnel." },
    ],
  },
  {
    titolo: "Testi, Email & Automazioni",
    tag: "Extra",
    servizi: [
      { nome: "Copywriting Premium", prezzo: "€ 497", descrizione: "Testi di vendita per pagine, email e funnel." },
      { nome: "Email Marketing Extra", prezzo: "€ 390", descrizione: "Sequenze email, newsletter o promozioni extra." },
      { nome: "Lead Magnet Extra", prezzo: "€ 490", descrizione: "Lead magnet pronto per attirare contatti qualificati." },
      { nome: "Automazioni AI", prezzo: "€ 690", descrizione: "Automazioni e strumenti AI per follow-up, lead e attività ripetitive." },
      { nome: "Setup Tecnico Extra", prezzo: "€ 390", descrizione: "Configurazioni tecniche extra fuori dallo standard del percorso." },
    ],
  },
  {
    titolo: "Consulenze 1:1",
    tag: "Extra",
    servizi: [
      { nome: "Consulenza strategica Claudio — 1 sessione", prezzo: "€ 299", descrizione: "Sessione strategica 1:1 con Claudio su offerta, prezzo, lancio e direzione business." },
      { nome: "Consulenza strategica Claudio — 3 sessioni", prezzo: "€ 699", descrizione: "Tre sessioni per seguire decisioni, lancio e ottimizzazione." },
    ],
  },
];

function ServizioCard({ s }) {
  const gratis = /grat/i.test(s.prezzo);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900 leading-snug">{s.nome}</h3>
        <span className={`text-sm font-bold whitespace-nowrap rounded-lg px-2.5 py-1 ${gratis ? "bg-emerald-50 text-emerald-700" : "bg-slate-900 text-yellow-400"}`}>
          {s.prezzo}
        </span>
      </div>
      <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{s.descrizione}</p>
      {s.include && (
        <ul className="mt-3 space-y-1.5">
          {s.include.map((x, i) => (
            <li key={i} className="text-[12.5px] text-slate-600 flex gap-2">
              <span className="text-yellow-500 flex-shrink-0">•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VenditeCatalogo() {
  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <VenditeSubNav active="Catalogo" />

      <div className="bg-slate-900 text-white rounded-2xl px-6 py-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-semibold">Catalogo servizi Evolution / Ciak</h1>
        </div>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Ogni servizio con descrizione e prezzo: dal primo contatto alla Partnership, la gestione
          continuativa e i servizi extra a listino. Prezzi ufficiali allineati al sistema.
        </p>
      </div>

      {CATALOGO.map((cat) => (
        <div key={cat.titolo} className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{cat.titolo}</h2>
            {cat.tag && (
              <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">{cat.tag}</span>
            )}
          </div>
          {cat.nota && <p className="text-[12.5px] text-slate-500 mt-1">{cat.nota}</p>}
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {cat.servizi.map((s) => <ServizioCard key={s.nome} s={s} />)}
          </div>
        </div>
      ))}

      <p className="text-[12px] text-slate-400 px-1">
        Importi IVA esclusa se non diversamente indicato. I servizi extra sono acquistabili dai partner del percorso.
        Fonte prezzi: sistema Evolution/Ciak (ciak_offers · servizi_extra).
      </p>
    </div>
  );
}

export default VenditeCatalogo;
