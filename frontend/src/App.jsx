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
  UserCheck,
  Edit2,
  Headphones,
  ArrowLeft,
  FileSpreadsheet,
  Globe,
  Phone,
  Mail,
  MapPin,
  Search
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@ops.saas');
  const [loginPass, setLoginPass] = useState('adminpassword123');

  // Navigation & Support Operating context state
  const [activeTab, setActiveTab] = useState('global_dashboard');
  const [operatingCompany, setOperatingCompany] = useState(null);
  const [companySubTab, setCompanySubTab] = useState('overview');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [globalStats, setGlobalStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [companyTransactions, setCompanyTransactions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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

  // Initial Load
  useEffect(() => {
    if (isLoggedIn) {
      fetchGlobalStats();
      fetchCompanies();
      fetchUsers();
      fetchAuditLogs();
    }
  }, [isLoggedIn]);

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
      }
    } catch (err) {
      console.error('Error operating as company:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshOperatingCompany = async () => {
    if (operatingCompany) await startOperatingAsCompany(operatingCompany);
  };

  const exitCompanyOperationalMode = () => {
    setOperatingCompany(null);
    setActiveTab('global_dashboard');
    fetchGlobalStats();
    fetchCompanies();
    fetchUsers();
    fetchAuditLogs();
    setMessage({ type: 'info', text: 'Returned to Global Super Admin View.' });
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
        setMessage({
          type: 'success',
          text: `Company '${newCompany.name}' registered with GSTIN '${newCompany.gstin || 'N/A'}'!`,
        });
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
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to register company.' });
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
        setMessage({ type: 'success', text: `User '${newUser.name}' created successfully!` });
        setNewUser({ name: '', email: '', isInternalOps: false });
        setShowUserModal(false);
        fetchUsers();
        if (operatingCompany) refreshOperatingCompany();
        fetchAuditLogs();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create user.' });
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
        setMessage({ type: 'success', text: `Support Update: User '${editUserData.name}' updated. Logged to MongoDB.` });
        setShowEditUserModal(false);
        setSelectedUserToEdit(null);
        fetchUsers();
        if (operatingCompany) refreshOperatingCompany();
        fetchAuditLogs();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update user.' });
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
        setMessage({ type: 'success', text: `Setting '${key}' set to '${value}'. Logged to MongoDB.` });
        if (operatingCompany) refreshOperatingCompany();
        fetchAuditLogs();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update parameter.' });
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
      alert(`⛔ ACTION BLOCKED (403 Forbidden): ${data.message}\n\n🍃 Security violation logged to MongoDB Audit Trail.`);
    } catch (err) {
      alert('Action blocked by system-defined role guard.');
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

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '380px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'inline-flex', background: '#eef2ff', padding: '0.6rem', borderRadius: '50%', color: '#4f46e5', marginBottom: '0.5rem' }}>
              <Shield size={28} />
            </div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>OPS Super Admin</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Eye-Friendly Support Control Panel</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }}>
            <div className="form-group">
              <label>OPS Admin Email</label>
              <input type="email" required className="form-control" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required className="form-control" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem', padding: '0.55rem' }}>
              Login to OPS Suite
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* LIGHT SIDEBAR FOR ALL-DAY SUPPORT COMFORT */}
      <div className="sidebar">
        <div className="sidebar-title">
          <Shield size={20} />
          OPS Super Admin
        </div>

        {operatingCompany ? (
          <div style={{ background: '#eef2ff', padding: '0.5rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', border: '1px solid #c7d2fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#3730a3' }}>
              <Headphones size={14} /> Support Mode
            </div>
            <div style={{ color: '#4338ca', fontSize: '0.75rem', marginTop: '0.1rem', fontWeight: 500 }}>
              {operatingCompany.name} ({operatingCompany.code})
            </div>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid #e2e8f0' }}>
            🌐 Global Super Admin View
          </div>
        )}

        <div className="nav-menu">
          {!operatingCompany ? (
            <>
              <button className={`nav-item ${activeTab === 'global_dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('global_dashboard')}>
                <TrendingUp size={16} /> Dashboard
              </button>
              <button className={`nav-item ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')}>
                <Building size={16} /> Companies ({companies.length})
              </button>
              <button className={`nav-item ${activeTab === 'all_users' ? 'active' : ''}`} onClick={() => setActiveTab('all_users')}>
                <Users size={16} /> Users ({users.length})
              </button>
              <button className={`nav-item ${activeTab === 'global_audit' ? 'active' : ''}`} onClick={() => { fetchAuditLogs(); setActiveTab('global_audit'); }}>
                <FileText size={16} /> Audit Trail
              </button>
            </>
          ) : (
            <>
              <button className={`nav-item ${companySubTab === 'overview' ? 'active' : ''}`} onClick={() => setCompanySubTab('overview')}>
                <TrendingUp size={16} /> Company Overview
              </button>
              <button className={`nav-item ${companySubTab === 'users' ? 'active' : ''}`} onClick={() => setCompanySubTab('users')}>
                <Users size={16} /> Users Support
              </button>
              <button className={`nav-item ${companySubTab === 'features' ? 'active' : ''}`} onClick={() => setCompanySubTab('features')}>
                <Settings size={16} /> Parameters & Features
              </button>
              <button className={`nav-item ${companySubTab === 'roles' ? 'active' : ''}`} onClick={() => setCompanySubTab('roles')}>
                <Lock size={16} /> System Role Guard
              </button>
              <button className={`nav-item ${companySubTab === 'transactions' ? 'active' : ''}`} onClick={() => setCompanySubTab('transactions')}>
                <CreditCard size={16} /> Billing Transactions
              </button>
              <button className={`nav-item ${companySubTab === 'audit' ? 'active' : ''}`} onClick={() => { fetchAuditLogs(operatingCompany.id); setCompanySubTab('audit'); }}>
                <FileText size={16} /> Audit Trail
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          {operatingCompany ? (
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.78rem' }} onClick={exitCompanyOperationalMode}>
              <ArrowLeft size={14} /> Exit Support Mode
            </button>
          ) : (
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.78rem' }} onClick={() => setIsLoggedIn(false)}>
              <LogOut size={14} /> Logout Admin
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
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
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#4338ca', fontWeight: 600, textTransform: 'uppercase' }}>
                <Headphones size={15} /> Support Operating Mode Active
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e1b4b', marginTop: '0.1rem' }}>
                {operatingCompany.name} <code style={{ fontSize: '0.9rem', background: '#e0e7ff', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#3730a3' }}>{operatingCompany.code}</code>
              </h2>
            </div>
            <button className="btn btn-secondary" onClick={exitCompanyOperationalMode} style={{ fontSize: '0.78rem' }}>
              <ArrowLeft size={14} /> Exit to Global View
            </button>
          </div>
        )}

        {/* GLOBAL DASHBOARD */}
        {activeTab === 'global_dashboard' && !operatingCompany && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Executive SaaS Platform Overview</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>High-density light interface designed for all-day support observation.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCompanyModal(true)}>
                <Plus size={15} /> Register Company
              </button>
            </div>

            {/* LIGHT STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Companies</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5' }}>{globalStats?.totalCompanies || companies.length}</div>
              </div>
              <div className="card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>SaaS Users</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{globalStats?.totalUsers || users.length}</div>
              </div>
              <div className="card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Transactions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{globalStats?.totalTransactions || 0}</div>
              </div>
              <div className="card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Revenue Volume</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6d28d9' }}>
                  ₹{(globalStats?.totalVolume || 0).toLocaleString()}
                </div>
              </div>
            </div>

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
          <div className="card table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3>Companies Directory</h3>
              <button className="btn btn-primary" onClick={() => setShowCompanyModal(true)}>
                <Plus size={14} /> Register Company
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>GSTIN</th>
                  <th>Contact Person</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td><code>{c.code}</code></td>
                    <td><code>{c.gstin || 'N/A'}</code></td>
                    <td>{c.contactPerson || 'N/A'}</td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => startOperatingAsCompany(c)}>
                        <Headphones size={13} /> Operate as Company
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USERS DIRECTORY TAB */}
        {activeTab === 'all_users' && !operatingCompany && (
          <div className="card table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3>SaaS Platform Users</h3>
              <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                <Plus size={14} /> Create User
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Support Edit</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.isInternalOps ? <span className="badge badge-ops">OPS Admin</span> : <span className="badge">User</span>}</td>
                    <td>{u.company ? u.company.name : 'OPS System'}</td>
                    <td>{u.role ? u.role.name : 'Super Admin'}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }} onClick={() => { setSelectedUserToEdit(u); setEditUserData({ name: u.name, email: u.email, status: u.status || 'ACTIVE' }); setShowEditUserModal(true); }}>
                        <Edit2 size={11} /> Edit Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {(activeTab === 'global_audit' || (operatingCompany && companySubTab === 'audit')) && (
          <div className="card table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3>MongoDB Audit Trail Logs</h3>
              <button className="btn btn-secondary" onClick={() => fetchAuditLogs(operatingCompany?.id)}>
                <RefreshCw size={13} /> Refresh Logs
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Operator</th>
                  <th>Entity / Company</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => (
                  <tr key={log._id || idx}>
                    <td><small>{new Date(log.createdAt).toLocaleString()}</small></td>
                    <td><span className="badge badge-ops">{log.module}</span></td>
                    <td><strong style={{ color: log.action.includes('BLOCKED') ? 'var(--danger)' : 'inherit' }}>{log.action}</strong></td>
                    <td>{log.performedBy}</td>
                    <td><small>{log.companyId || log.entityId || 'N/A'}</small></td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => setSelectedAuditLog(log)}>
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* COMPANY OPERATIONAL MODE SUB-TABS */}
        {operatingCompany && (
          <div>
            {companySubTab === 'overview' && (
              <div>
                <div className="card" style={{ borderTop: '3px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{operatingCompany.name}</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Registered Business Profile for Invoices & Billing PDFs</p>
                    </div>
                    {operatingCompany.logoUrl && (
                      <img src={operatingCompany.logoUrl} alt="Logo" style={{ maxWidth: '100px', maxHeight: '45px', borderRadius: '4px', objectFit: 'contain' }} />
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <FileSpreadsheet size={15} /> Indian Tax & Compliance
                      </div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>GSTIN: <code className="mono" style={{ color: '#2563eb', fontWeight: 600 }}>{operatingCompany.gstin || 'N/A'}</code></div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>Contact Person: <strong>{operatingCompany.contactPerson || 'N/A'}</strong></div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>Mobile Phone: <strong>{operatingCompany.mobile || 'N/A'}</strong></div>
                      <div style={{ margin: '0.2rem 0', fontSize: '0.78rem' }}>Billing Email: <strong>{operatingCompany.email || 'N/A'}</strong></div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <MapPin size={15} /> Billing Address
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                        {operatingCompany.address || 'No billing address recorded.'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <Globe size={15} /> Utility Parameters
                      </div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Time Zone: <strong>{operatingCompany.parameters?.find(p => p.key === 'timezone')?.value || 'Asia/Kolkata'}</strong></div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Date Format: <strong>{operatingCompany.parameters?.find(p => p.key === 'date_format')?.value || 'DD/MM/YYYY'}</strong></div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Currency: <strong>{operatingCompany.parameters?.find(p => p.key === 'currency_symbol')?.value || '₹'} ({operatingCompany.parameters?.find(p => p.key === 'currency')?.value || 'INR'})</strong></div>
                      <div style={{ margin: '0.15rem 0', fontSize: '0.75rem' }}>Round Off: <strong>{operatingCompany.roundOffFormat || 'NEAREST_RUPEE'}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#92400e', fontSize: '0.82rem' }}>
                    <Lock size={15} /> System-Defined Role Guard
                  </div>
                  <p style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                    Role Name: <strong>{operatingCompany.roles?.[0]?.name}</strong> | Single Final Source of Truth (Protected from FE edit)
                  </p>
                </div>
              </div>
            )}

            {companySubTab === 'users' && (
              <div className="card table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>{operatingCompany.name} - Support User Operations</h3>
                  <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                    <Plus size={14} /> Create User
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Support Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatingCompany.users?.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><span className="badge badge-active">{u.status || 'ACTIVE'}</span></td>
                        <td>{u.role ? u.role.name : 'System Admin'}</td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }} onClick={() => { setSelectedUserToEdit(u); setEditUserData({ name: u.name, email: u.email, status: u.status || 'ACTIVE' }); setShowEditUserModal(true); }}>
                            <Edit2 size={12} /> Edit Details
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
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Utility & Feature Parameters ({operatingCompany.parameters?.length || 0})</h3>
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
                        <td><span style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>{p.value}</span></td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{p.description}</small></td>
                        <td>
                          {p.key.startsWith('feature_') ? (
                            <button className={`btn ${p.value === 'true' ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleUpdateParameter(operatingCompany.id, p.key, p.value === 'true' ? 'false' : 'true')}>
                              {p.value === 'true' ? 'Disable Feature' : 'Enable Feature'}
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
          </div>
        )}
      </div>

      {/* MODAL: REGISTER INDIAN COMPANY */}
      {showCompanyModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Register Indian Company</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
              Compliance & utility parameter settings for Indian businesses.
            </p>

            <form onSubmit={handleCreateCompany}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input type="text" required placeholder="Acme India Pvt Ltd" className="form-control" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Company Code *</label>
                  <input type="text" required placeholder="ACMEIN" className="form-control" value={newCompany.code} onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase() })} />
                </div>
                <div className="form-group">
                  <label>GST Number (GSTIN)</label>
                  <input type="text" placeholder="27AAPCU1234M1ZV" className="form-control" value={newCompany.gstin} onChange={(e) => setNewCompany({ ...newCompany, gstin: e.target.value.toUpperCase() })} />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input type="text" placeholder="Rajesh Sharma" className="form-control" value={newCompany.contactPerson} onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mobile Phone</label>
                  <input type="tel" placeholder="+91 98765 43210" className="form-control" value={newCompany.mobile} onChange={(e) => setNewCompany({ ...newCompany, mobile: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Billing Email</label>
                  <input type="email" placeholder="billing@acme.in" className="form-control" value={newCompany.email} onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Billing Address</label>
                <textarea rows="2" placeholder="101 Tech Park, BKC, Mumbai, MH 400051" className="form-control" value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label>Date Format</label>
                  <select className="form-control" value={newCompany.dateFormat} onChange={(e) => setNewCompany({ ...newCompany, dateFormat: e.target.value })}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select className="form-control" value={newCompany.currency} onChange={(e) => setNewCompany({ ...newCompany, currency: e.target.value, currencySymbol: e.target.value === 'INR' ? '₹' : '$' })}>
                    <option value="INR">INR (₹ Rupee)</option>
                    <option value="USD">USD ($ Dollar)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompanyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Registering...' : 'Register Company'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🎧 Edit User Details</h2>
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
            <pre style={{ background: '#1e293b', color: '#38bdf8', padding: '0.75rem', borderRadius: '50px', borderRadius: '6px', overflowX: 'auto', fontSize: '0.78rem', marginTop: '0.75rem' }}>
              {JSON.stringify(selectedAuditLog, null, 2)}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => setSelectedAuditLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
