/**
 * Ciak Partner — PartnerFilesPage.
 * Porting di components/partner/PartnerFilesPage.jsx. Re-skin palette Ciak.
 * Sotto-componente di MioSpazioPage (tab "I Miei File"). Non è una pagina standalone.
 *
 * Endpoint backend invariati:
 *  GET  /api/files/partner/:partnerId
 *  POST /api/files/upload  (multipart: file, partner_id, category)
 *  download via :internal_url
 */
import React, { useState, useEffect, useRef } from "react";
import {
  FileText, Download, Upload, Shield, FolderOpen, FileVideo,
  FileCheck, Loader2, FileAudio, Image, Receipt,
  Target, Mail, PenLine, Trash2,
} from "lucide-react";

// File category configuration — color = classe Tailwind
const FILE_CATEGORIES = {
  contratto_firmato: {
    icon: FileCheck,
    label: "Contratto Firmato",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    activeBg: "bg-emerald-500",
  },
  posizionamento: {
    icon: Target,
    label: "Posizionamento",
    iconColor: "text-slate-500",
    iconBg: "bg-slate-50",
    activeBg: "bg-slate-500",
  },
  script: {
    icon: PenLine,
    label: "Script Masterclass",
    iconColor: "text-yellow-600",
    iconBg: "bg-yellow-50",
    activeBg: "bg-yellow-500",
  },
  video: {
    icon: FileVideo,
    label: "Video",
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
    activeBg: "bg-red-500",
  },
  audio: {
    icon: FileAudio,
    label: "Audio",
    iconColor: "text-slate-500",
    iconBg: "bg-slate-50",
    activeBg: "bg-slate-500",
  },
  document: {
    icon: FileText,
    label: "Documenti PDF",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    activeBg: "bg-blue-500",
  },
  distinta: {
    icon: Receipt,
    label: "Distinte di Pagamento",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    activeBg: "bg-emerald-500",
  },
  image: {
    icon: Image,
    label: "Immagini",
    iconColor: "text-slate-500",
    iconBg: "bg-slate-50",
    activeBg: "bg-slate-500",
  },
  email: {
    icon: Mail,
    label: "Email Approvate",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    activeBg: "bg-blue-500",
  },
  onboarding: {
    icon: Shield,
    label: "Documenti Onboarding",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    activeBg: "bg-emerald-500",
  },
};

