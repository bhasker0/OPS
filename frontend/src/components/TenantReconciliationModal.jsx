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
} from 'lucide-react';
import Drawer from './ui/Drawer';
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

  const untracked = discoveryData?.untrackedCompanies || [];

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
      <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.78rem' }}>
        Close
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={fetchDiscovery}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
      >
        <RefreshCw size={12} className={loading ? 'spin' : ''} /> Rescan ETMS
      </button>
      {untracked.length > 0 && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAdoptAll}
          disabled={bulkAdopting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
        >
          <ArrowDownToLine size={13} />{' '}
          {bulkAdopting ? 'Adopting All...' : `Adopt All (${untracked.length})`}
        </button>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="ETMS Tenant Reconciliation"
      subtitle="Master registry synchronization & parameter standardization"
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
            <div>Scanning ETMS registry for untracked tenants...</div>
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
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: '400px', margin: '0.35rem auto 0 auto' }}>
              100% of companies and users in ETMS are tracked and governed by OPS Super Admin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {untracked.map((t) => (
              <div
                key={t.code}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderLeft: '3px solid var(--accent-yellow)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.65rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        {t.name}
                      </h4>
                      <span className="font-mono-tabular badge badge-pastel-yellow">
                        {t.code}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {t.address || 'Surat, Gujarat'} &bull; GSTIN: {t.gstin || 'N/A'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAdoptTenant(t)}
                    disabled={adoptingId === t.code}
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

                {/* Users & Parameters Sub-details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    background: 'var(--bg-surface-elevated)',
                    padding: '0.75rem',
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
                      Will standardize into 18 master textile attributes inheriting seed defaults.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

