import React, { useState, useEffect } from 'react';
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
  Terminal,
  Plus,
  HelpCircle,
  FolderPlus
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';

const PARAMETER_CATEGORIES = [
  {
    id: 'textile_production',
    title: 'Textile & Production Rules',
    description: 'SAC rates, stitching tolerances, decimals, and machine caps',
    icon: <Scissors size={14} />,
    keys: [
      'sac_code',
      'default_rate_per_1000',
      'shrinkage_tolerance_percent',
      'max_machines_allowed',
      'roundOffFormat',
      'digitsAfterDecimal'
    ]
  },
  {
    id: 'karigar_accounting',
    title: 'Karigar & Job-Work Accounting',
    description: 'Wage deduction, TDS, advance limits, and challan prefixes',
    icon: <DollarSign size={14} />,
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
    description: 'Outbound sync webhooks, retry thresholds, and audit retention',
    icon: <Activity size={14} />,
    keys: [
      'outbound_sync_enabled',
      'sync_retry_max_attempts',
      'auto_archive_days',
      'audit_retention_days',
      'rate_limit_per_minute'
    ]
  },
  {
    id: 'security_geofence',
    title: 'Security & Geofence Perimeter',
    description: 'Subnet restrictions, factory GPS coordinates, and geofence radius',
    icon: <Lock size={14} />,
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
    icon: <Sparkles size={14} />,
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
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [confirmResetKey, setConfirmResetKey] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  // New Seed Parameter Form State
  const [showAddSeedModal, setShowAddSeedModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('BOOLEAN');
  const [newValue, setNewValue] = useState('false');
  const [newDesc, setNewDesc] = useState('');
  const [creatingSeedParam, setCreatingSeedParam] = useState(false);

  const [openAccordions, setOpenAccordions] = useState({
    textile_production: true,
    karigar_accounting: true,
    integration_governance: true,
    security_geofence: true,
    etms_features: true,
    other_parameters: true
  });

  const isSeedCompany =
    company?.isSeed ||
    company?.code === '000' ||
    company?.id === '00000000-0000-0000-0000-000000000000';

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

  if (!isOpen || !company) return null;

  const toggleAccordion = (catId) => {
    setOpenAccordions((prev) => ({ ...prev, [catId]: !prev[catId] }));
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
        toast.success(`Parameter '${key}' updated to '${value}'.`, 'Parameter Saved');
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
        toast.info(`Parameter '${key}' reset to default 000 Seed value.`, 'Parameter Reset');
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
          description: newDesc.trim() || 'Master seed parameter'
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Master Seed Parameter '${newKey.trim()}' created with default '${newValue}'. Propagated to all tenants.`,
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

  // Compute all categorized keys to identify uncategorized dynamic parameters
  const categorizedKeySet = new Set(PARAMETER_CATEGORIES.flatMap((c) => c.keys));
  const uncategorizedParams = parameters.filter((p) => !categorizedKeySet.has(p.key));

  const renderParameterInput = (p) => {
    const isDirty = editingValues[p.key] !== undefined && String(editingValues[p.key]) !== String(p.value);

    // Boolean switch
    if (p.dataType === 'BOOLEAN' || p.value === 'true' || p.value === 'false') {
      const isChecked = editingValues[p.key] === 'true' || editingValues[p.key] === true;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                const newVal = e.target.checked ? 'true' : 'false';
                setEditingValues((prev) => ({ ...prev, [p.key]: newVal }));
                handleSaveParam(p.key, newVal);
              }}
            />
            <span className={`badge ${isChecked ? 'badge-pastel-green' : 'badge-pastel-yellow'}`}>
              {isChecked ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      );
    }

    // Enum dropdown (roundOffFormat)
    if (p.key === 'roundOffFormat') {
      return (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <select
            className="form-control"
            value={editingValues[p.key] ?? p.value}
            onChange={(e) => {
              const val = e.target.value;
              setEditingValues((prev) => ({ ...prev, [p.key]: val }));
              handleSaveParam(p.key, val);
            }}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '150px', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="NEAREST_RUPEE">NEAREST_RUPEE</option>
            <option value="ROUND_UP">ROUND_UP</option>
            <option value="ROUND_DOWN">ROUND_DOWN</option>
            <option value="TRUNCATE">TRUNCATE</option>
          </select>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <input
          type={p.dataType === 'NUMBER' ? 'number' : 'text'}
          className="form-control"
          style={{ width: '130px', fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
          value={editingValues[p.key] ?? p.value}
          onChange={(e) => setEditingValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
        />
        {isDirty && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem' }}
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

    let statusBadge;
    if (isSeedCompany) {
      statusBadge = (
        <span className="badge badge-pastel-purple" style={{ fontSize: '0.65rem' }}>
          Master Seed Default
        </span>
      );
    } else if (isOverride) {
      statusBadge = (
        <span className="badge badge-pastel-green" style={{ fontSize: '0.65rem' }}>
          Custom Override
        </span>
      );
    } else {
      if (p.value === 'true') {
        statusBadge = (
          <span className="badge badge-pastel-blue" style={{ fontSize: '0.65rem' }}>
            Inherited (Default: Enabled)
          </span>
        );
      } else if (p.value === 'false') {
        statusBadge = (
          <span className="badge badge-pastel-yellow" style={{ fontSize: '0.65rem' }}>
            Inherited (Default: Disabled)
          </span>
        );
      } else {
        statusBadge = (
          <span className="badge badge-pastel-blue" style={{ fontSize: '0.65rem' }}>
            Inherited Default
          </span>
        );
      }
    }

    return (
      <div
        key={p.key}
        style={{
          padding: '0.65rem 0.85rem',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: isOverride ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
          borderLeft: isOverride ? '3px solid var(--accent-green)' : isSeedCompany ? '3px solid var(--accent-purple)' : '3px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ flex: 1, paddingRight: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="font-mono-tabular" style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-main)' }}>
              {p.key}
            </span>
            {statusBadge}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {p.description || 'System configuration parameter'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {renderParameterInput(p)}
          {isOverride && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}
              title="Reset override back to Master Seed"
              onClick={() => setConfirmResetKey(p.key)}
            >
              <RotateCcw size={11} />
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
          maxWidth: '620px',
          height: '100vh',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-drawer)',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 600 }}>
              <Sliders size={14} /> Parameter Store &bull; {isSeedCompany ? 'Master Seed Default Hub (000)' : 'Tenant Configuration & Inheritance'}
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {company.name} <span className="font-mono-tabular" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>[{company.code}]</span>
              {isSeedCompany && (
                <span className="badge badge-pastel-purple" style={{ fontSize: '0.7rem' }}>
                  Master Seed Company
                </span>
              )}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isSeedCompany && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setShowAddSeedModal(true)}
              >
                <Plus size={13} /> Add Master Parameter
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* SEED NOTICE BANNER */}
        {isSeedCompany && (
          <div style={{ padding: '0.65rem 1.25rem', background: '#F5F3FF', borderBottom: '1px solid #DDD6FE', fontSize: '0.75rem', color: '#5B21B6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={14} color="#7C3AED" />
            <span>
              <strong>Seed Rule:</strong> Any parameter added or modified here sets the <strong>system-wide default</strong> for all tenant companies unless overridden.
            </span>
          </div>
        )}

        {/* SEARCH BAR */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search parameter key, description or value..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.78rem', width: '100%', borderRadius: 'var(--radius-sm)' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ACCORDION CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {PARAMETER_CATEGORIES.map((cat) => {
            const catParams = parameters.filter((p) => {
              const matchesCat = cat.keys.includes(p.key);
              if (!matchesCat) return false;
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                p.key.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                String(p.value).toLowerCase().includes(q)
              );
            });

            if (search && catParams.length === 0) return null;

            const isAccordionOpen = search ? true : openAccordions[cat.id];

            return (
              <div key={cat.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface-elevated)',
                    border: 'none',
                    borderBottom: isAccordionOpen ? '1px solid var(--border)' : 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--accent-blue)' }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>{cat.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cat.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-pastel-blue" style={{ fontSize: '0.7rem' }}>{catParams.length} Rules</span>
                    {isAccordionOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                  </div>
                </button>

                {isAccordionOpen && (
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {catParams.map((p) => renderParameterRow(p))}
                  </div>
                )}
              </div>
            );
          })}

          {/* DYNAMIC FALLBACK CATEGORY FOR UNCATEGORIZED / CUSTOM SEED KEYS */}
          {uncategorizedParams.length > 0 && (() => {
            const filteredUncat = uncategorizedParams.filter((p) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                p.key.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                String(p.value).toLowerCase().includes(q)
              );
            });

            if (search && filteredUncat.length === 0) return null;
            const isAccordionOpen = search ? true : openAccordions.other_parameters;

            return (
              <div key="other_parameters" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion('other_parameters')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface-elevated)',
                    border: 'none',
                    borderBottom: isAccordionOpen ? '1px solid var(--border)' : 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--accent-purple)' }}><FolderPlus size={14} /></span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>Other Parameters & Custom Keys</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dynamically configured seed parameters and custom rules</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-pastel-purple" style={{ fontSize: '0.7rem' }}>{filteredUncat.length} Keys</span>
                    {isAccordionOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                  </div>
                </button>

                {isAccordionOpen && (
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredUncat.map((p) => renderParameterRow(p))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Total Parameters: <strong className="font-mono-tabular">{parameters.length}</strong>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.78rem' }}>
            Close
          </button>
        </div>

        {/* CONFIRM RESET MODAL */}
        <ConfirmModal
          isOpen={Boolean(confirmResetKey)}
          title={`Reset Parameter: ${confirmResetKey}`}
          message={`Are you sure you want to delete the tenant custom override for '${confirmResetKey}' and restore the master seed default value?`}
          confirmText="Reset to Master Seed"
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
                  <Plus size={16} color="var(--accent-purple)" />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Add Master Seed Parameter
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
                    Parameter Key <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. feature_speech_data_entry or tax_tds_rate"
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
                      <option value="JSON">JSON (Object/Array)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Default Value <span style={{ color: 'var(--accent-red)' }}>*</span>
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
                    placeholder="Describe what this parameter or feature controls across tenant applications..."
                    className="form-control"
                    style={{ fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>

                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <strong>Inheritance Behavior:</strong> Non-overridden companies will automatically inherit <code>{String(newValue)}</code> as their default value.
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
                    {creatingSeedParam ? 'Creating...' : 'Create & Seed Default'}
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


