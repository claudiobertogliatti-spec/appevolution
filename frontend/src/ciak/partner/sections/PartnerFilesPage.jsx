/**
 * Area Partner CIAK — Sezione Materiali & Cloud Vault (Stile Google Drive).
 * Organizzazione in Cartelle, Ricerca Rapida, Visualizzazione Griglia/Lista
 * e Upload Drag & Drop su sfondo bianco puro (#FFFFFF).
 */
import React, { useState, useEffect, useRef } from "react";
import {
  FolderOpen, Search, Plus, Grid, List, Download, Eye, Link as LinkIcon,
  FileText, FileCheck, FileVideo, FileAudio, Image, PenLine, Award,
  Sparkles, Lock, ShieldCheck, X, Upload, Check, Folder, ChevronRight
} from "lucide-react";

// Struttura Cartelle Google Drive Style per il Protocollo EVO
const DRIVE_FOLDERS = [
  { id: "brand_kit", name: "01. Brand Kit & Strategia", subtitle: "Posizionamento, Colori Ufficiali e Logo", count: 4, icon: Folder, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "scripts", name: "02. Script & Teleprompter", subtitle: "Script Masterclass e Outline Lezioni", count: 3, icon: Folder, color: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "video", name: "03. Video & Moduli Corso", subtitle: "Videolezioni HD e Benvenuto", count: 6, icon: Folder, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "funnel", name: "04. Piattaforma & Stripe", subtitle: "Funnel URL e Cassa Stripe", count: 2, icon: Folder, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "master_pdf", name: "05. Piano Master & Certificati", subtitle: "Dispensa Master PDF 14 Fasi & Certificati", count: 3, icon: Folder, color: "text-amber-600", bg: "bg-amber-50" },
];

// Mock File Vault per la demo e l'integrazione reale
const INITIAL_VAULT_FILES = [
  {
    id: "f-1",
    folderId: "master_pdf",
    name: "Piano_Operativo_Strategico_EVO.pdf",
    category: "Piano Master",
    size: "3.4 MB",
    date: "23 Lug 2026",
    owner: "⚙️ Team CIAK",
    type: "pdf",
    icon: Award,
    iconColor: "text-amber-600",
    url: "/api/partner-journey/piano-operativo-pdf/demo_mario_rossi",
    locked: false,
  },
  {
    id: "f-2",
    folderId: "master_pdf",
    name: "Certificato_Fase_Esamina_Mario_Rossi.pdf",
    category: "Certificato",
    size: "1.2 MB",
    date: "22 Lug 2026",
    owner: "⚙️ Team CIAK",
    type: "pdf",
    icon: Award,
    iconColor: "text-emerald-600",
    url: "/api/partner-journey/certificato-pdf/demo_mario_rossi/esamina",
    locked: false,
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
    locked: false,
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
    locked: false,
  },
  {
    id: "f-5",
    folderId: "scripts",
    name: "Script_Masterclass_Vendita_Bozza.docx",
    category: "Script",
    size: "420 KB",
    date: "19 Lug 2026",
    owner: "⚙️ Team CIAK",
    type: "doc",
    icon: PenLine,
    iconColor: "text-yellow-600",
    url: "#",
    locked: false,
  },
  {
    id: "f-6",
    folderId: "brand_kit",
    name: "Contratto_Partner_EVO_Firmato.pdf",
    category: "Contratto",
    size: "1.8 MB",
    date: "15 Lug 2026",
    owner: "👤 Tu",
    type: "pdf",
    icon: FileCheck,
    iconColor: "text-emerald-600",
    url: "#",
    locked: false,
  },
  {
    id: "f-7",
    folderId: "video",
    name: "Video_Benvenuto_Claudio.mp4",
    category: "Video",
    size: "45 MB",
    date: "15 Lug 2026",
    owner: "⚙️ Team CIAK",
    type: "video",
    icon: FileVideo,
    iconColor: "text-red-500",
    url: "#",
    locked: false,
  },
  {
    id: "f-8",
    folderId: "funnel",
    name: "Piattaforma_Checkout_Stripe_Accademia.link",
    category: "Link Funnel",
    size: "1 KB",
    date: "Oggi",
    owner: "⚙️ Team CIAK",
    type: "link",
    icon: LinkIcon,
    iconColor: "text-emerald-500",
    url: "#",
    locked: false,
  }
];

