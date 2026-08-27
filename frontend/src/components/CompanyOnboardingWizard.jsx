import React, { useState } from 'react';
import {
  Building,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  Users,
  Shield,
  X,
  ChevronRight,
  ChevronLeft,
  Lock,
  ArrowRight
} from 'lucide-react';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function CompanyOnboardingWizard({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Profile
    name: '',
    code: '',
    logoUrl: '',
    address: '',
    timezone: 'Asia/Kolkata',

    // Step 2: Indian Compliance & Contacts
    gstin: '',
    contactPerson: '',
    mobile: '',
    email: '',

    // Step 3: Localization & Currency
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12H',
    currency: 'INR',
    currencySymbol: '₹',
    roundOffFormat: 'NEAREST_RUPEE',
    digitsAfterDecimal: '2',

    // Step 4: Initial Super Admin
    adminName: '',
    adminEmail: ''
  });

  const [gstinError, setGstinError] = useState('');

  if (!isOpen) return null;

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase().trim();
    setFormData({ ...formData, gstin: val });
    if (val && !GSTIN_REGEX.test(val)) {
      setGstinError('Invalid GSTIN format (e.g. 27AAPCU1234M1ZV)');
    } else {
      setGstinError('');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.code.trim()) {
        alert('Please provide Company Name and Code.');
        return;
      }
    }
    if (step === 2) {
      if (formData.gstin && !GSTIN_REGEX.test(formData.gstin)) {
        alert('Please correct the invalid GSTIN format.');
        return;
      }
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (formData.gstin && !GSTIN_REGEX.test(formData.gstin)) {
      alert('Invalid GSTIN format.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '640px', width: '100%', padding: '1.5rem', borderRadius: '10px' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building size={20} style={{ color: '#4f46e5' }} />
              Provision New Tenant Company
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.15rem 0 0 0' }}>
              Multi-step onboarding wizard with compliance and parameter inheritance.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.2rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { num: 1, title: 'Identity' },
            { num: 2, title: 'Compliance' },
            { num: 3, title: 'Parameters' },
            { num: 4, title: 'Admin & Review' }
          ].map((s) => (
            <div
              key={s.num}
              style={{
                padding: '0.5rem 0.4rem',
                borderRadius: '6px',
                background: step === s.num ? '#eef2ff' : step > s.num ? '#ecfdf5' : '#f8fafc',
                border: `1px solid ${step === s.num ? '#c7d2fe' : step > s.num ? '#a7f3d0' : '#e2e8f0'}`,
                textAlign: 'center',
                cursor: step > s.num ? 'pointer' : 'default'
              }}
              onClick={() => { if (step > s.num) setStep(s.num); }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: step === s.num ? '#4f46e5' : step > s.num ? '#059669' : '#64748b' }}>
                STEP {s.num}
              </div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: step === s.num ? '#1e1b4b' : '#334155' }}>
                {s.title}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleFormSubmit}>
          {/* STEP 1: IDENTITY & BASIC PROFILE */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Textiles Ltd."
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Tenant Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACMETEX"
                    className="form-control"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Logo Image URL</label>
                <input
                  type="url"
                  placeholder="https://cdn.example.com/logo.png"
                  className="form-control"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Registered Billing Address</label>
                <textarea
                  rows="2"
                  placeholder="101 Ring Road Textile Hub, Surat, Gujarat 395002"
                  className="form-control"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Operating Timezone</label>
                <select
                  className="form-control"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (+0:00)</option>
                  <option value="America/New_York">America/New_York (EST -5:00)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: INDIAN COMPLIANCE & CONTACTS */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Indian GST Number (GSTIN)</span>
                  <span style={{ color: '#64748b', fontWeight: 400 }}>15 alphanumeric characters</span>
                </label>
                <input
                  type="text"
                  placeholder="24AAPCU1234M1ZV"
                  className="form-control"
                  value={formData.gstin}
                  onChange={handleGstinChange}
                  style={{ borderColor: gstinError ? '#ef4444' : undefined }}
                />
                {gstinError ? (
                  <span style={{ color: '#ef4444', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    <AlertCircle size={12} /> {gstinError}
                  </span>
                ) : formData.gstin && (
                  <span style={{ color: '#059669', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    <CheckCircle2 size={12} /> Valid GSTIN Format (State Code: {formData.gstin.substring(0, 2)})
                  </span>
                )}
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Primary Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Nair"
                  className="form-control"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="form-control"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Billing Email</label>
                  <input
                    type="email"
                    placeholder="billing@acme.in"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIAL PARAMETERS & LOCALIZATION */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Base Currency</label>
                  <select
                    className="form-control"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value, currencySymbol: e.target.value === 'INR' ? '₹' : '$' })}
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Date Format</label>
                  <select
                    className="form-control"
                    value={formData.dateFormat}
                    onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Digits After Decimal</label>
                  <select
                    className="form-control"
                    value={formData.digitsAfterDecimal}
                    onChange={(e) => setFormData({ ...formData, digitsAfterDecimal: e.target.value })}
                  >
                    <option value="2">2 Decimal Places (0.00)</option>
                    <option value="4">4 Decimal Places (0.0000)</option>
                    <option value="0">0 Decimal Places (No cents/paise)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Round-Off Format</label>
                  <select
                    className="form-control"
                    value={formData.roundOffFormat}
                    onChange={(e) => setFormData({ ...formData, roundOffFormat: e.target.value })}
                  >
                    <option value="NEAREST_RUPEE">Nearest Rupee</option>
                    <option value="NORMAL">Normal 2-Decimal Rounding</option>
                    <option value="CEIL">Round Up (Ceil)</option>
                    <option value="FLOOR">Round Down (Floor)</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569' }}>
                💡 <strong>Parameter Inheritance:</strong> Tenant automatically inherits global seed configurations (e.g. GST E-Invoicing features and Audit deltas).
              </div>
            </div>
          )}

          {/* STEP 4: INITIAL SUPER ADMIN & CONFIRMATION */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#eef2ff', padding: '0.85rem', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e1b4b', marginBottom: '0.5rem' }}>
                  📋 Onboarding Summary Preview
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem' }}>
                  <div>Company: <strong>{formData.name}</strong> (<code>{formData.code}</code>)</div>
                  <div>GSTIN: <code>{formData.gstin || 'N/A'}</code></div>
                  <div>Contact: <strong>{formData.contactPerson || 'N/A'}</strong></div>
                  <div>Currency: <strong>{formData.currencySymbol} {formData.currency}</strong></div>
                  <div>Date Format: <strong>{formData.dateFormat}</strong></div>
                  <div>Timezone: <strong>{formData.timezone}</strong></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Initial Admin Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Admin Manager"
                    className="form-control"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Initial Admin Email</label>
                  <input
                    type="email"
                    placeholder="admin@tenant.com"
                    className="form-control"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#059669' }}>
                <Shield size={14} />
                <span>Default Super Admin system role will be automatically attached to tenant.</span>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={15} /> Back
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                >
                  Next Step <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  <CheckCircle2 size={15} />
                  {loading ? 'Provisioning...' : 'Complete Onboarding'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}