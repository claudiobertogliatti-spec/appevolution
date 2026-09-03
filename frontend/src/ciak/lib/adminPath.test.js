/**
 * Il banner cookie del sito pubblico copriva il pulsante "Esci" dell'admin.
 * L'admin e' dietro login e non traccia nessuno: il banner non ci va.
 */
import { isAdminPath } from "./adminPath";

test("riconosce l'area admin e le sue sotto-pagine", () => {
  expect(isAdminPath("/admin")).toBe(true);
  expect(isAdminPath("/admin/amministrazione")).toBe(true);
});

test("non scambia il sito pubblico o l'area partner per admin", () => {
  expect(isAdminPath("/")).toBe(false);
  expect(isAdminPath("/masterclass")).toBe(false);
  expect(isAdminPath("/partner")).toBe(false);
  expect(isAdminPath("/administrator")).toBe(false);
});
