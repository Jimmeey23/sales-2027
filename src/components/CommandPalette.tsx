import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Calendar, Compass, MapPin, Plus, Search, Sparkles, X } from 'lucide-react';
import { useApp } from '../App';
import { NAV } from '../app/navigation';
import { ALL_LOCATIONS_COLOR, LOCATION_COLORS, planningLocations } from '../data/locations';
import { keyDatesFor } from '../data/keyDates';
import { MONTH_THEMES } from '../data/planDefaults';
import { MONTHS } from '../types';

interface CmdItem {
  id: string;
  group: string;
  label: string;
  sub: string;
  keywords: string;
  badge?: string;
  dotColor?: string;
  icon: React.ComponentType<{ size?: number }>;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  onOpenCopilot,
}: {
  open: boolean;
  onClose: () => void;
  onOpenCopilot: () => void;
}) {
  const { boot, studioId, setStudioId, year, can } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const scoped = ['studio_manager', 'sales_associate'].includes(boot.user.role);
  const locations = planningLocations(boot.studios);

  const items = useMemo<CmdItem[]>(() => {
    const closeAnd = (fn: () => void) => () => {
      onClose();
      fn();
    };

    const monthItems: CmdItem[] = MONTHS.map((name, idx) => {
      const m = idx + 1;
      const theme = MONTH_THEMES[idx] || '';
      const fests = keyDatesFor(year, m)
        .map(d => d.name)
        .join(' ');
      return {
        id: `month-${m}`,
        group: `${year} Monthly Plans`,
        label: `${name} ${year}`,
        sub: theme,
        keywords: `${name} ${name.slice(0, 3)} q${Math.ceil(m / 3)} ${theme} ${fests} month plan offers`,
        badge: `Q${Math.ceil(m / 3)}`,
        icon: Calendar,
        run: closeAnd(() => navigate(`/sales-plan/targets?month=${m}`)),
      };
    });

    const locItems: CmdItem[] = [
      ...locations
        .filter(s => !scoped || s.id === boot.user.assigned_studio_id)
        .map(s => ({
          id: `loc-${s.id}`,
          group: 'Switch Location',
          label: s.name,
          sub: `${s.city} studio filter`,
          keywords: `location studio ${s.name} ${s.city}`,
          badge: studioId === s.id ? 'Active' : undefined,
          dotColor: LOCATION_COLORS[s.name],
          icon: MapPin,
          run: closeAnd(() => setStudioId(s.id)),
        })),
      ...(scoped
        ? []
        : [
            {
              id: 'loc-all',
              group: 'Switch Location',
              label: 'All locations combined',
              sub: 'Roll up Mumbai & Bengaluru studios',
              keywords: 'all locations combined rollup network',
              badge: studioId === null ? 'Active' : undefined,
              dotColor: ALL_LOCATIONS_COLOR,
              icon: MapPin,
              run: closeAnd(() => setStudioId(null)),
            },
          ]),
    ];

    const actionItems: CmdItem[] = [
      {
        id: 'act-copilot',
        group: 'Quick Actions',
        label: 'Ask Commercial Copilot',
        sub: 'Query targets, funnel gaps, and offer ideas with AI',
        keywords: 'ai copilot assistant ask chat',
        icon: Bot,
        run: closeAnd(onOpenCopilot),
      },
      {
        id: 'act-new-offer',
        group: 'Quick Actions',
        label: 'Create a new offer',
        sub: 'Open manual offer builder',
        keywords: 'new create build offer promotion',
        icon: Plus,
        run: closeAnd(() => navigate('/offers?view=manual')),
      },
      {
        id: 'act-gap-offer',
        group: 'Quick Actions',
        label: 'Fill a revenue gap',
        sub: 'Generate offers sized to close a monthly shortfall',
        keywords: 'gap shortfall cover revenue target offer',
        icon: Sparkles,
        run: closeAnd(() => navigate('/offers?view=gap')),
      },
    ];

    const navItems: CmdItem[] = [];
    for (const sec of NAV) {
      if (sec.links.length === 0) {
        navItems.push({
          id: `nav-${sec.id}`,
          group: 'Workspace Pages',
          label: sec.label,
          sub: 'Executive dashboard & studio health',
          keywords: `${sec.label} home dashboard overview`,
          icon: Compass,
          run: closeAnd(() => navigate(sec.to)),
        });
      }
      for (const link of sec.links) {
        if (link.permission && !can(link.permission)) continue;
        navItems.push({
          id: `nav-${link.to}`,
          group: 'Workspace Pages',
          label: link.label,
          sub: link.detail || sec.label,
          keywords: `${sec.label} ${link.label} ${link.detail || ''}`,
          icon: sec.icon,
          run: closeAnd(() => navigate(link.to)),
        });
      }
    }

    return [...monthItems, ...locItems, ...actionItems, ...navItems];
  }, [boot.user.assigned_studio_id, boot.user.role, can, locations, navigate, onClose, onOpenCopilot, scoped, setStudioId, studioId, year]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Curated default view: quick actions + locations + first 6 months + core pages
      return [
        ...items.filter(i => i.group === 'Quick Actions'),
        ...items.filter(i => i.group === `${year} Monthly Plans`),
        ...items.filter(i => i.group === 'Switch Location'),
        ...items.filter(i => i.group === 'Workspace Pages'),
      ];
    }
    const terms = q.split(/\s+/);
    return items.filter(item => {
      const hay = `${item.label} ${item.sub} ${item.keywords}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }, [items, query, year]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault();
        filtered[activeIdx].run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, filtered, onClose, open]);

  if (!open) return null;

  const grouped: Array<{ group: string; list: Array<{ item: CmdItem; index: number }> }> = [];
  filtered.forEach((item, index) => {
    let bucket = grouped.find(g => g.group === item.group);
    if (!bucket) {
      bucket = { group: item.group, list: [] };
      grouped.push(bucket);
    }
    bucket.list.push({ item, index });
  });

  return (
    <div className="cmd-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="cmd-dialog" role="dialog" aria-modal="true" aria-label="Quick jump command palette">
        <div className="cmd-search">
          <Search size={17} className="cmd-search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Jump to any ${year} month, festival (e.g. Diwali), studio, or page…`}
            aria-label="Search months, locations, and pages"
          />
          {query ? (
            <button type="button" className="cmd-clear" onClick={() => setQuery('')} aria-label="Clear query">
              <X size={14} />
            </button>
          ) : (
            <kbd className="cmd-kbd">ESC</kbd>
          )}
        </div>

        <div className="cmd-results">
          {grouped.length === 0 ? (
            <div className="cmd-empty">No matching months, locations, or pages for “{query}”.</div>
          ) : (
            grouped.map(g => (
              <div key={g.group} className="cmd-group">
                <span className="cmd-group-label">{g.group}</span>
                {g.list.map(({ item, index }) => {
                  const Icon = item.icon;
                  const active = index === activeIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`cmd-item${active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIdx(index)}
                      onClick={item.run}
                    >
                      <span className="cmd-item-icon">
                        {item.dotColor ? (
                          <i className="cmd-loc-dot" style={{ background: item.dotColor }} />
                        ) : (
                          <Icon size={15} />
                        )}
                      </span>
                      <span className="cmd-item-text">
                        <strong>{item.label}</strong>
                        <small>{item.sub}</small>
                      </span>
                      {item.badge && <em className="cmd-item-badge">{item.badge}</em>}
                      <ArrowRight size={14} className="cmd-item-arrow" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer className="cmd-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>⌘K</kbd> toggle anywhere
          </span>
        </footer>
      </div>
    </div>
  );
}
