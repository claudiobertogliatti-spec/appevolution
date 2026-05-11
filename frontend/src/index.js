import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import CiakApp from "@/ciak/CiakApp";

/**
 * Host-based routing. Stesso bundle, due app:
 *  - Hostname ciak.io / www.ciak.io / *.ciak.io  → CiakApp (top-funnel pubblico)
 *  - Tutti gli altri host                         → App (Evolution PRO esistente)
 *
 * Preview locale: aggiungi ?ciak=1 all'URL per forzare la vista Ciak in dev/staging.
 * Cloud Run multi-domain mapping serve sia ciak.io che app.evolution-pro.it dallo
 * stesso servizio `evolution-pro-frontend-v2`.
 */
function selectApp() {
  if (typeof window === "undefined") return App;
  const host = window.location.hostname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const forceCiak = params.get("ciak") === "1";
  const isCiakHost = host === "ciak.io" || host === "www.ciak.io" || host.endsWith(".ciak.io");
  return (isCiakHost || forceCiak) ? CiakApp : App;
}

const Entry = selectApp();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Entry />
  </React.StrictMode>,
);
