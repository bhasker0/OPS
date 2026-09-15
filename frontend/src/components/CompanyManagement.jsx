import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Search,
  Sliders,
  Headphones,
  Lock,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Filter,
  FileSpreadsheet,
  Globe,
  MapPin,
  ExternalLink,
  Shield,
  RefreshCw,
  Power,
  Archive,
} from 'lucide-react';
import CompanyOnboardingWizard from './CompanyOnboardingWizard';
import CompanyParameterDrawer from './CompanyParameterDrawer';
import TenantReconciliationModal from './TenantReconciliationModal';
import TableActionMenu from './TableActionMenu';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiClient';

export default function CompanyManagement({
  companies = [],
  apiBase = API_BASE,
  onCompanyCreated,
  onOperateCompany,
  onRefresh
}) {
  const toast = useToast();
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SUSPENDED'
  const [showWizard, setShowWizard] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [selectedParamCompany, setSelectedParamCompany] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [killswitchCompany, setKillswitchCompany] = useState(null);
  const [killswitchLoading, setKillswitchLoading] = useState(false);

  // ETMS Tenant Reconciliation State (SCRUM-103)
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [untrackedCount, setUntrackedCount] = useState(0);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    company: null,
    newStatus: null,
    loading: false,
  });

  // Filter logic
  const filteredCompanies = companies.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || (c.status || 'ACTIVE') === statusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c?.name || '').toLowerCase().includes(q) ||
      (c?.code || '').toLowerCase().includes(q) ||
      (c?.gstin || '').toLowerCase().includes(q) ||
      (c?.contactPerson || '').toLowerCase().includes(q) ||
      (c?.address || '').toLowerCase().includes(q)
    );
  });

  const handleStatusTogglePrompt = (company) => {
    const currentStatus = company.status || 'ACTIVE';
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setConfirmModal({
      isOpen: true,
      company,
      newStatus,
      loading: false,
    });
  };

  const handleConfirmStatusToggle = async () => {
    const { company, newStatus } = confirmModal;
    if (!company) return;

    setConfirmModal((prev) => ({ ...prev, loading: true }));
    setStatusUpdatingId(company.id);

    try {
      const res = await apiFetch(`${apiBase}/companies/${company.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Tenant '${company.name}' status updated to ${newStatus}. Logged to Audit Trail.`,
          'Status Changed'
        );
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to update status', 'Status Update Error');
      }
    } catch (err) {
      toast.error('Network error while updating company status.', 'Status Update Error');
    } finally {
      setStatusUpdatingId(null);
      setConfirmModal({ isOpen: false, company: null, newStatus: null, loading: false });
    }
  };

  const handleCreateCompany = async (formData) => {
    setWizardLoading(true);
    try {
      const res = await fetch(`${apiBase}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowWizard(false);
        toast.success(`Tenant '${data.data.name}' provisioned successfully!`, 'Company Onboarded');
        if (onCompanyCreated) onCompanyCreated(data.data);
      } else {
        toast.error(data.message || 'Failed to register company', 'Onboarding Error');
      }
    } catch (err) {
      toast.error('Error connecting to backend API during registration.', 'Network Error');
    } finally {
      setWizardLoading(false);
    }
  };

  const handleRevokeCompanySessions = async () => {
    if (!killswitchCompany) return;
    setKillswitchLoading(true);
    try {
      const res = await fetch(`${apiBase}/companies/${killswitchCompany.id}/revoke-sessions`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.warning(`Killswitch Activated: All active sessions for '${killswitchCompany.name}' terminated.`, 'Sessions Revoked');
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to revoke sessions.');
      }
    } catch (err) {
      toast.error('Network error executing killswitch.');
    } finally {
      setKillswitchLoading(false);
      setKillswitchCompany(null);
    }
  };

  const [exportingArchiveId, setExportingArchiveId] = useState(null);

  const handleExportTenantArchive = async (company) => {
    setExportingArchiveId(company.id);
    try {
      const res = await fetch(`${apiBase}/companies/${company.id}/export-archive`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', result.archive_filename || `TENANT_ARCHIVE_${company.code}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success(`Data archive exported with SHA-256: ${result.checksum_sha256.slice(0, 12)}...`, 'Tenant Data Portability');
      } else {
        toast.error(result.message || 'Failed to export tenant archive');
      }
    } catch (e) {
      toast.error('Network error during archive generation');
    } finally {
      setExportingArchiveId(null);
    }
  };

  React.useEffect(() => {
    const checkUntrackedTenants = async () => {
      try {
        const res = await fetch(`${apiBase}/sync/reconcile/discovery`);
        const data = await res.json();
        if (data.success) {
          setUntrackedCount(data.data.untrackedCount || 0);
        }
      } catch (e) {
        // Ignore background check error
      }
    };
    checkUntrackedTenants();
  }, [companies, apiBase]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER & CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={18} color="var(--accent-red)" />
            Tenant Directory & Specifications
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0 0' }}>
            Master factory directory, GSTIN compliance, and 18-attribute parameter store
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'var(--bg-surface)' : 'none',
                border: 'none',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'table' ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: viewMode === 'table' ? 'var(--shadow-card)' : 'none',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--bg-surface)' : 'none',
                border: 'none',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'grid' ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-card)' : 'none',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Grid Cards View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setShowReconcileModal(true)}
            style={{
              fontSize: '0.78rem',
              borderColor: untrackedCount > 0 ? 'var(--accent-yellow)' : 'var(--border)',
              background: untrackedCount > 0 ? 'var(--accent-yellow-bg)' : 'var(--bg-surface)',
              color: untrackedCount > 0 ? 'var(--accent-yellow)' : 'inherit',
            }}
            title="Scan and Reconcile untracked ETMS companies into OPS Master"
          >
            <Shield size={13} color={untrackedCount > 0 ? 'var(--accent-yellow)' : 'var(--primary)'} />
            Reconcile ETMS
            {untrackedCount > 0 && (
              <span
                className="badge badge-pastel-red font-mono-tabular"
                style={{ marginLeft: '0.35rem' }}
              >
                {untrackedCount} untracked
              </span>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowWizard(true)}
            style={{ fontSize: '0.78rem' }}
          >
            <Plus size={13} /> Provision Tenant
          </button>
        </div>
      </div>

      {/* TELEMETRY READOUT BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 0.85rem',
          fontSize: '0.75rem',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Registry Telemetry:</span>
        <span className="badge badge-pastel-blue">Registered: {companies.length}</span>
        <span className="badge badge-pastel-green">Active: {companies.filter(c => (c.status || 'ACTIVE') === 'ACTIVE').length}</span>
        <span className={`badge ${untrackedCount > 0 ? 'badge-pastel-yellow' : 'badge-pastel-blue'}`}>Untracked ETMS: {untrackedCount}</span>
        <span className="badge badge-pastel-blue">Param Store: 18 Rules</span>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tenant name, code, GSTIN, contact..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={13} color="var(--text-muted)" />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses ({companies.length})</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Showing <strong className="font-mono-tabular">{filteredCompanies.length}</strong> of <strong className="font-mono-tabular">{companies.length}</strong> tenants
        </span>
      </div>

      {/* VIEW: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="table-container" style={{ borderRadius: 'var(--radius-sm)' }}>
          <table>
            <thead>
              <tr>
                <th>Tenant Identity</th>
                <th>Status</th>
                <th>GSTIN (Tax ID)</th>
                <th>Operator Contact</th>
                <th>Localization</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => {
                const isActive = (c.status || 'ACTIVE') === 'ACTIVE';

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem' }}>
                            {c.code.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                            {c.name}
                            {c.isSeed && <span className="badge badge-pastel-yellow" style={{ marginLeft: '0.35rem' }}>Seed</span>}
                          </div>
                          <span className="font-mono-tabular" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.code}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <button
                        onClick={() => !c.isSeed && handleStatusTogglePrompt(c)}
                        disabled={c.isSeed || statusUpdatingId === c.id}
                        className={`badge ${isActive ? 'badge-pastel-green' : 'badge-pastel-red'}`}
                        style={{
                          cursor: c.isSeed ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          border: 'none'
                        }}
                        title={c.isSeed ? 'Seed company cannot be toggled' : `Click to toggle status to ${isActive ? 'SUSPENDED' : 'ACTIVE'}`}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isActive ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                        {c.status || 'ACTIVE'}
                      </button>
                    </td>

                    <td>
                      {c.gstin ? (
                        <span className="font-mono-tabular" style={{ background: 'var(--bg-surface-elevated)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.72rem', fontWeight: 600 }}>
                          {c.gstin}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>N/A</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {c.contactPerson || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.mobile || c.email || ''}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c.currency || 'INR'} ({c.currencySymbol || '₹'}) &bull; {c.dateFormat || 'DD/MM/YYYY'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => onOperateCompany && onOperateCompany(c)}
                        >
                          <Headphones size={11} /> Support
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => setSelectedParamCompany(c)}
                          title="Open Parameter Store Drawer"
                        >
                          <Sliders size={11} /> Params
                        </button>

                        <TableActionMenu
                          actions={[
                            {
                              label: 'Open Support Workspace',
                              icon: <Headphones size={12} color="var(--primary)" />,
                              onClick: () => onOperateCompany && onOperateCompany(c)
                            },
                            {
                              label: 'Parameter Store & Rules',
                              icon: <Sliders size={12} color="var(--accent-blue)" />,
                              onClick: () => setSelectedParamCompany(c)
                            },
                            {
                              label: isActive ? 'Suspend Tenant Access' : 'Activate Tenant',
                              icon: <Power size={12} color={isActive ? 'var(--accent-red)' : 'var(--accent-green)'} />,
                              disabled: c.isSeed,
                              onClick: () => handleStatusTogglePrompt(c)
                            },
                            {
                              label: exportingArchiveId === c.id ? 'Exporting Archive...' : 'Export Tenant Archive (JSON)',
                              icon: <Archive size={12} />,
                              disabled: exportingArchiveId === c.id,
                              onClick: () => handleExportTenantArchive(c)
                            },
                            {
                              label: 'Revoke All Sessions (Killswitch)',
                              icon: <Shield size={12} />,
                              danger: true,
                              disabled: c.isSeed,
                              onClick: () => setKillswitchCompany(c)
                            }
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: GRID CARDS VIEW */}
      {viewMode === 'grid' && (
        <div className="bento-grid">
          {filteredCompanies.map((c) => {
            const isActive = (c.status || 'ACTIVE') === 'ACTIVE';

            return (
              <div
                key={c.id}
                className="bento-card bento-span-4"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {c.name}
                      </h3>
                      <span className="font-mono-tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.code}</span>
                    </div>

                    <span className={`badge ${isActive ? 'badge-pastel-green' : 'badge-pastel-red'}`}>
                      {c.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div>GSTIN: <span className="font-mono-tabular" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{c.gstin || 'N/A'}</span></div>
                    <div>Contact: <strong style={{ color: 'var(--text-main)' }}>{c.contactPerson || 'N/A'}</strong></div>
                    <div>Email: <span>{c.email || 'N/A'}</span></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
                    onClick={() => onOperateCompany && onOperateCompany(c)}
                  >
                    <Headphones size={13} /> Support
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => setSelectedParamCompany(c)}
                  >
                    <Sliders size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MULTI-STEP ONBOARDING WIZARD */}
      <CompanyOnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSubmit={handleCreateCompany}
        loading={wizardLoading}
      />

      {/* SLIDE-OVER PARAMETER STORE DRAWER */}
      <CompanyParameterDrawer
        isOpen={!!selectedParamCompany}
        company={selectedParamCompany}
        onClose={() => setSelectedParamCompany(null)}
        apiBase={apiBase}
        onParameterUpdated={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* CONFIRMATION DIALOG MODAL (SCRUM-78) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={`Change Status: ${confirmModal.company?.name || 'Company'}`}
        message={`Are you sure you want to change the tenant status from '${confirmModal.company?.status || 'ACTIVE'}' to '${confirmModal.newStatus}'? ${
          confirmModal.newStatus === 'SUSPENDED'
            ? 'Suspended tenants will lose access to ETMS operations until reactivated.'
            : 'Active tenants will regain full access to all micro-ERP features.'
        }`}
        confirmText={confirmModal.newStatus === 'SUSPENDED' ? 'Suspend Tenant' : 'Activate Tenant'}
        cancelText="Cancel"
        variant={confirmModal.newStatus === 'SUSPENDED' ? 'danger' : 'warning'}
        loading={confirmModal.loading}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => setConfirmModal({ isOpen: false, company: null, newStatus: null, loading: false })}
      />

      {/* TENANT SESSION KILLSWITCH CONFIRM MODAL (SCRUM-84) */}
      <ConfirmModal
        isOpen={Boolean(killswitchCompany)}
        title={`Activate Killswitch: ${killswitchCompany?.name || 'Company'}`}
        message={`Are you sure you want to immediately terminate all active user sessions and invalidate all JWT tokens for '${killswitchCompany?.name}' (${killswitchCompany?.code})? All active devices across this tenant will be forced to log in again.`}
        confirmText="Revoke All Tenant Sessions"
        cancelText="Cancel"
        variant="danger"
        loading={killswitchLoading}
        onConfirm={handleRevokeCompanySessions}
        onCancel={() => setKillswitchCompany(null)}
      />

      {/* ETMS TENANT RECONCILIATION MODAL (SCRUM-103) */}
      <TenantReconciliationModal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        apiBase={apiBase}
        onReconciled={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}