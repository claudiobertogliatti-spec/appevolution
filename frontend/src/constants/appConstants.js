const getApiUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) {
    return '';
  }
  return backendUrl || '';
};

export const API = getApiUrl();

export const PHASE_LABELS = {
  F0:"Pre-Onboarding",F1:"Attivazione",F2:"Posizionamento",F3:"Masterclass",
  F4:"Struttura Corso",F5:"Produzione",F6:"Accademia",F7:"Pre-Lancio",
  F8:"Lancio",F9:"Ottimizzazione",F10:"Scalabilita",F11:"La mia Accademia",F12:"I miei Studenti",F13:"Impegni Settimana"
};

export const PHASES = ["F0","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","F13"];

export const PHASE_ACTIONS = {
  F0:{title:"Firma il contratto",desc:"Il tuo percorso inizia qui. Firma il contratto e carica i documenti richiesti.",cta:"Carica Documenti",nav:"documenti",tutor:"STEFANIA",color:"#6b7280"},
  F1:{title:"Completa il Posizionamento",desc:"Definisci chi sei, chi aiuti e cosa prometti. STEFANIA ti guida step-by-step.",cta:"Apri Wizard Posizionamento",nav:"documenti",tutor:"STEFANIA",color:"#7c3aed"},
  F2:{title:"Attiva il tuo primo funnel",desc:"Landing + Form + Thank You — tutto compilato in automatico dal posizionamento.",cta:"Genera Funnel Light",nav:"funnel-light",tutor:"STEFANIA",color:"#3B82F6"},
  F3:{title:"Scrivi la tua Masterclass",desc:"6 blocchi strategici. STEFANIA ti aiuta con ogni paragrafo.",cta:"Apri Masterclass Builder",nav:"masterclass",tutor:"STEFANIA",color:"#db2777"},
  F4:{title:"Rivedi la struttura del corso",desc:"Controlla i moduli prima di iniziare a registrare.",cta:"Vedi Struttura Corso",nav:"corso",tutor:"STEFANIA",color:"#db2777"},
  F5:{title:"Registra i video del corso",desc:"ANDREA ti guida. Completa il pre-flight checklist e carica ogni clip.",cta:"Inizia Produzione Video",nav:"produzione",tutor:"ANDREA",color:"#0369a1"},
  F6:{title:"Configura la tua Academy",desc:"Carica i video, configura il Brand Kit e imposta Systeme.io.",cta:"Configura Academy",nav:"brandkit",tutor:"ANDREA",color:"#0369a1"},
  F7:{title:"Prepara il lancio",desc:"STEFANIA crea email, post social e calendario dei 30 giorni.",cta:"Apri Calendario Editoriale",nav:"calendario",tutor:"STEFANIA",color:"#db2777"},
  F8:{title:"Lancio attivo",desc:"Stai lanciando! Monitora le conversioni e chiedi supporto a STEFANIA.",cta:"Supporto Live",nav:"supporto",tutor:"STEFANIA",color:"#16a34a"},
  F9:{title:"Ottimizza le performance",desc:"Analizza i dati e ottimizza il funnel con STEFANIA.",cta:"Analizza Metriche",nav:"calendario",tutor:"STEFANIA",color:"#f59e0b"},
  F10:{title:"La mia Accademia",desc:"Gestisci la tua accademia: studenti, metriche e contenuti.",cta:"Apri Accademia",nav:"accademia",tutor:"STEFANIA",color:"#FFD24D"},
  F11:{title:"I miei Studenti",desc:"Monitora i progressi dei tuoi studenti e le conversioni.",cta:"Vedi Studenti",nav:"studenti",tutor:"MARCO",color:"#10B981"},
  F12:{title:"Impegni Settimana",desc:"Pianifica le tue attivita settimanali e mantieni il ritmo.",cta:"Vedi Impegni",nav:"impegni",tutor:"MARCO",color:"#3B82F6"},
  F13:{title:"Report Mensile",desc:"Analizza le performance del mese e pianifica il prossimo.",cta:"Vedi Report",nav:"report",tutor:"STEFANIA",color:"#8B5CF6"},
};

