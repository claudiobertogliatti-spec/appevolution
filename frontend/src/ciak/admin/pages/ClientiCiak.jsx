import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, RefreshCw, Sparkles, Target } from "lucide-react";
import { adminFetch, apiGet, apiPost } from "../api";

const ACCESS_LABELS = {
  cliente_blueprint: "Blueprint",
  cliente_start: "Start",
  partner: "Partner",
};

const OFFER_LABELS = {
  ciak_start: "Ciak Start",
  partnership: "Partnership",
};

const START_STATUS_LABELS = {
  invitato: "Invitato",
  attivo: "Attivo",
  completato: "Completato",
  sospeso: "Sospeso",
};

function formatOffer(value) {
  if (!value) return "Da definire";
  return OFFER_LABELS[value] || value;
}

function formatAccessLevel(value) {
  if (!value) return "Non assegnato";
  return ACCESS_LABELS[value] || value;
}

function formatCurrency(cents) {
  if (typeof cents !== "number" || Number.isNaN(cents) || cents <= 0) return "-";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function inferStartStatus(item) {
  if (item.start_status) return item.start_status;
  if (Array.isArray(item.start_progress) && item.start_progress.length > 0) return "attivo";
  if ((item.access_level || "").toLowerCase() === "cliente_start") return "attivo";
  return null;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ScoreBadge({ value }) {
  const tone =
    typeof value !== "number"
      ? "bg-slate-100 text-slate-500"
      : value >= 70
        ? "bg-emerald-50 text-emerald-700"
        : value >= 45
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {typeof value === "number" ? value : "-"}
    </span>
  );
}

function AccessBadge({ value }) {
  const tone = {
    cliente_blueprint: "bg-slate-100 text-slate-700",
    cliente_start: "bg-blue-50 text-blue-700",
    partner: "bg-emerald-50 text-emerald-700",
  }[value] || "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${tone}`}>
      {formatAccessLevel(value)}
    </span>
  );
}

/**
 * Attivazione manuale di Ciak Start.
 *
 * Serve per chi paga da Payment Link statico: quel pagamento non porta
 * `metadata.tipo`, quindi il webhook non lo riconosce e il cliente resta senza
 * account e senza accesso. Qui basta l'email.
 */
function AttivaStartCard({ onAuthExpired, onAttivato }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [riferimento, setRiferimento] = useState("");
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState(null);
  const [errore, setErrore] = useState(null);

  async function attiva(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setEsito(null);
    setErrore(null);
    try {
      const data = await apiPost("/start/attiva", {
        email: email.trim(),
        name: name.trim() || null,
        riferimento: riferimento.trim() || null,
      });
      setEsito(data);
      if (data.access_sent) {
        setEmail("");
        setName("");
        setRiferimento("");
      }
      onAttivato?.();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore(e.message || "Errore attivazione");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-1 h-5 w-5 shrink-0 text-yellow-500" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Attiva Ciak Start</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            Per chi ha pagato i 499€ da Payment Link e non passa dal checkout interno. Crea l'account se
            manca, registra l'incasso e manda subito il link di accesso.
          </p>
        </div>
      </div>

      <form onSubmit={attiva} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium text-slate-700">Email del cliente</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-700">Nome e cognome <span className="text-slate-400">(se non è già a sistema)</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Restifo"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="font-medium text-slate-700">Riferimento Stripe <span className="text-slate-400">(consigliato)</span></span>
          <input
            type="text"
            value={riferimento}
            onChange={(e) => setRiferimento(e.target.value)}
            placeholder="pi_3ABC... — evita di registrare due volte lo stesso incasso"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Attivo e mando l'accesso..." : "Attiva e manda l'accesso"}
          </button>
        </div>
      </form>

      {errore ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errore}</p>
      ) : null}

      {esito ? (
        esito.access_sent ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ciak Start attivo{esito.created ? " — account creato ora" : ""}
              {esito.already_active ? " (era già attivo: ho rimandato solo l'accesso)" : ""}.
              Email con il link di accesso partita.
            </span>
          </p>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Entitlement scritto, ma <strong>l'email non è partita</strong>: il cliente non ha ancora il link.
              La consegna resta aperta in <em>Consegne mancate</em>, da lì si ritenta.
            </span>
          </p>
        )
      ) : null}
    </section>
  );
}

