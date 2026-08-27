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
  apiBase = 'http://localhost:5000/api',
  currentCompanyId = null,
  onRefresh
}) {
  const [roles, setRoles] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
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
      r.name.toLowerCase().includes(q) ||
      (r.company && r.company.name.toLowerCase().includes(q)) ||
      (r.permissions && r.permissions.some((p) => p.toLowerCase().includes(q)))
    );
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      companyId: selectedCompanyId !== 'ALL' ? selectedCompanyId : (companies[0]?.id || ''),
      permissions: ['READ_COMPANIES', 'READ_USERS', 'READ_TRANSACTIONS', 'READ_AUDIT_LOGS']
    });
    setShowRoleModal(true);
  };

  const handleOpenEdit = (role) => {
    if (role.isSystemDefined) {
      alert('⛔ Action Blocked: System-defined roles are locked and cannot be edited.');
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
      alert('Role Name is required.');
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
        setShowRoleModal(false);
        fetchRoles();
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || 'Failed to save role');
      }
    } catch (err) {
      alert('Error saving role');
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystemDefined) {
      alert('⛔ FORBIDDEN (403): System-defined roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete custom role '${role.name}'?`)) return;

    try {
      const res = await fetch(`${apiBase}/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRoles();
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || 'Failed to delete role');
      }
    } catch (err) {
      alert('Error deleting role');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={22} style={{ color: '#4f46e5' }} />
            Role & RBAC Permission Matrix
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
            Configure access controls, granular privilege schemes, and inspect system safety guards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchRoles}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={14} /> Create Custom Role
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search roles or permissions..."
              className="form-control"
              style={{ paddingLeft: '2.1rem', fontSize: '0.8rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="ALL">All Roles ({roles.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#92400e', fontWeight: 600 }}>
            <Lock size={12} /> System Defined = Locked
          </span>
        </div>
      </div>

      {/* ROLES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredRoles.map((r) => {
          const isLocked = r.isSystemDefined;

          return (
            <div
              key={r.id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
                borderTop: `3px solid ${isLocked ? '#92400e' : '#4f46e5'}`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {r.name}
                      </h3>
                      {isLocked ? (
                        <span
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                          title="System-defined role cannot be modified or deleted"
                        >
                          <Lock size={10} /> SYSTEM LOCKED
                        </span>
                      ) : (
                        <span style={{ background: '#ecfdf5', color: '#065f46', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>
                          CUSTOM ROLE
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Tenant: <strong>{r.company?.name || 'Global Template'}</strong>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                    {r._count?.users ?? 0} Users Assigned
                  </span>
                </div>

                {/* PERMISSION TAGS PREVIEW */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Granted Privileges ({r.permissions?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '110px', overflowY: 'auto' }}>
                    {r.permissions && r.permissions.length > 0 ? (
                      r.permissions.map((p) => (
                        <span
                          key={p}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            color: '#334155'
                          }}
                        >
                          <code>{p}</code>
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No explicit permissions assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    opacity: isLocked ? 0.6 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isLocked}
                  onClick={() => handleOpenEdit(r)}
                  title={isLocked ? 'System role cannot be modified' : 'Edit role permissions'}
                >
                  <Edit2 size={12} /> Edit Permissions
                </button>

                <button
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: isLocked ? '#94a3b8' : '#dc2626',
                    opacity: isLocked ? 0.6 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isLocked || (r._count?.users > 0)}
                  onClick={() => handleDeleteRole(r)}
                  title={isLocked ? 'System role cannot be deleted' : r._count?.users > 0 ? 'Cannot delete role with assigned users' : 'Delete custom role'}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT ROLE MODAL WITH PERMISSION CHECK-GRID */}
      {showRoleModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom RBAC Role'}
              </h2>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
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
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PERMISSION MATRIX CHECK-GRID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  Fine-Grained Privilege Schemes (RBAC Matrix)
                </div>

                {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                  <div key={category} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem' }}>
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
                              gap: '0.4rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              borderRadius: '4px',
                              background: checked ? '#eef2ff' : 'transparent'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handlePermissionToggle(p.code)}
                              style={{ marginTop: '0.15rem' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: checked ? '#4338ca' : '#1e293b' }}>{p.label}</div>
                              <code style={{ fontSize: '0.68rem', color: '#64748b' }}>{p.code}</code>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}