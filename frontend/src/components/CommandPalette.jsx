import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Building,
  Users,
  Lock,
  FileText,
  TrendingUp,
  Sliders,
  Plus,
  Headphones,
  CornerDownLeft,
  X,
  Sparkles,
  Command,
  ArrowRight,
  Activity,
  Terminal
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  companies = [],
  users = [],
  onNavigateTab,
  onSelectCompany,
  onRegisterCompany,
  onCreateUser,
  onOpenParameterStore,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build searchable items
  const navigationItems = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Global Analytics Dashboard',
      subtitle: 'Executive metrics, ARR ledger, and system health',
      icon: <TrendingUp size={15} color="var(--primary)" />,
      action: () => {
        onNavigateTab('global_dashboard');
        onClose();
      },
    },
    {
      id: 'nav-companies',
      category: 'Navigation',
      title: 'Tenant Directory & Registry',
      subtitle: `Browse all ${companies.length} tenant organizations`,
      icon: <Building size={15} color="var(--primary)" />,
      action: () => {
        onNavigateTab('companies');
        onClose();
      },
    },
    {
      id: 'nav-users',
      category: 'Navigation',
      title: 'User Management & Lifecycle',
      subtitle: `Manage ${users.length} user accounts & security roles`,
      icon: <Users size={15} color="var(--primary)" />,
      action: () => {
        onNavigateTab('all_users');
        onClose();
      },
    },
    {
      id: 'nav-roles',
      category: 'Navigation',
      title: 'RBAC Roles & Permissions Matrix',
      subtitle: 'Configure granular module permissions and security rules',
      icon: <Lock size={15} color="var(--primary)" />,
      action: () => {
        onNavigateTab('roles');
        onClose();
      },
    },
    {
      id: 'nav-subscriptions',
      category: 'Navigation',
      title: 'Subscription Ledger & Quotas',
      subtitle: 'Manage pricing tiers, machine & user quotas, and invoices',
      icon: <TrendingUp size={15} color="var(--primary)" />,
      action: () => {
        onNavigateTab('subscriptions');
        onClose();
      },
    },
    {
      id: 'nav-health',
      category: 'Navigation',
      title: 'System Telemetry & Sync DLQ',
      subtitle: 'Real-time database latency heartbeats and failed event replays',
      icon: <Activity size={15} color="var(--accent-green)" />,
      action: () => {
        onNavigateTab('system_health');
        onClose();
      },
    },
    {
      id: 'nav-parameters',
      category: 'Governance',
      title: 'Master Seed Parameter Store & Rules',
      subtitle: 'Configure global defaults, SAC 9988 rates, stitching tolerances & feature flags',
      icon: <Sliders size={15} color="var(--primary)" />,
      keywords: ['parameter', 'settings', 'feature flags', 'sac 9988', 'seed', 'rules', 'override', 'governance', 'stitching', 'karigar'],
      action: () => {
        if (onOpenParameterStore) onOpenParameterStore();
        onClose();
      },
    },
    {
      id: 'nav-audit',
      category: 'Navigation',
      title: 'Forensic Audit Trail Inspector',
      subtitle: 'MongoDB real-time change data & compliance events',
      icon: <FileText size={15} color="var(--primary)" />,
      action: () => {
        onNavigateTab('global_audit');
        onClose();
      },
    },
  ];

  const quickActions = [
    {
      id: 'act-register-company',
      category: 'Actions',
      title: 'Provision New Tenant Company',
      subtitle: 'Launch 4-step onboarding wizard with GSTIN validation',
      icon: <Plus size={15} color="var(--accent-green)" />,
      action: () => {
        if (onRegisterCompany) onRegisterCompany();
        onClose();
      },
    },
    {
      id: 'act-create-user',
      category: 'Actions',
      title: 'Provision User Account',
      subtitle: 'Provision a new tenant operator or ops super admin',
      icon: <Users size={15} color="var(--accent-green)" />,
      action: () => {
        if (onCreateUser) onCreateUser();
        onClose();
      },
    },
  ];

  const companyItems = companies.map((c) => ({
    id: `comp-${c.id}`,
    category: 'Tenants',
    title: c.name,
    subtitle: `Code: ${c.code} • GSTIN: ${c.gstin || 'N/A'}`,
    icon: <Building size={15} color="var(--primary)" />,
    badge: c.isSeed ? 'Master Seed' : (c.status || 'ACTIVE'),
    action: () => {
      if (onSelectCompany) onSelectCompany(c);
      onClose();
    },
  }));

  const userItems = users.map((u) => ({
    id: `user-${u.id}`,
    category: 'Users',
    title: u.name,
    subtitle: `${u.email} • Tenant: ${u.company ? u.company.name : 'Global Admin'}`,
    icon: <Users size={15} color="var(--text-muted)" />,
    badge: u.isInternalOps ? 'Super Admin' : 'Staff',
    action: () => {
      onNavigateTab('all_users');
      onClose();
    },
  }));

  const allItems = [...navigationItems, ...quickActions, ...companyItems, ...userItems];

  const filteredItems = query.trim() === ''
    ? allItems.slice(0, 10)
    : allItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q) ||
          (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)))
        );
      }).slice(0, 15);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  // Ensure selected item is visible
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop command-palette-backdrop" onClick={onClose} style={{ zIndex: 1300 }}>
      <div
        className="command-palette-container"
        onClick={(e) => e.stopPropagation()}
        role="combobox"
        aria-expanded="true"
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          background: 'var(--bg-surface)',
          overflow: 'hidden',
          maxWidth: '560px'
        }}
      >
        {/* SEARCH BAR */}
        <div className="command-palette-search-bar" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '0.85rem 1rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
          <input
            ref={inputRef}
            type="text"
            className="command-search-input"
            placeholder="Type a command, tenant, or user..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{ fontSize: '0.875rem' }}
          />
          {query ? (
            <button className="command-clear-btn" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          ) : (
            <kbd style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-muted)' }}>Esc</kbd>
          )}
        </div>

        {/* RESULTS LIST */}
        <div className="command-results-list" ref={listRef} style={{ maxHeight: '360px', padding: '0.5rem' }}>
          {filteredItems.length === 0 ? (
            <div className="command-no-results" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <Terminal size={22} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>No matching results for &ldquo;{query}&rdquo;</p>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Search across tenants, users, roles, or navigation routes.</small>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  className={`command-item ${isSelected ? 'command-item-active' : ''}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                    padding: '0.6rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>{item.title}</span>
                        {item.badge && (
                          <span className="badge badge-pastel-blue" style={{ fontSize: '0.62rem' }}>{item.badge}</span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>{item.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isSelected ? (
                      <kbd style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--primary)' }}>
                        ↵ Enter
                      </kbd>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)' }}>{item.category}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER SHORTCUTS */}
        <div className="command-palette-footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span><kbd style={{ padding: '0.05rem 0.3rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px' }}>↑</kbd> <kbd style={{ padding: '0.05rem 0.3rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px' }}>↓</kbd> Navigate</span>
            <span><kbd style={{ padding: '0.05rem 0.3rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px' }}>↵</kbd> Select</span>
            <span><kbd style={{ padding: '0.05rem 0.3rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px' }}>Esc</kbd> Close</span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
            OPS Super Admin
          </div>
        </div>
      </div>
    </div>
  );
}

