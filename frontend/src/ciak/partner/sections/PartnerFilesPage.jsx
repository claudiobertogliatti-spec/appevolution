/**
 * Area Partner CIAK — Sezione Materiali & Cloud Vault (Stile Google Drive).
 * Finestre Cartella chiare e leggibili in alto con l'elenco dei file disposti sotto.
 */
import React, { useState } from "react";
import {
  FolderOpen, Search, Plus, Download, Eye, Link as LinkIcon,
  FileText, FileCheck, FileVideo, FileAudio, Image, PenLine, Award,
  Sparkles, Lock, ShieldCheck, X, Upload, Check, Folder, ChevronRight
} from "lucide-react";

// Struttura Cartelle Cloud Vault
const DRIVE_FOLDERS = [
  { id: "brand_kit", name: "01. Brand Kit & Strategia", subtitle: "Documenti di Posizionamento Strategico, Brand Kit, Colori Ufficiali, Logo e Contratto Firmato", icon: Folder, color: "text-amber-500", bg: "bg-amber-50" },
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
    owner: "⚙️ Team CIAK",
    type: "pdf",
    icon: Award,
    iconColor: "text-amber-600",
    url: "/api/partner-journey/piano-operativo-pdf/demo_mario_rossi",
  },
  {
    id: "f-2",
    folderId: "master_pdf",
    name: "Certificato_Fase_Esamina_Mario_Rossi.pdf",
    category: "Certificato Ufficiale",
    size: "1.2 MB",
    date: "22 Lug 2026",
    owner: "⚙️ Team CIAK",
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
    owner: "⚙️ Team CIAK",
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
    owner: "⚙️ Team CIAK",
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
    owner: "⚙️ Team CIAK",
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
    owner: "⚙️ Team CIAK",
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
    owner: "⚙️ Team CIAK",
    type: "link",
    icon: LinkIcon,
    iconColor: "text-emerald-500",
    url: "#",
  }
];

