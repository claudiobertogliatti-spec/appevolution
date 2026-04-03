import { useState, useEffect, useRef } from "react";
import { 
  FileText, Upload, Film, Loader2, CheckCircle, AlertCircle,
  FolderOpen, Image, File, X, CloudUpload
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNER FILES - I Miei File
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerFiles({ partner }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  
  const youtubePlaylistId = partner?.youtube_playlist_id || partner?.yt_playlist_id;
  
  useEffect(() => {
    if (partner?.id) {
      fetchDocuments();
    }
  }, [partner]);
  
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);
  
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Error fetching documents:", e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async (files) => {
    if (!files || files.length === 0 || !partner?.id) return;
    
    setUploading(true);
    setUploadError(null);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('is_raw', 'true'); // Marca come materiale RAW
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/files/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        setUploadSuccess(true);
        fetchDocuments();
      } else {
        const err = await res.json();
        setUploadError(err.detail || "Errore durante il caricamento");
      }
    } catch (e) {
      setUploadError("Errore di connessione");
    } finally {
      setUploading(false);
    }
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files);
    }
  };
  
  const pdfDocs = documents.filter(d => d.type === 'pdf' || d.name?.endsWith('.pdf'));
  const rawDocs = documents.filter(d => d.is_raw);
  const otherDocs = documents.filter(d => !d.is_raw && d.type !== 'pdf' && !d.name?.endsWith('.pdf'));
  
  const getFileIcon = (doc) => {
    const name = doc.name || doc.filename || '';
    if (name.endsWith('.pdf') || doc.type === 'pdf') return <FileText className="w-6 h-6 text-red-500" />;
    if (name.match(/\.(mp4|mov|avi|mkv)$/i) || doc.type === 'video') return <Film className="w-6 h-6 text-purple-500" />;
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i) || doc.type === 'image') return <Image className="w-6 h-6 text-blue-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };
  
  return (
    <div className="min-h-full p-6" style={{ background: "#FAFAF7" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
               style={{ background: "linear-gradient(135deg, #7B68AE, #9B8BC4)" }}>
            <FolderOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>I Miei File</h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Documenti, video e materiali del tuo progetto</p>
          </div>
        </div>
        
        {/* Messages */}
        {uploadSuccess && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "#DCFCE7" }}>
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">File caricato con successo! In attesa di revisione.</span>
          </div>
        )}
        {uploadError && (
          <div className="mb-6 p-4 rounded-xl flex items-center justify-between" style={{ background: "#FEE2E2" }}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
        
        {/* Upload Area */}
        <div 
          className={`mb-8 p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
            dragActive ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-white hover:border-yellow-400 hover:bg-yellow-50/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="upload-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,.pdf,.doc,.docx"
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          {uploading ? (
            <div>
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" style={{ color: "#F2C418" }} />
              <p className="font-medium" style={{ color: "#1E2128" }}>Caricamento in corso...</p>
            </div>
          ) : (
            <>
              <CloudUpload className="w-12 h-12 mx-auto mb-3" style={{ color: dragActive ? "#F2C418" : "#9CA3AF" }} />
              <p className="font-bold mb-1" style={{ color: "#1E2128" }}>Carica Materiale</p>
              <p className="text-sm text-gray-500 mb-3">
                Trascina qui i tuoi file o clicca per selezionarli
              </p>
              <p className="text-xs text-gray-400">
                Video, Audio, PDF, Documenti • Max 100MB per file
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                   style={{ background: "#FFF8DC", color: "#92700C" }}>
                <Upload className="w-4 h-4" />
                I file saranno contrassegnati come "RAW" per la revisione
              </div>
            </>
          )}
        </div>
        
        {/* YouTube Videocourse */}
        {youtubePlaylistId && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#1E2128" }}>
              <Film className="w-5 h-5 text-red-600" />
              Il Mio Videocorso
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid #ECEDEF" }}>
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/videoseries?list=${youtubePlaylistId}`}
                  title="Il mio videocorso"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="youtube-player"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Documents Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Caricamento documenti...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Raw Materials */}
            {rawDocs.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#1E2128" }}>
                  <Upload className="w-5 h-5 text-orange-500" />
                  Materiali Caricati
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                    {rawDocs.length} RAW
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawDocs.map((doc, idx) => (
                    <DocumentCard key={idx} doc={doc} getFileIcon={getFileIcon} isRaw />
                  ))}
                </div>
              </div>
            )}
            
            {/* PDFs */}
            {pdfDocs.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#1E2128" }}>
                  <FileText className="w-5 h-5 text-red-500" />
                  Documenti PDF
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfDocs.map((doc, idx) => (
                    <DocumentCard key={idx} doc={doc} getFileIcon={getFileIcon} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Other Files */}
            {otherDocs.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#1E2128" }}>
                  <FolderOpen className="w-5 h-5 text-gray-500" />
                  Altri File
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherDocs.map((doc, idx) => (
                    <DocumentCard key={idx} doc={doc} getFileIcon={getFileIcon} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty State */}
            {documents.length === 0 && !youtubePlaylistId && (
              <div className="text-center py-12 bg-white rounded-2xl" style={{ border: "1px solid #ECEDEF" }}>
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-500 mb-2">Nessun file presente</p>
                <p className="text-sm text-gray-400">
                  Carica i tuoi primi materiali usando l'area sopra
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Document Card Component
function DocumentCard({ doc, getFileIcon, isRaw }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
         style={{ border: isRaw ? "2px solid #F97316" : "1px solid #ECEDEF" }}>
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isRaw ? "bg-orange-100" : "bg-gray-100"
        }`}>
          {getFileIcon(doc)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: "#1E2128" }}>
            {doc.name || doc.filename || "Documento"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {doc.created_at ? new Date(doc.created_at).toLocaleDateString('it-IT') : '-'}
            </span>
            {isRaw && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold">
                RAW
              </span>
            )}
          </div>
        </div>
      </div>
      {doc.url && (
        <a 
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-center block transition-colors"
          style={{ background: "#FAFAF7", color: "#1E2128" }}
        >
          Visualizza
        </a>
      )}
    </div>
  );
}

export default PartnerFiles;
