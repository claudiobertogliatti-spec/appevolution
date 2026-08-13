import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
const { progressMilestones, shouldEmitMasterclassEvent } = require("../lib/masterclassTracking.cjs");

const MASTERCLASS_YOUTUBE_ID = "E2XDEdJgzcQ";
const CTA_UNLOCK_SECONDS = 20 * 60;
const FAST_CTA_SECONDS = 5;

export function CiakMasterclass() {
  const isFastMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("fast") === "1";
  const unlockSeconds = isFastMode ? FAST_CTA_SECONDS : CTA_UNLOCK_SECONDS;
  const [ctaAvailable, setCtaAvailable] = useState(false);
  const emittedRef = useRef(new Set());

  const emitEvent = useCallback((event, progress) => {
    if (!shouldEmitMasterclassEvent(event, emittedRef.current)) return;
    emittedRef.current.add(event);
    let viewerId = localStorage.getItem("ciak_masterclass_viewer_id");
    if (!viewerId) {
      viewerId = (window.crypto?.randomUUID?.() || `viewer_${Date.now()}_${Math.random().toString(16).slice(2)}`);
      localStorage.setItem("ciak_masterclass_viewer_id", viewerId);
    }
    fetch("/api/ciak/masterclass-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      viewer_id: viewerId, event, progress, video_id: MASTERCLASS_YOUTUBE_ID,
      email: localStorage.getItem("ciak_lead_email") || undefined,
      source_url: window.location.href,
    }) }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setCtaAvailable(true), unlockSeconds * 1000);
    return () => clearTimeout(timer);
  }, [unlockSeconds]);

  useEffect(() => { if (ctaAvailable) emitEvent("cta_shown"); }, [ctaAvailable, emitEvent]);

  useEffect(() => {
    let player = null;
    let cancelled = false;
    let progressTimer = null;
    let previousProgress = 0;

    const onEnded = () => {
      emitEvent("video_completed", 100);
      setCtaAvailable(true);
      setTimeout(() => {
        document.getElementById("ep-cta-8domande")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };

    const initPlayer = () => {
      if (cancelled || !window.YT || !window.YT.Player) return;
      player = new window.YT.Player("yt-masterclass", {
        events: { onStateChange: (event) => {
          if (event.data === 1) {
            emitEvent("video_started", 0);
            if (!progressTimer) progressTimer = setInterval(() => {
              const duration = player?.getDuration?.() || 0;
              const current = player?.getCurrentTime?.() || 0;
              if (!duration) return;
              const progress = Math.min(100, Math.round((current / duration) * 100));
              const emittedThresholds = new Set([...emittedRef.current]
                .filter((name) => /^video_(25|50|75)$/.test(name))
                .map((name) => Number(name.replace("video_", ""))));
              progressMilestones(previousProgress, progress, emittedThresholds)
                .filter((milestone) => milestone < 100)
                .forEach((milestone) => emitEvent(`video_${milestone}`, milestone));
              previousProgress = progress;
            }, 5000);
          }
          if (event.data === 0) onEnded();
        } },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === "function") previousReady();
        initPlayer();
      };
    }

    return () => {
      cancelled = true;
      clearInterval(progressTimer);
      try { if (player?.destroy) player.destroy(); } catch (_) { /* noop */ }
    };
  }, [emitEvent]);

  return (
    <>
      <CiakHeader />
      <main>
        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-5xl px-6 pb-6 pt-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-400">Masterclass Ciak</p>
            <p className="mb-6 max-w-3xl leading-relaxed text-slate-300">
              Quando avrai finito di guardare, puoi rispondere alle 8 Domande Ciak: in pochi minuti scopri il tuo
              stato attuale e capisci quale passo ha senso fare prima di investire.
            </p>
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                id="yt-masterclass"
                src={`https://www.youtube.com/embed/${MASTERCLASS_YOUTUBE_ID}?rel=0&enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
                title="Masterclass Ciak"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </section>

        {ctaAvailable && (
          <section id="ep-cta-8domande" className="bg-white">
            <div className="mx-auto max-w-3xl px-6 py-16 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">Prossimo passo</p>
              <h2 className="mb-4 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">Scopri il tuo stato attuale</h2>
              <p className="mx-auto mb-8 max-w-xl leading-relaxed text-slate-600">
                Rispondi alle 8 Domande Ciak (2-3 minuti). Prima di pensare a strumenti, campagne o percorsi più
                grandi, capisci dove sei e da quale direzione partire.
              </p>
              <Link onClick={() => emitEvent("cta_clicked")} to="/diagnostica" className="inline-block rounded-lg bg-slate-900 px-8 py-4 font-semibold text-yellow-400 transition hover:bg-slate-800">
                Inizia le 8 Domande Ciak →
              </Link>
            </div>
          </section>
        )}
      </main>

      {ctaAvailable && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-yellow-400 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row">
            <p className="text-sm leading-snug text-slate-700 md:text-base">Hai visto abbastanza: ora scopri il tuo stato attuale.</p>
            <Link onClick={() => emitEvent("cta_clicked")} to="/diagnostica" className="flex-shrink-0 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 transition hover:bg-slate-800 md:text-base">
              Vai alle 8 Domande Ciak →
            </Link>
          </div>
        </div>
      )}
      {ctaAvailable && <div className="h-24" />}
      <CiakFooter />
    </>
  );
}
