import React, { useState, useEffect } from 'react';
import {
  Lock,
  Plus,
  Search,
  Shield,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  X,
  Layers,
  Key
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';

const PERMISSION_CATEGORIES = {
  'Company Operations': [
    { code: 'READ_COMPANIES', label: 'View Company Profiles & Settings' },
    { code: 'WRITE_COMPANIES', label: 'Create & Edit Company Attributes' },
    { code: 'MANAGE_STATUS', label: 'Toggle Company Status (Active/Suspended)' },
    { code: 'DELETE_COMPANIES', label: 'Delete Company Accounts' }
  ],
  'User & RBAC Access': [
    { code: 'READ_USERS', label: 'View User Directory' },
    { code: 'WRITE_USERS', label: 'Create & Update Users' },
    { code: 'MANAGE_USER_STATUS', label: 'Activate & Suspend Users' },
    { code: 'READ_ROLES', label: 'View Roles & Permission Schemes' },
    { code: 'WRITE_ROLES', label: 'Create & Edit Custom Roles' }
  ],
  'Financial Ledger & Invoices': [
    { code: 'READ_TRANSACTIONS', label: 'View Financial Ledger Entries' },
    { code: 'WRITE_TRANSACTIONS', label: 'Record Transactions & Invoices' },
    { code: 'RECONCILE_PAYMENTS', label: 'Reconcile Financial Statuses' },
    { code: 'TALLY_EXPORT', label: 'Export Tally Prime XML Data' }
  ],
  'Parameters & Compliance': [
    { code: 'READ_PARAMETERS', label: 'View Operational Parameters' },
    { code: 'WRITE_PARAMETERS', label: 'Override Parameters & Feature Flags' },
    { code: 'READ_AUDIT_LOGS', label: 'Inspect MongoDB Audit Trail Logs' }
  ]
};

export default function RoleManagement({
  companies = [],
  apiBase = API_BASE,
  currentCompanyId = null,
  onRefresh
}) {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    companyId: currentCompanyId || '',
    permissions: []
  });

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const url = selectedCompanyId && selectedCompanyId !== 'ALL'
        ? `${apiBase}/roles?companyId=${selectedCompanyId}`
        : `${apiBase}/roles`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      toast.error('Failed to load roles from backend.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [selectedCompanyId]);

  const filteredRoles = roles.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r?.name || '').toLowerCase().includes(q) ||
      (r?.company?.name || '').toLowerCase().includes(q) ||
      (r?.permissions && r.permissions.some((p) => (p || '').toLowerCase().includes(q)))
    );
  });

  const tenantCompaniesList = companies.filter((c) => !c.isSeed && c.code !== '000');

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      companyId: selectedCompanyId !== 'ALL' ? selectedCompanyId : (tenantCompaniesList[0]?.id || ''),
      permissions: ['READ_COMPANIES', 'READ_USERS', 'READ_TRANSACTIONS', 'READ_AUDIT_LOGS']
    });
    setShowRoleModal(true);
  };

  const handleOpenEdit = (role) => {
    if (role.isSystemDefined) {
      toast.warning('System-defined roles are locked and cannot be edited.', 'Role Guard (403)');
      return;
    }
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      companyId: role.companyId,
      permissions: role.permissions || []
    });
    setShowRoleModal(true);
  };

  const handlePermissionToggle = (permCode) => {
    setRoleForm((prev) => {
      const perms = [...prev.permissions];
      const idx = perms.indexOf(permCode);
      if (idx > -1) {
        perms.splice(idx, 1);
      } else {
        perms.push(permCode);
      }
      return { ...prev, permissions: perms };
    });
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      toast.warning('Role Name is required.', 'Validation Error');
      return;
    }

    try {
      const url = editingRole ? `${apiBase}/roles/${editingRole.id}` : `${apiBase}/roles`;
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Role '${roleForm.name}' saved successfully.`, 'Role Saved');
        setShowRoleModal(false);
        fetchRoles();
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to save role', 'Save Error');
      }
    } catch (err) {
      toast.error('Error saving role to backend API.', 'Save Error');
    }
  };

  const handleDeletePrompt = (role) => {
    if (role.isSystemDefined) {
      toast.error('System-defined roles cannot be deleted.', 'Action Forbidden (403)');
      return;
    }
    setConfirmDeleteRole(role);
  };

  const handleConfirmDeleteRole = async () => {
    if (!confirmDeleteRole) return;
    const role = confirmDeleteRole;
    setDeleteLoading(true);

    try {
      const res = await fetch(`${apiBase}/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Role '${role.name}' deleted successfully.`, 'Role Deleted');
        fetchRoles();
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to delete role', 'Delete Error');
      }
    } catch (err) {
      toast.error('Error deleting role from backend.', 'Delete Error');
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteRole(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} color="var(--accent-red)" />
            Roles & Permissions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0 0' }}>
            Role definitions and access control policies
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchRoles}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ fontSize: '0.78rem' }}
          >
            <Plus size={14} /> New Role
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search roles or permissions..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building size={13} color="var(--text-muted)" />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="ALL">Master Seed Roles (Global Baseline)</option>
              {companies.filter(c => !c.isSeed && c.code !== '000').map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Showing <strong className="font-mono-tabular">{filteredRoles.length}</strong> of <strong className="font-mono-tabular">{roles.length}</strong> roles
        </span>
      </div>

      {/* ROLES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
        {filteredRoles.map((r) => {
          const isSeed = r.isSeedRole || r.isSystemDefined;
          const isCustom = r.isCustom || !isSeed;

          return (
            <div
              key={r.id}
              className="card"
              style={{
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
                borderLeft: `3px solid ${isSeed ? 'var(--accent-purple, #7c3aed)' : 'var(--accent-green)'}`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {r.name}
                      </h3>
                      {r.name === 'OPS Super Admin' || r.isInternalOpsOnly ? (
                        <span
                          className="badge badge-pastel-red"
                          style={{ fontSize: '0.65rem' }}
                          title="Internal OPS Platform Administrator role - Excluded from tenants and ETMS"
                        >
                          Platform Admin (Internal OPS Only)
                        </span>
                      ) : isSeed ? (
                        <span
                          className="badge badge-pastel-purple"
                          style={{ fontSize: '0.65rem' }}
                          title="Seed role automatically available in all companies"
                        >
                          {r.isInherited ? 'Seed Default (Inherited)' : 'Seed Default (Global Master)'}
                        </span>
                      ) : (
                        <span className="badge badge-pastel-green" style={{ fontSize: '0.65rem' }}>
                          Custom Tenant Role
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {r.name === 'OPS Super Admin' || r.isInternalOpsOnly ? (
                        <span>Origin: <strong>Internal OPS System (Excluded from Tenants)</strong></span>
                      ) : isSeed ? (
                        <span>Origin: <strong>Master Seed (All Companies)</strong></span>
                      ) : (
                        <span>Scoped To: <strong>{r.company?.name || 'Current Tenant'}</strong></span>
                      )}
                    </div>
                  </div>

                  <span className="font-mono-tabular badge badge-pastel-blue" style={{ fontSize: '0.7rem' }}>
                    {r._count?.users ?? 0} Users
                  </span>
                </div>

                {/* BINARY PERMISSION MATRIX PREVIEW */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Granted Privileges ({r.permissions?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '100px', overflowY: 'auto' }}>
                    {r.permissions && r.permissions.length > 0 ? (
                      r.permissions.map((p) => (
                        <span
                          key={p}
                          style={{
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            padding: '0.15rem 0.4rem',
                            fontSize: '0.68rem',
                            color: 'var(--text-main)',
                            fontWeight: 500
                          }}
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No explicit privileges</span>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.65rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    opacity: isSeed ? 0.5 : 1,
                    cursor: isSeed ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isSeed}
                  onClick={() => handleOpenEdit(r)}
                  title={isSeed ? 'Master seed roles are immutable' : 'Edit custom role permissions'}
                >
                  <Edit2 size={12} /> Edit
                </button>

                <button
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: isSeed ? 'var(--text-muted)' : 'var(--accent-red)',
                    opacity: isSeed ? 0.5 : 1,
                    cursor: isSeed ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isSeed || (r._count?.users > 0)}
                  onClick={() => handleDeletePrompt(r)}
                  title={isSeed ? 'Master seed roles cannot be deleted' : r._count?.users > 0 ? 'Cannot delete role with assigned users' : 'Delete custom role'}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT ROLE MODAL WITH BINARY PERMISSION MATRIX */}
      {showRoleModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '660px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'New Role'}
                </h2>
              </div>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleRoleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Finance Auditor"
                    className="form-control"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Tenant Company</label>
                  <select
                    className="form-control"
                    value={roleForm.companyId}
                    disabled={!!editingRole}
                    onChange={(e) => setRoleForm({ ...roleForm, companyId: e.target.value })}
                  >
                    {tenantCompaniesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BINARY PERMISSION MATRIX CHECK-GRID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Permission Matrix:
                </div>

                {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                  <div key={category} style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                      {category}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.4rem' }}>
                      {perms.map((p) => {
                        const checked = roleForm.permissions.includes(p.code);

                        return (
                          <label
                            key={p.code}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: '0.4rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                              background: checked ? 'var(--bg-surface)' : 'transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handlePermissionToggle(p.code)}
                              style={{ marginTop: '0.15rem' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: checked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {p.label}
                              </div>
                              <code className="font-mono-tabular" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.code}</code>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)} style={{ fontSize: '0.78rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.78rem' }}>
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL (SCRUM-78) */}
      <ConfirmModal
        isOpen={!!confirmDeleteRole}
        title={`Delete Role: ${confirmDeleteRole?.name || 'Custom Role'}`}
        message={`Are you sure you want to delete custom role '${confirmDeleteRole?.name}'? Users will no longer have these specific privileges.`}
        confirmText="Delete Role"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDeleteRole}
        onCancel={() => setConfirmDeleteRole(null)}
      />
    </div>
  );
}