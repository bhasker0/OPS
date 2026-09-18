import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Building,
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowDownToLine,
  Sliders,
  Check,
  Terminal,
  Trash2,
  Bot,
  Globe,
  Cpu,
  Layers,
  Fingerprint,
  Info,
  ShieldAlert,
  Clock,
  Key
} from 'lucide-react';
import Drawer from './ui/Drawer';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';

export default function TenantReconciliationModal({
  isOpen,
  onClose,
  apiBase = 'http://localhost:5000/api',
  onReconciled,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [adoptingId, setAdoptingId] = useState(null);
  const [bulkAdopting, setBulkAdopting] = useState(false);
  const [discoveryData, setDiscoveryData] = useState(null);

  // Deletion state
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchDiscovery = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/sync/reconcile/discovery`);
      const data = await res.json();
      if (data.success) {
        setDiscoveryData(data.data);
      } else {
        toast.error(data.message || 'Failed to scan ETMS for untracked tenants.');
      }
    } catch (err) {
      toast.error('Network error during ETMS discovery scan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiscovery();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdoptTenant = async (tenant) => {
    setAdoptingId(tenant.code);
    try {
      const res = await fetch(`${apiBase}/sync/reconcile/adopt-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantData: tenant }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Tenant '${tenant.name}' successfully adopted with 18 standardized parameters!`,
          'Tenant Adopted into OPS'
        );
        fetchDiscovery();
        if (onReconciled) onReconciled();
      } else {
        toast.error(data.message || 'Failed to adopt tenant.');
      }
    } catch (err) {
      toast.error('Network error during tenant adoption.');
    } finally {
      setAdoptingId(null);
    }
  };

  const handleAdoptAll = async () => {
    setBulkAdopting(true);
    try {
      const res = await fetch(`${apiBase}/sync/reconcile/adopt-all`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Successfully adopted ${data.adoptedTenants?.length || 0} untracked tenants into OPS!`,
          'Bulk Adoption Complete'
        );
        fetchDiscovery();
        if (onReconciled) onReconciled();
      } else {
        toast.error(data.message || 'Failed to bulk adopt tenants.');
      }
    } catch (err) {
      toast.error('Network error during bulk adoption.');
    } finally {
      setBulkAdopting(false);
    }
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingTenant) return;
    setSingleDeleting(true);
    try {
      const res = await fetch(`${apiBase}/sync/reconcile/tenant/${deletingTenant.code}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: deletingTenant.code,
          name: deletingTenant.name,
          reason: 'Administrator deleted un-adopted ETMS tenant via reconciliation console',
          originMetadata: deletingTenant.auditFingerprint || null
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Tenant '${deletingTenant.name}' (${deletingTenant.code}) deleted from reconciliation discovery.`,
          'Tenant Purged'
        );
        fetchDiscovery();
        if (onReconciled) onReconciled();
      } else {
        toast.error(data.message || 'Failed to delete tenant.');
      }
    } catch (err) {
      toast.error('Network error deleting tenant.');
    } finally {
      setSingleDeleting(false);
      setDeletingTenant(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setBulkDeleting(true);
    try {
      const res = await fetch(`${apiBase}/sync/reconcile/purge-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Administrator bulk-purged all un-adopted ETMS tenants via reconciliation console'
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          'All untracked ETMS companies have been purged from the reconciliation registry.',
          'Bulk Purge Complete'
        );
        fetchDiscovery();
        if (onReconciled) onReconciled();
      } else {
        toast.error(data.message || 'Failed to purge all tenants.');
      }
    } catch (err) {
      toast.error('Network error during bulk tenant purge.');
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const untracked = discoveryData?.untrackedCompanies || [];

  const renderOriginBadge = (t) => {
    const via = t.createdVia || t.source || 'ETMS_LOCAL_REGISTRY';
    switch (via) {
      case 'QA_AI_AUTOMATION':
        return (
          <span className="badge badge-pastel-purple" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Bot size={11} /> AI QA Test Suite
          </span>
        );
      case 'THIRD_PARTY_API':
        return (
          <span className="badge badge-pastel-yellow" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Cpu size={11} /> 3rd-Party API Ingestion
          </span>
        );
      case 'OPS_PLATFORM_UI':
        return (
          <span className="badge badge-pastel-blue" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Globe size={11} /> OPS Super Admin Platform
          </span>
        );
      case 'ETMS_LOCAL_REGISTRY':
      default:
        return (
          <span className="badge badge-pastel-green" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Layers size={11} /> ETMS Factory Cluster Scan
          </span>
        );
    }
  };

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
      <div>
        {untracked.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={bulkDeleting || bulkAdopting || loading}
            style={{
              color: 'var(--accent-red)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem'
            }}
          >
            <Trash2 size={13} /> Delete All ({untracked.length})
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.78rem' }}>
          Close
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchDiscovery}
          disabled={loading || bulkAdopting || bulkDeleting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Rescan
        </button>
        {untracked.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAdoptAll}
            disabled={bulkAdopting || bulkDeleting || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          >
            <ArrowDownToLine size={13} />{' '}
            {bulkAdopting ? 'Adopting...' : `Adopt All (${untracked.length})`}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="ETMS Tenant Reconciliation"
        subtitle="Synchronize untracked companies between ETMS and OPS"
        icon={<Shield size={18} color="var(--accent-red)" />}
        size="lg"
        footer={footerContent}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Telemetry Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Managed in OPS
              </div>
              <div className="font-mono-tabular" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '0.2rem' }}>
                {discoveryData?.managedInOpsCount || 0}
              </div>
            </div>

            <div
              style={{
                background: 'var(--accent-yellow-bg)',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(149, 100, 0, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                Untracked in ETMS
              </div>
              <div className="font-mono-tabular" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-yellow)', marginTop: '0.2rem' }}>
                {discoveryData?.untrackedCount || 0}
              </div>
            </div>

            <div
              style={{
                background: 'var(--accent-blue-bg)',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(43, 89, 140, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                Orphan Users
              </div>
              <div className="font-mono-tabular" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '0.2rem' }}>
                {discoveryData?.orphanUsersCount || 0}
              </div>
            </div>
          </div>

          {/* Untracked Companies List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              <RefreshCw size={22} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
              <div>Scanning ETMS registry for untracked tenants & provenance traces...</div>
            </div>
          ) : untracked.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)',
              }}
            >
              <CheckCircle2 size={36} color="var(--accent-green)" style={{ margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                All ETMS Tenants Fully Reconciled
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 0 auto' }}>
                100% of companies and users in ETMS are tracked and governed under OPS Super Admin master registry. Zero un-adopted tenants.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {untracked.map((t) => {
                const fp = t.auditFingerprint || {};

                return (
                  <div
                    key={t.code}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderLeft: '3px solid var(--accent-yellow)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Header Row: Name, Code & Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                            {t.name}
                          </h4>
                          <span className="font-mono-tabular badge badge-pastel-yellow">
                            {t.code}
                          </span>
                          {renderOriginBadge(t)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {t.address || 'Surat, Gujarat'} &bull; GSTIN: <span className="font-mono-tabular">{t.gstin || 'N/A'}</span>
                        </div>
                      </div>

                      {/* ACTIONS: Adopt & Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setDeletingTenant(t)}
                          disabled={adoptingId === t.code || singleDeleting}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: 'var(--accent-red)',
                            borderColor: 'rgba(239, 68, 68, 0.25)'
                          }}
                          title={`Delete untracked tenant ${t.name} (${t.code}) from reconciliation`}
                        >
                          <Trash2 size={12} /> Delete
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleAdoptTenant(t)}
                          disabled={adoptingId === t.code || singleDeleting}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <ArrowDownToLine size={12} />{' '}
                          {adoptingId === t.code ? 'Adopting...' : 'Adopt Tenant'}
                        </button>
                      </div>
                    </div>

                    {/* FORENSIC CREATION & SECURITY AUDIT TRACE */}
                    <div
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.72rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Fingerprint size={12} color="var(--primary)" />
                          Creation Provenance & Audit Trail:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Trust Level:</span>
                          <span
                            className="font-mono-tabular"
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: fp.securityClassification === 'VERIFIED_INTERNAL'
                                ? 'var(--accent-green)'
                                : fp.securityClassification === 'SYNTHETIC_AI_TEST'
                                ? 'var(--accent-purple, #7c3aed)'
                                : 'var(--accent-yellow)'
                            }}
                          >
                            ● {fp.securityClassification || 'UNVERIFIED_INBOUND'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.35rem', color: 'var(--text-muted)' }}>
                        <div>
                          <strong>Author / Actor:</strong> <span style={{ color: 'var(--text-main)' }}>{fp.actor || 'System Auto-Discovery'}</span>
                        </div>
                        {fp.traceId && (
                          <div>
                            <strong>Trace Reference:</strong> <span className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>{fp.traceId}</span>
                          </div>
                        )}
                        {fp.ipAddress && (
                          <div>
                            <strong>Origin Channel / IP:</strong> <span className="font-mono-tabular">{fp.ipAddress}</span>
                          </div>
                        )}
                        {fp.timestamp && (
                          <div>
                            <strong>Timestamp:</strong> <span className="font-mono-tabular">{new Date(fp.timestamp).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {fp.sourceNotes && (
                        <div style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.25rem', marginTop: '0.15rem', fontStyle: 'italic' }}>
                          "{fp.sourceNotes}"
                        </div>
                      )}
                    </div>

                    {/* Users & Parameters Sub-details */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                        background: 'var(--bg-surface-elevated)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            marginBottom: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Users size={13} color="var(--accent-blue)" /> Detected Users ({t.users?.length || 0})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {(t.users || []).map((u, i) => (
                            <span
                              key={i}
                              className="badge badge-pastel-blue"
                              style={{ fontSize: '0.7rem' }}
                            >
                              <strong>{u.name}</strong> ({u.role})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            marginBottom: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Sliders size={13} color="var(--accent-green)" /> Custom Parameters (
                          {Object.keys(t.parameters || {}).length})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Standardizes into 18 master textile attributes inheriting seed defaults.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* CONFIRM SINGLE TENANT DELETION MODAL */}
      {deletingTenant && (
        <ConfirmModal
          isOpen={!!deletingTenant}
          title={`Delete Untracked Tenant: ${deletingTenant.name}`}
          message={`Are you sure you want to delete and purge '${deletingTenant.name}' (${deletingTenant.code}) from the reconciliation pipeline? This company was ${deletingTenant.originLabel || 'discovered from ETMS'} and will be permanently removed from untracked reconciliation.`}
          confirmText="Delete Tenant"
          cancelText="Cancel"
          variant="danger"
          loading={singleDeleting}
          onConfirm={handleConfirmDeleteSingle}
          onCancel={() => setDeletingTenant(null)}
        />
      )}

      {/* CONFIRM BULK PURGE ALL UNTRACKED TENANTS MODAL */}
      {showBulkDeleteConfirm && (
        <ConfirmModal
          isOpen={showBulkDeleteConfirm}
          title={`Purge All Untracked Companies (${untracked.length})`}
          message={`Are you sure you want to purge ALL ${untracked.length} un-adopted ETMS companies from the reconciliation discovery pipeline? This action will discard them and record a high-severity security audit event in MongoDB.`}
          confirmText={`Purge All ${untracked.length} Companies`}
          cancelText="Cancel"
          variant="danger"
          loading={bulkDeleting}
          onConfirm={handleConfirmDeleteAll}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </>
  );
}

