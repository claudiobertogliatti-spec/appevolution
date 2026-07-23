/**
 * Area Partner CIAK — Sezione Materiali & Cloud Vault.
 * Organizzazione in Cartelle a Menu a Tendina (FAQ Accordion Style)
 * con ampio respiro visivo e lista orizzontale dei file allineata.
 */
import React, { useState } from "react";
import {
  FolderOpen, Search, Plus, Download, Eye, Link as LinkIcon,
  FileText, FileCheck, FileVideo, FileAudio, Image, PenLine, Award,
  Sparkles, Lock, ShieldCheck, X, Upload, Check, Folder, ChevronDown, ChevronUp
} from "lucide-react";

// Struttura Cartelle Cloud Vault
const DRIVE_FOLDERS = [
  { id: "brand_kit", name: "01. Brand Kit & Strategia", subtitle: "Posizionamento Strategico, Brand Kit, Colori Ufficiali, Logo e Contratto Firmato", icon: Folder, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "scripts", name: "02. Script & Teleprompter", subtitle: "Copywriting persuasivo per la Masterclass, Outline delle lezioni e Tracce Video", icon: Folder, color: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "video", name: "03. Video & Moduli Corso", subtitle: "Videolezioni HD registrate, Video di Benvenuto e Risorse multimediali dell'Accademia", icon: Folder, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "funnel", name: "04. Piattaforma & Stripe", subtitle: "Pagine web del Funnel, Link di Cassa Stripe, Credenziali Subaccount e Dominio", icon: Folder, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "master_pdf", name: "05. Piano Master & Certificati", subtitle: "Dispensa Strategica Master PDF 14 Fasi e Certificati Ufficiali di Completamento", icon: Folder, color: "text-amber-600", bg: "bg-amber-50" },
];

// Mock File Vault per la demo e l'integrazione reale
const INITIAL_VAULT_FILES = [
  {
    id: "f-1",
    folderId: "master_pdf",
    name: "Piano_Operativo_Strategico_EVO.pdf",
    category: "Piano Master PDF",
    size: "3.4 MB",
    date: "23 Lug 2026",
    owner: "⚙️ CIAK",
    type: "pdf",
    icon: Award,
    iconColor: "text-amber-600",
    url: "/api/partner-journey/piano-operativo-pdf/demo_mario_rossi",
  },
  {
    id: "f-2",
    folderId: "master_pdf",
    name: "Certificato_Fase_Esamina_Mario_Rossi.pdf",
    category: "Certificato",
    size: "1.2 MB",
    date: "22 Lug 2026",
    owner: "⚙️ CIAK",
    type: "pdf",
    icon: Award,
    iconColor: "text-emerald-600",
    url: "/api/partner-journey/certificato-pdf/demo_mario_rossi/esamina",
  },
  {
    id: "f-3",
    folderId: "brand_kit",
    name: "Posizionamento_Strategico_Dott_Mario_Rossi.pdf",
    category: "Posizionamento",
    size: "850 KB",
    date: "21 Lug 2026",
    owner: "⚙️ CIAK",
    type: "pdf",
    icon: FileText,
    iconColor: "text-blue-600",
    url: "#",
  },
  {
    id: "f-4",
    folderId: "brand_kit",
    name: "Brand_Kit_Colori_Font_Logo.pdf",
    category: "Brand Kit",
    size: "2.1 MB",
    date: "20 Lug 2026",
    owner: "⚙️ CIAK",
    type: "pdf",
    icon: FileText,
    iconColor: "text-amber-500",
    url: "#",
  },
  {
    id: "f-5",
    folderId: "scripts",
    name: "Script_Masterclass_Vendita_Bozza.docx",
    category: "Script Word",
    size: "420 KB",
    date: "19 Lug 2026",
    owner: "⚙️ CIAK",
    type: "doc",
    icon: PenLine,
    iconColor: "text-yellow-600",
    url: "#",
  },
  {
    id: "f-6",
    folderId: "brand_kit",
    name: "Contratto_Partner_EVO_Firmato.pdf",
    category: "Contratto Legal",
    size: "1.8 MB",
    date: "15 Lug 2026",
    owner: "👤 Tu",
    type: "pdf",
    icon: FileCheck,
    iconColor: "text-emerald-600",
    url: "#",
  },
  {
    id: "f-7",
    folderId: "video",
    name: "Video_Benvenuto_Claudio.mp4",
    category: "Video HD",
    size: "45 MB",
    date: "15 Lug 2026",
    owner: "⚙️ CIAK",
    type: "video",
    icon: FileVideo,
    iconColor: "text-red-500",
    url: "#",
  },
  {
    id: "f-8",
    folderId: "funnel",
    name: "Piattaforma_Checkout_Stripe_Accademia.link",
    category: "Link Checkout",
    size: "1 KB",
    date: "Oggi",
    owner: "⚙️ CIAK",
    type: "link",
    icon: LinkIcon,
    iconColor: "text-emerald-500",
    url: "#",
  }
];

