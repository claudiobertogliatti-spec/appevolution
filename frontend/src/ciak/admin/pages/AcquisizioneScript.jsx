/**
 * Reparto Acquisizione — Script (playbook operativo di Mariangela).
 *
 * La procedura di acquisizione partner su LinkedIn, come SOP duplicabile per nuovi
 * collaboratori. Fonte: "Kit Acquisizione LinkedIn — Evolution Pro" (9/9/2026).
 * Ogni script è copiabile. Perimetro interno (brand Ciak: Poppins/slate/giallo).
 */
import { useState } from "react";
import {
  ClipboardList, Copy, Check, Linkedin, Phone, MessageCircle, Video,
  BarChart3, CalendarCheck, RotateCcw, Users, Info,
} from "lucide-react";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

const FLUSSO = [
  { icon: Linkedin, t: "Collegamento + messaggio LinkedIn a freddo" },
  { icon: Phone, t: "Chiamata di qualifica" },
  { icon: MessageCircle, t: "Gruppo WhatsApp a 3 + le 8 Domande Ciak" },
  { icon: Video, t: "Videocall di approfondimento (Cal.com)" },
  { icon: BarChart3, t: "Analisi di mercato (generata da Ciak, commentata in call)" },
  { icon: CalendarCheck, t: "Conferma appuntamento" },
];

