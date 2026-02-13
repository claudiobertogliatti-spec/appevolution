import { useState, useEffect } from "react";
import {
  Trophy, Users, TrendingUp, Gift, MessageSquare, Sparkles,
  RefreshCw, Loader2, CheckCircle, Star, Crown, Target,
  DollarSign, UserPlus, Zap, BookOpen, Award, BarChart3,
  ArrowUpRight, ArrowDownRight, Link2, Copy, Eye
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UNLOCK_CONDITIONS = {
  progress_50: { label: "Completa 50%", icon: "📊", color: "text-blue-400" },
  progress_100: { label: "Corso Completo", icon: "🎓", color: "text-green-400" },
  referral_1: { label: "1 Referral", icon: "👥", color: "text-purple-400" },
  referral_3: { label: "3 Referral", icon: "🏆", color: "text-yellow-400" },
  streak_7: { label: "Streak 7 giorni", icon: "🔥", color: "text-orange-400" },
  feedback_given: { label: "Feedback", icon: "💬", color: "text-pink-400" }
};

const ANGLE_TYPES = {
  pain_point: { label: "Pain Point", color: "bg-red-500/20 text-red-400", icon: "😤" },
  success_story: { label: "Success Story", color: "bg-green-500/20 text-green-400", icon: "🏆" },
  objection: { label: "Obiezione", color: "bg-orange-500/20 text-orange-400", icon: "🤔" },
  desire: { label: "Desiderio", color: "bg-purple-500/20 text-purple-400", icon: "✨" }
};

export function AtlasModule({ partner, isAdmin = false }) {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, students, bonuses, feedback, angles
  const [loading, setLoading] = useState(true);
  const [ltvData, setLtvData] = useState(null);
  const [students, setStudents] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [copyAngles, setCopyAngles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (partner?.id) {
      loadData();
    }
  }, [partner?.id]);

  const loadData = async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const [ltvRes, studentsRes, bonusesRes, feedbackRes, anglesRes] = await Promise.all([
        axios.get(`${API}/atlas/ltv-dashboard/${partner.id}`),
        axios.get(`${API}/atlas/students/${partner.id}`),
        axios.get(`${API}/atlas/bonuses/${partner.id}`),
        axios.get(`${API}/atlas/feedback/${partner.id}`),
        axios.get(`${API}/atlas/copy-angles/${partner.id}`)
      ]);
      setLtvData(ltvRes.data);
      setStudents(studentsRes.data.students || []);
      setBonuses(bonusesRes.data);
      setFeedback(feedbackRes.data);
      setCopyAngles(anglesRes.data);
    } catch (e) {
      console.error("Error loading ATLAS data:", e);
    } finally {
      setLoading(false);
    }
  };

  const analyzeFeedback = async () => {
    if (!partner?.id) return;
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/atlas/feedback/analyze/${partner.id}`);
      alert(`Analisi completata! ${res.data.angles_extracted} nuovi angoli estratti.`);
      loadData();
    } catch (e) {
      console.error("Error analyzing:", e);
      alert("Errore nell'analisi");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in" data-testid="atlas-module">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border border-yellow-500/30 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-[#1E2128]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-[#1E2128] flex items-center gap-2">
              ATLAS — Post-Sale & LTV
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Academy Intelligence</span>
            </h2>
            <p className="text-sm text-[#5F6572]">Gamification · Feedback-to-Copy · Lifetime Value Tracking</p>
          </div>
          <button onClick={loadData} className="p-2 text-[#9CA3AF] hover:text-[#1E2128]">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: "dashboard", label: "LTV Dashboard", icon: BarChart3 },
            { id: "students", label: "Studenti", icon: Users },
            { id: "bonuses", label: "Bonus Content", icon: Gift },
            { id: "feedback", label: "Feedback", icon: MessageSquare },
            { id: "angles", label: "Copy Angles", icon: Sparkles }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
                  : "text-[#9CA3AF] hover:text-[#5F6572]"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LTV Dashboard Tab */}
      {activeTab === "dashboard" && ltvData && (
        <div className="space-y-6">
          {/* Main KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5 border-t-4 border-t-yellow-500">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Asset Value</span>
              </div>
              <div className="font-mono text-3xl font-bold text-yellow-400">
                €{ltvData.ltv?.total_asset_value?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-[#9CA3AF] mt-1">Valore totale dell'Academy</div>
            </div>

            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5 border-t-4 border-t-green-500">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Studenti Attivi</span>
              </div>
              <div className="font-mono text-3xl font-bold text-green-400">
                {ltvData.students?.active || 0}
              </div>
              <div className="text-xs text-[#9CA3AF] mt-1">su {ltvData.students?.total || 0} totali</div>
            </div>

            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5 border-t-4 border-t-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Completion Rate</span>
              </div>
              <div className="font-mono text-3xl font-bold text-blue-400">
                {ltvData.students?.completion_rate?.toFixed(0) || 0}%
              </div>
              <div className="text-xs text-[#9CA3AF] mt-1">{ltvData.students?.completed || 0} completati</div>
            </div>

            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5 border-t-4 border-t-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Referral Revenue</span>
              </div>
              <div className="font-mono text-3xl font-bold text-purple-400">
                €{ltvData.referrals?.revenue?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-[#9CA3AF] mt-1">{ltvData.referrals?.converted || 0} conversioni</div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-3 gap-6">
            {/* Student Funnel */}
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
              <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" /> Student Funnel
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5F6572]">Totali</span>
                  <span className="font-mono font-bold text-[#1E2128]">{ltvData.students?.total || 0}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: "100%" }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5F6572]">Attivi</span>
                  <span className="font-mono font-bold text-green-400">{ltvData.students?.active || 0}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${(ltvData.students?.active / ltvData.students?.total * 100) || 0}%` }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5F6572]">Completati</span>
                  <span className="font-mono font-bold text-blue-400">{ltvData.students?.completed || 0}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${ltvData.students?.completion_rate || 0}%` }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5F6572]">Progress Medio</span>
                  <span className="font-mono font-bold text-yellow-400">{ltvData.students?.avg_progress?.toFixed(0) || 0}%</span>
                </div>
              </div>
            </div>

            {/* Referral Performance */}
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
              <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" /> Referral Performance
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAFAF7] rounded-lg p-3 text-center">
                    <div className="font-mono text-2xl font-bold text-[#1E2128]">{ltvData.referrals?.total || 0}</div>
                    <div className="text-[10px] text-[#9CA3AF]">Referral Totali</div>
                  </div>
                  <div className="bg-[#FAFAF7] rounded-lg p-3 text-center">
                    <div className="font-mono text-2xl font-bold text-green-400">{ltvData.referrals?.converted || 0}</div>
                    <div className="text-[10px] text-[#9CA3AF]">Convertiti</div>
                  </div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-purple-400 uppercase mb-1">Conversion Rate</div>
                  <div className="font-mono text-xl font-bold text-purple-400">
                    {ltvData.referrals?.conversion_rate?.toFixed(0) || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Gamification Stats */}
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
              <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" /> Gamification
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-yellow-500/10 rounded-lg p-3">
                  <span className="text-sm text-yellow-400">Punti Totali</span>
                  <span className="font-mono font-bold text-yellow-400">{ltvData.gamification?.total_points_earned?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between bg-green-500/10 rounded-lg p-3">
                  <span className="text-sm text-green-400">Bonus Sbloccati</span>
                  <span className="font-mono font-bold text-green-400">{ltvData.gamification?.total_bonuses_unlocked || 0}</span>
                </div>
                
                {/* Top Students */}
                {ltvData.gamification?.top_students?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] text-[#9CA3AF] uppercase mb-2">Top Performers</div>
                    {ltvData.gamification.top_students.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 border-b border-[#ECEDEF]">
                        <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                        <span className="flex-1 text-sm text-[#5F6572]">{s.name}</span>
                        <span className="font-mono text-xs text-yellow-400">{s.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LTV Summary */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-yellow-400 mb-1">Lifetime Value Summary</h3>
                <p className="text-sm text-[#5F6572]">Valore medio per studente nel ciclo di vita</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#9CA3AF] uppercase">LTV Medio</div>
                <div className="font-mono text-3xl font-extrabold text-yellow-400">
                  €{ltvData.ltv?.avg_ltv_per_student?.toFixed(0) || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#ECEDEF] bg-[#FAFAF7] flex items-center justify-between">
            <h3 className="font-bold">Studenti Academy ({students.length})</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {students.length === 0 ? (
              <div className="p-8 text-center text-[#9CA3AF]">
                Nessuno studente iscritto
              </div>
            ) : (
              students.map(student => (
                <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-[#FAFAF7]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-[#1E2128] font-bold">
                    {student.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#1E2128]">{student.name}</div>
                    <div className="text-xs text-[#9CA3AF]">{student.email}</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="font-mono text-sm font-bold text-blue-400">{student.progress_percent?.toFixed(0) || 0}%</div>
                    <div className="text-[10px] text-[#9CA3AF]">Progress</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="font-mono text-sm font-bold text-yellow-400">{student.gamification_points || 0}</div>
                    <div className="text-[10px] text-[#9CA3AF]">Punti</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="font-mono text-sm font-bold text-green-400">{student.unlocked_bonuses?.length || 0}</div>
                    <div className="text-[10px] text-[#9CA3AF]">Bonus</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    student.status === "active" ? "bg-green-500/20 text-green-400" :
                    student.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                    "bg-white/10 text-[#9CA3AF]"
                  }`}>
                    {student.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bonuses Tab */}
      {activeTab === "bonuses" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
            <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-400" /> Dynamic Content Unlock
            </h3>
            <p className="text-sm text-[#5F6572] mb-4">
              Contenuti bonus che si sbloccano automaticamente in base al comportamento dello studente (Gamification)
            </p>

            {bonuses.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF]">
                Nessun bonus configurato
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {bonuses.map(bonus => {
                  const condition = UNLOCK_CONDITIONS[bonus.unlock_condition] || {};
                  return (
                    <div key={bonus.id} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{condition.icon || "🎁"}</span>
                          <div>
                            <div className="font-bold text-[#1E2128]">{bonus.title}</div>
                            <span className={`text-xs ${condition.color || "text-[#9CA3AF]"}`}>
                              {condition.label || bonus.unlock_condition}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                          +{bonus.points_value} pts
                        </span>
                      </div>
                      <p className="text-sm text-[#5F6572]">{bonus.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] bg-white/10 text-[#9CA3AF] px-2 py-1 rounded">
                          {bonus.content_type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1E2128] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" /> Feedback Studenti
              </h3>
              <button
                onClick={analyzeFeedback}
                disabled={analyzing || feedback.filter(f => !f.analyzed).length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-[#1E2128] rounded-lg px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analizza con STEFANIA
              </button>
            </div>

            <div className="text-sm text-[#5F6572] mb-4">
              {feedback.filter(f => !f.analyzed).length} feedback da analizzare · {feedback.filter(f => f.analyzed).length} già analizzati
            </div>

            {feedback.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF]">
                Nessun feedback ricevuto
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {feedback.map(f => (
                  <div key={f.id} className={`bg-[#FAFAF7] border rounded-lg p-4 ${f.analyzed ? "border-green-500/30" : "border-[#ECEDEF]"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        f.feedback_type === "testimonial" ? "bg-green-500/20 text-green-400" :
                        f.feedback_type === "question" ? "bg-blue-500/20 text-blue-400" :
                        f.feedback_type === "complaint" ? "bg-red-500/20 text-red-400" :
                        "bg-white/10 text-[#9CA3AF]"
                      }`}>
                        {f.feedback_type}
                      </span>
                      {f.analyzed && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-[#5F6572]">{f.content}</p>
                    <div className="text-[10px] text-[#9CA3AF] mt-2">
                      {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copy Angles Tab */}
      {activeTab === "angles" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/10 border border-pink-500/30 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#1E2128]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1E2128]">Feedback-to-Copy Bridge</h3>
                <p className="text-sm text-[#5F6572]">Angoli di copy estratti da STEFANIA dai feedback studenti</p>
              </div>
            </div>

            {copyAngles.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF]">
                <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <div>Nessun angolo estratto</div>
                <div className="text-xs mt-2">Raccogli feedback e clicca "Analizza con STEFANIA"</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {copyAngles.map(angle => {
                  const typeConfig = ANGLE_TYPES[angle.angle_type] || ANGLE_TYPES.pain_point;
                  return (
                    <div key={angle.id} className="bg-white border border-[#ECEDEF] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{typeConfig.icon}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs text-yellow-400">{(angle.relevance_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-[#1E2128] mb-2">{angle.headline}</h4>
                      <p className="text-sm text-[#5F6572] mb-3">{angle.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${angle.used_in_campaign ? "text-green-400" : "text-[#9CA3AF]"}`}>
                          {angle.used_in_campaign ? "✓ Usato" : "Non usato"}
                        </span>
                        <button
                          onClick={() => copyToClipboard(angle.headline)}
                          className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#1E2128]"
                        >
                          <Copy className="w-3 h-3" /> Copia
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
