import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Download, Upload, Shield, FolderOpen, FileVideo, 
  FileCheck, Trash2, Eye, Loader2, CheckCircle, XCircle, 
  ExternalLink, Play, FileAudio, Image, Receipt,
  Target, Mic, Mail, PenLine
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// File category configuration
const FILE_CATEGORIES = {
  contratto_firmato: {
    icon: FileCheck,
    label: "Contratto Firmato",
    color: "#22C55E",
    bgColor: "#22C55E20",
    description: "Il tuo contratto di partnership firmato"
  },
  posizionamento: {
    icon: Target,
    label: "Posizionamento",
    color: "#7B68AE",
    bgColor: "#7B68AE20",
    description: "Scheda posizionamento completata"
  },
  script: {
    icon: PenLine,
    label: "Script Masterclass",
    color: "#F59E0B",
    bgColor: "#F59E0B20",
    description: "Script approvato per la masterclass"
  },
  video: {
    icon: FileVideo,
    label: "Video",
    color: "#EF4444",
    bgColor: "#EF444420",
    description: "Video caricati per il corso"
  },
  audio: {
    icon: FileAudio,
    label: "Audio",
    color: "#8B5CF6",
    bgColor: "#8B5CF620",
    description: "File audio e podcast"
  },
  document: {
    icon: FileText,
    label: "Documenti PDF",
    color: "#3B82F6",
    bgColor: "#3B82F620",
    description: "Documenti e risorse PDF"
  },
  distinta: {
    icon: Receipt,
    label: "Distinte di Pagamento",
    color: "#10B981",
    bgColor: "#10B98120",
    description: "Ricevute e distinte di pagamento"
  },
  image: {
    icon: Image,
    label: "Immagini",
    color: "#EC4899",
    bgColor: "#EC489920",
    description: "Foto e immagini del brand"
  },
  email: {
    icon: Mail,
    label: "Email Approvate",
    color: "#06B6D4",
    bgColor: "#06B6D420",
    description: "Sequenze email approvate"
  },
  onboarding: {
    icon: Shield,
    label: "Documenti Onboarding",
    color: "#84CC16",
    bgColor: "#84CC1620",
    description: "Documenti di identità e fiscali"
  }
};