export function PartnerFilesPage({ partnerId }) {
  const [files, setFiles] = useState(INITIAL_VAULT_FILES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("all"); // "all" o id specifica cartella
  const [filterOwner, setFilterOwner] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFileModal, setPreviewFileModal] = useState(null);

  // Cartelle da mostrare in base alla selezione
  const foldersToDisplay = selectedFolderId === "all"
    ? DRIVE_FOLDERS
    : DRIVE_FOLDERS.filter((f) => f.id === selectedFolderId);

  // Filtro dinamico dei file
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
    alert("File caricato con successo nella tua cartella!");
  };

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER CLOUD VAULT */}
      <header className="border-b border-slate-200 bg-white py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
                Cloud Vault · Area Riservata
              </span>
              <h1 className="text-3xl font-extrabold text-slate-950 mt-1">
                I Miei Materiali & Asset
              </h1>
            </div>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-6 py-3.5 bg-yellow-400 text-slate-950 font-extrabold rounded-2xl text-xs hover:bg-yellow-300 transition shadow-md inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 text-slate-950" />
              Carica File o Documento
            </button>
          </div>

          {/* BARRA DI RICERCA & FILTRI DI SELEZIONE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            
            {/* SEARCH INPUT */}
            <div className="relative flex-1 max-w-xl">
              <Search className="h-4 w-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca tra file, script, contratti o certificati..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* SELETTORE CARTELLA & PROVENIENZA */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 outline-none"
              >
                <option value="all">📂 Mostra Tutte le Cartelle</option>
                {DRIVE_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                <button
                  onClick={() => setFilterOwner("all")}
                  className={`px-3 py-1.5 rounded-lg transition ${filterOwner === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tutti ({files.length})
                </button>
                <button
                  onClick={() => setFilterOwner("ciak")}
                  className={`px-3 py-1.5 rounded-lg transition ${filterOwner === "ciak" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  ⚙️ Da CIAK
                </button>
                <button
                  onClick={() => setFilterOwner("user")}
                  className={`px-3 py-1.5 rounded-lg transition ${filterOwner === "user" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  👤 Da Te
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* BODY CONTENT: OGNI CARTELLA È UNA FINESTRA IN ALTO CON I SUOI FILE SOTTO */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-12">
        {foldersToDisplay.map((folder) => {
          const folderFiles = filterFiles(folder.id);
          const FolderIcon = folder.icon;

          if (searchQuery && folderFiles.length === 0) return null;

          return (
            <section key={folder.id} className="space-y-4">
              
              {/* FINESTRA IN ALTO LEGGIBILE DELLA CARTELLA */}
              <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${folder.bg} ${folder.color}`}>
                      <FolderIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block">
                        Cartella Cloud
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 mt-0.5">
                        {folder.name}
                      </h2>
                    </div>
                  </div>

                  <span className="px-4 py-1.5 rounded-full bg-slate-950 text-yellow-400 font-mono font-extrabold text-xs w-max shadow-sm">
                    {folderFiles.length} {folderFiles.length === 1 ? "File presente" : "File presenti"}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {folder.subtitle}
                </p>
              </div>

              {/* GRIGLIA FILE CONTENUTI DISPOSTI SOTTO */}
              {folderFiles.length === 0 ? (
                <div className="p-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                  Nessun file presente in questa cartella.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folderFiles.map((file) => {
                    const IconComp = file.icon;
                    return (
                      <div
                        key={file.id}
                        className="bg-white border-2 border-slate-200 rounded-3xl p-5 hover:border-amber-400 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                              <IconComp className={`h-5 w-5 ${file.iconColor}`} />
                            </div>

                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {file.owner}
                            </span>
                          </div>

                          <h3 className="text-xs font-extrabold text-slate-950 leading-snug group-hover:text-amber-600 transition" title={file.name}>
                            {file.name}
                          </h3>
                          
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 font-medium">
                            <span>{file.category}</span>
                            <span>{file.size}</span>
                          </div>
                        </div>

                        {/* TASTI AZIONE */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <button
                            onClick={() => setPreviewFileModal(file)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-[11px] inline-flex items-center gap-1 transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-amber-600" /> Anteprima
                          </button>

                          {file.url !== "#" ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-yellow-400 font-bold text-[11px] inline-flex items-center gap-1 hover:bg-slate-800 transition"
                            >
                              <Download className="h-3.5 w-3.5" /> Scarica
                            </a>
                          ) : (
                            <button
                              onClick={() => alert(`Scaricamento file: ${file.name}`)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-yellow-400 font-bold text-[11px] inline-flex items-center gap-1 hover:bg-slate-800 transition"
                            >
                              <Download className="h-3.5 w-3.5" /> Scarica
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </section>
          );
        })}
      </div>

      {/* MODAL UPLOAD FILE */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-100 text-slate-700 p-2 rounded-full hover:bg-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-amber-600 uppercase">Cloud Vault Upload</span>
              <h3 className="text-xl font-extrabold text-slate-950 mt-0.5">Carica un File nel tuo Spazio</h3>
            </div>

            <form onSubmit={handleUploadSimulated} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3 bg-slate-50 hover:border-amber-400 transition cursor-pointer">
                <Upload className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Trascina qui il tuo file oppure sfoglia</p>
                <p className="text-[11px] text-slate-400">Supportati: PDF, DOCX, MP4, PNG, JPG (Max 100MB)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 block">Seleziona Cartella di Destinazione:</label>
                <select className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none">
                  {DRIVE_FOLDERS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-yellow-400 text-slate-950 font-extrabold rounded-xl text-xs hover:bg-yellow-300 transition shadow-md flex items-center justify-center gap-2"
              >
                CONFERMA CARICAMENTO →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANTEPRIMA FILE */}
      {previewFileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setPreviewFileModal(null)}
              className="absolute top-4 right-4 bg-slate-100 text-slate-700 p-2 rounded-full hover:bg-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <previewFileModal.icon className={`h-5 w-5 ${previewFileModal.iconColor}`} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Anteprima Documento</span>
                <h3 className="text-lg font-extrabold text-slate-950 truncate max-w-sm">{previewFileModal.name}</h3>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-700">
              <p><strong>Categoria:</strong> {previewFileModal.category}</p>
              <p><strong>Dimensione:</strong> {previewFileModal.size}</p>
              <p><strong>Data Caricamento:</strong> {previewFileModal.date}</p>
              <p><strong>Proprietario:</strong> {previewFileModal.owner}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setPreviewFileModal(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
              >
                Chiudi
              </button>

              <button
                onClick={() => {
                  alert(`Copiato negli appunti il link al file: ${previewFileModal.name}`);
                  setPreviewFileModal(null);
                }}
                className="px-5 py-2.5 bg-slate-950 text-yellow-400 rounded-xl font-bold text-xs hover:bg-slate-800 transition inline-flex items-center gap-1.5"
              >
                <LinkIcon className="h-3.5 w-3.5" /> Copia Link Condivisibile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PartnerFilesPage;
