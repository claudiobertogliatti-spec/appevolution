import { render, screen, within } from "@testing-library/react";

jest.mock("react-router-dom", () => {
  const React = require("react");
  return { Link: React.forwardRef(({ to, children, ...p }, ref) => <a ref={ref} href={to} {...p}>{children}</a>) };
}, { virtual: true });

import { SezioneNav } from "./SezioneNav";

const VOCI = [
  { to: "/admin/reparto/delivery", label: "Panoramica", gruppo: null },
  { to: "/admin/partner", label: "Pipeline Partner", gruppo: "Partner" },
  { to: "/admin/ex-partner", label: "Ex Partner", gruppo: "Partner" },
  { to: "/admin/metriche", label: "KPI Partner", gruppo: "Risultati" },
];

test("e' una navigazione col nome del reparto e mostra tutte le voci come link", () => {
  render(<SezioneNav label="Delivery" voci={VOCI} attiva="/admin/partner" />);
  const nav = screen.getByRole("navigation", { name: "Sezione Delivery" });
  const link = within(nav).getAllByRole("link");
  expect(link.map((a) => a.textContent)).toEqual(["Panoramica", "Pipeline Partner", "Ex Partner", "KPI Partner"]);
  expect(link.map((a) => a.getAttribute("href"))).toEqual(VOCI.map((v) => v.to));
});

test("la voce attiva e' dichiarata con aria-current, le altre no", () => {
  render(<SezioneNav label="Delivery" voci={VOCI} attiva="/admin/ex-partner" />);
  const correnti = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
  expect(correnti.map((a) => a.textContent)).toEqual(["Ex Partner"]);
});

test("separa i gruppi con un filo (non tra voci dello stesso gruppo)", () => {
  render(<SezioneNav label="Delivery" voci={VOCI} attiva="/admin/partner" />);
  // Panoramica→Partner e Partner→Risultati: 2 cambi di gruppo, nessuno tra le due voci "Partner".
  expect(screen.getAllByTestId("separatore-gruppo")).toHaveLength(2);
});

test("senza gruppi non disegna separatori", () => {
  const piatte = [
    { to: "/admin/reparto/vendite", label: "Panoramica", gruppo: null },
    { to: "/admin/trattative", label: "Trattative", gruppo: null },
  ];
  render(<SezioneNav label="Vendite" voci={piatte} attiva="/admin/trattative" />);
  expect(screen.queryAllByTestId("separatore-gruppo")).toHaveLength(0);
});

test("porta in vista la voce attiva quando cambia", () => {
  const scroll = jest.fn();
  const originale = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = scroll;
  try {
    const { rerender } = render(<SezioneNav label="Delivery" voci={VOCI} attiva="/admin/partner" />);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<SezioneNav label="Delivery" voci={VOCI} attiva="/admin/metriche" />);
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally {
    window.HTMLElement.prototype.scrollIntoView = originale;
  }
});

test("non si rompe dove scrollIntoView non esiste (jsdom, browser vecchi)", () => {
  const originale = window.HTMLElement.prototype.scrollIntoView;
  delete window.HTMLElement.prototype.scrollIntoView;
  try {
    expect(() => render(<SezioneNav label="Delivery" voci={VOCI} attiva="/admin/partner" />)).not.toThrow();
  } finally {
    if (originale) window.HTMLElement.prototype.scrollIntoView = originale;
  }
});
