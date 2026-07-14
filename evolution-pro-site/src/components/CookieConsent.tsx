import { useState } from 'react';
import type { LegalPolicy } from './LegalModal';

export const COOKIE_CONSENT_KEY = 'evolution-pro-cookie-consent';

interface CookieConsentProps {
  onOpenPolicy: (policy: LegalPolicy) => void;
}

export function CookieConsent({ onOpenPolicy }: CookieConsentProps) {
  const [visible, setVisible] = useState(() => !localStorage.getItem(COOKIE_CONSENT_KEY));
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const save = (allowAnalytics: boolean, allowMarketing: boolean) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      necessary: true,
      analytics: allowAnalytics,
      marketing: allowMarketing,
      savedAt: new Date().toISOString(),
    }));
    (document.activeElement as HTMLElement | null)?.blur();
    setVisible(false);
    setSettings(false);
  };

  if (!visible) return null;

  return <section className="cookie-consent" role="region" aria-label="Preferenze cookie">
    <div className="cookie-consent__copy">
      <strong>Questo sito utilizza i cookie</strong>
      <p>Usiamo cookie tecnici e, solo con il tuo consenso, cookie analitici o di marketing. <button onClick={() => onOpenPolicy('cookie')}>Cookie Policy</button> · <button onClick={() => onOpenPolicy('privacy')}>Privacy</button></p>
      {settings && <div className="cookie-consent__settings">
        <label><input type="checkbox" checked disabled /> Cookie tecnici necessari</label>
        <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Cookie analitici</label>
        <label><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /> Cookie di marketing</label>
      </div>}
    </div>
    <div className="cookie-consent__actions">
      <button className="button cookie-consent__necessary" onClick={() => save(false, false)}>Solo necessari</button>
      {settings
        ? <button className="button button--primary" onClick={() => save(analytics, marketing)}>Salva preferenze</button>
        : <button className="button cookie-consent__settings-button" onClick={() => setSettings(true)}>Preferenze</button>}
      <button className="button button--primary" onClick={() => save(true, true)}>Accetta tutti</button>
    </div>
  </section>;
}
