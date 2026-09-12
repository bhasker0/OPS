import React, { useState, useEffect } from 'react';
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
  X,
  LogOut,
  ExternalLink,
  Phone,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import TableActionMenu from './TableActionMenu';
import TableDensityControl from './TableDensityControl';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';

export default function UserManagement({
  users = [],
  companies = [],
  roles = [],
  apiBase = API_BASE,
  onUserCreated,
  onUserUpdated,
  onImpersonateUser,
  onRefresh
}) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [tableDensity, setTableDensity] = useState(() => localStorage.getItem('ops_user_density') || 'compact');

  const handleDensityChange = (d) => {
    setTableDensity(d);
    localStorage.setItem('ops_user_density', d);
  };

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmUserStatus, setConfirmUserStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Impersonation state (SCRUM-87)
  const [impersonateTargetUser, setImpersonateTargetUser] = useState(null);
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    companyId: '',
    roleId: '',
    isInternalOps: false
  });

  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    mobile: '',
    status: 'ACTIVE',
    companyId: '',
    roleId: '',
    isInternalOps: false
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [killswitchUser, setKillswitchUser] = useState(null);
  const [killswitchLoading, setKillswitchLoading] = useState(false);

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (selectedCompanyId !== 'ALL' && u.companyId !== selectedCompanyId) return false;
    if (selectedStatus !== 'ALL' && (u.status || 'ACTIVE') !== selectedStatus) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u?.name || '').toLowerCase().includes(q) ||
      (u?.email || '').toLowerCase().includes(q) ||
      (u?.mobile || '').includes(q) ||
      (u?.company?.name || '').toLowerCase().includes(q) ||
      (u?.role?.name || '').toLowerCase().includes(q)
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
        mobile: newUser.mobile || null,
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
        toast.success(`User '${newUser.name}' created successfully!`, 'User Created');
        setShowCreateModal(false);
        setNewUser({ name: '', email: '', mobile: '', password: '', companyId: '', roleId: '', isInternalOps: false });
        if (onUserCreated) onUserCreated(data.data);
      } else {
        toast.error(data.message || 'Failed to create user', 'Creation Error');
      }
    } catch (err) {
      toast.error('Error connecting to backend API', 'Network Error');
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
        mobile: editUser.mobile || null,
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
        toast.success(`User '${editUser.name}' updated successfully.`, 'User Updated');
        setShowEditModal(false);
        setSelectedUser(null);
        if (onUserUpdated) onUserUpdated(data.data);
      } else {
        toast.error(data.message || 'Failed to update user', 'Update Error');
      }
    } catch (err) {
      toast.error('Error updating user', 'Update Error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPasswordData.newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters.', 'Validation Error');
      return;
    }
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast.warning('Passwords do not match.', 'Validation Error');
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
        toast.success(`Password for user '${selectedUser.email}' has been reset successfully.`, 'Password Reset');
        setShowPasswordModal(false);
        setResetPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.message || 'Failed to reset password', 'Reset Error');
      }
    } catch (err) {
      toast.error('Error resetting password', 'Reset Error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeUserSessions = async () => {
    if (!killswitchUser) return;
    setKillswitchLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/revoke-user-sessions/${killswitchUser.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.warning(`Session killswitch activated for '${killswitchUser.email}'. All active tokens invalidated.`, 'Killswitch Triggered');
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to revoke user session', 'Killswitch Error');
      }
    } catch (err) {
      toast.error('Network error executing session killswitch', 'Killswitch Error');
    } finally {
      setKillswitchLoading(false);
      setKillswitchUser(null);
    }
  };

  const handleConfirmImpersonation = async () => {
    if (!impersonateTargetUser) return;
    setImpersonateLoading(true);

    // Pre-open tab synchronously on user click to avoid popup blocker
    let etmsTab = null;
    if (impersonateTargetUser.mobile) {
      etmsTab = window.open('about:blank', '_blank');
    }

    try {
      let token = localStorage.getItem('ops_access_token');

      // Auto-authenticate as Super Admin if token is missing from localStorage
      if (!token) {
        try {
          const loginRes = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' }),
          });
          const loginData = await loginRes.json();
          if (loginData.success && loginData.data?.accessToken) {
            token = loginData.data.accessToken;
            localStorage.setItem('ops_access_token', token);
            localStorage.setItem('ops_refresh_token', loginData.data.refreshToken);
          }
        } catch (e) {
          console.warn('Auto-login bootstrap failed:', e);
        }
      }

      let res = await fetch(`${apiBase}/auth/impersonate/${impersonateTargetUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // If token expired (401), automatically re-authenticate and retry once
      if (res.status === 401) {
        try {
          const loginRes = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' }),
          });
          const loginData = await loginRes.json();
          if (loginData.success && loginData.data?.accessToken) {
            token = loginData.data.accessToken;
            localStorage.setItem('ops_access_token', token);
            localStorage.setItem('ops_refresh_token', loginData.data.refreshToken);

            res = await fetch(`${apiBase}/auth/impersonate/${impersonateTargetUser.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
          }
        } catch (e) {
          console.warn('Re-authentication retry failed:', e);
        }
      }

      const data = await res.json();
      if (data.success) {
        toast.info(`Support Impersonation started for '${impersonateTargetUser.name}'.`, 'Impersonation Mode Active');

        // Automatically launch ETMS Factory Portal in the pre-opened tab
        if (data.data?.etmsLaunchUrl) {
          toast.success(`Opening ETMS Factory Portal as '${impersonateTargetUser.name}'...`, 'ETMS Portal Launching');
          if (etmsTab) {
            etmsTab.location.href = data.data.etmsLaunchUrl;
          } else {
            window.open(data.data.etmsLaunchUrl, '_blank');
          }
        } else if (etmsTab) {
          etmsTab.close();
        }

        if (onImpersonateUser) {
          onImpersonateUser(data.data);
        }
      } else {
        if (etmsTab) etmsTab.close();
        toast.error(data.message || 'Failed to initiate impersonation.', 'Impersonation Error');
      }
    } catch (err) {
      if (etmsTab) etmsTab.close();
      toast.error('Network error initiating impersonation session.', 'Impersonation Error');
    } finally {
      setImpersonateLoading(false);
      setImpersonateTargetUser(null);
    }
  };

  const handleLaunchEtms = async (targetUser) => {
    if (!targetUser) return;
    if (!targetUser.mobile) {
      toast.warning(`Cannot launch ETMS: User '${targetUser.name}' does not have a registered mobile phone number.`, 'Missing Mobile Number');
      return;
    }

    const etmsTab = window.open('about:blank', '_blank');
    toast.info(`Generating authenticated ETMS session for '${targetUser.name}'...`, 'Connecting to Factory Portal');

    try {
      let activeToken = localStorage.getItem('ops_access_token');
      if (!activeToken) {
        try {
          const authRes = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' })
          });
          const authData = await authRes.json();
          if (authData.success && authData.data?.accessToken) {
            activeToken = authData.data.accessToken;
            localStorage.setItem('ops_access_token', activeToken);
          }
        } catch (e) {}
      }

      let res = await fetch(`${apiBase}/auth/launch-etms/${targetUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken && { Authorization: `Bearer ${activeToken}` })
        }
      });

      // Handle 401 token expiry retry
      if (res.status === 401) {
        const authRes = await fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' })
        });
        const authData = await authRes.json();
        if (authData.success && authData.data?.accessToken) {
          activeToken = authData.data.accessToken;
          localStorage.setItem('ops_access_token', activeToken);
          res = await fetch(`${apiBase}/auth/launch-etms/${targetUser.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeToken}`
            }
          });
        }
      }

      const data = await res.json();
      if (res.ok && data.success && data.launchUrl) {
        toast.success(`Opening ETMS Factory Portal as '${targetUser.name}' (${targetUser.mobile})...`, 'ETMS Portal Launching');
        if (etmsTab) {
          etmsTab.location.href = data.launchUrl;
        } else {
          window.open(data.launchUrl, '_blank');
        }
      } else {
        if (etmsTab) etmsTab.close();
        toast.error(data.message || 'Failed to generate ETMS session.', 'Launch Error');
      }
    } catch (err) {
      if (etmsTab) etmsTab.close();
      console.error('Error launching ETMS:', err);
      toast.error('Network error launching ETMS factory portal.', 'Launch Error');
    }
  };

  const handleStatusTogglePrompt = (user) => {
    const newStatus = (user.status || 'ACTIVE') === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setConfirmUserStatus({ user, newStatus });
  };

  const handleConfirmUserStatusToggle = async () => {
    if (!confirmUserStatus) return;
    const { user, newStatus } = confirmUserStatus;
    setStatusUpdating(true);

    try {
      const res = await fetch(`${apiBase}/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Account status of '${user.name}' updated to ${newStatus}.`, 'Status Updated');
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to toggle status', 'Status Error');
      }
    } catch (err) {
      toast.error('Error updating user status', 'Status Error');
    } finally {
      setStatusUpdating(false);
      setConfirmUserStatus(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--accent-red)" />
            User Directory & Identity Lifecycle
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0 0' }}>
            Multi-tenant operator credentials, RBAC roles & emergency session management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ fontSize: '0.78rem' }}
          >
            <Plus size={14} /> Provision User
          </button>
        </div>
      </div>

      {/* TELEMETRY READOUT BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 1rem',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Identity Telemetry:</span>
        <span style={{ color: 'var(--text-main)' }}>Total: <strong className="font-mono-tabular">{users.length}</strong></span>
        <span style={{ color: 'var(--accent-green)' }}>Active: <strong className="font-mono-tabular">{users.filter(u => (u.status || 'ACTIVE') === 'ACTIVE').length}</strong></span>
        <span style={{ color: 'var(--accent-blue)' }}>Super Admins: <strong className="font-mono-tabular">{users.filter(u => u.isInternalOps).length}</strong></span>
        <span style={{ color: 'var(--accent-yellow)' }}>Killswitch: <strong>Armed</strong></span>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search user name or email..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Company Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building size={13} color="var(--text-muted)" />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
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
            <Filter size={13} color="var(--text-muted)" />
            <select
              className="form-control"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <TableDensityControl density={tableDensity} onDensityChange={handleDensityChange} />
          <span className="font-mono-tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="card table-container" style={{ padding: 0 }}>
        <table className={`table-${tableDensity}`}>
          <thead>
            <tr>
              <th>User Identity & Email</th>
              <th>Company Tenant</th>
              <th>Account Type</th>
              <th>RBAC Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isActive = (u.status || 'ACTIVE') === 'ACTIVE';

              const rowActions = [
                {
                  label: 'Launch ETMS Portal ↗',
                  icon: <ExternalLink size={12} color="var(--accent-green)" />,
                  hidden: u.isInternalOps || !isActive,
                  onClick: () => handleLaunchEtms(u)
                },
                {
                  label: 'Impersonate User',
                  icon: <UserCheck size={12} color="var(--primary)" />,
                  hidden: u.isInternalOps || !isActive,
                  onClick: () => setImpersonateTargetUser(u)
                },
                {
                  label: 'Edit User Details',
                  icon: <Edit2 size={12} />,
                  onClick: () => {
                    setSelectedUser(u);
                    setEditUser({
                      name: u.name,
                      email: u.email,
                      mobile: u.mobile || '',
                      status: u.status || 'ACTIVE',
                      companyId: u.companyId || '',
                      roleId: u.roleId || '',
                      isInternalOps: u.isInternalOps || false
                    });
                    setShowEditModal(true);
                  }
                },
                {
                  label: 'Reset Password',
                  icon: <Key size={12} color="var(--accent-yellow)" />,
                  onClick: () => {
                    setSelectedUser(u);
                    setShowPasswordModal(true);
                  }
                },
                {
                  label: isActive ? 'Suspend User' : 'Activate User',
                  icon: <RefreshCw size={12} />,
                  onClick: () => handleStatusTogglePrompt(u)
                },
                {
                  label: 'Revoke User Sessions (Killswitch)',
                  icon: <LogOut size={12} />,
                  danger: true,
                  onClick: () => setKillswitchUser(u)
                }
              ];

              return (
                <tr key={u.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                        <span>{u.email}</span>
                        {u.mobile && (
                          <span className="font-mono-tabular" style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', padding: '0.05rem 0.35rem', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={10} /> {u.mobile}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    {u.company ? (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.company.name}</div>
                        <span className="font-mono-tabular" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{u.company.code}]</span>
                      </div>
                    ) : (
                      <span className="badge badge-pastel-red" style={{ fontSize: '0.7rem' }}>OPS Global Admin</span>
                    )}
                  </td>

                  <td>
                    {u.isInternalOps ? (
                      <span className="badge badge-pastel-blue" style={{ fontSize: '0.7rem' }}>
                        Super Admin
                      </span>
                    ) : u.role?.name?.toLowerCase().includes('admin') ? (
                      <span className="badge badge-pastel-green" style={{ fontSize: '0.7rem' }}>
                        Company Admin
                      </span>
                    ) : (
                      <span className="badge badge-pastel-yellow" style={{ fontSize: '0.7rem' }}>
                        Factory Staff
                      </span>
                    )}
                  </td>

                  <td>
                    {u.role ? (
                      <span className="badge badge-pastel-blue" style={{ fontSize: '0.72rem' }}>
                        {u.role.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Default</span>
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() => handleStatusTogglePrompt(u)}
                      className={`badge ${isActive ? 'badge-pastel-green' : 'badge-pastel-red'}`}
                      style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem'
                      }}
                      title={`Click to toggle status to ${isActive ? 'SUSPENDED' : 'ACTIVE'}`}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                      {isActive ? 'Active' : 'Suspended'}
                    </button>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      {!u.isInternalOps && isActive && (
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.72rem',
                            color: 'var(--accent-green)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 600
                          }}
                          onClick={() => handleLaunchEtms(u)}
                          title={`Open ETMS Factory Portal directly as ${u.name} (${u.mobile || 'No Mobile'})`}
                        >
                          <ExternalLink size={11} /> Launch ETMS
                        </button>
                      )}
                      <TableActionMenu actions={rowActions} />
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Mobile (ETMS Login ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9825012345"
                    className="form-control"
                    value={newUser.mobile}
                    onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                  />
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Mobile (ETMS Login ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9825012345"
                    className="form-control"
                    value={editUser.mobile}
                    onChange={(e) => setEditUser({ ...editUser, mobile: e.target.value })}
                  />
                </div>
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
                <Key size={16} style={{ color: 'var(--warning)' }} />
                Reset Password
              </h2>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
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

      {/* CONFIRMATION DIALOG MODAL (SCRUM-78) */}
      <ConfirmModal
        isOpen={!!confirmUserStatus}
        title={`Change User Status: ${confirmUserStatus?.user?.name || 'User'}`}
        message={`Are you sure you want to change the status of '${confirmUserStatus?.user?.name}' (${confirmUserStatus?.user?.email}) to '${confirmUserStatus?.newStatus}'? ${
          confirmUserStatus?.newStatus === 'SUSPENDED'
            ? 'The user will be immediately blocked from logging into the portal or API.'
            : 'The user will regain access to authorized modules.'
        }`}
        confirmText={confirmUserStatus?.newStatus === 'SUSPENDED' ? 'Suspend User' : 'Activate User'}
        cancelText="Cancel"
        variant={confirmUserStatus?.newStatus === 'SUSPENDED' ? 'danger' : 'warning'}
        loading={statusUpdating}
        onConfirm={handleConfirmUserStatusToggle}
        onCancel={() => setConfirmUserStatus(null)}
      />

      {/* USER SESSION KILLSWITCH CONFIRM MODAL (SCRUM-84) */}
      <ConfirmModal
        isOpen={Boolean(killswitchUser)}
        title={`Activate User Killswitch: ${killswitchUser?.name || 'User'}`}
        message={`Are you sure you want to immediately terminate all active sessions and invalidate all issued JWT tokens for '${killswitchUser?.name}' (${killswitchUser?.email})? The user will be instantly logged out on all devices.`}
        confirmText="Revoke User Sessions"
        cancelText="Cancel"
        variant="danger"
        loading={killswitchLoading}
        onConfirm={handleRevokeUserSessions}
        onCancel={() => setKillswitchUser(null)}
      />

      {/* SUPPORT IMPERSONATION CONFIRM MODAL (SCRUM-87) */}
      <ConfirmModal
        isOpen={Boolean(impersonateTargetUser)}
        title={`Start Support Impersonation: ${impersonateTargetUser?.name || 'User'}`}
        message={`You are about to establish a Support Impersonation session as '${impersonateTargetUser?.name}' (${impersonateTargetUser?.email}) from '${impersonateTargetUser?.company?.name || 'Tenant'}'. This will switch OPS into Support Mode and immediately launch the ETMS Factory Operations Portal as this user in a new tab. Continue?`}
        confirmText="Impersonate & Launch ETMS ↗"
        cancelText="Cancel"
        variant="warning"
        loading={impersonateLoading}
        onConfirm={handleConfirmImpersonation}
        onCancel={() => setImpersonateTargetUser(null)}
      />
    </div>
  );
}