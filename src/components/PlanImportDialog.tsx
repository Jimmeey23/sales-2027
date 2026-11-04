import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, FileJson, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { postImport, readImportFile } from '../lib/importRequest';
import { IMPORT_REQUEST_LIMIT_LABEL } from '../lib/importLimits';
import { useApp } from '../App';
import { MONTHS } from '../types';

/* Importing a whole year plan.

   The export dialog writes `p57-sales-plan/1`; this reads it back. Everything a revised
   plan changes arrives in that one file — the twelve themes, their targets and stream mix,
   the funnels, the key dates, the Week 1–4 execution plan and every offer with its copy and
   maths — so a plan re-cut outside the app lands here without anybody retyping a month.

   Three modes, and the difference between them is what happens to what the file does *not*
   mention: add leaves untouched months alone, modify rewrites the months it carries and
   keeps anything it does not mention, replace makes the year exactly the document.

   The preview is the server's own dry run of the write, not a second opinion, so the numbers
   shown before pressing Import are the numbers stored. */

type Mode = 'add' | 'modify' | 'replace';

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
  {
    id: 'add',
    label: 'Add months',
    blurb: 'Plan the months this location does not have yet. Leave the rest as they are.',
  },
  {
    id: 'modify',
    label: 'Update the plan',
    blurb: 'Rewrite the months the file carries — themes, targets, streams, funnels and execution. Keep what it omits.',
  },
  {
    id: 'replace',
    label: 'Replace the year',
    blurb: 'Make the year exactly this document, including which offers each month runs.',
  },
];

const lakh = (value: any) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 100000) {
    const l = n / 100000;
    return `₹${l >= 10 ? l.toFixed(1) : l.toFixed(2).replace(/\.?0+$/, '')}L`;
  }
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

/** As much of the document's identity as the screen can honestly show before the server reads it. */
function peek(text: string): {
  studio: string | null;
  locations: string[];
  year: number | null;
  schema: string | null;
} {
  try {
    const parsed = JSON.parse(text);
    const locations: string[] = (Array.isArray(parsed?.studios) ? parsed.studios : [])
      .map((entry: any) => entry?.studio?.name)
      .filter(Boolean);
    const studio =
      locations[0] ||
      (typeof parsed?.studio === 'string' ? parsed.studio : parsed?.studio?.name) ||
      parsed?.scope?.studios?.[0]?.name ||
      parsed?.studioName ||
      null;
    return {
      studio: studio ? String(studio) : null,
      locations,
      year: Number(parsed?.year) || null,
      schema: parsed?.schema ? String(parsed.schema) : null,
    };
  } catch {
    return { studio: null, locations: [], year: null, schema: null };
  }
}

