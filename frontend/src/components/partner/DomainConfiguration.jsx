import React, { useState, useEffect } from "react";
import { 
  Globe, Check, Clock, AlertTriangle, Copy, ExternalLink,
  Send, RefreshCw, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { API } from "../../utils/api-config";

// Domain status colors and labels
const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'In attesa', icon: Clock },
  configuring: { color: '#3B82F6', bg: '#DBEAFE', label: 'Parametri pronti', icon: AlertTriangle },
  active: { color: '#34C77B', bg: '#EAFAF1', label: 'Attivo', icon: CheckCircle },
  error: { color: '#EF4444', bg: '#FEE2E2', label: 'Errore', icon: XCircle }
};

export function DomainConfiguration({ partner, isAdmin = false }) {
  const [domainRequest, setDomainRequest] = useState(null);
  const [newDomain, setNewDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(null);
  
  // Admin-only state for adding DNS params
  const [dnsParams, setDnsParams] = useState({
    record_type: "CNAME",
    host: "",
    value: "",
    ttl: "3600",
    notes: ""
  });

  const partnerId = partner?.id || "unknown";
  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  // Load existing domain request
  useEffect(() => {
    loadDomainRequest();
  }, [partnerId]);

  const loadDomainRequest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/domain/partner/${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setDomainRequest(data.domain_request);
      }
    } catch (error) {
      console.error('Error loading domain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Partner submits domain request
  const handleSubmitDomain = async () => {
    if (!newDomain.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/domain/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId,
          partner_name: partner?.name || "Partner",
          domain: newDomain.trim().toLowerCase(),
          partner_email: partner?.email || ""
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDomainRequest(data.domain_request);
        setNewDomain("");
      }
    } catch (error) {
      console.error('Error submitting domain:', error);
      alert('Errore durante l\'invio della richiesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin adds DNS parameters
  const handleAddDnsParams = async () => {
    if (!dnsParams.host || !dnsParams.value) {
      alert('Inserisci host e valore DNS');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/domain/${domainRequest.id}/dns-params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dns_params: dnsParams,
          status: 'configuring'
        })
      });
      
      if (response.ok) {
        await loadDomainRequest();
      }
    } catch (error) {
      console.error('Error adding DNS params:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin marks domain as active
  const handleMarkActive = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/domain/${domainRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      
      if (response.ok) {
        await loadDomainRequest();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(field);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const statusConfig = domainRequest ? STATUS_CONFIG[domainRequest.status] || STATUS_CONFIG.pending : null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#7B68AE' }} />
        <p className="mt-3 text-sm" style={{ color: '#9CA3AF' }}>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#3B82F620' }}>
            <Globe className="w-7 h-7" style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>
              Configurazione Dominio
            </h2>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Collega il tuo dominio personalizzato al funnel Systeme.io
            </p>
          </div>
        </div>

        {/* Current Status */}
        {domainRequest && (
          <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: statusConfig?.bg }}>
            {statusConfig?.icon && <statusConfig.icon className="w-5 h-5" style={{ color: statusConfig?.color }} />}
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: statusConfig?.color }}>
                {statusConfig?.label}
              </div>
              <div className="text-sm" style={{ color: '#5F6572' }}>
                Dominio: <strong>{domainRequest.domain}</strong>
              </div>
            </div>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              Richiesto il {new Date(domainRequest.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>
        )}
      </div>

      {/* No domain yet - Submit form */}
      {!domainRequest && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>
            🌐 Inserisci il tuo dominio
          </h3>
          <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
            Inserisci il dominio che vuoi collegare al tuo funnel. Riceverai i parametri DNS da configurare.
          </p>
          
          <div className="flex gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="es. corsi.tuodominio.it"
              className="flex-1 px-4 py-3 rounded-xl border text-sm"
              style={{ borderColor: '#ECEDEF' }}
            />
            <button
              onClick={handleSubmitDomain}
              disabled={!newDomain.trim() || isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#3B82F6' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Invia Richiesta
            </button>
          </div>
          
          <div className="mt-4 p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
            <p className="text-xs" style={{ color: '#8B7500' }}>
              <strong>💡 Suggerimento:</strong> Usa un sottodominio come <code>corsi.tuodominio.it</code> o <code>academy.tuodominio.it</code>. 
              Evita di usare il dominio principale se hai già un sito attivo.
            </p>
          </div>
        </div>
      )}

      {/* Pending - Waiting for admin */}
      {domainRequest?.status === 'pending' && !isAdmin && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center py-6">
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: '#F59E0B' }} />
            <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
              Richiesta in elaborazione
            </h3>
            <p className="text-sm" style={{ color: '#5F6572' }}>
              Stiamo configurando il tuo dominio su Systeme.io.<br/>
              Riceverai i parametri DNS entro 24-48 ore.
            </p>
          </div>
        </div>
      )}

      {/* DNS Parameters Ready - Show to partner */}
      {domainRequest?.status === 'configuring' && domainRequest?.dns_params && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            Configura il DNS
          </h3>
          <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
            Accedi al pannello di controllo del tuo provider di dominio e aggiungi questo record DNS:
          </p>
          
          <div className="space-y-4">
            {/* DNS Record Display */}
            <div className="p-5 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>TIPO RECORD</div>
                  <div className="font-mono font-bold" style={{ color: '#1E2128' }}>
                    {domainRequest.dns_params.record_type}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>HOST / NAME</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold" style={{ color: '#1E2128' }}>
                      {domainRequest.dns_params.host}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(domainRequest.dns_params.host, 'host')}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      {copySuccess === 'host' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: '#9CA3AF' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>VALORE / TARGET</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm break-all" style={{ color: '#1E2128' }}>
                      {domainRequest.dns_params.value}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(domainRequest.dns_params.value, 'value')}
                      className="p-1 rounded hover:bg-gray-200 flex-shrink-0"
                    >
                      {copySuccess === 'value' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: '#9CA3AF' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>TTL</div>
                  <div className="font-mono font-bold" style={{ color: '#1E2128' }}>
                    {domainRequest.dns_params.ttl || '3600'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {domainRequest.dns_params.notes && (
              <div className="p-4 rounded-xl" style={{ background: '#DBEAFE' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#3B82F6' }}>📝 NOTE</div>
                <p className="text-sm" style={{ color: '#1E2128' }}>{domainRequest.dns_params.notes}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#8B7500' }}>📋 ISTRUZIONI</div>
              <ol className="text-sm space-y-2" style={{ color: '#5F6572' }}>
                <li>1. Accedi al pannello del tuo provider (Aruba, GoDaddy, OVH, ecc.)</li>
                <li>2. Vai nella sezione "DNS" o "Zone DNS"</li>
                <li>3. Aggiungi un nuovo record con i valori sopra</li>
                <li>4. Salva e attendi 24-48 ore per la propagazione</li>
                <li>5. Comunicaci quando hai completato la configurazione</li>
              </ol>
            </div>
          </div>
          
          <button
            onClick={() => window.open('https://www.whatsmydns.net/#CNAME/' + domainRequest.domain, '_blank')}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: '#ECEDEF', color: '#5F6572' }}
          >
            <ExternalLink className="w-4 h-4" />
            Verifica propagazione DNS
          </button>
        </div>
      )}

      {/* Domain Active */}
      {domainRequest?.status === 'active' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#EAFAF1' }}>
              <CheckCircle className="w-8 h-8" style={{ color: '#34C77B' }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#34C77B' }}>
              Dominio Attivo! 🎉
            </h3>
            <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
              Il tuo dominio è configurato correttamente e il funnel è raggiungibile.
            </p>
            <a 
              href={`https://${domainRequest.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: '#34C77B' }}
            >
              <Globe className="w-4 h-4" />
              Visita {domainRequest.domain}
            </a>
          </div>
        </div>
      )}

      {/* ADMIN SECTION */}
      {isAdmin && domainRequest && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2" style={{ borderColor: '#7B68AE' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#7B68AE' }}>
            🔧 Pannello Admin
          </h3>
          
          {/* Add DNS Params */}
          {domainRequest.status === 'pending' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#5F6572' }}>
                Inserisci i parametri DNS forniti da Systeme.io:
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Tipo Record</label>
                  <select
                    value={dnsParams.record_type}
                    onChange={(e) => setDnsParams({...dnsParams, record_type: e.target.value})}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#ECEDEF' }}
                  >
                    <option value="CNAME">CNAME</option>
                    <option value="A">A</option>
                    <option value="TXT">TXT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold" style={{ color: '#5F6572' }}>TTL</label>
                  <input
                    type="text"
                    value={dnsParams.ttl}
                    onChange={(e) => setDnsParams({...dnsParams, ttl: e.target.value})}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#ECEDEF' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Host / Name *</label>
                  <input
                    type="text"
                    value={dnsParams.host}
                    onChange={(e) => setDnsParams({...dnsParams, host: e.target.value})}
                    placeholder="es. corsi"
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#ECEDEF' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Valore / Target *</label>
                  <input
                    type="text"
                    value={dnsParams.value}
                    onChange={(e) => setDnsParams({...dnsParams, value: e.target.value})}
                    placeholder="es. xyz.systeme.io"
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#ECEDEF' }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold" style={{ color: '#5F6572' }}>Note (opzionale)</label>
                  <textarea
                    value={dnsParams.notes}
                    onChange={(e) => setDnsParams({...dnsParams, notes: e.target.value})}
                    placeholder="Istruzioni aggiuntive per il partner..."
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#ECEDEF' }}
                  />
                </div>
              </div>
              
              <button
                onClick={handleAddDnsParams}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: '#7B68AE' }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salva Parametri DNS
              </button>
            </div>
          )}
          
          {/* Mark as Active */}
          {domainRequest.status === 'configuring' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#5F6572' }}>
                Quando il partner ha configurato il DNS e il dominio funziona, clicca per attivare:
              </p>
              <button
                onClick={handleMarkActive}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: '#34C77B' }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Segna come Attivo
              </button>
            </div>
          )}
          
          {/* Already active */}
          {domainRequest.status === 'active' && (
            <p className="text-sm text-center py-4" style={{ color: '#34C77B' }}>
              ✅ Dominio attivo e funzionante
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default DomainConfiguration;