export function PartnerFilesPage({ partnerId }) {
  const [files, setFiles] = useState(INITIAL_VAULT_FILES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // "grid" vs "list"
  const [filterOwner, setFilterOwner] = useState("all"); // "all" | "ciak" | "user"
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFileModal, setPreviewFileModal] = useState(null);

  // Filtro dinamico dei file
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === "all" || f.folderId === selectedFolder;
    const matchesOwner = filterOwner === "all" || (filterOwner === "ciak" ? f.owner.includes("CIAK") : f.owner.includes("Tu"));
    return matchesSearch && matchesFolder && matchesOwner;
  });

  const handleUploadSimulated = (e) => {
    e.preventDefault();
    const newFile = {
      id: `f-${Date.now()}`,
      folderId: selectedFolder === "all" ? "brand_kit" : selectedFolder,
      name: "Documento_Caricato_Dal_Partner.pdf",
      category: "Documento Utente",
      size: "1.5 MB",
      date: "Oggi",
      owner: "👤 Tu",
      type: "pdf",
      icon: FileText,
      iconColor: "text-blue-600",
      url: "#",
      locked: false
    };
    setFiles([newFile, ...files]);
    setUploadModalOpen(false);
    alert("File caricato con successo nel tuo Cloud Vault!");
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

            {/* BOTTONE + CARICA FILE */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-6 py-3.5 bg-yellow-400 text-slate-950 font-extrabold rounded-2xl text-xs hover:bg-yellow-300 transition shadow-md inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 text-slate-950" />
              Carica File o Documento
            </button>
          </div>

          {/* BARRA DI RICERCA & TOGGLE VISTA */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            
            {/* SEARCH INPUT STYLE GOOGLE DRIVE */}
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

            {/* FILTRI OWNER & GRID/LIST TOGGLE */}
            <div className="flex items-center gap-3">
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

              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  aria-label="Griglia"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  aria-label="Lista"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* 1. SEZIONE CARTELLE (SPAZIOSA SENZA TESTI TAGLIATI) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
              Cartelle del Cloud Vault
            </span>
            <span className="text-xs font-semibold text-slate-500">Seleziona una cartella per filtrare i file</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* TUTTI I MATERIALI */}
            <button
              onClick={() => setSelectedFolder("all")}
              className={`p-5 rounded-3xl border-2 text-left transition flex items-center justify-between gap-4 ${
                selectedFolder === "all"
                  ? "bg-slate-950 text-yellow-400 border-slate-950 font-extrabold shadow-md"
                  : "bg-white border-slate-200 hover:border-amber-400 text-slate-950 font-bold"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  selectedFolder === "all" ? "bg-yellow-400 text-slate-950" : "bg-amber-100 text-amber-700"
                }`}>
                  <Folder className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold leading-snug">Tutti i Materiali</h3>
                  <p className={`text-xs mt-0.5 ${selectedFolder === "all" ? "text-slate-300" : "text-slate-500"}`}>
                    Archivio globale di tutti gli asset
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                selectedFolder === "all" ? "bg-yellow-400/20 text-yellow-300" : "bg-slate-100 text-slate-700"
              }`}>
                {files.length} file
              </span>
            </button>

            {/* CARTELLE SPECIFICHE CON TESTO COMPLETO */}
            {DRIVE_FOLDERS.map((folder) => {
              const isActive = selectedFolder === folder.id;
              const FolderIcon = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`p-5 rounded-3xl border-2 text-left transition flex items-center justify-between gap-4 ${
                    isActive
                      ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold shadow-md"
                      : "bg-white border-slate-200 hover:border-amber-400 text-slate-950 font-bold"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isActive ? "bg-slate-950 text-yellow-400" : `${folder.bg} ${folder.color}`
                    }`}>
                      <FolderIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold leading-snug">{folder.name}</h3>
                      <p className={`text-xs mt-0.5 ${isActive ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                        {folder.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                    isActive ? "bg-slate-950 text-yellow-400" : "bg-slate-100 text-slate-700"
                  }`}>
                    {folder.count} file
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. FILE VAULT (GRID OR LIST VIEW) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              File & Documenti ({filteredFiles.length})
            </span>
            {selectedFolder !== "all" && (
              <button
                onClick={() => setSelectedFolder("all")}
                className="text-xs text-amber-600 font-bold hover:underline"
              >
                ← Mostra tutte le cartelle
              </button>
            )}
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nessun file trovato in questa cartella</p>
              <p className="text-xs text-slate-400">Prova a cambiare filtro o carica un nuovo file.</p>
            </div>
          ) : viewMode === "grid" ? (
            
            /* VISTA A GRIGLIA (GOOGLE DRIVE CARDS) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
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

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {file.owner}
                        </span>
                      </div>

                      <h3 className="text-xs font-extrabold text-slate-950 truncate group-hover:text-amber-600 transition" title={file.name}>
                        {file.name}
                      </h3>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
                        <span>{file.category}</span>
                        <span>{file.size}</span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
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
                          className="px-3 py-1.5 rounded-xl bg-slate-950 text-yellow-400 font-bold text-[11px] inline-flex items-center gap-1 hover:bg-slate-800 transition"
                        >
                          <Download className="h-3.5 w-3.5" /> Scarica
                        </a>
                      ) : (
                        <button
                          onClick={() => alert(`Scaricamento file: ${file.name}`)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 text-yellow-400 font-bold text-[11px] inline-flex items-center gap-1 hover:bg-slate-800 transition"
                        >
                          <Download className="h-3.5 w-3.5" /> Scarica
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (

            /* VISTA A LISTA (TABELLA DETTAGLIATA) */
            <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="p-4">Nome File</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Dimensione</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Provenienza</th>
                    <th className="p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredFiles.map((file) => {
                    const IconComp = file.icon;
                    return (
                      <tr key={file.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-950 flex items-center gap-3">
                          <IconComp className={`h-4 w-4 shrink-0 ${file.iconColor}`} />
                          <span className="truncate max-w-xs" title={file.name}>{file.name}</span>
                        </td>
                        <td className="p-4 text-slate-500">{file.category}</td>
                        <td className="p-4 text-slate-500">{file.size}</td>
                        <td className="p-4 text-slate-500">{file.date}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {file.owner}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setPreviewFileModal(file)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-900 transition"
                              title="Anteprima"
                            >
                              <Eye className="h-4 w-4 text-amber-600" />
                            </button>
                            <button
                              onClick={() => alert(`Scarico ${file.name}`)}
                              className="p-1.5 bg-slate-950 hover:bg-slate-800 rounded-lg text-yellow-400 transition"
                              title="Scarica"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          )}
        </div>

      </div>

      {/* MODAL UPLOAD FILE DRAG & DROP */}
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
