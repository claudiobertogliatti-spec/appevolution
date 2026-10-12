/** I 6 agenti di Ciak: chiave usata dal server (@menzione), nome, foto. */
export const AGENTI_CIAK = [
  { key: "luca", nome: "Luca", foto: "/agents/luca.jpg" },
  { key: "carlo", nome: "Carlo", foto: "/agents/matteo.jpg" },
  { key: "marco", nome: "Marco", foto: "/agents/marco.jpg" },
  { key: "simona", nome: "Simona", foto: "/agents/stefania.jpg" },
  { key: "andrea", nome: "Andrea", foto: "/agents/andrea.jpg" },
  { key: "valentina", nome: "Valentina", foto: "/agents/valentina.jpg" },
];

export const agentePerChiave = (k) => AGENTI_CIAK.find((a) => a.key === k) || null;