export function ClientiCiak({ onAuthExpired }) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadItems = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet("/clienti-ciak");
      setItems(Array.isArray(data.items) ? data.items : []);
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message || "Errore di caricamento");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onAuthExpired]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const decideOffer = useCallback(async (clientId, offer) => {
    if (!clientId || decisionLoading) return;
    setDecisionLoading(`${clientId}:${offer}`);
    setError(null);
    setNotice(null);
    try {
      const res = await adminFetch("/api/ciak/client/admin/offer-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, offer_decision: offer }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Errore ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
      }
      setItems((prev) => prev.map((item) => (
        item.id === clientId ? { ...item, offer_decision: offer, offer_decided_at: new Date().toISOString() } : item
      )));
      setNotice(`Offerta aggiornata: ${formatOffer(offer)}.`);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message || "Errore aggiornamento offerta");
    } finally {
      setDecisionLoading(null);
    }
  }, [decisionLoading, onAuthExpired]);

  const rows = useMemo(
    () =>
      items.map((item, index) => {
        const score = typeof item.blueprint_score === "number" ? item.blueprint_score : null;
        const recommendation = item.offer_decision || item.recommended_offer;
        const startStatus = inferStartStatus(item);
        const updatedAt = formatDate(item.updated_at);
        return {
          key: item.id || item.email || `clienti-ciak-${index}`,
          id: item.id,
          name: item.name || [item.nome, item.cognome].filter(Boolean).join(" ") || "Senza nome",
          email: item.email || "-",
          score,
          accessLevel: item.access_level,
          recommendation,
          recommendedOffer: item.recommended_offer,
          offerDecision: item.offer_decision,
          startCredit: formatCurrency(item.start_credit_amount),
          startStatus: startStatus ? START_STATUS_LABELS[startStatus] || startStatus : null,
          analysisStatus: item.analysis_status || null,
          updatedAt,
        };
      }),
    [items]
  );

  return (
    <div className="p-8 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Vendite</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Clienti Ciak</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Blueprint, Start e passaggi verso Partnership. Vista rapida per leggere stato, punteggio e prossima offerta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Clienti</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{count}</div>
          </div>
          <button
            type="button"
            onClick={() => loadItems({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Errore caricamento: {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      ) : null}

      <AttivaStartCard onAuthExpired={onAuthExpired} onAttivato={() => loadItems({ silent: true })} />

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Cliente</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Punteggio</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Accesso</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Offerta</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Start</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Aggiornato</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Decisione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 w-36 rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-44 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-4"><div className="h-8 w-12 rounded bg-slate-100" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-24 rounded bg-slate-100" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-slate-100" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-32 rounded bg-slate-100" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-40 rounded bg-slate-100" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nessun cliente Ciak disponibile.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.key} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{row.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{row.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <ScoreBadge value={row.score} />
                    </td>
                    <td className="px-4 py-4">
                      <AccessBadge value={row.accessLevel} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-800">{formatOffer(row.recommendation)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.offerDecision
                          ? "Decisione Claudio/Luca"
                          : row.recommendedOffer
                            ? "Suggerita dal Blueprint"
                            : "Da decidere"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {row.analysisStatus ? `Analisi: ${row.analysisStatus}` : "Analisi: -"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div>{row.startCredit === "-" ? "Credito: -" : `Credito: ${row.startCredit}`}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.startStatus ? `Stato: ${row.startStatus}` : "Stato: -"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{row.updatedAt || "-"}</td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[12rem] flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => decideOffer(row.id, "ciak_start")}
                          disabled={!row.id || row.accessLevel === "partner" || decisionLoading !== null}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                            row.offerDecision === "ciak_start"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {decisionLoading === `${row.id}:ciak_start` ? "Salvo..." : "Start"}
                        </button>
                        <button
                          type="button"
                          onClick={() => decideOffer(row.id, "partnership")}
                          disabled={!row.id || row.accessLevel === "partner" || decisionLoading !== null}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                            row.offerDecision === "partnership"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                          }`}
                        >
                          <Target className="h-3.5 w-3.5" />
                          {decisionLoading === `${row.id}:partnership` ? "Salvo..." : "Partnership"}
                        </button>
                      </div>
                      {row.accessLevel === "partner" ? (
                        <p className="mt-2 text-xs text-slate-400">Gia' partner.</p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">Abilita il checkout corretto in area cliente.</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
