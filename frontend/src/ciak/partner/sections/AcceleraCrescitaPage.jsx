/**
 * Ciak Partner — Accelera la crescita.
 * Porting di components/partner/AcceleraCrescitaPage.jsx. Re-skin palette Ciak.
 *
 * Hub a 6 pilastri (visibilità / costanza / spinta-vendite / eventi-vendita /
 * prodotti-digitali / direzione) con pagine di dettaglio per ogni strumento e
 * checkout Stripe dedicati.
 *
 * Endpoint backend invariato:
 *  POST /api/servizi-extra/:stripeServiceId/acquista  → { checkout_url }
 *  (+ /api/avatar-checkout e /api/consulenza-checkout via i componenti checkout)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, Repeat, TrendingUp, Radio, Layers, Compass, Tag } from "lucide-react";
import { AvatarCheckout } from "./AvatarCheckout";
import { ConsulenzaCheckout } from "./ConsulenzaCheckout";

/* ═══════════════════════════════════════════════════════════════════════════
   DATI CATEGORIE — color = classe Tailwind re-skinnata
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = {
  "visibilita": {
    id: "visibilita",
    icon: Eye,
    tone: "slate",
    title: "Visibilità",
    tagline: "Fatti vedere — anche quando non sei davanti alla camera",
    items: [
      {
        id: "avatar_pro",
        title: "Avatar PRO",
        problema:
          "Vuoi pubblicare video costantemente ma non hai tempo di registrare, oppure non ti senti a tuo agio davanti alla telecamera.",
        soluzione:
          "Un clone digitale professionale con la tua voce e il tuo stile. Insegna al posto tuo, in HD, con espressioni naturali.",
        beneficio:
          "Pubblichi video ogni settimana senza registrare nulla. I tuoi studenti vedono te, ma tu risparmi ore di lavoro.",
        cta: "Attiva il tuo Avatar",
        hasCheckout: true,
      },
      {
        id: "gestione_campagne",
        title: "Gestione Campagne",
        problema:
          "Pubblichi contenuti e fai organico, ma il traffico non basta a riempire il funnel. Le ads ti spaventano: budget bruciato, metriche confuse.",
        soluzione:
          "Gestiamo noi le tue campagne Meta e Google. Setup pixel, creatività, copy, ottimizzazione settimanale, report mensile. Il budget delle ads lo paghi direttamente alle piattaforme.",
        beneficio:
          "Traffico in target tutti i mesi senza imparare la piattaforma e senza perdere weekend interi a ottimizzare.",
        cta: "Attiva la Gestione Campagne",
        isStripe: true,
        stripeServiceId: "gestione-campagne",
        price: "€348/mese (–30% sul listino) + 10% sulle vendite generate",
      },
    ],
  },
  "costanza": {
    id: "costanza",
    icon: Repeat,
    tone: "yellow",
    title: "Costanza",
    tagline: "Pubblica ogni giorno senza pensarci",
    items: [
      {
        id: "calendario_pro",
        title: "Calendario PRO",
        problema:
          "Sai che dovresti essere presente sui social ogni settimana, ma il tempo non c'è. Il risultato: profilo fermo, visibilità bassa, studenti che non ti trovano.",
        soluzione:
          "Ogni mese ti consegniamo 20 contenuti pronti da pubblicare: post, caroselli e reel già scritti, formattati e ottimizzati per la tua nicchia. Tu copi, incolli e pubblichi. Oppure ce lo lasci fare direttamente tu.",
        beneficio:
          "Il tuo profilo è attivo 365 giorni l'anno senza che tu ci pensi. Chi ti cerca ti trova. La costanza è uno degli strumenti di vendita più efficaci.",
        cta: "Attiva il Calendario PRO",
        isStripe: true,
        stripeServiceId: "calendario-pro",
        price: "€297/mese",
      },
    ],
  },
  "spinta-vendite": {
    id: "spinta-vendite",
    icon: TrendingUp,
    tone: "emerald",
    title: "Spinta Vendite",
    tagline: "Ogni vendita vale di più",
    items: [
      {
        id: "booster_checkout",
        title: "Booster Checkout",
        problema:
          "Quando un cliente sta per comprare il corso, sei a un click dal massimo dell'attenzione. Lì oggi non c'è niente: prendi i soldi del corso e basta.",
        soluzione:
          "Aggiungiamo un'offerta complementare nella pagina di checkout. Un click, prezzo basso, valore alto. Lui spende €17–€47 in più, tu raddoppi il margine sulla vendita.",
        beneficio:
          "Stesso traffico, stessa pagina, +25–40% di valore medio per cliente. Senza nuovi costi.",
        cta: "Attiva il Booster Checkout",
        isStripe: true,
        stripeServiceId: "booster-checkout",
        price: "€197 una tantum",
      },
      {
        id: "upsell_post_acquisto",
        title: "Upsell Post-Acquisto",
        problema:
          "Dopo l'acquisto il cliente è caldo. Oggi finisce sulla thank-you e se ne va. Stai lasciando soldi sul tavolo.",
        soluzione:
          "Una pagina post-checkout con un'offerta one-click che si addebita sulla stessa carta. Niente nuovo checkout, niente attrito.",
        beneficio:
          "Tassi di accettazione 15–30%. Su 100 clienti, fino a 20 portano a casa una seconda vendita senza fatica.",
        cta: "Attiva l'Upsell",
        isStripe: true,
        stripeServiceId: "upsell-post-acquisto",
        price: "€297 una tantum",
      },
      {
        id: "offerta_di_recupero",
        title: "Offerta di Recupero",
        problema:
          "Chi rifiuta l'upsell oggi se ne va. Hai perso l'occasione una seconda volta.",
        soluzione:
          "Una versione più leggera dell'offerta a un terzo del prezzo. Per chi voleva ma non era pronto al prezzo pieno.",
        beneficio:
          "Recuperi il 5–10% di chi avresti perso. Soldi in più senza traffico in più.",
        cta: "Attiva l'Offerta di Recupero",
        isStripe: true,
        stripeServiceId: "offerta-di-recupero",
        price: "€197 una tantum",
      },
    ],
  },
  "eventi-vendita": {
    id: "eventi-vendita",
    icon: Radio,
    tone: "rose",
    title: "Eventi Vendita",
    tagline: "Trasforma un'ora live in un mese di vendite",
    items: [
      {
        id: "live_promo",
        title: "Live Promo",
        problema:
          "Un evento live converte come niente. Ma costruirlo da zero ti costa una settimana di stress. E il copy del pitch è la cosa più difficile da scrivere.",
        soluzione:
          "Organizziamo noi il webinar live promo. Tu fai il talk, noi facciamo il resto: landing iscrizione, sequenza email pre-live, regia diretta, follow-up, script di vendita scritto su misura della tua offerta.",
        beneficio:
          "Un live al mese trasforma traffico tiepido in clienti. Senza che tu costruisca nulla da zero.",
        cta: "Pianifica i tuoi Live Promo",
        hasCheckout: true,
        livePromoTiers: true,
        packages: [
          { label: "3 Live", price: 1490, originalPrice: null, saving: null, perEvent: 497, stripeServiceId: "live-promo-3" },
          { label: "6 Live", price: 2490, originalPrice: 2982, saving: "–16%", perEvent: 415, stripeServiceId: "live-promo-6" },
          { label: "12 Live", price: 3990, originalPrice: 5964, saving: "–33%", perEvent: 333, stripeServiceId: "live-promo-12" },
        ],
      },
    ],
  },
  "prodotti-digitali": {
    id: "prodotti-digitali",
    icon: Layers,
    tone: "indigo",
    title: "Prodotti Digitali",
    tagline: "Stesso contenuto, più formati, più ricavi",
    items: [
      {
        id: "ebook_corso",
        title: "Ebook del Corso",
        problema:
          "Hai un videocorso ma non tutti vogliono guardare video. Stai perdendo chi preferisce leggere.",
        soluzione:
          "Trasformiamo il tuo corso in un ebook professionale, completo di formattazione, copertina e distribuzione.",
        beneficio:
          "Un nuovo prodotto da vendere a chi preferisce leggere. Un ulteriore punto di ingresso nel tuo funnel.",
        cta: "Crea il tuo Ebook",
        isStripe: true,
        stripeServiceId: "ebook-corso",
        price: "€497 una tantum",
      },
      {
        id: "audiobook",
        title: "Audiobook",
        problema:
          "Il tuo pubblico è impegnato e non ha tempo di sedersi a leggere o guardare video.",
        soluzione:
          "Creiamo la versione audio del tuo corso, ascoltabile ovunque: in auto, in palestra, camminando.",
        beneficio:
          "Raggiungi chi consuma contenuti in movimento. Un formato comodo da fruire.",
        cta: "Crea il tuo Audiobook",
        isStripe: true,
        stripeServiceId: "audiobook",
        price: "€697 una tantum",
      },
      {
        id: "audiolezioni",
        title: "Audiolezioni",
        problema:
          "Le tue lezioni video sono ottime, ma non tutti hanno tempo di guardarle integralmente.",
        soluzione:
          "Estraiamo l'audio da ogni lezione del tuo corso e lo trasformiamo in episodi consumabili ovunque.",
        beneficio:
          "I tuoi studenti completano il corso anche quando sono fuori casa. Più completamento significa più risultati.",
        cta: "Attiva le Audiolezioni",
        isStripe: true,
        stripeServiceId: "audiolezioni",
        price: "€397 una tantum",
      },
    ],
  },
  "direzione": {
    id: "direzione",
    icon: Compass,
    tone: "blue",
    title: "Direzione",
    tagline: "Una guida esperta quando ne hai bisogno",
    items: [
      {
        id: "strategia_claudio",
        title: "Strategia con Claudio",
        problema:
          "Hai dubbi sulla strategia, non sai se stai andando nella direzione giusta e ti servono risposte chiare.",
        soluzione:
          "90 minuti 1:1 con Claudio. Strategia, posizionamento, pricing, lancio: ti dice cosa fare e perché.",
        beneficio:
          "Esci dalla sessione con un piano d'azione preciso. Settimane di indecisione risolte in 90 minuti.",
        cta: "Prenota con Claudio",
        hasCheckout: true,
        consultantType: "claudio",
        price: "€180 / sessione",
        packages: [
          { label: "1 sessione", price: 180, originalPrice: null, saving: null },
          { label: "5 sessioni", price: 765, originalPrice: 900, saving: "–15%", perSession: 153 },
          { label: "10 sessioni", price: 1350, originalPrice: 1800, saving: "–25%", perSession: 135 },
        ],
      },
      {
        id: "marketing_antonella",
        title: "Marketing con Antonella",
        problema:
          "Vuoi migliorare le vendite, il funnel o i contenuti ma non sai da dove partire.",
        soluzione:
          "90 minuti 1:1 con Antonella. Marketing operativo, copy, funnel: ti guida passo dopo passo con azioni concrete.",
        beneficio: "Un piano d'azione su misura per le vendite. Ottimizzazione concreta, non teoria.",
        cta: "Prenota con Antonella",
        hasCheckout: true,
        consultantType: "antonella",
        price: "€180 / sessione",
        packages: [
          { label: "1 sessione", price: 180, originalPrice: null, saving: null },
          { label: "5 sessioni", price: 765, originalPrice: 900, saving: "–15%", perSession: 153 },
          { label: "10 sessioni", price: 1350, originalPrice: 1800, saving: "–25%", perSession: 135 },
        ],
      },
    ],
  },
};

/* Mappa "tone" → classi Tailwind (icona, sfondo soft, accento, bordo). */
const TONE = {
  slate: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    softBg: "bg-slate-50",
    softBorder: "border-slate-200",
    accentText: "text-slate-700",
    label: "text-slate-700",
    labelBg: "bg-slate-100",
    cardBorder: "border-slate-200",
    btn: "bg-slate-700 hover:bg-slate-800",
  },
  yellow: {
    iconBg: "bg-yellow-100",
    iconText: "text-yellow-600",
    softBg: "bg-yellow-50",
    softBorder: "border-yellow-200",
    accentText: "text-yellow-700",
    label: "text-yellow-700",
    labelBg: "bg-yellow-100",
    cardBorder: "border-yellow-200",
    btn: "bg-yellow-500 hover:bg-yellow-600",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    softBg: "bg-emerald-50",
    softBorder: "border-emerald-200",
    accentText: "text-emerald-700",
    label: "text-emerald-700",
    labelBg: "bg-emerald-100",
    cardBorder: "border-emerald-200",
    btn: "bg-emerald-500 hover:bg-emerald-600",
  },
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    softBg: "bg-blue-50",
    softBorder: "border-blue-200",
    accentText: "text-blue-700",
    label: "text-blue-700",
    labelBg: "bg-blue-100",
    cardBorder: "border-blue-200",
    btn: "bg-blue-500 hover:bg-blue-600",
  },
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    softBg: "bg-rose-50",
    softBorder: "border-rose-200",
    accentText: "text-rose-700",
    label: "text-rose-700",
    labelBg: "bg-rose-100",
    cardBorder: "border-rose-200",
    btn: "bg-rose-500 hover:bg-rose-600",
  },
  indigo: {
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-600",
    softBg: "bg-indigo-50",
    softBorder: "border-indigo-200",
    accentText: "text-indigo-700",
    label: "text-indigo-700",
    labelBg: "bg-indigo-100",
    cardBorder: "border-indigo-200",
    btn: "bg-indigo-500 hover:bg-indigo-600",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ITEM DETAIL PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function ItemDetailPage({ item, category, partner, onBack }) {
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(item.packages ? 0 : null);
  const partnerId = partner?.id;
  const CatIcon = category.icon;
  const tone = TONE[category.tone];

  const handleStripeAcquisto = async () => {
    // Determina lo stripe service ID effettivo (singolo o per-pacchetto come Live Promo)
    let serviceId = item.stripeServiceId;
    if (item.livePromoTiers && item.packages && selectedPackage !== null) {
      serviceId = item.packages[selectedPackage]?.stripeServiceId;
    }
    if (!serviceId) return;
    try {
      setPurchasing(true);
      const res = await fetch(`/api/servizi-extra/${serviceId}/acquista`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error("Errore acquisto:", err);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-xl mx-auto p-6">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-sm font-semibold text-slate-400 hover:text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Torna a {category.title}
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone.iconBg}`}>
            <CatIcon className={`w-6 h-6 ${tone.iconText}`} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{item.title}</h1>
        </div>

        {/* Problema */}
        <div className="rounded-2xl p-6 mb-4 bg-red-50 border border-red-200">
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-red-800">
            Il problema
          </div>
          <p className="text-base leading-relaxed text-red-900">{item.problema}</p>
        </div>

        {/* Soluzione */}
        <div className={`rounded-2xl p-6 mb-4 ${tone.softBg} border ${tone.softBorder}`}>
          <div className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${tone.accentText}`}>
            La soluzione
          </div>
          <p className="text-base leading-relaxed text-slate-900">{item.soluzione}</p>
        </div>

        {/* Beneficio */}
        <div className="rounded-2xl p-6 mb-6 bg-emerald-50 border border-emerald-200">
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-emerald-700">
            Il risultato
          </div>
          <p className="text-base leading-relaxed text-emerald-900">{item.beneficio}</p>
        </div>

        {/* Pacchetti sessioni */}
        {item.packages && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-slate-400">
              <Tag className="w-3 h-3 inline mr-1" />
              Scegli il pacchetto
            </p>
            <div className="space-y-2">
              {item.packages.map((pkg, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPackage(i)}
                  className={`w-full rounded-xl p-4 text-left transition border-2 ${
                    selectedPackage === i
                      ? `${tone.softBg} ${tone.cardBorder}`
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">{pkg.label}</span>
                      {pkg.perSession && (
                        <span className="ml-2 text-xs text-slate-400">
                          → €{pkg.perSession}/sessione
                        </span>
                      )}
                      {pkg.perEvent && (
                        <span className="ml-2 text-xs text-slate-400">
                          → €{pkg.perEvent}/live
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-semibold text-slate-900">€{pkg.price}</span>
                      {pkg.originalPrice && (
                        <span className="ml-1 text-xs line-through text-slate-400">
                          €{pkg.originalPrice}
                        </span>
                      )}
                      {pkg.saving && (
                        <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          {pkg.saving}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {item.comingSoon ? (
          <div className="rounded-2xl p-5 text-center bg-gray-50 border border-gray-200">
            <p className="text-sm font-semibold mb-1 text-slate-600">In arrivo</p>
            <p className="text-xs text-slate-400">
              Questo strumento sarà disponibile a breve. Ti avviseremo.
            </p>
          </div>
        ) : (
          <button
            onClick={(item.isStripe || item.livePromoTiers) ? handleStripeAcquisto : onBack}
            disabled={purchasing}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-base text-white transition hover:scale-[1.02] disabled:opacity-50 ${tone.btn}`}
          >
            {purchasing ? "Redirect al pagamento..." : item.cta}
            {!purchasing && <ArrowRight className="w-5 h-5" />}
          </button>
        )}

        {item.price && !item.comingSoon && !item.packages && (
          <p className="text-center mt-3 text-sm font-semibold text-slate-600">{item.price}</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function CategoryPage({ category, partner, onBack }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const CatIcon = category.icon;
  const tone = TONE[category.tone];

  // Checkout dedicati
  if (selectedItem?.hasCheckout && selectedItem.id === "avatar_pro") {
    return <AvatarCheckout partner={partner} onBack={() => setSelectedItem(null)} />;
  }
  if (selectedItem?.hasCheckout && selectedItem.consultantType) {
    return (
      <ConsulenzaCheckout
        partner={partner}
        onBack={() => setSelectedItem(null)}
        defaultConsultant={selectedItem.consultantType}
        packages={selectedItem.packages}
      />
    );
  }

  // Detail page
  if (selectedItem) {
    return (
      <ItemDetailPage
        item={selectedItem}
        category={category}
        partner={partner}
        onBack={() => setSelectedItem(null)}
      />
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-xl mx-auto p-6">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-sm font-semibold text-slate-400 hover:text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Strumenti per accelerare
        </button>

        {/* Header */}
        <div className="rounded-2xl p-6 mb-6 bg-slate-900">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone.iconBg}`}>
              <CatIcon className={`w-5 h-5 ${tone.iconText}`} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{category.title}</h1>
              <p className="text-xs text-slate-400">{category.tagline}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {category.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="w-full bg-white rounded-2xl p-5 text-left transition hover:shadow-md hover:scale-[1.01] border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                {item.comingSoon ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-slate-500">
                    In arrivo
                  </span>
                ) : (
                  <ArrowRight className={`w-4 h-4 ${tone.iconText}`} />
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{item.beneficio}</p>
              {item.price && !item.comingSoon && (
                <p className={`mt-2 text-xs font-semibold ${tone.accentText}`}>{item.price}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN — HUB PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export function AcceleraCrescitaPage({ partnerId, categoryId }) {
  const navigate = useNavigate();
  const partner = { id: partnerId };
  const [selectedCategory, setSelectedCategory] = useState(
    categoryId ? CATEGORIES[categoryId.replace("acc-", "")] : null
  );

  if (selectedCategory) {
    return (
      <CategoryPage
        category={selectedCategory}
        partner={partner}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 text-slate-900">Accelera la crescita</h1>
          <p className="text-base leading-relaxed text-slate-600">
            Strumenti pensati per farti ottenere risultati più velocemente.
            <br />
            Ogni strumento è collegato al tuo obiettivo: vendere il tuo corso.
          </p>
        </div>

        {/* Category cards */}
        <div className="space-y-3">
          {Object.values(CATEGORIES).map((cat) => {
            const CatIcon = cat.icon;
            const tone = TONE[cat.tone];
            const availableCount = cat.items.filter((i) => !i.comingSoon).length;
            const totalCount = cat.items.length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full bg-white rounded-2xl p-5 text-left transition hover:shadow-md hover:scale-[1.01] border-2 ${tone.cardBorder}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tone.iconBg}`}
                  >
                    <CatIcon className={`w-6 h-6 ${tone.iconText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-0.5 text-slate-900">{cat.title}</h3>
                    <p className="text-sm text-slate-600">{cat.tagline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tone.labelBg} ${tone.label}`}
                      >
                        {availableCount === totalCount
                          ? `${totalCount} strument${totalCount > 1 ? "i" : "o"}`
                          : `${availableCount} disponibil${
                              availableCount > 1 ? "i" : "e"
                            } · ${totalCount - availableCount} in arrivo`}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 flex-shrink-0 ${tone.iconText}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AcceleraCrescitaPage;
