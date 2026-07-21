import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import CiakApp from "@/ciak/CiakApp";
import { ErrorBoundary } from "@/ciak/components/ErrorBoundary";

/**
 * Entry unico: CiakApp su tutti gli host con ErrorBoundary di protezione globale.
 */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <CiakApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
