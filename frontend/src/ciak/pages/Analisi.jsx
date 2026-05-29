/**
 * Ciak.io /analisi/:token — visualizzazione analisi definitiva Ciak Blueprint
 * Estetica "Canva": white bg, navy #0F172A, yellow #FACC15, Poppins, card layout.
 * Markdown rendering: whitespace-pre-wrap (identico a Report.jsx, no dipendenze esterne).
 * Endpoint: GET /api/ciak/analisi/:token → 200 (unlocked) | 409 (in preparazione) | 404
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../analisi/analisi.css";

const CHAPTERS = [
  ["punto_di_partenza",  "Il tuo punto di partenza"],
  ["dove_sei_adesso",    "Dove sei adesso"],
  ["il_tuo_mercato",     "Il tuo mercato"],
  ["la_tua_accademia",   "La tua Accademia Digitale"],
  ["la_roadmap",         "La roadmap"],
  ["prossimo_passo",     "Il prossimo passo"],
];

export function CiakAnalisi() {
  const { token } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState(null); // "ready" | "pending" | "error"

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ciak/analisi/${token}`);
        if (res.status === 409) {
          setStatus("pending");
          return;
        }
        const json = await res.json();
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setData(json);
        setStatus("ready");
      } catch (e) {
        setStatus("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="an-root" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
        Caricamento…
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="an-root" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#94A3B8", marginBottom: 16 }}>
            Ciak Blueprint · powered by Evolution PRO
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Analisi in preparazione</h2>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            La tua analisi è in preparazione — sarà disponibile qui subito dopo la call strategica con Claudio.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="an-root" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Analisi non trovata</h2>
          <p style={{ color: "#475569" }}>
            Il link potrebbe essere scaduto o non valido. Contatta Claudio per assistenza.
          </p>
        </div>
      </div>
    );
  }

  const def        = data.analisi_definitiva || {};
  const capitoli   = def.capitoli || {};
  const accademia  = def.accademia || {};
  const roadmap    = def.roadmap || [];
  const moduli     = accademia.moduli || [];

  return (
    <div className="an-root">
      {/* Cover */}
      <div className="an-cover">
        <p className="an-logo">Ciak Blueprint · powered by Evolution PRO</p>
        <h1>
          La tua <span className="an-pill">analisi</span>
        </h1>
        <p className="an-sub">{data.nome || ""}</p>
      </div>

      {/* Chapters */}
      <div className="an-page">
        {CHAPTERS.map(([key, label], idx) => {
          const content = capitoli[key] || "";
          const isAccademia = key === "la_tua_accademia";
          const isRoadmap   = key === "la_roadmap";
          const num = String(idx + 1).padStart(2, "0");

          return (
            <div className="an-section" key={key}>
              <span className="an-num">{num}</span>
              <h2>{label}</h2>
              <p>{content}</p>

              {/* Accademia extras */}
              {isAccademia && moduli.length > 0 && (
                <>
                  <div className="an-cards">
                    {moduli.map((m, i) => (
                      <div className="an-card" key={i}>
                        <h4>{m.nome || ""}</h4>
                        <p>{m.descrizione || ""}</p>
                      </div>
                    ))}
                  </div>
                  {accademia.pricing_suggerito && (
                    <div className="an-price-pill">
                      Pricing suggerito: <b>{accademia.pricing_suggerito}</b>
                    </div>
                  )}
                </>
              )}

              {/* Roadmap extras */}
              {isRoadmap && roadmap.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {roadmap.map((r, i) => (
                    <div className="an-roadmap-item" key={i}>
                      <div className="an-roadmap-fase">
                        <div>{r.fase || ""}</div>
                        <div style={{ fontWeight: 400, color: "#475569", textTransform: "none", fontSize: 11, marginTop: 2 }}>
                          {r.durata || ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{r.attivita || ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* CTA finale */}
        <div className="an-cta">
          <h3>Il prossimo passo</h3>
          <p>
            La roadmap che hai appena letto diventa realtà attraverso la Partnership Evolution PRO.
            Ne abbiamo già parlato nella call — questo documento è il tuo punto di riferimento operativo
            per i prossimi mesi.
          </p>
        </div>

        {/* Footer */}
        <div className="an-footer">
          Ciak — powered by Evolution PRO · Delaware LLC · www.ciak.io
        </div>
      </div>
    </div>
  );
}

export default CiakAnalisi;
