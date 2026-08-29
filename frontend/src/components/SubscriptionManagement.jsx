import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  Users,
  Cpu,
  FileText,
  Calendar,
  Layers,
  ArrowUpRight,
  Edit2,
  Trash2,
  Check,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Clock,
  Printer,
  FileSpreadsheet,
  Download,
  X
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoicePdfViewerModal from './InvoicePdfViewerModal';
import TableActionMenu from './TableActionMenu';
import TableDensityControl from './TableDensityControl';
import KpiStrip from './KpiStrip';
import { useToast } from '../context/ToastContext';

const AVAILABLE_FEATURES = [
  { code: 'BASIC_BILLING', label: 'Basic Invoicing & Billing' },
  { code: 'KARIGAR_HISAB', label: 'Karigar Piece-Rate Ledger' },
  { code: 'CHALLAN_GEN', label: 'Job-Work Multi-Challan Generator' },
  { code: 'TALLY_EXPORT', label: 'Tally Prime XML Export' },
  { code: 'DEAD_STOCK_MATCHING', label: 'Dead Stock & Fabric Reconciliation' },
  { code: 'MUNIM_PORTAL', label: 'Munim Dual-Handshake Portal' },
  { code: 'MULTI_FACTORY', label: 'Multi-Unit Factory Coordination' },
  { code: 'PRIORITY_SLA', label: 'Dedicated Support & 99.9% SLA' },
  { code: 'CUSTOM_WEBHOOKS', label: 'Custom Webhooks & Outbound Sync' },
];