export function PartnerFilesPage({ partner }) {
  const [files, setFiles] = useState({});
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [youtubeStatus, setYoutubeStatus] = useState({ authenticated: false, loading: true });
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
    loadYoutubeVideos();
    checkYoutubeStatus();
  }, [partner]);

  const checkYoutubeStatus = async () => {
    try {
      const r = await axios.get(`${API}/youtube/status`);
      setYoutubeStatus({ authenticated: r.data.authenticated, loading: false });
    } catch (e) {
      setYoutubeStatus({ authenticated: false, loading: false });
    }
  };

  const loadYoutubeVideos = async () => {
    if (!partner?.id) return;
    try {
      const r = await axios.get(`${API}/youtube/partner/${partner.id}/videos`);
      if (r.data.success) {
        setYoutubeVideos(r.data.videos || []);
      }
    } catch (e) {
      console.error('Error loading YouTube videos:', e);
    }
  };

  const loadFiles = async () => {
    if (!partner?.id) return;
    try {
      const r = await axios.get(`${API}/files/partner/${partner.id}`);
      if (r.data.files) {
        setFiles(r.data.files);
      }
    } catch (e) {
      console.error('Error loading files:', e);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !partner?.id || !videoTitle.trim()) return;
    
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("video_title", videoTitle);
      fd.append("lesson_title", videoTitle);
      fd.append("module_title", "Videocorso");
      
      await axios.post(`${API}/youtube/partner/${partner.id}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setShowVideoModal(false);
      setVideoTitle("");
      setTimeout(loadYoutubeVideos, 5000);
      alert("✅ Video in caricamento! Apparirà nella tua playlist YouTube a breve.");
    } catch (e) {
      console.error('Video upload error:', e);
      alert("Errore durante il caricamento: " + (e.response?.data?.detail || e.message));
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleDocUpload = async (e, category = "document") => {
    const file = e.target.files[0];
    if (!file || !partner?.id) return;
    
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("partner_id", partner.id);
      fd.append("category", category);
      await axios.post(`${API}/files/upload`, fd);
      await loadFiles();
    } catch (e) {
      console.error('Upload error:', e);
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // Flatten all files into a single array with category info
  const getAllFiles = () => {
    const allFiles = [];
    Object.entries(files).forEach(([category, fileList]) => {
      if (Array.isArray(fileList)) {
        fileList.forEach(f => {
          allFiles.push({ ...f, category });
        });
      }
    });
    return allFiles;
  };

  const allFiles = getAllFiles();
  const filteredFiles = activeCategory === "all" 
    ? allFiles 
    : allFiles.filter(f => f.category === activeCategory);

  // Count files by category
  const fileCounts = {};
  allFiles.forEach(f => {
    fileCounts[f.category] = (fileCounts[f.category] || 0) + 1;
  });

  return (
    <div className="space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
             style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
          <FolderOpen className="w-4 h-4" />
          I Miei File
        </div>
        <h1 className="text-2xl font-bold text-[#1E2128] mb-2">
          Tutti i tuoi <span style={{ color: '#F5C518' }}>Materiali</span>
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-lg mx-auto">
          Qui trovi tutti i file che hai caricato durante il percorso: script, posizionamento, video, documenti e distinte di pagamento.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
        <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#F5C518]"/>
          Carica nuovi file
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Video Upload */}
          <div className="border-2 border-dashed border-red-200 rounded-xl p-4 text-center hover:border-red-400 cursor-pointer transition-colors bg-red-50/30"
               onClick={() => {
                 const input = document.createElement('input');
                 input.type = 'file';
                 input.accept = 'video/*';
                 input.onchange = (e) => handleDocUpload(e, "video");
                 input.click();
               }}>
            <FileVideo className="w-6 h-6 text-red-500 mx-auto mb-2"/>
            <div className="font-bold text-xs text-[#1E2128]">Video</div>
            <div className="text-[10px] text-[#9CA3AF]">MP4, MOV, AVI...</div>
          </div>
          
          {/* Document Upload */}
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center hover:border-blue-400 cursor-pointer transition-colors bg-blue-50/30"
               onClick={() => docInputRef.current?.click()}>
            <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx" onChange={(e) => handleDocUpload(e, "document")} className="hidden"/>
            <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2"/>
            <div className="font-bold text-xs text-[#1E2128]">Documenti PDF</div>
            <div className="text-[10px] text-[#9CA3AF]">PDF, DOCX, XLSX</div>
          </div>
          
          {/* Audio Upload */}
          <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 text-center hover:border-purple-400 cursor-pointer transition-colors bg-purple-50/30"
               onClick={() => {
                 const input = document.createElement('input');
                 input.type = 'file';
                 input.accept = 'audio/*';
                 input.onchange = (e) => handleDocUpload(e, "audio");
                 input.click();
               }}>
            <FileAudio className="w-6 h-6 text-purple-500 mx-auto mb-2"/>
            <div className="font-bold text-xs text-[#1E2128]">Audio</div>
            <div className="text-[10px] text-[#9CA3AF]">MP3, WAV</div>
          </div>
          
          {/* Image Upload */}
          <div className="border-2 border-dashed border-pink-200 rounded-xl p-4 text-center hover:border-pink-400 cursor-pointer transition-colors bg-pink-50/30"
               onClick={() => {
                 const input = document.createElement('input');
                 input.type = 'file';
                 input.accept = 'image/*';
                 input.onchange = (e) => handleDocUpload(e, "image");
                 input.click();
               }}>
            <Image className="w-6 h-6 text-pink-500 mx-auto mb-2"/>
            <div className="font-bold text-xs text-[#1E2128]">Immagini</div>
            <div className="text-[10px] text-[#9CA3AF]">JPG, PNG</div>
          </div>
        </div>
        
        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[#F5C518]">
            <Loader2 className="w-4 h-4 animate-spin"/>
            Caricamento in corso...
          </div>
        )}
      </div>

      {/* YouTube Video Upload Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVideoModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-500"/>
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1E2128]">Carica Video su YouTube</h3>
                <p className="text-xs text-[#9CA3AF]">Il video verrà aggiunto alla tua playlist</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E2128] mb-1">Titolo del Video *</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Es: Lezione 1 - Introduzione"
                  className="w-full p-3 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#1E2128] mb-1">File Video</label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={!videoTitle.trim() || uploadingVideo}
                  className="w-full p-2 text-sm"
                />
              </div>
              
              {uploadingVideo && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  Caricamento su YouTube in corso...
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5F6572] hover:bg-[#FAFAF7] transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeCategory === "all" 
              ? "bg-[#F5C518] text-black" 
              : "bg-white border border-[#ECEDEF] text-[#5F6572] hover:border-[#F5C518]"
          }`}
        >
          Tutti ({allFiles.length})
        </button>
        {Object.entries(FILE_CATEGORIES).map(([key, config]) => {
          const count = fileCounts[key] || 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeCategory === key 
                  ? "text-white" 
                  : "bg-white border border-[#ECEDEF] hover:border-[#F5C518]"
              }`}
              style={{ 
                background: activeCategory === key ? config.color : undefined,
                color: activeCategory === key ? 'white' : '#5F6572'
              }}
            >
              <config.icon className="w-3.5 h-3.5" />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* YouTube Videos Section */}
      {youtubeVideos.length > 0 && (activeCategory === "all" || activeCategory === "video") && (
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2 bg-red-50/30">
            <Youtube className="w-5 h-5 text-red-500"/>
            <span className="font-bold text-[#1E2128]">Video su YouTube</span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              {youtubeVideos.length}
            </span>
          </div>
          <div className="divide-y divide-[#ECEDEF]">
            {youtubeVideos.map(v => (
              <div key={v.video_id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAF7] transition-colors">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt={v.title} className="w-24 h-14 rounded-lg object-cover"/>
                ) : (
                  <div className="w-24 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Play className="w-6 h-6 text-gray-400"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#1E2128] truncate">{v.title}</div>
                  <div className="text-xs text-[#9CA3AF]">
                    Posizione: {v.position + 1} • {new Date(v.added_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <a 
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5"/>
                  Apri
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List */}
      {filteredFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#ECEDEF] flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#F5C518]"/>
            <span className="font-bold text-[#1E2128]">
              {activeCategory === "all" ? "Tutti i File" : FILE_CATEGORIES[activeCategory]?.label}
            </span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEF9E7] text-[#C4990A]">
              {filteredFiles.length}
            </span>
          </div>
          <div className="divide-y divide-[#ECEDEF]">
            {filteredFiles.map((f, idx) => {
              const config = FILE_CATEGORIES[f.category] || FILE_CATEGORIES.document;
              const Icon = config.icon;
              return (
                <div key={f.file_id || f.filename || idx} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAF7] transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                       style={{ background: config.bgColor }}>
                    <Icon className="w-5 h-5" style={{ color: config.color }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1E2128] truncate">
                      {f.original_name || f.filename || f.document_type?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-[#9CA3AF]">
                      {config.label} • {f.size_readable || 'N/A'}
                      {f.uploaded_at && ` • ${new Date(f.uploaded_at).toLocaleDateString('it-IT')}`}
                    </div>
                  </div>
                  {f.status && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      f.status === "verified" || f.status === "approved" 
                        ? "bg-green-100 text-green-600" 
                        : f.status === "rejected" 
                        ? "bg-red-100 text-red-600" 
                        : "bg-yellow-100 text-yellow-600"
                    }`}>
                      {f.status === "verified" || f.status === "approved" ? "✓ Verificato" : 
                       f.status === "rejected" ? "✗ Rifiutato" : "In attesa"}
                    </span>
                  )}
                  {f.internal_url && (
                    <button 
                      onClick={() => window.open(`${API}${f.internal_url.replace('/api','')}`, "_blank")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#FAFAF7] border border-[#ECEDEF] hover:border-[#F5C518] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5"/>
                      Scarica
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allFiles.length === 0 && youtubeVideos.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] p-12 text-center">
          <FolderOpen className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4"/>
          <h3 className="font-bold text-lg text-[#1E2128] mb-2">Nessun file caricato</h3>
          <p className="text-sm text-[#9CA3AF] mb-4">
            Qui appariranno tutti i tuoi file: script, posizionamento, video, documenti e distinte di pagamento.
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Usa i pulsanti sopra per caricare i tuoi primi file.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[#FEF9E7] rounded-xl p-4 border border-[#F5C518]/30">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#C4990A] flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-bold text-[#92700C] mb-1">I tuoi file sono al sicuro</p>
            <p className="text-xs text-[#5F6572]">
              Tutti i file caricati sono conservati in modo sicuro e accessibili solo a te e al team EvolutionPro.
              I file vengono verificati entro 24-48 ore dal caricamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnerFilesPage;
