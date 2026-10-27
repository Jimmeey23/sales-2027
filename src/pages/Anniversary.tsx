import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarHeart, Gift, MessageCircle, Pencil, Save, Sparkles, Trash2 } from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { useLoad, useOnChange } from '../hooks';
import { MONTHS_SHORT, money, number, percent } from '../types';
import { Badge, Button, Callout, Card, CardHeader, Field, Input, Metric, Select } from '../components/ui';
import PageHeader from '../components/PageHeader';
import OfferConceptBoard from '../components/OfferConceptBoard';

const AUDIENCES = [
  ['new_leads', 'New clients'],
  ['unconverted_trials', 'Trial attendees yet to purchase'],
  ['active_customers', 'Existing members'],
  ['approaching_expiry', 'Due for renewal'],
  ['recently_lapsed', 'Lapsed customers'],
  ['active_customers', 'Referrals'],
  ['high_value', 'Higher-value packages'],
  ['frequent_purchasers', 'Private / specialised sessions'],
];
export default function Anniversary() {
  const { boot, studioId, year, toast, can } = useApp();
  // Location comes from the global location bar; Pop-up plans for its venues together.
  const studio = studioId || boot.studios.find(s => s.name === 'Kemps Corner')?.id || boot.studios[0]?.id;
  const [audienceIndex, setAudienceIndex] = useState(0),
    [target, setTarget] = useState(0),
    // Playbook guardrail: April effective discount ≤ 12% (deep April codes cut repurchase sharply).
    [discount, setDiscount] = useState(12),
    [repeatRate, setRepeatRate] = useState(0.25);
  // Default contribution = April's target above an ordinary month of the same plan (Target Metrics).
  const { data: plan } = useLoad<any>(() => api(`/targets/breakdown?year=${year}&studio=${studio}`), [studio, year]);
  const [offers, setOffers] = useState<any[]>([]),
    [loading, setLoading] = useState(false),
    [selectedCampaign, setSelectedCampaign] = useState(''),
    [campaignName, setCampaignName] = useState(''),
    [campaignTarget, setCampaignTarget] = useState(''),
    [editingCampaign, setEditingCampaign] = useState<any>(null),
    [campaignDraft, setCampaignDraft] = useState<any>(null),
    [savingCampaign, setSavingCampaign] = useState(false);
  const { data, reload } = useLoad<any>(() => api(`/anniversary?year=${year}&studio=${studio}`), [studio, year]);
  useEffect(() => {
    const months = plan?.locations?.[0]?.months;
    if (!months?.length) return;
    const april = months[3].target,
      ordinary = (months.reduce((a: number, m: any) => a + m.target, 0) - april) / 11;
    setTarget(Math.max(0, Math.round(april - ordinary)));
  }, [plan]);
  const generate = async () => {
    setLoading(true);
    try {
      const result = await post('/offers/generate', {
        studioId: studio,
        year,
        month: 4,
        objective: 'anniversary',
        segment: AUDIENCES[audienceIndex][0],
        targetRevenue: target,
        maxDiscountPercent: discount,
        tone: 'witty',
        count: 3,
        instructions: `Create original, funny, catchy Physique 57 anniversary offers for ${AUDIENCES[audienceIndex][1]}, suitable for WhatsApp and social campaigns. Protect May retention and keep all terms explicit.`,
      });
      const sorted = [...result.offers].sort((a, b) => a.effectiveDiscount - b.effectiveDiscount);
      setOffers(
        sorted.map((o, i) => ({ ...o, name: o.name, portfolioLane: ['Low-discount', 'Balanced', 'High-impact'][i] })),
      );
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  const savePortfolio = async () => {
    try {
      for (const offer of offers)
        await post('/offers', { ...offer, generationSource: 'rules_engine', dataMode: 'user', status: 'draft' });
      toast('Anniversary portfolio saved as three separate draft offers.');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  const addRetentionTasks = async () => {
    if (!selectedCampaign) return;
    const c = data.campaigns.find((x: any) => x.id === Number(selectedCampaign));
    const tasks = [
      ...(c.tasks || []),
      ...data.retentionPlan.map((p: any, i: number) => ({
        id: Date.now() + i,
        title: `${p.week}: ${p.action}`,
        done: false,
      })),
    ];
    try {
      await patch(`/campaigns/${c.id}`, { tasks, reason: 'Added post-anniversary retention plan.' });
      toast('Post-April retention tasks added to the campaign.');
      await reload();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  const createCampaign = async () => {
    if (!campaignName.trim()) return toast('Add a campaign name.', 'error');
    setSavingCampaign(true);
    try {
      await post('/campaigns', {
        studioId: studio,
        year,
        name: campaignName.trim(),
        startDate: `${year}-04-01`,
        endDate: `${year}-04-30`,
        audience: AUDIENCES[audienceIndex][0],
        objective: 'anniversary',
        targetRevenue: Number(campaignTarget || 0),
        notes: 'Created from the anniversary planner.',
      });
      setCampaignName('');
      setCampaignTarget('');
      await reload();
      toast('Anniversary campaign added as a draft.');
    } catch (error: any) {
      toast(error.message || 'Could not add campaign.', 'error');
    } finally {
      setSavingCampaign(false);
    }
  };
  const saveCampaign = async () => {
    if (!editingCampaign || !campaignDraft) return;
    setSavingCampaign(true);
    try {
      await patch(`/campaigns/${editingCampaign.id}`, {
        name: campaignDraft.name,
        startDate: campaignDraft.start_date,
        endDate: campaignDraft.end_date,
        audience: campaignDraft.audience,
        objective: campaignDraft.objective,
        targetRevenue: Number(campaignDraft.target_revenue || 0),
        notes: campaignDraft.notes,
      });
      setEditingCampaign(null);
      setCampaignDraft(null);
      await reload();
      toast('Anniversary campaign updated.');
    } catch (error: any) {
      toast(error.message || 'Could not update campaign.', 'error');
    } finally {
      setSavingCampaign(false);
    }
  };
  const deleteCampaign = async (campaign: any) => {
    if (!window.confirm(`Delete the draft campaign “${campaign.name}”?`)) return;
    try {
      await api(`/campaigns/${campaign.id}`, { method: 'DELETE' });
      await reload();
      toast('Anniversary campaign deleted.');
    } catch (error: any) {
      toast(error.message || 'Could not delete campaign.', 'error');
    }
  };
  const chart =
    data?.baseline
      .filter((b: any) => b.studio_id === studio)
      .map((b: any) => ({
        year: b.month.slice(0, 4),
        revenue: b.revenue,
        ordinary:
          data.ordinary.find((o: any) => o.studio === boot.studios.find(s => s.id === studio)?.name)
            ?.ordinary_month_average || 0,
      })) || [];
  return (
    <div>
      <PageHeader
        eyebrow="APRIL · BRAND ANNIVERSARY"
        title="Build April without borrowing from May"
        description="A dedicated anniversary portfolio for every customer lifecycle—creative enough for WhatsApp, disciplined enough for management."
        actions={
          <Badge tone="purple">
            <Gift size={13} /> {year} anniversary · {boot.studios.find(s => s.id === studio)?.name}
          </Badge>
        }
      />
      <div className="dashboard-grid-main">
        <Card>
          <CardHeader
            title="April baseline versus ordinary months"
            subtitle="Observed April revenue; ordinary-month average is contextual, not a causal benchmark"
          />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid stroke="#e8e4ef" vertical={false} />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip
                  formatter={(v: any, n: any) => [
                    money(v),
                    n === 'revenue' ? 'April actual' : 'Ordinary-month average',
                  ]}
                />
                <Bar dataKey="ordinary" fill="#d8dfda" name="Ordinary-month average" />
                <Bar dataKey="revenue" fill="#f27d5b" name="April actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Anniversary guardrails" />
          <ul className="check-list">
            <li>Independent offers for each lifecycle audience</li>
            <li>Low-discount, balanced and high-impact lanes</li>
            <li>High-impact remains inside studio price guardrails</li>
            <li>Capacity and discount exposure shown per offer</li>
            <li>May/June retention tasks are part of the plan</li>
          </ul>
          <Callout tone="info">
            Historical April strength does not prove that an anniversary offer caused the uplift.
          </Callout>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="1. Choose an anniversary audience"
          subtitle="Each audience receives its own economics, eligibility and creative angle"
        />
        <div className="anniversary-segments">
          {AUDIENCES.map(([key, label], i) => (
            <button
              key={`${key}-${i}`}
              className={audienceIndex === i ? 'active' : ''}
              onClick={() => setAudienceIndex(i)}
            >
              <span>{pad(i + 1)}</span>
              <strong>{label}</strong>
              <small>
                {i === 5
                  ? 'Referral benefit'
                  : i === 6
                    ? 'Protect price & loyalty'
                    : i === 7
                      ? 'Capacity review required'
                      : 'Independent strategy'}
              </small>
            </button>
          ))}
        </div>
        <div className="form-grid three anniversary-inputs">
          <Field
            label="Revenue contribution target (₹)"
            hint="Defaults to April’s target above an ordinary month in Target Metrics."
          >
            <Input type="number" min="0" value={target} onChange={e => setTarget(Number(e.target.value))} />
          </Field>
          <Field label="Maximum effective discount (%)" hint="The high-impact lane must still obey this ceiling.">
            <Input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
            />
          </Field>
          <Field
            label="May repeat-purchase scenario (%)"
            hint="Explicit post-anniversary assumption, not historical retention."
          >
            <Input
              type="number"
              min="0"
              max="100"
              value={repeatRate * 100}
              onChange={e => setRepeatRate(Number(e.target.value) / 100)}
            />
          </Field>
        </div>
        <Button size="lg" icon={<Sparkles size={18} />} onClick={generate} disabled={loading}>
          {loading
            ? 'Building anniversary portfolio…'
            : offers.length
              ? 'Regenerate original alternatives'
              : 'Generate anniversary portfolio'}
        </Button>
      </Card>
      {offers.length > 0 && (
        <>
          <div className="anniversary-lanes">
            {offers.map((o, i) => (
              <div key={i}>
                <Badge tone={i === 0 ? 'green' : i === 1 ? 'blue' : 'purple'}>{o.portfolioLane}</Badge>
                <strong>{o.name}</strong>
                <span>{money(o.expectedRevenue, true)} expected</span>
                <small>
                  {percent(o.effectiveDiscount)} effective discount · May repeat scenario{' '}
                  {money((o.financials.expectedBuyers || 0) * repeatRate * (o.expectedAsp || 0), true)}
                </small>
              </div>
            ))}
          </div>
          <div className="button-row">
            <Button variant="secondary" icon={<Save size={15} />} onClick={savePortfolio}>
              Save three-offer portfolio
            </Button>
          </div>
          <OfferConceptBoard offers={offers} source="rules_engine" />
        </>
      )}
      {can('campaign_edit') && (
        <Card className="anniversary-campaigns">
          <CardHeader
            title="April campaign records"
            subtitle="Add, edit, or remove draft campaigns for this location."
          />
          <div className="anniversary-campaign-add">
            <label>
              Campaign name
              <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} />
            </label>
            <label>
              Target revenue (₹)
              <Input type="number" min="0" value={campaignTarget} onChange={e => setCampaignTarget(e.target.value)} />
            </label>
            <Button disabled={savingCampaign || !campaignName.trim()} onClick={() => void createCampaign()}>
              Add draft campaign
            </Button>
          </div>
          <div className="anniversary-campaign-list">
            {(data?.campaigns || []).map((campaign: any) => (
              <article key={campaign.id}>
                {editingCampaign?.id === campaign.id ? (
                  <div className="anniversary-campaign-edit">
                    <label>
                      Name
                      <Input
                        value={campaignDraft.name}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      Start date
                      <Input
                        type="date"
                        value={campaignDraft.start_date}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, start_date: e.target.value }))}
                      />
                    </label>
                    <label>
                      End date
                      <Input
                        type="date"
                        value={campaignDraft.end_date}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, end_date: e.target.value }))}
                      />
                    </label>
                    <label>
                      Audience
                      <Input
                        value={campaignDraft.audience}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, audience: e.target.value }))}
                      />
                    </label>
                    <label>
                      Objective
                      <Input
                        value={campaignDraft.objective}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, objective: e.target.value }))}
                      />
                    </label>
                    <label>
                      Target revenue (₹)
                      <Input
                        type="number"
                        min="0"
                        value={campaignDraft.target_revenue}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, target_revenue: e.target.value }))}
                      />
                    </label>
                    <label>
                      Notes
                      <Input
                        value={campaignDraft.notes || ''}
                        onChange={e => setCampaignDraft((d: any) => ({ ...d, notes: e.target.value }))}
                      />
                    </label>
                    <Button disabled={savingCampaign} onClick={() => void saveCampaign()}>
                      {savingCampaign ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingCampaign(null);
                        setCampaignDraft(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <strong>{campaign.name}</strong>
                      <span>
                        {campaign.start_date}–{campaign.end_date} · {campaign.status} ·{' '}
                        {money(Number(campaign.target_revenue || 0), true)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Pencil size={14} />}
                      onClick={() => {
                        setEditingCampaign(campaign);
                        setCampaignDraft({ ...campaign });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={14} />}
                      disabled={campaign.status === 'active' || campaign.approval_status === 'approved'}
                      onClick={() => void deleteCampaign(campaign)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </article>
            ))}
            {!data?.campaigns?.length && <p>No April campaigns yet.</p>}
          </div>
        </Card>
      )}
      <Card>
        <CardHeader
          title="2. Post-anniversary retention plan"
          subtitle="Operational tasks protect attendance, second purchases and subsequent-month revenue"
        />
        <div className="retention-timeline">
          {data?.retentionPlan.map((p: any, i: number) => (
            <div key={p.week}>
              <span>{pad(i + 1)}</span>
              <div>
                <strong>{p.week}</strong>
                <p>{p.action}</p>
              </div>
            </div>
          ))}
        </div>
        {can('campaign_edit') && data?.campaigns.length > 0 && (
          <div className="inline-form">
            <Select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}>
              <option value="">Select an April campaign</option>
              {data.campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.studio}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={!selectedCampaign} onClick={addRetentionTasks}>
              Add retention tasks to campaign
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
const pad = (n: number) => String(n).padStart(2, '0');
