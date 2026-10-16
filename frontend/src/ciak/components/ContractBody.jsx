/**
 * ContractBody — rende il testo piatto del contratto (render_contract_text) in modo
 * LEGGIBILE e strutturato: titolo, articoli, sotto-articoli, elenchi puntati,
 * spaziatura. Un contratto illeggibile o poco chiaro è un rischio di trasparenza
 * (Codice del Consumo; clausole vessatorie artt. 1341-1342 c.c.): la chiarezza qui
 * è sostanza legale, non estetica. Condiviso dal flusso Proposta (Partnership) e
 * dall'Insider (ContractAccept).
 *
 * Il testo arriva piatto (poche righe vuote): la struttura si ricava dai pattern
 * "ARTICOLO N", "n.n Titolo", elenchi (•/▸/-/–), TRA/e, e il resto è paragrafo.
 */
function parseBlocks(text) {
  const out = [];
  let bullets = [];
  const flush = () => {
    if (bullets.length) { out.push({ t: "ul", items: bullets }); bullets = []; }
  };
  (text || "").split("\n").forEach((raw, i) => {
    const s = raw.trim();
    if (!s) { flush(); return; }
    if (/^[•▸\-–]\s+/.test(s)) { bullets.push(s.replace(/^[•▸\-–]\s+/, "")); return; }
    flush();
    if (i === 0) out.push({ t: "title", s });
    else if (/^ARTICOLO\s/i.test(s)) out.push({ t: "art", s });
    else if (s === "TRA" || s === "e") out.push({ t: "tra", s });
    else if (/^\d+\.\d+(\.\d+)?[\s)]/.test(s)) out.push({ t: "sub", s });
    else out.push({ t: "p", s });
  });
  flush();
  return out;
}

export function ContractBody({ text, className = "" }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`text-[13.5px] leading-[1.75] text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.t === "title") {
          return <h1 key={i} className="text-lg md:text-xl font-bold text-slate-900 leading-snug mb-5">{b.s}</h1>;
        }
        if (b.t === "tra") {
          return <p key={i} className="text-center text-[12px] font-bold uppercase tracking-widest text-slate-400 my-4">{b.s}</p>;
        }
        if (b.t === "art") {
          return <h2 key={i} className="text-[14px] font-bold text-slate-900 uppercase tracking-wide mt-8 pt-4 border-t border-slate-200">{b.s}</h2>;
        }
        if (b.t === "sub") {
          return <h3 key={i} className="text-[13.5px] font-semibold text-slate-900 mt-5 mb-0.5">{b.s}</h3>;
        }
        if (b.t === "ul") {
          return (
            <ul key={i} className="mt-2 pl-5 list-disc space-y-1.5 text-slate-600 marker:text-yellow-500">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
        }
        return <p key={i} className="mt-2.5">{b.s}</p>;
      })}
    </div>
  );
}

export default ContractBody;