const ASSETS = [
  {
    n: "0", title: "Richiesta di collegamento (nota LinkedIn, opzionale)",
    note: "Breve, senza vendere. Serve solo ad aprire la porta.",
    script: `Buongiorno [Nome], seguo con interesse chi lavora in [settore]. Mi farebbe piacere collegarmi e restare in contatto. Grazie e a presto, Mariangela`,
  },
  {
    n: "1", title: "Messaggio LinkedIn di 1° contatto",
    note: "Da inviare dopo l'accettazione del collegamento. Apre la conversazione.",
    script: `Buongiorno [Nome], è un piacere averLa tra i miei contatti e grazie per il collegamento.

Le scrivo perché credo che LinkedIn sia davvero uno dei modi più efficaci per creare partnership professionali solide e win-win. Con Evolution Pro aiutiamo professionisti e formatori a trasformare la propria esperienza in videocorsi e percorsi formativi ad alto impatto, per creare nuove fonti di guadagno e nuovi clienti, senza sottrarre tempo alle attività live.

Attualmente stiamo selezionando quattro figure di riferimento nel Suo ambito per una partnership, in cui Lei mette la sua competenza e i contenuti mentre noi ci occupiamo della struttura, del marketing, della promozione e delle vendite.

Un videocorso, costruito bene, può diventare:
– una fonte di reddito ricorrente, slegata dal tempo;
– un modo per attrarre persone che poi richiedono coaching individuali;
– una leva per promuovere live, eventi e percorsi ad alto valore;
– un asset che lavora 24/7, senza togliere tempo alle attività principali.

Se l'idea può interessarLe, sarei felice di fissare una breve call conoscitiva per capire insieme se ci sono i presupposti per una partnership proficua, adattata alle Sue esigenze.

Resto a disposizione. Cordiali saluti, Mariangela`,
    warn: "Onestà (Codice del Consumo): parliamo di potenziale (\"può diventare\"), non di risultati già ottenuti. Niente numeri, percentuali o testimonianze inventate.",
  },
  {
    n: "2", title: "Script della chiamata di qualifica",
    note: "A chi ha risposto positivamente. Obiettivo: rapport, qualificare, portare al gruppo a 3 + le 8 Domande Ciak. Non si parla di prezzi.",
    blocks: [
      { h: "Apertura", s: `Buongiorno [Nome], sono Mariangela di Evolution Pro. Grazie ancora per aver risposto. Le spiego in due parole di cosa ci occupiamo e, se ha senso, vediamo se ci sono i presupposti per lavorare insieme — senza impegno.` },
      { h: "Posizionamento", s: `Noi creiamo videocorsi e percorsi formativi in partnership con i professionisti: Lei mette la competenza e i contenuti, noi ci occupiamo di tutto il resto — struttura del percorso, tecnologia, marketing e vendite. Non è solo marketing: è un percorso strutturato pensato per durare nel tempo. E una cosa importante: il corso resta di Sua proprietà.` },
      { h: "Domande di qualifica", s: `• Mi tolga una curiosità: perché vorrebbe creare e vendere un Suo videocorso?
• E cosa vorrebbe ottenere davvero — entrate più costanti, più visibilità, più richieste di coaching 1:1, riempire eventi e sale, o altro?
• Oggi come porta clienti alla Sua attività? Ha già una lista o un pubblico che La segue, e di che dimensioni? (← lista/follower)
• Ha già dei contenuti o dei corsi, anche solo abbozzati?
• Nel Suo settore, chi considera i principali riferimenti o competitor? (← competitor)
• C'è un motivo per cui vorrebbe partire proprio adesso? (← urgenza)` },
      { h: "Il processo (cosa succede dopo)", s: `Funziona così: Le mando un link dove rispondere a 8 domande aperte sul Suo progetto, 5-10 minuti, con parole Sue. In base alle Sue risposte prepariamo un'analisi di mercato personalizzata — potenziale del corso, target migliore, competitor e strategie. Poi ci vediamo in videocall e la analizziamo insieme. E le dico una cosa: anche se poi non dovessimo collaborare, quell'analisi resta a Lei, è un valore concreto a prescindere.` },
      { h: "Chiusura verso il gruppo a 3", s: `Facciamo così: Le creo un piccolo gruppo WhatsApp con Claudio, che segue i percorsi videocorsi, così Le mando il link delle domande e fissiamo la videocall. Le va bene se lo apro adesso?

Se esita: Nessun impegno — serve solo per organizzarci e per farLe arrivare l'analisi di mercato. Il resto lo decidiamo insieme in call.` },
    ],
    tip: "Le 3 domande in più (lista/follower, competitor, \"perché adesso\") non sono nelle 8 Domande Ciak online: raccoglierle qui in call rende l'analisi più ricca e umana.",
  },
  {
    n: "3", title: "Script del gruppo WhatsApp a 3",
    note: "Presentazione reciproca + link alle 8 Domande Ciak + appuntamento + urgenza. Nel gruppo: partner + Mariangela + Claudio.",
    script: `Ciao [Nome], ti presento Claudio, che segue i percorsi videocorsi qui in Evolution Pro. Claudio, ti presento [Nome], [professione/settore] — un/una grande professionista nel suo settore.

Ecco il link per rispondere alle 8 domande sul tuo progetto: https://ciak.io/diagnostica

Ci vediamo [giorno GG/MM] alle ore [HH:MM] in videocall.

Importante: compilale per favore tra oggi e domani, così abbiamo 2-3 giorni per preparare l'analisi e arrivare pronti tutti alla call. Grazie! 🙌`,
  },
  {
    n: "4", title: "Le 8 Domande Ciak (su ciak.io/diagnostica)",
    note: "⛔ Non usare più VideoAsk / Google Form. Il prospect risponde su Ciak: le risposte generano l'analisi in automatico e restano tracciate. Solo per tuo riferimento:",
    list: [
      "Competenza — Qual è la competenza su cui hai costruito il tuo lavoro?",
      "Esperienza — Da quanto la pratichi, e come sei arrivato/a a padroneggiarla?",
      "Clienti / prova — Con chi hai già lavorato e un risultato concreto che hai aiutato a ottenere.",
      "Idea offerta — Se immagini un tuo corso o percorso digitale, cosa ti vedi offrire?",
      "Target — A chi vorresti parlare, e cosa la tiene sveglia la notte?",
      "Problema — Qual è il problema che risolvi meglio di chiunque, e la vita di chi ti sceglie prima e dopo?",
      "Digitale — Che rapporto hai col mondo online, cosa hai già provato e dove ti blocchi?",
      "Obiettivo — Perché vuoi farlo davvero, e cosa cambierebbe nella tua vita?",
    ],
    tip: "Al termine il prospect vede un popup di ringraziamento col calendario. L'indice di prontezza 0-100 resta interno: lo vede solo Claudio e guida la proposta in call.",
  },
  {
    n: "5", title: "Analisi di mercato (generata da Ciak, commentata in call)",
    note: "L'analisi (\"Ciak Blueprint\") la genera Ciak in automatico dalle 8 risposte. Resta al partner in ogni caso. In videocall Claudio la commenta e ci costruisce sopra la proposta.",
    list: [
      "Profilo e posizionamento — chi è, in cosa è forte, come si presenta oggi.",
      "Potenziale del videocorso — c'è domanda per questo tema? Segnali di mercato, trend.",
      "Target ideale — a chi parlare, dove si trova, che linguaggio usa.",
      "Competitor e gap — chi c'è già, cosa offre, quale spazio è libero.",
      "Angolo/i consigliati — 1-3 direzioni di posizionamento distintive.",
      "Strategia multicanale — come si promuove (LinkedIn, email, social, funnel).",
      "Percorso Evolution consigliato (lo definisce Claudio in call).",
      "Prossimi passi — cosa serve dal partner per partire.",
    ],
  },
  {
    n: "6", title: "Conferma appuntamento",
    note: "Da inviare nel gruppo WA (o via email) una volta fissata la call.",
    script: `Ciao [Nome], confermo il nostro appuntamento 👇
📅 [giorno GG/MM] · 🕐 ore [HH:MM]
💻 Videocall: [link Cal.com]

Arriveremo con l'analisi di mercato pronta sul tuo caso, così sfruttiamo bene il tempo insieme. Se nel frattempo ti viene qualche domanda, scrivimi pure qui. A presto! 🙌 Mariangela`,
  },
  {
    n: "7", title: "Follow-up post-call (chiusura)",
    note: "Dopo la videocall, se il prospect è interessato ma non chiude sul momento. Lo conduce Claudio (o Mariangela su indicazione).",
    script: `Ciao [Nome], è stato un piacere fare il punto insieme oggi. Come dicevamo, il passo che ha più senso per il tuo obiettivo è [Ciak Start / Partnership Evolution]. Ti lascio qui il riepilogo e il link per partire: [link].

Ricorda che seguiamo massimo 4 nuovi progetti al mese per dare a ciascuno la giusta attenzione — se vuoi rientrare in questa finestra, teniamo il posto fino a [data]. Se preferisci diluire, con Klarna/Stripe puoi rateizzare. Fammi sapere come procediamo. 🙌`,
    esiti: "Esiti (interni, guidati dal punteggio): prontezza ≥50 → Partnership Evolution €2.990 · <50 → Ciak Start €390 (vale come credito verso la Partnership). Upgrade Start→Partnership €2.600. ⛔ Nessun numero di guadagno promesso: si vende il percorso, non il risultato.",
  },
];

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }
    catch { /* clipboard non disponibile */ }
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
      {done ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiato</> : <><Copy className="w-3.5 h-3.5" /> Copia</>}
    </button>
  );
}

