import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bot, LogOut, Menu, Plus, X } from 'lucide-react';
import BrandMark from './BrandMark';
import CopilotDrawer from './CopilotDrawer';
import { useApp } from '../App';
import { Select } from './ui';
import { LOCATION_COLORS, planningLocations } from '../data/locations';
import { NAV, linkMatches, locate } from '../app/navigation';
import { post } from '../api';

export default function Layout() {
  const { boot, studioId, setStudioId, year, setYear, can, dataVersion } = useApp();
  const [copilotOpen, setCopilotOpen] = useState(false),
    [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => setSidebarOpen(false), [location.pathname]);
  const { section, link: current } = locate(location.pathname);
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
    ...(scoped ? [] : [{ id: null, label: 'All locations', sub: 'Combined', color: '#211e2b' }]),
  ];
  return (
    <div className="ws-shell">
      {sidebarOpen && (
        <button className="ws-sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`ws-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="ws-sidebar-brand">
          <BrandMark />
          <div>
            <strong>Sales Intelligence</strong>
            <span>COMMERCIAL OS</span>
          </div>
          <button className="ws-sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="ws-sidebar-context">
          <span>WORKSPACE</span>
          <strong>P57 Sales Plan {year}</strong>
          <small>{active ? `${active.name} · ${active.city}` : 'All locations combined'}</small>
        </div>
        <nav className="ws-sections" aria-label="Workspace navigation">
          {sections.map(item => {
            const Icon = item.icon;
            const expanded = section?.id === item.id;
            return (
              <div className="ws-section-group" key={item.id}>
                <NavLink to={item.to} end className={expanded ? 'active' : ''}>
                  <Icon size={17} />
                  {item.label}
                </NavLink>
                {expanded && item.links.length > 0 && (
                  <div className="ws-subnav" aria-label={item.label}>
                    {item.links.map(l => (
                      <NavLink key={l.to} to={l.to} end className={linkMatches(location.pathname, l) ? 'active' : ''}>
                        {l.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="ws-sidebar-foot">Actuals through {boot.coverage.sales.last || '—'}</div>
      </aside>
      <header className="ws-header">
        <div className="ws-topline">
          <button className="ws-menu-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="ws-topbar-title">
            <strong>P57 Sales Plan {year}</strong>
            <span>{active ? `${active.name} · ${active.city}` : 'All locations combined'}</span>
          </div>
          <div className="ws-controls">
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
                  <i />
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
        <nav className="ws-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Overview</Link>
          {section && section.id !== 'overview' && (
            <>
              <span>/</span>
              <Link to={section.to}>{section.label}</Link>
              {current && (
                <>
                  <span>/</span>
                  <strong>{current.label}</strong>
                </>
              )}
            </>
          )}
        </nav>
        <Outlet />
      </main>
      {copilotOpen && <CopilotDrawer onClose={() => setCopilotOpen(false)} />}
    </div>
  );
}
