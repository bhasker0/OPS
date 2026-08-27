import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  RefreshCw,
  Lock,
  X
} from 'lucide-react';

export default function UserManagement({
  users = [],
  companies = [],
  roles = [],
  apiBase = 'http://localhost:5000/api',
  onUserCreated,
  onUserUpdated,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    companyId: '',
    roleId: '',
    isInternalOps: false
  });

  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    status: 'ACTIVE',
    companyId: '',
    roleId: '',
    isInternalOps: false
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (selectedCompanyId !== 'ALL' && u.companyId !== selectedCompanyId) return false;
    if (selectedStatus !== 'ALL' && (u.status || 'ACTIVE') !== selectedStatus) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.company && u.company.name.toLowerCase().includes(q)) ||
      (u.role && u.role.name.toLowerCase().includes(q))
    );
  });

  // Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password || 'password123',
        companyId: newUser.companyId || null,
        roleId: newUser.roleId || null,
        isInternalOps: newUser.isInternalOps
      };

      const res = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewUser({ name: '', email: '', password: '', companyId: '', roleId: '', isInternalOps: false });
        if (onUserCreated) onUserCreated(data.data);
      } else {
        alert(data.message || 'Failed to create user');
      }
    } catch (err) {
      alert('Error connecting to backend API');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    try {
      const payload = {
        name: editUser.name,
        email: editUser.email,
        status: editUser.status,
        roleId: editUser.roleId || null,
        isInternalOps: editUser.isInternalOps
      };

      const res = await fetch(`${apiBase}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        if (onUserUpdated) onUserUpdated(data.data);
      } else {
        alert(data.message || 'Failed to update user');
      }
    } catch (err) {
      alert('Error updating user');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPasswordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordData.newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Password for user '${selectedUser.email}' has been reset successfully.`);
        setShowPasswordModal(false);
        setResetPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        alert(data.message || 'Failed to reset password');
      }
    } catch (err) {
      alert('Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (user) => {
    const newStatus = (user.status || 'ACTIVE') === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Change account status of '${user.name}' to ${newStatus}?`)) return;

    try {
      const res = await fetch(`${apiBase}/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || 'Failed to toggle status');
      }
    } catch (err) {
      alert('Error updating user status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={22} style={{ color: '#4f46e5' }} />
            User Account & Access Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
            Multi-tenant user administration, RBAC role assignment, and security credentials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={14} /> Create User
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search user name or email..."
              className="form-control"
              style={{ paddingLeft: '2.1rem', fontSize: '0.8rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Company Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="ALL">All Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={13} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Showing {filteredUsers.length} of {users.length} Users
        </span>
      </div>

      {/* USERS TABLE */}
      <div className="card table-container" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>User Name & Email</th>
              <th>Company Tenant</th>
              <th>Account Type</th>
              <th>RBAC Role</th>
              <th>Status</th>
              <th>Support Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isActive = (u.status || 'ACTIVE') === 'ACTIVE';

              return (
                <tr key={u.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.email}</div>
                    </div>
                  </td>

                  <td>
                    {u.company ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.company.name}</div>
                        <code style={{ fontSize: '0.7rem', color: '#4f46e5' }}>{u.company.code}</code>
                      </div>
                    ) : (
                      <span style={{ color: '#6d28d9', fontSize: '0.75rem', fontWeight: 600 }}>🌐 OPS Global Admin</span>
                    )}
                  </td>

                  <td>
                    {u.isInternalOps ? (
                      <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        Internal Ops Super Admin
                      </span>
                    ) : (
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                        Tenant Operator
                      </span>
                    )}
                  </td>

                  <td>
                    {u.role ? (
                      <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                        {u.role.name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Default Access</span>
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() => handleStatusToggle(u)}
                      style={{
                        background: isActive ? '#ecfdf5' : '#fef2f2',
                        color: isActive ? '#059669' : '#dc2626',
                        border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title={`Click to toggle status to ${isActive ? 'SUSPENDED' : 'ACTIVE'}`}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444' }} />
                      {u.status || 'ACTIVE'}
                    </button>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => {
                          setSelectedUser(u);
                          setEditUser({
                            name: u.name,
                            email: u.email,
                            status: u.status || 'ACTIVE',
                            companyId: u.companyId || '',
                            roleId: u.roleId || '',
                            isInternalOps: u.isInternalOps || false
                          });
                          setShowEditModal(true);
                        }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>

                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => {
                          setSelectedUser(u);
                          setShowPasswordModal(true);
                        }}
                        title="Reset User Password"
                      >
                        <Key size={12} style={{ color: '#d97706' }} /> Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Provision New User</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  className="form-control"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vikram@textile.com"
                  className="form-control"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Initial Password</label>
                <input
                  type="password"
                  placeholder="Leave blank for default (password123)"
                  className="form-control"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Assigned Company</label>
                  <select
                    className="form-control"
                    value={newUser.companyId}
                    onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })}
                  >
                    <option value="">-- No Company (OPS Global) --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>RBAC Role</label>
                  <select
                    className="form-control"
                    value={newUser.roleId}
                    onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}
                  >
                    <option value="">-- Default System Access --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} {r.isSystemDefined ? '(System)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.75rem 0' }}>
                <input
                  type="checkbox"
                  id="internalOpsCheck"
                  checked={newUser.isInternalOps}
                  onChange={(e) => setNewUser({ ...newUser, isInternalOps: e.target.checked })}
                />
                <label htmlFor="internalOpsCheck" style={{ fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                  Assign as Internal OPS Super Admin (Cross-Tenant Privileges)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Edit User Details</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Account Status</label>
                  <select
                    className="form-control"
                    value={editUser.status}
                    onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>RBAC Role</label>
                  <select
                    className="form-control"
                    value={editUser.roleId}
                    onChange={(e) => setEditUser({ ...editUser, roleId: e.target.value })}
                  >
                    <option value="">-- Default System Access --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} {r.isSystemDefined ? '(System)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.75rem 0' }}>
                <input
                  type="checkbox"
                  id="editInternalOps"
                  checked={editUser.isInternalOps}
                  onChange={(e) => setEditUser({ ...editUser, isInternalOps: e.target.checked })}
                />
                <label htmlFor="editInternalOps" style={{ fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                  Internal OPS Super Admin
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {showPasswordModal && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Key size={16} style={{ color: '#d97706' }} />
                Reset Password
              </h2>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem' }}>
              Set a new secure password for <strong>{selectedUser.name}</strong> (<code>{selectedUser.email}</code>).
            </p>

            <form onSubmit={handlePasswordResetSubmit}>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  className="form-control"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  className="form-control"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Resetting...' : 'Update Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}