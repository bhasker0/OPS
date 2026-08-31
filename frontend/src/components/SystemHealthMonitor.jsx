import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Clock,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Trash2,
  Eye,
  Send,
  Radio,
  Zap
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import { API_BASE } from '../config/api';

export default function SystemHealthMonitor({ apiBase = API_BASE, onRefresh }) {
  const toast = useToast();

  const [healthData, setHealthData] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [dlqItems, setDlqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dlqStatusFilter, setDlqStatusFilter] = useState('');
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [retryingAll, setRetryingAll] = useState(false);

  // Fetch Telemetry Data
  const fetchHealthAndTelemetry = async () => {
    try {
      const res = await fetch(`${apiBase}/stats/health-deep`);
      const result = await res.json();
      if (result.success) {
        setHealthData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch health telemetry:', err);
    }
  };

  // Fetch Sync Stats & DLQ
  const fetchSyncDLQ = async () => {
    try {
      const [statsRes, dlqRes] = await Promise.all([
        fetch(`${apiBase}/sync/stats`),
        fetch(`${apiBase}/sync/dlq${dlqStatusFilter ? `?status=${dlqStatusFilter}` : ''}`),
      ]);

      const statsData = await statsRes.json();
      const dlqData = await dlqRes.json();

      if (statsData.success) setSyncStats(statsData.data);
      if (dlqData.success) setDlqItems(dlqData.data || []);
    } catch (err) {
      console.error('Failed to fetch sync DLQ data:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchHealthAndTelemetry(), fetchSyncDLQ()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [dlqStatusFilter]);

  // 10s Heartbeat Polling Loop
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealthAndTelemetry();
      fetchSyncDLQ();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, dlqStatusFilter]);

  // Replay Single DLQ Event
  const handleRetrySingle = async (id) => {
    setRetryingId(id);
    try {
      const res = await fetch(`${apiBase}/sync/dlq/${id}/retry`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Event replayed successfully.');
      } else {
        toast.error(result.message || 'Replay attempt failed.');
      }
      fetchSyncDLQ();
    } catch (err) {
      toast.error(`Replay error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  // Replay All Pending
  const handleRetryAll = async () => {
    setRetryingAll(true);
    try {
      const res = await fetch(`${apiBase}/sync/dlq/retry-all`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Processed pending events.');
      } else {
        toast.error(result.message || 'Failed to replay events.');
      }
      fetchSyncDLQ();
    } catch (err) {
      toast.error(`Retry all error: ${err.message}`);
    } finally {
      setRetryingAll(false);
    }
  };

  // Delete / Dismiss DLQ Event
  const handleDeleteDLQ = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await fetch(`${apiBase}/sync/dlq/${confirmDeleteId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.info('DLQ event dismissed.');
        fetchSyncDLQ();
      } else {
        toast.error(result.message || 'Failed to delete event.');
      }
    } catch (err) {
      toast.error(`Delete error: ${err.message}`);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Purge All Replayed DLQ Events
  const handlePurgeReplayed = async () => {
    try {
      const res = await fetch(`${apiBase}/sync/dlq/purge/replayed`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        fetchSyncDLQ();
      } else {
        toast.error(result.message || 'Failed to purge replayed events.');
      }
    } catch (err) {
      toast.error(`Purge error: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'UP':
      case 'HEALTHY':
      case 'REPLAYED':
        return <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={12} /> {status}</span>;
      case 'PENDING_RETRY':
      case 'BUFFERED':
      case 'STANDALONE_MODE':
      case 'WARNING':
      case 'DEGRADED':
        return <span className="badge badge-suspended" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={12} /> {status}</span>;
      default:
        return <span className="badge badge-inactive" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} /> {status || 'DOWN'}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={22} color="var(--primary)" />
            Live Infrastructure Telemetry & Outbound Sync Monitor
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Real-time DB cluster latency, Node.js process memory metrics, and ETMS Outbound Sync Dead-Letter Queue (DLQ).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer', background: '#f8fafc', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <Radio size={14} color={autoRefresh ? '#10b981' : '#94a3b8'} />
            Auto-Heartbeat (10s)
          </label>

          <button
            className="btn btn-secondary"
            onClick={loadAllData}
            disabled={loading}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Now
          </button>
        </div>
      </div>

      {/* OVERALL SYSTEM STATUS ALERT BANNER */}
      {healthData && (
        <div style={{
          background: healthData.status === 'HEALTHY' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${healthData.status === 'HEALTHY' ? '#a7f3d0' : '#fecaca'}`,
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {healthData.status === 'HEALTHY' ? (
              <CheckCircle size={22} color="#059669" />
            ) : (
              <AlertTriangle size={22} color="#dc2626" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: healthData.status === 'HEALTHY' ? '#065f46' : '#991b1b' }}>
                System Telemetry: {healthData.status} (Telemetry Query: {healthData.responseTimeMs}ms)
              </div>
              <div style={{ fontSize: '0.75rem', color: healthData.status === 'HEALTHY' ? '#047857' : '#b91c1c' }}>
                All core operational databases & services responding within baseline tolerances.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Clock size={14} /> Process Uptime: <strong>{healthData.runtime.uptimeFormatted}</strong>
          </div>
        </div>
      )}

      {/* HEARTBEAT LATENCY CLUSTERS GRID */}
      {healthData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* POSTGRES CARD */}
          <div className="card" style={{ borderTop: '3px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={18} color="#3b82f6" />
                <strong style={{ fontSize: '0.9rem' }}>PostgreSQL 16 Engine</strong>
              </div>
              {getStatusBadge(healthData.heartbeats.postgres.status)}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Primary multi-tenant relational store for companies, users, roles, and pricing tiers.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Heartbeat Latency</span>
              <strong style={{ fontSize: '0.85rem', color: healthData.heartbeats.postgres.latencyMs < 50 ? '#059669' : '#d97706' }}>
                ⚡ {healthData.heartbeats.postgres.latencyMs} ms
              </strong>
            </div>
          </div>

          {/* MONGO CARD */}
          <div className="card" style={{ borderTop: '3px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Server size={18} color="#10b981" />
                <strong style={{ fontSize: '0.9rem' }}>MongoDB 7 Audit Log Cluster</strong>
              </div>
              {getStatusBadge(healthData.heartbeats.mongo.status)}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              High-throughput immutable compliance audit logs, change diffs, and DLQ persistence.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Heartbeat Latency</span>
              <strong style={{ fontSize: '0.85rem', color: healthData.heartbeats.mongo.latencyMs < 50 ? '#059669' : '#d97706' }}>
                ⚡ {healthData.heartbeats.mongo.latencyMs} ms
              </strong>
            </div>
          </div>

          {/* ETMS GATEWAY CARD */}
          <div className="card" style={{ borderTop: '3px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Send size={18} color="#8b5cf6" />
                <strong style={{ fontSize: '0.9rem' }}>ETMS Outbound Sync Gateway</strong>
              </div>
              {getStatusBadge(healthData.heartbeats.etmsGateway.status)}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Cryptographically signed HMAC webhook synchronization for job-work production updates.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Gateway Latency</span>
              <strong style={{ fontSize: '0.85rem', color: '#6366f1' }}>
                {healthData.heartbeats.etmsGateway.latencyMs >= 0 ? `⚡ ${healthData.heartbeats.etmsGateway.latencyMs} ms` : 'Local Standalone'}
              </strong>
            </div>
          </div>

          {/* RUNTIME & MEMORY CARD */}
          <div className="card" style={{ borderTop: '3px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={18} color="#f59e0b" />
                <strong style={{ fontSize: '0.9rem' }}>Node.js Runtime Telemetry</strong>
              </div>
              <span className="badge badge-seed" style={{ fontSize: '0.7rem' }}>{healthData.runtime.nodeVersion}</span>
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Heap Memory Used:</span>
                <strong>{healthData.runtime.memory.heapUsedMB} MB / {healthData.runtime.memory.heapTotalMB} MB</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Resident Set Size (RSS):</span>
                <strong>{healthData.runtime.memory.rssMB} MB</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>PID / OS:</span>
                <strong>{healthData.runtime.processId} ({healthData.runtime.platform})</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OUTBOUND SYNC DEAD-LETTER QUEUE (DLQ) SECTION (SCRUM-83) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#f59e0b" />
              Outbound Sync Dead-Letter Queue (DLQ) & Event Replay Manager
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.1rem' }}>
              Events with delivery failures are held with backoff timers for zero-data-loss synchronization.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={dlqStatusFilter}
              onChange={(e) => setDlqStatusFilter(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderRadius: '5px', border: '1px solid var(--border)', background: 'white' }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING_RETRY">Pending Retry ({syncStats?.pendingCount || 0})</option>
              <option value="FAILED">Permanently Failed ({syncStats?.failedCount || 0})</option>
              <option value="REPLAYED">Replayed ({syncStats?.replayedCount || 0})</option>
            </select>

            {syncStats && syncStats.pendingCount > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleRetryAll}
                disabled={retryingAll}
                style={{ fontSize: '0.78rem' }}
              >
                <Play size={13} className={retryingAll ? 'spin' : ''} />
                Replay All Pending ({syncStats.pendingCount})
              </button>
            )}

            {syncStats && syncStats.replayedCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handlePurgeReplayed}
                style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                title="Clear all successfully replayed events from the queue"
              >
                <Trash2 size={13} /> Purge Replayed ({syncStats.replayedCount})
              </button>
            )}
          </div>
        </div>

        {/* DLQ SUMMARY METRIC COUNTERS */}
        {syncStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total DLQ Dispatches</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: '0.1rem' }}>{syncStats.totalCount}</div>
            </div>
            <div style={{ background: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
              <div style={{ fontSize: '0.7rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 600 }}>Pending Retries</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b45309', marginTop: '0.1rem' }}>{syncStats.pendingCount}</div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.7rem', color: '#047857', textTransform: 'uppercase', fontWeight: 600 }}>Successfully Replayed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857', marginTop: '0.1rem' }}>{syncStats.replayedCount}</div>
            </div>
            <div style={{ background: '#fef2f2', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.7rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 600 }}>Dead / Max Retries</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.1rem' }}>{syncStats.failedCount}</div>
            </div>
          </div>
        )}

        {/* DLQ TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Target Endpoint</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Last Error Message</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dlqItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Checking Dead-Letter Queue...' : '✨ Dead-Letter Queue is clean. Zero failed outbound sync events.'}
                  </td>
                </tr>
              ) : (
                dlqItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ fontSize: '0.82rem', color: '#4f46e5' }}>{item.eventType}</strong>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                        /{item.endpoint}
                      </code>
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: item.attemptCount >= item.maxAttempts ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {item.attemptCount} / {item.maxAttempts}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#b91c1c' }} title={item.lastError}>
                        {item.lastError || 'None'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                          title="Inspect JSON Payload"
                          onClick={() => setSelectedPayload(item)}
                        >
                          <Eye size={12} />
                        </button>
                        {item.status !== 'REPLAYED' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                            title="Replay Event"
                            disabled={retryingId === item._id}
                            onClick={() => handleRetrySingle(item._id)}
                          >
                            <Play size={12} className={retryingId === item._id ? 'spin' : ''} />
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', color: '#ef4444' }}
                          title="Dismiss Event"
                          onClick={() => setConfirmDeleteId(item._id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON PAYLOAD INSPECTOR MODAL */}
      {selectedPayload && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                DLQ Event Payload: {selectedPayload.eventType}
              </h3>
              <button
                onClick={() => setSelectedPayload(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
              Target Endpoint: <code>/{selectedPayload.endpoint}</code> | Attempt: {selectedPayload.attemptCount}/{selectedPayload.maxAttempts}
            </div>

            <pre style={{
              background: '#0f172a',
              color: '#f8fafc',
              padding: '1rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              overflowX: 'auto',
              maxHeight: '350px'
            }}>
              {JSON.stringify(selectedPayload.payload, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPayload(null)}>
                Close
              </button>
              {selectedPayload.status !== 'REPLAYED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const id = selectedPayload._id;
                    setSelectedPayload(null);
                    handleRetrySingle(id);
                  }}
                >
                  <Play size={14} /> Replay Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DISMISS CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        title="Dismiss Dead-Letter Event"
        message="Are you sure you want to dismiss this failed event from the Dead-Letter Queue? It will not be replayed to ETMS."
        confirmText="Dismiss Event"
        variant="danger"
        onConfirm={handleDeleteDLQ}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