export default function SubscriptionManagement({
  apiBase = 'http://localhost:5000/api',
  onRefresh,
}) {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'allocations' | 'invoices'

  // Invoices & Billing state (SCRUM-89, 91)
  const [invoices, setInvoices] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState(null);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [invoiceCompanyFilter, setInvoiceCompanyFilter] = useState('ALL');
  const [confirmDeleteInvoice, setConfirmDeleteInvoice] = useState(null);
  const [invoiceActionLoading, setInvoiceActionLoading] = useState(false);
  const [tableDensity, setTableDensity] = useState(() => localStorage.getItem('ops_inv_density') || 'compact');

  const handleDensityChange = (d) => {
    setTableDensity(d);
    localStorage.setItem('ops_inv_density', d);
  };

  // Modals state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedCompanyForPlan, setSelectedCompanyForPlan] = useState(null);
  const [allocateData, setAllocateData] = useState({
    subscriptionPlanId: '',
    planStatus: 'ACTIVE',
    planExpiryDate: '',
  });
  const [savingAllocation, setSavingAllocation] = useState(false);

  // Form state for creating/editing plan
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    description: '',
    price: 0,
    currency: 'INR',
    billingInterval: 'MONTHLY',
    maxMachines: 2,
    maxUsers: 5,
    maxInvoicesPerMonth: 100,
    features: ['BASIC_BILLING', 'KARIGAR_HISAB'],
    isDefault: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, compsRes] = await Promise.all([
        fetch(`${apiBase}/subscription-plans`),
        fetch(`${apiBase}/companies`),
      ]);
      const plansJson = await plansRes.json();
      const compsJson = await compsRes.json();

      if (plansJson.success) setPlans(plansJson.data);
      if (compsJson.success) setCompanies(compsJson.data);
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      toast.error('Failed to load subscription tiers and allocations.', 'Data Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch(`${apiBase}/invoices`),
        fetch(`${apiBase}/invoices/stats`),
      ]);
      const invJson = await invRes.json();
      const statsJson = await statsRes.json();
      if (invJson.success) setInvoices(invJson.data);
      if (statsJson.success) setInvoiceStats(statsJson.data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInvoices();
  }, []);

  const handleMarkInvoicePaid = async (invoice) => {
    setInvoiceActionLoading(true);
    try {
      const res = await fetch(`${apiBase}/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paymentMethod: 'MANUAL_SUPERADMIN' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice '${invoice.invoiceNumber}' marked as PAID. Subscription extended!`, 'Payment Recorded');
        fetchInvoices();
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to update invoice.');
      }
    } catch (err) {
      toast.error('Network error updating invoice.');
    } finally {
      setInvoiceActionLoading(false);
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!confirmDeleteInvoice) return;
    setInvoiceActionLoading(true);
    try {
      const res = await fetch(`${apiBase}/invoices/${confirmDeleteInvoice.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.info(`Invoice '${confirmDeleteInvoice.invoiceNumber}' deleted.`, 'Invoice Removed');
        fetchInvoices();
      } else {
        toast.error(data.message || 'Failed to delete invoice.');
      }
    } catch (err) {
      toast.error('Network error deleting invoice.');
    } finally {
      setInvoiceActionLoading(false);
      setConfirmDeleteInvoice(null);
    }
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      code: '',
      description: '',
      price: 0,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 2,
      maxUsers: 5,
      maxInvoicesPerMonth: 100,
      features: ['BASIC_BILLING', 'KARIGAR_HISAB'],
      isDefault: false,
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency || 'INR',
      billingInterval: plan.billingInterval || 'MONTHLY',
      maxMachines: plan.maxMachines,
      maxUsers: plan.maxUsers,
      maxInvoicesPerMonth: plan.maxInvoicesPerMonth,
      features: Array.isArray(plan.features) ? plan.features : [],
      isDefault: plan.isDefault || false,
    });
    setShowPlanModal(true);
  };

  const handleFeatureToggle = (featCode) => {
    setPlanForm((prev) => {
      const feats = [...prev.features];
      const idx = feats.indexOf(featCode);
      if (idx > -1) {
        feats.splice(idx, 1);
      } else {
        feats.push(featCode);
      }
      return { ...prev, features: feats };
    });
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.name.trim() || (!editingPlan && !planForm.code.trim())) {
      toast.warning('Plan Name and Plan Code are required.', 'Validation Warning');
      return;
    }

    try {
      const url = editingPlan
        ? `${apiBase}/subscription-plans/${editingPlan.id}`
        : `${apiBase}/subscription-plans`;
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Plan '${planForm.name}' saved successfully.`, 'Plan Saved');
        setShowPlanModal(false);
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to save subscription plan', 'Error');
      }
    } catch (err) {
      toast.error('Error connecting to backend API', 'Network Error');
    }
  };

  const handleDeletePlanPrompt = (plan) => {
    if (plan.isDefault) {
      toast.error('Cannot delete the system default tier.', 'Action Blocked');
      return;
    }
    if (plan.activeTenantsCount > 0) {
      toast.warning(
        `Cannot delete plan '${plan.name}' with ${plan.activeTenantsCount} active tenant(s). Reassign tenants first.`,
        'Plan In Use'
      );
      return;
    }
    setConfirmDeletePlan(plan);
  };

  const handleConfirmDeletePlan = async () => {
    if (!confirmDeletePlan) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${apiBase}/subscription-plans/${confirmDeletePlan.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Plan '${confirmDeletePlan.name}' deleted successfully.`, 'Plan Deleted');
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to delete plan', 'Delete Error');
      }
    } catch (err) {
      toast.error('Error deleting plan from backend.', 'Error');
    } finally {
      setDeleteLoading(false);
      setConfirmDeletePlan(null);
    }
  };

  const handleOpenAllocateModal = (company) => {
    setSelectedCompanyForPlan(company);
    setAllocateData({
      subscriptionPlanId: company.subscriptionPlanId || (plans[0]?.id || ''),
      planStatus: company.planStatus || 'ACTIVE',
      planExpiryDate: company.planExpiryDate
        ? new Date(company.planExpiryDate).toISOString().split('T')[0]
        : '',
    });
    setShowAllocateModal(true);
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForPlan) return;
    setSavingAllocation(true);
    try {
      const res = await fetch(`${apiBase}/companies/${selectedCompanyForPlan.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocateData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Subscription allocated to '${selectedCompanyForPlan.name}' successfully.`,
          'Plan Allocated'
        );
        setShowAllocateModal(false);
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to update subscription', 'Allocation Error');
      }
    } catch (err) {
      toast.error('Error updating tenant subscription', 'Error');
    } finally {
      setSavingAllocation(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.subscriptionPlan && c.subscriptionPlan.name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CreditCard size={22} style={{ color: '#4f46e5' }} />
            Subscription Tiers & Multi-Tenant Quotas
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
            Manage pricing tiers, machine & user quotas, feature flags, and tenant billing allocations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => { fetchData(); fetchInvoices(); }}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RefreshCw size={13} className={loading || invoicesLoading ? 'spin' : ''} /> Refresh
          </button>
          {activeTab === 'invoices' ? (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateInvoiceModal(true)}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Plus size={14} /> Issue Invoice (SAC 9983)
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleOpenCreatePlan}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Plus size={14} /> Create Tier
            </button>
          )}
        </div>
      </div>

      {/* VIEW SELECTOR TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
        <button
          className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('plans')}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
        >
          <Layers size={13} /> Pricing Tiers & Quota Schemes ({plans.length})
        </button>
        <button
          className={`btn ${activeTab === 'allocations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('allocations')}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
        >
          <Building size={13} /> Tenant Plan Allocations ({companies.length})
        </button>
        <button
          className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('invoices'); fetchInvoices(); }}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
        >
          <FileSpreadsheet size={13} /> Invoices & GST Billing ({invoices.length})
        </button>
      </div>

      {/* TAB 1: PRICING TIERS GRID */}
      {activeTab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {plans.map((plan) => {
            const isStarter = plan.code === 'STARTER';
            const isEnterprise = plan.code === 'ENTERPRISE';

            return (
              <div
                key={plan.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: isEnterprise ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isEnterprise ? '0 10px 25px -5px rgba(99, 102, 241, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
              >
                {plan.isDefault && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#ecfdf5', color: '#059669', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                    DEFAULT TIER
                  </span>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{plan.name}</h3>
                  </div>
                  <code style={{ fontSize: '0.7rem', color: '#6366f1', background: '#eef2ff', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                    {plan.code}
                  </code>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.5rem 0 1rem 0', minHeight: '34px' }}>
                    {plan.description || 'Standard multi-tenant subscription plan.'}
                  </p>

                  {/* PRICE DISPLAY */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', margin: '0.75rem 0 1.25rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                      {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}`}
                    </span>
                    {plan.price > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ {plan.billingInterval.toLowerCase()}</span>
                    )}
                  </div>

                  {/* QUOTA SPECIFICATIONS */}
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Cpu size={13} color="#4f46e5" /> Embroidery Machines:
                      </span>
                      <strong style={{ color: '#0f172a' }}>Up to {plan.maxMachines} units</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={13} color="#4f46e5" /> Operator & Munim Users:
                      </span>
                      <strong style={{ color: '#0f172a' }}>Up to {plan.maxUsers} seats</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FileText size={13} color="#4f46e5" /> Invoices / Month:
                      </span>
                      <strong style={{ color: '#0f172a' }}>{plan.maxInvoicesPerMonth.toLocaleString()} bills</strong>
                    </div>
                  </div>

                  {/* INCLUDED FEATURES */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Included Capabilities
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {AVAILABLE_FEATURES.map((feat) => {
                        const isIncluded = Array.isArray(plan.features) && plan.features.includes(feat.code);
                        return (
                          <div
                            key={feat.code}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.74rem',
                              color: isIncluded ? '#1e293b' : '#cbd5e1',
                            }}
                          >
                            <Check size={13} color={isIncluded ? '#10b981' : '#e2e8f0'} />
                            <span>{feat.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    🏢 <strong>{plan.activeTenantsCount}</strong> active tenant(s)
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => handleOpenEditPlan(plan)}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    {!plan.isDefault && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => handleDeletePlanPrompt(plan)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TENANT PLAN ALLOCATIONS TABLE */}
      {activeTab === 'allocations' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search tenant or plan..."
                className="form-control"
                style={{ paddingLeft: '2rem', fontSize: '0.78rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Showing <strong>{filteredCompanies.length}</strong> tenant organizations
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Tenant Company</th>
                  <th>Current Tier</th>
                  <th>Status & Renewal</th>
                  <th>User Seat Utilization</th>
                  <th>Machine Quota</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => {
                  const plan = c.subscriptionPlan || plans.find((p) => p.isDefault) || { name: 'Starter Plan', maxUsers: 5, maxMachines: 2 };
                  const userCount = c._count?.users || 0;
                  const userPercent = Math.min(100, Math.round((userCount / (plan.maxUsers || 1)) * 100));

                  const isExpired = c.planStatus === 'EXPIRED';
                  const isTrial = c.planStatus === 'TRIAL';

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Code: {c.code} • GSTIN: {c.gstin || 'N/A'}</div>
                      </td>

                      <td>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
                          {plan.name}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span
                            style={{
                              background: isExpired ? '#fef2f2' : isTrial ? '#fefce8' : '#ecfdf5',
                              color: isExpired ? '#dc2626' : isTrial ? '#ca8a04' : '#059669',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              border: `1px solid ${isExpired ? '#fecaca' : isTrial ? '#fef08a' : '#a7f3d0'}`,
                            }}
                          >
                            {c.planStatus || 'ACTIVE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {c.planExpiryDate
                            ? `Expires: ${new Date(c.planExpiryDate).toLocaleDateString('en-GB')}`
                            : 'Continuous / Annual'}
                        </div>
                      </td>

                      <td style={{ minWidth: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569', marginBottom: '0.15rem' }}>
                          <span>{userCount} / {plan.maxUsers} Users</span>
                          <span><strong>{userPercent}%</strong></span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${userPercent}%`,
                              height: '100%',
                              background: userPercent >= 100 ? '#ef4444' : userPercent >= 80 ? '#f59e0b' : '#10b981',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#334155' }}>
                          1 / {plan.maxMachines} Machine(s)
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => handleOpenAllocateModal(c)}
                        >
                          <ArrowUpRight size={12} /> Upgrade / Change
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICES & BILLING LEDGER (SAC 9983) */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* COMPACT KPI STRIP (SCRUM-96) */}
          <KpiStrip
            items={[
              {
                label: 'Total Invoiced Volume',
                value: `₹${(invoiceStats?.totalBilled || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                subtext: `${invoiceStats?.totalInvoices || invoices.length} Issued Tax Invoices`,
                icon: <FileText size={20} />,
                accentColor: 'var(--primary)',
                sparklinePath: 'M0 16 Q 12 6, 24 12 T 48 2'
              },
              {
                label: 'Total Collected Revenue',
                value: `₹${(invoiceStats?.totalCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                subtext: `${invoiceStats?.counts?.paid || 0} Invoices Fully Settled`,
                icon: <CheckCircle2 size={20} />,
                accentColor: 'var(--success)',
                sparklinePath: 'M0 18 Q 12 10, 24 6 T 48 2'
              },
              {
                label: 'Pending & Outstanding',
                value: `₹${(invoiceStats?.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                subtext: `${invoiceStats?.counts?.pending || 0} Pending (${invoiceStats?.counts?.overdue || 0} Overdue)`,
                icon: <Clock size={20} />,
                accentColor: 'var(--warning)',
                sparklinePath: 'M0 8 Q 12 14, 24 10 T 48 6'
              },
              {
                label: 'GST Tax Pool (SAC 9983)',
                value: `₹${(invoiceStats?.totalTaxCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                subtext: `CGST: ₹${invoiceStats?.taxBreakdown?.cgst || 0} | SGST: ₹${invoiceStats?.taxBreakdown?.sgst || 0}`,
                icon: <Layers size={20} />,
                accentColor: '#7c3aed',
                sparklinePath: 'M0 12 Q 12 6, 24 10 T 48 4'
              }
            ]}
          />

          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by invoice #, company name, code..."
                  className="form-control"
                  style={{ paddingLeft: '2.1rem', fontSize: '0.8rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-control"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', maxWidth: '160px' }}
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses ({invoices.length})</option>
                <option value="PENDING">Pending Only</option>
                <option value="PAID">Paid Only</option>
                <option value="VOID">Void Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TableDensityControl density={tableDensity} onDensityChange={handleDensityChange} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing Invoices ({invoices.length})
              </span>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="card table-container" style={{ padding: 0 }}>
            <table className={`table-${tableDensity}`}>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Tenant Company</th>
                  <th>Plan Tier</th>
                  <th>Base Price</th>
                  <th>GST Tax Split (SAC 9983)</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter((inv) => {
                    if (invoiceStatusFilter !== 'ALL' && inv.status !== invoiceStatusFilter) return false;
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      inv.invoiceNumber?.toLowerCase().includes(q) ||
                      inv.company?.name?.toLowerCase().includes(q) ||
                      inv.company?.code?.toLowerCase().includes(q)
                    );
                  })
                  .map((inv) => {
                    const isPaid = inv.status === 'PAID';
                    const isIntra = (inv.company?.gstin || '').startsWith('24');

                    const invoiceActions = [
                      {
                        label: 'View & Print A4 PDF',
                        icon: <Printer size={13} />,
                        onClick: () => setSelectedInvoiceForPdf(inv)
                      },
                      {
                        label: 'Mark as Fully Paid',
                        icon: <Check size={13} color="var(--success)" />,
                        hidden: isPaid,
                        onClick: () => handleMarkInvoicePaid(inv)
                      },
                      {
                        label: 'Delete Invoice',
                        icon: <Trash2 size={13} />,
                        hidden: isPaid,
                        danger: true,
                        onClick: () => setConfirmDeleteInvoice(inv)
                      }
                    ];

                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.82rem' }}>
                            {inv.invoiceNumber}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Issued: {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{inv.company?.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Code: <code className="mono">{inv.company?.code}</code> {inv.company?.gstin ? `• GSTIN: ${inv.company.gstin}` : ''}
                          </div>
                        </td>

                        <td>
                          <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                            {inv.plan?.name || 'SaaS Plan'}
                          </span>
                        </td>

                        <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          ₹{inv.baseAmount?.toFixed(2)}
                        </td>

                        <td>
                          {isIntra ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              <div>CGST (9%): ₹{inv.cgstAmount?.toFixed(2)}</div>
                              <div>SGST (9%): ₹{inv.sgstAmount?.toFixed(2)}</div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              <div>IGST (18%): ₹{inv.igstAmount?.toFixed(2)}</div>
                            </div>
                          )}
                        </td>

                        <td style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                          ₹{inv.totalAmount?.toFixed(2)}
                        </td>

                        <td>
                          <span
                            style={{
                              background: isPaid ? 'var(--success-light)' : 'var(--warning-light)',
                              color: isPaid ? 'var(--success)' : 'var(--warning)',
                              border: `1px solid ${isPaid ? 'var(--success)' : 'var(--warning)'}`,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isPaid ? 'var(--success)' : 'var(--warning)' }} />
                            {inv.status}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => setSelectedInvoiceForPdf(inv)}
                              title="View & Print A4 Tax Invoice PDF"
                            >
                              <Printer size={11} /> PDF
                            </button>
                            <TableActionMenu actions={invoiceActions} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SUBSCRIPTION PLAN */}
      {showPlanModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Provision New Subscription Tier'}
              </h2>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setShowPlanModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePlanSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Growth Factory Tier"
                    className="form-control"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Plan Code (Immutable) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    placeholder="e.g. GROWTH_2026"
                    className="form-control"
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Description</label>
                <input
                  type="text"
                  placeholder="Target audience, manufacturing scale, and SLA..."
                  className="form-control"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Billing Interval</label>
                  <select
                    className="form-control"
                    value={planForm.billingInterval}
                    onChange={(e) => setPlanForm({ ...planForm, billingInterval: e.target.value })}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Default Plan</label>
                  <select
                    className="form-control"
                    value={planForm.isDefault ? 'true' : 'false'}
                    onChange={(e) => setPlanForm({ ...planForm, isDefault: e.target.value === 'true' })}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes (Default for new tenants)</option>
                  </select>
                </div>
              </div>

              {/* QUOTA LIMITS */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '0.75rem 0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                  Operational Quota Limits
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Max Machines</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={planForm.maxMachines}
                      onChange={(e) => setPlanForm({ ...planForm, maxMachines: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Max User Seats</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={planForm.maxUsers}
                      onChange={(e) => setPlanForm({ ...planForm, maxUsers: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Max Invoices/Mo</label>
                    <input
                      type="number"
                      min="10"
                      className="form-control"
                      value={planForm.maxInvoicesPerMonth}
                      onChange={(e) => setPlanForm({ ...planForm, maxInvoicesPerMonth: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                </div>
              </div>

              {/* FEATURE TOGGLES */}
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Included Feature Capabilities</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.3rem' }}>
                  {AVAILABLE_FEATURES.map((feat) => {
                    const checked = planForm.features.includes(feat.code);
                    return (
                      <label
                        key={feat.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '4px',
                          border: `1px solid ${checked ? '#c7d2fe' : '#e2e8f0'}`,
                          background: checked ? '#eef2ff' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleFeatureToggle(feat.code)}
                        />
                        <span style={{ fontWeight: checked ? 600 : 400, color: checked ? '#3730a3' : '#1e293b' }}>
                          {feat.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALLOCATE / UPGRADE PLAN FOR TENANT */}
      {showAllocateModal && selectedCompanyForPlan && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Allocate Plan: {selectedCompanyForPlan.name}
              </h2>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setShowAllocateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAllocateSubmit}>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Select Target Subscription Tier *</label>
                <select
                  className="form-control"
                  required
                  value={allocateData.subscriptionPlanId}
                  onChange={(e) => setAllocateData({ ...allocateData, subscriptionPlanId: e.target.value })}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price === 0 ? 'Free' : `₹${p.price.toLocaleString('en-IN')}`}) • Max {p.maxUsers} Users
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Subscription Status</label>
                  <select
                    className="form-control"
                    value={allocateData.planStatus}
                    onChange={(e) => setAllocateData({ ...allocateData, planStatus: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="GRACE_PERIOD">GRACE_PERIOD</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Expiry / Renewal Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={allocateData.planExpiryDate}
                    onChange={(e) => setAllocateData({ ...allocateData, planExpiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingAllocation}>
                  {savingAllocation ? 'Saving...' : 'Apply Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL: DELETE PLAN */}
      <ConfirmModal
        isOpen={!!confirmDeletePlan}
        title={`Delete Subscription Tier: ${confirmDeletePlan?.name || 'Plan'}`}
        message={`Are you sure you want to delete tier '${confirmDeletePlan?.name}' (${confirmDeletePlan?.code})? This cannot be undone.`}
        confirmText="Delete Tier"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDeletePlan}
        onCancel={() => setConfirmDeletePlan(null)}
      />

      {/* CONFIRMATION DIALOG MODAL: DELETE INVOICE */}
      <ConfirmModal
        isOpen={!!confirmDeleteInvoice}
        title={`Delete Unpaid Invoice: ${confirmDeleteInvoice?.invoiceNumber || 'Invoice'}`}
        message={`Are you sure you want to delete unpaid invoice '${confirmDeleteInvoice?.invoiceNumber}' for ${confirmDeleteInvoice?.company?.name}?`}
        confirmText="Delete Invoice"
        cancelText="Cancel"
        variant="danger"
        loading={invoiceActionLoading}
        onConfirm={handleConfirmDeleteInvoice}
        onCancel={() => setConfirmDeleteInvoice(null)}
      />

      {/* CREATE TAX INVOICE MODAL (SCRUM-89) */}
      <CreateInvoiceModal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        companies={companies}
        plans={plans}
        apiBase={apiBase}
        onInvoiceCreated={() => {
          fetchInvoices();
          fetchData();
        }}
      />

      {/* A4 PRINTABLE TAX INVOICE PDF VIEWER MODAL (SCRUM-91) */}
      <InvoicePdfViewerModal
        isOpen={Boolean(selectedInvoiceForPdf)}
        onClose={() => setSelectedInvoiceForPdf(null)}
        invoice={selectedInvoiceForPdf}
      />
    </div>
  );
}