export function PartnerFilesPage({ partnerId }) {
  const [files, setFiles] = useState(INITIAL_VAULT_FILES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFileModal, setPreviewFileModal] = useState(null);

  // Stato espansione menu a tendina cartelle (tutte aperte di default)
  const [openFolders, setOpenFolders] = useState({
    brand_kit: true,
    scripts: true,
    video: true,
    funnel: true,
    master_pdf: true,
  });

  const toggleFolder = (id) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const foldersToDisplay = selectedFolderId === "all"
    ? DRIVE_FOLDERS
    : DRIVE_FOLDERS.filter((f) => f.id === selectedFolderId);

  const filterFiles = (folderId) => {
    return files.filter((f) => {
      const matchesFolder = f.folderId === folderId;
      const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOwner = filterOwner === "all" || (filterOwner === "ciak" ? f.owner.includes("CIAK") : f.owner.includes("Tu"));
      return matchesFolder && matchesSearch && matchesOwner;
    });
  };

  const handleUploadSimulated = (e) => {
    e.preventDefault();
    const newFile = {
      id: `f-${Date.now()}`,
      folderId: selectedFolderId === "all" ? "brand_kit" : selectedFolderId,
      name: "Documento_Caricato_Dal_Partner.pdf",
      category: "Documento Utente",
      size: "1.5 MB",
      date: "Oggi",
      owner: "👤 Tu",
      type: "pdf",
      icon: FileText,
      iconColor: "text-blue-600",
      url: "#"
    };
    setFiles([newFile, ...files]);
    setUploadModalOpen(false);
    alert("File caricato con successo!");
  };

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER CLOUD VAULT */}
      <header className="border-b border-slate-200 bg-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600">
                Cloud Vault · Area Partner
              </span>
              <h1 className="text-2xl font-bold text-slate-950 mt-0.5">
                I Miei Materiali & Asset
              </h1>
            </div>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2.5 bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-yellow-300 transition shadow-sm inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4 text-slate-950" />
              Carica File
            </button>
          </div>

          {/* BARRA RICERCA E FILTRI SOTTIMI */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca file o script..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="all">📂 Tutte le Cartelle</option>
                {DRIVE_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-semibold">
                <button
                  onClick={() => setFilterOwner("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${filterOwner === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  Tutti ({files.length})
                </button>
                <button
                  onClick={() => setFilterOwner("ciak")}
                  className={`px-2.5 py-1 rounded-lg transition ${filterOwner === "ciak" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  Da CIAK
                </button>
                <button
                  onClick={() => setFilterOwner("user")}
                  className={`px-2.5 py-1 rounded-lg transition ${filterOwner === "user" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  Da Te
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CARTELLE CON MENU A TENDINA (ACCORDION FAQ STYLE) E RESPIRO VISIVO AMPIO */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        {foldersToDisplay.map((folder) => {
          const folderFiles = filterFiles(folder.id);
          const FolderIcon = folder.icon;
          const isOpen = !!openFolders[folder.id];

          if (searchQuery && folderFiles.length === 0) return null;

          return (
            <div
              key={folder.id}
              className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:border-amber-400/80 transition"
            >
              
              {/* HEADER MENU A TENDINA (ACCORDION CLICKABLE BANNER) */}
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-slate-50/80 hover:bg-slate-100/80 transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${folder.bg} ${folder.color}`}>
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-950 group-hover:text-amber-600 transition">
                      {folder.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {folder.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-slate-200/80 text-slate-800">
                    {folderFiles.length} file
                  </span>
                  <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              {/* BODY MENU A TENDINA (DISCESA FILE SOTTO) */}
              {isOpen && (
                <div className="p-4 sm:p-6 border-t border-slate-200 bg-white space-y-3">
                  {folderFiles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Nessun file presente in questa cartella.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                      {folderFiles.map((file) => {
                        const IconComp = file.icon;
                        return (
                          <div
                            key={file.id}
                            className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            {/* NOME FILE E INFO */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                <IconComp className={`h-4 w-4 ${file.iconColor}`} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-slate-950 text-xs truncate" title={file.name}>
                                    {file.name}
                                  </h3>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                    {file.owner}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-medium">
                                  <span>{file.category}</span>
                                  <span>·</span>
                                  <span>{file.size}</span>
                                  <span>·</span>
                                  <span>{file.date}</span>
                                </div>
                              </div>
                            </div>

                            {/* TASTI AZIONE */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => setPreviewFileModal(file)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition"
                              >
                                <Eye className="h-3.5 w-3.5 text-amber-600" /> Anteprima
                              </button>

                              <a
                                href={file.url !== "#" ? file.url : `javascript:alert('Download ${file.name}')`}
                                target={file.url !== "#" ? "_blank" : "_self"}
                                rel="noreferrer"
                                className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-yellow-400 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-800 transition"
                              >
                                <Download className="h-3.5 w-3.5" /> Scarica
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* MODAL UPLOAD FILE */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-100 text-slate-700 p-2 rounded-full hover:bg-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-amber-600 uppercase">Cloud Vault Upload</span>
              <h3 className="text-lg font-bold text-slate-950 mt-0.5">Carica un File</h3>
            </div>

            <form onSubmit={handleUploadSimulated} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50 hover:border-amber-400 transition cursor-pointer">
                <Upload className="h-7 w-7 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Trascina qui il tuo file oppure sfoglia</p>
                <p className="text-[11px] text-slate-400">PDF, DOCX, MP4, PNG (Max 100MB)</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900 block">Cartella Destinazione:</label>
                <select className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none">
                  {DRIVE_FOLDERS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-yellow-300 transition shadow-sm"
              >
                CONFERMA CARICAMENTO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANTEPRIMA FILE */}
      {previewFileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setPreviewFileModal(null)}
              className="absolute top-4 right-4 bg-slate-100 text-slate-700 p-2 rounded-full hover:bg-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <previewFileModal.icon className={`h-4 w-4 ${previewFileModal.iconColor}`} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-amber-600 uppercase block">Anteprima File</span>
                <h3 className="text-sm font-bold text-slate-950 truncate">{previewFileModal.name}</h3>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
              <p><strong>Categoria:</strong> {previewFileModal.category}</p>
              <p><strong>Dimensione:</strong> {previewFileModal.size}</p>
              <p><strong>Data Caricamento:</strong> {previewFileModal.date}</p>
              <p><strong>Proprietario:</strong> {previewFileModal.owner}</p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setPreviewFileModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl font-semibold text-xs hover:bg-slate-200 transition"
              >
                Chiudi
              </button>

              <button
                onClick={() => {
                  alert(`Link copiato negli appunti: ${previewFileModal.name}`);
                  setPreviewFileModal(null);
                }}
                className="px-4 py-2 bg-slate-950 text-yellow-400 rounded-xl font-bold text-xs hover:bg-slate-800 transition inline-flex items-center gap-1.5"
              >
                <LinkIcon className="h-3.5 w-3.5" /> Copia Link
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PartnerFilesPage;
