import { matchesAdminPath, filterDepartmentPages } from './navigationMatch';

test('pipeline commerciale non attiva Acquisizione per prefisso', () => {
  expect(matchesAdminPath('/admin/pipeline-blueprint', '/admin/pipeline')).toBe(false);
  expect(matchesAdminPath('/admin/reparto/acquisizione-vendita', '/admin/reparto/acquisizione')).toBe(false);
  expect(matchesAdminPath('/admin/partner/13', '/admin/partner')).toBe(true);
  expect(matchesAdminPath('/admin/partner/13', '/admin/partner', true)).toBe(false);
});

test('ricerca per parole e accenti, ripristino di tutti gli accessi senza mutare il catalogo', () => {
  const pages = [{ to: '/a', label: 'Attività partner', desc: 'Materiali e video' }, { to: '/b', label: 'Fatture' }];
  expect(filterDepartmentPages(pages, 'attivita video')).toEqual([pages[0]]);
  expect(filterDepartmentPages(pages, 'inesistente')).toEqual([]);
  expect(filterDepartmentPages(pages, '')).toEqual(pages);
  expect(pages).toHaveLength(2);
});
