import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Clock,
  Cpu,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Trash2,
  Eye,
  Send,
  Zap,
  Terminal,
  ArrowUpRight
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import Drawer from './ui/Drawer';
import { API_BASE } from '../config/api';

export default function SystemHealthMonitor({ apiBase = API_BASE }) {
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

  // 10s Heartbeat Polling Loop (no flashing)
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
        return (
          <span className="badge badge-pastel-green">
            <CheckCircle size={11} /> {status}
          </span>
        );
      case 'PENDING_RETRY':
      case 'BUFFERED':
      case 'STANDALONE_MODE':
      case 'WARNING':
      case 'DEGRADED':
        return (
          <span className="badge badge-pastel-yellow">
            <AlertTriangle size={11} /> {status}
          </span>
        );
      default:
        return (
          <span className="badge badge-pastel-red">
            <XCircle size={11} /> {status || 'DOWN'}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER COCKPIT BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
            <Activity size={18} color="var(--accent-red)" />
            System Health & DLQ Telemetry
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0 0' }}>
            Live cluster latency, database connection pools, and forensic dead-letter dispatch queues
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', cursor: 'pointer', background: 'var(--bg-surface)', padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span className={autoRefresh ? 'phosphor-beacon' : ''} style={{ width: '6px', height: '6px' }} />
            <span>Heartbeat: 10s</span>
          </label>

          <button
            className="btn btn-secondary"
            onClick={loadAllData}
            disabled={loading}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* OVERALL SYSTEM STATUS ALERT BANNER */}
      {healthData && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="phosphor-beacon" style={{ width: '8px', height: '8px' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Status:</span>
                <span style={{ color: healthData.status === 'HEALTHY' ? 'var(--accent-green)' : 'var(--danger)', fontWeight: 700 }}>
                  {healthData.status}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>&bull;</span>
                <span>Response Latency:</span>
                <span className="font-mono-tabular" style={{ fontWeight: 600 }}>{healthData.responseTimeMs}ms</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                All telemetry sockets responding within calibrated tolerances.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <Clock size={14} />
            <span>Uptime:</span>
            <strong className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>{healthData.runtime.uptimeFormatted}</strong>
          </div>
        </div>
      )}

      {/* BENTO TELEMETRY CARDS GRID */}
      {healthData && (
        <div className="bento-grid">
          {/* POSTGRESQL CARD */}
          <div className="bento-card bento-span-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Database size={16} color="var(--accent-blue)" />
                <strong style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>PostgreSQL 16</strong>
              </div>
              {getStatusBadge(healthData.heartbeats.postgres.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role</span>
                <span style={{ fontWeight: 500 }}>Relational Store</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Latency</span>
                <strong className="font-mono-tabular" style={{ color: healthData.heartbeats.postgres.latencyMs < 50 ? 'var(--accent-green)' : 'var(--warning)', fontSize: '0.875rem' }}>
                  {healthData.heartbeats.postgres.latencyMs} ms
                </strong>
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.max(15, healthData.heartbeats.postgres.latencyMs * 2))}%`, background: 'var(--accent-green)', borderRadius: 'var(--radius-full)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* MONGODB AUDIT CLUSTER CARD */}
          <div className="bento-card bento-span-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Server size={16} color="var(--accent-green)" />
                <strong style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>MongoDB Audit</strong>
              </div>
              {getStatusBadge(healthData.heartbeats.mongo.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role</span>
                <span style={{ fontWeight: 500 }}>Immutable Trail</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Latency</span>
                <strong className="font-mono-tabular" style={{ color: healthData.heartbeats.mongo.latencyMs < 50 ? 'var(--accent-green)' : 'var(--warning)', fontSize: '0.875rem' }}>
                  {healthData.heartbeats.mongo.latencyMs} ms
                </strong>
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.max(15, healthData.heartbeats.mongo.latencyMs * 2))}%`, background: 'var(--accent-green)', borderRadius: 'var(--radius-full)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ETMS GATEWAY CARD */}
          <div className="bento-card bento-span-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Send size={16} color="var(--accent-yellow)" />
                <strong style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>ETMS Gateway</strong>
              </div>
              {getStatusBadge(healthData.heartbeats.etmsGateway.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sync Protocol</span>
                <span style={{ fontWeight: 500 }}>HMAC-SHA256</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Socket Link</span>
                <strong className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>
                  {healthData.heartbeats.etmsGateway.latencyMs >= 0 ? `${healthData.heartbeats.etmsGateway.latencyMs} ms` : 'Local Standalone'}
                </strong>
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: 'var(--accent-yellow)', borderRadius: 'var(--radius-full)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* NODE RUNTIME & MEMORY CARD */}
          <div className="bento-card bento-span-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Cpu size={16} color="var(--accent-red)" />
                <strong style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Node.js Runtime</strong>
              </div>
              <span className="badge badge-seed">{healthData.runtime.nodeVersion}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Heap Memory</span>
                <strong className="font-mono-tabular">{healthData.runtime.memory.heapUsedMB} MB / {healthData.runtime.memory.heapTotalMB} MB</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>PID / Platform</span>
                <span className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>{healthData.runtime.processId} ({healthData.runtime.platform})</span>
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <div style={{ height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((healthData.runtime.memory.heapUsedMB / Math.max(1, healthData.runtime.memory.heapTotalMB)) * 100))}%`,
                      background: 'var(--primary)',
                      borderRadius: 'var(--radius-full)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OUTBOUND SYNC DEAD-LETTER QUEUE (DLQ) BENTO SECTION */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0, color: 'var(--text-main)' }}>
              <Zap size={16} color="var(--accent-yellow)" />
              Dead-Letter Queue (DLQ) Incident Matrix
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
              Zero-data-loss holding buffer with backoff retry controls
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={dlqStatusFilter}
              onChange={(e) => setDlqStatusFilter(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', width: '180px', borderRadius: 'var(--radius-sm)' }}
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
                <Play size={12} className={retryingAll ? 'spin' : ''} />
                Replay All Pending ({syncStats.pendingCount})
              </button>
            )}

            {syncStats && syncStats.replayedCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handlePurgeReplayed}
                style={{ fontSize: '0.78rem' }}
                title="Clear all successfully replayed events from the queue"
              >
                <Trash2 size={12} />
                Purge Replayed ({syncStats.replayedCount})
              </button>
            )}
          </div>
        </div>

        {/* DLQ SUMMARY METRIC BENTO STRIP */}
        {syncStats && (
          <div className="kpi-strip" style={{ marginBottom: '1.25rem' }}>
            <div className="kpi-card-compact">
              <div>
                <div className="kpi-metric-label">Total Dispatches</div>
                <div className="kpi-metric-value">{syncStats.totalCount}</div>
              </div>
            </div>
            <div className="kpi-card-compact" style={{ borderLeft: '3px solid var(--accent-yellow)' }}>
              <div>
                <div className="kpi-metric-label" style={{ color: 'var(--accent-yellow)' }}>Pending Retries</div>
                <div className="kpi-metric-value" style={{ color: 'var(--accent-yellow)' }}>{syncStats.pendingCount}</div>
              </div>
            </div>
            <div className="kpi-card-compact" style={{ borderLeft: '3px solid var(--accent-green)' }}>
              <div>
                <div className="kpi-metric-label" style={{ color: 'var(--accent-green)' }}>Replayed (ACK)</div>
                <div className="kpi-metric-value" style={{ color: 'var(--accent-green)' }}>{syncStats.replayedCount}</div>
              </div>
            </div>
            <div className="kpi-card-compact" style={{ borderLeft: '3px solid var(--accent-red)' }}>
              <div>
                <div className="kpi-metric-label" style={{ color: 'var(--accent-red)' }}>Dead / Exhausted</div>
                <div className="kpi-metric-value" style={{ color: 'var(--accent-red)' }}>{syncStats.failedCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* DLQ HIGH DENSITY TABLE */}
        <div className="table-container" style={{ borderRadius: 'var(--radius-sm)' }}>
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Target Endpoint</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Last Error Message</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dlqItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Querying DLQ buffer...' : 'DLQ holding buffer is clean &bull; 0 failed events'}
                  </td>
                </tr>
              ) : (
                dlqItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>{item.eventType}</strong>
                    </td>
                    <td>
                      <span className="font-mono-tabular" style={{ fontSize: '0.75rem', background: 'var(--bg-surface-elevated)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        /{item.endpoint}
                      </span>
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      <span className="font-mono-tabular" style={{ fontSize: '0.78rem', fontWeight: 600, color: item.attemptCount >= item.maxAttempts ? 'var(--danger)' : 'var(--text-main)' }}>
                        {item.attemptCount} / {item.maxAttempts}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--accent-red)' }} title={item.lastError}>
                        {item.lastError || 'None'}
                      </span>
                    </td>
                    <td className="font-mono-tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Inspect JSON Payload"
                          onClick={() => setSelectedPayload(item)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {item.status !== 'REPLAYED' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Replay Event"
                            disabled={retryingId === item._id}
                            onClick={() => handleRetrySingle(item._id)}
                          >
                            <Play size={12} className={retryingId === item._id ? 'spin' : ''} /> Replay
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-red)' }}
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

      {/* JSON PAYLOAD INSPECTOR DRAWER */}
      <Drawer
        isOpen={Boolean(selectedPayload)}
        onClose={() => setSelectedPayload(null)}
        title={selectedPayload ? `DLQ Packet: ${selectedPayload.eventType}` : 'DLQ Packet Inspector'}
        subtitle={selectedPayload ? `Target: /${selectedPayload.endpoint} | Attempt: ${selectedPayload.attemptCount}/${selectedPayload.maxAttempts}` : ''}
        icon={<Terminal size={18} color="var(--accent-red)" />}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedPayload(null)}>
              Close
            </button>
            {selectedPayload && selectedPayload.status !== 'REPLAYED' && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const id = selectedPayload._id;
                  setSelectedPayload(null);
                  handleRetrySingle(id);
                }}
              >
                <Play size={13} /> Replay Packet Now
              </button>
            )}
          </div>
        }
      >
        {selectedPayload && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Packet ID: <strong className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>{selectedPayload._id}</strong></span>
              <span className="font-mono-tabular">{new Date(selectedPayload.createdAt).toISOString()}</span>
            </div>

            {selectedPayload.lastError && (
              <div style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(159, 47, 45, 0.2)', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                <strong>Last Transmission Error:</strong>
                <div style={{ marginTop: '0.25rem' }}>{selectedPayload.lastError}</div>
              </div>
            )}

            <pre style={{
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-main)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              maxHeight: '400px',
              lineHeight: 1.5,
            }}>
              {JSON.stringify(selectedPayload.payload, null, 2)}
            </pre>
          </div>
        )}
      </Drawer>

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

