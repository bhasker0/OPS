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
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Close
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={fetchDiscovery}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
      >
        <RefreshCw size={13} className={loading ? 'spin' : ''} /> Rescan
      </button>
      {untracked.length > 0 && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAdoptAll}
          disabled={bulkAdopting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <ArrowDownToLine size={13} />{' '}
          {bulkAdopting ? 'Adopting All...' : `Adopt All (${untracked.length})`}
        </button>
      )}
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="ETMS Tenant Reconciliation"
      subtitle="Authoritative Master Registry Synchronization & Parameter Standardization"
      icon={<Shield size={18} />}
      size="lg"
      footer={footerContent}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Telemetry Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div
            style={{
              background: 'var(--bg-canvas)',
              padding: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Managed in OPS
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.15rem' }}>
              {discoveryData?.managedInOpsCount || 0} Tenants
            </div>
          </div>

          <div
            style={{
              background: 'var(--warning-light)',
              padding: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--warning)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
              Untracked in ETMS
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.15rem' }}>
              {discoveryData?.untrackedCount || 0} Discovered
            </div>
          </div>

          <div
            style={{
              background: 'var(--primary-light)',
              padding: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--primary)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
              Orphan Users
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.15rem' }}>
              {discoveryData?.orphanUsersCount || 0} Accounts
            </div>
          </div>
        </div>

        {/* Untracked Companies List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
            <div>Scanning ETMS registry for unmanaged tenants...</div>
          </div>
        ) : untracked.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'var(--bg-canvas)',
              borderRadius: '8px',
              border: '1px dashed var(--border-strong)',
            }}
          >
            <CheckCircle2 size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
              All ETMS Tenants are Fully Reconciled!
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              100% of companies and users in ETMS are tracked and governed by OPS Super Admin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {untracked.map((t) => (
              <div
                key={t.code}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {t.name}
                      </h4>
                      <code
                        style={{
                          fontSize: '0.72rem',
                          background: 'var(--warning-light)',
                          color: 'var(--warning)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {t.code}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {t.address || 'Surat, Gujarat'} {t.gstin ? `• GSTIN: ${t.gstin}` : '• GSTIN: N/A'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAdoptTenant(t)}
                    disabled={adoptingId === t.code}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <ArrowDownToLine size={13} />{' '}
                    {adoptingId === t.code ? 'Adopting...' : 'Adopt & Standardize'}
                  </button>
                </div>

                {/* Users & Parameters Sub-details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    background: 'var(--bg-canvas)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginBottom: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Users size={12} color="var(--primary)" /> Detected Users ({t.users?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(t.users || []).map((u, i) => (
                        <span
                          key={i}
                          style={{
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <strong>{u.name}</strong> ({u.role}){' '}
                          {u.phone ? <span>📱 {u.phone}</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginBottom: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Sliders size={12} color="var(--success)" /> Custom Parameters (
                      {Object.keys(t.parameters || {}).length})
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Will standardize into 18 master textile parameters inheriting seed defaults.
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
