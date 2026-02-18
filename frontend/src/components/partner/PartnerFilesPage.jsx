import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Download, Upload, Shield, ChevronDown, ChevronUp,
  Loader2, FolderOpen, FileVideo, FileCheck, Trash2, Eye,
  Clock, CheckCircle, XCircle, AlertTriangle, Info, Check,
  Youtube, ExternalLink, Play
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

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
      { icon: "💸", text: "Se EvolutionPro è inadempiente: rimborso proporzionato alle attività non eseguite" },
      { icon: "📉", text: "EvolutionPro non garantisce vendite o profitti — garantisce l'esecuzione professionale dei servizi" },
    ]
  },
  {
    num: 8,
    title: "Servizi Forniti & Metodo EVO",
    subtitle: "Il programma operativo in dettaglio",
    summary: "EvolutionPro ti fornisce tutto il necessario per lanciare il corso: analisi strategica, piattaforma, funnel, copy, piano editoriale per il lancio, gruppo Telegram dedicato e videocorso formativo.",
    points: [
      { icon: "✅", text: "Incluso: Posizionamento, piattaforma Systeme.io, funnel, copy, editing, piano editoriale lancio, Telegram, videocorso" },
      { icon: "❌", text: "Non incluso: Gestione social continuativa, campagne ADV operative, contenuti extra, attività non previste" },
      { icon: "➕", text: "Servizi extra: Puoi richiedere sessioni aggiuntive, AI personalizzato, gestione social, ADV operativo — a preventivo separato" },
      { icon: "📋", text: "Il \"Metodo EVO\" (programma 8 settimane) è parte integrante del contratto e può essere aggiornato senza costi aggiuntivi" },
    ]
  },
  {
    num: 9,
    title: "Clausola Fiscale",
    subtitle: "IVA, fatturazione e responsabilità fiscale",
    summary: "EvolutionPro è una LLC americana (Delaware) che opera da Torino. Non ha Partita IVA italiana, quindi le fatture sono esenti IVA con reverse charge.",
    points: [
      { icon: "🏢", text: "Evolution PRO LLC — Delaware, USA — EIN: 30-1375330" },
      { icon: "🏦", text: "IBAN: LT94 3250 0974 4929 5781 (Revolut Bank UAB)" },
      { icon: "📑", text: "Fatture esenti IVA in Italia → meccanismo reverse charge" },
      { icon: "👤", text: "Tu sei responsabile della tua gestione fiscale (imposte, contributi, registrazioni)" },
    ],
    alert: { type: "info", text: "Questo non è un rapporto di lavoro, agenzia, franchising o associazione in partecipazione. Entrambe le parti operano in piena autonomia giuridica e fiscale." }
  },
  {
    num: 10,
    title: "Protezione Dati (DPA)",
    subtitle: "Come trattiamo i dati dei tuoi clienti",
    summary: "Tu sei il \"titolare\" dei dati dei tuoi clienti, EvolutionPro è il \"responsabile del trattamento\". Significa che noi gestiamo i dati per tuo conto, seguendo le tue istruzioni e le norme GDPR.",
    points: [
      { icon: "👤", text: "Tu = Titolare del trattamento (decidi come usare i dati)" },
      { icon: "⚙️", text: "EvolutionPro = Responsabile del trattamento (gestisce i dati per tuo conto)" },
      { icon: "🔒", text: "Misure di sicurezza: cifratura, autenticazione a due fattori, backup, monitoring" },
      { icon: "🚨", text: "In caso di data breach: notifica entro 48 ore dalla scoperta" },
      { icon: "🗑️", text: "Alla fine del contratto: cancellazione o restituzione di tutti i dati" },
    ]
  },
  {
    num: 11,
    title: "Salvaguardia e Prevalenza",
    subtitle: "Questo contratto è l'unico accordo valido",
    summary: "Questo contratto sostituisce qualsiasi accordo precedente (verbale o scritto). Qualsiasi modifica futura deve essere scritta e firmata da entrambi. Se una clausola viene dichiarata invalida, il resto del contratto resta valido.",
    points: []
  },
  {
    num: 12,
    title: "Tutela del Brand",
    subtitle: "Protezione del marchio EvolutionPro",
    summary: "Il marchio EvolutionPro, i format, le metodologie e i modelli di funnel sono proprietà esclusiva di EvolutionPro. Dopo la fine della partnership, non puoi usare il brand o replicare il modello di business.",
    points: [
      { icon: "🏷️", text: "Logo, nome, format, procedure di EvolutionPro = proprietà esclusiva" },
      { icon: "🚫", text: "Dopo la fine: rimuovere ogni riferimento a EvolutionPro dai tuoi canali" },
      { icon: "⏰", text: "Divieto valido per 60 giorni dopo la cessazione del contratto" },
      { icon: "💸", text: "Penale: €2.500 per violazione della tutela del brand (+ risarcimento danni)" },
    ],
    alert: { type: "good", text: "Puoi sempre usare le competenze professionali acquisite — il divieto riguarda solo la replica del modello EvolutionPro specifico." }
  },
  {
    num: 13,
    title: "Comunicazioni e Notifiche",
    subtitle: "Come ci scriviamo ufficialmente",
    summary: "Per le cose ufficiali (diffide, risoluzioni, modifiche contrattuali) servono PEC o raccomandata. Per le comunicazioni operative quotidiane va bene l'email o Telegram.",
    points: [
      { icon: "📧", text: "Comunicazioni formali: PEC o Raccomandata A/R" },
      { icon: "💬", text: "Comunicazioni operative: email, Telegram (non hanno valore legale)" },
      { icon: "📝", text: "Se cambi PEC o indirizzo: comunica entro 15 giorni lavorativi" },
    ]
  },
  {
    num: 14,
    title: "Foro Competente",
    subtitle: "Dove si risolvono le controversie",
    summary: "Il contratto è regolato dalla legge italiana. Prima di andare in tribunale, le parti provano a risolvere la cosa in modo amichevole (15 giorni di tempo).",
    points: [
      { icon: "🇮🇹", text: "Legge applicabile: italiana" },
      { icon: "🤝", text: "Prima passo: tentativo di composizione amichevole (15 giorni)" },
      { icon: "⚖️", text: "Foro competente esclusivo: Tribunale di Torino" },
    ]
  },
  {
    num: 15,
    title: "Clausola Finale",
    subtitle: "Entrata in vigore e clausole approvate specificamente",
    summary: "Il contratto entra in vigore alla firma (digitale o cartacea). Firmandolo, dichiari di aver letto e compreso tutto — in particolare le clausole più importanti elencate sotto.",
    points: [
      { icon: "✍️", text: "Firma digitale e cartacea hanno lo stesso valore legale" },
      { icon: "📋", text: "Clausole approvate specificamente (art. 1341-1342 c.c.):" },
      { icon: "•", text: "Art. 1.4: Divieto vendita autonoma" },
      { icon: "•", text: "Art. 2.6: Recesso unilaterale di EvolutionPro" },
      { icon: "•", text: "Art. 5.4: Investimento non rimborsabile" },
      { icon: "•", text: "Art. 6.5: Penale riservatezza (€2.000)" },
      { icon: "•", text: "Art. 7.1-7.6: No recesso ordinario, limitazioni responsabilità" },
      { icon: "•", text: "Art. 12.4-12.5: Divieto concorrenza sleale, penale brand (€2.500)" },
      { icon: "•", text: "Art. 14.3: Foro esclusivo Torino" },
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

// Main component
export function PartnerFilesPage({ partner }) {
  const [files, setFiles] = useState({ video: [], document: [], image: [], audio: [], onboarding: [] });
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [youtubeStatus, setYoutubeStatus] = useState({ authenticated: false, loading: true });
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [openArticles, setOpenArticles] = useState([1]); // First article open by default
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
    loadYoutubeVideos();
    checkYoutubeStatus();
  }, [partner]);

  const checkYoutubeStatus = async () => {
    try {
      const r = await axios.get(`${API}/youtube/status`);
      setYoutubeStatus({ authenticated: r.data.authenticated, loading: false });
    } catch (e) {
      setYoutubeStatus({ authenticated: false, loading: false });
    }
  };

  const loadYoutubeVideos = async () => {
    if (!partner?.id) return;
    try {
      const r = await axios.get(`${API}/youtube/partner/${partner.id}/videos`);
      if (r.data.success) {
        setYoutubeVideos(r.data.videos || []);
      }
    } catch (e) {
      console.error('Error loading YouTube videos:', e);
    }
  };

  const loadFiles = async () => {
    if (!partner?.id) return;
    try {
      const r = await axios.get(`${API}/files/partner/${partner.id}`);
      if (r.data.files) {
        setFiles(r.data.files);
        setTotalFiles(r.data.total || 0);
      }
    } catch (e) {
      console.error('Error loading files:', e);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !partner?.id || !videoTitle.trim()) return;
    
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("video_title", videoTitle);
      fd.append("lesson_title", videoTitle);
      fd.append("module_title", "Videocorso");
      
      await axios.post(`${API}/youtube/partner/${partner.id}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setShowVideoModal(false);
      setVideoTitle("");
      // Reload videos after a delay (upload happens in background)
      setTimeout(loadYoutubeVideos, 5000);
      alert("✅ Video in caricamento! Apparirà nella tua playlist YouTube a breve.");
    } catch (e) {
      console.error('Video upload error:', e);
      alert("Errore durante il caricamento: " + (e.response?.data?.detail || e.message));
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !partner?.id) return;
    
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("partner_id", partner.id);
      fd.append("category", "document");
      await axios.post(`${API}/files/upload`, fd);
      await loadFiles();
    } catch (e) {
      console.error('Upload error:', e);
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const toggleArticle = (num) => {
    setOpenArticles(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const allFiles = [...(files.video || []), ...(files.document || []), ...(files.image || []), ...(files.audio || [])];
  const onboardingDocs = files.onboarding || [];

  // Get contract info from partner
  const contractDate = partner?.contract ? new Date(partner.contract).toLocaleDateString('it-IT', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  }) : 'Da definire';

  return (
    <div className="space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
             style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
          📄 Le Mie Risorse
        </div>
        <h1 className="text-2xl font-bold text-[#1E2128] mb-2">
          Il Mio <span style={{ color: '#F5C518' }}>Accordo</span>
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-lg mx-auto">
          Il tuo contratto di partnership con EvolutionPro, spiegato articolo per articolo in modo semplice e chiaro.
        </p>
      </div>

      {/* PDF Download Card */}
      <div className="bg-white rounded-2xl border border-[#F5C518]/30 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#F5C518] via-[#F5C518]/50 to-transparent"/>
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                 style={{ background: '#FEF9E7', border: '1px solid #F5C518' }}>
              📋
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1E2128] text-lg">Contratto di Partnership</h3>
              <p className="text-xs text-[#9CA3AF] font-mono">Documento ufficiale firmato</p>
            </div>
          </div>
          
          {/* Contract Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl mb-5"
               style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-0.5">Tipo</div>
              <div className="text-sm font-medium text-[#3B4049]">Collaborazione Partnership</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-0.5">Durata</div>
              <div className="text-sm font-medium text-[#3B4049]">12 mesi dalla firma</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-0.5">Data Firma</div>
              <div className="text-sm font-medium text-[#3B4049]">{contractDate}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-0.5">Fase</div>
              <div className="text-sm font-medium text-[#3B4049]">{partner?.phase || 'F1'}</div>
            </div>
          </div>
          
          {/* Download Button */}
          <button 
            onClick={() => window.open(`${API}/partners/${partner?.id}/contract-pdf`, "_blank")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-lg"
            style={{ background: '#F5C518', color: '#1E2128' }}
            data-testid="download-contract-pdf-btn"
          >
            <Download className="w-4 h-4"/>
            Scarica il tuo contratto (PDF)
          </button>
          
          {/* Confidential Notice */}
          <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg text-xs"
               style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
            <Shield className="w-4 h-4 flex-shrink-0"/>
            Documento confidenziale — Distribuzione non autorizzata vietata
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
        <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#F5C518]"/>
          Carica i tuoi file
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* YouTube Video Upload */}
          <div className="border-2 border-dashed border-red-200 rounded-xl p-5 text-center hover:border-red-400 cursor-pointer transition-colors bg-red-50/30"
               onClick={() => youtubeStatus.authenticated ? setShowVideoModal(true) : alert("YouTube non configurato. Contatta il supporto.")}>
            <Youtube className="w-8 h-8 text-red-500 mx-auto mb-2"/>
            <div className="font-bold text-sm text-[#1E2128] mb-1">Carica Video su YouTube</div>
            <div className="text-xs text-[#9CA3AF]">I tuoi video vengono salvati sul canale Evolution</div>
            {!youtubeStatus.authenticated && (
              <div className="text-[10px] text-orange-500 mt-1">⚠️ YouTube non configurato</div>
            )}
          </div>
          
          {/* Document Upload */}
          <div className="border-2 border-dashed border-[#ECEDEF] rounded-xl p-5 text-center hover:border-[#F5C518] cursor-pointer transition-colors"
               onClick={() => docInputRef.current?.click()}>
            <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx" onChange={handleDocUpload} className="hidden"/>
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2"/>
            <div className="font-bold text-sm text-[#1E2128] mb-1">Carica Documenti</div>
            <div className="text-xs text-[#9CA3AF]">PDF, DOCX • Max 50MB</div>
          </div>
        </div>
        
        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[#F5C518]">
            <Loader2 className="w-4 h-4 animate-spin"/>
            Caricamento in corso...
          </div>
        )}
      </div>

      {/* YouTube Video Upload Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVideoModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-500"/>
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1E2128]">Carica Video su YouTube</h3>
                <p className="text-xs text-[#9CA3AF]">Il video verrà aggiunto alla tua playlist</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E2128] mb-1">Titolo del Video *</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Es: Lezione 1 - Introduzione"
                  className="w-full p-3 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#1E2128] mb-1">File Video</label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={!videoTitle.trim() || uploadingVideo}
                  className="w-full p-2 text-sm"
                />
              </div>
              
              {uploadingVideo && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  Caricamento su YouTube in corso...
                </div>
              )}
              
              <div className="bg-[#FEF9E7] rounded-lg p-3 text-xs text-[#C4990A]">
                <strong>Nota:</strong> Il video verrà caricato sul canale YouTube di Evolution PRO e aggiunto alla tua playlist personale. Potrai poi usare il link per Systeme.io.
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5F6572] hover:bg-[#FAFAF7] transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Videos Section */}
      {youtubeVideos.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2 bg-red-50/30">
            <Youtube className="w-5 h-5 text-red-500"/>
            <span className="font-bold text-[#1E2128]">I tuoi Video su YouTube</span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              {youtubeVideos.length}
            </span>
          </div>
          <div className="divide-y divide-[#ECEDEF]">
            {youtubeVideos.map(v => (
              <div key={v.video_id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAF7] transition-colors">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt={v.title} className="w-24 h-14 rounded-lg object-cover"/>
                ) : (
                  <div className="w-24 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Play className="w-6 h-6 text-gray-400"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#1E2128] truncate">{v.title}</div>
                  <div className="text-xs text-[#9CA3AF]">
                    Posizione: {v.position + 1} • {new Date(v.added_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <a 
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5"/>
                  Apri
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding Documents */}
      {onboardingDocs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#ECEDEF] flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500"/>
            <span className="font-bold text-[#1E2128]">Documenti Onboarding</span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
              {onboardingDocs.length}
            </span>
          </div>
          <div className="divide-y divide-[#ECEDEF]">
            {onboardingDocs.map(f => (
              <div key={f.file_id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAF7] transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                  <FileCheck className="w-5 h-5 text-green-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#1E2128]">
                    {f.document_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                  <div className="text-xs text-[#9CA3AF]">{f.original_name} • {f.size_readable}</div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  f.status === "verified" ? "bg-green-100 text-green-600" :
                  f.status === "rejected" ? "bg-red-100 text-red-600" :
                  "bg-yellow-100 text-yellow-600"
                }`}>
                  {f.status === "verified" ? "✓ Verificato" : f.status === "rejected" ? "✗ Rifiutato" : "In attesa"}
                </span>
                {f.internal_url && (
                  <button 
                    onClick={() => window.open(`${API}${f.internal_url.replace('/api','')}`, "_blank")}
                    className="p-2 rounded-lg hover:bg-[#ECEDEF] transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[#5F6572]"/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Files */}
      {allFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#ECEDEF] flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#F5C518]"/>
            <span className="font-bold text-[#1E2128]">I Tuoi File</span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEF9E7] text-[#C4990A]">
              {allFiles.length}
            </span>
          </div>
          <div className="divide-y divide-[#ECEDEF]">
            {allFiles.map(f => (
              <div key={f.file_id || f.filename} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAF7] transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  f.category === "video" ? "bg-yellow-100" : "bg-blue-100"
                }`}>
                  {f.category === "video" ? 
                    <FileVideo className="w-5 h-5 text-yellow-500"/> : 
                    <FileText className="w-5 h-5 text-blue-500"/>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#1E2128] truncate">{f.original_name || f.filename}</div>
                  <div className="text-xs text-[#9CA3AF]">{f.size_readable}</div>
                </div>
                <button 
                  onClick={() => window.open(`${API}${f.internal_url?.replace('/api','')}`, "_blank")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAFAF7] border border-[#ECEDEF] hover:border-[#F5C518] transition-colors"
                >
                  <Download className="w-3 h-3"/>
                  Scarica
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalFiles === 0 && onboardingDocs.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] p-8 text-center">
          <FolderOpen className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3"/>
          <h3 className="font-bold text-[#1E2128] mb-1">Nessun file caricato</h3>
          <p className="text-sm text-[#9CA3AF]">Carica video o documenti usando i pulsanti sopra</p>
        </div>
      )}

      {/* Contract Articles Section */}
      <div className="flex items-center gap-3 my-8">
        <div className="flex-1 h-px bg-[#ECEDEF]"/>
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#F5C518]">
          Articoli Spiegati
        </h2>
        <div className="flex-1 h-px bg-[#ECEDEF]"/>
      </div>

      {/* Article Cards */}
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
      <div className="text-center py-6 text-xs text-[#9CA3AF] border-t border-[#ECEDEF] mt-8">
        Questa guida semplificata è fornita per aiutarti a comprendere il tuo accordo.<br/>
        In caso di dubbio, fa fede esclusivamente il testo integrale del contratto firmato.
      </div>
    </div>
  );
}

export default PartnerFilesPage;
