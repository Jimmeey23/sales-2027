import React, { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Card, TableScroll } from './ui';

// Renders one studio's pack documents (1_Insights and the 2_Targets summary) as sections,
// bullet lists and tables. The blocks come from scripts/pack-insights-to-json.py:
//   { t: 'p' | 'li' | 'callout', lead?, text } and { t: 'table', head, rows }.
type Block =
  | { t: 'p' | 'li' | 'callout'; lead?: string | null; text: string }
  | { t: 'h2' | 'h3'; text: string }
  | { t: 'table'; head: string[]; rows: string[][] };
export type PackDoc = {
  title: string;
  subtitle?: string;
  intro?: Block[];
  sections: Array<{ title: string; blocks: Block[] }>;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isNumeric = (v: unknown) => /^[₹+\-−]?\s*[\d.,]+\s*(%|L|Cr|pts)?$/.test(String(v ?? '').trim()) || /^₹/.test(String(v ?? '').trim());

function Text({ b }: { b: { lead?: string | null; text: string } }) {
  return (
    <>
      {b.lead && <strong>{b.lead} </strong>}
      {b.text}
    </>
  );
}

function PackTable({ head, rows }: { head: string[]; rows: string[][] }) {
  const cols = Math.max(head.length, ...rows.map(r => r.length));
  const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? '');
  const numeric = Array.from({ length: cols }, (_, i) => i > 0 && rows.length > 0 && rows.every(r => !r[i] || isNumeric(r[i])));
  const hasHead = head.some(h => h && h.trim());
  return (
    <div className="pk-table">
      <TableScroll>
        <table className="data-table">
          {hasHead && (
            <thead>
              <tr>
                {pad(head).map((h, i) => (
                  <th key={i} className={numeric[i] ? 'num' : ''}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, ri) => {
              const total = /^(total|2027 total)/i.test(r[0] || '');
              return (
                <tr key={ri} className={total ? 'pk-total' : ''}>
                  {pad(r).map((c, i) => (
                    <td key={i} className={numeric[i] ? 'num' : ''}>
                      {i === 0 ? <strong>{c}</strong> : c}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const out: React.ReactNode[] = [];
  let list: Array<{ lead?: string | null; text: string }> = [];
  const flush = () => {
    if (list.length)
      out.push(
        <ul className="pk-list" key={`ul${out.length}`}>
          {list.map((b, i) => (
            <li key={i}>
              <Text b={b} />
            </li>
          ))}
        </ul>,
      );
    list = [];
  };
  blocks.forEach((b, i) => {
    if (b.t === 'li') return void list.push(b as any);
    flush();
    if (b.t === 'table') out.push(<PackTable key={i} head={b.head} rows={b.rows} />);
    else if (b.t === 'callout')
      out.push(
        <div className="pk-callout" key={i}>
          <Lightbulb size={15} />
          <p>
            <Text b={b} />
          </p>
        </div>,
      );
    else if (b.t === 'h2' || b.t === 'h3') out.push(<h4 className="pk-sub" key={i}>{b.text}</h4>);
    else
      out.push(
        <p className="pk-p" key={i}>
          <Text b={b} />
        </p>,
      );
  });
  flush();
  return <>{out}</>;
}

export default function PackInsights({ doc, label }: { doc: PackDoc; label: string }) {
  const sections = useMemo(() => (doc?.sections || []).filter(s => s.blocks?.length), [doc]);
  const [active, setActive] = useState<string | null>(null);
  if (!doc || !sections.length) return <p className="pk-empty">No {label} found in the pack for this studio.</p>;
  const shown = active ? sections.filter(s => slug(s.title) === active) : sections;
  return (
    <div className="pk">
      {(doc.intro || []).filter(b => b.t === 'callout').map((b, i) => (
        <div className="pk-lede" key={i}>
          <Text b={b as any} />
        </div>
      ))}
      <nav className="pk-nav" aria-label={`${label} sections`}>
        <button type="button" className={!active ? 'active' : ''} onClick={() => setActive(null)}>
          All sections
        </button>
        {sections.map(s => (
          <button key={s.title} type="button" className={active === slug(s.title) ? 'active' : ''} onClick={() => setActive(slug(s.title))}>
            {s.title}
          </button>
        ))}
      </nav>
      {shown.map(s => (
        <Card key={s.title} className="pk-section" id={slug(s.title)}>
          <h3>{s.title}</h3>
          <Blocks blocks={s.blocks} />
        </Card>
      ))}
    </div>
  );
}
