import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  FileJson,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { MONTHS } from '../types';

/* Importing offers.

   The files that arrive in practice are a spreadsheet pasted from Excel, a hand-written
   list of offers, and a plan export that has been edited and needs to come back in. All
   three land in the same place — the text box — and are read by the server, so what the
   preview says is exactly what the import will do.

   Bulk work is the point of importing: one month and one location for the whole file,
   prices or forecasts scaled, dates shifted, a discount ceiling, names re-cut. Those
   controls sit under "Bulk edits", they feed the same dry run as everything else, and
   nothing is written until Import. Per-row decisions ("leave this one out") are taken in
   the preview, and every update shows the fields it changes. */

type Mode = 'add' | 'upsert' | 'replace';
type Action = 'create' | 'update' | 'skip' | 'error';

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
  { id: 'add', label: 'Add new', blurb: 'Create offers that do not exist yet. Leave the rest alone.' },
  {
    id: 'upsert',
    label: 'Add & update',
    blurb: 'Create what is missing and update anything that matches by id or name.',
  },
  { id: 'replace', label: 'Replace month', blurb: 'Add & update, then make these the offers the chosen month runs.' },
];

const EXAMPLE = `[
  {
    "name": "The February Comeback",
    "headline": "Eight weeks of barre, for the price of six",
    "audience": "Lapsed 61–365 days",
    "objective": "reactivation",
    "benefit": "8-week unlimited at the 6-week price",
    "mechanics": { "mechanism": "percentage", "discountPercent": 15, "durationMonths": 2 },
    "expectedAsp": 32000,
    "validityStart": "2027-02-01",
    "validityEnd": "2027-02-28"
  }
]`;

const EXAMPLE_CSV = `Offer name,Objective,Audience,Price (INR),Expected revenue (INR),Buyers,Starts,Ends,Type
The February Comeback,reactivation,Lapsed 61–365 days,32000,704000,22,2027-02-01,2027-02-28,percentage
Bring a Friend Back,referral,Lapsed members,24000,528000,22,2027-02-01,2027-02-28,bundle`;

type Bulk = {
  month: number | '';
  slot: '' | 'newcomer' | 'lapsed' | 'renewal';
  shiftDays: string;
  scaleRevenue: string;
  scalePrice: string;
  maxDiscount: string;
  find: string;
  replace: string;
  prefix: string;
  suffix: string;
  runAds: '' | 'yes' | 'no';
  notes: string;
};

const EMPTY_BULK: Bulk = {
  month: '',
  slot: '',
  shiftDays: '',
  scaleRevenue: '',
  scalePrice: '',
  maxDiscount: '',
  find: '',
  replace: '',
  prefix: '',
  suffix: '',
  runAds: '',
  notes: '',
};

const bulkActive = (b: Bulk) =>
  Object.entries(b).some(([key, value]) => value !== '' && value !== EMPTY_BULK[key as keyof Bulk]);

