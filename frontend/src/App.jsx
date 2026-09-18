import React, { useState, useEffect } from 'react';
import {
  Building,
  Lock,
  Users,
  Settings,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Shield,
  Database,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  UserCheck,
  Edit2,
  Headphones,
  ArrowLeft,
  FileSpreadsheet,
  Globe,
  Phone,
  Mail,
  MapPin,
  Search,
  Activity,
  ExternalLink,
  Menu,
  Sliders,
  Layers
} from 'lucide-react';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CompanyManagement from './components/CompanyManagement';
import CompanyOnboardingWizard from './components/CompanyOnboardingWizard';
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';
import AuditLogViewer from './components/AuditLogViewer';
import CommandPalette from './components/CommandPalette';
import SubscriptionManagement from './components/SubscriptionManagement';
import SystemHealthMonitor from './components/SystemHealthMonitor';
import SecuritySettingsModal from './components/SecuritySettingsModal';
import TenantReconciliationModal from './components/TenantReconciliationModal';
import ThemeToggle from './components/ThemeToggle';
import KpiStrip from './components/KpiStrip';
import CompanyParameterDrawer from './components/CompanyParameterDrawer';
import { useToast } from './context/ToastContext';

const API_BASE = 'http://localhost:5000/api';
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

export default function App() {
  const toast = useToast();

  // Collapsible Sidebar state (SCRUM-93)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ops_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ops_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Real JWT Auth state (SCRUM-84)
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    name: 'Super Administrator',
    email: 'admin@ops.saas',
    isInternalOps: true,
    twoFactorEnabled: false
  });
  const [loginEmail, setLoginEmail] = useState('admin@ops.saas');
  const [loginPass, setLoginPass] = useState('admin123');
  const [loginTotpCode, setLoginTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Tenant Impersonation State (SCRUM-86, 87)
  const [impersonationContext, setImpersonationContext] = useState(null);

  // Navigation & Support Operating context state
  const [activeTab, setActiveTab] = useState('global_dashboard');
  const [operatingCompany, setOperatingCompany] = useState(null);
  const [companySubTab, setCompanySubTab] = useState('overview');

  // Global Parameter Store Drawer State
  const [selectedParamCompany, setSelectedParamCompany] = useState(null);

  // Command Palette State (SCRUM-79)
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [globalStats, setGlobalStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  const masterSeedCompany = companies.find(
    (c) => c.isSeed || c.code === '000' || c.id === SEED_COMPANY_ID
  ) || {
    id: SEED_COMPANY_ID,
    name: 'Master Seed Organization (000)',
    code: '000',
    isSeed: true
  };
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [companyTransactions, setCompanyTransactions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // ETMS Tenant Reconciliation State (SCRUM-103)
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [untrackedCount, setUntrackedCount] = useState(0);

  // Modals state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // Registration Form State
  const [newCompany, setNewCompany] = useState({
    name: '',
    code: '',
    logoUrl: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstin: '',
    address: '',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12H',
    currency: 'INR',
    currencySymbol: '₹',
    roundOffFormat: 'NEAREST_RUPEE',
    digitsAfterDecimal: '2',
  });

  const [newUser, setNewUser] = useState({ name: '', email: '', isInternalOps: false });
  const [editUserData, setEditUserData] = useState({ name: '', email: '', status: 'ACTIVE' });

  const checkUntrackedTenants = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/reconcile/discovery`);
      const data = await res.json();
      if (data.success) setUntrackedCount(data.data.untrackedCount || 0);
    } catch (err) {
      console.error('Error checking untracked tenants:', err);
    }
  };

  // Initial Load & Auth Token Bootstrap
  useEffect(() => {
    const bootstrapAuthToken = async () => {
      const existingToken = localStorage.getItem('ops_access_token');
      if (!existingToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' }),
          });
          const data = await res.json();
          if (data.success && data.data?.accessToken) {
            localStorage.setItem('ops_access_token', data.data.accessToken);
            localStorage.setItem('ops_refresh_token', data.data.refreshToken);
            if (data.data.user) setCurrentUser(data.data.user);
          }
        } catch (e) {
          console.warn('Bootstrap token fetch error:', e);
        }
      }
    };

    if (isLoggedIn) {
      bootstrapAuthToken();
      fetchGlobalStats();
      fetchCompanies();
      fetchUsers();
      fetchRoles();
      fetchAuditLogs();
      checkUntrackedTenants();
    }
  }, [isLoggedIn]);

  // Global Shortcuts: Ctrl+K (Command Palette) and Ctrl+B (Toggle Sidebar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem('ops_sidebar_collapsed', String(next));
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/global`);
      const data = await res.json();
      if (data.success) setGlobalStats(data.data);
    } catch (err) {
      console.error('Error fetching global stats:', err);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/companies`);
      const data = await res.json();
      if (data.success) setCompanies(data.data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/roles`);
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchAuditLogs = async (companyId = null) => {
    try {
      const url = companyId ? `${API_BASE}/audit-logs?companyId=${companyId}` : `${API_BASE}/audit-logs`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setAuditLogs(data.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  // Support Impersonation Context
  const startOperatingAsCompany = async (company) => {
    setLoading(true);
    try {
      const compRes = await fetch(`${API_BASE}/companies/${company.id}`);
      const compData = await compRes.json();

      const txRes = await fetch(`${API_BASE}/companies/${company.id}/transactions`);
      const txData = await txRes.json();

      if (compData.success) {
        setOperatingCompany(compData.data);
        setCompanyTransactions(txData.data || []);
        setActiveTab('company_operational_mode');
        setCompanySubTab('overview');
        fetchAuditLogs(company.id);
        setMessage({
          type: 'info',
          text: `🎧 Now Operating in Support Mode for ${company.name}.`,
        });
        toast.info(`Now operating in support mode for ${company.name}`, 'Support Mode Active');
      }
    } catch (err) {
      console.error('Error operating as company:', err);
      toast.error('Failed to initialize company support context.', 'Support Mode Error');
    } finally {
      setLoading(false);
    }
  };

  const refreshOperatingCompany = async () => {
    if (operatingCompany) await startOperatingAsCompany(operatingCompany);
  };

  const handleSyncStaffFromEtms = async () => {
    if (!operatingCompany) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sync/companies/${operatingCompany.id}/sync-etms-staff`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, 'Staff Synced from ETMS');
        await refreshOperatingCompany();
        fetchUsers();
        fetchAuditLogs();
      } else {
        toast.error(data.message || 'Failed to sync staff users', 'Sync Error');
      }
    } catch (err) {
      toast.error('Network error while syncing ETMS staff users', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  const exitCompanyOperationalMode = () => {
    setOperatingCompany(null);
    setActiveTab('global_dashboard');
    fetchGlobalStats();
    fetchCompanies();
    fetchUsers();
    fetchAuditLogs();
    setMessage({ type: 'info', text: 'Returned to Global Super Admin View.' });
    toast.info('Returned to Global Super Admin Dashboard view.', 'Global View');
  };

  const handleImpersonateUser = (impersonationData) => {
    const originalToken = localStorage.getItem('ops_access_token');
    const originalUser = currentUser;

    localStorage.setItem('ops_access_token', impersonationData.impersonationToken);
    setCurrentUser(impersonationData.targetUser);
    setImpersonationContext({
      originalToken,
      originalUser,
      targetUser: impersonationData.targetUser,
      impersonatedBy: impersonationData.impersonatedBy,
      expiresAt: Date.now() + (impersonationData.expiresIn || 900) * 1000,
    });

    if (impersonationData.targetUser.company) {
      setOperatingCompany(impersonationData.targetUser.company);
      setActiveTab('company_operational_mode');
    }
  };

  const handleExitImpersonation = async () => {
    if (!impersonationContext) return;
    try {
      const activeToken = localStorage.getItem('ops_access_token');
      await fetch(`${API_BASE}/auth/exit-impersonation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken && { Authorization: `Bearer ${activeToken}` }),
        },
      });
    } catch (e) {
      console.warn('Exit impersonation request error:', e);
    }

    localStorage.setItem('ops_access_token', impersonationContext.originalToken);
    setCurrentUser(impersonationContext.originalUser);
    setImpersonationContext(null);
    setOperatingCompany(null);
    setActiveTab('global_dashboard');
    toast.info('Support Impersonation session terminated. Super Admin identity restored.', 'Support Mode Exited');
  };

  const handleLaunchEtms = async (targetUser) => {
    if (!targetUser) return;
    if (!targetUser.mobile) {
      toast.warning(`User '${targetUser.name}' does not have a registered mobile phone number for ETMS login.`, 'Missing Mobile');
      return;
    }

    toast.info(`Connecting to ETMS Factory Portal for '${targetUser.name}'...`, 'Launching ETMS');

    try {
      let activeToken = localStorage.getItem('ops_access_token');
      let res = await fetch(`${API_BASE}/auth/launch-etms/${targetUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken && { Authorization: `Bearer ${activeToken}` })
        }
      });

      if (res.status === 401) {
        const authRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' })
        });
        const authData = await authRes.json();
        if (authData.success && authData.data?.accessToken) {
          activeToken = authData.data.accessToken;
          localStorage.setItem('ops_access_token', activeToken);
          res = await fetch(`${API_BASE}/auth/launch-etms/${targetUser.id}`, {
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
        toast.success(`Opening ETMS Factory Portal as '${targetUser.name}' (${targetUser.mobile})...`, 'ETMS Portal Ready');
        window.open(data.launchUrl, '_blank');
      } else {
        toast.error(data.message || 'Failed to generate ETMS launch session.', 'Launch Error');
      }
    } catch (err) {
      console.error('Error launching ETMS:', err);
      toast.error('Network error launching ETMS portal.', 'Launch Error');
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Company '${newCompany.name}' registered with GSTIN '${newCompany.gstin || 'N/A'}'!`, 'Tenant Provisioned');
        setNewCompany({
          name: '',
          code: '',
          logoUrl: '',
          contactPerson: '',
          mobile: '',
          email: '',
          gstin: '',
          address: '',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12H',
          currency: 'INR',
          currencySymbol: '₹',
          roundOffFormat: 'NEAREST_RUPEE',
          digitsAfterDecimal: '2',
        });
        setShowCompanyModal(false);
        fetchCompanies();
        fetchGlobalStats();
        fetchAuditLogs();
      } else {
        toast.error(data.message || 'Failed to register company', 'Registration Error');
      }
    } catch (err) {
      toast.error('Failed to register company due to network error.', 'Registration Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...newUser,
        companyId: operatingCompany ? operatingCompany.id : null,
      };
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User '${newUser.name}' created successfully!`, 'User Created');
        setNewUser({ name: '', email: '', isInternalOps: false });
        setShowUserModal(false);
        fetchUsers();
        if (operatingCompany) refreshOperatingCompany();
        fetchAuditLogs();
      } else {
        toast.error(data.message || 'Failed to create user', 'User Creation Error');
      }
    } catch (err) {
      toast.error('Failed to create user due to network error.', 'User Creation Error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    try {
      const res = await fetch(`${API_BASE}/users/${selectedUserToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Support Update: User '${editUserData.name}' updated. Logged to MongoDB.`, 'User Updated');
        setShowEditUserModal(false);
        setSelectedUserToEdit(null);
        fetchUsers();
        if (operatingCompany) refreshOperatingCompany();
        fetchAuditLogs();
      } else {
        toast.error(data.message || 'Failed to update user', 'Update Error');
      }
    } catch (err) {
      toast.error('Failed to update user due to network error.', 'Update Error');
    }
  };

  const handleUpdateParameter = async (companyId, key, value) => {
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/parameters/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Setting '${key}' set to '${value}'. Logged to MongoDB.`, 'Parameter Updated');
        if (operatingCompany) refreshOperatingCompany();
        fetchAuditLogs();
      } else {
        toast.error(data.message || 'Failed to update parameter', 'Parameter Error');
      }
    } catch (err) {
      toast.error('Failed to update parameter due to network error.', 'Parameter Error');
    }
  };

  const handleBlockedRoleEdit = async (roleId) => {
    try {
      const res = await fetch(`${API_BASE}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Blocked Edit Attempt' }),
      });
      const data = await res.json();
      fetchAuditLogs();
      toast.error(
        `Action Blocked (403 Forbidden): ${data.message}. Security violation logged to MongoDB Audit Trail.`,
        'Role Guard Active'
      );
    } catch (err) {
      toast.error('Action blocked by system-defined role guard.', 'Role Guard Active');
    }
  };

  // Search Filter logic
  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPass,
          ...(requires2FA && { totpCode: loginTotpCode }),
        }),
      });
      const data = await res.json();
      if (data.requires2FA) {
        setRequires2FA(true);
        toast.info('Please enter your 6-digit TOTP authenticator code.');
      } else if (data.success) {
        localStorage.setItem('ops_access_token', data.data.accessToken);
        localStorage.setItem('ops_refresh_token', data.data.refreshToken);
        setCurrentUser(data.data.user);
        setIsLoggedIn(true);
        setRequires2FA(false);
        setLoginTotpCode('');
        toast.success(`Welcome back, ${data.data.user.name}!`);
        fetchGlobalStats();
        fetchCompanies();
        fetchUsers();
      } else {
        toast.error(data.message || 'Authentication failed.');
      }
    } catch (err) {
      toast.error('Network error during login.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ background: 'white', padding: '2.25rem', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', background: '#eef2ff', padding: '0.75rem', borderRadius: '50%', color: '#4f46e5', marginBottom: '0.65rem' }}>
              <Shield size={32} />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>OPS Super Admin</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              {requires2FA ? 'Two-Factor Verification Required' : 'Production JWT Secure Control Plane'}
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {!requires2FA ? (
              <>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>OPS Admin Email</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Password</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                  Enter 6-Digit Authenticator Code (TOTP)
                </label>
                <input
                  type="text"
                  maxLength="6"
                  required
                  placeholder="123456"
                  className="form-control"
                  style={{ fontSize: '1.35rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }}
                  value={loginTotpCode}
                  onChange={(e) => setLoginTotpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={authLoading || (requires2FA && loginTotpCode.length !== 6)}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem', fontSize: '0.88rem' }}
            >
              {authLoading ? 'Verifying Credentials...' : requires2FA ? 'Verify 2FA Code' : 'Sign In to Super Admin'}
            </button>

            {requires2FA && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setRequires2FA(false); setLoginTotpCode(''); }}
                style={{ width: '100%', fontSize: '0.78rem' }}
              >
                Back to Password Login
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* RESPONSIVE COLLAPSIBLE SIDEBAR (SCRUM-93) */}
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Shield size={20} />
            <span>OPS Super Admin</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          >
            {isSidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {operatingCompany ? (
          <div style={{ background: 'var(--primary-light)', padding: '0.5rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--primary)' }}>
              <Headphones size={14} /> {!isSidebarCollapsed && <span>Support Mode</span>}
            </div>
            {!isSidebarCollapsed && (
              <div style={{ color: 'var(--text-main)', fontSize: '0.75rem', marginTop: '0.1rem', fontWeight: 600 }}>
                {operatingCompany.name} ({operatingCompany.code})
              </div>
            )}
          </div>
        ) : (
          !isSidebarCollapsed && (
            <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Global Control Plane
            </div>
          )
        )}

        {/* COMMAND PALETTE QUICK SEARCH BUTTON (SCRUM-79) */}
        <button
          type="button"
          onClick={() => setShowCommandPalette(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            padding: isSidebarCollapsed ? '0.5rem 0' : '0.45rem 0.65rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-canvas)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            width: '100%',
            transition: 'all 0.15s ease',
          }}
          title="Open Command Palette (Ctrl+K)"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Search size={13} color="var(--text-muted)" /> {!isSidebarCollapsed && 'Quick jump...'}
          </span>
          {!isSidebarCollapsed && (
            <kbd style={{
              fontSize: '0.65rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: '3px',
              padding: '0.1rem 0.3rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)'
            }}>Ctrl K</kbd>
          )}
        </button>

        <div className="nav-menu">
          {!operatingCompany ? (
            <>
              {/* SECTION: PLATFORM GOVERNANCE */}
              {!isSidebarCollapsed && <div className="nav-section-label">Governance</div>}
              <button className={`nav-item ${activeTab === 'global_dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('global_dashboard')} title="Dashboard">
                <TrendingUp size={16} /> <span>Dashboard</span>
              </button>
              <button className={`nav-item ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')} title="Companies">
                <Building size={16} /> <span>Companies</span>
                <span className="badge badge-system nav-counter-badge">{companies.length}</span>
              </button>
              <button className={`nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setActiveTab('subscriptions')} title="Subscriptions">
                <CreditCard size={16} /> <span>Subscriptions</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'parameters' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('parameters');
                  setSelectedParamCompany(masterSeedCompany);
                }}
                title="Parameter Store"
              >
                <Sliders size={16} /> <span>Parameters</span>
              </button>

              {/* SECTION: SECURITY & ACCESS */}
              {!isSidebarCollapsed && <div className="nav-section-label">Security & Access</div>}
              <button className={`nav-item ${activeTab === 'all_users' ? 'active' : ''}`} onClick={() => setActiveTab('all_users')} title="User Directory">
                <Users size={16} /> <span>Users</span>
                <span className="badge badge-seed nav-counter-badge">{users.length}</span>
              </button>
              <button className={`nav-item ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => { fetchRoles(); setActiveTab('roles'); }} title="RBAC Roles">
                <Lock size={16} /> <span>Roles</span>
                <span className="badge badge-system nav-counter-badge">{roles.length}</span>
              </button>
              <button className={`nav-item ${activeTab === 'global_audit' ? 'active' : ''}`} onClick={() => { fetchAuditLogs(); setActiveTab('global_audit'); }} title="Audit Trail">
                <FileText size={16} /> <span>Audit Trail</span>
              </button>

              {/* SECTION: INFRASTRUCTURE & HEALTH */}
              {!isSidebarCollapsed && <div className="nav-section-label">Infrastructure</div>}
              <button className={`nav-item ${activeTab === 'system_health' ? 'active' : ''}`} onClick={() => setActiveTab('system_health')} title="System Health">
                <Activity size={16} /> <span>System Health</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'reconcile' ? 'active' : ''}`}
                onClick={() => {
                  checkUntrackedTenants();
                  setShowReconcileModal(true);
                }}
                style={{
                  background: untrackedCount > 0 ? 'var(--warning-light)' : 'transparent',
                  color: untrackedCount > 0 ? 'var(--warning)' : 'inherit',
                  fontWeight: untrackedCount > 0 ? 700 : 'normal',
                }}
                title="Reconcile ETMS Tenants"
              >
                <Shield size={16} color={untrackedCount > 0 ? 'var(--warning)' : 'var(--primary)'} />
                <span>Reconcile ETMS</span>
                {untrackedCount > 0 && (
                  <span
                    className="nav-counter-badge"
                    style={{
                      background: 'var(--danger)',
                      color: '#ffffff',
                    }}
                  >
                    {untrackedCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              {!isSidebarCollapsed && <div className="nav-section-label">Support Workspace</div>}
              <button className={`nav-item ${companySubTab === 'overview' ? 'active' : ''}`} onClick={() => setCompanySubTab('overview')} title="Overview">
                <TrendingUp size={16} /> <span>Overview</span>
              </button>
              <button className={`nav-item ${companySubTab === 'users' ? 'active' : ''}`} onClick={() => setCompanySubTab('users')} title="Users">
                <Users size={16} /> <span>Users</span>
              </button>
              <button className={`nav-item ${companySubTab === 'features' ? 'active' : ''}`} onClick={() => { setCompanySubTab('features'); setSelectedParamCompany(operatingCompany); }} title="Parameters">
                <Settings size={16} /> <span>Parameters</span>
              </button>
              <button className={`nav-item ${companySubTab === 'roles' ? 'active' : ''}`} onClick={() => setCompanySubTab('roles')} title="Roles">
                <Lock size={16} /> <span>Roles</span>
              </button>
              <button className={`nav-item ${companySubTab === 'transactions' ? 'active' : ''}`} onClick={() => setCompanySubTab('transactions')} title="Transactions">
                <CreditCard size={16} /> <span>Transactions</span>
              </button>
              <button className={`nav-item ${companySubTab === 'audit' ? 'active' : ''}`} onClick={() => { fetchAuditLogs(operatingCompany.id); setCompanySubTab('audit'); }} title="Audit Trail">
                <FileText size={16} /> <span>Audit Trail</span>
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'center', gap: '0.35rem' }}
            onClick={() => setShowSecurityModal(true)}
            title="Manage security & 2FA"
          >
            <Shield size={13} color="var(--primary)" /> {!isSidebarCollapsed && 'Security & 2FA'}
          </button>

          {operatingCompany ? (
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.78rem' }} onClick={exitCompanyOperationalMode} title="Exit Support Mode">
              <ArrowLeft size={14} /> {!isSidebarCollapsed && 'Exit Support'}
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.78rem' }}
              onClick={() => {
                localStorage.removeItem('ops_access_token');
                localStorage.removeItem('ops_refresh_token');
                setIsLoggedIn(false);
                toast.info('Logged out of Super Admin.');
              }}
              title="Sign Out"
            >
              <LogOut size={14} /> {!isSidebarCollapsed && 'Sign Out'}
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        {/* TOP INTEGRATED HEADER & BREADCRUMBS BAR (SCRUM-97 & SCRUM-98) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
          <div className="breadcrumbs" style={{ margin: 0 }}>
            <span className="breadcrumb-item" onClick={() => { exitCompanyOperationalMode(); setActiveTab('global_dashboard'); }}>
              Global Control Plane
            </span>
            <ChevronRight size={12} />
            {operatingCompany ? (
              <>
                <span className="breadcrumb-item" onClick={() => { setActiveTab('companies'); }}>
                  Tenants
                </span>
                <ChevronRight size={12} />
                <span className="breadcrumb-item active">
                  {operatingCompany.name} ({operatingCompany.code})
                </span>
                <ChevronRight size={12} />
                <span className="breadcrumb-item active" style={{ textTransform: 'capitalize' }}>
                  {companySubTab}
                </span>
              </>
            ) : (
              <span className="breadcrumb-item active" style={{ textTransform: 'capitalize' }}>
                {activeTab.replace('_', ' ')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* PERSISTENT QUICK-SWITCH TENANT SELECTOR (SCRUM-97) */}
            <select
              className="form-control"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', width: '170px' }}
              value={operatingCompany?.id || ''}
              onChange={(e) => {
                const cId = e.target.value;
                if (!cId) {
                  exitCompanyOperationalMode();
                } else {
                  const targetComp = companies.find((c) => c.id === cId);
                  if (targetComp) enterCompanyOperationalMode(targetComp);
                }
              }}
            >
              <option value="">-- Jump to tenant... --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>

            {/* THEME TOGGLE (SCRUM-98) */}
            <ThemeToggle />
          </div>
        </div>
        {/* SUPPORT IMPERSONATION ACTIVE BANNER (SCRUM-87) */}
        {impersonationContext && (
          <div
            style={{
              background: 'var(--accent-yellow-bg)',
              color: 'var(--accent-yellow)',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid rgba(149, 100, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Shield size={16} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Tenant Impersonation Active: Operating as {impersonationContext.targetUser?.name} ({impersonationContext.targetUser?.email})
                </div>
                <div style={{ fontSize: '0.74rem', opacity: 0.85 }}>
                  Tenant: <strong>{impersonationContext.targetUser?.company?.name || 'Internal'}</strong> &bull; Super Admin: <em>{impersonationContext.originalUser?.name}</em> &bull; Ephemeral Session (15m TTL)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleLaunchEtms(impersonationContext.targetUser)}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
                title={`Open ETMS Factory Portal as ${impersonationContext.targetUser?.name}`}
              >
                <ExternalLink size={13} /> Open ETMS Portal
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleExitImpersonation}
                style={{
                  color: 'var(--accent-red)',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <LogOut size={13} /> Exit Support
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`alert alert-${message.type === 'error' ? 'error' : 'info'}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>
          </div>
        )}

        {/* SUPPORT OPERATIONAL MODE TOP BANNER */}
        {operatingCompany && (
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                <Headphones size={15} /> Support Operating Mode Active
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                {operatingCompany.name} <code style={{ fontSize: '0.85rem', background: 'var(--bg-surface)', padding: '0.1rem 0.4rem', borderRadius: '3px', border: '1px solid var(--border)' }}>{operatingCompany.code}</code>
              </h2>
            </div>
            <button className="btn btn-secondary" onClick={exitCompanyOperationalMode} style={{ fontSize: '0.78rem' }}>
              <ArrowLeft size={14} /> Exit to Global View
            </button>
          </div>
        )}

        {/* GLOBAL DASHBOARD */}
        {activeTab === 'global_dashboard' && !operatingCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ETMS UNTRACKED TENANTS ALERT BANNER (SCRUM-103) */}
            {untrackedCount > 0 && (
              <div
                style={{
                  background: 'var(--accent-yellow-bg)',
                  border: '1px solid rgba(149, 100, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={18} color="var(--accent-yellow)" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-yellow)' }}>
                      {untrackedCount} Untracked Tenant(s) Detected in ETMS
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Reconcile and standardize factory tenants into the OPS master directory.
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowReconcileModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                >
                  <Shield size={14} /> Reconcile Now
                </button>
              </div>
            )}

            <AnalyticsDashboard
              apiBase={API_BASE}
              onRegisterCompany={() => setShowCompanyModal(true)}
              onNavigateTab={(tab) => {
                if (tab === 'global_audit') fetchAuditLogs();
                setActiveTab(tab);
              }}
              onSelectCompany={(comp) => startOperatingAsCompany(comp)}
            />

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem' }}>Registered Companies Directory</h3>

                {/* SEARCH FILTER BOX */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '5px', padding: '0.2rem 0.5rem' }}>
                  <Search size={14} color="var(--text-muted)" style={{ marginRight: '0.3rem' }} />
                  <input
                    type="text"
                    placeholder="Filter by name, GSTIN, code..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.78rem', width: '200px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Company Identity</th>
                      <th>GSTIN Number</th>
                      <th>Contact Person</th>
                      <th>Mobile / Email</th>
                      <th>System Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr key={company.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {company.logoUrl && (
                              <img src={company.logoUrl} alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                            )}
                            <div>
                              <strong>{company.name}</strong> <code style={{ fontSize: '0.75rem', color: '#4f46e5' }}>{company.code}</code>
                              {company.isSeed && <span className="badge badge-seed" style={{ marginLeft: '0.3rem' }}>000 SEED</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          {company.gstin ? (
                            <code className="mono" style={{ background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '3px', color: '#1e40af', fontSize: '0.75rem' }}>
                              {company.gstin}
                            </code>
                          ) : (
                            <small style={{ color: 'var(--text-muted)' }}>N/A</small>
                          )}
                        </td>
                        <td>{company.contactPerson || 'N/A'}</td>
                        <td><small>{company.mobile || company.email || 'N/A'}</small></td>
                        <td><span className="badge badge-system"><Lock size={10} /> Locked</span></td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => startOperatingAsCompany(company)}>
                            <Headphones size={13} /> Support Mode
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* COMPANIES DIRECTORY TAB */}
        {activeTab === 'companies' && !operatingCompany && (
          <CompanyManagement
            companies={companies}
            apiBase={API_BASE}
            onCompanyCreated={(newComp) => {
              setMessage({ type: 'success', text: `Tenant '${newComp.name}' provisioned successfully.` });
              fetchCompanies();
              fetchGlobalStats();
              fetchAuditLogs();
            }}
            onOperateCompany={(c) => startOperatingAsCompany(c)}
            onRefresh={() => {
              fetchCompanies();
              fetchGlobalStats();
            }}
          />
        )}

        {/* USERS DIRECTORY TAB */}
        {activeTab === 'all_users' && !operatingCompany && (
          <UserManagement
            users={users}
            companies={companies}
            roles={roles}
            apiBase={API_BASE}
            onUserCreated={(newUser) => {
              setMessage({ type: 'success', text: `User '${newUser.name}' created successfully.` });
              fetchUsers();
              fetchGlobalStats();
              fetchAuditLogs();
            }}
            onUserUpdated={(updatedUser) => {
              setMessage({ type: 'success', text: `User '${updatedUser.name}' updated successfully.` });
              fetchUsers();
              fetchAuditLogs();
            }}
            onRefresh={() => {
              fetchUsers();
              fetchCompanies();
              fetchRoles();
            }}
            onImpersonateUser={handleImpersonateUser}
          />
        )}

        {/* ROLES DIRECTORY TAB */}
        {activeTab === 'roles' && !operatingCompany && (
          <RoleManagement
            companies={companies}
            apiBase={API_BASE}
            onRefresh={() => {
              fetchRoles();
              fetchAuditLogs();
            }}
          />
        )}

        {/* SUBSCRIPTIONS & QUOTA DIRECTORY TAB (SCRUM-81) */}
        {activeTab === 'subscriptions' && !operatingCompany && (
          <SubscriptionManagement
            apiBase={API_BASE}
            onRefresh={() => {
              fetchCompanies();
              fetchGlobalStats();
              fetchAuditLogs();
            }}
          />
        )}

        {/* MASTER SEED PARAMETER STORE & RULES TAB */}
        {activeTab === 'parameters' && !operatingCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Master Parameter Store
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                    Global system rules, SAC codes, and tenant defaults (Seed 000)
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedParamCompany(masterSeedCompany)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <Sliders size={14} /> Open Parameters
                </button>
              </div>
            </div>

            {/* SEED PARAMETERS DIRECTORY TABLE */}
            <div className="card table-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem' }}>Default System Rules</h3>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedParamCompany(masterSeedCompany)}
                  style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Sliders size={12} /> Configure Rules
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Parameter Key</th>
                    <th>Default Value</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.find((c) => c.isSeed)?.parameters?.map((p) => (
                    <tr key={p.id || p.key}>
                      <td><code>{p.key}</code></td>
                      <td>
                        <span className="badge badge-pastel-purple" style={{ fontFamily: 'var(--font-mono)' }}>
                          {String(p.value)}
                        </span>
                      </td>
                      <td><small style={{ color: 'var(--text-muted)' }}>{p.type || 'STRING'}</small></td>
                      <td><small>{p.description}</small></td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No default parameters loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SYSTEM HEALTH TELEMETRY & SYNC DLQ TAB (SCRUM-82 & SCRUM-83) */}
        {activeTab === 'system_health' && !operatingCompany && (
          <SystemHealthMonitor
            apiBase={API_BASE}
            onRefresh={() => {
              fetchGlobalStats();
            }}
          />
        )}

        {/* AUDIT LOGS TAB */}
        {(activeTab === 'global_audit' || (operatingCompany && companySubTab === 'audit')) && (
          <AuditLogViewer
            companies={companies}
            apiBase={API_BASE}
            companyId={operatingCompany ? operatingCompany.id : null}
            onRefresh={() => {
              fetchGlobalStats();
            }}
          />
        )}

        {/* COMPANY OPERATIONAL MODE SUB-TABS */}
        {operatingCompany && (
          <div>
            {companySubTab === 'overview' && (
              <div>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{operatingCompany.name}</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Organization Profile</p>
                    </div>
                    {operatingCompany.logoUrl && (
                      <img src={operatingCompany.logoUrl} alt="Logo" style={{ maxWidth: '100px', maxHeight: '45px', borderRadius: '4px', objectFit: 'contain' }} />
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <FileSpreadsheet size={15} /> Compliance & Contact
                      </div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>GSTIN: <code className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{operatingCompany.gstin || 'N/A'}</code></div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>Contact: <strong>{operatingCompany.contactPerson || 'N/A'}</strong></div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>Phone: <strong>{operatingCompany.mobile || 'N/A'}</strong></div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>Email: <strong>{operatingCompany.email || 'N/A'}</strong></div>
                    </div>

                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <MapPin size={15} /> Billing Address
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {operatingCompany.address || 'No billing address recorded.'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <Globe size={15} /> Localization
                      </div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Time Zone: <strong>{operatingCompany.parameters?.find(p => p.key === 'timezone')?.value || 'Asia/Kolkata'}</strong></div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Date Format: <strong>{operatingCompany.parameters?.find(p => p.key === 'date_format')?.value || 'DD/MM/YYYY'}</strong></div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Currency: <strong>{operatingCompany.parameters?.find(p => p.key === 'currency_symbol')?.value || '₹'} ({operatingCompany.parameters?.find(p => p.key === 'currency')?.value || 'INR'})</strong></div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Round Off: <strong>{operatingCompany.roundOffFormat || 'NEAREST_RUPEE'}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {companySubTab === 'users' && (
              <div className="card table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>Users ({operatingCompany.name})</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSyncStaffFromEtms}
                      disabled={loading}
                      style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Sync staff from ETMS"
                    >
                      <RefreshCw size={13} className={loading ? 'spin' : ''} /> Sync Staff
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowUserModal(true)} style={{ fontSize: '0.78rem' }}>
                      <Plus size={14} /> Create User
                    </button>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email & Phone</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatingCompany.users?.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>
                          <div>{u.email}</div>
                          {u.mobile && (
                            <div className="font-mono-tabular" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {u.mobile}
                            </div>
                          )}
                        </td>
                        <td><span className="badge badge-active">{u.status || 'ACTIVE'}</span></td>
                        <td>
                          <span className="badge badge-pastel-blue" style={{ fontSize: '0.7rem' }}>
                            {u.role ? u.role.name : 'Staff'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }} onClick={() => { setSelectedUserToEdit(u); setEditUserData({ name: u.name, email: u.email, status: u.status || 'ACTIVE' }); setShowEditUserModal(true); }}>
                            <Edit2 size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {companySubTab === 'features' && (
              <div className="card table-container">
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Parameters ({operatingCompany.parameters?.length || 0})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Description</th>
                      <th>Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatingCompany.parameters?.map((p) => (
                      <tr key={p.id}>
                        <td><code>{p.key}</code></td>
                        <td><span style={{ background: 'var(--bg-surface-elevated)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontWeight: 600 }}>{p.value}</span></td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{p.description}</small></td>
                        <td>
                          {p.key.startsWith('feature_') ? (
                            <button className={`btn ${p.value === 'true' ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleUpdateParameter(operatingCompany.id, p.key, p.value === 'true' ? 'false' : 'true')}>
                              {p.value === 'true' ? 'Disable' : 'Enable'}
                            </button>
                          ) : (
                            <input type="text" defaultValue={p.value} className="form-control" style={{ width: '130px', padding: '0.15rem 0.4rem' }} onBlur={(e) => { if (e.target.value !== p.value) handleUpdateParameter(operatingCompany.id, p.key, e.target.value); }} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {companySubTab === 'roles' && (
              <RoleManagement
                companies={companies}
                currentCompanyId={operatingCompany.id}
                apiBase={API_BASE}
                onRefresh={() => {
                  fetchRoles();
                  fetchAuditLogs(operatingCompany.id);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* MODAL: ONBOARDING WIZARD */}
      <CompanyOnboardingWizard
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onSubmit={async (formData) => {
          setLoading(true);
          try {
            const res = await fetch(`${API_BASE}/companies`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
              setMessage({ type: 'success', text: `Tenant '${data.data.name}' successfully provisioned.` });
              setShowCompanyModal(false);
              fetchCompanies();
              fetchGlobalStats();
              fetchAuditLogs();
            } else {
              setMessage({ type: 'error', text: data.message || 'Failed to create company' });
            }
          } catch (err) {
            setMessage({ type: 'error', text: 'Error communicating with backend' });
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
      />

      {/* MODAL: CREATE USER */}
      {showUserModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Create User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required placeholder="Rajesh Sharma" className="form-control" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required placeholder="rajesh@acme.in" className="form-control" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPPORT EDIT USER */}
      {showEditUserModal && selectedUserToEdit && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Edit User</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required className="form-control" value={editUserData.name} onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required className="form-control" value={editUserData.email} onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Account Status</label>
                <select className="form-control" value={editUserData.status} onChange={(e) => setEditUserData({ ...editUserData, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT LOG PAYLOAD */}
      {selectedAuditLog && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h2 style={{ fontSize: '1.1rem' }}>MongoDB Audit Log Record</h2>
            <pre style={{ background: '#1e293b', color: '#38bdf8', padding: '0.75rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.78rem', marginTop: '0.75rem' }}>
              {JSON.stringify(selectedAuditLog, null, 2)}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => setSelectedAuditLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL COMMAND PALETTE (SCRUM-79) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        companies={companies}
        users={users}
        onNavigateTab={(tab) => {
          if (operatingCompany) setOperatingCompany(null);
          if (tab === 'global_audit') fetchAuditLogs();
          setActiveTab(tab);
        }}
        onSelectCompany={(c) => startOperatingAsCompany(c)}
        onRegisterCompany={() => setShowCompanyModal(true)}
        onCreateUser={() => setShowUserModal(true)}
        onOpenParameterStore={(comp) => {
          if (comp?.id && comp.id !== SEED_COMPANY_ID) {
            startOperatingAsCompany(comp);
            setCompanySubTab('features');
          } else {
            if (operatingCompany) setOperatingCompany(null);
            setActiveTab('parameters');
            setSelectedParamCompany(masterSeedCompany);
          }
        }}
      />

      {/* GLOBAL COMPANY PARAMETER STORE DRAWER */}
      <CompanyParameterDrawer
        isOpen={!!selectedParamCompany}
        company={selectedParamCompany}
        onClose={() => setSelectedParamCompany(null)}
        apiBase={API_BASE}
        onParameterUpdated={() => {
          fetchCompanies();
          if (operatingCompany) refreshOperatingCompany();
        }}
      />

      {/* SECURITY & 2FA SETTINGS MODAL (SCRUM-84) */}
      <SecuritySettingsModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        apiBase={API_BASE}
        user={currentUser}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* ETMS TENANT RECONCILIATION MODAL (SCRUM-103) */}
      <TenantReconciliationModal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        apiBase={API_BASE}
        onReconciled={() => {
          fetchCompanies();
          fetchUsers();
          checkUntrackedTenants();
          fetchAuditLogs();
        }}
      />
    </div>
  );
}

