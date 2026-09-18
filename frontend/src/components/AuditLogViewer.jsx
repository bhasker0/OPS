import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Building,
  Layers,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Clock,
  Sparkles
} from 'lucide-react';
import Drawer from './ui/Drawer';
import { API_BASE } from '../config/api';

const MODULES = ['ALL', 'COMPANY', 'USER', 'ROLE', 'PARAMETER', 'TRANSACTION', 'SUBSCRIPTION', 'SYSTEM', 'AUTH'];

export default function AuditLogViewer({
  companies = [],
  apiBase = API_BASE,
  companyId = null,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <FileText size={18} color="var(--accent-red)" />
            Audit Trail
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0 0' }}>
            System event logs, operator actions, and state changes
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ fontSize: '0.78rem' }}
          >
            <Download size={13} /> Export CSV
          </button>

          <button
            className="btn btn-primary"
            onClick={handleExportJson}
            style={{ fontSize: '0.78rem' }}
          >
            <Download size={13} /> Export NDJSON
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* AGGREGATE SUMMARY BENTO STRIP */}
      {stats && (
        <div className="kpi-strip">
          <div className="kpi-card-compact">
            <div>
              <div className="kpi-metric-label">Total Events</div>
              <div className="kpi-metric-value">{stats.totalEvents}</div>
            </div>
          </div>
          <div className="kpi-card-compact" style={{ borderLeft: '3px solid var(--accent-green)' }}>
            <div>
              <div className="kpi-metric-label" style={{ color: 'var(--accent-green)' }}>Successful</div>
              <div className="kpi-metric-value" style={{ color: 'var(--accent-green)' }}>{stats.byStatus?.SUCCESS || 0}</div>
            </div>
          </div>
          <div className="kpi-card-compact" style={{ borderLeft: '3px solid var(--accent-red)' }}>
            <div>
              <div className="kpi-metric-label" style={{ color: 'var(--accent-red)' }}>Alerts & Failures</div>
              <div className="kpi-metric-value" style={{ color: 'var(--accent-red)' }}>{stats.byStatus?.FAILURE || stats.byStatus?.WARNING || 0}</div>
            </div>
          </div>
          <div className="kpi-card-compact">
            <div>
              <div className="kpi-metric-label">Modules</div>
              <div className="kpi-metric-value">{Object.keys(stats.byModule || {}).length}</div>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENTED FILTERS BAR */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '360px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search action, operator, details..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchLogs(); }}
            />
          </div>

          {/* Segmented Time-Window Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-surface-elevated)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0 0.4rem' }}>
              <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} /> Window:
            </span>
            {['24H', '7D', '30D', 'ALL'].map((range) => (
              <button
                key={range}
                type="button"
                className={`btn ${dateRange === range ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: dateRange === range ? 'var(--shadow-card)' : 'none'
                }}
                onClick={() => { setDateRange(range); setPage(1); }}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Company Filter */}
          {!companyId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building size={14} color="var(--text-muted)" />
              <select
                className="form-control"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)' }}
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
            <Layers size={14} color="var(--text-muted)" />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)' }}
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setPage(1); }}
            >
              {MODULES.map((m) => (
                <option key={m} value={m}>Module: {m}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)' }}
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

      {/* EDITORIAL AUDIT STREAM TABLE */}
      <div className="table-container" style={{ borderRadius: 'var(--radius-sm)' }}>
        <table>
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Module</th>
              <th>Action / Event</th>
              <th>Operator</th>
              <th>Status</th>
              <th>Change Delta</th>
              <th style={{ textAlign: 'right' }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Querying MongoDB audit telemetry...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Zero matching audit records located
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => {
                const isBlocked = log.action && (log.action.includes('BLOCKED') || log.action.includes('FAIL'));
                const isDelete = log.action && log.action.includes('DELETE');
                const hasDiff = !!log.diff && Object.keys(log.diff).length > 0;

                return (
                  <tr key={log._id || idx}>
                    <td className="font-mono-tabular" style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      <div>{new Date(log.createdAt).toISOString().split('T')[0]}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {new Date(log.createdAt).toISOString().split('T')[1].replace('Z', '')}
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-pastel-blue">
                        {log.module}
                      </span>
                    </td>

                    <td>
                      <strong style={{ color: isBlocked ? 'var(--accent-red)' : isDelete ? 'var(--accent-yellow)' : 'var(--text-main)', fontSize: '0.8125rem' }}>
                        {log.action}
                      </strong>
                    </td>

                    <td style={{ fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 500 }}>{log.performedBy || 'admin@ops.saas'}</div>
                      <span className="font-mono-tabular" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-pastel-green' : 'badge-pastel-red'}`}>
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>

                    <td>
                      {hasDiff ? (
                        <span className="badge badge-pastel-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Sparkles size={10} /> Delta Tracked
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => setInspectedLog(log)}
                        title="Inspect full JSON telemetry and mutation delta"
                      >
                        <Eye size={12} /> View
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <span>Rows per page:</span>
          <select
            className="form-control"
            style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="font-mono-tabular">Total: {pagination.total} events</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((prev) => prev + 1)}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 1-BIT MUTATION DIFF & LIVE INSPECTION DRAWER */}
      <Drawer
        isOpen={Boolean(inspectedLog)}
        onClose={() => setInspectedLog(null)}
        title={inspectedLog ? `Audit Event: ${inspectedLog.module} › ${inspectedLog.action}` : 'Audit Event'}
        subtitle={inspectedLog ? `Timestamp: ${new Date(inspectedLog.createdAt).toISOString()} • UUID: ${inspectedLog._id}` : ''}
        icon={<Terminal size={18} color="var(--accent-red)" />}
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setInspectedLog(null)}
            style={{ fontSize: '0.78rem' }}
          >
            Close
          </button>
        }
      >
        {inspectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* TELEMETRY METRICS SPEC SHEET */}
            <div className="spec-sheet-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="spec-sheet-row">
                <span className="spec-sheet-key">Operator</span>
                <span className="spec-sheet-val">{inspectedLog.performedBy}</span>
              </div>
              <div className="spec-sheet-row">
                <span className="spec-sheet-key">Status</span>
                <span className="spec-sheet-val">
                  <span className={`badge ${inspectedLog.status === 'SUCCESS' ? 'badge-pastel-green' : 'badge-pastel-red'}`}>
                    {inspectedLog.status}
                  </span>
                </span>
              </div>
              <div className="spec-sheet-row">
                <span className="spec-sheet-key">IP Address</span>
                <span className="spec-sheet-val font-mono-tabular">{inspectedLog.ipAddress || '127.0.0.1'}</span>
              </div>
              <div className="spec-sheet-row">
                <span className="spec-sheet-key">Tenant ID</span>
                <span className="spec-sheet-val font-mono-tabular">{inspectedLog.companyId || 'Global Control Plane'}</span>
              </div>
            </div>

            {/* 1-BIT MUTATION DIFF SECTION */}
            {inspectedLog.diff && Object.keys(inspectedLog.diff).length > 0 && (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={14} color="var(--accent-yellow)" />
                  <span>Mutation Changes</span>
                </div>
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    fontSize: '0.78rem',
                  }}
                >
                  {Object.entries(inspectedLog.diff).map(([key, delta]) => {
                    const isPrimitiveDiff = delta && typeof delta === 'object' && ('old' in delta || 'new' in delta);
                    return (
                      <div key={key} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                          Field: <span className="font-mono-tabular" style={{ color: 'var(--text-muted)' }}>{key}</span>
                        </div>
                        {isPrimitiveDiff ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {delta.old !== undefined && (
                              <div style={{ color: 'var(--accent-red)', background: 'var(--accent-red-bg)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(159, 47, 45, 0.2)', textDecoration: 'line-through' }}>
                                [-] Prev: {JSON.stringify(delta.old)}
                              </div>
                            )}
                            {delta.new !== undefined && (
                              <div style={{ color: 'var(--accent-green)', background: 'var(--accent-green-bg)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(43, 89, 63, 0.2)' }}>
                                [+] Next: {JSON.stringify(delta.new)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {JSON.stringify(delta, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
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
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Event Payload
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.75rem',
                  }}
                  onClick={handleCopyJson}
                >
                  {copied ? <Check size={12} color="var(--accent-green)" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <pre
                style={{
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-main)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  overflowX: 'auto',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
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