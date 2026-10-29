import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeftRight,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  Filter,
  MoreHorizontal,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { api, downloadCsv, post } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { MONTHS, OBJECTIVES, money, number, percent, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  DefinitionList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  Select,
  StatusBadge,
  TableScroll,
  Tabs,
} from '../components/ui';
import PageHeader from '../components/PageHeader';
import ExperimentPanel from '../components/ExperimentPanel';

export default function OfferBank() {
  const { boot, studioId, year, toast, can } = useApp(),
    navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [workspace, setWorkspace] = useState('bank');
  const [filters, setFilters] = useState<any>({
    q: params.get('q') || '',
    status: '',
    objective: '',
    month: '',
    year: '',
    maxDiscount: '',
    performance: '',
    city: '',
  });
  const [page, setPage] = useState(1),
    [sort, setSort] = useState('updated'),
    [selected, setSelected] = useState<any>(null),
    [compare, setCompare] = useState<any[]>([]),
    [clone, setClone] = useState<any>(null),
    [archive, setArchive] = useState<any>(null),
    [campaignConflict, setCampaignConflict] = useState<any>(null);
  const query = useMemo(() => {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && q.set(k, String(v)));
    if (studioId) q.set('studio', String(studioId));
    q.set('year', String(year));
    q.set('bank', '1');
    q.set('page', String(page));
    q.set('limit', '40');
    return q.toString();
  }, [filters, studioId, year, page]);
  const { data, loading, error, reload } = useLoad<any>(() => api(`/offers?${query}`), [query]);
  const rows = useMemo(
    () =>
      [...(data?.rows || [])].sort(
        (a: any, b: any) =>
          // Recommended offers lead whatever the sort.
          Number(!!b.provenance?.recommended) - Number(!!a.provenance?.recommended) ||
          (sort === 'revenue'
            ? (b.actual_revenue || b.expected_revenue || 0) - (a.actual_revenue || a.expected_revenue || 0)
            : sort === 'discount'
              ? (b.effective_discount || 0) - (a.effective_discount || 0)
              : sort === 'redemptions'
                ? (b.actual_redemptions || 0) - (a.actual_redemptions || 0)
                : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
      ),
    [data, sort],
  );
  const set = (key: string, value: any) => {
    setFilters((f: any) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const action = async (offer: any, action: string, body: any = {}) => {
    try {
      await post(`/offers/${offer.id}/action`, { action, ...body });
      toast(`Offer ${action} completed.`);
      setSelected(null);
      setArchive(null);
      await reload();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  const open = async (offer: any) => {
    setSelected(await api(`/offers/${offer.id}`));
  };
  const addCampaign = async (offer: any, force = false) => {
    try {
      const start = offer.validity_start || `${offer.year || year}-${String(offer.month || 1).padStart(2, '0')}-01`,
        end = offer.validity_end || start;
      await post('/campaigns', {
        name: offer.name,
        studioId: offer.studio_id,
        offerId: offer.id,
        year: offer.year || year,
        startDate: start,
        endDate: end,
        audience: offer.audience,
        objective: offer.objective,
        targetRevenue: offer.revenue_target,
        expectedPurchases: offer.target_purchases,
        force,
      });
      toast('Draft campaign added to calendar.');
    } catch (error: any) {
      if (error.status === 409) setCampaignConflict({ offer, conflicts: error.conflicts });
      else toast(error.message, 'error');
    }
  };
  const toggleCompare = (offer: any) =>
    setCompare(current =>
      current.some(o => o.id === offer.id)
        ? current.filter(o => o.id !== offer.id)
        : current.length < 2
          ? [...current, offer]
          : [current[1], offer],
    );
  return (
    <div>
      <PageHeader
        eyebrow="PERSISTENT OFFER INTELLIGENCE"
        title="One bank. Every variation accounted for."
        description="Search historical promotions, AI/rules-engine concepts and manual offers. Observed results, planning scenarios and approval decisions stay distinct."
        actions={<Button onClick={() => navigate('/offer-builder')}>Create manual offer</Button>}
      />
      <Tabs
        value={workspace}
        onChange={setWorkspace}
        items={[
          { id: 'bank', label: 'Offer bank & comparison' },
          { id: 'experiments', label: 'Offer experiments' },
        ]}
      />
      {workspace === 'experiments' ? (
        <ExperimentPanel />
      ) : (
        <>
          <Card className="offer-search-card">
            <form
              className="offer-search"
              onSubmit={e => {
                e.preventDefault();
                setPage(1);
                reload();
              }}
            >
              <Search size={20} />
              <input
                value={filters.q}
                onChange={e => set('q', e.target.value)}
                placeholder="Try: offers that performed well for lapsed clients at Mumbai studios with discounts below 15%"
              />
              <Button type="submit">Search</Button>
            </form>
            <div className="table-filters">
              <Select value={filters.status} onChange={e => set('status', e.target.value)}>
                <option value="">All statuses</option>
                {[
                  'draft',
                  'ai_generated',
                  'under_review',
                  'approved',
                  'scheduled',
                  'active',
                  'paused',
                  'completed',
                  'archived',
                  'rejected',
                ].map(s => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
              <Select value={filters.objective} onChange={e => set('objective', e.target.value)}>
                <option value="">All objectives</option>
                {OBJECTIVES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              <Select value={filters.year} onChange={e => set('year', e.target.value)}>
                <option value="">All years</option>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
              <Select value={filters.city} onChange={e => set('city', e.target.value)}>
                <option value="">All cities</option>
                {[...new Set(boot.studios.map(s => s.city))].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Select value={filters.maxDiscount} onChange={e => set('maxDiscount', e.target.value)}>
                <option value="">Any discount</option>
                <option value="5">Below 5%</option>
                <option value="10">Below 10%</option>
                <option value="15">Below 15%</option>
                <option value="20">Below 20%</option>
              </Select>
              <Select value={filters.performance} onChange={e => set('performance', e.target.value)}>
                <option value="">Any performance</option>
                <option value="proven">Has observed revenue</option>
                <option value="poor">High redemption + discount</option>
              </Select>
            </div>
          </Card>
          {compare.length > 0 && (
            <div className="compare-tray">
              <span>
                <ArrowLeftRight size={16} />
                {compare.length} selected for comparison
              </span>
              <div>
                {compare.map(o => (
                  <Badge key={o.id}>
                    {o.name}
                    <button onClick={() => toggleCompare(o)}>
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button size="sm" disabled={compare.length !== 2} onClick={() => setCompare([...compare])}>
                Compare offers
              </Button>
            </div>
          )}
          <Card>
            <div className="list-toolbar">
              <span>{data?.total ?? '—'} offers</span>
              <Select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="updated">Recently modified</option>
                <option value="revenue">Revenue: high to low</option>
                <option value="redemptions">Redemptions: high to low</option>
                <option value="discount">Discount: high to low</option>
              </Select>
            </div>
            {loading && !data ? (
              <Loading />
            ) : error ? (
              <ErrorState message={error} />
            ) : rows.length ? (
              <TableScroll>
                <table className="data-table offer-bank-table">
                  <thead>
                    <tr>
                      <th>Compare</th>
                      <th>Offer</th>
                      <th>Studio / campaign</th>
                      <th>Objective & audience</th>
                      <th>Mechanism</th>
                      <th className="num">Expected / actual revenue</th>
                      <th className="num">Customer benefit</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o: any) => (
                      <tr key={o.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={compare.some(c => c.id === o.id)}
                            onChange={() => toggleCompare(o)}
                            aria-label={`Compare ${o.name}`}
                          />
                        </td>
                        <td>
                          <button className="offer-name-link" onClick={() => open(o)}>
                            <strong>{o.name}</strong>
                            <span>{o.offer_uid}</span>
                          </button>
                          {o.data_mode === 'demo' && <Badge tone="purple">Demo plan</Badge>}
                          {o.provenance?.recommended && (
                            <span
                              title={
                                o.provenance.recommendedMonths?.length
                                  ? `Best fit for ${o.provenance.recommendedMonths.map((m: number) => MONTHS[m - 1]).join(', ')}`
                                  : 'Best fit for the 2027 plan'
                              }
                            >
                              <Badge tone="green">
                                <Sparkles size={12} /> Recommended
                              </Badge>
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>{o.studio || 'All studios'}</strong>
                          <span>Offer bank {o.year}</span>
                        </td>
                        <td>
                          <span>{titleCase(o.objective)}</span>
                          <small>{o.audience || 'Audience not specified'}</small>
                        </td>
                        <td>{titleCase(o.offer_type)}</td>
                        <td className="num">
                          <strong>{money(o.actual_revenue ?? o.expected_revenue, true)}</strong>
                          <small>{o.actual_revenue !== null ? 'Observed' : 'Scenario'}</small>
                        </td>
                        <td className="num">{percent(o.effective_discount)}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td>
                          <Badge
                            tone={
                              o.generation_source === 'openai'
                                ? 'purple'
                                : o.generation_source === 'historical_import'
                                  ? 'green'
                                  : 'neutral'
                            }
                          >
                            {titleCase(o.generation_source)}
                          </Badge>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button title="View details" onClick={() => open(o)}>
                              <Eye size={16} />
                            </button>
                            {can('offer_edit') && (
                              <button title="Edit" onClick={() => navigate(`/offers/${o.id}/edit`)}>
                                <Edit3 size={16} />
                              </button>
                            )}
                            <button title="Duplicate" onClick={() => action(o, 'duplicate')}>
                              <Copy size={16} />
                            </button>
                            <button title="More actions" onClick={() => open(o)}>
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <EmptyState
                title="No offers match these filters"
                text="Broaden the search or create a new offer. Insufficient history is never presented as proven performance."
                action={<Button onClick={() => navigate('/offer-builder')}>Create offer</Button>}
              />
            )}
            <div className="pagination">
              <span>
                Page {data?.page || 1} of {Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || 40)))}
              </span>
              <div>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= Math.ceil((data?.total || 0) / (data?.limit || 40))}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </Card>
          {selected && (
            <Drawer
              title={selected.name}
              subtitle={`${selected.offer_uid} · version ${selected.version}`}
              onClose={() => setSelected(null)}
              footer={
                <div className="drawer-action-grid">
                  <Button variant="secondary" onClick={() => navigate(`/offers/${selected.id}/edit`)}>
                    <Edit3 size={14} /> Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setClone(selected)}>
                    <Copy size={14} /> Clone
                  </Button>
                  <Button variant="secondary" onClick={() => addCampaign(selected)}>
                    <CalendarPlus size={14} /> Add to calendar
                  </Button>
                  <Button variant="secondary" onClick={() => downloadCsv(`${selected.offer_uid}.csv`, [selected])}>
                    <Download size={14} /> Export
                  </Button>
                  {can('offer_approve') && selected.status !== 'approved' && (
                    <Button onClick={() => action(selected, 'approve')}>
                      <Check size={14} /> Approve
                    </Button>
                  )}
                  {can('offer_approve') && (
                    <Button variant="danger" onClick={() => action(selected, 'reject')}>
                      Reject
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setArchive(selected)}>
                    <Archive size={14} /> Archive
                  </Button>
                </div>
              }
            >
              <div className="drawer-badges">
                <StatusBadge status={selected.status} />
                <Badge>{titleCase(selected.generation_source)}</Badge>
                <Badge
                  tone={selected.data_mode === 'actual' ? 'green' : selected.data_mode === 'demo' ? 'purple' : 'amber'}
                >
                  {titleCase(selected.data_mode)}
                </Badge>
              </div>
              <Callout tone={selected.data_mode === 'actual' ? 'info' : 'warning'}>
                {selected.performance_notes ||
                  'Expected values are planning scenarios until actual performance is recorded.'}
              </Callout>
              <h3>Customer-facing copy</h3>
              <div className="customer-copy">
                {selected.customer_copy || 'Not supplied for this historical promotion.'}
              </div>
              <h3>Internal rationale</h3>
              <p>{selected.rationale || selected.internal_description}</p>
              <DefinitionList
                items={[
                  ['Studio', selected.studio || 'All studios'],
                  ['Campaign', selected.month ? `${MONTHS[selected.month - 1]} ${selected.year}` : 'Unscheduled'],
                  ['Objective', titleCase(selected.objective)],
                  ['Audience', selected.audience],
                  ['Excluded', selected.excluded_audience],
                  ['Benefit', selected.benefit],
                  ['Validity', `${selected.validity_start || '—'} → ${selected.validity_end || '—'}`],
                  ['Expected ASP', money(selected.expected_asp)],
                  ['Expected revenue', money(selected.expected_revenue)],
                  ['Observed revenue', money(selected.actual_revenue)],
                  [
                    'Expected / actual redemptions',
                    `${number(selected.expected_redemptions)} / ${number(selected.actual_redemptions)}`,
                  ],
                  ['Cash selling price', money(selected.financials?.sellingPrice)],
                  ['Reference + benefit value', money(selected.financials?.referenceValue)],
                  [
                    'Complimentary value / cost per buyer',
                    `${money(selected.financials?.benefitValue)} / ${money(selected.financials?.benefitCost)}`,
                  ],
                  ['Expected group-class usage', number(selected.financials?.expectedClasses)],
                  ['Total customer benefit', percent(selected.effective_discount)],
                  ['Original offer', selected.original_offer_id ? `#${selected.original_offer_id}` : 'Original'],
                  ['Created by', selected.created_by_name || 'System import'],
                ]}
              />
              {selected.provenance?.pricing && (
                <>
                  <h3>Pricing & policy provenance</h3>
                  <DefinitionList
                    items={[
                      ['Pricing product', selected.provenance.pricing.productName],
                      ['Reference MRP', money(selected.provenance.pricing.mrp)],
                      ['Catalogue source', titleCase(selected.provenance.pricing.source)],
                      ['Catalogue studio', selected.provenance.pricing.catalogueStudio],
                      ['Audience source', titleCase(selected.provenance.audienceSource)],
                      ['Generated by', titleCase(selected.provenance.generatedBy)],
                    ]}
                  />
                  {selected.provenance.pricing.caveat && (
                    <Callout tone="warning">{selected.provenance.pricing.caveat}</Callout>
                  )}
                </>
              )}
              <h3>Risks and success measures</h3>
              <ul className="risk-list">{selected.risks?.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
              <div className="button-row">
                <Button variant="secondary" onClick={() => navigate('/ai-offers', { state: { prefill: selected } })}>
                  <Sparkles size={14} /> Generate variation
                </Button>
              </div>
              <h3>Version history</h3>
              <div className="version-list">
                {selected.versions?.map((v: any) => (
                  <div key={v.id}>
                    <strong>Version {v.version}</strong>
                    <span>
                      {v.changed_by_name || 'System'} · {new Date(v.changed_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </Drawer>
          )}
          {clone && (
            <CloneModal
              offer={clone}
              onClose={() => setClone(null)}
              onDone={() => {
                setClone(null);
                reload();
              }}
            />
          )}
          {archive && (
            <Modal
              title="Archive this offer?"
              onClose={() => setArchive(null)}
              footer={
                <>
                  <Button variant="secondary" onClick={() => setArchive(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={() => action(archive, 'archive')}>
                    Archive offer
                  </Button>
                </>
              }
            >
              <p>
                The original offer and version history remain in the database. It will no longer appear as an active
                planning option.
              </p>
            </Modal>
          )}
          {compare.length === 2 && (
            <Modal title="Offer comparison" onClose={() => setCompare([])} width="900px">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Decision factor</th>
                    {compare.map(o => (
                      <th key={o.id}>{o.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Studio', (o: any) => o.studio],
                    ['Mechanism', (o: any) => titleCase(o.offer_type)],
                    ['Benefit', (o: any) => o.benefit],
                    ['Expected revenue', (o: any) => money(o.expected_revenue)],
                    ['Observed revenue', (o: any) => money(o.actual_revenue)],
                    ['ASP', (o: any) => money(o.expected_asp)],
                    ['Effective discount', (o: any) => percent(o.effective_discount)],
                    ['Redemptions', (o: any) => number(o.actual_redemptions ?? o.expected_redemptions)],
                    ['Status', (o: any) => titleCase(o.status)],
                  ].map(([label, fn]: any) => (
                    <tr key={label}>
                      <td>
                        <strong>{label}</strong>
                      </td>
                      {compare.map(o => (
                        <td key={o.id}>{fn(o)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Callout tone="info">
                Observed revenue and expected revenue are different evidence types. Do not interpret a higher scenario
                as proven performance.
              </Callout>
            </Modal>
          )}
          {campaignConflict && (
            <Modal
              title="Campaign overlap detected"
              onClose={() => setCampaignConflict(null)}
              footer={
                <>
                  <Button variant="secondary" onClick={() => setCampaignConflict(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      addCampaign(campaignConflict.offer, true);
                      setCampaignConflict(null);
                    }}
                  >
                    Override & schedule draft
                  </Button>
                </>
              }
            >
              <Callout tone="warning">
                The same studio and audience already have an overlapping campaign. Review dates, benefits and
                cannibalisation before continuing.
              </Callout>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
function CloneModal({ offer, onClose, onDone }: { offer: any; onClose: () => void; onDone: () => void }) {
  const { boot, toast } = useApp();
  const [studioId, setStudioId] = useState(offer.studio_id),
    [month, setMonth] = useState(offer.month || 1),
    [year, setYear] = useState(offer.year || 2027);
  const submit = async () => {
    try {
      await post(`/offers/${offer.id}/action`, { action: 'clone', studioId, month, year });
      toast('Linked offer clone created and revalidated for its destination.');
      onDone();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  return (
    <Modal
      title={`Clone “${offer.name}”`}
      subtitle="The original remains unchanged; the new version links back to it."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Validate & clone</Button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Destination studio">
          <Select value={studioId} onChange={e => setStudioId(Number(e.target.value))}>
            {boot.studios.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Destination month">
          <Select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Destination year">
          <Select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2026, 2027, 2028].map(y => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Callout tone="info">
        Product price, discount ceiling and financials are rechecked independently for the destination studio.
      </Callout>
    </Modal>
  );
}
