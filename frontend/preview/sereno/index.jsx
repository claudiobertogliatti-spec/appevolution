import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import SerenoShell from '../../src/ciak/partner/sereno/SerenoShell';
import SerenoHome from '../../src/ciak/partner/sereno/SerenoHome';
import SerenoJourney from '../../src/ciak/partner/sereno/SerenoJourney';
import SerenoAssistenza from '../../src/ciak/partner/sereno/SerenoAssistenza';
import SerenoMateriali from '../../src/ciak/partner/sereno/SerenoMateriali';
import SerenoServizi from '../../src/ciak/partner/sereno/SerenoServizi';
import { BOOSTER_CATALOG } from '../../src/ciak/partner/booster/boosterCatalog';
import { GROUPS as SERVIZI_GROUPS } from '../../src/ciak/partner/sections/BoosterEvoPage';

const SERVIZI_SECTIONS = SERVIZI_GROUPS.map((g) => ({
  title: g.title,
  subtitle: g.subtitle,
  items: g.ids.map((id) => {
    const it = BOOSTER_CATALOG[id];
    return { id, name: it.name, price: it.prezzo, idealePer: it.idealePer };
  }),
}));
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
        telegramUrl="https://t.me/ciak_partner_support"
        folders={[
          { id: 'brand_kit', name: '01. Brand Kit & Strategia', subtitle: 'Posizionamento, brand kit, logo e contratto firmato' },
          { id: 'scripts', name: '02. Script & Teleprompter', subtitle: 'Copywriting della masterclass e tracce video' },
          { id: 'video', name: '03. Video & Moduli Corso', subtitle: 'Videolezioni e video di benvenuto' },
          { id: 'master_pdf', name: '05. Workbook & Certificati', subtitle: 'Workbook e certificati di completamento' },
        ]}
        files={[
          { id: 'r1', folderId: 'master_pdf', name: 'Piano_Operativo_Strategico_EVO.pdf', category: 'Piano Master', size: 'PDF', date: 'sempre aggiornato', owner: '⚙️ CIAK' },
          { id: 'r2', folderId: 'master_pdf', name: 'Libretto_di_Progetto_Ciak.pdf', category: 'Libretto', size: 'PDF', date: 'sempre aggiornato', owner: '⚙️ CIAK' },
          { id: 'r3', folderId: 'brand_kit', name: 'Posizionamento_Strategico.pdf', category: 'Posizionamento', size: '850 KB', date: '21 lug', owner: '⚙️ CIAK' },
          { id: 'r4', folderId: 'brand_kit', name: 'Contratto_Partner_Firmato.pdf', category: 'Contratto', size: '1.8 MB', date: '15 lug', owner: '👤 Tu' },
          { id: 'r5', folderId: 'scripts', name: 'Script_Masterclass.docx', category: 'Script', size: '420 KB', date: '19 lug', owner: '⚙️ CIAK' },
        ]}
        onOpen={() => {}}
        onDownload={() => {}}
      />} />
      <Route path="/partner/team" element={<SerenoAssistenza
        telegramUrl="https://t.me/ciak_partner_support"
        agents={[
          { id: 'STEFANIA', name: 'Simona', role: 'Coordinatrice del tuo percorso', focus: 'Orientamento, priorità e blocchi generali' },
          { id: 'VALENTINA', name: 'Valentina', role: 'Brand & Posizionamento', focus: 'Identità, promessa, nicchia e messaggio' },
          { id: 'ANDREA', name: 'Andrea', role: 'Coach video e contenuti', focus: 'Script, scaletta, registrazione e teleprompter' },
          { id: 'GAIA', name: 'Gaia', role: 'Supporto tecnico funnel', focus: 'Funnel, pagine, automazioni e collegamenti' },
          { id: 'MARCO', name: 'Marco', role: 'Strategia lancio', focus: 'Calendario, prezzo, webinar e ritmo di vendita' },
          { id: 'MATTEO', name: 'Carlo', role: 'Analista Ciak Blueprint', focus: 'Analisi dati, KPI e sostenibilità economica' },
        ]}
        team={[
          { id: 'CLAUDIO', name: 'Claudio B.', role: 'CEO & Founder', description: 'Direzione strategica e KPI dell’Accademia.' },
          { id: 'STEFANIA_H', name: 'Stefania R.', role: 'Back Office', description: 'Pratiche operative e affiancamento su Telegram.' },
          { id: 'ANTONELLA', name: 'Antonella R.', role: 'Media Strategist', description: 'Contenuti e strategie di comunicazione.' },
          { id: 'MATTEO_H', name: 'Matteo P.', role: 'Video Maker', description: 'Produzione e montaggio delle lezioni.' },
          { id: 'DEBORA', name: 'Debora B.', role: 'Amministrazione', description: 'Contratti, pagamenti e procedure.' },
        ]}
      />} />
      <Route path="/partner/servizi-extra" element={<SerenoServizi sections={SERVIZI_SECTIONS} onOpen={() => {}} />} />
      <Route path="/partner/rinnovo" element={<SerenoPiano />} />
      <Route path="/partner/cambia-password" element={<>{heading('Il tuo account.','Le impostazioni personali, in un unico posto.')}<p className="sereno-note">Nell’app questo collegamento conserva il cambio password esistente. Nell’anteprima non si modificano credenziali.</p></>} />
      <Route path="*" element={<Link to="/partner">Apri l’anteprima →</Link>} />
    </Routes></div>
  </SerenoShell>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><Preview /></BrowserRouter>);
