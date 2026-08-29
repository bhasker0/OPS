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
  Activity
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

  if (!isOpen) return null;

  // Build searchable items
  const navigationItems = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Global Analytics Dashboard',
      subtitle: 'Executive metrics, revenue ledger, and system health',
      icon: <TrendingUp size={16} color="#4f46e5" />,
      action: () => {
        onNavigateTab('global_dashboard');
        onClose();
      },
    },
    {
      id: 'nav-companies',
      category: 'Navigation',
      title: 'Companies Directory',
      subtitle: `Browse all ${companies.length} tenant organizations`,
      icon: <Building size={16} color="#4f46e5" />,
      action: () => {
        onNavigateTab('companies');
        onClose();
      },
    },
    {
      id: 'nav-users',
      category: 'Navigation',
      title: 'User Management',
      subtitle: `Manage ${users.length} user accounts & security roles`,
      icon: <Users size={16} color="#4f46e5" />,
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
      icon: <Lock size={16} color="#4f46e5" />,
      action: () => {
        onNavigateTab('roles');
        onClose();
      },
    },
    {
      id: 'nav-subscriptions',
      category: 'Navigation',
      title: 'Subscription Tiers & Tenant Quotas',
      subtitle: 'Manage pricing tiers, machine & user seat quotas, and plan assignments',
      icon: <TrendingUp size={16} color="#4f46e5" />,
      action: () => {
        onNavigateTab('subscriptions');
        onClose();
      },
    },
    {
      id: 'nav-health',
      category: 'Navigation',
      title: 'System Health Telemetry & Sync DLQ',
      subtitle: 'Real-time database latency heartbeats, memory usage, and failed event replays',
      icon: <Activity size={16} color="#10b981" />,
      action: () => {
        onNavigateTab('system_health');
        onClose();
      },
    },
    {
      id: 'nav-audit',
      category: 'Navigation',
      title: 'Audit Trail Logs',
      subtitle: 'MongoDB real-time change data & compliance events',
      icon: <FileText size={16} color="#4f46e5" />,
      action: () => {
        onNavigateTab('global_audit');
        onClose();
      },
    },
  ];

  const quickActions = [
    {
      id: 'act-register-company',
      category: 'Quick Actions',
      title: 'Provision New Tenant Company',
      subtitle: 'Launch 4-step onboarding wizard with GSTIN validation',
      icon: <Plus size={16} color="#10b981" />,
      action: () => {
        if (onRegisterCompany) onRegisterCompany();
        onClose();
      },
    },
    {
      id: 'act-create-user',
      category: 'Quick Actions',
      title: 'Create User Account',
      subtitle: 'Provision a new tenant operator or ops super admin',
      icon: <Users size={16} color="#10b981" />,
      action: () => {
        if (onCreateUser) onCreateUser();
        onClose();
      },
    },
  ];

  const companyItems = companies.map((c) => ({
    id: `comp-${c.id}`,
    category: 'Tenants & Companies',
    title: c.name,
    subtitle: `Code: ${c.code} • GSTIN: ${c.gstin || 'N/A'} • Status: ${c.status || 'ACTIVE'}`,
    icon: <Headphones size={16} color="#4338ca" />,
    badge: c.isSeed ? '000 SEED' : c.status || 'ACTIVE',
    action: () => {
      if (onSelectCompany) onSelectCompany(c);
      onClose();
    },
  }));

  const userItems = users.map((u) => ({
    id: `user-${u.id}`,
    category: 'Users',
    title: u.name,
    subtitle: `${u.email} • ${u.company ? u.company.name : 'Global Admin'} • Role: ${u.role ? u.role.name : 'Default'}`,
    icon: <Users size={16} color="#64748b" />,
    badge: u.isInternalOps ? 'OPS ADMIN' : 'TENANT',
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
          item.category.toLowerCase().includes(q)
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

  return (
    <div className="modal-backdrop command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette-container"
        onClick={(e) => e.stopPropagation()}
        role="combobox"
        aria-expanded="true"
      >
        {/* SEARCH BAR */}
        <div className="command-palette-search-bar">
          <Search size={18} className="command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-search-input"
            placeholder="Type a command, jump to company, user, or page..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {query ? (
            <button className="command-clear-btn" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          ) : (
            <kbd className="command-kbd-badge">ESC</kbd>
          )}
        </div>

        {/* RESULTS LIST */}
        <div className="command-results-list" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="command-no-results">
              <Sparkles size={24} color="#94a3b8" />
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <small>Try searching by company name, code, user email, or page name.</small>
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
                >
                  <div className="command-item-icon">{item.icon}</div>
                  <div className="command-item-text">
                    <div className="command-item-title-row">
                      <span className="command-item-title">{item.title}</span>
                      {item.badge && (
                        <span className="command-item-badge">{item.badge}</span>
                      )}
                    </div>
                    {item.subtitle && (
                      <div className="command-item-subtitle">{item.subtitle}</div>
                    )}
                  </div>
                  <div className="command-item-action-hint">
                    {isSelected ? (
                      <span className="command-enter-hint">
                        Select <CornerDownLeft size={11} />
                      </span>
                    ) : (
                      <span className="command-category-tag">{item.category}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER SHORTCUTS */}
        <div className="command-palette-footer">
          <div className="command-shortcut-group">
            <span className="command-shortcut-pill">
              <kbd>↑</kbd> <kbd>↓</kbd> Navigate
            </span>
            <span className="command-shortcut-pill">
              <kbd>↵</kbd> Select
            </span>
            <span className="command-shortcut-pill">
              <kbd>ESC</kbd> Close
            </span>
          </div>
          <div className="command-footer-brand">
            OPS SaaS Quick Jump
          </div>
        </div>
      </div>
    </div>
  );
}
