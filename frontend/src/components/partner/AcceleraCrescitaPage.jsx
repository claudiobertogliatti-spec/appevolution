import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, Repeat, DollarSign, Compass, Check } from "lucide-react";
import { AvatarCheckout } from "./AvatarCheckout";
import { ConsulenzaCheckout } from "./ConsulenzaCheckout";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   DATI CATEGORIE
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = {
  visibilita: {
    id: "visibilita",
    icon: Eye,
    color: "#7B68AE",
    title: "Visibilità",
    tagline: "Fatti vedere senza metterci la faccia ogni giorno",
    items: [
      {
        id: "avatar_pro",
        title: "Avatar PRO",
        problema: "Vuoi pubblicare video costantemente ma non hai tempo di registrare, oppure non ti senti a tuo agio davanti alla telecamera.",
        soluzione: "Un clone digitale professionale con la tua voce e il tuo stile. Insegna al posto tuo, in HD, con espressioni naturali.",
        beneficio: "Pubblichi video ogni settimana senza registrare nulla. I tuoi studenti vedono te, ma tu risparmi ore di lavoro.",
        cta: "Attiva il tuo Avatar",
        hasCheckout: true,
      },
    ],
  },
  costanza: {
    id: "costanza",
    icon: Repeat,
    color: "#FFD24D",
    title: "Costanza",
    tagline: "Pubblica ogni giorno senza pensarci",
    items: [
      {
        id: "gestione_contenuti",
        title: "Gestione Contenuti 3 Mesi",
        problema: "Sai che dovresti pubblicare sui social, ma tra il corso e tutto il resto non trovi mai il tempo.",
        soluzione: "Riceviamo 20 contenuti al mese pronti da pubblicare: post, caroselli e reel. Tu non devi fare nulla.",
        beneficio: "Il tuo profilo resta attivo e visibile ogni giorno. Attiri studenti mentre ti concentri sul corso.",
        cta: "Inizia il piano contenuti",
        isStripe: true,
        stripeServiceId: "calendario-pro",
        price: "€297/mese",
      },
    ],
  },
  monetizzazione: {
    id: "monetizzazione",
    icon: DollarSign,
    color: "#10B981",
    title: "Monetizzazione",
    tagline: "Trasforma le tue conoscenze in più formati di guadagno",
    items: [
      {
        id: "ebook",
        title: "Ebook",
        problema: "Hai un videocorso ma non tutti vogliono guardare video. Stai perdendo chi preferisce leggere.",
        soluzione: "Trasformiamo il tuo corso in un ebook professionale, completo di formattazione, copertina e distribuzione.",
        beneficio: "Un nuovo prodotto da vendere a chi preferisce leggere. Un ulteriore punto di ingresso nel tuo funnel.",
        cta: "Crea il tuo Ebook",
        comingSoon: true,
      },
      {
        id: "audiobook",
        title: "Audiobook",
        problema: "Il tuo pubblico è impegnato e non ha tempo di sedersi a leggere o guardare video.",
        soluzione: "Creiamo la versione audio del tuo corso, ascoltabile ovunque: in auto, in palestra, camminando.",
        beneficio: "Raggiungi chi consuma contenuti in movimento. Un formato che si vende da solo.",
        cta: "Crea il tuo Audiobook",
        comingSoon: true,
      },
      {
        id: "audiolezioni",
        title: "Audiolezioni",
        problema: "Le tue lezioni video sono ottime, ma non tutti hanno tempo di guardarle integralmente.",
        soluzione: "Estraiamo l'audio da ogni lezione del tuo corso e lo trasformiamo in episodi consumabili ovunque.",
        beneficio: "I tuoi studenti completano il corso anche quando sono fuori casa. Più completamento = più risultati = più referral.",
        cta: "Attiva le Audiolezioni",
        comingSoon: true,
      },
    ],
  },
  direzione: {
    id: "direzione",
    icon: Compass,
    color: "#3B82F6",
    title: "Direzione",
    tagline: "Una guida esperta quando ne hai bisogno",
    items: [
      {
        id: "sessione_claudio",
        title: "Sessione con Claudio",
        problema: "Hai dubbi sulla strategia, non sai se stai andando nella direzione giusta e ti servono risposte chiare.",
        soluzione: "90 minuti 1:1 con Claudio. Strategia, posizionamento, pricing: ti dice esattamente cosa fare.",
        beneficio: "Esci dalla sessione con un piano d'azione chiaro. Settimane di indecisione risolte in 90 minuti.",
        cta: "Prenota con Claudio",
        hasCheckout: true,
        consultantType: "claudio",
      },
      {
        id: "sessione_antonella",
        title: "Sessione con Antonella",
        problema: "Vuoi migliorare le vendite, il funnel o i contenuti ma non sai da dove partire.",
        soluzione: "90 minuti 1:1 con Antonella. Marketing operativo, copy, funnel: ti guida passo dopo passo.",
        beneficio: "Un piano d'azione su misura per le vendite. Ottimizzazione concreta, non teoria.",
        cta: "Prenota con Antonella",
        hasCheckout: true,
        consultantType: "antonella",
      },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ITEM DETAIL PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function ItemDetailPage({ item, category, partner, onBack }) {
  const [purchasing, setPurchasing] = useState(false);
  const partnerId = partner?.id;
  const CatIcon = category.icon;

  const handleStripeAcquisto = async () => {
    if (!item.isStripe || !item.stripeServiceId) return;
    try {
      setPurchasing(true);
      const res = await axios.post(`${API}/api/servizi-extra/${item.stripeServiceId}/acquista`, {
        partner_id: partnerId,
      });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      console.error("Errore acquisto:", err);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-xl mx-auto p-6">
        {/* Back */}
        <button onClick={onBack} data-testid="acc-detail-back"
          className="flex items-center gap-2 mb-6 text-sm font-bold transition-all hover:opacity-70"
          style={{ color: "#8B8680" }}>
          <ArrowLeft className="w-4 h-4" /> Torna a {category.title}
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${category.color}15` }}>
            <CatIcon className="w-6 h-6" style={{ color: category.color }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>{item.title}</h1>
        </div>

        {/* Problema */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#991B1B" }}>Il problema</div>
          <p className="text-base leading-relaxed" style={{ color: "#7F1D1D" }}>{item.problema}</p>
        </div>

        {/* Soluzione */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: `${category.color}10`, border: `1px solid ${category.color}25` }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: category.color }}>La soluzione</div>
          <p className="text-base leading-relaxed" style={{ color: "#1E2128" }}>{item.soluzione}</p>
        </div>

        {/* Beneficio */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#DCFCE7", border: "1px solid #BBF7D0" }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#166534" }}>Il risultato</div>
          <p className="text-base leading-relaxed" style={{ color: "#14532D" }}>{item.beneficio}</p>
        </div>

        {/* CTA */}
        {item.comingSoon ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: "#F5F3EE", border: "1px solid #E8E4DC" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#5F6572" }}>In arrivo</p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              Questo strumento sarà disponibile a breve. Ti avviseremo.
            </p>
          </div>
        ) : (
          <button
            onClick={item.isStripe ? handleStripeAcquisto : onBack}
            disabled={purchasing}
            data-testid={`acc-cta-${item.id}`}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: category.color, color: "white" }}>
            {purchasing ? "Redirect al pagamento..." : item.cta}
            {!purchasing && <ArrowRight className="w-5 h-5" />}
          </button>
        )}

        {item.price && !item.comingSoon && (
          <p className="text-center mt-3 text-sm font-bold" style={{ color: "#5F6572" }}>{item.price}</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function CategoryPage({ category, partner, onBack, onNavigate }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const CatIcon = category.icon;

  // Checkout dedicati
  if (selectedItem?.hasCheckout && selectedItem.id === "avatar_pro") {
    return <AvatarCheckout partner={partner} onBack={() => setSelectedItem(null)} />;
  }
  if (selectedItem?.hasCheckout && selectedItem.consultantType) {
    return <ConsulenzaCheckout partner={partner} onBack={() => setSelectedItem(null)} defaultConsultant={selectedItem.consultantType} />;
  }

  // Detail page
  if (selectedItem) {
    return <ItemDetailPage item={selectedItem} category={category} partner={partner} onBack={() => setSelectedItem(null)} />;
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-xl mx-auto p-6">
        {/* Back */}
        <button onClick={onBack} data-testid="acc-cat-back"
          className="flex items-center gap-2 mb-6 text-sm font-bold transition-all hover:opacity-70"
          style={{ color: "#8B8680" }}>
          <ArrowLeft className="w-4 h-4" /> Strumenti per accelerare
        </button>

        {/* Header */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#1E2128" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${category.color}30` }}>
              <CatIcon className="w-5 h-5" style={{ color: category.color }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{category.title}</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{category.tagline}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {category.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              data-testid={`acc-item-${item.id}`}
              className="w-full bg-white rounded-2xl p-5 text-left transition-all hover:shadow-md hover:scale-[1.01]"
              style={{ border: "1px solid #ECEDEF" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-black" style={{ color: "#1E2128" }}>{item.title}</h3>
                {item.comingSoon ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#F5F3EE", color: "#8B8680" }}>
                    In arrivo
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4" style={{ color: category.color }} />
                )}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#5F6572" }}>
                {item.beneficio}
              </p>
              {item.price && !item.comingSoon && (
                <p className="mt-2 text-xs font-bold" style={{ color: category.color }}>{item.price}</p>
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

export function AcceleraCrescitaPage({ partner, categoryId, onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState(categoryId ? CATEGORIES[categoryId.replace("acc-", "")] : null);

  // If a specific category was requested via nav
  if (selectedCategory) {
    return (
      <CategoryPage
        category={selectedCategory}
        partner={partner}
        onBack={() => setSelectedCategory(null)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-xl mx-auto p-6">
        {/* Hero */}
        <div className="mb-8" data-testid="accelera-hero">
          <h1 className="text-3xl font-black mb-2" style={{ color: "#1E2128" }}>
            Accelera la crescita
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Strumenti pensati per farti ottenere risultati più velocemente.
            <br />
            Ogni strumento è collegato al tuo obiettivo: vendere il tuo corso.
          </p>
        </div>

        {/* Category cards */}
        <div className="space-y-3">
          {Object.values(CATEGORIES).map((cat) => {
            const CatIcon = cat.icon;
            const availableCount = cat.items.filter((i) => !i.comingSoon).length;
            const totalCount = cat.items.length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                data-testid={`acc-category-${cat.id}`}
                className="w-full bg-white rounded-2xl p-5 text-left transition-all hover:shadow-md hover:scale-[1.01]"
                style={{ border: `2px solid ${cat.color}20` }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cat.color}15` }}>
                    <CatIcon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black mb-0.5" style={{ color: "#1E2128" }}>{cat.title}</h3>
                    <p className="text-sm" style={{ color: "#5F6572" }}>{cat.tagline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${cat.color}15`, color: cat.color }}>
                        {availableCount === totalCount
                          ? `${totalCount} strument${totalCount > 1 ? "i" : "o"}`
                          : `${availableCount} disponibil${availableCount > 1 ? "i" : "e"} · ${totalCount - availableCount} in arrivo`}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: cat.color }} />
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
