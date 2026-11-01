import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardCheck,
  ClipboardCopy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  X,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { APPROVED_STUDIOS } from '../data/approvedPlan2027';
import { MONTH_CHAPTERS } from '../data/monthNarrative';
import { moneyShort as lakh, number } from '../types';

/* Exporting the year.

   The plan already exists in the app, but a regional review does not happen in the app: it
   happens in a spreadsheet, a deck and an email. This dialog asks the three questions that
   change the file — which locations, how much of the year, and which format — shows what will
   be inside it, and then downloads it. The download is a real request against
   /api/plan/export rather than a client-side rebuild, so the file carries the same numbers the
   screen does.

   What comes out is the whole plan, not the offer list: the cover's argument, the overview,
   the week-by-week execution, the offers with their maths, the collateral to produce with its
   copy and due dates, and the CRM calendar. The print format opens that as an A4 document —
   a page per month — which is the fastest route to a PDF.

   Most of the time nobody wants a file at all: they want to paste the plan into a message, a
   doc or a sheet. So the same document is also offered as text, Markdown, CSV and JSON,
   copied straight to the clipboard — read from the server, never rebuilt here. */

type Format = 'print' | 'xlsx' | 'md' | 'json' | 'csv';
type CopyFormat = 'text' | 'md' | 'csv' | 'json';

