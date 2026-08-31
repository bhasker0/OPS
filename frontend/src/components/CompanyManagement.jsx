import React, { useState } from 'react';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Building size={22} style={{ color: '#4f46e5' }} />
            Tenant & Company Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
            Centralized control plane for multi-tenant lifecycle, compliance GSTIN, and parameter overrides.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#ffffff' : 'none',
                border: 'none',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
                color: viewMode === 'table' ? '#4f46e5' : '#64748b',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Table View"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#ffffff' : 'none',
                border: 'none',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
                color: viewMode === 'grid' ? '#4f46e5' : '#64748b',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Grid Cards View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setShowReconcileModal(true)}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              position: 'relative',
              borderColor: untrackedCount > 0 ? '#f59e0b' : 'var(--border)',
              background: untrackedCount > 0 ? '#fffbeb' : '#ffffff',
              color: untrackedCount > 0 ? '#b45309' : 'inherit',
              fontWeight: untrackedCount > 0 ? 700 : 500,
            }}
            title="Scan and Reconcile untracked ETMS companies into OPS Master"
          >
            <Shield size={13} color={untrackedCount > 0 ? '#d97706' : '#4f46e5'} />
            Reconcile ETMS
            {untrackedCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '0.1rem 0.35rem',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  marginLeft: '0.2rem',
                }}
              >
                {untrackedCount}
              </span>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowWizard(true)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={14} /> Provision Tenant
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, GSTIN, code, contact..."
              className="form-control"
              style={{ paddingLeft: '2.1rem', fontSize: '0.8rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses ({companies.length})</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>

        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Showing {filteredCompanies.length} of {companies.length} Tenants
        </span>
      </div>

      {/* VIEW: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="card table-container" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Tenant Identity</th>
                <th>Status</th>
                <th>GSTIN (Tax ID)</th>
                <th>Contact Person</th>
                <th>Localization</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => {
                const isActive = (c.status || 'ACTIVE') === 'ACTIVE';

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                            {c.code.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {c.name}
                            {c.isSeed && <span className="badge badge-seed" style={{ marginLeft: '0.35rem' }}>000 SEED</span>}
                          </div>
                          <code style={{ fontSize: '0.72rem', color: '#4f46e5' }}>{c.code}</code>
                        </div>
                      </div>
                    </td>

                    <td>
                      <button
                        onClick={() => !c.isSeed && handleStatusTogglePrompt(c)}
                        disabled={c.isSeed || statusUpdatingId === c.id}
                        style={{
                          background: isActive ? '#ecfdf5' : '#fef2f2',
                          color: isActive ? '#059669' : '#dc2626',
                          border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: c.isSeed ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title={c.isSeed ? 'Seed company cannot be toggled' : `Click to toggle status to ${isActive ? 'SUSPENDED' : 'ACTIVE'}`}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444' }} />
                        {c.status || 'ACTIVE'}
                      </button>
                    </td>

                    <td>
                      {c.gstin ? (
                        <code className="mono" style={{ background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '3px', color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>
                          {c.gstin}
                        </code>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>N/A</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                        {c.contactPerson || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {c.mobile || c.email || ''}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                        {c.currency || 'INR'} ({c.currencySymbol || '₹'}) • {c.dateFormat || 'DD/MM/YYYY'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => onOperateCompany && onOperateCompany(c)}
                        >
                          <Headphones size={12} /> Support Mode
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => setSelectedParamCompany(c)}
                          title="Open Parameter Store Drawer"
                        >
                          <Sliders size={12} /> Parameters
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: '#0284c7', background: '#f0f9ff', borderColor: '#bae6fd', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => handleExportTenantArchive(c)}
                          title="Download Complete Tenant Data Archive (GDPR / DPDP Compliance)"
                          disabled={exportingArchiveId === c.id}
                        >
                          <Archive size={12} /> {exportingArchiveId === c.id ? 'Exporting...' : 'Archive'}
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => setKillswitchCompany(c)}
                          title="Revoke All Active Sessions (Killswitch)"
                          disabled={c.isSeed}
                        >
                          <Shield size={12} /> Killswitch
                        </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredCompanies.map((c) => {
            const isActive = (c.status || 'ACTIVE') === 'ACTIVE';

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  borderTop: `3px solid ${isActive ? '#4f46e5' : '#ef4444'}`
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {c.name}
                      </h3>
                      <code style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>{c.code}</code>
                    </div>

                    <span
                      style={{
                        background: isActive ? '#ecfdf5' : '#fef2f2',
                        color: isActive ? '#059669' : '#dc2626',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}
                    >
                      {c.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.76rem', color: '#475569' }}>
                    <div>GSTIN: <code style={{ color: '#1e40af', fontWeight: 600 }}>{c.gstin || 'N/A'}</code></div>
                    <div>Contact: <strong>{c.contactPerson || 'N/A'}</strong></div>
                    <div>Email: <small>{c.email || 'N/A'}</small></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
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