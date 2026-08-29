import React, { useState, useEffect } from 'react';
import { FileText, Calculator, X, CheckCircle2 } from 'lucide-react';
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
    e.preventDefault();
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

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={18} color="var(--primary)" /> Issue Subscription Tax Invoice (SAC 9983)
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Select Tenant Company</label>
              <select className="form-control" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {c.gstin ? `[GSTIN: ${c.gstin}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Subscription Tier</label>
              <select className="form-control" value={planId} onChange={(e) => handlePlanChange(e.target.value)} required>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price}/{p.billingInterval.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Base Price (₹)</label>
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
              <label>Period Start Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Period End Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payment Due Date</label>
            <input
              type="date"
              required
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* LIVE GST SAC 9983 PREVIEW CARD */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              <Calculator size={14} color="#4f46e5" /> Indian GST Tax Calculation Summary (SAC 9983)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#64748b' }}>Tax Jurisdiction:</span>
              <strong>{isGujarat ? 'Intra-State Gujarat (CGST 9% + SGST 9%)' : 'Inter-State (IGST 18%)'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#64748b' }}>Taxable Base Amount:</span>
              <span>₹{basePrice.toFixed(2)}</span>
            </div>
            {isGujarat ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>CGST (9%):</span>
                  <span>+ ₹{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>SGST (9%):</span>
                  <span>+ ₹{sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#64748b' }}>IGST (18%):</span>
                <span>+ ₹{igst.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem' }}>
              <span>Total Payable Amount:</span>
              <span style={{ color: '#4f46e5' }}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Issue & Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
