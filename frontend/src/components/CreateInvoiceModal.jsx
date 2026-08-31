import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Sparkles } from 'lucide-react';
import Drawer from './ui/Drawer';
import { useToast } from '../context/ToastContext';

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  companies = [],
  plans = [],
  apiBase = 'http://localhost:5000/api',
  onInvoiceCreated,
}) {
  const toast = useToast();

  const [companyId, setCompanyId] = useState('');
  const [planId, setPlanId] = useState('');
  const [customBaseAmount, setCustomBaseAmount] = useState('');
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const due = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      setBillingPeriodStart(now.toISOString().split('T')[0]);
      setBillingPeriodEnd(nextMonth.toISOString().split('T')[0]);
      setDueDate(due.toISOString().split('T')[0]);

      if (companies.length > 0) setCompanyId(companies[0].id);
      if (plans.length > 0) {
        setPlanId(plans[0].id);
        setCustomBaseAmount(plans[0].price);
      }
    }
  }, [isOpen, companies, plans]);

  if (!isOpen) return null;

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedPlan = plans.find((p) => p.id === planId);

  // Live GST Tax Split Preview Calculation
  const isGujarat = selectedCompany?.gstin ? selectedCompany.gstin.trim().startsWith('24') : true;
  const basePrice = Number(customBaseAmount) || (selectedPlan?.price ? Number(selectedPlan.price) : 0);

  const cgst = isGujarat ? Number((basePrice * 0.09).toFixed(2)) : 0;
  const sgst = isGujarat ? Number((basePrice * 0.09).toFixed(2)) : 0;
  const igst = !isGujarat ? Number((basePrice * 0.18).toFixed(2)) : 0;
  const grandTotal = Number((basePrice + cgst + sgst + igst).toFixed(2));

  const handlePlanChange = (pId) => {
    setPlanId(pId);
    const plan = plans.find((p) => p.id === pId);
    if (plan) {
      setCustomBaseAmount(plan.price);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!companyId || !planId) {
      toast.warning('Please select a tenant company and plan.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          planId,
          customBaseAmount: Number(customBaseAmount),
          billingPeriodStart,
          billingPeriodEnd,
          dueDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice '${data.data.invoiceNumber}' generated successfully!`, 'Invoice Issued');
        if (onInvoiceCreated) onInvoiceCreated(data.data);
        onClose();
      } else {
        toast.error(data.message || 'Failed to generate invoice.');
      }
    } catch (err) {
      toast.error('Network error generating invoice.');
    } finally {
      setLoading(false);
    }
  };

  const footerContent = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Issue & Generate Invoice'}
      </button>
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Subscription Tax Invoice"
      subtitle="B2B Software & SaaS Platform Billing (SAC 9983)"
      icon={<FileText size={18} />}
      size="md"
      footer={footerContent}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
          <div className="form-group">
            <label>Select Tenant Company *</label>
            <select
              className="form-control"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) {c.gstin ? `[GSTIN: ${c.gstin}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subscription Tier *</label>
            <select
              className="form-control"
              value={planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.price}/{p.billingInterval.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group">
            <label>Base Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="form-control"
              value={customBaseAmount}
              onChange={(e) => setCustomBaseAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Payment Due Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group">
            <label>Period Start Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={billingPeriodStart}
              onChange={(e) => setBillingPeriodStart(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Period End Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={billingPeriodEnd}
              onChange={(e) => setBillingPeriodEnd(e.target.value)}
            />
          </div>
        </div>

        {/* LIVE GST SAC 9983 PREVIEW CARD */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '0.8rem',
            marginTop: '0.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '0.65rem',
            }}
          >
            <Calculator size={15} color="var(--primary)" /> Indian GST Tax Calculation Summary (SAC 9983)
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tax Jurisdiction:</span>
            <strong>{isGujarat ? 'Intra-State Gujarat (CGST 9% + SGST 9%)' : 'Inter-State (IGST 18%)'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Taxable Base Amount:</span>
            <span>₹{basePrice.toFixed(2)}</span>
          </div>
          {isGujarat ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>CGST (9%):</span>
                <span>+ ₹{cgst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>SGST (9%):</span>
                <span>+ ₹{sgst.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>IGST (18%):</span>
              <span>+ ₹{igst.toFixed(2)}</span>
            </div>
          )}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '0.5rem',
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '0.95rem',
            }}
          >
            <span>Total Payable Amount:</span>
            <span style={{ color: 'var(--primary)' }}>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
