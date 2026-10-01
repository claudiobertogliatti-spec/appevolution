import React from 'react';

/**
 * Video di ringraziamento sotto il titolo (richiesta di Claudio, 1/10/2026).
 *
 * Honesty rule: compare SOLO se esiste un URL vero (`video_benvenuto_url` della
 * proposta). Niente locandina finta, niente "arriva a breve". Mai avvio automatico.
 * Accetta un file (mp4/webm/mov) oppure un embed (YouTube, Vimeo, Loom...). Solo http(s).
 */
const FILE_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

export function isPlayableUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

export default function ThankYouVideo({ url, captionsUrl, poster }) {
  if (!isPlayableUrl(url)) return null;
  const src = url.trim();
  const isFile = FILE_RE.test(src);

  return (
    <div className="pc-thanks" data-testid="thank-you-video">
      <div className="pc-video">
        {isFile ? (
          <video controls playsInline preload="metadata" poster={poster || undefined} aria-label="Video di ringraziamento">
            <source src={src} />
            {captionsUrl && isPlayableUrl(captionsUrl) ? (
              <track kind="captions" srcLang="it" label="Italiano" src={captionsUrl} default />
            ) : null}
            Il tuo browser non riesce a riprodurre il video.
          </video>
        ) : (
          <iframe
            src={src}
            title="Video di ringraziamento"
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>
      <p className="pc-thanks__note">
        È un breve video per ringraziarti. Se preferisci non guardarlo, puoi andare avanti: tutto quello che serve è scritto qui sotto.
      </p>
    </div>
  );
}
