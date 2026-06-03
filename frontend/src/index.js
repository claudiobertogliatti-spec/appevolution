import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import CiakApp from "@/ciak/CiakApp";

/**
 * Entry unico: CiakApp su tutti gli host.
 *
 * Consolidamento 2026-06-03: la vecchia app Evolution PRO (App.js + components/)
 * è stata ritirata — non era usata da nessuno. ciak.io e app.evolution-pro.it
 * servono entrambi CiakApp. Il sito vetrina pubblico evolution-pro.it resta su
 * Systeme.io, fuori da questo bundle.
 */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <CiakApp />
  </React.StrictMode>,
);