export default function PlanImportDialog({
  open,
  onClose,
  studioId,
  year,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  studioId: number | null;
  year: number;
  onImported?: () => void;
}) {
  const { boot, toast, can } = useApp();
  const [mode, setMode] = useState<Mode>('modify');
  const [text, setText] = useState('');
  const [approve, setApprove] = useState(false);
  const [useRates, setUseRates] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<any>(null);
  const [dragging, setDragging] = useState(false);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const mayApprove = can?.('target_approve') ?? false;
  const identity = useMemo(() => peek(text), [text]);
  const portfolio = identity.locations.length > 1;
  const targetStudio = portfolio
    ? `${identity.locations.length} locations`
    : identity.studio || boot.studios.find(item => item.id === studioId)?.name || 'the document’s location';

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* Any change to what would be written invalidates the preview: it is a dry run of this
     exact request, and showing stale numbers under a changed mode is how plans get imported
     with the wrong month replaced. */
  useEffect(() => {
    setPreview(null);
    setDone(null);
  }, [text, mode, approve, useRates, studioId, year]);

  const readFile = async (file: File) => {
    setPreview(null);
    setDone(null);
    try {
      const content = await readImportFile(file);
      setText(content);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'That file could not be read.');
    }
  };

  const run = async (dryRun: boolean) => {
    if (!text.trim()) {
      setError('Paste the plan, or drop its JSON file.');
      return;
    }
    setBusy(true);
    setError(null);
    if (dryRun) setPreview(null);
    try {
      const payload = await postImport('/plan/import', {
        text,
        mode,
        dryRun,
        approve: approve && mayApprove,
        useRates,
        studioId: identity.studio ? undefined : (studioId ?? undefined),
        year,
      });
      if (dryRun) {
        setPreview(payload);
        return;
      }
      setDone(payload);
      setPreview(payload);
      const summary = payload?.summary || {};
      const written = Array.isArray(payload?.studios)
        ? payload.studios.reduce(
            (acc: any, entry: any) => ({
              months: acc.months + (entry.summary?.months ?? 0),
              offers: acc.offers + (entry.summary?.offers ?? 0),
            }),
            { months: 0, offers: 0 },
          )
        : summary;
      toast?.(
        Array.isArray(payload?.studios)
          ? `Imported ${written.months} months · ${written.offers} offer changes across ${payload.studios.length} locations.`
          : `Imported ${written.months ?? 0} months · ${written.offers ?? 0} offer changes for ${payload?.studio?.name || 'the location'}.`,
      );
      onImported?.();
    } catch (err: any) {
      setError(err?.message || 'The plan could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  /* A portfolio file answers with one block per location; a single-location file, with one.
     Both are shown the same way: a location's totals, then its months. */
  const locations: any[] = preview
    ? Array.isArray(preview.studios)
      ? preview.studios
      : [
          {
            studio: preview.studio,
            year: preview.year,
            totals: preview.totals,
            months: preview.months || [],
            warnings: preview.warnings || [],
            assumptions: preview.assumptions,
            summary: preview.summary,
          },
        ]
    : [];
  const months: any[] = locations.flatMap((entry: any) => entry.months || []);
  const totals = preview?.totals || preview?.portfolio?.totals;
  const warnings: string[] = [...new Set(locations.flatMap((entry: any) => (entry.warnings || []) as string[]))];
  const actionable = months.filter(month => month.action !== 'skip').length;
  const writtenMonths = locations.reduce((sum: number, entry: any) => sum + (entry.summary?.months ?? 0), 0);
  const writtenOffers = locations.reduce((sum: number, entry: any) => sum + (entry.summary?.offers ?? 0), 0);
  const go = () => run(false);

  return (
    <div
      className="pex-backdrop"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <section
        className="pex pex-wide pex-import"
        role="dialog"
        aria-modal="true"
        aria-label={`Import the ${year} plan`}
      >
        <header className="pex-head">
          <div>
            <span className="pex-kicker">Import plan</span>
            <h2>Bring a year plan in</h2>
            <p>
              A <code>p57-sales-plan/1</code> document — targets, stream mix, funnels, key dates, the Week 1–4 execution
              plan and every offer with its copy. The months, their themes and which offers they run all come from the
              file.
            </p>
          </div>
          <button type="button" className="pex-close" onClick={onClose} aria-label="Close import">
            <X size={17} />
          </button>
        </header>

        <div className="pex-body pex-body-split">
          <div className="pex-pane pex-pane-source">
            <div className="pex-block">
              <span className="pex-label">What should happen to months already planned?</span>
              <div className="pex-modes">
                {MODES.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={mode === item.id ? 'is-on' : ''}
                    aria-pressed={mode === item.id}
                    onClick={() => setMode(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <em>{item.blurb}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="pex-block">
              <div className="pex-label-row">
                <span className="pex-label">The plan document</span>
                <span className="pex-label-actions">
                  <button type="button" onClick={() => fileRef.current?.click()}>
                    <FileJson size={11} /> Choose a file
                  </button>
                  {text && (
                    <button type="button" onClick={() => setText('')}>
                      <RotateCcw size={11} /> Clear
                    </button>
                  )}
                </span>
              </div>
              <div
                className={`pex-drop${dragging ? ' is-over' : ''}`}
                onDragOver={event => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={event => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) void readFile(file);
                }}
              >
                <textarea
                  className="pex-code"
                  spellCheck={false}
                  value={text}
                  placeholder={'{ "schema": "p57-sales-plan/1", "year": 2027, "months": [ … ] }'}
                  onChange={event => setText(event.target.value)}
                />
                {dragging && <span className="pex-drop-veil">Drop the plan to read it</span>}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json,text/plain"
                hidden
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file);
                  event.target.value = '';
                }}
              />
              <p className="pex-hint">
                {identity.schema && identity.schema !== 'p57-sales-plan/1' ? (
                  <>
                    <AlertTriangle size={12} /> This looks like a “{identity.schema}” document.
                  </>
                ) : (
                  <>
                    <FileJson size={12} /> {identity.schema || 'Expects p57-sales-plan/1'} · into {targetStudio}
                    {identity.year ? ` · ${identity.year}` : ''}
                  </>
                )}
              </p>
              <p className="pex-hint">
                Up to {IMPORT_REQUEST_LIMIT_LABEL} before compression · large imports compress automatically.
              </p>
            </div>

            <div className="pex-checks">
              <button
                type="button"
                className={`pex-check${useRates ? ' is-on' : ''}`}
                aria-pressed={useRates}
                onClick={() => setUseRates(value => !value)}
                title="First spend, renewal ticket, trial→member and the rest, written as the plan's own assumption overrides"
              >
                <span>{useRates && <Check size={11} />}</span>
                Use the plan’s measured rates
              </button>
              <button
                type="button"
                className={`pex-check${approve && mayApprove ? ' is-on' : ''}`}
                aria-pressed={approve && mayApprove}
                disabled={!mayApprove}
                onClick={() => setApprove(value => !value)}
                title={
                  mayApprove
                    ? 'Write each month’s target as approved, not only proposed'
                    : 'Your role cannot approve targets'
                }
              >
                <span>{approve && mayApprove && <Check size={11} />}</span>
                Approve the targets
              </button>
            </div>
          </div>

          <div className="pex-pane pex-pane-preview">
            <div className="pex-preview-head">
              <span className="pex-label">Preview</span>
              {preview && (
                <button type="button" className="pex-recheck" disabled={busy} onClick={() => run(true)}>
                  <RotateCcw size={11} /> Re-check
                </button>
              )}
            </div>
            {!preview && !busy && (
              <p className="pex-empty">
                Nothing read yet. Preview reads the document and shows every month it would write — no target, plan or
                offer changes until you press Import.
              </p>
            )}
            {busy && (
              <p className="pex-empty">
                <Loader2 size={14} className="spin" /> {done ? 'Importing…' : 'Reading the plan…'}
              </p>
            )}
            {error && <p className="pex-error">{error}</p>}
            {preview && (
              <>
                {totals && (
                  <div className="pex-preview">
                    <dl>
                      <div>
                        <dt>Target</dt>
                        <dd>{lakh(totals.target)}</dd>
                      </div>
                      <div>
                        <dt>Prior year</dt>
                        <dd>{lakh(totals.priorYear)}</dd>
                      </div>
                      <div>
                        <dt>Months</dt>
                        <dd>{totals.months}</dd>
                      </div>
                      <div>
                        <dt>Offers</dt>
                        <dd>{totals.offers}</dd>
                      </div>
                    </dl>
                    <span className="pex-preview-note">
                      {Array.isArray(preview.studios)
                        ? `${preview.studios.length} locations · ${preview.studios
                            .map((entry: any) => entry.studio?.name)
                            .filter(Boolean)
                            .join(' · ')}`
                        : `${preview.studio?.name || targetStudio} · ${preview.year}`}
                      {preview.portfolio?.offerBank ? ` · ${preview.portfolio.offerBank} bank offers` : ''}
                    </span>
                  </div>
                )}
                {warnings.length > 0 && (
                  <ul className="pex-warnings">
                    {warnings.slice(0, 8).map(warning => (
                      <li key={warning}>
                        <AlertTriangle size={11} /> {warning}
                      </li>
                    ))}
                  </ul>
                )}
                {locations.map((location: any) => (
                  <div className="pex-location" key={location.studio?.id ?? location.studio?.name}>
                    {locations.length > 1 && (
                      <p className="pex-location-head">
                        <b>{location.studio?.name}</b>
                        <em>
                          {lakh(location.totals?.target)} · {location.totals?.offers ?? location.months.length} offers
                          {location.summary ? ` · ${location.summary.offers} written` : ''}
                        </em>
                      </p>
                    )}
                    <ul className="pex-rows">
                      {(location.months || []).map((month: any) => {
                        const changes: any[] = month.changes || [];
                        const open = openMonth === month.month;
                        return (
                          <li
                            key={month.month}
                            className={`is-${month.action === 'skip' ? 'skip' : month.action === 'create' ? 'create' : 'update'}`}
                          >
                            <div className="pex-row-line">
                              <b className="pex-row-action">{month.action}</b>
                              <button
                                type="button"
                                className="pex-row-name"
                                aria-expanded={open}
                                onClick={() => setOpenMonth(open ? null : month.month)}
                              >
                                {MONTHS[month.month - 1]} · {month.theme || 'untitled'}
                                <em>
                                  {lakh(month.target)} · {month.offers} offers · {month.actions} actions
                                  {changes.length
                                    ? ` · ${changes.length} change${changes.length === 1 ? '' : 's'}`
                                    : ''}
                                </em>
                              </button>
                            </div>
                            {month.messages?.length > 0 && (
                              <em className="pex-row-note">{month.messages.join(' · ')}</em>
                            )}
                            {open && (
                              <>
                                <dl className="pex-row-changes">
                                  <div>
                                    <dt>Streams</dt>
                                    <dd>
                                      New {lakh(month.streams.newClient)} · renew {lakh(month.streams.renewal)} · back{' '}
                                      {lakh(month.streams.reactivation)}
                                      {month.streams.other ? ` · other ${lakh(month.streams.other)}` : ''}
                                    </dd>
                                  </div>
                                  {changes.map(change => (
                                    <div key={change.field}>
                                      <dt>{change.label}</dt>
                                      <dd>
                                        <s>{change.from}</s>
                                        <span>{change.to}</span>
                                      </dd>
                                    </div>
                                  ))}
                                  <div>
                                    <dt>Offers</dt>
                                    <dd>
                                      {month.offersCreate} new · {month.offersUpdate} matched
                                    </dd>
                                  </div>
                                </dl>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {done && (
                  <p className="pex-done">
                    <Check size={13} /> Imported{' '}
                    {Array.isArray(done.studios) ? writtenMonths : (done.summary?.months ?? months.length)} months and{' '}
                    {Array.isArray(done.studios) ? writtenOffers : (done.summary?.offers ?? 0)} offer changes
                    {Array.isArray(done.studios) ? ` across ${done.studios.length} locations` : ''}
                    {Array.isArray(done.studios)
                      ? done.context
                        ? ` · ${done.context.bank.created} bank offers · ${done.context.policies} policies · ${done.context.settings.length} year notes`
                        : ''
                      : done.assumptions
                        ? ` · ${done.assumptions} rates written`
                        : ''}
                    .
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="pex-foot">
          <span className="pex-foot-note">
            {done
              ? 'Imported. Open any month to see its brief and execution plan.'
              : notEditable(mode, months)
                ? 'Every month in this file is already planned — switch to Update the plan to rewrite them.'
                : 'Nothing is written until you press Import.'}
          </span>
          <button type="button" className="pex-cancel" onClick={onClose}>
            Close
          </button>
          <button type="button" className="pex-ghost" onClick={() => run(true)} disabled={busy}>
            {busy && !done ? <Loader2 size={13} className="spin" /> : <FileJson size={13} />}
            Preview
          </button>
          <button
            type="button"
            className="pex-go"
            onClick={go}
            disabled={busy || !preview || actionable === 0 || Boolean(done)}
          >
            {busy && done ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
            {actionable ? `Import ${actionable} month${actionable === 1 ? '' : 's'}` : 'Import'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function notEditable(mode: Mode, months: any[]) {
  return mode === 'add' && months.length > 0 && months.every(month => month.action === 'skip');
}
