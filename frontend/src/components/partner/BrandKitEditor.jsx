import { useState, useEffect } from "react";
import { Palette, Save, Loader2, Upload, Check, ExternalLink, Image } from "lucide-react";
import axios from "axios";

import { API } from "../../utils/api-config"; // API configured

export function BrandKitEditor({ partner, onSave }) {
  const [brandKit, setBrandKit] = useState({
    brand_color: "#FFD24D",
    brand_color_secondary: "#1a2332",
    logo_url: "",
    tagline: "",
    email: "",
    website: "",
    social_instagram: "",
    social_linkedin: "",
    social_youtube: ""
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadBrandKit();
  }, [partner?.id]);

  const loadBrandKit = async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/brandkit/${partner.id}`);
      setBrandKit(prev => ({ ...prev, ...res.data }));
    } catch (e) {
      console.error("Error loading brand kit:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveBrandKit = async () => {
    if (!partner?.id) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/brandkit/${partner.id}`, brandKit);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onSave) onSave(brandKit);
    } catch (e) {
      console.error("Error saving brand kit:", e);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setBrandKit(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-[#FFD24D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden" data-testid="brand-kit-editor">
      {/* Header */}
      <div className="p-5 border-b border-[#ECEDEF] bg-gradient-to-r from-[#FFD24D]/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFD24D] flex items-center justify-center">
            <Palette className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1E2128]">Brand Kit</h3>
            <p className="text-xs text-[#9CA3AF]">Personalizza i tuoi materiali marketing</p>
          </div>
          <button
            onClick={saveBrandKit}
            disabled={saving}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
              ${saved 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-[#FFD24D] text-black hover:bg-[#e0a800]'}`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <><Check className="w-4 h-4" /> Salvato</>
            ) : (
              <><Save className="w-4 h-4" /> Salva</>
            )}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Colors */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Colori Brand
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#5F6572] mb-2 block">Colore Principale</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandKit.brand_color}
                  onChange={e => updateField('brand_color', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-[#ECEDEF] cursor-pointer"
                />
                <input
                  type="text"
                  value={brandKit.brand_color}
                  onChange={e => updateField('brand_color', e.target.value)}
                  className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm font-mono text-[#1E2128] uppercase"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5F6572] mb-2 block">Colore Secondario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandKit.brand_color_secondary}
                  onChange={e => updateField('brand_color_secondary', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-[#ECEDEF] cursor-pointer"
                />
                <input
                  type="text"
                  value={brandKit.brand_color_secondary}
                  onChange={e => updateField('brand_color_secondary', e.target.value)}
                  className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm font-mono text-[#1E2128] uppercase"
                />
              </div>
            </div>
          </div>
          
          {/* Color Preview */}
          <div className="mt-3 flex items-center gap-2">
            <div 
              className="flex-1 h-8 rounded-lg"
              style={{ background: `linear-gradient(135deg, ${brandKit.brand_color}, ${brandKit.brand_color_secondary})` }}
            />
            <span className="text-xs text-[#9CA3AF]">Anteprima gradiente</span>
          </div>
        </div>

        {/* Logo */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Logo
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-[#FAFAF7] border border-[#ECEDEF] flex items-center justify-center overflow-hidden">
              {brandKit.logo_url ? (
                <img src={brandKit.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Image className="w-8 h-8 text-[#9CA3AF]" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={brandKit.logo_url || ""}
                onChange={e => updateField('logo_url', e.target.value)}
                placeholder="https://esempio.com/logo.png"
                className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2.5 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D] transition-colors"
              />
              <div className="text-[10px] text-[#9CA3AF] mt-1">Incolla l'URL del tuo logo (PNG trasparente consigliato)</div>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Tagline / Slogan
          </div>
          <input
            type="text"
            value={brandKit.tagline || ""}
            onChange={e => updateField('tagline', e.target.value)}
            placeholder="es. 'Trasforma la tua expertise in un business digitale'"
            className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-3 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D] transition-colors"
          />
        </div>

        {/* Contact Info */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Contatti
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="email"
              value={brandKit.email || ""}
              onChange={e => updateField('email', e.target.value)}
              placeholder="Email"
              className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2.5 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D]"
            />
            <input
              type="url"
              value={brandKit.website || ""}
              onChange={e => updateField('website', e.target.value)}
              placeholder="Sito web"
              className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2.5 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D]"
            />
          </div>
        </div>

        {/* Social */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Social Media
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-24 text-xs font-semibold text-[#9CA3AF]">Instagram</span>
              <input
                type="text"
                value={brandKit.social_instagram || ""}
                onChange={e => updateField('social_instagram', e.target.value)}
                placeholder="@username"
                className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-xs font-semibold text-[#9CA3AF]">LinkedIn</span>
              <input
                type="text"
                value={brandKit.social_linkedin || ""}
                onChange={e => updateField('social_linkedin', e.target.value)}
                placeholder="linkedin.com/in/username"
                className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-xs font-semibold text-[#9CA3AF]">YouTube</span>
              <input
                type="text"
                value={brandKit.social_youtube || ""}
                onChange={e => updateField('social_youtube', e.target.value)}
                placeholder="youtube.com/@channel"
                className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-[#FFD24D]"
              />
            </div>
          </div>
        </div>

        {/* Template Variables Preview */}
        <div className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl p-4">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Variabili per Template Systeme.io
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF]">{`{{Brand_Color}}`}</span>
              <span className="text-[#FFD24D]">{brandKit.brand_color}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF]">{`{{Logo_URL}}`}</span>
              <span className="text-[#5F6572] truncate">{brandKit.logo_url || "Non impostato"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF]">{`{{Nome_Partner}}`}</span>
              <span className="text-[#5F6572]">{partner?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF]">{`{{Tagline}}`}</span>
              <span className="text-[#5F6572] truncate">{brandKit.tagline || "Non impostato"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
