/**
 * PageHeader — l'intestazione di pagina, una sola.
 *
 * Perche' esiste: le pagine admin costruivano la propria intestazione a mano
 * (un <h1> ciascuna, con spaziature diverse). Questa promuove l'unico
 * PageHeader gia' scritto (era in AdminOperationalHubs, usato da un file solo)
 * a componente condiviso.
 *
 * Eyebrow slate di default (decisione di Claudio, 3/9): sul back office il
 * giallo e' gia' speso sulla cifra-obiettivo dei KPI e sulla voce attiva della
 * sidebar; un'eyebrow gialla in cima a ogni pagina diluisce l'accento. Dove
 * serve un titolo di reparto "caldo" si passa `eyebrowTone="brand"`.
 */
export function PageHeader({ eyebrow, title, subtitle, icon: Icon, action, eyebrowTone = "slate" }) {
  const eyebrowCls = eyebrowTone === "brand" ? "text-yellow-600" : "text-slate-500";
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-2 ${eyebrowCls}`}>
            {Icon && <Icon className="w-4 h-4" aria-hidden />}
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export default PageHeader;
