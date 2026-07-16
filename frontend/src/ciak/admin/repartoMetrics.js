/**
 * repartoMetrics.js — collega i KPI delle pagine-reparto ai dati reali.
 *
 * Ogni reparto ha una strip di KPI (label definite in departmentRooms.js).
 * Qui, per reparto, si dichiarano gli endpoint da leggere e si mappa ogni
 * label sul campo/calcolo reale. Le label senza fonte-dati ancora pronta
 * restituiscono "Da attivare" (onesto: non un numero finto).
 *
 * Primo blocco collegato: Acquisizione + Vendite (dato reale da
 * /masterclass-analytics e /acquisizione-command-center, shape note).
 * Delivery / Back office / Casi studio: da collegare in un secondo passaggio.
 */
import { useEffect, useState } from "react";
import { adminFetch } from "./api";

const ATTIVARE = "Da attivare";

// Endpoint necessari per reparto (path relativi a /api/admin/ciak/).
const REPARTO_ENDPOINTS = {
  acquisizione: ["masterclass-analytics", "acquisizione-command-center"],
  vendite: ["acquisizione-command-center"],
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

// ── Mappatura label → valore ────────────────────────────────────────────────
function computeMetrics(deptId, data) {
  const mc = data["masterclass-analytics"] || {};
  const cc = data["acquisizione-command-center"] || {};
  const f = cc.funnel || {};
  const t = cc.target || {};

  if (deptId === "acquisizione") {
    return {
      "Nuovi lead 7 giorni": fmtNum(last7Sum(mc.trend_optin_30d)),
      "Lead qualificati": fmtNum(stato34(mc.diagnostic_per_stato)),
      "Masterclass avviate": fmtNum(mc.funnel?.checkpoint_done),
      "8 Domande completate": fmtNum(mc.funnel?.diagnostic_completed),
      "Ciak Start €499": ATTIVARE,
      "Blueprint acquistati": fmtNum(f.blueprint_purchased),
      "Fonte migliore": bestSource(mc.sources) || "—",
    };
  }

  if (deptId === "vendite") {
    return {
      "Blueprint acquistati": fmtNum(f.blueprint_purchased),
      "Call prenotate": fmtNum(f.call_booked),
      "Call fatte": fmtNum(f.call_done),
      "Proposte inviate": fmtNum(f.proposals_open),
      "Ciak Start €499": ATTIVARE,
      "Partnership chiuse": fmtNum(t.partnerships_closed),
      "Valore trattative": ATTIVARE,
    };
  }

  return {};
}

/**
 * Hook: restituisce { [label]: valore } per il reparto dato.
 * Reparti non ancora collegati → {} (la strip mostra "Da collegare").
 */
export function useRepartoMetrics(deptId) {
  const [values, setValues] = useState({});

  useEffect(() => {
    let alive = true;
    const paths = REPARTO_ENDPOINTS[deptId];
    if (!paths) {
      setValues({});
      return undefined;
    }
    (async () => {
      const results = await Promise.all(
        paths.map((p) => getJSON(`/api/admin/ciak/${p}`))
      );
      const data = {};
      paths.forEach((p, i) => {
        data[p] = results[i];
      });
      if (alive) setValues(computeMetrics(deptId, data));
    })();
    return () => {
      alive = false;
    };
  }, [deptId]);

  return values;
}
