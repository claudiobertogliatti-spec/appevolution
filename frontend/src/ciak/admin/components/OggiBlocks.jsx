/**
 * Home "Oggi" — i quattro blocchi che rispondono alle domande di ogni mattina:
 * quali call devo fare · quali trattative sono in corso · come procedono i partner
 * in EVO · quali sono le urgenze di delivery.
 *
 * Sono LISTE di persone con i giorni di attesa, non conteggi per reparto. Ogni riga
 * apre il contatto. Le fonti sono quelle delle pagine esistenti (Trattative e Audit
 * Delivery); le regole (soglie, esclusione degli account di prova, doppioni) stanno
 * in `oggiModel.js` e sono provate li'.
 *
 * Stati onesti: caricamento, dato non disponibile (con "Riprova"), vuoto, valori
 * reali. Una fonte che non risponde non diventa uno "0".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { apiGet } from "../api";
import { buildOggi } from "../oggiModel";
import { StatusPill } from "./ui/StatusPill";

const RIGHE = 6; // righe mostrate per lista; il resto sta nella pagina completa

const attesa = (g) => (g == null ? "—" : g === 0 ? "oggi" : g === 1 ? "da 1 giorno" : `da ${g} giorni`);
// Se i giorni non si conoscono si scrive solo la parola ("Fermo"), mai "Fermo —".
const conAttesa = (prefisso, g) => (g == null ? prefisso.replace(/ ·$/, "") : `${prefisso} ${attesa(g)}`);

const fmtQuando = (iso) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(iso));

const leadHref = (email) => `/admin/leads/${encodeURIComponent(email)}`;

// ── Dati ────────────────────────────────────────────────────────────────────

export function useOggiData(onAuthExpired) {
  // undefined = in caricamento · null = non disponibile · oggetto = dati veri
  const [src, setSrc] = useState({ pipeline: undefined, audit: undefined, at: null });

  const load = useCallback(async () => {
    setSrc((s) => ({ ...s, pipeline: undefined, audit: undefined }));
    const [p, a] = await Promise.allSettled([apiGet("/pipeline-blueprint"), apiGet("/delivery-audit")]);
    if ([p, a].some((r) => r.status === "rejected" && r.reason?.message === "AUTH_EXPIRED")) {
      onAuthExpired?.();
    }
    setSrc({
      pipeline: p.status === "fulfilled" ? p.value : null,
      audit: a.status === "fulfilled" ? a.value : null,
      at: new Date(),
    });
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  const model = useMemo(
    () => buildOggi({ pipeline: src.pipeline || null, audit: src.audit || null, now: src.at || new Date() }),
    [src]
  );
  return { src, model, reload: load };
}

// ── Pezzi di interfaccia ────────────────────────────────────────────────────

function Stat({ href, label, value, sub }) {
  return (
    <a
      href={href}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
    >
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="block text-3xl font-semibold text-slate-900 tabular-nums leading-tight mt-1">{value ?? "…"}</span>
      {sub && <span className="block text-xs text-slate-500 mt-0.5">{sub}</span>}
    </a>
  );
}

function Block({ id, title, hint, state, onRetry, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-6">
      <h2 id={`${id}-t`} className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint && <p className="text-sm text-slate-500 mt-0.5">{hint}</p>}
      <div className="mt-4">
        {state === "loading" ? (
          <p className="text-sm text-slate-400" aria-busy="true">Caricamento…</p>
        ) : state === "error" ? (
          <p className="text-sm text-slate-600">
            Dato non disponibile.{" "}
            <button type="button" onClick={onRetry} className="font-semibold text-slate-900 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
              Riprova
            </button>
          </p>
        ) : children}
      </div>
    </section>
  );
}

function Sub({ title, count, children, empty, more }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
        {title}{count != null ? ` · ${count}` : ""}
      </h3>
      {count === 0 ? <p className="text-sm text-slate-500">{empty}</p> : <ul className="divide-y divide-slate-100">{children}</ul>}
      {more}
    </div>
  );
}

function Riga({ to, nome, meta, pill }) {
  const name = <span className="font-semibold text-slate-900 truncate">{nome}</span>;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        {to ? <Link to={to} className="hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">{name}</Link> : name}
        {meta && <p className="text-xs text-slate-500 truncate">{meta}</p>}
      </div>
      {pill}
    </li>
  );
}

const Tutte = ({ to, n, mostrate }) =>
  n > mostrate ? (
    <Link to={to} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
      Vedi tutte ({n}) <ArrowRight className="w-4 h-4" aria-hidden />
    </Link>
  ) : null;

// ── I quattro blocchi ───────────────────────────────────────────────────────

export function OggiBlocks({ onAuthExpired }) {
  const { src, model, reload } = useOggiData(onAuthExpired);
  const { call, trattative, partner } = model;
  const stPipe = src.pipeline === undefined ? "loading" : src.pipeline === null ? "error" : "ok";
  const stAudit = src.audit === undefined ? "loading" : src.audit === null ? "error" : "ok";
  const callN = call ? call.prenotate.length + call.fatte.length : null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Oggi</p>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 rounded"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden />
          {src.at ? `Aggiornato alle ${new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(src.at)}` : "Aggiorna"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" aria-label="Riepilogo di oggi">
        <Stat href="#call" label="Call da gestire" value={callN}
          sub={call ? `${call.prenotate.length} prenotate · ${call.fatte.length} fatte` : null} />
        <Stat href="#trattative" label="Trattative in corso" value={trattative ? trattative.length : null} />
        <Stat href="#partner" label="Partner in EVO" value={partner ? partner.totale : null}
          sub={partner ? `${partner.fermi} fermi` : null} />
        <Stat href="#delivery" label="Tocca a te" value={partner ? partner.tocca.length : null}
          sub={partner ? `su ${partner.totale} partner` : null} />
      </div>

      <div className="grid grid-cols-1 gap-5">
        <Block id="call" title="Call" hint="Da fare e da chiudere" state={stPipe} onRetry={reload}>
          {call && (
            <>
              <Sub title="Prenotate" count={call.prenotate.length} empty="Nessuna call prenotata.">
                {call.prenotate.slice(0, RIGHE).map((c) => (
                  <Riga key={c.email} to={leadHref(c.email)} nome={c.nome}
                    meta={c.quando ? [fmtQuando(c.quando), c.passata ? "aggiorna lo stato" : null].filter(Boolean).join(" · ") : null}
                    pill={<StatusPill tone={c.tone} label={c.passata ? "Data passata" : c.quando ? "In agenda" : conAttesa("Senza data ·", c.giorni)} />} />
                ))}
              </Sub>
              <Sub title="Fatte, in attesa del passo successivo" count={call.fatte.length} empty="Nessuna call da seguire."
                more={<Tutte to="/admin/trattative?stadio=call" n={call.fatte.length} mostrate={RIGHE} />}>
                {call.fatte.slice(0, RIGHE).map((c) => (
                  <Riga key={c.email} to={leadHref(c.email)} nome={c.nome}
                    pill={<StatusPill tone={c.tone} label={conAttesa("Ferma", c.giorni)} />} />
                ))}
              </Sub>
            </>
          )}
        </Block>

        <Block id="trattative" title="Trattative in corso" hint="Proposte inviate, viste o accettate" state={stPipe} onRetry={reload}>
          {trattative && (
            <Sub title="Aperte" count={trattative.length} empty="Nessuna trattativa aperta."
              more={<Tutte to="/admin/trattative?stadio=trattativa" n={trattative.length} mostrate={RIGHE} />}>
              {trattative.slice(0, RIGHE).map((t) => (
                <Riga key={t.email} to={leadHref(t.email)} nome={t.nome}
                  pill={<StatusPill tone={t.tone} label={conAttesa("In corso", t.giorni)} />} />
              ))}
            </Sub>
          )}
        </Block>

        <Block id="partner" title="Come procedono i partner in EVO" hint="Quanti per fase, e quanti sono fermi" state={stAudit} onRetry={reload}>
          {partner && (
            partner.perFase.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun partner attivo.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {partner.perFase.map((f) => (
                  <li key={f.fase} className="rounded-xl border border-slate-200 px-3 py-2">
                    <span className="block text-xs font-semibold text-slate-500">{f.fase}</span>
                    <span className="text-xl font-semibold text-slate-900 tabular-nums">{f.totale}</span>
                    {f.fermi > 0 && <span className="ml-2 text-xs font-semibold text-amber-800">{f.fermi} fermi</span>}
                  </li>
                ))}
              </ul>
            )
          )}
        </Block>

        <Block id="delivery" title="Urgenze di delivery" hint="Prima chi aspetta te, poi chi aspetta il partner" state={stAudit} onRetry={reload}>
          {partner && (
            <>
              {[
                ["Tocca a te", partner.tocca, "Niente in attesa di te."],
                ["Aspettiamo il partner", partner.aspettiamo, "Nessun partner da sollecitare."],
              ].map(([title, list, empty]) => (
                <Sub key={title} title={title} count={list.length} empty={empty}
                  more={<Tutte to="/admin/delivery-audit" n={list.length} mostrate={RIGHE} />}>
                  {list.slice(0, RIGHE).map((p) => (
                    <Riga key={p.id} to="/admin/delivery-audit" nome={p.nome}
                      meta={[p.fase, p.azione].filter(Boolean).join(" · ")}
                      pill={<StatusPill
                        tone={p.bloccato ? "critical" : p.fermo ? "warning" : "good"}
                        label={p.bloccato ? "Bloccato" : p.fermo ? conAttesa("Fermo", p.giorni) : "In moto"} />} />
                  ))}
                </Sub>
              ))}
            </>
          )}
        </Block>
      </div>

      {(model.esclusi.length > 0 || model.doppi > 0) && (
        <p className="text-xs text-slate-500 mt-4">
          Non contati:
          {model.esclusi.length > 0 && ` ${model.esclusi.length} account di prova (${model.esclusi.join(", ")}).`}
          {model.doppi > 0 && ` ${model.doppi} ${model.doppi === 1 ? "contatto è" : "contatti sono"} già partner e non ${model.doppi === 1 ? "è contato" : "sono contati"} tra le call.`}
        </p>
      )}
    </div>
  );
}

export default OggiBlocks;
