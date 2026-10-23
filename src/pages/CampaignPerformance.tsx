import React, { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Plus, TrendingUp } from 'lucide-react';
import { api, post } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { money, number, percent, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Field,
  Input,
  Metric,
  Modal,
  Select,
  TableScroll,
  Tabs,
} from '../components/ui';
import PageHeader from '../components/PageHeader';

export default function CampaignPerformance() {
  const { studioId, year, toast, can } = useApp();
  const [tab, setTab] = useState('campaigns'),
    [recording, setRecording] = useState<any>(null),
    [sort, setSort] = useState('revenue');
  const { data, reload } = useLoad<any>(
    () => api(`/performance?year=${year}${studioId ? `&studio=${studioId}` : ''}`),
    [year, studioId],
  );
  const { data: calendar } = useLoad<any>(
    () => api(`/campaigns?year=${year}${studioId ? `&studio=${studioId}` : ''}`),
    [year, studioId],
  );
  const campaigns = data?.campaigns || [],
    historical = useMemo(
      () =>
        [...(data?.historical || [])].sort((a: any, b: any) =>
          sort === 'discount'
            ? b.effective_discount - a.effective_discount
            : sort === 'redemptions'
              ? b.redemptions - a.redemptions
              : b.revenue - a.revenue,
        ),
      [data, sort],
    );
  const actualRevenue = campaigns.reduce((s: number, c: any) => s + (c.revenue || 0), 0),
    planned = campaigns.reduce((s: number, c: any) => s + (c.planned_revenue || 0), 0),
    historicalRevenue = (data?.historical || []).reduce((s: number, o: any) => s + o.revenue, 0);
  return (
    <div>
      <PageHeader
        eyebrow="CAMPAIGN LEARNING LOOP"
        title="Turn observed outcomes into better decisions"
        description="Compare original plans with actual reach, buyers, revenue quality and subsequent purchases. Attributed revenue is never labelled proven incremental lift."
        actions={
          can('campaign_edit') && (
            <Button icon={<Plus size={16} />} onClick={() => setRecording({})}>
              Record campaign actuals
            </Button>
          )
        }
      />
      <div className="planning-summary">
        <Metric
          label="Planned campaign revenue"
          value={money(planned, true)}
          detail={`${campaigns.length} campaigns with actuals`}
        />
        <Metric
          label="Observed campaign revenue"
          value={money(actualRevenue, true)}
          detail={planned ? `${percent((actualRevenue / planned) * 100)} of plan` : 'No plan comparison yet'}
        />
        <Metric
          label="Historical code-attributed revenue"
          value={money(historicalRevenue, true)}
          detail={`${data?.historical.length || 0} reconstructed promotions`}
        />
        <Metric
          label="Observed campaign buyers"
          value={number(campaigns.reduce((s: number, c: any) => s + (c.buyers || 0), 0))}
          detail="Not necessarily incremental customers"
        />
      </div>
      <Callout tone="info" title="Attribution discipline">
        Without a control group or causal design, results are observed performance. Repeat / test / retire labels are
        decision support, not automated claims of lift.
      </Callout>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'campaigns', label: 'Planned vs actual', count: campaigns.length },
          { id: 'historical', label: 'Historical offer learning', count: data?.historical.length },
          { id: 'recommendations', label: 'Learning agenda' },
        ]}
      />
      {tab === 'campaigns' &&
        (campaigns.length ? (
          <Card>
            <CardHeader
              title="Campaign performance"
              subtitle="Actual AOV uses revenue ÷ transactions; conversion denominators remain distinct"
            />
            <TableScroll>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Studio</th>
                    <th className="num">Planned revenue</th>
                    <th className="num">Actual revenue</th>
                    <th className="num">Attainment</th>
                    <th className="num">Reached</th>
                    <th className="num">Redemptions</th>
                    <th className="num">Buyers</th>
                    <th className="num">AOV</th>
                    <th className="num">Discount</th>
                    <th>Learning</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <span>{c.offer_name}</span>
                      </td>
                      <td>{c.studio}</td>
                      <td className="num">{money(c.planned_revenue, true)}</td>
                      <td className="num">
                        <strong>{money(c.revenue, true)}</strong>
                      </td>
                      <td className={`num ${c.revenue >= c.planned_revenue ? 'positive-text' : 'negative-text'}`}>
                        {percent(c.planned_revenue ? (c.revenue / c.planned_revenue) * 100 : null)}
                      </td>
                      <td className="num">{number(c.customers_reached)}</td>
                      <td className="num">{number(c.redemptions)}</td>
                      <td className="num">{number(c.buyers)}</td>
                      <td className="num">{money(c.aov)}</td>
                      <td className="num">{percent(c.effective_discount)}</td>
                      <td>
                        <Badge tone={c.learning === 'repeat' ? 'green' : c.learning === 'test_again' ? 'amber' : 'red'}>
                          {titleCase(c.learning)}
                        </Badge>
                      </td>
                      <td>
                        {can('campaign_edit') && (
                          <Button size="sm" variant="ghost" onClick={() => setRecording(c)}>
                            Update
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
        ) : (
          <Card>
            <div className="empty-state">
              <Activity size={28} />
              <h3>No campaign actuals recorded for {year}</h3>
              <p>
                Seeded demonstration campaigns intentionally have no fabricated results. Record actuals from a real
                campaign to begin the learning loop.
              </p>
              {can('campaign_edit') && <Button onClick={() => setRecording({})}>Record actuals</Button>}
            </div>
          </Card>
        ))}
      {tab === 'historical' && (
        <Card>
          <CardHeader
            title="Historical promotion evidence"
            subtitle="Reconstructed from imported discount-code transactions"
            action={
              <Select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="revenue">Highest revenue</option>
                <option value="redemptions">Highest redemption</option>
                <option value="discount">Excessive discount exposure</option>
              </Select>
            }
          />
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Offer / code</th>
                  <th>Studio</th>
                  <th className="num">Observed revenue</th>
                  <th className="num">Redemptions</th>
                  <th className="num">Transactions</th>
                  <th className="num">Revenue / redemption</th>
                  <th className="num">Effective discount</th>
                  <th>Decision signal</th>
                </tr>
              </thead>
              <tbody>
                {historical.map((o: any) => {
                  const per = o.redemptions ? o.revenue / o.redemptions : null;
                  const signal =
                    o.effective_discount > 20
                      ? 'Review exposure'
                      : o.redemptions >= 20 && (per ?? 0) < 3000
                        ? 'High redemption, low value'
                        : o.revenue > 500000 && o.effective_discount < 15
                          ? 'Candidate to retest'
                          : 'More evidence needed';
                  return (
                    <tr key={`${o.id}-${o.studio}`}>
                      <td>
                        <strong>{o.name}</strong>
                        <span>{o.source_campaign}</span>
                      </td>
                      <td>{o.studio}</td>
                      <td className="num">
                        <strong>{money(o.revenue, true)}</strong>
                      </td>
                      <td className="num">{number(o.redemptions)}</td>
                      <td className="num">{number(o.transactions)}</td>
                      <td className="num">{money(per)}</td>
                      <td className={`num ${o.effective_discount > 20 ? 'negative-text' : ''}`}>
                        {percent(o.effective_discount)}
                      </td>
                      <td>
                        <Badge
                          tone={
                            signal === 'Candidate to retest'
                              ? 'green'
                              : signal === 'More evidence needed'
                                ? 'neutral'
                                : 'amber'
                          }
                        >
                          {signal}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
          <p className="data-note">
            Redemptions are distinct customer-days using a code. A code may span campaigns, and transaction attribution
            does not establish incrementality.
          </p>
        </Card>
      )}
      {tab === 'recommendations' && (
        <div className="three-column">
          <Card>
            <CardHeader title="Repeat with discipline" subtitle="Candidates for a matched-studio test" />
            <ul className="learning-list">
              {historical
                .filter((o: any) => o.revenue > 500000 && o.effective_discount < 15)
                .slice(0, 6)
                .map((o: any) => (
                  <li key={o.id}>
                    <ArrowUpRight size={16} />
                    <div>
                      <strong>{o.name}</strong>
                      <span>
                        {o.studio} · {money(o.revenue, true)} at {percent(o.effective_discount)}
                      </span>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
          <Card>
            <CardHeader
              title="Test again, change one variable"
              subtitle="Separate creative, audience and mechanism effects"
            />
            <ul className="learning-list">
              {historical
                .filter((o: any) => o.redemptions >= 10 && o.effective_discount <= 20)
                .slice(0, 6)
                .map((o: any) => (
                  <li key={o.id}>
                    <TrendingUp size={16} />
                    <div>
                      <strong>{o.name}</strong>
                      <span>Test a value-added alternative at the same studio.</span>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Review or retire" subtitle="High discount or weak revenue quality" />
            <ul className="learning-list">
              {historical
                .filter((o: any) => o.effective_discount > 20)
                .slice(0, 6)
                .map((o: any) => (
                  <li key={o.id}>
                    <ArrowDownRight size={16} />
                    <div>
                      <strong>{o.name}</strong>
                      <span>
                        {o.studio} · {percent(o.effective_discount)} effective discount
                      </span>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      )}
      {recording && (
        <PerformanceRecorder
          campaign={recording}
          campaigns={calendar?.rows || []}
          onClose={() => setRecording(null)}
          onSaved={async () => {
            setRecording(null);
            await reload();
            toast('Campaign actuals saved.');
          }}
        />
      )}
    </div>
  );
}
function PerformanceRecorder({
  campaign,
  campaigns,
  onClose,
  onSaved,
}: {
  campaign: any;
  campaigns: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useApp();
  const [campaignId, setCampaignId] = useState(campaign.id || ''),
    [form, setForm] = useState<any>({
      eligibleAudience: campaign.eligible_audience || 0,
      customersReached: campaign.customers_reached || 0,
      responses: campaign.responses || 0,
      redemptions: campaign.redemptions || 0,
      buyers: campaign.buyers || 0,
      transactions: campaign.transactions || 0,
      revenue: campaign.revenue || 0,
      effectiveDiscount: campaign.effective_discount || 0,
      discountCost: campaign.discount_cost || 0,
      subsequentRevenue: campaign.subsequent_revenue || 0,
      notes: campaign.notes || '',
    });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!campaignId) return toast('Select a campaign.', 'error');
    try {
      await post(
        `/campaigns/${campaignId}/performance`,
        Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'notes' ? v : Number(v)])),
      );
      onSaved();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  const labels = {
    eligibleAudience: 'Eligible audience',
    customersReached: 'Customers reached',
    responses: 'Responses',
    redemptions: 'Redemptions',
    buyers: 'Buyers',
    transactions: 'Transactions',
    revenue: 'Observed revenue (₹)',
    effectiveDiscount: 'Effective discount (%)',
    discountCost: 'Discount cost (₹)',
    subsequentRevenue: 'Subsequent purchase revenue (₹)',
  };
  return (
    <Modal
      title="Record campaign actuals"
      subtitle="Observed results only. Do not enter an incrementality estimate as actual revenue."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save actual performance</Button>
        </>
      }
    >
      <Field label="Campaign">
        <Select value={campaignId} onChange={e => setCampaignId(e.target.value)}>
          <option value="">Select campaign</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.studio}
            </option>
          ))}
        </Select>
      </Field>
      <div className="form-grid three">
        {Object.entries(labels).map(([key, label]) => (
          <Field key={key} label={label}>
            <Input type="number" min="0" value={form[key]} onChange={e => set(key, e.target.value)} />
          </Field>
        ))}
      </div>
      <Field label="Performance notes">
        <Input
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Attribution window, data source, follow-up observations…"
        />
      </Field>
    </Modal>
  );
}
