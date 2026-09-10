// Match route segments, never prefixes such as pipeline vs pipeline-blueprint.
export function matchesAdminPath(pathname, target, end = false) {
  return pathname === target || (!end && pathname.startsWith(`${target}/`));
}

export function filterDepartmentPages(pages, query) {
  const normalize = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return pages.filter(page => terms.every(term => normalize(`${page.label} ${page.desc || ""}`).includes(term)));
}
