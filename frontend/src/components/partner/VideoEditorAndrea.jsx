import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, Upload, Scissors, Film, Type, MessageSquare, 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Download, Loader2, Check, X, Plus, Trash2, Clock, FileText
} from "lucide-react";

import { API_URL, API } from '../../utils/api-config';

// ============================================
// VIDEO EDITOR ANDREA
// ============================================
export function VideoEditorAndrea({ partner, onBack }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [videoFile, setVideoFile] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [subtitles, setSubtitles] = useState(null);
  const [exportedVideos, setExportedVideos] = useState([]);
  
  // Trim/Cut state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(0);
  
  // Text overlay state
  const [overlayText, setOverlayText] = useState("");
  const [overlayPosition, setOverlayPosition] = useState("center");
  const [overlayStartTime, setOverlayStartTime] = useState(0);
  const [overlayEndTime, setOverlayEndTime] = useState(null);
  
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  // Handle video upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    setProcessingStatus("Caricamento video...");
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API}/editor/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setVideoFile(data);
      setVideoInfo(data.info);
      setVideoUrl(`${API}/editor/files/${data.filename}`);
      setTrimEnd(data.info?.duration || 0);
      setActiveTab("edit");
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Errore durante il caricamento: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Generate subtitles
  const handleGenerateSubtitles = async () => {
    if (!videoFile?.path) return;
    
    setIsProcessing(true);
    setProcessingStatus("Andrea sta trascrivendo il video...");
    
    try {
      const response = await fetch(
        `${API}/editor/subtitles/generate?video_path=${encodeURIComponent(videoFile.path)}&language=it`,
        { method: 'POST' }
      );
      
      if (!response.ok) throw new Error('Transcription failed');
      
      const data = await response.json();
      setSubtitles(data);
      
    } catch (error) {
      console.error('Subtitle error:', error);
      alert('Errore: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Trim video
  const handleTrim = async () => {
    if (!videoFile?.path) return;
    
    setIsProcessing(true);
    setProcessingStatus("Andrea sta tagliando il video...");
    
    try {
      const response = await fetch(`${API}/editor/trim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoFile.path,
          start_time: trimStart,
          end_time: trimEnd
        })
      });
      
      if (!response.ok) throw new Error('Trim failed');
      
      const data = await response.json();
      const filename = data.output_path.split('/').pop();
      setExportedVideos(prev => [...prev, {
        name: `Taglio ${formatTime(trimStart)}-${formatTime(trimEnd)}`,
        filename,
        url: `${API}/editor/files/${filename}`,
        duration: data.duration
      }]);
      
    } catch (error) {
      console.error('Trim error:', error);
      alert('Errore: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Cut segment
  const handleCut = async () => {
    if (!videoFile?.path) return;
    
    setIsProcessing(true);
    setProcessingStatus("Andrea sta rimuovendo il segmento...");
    
    try {
      const response = await fetch(`${API}/editor/cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoFile.path,
          cut_start: cutStart,
          cut_end: cutEnd
        })
      });
      
      if (!response.ok) throw new Error('Cut failed');
      
      const data = await response.json();
      const filename = data.output_path.split('/').pop();
      setExportedVideos(prev => [...prev, {
        name: `Rimosso ${formatTime(cutStart)}-${formatTime(cutEnd)}`,
        filename,
        url: `${API}/editor/files/${filename}`,
        removed_duration: data.removed_duration
      }]);
      
    } catch (error) {
      console.error('Cut error:', error);
      alert('Errore: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Add intro/outro
  const handleAddBranding = async () => {
    if (!videoFile?.path) return;
    
    setIsProcessing(true);
    setProcessingStatus("Andrea sta aggiungendo intro/outro...");
    
    try {
      const response = await fetch(`${API}/editor/intro-outro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoFile.path,
          intro_path: "auto",
          outro_path: "auto",
          partner_name: partnerName
        })
      });
      
      if (!response.ok) throw new Error('Branding failed');
      
      const data = await response.json();
      const filename = data.output_path.split('/').pop();
      setExportedVideos(prev => [...prev, {
        name: `Video con Intro/Outro`,
        filename,
        url: `${API}/editor/files/${filename}`
      }]);
      
    } catch (error) {
      console.error('Branding error:', error);
      alert('Errore: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Burn subtitles
  const handleBurnSubtitles = async () => {
    if (!videoFile?.path || !subtitles?.srt_path) return;
    
    setIsProcessing(true);
    setProcessingStatus("Andrea sta incorporando i sottotitoli...");
    
    try {
      const response = await fetch(`${API}/editor/subtitles/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoFile.path,
          srt_path: subtitles.srt_path,
          font_size: 24,
          position: "bottom"
        })
      });
      
      if (!response.ok) throw new Error('Burn subtitles failed');
      
      const data = await response.json();
      const filename = data.output_path.split('/').pop();
      setExportedVideos(prev => [...prev, {
        name: `Video con Sottotitoli`,
        filename,
        url: `${API}/editor/files/${filename}`
      }]);
      
    } catch (error) {
      console.error('Burn error:', error);
      alert('Errore: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Add text overlay
  const handleAddTextOverlay = async () => {
    if (!videoFile?.path || !overlayText) return;
    
    setIsProcessing(true);
    setProcessingStatus("Andrea sta aggiungendo il testo...");
    
    try {
      const response = await fetch(`${API}/editor/text-overlay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoFile.path,
          text: overlayText,
          start_time: overlayStartTime,
          end_time: overlayEndTime || videoInfo?.duration,
          position: overlayPosition,
          font_size: 48,
          font_color: "white",
          bg_color: "black"
        })
      });
      
      if (!response.ok) throw new Error('Text overlay failed');
      
      const data = await response.json();
      const filename = data.output_path.split('/').pop();
      setExportedVideos(prev => [...prev, {
        name: `Video con Testo: "${overlayText.substring(0, 20)}..."`,
        filename,
        url: `${API}/editor/files/${filename}`
      }]);
      
    } catch (error) {
      console.error('Overlay error:', error);
      alert('Errore: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Video player controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="p-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#5F6572' }} />
          </button>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
              🎬 Video Editor di Andrea
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Editing base: taglia, unisci, sottotitoli automatici
            </p>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#7B68AE' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1E2128' }}>
              {processingStatus}
            </h3>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Questo potrebbe richiedere qualche minuto...
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                     style={{ background: '#F2C41820' }}>
                  <Upload className="w-10 h-10" style={{ color: '#F2C418' }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                  Carica il tuo video
                </h2>
                <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                  Andrea si occuperà di tutto l'editing
                </p>
                
                <label className="inline-block cursor-pointer">
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <div className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:scale-105"
                       style={{ background: '#7B68AE' }}>
                    Seleziona Video
                  </div>
                </label>
                
                <p className="text-xs mt-4" style={{ color: '#9CA3AF' }}>
                  Formati supportati: MP4, MOV, AVI, MKV
                </p>
              </div>
            </div>
          )}

          {/* Edit Tab - Video Preview */}
          {activeTab === "edit" && videoUrl && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Video Player */}
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full max-h-[400px]"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                />
                
                {/* Play button overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      onClick={togglePlay}
                      className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.9)' }}
                    >
                      <Play className="w-8 h-8 ml-1" style={{ color: '#1E2128' }} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Controls */}
              <div className="p-4" style={{ background: '#1E2128' }}>
                {/* Progress bar */}
                <div className="relative h-2 rounded-full mb-4 cursor-pointer"
                     style={{ background: '#3B4049' }}
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const x = e.clientX - rect.left;
                       const percent = x / rect.width;
                       seekTo(percent * duration);
                     }}>
                  <div className="absolute h-full rounded-full"
                       style={{ 
                         width: `${(currentTime / duration) * 100}%`,
                         background: '#F2C418'
                       }} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => seekTo(Math.max(0, currentTime - 5))}
                            className="p-2 rounded-lg hover:bg-gray-700">
                      <SkipBack className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={togglePlay}
                            className="p-2 rounded-lg hover:bg-gray-700">
                      {isPlaying ? 
                        <Pause className="w-5 h-5 text-white" /> : 
                        <Play className="w-5 h-5 text-white" />
                      }
                    </button>
                    <button onClick={() => seekTo(Math.min(duration, currentTime + 5))}
                            className="p-2 rounded-lg hover:bg-gray-700">
                      <SkipForward className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  
                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
              
              {/* Video Info */}
              {videoInfo && (
                <div className="p-4 grid grid-cols-4 gap-4 text-center border-t"
                     style={{ borderColor: '#ECEDEF' }}>
                  <div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>Durata</div>
                    <div className="font-bold" style={{ color: '#1E2128' }}>
                      {formatTime(videoInfo.duration)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>Risoluzione</div>
                    <div className="font-bold" style={{ color: '#1E2128' }}>
                      {videoInfo.width}x{videoInfo.height}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>FPS</div>
                    <div className="font-bold" style={{ color: '#1E2128' }}>
                      {Math.round(videoInfo.fps)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>Dimensione</div>
                    <div className="font-bold" style={{ color: '#1E2128' }}>
                      {(videoInfo.size_bytes / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editing Tools */}
          {activeTab === "edit" && videoFile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trim Tool */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Scissors className="w-5 h-5" style={{ color: '#7B68AE' }} />
                  <h3 className="font-bold" style={{ color: '#1E2128' }}>Taglia Video</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                  Estrai un segmento specifico del video
                </p>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Inizio (sec)</label>
                      <input 
                        type="number" 
                        value={trimStart}
                        onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={videoInfo?.duration || 0}
                        step={0.1}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: '#ECEDEF' }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Fine (sec)</label>
                      <input 
                        type="number" 
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={videoInfo?.duration || 0}
                        step={0.1}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: '#ECEDEF' }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleTrim}
                    disabled={isProcessing}
                    className="w-full py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: '#7B68AE' }}
                  >
                    Taglia Segmento
                  </button>
                </div>
              </div>

              {/* Cut Tool */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Trash2 className="w-5 h-5" style={{ color: '#EF4444' }} />
                  <h3 className="font-bold" style={{ color: '#1E2128' }}>Rimuovi Segmento</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                  Elimina una parte indesiderata del video
                </p>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Da (sec)</label>
                      <input 
                        type="number" 
                        value={cutStart}
                        onChange={(e) => setCutStart(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={videoInfo?.duration || 0}
                        step={0.1}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: '#ECEDEF' }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold" style={{ color: '#5F6572' }}>A (sec)</label>
                      <input 
                        type="number" 
                        value={cutEnd}
                        onChange={(e) => setCutEnd(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={videoInfo?.duration || 0}
                        step={0.1}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: '#ECEDEF' }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleCut}
                    disabled={isProcessing}
                    className="w-full py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: '#EF4444' }}
                  >
                    Rimuovi
                  </button>
                </div>
              </div>

              {/* Subtitles Tool */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5" style={{ color: '#34C77B' }} />
                  <h3 className="font-bold" style={{ color: '#1E2128' }}>Sottotitoli Auto</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                  Andrea trascrive l'audio e genera i sottotitoli
                </p>
                
                {!subtitles ? (
                  <button 
                    onClick={handleGenerateSubtitles}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: '#34C77B' }}
                  >
                    Genera Sottotitoli
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ background: '#EAFAF1' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4" style={{ color: '#34C77B' }} />
                        <span className="text-sm font-bold" style={{ color: '#34C77B' }}>
                          Trascrizione completata!
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#5F6572' }}>
                        {subtitles.segments?.length || 0} segmenti generati
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={handleBurnSubtitles}
                        disabled={isProcessing}
                        className="flex-1 py-2 rounded-lg font-bold text-xs text-white"
                        style={{ background: '#7B68AE' }}
                      >
                        Incorpora nel Video
                      </button>
                      <a 
                        href={`${API}/editor/subtitles/${subtitles.srt_filename}`}
                        download
                        className="flex-1 py-2 rounded-lg font-bold text-xs text-center"
                        style={{ background: '#FAFAF7', color: '#5F6572' }}
                      >
                        Scarica SRT
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Branding Tool */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5" style={{ color: '#F2C418' }} />
                  <h3 className="font-bold" style={{ color: '#1E2128' }}>Intro & Outro</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                  Aggiungi automaticamente intro e outro brandizzati
                </p>
                
                <button 
                  onClick={handleAddBranding}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90"
                  style={{ background: '#F2C418', color: '#1E2128' }}
                >
                  Aggiungi Branding
                </button>
              </div>

              {/* Text Overlay Tool */}
              <div className="bg-white rounded-xl p-5 shadow-sm md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Type className="w-5 h-5" style={{ color: '#3B82F6' }} />
                  <h3 className="font-bold" style={{ color: '#1E2128' }}>Aggiungi Testo</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Testo da mostrare</label>
                    <input 
                      type="text" 
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="Es: Benvenuto nel corso!"
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#ECEDEF' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Posizione</label>
                    <select 
                      value={overlayPosition}
                      onChange={(e) => setOverlayPosition(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#ECEDEF' }}
                    >
                      <option value="center">Centro</option>
                      <option value="top">Alto</option>
                      <option value="bottom">Basso</option>
                      <option value="top-left">Alto Sinistra</option>
                      <option value="top-right">Alto Destra</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Da (sec)</label>
                    <input 
                      type="number" 
                      value={overlayStartTime}
                      onChange={(e) => setOverlayStartTime(parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.1}
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#ECEDEF' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold" style={{ color: '#5F6572' }}>A (sec) - vuoto = fine</label>
                    <input 
                      type="number" 
                      value={overlayEndTime || ''}
                      onChange={(e) => setOverlayEndTime(e.target.value ? parseFloat(e.target.value) : null)}
                      min={0}
                      step={0.1}
                      placeholder="Fine video"
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#ECEDEF' }}
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleAddTextOverlay}
                      disabled={isProcessing || !overlayText}
                      className="w-full py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90"
                      style={{ background: '#3B82F6' }}
                    >
                      Aggiungi Testo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Exports */}
        <div className="space-y-6">
          {/* Andrea Assistant */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                   style={{ background: '#7B68AE20' }}>
                <span className="text-2xl">🎬</span>
              </div>
              <div>
                <h3 className="font-bold" style={{ color: '#1E2128' }}>Andrea</h3>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Il tuo video editor AI</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#5F6572' }}>
              {!videoFile 
                ? "Carica un video per iniziare! Ti aiuterò con editing, sottotitoli e branding."
                : "Ottimo video! Usa gli strumenti qui sotto per modificarlo. I file esportati appariranno nella lista."
              }
            </p>
          </div>

          {/* Exported Files */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>
              📁 File Esportati
            </h3>
            
            {exportedVideos.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                     style={{ background: '#FAFAF7' }}>
                  <Download className="w-6 h-6" style={{ color: '#9CA3AF' }} />
                </div>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  I video esportati appariranno qui
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exportedVideos.map((video, index) => (
                  <div key={index} 
                       className="p-3 rounded-lg flex items-center justify-between"
                       style={{ background: '#FAFAF7' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#1E2128' }}>
                        {video.name}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {video.filename}
                      </p>
                    </div>
                    <a 
                      href={video.url}
                      download
                      className="p-2 rounded-lg transition-all hover:bg-gray-200"
                      style={{ background: '#ECEDEF' }}
                    >
                      <Download className="w-4 h-4" style={{ color: '#5F6572' }} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transcription Preview */}
          {subtitles?.text && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold mb-3" style={{ color: '#1E2128' }}>
                📝 Trascrizione
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
                  {subtitles.text}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoEditorAndrea;