export default function OfferImportDialog({
  open,
  onClose,
  studioId: initialStudio,
  year,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  studioId: number | null;
  year: number;
  onImported?: () => void;
}) {
  const { boot } = useApp();
  const [text, setText] = useState('');
  const [studio, setStudio] = useState<number | null>(initialStudio);
  const [mode, setMode] = useState<Mode>('upsert');
  const [month, setMonth] = useState<number | ''>('');
  const [attach, setAttach] = useState(false);
  const [bulk, setBulk] = useState<Bulk>(EMPTY_BULK);
  const [showBulk, setShowBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [done, setDone] = useState<any>(null);
  const [leftOut, setLeftOut] = useState<Record<number, boolean>>({});
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const reset = () => {
    setText('');
    setPreview(null);
    setDone(null);
    setError(null);
    setMode('upsert');
    setMonth('');
    setAttach(false);
    setBulk(EMPTY_BULK);
    setShowBulk(false);
    setLeftOut({});
    setOpenRow(null);
  };

  useEffect(() => {
    if (!open) return;
    reset();
    setStudio(initialStudio);
  }, [open, initialStudio]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const body = (dryRun: boolean) => {
    const payload: any = { mode, year, dryRun, text };
    if (studio) payload.studioId = studio;
    // A month chosen in the bulk edits is the month the file lands on, so the preview can
    // say what happens to the plan without the reader setting it twice.
    if (month) payload.month = Number(month);
    else if (bulk.month !== '') payload.month = Number(bulk.month);
    if (attach || (!month && bulk.month !== '')) payload.attach = true;
    const edits: Record<string, any> = {};
    if (bulk.month !== '') edits.month = Number(bulk.month);
    if (bulk.slot) edits.slot = bulk.slot;
    if (bulk.shiftDays) edits.shiftDays = Number(bulk.shiftDays);
    if (bulk.scaleRevenue) edits.scaleRevenue = Number(bulk.scaleRevenue);
    if (bulk.scalePrice) edits.scalePrice = Number(bulk.scalePrice);
    if (bulk.maxDiscount) edits.maxDiscount = Number(bulk.maxDiscount);
    if (bulk.find) edits.find = bulk.find;
    if (bulk.find || bulk.replace) edits.replace = bulk.replace;
    if (bulk.prefix) edits.prefix = bulk.prefix;
    if (bulk.suffix) edits.suffix = bulk.suffix;
    if (bulk.runAds) edits.runAds = bulk.runAds === 'yes';
    if (bulk.notes) edits.notes = bulk.notes;
    if (Object.keys(edits).length) payload.bulk = edits;
    const decisions: Record<string, 'skip'> = {};
    for (const [index, value] of Object.entries(leftOut)) if (value) decisions[index] = 'skip';
    if (Object.keys(decisions).length) payload.decisions = decisions;
    return payload;
  };

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api('/offers/import', { method: 'POST', body: JSON.stringify(body(dryRun)) });
      if (dryRun) {
        setPreview(result);
        // Stacked (tablet and phone), the preview sits below the form; bring it into view
        // so a check never looks like nothing happened.
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
          window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      } else {
        setDone(result);
        setPreview(result);
        onImported?.();
      }
    } catch (err: any) {
      setError(err.message || 'The import failed.');
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setPreview(null);
    setDone(null);
    await run(true);
  };

  const chooseFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ''));
      setPreview(null);
      setDone(null);
      setLeftOut({});
    };
    reader.readAsText(file);
  };

  const looksLikeCsv = useMemo(() => {
    const first = text.trim().split(/\r?\n/)[0] || '';
    if (!text.trim()) return false;
    if (first.startsWith('[') || first.startsWith('{')) return false;
    return first.includes(',') || first.includes('\t') || first.includes(';');
  }, [text]);

  const rowCount = useMemo(() => {
    if (!text.trim()) return 0;
    if (looksLikeCsv) return Math.max(0, text.trim().split(/\r?\n/).filter(Boolean).length - 1);
    try {
      const value = JSON.parse(text);
      if (Array.isArray(value)) return value.length;
      if (Array.isArray(value?.offers)) return value.offers.length;
      if (Array.isArray(value?.studios))
        return value.studios.flatMap((s: any) => (s?.months || []).flatMap((m: any) => m?.offers || [])).length;
      return 0;
    } catch {
      return -1;
    }
  }, [text, looksLikeCsv]);

  // Checking is free (a dry run), so the panel keeps itself up to date: change the file,
  // the month or a bulk edit and the preview re-runs a beat later. Nothing is written.
  useEffect(() => {
    if (!open || done || busy) return;
    if (!text.trim() || rowCount < 1 || !studio) return;
    const timer = window.setTimeout(() => {
      run(true).catch(() => {});
    }, 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, studio, mode, month, attach, bulk, leftOut, rowCount, open, done]);

  if (!open) return null;

  const rows: any[] = preview?.rows || [];
  const summary = preview?.summary;
  const actionable = rows.filter(r => r.action !== 'error' && r.action !== 'skip').length;
  const blocked = !text.trim() || rowCount < 1 || !studio || (mode === 'replace' && !month);

  return (
    <div className="pex-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()} role="presentation">
      <section className="pex pex-wide pex-import" role="dialog" aria-modal="true" aria-label="Import offers">
        <header className="pex-head">
          <div>
            <span className="pex-kicker">Import</span>
            <h2>Bring offers in from a file</h2>
            <p>
              Paste or drop JSON, or a CSV straight out of a spreadsheet. Every offer is validated against the
              location's discount cap before anything is written — and nothing is written until you press Import.
            </p>
          </div>
          <button type="button" className="pex-close" onClick={onClose} aria-label="Close import">
            <X size={17} />
          </button>
        </header>

        <div className="pex-body pex-body-split">
          <div className="pex-pane pex-pane-source">
            <div className="pex-block">
              <span className="pex-label">What should happen to offers that already exist?</span>
              <div className="pex-modes">
                {MODES.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={mode === item.id ? 'is-on' : ''}
                    aria-pressed={mode === item.id}
                    onClick={() => {
                      setMode(item.id);
                      setPreview(null);
                      setDone(null);
                    }}
                  >
                    <strong>{item.label}</strong>
                    <em>{item.blurb}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="pex-block pex-inline">
              <span className="pex-label">{mode === 'replace' ? 'Location and month to replace' : 'Location'}</span>
              <div className="pex-pair">
                <select
                  value={studio ?? ''}
                  onChange={e => {
                    setStudio(e.target.value ? Number(e.target.value) : null);
                    setPreview(null);
                    setDone(null);
                  }}
                  aria-label="Location"
                >
                  <option value="">Choose a location…</option>
                  {boot.studios.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {(mode === 'replace' || attach) && (
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
                    aria-label="Month"
                  >
                    <option value="">Choose a month…</option>
                    {MONTHS.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name} {year}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pex-checks">
                <button
                  type="button"
                  className={`pex-check${attach ? ' is-on' : ''}`}
                  aria-pressed={attach}
                  onClick={() => {
                    setAttach(v => !v);
                    setPreview(null);
                    setDone(null);
                  }}
                >
                  <span aria-hidden="true">{attach ? <Check size={11} /> : null}</span>
                  Put the imported offers on that month too
                </button>
              </div>
              <small>
                {mode === 'replace'
                  ? "The month's selection becomes exactly the imported offers. The bank is untouched."
                  : attach
                    ? 'The month will run what this file brings, in addition to what it already has.'
                    : 'Used for any offer in the file that does not name its own location.'}
              </small>
            </div>

            <div className="pex-block">
              <div className="pex-label-row">
                <span className="pex-label">
                  {looksLikeCsv ? (
                    <>
                      <FileSpreadsheet size={12} /> CSV / TSV
                    </>
                  ) : (
                    <>
                      <FileJson size={12} /> JSON
                    </>
                  )}
                </span>
                <div className="pex-label-actions">
                  <button type="button" onClick={() => setText(EXAMPLE)}>
                    JSON example
                  </button>
                  <button type="button" onClick={() => setText(EXAMPLE_CSV)}>
                    CSV example
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()}>
                    <Upload size={12} /> Choose file
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json,.csv,.tsv,text/csv,text/plain"
                    hidden
                    onChange={e => chooseFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <div
                className={`pex-drop${dragging ? ' is-over' : ''}`}
                onDragOver={e => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  chooseFile(e.dataTransfer?.files?.[0] || null);
                }}
              >
                <textarea
                  className="pex-code"
                  value={text}
                  onChange={e => {
                    setText(e.target.value);
                    setPreview(null);
                    setDone(null);
                    setLeftOut({});
                  }}
                  spellCheck={false}
                  placeholder={
                    'Paste JSON or CSV here, or drop a file.\n\n[ { "name": "…", "audience": "…", "expectedRevenue": 450000 } ]'
                  }
                  aria-label="Offers JSON or CSV"
                />
                {dragging && <span className="pex-drop-veil">Drop to read the file</span>}
              </div>
              <span className={`pex-hint${rowCount === -1 ? ' is-warn' : ''}`}>
                {rowCount === -1 ? (
                  <>
                    <AlertTriangle size={12} /> That is not valid JSON. Check the commas and quotes — or switch to CSV.
                  </>
                ) : rowCount === 0 ? (
                  <>
                    <AlertTriangle size={12} /> Nothing read yet.
                  </>
                ) : (
                  <>
                    <Check size={12} /> {rowCount} {rowCount === 1 ? 'offer' : 'offers'} read
                    {looksLikeCsv ? ' from the table' : ' from JSON'}
                  </>
                )}
              </span>
            </div>

            <div className="pex-block pex-bulk">
              <button
                type="button"
                className={`pex-bulk-toggle${showBulk ? ' is-open' : ''}${bulkActive(bulk) ? ' is-set' : ''}`}
                aria-expanded={showBulk}
                onClick={() => setShowBulk(v => !v)}
              >
                <SlidersHorizontal size={13} />
                Bulk edits
                {bulkActive(bulk) && <i />}
                <ChevronDown size={13} />
              </button>
              {showBulk && (
                <div className="pex-bulk-body">
                  <p className="pex-bulk-note">
                    Applied to every row in the file before it is checked, so the preview shows the result — not the
                    input.
                  </p>
                  <div className="pex-grid">
                    <label>
                      <span>Put on month</span>
                      <select
                        value={bulk.month}
                        onChange={e => setBulk({ ...bulk, month: e.target.value ? Number(e.target.value) : '' })}
                      >
                        <option value="">Leave as the file says</option>
                        {MONTHS.map((name, index) => (
                          <option key={name} value={index + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Slot</span>
                      <select value={bulk.slot} onChange={e => setBulk({ ...bulk, slot: e.target.value as any })}>
                        <option value="">Leave as the file says</option>
                        <option value="newcomer">Newcomer</option>
                        <option value="lapsed">Winback</option>
                        <option value="renewal">Renewal</option>
                      </select>
                    </label>
                    <label>
                      <span>Move dates by (days)</span>
                      <input
                        inputMode="numeric"
                        value={bulk.shiftDays}
                        onChange={e => setBulk({ ...bulk, shiftDays: e.target.value })}
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span>Discount ceiling (%)</span>
                      <input
                        inputMode="decimal"
                        value={bulk.maxDiscount}
                        onChange={e => setBulk({ ...bulk, maxDiscount: e.target.value })}
                        placeholder="cap each offer"
                      />
                    </label>
                    <label>
                      <span>Scale revenue ×</span>
                      <input
                        inputMode="decimal"
                        value={bulk.scaleRevenue}
                        onChange={e => setBulk({ ...bulk, scaleRevenue: e.target.value })}
                        placeholder="1.0"
                      />
                    </label>
                    <label>
                      <span>Scale price ×</span>
                      <input
                        inputMode="decimal"
                        value={bulk.scalePrice}
                        onChange={e => setBulk({ ...bulk, scalePrice: e.target.value })}
                        placeholder="1.0"
                      />
                    </label>
                    <label>
                      <span>Find in names</span>
                      <input
                        value={bulk.find}
                        onChange={e => setBulk({ ...bulk, find: e.target.value })}
                        placeholder="Jan"
                      />
                    </label>
                    <label>
                      <span>Replace with</span>
                      <input
                        value={bulk.replace}
                        onChange={e => setBulk({ ...bulk, replace: e.target.value })}
                        placeholder="Feb"
                      />
                    </label>
                    <label>
                      <span>Prefix every name</span>
                      <input
                        value={bulk.prefix}
                        onChange={e => setBulk({ ...bulk, prefix: e.target.value })}
                        placeholder="Mar · "
                      />
                    </label>
                    <label>
                      <span>Suffix every name</span>
                      <input
                        value={bulk.suffix}
                        onChange={e => setBulk({ ...bulk, suffix: e.target.value })}
                        placeholder=" (draft)"
                      />
                    </label>
                    <label>
                      <span>Run ads</span>
                      <select value={bulk.runAds} onChange={e => setBulk({ ...bulk, runAds: e.target.value as any })}>
                        <option value="">Leave as the file says</option>
                        <option value="yes">Yes — plan paid media</option>
                        <option value="no">No — organic only</option>
                      </select>
                    </label>
                    <label>
                      <span>Attach a note</span>
                      <input
                        value={bulk.notes}
                        onChange={e => setBulk({ ...bulk, notes: e.target.value })}
                        placeholder="Imported from the March sheet"
                      />
                    </label>
                  </div>
                  <div className="pex-bulk-foot">
                    <span>{bulkActive(bulk) ? 'Bulk edits are on — they apply to every row.' : 'No bulk edits.'}</span>
                    <button type="button" onClick={() => setBulk(EMPTY_BULK)} disabled={!bulkActive(bulk)}>
                      <RotateCcw size={11} /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pex-pane pex-pane-preview" ref={previewRef}>
            <div className="pex-preview-head">
              <span className="pex-label">Preview</span>
              {preview && (
                <button type="button" className="pex-recheck" disabled={busy || blocked} onClick={check}>
                  <RotateCcw size={11} /> Re-check
                </button>
              )}
            </div>
            {!preview && !busy && (
              <p className="pex-empty">
                Nothing checked yet. Preview runs the import as a dry run — no offer is created or changed until you
                press Import.
              </p>
            )}
            {busy && (
              <p className="pex-empty">
                <Loader2 size={14} className="spin" /> {done ? 'Importing…' : 'Checking the file…'}
              </p>
            )}
            {error && <p className="pex-error">{error}</p>}
            {preview && summary && (
              <>
                <div className="pex-summary">
                  <span className="is-create">{summary.create} new</span>
                  <span className="is-update">{summary.update} updated</span>
                  {summary.skip > 0 && <span className="is-skip">{summary.skip} skipped</span>}
                  {summary.error > 0 && <span className="is-error">{summary.error} failed</span>}
                  {summary.changedFields > 0 && (
                    <span className="is-fields">{summary.changedFields} fields change</span>
                  )}
                </div>
                <ul className="pex-rows">
                  {rows.map(row => {
                    const changes: any[] = row.changes || [];
                    const open = openRow === row.index;
                    return (
                      <li key={row.index} className={`is-${row.action}${leftOut[row.index] ? ' is-left-out' : ''}`}>
                        <div className="pex-row-line">
                          <b className="pex-row-action">{row.action === 'error' ? 'error' : row.action}</b>
                          <button
                            type="button"
                            className="pex-row-name"
                            aria-expanded={open}
                            onClick={() => setOpenRow(open ? null : row.index)}
                          >
                            {row.name}
                            {changes.length > 0 && (
                              <em>
                                {changes.length} field{changes.length === 1 ? '' : 's'}
                              </em>
                            )}
                          </button>
                          <button
                            type="button"
                            className={`pex-row-leave${leftOut[row.index] ? ' is-on' : ''}`}
                            title={leftOut[row.index] ? 'Put this row back in' : 'Leave this row out of the import'}
                            aria-label={leftOut[row.index] ? `Put ${row.name} back` : `Leave ${row.name} out`}
                            onClick={() => {
                              setLeftOut(current => ({ ...current, [row.index]: !current[row.index] }));
                              setPreview(null);
                            }}
                          >
                            {leftOut[row.index] ? <RotateCcw size={11} /> : <X size={11} />}
                          </button>
                        </div>
                        {row.messages?.length > 0 && <em className="pex-row-note">{row.messages.join(' · ')}</em>}
                        {open && changes.length > 0 && (
                          <dl className="pex-row-changes">
                            {changes.map(change => (
                              <div key={change.field}>
                                <dt>{change.label}</dt>
                                <dd>
                                  <s>{change.from}</s>
                                  <span>{change.to}</span>
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {done && (
                  <p className="pex-done">
                    <Check size={13} /> Imported {summary.create} new and updated {summary.update} offers
                    {done.attached
                      ? ` · ${done.attached.offers} offers now run in ${MONTHS[done.attached.month - 1]}${
                          done.attached.removed ? ` (${done.attached.removed} replaced)` : ''
                        }`
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
            {!studio
              ? 'Choose the location these offers belong to.'
              : mode === 'replace' && !month
                ? 'Choose a month to replace its selection, or switch to Add & update.'
                : 'Nothing is written until you press Import.'}
          </span>
          <button type="button" className="pex-cancel" onClick={onClose}>
            Close
          </button>
          <button type="button" className="pex-ghost" onClick={check} disabled={busy || blocked}>
            {busy && !done ? <Loader2 size={13} className="spin" /> : <Copy size={13} />}
            Preview
          </button>
          <button
            type="button"
            className="pex-go"
            onClick={() => run(false)}
            disabled={busy || !preview || actionable === 0 || blocked || Boolean(done)}
          >
            {busy && done ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
            {actionable ? `Import ${actionable} ${actionable === 1 ? 'offer' : 'offers'}` : 'Import'}
          </button>
        </footer>
      </section>
    </div>
  );
}
