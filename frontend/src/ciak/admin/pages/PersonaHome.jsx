/**
 * Ciak Admin — Home della collaboratrice (sezione dedicata).
 *
 * Per ogni collaboratrice una vista con la SUA coda personale, filtrata sul campo
 * reale `owner` delle code esistenti (nessun dato inventato). Secondo l'architettura
 * concordata: Mariangela = identità unica con viste Acquisizione + Vendite; Antonella
 * = Delivery. Si mostra solo il nome (niente qualifica). NESSUN dato economico qui:
 * compensi/provvigioni restano al Back office con le sue regole.
 *
 * Non crea permessi né login: è una vista dentro l'admin.
 */
import { Link, useNavigate, useParams } from "react-router-dom";
import { AcquisizioneQueue } from "../components/AcquisizioneQueue";
import { VenditeQueue, DeliveryQueue } from "../components/DepartmentQueue";

const PERSONE = {
  mariangela: {
    nome: "Mariangela",
    area: "Acquisizione e Vendite",
    intro: "Un'unica coda personale, con le tue viste di Acquisizione e Vendite.",
    reparti: [
      { label: "Acquisizione", to: "/admin/reparto/acquisizione" },
      { label: "Vendite", to: "/admin/reparto/vendite" },
    ],
    sezioni: ["acquisizione", "vendite"],
  },
  antonella: {
    nome: "Antonella",
    area: "Delivery",
    intro: "La tua coda personale nel Delivery: i partner che segui tu.",
    reparti: [{ label: "Delivery", to: "/admin/reparto/delivery" }],
    sezioni: ["delivery"],
  },
};

function Eyebrow({ children }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mt-8 mb-3">{children}</h2>;
}

export function PersonaHome({ onAuthExpired }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const p = PERSONE[slug];

  if (!p) {
    return (
      <div className="p-10 max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Collaboratrice non trovata</h1>
        <Link to="/admin" className="text-sm font-semibold text-slate-900">← Torna alla Regia</Link>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-2 bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-3xl font-semibold text-slate-900">{p.nome}</h1>
        <p className="text-sm text-slate-500 mt-2">{p.area}</p>
        <p className="text-slate-500 mt-2">{p.intro}</p>
        <div className="flex flex-wrap gap-2.5 mt-4">
          {p.reparti.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
            >
              Apri {r.label} <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </div>

      {p.sezioni.includes("acquisizione") && (
        <>
          <Eyebrow>Acquisizione — la tua coda</Eyebrow>
          <AcquisizioneQueue onAuthExpired={onAuthExpired} ownerFilter={p.nome} />
        </>
      )}
      {p.sezioni.includes("vendite") && (
        <>
          <Eyebrow>Vendite — la tua coda</Eyebrow>
          <VenditeQueue ownerFilter={p.nome} onOpenPartner={(row) => row.email && navigate(`/admin/leads/${encodeURIComponent(row.email)}`)} />
        </>
      )}
      {p.sezioni.includes("delivery") && (
        <>
          <Eyebrow>Delivery — la tua coda</Eyebrow>
          <DeliveryQueue ownerFilter={p.nome} onOpenPartner={(row) => navigate(`/admin/partner?partner=${row.id}&tab=panoramica`)} />
        </>
      )}
    </div>
  );
}

export default PersonaHome;
