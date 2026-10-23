import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Plus, UsersRound } from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { useLoad, useOnChange } from '../hooks';
import { MONTHS, MONTHS_SHORT, OBJECTIVES, dateLabel, money, number, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  StatusBadge,
  TableScroll,
  Textarea,
} from '../components/ui';
import PageHeader from '../components/PageHeader';

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export default function CampaignCalendar() {
  const { studioId, year, boot, toast, can } = useApp();
  const [view, setView] = useState('annual'),
    [month, setMonth] = useState(1),
    [weekStart, setWeekStart] = useState(`${year}-01-04`),
    [editing, setEditing] = useState<any>(null);
  useOnChange(year, () => setWeekStart(`${year}-01-04`));
  const { data, loading, reload } = useLoad<any>(
    () => api(`/campaigns?year=${year}${studioId ? `&studio=${studioId}` : ''}`),
    [year, studioId],
  );
  const { data: offerData } = useLoad<any>(
    () => api(`/offers?limit=100${studioId ? `&studio=${studioId}` : ''}`),
    [studioId],
  );
  const campaigns = data?.rows || [];
  const openNew = (m = month, start?: string) =>
    setEditing({
      isNew: true,
      year,
      studioId: studioId || boot.studios[0]?.id,
      name: '',
      startDate: start || `${year}-${pad(m)}-01`,
      endDate: start || `${year}-${pad(m)}-14`,
      audience: '',
      objective: 'acquisition',
      targetRevenue: 0,
      status: 'draft',
      approvalStatus: 'pending',
      tasks: [],
    });
  const monthDays = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1)),
      start = new Date(first);
    start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, [year, month]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(`${weekStart}T00:00:00`);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const statusCounts = {
    draft: campaigns.filter((c: any) => c.status === 'draft').length,
    approved: campaigns.filter((c: any) => c.approval_status === 'approved' && c.status !== 'active').length,
    active: campaigns.filter((c: any) => c.status === 'active').length,
  };
  return (
    <div>
      <PageHeader
        eyebrow="ANNUAL CAMPAIGN OPERATING SYSTEM"
        title={`${year} campaign calendar`}
        description="Plan, move, approve and measure campaigns without losing offer context. Overlapping audiences trigger cannibalisation warnings."
        actions={
          can('campaign_edit') && (
            <Button icon={<Plus size={16} />} onClick={() => openNew()}>
              New campaign
            </Button>
          )
        }
      />
      <div className="calendar-toolbar">
        <div className="segmented">
          {[
            ['annual', 'Annual'],
            ['month', 'Monthly'],
            ['week', 'Weekly'],
          ].map(([v, l]) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="calendar-status-legend">
          <Badge tone="amber">Proposed {statusCounts.draft}</Badge>
          <Badge tone="blue">Approved / scheduled {statusCounts.approved}</Badge>
          <Badge tone="green">Live {statusCounts.active}</Badge>
          <Badge tone="purple">Demo drafts are labelled</Badge>
        </div>
        {view === 'month' && (
          <div className="month-nav">
            <Button variant="secondary" size="sm" onClick={() => setMonth(m => (m === 1 ? 12 : m - 1))}>
              <ChevronLeft size={15} />
            </Button>
            <strong>
              {MONTHS[month - 1]} {year}
            </strong>
            <Button variant="secondary" size="sm" onClick={() => setMonth(m => (m === 12 ? 1 : m + 1))}>
              <ChevronRight size={15} />
            </Button>
          </div>
        )}
        {view === 'week' && <Input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />}
      </div>
      {view === 'annual' && (
        <div className="annual-calendar">
          {MONTHS.map((name, i) => {
            const items = campaigns.filter((c: any) => Number(c.start_date.slice(5, 7)) === i + 1);
            return (
              <Card key={name} className={`annual-month ${i === 3 ? 'anniversary-month' : ''}`}>
                <div className="annual-month-header">
                  <div>
                    <span>{pad(i + 1)}</span>
                    <h3>{name}</h3>
                  </div>
                  {i === 3 && <Badge tone="purple">Anniversary</Badge>}
                  <button
                    onClick={() => {
                      setMonth(i + 1);
                      setView('month');
                    }}
                  >
                    Open <ChevronRight size={14} />
                  </button>
                </div>
                <div className="annual-month-target">
                  <span>Campaign target</span>
                  <strong>
                    {money(
                      items.reduce((s: number, c: any) => s + c.target_revenue, 0),
                      true,
                    )}
                  </strong>
                  <small>
                    {items.length} campaign{items.length === 1 ? '' : 's'}
                  </small>
                </div>
                <div className="annual-campaign-list">
                  {items.slice(0, 4).map((c: any) => (
                    <button key={c.id} onClick={() => setEditing(c)}>
                      <span className={`campaign-dot status-${c.status}`} />
                      <div>
                        <strong>{c.name}</strong>
                        <small>
                          {c.studio} · {c.start_date.slice(8, 10)}–{c.end_date.slice(8, 10)}{' '}
                          {MONTHS_SHORT[Number(c.end_date.slice(5, 7)) - 1]}
                        </small>
                      </div>
                      {c.data_mode === 'demo' && <Badge tone="purple">Demo</Badge>}
                    </button>
                  ))}
                  {!items.length && (
                    <button className="empty-month" onClick={() => can('campaign_edit') && openNew(i + 1)}>
                      <Plus size={14} /> Plan a campaign
                    </button>
                  )}
                  {items.length > 4 && (
                    <button
                      onClick={() => {
                        setMonth(i + 1);
                        setView('month');
                      }}
                    >
                      +{items.length - 4} more
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {view === 'month' && (
        <Card className="month-calendar-card">
          <div className="calendar-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="month-calendar-grid">
            {monthDays.map((d, i) => {
              const key = dateKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
              const items = campaigns.filter((c: any) => c.start_date <= key && c.end_date >= key);
              const inMonth = d.getUTCMonth() === month - 1;
              return (
                <div key={i} className={`calendar-day ${inMonth ? '' : 'outside-month'}`}>
                  <div className="day-number">
                    <span>{d.getUTCDate()}</span>
                    {can('campaign_edit') && inMonth && (
                      <button onClick={() => openNew(month, `${year}-${pad(month)}-${pad(d.getUTCDate())}`)}>
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                  {items.map((c: any) => (
                    <button
                      key={`${c.id}-${key}`}
                      className={`calendar-campaign status-${c.status}`}
                      onClick={() => setEditing(c)}
                    >
                      <strong>{c.name}</strong>
                      <span>{c.studio}</span>
                      <small>
                        {money(c.target_revenue, true)} · {titleCase(c.status)}
                      </small>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {view === 'week' && (
        <Card>
          <div className="week-grid">
            {weekDays.map((d, i) => {
              const key = dateKey(d),
                items = campaigns.filter((c: any) => c.start_date <= key && c.end_date >= key);
              return (
                <div key={key}>
                  <div className="week-day-header">
                    <strong>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</strong>
                    <span>
                      {d.getDate()} {MONTHS_SHORT[d.getMonth()]}
                    </span>
                  </div>
                  {items.map((c: any) => (
                    <button key={c.id} className={`calendar-campaign status-${c.status}`} onClick={() => setEditing(c)}>
                      <strong>{c.name}</strong>
                      <span>{c.studio}</span>
                      <small>{c.audience}</small>
                    </button>
                  ))}
                  {!items.length && <span className="no-campaign">No campaigns</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Card>
        <CardHeader
          title="Campaign timeline and ownership"
          subtitle="Planned versus live status, approval, audience and expected commercial outcome"
        />
        <TableScroll>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Studio</th>
                <th>Dates</th>
                <th>Audience</th>
                <th className="num">Target</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="clickable-row" onClick={() => setEditing(c)}>
                  <td>
                    <strong>{c.name}</strong>
                    <span>{c.offer_name}</span>
                    {c.data_mode === 'demo' && <Badge tone="purple">Demo</Badge>}
                  </td>
                  <td>{c.studio}</td>
                  <td>
                    {dateLabel(c.start_date)} → {dateLabel(c.end_date)}
                  </td>
                  <td>{c.audience}</td>
                  <td className="num">
                    {money(c.target_revenue, true)}
                    <small>{number(c.expected_purchases)} purchases</small>
                  </td>
                  <td>{c.owner || 'Unassigned'}</td>
                  <td>
                    <StatusBadge status={c.status} />
                    <small>{titleCase(c.approval_status)}</small>
                  </td>
                  <td>
                    {c.conflicts.length ? (
                      <Badge tone="red">{c.conflicts.length} overlap</Badge>
                    ) : (
                      <Badge tone="green">Clear</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
      {editing && (
        <CampaignEditor
          campaign={editing}
          offers={offerData?.rows || []}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}
function CampaignEditor({
  campaign,
  offers,
  onClose,
  onSaved,
}: {
  campaign: any;
  offers: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { boot, toast, can } = useApp();
  const [form, setForm] = useState<any>({
    ...campaign,
    studioId: campaign.studioId || campaign.studio_id,
    offerId: campaign.offerId || campaign.offer_id || '',
    startDate: campaign.startDate || campaign.start_date,
    endDate: campaign.endDate || campaign.end_date,
    targetRevenue: campaign.targetRevenue ?? campaign.target_revenue ?? 0,
    expectedPurchases: campaign.expectedPurchases ?? campaign.expected_purchases ?? '',
    approvalStatus: campaign.approvalStatus || campaign.approval_status,
    ownerId: campaign.ownerId || campaign.owner_id || boot.user.id,
    tasks: campaign.tasks || [],
    notes: campaign.notes || '',
  });
  const [conflicts, setConflicts] = useState<any[]>([]),
    [newTask, setNewTask] = useState('');
  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));
  const save = async (force = false) => {
    try {
      const body = {
        ...form,
        studioId: Number(form.studioId),
        offerId: form.offerId ? Number(form.offerId) : null,
        targetRevenue: Number(form.targetRevenue),
        expectedPurchases: form.expectedPurchases ? Number(form.expectedPurchases) : null,
        force,
      };
      if (campaign.isNew) await post('/campaigns', body);
      else await patch(`/campaigns/${campaign.id}`, body);
      toast('Campaign saved with an audit record.');
      onSaved();
    } catch (error: any) {
      if (error.status === 409) setConflicts(error.conflicts || []);
      else toast(error.message, 'error');
    }
  };
  const duplicate = async () => {
    try {
      await post(`/campaigns/${campaign.id}/duplicate`, {});
      toast('Campaign duplicated as a new draft.');
      onSaved();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  const addTask = () => {
    if (!newTask.trim()) return;
    set('tasks', [...form.tasks, { id: Date.now(), title: newTask, done: false }]);
    setNewTask('');
  };
  return (
    <Modal
      title={campaign.isNew ? 'Create campaign' : form.name}
      subtitle={
        campaign.isNew
          ? 'Connect an offer, audience, owner and measurable plan.'
          : `${form.studio || boot.studios.find(s => s.id === form.studioId)?.name} · ${form.data_mode || campaign.data_mode}`
      }
      onClose={onClose}
      width="850px"
      footer={
        <>
          <div>
            {!campaign.isNew && (
              <Button variant="ghost" icon={<Copy size={14} />} onClick={duplicate}>
                Duplicate
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save(false)}>Save campaign</Button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Campaign name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Studio">
          <Select
            value={form.studioId}
            onChange={e => set('studioId', Number(e.target.value))}
            disabled={!campaign.isNew}
          >
            {boot.studios.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Planned offer">
          <Select
            value={form.offerId}
            onChange={e => {
              set('offerId', e.target.value);
              const o = offers.find(x => x.id === Number(e.target.value));
              if (o) {
                set('targetRevenue', o.revenue_target || form.targetRevenue);
                set('expectedPurchases', o.target_purchases || '');
              }
            }}
          >
            <option value="">No linked offer</option>
            {offers
              .filter(o => !o.studio_id || o.studio_id === Number(form.studioId))
              .map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.status}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Objective">
          <Select value={form.objective || ''} onChange={e => set('objective', e.target.value)}>
            {OBJECTIVES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </Field>
        <Field label="Target revenue (₹)">
          <Input
            type="number"
            min="0"
            value={form.targetRevenue}
            onChange={e => set('targetRevenue', e.target.value)}
          />
        </Field>
        <Field label="Expected purchases">
          <Input
            type="number"
            min="0"
            value={form.expectedPurchases}
            onChange={e => set('expectedPurchases', e.target.value)}
          />
        </Field>
        <Field label="Campaign status">
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="draft">Draft / proposed</option>
            <option value="scheduled">Scheduled</option>
            <option value="paused">Paused</option>
            {can('campaign_approve') && <option value="active">Live / active</option>}
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Approval status">
          <Select
            value={form.approvalStatus}
            onChange={e => set('approvalStatus', e.target.value)}
            disabled={!can('campaign_approve')}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </Field>
      </div>
      <Field label="Target audience">
        <Input
          value={form.audience || ''}
          onChange={e => set('audience', e.target.value)}
          placeholder="Used for overlap and cannibalisation checks"
        />
      </Field>
      <Field label="Internal notes">
        <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
      <div className="task-editor">
        <h3>Supporting tasks and ownership</h3>
        {form.tasks.map((t: any) => (
          <label key={t.id}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={e =>
                set(
                  'tasks',
                  form.tasks.map((x: any) => (x.id === t.id ? { ...x, done: e.target.checked } : x)),
                )
              }
            />
            <span className={t.done ? 'done' : ''}>{t.title}</span>
            <button
              type="button"
              onClick={() =>
                set(
                  'tasks',
                  form.tasks.filter((x: any) => x.id !== t.id),
                )
              }
            >
              Remove
            </button>
          </label>
        ))}
        <div>
          <Input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Add a measurable execution task"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTask();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addTask}>
            Add task
          </Button>
        </div>
      </div>
      {conflicts.length > 0 && (
        <Callout tone="warning" title="Overlapping audience and benefits">
          <ul>
            {conflicts.map(c => (
              <li key={c.id}>
                {c.name} · {c.start_date} to {c.end_date} · {c.audience}
              </li>
            ))}
          </ul>
          <Button variant="danger" size="sm" onClick={() => save(true)}>
            I reviewed the risk — override
          </Button>
        </Callout>
      )}
      {form.data_mode === 'demo' && (
        <Callout tone="info">
          This is a seeded demonstration draft. Saving preserves its demo lineage; no actual performance is inferred.
        </Callout>
      )}
    </Modal>
  );
}
