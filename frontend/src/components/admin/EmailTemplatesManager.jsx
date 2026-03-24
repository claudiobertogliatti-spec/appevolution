import { useState, useEffect } from "react";
import { 
  Mail, Save, Loader2, CheckCircle, AlertCircle, Eye, RefreshCw,
  ChevronDown, ChevronUp, Code, FileText, X, Edit3
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Edit form state
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/admin/email-templates`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError("Errore nel caricamento dei template");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectTemplate = async (templateId) => {
    try {
      const response = await fetch(`${API}/api/admin/email-templates/${templateId}`);
      const template = await response.json();
      setSelectedTemplate(template);
      setEditSubject(template.subject || "");
      setEditBody(template.body_html || "");
      setEditMode(false);
      setPreviewMode(false);
    } catch (err) {
      setError("Errore nel caricamento del template");
    }
  };
  
  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API}/api/admin/email-templates/${selectedTemplate.template_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editSubject,
          body_html: editBody,
          description: selectedTemplate.description,
          variables: selectedTemplate.variables
        })
      });
      
      if (!response.ok) throw new Error("Errore nel salvataggio");
      
      setSuccess("Template salvato con successo!");
      setSelectedTemplate(prev => ({
        ...prev,
        subject: editSubject,
        body_html: editBody,
        is_default: false
      }));
      setEditMode(false);
      fetchTemplates();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = async () => {
    if (!selectedTemplate || !window.confirm("Vuoi ripristinare il template al default?")) return;
    
    try {
      const response = await fetch(`${API}/api/admin/email-templates/${selectedTemplate.template_id}/reset`, {
        method: "POST"
      });
      
      if (!response.ok) throw new Error("Errore nel reset");
      
      setSuccess("Template ripristinato al default!");
      handleSelectTemplate(selectedTemplate.template_id);
      fetchTemplates();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handlePreview = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await fetch(`${API}/api/admin/email-templates/${selectedTemplate.template_id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: {} })
      });
      
      const data = await response.json();
      setPreviewHtml(data.html_body);
      setPreviewMode(true);
    } catch (err) {
      setError("Errore nella preview");
    }
  };
  
  const getCategoryColor = (category) => {
    switch (category) {
      case "partnership": return "bg-indigo-100 text-indigo-700";
      case "analisi": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Template Email</h1>
              <p className="text-gray-500 text-sm">Modifica i template senza bisogno di deploy</p>
            </div>
          </div>
          <button
            onClick={fetchTemplates}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Aggiorna
          </button>
        </div>
        
        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Template Disponibili</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {templates.map(template => (
                <button
                  key={template.template_id}
                  onClick={() => handleSelectTemplate(template.template_id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-all ${
                    selectedTemplate?.template_id === template.template_id ? 'bg-indigo-50' : ''
                  }`}
                  data-testid={`template-item-${template.template_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {template.template_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {template.description || template.subject}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(template.category)}`}>
                        {template.category || "altro"}
                      </span>
                      {template.is_default && (
                        <span className="text-xs text-gray-400">default</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Template Editor */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {selectedTemplate ? (
              <>
                {/* Editor Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">
                      {selectedTemplate.template_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedTemplate.is_default && (
                      <button
                        onClick={handleReset}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Ripristina Default
                      </button>
                    )}
                    <button
                      onClick={handlePreview}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      data-testid="btn-preview-template"
                    >
                      <Eye className="w-4 h-4" />
                      Anteprima
                    </button>
                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        data-testid="btn-edit-template"
                      >
                        <Edit3 className="w-4 h-4" />
                        Modifica
                      </button>
                    ) : (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        data-testid="btn-save-template"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salva
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Variables Info */}
                {selectedTemplate.variables?.length > 0 && (
                  <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">Variabili disponibili: </span>
                    <span className="text-xs text-blue-600">
                      {selectedTemplate.variables.map(v => `{{${v}}}`).join(", ")}
                    </span>
                  </div>
                )}
                
                {/* Editor Content */}
                <div className="p-4 space-y-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Oggetto</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        data-testid="input-template-subject"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700">
                        {selectedTemplate.subject}
                      </div>
                    )}
                  </div>
                  
                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corpo Email (HTML)
                    </label>
                    {editMode ? (
                      <textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                        data-testid="input-template-body"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 rounded-lg overflow-x-auto max-h-96">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {selectedTemplate.body_html?.substring(0, 2000)}
                          {selectedTemplate.body_html?.length > 2000 && "..."}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preview Modal */}
                {previewMode && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                    onClick={() => setPreviewMode(false)}
                  >
                    <div 
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Anteprima Email</h3>
                        <button onClick={() => setPreviewMode(false)}>
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      <div className="p-4 overflow-auto max-h-[70vh]">
                        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <FileText className="w-12 h-12 mb-3" />
                <p>Seleziona un template per modificarlo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplatesManager;
