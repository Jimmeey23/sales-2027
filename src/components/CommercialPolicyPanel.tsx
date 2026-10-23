import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Save } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { money, titleCase } from '../types';
import { Badge, Button, Callout, Card, CardHeader, ErrorState, Field, Input, Loading, Select, Textarea } from './ui';

const productFields: Array<[string,string]> = [['single_class_product_id','Single-class pricing reference'],['newcomer_product_id','Newcomer fulfilment product'],['intro_product_id','Intro / paid-trial product'],['private_product_id','Private-session value reference'],['virtual_private_product_id','Virtual-private value reference'],['retail_product_id','Complimentary retail reference']];
export default function CommercialPolicyPanel() {
  const { boot, studioId: globalStudio, toast } = useApp();
  const [studioId, setStudioId] = useState(globalStudio || boot.studios[0]?.id), [form, setForm] = useState<any>(null), [reason, setReason] = useState('Updated studio offer policy in advanced settings.'), [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useLoad<any>(() => api(`/commercial/catalog?studioId=${studioId}`), [studioId]);
  useEffect(() => { if (data?.policy) setForm({ ...data.policy, annual_perks: { ...data.policy.annual_perks } }); }, [data]);
  const set = (key: string, value: any) => setForm((current: any) => ({ ...current, [key]: value }));
  const setPerk = (key: string, value: any) => setForm((current: any) => ({ ...current, annual_perks: { ...current.annual_perks, [key]: Number(value) } }));
  const toggleFormat = (format: string, enabled: boolean) => setForm((current: any) => { const journeys = { ...current.trial_journey }; if (!enabled) delete journeys[format]; return { ...current, formats: enabled ? [...current.formats, format] : current.formats.filter((item: string) => item !== format), trial_journey: journeys }; });
  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, reason, formats: form.formats, annual_perks: form.annual_perks };
      delete payload.studio_cap; delete payload.studio_name; delete payload.studio_code; delete payload.monthly_capacity; delete payload.updated_at; delete payload.updated_by; delete payload.studio_id;
      await api(`/commercial/policy/${studioId}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Studio policy saved with provenance and audit snapshot.'); await reload();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  if (loading && !data) return <Loading label="Loading studio commercial policy…"/>;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})}/>;
  if (!form || !data) return null;
  const studio = boot.studios.find(s => s.id === studioId), bengaluru = studio?.city === 'Bengaluru';
  const journeyOptions = (format: string) => studio?.name === 'Kenkere House' ? [['new_client_intro_pack_50_percent_or_newcomers_2_for_1','50% intro pack or once-lifetime 2-for-1']]
    : ['Copper + Cloves','Plash Pilates'].includes(studio?.name || '') ? [['paid_trial','Paid trial']]
    : ['Kemps Corner','Bandra'].includes(studio?.name || '') && ['strength','powercycle'].includes(format) ? [['newcomers_2_for_1','Newcomers 2-for-1 required']]
    : [['paid_trial','Paid trial'],['newcomers_2_for_1','Newcomers 2-for-1 required'],['free_trial_or_newcomers_2_for_1','Free trial or Newcomers 2-for-1'],['new_client_intro_pack_50_percent_or_newcomers_2_for_1','50% intro pack or once-lifetime 2-for-1']];
  const productOptions = <>{<option value="">Not configured</option>}{data.products.map((product: any) => <option key={product.id} value={product.id}>{product.name} · {money(product.list_price)}{product.catalogue_source === 'hosted_catalogue' ? ' · hosted' : ''}</option>)}</>;
  return <div className="commercial-policy">
    <Card className="policy-toolbar"><div className="list-toolbar"><div><strong>Studio-specific offer policy</strong><span> Product options and MRP are loaded from the catalogue automatically.</span></div><Select aria-label="Commercial policy studio" value={studioId} onChange={e => setStudioId(Number(e.target.value))}>{boot.studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div></Card>
    <div className="policy-grid"><Card><CardHeader title="Formats & newcomer journey" subtitle="Eligibility is enforced again on the server during generation and save"/>
      <Field label="Enabled formats"><div className="format-checkboxes">{['barre','strength','powercycle'].map(format => <label key={format} className={form.formats.includes(format) ? 'selected' : ''}><input type="checkbox" checked={form.formats.includes(format)} disabled={bengaluru && format !== 'barre'} onChange={e => toggleFormat(format,e.target.checked)}/>{titleCase(format)}</label>)}</div></Field>
      {bengaluru && <Callout tone="info">Bengaluru is restricted to Barre. Strength and PowerCycle cannot be enabled here.</Callout>}
      {(form.formats.length ? form.formats : ['barre']).map((format: string) => <Field key={format} label={`${titleCase(format)} trial journey`}><Select aria-label={`${titleCase(format)} trial journey`} value={form.trial_journey[format] || ''} onChange={e => set('trial_journey', { ...form.trial_journey, [format]: e.target.value })}><option value="">Not configured</option>{journeyOptions(format).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>)}
      <div className="form-grid two"><Field label="Pricing zone"><Input value={form.pricing_zone || ''} onChange={e => set('pricing_zone', e.target.value)}/></Field><Field label="Newcomer lifetime redemption limit"><Input type="number" min="1" value={form.newcomer_lifetime_limit ?? ''} onChange={e => set('newcomer_lifetime_limit', e.target.value ? Number(e.target.value) : null)}/></Field><Field label="Default stacking"><Select value={form.default_stacking_rule} onChange={e => set('default_stacking_rule', e.target.value)}><option value="not_stackable">Not stackable</option><option value="benefits_only">Benefits may stack; price discounts may not</option><option value="full">Full stacking · explicit exception</option></Select></Field><Field label="Newcomer discount ceiling (%)"><Input type="number" min="0" max="50" value={form.newcomer_max_discount_percent} onChange={e => set('newcomer_max_discount_percent', Number(e.target.value))}/></Field></div>
    </Card>
    <Card><CardHeader title="Product & MRP resolution" subtitle="Explicit IDs prevent similarly named observed products from being substituted"/>
      <div className="form-grid two">{productFields.map(([key,label]) => <Field key={key} label={label}><Select aria-label={label} value={form[key] || ''} onChange={e => set(key, e.target.value ? Number(e.target.value) : null)}>{productOptions}</Select></Field>)}</div>
      {data.products.some((p: any) => p.catalogue_source === 'hosted_catalogue') && <Callout tone="warning" title="Hosted catalogue in scope">These rows provide an explicit MRP reference only. They do not add transactions, revenue, or performance to the selected partner studio.</Callout>}
      <Field label="Policy / provenance notes"><Textarea rows={4} value={form.notes || ''} onChange={e => set('notes', e.target.value)}/></Field>
    </Card></div>
    <Card><CardHeader title="Standard discount policy" subtitle="Existing drafts are not silently rewritten; new saves validate against these values"/><div className="form-grid five">{[['first_membership_discount','First membership %'],['lapsed_return_discount','Lapsed first purchase %'],['class_pack_discount','10/20/30 packs %'],['annual_discount','Annual membership %'],['six_month_discount','Six-month unlimited %']].map(([key,label]) => <Field key={key} label={label}><Input type="number" min="0" max="100" value={form[key]} onChange={e => set(key, Number(e.target.value))}/></Field>)}</div></Card>
    <Card><CardHeader title="Annual membership perks" subtitle="Complimentary value and cost stay separate from the cash discount"/><div className="form-grid five">{[['privateSessions','60-minute privates'],['guestPasses','Guest passes'],['hostedClasses','Hosted classes'],['trainerConsultations','Trainer check-ins / year'],['privateSessionMinutes','Private minutes']].map(([key,label]) => <Field key={key} label={label}><Input type="number" min="0" value={form.annual_perks[key] ?? 0} onChange={e => setPerk(key, e.target.value)}/></Field>)}</div><Callout tone="info">Trainer check-in and private staffing costs must be entered in Offer Builder for complete contribution economics. Missing costs are never treated as zero automatically.</Callout></Card>
    <div className="two-column"><Card><CardHeader title="Policy readiness checks"/><div className="policy-checks">{data.checks.map((check: any) => <div key={check.key}>{check.ok ? <CheckCircle2 size={16}/> : <CircleAlert size={16}/>}<span>{check.detail}</span><Badge tone={check.ok ? 'green' : check.severity === 'warning' ? 'amber' : 'red'}>{check.ok ? 'Resolved' : check.severity}</Badge></div>)}</div></Card><Card><CardHeader title="Save with an audit reason"/><Field label="Reason for change" required><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}/></Field><Button icon={<Save size={15}/>} onClick={save} disabled={saving || !reason.trim()}>{saving ? 'Saving…' : 'Save studio policy'}</Button><p className="data-note">Permissions are server-enforced. Before/after policy snapshots appear in the audit log.</p></Card></div>
  </div>;
}
