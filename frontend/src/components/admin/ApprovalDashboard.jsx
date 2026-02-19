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
      case 'STEFANIA': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'GAIA': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'LUCA': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ORION': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
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
    <div className="p-6 space-y-6" data-testid="approval-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Approvazioni</h1>
          <p className="text-gray-400 text-sm">Revisiona e approva gli output degli agenti AI</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">In Attesa</span>
          </div>
          <span className="text-3xl font-bold text-white">{stats.pending}</span>
        </div>
        
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Approvati Oggi</span>
          </div>
          <span className="text-3xl font-bold text-white">{stats.approved_today}</span>
        </div>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Rifiutati Oggi</span>
          </div>
          <span className="text-3xl font-bold text-white">{stats.rejected_today}</span>
        </div>
        
        <div className={`rounded-xl p-4 ${stats.stale_over_4h > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-800 border border-gray-700'}`}>
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">&gt;4h Attesa</span>
          </div>
          <span className="text-3xl font-bold text-white">{stats.stale_over_4h}</span>
        </div>
      </div>

      {/* Reviewer Selection */}
      <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-3">
        <span className="text-gray-400 text-sm">Reviewer:</span>
        <select 
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm"
        >
          <option value="Antonella">Antonella</option>
          <option value="Claudio">Claudio</option>
        </select>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-gray-800/50 rounded-xl p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Tutto approvato!</h3>
          <p className="text-gray-400">Non ci sono task in attesa di revisione.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
              data-testid={`approval-task-${task.id}`}
            >
              {/* Task Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-800/80 transition-colors"
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Status Indicator */}
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 animate-pulse"></div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getAgentColor(task.agent)}`}>
                          {getAgentIcon(task.agent)}
                          <span className="ml-1">{task.agent}</span>
                        </span>
                        {task.approval?.revision_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Revisione #{task.approval.revision_count}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-white font-medium">{task.title}</h3>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>Creato: {formatTimeAgo(task.created_at)}</span>
                        {task.partner_id && (
                          <span className="text-purple-400">Partner: {task.partner_id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {expandedTask === task.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedTask === task.id && (
                <div className="border-t border-gray-700 p-4 space-y-4">
                  {/* Output Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Output Generato
                    </h4>
                    <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                        {task.result?.output || task.result?.message || 'Nessun output disponibile'}
                      </pre>
                    </div>
                  </div>
                  
                  {/* Previous Revisions */}
                  {task.revisions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Revisioni Precedenti</h4>
                      <div className="space-y-2">
                        {task.revisions.map((rev, idx) => (
                          <div key={idx} className="bg-gray-900/50 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-yellow-400">Versione {rev.version}</span>
                              <span className="text-gray-500 text-xs">{formatTimeAgo(rev.created_at)}</span>
                            </div>
                            <p className="text-red-400 text-xs mb-1">Feedback: {rev.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Feedback Input (for rejection) */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Feedback (obbligatorio per rifiuto)</h4>
                    <textarea
                      value={selectedTask === task.id ? feedback : ''}
                      onChange={(e) => {
                        setSelectedTask(task.id);
                        setFeedback(e.target.value);
                      }}
                      placeholder="Es: Il blocco 3 è troppo generico, aggiungi un esempio concreto..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                      rows={3}
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReject(task.id)}
                      disabled={actionLoading || (selectedTask === task.id && !feedback.trim())}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Rifiuta
                    </button>
                    <button
                      onClick={() => handleApprove(task.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
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
