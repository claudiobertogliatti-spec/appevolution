import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../../utils/api-config';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, 
  Eye, RefreshCw, User, FileText, Mail, MessageSquare,
  ChevronDown, ChevronUp
} from 'lucide-react';

const ApprovalDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved_today: 0,
    rejected_today: 0,
    stale_over_4h: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [reviewerName, setReviewerName] = useState('Antonella');
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch(`${API}/agent-tasks/approvals`),
        fetch(`${API}/agent-tasks/approval-stats`)
      ]);
      
      const tasksData = await tasksRes.json();
      const statsData = await statsRes.json();
      
      setTasks(tasksData.tasks || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching approval data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (taskId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/agent-tasks/${taskId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: reviewerName })
      });
      
      if (response.ok) {
        fetchData();
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error approving task:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (taskId) => {
    if (!feedback.trim()) {
      alert('Il feedback è obbligatorio per rifiutare un task');
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/agent-tasks/${taskId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: reviewerName, feedback: feedback.trim() })
      });
      
      if (response.ok) {
        fetchData();
        setSelectedTask(null);
        setFeedback('');
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getAgentIcon = (agent) => {
    switch (agent?.toUpperCase()) {
      case 'STEFANIA': return <Mail className="w-4 h-4" />;
      case 'GAIA': return <MessageSquare className="w-4 h-4" />;
      case 'LUCA': return <FileText className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getAgentColor = (agent) => {
    switch (agent?.toUpperCase()) {
      case 'STEFANIA': return 'bg-pink-50 text-pink-600 border-pink-200';
      case 'GAIA': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'LUCA': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'MARCO': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'ANDREA': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'VALENTINA': return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}g fa`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m fa`;
    return `${diffMins}m fa`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="approval-dashboard" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>Approvazioni</h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Revisiona e approva gli output degli agenti AI</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #ECEDEF', borderTop: '3px solid #F59E0B' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#F59E0B' }}>
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">In Attesa</span>
          </div>
          <span className="text-3xl font-bold" style={{ color: '#1E2128' }}>{stats.pending}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #ECEDEF', borderTop: '3px solid #10B981' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#10B981' }}>
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Approvati Oggi</span>
          </div>
          <span className="text-3xl font-bold" style={{ color: '#1E2128' }}>{stats.approved_today}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #ECEDEF', borderTop: '3px solid #EF4444' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#EF4444' }}>
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Rifiutati Oggi</span>
          </div>
          <span className="text-3xl font-bold" style={{ color: '#1E2128' }}>{stats.rejected_today}</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #ECEDEF', borderTop: stats.stale_over_4h > 0 ? '3px solid #EF4444' : '3px solid #F2C418' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: '#F2C418' }}>
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">&gt;4h Attesa</span>
          </div>
          <span className="text-3xl font-bold" style={{ color: '#1E2128' }}>{stats.stale_over_4h}</span>
        </div>
      </div>

      {/* Reviewer Selection */}
      <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
        <span className="text-sm font-medium" style={{ color: '#5F6572' }}>Reviewer:</span>
        <select 
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm font-medium focus:outline-none"
          style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
        >
          <option value="Antonella">Antonella</option>
          <option value="Claudio">Claudio</option>
        </select>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10B981' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>Tutto approvato!</h3>
          <p style={{ color: '#9CA3AF' }}>Non ci sono task in attesa di revisione.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-white rounded-xl overflow-hidden shadow-sm"
              style={{ border: '1px solid #ECEDEF' }}
              data-testid={`approval-task-${task.id}`}
            >
              {/* Task Header */}
              <div 
                className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Status Indicator */}
                    <div className="w-2 h-2 rounded-full mt-2 animate-pulse" style={{ background: '#F59E0B' }}></div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getAgentColor(task.agent)}`}>
                          {getAgentIcon(task.agent)}
                          <span className="ml-1">{task.agent}</span>
                        </span>
                        {task.approval?.revision_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>
                            Revisione #{task.approval.revision_count}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-medium" style={{ color: '#1E2128' }}>{task.title}</h3>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                        <span>Creato: {formatTimeAgo(task.created_at)}</span>
                        {task.partner_id && (
                          <span style={{ color: '#8B5CF6' }}>Partner: {task.partner_id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {expandedTask === task.id ? (
                      <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    ) : (
                      <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedTask === task.id && (
                <div className="p-4 space-y-4" style={{ borderTop: '1px solid #ECEDEF', background: '#FAFAF7' }}>
                  {/* Output Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: '#5F6572' }}>
                      <Eye className="w-4 h-4" />
                      Output Generato
                    </h4>
                    <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto" style={{ border: '1px solid #ECEDEF' }}>
                      <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: '#374151' }}>
                        {task.result?.output || task.result?.message || 'Nessun output disponibile'}
                      </pre>
                    </div>
                  </div>
                  
                  {/* Previous Revisions */}
                  {task.revisions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2" style={{ color: '#5F6572' }}>Revisioni Precedenti</h4>
                      <div className="space-y-2">
                        {task.revisions.map((rev, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 text-sm" style={{ border: '1px solid #ECEDEF' }}>
                            <div className="flex items-center justify-between mb-1">
                              <span style={{ color: '#B45309' }}>Versione {rev.version}</span>
                              <span className="text-xs" style={{ color: '#9CA3AF' }}>{formatTimeAgo(rev.created_at)}</span>
                            </div>
                            <p className="text-xs" style={{ color: '#EF4444' }}>Feedback: {rev.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Feedback Input (for rejection) */}
                  <div>
                    <h4 className="text-sm font-medium mb-2" style={{ color: '#5F6572' }}>Feedback (obbligatorio per rifiuto)</h4>
                    <textarea
                      value={selectedTask === task.id ? feedback : ''}
                      onChange={(e) => {
                        setSelectedTask(task.id);
                        setFeedback(e.target.value);
                      }}
                      placeholder="Es: Il blocco 3 è troppo generico, aggiungi un esempio concreto..."
                      className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2"
                      style={{ background: 'white', border: '1px solid #ECEDEF', color: '#1E2128' }}
                      rows={3}
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReject(task.id)}
                      disabled={actionLoading || (selectedTask === task.id && !feedback.trim())}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                    >
                      <XCircle className="w-4 h-4" />
                      Rifiuta
                    </button>
                    <button
                      onClick={() => handleApprove(task.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      style={{ background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approva
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalDashboard;
