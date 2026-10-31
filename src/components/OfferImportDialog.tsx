import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, FileJson, Loader2, Upload, X } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { MONTHS } from '../types';

/* Importing offers.

   Two files arrive in practice: a hand-written list of offers, and a plan export that has
   been edited and needs to come back in. Both are the same gesture here — paste or choose
   the JSON, say what should happen to offers that already exist, look at the preview, then
   commit. The preview is the server's own dry run, so what the table says is exactly what
   the import will do, including the guardrail failures. */

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [done, setDone] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setText('');
    setPreview(null);
    setDone(null);
    setError(null);
    setMode('upsert');
    setMonth('');
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

  const parsed = useMemo(() => {
    if (!text.trim()) return { ok: false as const, offers: [] as any[], reason: 'Nothing pasted yet.' };
    try {
      const value = JSON.parse(text);
      const list = Array.isArray(value)
        ? value
        : Array.isArray(value?.offers)
          ? value.offers
          : Array.isArray(value?.studios)
            ? value.studios.flatMap((s: any) =>
                (s?.months || []).flatMap((m: any) => (m?.offers || []).map((o: any) => ({ ...o, month: m.month }))),
              )
            : [];
      if (!list.length) return { ok: false as const, offers: [], reason: 'That JSON has no offers in it.' };
      return { ok: true as const, offers: list as any[], reason: null as string | null };
    } catch (err: any) {
      return { ok: false as const, offers: [] as any[], reason: `Not valid JSON: ${err.message}` };
    }
  }, [text]);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const payload: any = {
        mode,
        year,
        dryRun,
        offers: parsed.offers,
      };
      if (studio) payload.studioId = studio;
      if (month) payload.month = Number(month);
      const result = await api('/offers/import', { method: 'POST', body: JSON.stringify(payload) });
      if (dryRun) setPreview(result);
      else {
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

  const chooseFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ''));
      setPreview(null);
      setDone(null);
    };
    reader.readAsText(file);
  };

  if (!open) return null;

  const rows: any[] = preview?.rows || [];
  const summary = preview?.summary;
  const actionable = rows.filter(r => r.action !== 'error' && r.action !== 'skip').length;

  return (
    <div className="pex-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()} role="presentation">
      <section className="pex pex-wide" role="dialog" aria-modal="true" aria-label="Import offers from JSON">
        <header className="pex-head">
          <div>
            <span className="pex-kicker">Import</span>
            <h2>Bring offers in from a file</h2>
            <p>
              Paste JSON or choose a <code>.json</code> file — a list of offers, or a plan export you have edited. Every
              offer is validated against the studio's discount cap before anything is written.
            </p>
          </div>
          <button type="button" className="pex-close" onClick={onClose} aria-label="Close import">
            <X size={17} />
          </button>
        </header>

        <div className="pex-body pex-body-split">
          <div className="pex-pane">
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
                {mode === 'replace' && (
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
                    aria-label="Month to replace"
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
              <small>
                {mode === 'replace'
                  ? "The month's selection becomes exactly the imported offers. The bank is untouched."
                  : 'Used for any offer in the file that does not name its own location.'}
              </small>
            </div>

            <div className="pex-block">
              <div className="pex-label-row">
                <span className="pex-label">JSON</span>
                <div className="pex-label-actions">
                  <button type="button" onClick={() => setText(EXAMPLE)}>
                    Use an example
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()}>
                    <Upload size={12} /> Choose file
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={e => chooseFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <textarea
                className="pex-code"
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  setPreview(null);
                  setDone(null);
                }}
                spellCheck={false}
                placeholder={'[\n  { "name": "…", "audience": "…", "mechanics": { … } }\n]'}
                aria-label="Offers JSON"
              />
              <span className={`pex-hint${parsed.ok ? '' : ' is-warn'}`}>
                {parsed.ok ? (
                  <>
                    <Check size={12} /> {parsed.offers.length} offer{parsed.offers.length === 1 ? '' : 's'} read
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> {parsed.reason}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="pex-pane pex-pane-preview">
            <span className="pex-label">Preview</span>
            {!preview && !busy && (
              <p className="pex-empty">
                Nothing checked yet. Preview runs the import as a dry run — no offer is created or changed until you
                import.
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
                </div>
                <ul className="pex-rows">
                  {rows.map(row => (
                    <li key={row.index} className={`is-${row.action}`}>
                      <b className="pex-row-action">{row.action === 'error' ? 'error' : row.action}</b>
                      <span className="pex-row-name">{row.name}</span>
                      {row.messages?.length > 0 && <em>{row.messages.join(' · ')}</em>}
                    </li>
                  ))}
                </ul>
                {done && (
                  <p className="pex-done">
                    <Check size={13} /> Imported {summary.create} new and updated {summary.update} offers
                    {done.attached
                      ? ` · ${done.attached.offers} offers attached to ${MONTHS[done.attached.month - 1]}`
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
          <button
            type="button"
            className="pex-ghost"
            onClick={() => run(true)}
            disabled={busy || !parsed.ok || !studio || (mode === 'replace' && !month)}
          >
            Preview
          </button>
          <button
            type="button"
            className="pex-go"
            onClick={() => run(false)}
            disabled={busy || !parsed.ok || !preview || actionable === 0 || !studio || (mode === 'replace' && !month)}
          >
            {busy ? <Loader2 size={14} className="spin" /> : <FileJson size={14} />}
            {actionable ? `Import ${actionable} ${actionable === 1 ? 'offer' : 'offers'}` : 'Import'}
          </button>
        </footer>
      </section>
    </div>
  );
}
