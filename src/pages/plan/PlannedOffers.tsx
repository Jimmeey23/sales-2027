import React from 'react';
import { ArrowUpRight, CalendarHeart, Plus, StickyNote, Tag, ChevronDown, Download, FileJson, FileSpreadsheet, FileText, Gift, Printer, KeyRound, RefreshCcw, Search, Sparkles, UserPlus, Users, X, Zap } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../App';
import { Loading } from '../../components/ui';
import ReceiptOfferArt from '../../components/ReceiptOfferArt';
import '../../styles/planned-offers.css';

/* Planned offers: every offer in the year's month plans, on one page. Same-named offers across
   locations are folded into one card with a per-location split, so the year reads as a set of
   ideas rather than 200 rows. Offer terms are edited in the month plans; quick notes and tags are
   edited right on the card and saved to every location's copy of the offer. */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STUDIOS = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];
const SHORT: Record<string, string> = { 'Kemps Corner': 'KC', Bandra: 'BA', 'Kenkere House': 'KH', 'Pop-up': 'PU' };

type Kind = 'new' | 'winback' | 'renewal' | 'early' | 'upsell' | 'flash' | 'referral' | 'other';
const KINDS: Record<Kind, { label: string; brief: string; icon: React.ReactNode }> = {
  new: { label: 'New clients', brief: 'Turns a first class into a first purchase.', icon: <UserPlus size={14} /> },
  winback: { label: 'Win-back', brief: 'Brings lapsed clients back on a committed plan.', icon: <RefreshCcw size={14} /> },
  renewal: { label: 'Renewal', brief: 'Keeps members renewing, ideally on a longer plan.', icon: <CalendarHeart size={14} /> },
  early: { label: 'Early renewal', brief: 'Pulls next months’ renewals into this one.', icon: <Sparkles size={14} /> },
  upsell: { label: 'Upsell', brief: 'Moves members to a bigger or longer product.', icon: <KeyRound size={14} /> },
  flash: { label: 'Flash', brief: 'A short, loud window that drives a spike.', icon: <Zap size={14} /> },
  referral: { label: 'Referral', brief: 'Pays members for friends who buy.', icon: <Users size={14} /> },
  other: { label: 'Other', brief: 'Gifting, corporate and seasonal plays.', icon: <Gift size={14} /> },
};
const kindOf = (o: any): Kind => {
  const s = String(o.plan_slot || '').toLowerCase();
  if (/newcomer|new_client/.test(s)) return 'new';
  if (/lapsed|reactivation|winback/.test(s)) return 'winback';
  if (/early/.test(s)) return 'early';
  if (/renewal|retention/.test(s)) return 'renewal';
  if (/upsell|upgrade/.test(s)) return 'upsell';
  if (/flash|spot/.test(s)) return 'flash';
  if (/referral/.test(s)) return 'referral';
  return 'other';
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const lakh = (n: number) => `₹${(n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;

interface Group {
  key: string;
  ids: number[];
  notes: string;
  tags: string[];
  month: number;
  name: string;
  kind: Kind;
  headline: string;
  simple: string;
  objective: string;
  benefit: string;
  audience: string;
  when: string;
  rules: string;
  rationale: string;
  revenue: number;
  buyers: number;
  discount: number;
  rows: { studio: string; price: number; buyers: number; revenue: number; discount: number }[];
}


type Row = Record<string, string | number>;
const COLUMNS = ['Month', 'Offer', 'Type', 'Location', 'The offer', 'Who it is for', 'When', 'Price (₹)', 'Effective discount (%)', 'Buyers', 'Planned revenue (₹)', 'Full mechanics', 'Why we run it', 'Rules', 'The data behind it'];
function exportRows(list: Group[]): Row[] {
  return list.flatMap(g =>
    g.rows.map(r => ({
      Month: MONTHS[g.month - 1],
      Offer: g.name,
      Type: KINDS[g.kind].label,
      Location: r.studio,
      'The offer': g.simple,
      'Who it is for': g.audience,
      When: g.when,
      'Price (₹)': Math.round(r.price),
      'Effective discount (%)': r.discount,
      Buyers: r.buyers,
      'Planned revenue (₹)': Math.round(r.revenue),
      'Full mechanics': g.benefit,
      'Why we run it': g.objective,
      Rules: g.rules,
      'The data behind it': g.rationale,
    })),
  );
}
function save(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
async function exportAs(kind: 'xlsx' | 'csv' | 'md' | 'json' | 'pdf', list: Group[], base: string) {
  const rows = exportRows(list);
  if (kind === 'pdf') return window.print();
  if (kind === 'csv') {
    const csv = [COLUMNS.map(cell).join(','), ...rows.map(r => COLUMNS.map(c => cell(r[c])).join(','))].join('\n');
    return save(`${base}.csv`, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  }
  if (kind === 'json') return save(`${base}.json`, new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }));
  if (kind === 'md') {
    const md = [`# ${base.replace(/-/g, ' ')}`, ''];
    for (const g of list) {
      md.push(`## ${MONTHS[g.month - 1]} · ${g.name}`, '', `**${KINDS[g.kind].label}.** ${g.simple}`, '');
      if (g.audience) md.push(`- **Who it is for:** ${g.audience}`);
      if (g.when) md.push(`- **When:** ${g.when}`);
      md.push('', '| Location | Price | Eff. | Buyers | Revenue |', '|---|---|---|---|---|');
      for (const r of g.rows) md.push(`| ${r.studio} | ${inr(r.price)} | ${r.discount}% | ${r.buyers} | ${lakh(r.revenue)} |`);
      md.push('', `**Full mechanics.** ${g.benefit}`, '');
      if (g.objective) md.push(`**Why we run it.** ${g.objective}`, '');
      if (g.rules) md.push(`**Rules.** ${g.rules}`, '');
      if (g.rationale) md.push(`**The data behind it.** ${g.rationale}`, '');
    }
    return save(`${base}.md`, new Blob([md.join('\n')], { type: 'text/markdown' }));
  }
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Planned offers', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUMNS.map(c => ({ header: c, key: c, width: /mechanics|Why|data|Rules|The offer/.test(c) ? 60 : c === 'Offer' ? 34 : 16 }));
  rows.forEach(r => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F1EC' } };
  ws.eachRow((row, i) => i > 1 && (row.alignment = { vertical: 'top', wrapText: true }));
  ws.getColumn('Price (₹)').numFmt = '#,##,##0';
  ws.getColumn('Planned revenue (₹)').numFmt = '#,##,##0';
  ws.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };
  const buf = await wb.xlsx.writeBuffer();
  save(`${base}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

function ExportMenu({ onPick }: { onPick: (k: 'xlsx' | 'csv' | 'md' | 'json' | 'pdf') => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const items: [any, string, string, React.ReactNode][] = [
    ['xlsx', 'Excel', '.xlsx · one row per offer and location', <FileSpreadsheet size={15} />],
    ['csv', 'CSV', '.csv · for Sheets or any tool', <FileText size={15} />],
    ['pdf', 'PDF', 'Print or save as PDF', <Printer size={15} />],
    ['md', 'Markdown', '.md · for docs and Notion', <FileText size={15} />],
    ['json', 'JSON', '.json · for systems', <FileJson size={15} />],
  ];
  return (
    <div className="po-export" ref={ref}>
      <button type="button" className="po-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Download size={14} /> Export <ChevronDown size={13} />
      </button>
      {open && (
        <div className="po-menu" role="menu">
          {items.map(([k, label, hint, icon]) => (
            <button key={k} type="button" role="menuitem" onClick={() => (setOpen(false), onPick(k))}>
              {icon}
              <span>
                <b>{label}</b>
                <small>{hint}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  try {
    const a = JSON.parse(String(v || '[]'));
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}

/* Quick note + tags, edited in place on a card. Clicks here never open the drawer. */
function CardMarks({
  group,
  allTags,
  onSave,
  onTag,
}: {
  group: Group;
  allTags: string[];
  onSave: (patch: { notes?: string; tags?: string[] }) => Promise<void>;
  onTag: (t: string) => void;
}) {
  const [note, setNote] = React.useState(group.notes);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  React.useEffect(() => setNote(group.notes), [group.notes]);
  const listId = `po-tags-${group.key.replace(/\W/g, '')}`;
  const addTag = () => {
    const t = draft.trim();
    setDraft('');
    setAdding(false);
    if (t && !group.tags.includes(t)) onSave({ tags: [...group.tags, t] });
  };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="po-marks" onClick={stop} onKeyDown={stop}>
      <div className="po-tags">
        <Tag size={12} aria-hidden="true" />
        {group.tags.map(t => (
          <span key={t} className="po-tag">
            <button type="button" className="po-tag-name" onClick={() => onTag(t)} title={`Show offers tagged “${t}”`}>
              {t}
            </button>
            <button type="button" className="po-tag-x" aria-label={`Remove tag ${t}`} onClick={() => onSave({ tags: group.tags.filter(x => x !== t) })}>
              <X size={10} />
            </button>
          </span>
        ))}
        {adding ? (
          <>
            <input
              className="po-tag-input"
              autoFocus
              list={listId}
              value={draft}
              maxLength={40}
              placeholder="Tag"
              onChange={e => setDraft(e.target.value)}
              onBlur={addTag}
              onKeyDown={e => {
                if (e.key === 'Enter') addTag();
                if (e.key === 'Escape') (setDraft(''), setAdding(false));
              }}
            />
            <datalist id={listId}>
              {allTags.filter(t => !group.tags.includes(t)).map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </>
        ) : (
          <button type="button" className="po-tag-add" onClick={() => setAdding(true)} aria-label="Add tag">
            <Plus size={11} /> Tag
          </button>
        )}
      </div>
      <label className="po-note">
        <StickyNote size={12} aria-hidden="true" />
        <textarea
          rows={1}
          value={note}
          maxLength={3000}
          placeholder="Add a quick note…"
          onChange={e => setNote(e.target.value)}
          onBlur={() => note.trim() !== group.notes.trim() && onSave({ notes: note })}
          aria-label={`Note for ${group.name}`}
        />
      </label>
    </div>
  );
}

function useYearOffers(year: number) {
  const [rows, setRows] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    (async () => {
      const all: any[] = [];
      for (let page = 1; page < 20; page++) {
        const r = await api(`/offers?year=${year}&limit=100&page=${page}`);
        all.push(...r.rows);
        if (r.rows.length < 100) break;
      }
      if (live) setRows(all.filter(o => o.month && STUDIOS.includes(o.studio)));
    })().catch(e => live && setError(String(e?.message || e)));
    return () => {
      live = false;
    };
  }, [year]);
  return { rows, error, setRows };
}

export default function PlannedOffers({ themes }: { themes: Record<number, string> }) {
  const { boot, studioId, year, toast } = useApp();
  const studioName = boot.studios.find(s => s.id === studioId)?.name;
  const { rows, error, setRows } = useYearOffers(year);
  const saveMarks = React.useCallback(
    async (g: Group, patch: { notes?: string; tags?: string[] }) => {
      const body: any = {};
      if ('notes' in patch) body.performanceNotes = patch.notes ?? '';
      if ('tags' in patch) body.tags = patch.tags;
      const ids = new Set(g.ids);
      // Optimistic: every location's copy of the offer carries the same note and tags.
      setRows(prev =>
        (prev || []).map(o =>
          ids.has(Number(o.id))
            ? {
                ...o,
                ...('notes' in patch ? { performance_notes: patch.notes?.trim() || null } : {}),
                ...('tags' in patch ? { plan_tags: JSON.stringify(patch.tags) } : {}),
              }
            : o,
        ),
      );
      try {
        await Promise.all(g.ids.map(id => api(`/offers/${id}/planning`, { method: 'PATCH', body: JSON.stringify(body) })));
      } catch (e: any) {
        toast(`Could not save: ${e?.message || e}`, 'error');
      }
    },
    [setRows, toast],
  );
  const [month, setMonth] = React.useState<number | null>(null);
  const [kinds, setKinds] = React.useState<Set<Kind>>(new Set());
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState<Group | null>(null);

  const groups = React.useMemo(() => {
    const map = new Map<string, Group>();
    for (const o of rows || []) {
      if (studioName && o.studio !== studioName) continue;
      const key = `${o.month}|${o.name}`;
      let g = map.get(key);
      if (!g) {
        const rules = String(o.redemption_conditions || '')
          .split('\n')
          .filter((l: string) => l && !/^When:/i.test(l))
          .join(' ');
        g = {
          key,
          ids: [],
          notes: '',
          tags: [],
          month: o.month,
          name: o.name,
          kind: kindOf(o),
          headline: o.headline || '',
          simple: o.mechanics?.simple || '',
          objective: o.objective || '',
          benefit: o.benefit || '',
          audience: o.audience || '',
          when: o.mechanics?.when || '',
          rules,
          rationale: o.rationale || '',
          revenue: 0,
          buyers: 0,
          discount: 0,
          rows: [],
        };
        map.set(key, g);
      }
      // The card's words come from the first location in STUDIOS order (Kemps Corner's prices).
      if (g.rows.length && STUDIOS.indexOf(o.studio) < Math.min(...g.rows.map(r => STUDIOS.indexOf(r.studio)))) {
        Object.assign(g, {
          headline: o.headline || g.headline,
          simple: o.mechanics?.simple || g.simple,
          objective: o.objective || g.objective,
          benefit: o.benefit || g.benefit,
          audience: o.audience || g.audience,
          when: o.mechanics?.when || g.when,
          rationale: o.rationale || g.rationale,
        });
      }
      g.ids.push(Number(o.id));
      if (!g.notes && o.performance_notes) g.notes = String(o.performance_notes);
      for (const t of parseTags(o.plan_tags)) if (!g.tags.includes(t)) g.tags.push(t);
      const rev = Number(o.expected_revenue || 0),
        b = Number(o.target_purchases || 0);
      g.revenue += rev;
      g.buyers += b;
      g.rows.push({ studio: o.studio, price: Number(o.expected_asp || 0), buyers: b, revenue: rev, discount: Number(o.effective_discount || 0) });
    }
    for (const g of map.values()) {
      g.rows.sort((a, b) => STUDIOS.indexOf(a.studio) - STUDIOS.indexOf(b.studio));
      g.discount = Math.max(...g.rows.map(r => r.discount));
    }
    return [...map.values()].sort((a, b) => a.month - b.month || b.revenue - a.revenue);
  }, [rows, studioName]);

  const shown = groups.filter(
    g =>
      (month === null || g.month === month) &&
      (kinds.size === 0 || kinds.has(g.kind)) &&
      (!q || `${g.name} ${g.headline} ${g.benefit} ${g.audience} ${g.notes} ${g.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  );
  const byMonth = MONTHS.map((_, i) => groups.filter(g => g.month === i + 1));
  const peak = Math.max(1, ...byMonth.map(m => m.reduce((n, g) => n + g.revenue, 0)));
  const total = groups.reduce((n, g) => n + g.revenue, 0);
  const allTags = React.useMemo(() => [...new Set(groups.flatMap(g => g.tags))].sort(), [groups]);

  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (error) return <p className="po-empty">Could not load the offers: {error}</p>;
  if (!rows) return <Loading label="Gathering the year's offers…" />;

  const toggle = (k: Kind) =>
    setKinds(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <div className="po">
      <header className="po-head">
        <div>
          <span className="po-eyebrow">{studioName || 'All four locations'} · {year}</span>
          <h2>Planned offers</h2>
          <p>Every offer in the {year} plan. Select one for the details.</p>
        </div>
        <div className="po-head-right">
          <dl>
            <div>
              <dt>Offers</dt>
              <dd>{groups.length}</dd>
            </div>
            <div>
              <dt>Planned revenue</dt>
              <dd>{lakh(total)}</dd>
            </div>
            <div>
              <dt>Buyers</dt>
              <dd>{groups.reduce((n, g) => n + g.buyers, 0).toLocaleString('en-IN')}</dd>
            </div>
          </dl>
          <ExportMenu
            onPick={k =>
              exportAs(k, shown, `p57-planned-offers-${year}${studioName ? '-' + studioName.toLowerCase().replace(/\s+/g, '-') : ''}${month ? '-' + MONTHS[month - 1].toLowerCase() : ''}`)
            }
          />
        </div>
      </header>

      <div className="po-ribbon" role="tablist" aria-label="Months">
        <button type="button" className={month === null ? 'is-on' : ''} onClick={() => setMonth(null)}>
          <b>All</b>
          <small>{groups.length} offers</small>
        </button>
        {MONTHS.map((m, i) => {
          const rev = byMonth[i].reduce((n, g) => n + g.revenue, 0);
          return (
            <button
              key={m}
              type="button"
              className={`${month === i + 1 ? 'is-on' : ''} ${i === 3 ? 'is-anniv' : ''}`}
              onClick={() => setMonth(month === i + 1 ? null : i + 1)}
              title={themes[i + 1] || m}
            >
              <span className="po-bar" style={{ height: `${Math.max(6, (rev / peak) * 100)}%` }} />
              <b>{m.slice(0, 3)}</b>
              <small>{byMonth[i].length}</small>
            </button>
          );
        })}
      </div>

      <div className="po-filters">
        <div className="po-kinds">
          {(Object.keys(KINDS) as Kind[])
            .filter(k => groups.some(g => g.kind === k))
            .map(k => (
              <button key={k} type="button" className={`po-kind po-k-${k} ${kinds.has(k) ? 'is-on' : ''}`} onClick={() => toggle(k)} title={KINDS[k].brief}>
                {KINDS[k].icon}
                {KINDS[k].label}
                <em>{groups.filter(g => g.kind === k).length}</em>
              </button>
            ))}
        </div>
        <label className="po-search">
          <Search size={14} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search offers, perks, audiences" />
        </label>
      </div>

      {MONTHS.map((m, i) => {
        const list = shown.filter(g => g.month === i + 1);
        if (!list.length) return null;
        const rev = list.reduce((n, g) => n + g.revenue, 0);
        return (
          <section key={m} className={`po-month ${i === 3 ? 'is-anniv' : ''}`}>
            <header>
              <span className="po-mnum">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{m}</h3>
                {themes[i + 1] && <p>{themes[i + 1]}</p>}
              </div>
              <span className="po-msum">
                {list.length} offers · {lakh(rev)}
              </span>
            </header>
            <div className="po-grid">
              {list.map((g, k) => (
                <div
                  key={g.key}
                  role="button"
                  tabIndex={0}
                  className={`po-card po-k-${g.kind}`}
                  style={{ animationDelay: `${k * 40}ms` }}
                  onClick={() => setOpen(g)}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), setOpen(g))}
                >
                  <span className="po-card-kind">
                    {KINDS[g.kind].icon}
                    {KINDS[g.kind].label}
                  </span>
                  <h4>{g.name}</h4>
                  {(g.simple || g.headline) && <p className="po-card-line">{g.simple || g.headline}</p>}
                  <div className="po-card-figs">
                    <span>
                      <b>{g.revenue ? lakh(g.revenue) : '—'}</b>
                      <small>planned</small>
                    </span>
                    <span>
                      <b>{g.buyers || '—'}</b>
                      <small>buyers</small>
                    </span>
                    <span>
                      <b>{g.discount ? `${Math.round(g.discount)}%` : '0%'}</b>
                      <small>eff. disc.</small>
                    </span>
                  </div>
                  <span className="po-dots">
                    {STUDIOS.map(s => (
                      <i key={s} className={g.rows.some(r => r.studio === s) ? 'on' : ''} title={s}>
                        {SHORT[s]}
                      </i>
                    ))}
                    <ArrowUpRight size={14} className="po-go" />
                  </span>
                  <CardMarks group={g} allTags={allTags} onSave={p => saveMarks(g, p)} onTag={setQ} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!shown.length && <p className="po-empty">No offers match. Clear a filter or the search.</p>}

      {open && (
        <div className="po-scrim" onClick={() => setOpen(null)}>
          <aside className={`po-drawer po-k-${open.kind}`} role="dialog" aria-label={open.name} onClick={e => e.stopPropagation()}>
            <button type="button" className="po-close" onClick={() => setOpen(null)} aria-label="Close">
              <X size={16} />
            </button>
            <span className="po-card-kind">
              {KINDS[open.kind].icon}
              {KINDS[open.kind].label} · {MONTHS[open.month - 1]} {year}
            </span>
            <h3>{open.name}</h3>
            {open.headline && <p className="po-quote">“{open.headline}”</p>}
            {open.month === 4 && <ReceiptOfferArt name={open.name} />}
            <div className="po-brief">
              <div className="po-short">
                <h5>
                  <Gift size={13} /> The offer
                </h5>
                <p>{open.simple || open.benefit}</p>
              </div>
              {open.audience && (
                <div>
                  <h5>
                    <Users size={13} /> Who it is for
                  </h5>
                  <p>{open.audience}</p>
                </div>
              )}
              {open.when && (
                <div>
                  <h5>
                    <CalendarHeart size={13} /> When
                  </h5>
                  <p>{open.when}</p>
                </div>
              )}
            </div>
            <table className="po-split">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Price</th>
                  <th>Eff.</th>
                  <th>Buyers</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {open.rows.map(r => (
                  <tr key={r.studio}>
                    <td>{r.studio}</td>
                    <td>{r.price ? inr(r.price) : '—'}</td>
                    <td>{r.discount}%</td>
                    <td>{r.buyers}</td>
                    <td>{r.revenue ? lakh(r.revenue) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="po-more">
              {open.benefit && (
                <section>
                  <h5>Full mechanics</h5>
                  <p>{open.benefit}</p>
                </section>
              )}
              {open.objective && (
                <section>
                  <h5>Why we run it</h5>
                  <p>{open.objective}</p>
                </section>
              )}
              {open.rules && (
                <section>
                  <h5>Rules</h5>
                  <p>{open.rules}</p>
                </section>
              )}
              {open.rationale && (
                <section>
                  <h5>The data behind it</h5>
                  <p>{open.rationale}</p>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
