import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InsiderRedirect from "./InsiderRedirect";

function vai() {
  render(
    <MemoryRouter initialEntries={["/insider/tok-vecchio"]}>
      <Routes>
        <Route path="/insider/:token" element={<InsiderRedirect />} />
        <Route path="/cliente" element={<p>HOME CLIENTE</p>} />
        <Route path="/cliente/accesso" element={<p>ACCESSO</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => localStorage.clear());

test("con la sessione cliente attiva il vecchio indirizzo porta alla Home", () => {
  localStorage.setItem("ciak_client_token", "jwt");
  vai();
  expect(screen.getByText("HOME CLIENTE")).toBeTruthy();
});

test("senza sessione porta all'accesso (dove si rimanda il link personale), mai a una pagina aperta dal solo token", () => {
  vai();
  expect(screen.getByText("ACCESSO")).toBeTruthy();
  expect(screen.queryByText("HOME CLIENTE")).toBeNull();
});
