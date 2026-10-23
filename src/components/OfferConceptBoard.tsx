import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Check, ChevronDown, Copy, Edit3, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { api, post } from '../api';
import { useApp } from '../App';
import { MONTHS, money, number, percent, titleCase } from '../types';
import { Badge, Button, Callout, Card, DefinitionList, Modal, TableScroll, Tabs } from './ui';

export default function OfferConceptBoard({
  offers,
  source = 'rules_engine',
  onSaved,
}: {
  offers: any[];
  source?: string;
  onSaved?: (offer: any) => void;
}) {
  const { toast, year } = useApp(),
    navigate = useNavigate();
  const [selected, setSelected] = useState(0),
    [tab, setTab] = useState('strategy'),
    [saved, setSaved] = useState<Record<number, number>>({}),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState<any>(null);
  if (!offers.length) return null;
  const offer = offers[Math.min(selected, offers.length - 1)],
    f = offer.financials || {};
  const saveOffer = async (index: number) => {
    const item = offers[index];
    if (saved[index]) return saved[index];
    const result = await post('/offers', {
      ...item,
      generationSource: item.randomised ? 'random_engine' : source === 'openai' ? 'openai' : 'rules_engine',
      dataMode: 'user',
      status: source === 'openai' ? 'ai_generated' : 'draft',
    });
    setSaved(current => ({ ...current, [index]: result.id }));
    onSaved?.(result);
    toast('Offer saved to the persistent Offer Bank.');
    return result.id;
  };
  const addCampaign = async (index: number, force = false) => {
    const item = offers[index];
    setBusy(true);
    try {
      const offerId = await saveOffer(index);
      const body = {
        name: item.name,
        studioId: item.studioId,
        offerId,
        year: item.year || year,
        startDate: item.validityStart,
        endDate: item.validityEnd,
        audience: item.audience,
        objective: item.objective,
        targetRevenue: item.revenueTarget,
        expectedPurchases: item.targetPurchases,
        notes:
          'Created from a financially calculated offer concept. Validate audience and obtain approval before activation.',
        force,
      };
      await post('/campaigns', body);
      toast('Draft campaign added to the sales calendar.');
      setConflict(null);
    } catch (error: any) {
      if (error.status === 409 && !force) setConflict({ index, conflicts: error.conflicts || [] });
      else toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="concept-board">
      <div className="concept-board-header">
        <div>
          <h2>Generated offer portfolio</h2>
          <p>
            {source === 'openai'
              ? 'AI-created concepts; application-calculated financials.'
              : 'Evidence-based rules-engine concepts; deterministic financial scenarios.'}
          </p>
        </div>
        <Badge tone={source === 'openai' ? 'purple' : 'blue'}>
          {source === 'openai' ? 'AI + calculation engine' : 'Planning engine · not AI'}
        </Badge>
      </div>
      <TableScroll>
        <table className="data-table concept-table">
          <thead>
            <tr>
              <th>Concept</th>
              <th>Mechanism</th>
              <th className="num">Target</th>
              <th className="num">Expected revenue</th>
              <th className="num">ASP</th>
              <th className="num">Effective discount</th>
              <th className="num">Target gap</th>
              <th>Fit</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o, i) => (
              <tr
                key={`${o.name}-${i}`}
                className={selected === i ? 'selected-row clickable-row' : 'clickable-row'}
                onClick={() => setSelected(i)}
              >
                <td>
                  <strong>{o.name}</strong>
                  <span>
                    {o.productName} · {o.audience}
                  </span>
                  {o.recommended && (
                    <Badge tone="green">
                      <Sparkles size={11} /> Recommended
                    </Badge>
                  )}
                </td>
                <td>{titleCase(o.offerType)}</td>
                <td className="num">{money(o.revenueTarget, true)}</td>
                <td className="num">
                  <strong>{money(o.expectedRevenue, true)}</strong>
                </td>
                <td className="num">{money(o.expectedAsp)}</td>
                <td className="num">{percent(o.effectiveDiscount)}</td>
                <td className={`num ${o.financials?.targetGap > 0 ? 'negative-text' : 'positive-text'}`}>
                  {money(o.financials?.targetGap, true)}
                </td>
                <td>
                  <Badge tone={o.financials?.errors?.length ? 'red' : o.score > 75 ? 'green' : 'amber'}>
                    {o.financials?.errors?.length ? 'Invalid' : `${o.score}/100`}
                  </Badge>
                  <ChevronDown size={14} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <div className="concept-detail">
        <div className="concept-detail-title">
          <div>
            <span className="eyebrow">
              OPTION {selected + 1} OF {offers.length}
            </span>
            <h3>{offer.name}</h3>
            <p>{offer.headline}</p>
          </div>
          <div className="button-row">
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit3 size={14} />}
              onClick={() => navigate('/offer-builder', { state: { concept: offer } })}
            >
              Edit terms
            </Button>
            <Button
              size="sm"
              icon={saved[selected] ? <Check size={14} /> : <Save size={14} />}
              onClick={() => saveOffer(selected).catch((e: any) => toast(e.message, 'error'))}
            >
              {saved[selected] ? 'Saved to bank' : 'Save to bank'}
            </Button>
            <Button
              variant="dark"
              size="sm"
              icon={<CalendarPlus size={14} />}
              disabled={busy}
              onClick={() => addCampaign(selected)}
            >
              Add to calendar
            </Button>
          </div>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'strategy', label: 'Strategy & copy' },
            { id: 'financials', label: 'Financials & what-if' },
            { id: 'risks', label: 'Eligibility & risks' },
          ]}
        />
        {tab === 'strategy' && (
          <div className="two-column">
            <div>
              <h4>Customer-facing copy</h4>
              <div className="customer-copy">{offer.customerCopy}</div>
              <h4>Recommended call to action</h4>
              <p>
                <Badge tone="dark">{offer.cta}</Badge>
              </p>
            </div>
            <div>
              <h4>Internal strategic rationale</h4>
              <p>{offer.rationale}</p>
              <DefinitionList
                items={[
                  ['Objective', titleCase(offer.objective)],
                  ['Eligible audience', offer.audience],
                  ['Studio', offer.studioName],
                  ['Campaign', `${MONTHS[(offer.month || 1) - 1]} ${offer.year}`],
                  ['Benefit', offer.benefit],
                ]}
              />
            </div>
          </div>
        )}
        {tab === 'financials' && (
          <>
            <div className="detail-metrics five">
              <div>
                <span>Required buyers</span>
                <strong>{number(f.requiredBuyers)}</strong>
              </div>
              <div>
                <span>Expected buyers</span>
                <strong>{number(f.expectedBuyers)}</strong>
              </div>
              <div>
                <span>Expected redemptions</span>
                <strong>{number(f.expectedRedemptions)}</strong>
              </div>
              <div>
                <span>Discount cost</span>
                <strong>{money(f.discountCost, true)}</strong>
              </div>
              <div>
                <span>Contribution margin</span>
                <strong>{money(f.contributionMargin, true)}</strong>
              </div>
            </div>
            <DefinitionList
              items={[
                ['Listed price', money(offer.mechanics?.listedPrice)],
                ['Effective selling price', money(f.sellingPrice)],
                ['Expected revenue', money(f.expectedRevenue)],
                ['Revenue vs baseline', money(f.revenueVsBaseline)],
                ['Incremental scenario', money(f.incrementalRevenue)],
                ['Break-even buyers', number(f.breakEvenBuyers)],
                ['Economics', f.economicsComplete ? 'Complete with supplied costs' : 'Incomplete — costs missing'],
                ['Financial status', titleCase(offer.financialStatus || 'calculated_scenario')],
              ]}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/offer-builder', { state: { concept: offer } })}
            >
              Open interactive financial simulator
            </Button>
          </>
        )}
        {tab === 'risks' && (
          <div className="two-column">
            <div>
              <h4>Eligibility and redemption</h4>
              <p>
                <strong>Included:</strong> {offer.audience}
              </p>
              <p>
                <strong>Excluded:</strong> {offer.excludedAudience}
              </p>
              <p>
                <strong>Conditions:</strong> {offer.redemptionConditions}
              </p>
              <p>
                <strong>Valid:</strong> {offer.validityStart} to {offer.validityEnd}
              </p>
            </div>
            <div>
              <h4>Risk and validation log</h4>
              <ul className="risk-list">
                {offer.risks?.map((r: string, i: number) => (
                  <li key={i}>
                    <ShieldAlert size={15} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      {conflict && (
        <Modal
          title="Potential campaign overlap"
          onClose={() => setConflict(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConflict(null)}>
                Change dates or audience
              </Button>
              <Button variant="danger" onClick={() => addCampaign(conflict.index, true)}>
                Override & create draft
              </Button>
            </>
          }
        >
          <Callout tone="warning" title="Cannibalisation check">
            Another campaign at this studio overlaps in dates and audience. Review the conflict before forcing a
            duplicate benefit into the calendar.
          </Callout>
          <ul>
            {conflict.conflicts.map((c: any) => (
              <li key={c.id}>
                <strong>{c.name}</strong> · {c.start_date} to {c.end_date} · {c.audience}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </Card>
  );
}
