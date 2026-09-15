import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Settings,
  Search,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  Lock,
  Layers,
  Save,
  Globe,
  ChevronDown,
  ChevronRight,
  Scissors,
  DollarSign,
  Activity,
  Plus,
  HelpCircle,
  FolderPlus,
  Filter,
  Copy,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Undo2,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';

const PARAMETER_CATEGORIES = [
  {
    id: 'textile_production',
    title: 'Textile & Production Rules',
    description: 'SAC rates, stitching tolerances, decimals, machine caps & terms',
    icon: <Scissors size={15} />,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    keys: [
      'sac_code',
      'default_rate_per_1000',
      'shrinkage_tolerance_percent',
      'max_machines_allowed',
      'round_off_format',
      'digits_after_decimal',
      'default_heads',
      'gst_rate_percent',
      'terms_and_conditions'
    ]
  },
  {
    id: 'karigar_accounting',
    title: 'Karigar & Job-Work Accounting',
    description: 'Wage deduction, TDS, advance limits, and challan prefixes',
    icon: <DollarSign size={15} />,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    keys: [
      'karigar_tds_deduction_percent',
      'jobwork_challan_prefix',
      'max_karigar_advance_limit',
      'dead_stock_threshold_meters'
    ]
  },
  {
    id: 'integration_governance',
    title: 'Integration & Sync Governance',
    description: 'Outbound sync webhooks, Tally exports, retry thresholds & timezone',
    icon: <Activity size={15} />,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    keys: [
      'outbound_sync_enabled',
      'sync_retry_max_attempts',
      'auto_archive_days',
      'audit_retention_days',
      'rate_limit_per_minute',
      'tally_export_version',
      'time_format',
      'timezone'
    ]
  },
  {
    id: 'security_geofence',
    title: 'Security & Geofence Perimeter',
    description: 'Subnet restrictions, factory GPS coordinates, and geofence radius',
    icon: <Lock size={15} />,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    keys: [
      'allowed_ip_subnets',
      'factory_gps_latitude',
      'factory_gps_longitude',
      'geofence_radius_meters',
      'enforce_geofence_for_shifts'
    ]
  },
  {
    id: 'etms_features',
    title: 'ETMS Feature Flags & AI Suite',
    description: 'Broadcasting, KYC OCR, Command Palette, Audit Trails, and Voice Data Entry',
    icon: <Sparkles size={15} />,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.08)',
    keys: [
      'feature_broadcasting_alerts',
      'feature_kyc_onboarding',
      'feature_command_palette',
      'feature_audit_log_viewer',
      'feature_speech_data_entry',
      'feature_dark_mode',
      'feature_audit_logs',
      'feature_tally_export',
      'feature_munim_portal'
    ]
  }
];