const COPY_FORMATS: Array<{ id: CopyFormat; label: string; blurb: string }> = [
  { id: 'text', label: 'Message', blurb: 'WhatsApp, Slack or email — no markup' },
  { id: 'md', label: 'Markdown', blurb: 'Notion, GitHub, a shared doc' },
  { id: 'csv', label: 'CSV', blurb: 'Paste straight into a spreadsheet' },
  { id: 'json', label: 'JSON', blurb: 'Every field, for a script or import' },
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FORMATS: Array<{ id: Format; label: string; ext: string; blurb: string; Icon: typeof FileJson }> = [
  {
    id: 'print',
    label: 'Print / PDF',
    ext: '.html',
    blurb: 'The full plan laid out for A4 print — opens in the browser, save as PDF.',
    Icon: Printer,
  },
  {
    id: 'xlsx',
    label: 'Excel',
    ext: '.xlsx',
    blurb:
      'One sheet per section: summary, cover, overview, execution, offers, CRM, collateral, months, dates, assumptions.',
    Icon: FileSpreadsheet,
  },
  {
    id: 'md',
    label: 'Document',
    ext: '.md',
    blurb: 'The same plan as a readable file, ready to paste into a brief.',
    Icon: FileText,
  },
  {
    id: 'json',
    label: 'JSON',
    ext: '.json',
    blurb: 'Every field, structured — the file you can edit and import back.',
    Icon: FileJson,
  },
  {
    id: 'csv',
    label: 'CSV',
    ext: '.csv',
    blurb: 'One row per offer with its month and location — filter and pivot.',
    Icon: FileSpreadsheet,
  },
];

export default function PlanExportDialog({
  open,
  onClose,
  defaultScope = 'studio',
}: {
  open: boolean;
  onClose: () => void;
  defaultScope?: 'studio' | 'all';
}) {
  const { boot, studioId, year } = useApp();
  const [scope, setScope] = useState<'studio' | 'all'>(defaultScope);
  // null is the whole year; 1–12 is that month. Every section of that month travels with it.
  const [month, setMonth] = useState<number | null>(null);
  const [format, setFormat] = useState<Format>('print');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyFormat, setCopyFormat] = useState<CopyFormat>('text');
  const [copyText, setCopyText] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [copyNote, setCopyNote] = useState('');

  // Only these four carry a plan; the rest of the estate has no targets to export, so a
  // single-location file is always one of them.
  const planning = boot.studios.filter(item => (APPROVED_STUDIOS as string[]).includes(item.name));
  const [studio, setStudio] = useState<number | null>(
    planning.some(item => item.id === studioId) ? (studioId as number) : (planning[0]?.id ?? null),
  );
  const resolved = planning.find(item => item.id === studio) || planning[0];
  const scopeQuery = scope === 'all' ? 'all' : String(resolved?.id ?? '');
  const monthQuery = month ? `&month=${month}` : '';

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setError(null);
    setLoading(true);
    api(`/plan/export/preview?year=${year}&studios=${scopeQuery}${monthQuery}`)
      .then(setPreview)
      .catch(err => setError(err.message || 'Could not read the plan.'))
      .finally(() => setLoading(false));
  }, [open, scopeQuery, monthQuery, year]);

  // What the clipboard would receive, read from the same document the download writes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCopyState('loading');
    setCopyNote('');
    api(`/plan/copy?year=${year}&studios=${scopeQuery}${monthQuery}&format=${copyFormat}`)
      .then((payload: any) => {
        if (cancelled) return;
        setCopyText(payload.text || '');
        setCopyState('idle');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCopyText('');
        setCopyState('error');
        setCopyNote(err.message || 'Could not prepare the text.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, scopeQuery, monthQuery, year, copyFormat]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const active = useMemo(() => FORMATS.find(f => f.id === format)!, [format]);

  const query = `year=${year}&studios=${scopeQuery}${monthQuery}&format=${format}`;

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      // The print document is meant to be looked at, then printed: open it rather than
      // dropping an .html in the downloads folder nobody will double-click.
      if (format === 'print') {
        // An anchor, not window.open: no pop-up blocker, and no null return to misread.
        const link = document.createElement('a');
        link.href = `/api/plan/export?${query}`;
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setBusy(false);
        return;
      }
      const response = await fetch(`/api/plan/export?${query}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `The export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const named = /filename="([^"]+)"/.exec(disposition)?.[1];
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = named || `p57-sales-plan-${year}${active.ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err: any) {
      setError(err.message || 'The export failed.');
    } finally {
      setBusy(false);
    }
  };

  /* The clipboard API is only available on a secure origin and can still be refused; the
     fallback is the oldest trick there is, and it keeps the button working everywhere. */
  const copyPlan = async () => {
    if (!copyText) return;
    setCopyNote('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const area = document.createElement('textarea');
        area.value = copyText;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('The browser refused the copy.');
      }
      setCopyState('copied');
      setTimeout(() => setCopyState(current => (current === 'copied' ? 'idle' : current)), 2600);
    } catch (err: any) {
      setCopyState('error');
      setCopyNote(err?.message || 'Could not reach the clipboard.');
    }
  };

  const copyActive = COPY_FORMATS.find(item => item.id === copyFormat) || COPY_FORMATS[0];
  const copyPreview = copyText ? copyText.split('\n').slice(0, 6).join('\n') : '';

  if (!open) return null;

  const counts = preview?.counts;

  return (
    <div className="pex-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()} role="presentation">
      <section className="pex" role="dialog" aria-modal="true" aria-label={`Export the ${year} plan`}>
        <header className="pex-head">
          <div>
            <span className="pex-kicker">Export</span>
            <h2>The {year} plan, as a file</h2>
            <p>
              The month-on-month plan in full — cover write-ups, overview, execution, offers with their maths,
              collateral with its copy and due dates, and the CRM calendar — for the year or a single month.
            </p>
          </div>
          <button type="button" className="pex-close" onClick={onClose} aria-label="Close export">
            <X size={17} />
          </button>
        </header>

        <div className="pex-body">
          <div className="pex-block">
            <span className="pex-label">Locations</span>
            <div className="pex-scopes" role="group" aria-label="Locations">
              <button
                type="button"
                className={scope === 'studio' ? 'is-on' : ''}
                aria-pressed={scope === 'studio'}
                onClick={() => setScope('studio')}
              >
                <strong>{resolved?.name || 'One location'}</strong>
                <em>one location, twelve months</em>
              </button>
              <button
                type="button"
                className={scope === 'all' ? 'is-on' : ''}
                aria-pressed={scope === 'all'}
                onClick={() => setScope('all')}
              >
                <strong>All locations</strong>
                <em>{planning.length} locations, compared</em>
              </button>
            </div>
            {scope === 'studio' && planning.length > 1 && (
              <div className="pex-switch" role="group" aria-label="Which location">
                {planning.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === resolved?.id ? 'is-on' : ''}
                    aria-pressed={item.id === resolved?.id}
                    onClick={() => setStudio(item.id)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pex-block">
            <span className="pex-label-row">
              <span className="pex-label">Period</span>
              <span className="pex-label-actions">
                {month ? `${MONTH_CHAPTERS[month - 1]?.theme || ''}` : 'the whole year'}
              </span>
            </span>
            <div className="pex-scopes" role="group" aria-label="Period">
              <button
                type="button"
                className={!month ? 'is-on' : ''}
                aria-pressed={!month}
                onClick={() => setMonth(null)}
              >
                <strong>The whole year</strong>
                <em>twelve months, in order</em>
              </button>
              <button
                type="button"
                className={month ? 'is-on' : ''}
                aria-pressed={Boolean(month)}
                onClick={() => setMonth(month || new Date().getMonth() + 1)}
              >
                <strong>One month</strong>
                <em>its cover, execution, offers, collateral and CRM</em>
              </button>
            </div>
            {month && (
              <div className="pex-switch" role="group" aria-label="Which month">
                {MONTH_CHAPTERS.map((chapter, index) => (
                  <button
                    key={chapter.theme}
                    type="button"
                    title={chapter.theme}
                    className={month === index + 1 ? 'is-on' : ''}
                    aria-pressed={month === index + 1}
                    onClick={() => setMonth(index + 1)}
                  >
                    {MONTH_LABELS[index]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pex-block">
            <span className="pex-label">Format</span>
            <div className="pex-formats">
              {FORMATS.map(({ id, label, ext, blurb, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`pex-format${format === id ? ' is-on' : ''}`}
                  aria-pressed={format === id}
                  onClick={() => setFormat(id)}
                >
                  <span className="pex-format-icon">
                    <Icon size={16} />
                  </span>
                  <span>
                    <strong>
                      {label}
                      <i>{ext}</i>
                    </strong>
                    <em>{blurb}</em>
                  </span>
                  {format === id && (
                    <span className="pex-tick">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pex-block">
            <span className="pex-label-row">
              <span className="pex-label">Or copy it</span>
              <span className="pex-label-actions">
                {copyState === 'loading' && 'Preparing…'}
                {copyState === 'copied' && 'Copied'}
                {copyState === 'error' && copyNote}
              </span>
            </span>
            <div className="pex-copy-formats" role="group" aria-label="Copy format">
              {COPY_FORMATS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  title={item.blurb}
                  className={copyFormat === item.id ? 'is-on' : ''}
                  aria-pressed={copyFormat === item.id}
                  onClick={() => setCopyFormat(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="pex-copy-sheet">
              <div className="pex-copy-sheet-head">
                <span>
                  {copyActive.label} ·{' '}
                  {copyText
                    ? `${number(copyText.split('\n').length)} lines · ${number(copyText.length)} characters`
                    : 'nothing to copy yet'}
                </span>
                <button type="button" className="pex-copy-mini" onClick={copyPlan} disabled={!copyText}>
                  {copyState === 'copied' ? <ClipboardCheck size={13} /> : <ClipboardCopy size={13} />}
                  {copyState === 'copied' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="pex-copy-preview" aria-hidden="true">
                {copyPreview || (copyState === 'loading' ? 'Preparing the text…' : '—')}
                {copyText && copyText.split('\n').length > 6 ? '\n…' : ''}
              </pre>
            </div>
          </div>

          <div className="pex-preview">
            {loading && (
              <span className="pex-preview-loading">
                <Loader2 size={14} /> Reading the plan…
              </span>
            )}
            {error && <span className="pex-error">{error}</span>}
            {preview && !loading && (
              <>
                <dl>
                  <div>
                    <dt>Locations</dt>
                    <dd>{number(counts?.studios)}</dd>
                  </div>
                  <div>
                    <dt>Months</dt>
                    <dd>{number(counts?.months)}</dd>
                  </div>
                  <div>
                    <dt>Offers</dt>
                    <dd>{number(counts?.offers)}</dd>
                  </div>
                  <div>
                    <dt>{month ? 'Month target' : 'Year target'}</dt>
                    <dd>{lakh(preview.totals?.target)}</dd>
                  </div>
                  <div>
                    <dt>Collateral</dt>
                    <dd>{number(counts?.collateralPieces)}</dd>
                  </div>
                  <div>
                    <dt>CRM sends</dt>
                    <dd>{number(counts?.crmSends)}</dd>
                  </div>
                </dl>
                <span className="pex-preview-note">
                  {preview.scope?.type === 'portfolio'
                    ? `${counts?.studios} locations · `
                    : `${preview.scope?.studios?.[0]?.name} · `}
                  {month
                    ? `${MONTH_CHAPTERS[month - 1]?.theme} — cover, overview, execution, offers, collateral, CRM`
                    : `${counts?.monthsWithOffers} months with offers — every section of every month`}
                </span>
              </>
            )}
          </div>
        </div>

        <footer className="pex-foot">
          <span className="pex-foot-note">Files are generated from the saved plan — nothing is recalculated.</span>
          <button type="button" className="pex-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="pex-ghost"
            onClick={copyPlan}
            disabled={!copyText || copyState === 'loading'}
          >
            {copyState === 'copied' ? <ClipboardCheck size={14} /> : <ClipboardCopy size={14} />}
            {copyState === 'copied' ? 'Copied' : `Copy ${copyActive.label}`}
          </button>
          <button type="button" className="pex-go" onClick={download} disabled={busy || loading || !preview}>
            {busy ? (
              <Loader2 size={14} className="spin" />
            ) : format === 'print' ? (
              <Printer size={14} />
            ) : (
              <Download size={14} />
            )}
            {format === 'print' ? 'Open print document' : `Download ${active.label}`}
          </button>
        </footer>
      </section>
    </div>
  );
}
