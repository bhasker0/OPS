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

  // Category Navigation Chip State
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | category id

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
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '0.05rem 0.35rem',
            borderRadius: '4px',
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#8b5cf6',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <Sparkles size={8} /> Seed Master
        </span>
      );
    } else if (isOverride) {
      statusBadge = (
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '0.05rem 0.35rem',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <CheckCircle2 size={8} /> Custom Override
        </span>
      );
    } else {
      statusBadge = (
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 600,
            padding: '0.05rem 0.35rem',
            borderRadius: '4px',
            background: 'var(--bg-canvas)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <ArrowRight size={8} /> Inherited
        </span>
      );
    }

    return (
      <div
        key={p.key}
        style={{
          padding: '0.45rem 0.75rem',
          border: '1px solid var(--border)',
          borderRadius: '5px',
          background: isOverride ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-surface)',
          borderLeft: isOverride
            ? '3px solid #10b981'
            : isSeedCompany
            ? '3px solid #8b5cf6'
            : '3px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.65rem',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span
              className="font-mono-tabular"
              style={{
                fontWeight: 700,
                fontSize: '0.78rem',
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
              title="Copy key"
            >
              <Copy size={10} />
            </button>
            {statusBadge}
            {isDirty && (
              <span style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 700 }}>
                ● Modified
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem', lineHeight: 1.25 }}>
            {p.description || 'System configuration rule'}
            {!isSeedCompany && isOverride && p.defaultValue !== undefined && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                (Seed Default: <code>{String(p.defaultValue)}</code>)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {renderParameterInput(p)}

          {isOverride && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.18rem 0.4rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
              title="Remove override & revert back to Master Seed default"
              onClick={() => setConfirmResetKey(p.key)}
            >
              <RotateCcw size={10} /> Revert
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
        <div style={{ padding: '0.75rem 1.15rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: isSeedCompany ? 'var(--accent-purple, #8b5cf6)' : 'var(--accent-green)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Sliders size={13} /> Parameters
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.15rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {company.name} <span className="font-mono-tabular" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>[{company.code}]</span>
              {isSeedCompany && (
                <span className="badge badge-pastel-purple" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem' }}>
                  Seed Master
                </span>
              )}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-canvas)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>Rules: <strong className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>{totalCount}</strong></span>
              {!isSeedCompany && (
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  Overrides: <strong className="font-mono-tabular">{overrideCount}</strong>
                </span>
              )}
              <span>Flags: <strong className="font-mono-tabular" style={{ color: 'var(--text-main)' }}>{flagCount}</strong></span>
            </div>

            {isSeedCompany && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.74rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => setShowAddSeedModal(true)}
              >
                <Plus size={13} /> Add Seed Rule
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Close Drawer (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* COMPACT CONTROLS BAR (SEARCH, FILTERS, CATEGORY CHIPS) */}
        <div style={{ padding: '0.55rem 1.15rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {/* ROW 1: SEARCH & FILTER MODE PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search parameter key, description or value..."
                className="form-control"
                style={{ paddingLeft: '2rem', fontSize: '0.75rem', height: '28px', width: '100%', borderRadius: '5px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <button
                type="button"
                className={`btn ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '10px', height: '26px' }}
                onClick={() => setFilterMode('ALL')}
              >
                All ({totalCount})
              </button>
              {!isSeedCompany && (
                <button
                  type="button"
                  className={`btn ${filterMode === 'OVERRIDES' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '10px', height: '26px', background: filterMode === 'OVERRIDES' ? '#10b981' : undefined }}
                  onClick={() => setFilterMode('OVERRIDES')}
                >
                  Overrides ({overrideCount})
                </button>
              )}
              <button
                type="button"
                className={`btn ${filterMode === 'FLAGS' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '10px', height: '26px' }}
                onClick={() => setFilterMode('FLAGS')}
              >
                Flags ({flagCount})
              </button>
            </div>
          </div>

          {/* ROW 2: CATEGORY NAVIGATION CHIPS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.1rem' }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.18rem 0.55rem',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                background: selectedCategory === 'ALL' ? 'var(--accent-purple, #8b5cf6)' : 'var(--bg-canvas)',
                color: selectedCategory === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                border: selectedCategory === 'ALL' ? 'none' : '1px solid var(--border)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={11} /> All ({totalCount})
            </button>
            {PARAMETER_CATEGORIES.map((cat) => {
              const catCount = parameters.filter((p) => cat.keys.includes(p.key)).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.18rem 0.55rem',
                    borderRadius: '12px',
                    whiteSpace: 'nowrap',
                    background: isSelected ? cat.color : 'var(--bg-canvas)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    border: isSelected ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.icon} {cat.title.split(' ')[0]} ({catCount})
                </button>
              );
            })}
            {uncategorizedParams.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('other_parameters')}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.18rem 0.55rem',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                  background: selectedCategory === 'other_parameters' ? '#6b7280' : 'var(--bg-canvas)',
                  color: selectedCategory === 'other_parameters' ? '#ffffff' : 'var(--text-muted)',
                  border: selectedCategory === 'other_parameters' ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <FolderPlus size={11} /> Custom ({uncategorizedParams.length})
              </button>
            )}
          </div>
        </div>

        {/* HIGH-DENSITY PARAMETER LIST */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Loading Effective Parameter Store...</div>
            </div>
          ) : (
            <>
              {PARAMETER_CATEGORIES.map((cat) => {
                if (selectedCategory !== 'ALL' && selectedCategory !== cat.id) return null;

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
                const catOverrideCount = catParams.filter((p) => !isSeedCompany && (p.isOverridden || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000' && !p.isInherited))).length;

                return (
                  <div key={cat.id} id={`category-section-${cat.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {/* CATEGORY SECTION HEADER & DIVIDER */}
                    <div style={{ paddingBottom: '0.3rem', borderBottom: `2px solid ${cat.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
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
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{cat.title}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{cat.description}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {!isSeedCompany && catOverrideCount > 0 && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                            {catOverrideCount} Overrides
                          </span>
                        )}
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {catParams.length} Rules
                        </span>
                      </div>
                    </div>

                    {/* PARAMETERS LIST */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {catParams.map((p) => renderParameterRow(p))}
                    </div>
                  </div>
                );
              })}

              {/* DYNAMIC UNCATEGORIZED CATEGORY */}
              {uncategorizedParams.length > 0 && (selectedCategory === 'ALL' || selectedCategory === 'other_parameters') && (() => {
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

                return (
                  <div key="other_parameters" id="category-section-other_parameters" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ paddingBottom: '0.5rem', borderBottom: '2px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderPlus size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>Other Parameters & Custom Keys</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Dynamically configured seed parameters and custom rules</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        {filteredUncat.length} Keys
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredUncat.map((p) => renderParameterRow(p))}
                    </div>
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
