/**
 * Ciak Partner — PartnerProfileHub.
 * Porting di components/partner/PartnerProfileHub.jsx. Re-skin palette Ciak.
 * Sotto-componente di WorkspacePage. Non è una pagina standalone.
 * Il percorso EVO vive sulla Home (JourneyMap), non qui: questo componente è solo
 * identità / posizionamento / brand kit del partner.
 *
 * Prop `section` (opzionale): "identity" | "positioning" | "brand".
 * Quando passata, Workspace controlla la sezione dall'esterno (tab top-level)
 * e qui nascondiamo la barra dei tab interna. Senza `section` resta standalone
 * con i suoi tab.
 *
 * Endpoint backend invariati:
 *  GET   /api/partner-hub/:partnerId
 *  PATCH /api/partner-hub/:partnerId/field?field=&value=
 */
import { useState, useEffect } from "react";
import { Edit2, Upload, Trash2 } from "lucide-react";

export function PartnerProfileHub({ partner, section }) {
  const [internalTab, setInternalTab] = useState("identity");
  const activeTab = section || internalTab;
  const [isEditing, setIsEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [profileData, setProfileData] = useState({
    name: partner?.name || "Partner",
    email: partner?.email || "",
    phone: partner?.phone || "",
    city: partner?.city || "",
    bio: partner?.bio || "",
    photo: partner?.photo || null,
    website: partner?.website || "",
    instagram: partner?.instagram || "",
    linkedin: partner?.linkedin || "",
    youtube: partner?.youtube || "",
    whoYouAre: partner?.positioning?.whoYouAre || "",
    targetAudience: partner?.positioning?.targetAudience || "",
    problem: partner?.positioning?.problem || "",
    solution: partner?.positioning?.solution || "",
    pitch: partner?.positioning?.pitch || "",
    differentiator: partner?.positioning?.differentiator || "",
    offerName: partner?.offer?.name || "",
    offerPrice: partner?.offer?.price || "",
    offerIncludes: partner?.offer?.includes || "",
    offerGuarantee: partner?.offer?.guarantee || "",
    logo: partner?.brandKit?.logo || null,
    primaryColor: partner?.brandKit?.primaryColor || "#2C5F8A",
    accentColor: partner?.brandKit?.accentColor || "#FFD24D",
    textColor: partner?.brandKit?.textColor || "#0F172A",
    bgColor: partner?.brandKit?.bgColor || "#FAFAF7",
    fontPrimary: partner?.brandKit?.fontPrimary || "Nunito Bold",
    fontSecondary: partner?.brandKit?.fontSecondary || "Nunito Regular",
    toneOfVoice: partner?.brandKit?.toneOfVoice || "",
    keywords: partner?.brandKit?.keywords || "",
    heroPhoto: partner?.media?.heroPhoto || null,
    introVideo: partner?.media?.introVideo || null,
    voiceSample: partner?.media?.voiceSample || null,
    testimonials: partner?.media?.testimonials || [],
  });

  const profileCompletion = Math.round(
    (Object.values(profileData).filter((v) => v && v !== "").length /
      Object.keys(profileData).length) *
      100
  );

  const tabs = [
    { id: "identity", label: "Identità", status: "done" },
    { id: "positioning", label: "Posizionamento", status: "done" },
    { id: "brand", label: "Brand Kit", status: "wip" },
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const partnerId = partner?.id || "demo";

  useEffect(() => {
    loadProfile();
  }, [partnerId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/partner-hub/${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (field, value) => {
    setIsEditing(field);
    setEditValue(value || "");
  };

  const saveEdit = async (field) => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/partner-hub/${partnerId}/field?field=${field}&value=${encodeURIComponent(editValue)}`,
        { method: "PATCH" }
      );
      if (response.ok) {
        setProfileData((prev) => ({ ...prev, [field]: editValue }));
      }
    } catch (error) {
      console.error("Error saving field:", error);
    } finally {
      setIsSaving(false);
      setIsEditing(null);
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditValue("");
  };


  const handleClear = async (field, label) => {
    if (!window.confirm(`Eliminare "${label || field}"?`)) return;
    setIsSaving(true);
    try {
      const r = await fetch(
        `/api/partner-hub/${partnerId}/field?field=${field}&value=`,
        { method: "PATCH" }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setProfileData((prev) => ({ ...prev, [field]: "" }));
    } catch (e) {
      console.error("Clear error:", e);
      alert("Eliminazione non riuscita. Riprova.");
    } finally {
      setIsSaving(false);
    }
  };

  const EditableRow = ({ label, field, value, placeholder }) => (
    <div className="flex items-start gap-4 py-3 border-b border-gray-200">
      <div className="w-32 flex-shrink-0 text-xs font-semibold text-slate-400">{label}</div>
      <div className="flex-1">
        {isEditing === field ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-500 text-sm outline-none"
              autoFocus
            />
            <button
              onClick={() => saveEdit(field)}
              className="px-3 py-1 rounded-lg text-white text-xs font-semibold bg-emerald-500"
            >
              ✓
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-slate-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className={`text-sm ${
              !value ? "italic text-slate-400" : "font-medium text-slate-900"
            }`}
          >
            {value || placeholder || "Non inserito"}
          </div>
        )}
      </div>
      {!isEditing && (
        <button
          onClick={() => startEdit(field, value)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Edit2 className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center bg-gray-50 min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-400">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-white rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 z-50">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-emerald-500">Salvataggio...</span>
        </div>
      )}

      {/* Profile Hero — solo su Identità (o standalone) per non duplicarlo su ogni tab */}
      {(!section || section === "identity") && (
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-yellow-50">
          👤
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900">{profileData.name}</h2>
          <p className="text-sm text-slate-600">
            Coach · Specializzato in {profileData.whoYouAre || "crescita business"}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              PRO PARTNER
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-emerald-500 bg-emerald-50 flex items-center justify-center">
            <span className="text-xl font-semibold text-emerald-500">{profileCompletion}%</span>
          </div>
          <p className="text-xs font-semibold mt-2 text-slate-400">Profilo completo</p>
        </div>
      </div>
      )}

      {/* Tabs interni — solo in modalità standalone. In Workspace i tab sono top-level. */}
      {!section && (
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setInternalTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === tab.id ? "bg-slate-900 text-white" : "bg-gray-200 text-slate-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tab.status === "done" ? "bg-emerald-500" : "bg-yellow-500"
              }`}
            />
            {tab.label}
          </button>
        ))}
      </div>
      )}

      {/* TAB: IDENTITÀ */}
      {activeTab === "identity" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Dati Personali</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                ✓ Completo
              </span>
            </div>
            <EditableRow label="Nome" field="name" value={profileData.name} />
            <EditableRow label="Email" field="email" value={profileData.email} placeholder="email@esempio.it" />
            <EditableRow label="WhatsApp" field="phone" value={profileData.phone} placeholder="+39 xxx xxx xxxx" />
            <EditableRow label="Città" field="city" value={profileData.city} placeholder="Milano, Italia" />
            <EditableRow label="Bio breve" field="bio" value={profileData.bio} placeholder="Descrivi chi sei in 2 righe..." />
            <div className="flex items-center gap-4 py-3">
              <div className="w-32 flex-shrink-0 text-xs font-semibold text-slate-400">
                Foto profilo
              </div>
              <div
                className={`flex-1 text-sm ${
                  profileData.photo ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {profileData.photo ? (
                  <span>
                    {profileData.photo}{" "}
                    <span className="text-emerald-600 font-semibold text-xs">· Caricata</span>
                  </span>
                ) : (
                  <span className="italic">Non caricata</span>
                )}
              </div>
              <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-200 text-slate-600">
                <Upload className="w-3 h-3 inline mr-1" /> Carica
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Link e Social</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-600">
                Parziale
              </span>
            </div>
            <EditableRow label="Sito web" field="website" value={profileData.website} placeholder="www.tuosito.it" />
            <EditableRow label="Instagram" field="instagram" value={profileData.instagram} placeholder="@tuoaccount" />
            <EditableRow label="LinkedIn" field="linkedin" value={profileData.linkedin} placeholder="linkedin.com/in/..." />
            <EditableRow label="YouTube" field="youtube" value={profileData.youtube} placeholder="youtube.com/@..." />
          </div>
        </div>
      )}

      {/* TAB: POSIZIONAMENTO */}
      {activeTab === "positioning" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Il tuo Posizionamento</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                ✓ Completo
              </span>
            </div>
            <EditableRow label="Chi sei" field="whoYouAre" value={profileData.whoYouAre} placeholder="Coach per..." />
            <EditableRow label="Per chi lavori" field="targetAudience" value={profileData.targetAudience} placeholder="Il tuo target..." />
            <EditableRow label="Problema che risolvi" field="problem" value={profileData.problem} placeholder="Il problema del tuo cliente..." />
            <EditableRow label="La tua soluzione" field="solution" value={profileData.solution} placeholder="Come lo risolvi..." />
            <EditableRow label="Pitch 10 secondi" field="pitch" value={profileData.pitch} placeholder="Aiuto [chi] a [cosa] in [tempo]" />
            <EditableRow label="Differenziatore" field="differentiator" value={profileData.differentiator} placeholder="A differenza di altri..." />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">La tua Offerta</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                ✓ Completo
              </span>
            </div>
            <EditableRow label="Nome offerta" field="offerName" value={profileData.offerName} placeholder="Programma Acceleratore..." />
            <EditableRow label="Prezzo" field="offerPrice" value={profileData.offerPrice} placeholder="497€ (scontato a 297€)" />
            <EditableRow label="Cosa include" field="offerIncludes" value={profileData.offerIncludes} placeholder="8 sessioni, template, community..." />
            <EditableRow label="Garanzia" field="offerGuarantee" value={profileData.offerGuarantee} placeholder="Soddisfatto o rimborsato..." />
          </div>
        </div>
      )}

      {/* TAB: BRAND KIT */}
      {activeTab === "brand" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Brand Kit</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                ✓ Completo
              </span>
            </div>

            <BrandEditRow label="Logo" field="logo" value={profileData.logo} isEditing={isEditing} editValue={editValue} setEditValue={setEditValue} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onClear={handleClear} />

            <div className="flex items-start gap-4 py-3 border-b border-gray-200">
              <div className="w-32 flex-shrink-0 text-xs font-semibold text-slate-400">Colori</div>
              <div className="flex-1">
                {["primaryColor", "accentColor", "textColor", "bgColor"].includes(isEditing) ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-400 w-20">{({ primaryColor: "Primario", accentColor: "Accento", textColor: "Testo", bgColor: "Sfondo" })[isEditing]}</span>
                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="#RRGGBB" className="flex-1 px-3 py-2 rounded-lg border border-slate-500 text-sm outline-none" autoFocus />
                    <button onClick={() => saveEdit(isEditing)} className="px-3 py-1 rounded-lg text-white text-xs font-semibold bg-emerald-500">✓</button>
                    <button onClick={cancelEdit} className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-slate-600">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit("primaryColor", profileData.primaryColor)} title="Modifica primario" className="w-8 h-8 rounded-lg ring-1 ring-gray-200 hover:ring-2 hover:ring-yellow-400 transition" style={{ background: profileData.primaryColor }} />
                      <button type="button" onClick={() => startEdit("accentColor", profileData.accentColor)} title="Modifica accento" className="w-8 h-8 rounded-lg ring-1 ring-gray-200 hover:ring-2 hover:ring-yellow-400 transition" style={{ background: profileData.accentColor }} />
                      <button type="button" onClick={() => startEdit("textColor", profileData.textColor)} title="Modifica testo" className="w-8 h-8 rounded-lg ring-1 ring-gray-200 hover:ring-2 hover:ring-yellow-400 transition" style={{ background: profileData.textColor }} />
                      <button type="button" onClick={() => startEdit("bgColor", profileData.bgColor)} title="Modifica sfondo" className="w-8 h-8 rounded-lg border border-gray-200 hover:ring-2 hover:ring-yellow-400 transition" style={{ background: profileData.bgColor }} />
                    </div>
                    <span className="text-xs text-slate-400">Clicca un colore per modificarlo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 py-3 border-b border-gray-200">
              <div className="w-32 flex-shrink-0 text-xs font-semibold text-slate-400">Font</div>
              <div className="flex-1">
                {["fontPrimary", "fontSecondary"].includes(isEditing) ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-400 w-24">{isEditing === "fontPrimary" ? "Primario" : "Secondario"}</span>
                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-500 text-sm outline-none" autoFocus />
                    <button onClick={() => saveEdit(isEditing)} className="px-3 py-1 rounded-lg text-white text-xs font-semibold bg-emerald-500">✓</button>
                    <button onClick={cancelEdit} className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-slate-600">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => startEdit("fontPrimary", profileData.fontPrimary)} title="Modifica font primario" className="text-sm font-semibold text-slate-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition">{profileData.fontPrimary}</button>
                    <button type="button" onClick={() => startEdit("fontSecondary", profileData.fontSecondary)} title="Modifica font secondario" className="text-sm text-slate-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition">{profileData.fontSecondary}</button>
                  </div>
                )}
              </div>
            </div>

            <BrandEditRow label="Tono di voce" field="toneOfVoice" value={profileData.toneOfVoice} isEditing={isEditing} editValue={editValue} setEditValue={setEditValue} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onClear={handleClear} />
            <BrandEditRow label="Parole chiave" field="keywords" value={profileData.keywords} isEditing={isEditing} editValue={editValue} setEditValue={setEditValue} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onClear={handleClear} />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Media caricati</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-600">
                3 di 5
              </span>
            </div>
            {[
              { label: "Foto profilo", value: profileData.photo, ok: !!profileData.photo },
              { label: "Foto hero", value: profileData.heroPhoto, ok: !!profileData.heroPhoto },
              { label: "Video intro", value: profileData.introVideo, ok: !!profileData.introVideo },
              { label: "Campione voce", value: profileData.voiceSample, ok: !!profileData.voiceSample, critical: true },
              { label: "Testimonial", value: profileData.testimonials?.length > 0, ok: profileData.testimonials?.length > 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-200">
                <div className="w-32 text-xs font-semibold text-slate-400">{item.label}</div>
                <div className={`flex-1 text-sm ${item.ok ? "text-slate-900" : "text-red-500"}`}>
                  {item.ok
                    ? `Caricato`
                    : `Non caricato${item.critical ? " — necessario per Avatar AI" : ""}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BrandEditRow({ label, field, value, isEditing, editValue, setEditValue, onStart, onSave, onCancel, onClear }) {
  const editing = isEditing === field;
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-200">
      <div className="w-32 flex-shrink-0 text-xs font-semibold text-slate-400">{label}</div>
      <div className="flex-1">
        {editing ? (
          <div className="flex gap-2">
            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-500 text-sm outline-none" autoFocus />
            <button onClick={() => onSave(field)} className="px-3 py-1 rounded-lg text-white text-xs font-semibold bg-emerald-500">✓</button>
            <button onClick={onCancel} className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-slate-600">✕</button>
          </div>
        ) : (
          <div className={`text-sm ${value ? "font-medium text-slate-900 break-all" : "italic text-slate-400"}`}>{value || "Non inserito"}</div>
        )}
      </div>
      {!editing && (
        <>
          <button onClick={() => onStart(field, value)} title="Modifica" className="p-2 rounded-lg hover:bg-gray-100 transition">
            <Edit2 className="w-4 h-4 text-slate-400" />
          </button>
          {value && onClear && (
            <button onClick={() => onClear(field, label)} title="Elimina" className="p-2 rounded-lg hover:bg-red-50 transition">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default PartnerProfileHub;