export default function CompanyParameterDrawer({
  isOpen,
  onClose,
  company,
  apiBase = 'http://localhost:5000/api',
  onParameterUpdated
}) {
  const toast = useToast();
  const [parameters, setParameters] = useState([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'OVERRIDES' | 'FLAGS'
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [confirmResetKey, setConfirmResetKey] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Add Seed Parameter Modal State
  const [showAddSeedModal, setShowAddSeedModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('BOOLEAN');
  const [newValue, setNewValue] = useState('false');
  const [newDesc, setNewDesc] = useState('');
  const [creatingSeedParam, setCreatingSeedParam] = useState(false);

  // Accordion Expand/Collapse State
  const [openAccordions, setOpenAccordions] = useState({
    textile_production: true,
    karigar_accounting: true,
    integration_governance: true,
    security_geofence: true,
    etms_features: true,
    other_parameters: true
  });

  const isSeedCompany = useMemo(() => {
    return (
      company?.isSeed ||
      company?.code === '000' ||
      company?.code === 'SEED000000' ||
      company?.id === '00000000-0000-0000-0000-000000000000'
    );
  }, [company]);

  useEffect(() => {
    if (isOpen && company?.id) {
      fetchParameters();
    }
  }, [isOpen, company?.id]);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/companies/${company.id}/parameters`);
      const data = await res.json();
      if (data.success) {
        setParameters(data.data);
        const map = {};
        data.data.forEach((p) => {
          map[p.key] = p.value;
        });
        setEditingValues(map);
      }
    } catch (err) {
      console.error('Failed to fetch parameters:', err);
      toast.error('Failed to load parameters from backend.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (catId) => {
    setOpenAccordions((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleAllAccordions = (openState) => {
    setOpenAccordions({
      textile_production: openState,
      karigar_accounting: openState,
      integration_governance: openState,
      security_geofence: openState,
      etms_features: openState,
      other_parameters: openState
    });
  };

  const handleSaveParam = async (key, value) => {
    setSavingKey(key);
    try {
      const res = await fetch(`${apiBase}/companies/${company.id}/parameters/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: String(value) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Parameter '${key}' set to '${value}'. Logged to Audit Trail.`, 'Setting Updated');
        fetchParameters();
        if (onParameterUpdated) onParameterUpdated(key, value);
      } else {
        toast.error(data.message || 'Failed to update parameter', 'Parameter Error');
      }
    } catch (err) {
      toast.error('Error saving parameter to backend.', 'Save Error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleConfirmReset = async () => {
    if (!confirmResetKey) return;
    const key = confirmResetKey;
    setResetLoading(true);

    try {
      const res = await fetch(`${apiBase}/companies/${company.id}/parameters/${key}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.info(`Override '${key}' removed. Restored Master Seed default value.`, 'Parameter Restored');
        fetchParameters();
        if (onParameterUpdated) onParameterUpdated(key, null);
      } else {
        toast.error(data.message || 'Failed to reset parameter', 'Reset Error');
      }
    } catch (err) {
      console.error('Failed to delete override:', err);
      toast.error('Error resetting parameter.', 'Reset Error');
    } finally {
      setResetLoading(false);
      setConfirmResetKey(null);
    }
  };

  const handleCreateSeedParam = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) {
      toast.error('Parameter key name is required.', 'Validation Error');
      return;
    }

    setCreatingSeedParam(true);
    try {
      const res = await fetch(`${apiBase}/seed/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey.trim(),
          value: String(newValue),
          description: newDesc.trim() || 'Master seed parameter rule'
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Master Seed Rule '${newKey.trim()}' created with default value '${newValue}'. Propagated to all tenants.`,
          'Seed Parameter Created'
        );
        setShowAddSeedModal(false);
        setNewKey('');
        setNewType('BOOLEAN');
        setNewValue('false');
        setNewDesc('');
        fetchParameters();
      } else {
        toast.error(data.message || 'Failed to create seed parameter', 'Creation Error');
      }
    } catch (err) {
      console.error('Error creating seed parameter:', err);
      toast.error('Network or server error while creating seed parameter.', 'Creation Error');
    } finally {
      setCreatingSeedParam(false);
    }
  };

  const handleCopyKey = (keyName) => {
    navigator.clipboard.writeText(keyName);
    toast.success(`Copied '${keyName}' to clipboard.`, 'Key Copied');
  };

  // Metrics summary
  const totalCount = parameters.length;
  const overrideCount = parameters.filter((p) => !isSeedCompany && (p.isOverridden || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000' && !p.isInherited))).length;
  const flagCount = parameters.filter((p) => p.key.startsWith('feature_') || p.value === 'true' || p.value === 'false').length;

  const categorizedKeySet = new Set(PARAMETER_CATEGORIES.flatMap((c) => c.keys));
  const uncategorizedParams = parameters.filter((p) => !categorizedKeySet.has(p.key));

  if (!isOpen || !company) return null;

  const renderParameterInput = (p) => {
    const isDirty = editingValues[p.key] !== undefined && String(editingValues[p.key]) !== String(p.value);

    // Toggle switch for Boolean / feature flags
    if (p.dataType === 'BOOLEAN' || p.key.startsWith('feature_') || p.value === 'true' || p.value === 'false') {
      const isChecked = (editingValues[p.key] ?? p.value) === 'true' || (editingValues[p.key] ?? p.value) === true;

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => {
              const newVal = isChecked ? 'false' : 'true';
              setEditingValues((prev) => ({ ...prev, [p.key]: newVal }));
              handleSaveParam(p.key, newVal);
            }}
            style={{
              position: 'relative',
              width: '42px',
              height: '22px',
              borderRadius: '11px',
              background: isChecked ? 'var(--accent-green, #10b981)' : 'var(--border, #cbd5e1)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isChecked ? 'Click to Disable' : 'Click to Enable'}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#ffffff',
                transform: isChecked ? 'translateX(20px)' : 'translateX(0px)',
                transition: 'transform 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
          </button>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isChecked ? '#10b981' : '#ef4444'
            }}
          >
            {isChecked ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    }

    // Enum dropdowns
    if (p.key === 'round_off_format' || p.key === 'roundOffFormat') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            className="form-control"
            value={editingValues[p.key] ?? p.value}
            onChange={(e) => {
              const val = e.target.value;
              setEditingValues((prev) => ({ ...prev, [p.key]: val }));
              handleSaveParam(p.key, val);
            }}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '160px', borderRadius: '4px' }}
          >
            <option value="NEAREST_RUPEE">NEAREST_RUPEE</option>
            <option value="ROUND_UP">ROUND_UP</option>
            <option value="ROUND_DOWN">ROUND_DOWN</option>
            <option value="TRUNCATE">TRUNCATE</option>
          </select>
        </div>
      );
    }

    if (p.key === 'tally_export_version') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            className="form-control"
            value={editingValues[p.key] ?? p.value}
            onChange={(e) => {
              const val = e.target.value;
              setEditingValues((prev) => ({ ...prev, [p.key]: val }));
              handleSaveParam(p.key, val);
            }}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '150px', borderRadius: '4px' }}
          >
            <option value="Prime 4.0">Prime 4.0</option>
            <option value="Prime 3.0">Prime 3.0</option>
            <option value="ERP 9 Release 6.6">ERP 9 Release 6.6</option>
          </select>
        </div>
      );
    }

    if (p.key === 'timezone') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            className="form-control"
            value={editingValues[p.key] ?? p.value}
            onChange={(e) => {
              const val = e.target.value;
              setEditingValues((prev) => ({ ...prev, [p.key]: val }));
              handleSaveParam(p.key, val);
            }}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '150px', borderRadius: '4px' }}
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="UTC">UTC (Universal)</option>
          </select>
        </div>
      );
    }

    if (p.key === 'terms_and_conditions') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', maxWidth: '300px' }}>
          <textarea
            rows={2}
            className="form-control"
            style={{ fontSize: '0.74rem', padding: '0.35rem 0.5rem', borderRadius: '4px', resize: 'vertical' }}
            value={editingValues[p.key] ?? p.value}
            onChange={(e) => setEditingValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
          />
          {isDirty && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', alignSelf: 'flex-end' }}
              disabled={savingKey === p.key}
              onClick={() => handleSaveParam(p.key, editingValues[p.key])}
            >
              <Save size={11} /> {savingKey === p.key ? 'Saving...' : 'Save Terms'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <input
          type={p.type === 'NUMBER' || p.dataType === 'NUMBER' ? 'text' : 'text'}
          className="form-control font-mono-tabular"
          style={{ width: '140px', fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: '4px' }}
          value={editingValues[p.key] ?? p.value}
          onChange={(e) => setEditingValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
        />
        {isDirty && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            disabled={savingKey === p.key}
            onClick={() => handleSaveParam(p.key, editingValues[p.key])}
          >
            <Save size={11} /> {savingKey === p.key ? '...' : 'Save'}
          </button>
        )}
      </div>
    );
  };

  const renderParameterRow = (p) => {
    const isOverride = !isSeedCompany && (p.isOverridden || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000' && !p.isInherited));
    const isDirty = editingValues[p.key] !== undefined && String(editingValues[p.key]) !== String(p.value);

    let statusBadge;
    if (isSeedCompany) {
      statusBadge = (
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#8b5cf6',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Sparkles size={9} /> Seed Master Rule
        </span>
      );
    } else if (isOverride) {
      statusBadge = (
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <CheckCircle2 size={9} /> Custom Tenant Override
        </span>
      );
    } else {
      statusBadge = (
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            background: 'var(--bg-canvas)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <ArrowRight size={9} /> Inherited Default
        </span>
      );
    }

    return (
      <div
        key={p.key}
        style={{
          padding: '0.75rem 0.95rem',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          background: isOverride ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-surface)',
          borderLeft: isOverride
            ? '3px solid #10b981'
            : isSeedCompany
            ? '3px solid #8b5cf6'
            : '3px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span
              className="font-mono-tabular"
              style={{
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
              onClick={() => handleCopyKey(p.key)}
              title="Click to copy key name"
            >
              {p.key}
            </span>
            <button
              type="button"
              onClick={() => handleCopyKey(p.key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Copy key"
            >
              <Copy size={11} />
            </button>
            {statusBadge}
            {isDirty && (
              <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>
                ● Modified
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {p.description || 'System configuration rule'}
          </div>

          {!isSeedCompany && isOverride && p.defaultValue !== undefined && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              Seed Default: <code>{String(p.defaultValue)}</code>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {renderParameterInput(p)}

          {isOverride && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              title="Remove override & revert back to Master Seed default"
              onClick={() => setConfirmResetKey(p.key)}
            >
              <RotateCcw size={11} /> Revert
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          height: '100vh',
          background: 'var(--bg-canvas)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.15)',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '1.1rem 1.35rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: isSeedCompany ? '#8b5cf6' : '#10b981', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Sliders size={14} /> Parameter Store &bull; {isSeedCompany ? 'Master Seed Default Hub (SEED000)' : 'Tenant Configuration & Inheritance'}
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              {company.name} <span className="font-mono-tabular" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>[{company.code}]</span>
              {isSeedCompany && (
                <span className="badge badge-pastel-purple" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                  000 Seed Master
                </span>
              )}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isSeedCompany && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setShowAddSeedModal(true)}
              >
                <Plus size={14} /> Add Seed Rule
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Close Drawer (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div style={{ padding: '0.65rem 1.35rem', background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span>Total Rules: <strong className="font-mono-tabular">{totalCount}</strong></span>
            {!isSeedCompany && (
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                Custom Overrides: <strong className="font-mono-tabular">{overrideCount}</strong>
              </span>
            )}
            <span>Feature Flags: <strong className="font-mono-tabular">{flagCount}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
              onClick={() => toggleAllAccordions(true)}
            >
              Expand All
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
              onClick={() => toggleAllAccordions(false)}
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* SEED NOTICE BANNER */}
        {isSeedCompany && (
          <div style={{ padding: '0.65rem 1.35rem', background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.76rem', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Sparkles size={15} color="#8b5cf6" />
            <span>
              <strong>Master Seed Inheritance Guard:</strong> Modifying rules here sets the <strong>system-wide fallback defaults</strong> across all tenant organizations.
            </span>
          </div>
        )}

        {/* SEARCH & FILTER BAR */}
        <div style={{ padding: '0.75rem 1.35rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter by parameter key, description or value..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.78rem', width: '100%', borderRadius: '6px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* FILTER PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '12px' }}
              onClick={() => setFilterMode('ALL')}
            >
              All Rules ({totalCount})
            </button>
            {!isSeedCompany && (
              <button
                type="button"
                className={`btn ${filterMode === 'OVERRIDES' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '12px', background: filterMode === 'OVERRIDES' ? '#10b981' : undefined }}
                onClick={() => setFilterMode('OVERRIDES')}
              >
                Overrides Only ({overrideCount})
              </button>
            )}
            <button
              type="button"
              className={`btn ${filterMode === 'FLAGS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '12px' }}
              onClick={() => setFilterMode('FLAGS')}
            >
              Feature Flags ({flagCount})
            </button>
          </div>
        </div>

        {/* ACCORDION CATEGORY LIST */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Loading Effective Parameter Store...</div>
            </div>
          ) : (
            <>
              {PARAMETER_CATEGORIES.map((cat) => {
                const catParams = parameters.filter((p) => {
                  const matchesCat = cat.keys.includes(p.key);
                  if (!matchesCat) return false;

                  if (filterMode === 'OVERRIDES' && !isSeedCompany) {
                    const isOverride = p.isOverridden || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000' && !p.isInherited);
                    if (!isOverride) return false;
                  }

                  if (filterMode === 'FLAGS') {
                    if (!p.key.startsWith('feature_') && p.value !== 'true' && p.value !== 'false') return false;
                  }

                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (
                    p.key.toLowerCase().includes(q) ||
                    (p.description && p.description.toLowerCase().includes(q)) ||
                    String(p.value).toLowerCase().includes(q)
                  );
                });

                if ((search || filterMode !== 'ALL') && catParams.length === 0) return null;

                const isAccordionOpen = (search || filterMode !== 'ALL') ? true : openAccordions[cat.id];
                const catOverrideCount = catParams.filter((p) => !isSeedCompany && (p.isOverridden || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000' && !p.isInherited))).length;

                return (
                  <div
                    key={cat.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-card)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion(cat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.85rem 1.1rem',
                        background: 'var(--bg-surface-elevated)',
                        border: 'none',
                        borderBottom: isAccordionOpen ? '1px solid var(--border)' : 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: cat.bgColor,
                            color: cat.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {cat.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{cat.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cat.description}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!isSeedCompany && catOverrideCount > 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                            {catOverrideCount} Overrides
                          </span>
                        )}
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--bg-canvas)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {catParams.length} Rules
                        </span>
                        {isAccordionOpen ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
                      </div>
                    </button>

                    {isAccordionOpen && (
                      <div style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {catParams.map((p) => renderParameterRow(p))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* DYNAMIC FALLBACK FOR UNCATEGORIZED KEYS */}
              {uncategorizedParams.length > 0 && (() => {
                const filteredUncat = uncategorizedParams.filter((p) => {
                  if (filterMode === 'OVERRIDES' && !isSeedCompany) {
                    const isOverride = p.isOverridden || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000' && !p.isInherited);
                    if (!isOverride) return false;
                  }
                  if (filterMode === 'FLAGS') {
                    if (!p.key.startsWith('feature_') && p.value !== 'true' && p.value !== 'false') return false;
                  }
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (
                    p.key.toLowerCase().includes(q) ||
                    (p.description && p.description.toLowerCase().includes(q)) ||
                    String(p.value).toLowerCase().includes(q)
                  );
                });

                if ((search || filterMode !== 'ALL') && filteredUncat.length === 0) return null;
                const isAccordionOpen = (search || filterMode !== 'ALL') ? true : openAccordions.other_parameters;

                return (
                  <div
                    key="other_parameters"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-card)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion('other_parameters')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.85rem 1.1rem',
                        background: 'var(--bg-surface-elevated)',
                        border: 'none',
                        borderBottom: isAccordionOpen ? '1px solid var(--border)' : 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderPlus size={15} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>Other Parameters & Custom Keys</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dynamically configured seed parameters and custom rules</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--bg-canvas)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {filteredUncat.length} Keys
                        </span>
                        {isAccordionOpen ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
                      </div>
                    </button>

                    {isAccordionOpen && (
                      <div style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {filteredUncat.map((p) => renderParameterRow(p))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '0.9rem 1.35rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing <strong className="font-mono-tabular">{parameters.length}</strong> parameters for {company.name}
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
            Close Drawer
          </button>
        </div>

        {/* CONFIRM RESET MODAL */}
        <ConfirmModal
          isOpen={Boolean(confirmResetKey)}
          title={`Reset Parameter: ${confirmResetKey}`}
          message={`Are you sure you want to remove the tenant custom override for '${confirmResetKey}' and restore the master seed default value?`}
          confirmText="Revert to Master Seed"
          cancelText="Keep Override"
          variant="warning"
          loading={resetLoading}
          onConfirm={handleConfirmReset}
          onCancel={() => setConfirmResetKey(null)}
        />

        {/* ADD MASTER SEED PARAMETER MODAL */}
        {showAddSeedModal && (
          <div className="modal-backdrop" style={{ zIndex: 1300 }}>
            <div className="card shadow-md animate-scale-up" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Plus size={16} color="#8b5cf6" />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Add Master Seed Rule
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSeedModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSeedParam} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Parameter Key <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. feature_speech_data_entry or sac_code"
                    className="form-control font-mono-tabular"
                    style={{ fontSize: '0.8rem', width: '100%' }}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Use snake_case. Prefix with <code>feature_</code> for toggleable feature flags.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Data Type
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: '0.8rem', width: '100%' }}
                      value={newType}
                      onChange={(e) => {
                        const t = e.target.value;
                        setNewType(t);
                        if (t === 'BOOLEAN') setNewValue('false');
                        else if (t === 'NUMBER') setNewValue('0');
                        else setNewValue('');
                      }}
                    >
                      <option value="BOOLEAN">BOOLEAN (Flag)</option>
                      <option value="STRING">STRING (Text)</option>
                      <option value="NUMBER">NUMBER (Numeric)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Default Value <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    {newType === 'BOOLEAN' ? (
                      <select
                        className="form-control"
                        style={{ fontSize: '0.8rem', width: '100%' }}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      >
                        <option value="false">false (Disabled by Default)</option>
                        <option value="true">true (Enabled by Default)</option>
                      </select>
                    ) : (
                      <input
                        type={newType === 'NUMBER' ? 'number' : 'text'}
                        required
                        placeholder={newType === 'NUMBER' ? '0' : 'Default Value'}
                        className="form-control"
                        style={{ fontSize: '0.8rem', width: '100%' }}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    Description & Purpose
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe what this parameter rule controls across tenant applications..."
                    className="form-control"
                    style={{ fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>

                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <strong>Inheritance Behavior:</strong> All active company tenants will inherit <code>{String(newValue)}</code> as default value.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => setShowAddSeedModal(false)}
                    disabled={creatingSeedParam}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem' }}
                    disabled={creatingSeedParam}
                  >
                    {creatingSeedParam ? 'Creating...' : 'Create & Seed Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
