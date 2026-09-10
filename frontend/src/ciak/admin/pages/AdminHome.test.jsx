import { render, screen } from "@testing-library/react";
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
}), { virtual: true });

import { AdminHome } from "./AdminHome";

test("saluta l'utente e mostra i 5 reparti come tessere verso le loro home", () => {
  render(<AdminHome user={{ name: "Claudio Bertogliatti" }} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ciao Claudio");
  const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
  expect(hrefs).toEqual([
    "/admin/direzione",
    "/admin/reparto/acquisizione",
    "/admin/reparto/vendite",
    "/admin/reparto/delivery",
    "/admin/reparto/back-office",
  ]);
  ["Direzione", "Acquisizione", "Vendite", "Delivery", "Back office"].forEach((l) =>
    expect(screen.getByText(l)).toBeTruthy()
  );
});

test("senza nome usa comunque un saluto valido", () => {
  render(<AdminHome user={{}} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ciao Claudio");
});
