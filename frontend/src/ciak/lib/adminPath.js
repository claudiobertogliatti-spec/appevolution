/**
 * L'area admin (ciak.io/admin) e' dietro login e non traccia nessuno: il cookie
 * banner del sito pubblico non deve comparirci (copriva il pulsante "Esci").
 */
export function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
