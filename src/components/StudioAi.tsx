import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Copy as CopyIcon,
  FileText,
  Gauge,
  Lightbulb,
  ListChecks,
  PenLine,
  RefreshCw,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { post } from '../api';
import { Button, Callout, Drawer, Loading, Select } from './ui';

/* ─────────────────────────────────────────────────────────────────────────────
   Studio intelligence.

   Five tools over the same month: an audit that scores the plan, a copy editor
   that rewrites a sentence three ways, a name generator, a four-week action plan
   and a set of writing goals. All of it is deterministic — every line is computed
   from this month's own figures, which is why each result quotes a number.
   ──────────────────────────────────────────────────────────────────────────── */

type Tab = 'audit' | 'copy' | 'names' | 'plan' | 'goals';

const TABS: { id: Tab; label: string; icon: any; hint: string }[] = [
  { id: 'audit', label: 'Audit', icon: ClipboardCheck, hint: 'Score the month and name what is wrong' },
  { id: 'copy', label: 'Copy', icon: PenLine, hint: 'Rewrite a passage three ways' },
  { id: 'names', label: 'Names', icon: Wand2, hint: 'Name an offer like a person would' },
  { id: 'plan', label: 'Actions', icon: ListChecks, hint: 'Four weeks, dated and owned' },
  { id: 'goals', label: 'Goals', icon: Target, hint: 'Commitments with a measurement' },
];

const SEV_LABEL: Record<string, string> = {
  critical: 'Blocks the month',
  warn: 'Needs a decision',
  info: 'Worth fixing',
  good: 'Holds',
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(key);
        window.setTimeout(() => setCopied(null), 1600);
      },
      () => setCopied(null),
    );
  }, []);
  return { copied, copy };
}

function CopyButton({ text, id, label = 'Copy' }: { text: string; id: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" className="ai-copy" onClick={() => copy(text, id)} aria-label={label}>
      {copied === id ? <BadgeCheck size={13} /> : <CopyIcon size={13} />}
      {copied === id ? 'Copied' : label}
    </button>
  );
}

function ScoreDial({ score }: { score: number }) {
  const tone = score >= 85 ? 'is-good' : score >= 65 ? 'is-warm' : score >= 40 ? 'is-warn' : 'is-bad';
  return (
    <div className={`ai-score ${tone}`}>
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle className="ai-score-track" cx="48" cy="48" r="40" />
        <circle
          className="ai-score-arc"
          cx="48"
          cy="48"
          r="40"
          pathLength={100}
          style={{ strokeDasharray: `${score} 100` }}
        />
      </svg>
      <b>{score}</b>
      <em>of 100</em>
    </div>
  );
}

