import React, { useState } from 'react';
import { Bot, Building2, Check, Database, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { dateLabel, number, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Field,
  Input,
  Modal,
  Select,
  TableScroll,
  Tabs,
} from '../components/ui';
import PageHeader from '../components/PageHeader';
import CommercialPolicyPanel from '../components/CommercialPolicyPanel';

export default function Settings() {
  const { boot, refreshBoot, toast } = useApp();
  const [tab, setTab] = useState('studios'),
    [editing, setEditing] = useState<any>(null),
    [adding, setAdding] = useState(false),
    [auditDetail, setAuditDetail] = useState<any>(null);
  const { data: users, reload: reloadUsers } = useLoad<any[]>(() => api('/users'), []);
  const { data: settings } = useLoad<any>(() => api('/settings'), []);
  const { data: audit } = useLoad<any[]>(() => api('/audit'), []);
  const updateRole = async (user: any, role: string) => {
    try {
      await patch(`/users/${user.id}`, { role, reason: 'Administrator changed role in Settings.' });
      await reloadUsers();
      toast('User access updated and audited.');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  return (
    <div>
      <PageHeader
        eyebrow="ADMINISTRATION & CONTROL"
        title="Commercial rules with an audit trail"
        description="Manage studios, access, pricing guardrails, AI configuration and material-change history. Permissions are enforced on the server."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'studios', label: 'Studios & guardrails' },
          { id: 'policies', label: 'Offer policies & product MRP' },
          { id: 'users', label: 'Roles & users' },
          { id: 'ai', label: 'AI & integrations' },
          { id: 'data', label: 'Data & metric integrity' },
          { id: 'audit', label: 'Audit log' },
        ]}
      />
      {tab === 'studios' && (
        <Card>
          <CardHeader
            title="Studio management"
            subtitle="Every location has independent pricing, discount and capacity rules"
            action={
              <Button icon={<Plus size={15} />} onClick={() => setAdding(true)}>
                Add studio
              </Button>
            }
          />
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Studio</th>
                  <th>City</th>
                  <th className="num">Maximum discount</th>
                  <th className="num">Monthly class capacity</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {boot.studios.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <span>{s.code}</span>
                    </td>
                    <td>{s.city}</td>
                    <td className="num">{s.max_discount_percent}%</td>
                    <td className="num">{number(s.monthly_capacity)}</td>
                    <td>
                      <Badge tone="green">Active</Badge>
                    </td>
                    <td>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                        Edit rules
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <Callout tone="warning">
            Changing a discount ceiling does not silently rewrite existing offers. New saves, clones and activations are
            validated against the latest rules.
          </Callout>
        </Card>
      )}
      {tab === 'policies' && <CommercialPolicyPanel />}
      {tab === 'users' && (
        <>
          <Card>
            <CardHeader
              title="User access"
              subtitle="Demonstration identities use one shared password; replace with managed credentials before production use"
            />
            <TableScroll>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Assigned studio</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map(u => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <span>{u.email}</span>
                      </td>
                      <td>
                        <Select
                          value={u.role}
                          onChange={e => updateRole(u, e.target.value)}
                          disabled={u.id === boot.user.id}
                        >
                          {Object.keys(boot.permissions).map(r => (
                            <option key={r} value={r}>
                              {titleCase(r)}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td>
                        {u.assigned_studio_id
                          ? boot.studios.find(s => s.id === u.assigned_studio_id)?.name ||
                            `Studio #${u.assigned_studio_id}`
                          : 'All studios'}
                      </td>
                      <td>
                        <Badge tone="green">Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
          <Card>
            <CardHeader title="Permission matrix" subtitle="Server-enforced capabilities by role" />
            <TableScroll>
              <table className="data-table permissions-table">
                <thead>
                  <tr>
                    <th>Permission</th>
                    {Object.keys(boot.permissions).map(r => (
                      <th key={r}>{titleCase(r)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(Object.values(boot.permissions).flat())].map(p => (
                    <tr key={p}>
                      <td>{titleCase(p)}</td>
                      {Object.entries(boot.permissions).map(([r, permissions]) => (
                        <td key={r}>{permissions.includes(p) ? <Check size={15} className="positive-text" /> : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
        </>
      )}
      {tab === 'ai' && (
        <div className="two-column">
          <Card>
            <CardHeader title="AI provider" subtitle="Server-only credential and structured-output workflow" />
            <div className="integration-status">
              <Bot size={25} />
              <div>
                <strong>OpenAI Responses API</strong>
                <p>
                  {settings?.aiConfigured ? `Connected · ${settings.aiModel}` : 'Not configured in this environment'}
                </p>
              </div>
              <Badge tone={settings?.aiConfigured ? 'green' : 'amber'}>
                {settings?.aiConfigured ? 'Connected' : 'Dependency'}
              </Badge>
            </div>
            <ol className="methodology-list">
              <li>
                Set <code>OPENAI_API_KEY</code> in the server environment. Never use a VITE_ variable.
              </li>
              <li>
                Optionally set <code>OPENAI_MODEL</code> and <code>AI_PROVIDER_BASE_URL</code>.
              </li>
              <li>Restart the server. The AI generation button appears only after configuration.</li>
              <li>Model concepts are schema-validated; application code recalculates all financials.</li>
            </ol>
            <Callout tone="info">
              No API key is requested or stored in the browser. Until configured, the clearly labelled rules-based
              planning engine remains available.
            </Callout>
          </Card>
          <Card>
            <CardHeader title="Integration boundaries" />
            <div className="integration-status">
              <Database size={25} />
              <div>
                <strong>Persistent relational database</strong>
                <p>{settings?.database}</p>
              </div>
              <Badge tone="green">Working</Badge>
            </div>
            {settings?.integrations.map((i: any) => (
              <div className="integration-row" key={i.name}>
                <div>
                  <strong>{i.name}</strong>
                  <p>{i.note}</p>
                </div>
                <Badge tone={i.configured ? 'green' : 'neutral'}>
                  {i.configured ? 'Configured' : 'Not configured'}
                </Badge>
              </div>
            ))}
            <Callout tone="warning">
              The application never claims to publish to Momence, WhatsApp, a CRM or an advertising platform. CSV/XLSX
              hand-off is the working export path.
            </Callout>
          </Card>
        </div>
      )}
      {tab === 'data' && (
        <div className="two-column">
          <Card>
            <CardHeader title="Imported data coverage" />
            <table className="data-table">
              <tbody>
                {[
                  ['Sales', boot.coverage.sales],
                  ['Leads', boot.coverage.leads],
                  ['First visits / trials', boot.coverage.trials],
                  ['Class sessions', boot.coverage.sessions],
                  ['Member check-ins / cancellations', boot.coverage.checkins || {}],
                  ['Trainer performance', boot.coverage.payroll || {}],
                ].map(([name, x]: any) => (
                  <tr key={name}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>{number(x.rows)} rows</td>
                    <td>
                      {x.first} → {x.last}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Metric integrity</h3>
            <ul className="check-list">
              <li>Unique customers, transactions and redemptions use different denominators.</li>
              <li>Trial bookings are not backfilled from completed trials.</li>
              <li>Attribution windows use matured cohorts where supported.</li>
              <li>Negative sale adjustments remain numeric adjustments; invalid targets are rejected.</li>
              <li>Source imports, derived metrics, recommendations and approvals are separate records.</li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Known limitations" />
            <ul className="methodology-list">
              {boot.coverage.limitations.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <Callout tone="warning">
              Incomplete source data limits analysis. The application exposes the limitation rather than inventing a
              correction.
            </Callout>
          </Card>
        </div>
      )}
      {tab === 'audit' && (
        <Card>
          <CardHeader
            title="Material-change audit log"
            subtitle="Latest 300 events · before/after snapshots available"
          />
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Studio</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {audit?.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString('en-IN')}</td>
                    <td>{a.user_name || 'System'}</td>
                    <td>
                      <Badge>{titleCase(a.action)}</Badge>
                    </td>
                    <td>
                      {titleCase(a.entity_type)} #{a.entity_id}
                    </td>
                    <td>{a.studio || '—'}</td>
                    <td className="cell-wrap">{a.reason || '—'}</td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => setAuditDetail(a)}>
                        Snapshots
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      )}
      {editing && (
        <StudioEditor
          studio={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refreshBoot();
          }}
        />
      )}
      {adding && (
        <StudioEditor
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await refreshBoot();
          }}
        />
      )}
      {auditDetail && (
        <Modal
          title={`${titleCase(auditDetail.action)} · ${titleCase(auditDetail.entity_type)}`}
          onClose={() => setAuditDetail(null)}
          width="850px"
        >
          <div className="two-column">
            <div>
              <h3>Before</h3>
              <pre className="json-view">
                {auditDetail.before ? JSON.stringify(JSON.parse(auditDetail.before), null, 2) : 'No previous record'}
              </pre>
            </div>
            <div>
              <h3>After</h3>
              <pre className="json-view">
                {auditDetail.after ? JSON.stringify(JSON.parse(auditDetail.after), null, 2) : '—'}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function StudioEditor({ studio, onClose, onSaved }: { studio?: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useApp();
  const [form, setForm] = useState<any>(
    studio
      ? {
          ...studio,
          maxDiscountPercent: studio.max_discount_percent,
          monthlyCapacity: studio.monthly_capacity,
          reason: '',
        }
      : {
          name: '',
          code: '',
          city: 'Mumbai',
          maxDiscountPercent: 20,
          monthlyCapacity: '',
          reason: 'New authorised studio location.',
        },
  );
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    try {
      if (studio) await patch(`/studios/${studio.id}`, form);
      else await post('/studios', form);
      toast(`Studio ${studio ? 'updated' : 'created'} and audited.`);
      onSaved();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  return (
    <Modal
      title={studio ? `Edit ${studio.name}` : 'Add a studio'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save studio rules</Button>
        </>
      }
    >
      <div className="form-grid two">
        {!studio && (
          <>
            <Field label="Studio name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Short code">
              <Input value={form.code} onChange={e => set('code', e.target.value)} />
            </Field>
          </>
        )}
        <Field label="City">
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Maximum discount (%)">
          <Input
            type="number"
            min="0"
            max="100"
            value={form.maxDiscountPercent}
            onChange={e => set('maxDiscountPercent', Number(e.target.value))}
          />
        </Field>
        <Field label="Monthly class capacity">
          <Input
            type="number"
            min="0"
            value={form.monthlyCapacity ?? ''}
            onChange={e => set('monthlyCapacity', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Reason for material change">
          <Input value={form.reason} onChange={e => set('reason', e.target.value)} required />
        </Field>
      </div>
      <Callout tone="info">
        Studio rules affect independent product eligibility, generation, cloning and financial validation.
      </Callout>
    </Modal>
  );
}
