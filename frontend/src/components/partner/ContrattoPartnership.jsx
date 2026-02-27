import React, { useState } from "react";
import { 
  FileText, ChevronDown, ChevronUp, Shield, Download,
  AlertTriangle, Info, Check, FileSignature, Calendar,
  Clock, CheckCircle
} from "lucide-react";

// Contract articles data
const CONTRACT_ARTICLES = [
  {
    num: 1,
    title: "Oggetto del Contratto",
    subtitle: "Cosa facciamo insieme e chi fa cosa",
    summary: "Tu e EvolutionPro collaborate per creare, promuovere e vendere il tuo videocorso. Tu metti i contenuti e la tua competenza, noi mettiamo la strategia, la tecnologia e il supporto operativo.",
    points: [
      { icon: "📦", text: "Tu fornisci i materiali originali (testi, video, immagini) di tua proprietà" },
      { icon: "⚙️", text: "Noi forniamo: posizionamento, piattaforma, funnel, editing, copy, lancio" },
      { icon: "🔒", text: "Il corso si vende solo tramite i canali EvolutionPro durante la partnership" },
      { icon: "📊", text: "Hai accesso alla dashboard per vedere vendite e fatturato in tempo reale" },
      { icon: "📢", text: "Puoi promuovere sui tuoi social, ma il traffico deve andare verso il funnel di EvolutionPro" },
    ],
    alert: { type: "warn", text: "Non puoi vendere lo stesso corso (o uno molto simile) in autonomia durante la partnership. Serve l'ok scritto di EvolutionPro." }
  },
  {
    num: 2,
    title: "Durata, Rinnovo e Recesso",
    subtitle: "Quanto dura e come funziona la chiusura",
    summary: "La partnership dura 12 mesi dalla firma. Non si rinnova automaticamente: alla scadenza finisce, e se volete continuare si fa un nuovo accordo.",
    points: [
      { icon: "📅", text: "Durata: 12 mesi dalla firma del contratto" },
      { icon: "🔄", text: "Nessun rinnovo automatico — alla scadenza si decide insieme" },
      { icon: "🛠️", text: "Dopo la scadenza puoi tenere online il corso pagando tu direttamente Systeme.io" },
      { icon: "📩", text: "Per rinnovare o modificare: comunicazione scritta almeno 30 giorni prima della scadenza" },
    ],
    alert: { type: "info", text: "In caso di grave inadempimento di una delle parti, il contratto può essere risolto anticipatamente con diffida via PEC e 15 giorni di tempo per rimediare." }
  },
  {
    num: 3,
    title: "Diritti e Obblighi delle Parti",
    subtitle: "Cosa devi fare tu e cosa facciamo noi",
    summary: "Entrambe le parti hanno dei compiti precisi. Tu partecipi attivamente, fornisci i materiali nei tempi indicati e collabori. Noi eseguiamo il programma operativo con professionalità.",
    points: [
      { icon: "📝", text: "Tu: Posizionamento entro 7 giorni dalla firma, outline corso entro 7 giorni dal brief, video tra settimana 3 e 5" },
      { icon: "⏱️", text: "Tu: Revisioni entro 48 ore, comunicazione costante e tempestiva" },
      { icon: "🎯", text: "Tu: Gestisci in autonomia i contatti e lead generati per vendita e relazione clienti" },
      { icon: "🔧", text: "Noi: Funnel, editing, copy, supporto strategico, accesso piattaforma, gruppo Telegram, videocorso formativo" },
      { icon: "📞", text: "Noi: Supporto via Telegram e email assistenza@evolution-pro.it" },
    ],
    alert: { type: "warn", text: "Se ritardi nella consegna dei materiali, le fasi successive slittano proporzionalmente — ma la durata del contratto non si allunga." }
  },
  {
    num: 4,
    title: "Proprietà Intellettuale",
    subtitle: "Chi possiede cosa",
    summary: "I tuoi contenuti restano tuoi al 100%. Tu dai a EvolutionPro una licenza temporanea per usarli, produrre il corso e promuoverlo — ma solo per la durata della partnership (+ 60 giorni).",
    points: [
      { icon: "✅", text: "I tuoi contenuti originali (idee, testi, video) restano di tua proprietà" },
      { icon: "📄", text: "EvolutionPro ha una licenza d'uso esclusiva ma temporanea (12 mesi + 60 giorni)" },
      { icon: "🎨", text: "Possiamo adattare i contenuti per migliorare qualità e performance, senza alterarne la sostanza" },
      { icon: "📸", text: "EvolutionPro può usare estratti e testimonianze per il proprio portfolio, anche dopo la fine del contratto" },
    ],
    alert: { type: "good", text: "Dopo la fine del contratto, i tuoi contenuti tornano completamente a te. La licenza di EvolutionPro decade." }
  },
  {
    num: 5,
    title: "Corrispettivi e Pagamenti",
    subtitle: "Quanto costa, come si paga, le royalties",
    summary: "Investi €2.500 una tantum per avviare il progetto — questo copre il 30% del valore totale stimato (€8.000), mentre EvolutionPro investe il restante 70% in servizi.",
    points: [
      { icon: "💰", text: "Investimento: €2.500 una tantum (non è un abbonamento)" },
      { icon: "📊", text: "Valore progetto stimato: €8.000 (tu copri il 30%, EvolutionPro il 70% in servizi)" },
      { icon: "📈", text: "Royalty: 10% delle vendite nette del corso per 12 mesi a favore di EvolutionPro" },
      { icon: "💳", text: "Pagamento su conto Revolut Bank UAB o tramite Stripe/PayPal" },
      { icon: "📢", text: "Le campagne ADV sono consigliate ma non obbligatorie — i costi ADV sono a tuo carico" },
    ],
    alert: { type: "warn", text: "L'investimento non è rimborsabile, salvo grave inadempimento di EvolutionPro. Se non paghi entro 15 giorni dalla scadenza, l'accesso alla piattaforma può essere sospeso." }
  },
  {
    num: 6,
    title: "Riservatezza",
    subtitle: "Cosa non puoi condividere",
    summary: "Tutto ciò che impari, vedi e ricevi durante la partnership è confidenziale: strategie, funnel, dati di vendita, procedure, know-how. Vale per entrambe le parti.",
    points: [
      { icon: "🔐", text: "Strategie, funnel, automazioni, report, dati clienti → tutto riservato" },
      { icon: "⏰", text: "L'obbligo vale per la durata del contratto + 2 mesi dopo la fine" },
      { icon: "🚫", text: "Penale: €2.000 per violazione della riservatezza (+ risarcimento danni)" },
      { icon: "🤝", text: "Vale anche per le informazioni scambiate prima della firma (fase precontrattuale)" },
    ]
  },
  {
    num: 7,
    title: "Recesso e Risoluzione Anticipata",
    subtitle: "Come si esce prima della scadenza",
    summary: "Non esiste un recesso \"libero\" — il contratto dura 12 mesi. Si può uscire prima solo se l'altra parte commette un inadempimento grave.",
    points: [
      { icon: "❌", text: "Nessun recesso ordinario per nessuna delle due parti" },
      { icon: "⚖️", text: "Risoluzione possibile solo per grave inadempimento (con diffida PEC + 15 giorni)" },
      { icon: "💸", text: "Se EvolutionPro risolve per tua colpa: penale del 50% del fatturato previsto" },
      { icon: "📦", text: "In caso di risoluzione, ricevi tutti i materiali prodotti e puoi proseguire da solo" },
    ],
    alert: { type: "info", text: "Grave inadempimento = mancato pagamento oltre 30 giorni, violazione riservatezza, mancata consegna materiali nonostante solleciti scritti." }
  },
  {
    num: 8,
    title: "Clausole Finali",
    subtitle: "Foro, modifiche, comunicazioni",
    summary: "Qualsiasi controversia va al tribunale di Torino. Le modifiche al contratto vanno fatte per iscritto. Le comunicazioni ufficiali si fanno via email certificata.",
    points: [
      { icon: "🏛️", text: "Foro competente: Tribunale di Torino" },
      { icon: "📧", text: "Comunicazioni ufficiali: via email agli indirizzi indicati nel contratto" },
      { icon: "✍️", text: "Modifiche contrattuali: solo in forma scritta, firmate da entrambe le parti" },
      { icon: "📜", text: "Allegati: Informativa privacy, scheda progetto, termini d'uso piattaforma" },
    ]
  },
];