export default function StudioAi({
  studioId,
  year,
  month,
  monthName,
  theme,
  onUseCopy,
  onClose,
}: {
  studioId: number | null;
  year: number;
  month: number;
  monthName: string;
  theme?: string;
  onUseCopy?: (text: string, kind: 'theme' | 'text') => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('audit');
  const [review, setReview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // copy
  const [draft, setDraft] = useState(theme || '');
  const [tone, setTone] = useState('Sharper');
  const [copyResult, setCopyResult] = useState<any>(null);

  // names
  const [audience, setAudience] = useState('lapsed members');
  const [kind, setKind] = useState('comeback pack');
  const [names, setNames] = useState<any>(null);

  // plan + goals
  const [plan, setPlan] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);

  const scope = useMemo(() => ({ studioId, year, month }), [studioId, year, month]);

  const run = useCallback(
    async (path: string, body: any = {}) => {
      setBusy(true);
      setError(null);
      try {
        return await post(`/studio-ai/${path}`, { ...scope, ...body });
      } catch (err: any) {
        setError(err?.message || 'The studio engine could not answer.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    let alive = true;
    post('/studio-ai/review', scope)
      .then(result => alive && setReview(result))
      .catch((err: any) => alive && setError(err?.message || 'The audit could not run.'));
    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    if (tab === 'plan' && !plan) run('action-plan').then(r => r && setPlan(r));
    if (tab === 'goals' && !goals) run('goals').then(r => r && setGoals(r));
    if (tab === 'names' && !names) run('names', { audience, kind }).then(r => r && setNames(r));
  }, [tab, plan, goals, names, run, audience, kind]);

  return (
    <Drawer
      title={
        <span className="ai-title">
          <Sparkles size={17} />
          Studio intelligence
          <em>
            {monthName} {year}
          </em>
        </span>
      }
      subtitle="Reads this month's own numbers. Nothing here is written back to the plan until you copy it in."
      onClose={onClose}
    >
      <div className="ai">
        <nav className="ai-tabs" role="tablist" aria-label="Studio intelligence tools">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'on' : ''}
                onClick={() => setTab(t.id)}
                title={t.hint}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {error && <Callout tone="warning">{error}</Callout>}

        {/* ── Audit ─────────────────────────────────────────────────────── */}
        {tab === 'audit' &&
          (!review ? (
            <Loading label="Auditing the month…" />
          ) : (
            <div className="ai-stack">
              <header className="ai-verdict">
                <ScoreDial score={review.score} />
                <div>
                  <span className="ai-eyebrow">The verdict</span>
                  <h3>{review.verdict}</h3>
                  <p>
                    {review.facts?.offers?.length || 0} offers carrying{' '}
                    {review.facts?.coverage ? `${Math.round(review.facts.coverage * 100)}%` : '0%'} of the target ·{' '}
                    {review.findings.length} findings · sentiment <b>{review.sentiment?.label}</b> (
                    {review.sentiment?.score})
                  </p>
                </div>
                <button
                  type="button"
                  className="ai-ghost"
                  onClick={() => run('review').then(r => r && setReview(r))}
                  disabled={busy}
                >
                  <RefreshCw size={13} className={busy ? 'is-spinning' : ''} />
                  Re-run
                </button>
              </header>

              <section className="ai-block">
                <span className="ai-eyebrow">
                  <Gauge size={12} /> Findings
                </span>
                <ul className="ai-findings">
                  {review.findings.map((f: any) => (
                    <li key={f.id} className={`is-${f.severity}`}>
                      <span className="ai-find-sev">{SEV_LABEL[f.severity] || f.severity}</span>
                      <b>{f.title}</b>
                      <p>{f.detail}</p>
                      <span className="ai-fix">
                        <Lightbulb size={12} /> {f.fix}
                      </span>
                      {f.metric && <em className="ai-metric">{f.metric}</em>}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ai-block">
                <span className="ai-eyebrow">
                  <FileText size={12} /> How the month reads
                </span>
                <div className="ai-sentiment">
                  <div className="ai-sent-bar" aria-hidden="true">
                    <i style={{ ['--s' as string]: `${(review.sentiment.score + 1) * 50}%` } as React.CSSProperties} />
                  </div>
                  <div className="ai-sent-meta">
                    <b>{review.sentiment.label}</b>
                    <span>
                      {review.sentiment.score > 0 ? '+' : ''}
                      {review.sentiment.score} · {review.sentiment.words} words
                    </span>
                  </div>
                  <p className="ai-note">{review.sentiment.note}</p>
                  <ul className="ai-drivers">
                    {review.sentiment.drivers.map((d: any) => (
                      <li key={d.term} className={d.kind}>
                        {d.term}
                      </li>
                    ))}
                    {!review.sentiment.drivers.length && <li className="is-none">No charged words found.</li>}
                  </ul>
                </div>
              </section>
            </div>
          ))}

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        {tab === 'copy' && (
          <div className="ai-stack">
            <label className="ai-field">
              <span className="ai-eyebrow">
                <PenLine size={12} /> The passage
              </span>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={4}
                placeholder="Paste the month's focus, brief or an offer line…"
              />
            </label>
            <div className="ai-row">
              <label className="ai-field is-compact">
                <span className="ai-eyebrow">Lead with</span>
                <Select value={tone} onChange={e => setTone(e.target.value)}>
                  <option>Tighter</option>
                  <option>Warmer</option>
                  <option>Sharper</option>
                </Select>
              </label>
              <Button
                variant="primary"
                disabled={busy || !draft.trim()}
                onClick={() => run('copy', { text: draft, tone }).then(r => r && setCopyResult(r))}
              >
                <Sparkles size={14} />
                {busy ? 'Rewriting…' : 'Rewrite it'}
              </Button>
            </div>

            {busy && !copyResult && <Loading label="Turning the sentence over…" />}

            {copyResult && (
              <>
                <section className="ai-block">
                  <span className="ai-eyebrow">Three ways</span>
                  <ul className="ai-copies">
                    {copyResult.alternatives.map((a: any) => (
                      <li key={a.tone} className={a.tone === tone ? 'is-picked' : ''}>
                        <div className="ai-copy-head">
                          <b>{a.tone}</b>
                          <span>{a.why}</span>
                        </div>
                        <p>{a.text}</p>
                        <div className="ai-copy-foot">
                          <CopyButton text={a.text} id={a.tone} />
                          {onUseCopy && (
                            <button type="button" className="ai-use" onClick={() => onUseCopy(a.text, 'text')}>
                              Use in the plan <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="ai-block">
                  <span className="ai-eyebrow">What the edit noticed</span>
                  <ul className="ai-notes">
                    {copyResult.notes.map((n: string, i: number) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </div>
        )}

        {/* ── Names ─────────────────────────────────────────────────────── */}
        {tab === 'names' && (
          <div className="ai-stack">
            <div className="ai-row">
              <label className="ai-field is-compact">
                <span className="ai-eyebrow">Audience</span>
                <Select value={audience} onChange={e => setAudience(e.target.value)}>
                  <option>newcomers</option>
                  <option>lapsed members</option>
                  <option>members renewing</option>
                  <option>existing members</option>
                  <option>gifting & referrals</option>
                </Select>
              </label>
              <label className="ai-field is-compact">
                <span className="ai-eyebrow">Mechanic</span>
                <Select value={kind} onChange={e => setKind(e.target.value)}>
                  <option>comeback pack</option>
                  <option>trial offer</option>
                  <option>membership renewal</option>
                  <option>class pack</option>
                  <option>gift card</option>
                </Select>
              </label>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => run('names', { audience, kind }).then(r => r && setNames(r))}
              >
                <Wand2 size={14} />
                {busy ? 'Thinking…' : 'New names'}
              </Button>
            </div>

            {!names ? (
              <Loading label="Naming offers…" />
            ) : (
              <>
                <ul className="ai-names">
                  {names.names.map((n: any) => (
                    <li key={n.name}>
                      <div>
                        <b>{n.name}</b>
                        <span className={`ai-tone is-${n.tone}`}>{n.tone}</span>
                        <p>{n.why}</p>
                      </div>
                      <CopyButton text={n.name} id={n.name} />
                    </li>
                  ))}
                </ul>
                <p className="ai-note">{names.guidance}</p>
              </>
            )}
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        {tab === 'plan' &&
          (!plan ? (
            <Loading label="Sequencing the month…" />
          ) : (
            <div className="ai-stack">
              <div className="ai-plan-head">
                <div>
                  <span className="ai-eyebrow">Four weeks</span>
                  <h3>{plan.owner}</h3>
                  <p>{plan.note}</p>
                </div>
                <CopyButton
                  id="plan"
                  label="Copy the plan"
                  text={plan.weeks
                    .map(
                      (w: any) =>
                        `Week ${w.week} — ${w.label} (${w.metric})\n${w.actions.map((a: string) => `• ${a}`).join('\n')}`,
                    )
                    .join('\n\n')}
                />
              </div>
              <ol className="ai-weeks">
                {plan.weeks.map((w: any) => (
                  <li key={w.week}>
                    <span className="ai-week-no">{w.week}</span>
                    <div>
                      <b>{w.label}</b>
                      <em>{w.metric}</em>
                      <ul>
                        {w.actions.map((a: string, i: number) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}

        {/* ── Goals ─────────────────────────────────────────────────────── */}
        {tab === 'goals' &&
          (!goals ? (
            <Loading label="Writing the goals…" />
          ) : (
            <div className="ai-stack">
              <p className="ai-note">{goals.note}</p>
              <ul className="ai-goals">
                {goals.goals.map((g: any) => (
                  <li key={g.id}>
                    <span className="ai-horizon">{g.horizon}</span>
                    <b>{g.statement}</b>
                    <div className="ai-goal-move">
                      <span>{g.from}</span>
                      <ArrowRight size={12} />
                      <strong>{g.to}</strong>
                    </div>
                    <em>
                      {g.metric} · {g.how}
                    </em>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </Drawer>
  );
}
