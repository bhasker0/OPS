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
  Globe
} from 'lucide-react';

export default function CompanyParameterDrawer({
  isOpen,
  onClose,
  company,
  apiBase = 'http://localhost:5000/api',
  onParameterUpdated
}) {
  const [parameters, setParameters] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [editingValues, setEditingValues] = useState({});

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
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !company) return null;

  const filteredParams = parameters.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.key.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      String(p.value).toLowerCase().includes(q)
    );
  });

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
        fetchParameters();
        if (onParameterUpdated) onParameterUpdated(key, value);
      } else {
        alert(data.message || 'Failed to update parameter');
      }
    } catch (err) {
      alert('Error saving parameter');
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetToSeed = async (key) => {
    if (!confirm(`Reset parameter '${key}' to default seed value?`)) return;
    setSavingKey(key);
    try {
      const res = await fetch(`${apiBase}/companies/${company.id}/parameters/${key}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchParameters();
        if (onParameterUpdated) onParameterUpdated(key, null);
      }
    } catch (err) {
      console.error('Failed to delete override:', err);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          height: '100vh',
          background: '#ffffff',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out'
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Sliders size={14} /> Parameter Store Drawer
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0 0 0' }}>
              {company.name} <code style={{ fontSize: '0.85rem', color: '#4f46e5' }}>{company.code}</code>
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* SEARCH & STATS BAR */}
        <div style={{ padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search parameters or feature keys..."
              className="form-control"
              style={{ paddingLeft: '2rem', fontSize: '0.78rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
            {filteredParams.length} parameters
          </span>
        </div>

        {/* PARAMETERS LIST */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
              Loading company parameter store...
            </div>
          ) : filteredParams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
              No matching parameters found.
            </div>
          ) : (
            filteredParams.map((p) => {
              const isFeature = p.key.startsWith('feature_');
              const isOverride = p.isCustomOverride || (p.companyId && p.companyId !== '00000000-0000-0000-0000-000000000000');
              const currentVal = editingValues[p.key] !== undefined ? editingValues[p.key] : p.value;

              return (
                <div
                  key={p.key}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${isOverride ? '#c7d2fe' : '#e2e8f0'}`,
                    background: isOverride ? '#f5f7ff' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <code style={{ fontSize: '0.82rem', fontWeight: 700, color: isFeature ? '#4f46e5' : '#0f172a' }}>
                        {p.key}
                      </code>
                      {isOverride ? (
                        <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>
                          Custom Override
                        </span>
                      ) : (
                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                          Inherited Seed
                        </span>
                      )}
                    </div>

                    {isOverride && (
                      <button
                        onClick={() => handleResetToSeed(p.key)}
                        title="Revert to inherited seed default"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>

                  {p.description && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {p.description}
                    </div>
                  )}

                  {/* CONTROLS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {isFeature ? (
                      <button
                        className={`btn ${currentVal === 'true' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        disabled={savingKey === p.key}
                        onClick={() => handleSaveParam(p.key, currentVal === 'true' ? 'false' : 'true')}
                      >
                        {currentVal === 'true' ? 'Enabled (true)' : 'Disabled (false)'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem', width: '100%' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                          value={currentVal}
                          onChange={(e) => setEditingValues({ ...editingValues, [p.key]: e.target.value })}
                        />
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          disabled={savingKey === p.key || currentVal === p.value}
                          onClick={() => handleSaveParam(p.key, currentVal)}
                        >
                          <Save size={12} /> Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8rem' }}>
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}