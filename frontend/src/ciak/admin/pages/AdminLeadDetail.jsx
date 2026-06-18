/**
 * Ciak Admin — Dettaglio lead. GET /api/admin/ciak/lead?email=...
 *
 * Vista 360°: record ciak_leads + diagnostic sessions (8 Domande + report Matteo)
 * + checkpoint events. Per i lead qualificati (call_done + Stato 3-4) mostra il
 * pannello "Genera Proposta Partnership" — il bridge verso Evolution.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api";

const STATO_LABEL = {
  1: "Definizione",
  2: "Strutturazione",
  3: "Validazione",
  4: "Evoluzione Strategica",
};

const PURCHASED_STATES = ["purchased_67", "call_booked", "call_done", "partner_approved", "partner_active"];

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="mb-2">
      <span className="text-xs text-slate-400">{label}: </span>
      <span className="text-sm text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

export function AdminLeadDetail({ onAuthExpired }) {
  const { email } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const [markMsg, setMarkMsg] = useState(null);

  useEffect(() => {
    apiGet("/lead", { email: decodeURIComponent(email) })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
        else setError(e.message);
      });
  }, [email, onAuthExpired]);

  async function markPaid() {
    if (!window.confirm("Segnare l'analisi 67 EUR come PAGATA (manuale) per " + data.email + "?\n\nNon esegue alcun pagamento reale: registra solo l'acquisto nel funnel (purchased_67).")) return;
    setMarking(true);
    setMarkMsg(null);
    try {
      const r = await apiPost("/lead/mark-purchased", { email: data.email });
      setMarkMsg(r.already_purchased ? "Era gia' segnato come acquistato." : "Fatto: 67 EUR segnati come pagati.");
      const fresh = await apiGet("/lead", { email: data.email });
      setData(fresh);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setMarkMsg("Errore: " + e.message);
    } finally {
      setMarking(false);
    }
  }

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  const { lead, diagnostics, checkpoints, latest_diagnostic, qualified_for_proposta } = data;

  return (
    <div className="p-10 max-w-4xl">
      <button
        onClick={() => navigate("/admin/leads")}
        className="text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        ← Tutti i leads
      </button>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        {lead?.nome || data.email}
      </h1>
      <p className="text-slate-500 mb-8">{data.email}</p>

      {/* Bridge Partnership */}
      {qualified_for_proposta && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Lead qualificato — Partnership Evolution
          </p>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            Ha completato la call ed è in Stato{" "}
            {latest_diagnostic?.scoring?.stato_finale}. È il momento di generare la
            Proposta Partnership €2.790.
          </p>
          <button
            onClick={() =>
              alert(
                "Handoff Proposta Partnership.\n\n" +
                  "Il flusso /api/proposta/genera/{partner_id} è pronto lato Evolution. " +
                  "Resta da cablare il passaggio diagnostic_session → partner_id " +
                  "(vedi memory: bridge Ciak → Partnership, punto 2). " +
                  "Per ora generare la proposta dall'admin Evolution PRO."
              )
            }
            className="px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition text-sm"
          >
            Genera Proposta Partnership
          </button>
        </div>
      )}

      {/* Anagrafica */}
      <Section title="Anagrafica lead">
        <Field label="Nome" value={lead?.nome} />
        <Field label="Email" value={data.email} />
        <Field label="Source" value={lead?.source} />
        <Field label="Sources viste" value={(lead?.sources_seen || []).join(", ") || "—"} />
        <Field label="UTM source" value={lead?.utm?.utm_source} />
        <Field label="UTM campaign" value={lead?.utm?.utm_campaign} />
        <Field label="Creato" value={lead?.created_at} />
      </Section>

      {/* Checkpoint */}
      <Section title={`Checkpoint Strategico (${checkpoints.length})`}>
        {checkpoints.length === 0 ? (
          <p className="text-slate-400 text-sm">Nessun Checkpoint completato.</p>
        ) : (
          checkpoints.map((c, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-4 mb-3 last:mb-0">
              <p className="text-sm text-slate-800">
                Stato preliminare:{" "}
                <strong>
                  S{c.stato_server} — {STATO_LABEL[c.stato_server]}
                </strong>{" "}
                <span className="text-slate-400">(score {c.total_score}/15)</span>
              </p>
              {c.override_applicati?.length > 0 && (
                <p className="text-xs text-slate-400">
                  Override: {c.override_applicati.join(", ")}
                </p>
              )}
              <p className="text-xs text-slate-400">{c.created_at}</p>
            </div>
          ))
        )}
      </Section>

      {/* Diagnostiche / 8 Domande */}
      <Section title={`8 Domande Ciak (${diagnostics.length})`}>
        {diagnostics.length === 0 ? (
          <p className="text-slate-400 text-sm">Nessuna diagnostica avviata.</p>
        ) : (
          diagnostics.map((d, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-4 mb-5 last:mb-0">
              <Field label="Stato corrente" value={d.current_state} />
              <Field
                label="Stato finale"
                value={
                  d.scoring?.stato_finale
                    ? `S${d.scoring.stato_finale} — ${STATO_LABEL[d.scoring.stato_finale]}`
                    : null
                }
              />
              <Field label="Score numerico" value={d.scoring?.score_numerico} />
              <Field
                label="Override"
                value={(d.scoring?.override_applicati || []).join(", ") || "—"}
              />
              <Field label="Avviata" value={d.created_at} />
              {d.report?.report_markdown && (
                <details className="mt-3">
                  <summary className="text-sm text-yellow-600 cursor-pointer font-medium">
                    Report Matteo
                  </summary>
                  <pre className="mt-2 text-xs text-slate-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 leading-relaxed">
                    {d.report.report_markdown}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </Section>

      {/* Analisi 67 EUR - segna pagamento manuale (ricrea acquisti offline) */}
      <Section title="Analisi 67 EUR">
        {(() => {
          const purchased = PURCHASED_STATES.includes(latest_diagnostic?.current_state);
          return (
            <>
              <Field
                label="Stato acquisto"
                value={purchased ? "Pagato (purchased_67)" : "Non acquistato"}
              />
              {!purchased && (
                <button
                  onClick={markPaid}
                  disabled={marking || diagnostics.length === 0}
                  className="mt-2 px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition text-sm disabled:opacity-50"
                >
                  {marking ? "Registro..." : "Segna 67 EUR come pagato (manuale)"}
                </button>
              )}
              {!purchased && diagnostics.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Il lead deve completare prima le 8 Domande Ciak.
                </p>
              )}
              {markMsg && <p className="text-sm text-slate-700 mt-3">{markMsg}</p>}
            </>
          );
        })()}
      </Section>
    </div>
  );
}
