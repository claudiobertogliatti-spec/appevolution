/**
 * repartoMetrics.js — collega i KPI delle pagine-reparto ai dati reali.
 *
 * Ogni reparto ha una strip di KPI (label definite in departmentRooms.js).
 * Qui, per reparto, si dichiarano gli endpoint da leggere e si mappa ogni
 * label sul campo/calcolo reale. Le label senza fonte-dati ancora pronta
 * restituiscono "Da attivare" (onesto: non un numero finto).
 *
 * Collegati: Acquisizione, Vendite, Delivery, Back office (dato reale dagli
 * endpoint admin esistenti). Casi studio: nessuna fonte dati ancora → tutte
 * "Da attivare" (serve una collezione dedicata, da valutare).
 */
import { useEffect, useState } from "react";
import { adminFetch } from "./api";

const ATTIVARE = "Da attivare";

// Endpoint necessari per reparto: { key usata nel calcolo, path completo }.
const REPARTO_ENDPOINTS = {
  acquisizione: [
    { key: "mc", path: "/api/admin/ciak/masterclass-analytics" },
    { key: "cc", path: "/api/admin/ciak/acquisizione-command-center" },
    { key: "inv", path: "/api/admin/ciak/invoices/sources" },
  ],
  vendite: [
    { key: "cc", path: "/api/admin/ciak/acquisizione-command-center" },
    { key: "inv", path: "/api/admin/ciak/invoices/sources" },
  ],
  delivery: [
    { key: "da", path: "/api/admin/ciak/delivery-audit" },
    { key: "partners", path: "/api/admin/ciak/partners" },
  ],
  "back-office": [
    { key: "inv", path: "/api/admin/ciak/invoices/sources" },
    { key: "partners", path: "/api/admin/ciak/partners" },
    { key: "se", path: "/api/servizi-extra/admin/stats" },
  ],
};

async function getJSON(path) {
  try {
    const r = await adminFetch(path);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ── Helper di calcolo ──────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("it-IT");
}

// Somma i valori degli ultimi 7 giorni da un dict {YYYY-MM-DD: n}.
function last7Sum(trend) {
  if (!trend || typeof trend !== "object") return null;
  const keys = Object.keys(trend).sort();
  if (!keys.length) return null;
  return keys.slice(-7).reduce((s, k) => s + (Number(trend[k]) || 0), 0);
}

// Lead qualificati = completano le 8 Domande con stato 3 o 4.
function stato34(perStato) {
  if (!perStato) return null;
  return (Number(perStato["3"]) || 0) + (Number(perStato["4"]) || 0);
}

// Sorgente con più opt-in da un dict {source: n}.
function bestSource(sources) {
  if (!sources || typeof sources !== "object") return null;
  const entries = Object.entries(sources);
  if (!entries.length) return null;
  entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
  return entries[0][0];
}

// Conteggio vendite per fonte da /invoices/sources.
function countByFonte(inv, fonte) {
  if (!inv || !Array.isArray(inv.items)) return null;
  return inv.items.filter((s) => s.fonte === fonte).length;
}

function activePartners(partners) {
  const items = partners?.items || [];
  return items.filter((p) => (p.stato || "attivo") === "attivo");
}

// Fase più popolata tra i partner attivi → "F5 (3)".
function topPhase(partners) {
  const active = activePartners(partners).filter((p) => p.phase);
  if (!active.length) return "—";
  const counts = {};
  active.forEach((p) => {
    counts[p.phase] = (counts[p.phase] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return `${top[0]} (${top[1]})`;
}

// ── Mappatura label → valore ────────────────────────────────────────────────
function computeMetrics(deptId, d) {
  const mc = d.mc || {};
  const cc = d.cc || {};
  const f = cc.funnel || {};
  const t = cc.target || {};
  const inv = d.inv || null;
  const da = d.da || {};
  const counters = da.counters || {};
  const partners = d.partners || null;
  const se = d.se || {};

  const ciakStart = inv ? fmtNum(countByFonte(inv, "ciak_start")) : "—";

  switch (deptId) {
    case "acquisizione":
      return {
        "Nuovi lead 7 giorni": fmtNum(last7Sum(mc.trend_optin_30d)),
        "Lead qualificati": fmtNum(stato34(mc.diagnostic_per_stato)),
        "Masterclass avviate": fmtNum(mc.funnel?.checkpoint_done),
        "8 Domande completate": fmtNum(mc.funnel?.diagnostic_completed),
        "Ciak Start €499": ciakStart,
        "Blueprint acquistati": fmtNum(f.blueprint_purchased),
        "Fonte migliore": bestSource(mc.sources) || "—",
      };

    case "vendite":
      return {
        "Blueprint acquistati": fmtNum(f.blueprint_purchased),
        "Call prenotate": fmtNum(f.call_booked),
        "Call fatte": fmtNum(f.call_done),
        "Proposte inviate": fmtNum(f.proposals_open),
        "Ciak Start €499": ciakStart,
        "Partnership chiuse": fmtNum(t.partnerships_closed),
        "Valore trattative": ATTIVARE,
      };

    case "delivery":
      return {
        "Partner attivi": fmtNum(activePartners(partners).length),
        "Partner per fase": topPhase(partners),
        "Fermi oltre soglia": fmtNum(counters.fermi),
        "Output da approvare": fmtNum(counters.serve_claudio),
        "Materiali mancanti": fmtNum(
          (da.items || []).filter((i) => (i.asset_mancanti?.length || 0) > 0).length
        ),
        "Prossimi live": ATTIVARE,
      };

    case "back-office":
      return {
        "Incassi mese": ATTIVARE,
        "Fatture da emettere": fmtNum(inv?.da_fatturare),
        "Contratti firmati": fmtNum(
          (partners?.items || []).filter((p) => p.contract_signed === true).length
        ),
        "Documenti mancanti": ATTIVARE,
        "Pagamenti critici": fmtNum(
          (partners?.items || []).filter(
            (p) => p.stato === "quarantena" && p.quarantena_tipo === "morosita"
          ).length
        ),
        "Servizi extra": fmtNum(se.servizi_attivi?.totale),
      };

    case "casi-studio":
      return {
        "Risultati documentabili": ATTIVARE,
        "Casi pronti": ATTIVARE,
        "Casi promettenti": ATTIVARE,
        "Asset mancanti": ATTIVARE,
        "Testimonianze": ATTIVARE,
        "Prima/dopo": ATTIVARE,
      };

    default:
      return {};
  }
}

/**
 * Hook: restituisce { [label]: valore } per il reparto dato.
 */
export function useRepartoMetrics(deptId) {
  const [values, setValues] = useState({});

  useEffect(() => {
    let alive = true;
    const endpoints = REPARTO_ENDPOINTS[deptId];
    // Reparti senza endpoint (es. casi-studio) → calcolo statico "Da attivare".
    if (!endpoints) {
      setValues(computeMetrics(deptId, {}));
      return undefined;
    }
    (async () => {
      const results = await Promise.all(endpoints.map((e) => getJSON(e.path)));
      const data = {};
      endpoints.forEach((e, i) => {
        data[e.key] = results[i];
      });
      if (alive) setValues(computeMetrics(deptId, data));
    })();
    return () => {
      alive = false;
    };
  }, [deptId]);

  return values;
}