export const PHASE_TOOLS = {
  F0:[{icon:"\ud83d\udccb",label:"Documenti",nav:"documenti",desc:"Carica contratto"},{icon:"\ud83d\udcac",label:"STEFANIA",nav:"supporto",desc:"Assistente 24/7"}],
  F1:[{icon:"\ud83c\udfaf",label:"Posizionamento",nav:"documenti",desc:"Wizard guidato"},{icon:"\ud83d\udcac",label:"STEFANIA",nav:"supporto",desc:"Assistente 24/7"}],
  F2:[{icon:"\ud83d\ude80",label:"Funnel Light",nav:"funnel-light",desc:"Landing + Form + Thank You"},{icon:"\ud83d\udcac",label:"STEFANIA",nav:"supporto",desc:"Assistente 24/7"}],
  F3:[{icon:"\u270d\ufe0f",label:"Masterclass",nav:"masterclass",desc:"6 blocchi strategici"},{icon:"\u2728",label:"Course Builder",nav:"coursebuilder",desc:"Struttura corso"}],
  F4:[{icon:"\u25b6",label:"Videocorso",nav:"corso",desc:"Studia i moduli"},{icon:"\u270d\ufe0f",label:"Masterclass",nav:"masterclass",desc:"Rifinisci lo script"}],
  F5:[{icon:"\ud83c\udfac",label:"Produzione Video",nav:"produzione",desc:"Pre-flight + upload"},{icon:"\ud83d\udcc1",label:"I Miei File",nav:"files",desc:"Gestione materiali"}],
  F6:[{icon:"\ud83c\udfa8",label:"Brand Kit",nav:"brandkit",desc:"Configura identita"},{icon:"\ud83d\udcc1",label:"I Miei File",nav:"files",desc:"Video e documenti"}],
  F7:[{icon:"\ud83d\udcc5",label:"Calendario",nav:"calendario",desc:"30 giorni editoriale"},{icon:"\ud83d\udccb",label:"Template",nav:"risorse",desc:"Scarica risorse"}],
  F8:[{icon:"\ud83d\udcc5",label:"Calendario",nav:"calendario",desc:"Post programmati"},{icon:"\ud83d\udcac",label:"STEFANIA",nav:"supporto",desc:"Supporto live"}],
  F9:[{icon:"\ud83d\udcc5",label:"Calendario",nav:"calendario",desc:"Ottimizza contenuti"},{icon:"\ud83c\udfac",label:"Produzione",nav:"produzione",desc:"Nuovi video"}],
  F10:[{icon:"\ud83c\udf93",label:"Accademia",nav:"accademia",desc:"Gestisci academy"},{icon:"\ud83d\udcac",label:"STEFANIA",nav:"supporto",desc:"Strategia avanzata"}],
  F11:[{icon:"\ud83d\udc65",label:"Studenti",nav:"studenti",desc:"Lista studenti"},{icon:"\ud83d\udcca",label:"Metriche",nav:"accademia",desc:"Performance"}],
  F12:[{icon:"\ud83d\udccb",label:"Impegni",nav:"impegni",desc:"Task settimana"},{icon:"\ud83d\udcac",label:"MARCO",nav:"supporto",desc:"Accountability"}],
  F13:[{icon:"\ud83d\udcc8",label:"Report",nav:"report",desc:"Analisi mensile"},{icon:"\ud83d\udcac",label:"STEFANIA",nav:"supporto",desc:"Consulenza"}],
};

export const RESOURCES = [
  {name:"Scheda Posizionamento Videocorso",type:"DOCX",size:"24 KB"},
  {name:"Template Analisi Strategica",type:"DOCX",size:"18 KB"},
  {name:"Template Masterclass",type:"DOCX",size:"15 KB"},
  {name:"Proforma Partnership",type:"PDF",size:"210 KB"},
  {name:"Documento di Supporto",type:"PDF",size:"180 KB"},
  {name:"Contratto Partnership",type:"PDF",size:"320 KB"},
];
