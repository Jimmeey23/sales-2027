import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, LayoutGrid, Milestone, Rows3, Tag } from 'lucide-react';
import { api } from '../api';
import { money } from '../types';

/* ─────────────────────────────────────────────────────────────────────────────
   The location switcher.

   Five ways to read the same list: a vertical timeline (the default), cards,
   a dense list, pills and a plain selector. The choice is remembered per
   browser, and the figures beside each location are that location's approved
   (or proposed) 2027 target, read once from the targets endpoint.
   ──────────────────────────────────────────────────────────────────────────── */

export type LocView = 'timeline' | 'cards' | 'list' | 'pills' | 'compact';

export interface LocOption {
  id: number | null;
  label: string;
  sub: string;
  code: string;
  color: string;
}

const VIEWS: Array<{ id: LocView; label: string; hint: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'timeline', label: 'Timeline', hint: 'Vertical timeline', icon: Milestone },
  { id: 'cards', label: 'Cards', hint: 'Card grid', icon: LayoutGrid },
  { id: 'list', label: 'List', hint: 'Dense list', icon: Rows3 },
  { id: 'pills', label: 'Pills', hint: 'Compact pills', icon: Tag },
  { id: 'compact', label: 'Selector', hint: 'Single selector', icon: ChevronsUpDown },
];

const STORAGE_KEY = 'p57-location-view';

export default function LocationSwitcher({
  options,
  value,
  onChange,
  year,
  disabledIds = [],
  headline,
}: {
  options: LocOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  year: number;
  disabledIds?: number[];
  headline?: string;
}) {
  const [view, setView] = useState<LocView>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as LocView | null;
      return stored && VIEWS.some(v => v.id === stored) ? stored : 'timeline';
    } catch {
      return 'timeline';
    }
  });
  const [targets, setTargets] = useState<Record<string, number>>({});
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    api<any>(`/targets?year=${year}`)
      .then(result => {
        const totals: Record<string, number> = {};
        for (const row of result?.rows || []) {
          const amount = Number(row.approved_target ?? row.proposed_target ?? 0);
          if (!Number.isFinite(amount)) continue;
          totals[row.studio] = (totals[row.studio] || 0) + amount;
        }
        setTargets(totals);
      })
      .catch(() => undefined);
  }, [year]);

  const choose = (id: number | null) => {
    if (id !== null && disabledIds.includes(id)) return;
    onChange(id);
  };
  const setViewAndStore = (next: LocView) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — the in-memory choice stands */
    }
  };

  const combined = useMemo(() => {
    const sum = Object.entries(targets)
      .filter(([name]) => options.some(o => o.id !== null && o.label === name))
      .reduce((total, [, amount]) => total + amount, 0);
    return sum || null;
  }, [targets, options]);

  const figureFor = (option: LocOption) => {
    if (option.id === null) return combined ? money(combined, true) : null;
    const amount = targets[option.label];
    return amount ? money(amount, true) : null;
  };

  const isActive = (option: LocOption) => value === option.id;
  const isDisabled = (option: LocOption) => option.id !== null && disabledIds.includes(option.id);
  const activeOption = options.find(isActive) || options[0];

  return (
    <section className={`ws-loc-panel is-${view}`} aria-label="Studio locations">
      <div className="ws-loc-panel-head">
        <div className="ws-loc-panel-title">
          <span className="ws-loc-eyebrow">Locations</span>
          {view !== 'compact' && (
            <strong>{headline || `${options.length - (options[0]?.id === null ? 1 : 0)} studios · ${year}`}</strong>
          )}
        </div>
        <div className="ws-loc-views" role="group" aria-label="Location view">
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? 'is-on' : ''}
                aria-pressed={view === v.id}
                title={`${v.hint} view`}
                aria-label={`${v.hint} view`}
                onClick={() => setViewAndStore(v.id)}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>
      </div>

      {view === 'timeline' && (
        <ol className="lc-timeline" aria-label="Choose a location">
          {options.map((option, index) => (
            <li
              key={option.code}
              className={`${isActive(option) ? 'is-active' : ''} ${isDisabled(option) ? 'is-disabled' : ''}`}
              style={{ '--loc': option.color, '--i': index } as React.CSSProperties}
            >
              <button
                type="button"
                aria-current={isActive(option) ? 'true' : undefined}
                disabled={isDisabled(option)}
                onClick={() => choose(option.id)}
              >
                <span className="lc-rail" aria-hidden="true">
                  <i className="lc-dot" />
                </span>
                <span className="lc-copy">
                  <strong>{option.label}</strong>
                  <small>{option.sub}</small>
                </span>
                <span className="lc-meta">
                  {figureFor(option) && <em>{figureFor(option)}</em>}
                  {isActive(option) && <Check size={12} aria-hidden="true" />}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {view === 'cards' && (
        <div className="lc-cards" aria-label="Choose a location">
          {options.map(option => (
            <button
              key={option.code}
              type="button"
              className={`lc-card ${isActive(option) ? 'is-active' : ''}`}
              style={{ '--loc': option.color } as React.CSSProperties}
              disabled={isDisabled(option)}
              aria-current={isActive(option) ? 'true' : undefined}
              onClick={() => choose(option.id)}
            >
              <span className="lc-card-code">{option.code}</span>
              <span className="lc-card-copy">
                <strong>{option.label}</strong>
                <small>{option.sub}</small>
              </span>
              {figureFor(option) && <em>{figureFor(option)}</em>}
            </button>
          ))}
        </div>
      )}

      {view === 'list' && (
        <ul className="lc-list" aria-label="Choose a location">
          {options.map(option => (
            <li
              key={option.code}
              className={isActive(option) ? 'is-active' : ''}
              style={{ '--loc': option.color } as React.CSSProperties}
            >
              <button
                type="button"
                disabled={isDisabled(option)}
                aria-current={isActive(option) ? 'true' : undefined}
                onClick={() => choose(option.id)}
              >
                <i />
                <strong>{option.label}</strong>
                <small>{option.sub}</small>
                {figureFor(option) && <em>{figureFor(option)}</em>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {view === 'pills' && (
        <div className="lc-pills" aria-label="Choose a location">
          {options.map(option => (
            <button
              key={option.code}
              type="button"
              className={isActive(option) ? 'is-active' : ''}
              style={{ '--loc': option.color } as React.CSSProperties}
              disabled={isDisabled(option)}
              aria-pressed={isActive(option)}
              onClick={() => choose(option.id)}
            >
              <i />
              {option.id === null ? 'All' : option.label.replace(' House', '')}
            </button>
          ))}
        </div>
      )}

      {view === 'compact' && (
        <label className="lc-select">
          <span className="sr-only">Studio location</span>
          <select
            value={value === null ? 'all' : String(value)}
            onChange={event => choose(event.target.value === 'all' ? null : Number(event.target.value))}
          >
            {options.map(option => (
              <option
                key={option.code}
                value={option.id === null ? 'all' : String(option.id)}
                disabled={isDisabled(option)}
              >
                {option.label} · {option.sub}
              </option>
            ))}
          </select>
          <ChevronsUpDown size={13} aria-hidden="true" />
        </label>
      )}

      {view === 'compact' && activeOption && (
        <span className="lc-select-current" style={{ '--loc': activeOption.color } as React.CSSProperties}>
          <i />
          {activeOption.label}
        </span>
      )}
    </section>
  );
}
