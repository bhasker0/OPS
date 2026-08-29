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
  Activity
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';

const PARAMETER_CATEGORIES = [
  {
    id: 'textile_production',
    title: '🧵 Textile & Production Rules',
    description: 'SAC rates, stitching tolerances, decimals, and machine caps',
    icon: <Scissors size={15} />,
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
    title: '💰 Karigar & Job-Work Accounting',
    description: 'Wage deduction, TDS, advance limits, and challan prefixes',
    icon: <DollarSign size={15} />,
    keys: [
      'karigar_tds_deduction_percent',
      'jobwork_challan_prefix',
      'max_karigar_advance_limit',
      'dead_stock_threshold_meters'
    ]
  },
  {
    id: 'integration_governance',
    title: '⚡ Integration & Governance',
    description: 'Outbound sync webhooks, retry thresholds, and audit retention',
    icon: <Activity size={15} />,
    keys: [
      'outbound_sync_enabled',
      'sync_retry_max_attempts',
      'auto_archive_days',
      'audit_retention_days',
      'rate_limit_per_minute'
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
  const [openAccordions, setOpenAccordions] = useState({
    textile_production: true,
    karigar_accounting: true,
    integration_governance: true
  });

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

  const renderParameterInput = (p) => {
    const isOverride = p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000';
    const isDirty = editingValues[p.key] !== undefined && String(editingValues[p.key]) !== String(p.value);

    // Boolean switch
    if (p.dataType === 'BOOLEAN' || p.value === 'true' || p.value === 'false') {
      const isChecked = editingValues[p.key] === 'true' || editingValues[p.key] === true;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                const newVal = e.target.checked ? 'true' : 'false';
                setEditingValues((prev) => ({ ...prev, [p.key]: newVal }));
                handleSaveParam(p.key, newVal);
              }}
            />
            {isChecked ? 'Enabled' : 'Disabled'}
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
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', width: '160px' }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <input
          type={p.dataType === 'NUMBER' ? 'number' : 'text'}
          className="form-control"
          style={{ width: '140px', fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
          value={editingValues[p.key] ?? p.value}
          onChange={(e) => setEditingValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
        />
        {isDirty && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
            disabled={savingKey === p.key}
            onClick={() => handleSaveParam(p.key, editingValues[p.key])}
          >
            <Save size={12} /> {savingKey === p.key ? '...' : 'Save'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100vh',
          background: 'var(--bg-surface)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out'
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Sliders size={14} /> Parameter Settings Drawer
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.15rem 0 0 0' }}>
              {company.name} <code style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{company.code}</code>
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-canvas)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Live filter across all 18 parameter keys..."
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.78rem', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ACCORDION CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
              <div key={cat.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--border-subtle)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--primary)' }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{cat.title}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{cat.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge badge-system" style={{ fontSize: '0.65rem' }}>{catParams.length} rules</span>
                    {isAccordionOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                </button>

                {isAccordionOpen && (
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {catParams.map((p) => {
                      const isOverride = p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000';
                      return (
                        <div
                          key={p.key}
                          style={{
                            padding: '0.6rem 0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: isOverride ? 'var(--primary-light)' : 'var(--bg-surface)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1, paddingRight: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>{p.key}</span>
                              <span className={isOverride ? 'badge badge-active' : 'badge badge-seed'} style={{ fontSize: '0.65rem' }}>
                                {isOverride ? 'Tenant Override' : 'Inherited Master'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {p.description || 'Standard textile manufacturing parameter'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {renderParameterInput(p)}
                            {isOverride && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.45rem', fontSize: '0.7rem' }}
                                title="Reset override back to 000 Master Seed"
                                onClick={() => setConfirmResetKey(p.key)}
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-canvas)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Drawer
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
      </div>
    </div>
  );
}
