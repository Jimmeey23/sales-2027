import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from 'lucide-react';
import BrandMark from './BrandMark';
import LocationSwitcher from './LocationSwitcher';
import CommandPalette from './CommandPalette';
import CopilotDrawer from './CopilotDrawer';
import { useApp } from '../App';
import { Select } from './ui';
import { ALL_LOCATIONS_COLOR, LOCATION_COLORS, accentFor, planningLocations } from '../data/locations';
import { NAV, linkMatches, locate } from '../app/navigation';
import { post } from '../api';

export default function Layout() {
  const { boot, studioId, setStudioId, year, setYear, can, dataVersion, adminUnlocked, unlockAdmin, lockAdmin, toast } =
    useApp();
  const [copilotOpen, setCopilotOpen] = useState(false),
    [cmdOpen, setCmdOpen] = useState(false),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [adminPasscode, setAdminPasscode] = useState(''),
    [locOpen, setLocOpen] = useState(false),
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
  useEffect(() => setLocOpen(false), [location.pathname]);
  useEffect(() => {
    if (!locOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLocOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locOpen]);
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
  const scoped = ['studio_manager', 'sales_associate'].includes(boot.user.role) && !adminUnlocked;
  // The passcode is offered to the people it changes something for: the administrator, whose
  // editing controls it uncovers, and the scoped studio roles, whose location limits it lifts.
  const adminGateVisible =
    boot.user.role === 'administrator' || ['studio_manager', 'sales_associate'].includes(boot.user.role);
  const locations = planningLocations(boot.studios);
  const active = boot.studios.find(s => s.id === studioId);
  const yearOptions = [...new Set([...(boot.years || []), boot.planningYear])].sort();
  const signOut = async () => {
    await post('/auth/logout', {}).catch(() => undefined);
    window.location.reload();
  };
  const submitAdminPasscode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await unlockAdmin(adminPasscode);
      setAdminPasscode('');
      toast('Editing unlocked for this session.');
    } catch (error: any) {
      setAdminPasscode('');
      toast(error.message || 'Could not unlock admin edit mode.', 'error');
    }
  };
  const studioCode = (name: string) =>
    name
      .split(/[\s-]+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  const locOptions = [
    ...(scoped
      ? []
      : [
          {
            id: null as number | null,
            label: 'All locations',
            sub: `${locations.length} studios · combined`,
            code: 'ALL',
            color: ALL_LOCATIONS_COLOR,
          },
        ]),
    ...locations
      .filter(s => !scoped || s.id === boot.user.assigned_studio_id)
      .map(s => ({
        id: s.id as number | null,
        label: s.name,
        sub: s.name === 'Pop-up' ? `${s.city} · 2 venues` : s.city,
        code: studioCode(s.name),
        color: LOCATION_COLORS[s.name],
      })),
  ];
  const locDisabled = scoped
    ? locations.filter(s => s.id !== boot.user.assigned_studio_id).map(s => s.id as number)
    : [];
  const activeLoc = locOptions.find(o => o.id === studioId) || locOptions[0];
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
          style={{ '--loc': active ? LOCATION_COLORS[active.name] || '#e6d5ae' : '#e6d5ae' } as React.CSSProperties}
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
            {can('offer_create') && (
              <button className="ws-new" onClick={() => navigate('/offers?view=manual')} title="Create an offer">
                <Plus size={17} />
                <span>New offer</span>
              </button>
            )}
            {adminGateVisible && adminUnlocked ? (
              <button className="ws-admin-status" title="Lock editing again" onClick={() => void lockAdmin()}>
                <LockKeyhole size={15} />
                <span>Editing · Lock</span>
              </button>
            ) : adminGateVisible ? (
              <form
                className="ws-admin-gate"
                onSubmit={submitAdminPasscode}
                title="Enter the passcode to show the editing controls"
              >
                <LockKeyhole size={14} aria-hidden="true" />
                <input
                  aria-label="Editing passcode"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={adminPasscode}
                  onChange={event => setAdminPasscode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Edit code"
                />
                <button type="submit" disabled={adminPasscode.length !== 4}>
                  Unlock
                </button>
              </form>
            ) : null}
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
          <nav className={`ws-locations ${locOpen ? 'is-open' : ''}`} aria-label="Locations">
            <div className="ws-loc-rail" aria-hidden="true">
              <MapPin size={12} />
              <span>Locations</span>
            </div>
            <button
              type="button"
              className="ws-loc-trigger"
              aria-haspopup="dialog"
              aria-expanded={locOpen}
              onClick={() => setLocOpen(v => !v)}
              style={{ '--loc': activeLoc?.color || '#e6d5ae' } as React.CSSProperties}
            >
              <i className="ws-loc-badge">{activeLoc?.code || 'ALL'}</i>
              <span className="ws-loc-copy">
                <strong>{activeLoc?.label || 'All locations'}</strong>
                <small>{activeLoc?.sub || `${locations.length} studios · combined`}</small>
              </span>
              <ChevronDown size={14} className="ws-loc-caret" aria-hidden="true" />
            </button>
            <span className="ws-loc-note">
              <i aria-hidden="true" />
              5 views · vertical timeline
            </span>
            {locOpen && (
              <>
                <button
                  className="ws-loc-scrim"
                  aria-label="Close location switcher"
                  onClick={() => setLocOpen(false)}
                />
                <div className="ws-loc-pop" role="dialog" aria-label="Switch location">
                  <LocationSwitcher
                    options={locOptions}
                    value={studioId}
                    year={year}
                    disabledIds={locDisabled}
                    onChange={id => {
                      setStudioId(id);
                      setLocOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </nav>
        )}
      </header>
      <main className="ws-content" key={dataVersion}>
        <Outlet />
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onOpenCopilot={() => setCopilotOpen(true)} />
      {copilotOpen && <CopilotDrawer onClose={() => setCopilotOpen(false)} />}
    </div>
  );
}