function ScriptBlock({ text }) {
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex justify-end mb-2"><CopyBtn text={text} /></div>
      <p className="text-[13px] text-slate-700 whitespace-pre-line leading-relaxed">{text}</p>
    </div>
  );
}

export function AcquisizioneScript() {
  return (
    <div className="p-6 md:p-8 space-y-5 max-w-4xl">
      <AcquisizioneSubNav active="Script" />

      <div className="bg-slate-900 text-white rounded-2xl px-6 py-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-semibold">Script di acquisizione</h1>
        </div>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          La procedura operativa di Mariangela per acquisire partner su LinkedIn. Pronta da
          duplicare per nuovi collaboratori: ogni messaggio è copiabile.
        </p>
        <p className="text-[12px] text-slate-400 mt-2">Fonte: Kit Acquisizione LinkedIn — Evolution Pro (9/9/2026).</p>
      </div>

      {/* FLUSSO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Il flusso in 6 step</h2>
        <p className="text-sm text-slate-500 mb-4">
          <Users className="w-4 h-4 inline -mt-0.5 text-slate-400" /> Mariangela apre, qualifica e fissa. La proposta di percorso/Partnership la conduce Claudio nella videocall.
        </p>
        <div className="space-y-2">
          {FLUSSO.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-900 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <Icon className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">{s.t}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-start gap-2 text-[13px] text-slate-600 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <span>Il questionario non è più un form esterno: il prospect compila le 8 Domande su <span className="font-semibold">ciak.io/diagnostica</span>. Da lì Ciak prepara in automatico l'analisi personalizzata (tutto tracciato: lead, punteggio interno, memoria del prospect).</span>
        </div>
      </div>

      {/* ASSETS */}
      {ASSETS.map((a) => (
        <div key={a.n} className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 text-sm font-bold flex items-center justify-center flex-shrink-0">{a.n}</span>
            <h2 className="text-lg font-semibold text-slate-900">{a.title}</h2>
          </div>
          {a.note && <p className="text-sm text-slate-500 mt-2">{a.note}</p>}

          {a.script && <ScriptBlock text={a.script} />}

          {a.blocks && (
            <div className="mt-3 space-y-4">
              {a.blocks.map((b, i) => (
                <div key={i}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-yellow-700">{b.h}</div>
                  <ScriptBlock text={b.s} />
                </div>
              ))}
            </div>
          )}

          {a.list && (
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              {a.list.map((it, i) => (
                <li key={i} className="text-[13px] text-slate-700">{it}</li>
              ))}
            </ol>
          )}

          {a.tip && (
            <p className="mt-3 text-[12.5px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />{a.tip}
            </p>
          )}
          {a.warn && (
            <p className="mt-3 text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ {a.warn}</p>
          )}
          {a.esiti && (
            <p className="mt-3 text-[12.5px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{a.esiti}</p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 text-[12.5px] text-slate-400 px-1">
        <RotateCcw className="w-3.5 h-3.5" /> Stessa macchina di ProVideo, promessa Evolution: lo script è adattato all'offerta Evolution (Start/Partnership), non alla revenue-share.
      </div>
    </div>
  );
}

export default AcquisizioneScript;
