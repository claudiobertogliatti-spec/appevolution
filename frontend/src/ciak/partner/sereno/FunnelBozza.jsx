import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, LayoutTemplate } from 'lucide-react';
import { authHeaders } from '../api';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Cosa può segnalare il partner: errori, non riscritture. Il testo delle pagine non si cambia da qui.
export const TIPI_ERRORE = [
  ['termine', 'Un termine inesatto'],
  ['foto', 'Una foto'],
  ['colori', 'I colori'],
  ['dato', 'Un dato sbagliato (nome, prezzo, link…)'],
  ['altro', 'Altro'],
];
const ETICHETTA = Object.fromEntries(TIPI_ERRORE);

export function costruisciSegnalazione(tipo, cosa) {
  return `${ETICHETTA[tipo] || 'Altro'}: ${String(cosa || '').trim()}`.slice(0, 200);
}

function Segnala({ page, onSend, busy }) {
  const [aperto, setAperto] = useState(false);
  const [tipo, setTipo] = useState('termine');
  const [cosa, setCosa] = useState('');
  const [giusto, setGiusto] = useState('');
  const pronto = cosa.trim().length >= 3 && giusto.trim().length >= 3;
  const invia = async () => { if (await onSend(page.id, costruisciSegnalazione(tipo, cosa), giusto.trim())) { setAperto(false); setCosa(''); setGiusto(''); } };
  if (!aperto) return <button type="button" className="sereno-secondary" onClick={() => setAperto(true)}>Segnala un errore</button>;
  return <div className="sereno-bozza-form">
    <label htmlFor={`tipo-${page.id}`}>Che cosa non va?</label>
    <select id={`tipo-${page.id}`} value={tipo} onChange={e => setTipo(e.target.value)}>{TIPI_ERRORE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <label htmlFor={`cosa-${page.id}`}>Dove e com’è adesso</label>
    <input id={`cosa-${page.id}`} maxLength={150} value={cosa} onChange={e => setCosa(e.target.value)} />
    <label htmlFor={`giusto-${page.id}`}>Come dovrebbe essere</label>
    <input id={`giusto-${page.id}`} maxLength={300} value={giusto} onChange={e => setGiusto(e.target.value)} />
    <div className="sereno-actions"><button type="button" className="sereno-primary" disabled={!pronto || busy} onClick={invia}>Invia la segnalazione</button>
      <button type="button" className="sereno-secondary" onClick={() => setAperto(false)}>Annulla</button></div>
  </div>;
}

export default function FunnelBozza({ partnerId, macroPhase }) {
  const [dati, setDati] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const carica = useCallback(async () => {
    if (!partnerId) return;
    try {
      const r = await fetch(`${API}/api/partner-journey/funnel-review/${partnerId}`, { headers: authHeaders() });
      if (r.ok) setDati(await r.json());
    } catch { /* la scheda semplicemente non compare */ }
  }, [partnerId]);
  useEffect(() => { carica(); }, [carica]);

  const segnala = async (pageId, wrong, right) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await fetch(`${API}/api/partner-journey/funnel-review/${partnerId}/correction`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ page_id: pageId, wrong, right }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'Non sono riuscito a inviare. Riprova.');
      setDati(x => ({ ...x, ...d }));
      setMsg('Segnalazione inviata: la vede il team.');
      return true;
    } catch (e) { setErr(String(e.message || e)); return false; } finally { setBusy(false); }
  };

  if (!dati) return null;
  if (!dati.released) {
    if (macroPhase !== 'esamina') return null;
    return <section className="sereno-bozza" aria-labelledby="sereno-bozza-title">
      <h2 id="sereno-bozza-title"><LayoutTemplate aria-hidden="true"/>Il tuo funnel in bozza</h2>
      <p>Il team sta preparando le pagine del tuo funnel. Quando la bozza è pronta la trovi qui e potrai guardarla.</p>
    </section>;
  }
  return <section className="sereno-bozza" aria-labelledby="sereno-bozza-title">
    <h2 id="sereno-bozza-title"><LayoutTemplate aria-hidden="true"/>Il tuo funnel in bozza</h2>
    <p>Guarda le pagine. Qui non si riscrivono i testi: se trovi un termine inesatto, una foto o dei colori sbagliati, segnalalo.</p>
    {msg && <p role="status" className="sereno-bozza-ok">{msg}</p>}
    {err && <p role="alert" className="sereno-bozza-err">{err}</p>}
    <ul className="sereno-bozza-list">{(dati.pages || []).map(p => <li key={p.id}>
      <div><h3>{p.title}</h3><small>{p.descr}</small>
        {p.open_corrections > 0 && <small>{p.open_corrections} {p.open_corrections === 1 ? 'segnalazione aperta' : 'segnalazioni aperte'}</small>}</div>
      <div className="sereno-bozza-actions">
        <a className="sereno-secondary" href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/>Apri la bozza</a>
        <Segnala page={p} onSend={segnala} busy={busy} />
      </div>
    </li>)}</ul>
  </section>;
}
