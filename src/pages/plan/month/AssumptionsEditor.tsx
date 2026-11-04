import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../App';
import { Button } from '../../../components/ui';
import { money, number } from '../../../types';
import { pct } from './shared';

export const ASSUMPTION_FIELDS: Array<{ key: string; label: string; hint: string; kind: 'money' | 'rate' }> = [
  { key: 'firstSpend', label: 'Average first spend', hint: 'Per new paying member', kind: 'money' },
  { key: 'trialSpend', label: 'Trial fee', hint: 'Per completed trial', kind: 'money' },
  { key: 'trialToMember', label: 'Trial → member', hint: 'Trials that become paying members', kind: 'rate' },
  { key: 'leadToTrial', label: 'Lead → trial', hint: 'Leads that complete a trial', kind: 'rate' },
  { key: 'renewalRate', label: 'Renewal rate', hint: 'Expiring memberships that renew', kind: 'rate' },
  { key: 'renewalTicket', label: 'Renewal ticket', hint: 'Revenue per renewal', kind: 'money' },
  { key: 'reactivationTicket', label: 'Reactivation ticket', hint: 'Revenue per returning member', kind: 'money' },
];

// Studio-specific spends and conversion rates. A value typed here replaces the history-based one in every month
// of this studio's plan; clearing a field returns it to history.
export function AssumptionsEditor({
  studioId,
  studioName,
  year,
  editable,
  assumptions,
  onSaved,
}: {
  studioId: number;
  studioName: string;
  year: number;
  editable: boolean;
  assumptions: Record<string, { auto: number | null; override: number | null }>;
  onSaved: () => Promise<unknown>;
}) {
  const { toast } = useApp();
  const show = (kind: 'money' | 'rate', v: number | null) =>
    v === null || v === undefined ? '' : String(kind === 'rate' ? Math.round(v * 100) : Math.round(v));
  const initial = () =>
    Object.fromEntries(ASSUMPTION_FIELDS.map(f => [f.key, show(f.kind, assumptions?.[f.key]?.override ?? null)]));
  const [draft, setDraft] = useState<Record<string, string>>(initial),
    [busy, setBusy] = useState(false);
  const signature = JSON.stringify(initial());
  useEffect(() => setDraft(initial()), [signature, studioId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== signature;
  const customised = ASSUMPTION_FIELDS.filter(
    f => assumptions?.[f.key]?.override !== null && assumptions?.[f.key]?.override !== undefined,
  ).length;
  const save = async (values: Record<string, number | null>, done: string) => {
    setBusy(true);
    try {
      await api(`/studio-assumptions/${studioId}/${year}`, { method: 'PUT', body: JSON.stringify({ values }) });
      await onSaved();
      toast(done);
    } catch (e: any) {
      toast(e.message || 'Could not save assumptions.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    const values: Record<string, number | null> = {};
    for (const f of ASSUMPTION_FIELDS) {
      const raw = draft[f.key].trim();
      if (raw === '') values[f.key] = null;
      else {
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0) return toast(`${f.label} must be a positive number.`, 'error');
        values[f.key] = f.kind === 'rate' ? num / 100 : num;
      }
    }
    return save(values, `${studioName} assumptions applied to all months`);
  };
  return (
    <div className="mw-assume">
      <div className="mw-assume-grid">
        {ASSUMPTION_FIELDS.map(f => {
          const a = assumptions?.[f.key],
            custom = a?.override !== null && a?.override !== undefined;
          return (
            <label key={f.key} className={custom ? 'custom' : ''}>
              <span>
                {f.label}
                {custom && <em>edited</em>}
              </span>
              <div className="mw-assume-input">
                {f.kind === 'money' && <i>₹</i>}
                <input
                  type="number"
                  min={0}
                  step={f.kind === 'rate' ? 1 : 100}
                  inputMode="decimal"
                  disabled={!editable || busy}
                  value={draft[f.key] ?? ''}
                  placeholder={show(f.kind, a?.auto ?? null) || 'auto'}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                />
                {f.kind === 'rate' && <i>%</i>}
              </div>
              <small>
                History:{' '}
                {a?.auto === null || a?.auto === undefined
                  ? '—'
                  : f.kind === 'rate'
                    ? pct(a.auto, 0)
                    : money(a.auto, true)}{' '}
                · {f.hint}
              </small>
            </label>
          );
        })}
      </div>
      {editable && (
        <div className="mw-assume-actions">
          <Button variant="primary" disabled={!dirty || busy} onClick={apply}>
            {busy ? 'Recalculating…' : 'Apply to all months'}
          </Button>
          {customised > 0 && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                save(Object.fromEntries(ASSUMPTION_FIELDS.map(f => [f.key, null])), 'Back to history-based assumptions')
              }
            >
              Reset to history
            </Button>
          )}
          <small>
            {customised
              ? `${customised} assumption${customised > 1 ? 's' : ''} customised for ${studioName}.`
              : 'Using history for every assumption.'}
          </small>
        </div>
      )}
    </div>
  );
}
