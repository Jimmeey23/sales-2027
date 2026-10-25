import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bot, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, X } from 'lucide-react';
import BrandMark from './BrandMark';
import CommandPalette from './CommandPalette';
import CopilotDrawer from './CopilotDrawer';
import { useApp } from '../App';
import { Select } from './ui';
import { ALL_LOCATIONS_COLOR, LOCATION_COLORS, accentFor, planningLocations } from '../data/locations';
import { NAV, linkMatches, locate } from '../app/navigation';
import { post } from '../api';

export default function Layout() {
  const { boot, studioId, setStudioId, year, setYear, can, dataVersion } = useApp();
  const [copilotOpen, setCopilotOpen] = useState(false),
    [cmdOpen, setCmdOpen] = useState(false),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [collapsed, setCollapsed] = useState(() => {
      try {
        return localStorage.getItem('p57-sidebar') === 'collapsed';
      } catch {
        return false;
      }
    });
  const toggleCollapsed = () =>
    setCollapsed(c => {
      try {
        localStorage.setItem('p57-sidebar', c ? 'open' : 'collapsed');
      } catch {
        /* storage unavailable — keep the in-memory choice */
      }
      return !c;
    });
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => setSidebarOpen(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const { section, link: current } = locate(location.pathname);
  // The current section opens with the route; clicking an open section's header folds it away.
  const [openId, setOpenId] = useState<string | null>(section?.id ?? null);
  useEffect(() => setOpenId(section?.id ?? null), [section?.id]);
  const sections = NAV.map(item => ({
    ...item,
    links: item.links.filter(l => !l.permission || can(l.permission)),
  })).filter(item => item.id === 'overview' || item.links.length);
  const scoped = ['studio_manager', 'sales_associate'].includes(boot.user.role);
  const locations = planningLocations(boot.studios);
  const active = boot.studios.find(s => s.id === studioId);
  const yearOptions = [...new Set([...(boot.years || []), boot.planningYear])].sort();
  const signOut = async () => {
    await post('/auth/logout', {}).catch(() => undefined);
    window.location.reload();
  };
  const tabs = [
    ...locations
      .filter(s => !scoped || s.id === boot.user.assigned_studio_id)
      .map(s => ({ id: s.id as number | null, label: s.name, sub: s.city, color: LOCATION_COLORS[s.name] })),
    ...(scoped ? [] : [{ id: null, label: 'All locations', sub: 'Combined', color: ALL_LOCATIONS_COLOR }]),
  ];
  return (
    <div
      className={`ws-shell accented ${collapsed ? 'sidebar-collapsed' : ''}`}
      style={{ '--a1': accentFor(boot.studios.find(s => s.id === studioId)?.name) } as React.CSSProperties}
    >
      {sidebarOpen && (
        <button className="ws-sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`ws-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="ws-sidebar-brand">
          <BrandMark />
          <div className="ws-brand-text">
            <strong>Sales Intelligence</strong>
            <span>COMMERCIAL OS</span>
          </div>
          <button
            className="ws-collapse"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapsed}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button className="ws-sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div
          className="ws-sidebar-context"
          style={{ '--loc': active ? LOCATION_COLORS[active.name] || '#c7e17c' : '#c7e17c' } as React.CSSProperties}
        >
          <span>
            Workspace <em>{year}</em>
          </span>
          <strong>P57 Sales Plan</strong>
          <small>
            <i />
            {active ? `${active.name} · ${active.city}` : 'All locations combined'}
          </small>
        </div>
        <span className="ws-sidebar-label">Menu</span>
        <nav className="ws-sections" aria-label="Workspace navigation">
          {sections.map(item => {
            const Icon = item.icon;
            const isCurrent = section?.id === item.id,
              open = openId === item.id && item.links.length > 0;
            return (
              <div className={`ws-section-group ${open ? 'open' : ''}`} key={item.id}>
                <NavLink
                  to={item.to}
                  end
                  className={isCurrent ? 'active' : ''}
                  title={collapsed ? item.label : undefined}
                  aria-expanded={item.links.length ? open : undefined}
                  onClick={e => {
                    if (collapsed) return;
                    if (isCurrent && item.links.length) {
                      e.preventDefault();
                      setOpenId(open ? null : item.id);
                    } else setOpenId(item.id);
                  }}
                >
                  <span className="ws-nav-icon">
                    <Icon size={16} />
                  </span>
                  <span className="ws-nav-label">{item.label}</span>
                  {item.links.length > 0 && <ChevronDown size={15} className="ws-nav-caret" />}
                </NavLink>
                {item.links.length > 0 && (
                  <div className="ws-subnav-wrap" aria-hidden={!open}>
                    <div className="ws-subnav" aria-label={item.label}>
                      {item.links.map(l => (
                        <NavLink
                          key={l.to}
                          to={l.to}
                          end
                          tabIndex={open ? 0 : -1}
                          className={linkMatches(location.pathname, l) ? 'active' : ''}
                        >
                          {l.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="ws-sidebar-foot">
          <span className="ws-sidebar-sync">
            <i /> Actuals through {boot.coverage.sales.last || '—'}
          </span>
          <div className="ws-sidebar-user">
            <span className="ws-avatar">
              {boot.user.name
                .split(' ')
                .map((w: string) => w[0])
                .join('')
                .slice(0, 2)}
            </span>
            <div>
              <strong>{boot.user.name}</strong>
              <small>{boot.user.role.replaceAll('_', ' ')}</small>
            </div>
          </div>
        </div>
      </aside>
      <header className="ws-header">
        <div className="ws-topline">
          <button className="ws-menu-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="ws-topbar-title">
            <span>
              {section?.label || 'Overview'}
              {active && (
                <em style={{ '--loc': LOCATION_COLORS[active.name] } as React.CSSProperties}>
                  <i />
                  {active.name}
                </em>
              )}
            </span>
            <strong>{current?.label || section?.label || `P57 Sales Plan ${year}`}</strong>
          </div>
          <div className="ws-controls">
            <button
              type="button"
              className="ws-cmd-trigger"
              onClick={() => setCmdOpen(true)}
              title="Quick jump to any month, studio, or page (⌘K)"
            >
              <Search size={14} />
              <span>Jump…</span>
              <kbd>⌘K</kbd>
            </button>
            <label className="ws-control">
              <span>Year</span>
              <Select value={year} onChange={e => setYear(Number(e.target.value))}>
                {yearOptions.map(y => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </label>
            <button className="ws-copilot" onClick={() => setCopilotOpen(true)}>
              <Bot size={17} />
              <span>Ask Copilot</span>
            </button>
            <button className="ws-new" onClick={() => navigate('/offers?view=manual')} title="Create an offer">
              <Plus size={17} />
              <span>New offer</span>
            </button>
            <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={signOut}>
              <LogOut size={15} />
            </button>
            <span className="ws-avatar" title={`${boot.user.name} · ${boot.user.role.replaceAll('_', ' ')}`}>
              {boot.user.name
                .split(' ')
                .map(x => x[0])
                .slice(0, 2)
                .join('')}
            </span>
          </div>
        </div>
        {section?.locationAware !== false && (
          <nav
            className="ws-locations"
            aria-label="Locations"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map(tab => {
              const disabled = scoped && tab.id !== boot.user.assigned_studio_id;
              return (
                <button
                  key={tab.label}
                  disabled={disabled}
                  className={studioId === tab.id ? 'active' : ''}
                  style={{ '--loc': tab.color } as React.CSSProperties}
                  onClick={() => setStudioId(tab.id)}
                >
                  <i>
                    {tab.id === null
                      ? 'ALL'
                      : tab.label
                          .split(/[\s-]+/)
                          .map(w => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                  </i>
                  <span>
                    <strong>{tab.label}</strong>
                    <small>{tab.sub}</small>
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </header>
      <main className="ws-content" key={dataVersion}>
        <Outlet />
      </main>
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
      {copilotOpen && <CopilotDrawer onClose={() => setCopilotOpen(false)} />}
    </div>
  );
}
