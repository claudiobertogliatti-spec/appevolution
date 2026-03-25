import { useState, useEffect } from "react";
import { 
  BarChart3, Users, Calendar, TrendingUp, ExternalLink, 
  CheckCircle2, Clock, AlertCircle, Plus, RefreshCw
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// =====================================================
// LA MIA ACCADEMIA (F10)
// =====================================================
export function MiaAccademiaPage({ partner }) {
  const [pianoContinuita, setPianoContinuita] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [partner?.id]);

  const loadData = async () => {
    try {
      const res = await axios.get(`${API}/api/partners/${partner?.id}/piano-continuita`);
      setPianoContinuita(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>La mia Accademia</h1>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Gestione e crescita della tua accademia attiva</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#F2C418' }}>
            <ExternalLink className="w-5 h-5" />
            <span className="text-sm font-medium">URL Accademia</span>
          </div>
          <a 
            href={partner?.academy_url || "#"} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-bold hover:underline"
            style={{ color: '#2563EB' }}
          >
            {partner?.academy_url || "Non configurato"}
          </a>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#10B981' }}>
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Studenti Totali</span>
          </div>
          <span className="text-3xl font-bold" style={{ color: '#1E2128' }}>
            {partner?.total_students || 0}
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#8B5CF6' }}>
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Fatturato Mese</span>
          </div>
          <span className="text-3xl font-bold" style={{ color: '#1E2128' }}>
            €{pianoContinuita?.mrr?.toLocaleString() || 0}
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#F59E0B' }}>
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Prossimo Rinnovo</span>
          </div>
          <span className="text-lg font-bold" style={{ color: '#1E2128' }}>
            {pianoContinuita?.data_rinnovo 
              ? new Date(pianoContinuita.data_rinnovo).toLocaleDateString("it-IT")
              : "—"}
          </span>
        </div>
      </div>

      {/* Piano Continuità Badge */}
      <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1E2128' }}>Piano Continuità</h3>
        {pianoContinuita?.piano_attivo ? (
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-full text-sm font-bold bg-green-50 text-green-600 border border-green-200">
              {pianoContinuita.piano_attivo.charAt(0).toUpperCase() + pianoContinuita.piano_attivo.slice(1)}
            </div>
            <span style={{ color: '#5F6572' }}>
              €{pianoContinuita.fee_mensile}/mese + {pianoContinuita.commissione_percentuale}% fatturato
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-amber-700">Nessun piano attivo. Contatta Stefania per attivare il tuo Piano Continuità.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// I MIEI STUDENTI (F11)
// =====================================================
export function MieiStudentiPage({ partner }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [partner?.id]);

  const loadStudents = async () => {
    try {
      // TODO: Implement actual students endpoint
      // const res = await axios.get(`${API}/api/partners/${partner?.id}/students`);
      // setStudents(res.data);
      setStudents([]); // Placeholder
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>I miei Studenti</h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Monitoraggio studenti iscritti e progressi</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#ECEDEF' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
            Nessuno studente ancora
          </h3>
          <p style={{ color: '#9CA3AF' }}>
            Il tuo corso è appena partito! Gli studenti appariranno qui man mano che si iscrivono.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #ECEDEF' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Nome</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Data Iscrizione</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Ultimo Accesso</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #ECEDEF' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: '#1E2128' }}>{student.name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#5F6572' }}>
                    {new Date(student.enrolled_at).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#5F6572' }}>
                    {student.last_access ? new Date(student.last_access).toLocaleDateString("it-IT") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ width: `${student.progress || 0}%`, background: '#F2C418' }}
                        />
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{student.progress || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================
// IMPEGNI SETTIMANA (F12)
// =====================================================
export function ImpegniSettimanaPage({ partner }) {
  const [impegni, setImpegni] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImpegni();
  }, [partner?.id]);

  const loadImpegni = async () => {
    try {
      // TODO: Implement actual impegni endpoint (from MARCO agent)
      // const res = await axios.get(`${API}/api/partners/${partner?.id}/impegni-settimanali`);
      // setImpegni(res.data);
      
      // Placeholder data
      setImpegni([
        { id: 1, task: "Registrare 2 video per il corso", status: "completed", due: "2026-03-10" },
        { id: 2, task: "Rispondere ai commenti degli studenti", status: "in_progress", due: "2026-03-12" },
        { id: 3, task: "Preparare email settimanale", status: "not_started", due: "2026-03-14" },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress": return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed": return "Completato";
      case "in_progress": return "In corso";
      default: return "Non iniziato";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>Impegni Settimana</h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Piano settimanale e obiettivi operativi</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <Plus className="w-4 h-4" />
          Aggiungi Impegno
        </button>
      </div>

      <div className="space-y-3">
        {impegni.map((impegno) => (
          <div 
            key={impegno.id}
            className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4"
            style={{ border: '1px solid #ECEDEF' }}
          >
            {getStatusIcon(impegno.status)}
            <div className="flex-1">
              <p className="font-medium" style={{ color: '#1E2128' }}>{impegno.task}</p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Scadenza: {new Date(impegno.due).toLocaleDateString("it-IT")}
              </p>
            </div>
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: impegno.status === 'completed' ? '#D1FAE5' : impegno.status === 'in_progress' ? '#FEF3C7' : '#F3F4F6',
                color: impegno.status === 'completed' ? '#059669' : impegno.status === 'in_progress' ? '#B45309' : '#6B7280'
              }}
            >
              {getStatusLabel(impegno.status)}
            </span>
            <button 
              className="text-sm font-medium hover:opacity-80"
              style={{ color: '#F2C418' }}
            >
              Aggiorna
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// REPORT MENSILE (F13)
// =====================================================
export function ReportMensilePage({ partner }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [partner?.id]);

  const loadReport = async () => {
    try {
      // TODO: Implement actual report endpoint
      // const res = await axios.get(`${API}/api/partners/${partner?.id}/report-mensile`);
      // setReport(res.data);
      setReport(null); // Placeholder
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>Report Mensile</h1>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Report mensile fatturato, studenti, azioni</p>
      </div>

      {!report ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: '#ECEDEF' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
            Nessun report disponibile
          </h3>
          <p style={{ color: '#9CA3AF' }}>
            Il primo report sarà disponibile a fine mese. Continua a lavorare sulla tua accademia!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
            <div className="text-sm font-medium mb-2" style={{ color: '#9CA3AF' }}>Fatturato Mese</div>
            <div className="text-3xl font-bold" style={{ color: '#10B981' }}>€{report.fatturato?.toLocaleString() || 0}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
            <div className="text-sm font-medium mb-2" style={{ color: '#9CA3AF' }}>Nuovi Studenti</div>
            <div className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>{report.nuovi_studenti || 0}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
            <div className="text-sm font-medium mb-2" style={{ color: '#9CA3AF' }}>Tasso Completamento</div>
            <div className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{report.tasso_completamento || 0}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Banner per Piano Continuità (F8/F9 senza piano)
export function PianoContinuitaBanner({ partner, onTalkToStefania }) {
  const [pianoContinuita, setPianoContinuita] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPiano();
  }, [partner?.id]);

  const loadPiano = async () => {
    try {
      const res = await axios.get(`${API}/api/partners/${partner?.id}/piano-continuita`);
      setPianoContinuita(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Show banner only for F8/F9 partners without a plan
  const currentPhase = partner?.phase || "F1";
  const isF8orF9 = ["F8", "F9"].includes(currentPhase);
  const hasPlan = pianoContinuita?.piano_attivo;

  if (loading || !isF8orF9 || hasPlan) return null;

  return (
    <div 
      className="mx-6 mt-4 p-4 rounded-xl"
      style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1px solid #FCD34D' }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">🎉</div>
        <div className="flex-1">
          <h3 className="font-bold mb-1" style={{ color: '#92400E' }}>
            Hai lanciato la tua accademia!
          </h3>
          <p className="text-sm mb-3" style={{ color: '#A16207' }}>
            Per continuare a far crescere i tuoi studenti e il fatturato, attiva il tuo Piano Continuità Evolution PRO.
            Parla con Stefania per scegliere il piano più adatto.
          </p>
          <button
            onClick={onTalkToStefania}
            className="px-4 py-2 rounded-lg font-bold text-sm"
            style={{ background: '#1E2128', color: '#F2C418' }}
          >
            Parla con Stefania →
          </button>
        </div>
      </div>
    </div>
  );
}

export default {
  MiaAccademiaPage,
  MieiStudentiPage,
  ImpegniSettimanaPage,
  ReportMensilePage,
  PianoContinuitaBanner
};
