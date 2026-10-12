/**
 * Sidebar con le facce: l'agente giusto per reparto, mai la faccia sbagliata,
 * e solo per Claudio.
 */
import { render, screen } from "@testing-library/react";
import { Handshake } from "lucide-react";
import { MacroLabel, sidebarConFacce } from "./CiakAdminApp";
import { DEPARTMENT_ROOMS } from "./departmentRooms";

const macro = (id, label) => ({ id, label });

test.each(["dashboard", "acquisizione", "vendite", "delivery", "back-office"])(
  "il reparto %s mostra la foto del suo agente e il suo nome",
  (id) => {
    const agent = DEPARTMENT_ROOMS[id].agent;
    const { container } = render(<MacroLabel macro={macro(id, "Reparto")} Icon={Handshake} facce />);
    expect(container.querySelector("img").getAttribute("src")).toBe(agent.avatar);
    expect(screen.getByText(agent.name)).toBeTruthy();
    expect(screen.getByText("Reparto")).toBeTruthy();
  }
);

test("senza facce resta l'icona e il nome del reparto", () => {
  const { container } = render(<MacroLabel macro={macro("vendite", "Vendite")} Icon={Handshake} facce={false} />);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("Vendite")).toBeTruthy();
});

test("un reparto senza stanza non prende la faccia di un altro: resta l'icona", () => {
  const { container } = render(<MacroLabel macro={macro("inesistente", "Altro")} Icon={Handshake} facce />);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("Altro")).toBeTruthy();
});

test("le facce sono solo per Claudio", () => {
  expect(sidebarConFacce("claudio")).toBe(true);
  expect(sidebarConFacce("antonella")).toBe(false);
  expect(sidebarConFacce("mariangela")).toBe(false);
});

test("si spegne con l'impostazione locale", () => {
  window.localStorage.setItem("ciak_admin_sidebar_facce", "0");
  expect(sidebarConFacce("claudio")).toBe(false);
  window.localStorage.removeItem("ciak_admin_sidebar_facce");
});

test("il numero accanto all'agente compare solo se c'è e se è maggiore di zero", () => {
  const { container, rerender } = render(<MacroLabel macro={macro("vendite", "Vendite")} Icon={Handshake} facce badge={2} />);
  expect(container.textContent).toContain("2");
  rerender(<MacroLabel macro={macro("vendite", "Vendite")} Icon={Handshake} facce badge={0} />);
  expect(container.querySelector('[aria-label$="da fare"]')).toBeNull();
  rerender(<MacroLabel macro={macro("vendite", "Vendite")} Icon={Handshake} facce badge={null} />);
  expect(container.querySelector('[aria-label$="da fare"]')).toBeNull();
});
