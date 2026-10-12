/**
 * Finestra «Modifica lead»: nome, cognome, email, telefono. Usata dalla pagina Lead e dalla scheda del lead.
 * PATCH /api/admin/ciak/lead: le regole (email non cambiabile se ha account o proposta) sono del server,
 * che risponde con un motivo leggibile. `onSalvato(nuovaEmail|null)`: la scheda la usa per seguire il lead
 * al nuovo indirizzo.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminFetch, errorDetail } from "../api";

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const BTN = "rounded-lg border border-slate-900 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";
export const BTN_ORO = "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900";

export function Finestra({ titolo, sottotitolo, children, onChiudi, id }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onChiudi(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onChiudi]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onChiudi}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
      >
        <h2 id={id} className="text-xl font-semibold text-slate-900">{titolo}</h2>
        {sottotitolo && <p className="mb-5 mt-1 text-sm text-slate-500">{sottotitolo}</p>}
        {children}
      </div>
    </div>
  );
}

export function Campo({ id, label, nota, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-900">{label}</label>
      <input id={id} {...props} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400" />
      {nota && <p className="mt-1 text-xs text-slate-500">{nota}</p>}
    </div>
  );
}

export function ModificaLead({ riga, onChiudi, onSalvato, onAuthExpired }) {
  // Il nome oggi e' salvato per intero: se il cognome non c'e' ancora, il campo Nome
  // porta il nome intero e il cognome resta da separare a mano (non si indovina).
  const [nome, setNome] = useState(riga.nome_proprio ?? riga.nome ?? "");
  const [cognome, setCognome] = useState(riga.cognome ?? "");
  const [email, setEmail] = useState(riga.email || "");
  const [telefono, setTelefono] = useState(riga.telefono || "");
  const [errore, setErrore] = useState(null);
  const [busy, setBusy] = useState(false);

  const salva = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return setErrore("Il nome non può essere vuoto.");
    if (!EMAIL_RE.test(email.trim())) return setErrore("L'email non è valida.");
    setBusy(true);
    setErrore(null);
    try {
      const body = { email: riga.email, nome: nome.trim(), cognome: cognome.trim(), phone: telefono.trim() };
      if (email.trim().toLowerCase() !== (riga.email || "").toLowerCase()) body.nuova_email = email.trim();
      const res = await adminFetch("/api/admin/ciak/lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setErrore(await errorDetail(res)); return; }
      toast.success("Lead aggiornato.");
      onSalvato(body.nuova_email || null);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore("Non sono riuscito a salvare. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Finestra id="modifica-lead-t" titolo="Modifica lead" sottotitolo={riga.email} onChiudi={onChiudi}>
      <form onSubmit={salva} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Campo id="ml-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" />
          <Campo id="ml-cognome" label="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} autoComplete="family-name"
            nota={riga.cognome ? undefined : "Oggi il nome è salvato per intero: separa qui il cognome."} />
          <div className="col-span-2">
            <Campo id="ml-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
              nota="Cambiandola si aggiorna anche il questionario e la cronologia del lead." />
          </div>
          <div className="col-span-2">
            <Campo id="ml-tel" label="Telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" placeholder="+39 ..." />
          </div>
        </div>
        {errore && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={BTN} onClick={onChiudi}>Annulla</button>
          <button type="submit" disabled={busy} className={BTN_ORO}>{busy ? "Salvo…" : "Salva le modifiche"}</button>
        </div>
      </form>
    </Finestra>
  );
}
