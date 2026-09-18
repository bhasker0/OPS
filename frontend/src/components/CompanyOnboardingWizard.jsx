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
  ArrowRight,
  Terminal
} from 'lucide-react';
import Drawer from './ui/Drawer';
import { useToast } from '../context/ToastContext';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function CompanyOnboardingWizard({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) {
  const toast = useToast();
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

    // Step 4: Initial Super Admin & RBAC
    adminName: '',
    adminEmail: '',
    adminMobile: '',
    adminPassword: 'Password@123'
  });

  const [gstinError, setGstinError] = useState('');

  if (!isOpen) return null;

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase().trim();
    setFormData({ ...formData, gstin: val });
    if (val && !GSTIN_REGEX.test(val)) {
      setGstinError('INVALID GSTIN FORMAT (e.g. 24AAPCU1234M1ZV)');
    } else {
      setGstinError('');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.code.trim()) {
        toast.warning('Please provide both Company Name and a unique Company Code.', 'Required Fields');
        return;
      }
    }
    if (step === 2) {
      if (formData.gstin && !GSTIN_REGEX.test(formData.gstin)) {
        toast.warning('Please correct the invalid GSTIN format (e.g. 24TESTA1234A1Z1).', 'Invalid GSTIN');
        return;
      }
    }
    if (step === 3) {
      setFormData((prev) => ({
        ...prev,
        adminName: prev.adminName || prev.contactPerson || `${prev.name} Owner`,
        adminEmail: prev.adminEmail || prev.email || (prev.code ? `admin@${prev.code.toLowerCase()}.com` : ''),
        adminMobile: prev.adminMobile || prev.mobile || '9825000000',
        adminPassword: prev.adminPassword || 'Password@123',
      }));
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (formData.gstin && !GSTIN_REGEX.test(formData.gstin)) {
      toast.warning('Invalid GSTIN format provided.', 'Validation Error');
      return;
    }
    onSubmit(formData);
  };

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {step > 1 ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
        >
          <ChevronLeft size={13} /> Back
        </button>
      ) : <div />}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          style={{ fontSize: '0.78rem' }}
        >
          Cancel
        </button>

        {step < 4 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
          >
            Continue <ChevronRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={handleFormSubmit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          >
            <CheckCircle2 size={14} />
            {loading ? 'Creating...' : 'Create Tenant'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="New Tenant"
      subtitle="Configure profile, tax compliance, and administrator"
      icon={<Building size={18} color="var(--accent-red)" />}
      size="lg"
      footer={footerContent}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* STEP PROGRESS INDICATOR */}
        <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {[
              { num: 1, title: '1. Identity' },
              { num: 2, title: '2. Compliance' },
              { num: 3, title: '3. Parameters' },
              { num: 4, title: '4. Security' }
            ].map((s) => (
              <div
                key={s.num}
                style={{
                  padding: '0.5rem',
                  background: step === s.num ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${step === s.num ? 'var(--primary)' : 'var(--border)'}`,
                  textAlign: 'center',
                  cursor: step > s.num ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => { if (step > s.num) setStep(s.num); }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: step === s.num ? 'var(--primary)' : step > s.num ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {s.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0 }}>
          {/* STEP 1: IDENTITY & BASIC PROFILE */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Company Identity
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Textiles Ltd"
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
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Logo URL / CDN Asset</label>
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
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Tax & Contact Information
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                  <span>Indian GST Number (GSTIN)</span>
                  <span style={{ color: 'var(--text-muted)' }}>15 alphanumeric chars</span>
                </label>
                <input
                  type="text"
                  placeholder="24AAPCU1234M1ZV"
                  className="form-control"
                  value={formData.gstin}
                  onChange={handleGstinChange}
                  style={{ borderColor: gstinError ? 'var(--accent-red)' : undefined }}
                />
                {gstinError ? (
                  <span style={{ color: 'var(--accent-red)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    <AlertCircle size={12} /> {gstinError}
                  </span>
                ) : formData.gstin && (
                  <span style={{ color: 'var(--accent-green)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    <CheckCircle2 size={12} /> Valid GSTIN (State Code: {formData.gstin.substring(0, 2)})
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
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Localization & Currency
              </div>

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
                    <option value="NORMAL">Normal 2-Decimal</option>
                    <option value="CEIL">Round Up (Ceil)</option>
                    <option value="FLOOR">Round Down (Floor)</option>
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Configuration:</strong> Standard seed parameters will automatically attach to this organization.
              </div>
            </div>
          )}

          {/* STEP 4: INITIAL SUPER ADMIN & CONFIRMATION */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Initial Administrator
              </div>

              <div className="card" style={{ padding: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', background: 'var(--bg-surface-elevated)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Company: </span>
                  <strong>{formData.name} ({formData.code})</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>GSTIN: </span>
                  <span className="font-mono-tabular">{formData.gstin || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Currency: </span>
                  <strong>{formData.currencySymbol} {formData.currency}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Timezone: </span>
                  <span>{formData.timezone}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Default Admin Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhavesh Patel"
                    className="form-control"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Admin Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@tenant.com"
                    className="form-control"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Mobile (ETMS Login ID) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9825012345"
                    className="form-control"
                    value={formData.adminMobile}
                    onChange={(e) => setFormData({ ...formData, adminMobile: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Default Password</label>
                  <input
                    type="text"
                    placeholder="Password@123"
                    className="form-control"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  />
                </div>
              </div>

              {/* 5 COMPANY RBAC ROLES PREVIEW */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Shield size={14} color="var(--accent-blue)" /> 5 Company-Scoped RBAC Roles (Auto-Seeded):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div>1. Company Admin / Owner (Full access)</div>
                  <div>2. Manager (Production & orders)</div>
                  <div>3. Munim (Invoicing, hisab & Tally)</div>
                  <div>4. Supervisor (Machines & shifts)</div>
                  <div style={{ gridColumn: 'span 2' }}>5. Karigar Operator (Stitch telemetry)</div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </Drawer>
  );
}