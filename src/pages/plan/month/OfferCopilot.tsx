import { Check, CheckCircle2, Sparkles, Target, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { money, number, titleCase } from '../../../types';
import { lakh } from '../usePlanData';

export const ACTION_LABEL = { add: 'New offer', replace: 'Replaces', optimise: 'Sharpens' } as const;

// AI offer copilot: asks for proposals, shows each with its priced effect, and saves only what the planner applies.
export function OfferCopilot({ state, steer, setSteer, busy, onAsk, onApply, onClose, current }: any) {
  const loading = !!state?.loading || !!state?.creating;
  const unlocked = current.filter((o: any) => o.approval_status !== 'approved');
  const list = (value: any) => {
    if (Array.isArray(value)) return value;
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  };
  return (
    <div className={`mw-copilot ${state ? 'open' : ''}`}>
      <div className="mw-cp-bar">
        <span className="mw-cp-badge">
          <Sparkles size={14} /> Offer copilot
        </span>
        <input
          value={steer}
          maxLength={400}
          placeholder="Optional steer — e.g. “push 3-month memberships, keep discounts under 15%”"
          onChange={e => setSteer(e.target.value)}
        />
        <Button
          size="sm"
          variant="primary"
          disabled={loading || busy || !unlocked.length}
          onClick={() => onAsk('optimise')}
        >
          Optimise this set
        </Button>
        <Button size="sm" variant="ghost" disabled={loading || busy} onClick={() => onAsk('suggest')}>
          Suggest new offers
        </Button>
      </div>
      {loading && (
        <p className="mw-cp-loading">
          <Sparkles size={14} />{' '}
          {state?.creating
            ? 'Creating complete draft offers and adding them to this month…'
            : 'Working through the numbers…'}
        </p>
      )}
      {state && !loading && (
        <div className="mw-cp-results">
          <div className="mw-cp-head">
            <p>{state.summary || 'Nothing to change.'}</p>
            <div>
              {state.proposals.length > 1 && (
                <Button size="sm" variant="primary" disabled={busy} onClick={() => onApply(state.proposals)}>
                  Apply all {state.proposals.length}
                </Button>
              )}
              <button className="mw-cp-x" aria-label="Dismiss suggestions" onClick={onClose}>
                <X size={15} />
              </button>
            </div>
          </div>
          {state.proposals.map((p: any, i: number) => (
            <article key={`${p.name}-${i}`} className={`mw-cp-card ${p.action}`}>
              <header>
                <span className="mw-cp-tag">
                  {ACTION_LABEL[p.action as keyof typeof ACTION_LABEL]}
                  {p.replaces ? ` · ${p.replaces}` : ''}
                </span>
                <h5>{p.name}</h5>
                {p.headline && <p className="mw-cp-job">{p.headline}</p>}
              </header>
              <p className="mw-cp-benefit">{p.benefit}</p>
              <dl>
                <div>
                  <dt>Price</dt>
                  <dd>
                    {p.price ? money(p.price) : '—'}
                    {p.discountPct > 0 && <small> · {Math.round(p.discountPct)}% off</small>}
                  </dd>
                </div>
                <div>
                  <dt>Units</dt>
                  <dd>{number(p.targetPurchases)}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{lakh(p.revenue)}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>{p.audience || '—'}</dd>
                </div>
              </dl>
              <p className="mw-cp-why">{p.rationale}</p>
              <footer>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  icon={<Check size={14} />}
                  onClick={() => onApply([p])}
                >
                  Apply
                </Button>
              </footer>
            </article>
          ))}
          {(state.created || []).map(({ proposal: p, offerId, offer }: any) => (
            <article key={`created-${offerId}`} className="mw-cp-card created">
              <header>
                <span className="mw-cp-tag">
                  <CheckCircle2 size={12} /> Draft offer created · #{offerId}
                </span>
                <h5>{offer.name}</h5>
                {offer.headline && <p className="mw-cp-job">{offer.headline}</p>}
              </header>
              <p className="mw-cp-benefit">{offer.benefit}</p>
              <dl>
                <div>
                  <dt>Membership</dt>
                  <dd>{p.productKey}</dd>
                </div>
                <div>
                  <dt>Type · objective</dt>
                  <dd>
                    {titleCase(p.offerType)} · {titleCase(p.objective)}
                  </dd>
                </div>
                <div>
                  <dt>Audience</dt>
                  <dd>{offer.audience}</dd>
                </div>
                <div>
                  <dt>Price · discount</dt>
                  <dd>
                    {money(offer.expected_asp)} · {p.discountPct}% off
                  </dd>
                </div>
                <div>
                  <dt>Target buyers</dt>
                  <dd>{number(offer.target_purchases)}</dd>
                </div>
                <div>
                  <dt>Expected revenue</dt>
                  <dd>{lakh(offer.expected_revenue)}</dd>
                </div>
                <div>
                  <dt>Validity</dt>
                  <dd>
                    {offer.validity_start} – {offer.validity_end}
                  </dd>
                </div>
                <div>
                  <dt>Call to action</dt>
                  <dd>{offer.cta}</dd>
                </div>
                <div className="wide">
                  <dt>Redemption terms</dt>
                  <dd>{offer.redemption_conditions}</dd>
                </div>
                <div className="wide">
                  <dt>Exclusions</dt>
                  <dd>{offer.excluded_audience}</dd>
                </div>
              </dl>
              <p className="mw-cp-why">{offer.rationale}</p>
              {list(offer.success_metrics).length > 0 && (
                <details>
                  <summary>Success metrics</summary>
                  <ul>
                    {list(offer.success_metrics).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
              {list(offer.risks).length > 0 && (
                <details>
                  <summary>Risks and assumptions</summary>
                  <ul>
                    {list(offer.risks).map((item: string, index: number) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
              <footer>
                <span>Saved as a draft in the selected month plan. Costs are needed before approval.</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
