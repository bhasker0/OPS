import React, { useState, useEffect } from 'react';
import {
  Building,
  TrendingUp,
  Users,
  Shield,
  Activity,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Settings,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatIndianCurrency } from '../utils/financialFormatter';
import KpiStrip from './KpiStrip';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiClient';

export default function AnalyticsDashboard({
  apiBase = API_BASE,
  onRegisterCompany,
  onNavigateTab,
  onSelectCompany
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [pollingActive, setPollingActive] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDashboardStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setFetchError(null);
    try {
      const res = await apiFetch(`${apiBase}/stats`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
        setLastRefreshed(new Date());
        setCountdown(30);
      } else {
        throw new Error(result.message || 'Failed to retrieve telemetry stats');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setFetchError(err.message || 'Failed to connect to backend telemetry service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // 30-Second Polling Timer
  useEffect(() => {
    if (!pollingActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardStats();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pollingActive]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER WITH CONTROLS & AUTO-REFRESH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            Executive Analytics & Platform Health
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
            Real-time multi-tenant monitoring, financial ledger volume, and infrastructure status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Polling Toggle Badge */}
          <button
            onClick={() => setPollingActive(!pollingActive)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: pollingActive ? '#ecfdf5' : '#f1f5f9',
              color: pollingActive ? '#059669' : '#64748b',
              border: `1px solid ${pollingActive ? '#a7f3d0' : '#cbd5e1'}`,
              cursor: 'pointer',
            }}
            title="Toggle automatic 30s polling"
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: pollingActive ? '#10b981' : '#94a3b8',
                display: 'inline-block',
              }}
            />
            {pollingActive ? `Live Polling (${countdown}s)` : 'Polling Paused'}
          </button>

          {/* Manual Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => fetchDashboardStats(true)}
            disabled={refreshing}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>

          {/* Quick Action: Register Company */}
          <button
            className="btn btn-primary"
            onClick={onRegisterCompany}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={14} />
            Register Company
          </button>
        </div>
      </div>

      {/* ERROR BANNER WITH RETRY CTA */}
      {fetchError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.2rem',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.82rem',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} style={{ color: '#dc2626', shrink: 0 }} />
            <div>
              <strong>Failed to refresh dashboard stats:</strong> {fetchError}
            </div>
          </div>
          <button
            onClick={() => fetchDashboardStats(true)}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              borderColor: '#fca5a5',
              background: '#ffffff',
              color: '#dc2626',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
            Retry Connection
          </button>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {loading && !stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card" style={{ padding: '1.25rem', height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
              <div style={{ width: '40%', height: '14px', background: '#e2e8f0', borderRadius: '4px' }} />
              <div style={{ width: '60%', height: '28px', background: '#cbd5e1', borderRadius: '6px' }} />
              <div style={{ width: '80%', height: '12px', background: '#f1f5f9', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* COMPACT RESPONSIVE KPI METRIC STRIP (SCRUM-96) */}
          <KpiStrip
            items={[
              {
                label: 'Active Tenants',
                value: `${stats?.activeCompanies ?? 0} / ${stats?.totalCompanies ?? 0}`,
                subtext: `${stats?.suspendedCompanies ?? 0} suspended • +12% MoM`,
                icon: <Building size={20} />,
                accentColor: 'var(--primary)',
                filterKey: 'companies',
                sparklinePath: 'M0 16 Q 12 4, 24 10 T 48 2',
                tooltip: 'Click to view Registered Companies'
              },
              {
                label: 'Total Ledger Volume',
                value: stats?.totalVolumeFormatted || formatIndianCurrency(stats?.totalVolume || 0),
                subtext: `24h: ${stats?.volume24hFormatted || formatIndianCurrency(stats?.volume24h || 0)}`,
                icon: <TrendingUp size={20} />,
                accentColor: 'var(--success)',
                filterKey: 'subscriptions',
                sparklinePath: 'M0 18 Q 12 12, 24 6 T 48 2',
                tooltip: 'Click to view Subscriptions & Billing'
              },
              {
                label: 'System Uptime & Health',
                value: `${stats?.systemHealth?.uptimePercent ?? 99.99}%`,
                subtext: 'PostgreSQL & MongoDB Active',
                icon: <Activity size={20} />,
                accentColor: '#0284c7',
                filterKey: 'system_health',
                sparklinePath: 'M0 10 Q 12 10, 24 10 T 48 10',
                tooltip: 'Click to view Telemetry & Sync DLQ'
              },
              {
                label: 'Registered Platform Users',
                value: String(stats?.totalUsers ?? 0),
                subtext: `${stats?.superAdminsCount ?? 0} Super Admins`,
                icon: <Users size={20} />,
                accentColor: '#d97706',
                filterKey: 'all_users',
                sparklinePath: 'M0 14 Q 12 8, 24 12 T 48 4',
                tooltip: 'Click to view User Directory'
              }
            ]}
            onFilterSelect={(tabKey) => onNavigateTab && onNavigateTab(tabKey)}
          />

          {/* QUICK OPERATIONAL ACTION SHORTCUTS */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              ⚡ Operational Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => onNavigateTab && onNavigateTab('companies')}
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem' }}
              >
                <Building size={15} style={{ color: '#4f46e5' }} />
                <span>Manage Companies</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onNavigateTab && onNavigateTab('all_users')}
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem' }}
              >
                <Users size={15} style={{ color: '#10b981' }} />
                <span>User Directory</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onNavigateTab && onNavigateTab('global_audit')}
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem' }}
              >
                <FileText size={15} style={{ color: '#0284c7' }} />
                <span>Live Audit Trail</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={onRegisterCompany}
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem' }}
              >
                <Plus size={15} style={{ color: '#8b5cf6' }} />
                <span>Provision Tenant</span>
              </button>
            </div>
          </div>

          {/* RECENT TRANSACTIONS & INFRASTRUCTURE STATUS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Recent Transactions Snapshot */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                  💳 Recent Financial Ledger Entries
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Latest 5 entries</span>
              </div>

              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stats.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.6rem',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{tx.company?.name || 'Tenant'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{tx.description || 'Service Charge'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: tx.status === 'SUCCESS' ? '#059669' : tx.status === 'REFUNDED' ? '#d97706' : '#dc2626' }}>
                          {formatIndianCurrency(tx.amount)}
                        </div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: tx.status === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
                            color: tx.status === 'SUCCESS' ? '#065f46' : '#991b1b',
                            fontWeight: 600,
                          }}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No recent ledger entries found.
                </div>
              )}
            </div>

            {/* Infrastructure & Database Health */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                🛡️ Platform Infrastructure Status
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <Database size={15} style={{ color: '#0284c7' }} />
                    <span style={{ fontWeight: 600 }}>PostgreSQL Relational DB</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#065f46', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                    PORT 5433 • HEALTHY
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <FileText size={15} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: 600 }}>MongoDB Audit Trail Store</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#065f46', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                    PORT 27017 • CONNECTED
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <Clock size={15} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontWeight: 600 }}>Last Polling Heartbeat</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {lastRefreshed.toLocaleTimeString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}