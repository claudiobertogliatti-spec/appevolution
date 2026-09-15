/**
 * Ciak Admin — Consegna manuale del Blueprint.
 *
 * Per i clienti che NON passano dal funnel 8 domande (es. ProVideo outbound, con
 * un PDF già preparato a mano): carica email + nome + PDF e invia. Il backend crea
 * l'account cliente + call_done (sblocca Ciak Start / Partnership), genera il
 * magic-link e invia l'email col PDF allegato + link alla sales page.
 * Nessuna analisi Carlo: parte il PDF fornito.
 *
 * POST multipart /api/ciak/client/admin/consegna-manuale (email, nome, file).
 */
import { useState } from "react";
import { adminFetch } from "../api";

export function ConsegnaManuale({ onAuthExpired }) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!email.trim() || !file) {
      setError("Email cliente e PDF sono obbligatori.");
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setError("Il file dev'essere un PDF.");
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("email", email.trim());
      fd.append("nome", nome.trim());
      fd.append("file", file);
      const res = await adminFetch("/api/ciak/client/admin/consegna-manuale", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data = await res.json();
      setResult(data);
      if (!data.email_sent) {
        setError(
          "Account creato, ma l'email non è partita: " +
            (data.email_error || "errore SMTP")
        );
      }
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired();
      else setError("Errore: " + err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-10 max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Consegna manuale del Blueprint</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        Per i clienti che <strong>non passano dal funnel</strong> (es. lead ProVideo, con il PDF già
        pronto). Carica il PDF: parte l'email col Blueprint + il link d'accesso, e si sbloccano
        Ciak Start e Partnership sulla sua sales page. Non viene generata alcuna analisi automatica.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email cliente</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome e cognome"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">PDF Blueprint</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          />
          {file && <p className="mt-1 text-xs text-slate-400">{file.name}</p>}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition text-sm disabled:opacity-50"
        >
          {sending ? "Invio in corso…" : "Invia il Blueprint"}
        </button>
      </form>

      {error && (
        <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      )}

      {result?.success && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">
            ✓ Consegnato a {result.email}. Email col PDF inviata.
          </p>
          {result.magic_link && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-xs text-slate-400 mb-1">Link d'accesso cliente (è già nella sua email)</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-xs text-slate-700 break-all">{result.magic_link}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(result.magic_link)}
                  className="text-sm font-semibold text-yellow-600 shrink-0"
                >
                  Copia
                </button>
              </div>
              <p className="mt-2 text-xs text-rose-600">
                ⚠️ Non aprire questo link: è monouso e serve al cliente. Aprendolo lo consumeresti.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
