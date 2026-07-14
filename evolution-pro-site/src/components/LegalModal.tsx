import { useEffect, useRef } from 'react';

export type LegalPolicy = 'privacy' | 'cookie' | 'terms';

const policyContent: Record<LegalPolicy, { title: string; body: React.ReactNode }> = {
  privacy: {
    title: 'Informativa Privacy',
    body: <>
      <p className="legal-modal__date">Ultimo aggiornamento: 26 marzo 2026 — Reg. UE 2016/679 (GDPR)</p>
      <h3>Titolare del trattamento</h3>
      <p>Evolution PRO LLC · 8 The Green, Ste A, Dover, DE 19901, USA · assistenza@evolution-pro.it</p>
      <h3>Dati raccolti e finalità</h3>
      <ul>
        <li><strong>Visitatori sito:</strong> IP, dati di navigazione e cookie per sicurezza e analisi.</li>
        <li><strong>Clienti analisi (€67):</strong> nome, email, telefono, questionario e pagamento per l’erogazione del servizio.</li>
        <li><strong>Partner:</strong> dati anagrafici, fiscali, firma digitale e contenuti del corso per l’esecuzione del contratto.</li>
        <li><strong>Lista marketing:</strong> nome ed email per comunicazioni commerciali, previo consenso.</li>
        <li><strong>Meta Pixel:</strong> identificativi del browser o dispositivo, eventi di navigazione e conversione su ciak.io per misurare e ottimizzare le campagne, previo consenso.</li>
      </ul>
      <h3>Principali fornitori (sub-responsabili)</h3>
      <table><thead><tr><th>Fornitore</th><th>Paese</th><th>Finalità</th></tr></thead><tbody>
        <tr><td>Systeme.io</td><td>Francia/UE</td><td>Email marketing e CRM</td></tr>
        <tr><td>Stripe</td><td>USA</td><td>Pagamenti</td></tr>
        <tr><td>PostHog</td><td>USA</td><td>Analytics</td></tr>
        <tr><td>Meta Platforms Ireland</td><td>Irlanda/UE</td><td>Pubblicità e misurazione</td></tr>
        <tr><td>Anthropic</td><td>USA</td><td>Analisi AI</td></tr>
        <tr><td>Cloudflare</td><td>USA</td><td>CDN e sicurezza</td></tr>
      </tbody></table>
      <h3>I tuoi diritti (artt. 15-22 GDPR)</h3>
      <p>Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revoca del consenso. Richieste a assistenza@evolution-pro.it; risposta entro 30 giorni. Reclami: garante.it.</p>
    </>,
  },
  cookie: {
    title: 'Cookie Policy',
    body: <>
      <p className="legal-modal__date">Ultimo aggiornamento: 26 marzo 2026</p>
      <h3>Titolare del trattamento</h3>
      <p>Evolution PRO LLC · 8 The Green, Ste A, Dover, DE 19901, USA · assistenza@evolution-pro.it</p>
      <h3>Cookie tecnici (sempre attivi)</h3>
      <table><thead><tr><th>Cookie</th><th>Finalità</th><th>Durata</th></tr></thead><tbody>
        <tr><td>cf_clearance</td><td>Cloudflare · sicurezza</td><td>Sessione</td></tr>
        <tr><td>__cf_bm</td><td>Cloudflare · traffico</td><td>30 minuti</td></tr>
        <tr><td>session_token</td><td>Autenticazione</td><td>24 ore</td></tr>
      </tbody></table>
      <h3>Cookie analitici (richiedono consenso)</h3>
      <table><thead><tr><th>Cookie</th><th>Fornitore</th><th>Finalità</th><th>Durata</th></tr></thead><tbody>
        <tr><td>ph_*</td><td>PostHog</td><td>Analisi anonima degli utenti</td><td>1 anno</td></tr>
      </tbody></table>
      <h3>Cookie di marketing (richiedono consenso)</h3>
      <p>Attivi solo su ciak.io dopo il consenso “Marketing”.</p>
      <table><thead><tr><th>Cookie</th><th>Fornitore</th><th>Finalità</th><th>Durata</th></tr></thead><tbody>
        <tr><td>_fbp</td><td>Meta Platforms</td><td>Misurazione conversioni e retargeting</td><td>3 mesi</td></tr>
        <tr><td>_fbc</td><td>Meta Platforms</td><td>Attribuzione dei click dagli annunci</td><td>3 mesi</td></tr>
      </tbody></table>
      <h3>Come gestire i cookie</h3>
      <p>Puoi modificare le preferenze in qualsiasi momento da “Gestisci cookie” nel footer oppure dalle impostazioni del browser.</p>
    </>,
  },
  terms: {
    title: 'Condizioni Generali di Vendita',
    body: <>
      <p className="legal-modal__date">Ultimo aggiornamento: 26 marzo 2026</p>
      <h3>Venditore</h3>
      <p>Evolution PRO LLC · 8 The Green, Ste A, Dover, DE 19901, USA · EIN 30-1375330 · assistenza@evolution-pro.it</p>
      <h3>Servizi offerti</h3>
      <ul>
        <li><strong>Analisi Consulenziale</strong> · €67 IVA inclusa (prestazione precontrattuale).</li>
        <li><strong>Partnership Evolution PRO</strong> · €2.790 IVA inclusa (una tantum).</li>
        <li><strong>Servizi Extra</strong> · su richiesta separata.</li>
      </ul>
      <h3>Diritto di recesso</h3>
      <p>Ai sensi dell’art. 59 D.Lgs. 206/2005, il diritto di recesso è escluso per i servizi con contenuto digitale personalizzato avviati con consenso espresso del cliente prima della scadenza del termine di 14 giorni.</p>
      <h3>Pagamenti accettati</h3>
      <p>Stripe (carte Visa, Mastercard e Amex), PayPal e bonifico bancario (IBAN: LT94 3250 0974 4929 5781).</p>
      <h3>Reclami e controversie</h3>
      <p>Scrivere a assistenza@evolution-pro.it; risposta entro 5 giorni lavorativi.<br />ODR: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>.<br />Foro competente: Torino (Italia).</p>
    </>,
  },
};

export function LegalModal({ policy, onClose }: { policy: LegalPolicy | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!policy) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [policy, onClose]);

  if (!policy) return null;
  const content = policyContent[policy];
  return <div className="legal-modal" role="dialog" aria-modal="true" aria-label={content.title}>
    <button className="legal-modal__backdrop" aria-label="Chiudi finestra" onClick={onClose} />
    <article className="legal-modal__panel">
      <button ref={closeRef} className="legal-modal__close" aria-label="Chiudi informative" onClick={onClose}>×</button>
      <p className="eyebrow">Evolution PRO</p>
      <h2>{content.title}</h2>
      <div className="legal-modal__content">{content.body}</div>
    </article>
  </div>;
}
