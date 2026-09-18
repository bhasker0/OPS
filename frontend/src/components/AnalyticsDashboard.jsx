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
  ExternalLink,
  ChevronRight
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--accent-red)" />
            Executive Analytics
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0 0' }}>
            Subscription volume, annualized run-rate, and platform metrics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Polling Toggle Badge */}
          <button
            onClick={() => setPollingActive(!pollingActive)}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem' }}
            title="Toggle automatic 30s polling"
          >
            <span className={pollingActive ? 'phosphor-beacon' : ''} style={{ width: '6px', height: '6px' }} />
            <span>{pollingActive ? `${countdown}s` : 'Paused'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => fetchDashboardStats(true)}
            disabled={refreshing}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh
          </button>

          {/* Quick Action: Register Company */}
          <button
            className="btn btn-primary"
            onClick={onRegisterCompany}
            style={{ fontSize: '0.78rem' }}
          >
            <Plus size={13} /> New Tenant
          </button>
        </div>
      </div>

      {/* ERROR BANNER WITH RETRY CTA */}
      {fetchError && (
        <div
          className="alert alert-error"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={16} color="var(--danger)" />
            <div>
              <strong>Error:</strong> {fetchError}
            </div>
          </div>
          <button
            onClick={() => fetchDashboardStats(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem' }}
          >
            <RefreshCw size={12} className={refreshing ? 'spin' : ''} /> Retry
          </button>
        </div>
      )}

      {/* SKELETON LOADER STATE */}
      {loading && !stats ? (
        <div className="bento-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bento-card bento-span-3" style={{ height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading metrics...</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* COMPACT RESPONSIVE KPI METRIC STRIP */}
          <KpiStrip
            items={[
              {
                label: 'Active Tenants',
                value: `${stats?.activeCompanies ?? 0} / ${stats?.totalCompanies ?? 0}`,
                subtext: `${stats?.suspendedCompanies ?? 0} suspended`,
                icon: <Building size={16} />,
                accentColor: 'var(--text-main)',
                filterKey: 'companies',
                tooltip: 'Registered Companies'
              },
              {
                label: 'Monthly Run-Rate (MRR)',
                value: stats?.mrrFormatted || formatIndianCurrency(stats?.mrr || 0),
                subtext: `ARR: ${stats?.arrFormatted || formatIndianCurrency(stats?.arr || 0)}`,
                icon: <TrendingUp size={16} />,
                accentColor: 'var(--accent-green)',
                filterKey: 'subscriptions',
                tooltip: 'Subscriptions & Billing'
              },
              {
                label: 'System Uptime',
                value: `${stats?.systemHealth?.uptimePercent ?? 99.99}%`,
                subtext: 'Operational',
                icon: <Activity size={16} />,
                accentColor: 'var(--text-main)',
                filterKey: 'system_health',
                tooltip: 'System Health'
              },
              {
                label: 'Platform Users',
                value: String(stats?.totalUsers ?? 0),
                subtext: `${stats?.internalOpsUsers ?? 0} Admin, ${stats?.tenantUsers ?? 0} Tenants`,
                icon: <Users size={16} />,
                accentColor: 'var(--warning)',
                filterKey: 'all_users',
                tooltip: 'User Directory'
              }
            ]}
            onFilterSelect={(tabKey) => onNavigateTab && onNavigateTab(tabKey)}
          />

          {/* ASYMMETRICAL BENTO FINANCIAL BLUEPRINT & ACTIONS */}
          <div className="bento-grid">
            {/* PRIMARY ARR / MONETIZATION BANNER */}
            <div className="bento-card bento-span-8" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Annual Recurring Revenue (ARR)
                  </div>
                  <span className="badge badge-pastel-green">
                    <TrendingUp size={11} /> {stats?.activeCompanies ?? 0} Active Plans
                  </span>
                </div>

                <div style={{
                  fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-serif)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.05,
                  color: 'var(--text-main)',
                  marginTop: '0.25rem',
                }}>
                  {stats?.arrFormatted || formatIndianCurrency(stats?.arr || 0)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                  Annualized subscriptions calculated from active tenant tiers
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Revenue (MRR)</div>
                  <div className="font-mono-tabular" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px' }}>
                    {stats?.mrrFormatted || formatIndianCurrency(stats?.mrr || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Tenants</div>
                  <div className="font-mono-tabular" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {stats?.activeCompanies ?? 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Sync</div>
                  <div className="font-mono-tabular" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                    {lastRefreshed.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            {/* OPERATIONAL SHORTCUTS BENTO BOX */}
            <div className="bento-card bento-span-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                  Shortcuts
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onNavigateTab && onNavigateTab('companies')}
                    style={{ justifyContent: 'space-between', padding: '0.6rem 0.85rem', fontSize: '0.78rem', width: '100%' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building size={14} color="var(--accent-blue)" /> Tenants
                    </span>
                    <ChevronRight size={13} color="var(--text-tertiary)" />
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onNavigateTab && onNavigateTab('all_users')}
                    style={{ justifyContent: 'space-between', padding: '0.6rem 0.85rem', fontSize: '0.78rem', width: '100%' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={14} color="var(--accent-green)" /> Users
                    </span>
                    <ChevronRight size={13} color="var(--text-tertiary)" />
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onNavigateTab && onNavigateTab('global_audit')}
                    style={{ justifyContent: 'space-between', padding: '0.6rem 0.85rem', fontSize: '0.78rem', width: '100%' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={14} color="var(--accent-red)" /> Audit Trail
                    </span>
                    <ChevronRight size={13} color="var(--text-tertiary)" />
                  </button>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={onRegisterCompany}
                style={{ width: '100%', fontSize: '0.78rem', padding: '0.55rem' }}
              >
                <Plus size={13} /> New Tenant
              </button>
            </div>
          </div>

          {/* RECENT TRANSACTIONS & INFRASTRUCTURE STATUS GRID */}
          <div className="bento-grid">
            {/* Recent Transactions Snapshot */}
            <div className="bento-card bento-span-6" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <CreditCard size={15} color="var(--accent-green)" />
                  <span>Recent Transactions</span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                  onClick={() => onNavigateTab && onNavigateTab('subscriptions')}
                >
                  View All
                </button>
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
                        padding: '0.6rem 0.85rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{tx.company?.name || 'Tenant'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{tx.description || 'Subscription Renewal'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="font-mono-tabular" style={{ fontWeight: 700, color: tx.status === 'SUCCESS' ? 'var(--accent-green)' : tx.status === 'REFUNDED' ? 'var(--warning)' : 'var(--danger)', fontSize: '0.875rem' }}>
                          {formatIndianCurrency(tx.amount)}
                        </div>
                        <span className={`badge ${tx.status === 'SUCCESS' ? 'badge-pastel-green' : 'badge-pastel-red'}`} style={{ fontSize: '0.68rem', marginTop: '0.15rem' }}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  No transactions recorded
                </div>
              )}
            </div>

            {/* Infrastructure & Database Health */}
            <div className="bento-card bento-span-6" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Activity size={15} color="var(--accent-blue)" />
                  <span>Infrastructure</span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                  onClick={() => onNavigateTab && onNavigateTab('system_health')}
                >
                  System Health
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={15} color="var(--accent-blue)" />
                    <span style={{ fontWeight: 600 }}>PostgreSQL</span>
                  </div>
                  <span className="badge badge-pastel-green">Healthy</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={15} color="var(--accent-green)" />
                    <span style={{ fontWeight: 600 }}>MongoDB</span>
                  </div>
                  <span className="badge badge-pastel-green">Connected</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={15} color="var(--accent-yellow)" />
                    <span style={{ fontWeight: 600 }}>Heartbeat</span>
                  </div>
                  <span className="font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
                    {lastRefreshed.toLocaleTimeString()}
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