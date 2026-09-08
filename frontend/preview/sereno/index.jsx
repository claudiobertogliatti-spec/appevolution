import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import SerenoShell from '../../src/ciak/partner/sereno/SerenoShell';
import SerenoHome from '../../src/ciak/partner/sereno/SerenoHome';
import SerenoJourney from '../../src/ciak/partner/sereno/SerenoJourney';
import SerenoAssistenza from '../../src/ciak/partner/sereno/SerenoAssistenza';
import SerenoMateriali from '../../src/ciak/partner/sereno/SerenoMateriali';
import SerenoServizi from '../../src/ciak/partner/sereno/SerenoServizi';
import SerenoPiano from '../../src/ciak/partner/sereno/SerenoPiano';

function Preview() {
  const [scenario, setScenario] = useState('action');
  const [approved, setApproved] = useState(false);
  const navigate = useNavigate();
  const step = {step_id:'05-script-masterclass', label:'Controlla lo script della masterclass', macro_phase:'valida', owner:'ANDREA', status:scenario === 'blocked' ? 'blocked' : 'in_progress', approval_status:scenario === 'waiting' || approved ? 'pending_review' : null};
  const data = {steps:[{step_id:'la-tua-storia',label:'La tua storia',code:'F-1',macro_phase:'esamina',status:'done'},{step_id:'03-posizionamento',label:'Il tuo posizionamento',code:'F-2',macro_phase:'esamina',status:'done'},{...step,code:'F-5'},{step_id:'08-registra-masterclass',label:'Registra la masterclass',code:'F-8',macro_phase:'valida',status:'pending'},{step_id:'risultati',label:'Leggiamo insieme i risultati',code:'F-19',macro_phase:'ottimizza',status:'pending'}], current_step:step};
  const heading = (title, text) => <header className="sereno-intro"><h1>{title}</h1><p>{text}</p></header>;
  return <SerenoShell user={{name:'Progetto dimostrativo'}} preview>
    <div className="sereno-preview-tools"><label htmlFor="scenario" style={{margin:0}}>Prova uno stato</label><select id="scenario" value={scenario} onChange={e=>{setScenario(e.target.value);setApproved(false);navigate('/partner');}}><option value="action">Prossima azione</option><option value="waiting">Attesa del team</option><option value="blocked">Passaggio bloccato</option></select></div>
    <div style={{paddingTop:22}}><Routes>
      <Route path="/partner" element={<SerenoHome state={data} partnerName="" onOpenStep={()=>navigate('/partner/revisione')} />} />
      <Route path="/partner/revisione" element={<><Link className="sereno-back" to="/partner">← Torna a Oggi</Link>{heading('Lo script della tua masterclass.','Versione dimostrativa · Nessuna approvazione reale')}<article className="sereno-panel"><h3>1. Il benvenuto</h3><p>Benvenuto. In questa masterclass partiamo da una domanda semplice: come puoi fare il primo passo senza dover cambiare tutto in una volta?</p><h3>2. Il punto di partenza</h3><p>Ti mostrerò un esempio concreto e un piccolo esercizio da applicare alla tua situazione.</p></article><div className="sereno-actions"><button className="sereno-primary" onClick={()=>{setApproved(true);navigate('/partner');}}>Prova l’invio al team →</button></div><p className="sereno-note">Dimostrazione del cambio di stato. Le approvazioni reali richiedono il collegamento ai flussi specifici di ciascun materiale.</p></>} />
      <Route path="/partner/percorso" element={<SerenoJourney state={data} onMaterials={()=>navigate('/partner/materiali')} stepHref={()=>'/partner/revisione'} />} />
      <Route path="/partner/materiali" element={<SerenoMateriali
        partner={{ name: 'Progetto dimostrativo' }}
        daControllare={[{ id: 'd1', name: 'Script della masterclass', category: 'Documento', date: 'Ieri', status: 'Da approvare' }]}
        recenti={[
          { id: 'r1', name: 'Il tuo posizionamento', category: 'Documento', date: '2 giorni fa', status: 'Approvato' },
          { id: 'r2', name: 'Brand kit', category: 'Identità e progetto', date: '5 giorni fa', status: 'Approvato' },
        ]}
        cartelle={['Documenti', 'Identità e progetto', 'Script', 'Video', 'Pagine di vendita']}
      />} />
      <Route path="/partner/team" element={<SerenoAssistenza
        partner={{ name: 'Progetto dimostrativo' }}
        currentStepLabel="Controlla lo script della masterclass"
      />} />
      <Route path="/partner/servizi-extra" element={<SerenoServizi />} />
      <Route path="/partner/rinnovo" element={<SerenoPiano />} />
      <Route path="/partner/cambia-password" element={<>{heading('Il tuo account.','Le impostazioni personali, in un unico posto.')}<p className="sereno-note">Nell’app questo collegamento conserva il cambio password esistente. Nell’anteprima non si modificano credenziali.</p></>} />
      <Route path="*" element={<Link to="/partner">Apri l’anteprima →</Link>} />
    </Routes></div>
  </SerenoShell>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><Preview /></BrowserRouter>);
