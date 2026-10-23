import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Settings2, UserRoundCheck, UsersRound } from 'lucide-react';
import { api, patch } from '../api';
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
import RenewalDuePanel from '../components/RenewalDuePanel';

export default function Retention() {
  const { boot, studioId, toast, can } = useApp(),
    navigate = useNavigate();
  const [workspace, setWorkspace] = useState('segments'),
    [filter, setFilter] = useState('all'),
    [rulesOpen, setRulesOpen] = useState(false),
    [selected, setSelected] = useState<any>(null);
  const { data, loading, reload } = useLoad<any>(
    () => api(`/segments${studioId ? `?studio=${studioId}` : ''}`),
    [studioId],
  );
  const rows = useMemo(
    () =>
      data?.rows.filter(
        (r: any) =>
          filter === 'all' ||
          (filter === 'revenue' &&
            ['approaching_expiry', 'recently_lapsed', 'long_lapsed', 'high_value'].includes(r.segment_key)) ||
          (filter === 'acquisition' &&
            ['new_leads', 'unconverted_trials', 'first_time_purchasers'].includes(r.segment_key)) ||
          (filter === 'attention' && (r.priority === 'high' || r.segment_key === 'declining_attendance')),
      ) || [],
    [data, filter],
  );
  const total = (key: string) => rows.reduce((s: number, r: any) => s + (r[key] || 0), 0);
  return (
    <div>
      <PageHeader
        eyebrow="CUSTOMER LIFECYCLE INTELLIGENCE"
        title="The right intervention, not always a discount"
        description="Privacy-safe audience estimates connect purchasing and package behaviour to renewal, reactivation, upgrade and follow-up campaigns."
        actions={
          can('target_edit') && (
            <Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => setRulesOpen(true)}>
              Configure segment rules
            </Button>
          )
        }
        meta={
          <Badge tone="green">
            <LockKeyhole size={12} /> Aggregated by default
          </Badge>
        }
      />
      <Tabs
        value={workspace}
        onChange={setWorkspace}
        items={[
          { id: 'segments', label: 'Lifecycle segments' },
          { id: 'renewals', label: 'Memberships due for renewal' },
        ]}
      />
      {workspace === 'renewals' ? (
        <RenewalDuePanel />
      ) : (
        <>
          <div className="planning-summary">
            <Metric
              label="Customers in current view"
              value={number(total('audience_size'))}
              detail="Segment memberships can overlap"
            />
            <Metric
              label="Scenario revenue opportunity"
              value={money(total('expected_revenue'), true)}
              detail="Explicit response assumptions · not forecast lift"
            />
            <Metric
              label="Recently / long lapsed"
              value={number(
                data?.rows
                  .filter((r: any) => ['recently_lapsed', 'long_lapsed'].includes(r.segment_key))
                  .reduce((s: number, r: any) => s + r.audience_size, 0),
              )}
              detail="Distinct references within each segment"
            />
            <Metric
              label="Approaching expiry"
              value={number(
                data?.rows
                  .filter((r: any) => r.segment_key === 'approaching_expiry')
                  .reduce((s: number, r: any) => s + r.audience_size, 0),
              )}
              detail="Configured expiry window"
            />
          </div>
          <Callout tone="info" title="Segment interpretation">
            A customer can belong to multiple segments. Expected revenue uses the response-rate assumption shown in each
            row; historical response is not inferred without campaign reach data.
          </Callout>
          <Card>
            <div className="list-toolbar">
              <Tabs
                value={filter}
                onChange={setFilter}
                items={[
                  { id: 'all', label: 'All segments' },
                  { id: 'revenue', label: 'Revenue opportunities' },
                  { id: 'acquisition', label: 'Acquisition & conversion' },
                  { id: 'attention', label: 'Needs attention' },
                ]}
              />
              <span>{rows.length} studio-segments</span>
            </div>
            <TableScroll>
              <table className="data-table retention-table">
                <thead>
                  <tr>
                    <th>Segment / studio</th>
                    <th className="num">Audience</th>
                    <th className="num">Average spend</th>
                    <th className="num">Response assumption</th>
                    <th className="num">Scenario revenue</th>
                    <th>Recommended campaign & incentive</th>
                    <th>Priority</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.segment_name}</strong>
                        <span>{r.studio}</span>
                      </td>
                      <td className="num">
                        <strong>{number(r.audience_size)}</strong>
                      </td>
                      <td className="num">{money(r.average_spend)}</td>
                      <td className="num">
                        {percent(r.response_rate, 0, true)}
                        <small>Scenario</small>
                      </td>
                      <td className="num">{money(r.expected_revenue, true)}</td>
                      <td className="cell-wrap">
                        {r.recommendation}
                        <small>{r.limitations}</small>
                      </td>
                      <td>
                        <Badge tone={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'neutral'}>
                          {r.priority}
                        </Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                            Evidence
                          </Button>
                          {can('offer_create') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!r.audience_size}
                              onClick={() =>
                                navigate('/offers?view=gap', {
                                  state: { studioId: r.studio_id, segment: r.segment_key },
                                })
                              }
                            >
                              Build <ArrowRight size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
          <div className="two-column">
            <Card>
              <CardHeader title="When a discount may not be necessary" />
              <div className="decision-split">
                <div>
                  <UserRoundCheck size={19} />
                  <strong>High-value renewal</strong>
                  <p>
                    Start with recognition, booking priority, loyalty value or added validity. Protect the existing
                    price relationship.
                  </p>
                </div>
                <div>
                  <UsersRound size={19} />
                  <strong>Declining attendance</strong>
                  <p>
                    Lead with coach outreach and a booking plan. A price incentive does not solve a habit or schedule
                    problem.
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Data required to go further" />
              <ul className="methodology-list">
                <li>Member-level monthly attendance for declining-frequency cohorts.</li>
                <li>Campaign reach and response events for observed segment response rates.</li>
                <li>Reliable package expiry snapshots for renewal eligibility.</li>
                <li>Subsequent purchase windows for retention after reactivation.</li>
              </ul>
            </Card>
          </div>
          {selected && (
            <Modal
              title={`${selected.segment_name} · ${selected.studio}`}
              onClose={() => setSelected(null)}
              footer={
                <Button
                  onClick={() =>
                    navigate('/goal-builder', {
                      state: { studioId: selected.studio_id, segment: selected.segment_key },
                    })
                  }
                >
                  Build segment campaign
                </Button>
              }
            >
              <Callout title="Evidence">{selected.evidence}</Callout>
              <h3>Recommendation</h3>
              <p>{selected.recommendation}</p>
              <h3>Limitations</h3>
              <p>{selected.limitations}</p>
              <p className="data-note">
                Calculated {new Date(selected.calculated_at).toLocaleString('en-IN')}. No personal customer information
                is exposed in this aggregate view.
              </p>
            </Modal>
          )}
          {rulesOpen && (
            <RulesEditor
              rules={data.rules}
              onClose={() => setRulesOpen(false)}
              onSaved={async () => {
                setRulesOpen(false);
                await reload();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
function RulesEditor({ rules, onClose, onSaved }: { rules: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useApp();
  const [form, setForm] = useState(rules),
    [reason, setReason] = useState('Management refinement of lifecycle rules.');
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: Number(v) }));
  const save = async () => {
    try {
      await patch('/segments/rules', { ...form, reason });
      toast('Segment rules saved and all studio audiences recalculated.');
      onSaved();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  return (
    <Modal
      title="Configure customer segment rules"
      subtitle="Changes recalculate aggregate segment snapshots and are audited."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save & recalculate</Button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Approaching expiry window (days)">
          <Input type="number" value={form.expiry_days} onChange={e => set('expiry_days', e.target.value)} />
        </Field>
        <Field label="Recently lapsed window (days)">
          <Input
            type="number"
            value={form.recently_lapsed_days}
            onChange={e => set('recently_lapsed_days', e.target.value)}
          />
        </Field>
        <Field label="Long-lapsed threshold (days)">
          <Input type="number" value={form.long_lapsed_days} onChange={e => set('long_lapsed_days', e.target.value)} />
        </Field>
        <Field label="High-value percentile">
          <Input
            type="number"
            min="1"
            max="100"
            value={form.high_value_percentile}
            onChange={e => set('high_value_percentile', e.target.value)}
          />
        </Field>
        <Field label="Frequent purchaser · minimum transactions">
          <Input
            type="number"
            value={form.frequent_purchase_count}
            onChange={e => set('frequent_purchase_count', e.target.value)}
          />
        </Field>
        <Field label="Promotion-sensitive transaction share">
          <Input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={form.promo_sensitivity_threshold}
            onChange={e => set('promo_sensitivity_threshold', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Reason for change">
        <Input value={reason} onChange={e => setReason(e.target.value)} />
      </Field>
      <Callout tone="warning">
        Declining-attendance audience remains zero until member-level monthly attendance data is imported. Changing
        rules will not invent that metric.
      </Callout>
    </Modal>
  );
}
