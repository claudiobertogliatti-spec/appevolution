import React from 'react';
import './insider.css';

/**
 * Benvenuto personalizzato della pagina insider: nome + badge "Evolution
 * Insider" + CTA Telegram (solo se l'URL esiste davvero) + VideoSlot.
 *
 * Honesty rule: il gruppo Telegram non è ancora stato creato per tutti i
 * partner e il video non esiste ancora — niente URL o player finti quando
 * mancano i dati veri (vedi task-5-brief.md).
 */
export default function InsiderWelcome({ name, telegramUrl, videoUrl }) {
  const firstName = (name || '').trim().split(/\s+/)[0] || '';

  return (
    <div className="insider-welcome">
      <span className="insider-welcome__badge">Evolution Insider</span>
      <h1 className="insider-welcome__title">
        {firstName ? `Benvenuto, ${firstName}` : 'Benvenuto'}
      </h1>

      {telegramUrl && (
        <a
          className="insider-welcome__telegram"
          href={telegramUrl}
          target="_blank"
          rel="noreferrer"
        >
          Entra nel gruppo Telegram
        </a>
      )}

      <VideoSlot videoUrl={videoUrl} />
    </div>
  );
}

function VideoSlot({ videoUrl }) {
  if (!videoUrl) {
    return (
      <div className="insider-welcome__video insider-welcome__video--placeholder">
        <p>Il video arriva a breve.</p>
      </div>
    );
  }

  return (
    <div className="insider-welcome__video">
      <iframe
        src={videoUrl}
        title="Video di benvenuto"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
