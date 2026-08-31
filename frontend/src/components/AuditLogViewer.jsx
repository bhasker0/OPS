import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Building,
  Calendar,
  Layers,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  X
} from 'lucide-react';
import Drawer from './ui/Drawer';
import { API_BASE } from '../config/api';

const MODULES = ['ALL', 'COMPANY', 'USER', 'ROLE', 'PARAMETER', 'TRANSACTION', 'SUBSCRIPTION', 'SYSTEM', 'AUTH'];

export default function AuditLogViewer({
  companies = [],
  apiBase = API_BASE,
  companyId = null,
  onRefresh
}) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCompany, setSelectedCompany] = useState(companyId || 'ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('ALL'); // 'ALL', '24H', '7D', '30D'

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Inspection Modal
  const [inspectedLog, setInspectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);

      const targetCompany = companyId || (selectedCompany !== 'ALL' ? selectedCompany : '');
      if (targetCompany) params.append('companyId', targetCompany);
      if (selectedModule !== 'ALL') params.append('module', selectedModule);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      if (dateRange === '24H') {
        params.append('startDate', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === '7D') {
        params.append('startDate', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === '30D') {
        params.append('startDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      }

      const [logRes, statRes] = await Promise.all([
        fetch(`${apiBase}/audit-logs?${params.toString()}`),
        fetch(`${apiBase}/audit-logs/stats${targetCompany ? `?companyId=${targetCompany}` : ''}`)
      ]);

      const logData = await logRes.json();
      const statData = await statRes.json();

      if (logData.success) {
        setLogs(logData.data);
        if (logData.pagination) {
          setPagination(logData.pagination);
        }
      }

      if (statData.success) {
        setStats(statData.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedCompany, selectedModule, selectedStatus, dateRange, page, limit, companyId]);

  const handleCopyJson = () => {
    if (!inspectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(inspectedLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExportQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedCompany && selectedCompany !== 'ALL') params.append('companyId', selectedCompany);
    if (companyId) params.append('companyId', companyId);
    if (selectedModule && selectedModule !== 'ALL') params.append('module', selectedModule);
    if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
    if (searchQuery) params.append('search', searchQuery);

    if (dateRange !== 'ALL') {
      const now = new Date();
      if (dateRange === '24H') {
        params.append('startDate', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === '7D') {
        params.append('startDate', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === '30D') {
        params.append('startDate', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
      }
    }
    return params.toString();
  };

  const handleExportCsv = () => {
    const qs = getExportQueryParams();
    window.open(`${apiBase}/audit-logs/export/csv?${qs}`, '_blank');
  };

  const handleExportJson = () => {
    const qs = getExportQueryParams();
    window.open(`${apiBase}/audit-logs/export/json?${qs}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER & ACTION BUTTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={22} style={{ color: '#4f46e5' }} />
            Audit Trail & Compliance Inspector
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
            Real-time immutable MongoDB compliance logs, change-deltas, and security forensic telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Download size={13} /> Export CSV
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleExportJson}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Download size={13} /> Export JSON
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* AGGREGATE SUMMARY PILLS */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div className="card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid #4f46e5' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Audit Events</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e1b4b' }}>{stats.totalEvents}</div>
          </div>
          <div className="card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Successful Mutations</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#064e3b' }}>{stats.byStatus?.SUCCESS || 0}</div>
          </div>
          <div className="card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid #dc2626' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Security Alerts & Blocks</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7f1d1d' }}>{stats.byStatus?.FAILURE || stats.byStatus?.WARNING || 0}</div>
          </div>
          <div className="card" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid #8b5cf6' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Logging Modules</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4c1d95' }}>{Object.keys(stats.byModule || {}).length}</div>
          </div>
        </div>
      )}

      {/* MULTI-FILTER TOOLBAR */}
      <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '340px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by action, operator, details..."
              className="form-control"
              style={{ paddingLeft: '2.1rem', fontSize: '0.8rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchLogs(); }}
            />
          </div>

          {/* Company Filter (if in global view) */}
          {!companyId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building size={13} style={{ color: '#64748b' }} />
              <select
                className="form-control"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                value={selectedCompany}
                onChange={(e) => { setSelectedCompany(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Module Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setPage(1); }}
            >
              {MODULES.map((m) => (
                <option key={m} value={m}>Module: {m}</option>
              ))}
            </select>
          </div>

          {/* Date Range Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
            >
              <option value="ALL">All Time</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="card table-container" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Timestamp (IST)</th>
              <th>Module</th>
              <th>Action / Event</th>
              <th>Operator</th>
              <th>Status</th>
              <th>Change Delta</th>
              <th>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Loading audit event streams...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No matching audit records found.
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => {
                const isBlocked = log.action && (log.action.includes('BLOCKED') || log.action.includes('FAIL'));
                const isDelete = log.action && log.action.includes('DELETE');
                const hasDiff = !!log.diff && Object.keys(log.diff).length > 0;

                return (
                  <tr key={log._id || idx}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-IN')}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                        {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          background: '#ede9fe',
                          color: '#5b21b6',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}
                      >
                        {log.module}
                      </span>
                    </td>

                    <td>
                      <strong style={{ color: isBlocked ? '#dc2626' : isDelete ? '#d97706' : '#0f172a', fontSize: '0.78rem' }}>
                        {log.action}
                      </strong>
                    </td>

                    <td style={{ fontSize: '0.75rem' }}>
                      <div>{log.performedBy || 'admin@ops.saas'}</div>
                      <code style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{log.ipAddress || '127.0.0.1'}</code>
                    </td>

                    <td>
                      <span
                        style={{
                          background: log.status === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
                          color: log.status === 'SUCCESS' ? '#065f46' : '#991b1b',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: log.status === 'SUCCESS' ? '#10b981' : '#ef4444' }} />
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>

                    <td>
                      {hasDiff ? (
                        <span
                          style={{
                            background: '#e0e7ff',
                            color: '#3730a3',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                        >
                          ⚡ Delta Tracked
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>—</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => setInspectedLog(log)}
                        title="Inspect full JSON telemetry"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
          <span>Rows per page:</span>
          <select
            className="form-control"
            style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>Total: {pagination.total} records</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((prev) => prev + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* LIVE INSPECTION DRAWER */}
      <Drawer
        isOpen={Boolean(inspectedLog)}
        onClose={() => setInspectedLog(null)}
        title={inspectedLog ? `${inspectedLog.module}: ${inspectedLog.action}` : 'Audit Event Inspector'}
        subtitle={inspectedLog ? `Timestamp: ${new Date(inspectedLog.createdAt).toLocaleString('en-IN')} • ID: ${inspectedLog._id}` : ''}
        icon={<Shield size={18} />}
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setInspectedLog(null)}
            style={{ fontSize: '0.78rem' }}
          >
            Close Inspector
          </button>
        }
      >
        {inspectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* TELEMETRY METRICS GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.65rem',
                background: 'var(--bg-canvas)',
                padding: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.78rem',
              }}
            >
              <div>Operator: <strong>{inspectedLog.performedBy}</strong></div>
              <div>
                Status:{' '}
                <span
                  style={{
                    fontWeight: 700,
                    color: inspectedLog.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {inspectedLog.status}
                </span>
              </div>
              <div>IP Address: <code>{inspectedLog.ipAddress || '127.0.0.1'}</code></div>
              <div>Company ID: <code>{inspectedLog.companyId || 'Global / N/A'}</code></div>
            </div>

            {/* MUTATION DIFF SECTION (IF PRESENT) */}
            {inspectedLog.diff && Object.keys(inspectedLog.diff).length > 0 && (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                  ⚡ Field Mutation Change-Delta
                </div>
                <div
                  style={{
                    background: 'var(--success-light)',
                    border: '1px solid var(--success)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                  }}
                >
                  <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--success)', overflowX: 'auto' }}>
                    {JSON.stringify(inspectedLog.diff, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* RAW JSON VIEWER */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Raw Audit Event Payload (MongoDB)
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  onClick={handleCopyJson}
                >
                  {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>

              <pre
                style={{
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: '1rem',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                  maxHeight: '360px',
                }}
              >
                {JSON.stringify(inspectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}