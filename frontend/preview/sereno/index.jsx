import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import SerenoShell from '../../src/ciak/partner/sereno/SerenoShell';
import SerenoHome from '../../src/ciak/partner/sereno/SerenoHome';

function Preview() {
  const [scenario, setScenario] = useState('action');
  const [approved, setApproved] = useState(false);
  const navigate = useNavigate();
  const step = {step_id:'05-script-masterclass', label:'Controlla lo script della masterclass', macro_phase:'valida', owner:'ANDREA', status:scenario === 'blocked' ? 'blocked' : 'in_progress', approval_status:scenario === 'waiting' || approved ? 'pending_review' : null};
  const data = {steps:[step], current_step:step};
  const heading = (title, text) => <header className="sereno-intro"><h1>{title}</h1><p>{text}</p></header>;
  return <SerenoShell user={{name:'Progetto dimostrativo'}} preview>
    <div className="sereno-preview-tools"><label htmlFor="scenario" style={{margin:0}}>Prova uno stato</label><select id="scenario" value={scenario} onChange={e=>{setScenario(e.target.value);setApproved(false);navigate('/partner');}}><option value="action">Prossima azione</option><option value="waiting">Attesa del team</option><option value="blocked">Passaggio bloccato</option></select></div>
    <div style={{paddingTop:22}}><Routes>
      <Route path="/partner" element={<SerenoHome state={data} partnerName="" onOpenStep={()=>navigate('/partner/revisione')} />} />
      <Route path="/partner/revisione" element={<><Link className="sereno-back" to="/partner">← Torna a Oggi</Link>{heading('Lo script della tua masterclass.','Versione dimostrativa · Nessuna approvazione reale')}<article className="sereno-panel"><h3>1. Il benvenuto</h3><p>Benvenuto. In questa masterclass partiamo da una domanda semplice: come puoi fare il primo passo senza dover cambiare tutto in una volta?</p><h3>2. Il punto di partenza</h3><p>Ti mostrerò un esempio concreto e un piccolo esercizio da applicare alla tua situazione.</p></article><div className="sereno-actions"><button className="sereno-primary" onClick={()=>{setApproved(true);navigate('/partner');}}>Prova l’invio al team →</button></div><p className="sereno-note">Dimostrazione del cambio di stato. L’approvazione dei documenti reali sarà collegata nel prossimo blocco.</p></>} />
      <Route path="/partner/percorso" element={<>{heading('Sai sempre a che punto sei.','Tre fasi, con il team al tuo fianco.')}<details><summary>Esamina · Definiamo il tuo progetto</summary><p>Identità, storia e posizionamento.</p></details><details open><summary>Valida · Prepariamo corso e lancio</summary><div className="sereno-row"><span>Script della masterclass<small>{step.approval_status ? 'In revisione al team' : 'Pronto da consultare'}</small></span><Link className="sereno-primary" to="/partner/revisione">Apri il passaggio →</Link></div><div className="sereno-row"><span>Registrazione dei video<small>Le istruzioni arrivano dopo la revisione dello script.</small></span><span className="sereno-badge">Previsto dopo</span></div></details><details><summary>Ottimizza · Miglioriamo i risultati</summary><p>Dati e attività concordate dopo il lancio.</p></details></>} />
      <Route path="/partner/materiali" element={<>{heading('I tuoi materiali.','Le versioni aggiornate, facili da ritrovare.')}<section className="sereno-panel"><h3>Ultima consegna</h3><div className="sereno-row"><span>Script della masterclass<small>Documento dimostrativo</small></span><Link className="sereno-primary" to="/partner/revisione">Leggi →</Link></div></section><p className="sereno-note">L’archivio reale e i caricamenti verranno collegati nel blocco Materiali.</p></>} />
      <Route path="/partner/team" element={<>{heading('Ci siamo, quando ti serve.','Un unico punto da cui chiedere una mano.')}<section className="sereno-focus"><span className="sereno-badge">Il supporto del tuo progetto</span><h2>Partiamo dal tuo dubbio.</h2><p>Qui troverai il contatto del team e le richieste legate al tuo percorso.</p><p className="sereno-note">Anteprima dell’organizzazione. Nessun messaggio viene inviato da questa pagina.</p></section></>} />
      <Route path="/partner/servizi-extra" element={<>{heading('Servizi aggiuntivi.','Un aiuto in più, quando è utile al tuo progetto.')}<section className="sereno-focus"><span className="sereno-badge">Facoltativi</span><h2>Il tuo percorso resta completo.</h2><p>Qui potrai valutare attività aggiuntive, con consegne, tempi e prezzi chiari prima di scegliere.</p><p className="sereno-note">Il catalogo esistente verrà collegato nel blocco Servizi. Nessun prezzo o acquisto simulato.</p></section></>} />
      <Route path="/partner/rinnovo" element={<>{heading('Il tuo piano.','Cosa comprende il supporto e come continuare.')}<section className="sereno-panel"><h3>Il tuo periodo di supporto</h3><p>Durata, scadenza e condizioni verranno mostrate dai dati verificati del tuo piano.</p><div className="sereno-row"><span>Servizi inclusi</span><span className="sereno-badge">Da collegare</span></div><div className="sereno-row"><span>Scadenza e prosecuzione</span><span className="sereno-badge">Da collegare</span></div></section></>} />
      <Route path="/partner/cambia-password" element={<>{heading('Il tuo account.','Le impostazioni personali, in un unico posto.')}<p className="sereno-note">Nell’app questo collegamento conserva il cambio password esistente. Nell’anteprima non si modificano credenziali.</p></>} />
      <Route path="*" element={<Link to="/partner">Apri l’anteprima →</Link>} />
    </Routes></div>
  </SerenoShell>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><Preview /></BrowserRouter>);
