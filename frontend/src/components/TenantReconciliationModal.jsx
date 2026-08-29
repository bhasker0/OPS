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
  X
} from 'lucide-react';
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

  return (
    <div className="modal-backdrop" style={{ zIndex: 1300 }}>
      <div className="modal-content" style={{ maxWidth: '750px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a' }}>
              <Shield size={20} color="#4f46e5" /> ETMS Tenant Discovery & Reconciliation Center
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              OPS is the authoritative master registry. Ingest untracked ETMS companies, standardize 18 textile parameters, and establish master-slave governance.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>
            ✕
          </button>
        </div>

        {/* Telemetry Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Managed in OPS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '0.15rem' }}>
              {discoveryData?.managedInOpsCount || 0} Tenants
            </div>
          </div>

          <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Untracked in ETMS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '0.15rem' }}>
              {discoveryData?.untrackedCount || 0} Discovered
            </div>
          </div>

          <div style={{ background: '#eef2ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
            <div style={{ fontSize: '0.72rem', color: '#4338ca', fontWeight: 600 }}>Orphan Users</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4338ca', marginTop: '0.15rem' }}>
              {discoveryData?.orphanUsersCount || 0} Accounts
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchDiscovery}
            disabled={loading}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Rescan ETMS Backend
          </button>

          {untracked.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleAdoptAll}
              disabled={bulkAdopting}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <ArrowDownToLine size={13} /> {bulkAdopting ? 'Adopting All...' : `Adopt All ${untracked.length} Untracked Tenants`}
            </button>
          )}
        </div>

        {/* Untracked Companies List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
            <div>Scanning ETMS registry for unmanaged tenants...</div>
          </div>
        ) : untracked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 700, color: '#0f172a' }}>All ETMS Tenants are Fully Reconciled!</div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
              100% of companies and users in ETMS are tracked and governed by OPS Super Admin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {untracked.map((t) => (
              <div
                key={t.code}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{t.name}</h4>
                      <code style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {t.code}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {t.address || 'Surat, Gujarat'} {t.gstin ? `• GSTIN: ${t.gstin}` : '• GSTIN: N/A'}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleAdoptTenant(t)}
                    disabled={adoptingId === t.code}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <ArrowDownToLine size={13} /> {adoptingId === t.code ? 'Adopting...' : 'Adopt & Standardize'}
                  </button>
                </div>

                {/* Users & Parameters Sub-details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={12} color="#4f46e5" /> Detected Users ({t.users?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(t.users || []).map((u, i) => (
                        <span key={i} style={{ background: '#eef2ff', color: '#3730a3', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <strong>{u.name}</strong> ({u.role}) {u.phone ? <span style={{ color: '#4338ca', fontWeight: 600 }}>📱 {u.phone}</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sliders size={12} color="#059669" /> Custom Parameters ({Object.keys(t.parameters || {}).length})
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Will standardize into 18 master textile parameters inheriting seed defaults.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