export function PartnerFilesPage({ partner }) {
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const docInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, [partner]);

  const loadFiles = async () => {
    if (!partner?.id) return;
    try {
      const r = await fetch(`/api/files/partner/${partner.id}`);
      if (r.ok) {
        const data = await r.json();
        if (data.files) setFiles(data.files);
      }
    } catch (e) {
      console.error("Error loading files:", e);
    }
  };

  const handleDelete = async (f) => {
    if (!f?.file_id) return;
    if (!window.confirm(`Eliminare "${f.original_name || "questo file"}"? L'operazione non è reversibile.`)) return;
    try {
      const r = await fetch(`/api/files/${f.file_id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await loadFiles();
    } catch (e) {
      console.error("Delete error:", e);
      alert("Eliminazione non riuscita. Riprova.");
    }
  };

  const handleDocUpload = async (e, category = "document") => {
    const file = e.target.files[0];
    if (!file || !partner?.id) return;

    // Guardrail: /api/files/upload passa dal backend (Cloud Run) che rifiuta le
    // richieste sopra ~32 MB con HTTP 413. Per i file grandi (es. video grezzo)
    // questo upload e' destinato a fallire: blocchiamo prima e indirizziamo al
    // percorso giusto ("Produzione Video" -> GCS), invece di crashare.
    const MAX_DIRECT = 30 * 1024 * 1024;
    if (file.size > MAX_DIRECT) {
      window.alert(
        "Questo file e' troppo grande per il caricamento da qui (max ~30 MB).\n\n" +
        "Per il video della masterclass usa \"Produzione Video\". Se quel passo e' " +
        "ancora bloccato, chiedi al team Evolution di caricarlo dall'area admin."
      );
      if (e.target) e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("partner_id", partner.id);
      fd.append("category", category);
      await fetch(`/api/files/upload`, { method: "POST", body: fd });
      await loadFiles();
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const getAllFiles = () => {
    const allFiles = [];
    Object.entries(files).forEach(([category, fileList]) => {
      if (Array.isArray(fileList)) {
        fileList.forEach((f) => {
          allFiles.push({ ...f, category });
        });
      }
    });
    return allFiles;
  };

  const allFiles = getAllFiles();
  const filteredFiles =
    activeCategory === "all"
      ? allFiles
      : allFiles.filter((f) => f.category === activeCategory);

  const fileCounts = {};
  allFiles.forEach((f) => {
    fileCounts[f.category] = (fileCounts[f.category] || 0) + 1;
  });

  const pickFile = (accept, category) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => handleDocUpload(e, category);
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 bg-yellow-50 text-yellow-700 border border-yellow-200">
          <FolderOpen className="w-4 h-4" />
          I Miei File
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Tutti i tuoi <span className="text-yellow-500">materiali</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Qui trovi tutti i file che hai caricato durante il percorso: script, posizionamento,
          video, documenti e distinte di pagamento.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-yellow-500" />
          Carica nuovi file
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Video Upload */}
          <div
            className="border-2 border-dashed border-red-200 rounded-xl p-4 text-center hover:border-red-400 cursor-pointer transition-colors bg-red-50/30"
            onClick={() => pickFile("video/*", "video")}
          >
            <FileVideo className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="font-semibold text-xs text-slate-900">Video</div>
            <div className="text-[10px] text-slate-400">MP4, MOV, AVI...</div>
          </div>

          {/* Document Upload */}
          <div
            className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center hover:border-blue-400 cursor-pointer transition-colors bg-blue-50/30"
            onClick={() => docInputRef.current?.click()}
          >
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx"
              onChange={(e) => handleDocUpload(e, "document")}
              className="hidden"
            />
            <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="font-semibold text-xs text-slate-900">Documenti PDF</div>
            <div className="text-[10px] text-slate-400">PDF, DOCX, XLSX</div>
          </div>

          {/* Audio Upload */}
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 cursor-pointer transition-colors bg-slate-50/30"
            onClick={() => pickFile("audio/*", "audio")}
          >
            <FileAudio className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <div className="font-semibold text-xs text-slate-900">Audio</div>
            <div className="text-[10px] text-slate-400">MP3, WAV</div>
          </div>

          {/* Image Upload */}
          <div
            className="border-2 border-dashed border-emerald-200 rounded-xl p-4 text-center hover:border-emerald-400 cursor-pointer transition-colors bg-emerald-50/30"
            onClick={() => pickFile("image/*", "image")}
          >
            <Image className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-xs text-slate-900">Immagini</div>
            <div className="text-[10px] text-slate-400">JPG, PNG</div>
          </div>
        </div>

        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-yellow-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Caricamento in corso...
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
            activeCategory === "all"
              ? "bg-yellow-400 text-slate-900"
              : "bg-white border border-gray-200 text-slate-600 hover:border-yellow-400"
          }`}
        >
          Tutti ({allFiles.length})
        </button>
        {Object.entries(FILE_CATEGORIES).map(([key, config]) => {
          const count = fileCounts[key] || 0;
          if (count === 0) return null;
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                isActive
                  ? `${config.activeBg} text-white`
                  : "bg-white border border-gray-200 text-slate-600 hover:border-yellow-400"
              }`}
            >
              <config.icon className="w-3.5 h-3.5" />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Files List */}
      {filteredFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-slate-900">
              {activeCategory === "all"
                ? "Tutti i File"
                : FILE_CATEGORIES[activeCategory]?.label}
            </span>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
              {filteredFiles.length}
            </span>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredFiles.map((f, idx) => {
              const config = FILE_CATEGORIES[f.category] || FILE_CATEGORIES.document;
              const Icon = config.icon;
              return (
                <div
                  key={f.file_id || f.filename || idx}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.iconBg}`}
                  >
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {f.original_name ||
                        f.filename ||
                        f.document_type?.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-slate-400">
                      {config.label} • {f.size_readable || "N/A"}
                      {f.uploaded_at &&
                        ` • ${new Date(f.uploaded_at).toLocaleDateString("it-IT")}`}
                    </div>
                  </div>
                  {f.status && (
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        f.status === "verified" || f.status === "approved"
                          ? "bg-emerald-100 text-emerald-600"
                          : f.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {f.status === "verified" || f.status === "approved"
                        ? "✓ Verificato"
                        : f.status === "rejected"
                        ? "✗ Rifiutato"
                        : "In attesa"}
                    </span>
                  )}
                  {f.internal_url && (
                    <button
                      onClick={() =>
                        window.open(f.internal_url.replace("/api", ""), "_blank")
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-50 border border-gray-200 hover:border-yellow-400 transition-colors text-slate-600"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Scarica
                    </button>
                  )}
                  {f.file_id && (
                    <button
                      onClick={() => handleDelete(f)}
                      title="Elimina file"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 hover:border-red-400 hover:bg-red-100 transition-colors text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Elimina
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allFiles.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <FolderOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-slate-900 mb-2">Nessun file caricato</h3>
          <p className="text-sm text-slate-400 mb-4">
            Qui appariranno tutti i tuoi file: script, posizionamento, video, documenti e
            distinte di pagamento.
          </p>
          <p className="text-xs text-slate-400">
            Usa i pulsanti sopra per caricare i tuoi primi file.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 mb-1">
              I tuoi file sono al sicuro
            </p>
            <p className="text-xs text-slate-600">
              Tutti i file caricati sono conservati in modo sicuro e accessibili solo a te e al
              team Evolution PRO. I file vengono verificati entro 24-48 ore dal caricamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnerFilesPage;