// Article Card component
function ArticleCard({ article, isOpen, onToggle }) {
  const alertStyles = {
    warn: "bg-orange-50 border-orange-200 text-orange-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    good: "bg-green-50 border-green-200 text-green-700"
  };
  
  const alertIcons = {
    warn: AlertTriangle,
    info: Info,
    good: Check
  };

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${
      isOpen ? "border-[#F5C518] shadow-sm" : "border-[#ECEDEF] hover:border-[#F5C518]/50"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: isOpen ? '#F5C518' : '#FEF9E7', color: isOpen ? '#1E2128' : '#C4990A' }}>
          <span className="font-bold text-sm">{article.num}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#1E2128]">{article.title}</div>
          <div className="text-xs text-[#9CA3AF]">{article.subtitle}</div>
        </div>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          isOpen ? "bg-[#F5C518]/20" : "bg-[#FAFAF7]"
        }`}>
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#5F6572]"/> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]"/>}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#ECEDEF]">
          <div className="mt-4 p-4 rounded-lg bg-[#FEF9E7] border border-[#F5C518]/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4990A] mb-2 flex items-center gap-1.5">
              💡 Cosa significa in pratica
            </div>
            <p className="text-sm text-[#3B4049] leading-relaxed">{article.summary}</p>
          </div>
          
          <div className="mt-4 space-y-2">
            {article.points.map((point, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 text-base">{point.icon}</span>
                <span className="text-[#5F6572] leading-relaxed">{point.text}</span>
              </div>
            ))}
          </div>
          
          {article.alert && (
            <div className={`mt-4 p-3 rounded-lg border flex items-start gap-2 ${alertStyles[article.alert.type]}`}>
              {React.createElement(alertIcons[article.alert.type], { className: "w-4 h-4 flex-shrink-0 mt-0.5" })}
              <span className="text-xs">{article.alert.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContrattoPartnership({ partner, onBack }) {
  const [openArticles, setOpenArticles] = useState([1]);
  
  const partnerName = partner?.name || "Partner";
  const contractDate = partner?.contractDate || "01/01/2026";
  const expiryDate = partner?.expiryDate || "31/12/2026";

  const toggleArticle = (num) => {
    setOpenArticles(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4" style={{ background: '#1E2128' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className="text-white text-xl">←</span>
            </button>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                Contratto Partnership
              </h1>
              <p className="text-sm text-white/70">Tutti gli articoli del tuo contratto</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: '#F2C418', color: '#1E2128' }}>
            <Download className="w-4 h-4" />
            Scarica PDF
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Contract Status Card */}
        <div className="p-6 rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg, #34C77B, #2FA86B)' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white/80 text-sm">Stato Contratto</div>
              <div className="text-white font-bold text-xl">Attivo e Firmato</div>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm">Scadenza</div>
              <div className="text-white font-bold text-lg">{expiryDate}</div>
            </div>
          </div>
        </div>

        {/* Contract Info */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
            <div className="text-xs text-[#9CA3AF] mb-1">Partner</div>
            <div className="font-bold text-[#1E2128]">{partnerName}</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
            <div className="text-xs text-[#9CA3AF] mb-1">Data Firma</div>
            <div className="font-bold text-[#1E2128]">{contractDate}</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
            <div className="text-xs text-[#9CA3AF] mb-1">Durata</div>
            <div className="font-bold text-[#1E2128]">12 mesi</div>
          </div>
        </div>

        {/* Intro */}
        <div className="p-4 rounded-xl mb-6" style={{ background: '#E8F4FD', border: '1px solid #3B82F633' }}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-blue-700 mb-1">Contratto di Partnership EvolutionPro</div>
              <div className="text-sm text-blue-600">
                Questo contratto definisce la collaborazione tra te e EvolutionPro per la creazione e vendita del tuo videocorso.
                Clicca su ogni articolo per leggere i dettagli in modo chiaro e comprensibile.
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {CONTRACT_ARTICLES.map(article => (
            <ArticleCard
              key={article.num}
              article={article}
              isOpen={openArticles.includes(article.num)}
              onToggle={() => toggleArticle(article.num)}
            />
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-4 rounded-xl text-center" style={{ background: '#FFF8DC' }}>
          <p className="text-sm" style={{ color: '#C4990A' }}>
            📋 Hai dubbi su qualche articolo? Scrivici su Telegram o contatta assistenza@evolution-pro.it
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContrattoPartnership;
