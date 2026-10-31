import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download, FileJson, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { APPROVED_STUDIOS } from '../data/approvedPlan2027';
import { moneyShort as lakh, number } from '../types';

/* Exporting the year.

   The plan already exists in the app, but a regional review does not happen in the app: it
   happens in a spreadsheet, a deck and an email. This dialog asks the two questions that
   change the file — which locations, and which format — shows what will be inside it, and
   then downloads it. The download is a real request against /api/plan/export rather than a
   client-side rebuild, so the file carries the same numbers the screen does. */

type Format = 'json' | 'csv' | 'xlsx' | 'md';

const FORMATS: Array<{ id: Format; label: string; ext: string; blurb: string; Icon: typeof FileJson }> = [
  {
    id: 'json',
    label: 'JSON',
    ext: '.json',
    blurb: 'Every field, structured — the file you can edit and import back.',
    Icon: FileJson,
  },
  {
    id: 'xlsx',
    label: 'Excel',
    ext: '.xlsx',
    blurb: 'Five sheets: summary, months, offers, key dates, assumptions.',
    Icon: FileSpreadsheet,
  },
  {
    id: 'csv',
    label: 'CSV',
    ext: '.csv',
    blurb: 'One row per offer with its month and location — filter and pivot.',
    Icon: FileSpreadsheet,
  },
  {
    id: 'md',
    label: 'Document',
    ext: '.md',
    blurb: 'A readable plan per location, ready to paste into a brief.',
    Icon: FileText,
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
  const [format, setFormat] = useState<Format>('xlsx');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only these four carry a plan; the rest of the estate has no targets to export, so a
  // single-location file is always one of them.
  const planning = boot.studios.filter(item => (APPROVED_STUDIOS as string[]).includes(item.name));
  const [studio, setStudio] = useState<number | null>(
    planning.some(item => item.id === studioId) ? (studioId as number) : (planning[0]?.id ?? null),
  );
  const resolved = planning.find(item => item.id === studio) || planning[0];
  const scopeQuery = scope === 'all' ? 'all' : String(resolved?.id ?? '');

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setError(null);
    setLoading(true);
    api(`/plan/export/preview?year=${year}&studios=${scopeQuery}`)
      .then(setPreview)
      .catch(err => setError(err.message || 'Could not read the plan.'))
      .finally(() => setLoading(false));
  }, [open, scopeQuery, year]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const active = useMemo(() => FORMATS.find(f => f.id === format)!, [format]);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/plan/export?year=${year}&studios=${scopeQuery}&format=${format}`, {
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
              Targets, stream splits, funnel requirements, every offer with its maths, the key dates and the measured
              assumptions — in one download.
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
                    <dt>Year target</dt>
                    <dd>{lakh(preview.totals?.target)}</dd>
                  </div>
                </dl>
                <span className="pex-preview-note">
                  {preview.scope?.type === 'portfolio'
                    ? `${counts?.studios} locations, ${counts?.monthsWithOffers} months with offers`
                    : `${preview.scope?.studios?.[0]?.name} · ${counts?.monthsWithOffers} months with offers`}
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
          <button type="button" className="pex-go" onClick={download} disabled={busy || loading || !preview}>
            {busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
            Download {active.label}
          </button>
        </footer>
      </section>
    </div>
  );
}
