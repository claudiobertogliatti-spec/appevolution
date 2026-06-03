/**
 * Ciak Admin — Template Email. Editor visuale, modifica senza deploy.
 * Portato da components/admin/EmailTemplatesManager.jsx con re-skin palette Ciak.
 */
import { useState, useEffect, useRef } from "react";
import {
  Mail, Save, Loader2, CheckCircle, AlertCircle, Eye, RefreshCw,
  FileText, X, Edit3, Variable, Bold, Italic, Link2, Type,
} from "lucide-react";
import { adminFetch } from "../api";

// Available variables for templates
const TEMPLATE_VARIABLES = [
  { key: "nome", label: "Nome", example: "Mario" },
  { key: "cognome", label: "Cognome", example: "Rossi" },
  { key: "email", label: "Email", example: "mario@example.com" },
  { key: "link_prenotazione", label: "Link Prenotazione", example: "https://calendly.com/..." },
  { key: "booking_link", label: "Booking Link", example: "https://calendly.com/..." },
  { key: "booking_available_date", label: "Data Disponibilità", example: "26 marzo 2026" },
  { key: "bonus_link", label: "Link Bonus", example: "https://ciak.io/bonus" },
];

// Simple Rich Text Editor component
function SimpleRichEditor({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);

  const wrapSelection = (before, after) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newText =
      value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt("Inserisci URL:", "https://");
    if (url) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || "Link";

      const linkHtml = `<a href="${url}" style="color: #D4A017; font-weight: bold;">${selectedText}</a>`;
      const newText = value.substring(0, start) + linkHtml + value.substring(end);
      onChange(newText);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => wrapSelection("<strong>", "</strong>")}
          className="p-2 hover:bg-gray-200 rounded transition-all"
          title="Grassetto"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection("<em>", "</em>")}
          className="p-2 hover:bg-gray-200 rounded transition-all"
          title="Corsivo"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 rounded transition-all"
          title="Inserisci Link"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => wrapSelection('<h2 style="color: #0F172A; margin: 0;">', "</h2>")}
          className="p-2 hover:bg-gray-200 rounded transition-all"
          title="Titolo"
        >
          <Type className="w-4 h-4" />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={18}
        className="w-full px-4 py-3 font-mono text-sm resize-none focus:outline-none min-h-[400px]"
        placeholder={placeholder}
      />
    </div>
  );
}

export function TemplateEmail({ onAuthExpired }) {
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

  const handleAuthError = (err) => {
    if (err.message === "AUTH_EXPIRED") {
      onAuthExpired();
      return true;
    }
    return false;
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/email-templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Errore nel caricamento dei template");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId) => {
    try {
      const res = await adminFetch(`/api/admin/email-templates/${templateId}`);
      const template = await res.json();
      setSelectedTemplate(template);
      setEditSubject(template.subject || "");
      setEditBody(template.body_html || "");
      setEditMode(false);
      setPreviewMode(false);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Errore nel caricamento del template");
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminFetch(
        `/api/admin/email-templates/${selectedTemplate.template_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: editSubject,
            body_html: editBody,
            description: selectedTemplate.description,
            variables: selectedTemplate.variables,
          }),
        }
      );

      if (!res.ok) throw new Error("Errore nel salvataggio");

      setSuccess("Template salvato con successo!");
      setSelectedTemplate((prev) => ({
        ...prev,
        subject: editSubject,
        body_html: editBody,
        is_default: false,
      }));
      setEditMode(false);
      fetchTemplates();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate || !window.confirm("Vuoi ripristinare il template al default?"))
      return;

    try {
      const res = await adminFetch(
        `/api/admin/email-templates/${selectedTemplate.template_id}/reset`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Errore nel reset");

      setSuccess("Template ripristinato al default!");
      handleSelectTemplate(selectedTemplate.template_id);
      fetchTemplates();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    }
  };

  const handlePreview = async () => {
    try {
      const variables = {};
      TEMPLATE_VARIABLES.forEach((v) => {
        variables[v.key] = v.example;
      });

      const res = await adminFetch(
        `/api/admin/email-templates/${selectedTemplate.template_id}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variables }),
        }
      );

      const data = await res.json();
      setPreviewHtml(data.html_body);
      setPreviewMode(true);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Errore nella preview");
    }
  };

  const insertVariable = (varKey) => {
    setEditBody((prev) => prev + `{{${varKey}}}`);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "partnership":
        return "bg-slate-900 text-yellow-400";
      case "analisi":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-slate-600";
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case "partnership":
        return "Partnership";
      case "analisi":
        return "Analisi €67";
      default:
        return "Altro";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <Mail className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Template Email</h1>
            <p className="text-slate-500 text-sm">Editor visuale - modifica senza deploy</p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900"
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
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-slate-900">Template Disponibili</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {templates.map((template) => (
              <button
                key={template.template_id}
                onClick={() => handleSelectTemplate(template.template_id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-all ${
                  selectedTemplate?.template_id === template.template_id
                    ? "bg-yellow-50 border-l-4 border-yellow-500"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm truncate">
                      {template.template_id
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {template.description || template.subject}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getCategoryColor(
                        template.category
                      )}`}
                    >
                      {getCategoryLabel(template.category)}
                    </span>
                    {template.is_default && (
                      <span className="text-xs text-slate-400">default</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {selectedTemplate ? (
            <>
              {/* Editor Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {selectedTemplate.template_id
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </h2>
                  <p className="text-sm text-slate-500">{selectedTemplate.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!selectedTemplate.is_default && (
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
                    >
                      Ripristina Default
                    </button>
                  )}
                  <button
                    onClick={handlePreview}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-slate-600 rounded-lg hover:bg-gray-200"
                  >
                    <Eye className="w-4 h-4" />
                    Anteprima
                  </button>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-900 text-yellow-400 rounded-lg hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                      Modifica
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Salva
                    </button>
                  )}
                </div>
              </div>

              {/* Variables Quick Insert */}
              {editMode && (
                <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                      <Variable className="w-3.5 h-3.5" />
                      Inserisci variabile:
                    </span>
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className="text-xs px-2 py-1 bg-white text-yellow-700 rounded border border-yellow-200 hover:bg-yellow-100 transition-all"
                        title={`Esempio: ${v.example}`}
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor Content */}
              <div className="p-4 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Oggetto Email
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Oggetto dell'email..."
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-slate-600">
                      {selectedTemplate.subject}
                    </div>
                  )}
                </div>

                {/* Body Editor */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Corpo Email (HTML)
                  </label>

                  {editMode ? (
                    <SimpleRichEditor
                      value={editBody}
                      onChange={setEditBody}
                      placeholder="Scrivi il contenuto dell'email..."
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg overflow-auto max-h-96 border border-gray-200">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview when editing */}
              {editMode && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Anteprima Live
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-auto">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: editBody }}
                    />
                  </div>
                </div>
              )}

              {/* Preview Modal */}
              {previewMode && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                  onClick={() => setPreviewMode(false)}
                >
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                      <div>
                        <h3 className="font-semibold text-slate-900">Anteprima Email</h3>
                        <p className="text-xs text-slate-500">
                          Con variabili di esempio compilate
                        </p>
                      </div>
                      <button
                        onClick={() => setPreviewMode(false)}
                        className="p-2 hover:bg-gray-200 rounded-lg"
                      >
                        <X className="w-5 h-5 text-slate-500" />
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
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <FileText className="w-12 h-12 mb-3" />
              <p>Seleziona un template per modificarlo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateEmail;
