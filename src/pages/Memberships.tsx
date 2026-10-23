import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Edit3,
  Grid2X2,
  Info,
  List,
  Package,
  Search,
  ShieldCheck,
  Table2,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { api, patch } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { money, number, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Metric,
  Modal,
  Select,
  StatusBadge,
  TableScroll,
  Tabs,
} from '../components/ui';
import PageHeader from '../components/PageHeader';

type CatalogueProduct = {
  id: number;
  studio_id: number | null;
  studio: string | null;
  city: string | null;
  name: string;
  category: string;
  list_price: number | null;
  sessions_included: number | null;
  validity_days: number | null;
  source: string;
  active?: number;
};
type CatalogueOffer = {
  id: number;
  name: string;
  headline: string | null;
  customer_copy: string | null;
  objective: string;
  offer_type: string;
  studio_id: number | null;
  studio: string | null;
  eligible_products: number[];
  benefit: string | null;
  validity_start: string | null;
  validity_end: string | null;
  redemption_conditions: string | null;
  status: string;
  approval_status: string;
  generation_source: string;
  data_mode: string;
  performance_notes: string | null;
  year: number;
  month: number | null;
};

function productGroup(category: string) {
  const value = category.toLowerCase();
  if (value.includes('membership') || value.includes('subscription')) return 'Memberships';
  if (value.includes('package') || value.includes('pack')) return 'Packages';
  return 'Other offerings';
}

export default function Memberships() {
  const { studioId, year, toast, can } = useApp();
  const [tab, setTab] = useState('catalogue'),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [productStatus, setProductStatus] = useState('active'),
    [view, setView] = useState('grid'),
    [offerStatus, setOfferStatus] = useState('all'),
    [offerSort, setOfferSort] = useState('name'),
    [offerLimit, setOfferLimit] = useState(36),
    [drill, setDrill] = useState<{ product: CatalogueProduct; metric: string } | null>(null),
    [drillData, setDrillData] = useState<any>(null),
    [drillLoading, setDrillLoading] = useState(false),
    [editing, setEditing] = useState<CatalogueProduct | null>(null),
    [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useLoad<any>(
    () => api(`/memberships?year=${year}${studioId ? `&studio=${studioId}` : ''}`),
    [year, studioId],
  );
  const products = useMemo(
    () =>
      ((data?.products || []) as CatalogueProduct[]).filter(p => {
        const matchesCategory = category === 'all' || productGroup(p.category) === category;
        const matchesStatus =
          productStatus === 'all' ||
          (productStatus === 'active' && Boolean(p.active)) ||
          (productStatus === 'inactive' && !p.active);
        const text = `${p.name} ${p.category} ${p.studio || ''} ${p.city || ''}`.toLowerCase();
        return matchesCategory && matchesStatus && text.includes(query.toLowerCase());
      }),
    [data, category, productStatus, query],
  );
  const allOffers = (data?.offers || []) as CatalogueOffer[];
  useEffect(() => {
    if (!drill || drill.metric === 'terms') return;
    let alive = true;
    setDrillData(null);
    setDrillLoading(true);
    api(`/memberships/${drill.product.id}/analytics?year=${year}${studioId ? `&studio=${studioId}` : ''}`)
      .then(value => {
        if (alive) setDrillData(value);
      })
      .catch(error => {
        if (alive) setDrillData({ error: error.message });
      })
      .finally(() => {
        if (alive) setDrillLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [drill, studioId, year]);
  const offers = useMemo(
    () =>
      allOffers
        .filter(o => {
          const text = `${o.name} ${o.headline || ''} ${o.studio || ''} ${o.benefit || ''}`.toLowerCase();
          const matchesStatus =
            offerStatus === 'all' ||
            (offerStatus === 'draft' && o.status === 'draft') ||
            (offerStatus === 'approved' && ['approved', 'active'].includes(o.status)) ||
            (offerStatus === 'demo' && (o.data_mode === 'demo' || o.generation_source === 'plan_2027'));
          return matchesStatus && text.includes(query.toLowerCase());
        })
        .sort((a, b) =>
          offerSort === 'status'
            ? a.status.localeCompare(b.status) || a.name.localeCompare(b.name)
            : offerSort === 'validity'
              ? (a.validity_start || '9999').localeCompare(b.validity_start || '9999') || a.name.localeCompare(b.name)
              : a.name.localeCompare(b.name),
        ),
    [allOffers, query, offerStatus, offerSort],
  );
  if (loading && !data) return <Loading label="Loading membership and package catalogue…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;
  const activeProducts = data.products.filter((p: CatalogueProduct) => Boolean(p.active));
  const memberships = activeProducts.filter((p: CatalogueProduct) => productGroup(p.category) === 'Memberships').length;
  const packages = activeProducts.filter((p: CatalogueProduct) => productGroup(p.category) === 'Packages').length;
  const openDrill = (product: CatalogueProduct, metric: string) => setDrill({ product, metric });
  const saveProduct = async (form: FormData) => {
    if (!editing) return;
    setSaving(true);
    const value = {
      name: String(form.get('name') || '').trim(),
      category: String(form.get('category') || '').trim(),
      list_price: form.get('list_price') === '' ? null : Number(form.get('list_price')),
      sessions_included: Number(form.get('sessions_included')),
      validity_days: form.get('validity_days') === '' ? null : Number(form.get('validity_days')),
      active: form.get('active') === 'on',
    };
    try {
      await patch(`/products/${editing.id}`, value);
      toast('Membership settings saved.');
      setEditing(null);
      await reload();
    } catch (error: any) {
      toast(error.message || 'Could not save membership settings.', 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="ws-page memberships-page">
      <PageHeader
        eyebrow="PRODUCT & CUSTOMER TERMS"
        title="Memberships & offerings"
        description="Browse the imported package and membership catalogue, then review customer-facing terms attached to offers for the selected planning year."
        meta={
          <>
            <Badge tone="blue">{year} offer plans</Badge>
            <Badge tone="neutral">{studioId ? 'Selected location' : 'All locations'}</Badge>
          </>
        }
      />
      {offers.some((o: CatalogueOffer) => o.data_mode === 'demo' || o.generation_source === 'plan_2027') && (
        <Callout tone="warning" title="Planning offers are not published terms">
          Draft and demonstration offers are shown for review. They are not approved or active unless their status says
          so.
        </Callout>
      )}
      <div className="planning-summary memberships-summary">
        <Metric label="Catalogue items" value={number(activeProducts.length)} detail="Active product records" />
        <Metric label="Memberships" value={number(memberships)} detail="Membership and subscription categories" />
        <Metric label="Packages" value={number(packages)} detail="Class and event packages" />
        <Metric
          label="Offer plans"
          value={number(data.offers.length)}
          detail={`${year} · terms shown where recorded`}
        />
      </div>
      <Card className="memberships-browser">
        <div className="memberships-toolbar">
          <Tabs
            value={tab}
            onChange={value => {
              setTab(value);
              setOfferLimit(36);
            }}
            items={[
              { id: 'catalogue', label: 'Packages & memberships', count: activeProducts.length },
              { id: 'terms', label: 'Offers & terms', count: data.offers.length },
            ]}
          />
          <div className="memberships-controls">
            <div className="ws-filterbar">
              <label className="ws-search">
                <Search size={16} />
                <Input
                  aria-label="Search catalogue"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setOfferLimit(36);
                  }}
                  placeholder={
                    tab === 'catalogue' ? 'Search name, category or studio' : 'Search offers, benefits or studio'
                  }
                />
              </label>
              {tab === 'catalogue' ? (
                <>
                  <Select
                    aria-label="Filter product category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="all">All offerings</option>
                    <option value="Memberships">Memberships</option>
                    <option value="Packages">Packages</option>
                    <option value="Other offerings">Other offerings</option>
                  </Select>
                  {can('product_edit') && (
                    <Select
                      aria-label="Filter catalogue status"
                      value={productStatus}
                      onChange={e => setProductStatus(e.target.value)}
                    >
                      <option value="active">Active items</option>
                      <option value="inactive">Inactive items</option>
                      <option value="all">All statuses</option>
                    </Select>
                  )}
                </>
              ) : (
                <>
                  <Select
                    aria-label="Filter offer status"
                    value={offerStatus}
                    onChange={e => {
                      setOfferStatus(e.target.value);
                      setOfferLimit(36);
                    }}
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Drafts</option>
                    <option value="approved">Approved / active</option>
                    <option value="demo">Demonstrations</option>
                  </Select>
                  <Select aria-label="Sort offers" value={offerSort} onChange={e => setOfferSort(e.target.value)}>
                    <option value="name">Sort: name</option>
                    <option value="status">Sort: status</option>
                    <option value="validity">Sort: start date</option>
                  </Select>
                </>
              )}
            </div>
            <div className="memberships-view-switch" role="group" aria-label="View options">
              {[
                ['grid', Grid2X2, 'Grid'],
                ['list', List, 'List'],
                ['table', Table2, 'Table'],
              ].map(([id, Icon, label]: any) => (
                <button
                  key={id}
                  type="button"
                  className={view === id ? 'active' : ''}
                  aria-pressed={view === id}
                  title={`${label} view`}
                  onClick={() => setView(id)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {tab === 'catalogue' ? (
          products.length ? (
            <div className={`membership-product-view view-${view}`}>
              {view === 'table' ? (
                <TableScroll>
                  <table className="data-table membership-table">
                    <thead>
                      <tr>
                        <th>Offering</th>
                        <th>Type</th>
                        <th>Studio</th>
                        <th className="num">Sessions</th>
                        <th>Validity</th>
                        <th className="num">Price</th>
                        <th>Terms</th>
                        {can('product_edit') && <th>Settings</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <DrillCell product={p} metric="sales" onOpen={openDrill}>
                              <strong>{p.name}</strong>
                              <small>{titleCase(p.source)} · open sales context</small>
                            </DrillCell>
                          </td>
                          <td>
                            <DrillCell product={p} metric="category" onOpen={openDrill}>
                              {p.category}
                            </DrillCell>
                          </td>
                          <td>
                            <DrillCell product={p} metric="studio" onOpen={openDrill}>
                              {p.studio || 'Not specified'}
                            </DrillCell>
                          </td>
                          <td className="num">
                            <DrillCell product={p} metric="sessions" onOpen={openDrill}>
                              {p.sessions_included != null ? number(p.sessions_included) : '—'}
                            </DrillCell>
                          </td>
                          <td>
                            <DrillCell product={p} metric="validity" onOpen={openDrill}>
                              {p.validity_days != null ? `${number(p.validity_days)} days` : 'Not recorded'}
                            </DrillCell>
                          </td>
                          <td className="num">
                            <DrillCell product={p} metric="price" onOpen={openDrill}>
                              {money(p.list_price)}
                            </DrillCell>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="table-drill-cell terms-drill-trigger"
                              onClick={() => openDrill(p, 'terms')}
                            >
                              <ShieldCheck size={13} /> View linked terms (
                              {allOffers.filter(o => o.eligible_products.includes(p.id)).length})
                            </button>
                          </td>
                          {can('product_edit') && (
                            <td>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Edit3 size={13} />}
                                onClick={() => setEditing(p)}
                              >
                                Edit
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              ) : (
                <div className="membership-product-grid">
                  {products.map(p => {
                    const related = allOffers.filter(o => o.eligible_products.includes(p.id));
                    return (
                      <article className={`membership-product ${view === 'list' ? 'product-list-row' : ''}`} key={p.id}>
                        <header>
                          <span className="membership-icon">
                            {productGroup(p.category) === 'Memberships' ? (
                              <BadgeCheck size={18} />
                            ) : productGroup(p.category) === 'Packages' ? (
                              <Package size={18} />
                            ) : (
                              <Ticket size={18} />
                            )}
                          </span>
                          <div>
                            <Badge
                              tone={
                                productGroup(p.category) === 'Memberships'
                                  ? 'purple'
                                  : productGroup(p.category) === 'Packages'
                                    ? 'blue'
                                    : 'neutral'
                              }
                            >
                              {p.category}
                            </Badge>
                            {!p.active && <Badge tone="red">Inactive</Badge>}
                            <h3>{p.name}</h3>
                          </div>
                          {can('product_edit') && (
                            <Button
                              className="membership-card-edit"
                              variant="ghost"
                              size="sm"
                              icon={<Edit3 size={13} />}
                              onClick={() => setEditing(p)}
                            >
                              Edit
                            </Button>
                          )}
                        </header>
                        <div className="membership-price">
                          {money(p.list_price)}
                          <small>listed price</small>
                        </div>
                        <div className="membership-facts">
                          <span>
                            <b>Studio</b>
                            {p.studio || 'Not specified'}
                          </span>
                          <span>
                            <b>Sessions</b>
                            {p.sessions_included != null ? number(p.sessions_included) : 'Not recorded'}
                          </span>
                          <span>
                            <b>Validity</b>
                            {p.validity_days != null ? `${number(p.validity_days)} days` : 'Not recorded'}
                          </span>
                          <span>
                            <b>Catalogue source</b>
                            {titleCase(p.source)}
                          </span>
                        </div>
                        <ProductTerms product={p} related={related} />
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Package size={28} />}
              title="No matching catalogue items"
              text="Try another search, category or catalogue status."
            />
          )
        ) : offers.length ? (
          <>
            <div className={`membership-offer-view view-${view}`}>
              {view === 'table' ? (
                <TableScroll>
                  <table className="data-table membership-table">
                    <thead>
                      <tr>
                        <th>Offer</th>
                        <th>Studio</th>
                        <th>Status</th>
                        <th>Validity</th>
                        <th>Products</th>
                        <th>Terms & conditions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.slice(0, offerLimit).map(o => (
                        <tr key={o.id}>
                          <td>
                            <strong>{o.name}</strong>
                            <small>
                              {titleCase(o.objective)} · {titleCase(o.offer_type)}
                            </small>
                          </td>
                          <td>{o.studio || 'All locations'}</td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td>
                            {o.validity_start || '—'}
                            {o.validity_end ? ` – ${o.validity_end}` : ''}
                          </td>
                          <td>
                            {o.eligible_products
                              .map(id => data.products.find((p: CatalogueProduct) => p.id === id)?.name || `#${id}`)
                              .join(', ') || '—'}
                          </td>
                          <td>
                            <details className="terms-table-details">
                              <summary>Read terms</summary>
                              {o.redemption_conditions || 'No redemption conditions recorded.'}
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              ) : (
                <div className="membership-offer-grid">
                  {offers.slice(0, offerLimit).map(o => (
                    <OfferCard key={o.id} offer={o} products={data.products} />
                  ))}
                </div>
              )}
            </div>
            <div className="membership-results-footer">
              <span>
                Showing {Math.min(offerLimit, offers.length)} of {offers.length} matching offers
              </span>
              {offerLimit < offers.length && (
                <button type="button" onClick={() => setOfferLimit(n => n + 36)}>
                  Show 36 more
                </button>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<CalendarDays size={28} />}
            title="No matching offers"
            text="Change the search or status filter, or choose another planning year."
          />
        )}
      </Card>
      <p className="data-note memberships-footnote">
        Catalogue prices and product details come from imported product records. Terms are displayed from each offer’s
        saved redemption conditions; no legal wording is inferred when it is missing.
      </p>
      {drill && (
        <Drawer
          title={drill.product.name}
          subtitle={`${drillMetricLabel(drill.metric)} · ${drill.product.studio || 'All locations'} · ${year}`}
          onClose={() => setDrill(null)}
        >
          <div className="drill-context-banner">
            <Info size={16} />
            <span>{drillDescription(drill.metric, drill.product, year)}</span>
          </div>
          {drill.metric === 'terms' ? (
            <ExpandedProductTerms
              product={drill.product}
              related={allOffers.filter(o => o.eligible_products.includes(drill.product.id))}
            />
          ) : !can('financial') ? (
            <Callout tone="warning" title="Financial permission required">
              Your role can view catalogue settings, but this sales drill-down requires financial access.
            </Callout>
          ) : drillLoading ? (
            <Loading label="Loading product sales context…" />
          ) : drillData?.error ? (
            <ErrorState message={drillData.error} />
          ) : (
            drillData && (
              <>
                <div className="drill-metrics">
                  <Metric
                    label={`${year} transactions`}
                    value={number(drillData.selectedYear.transactions)}
                    detail="Exact product name matches"
                  />
                  <Metric
                    label="Unique buyers"
                    value={number(drillData.selectedYear.customers)}
                    detail="Distinct member references"
                  />
                  <Metric
                    label={`${year} net revenue`}
                    value={money(drillData.selectedYear.net_revenue)}
                    detail={`${money(drillData.selectedYear.gross_revenue)} gross before discounts`}
                  />
                  <Metric
                    label="Average ticket"
                    value={money(drillData.selectedYear.average_ticket)}
                    detail={`${money(drillData.selectedYear.discounts)} discounts recorded`}
                  />
                </div>
                {drill.metric === 'price' && (
                  <div className="drill-detail-card">
                    <strong>List price context</strong>
                    <p>
                      Current catalogue price: {money(drill.product.list_price)}. Observed average ticket for this
                      product in {year}: {money(drillData.selectedYear.average_ticket)}.
                    </p>
                    <small>
                      Observed ticket values can differ from list price because of discounts, taxes, historic pricing or
                      data gaps.
                    </small>
                  </div>
                )}
                {drill.metric === 'sessions' && (
                  <div className="drill-detail-card">
                    <strong>Package volume context</strong>
                    <p>
                      This catalogue item includes {number(drill.product.sessions_included)} sessions.{' '}
                      {drillData.selectedYear.transactions
                        ? `There are ${number(drillData.selectedYear.transactions)} matched purchases in ${year}.`
                        : 'No matching purchases are recorded for the selected year.'}
                    </p>
                  </div>
                )}
                {drill.metric === 'validity' && (
                  <div className="drill-detail-card">
                    <strong>Validity context</strong>
                    <p>
                      Recorded product validity is{' '}
                      {drill.product.validity_days ? `${number(drill.product.validity_days)} days` : 'not specified'}.
                      Matched sales run from {drillData.lifetime.first_sale || 'no recorded first sale'} to{' '}
                      {drillData.lifetime.last_sale || 'no recorded latest sale'}.
                    </p>
                  </div>
                )}
                <section className="drill-trend">
                  <header>
                    <div>
                      <h3>
                        <TrendingUp size={16} /> Monthly sales context
                      </h3>
                      <p>Transactions and net revenue matched to this catalogue item in {year}.</p>
                    </div>
                    <Badge tone="neutral">{drillData.match}</Badge>
                  </header>
                  {drillData.monthly.length ? (
                    <TableScroll>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Transactions</th>
                            <th>Buyers</th>
                            <th className="num">Net revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillData.monthly.map((m: any) => (
                            <tr key={m.month}>
                              <td>{m.month}</td>
                              <td>{number(m.transactions)}</td>
                              <td>{number(m.customers)}</td>
                              <td className="num">{money(m.net_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                  ) : (
                    <EmptyState
                      title={`No matched sales in ${year}`}
                      text="This may mean the item had no sales or the imported sales name differs from the catalogue name."
                    />
                  )}
                </section>
              </>
            )
          )}
        </Drawer>
      )}
      {editing && (
        <Modal
          title="Edit membership settings"
          subtitle={`${editing.studio || 'Shared catalogue'} · changes are saved to the product catalogue`}
          onClose={() => !saving && setEditing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button form="membership-settings-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
            </>
          }
        >
          <form
            id="membership-settings-form"
            className="membership-edit-form"
            onSubmit={e => {
              e.preventDefault();
              saveProduct(new FormData(e.currentTarget));
            }}
          >
            <div className="membership-edit-note">
              <Info size={15} />
              <span>
                Manual edits are protected from future catalogue price imports. Changes are recorded in the workspace
                audit log.
              </span>
            </div>
            <Field label="Offering name" required>
              <Input name="name" defaultValue={editing.name} required maxLength={180} />
            </Field>
            <Field label="Category" required>
              <Input name="category" defaultValue={editing.category} required maxLength={80} />
            </Field>
            <div className="form-grid two">
              <Field label="List price (INR)">
                <Input
                  name="list_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editing.list_price ?? ''}
                  placeholder="Not recorded"
                />
              </Field>
              <Field label="Sessions included">
                <Input
                  name="sessions_included"
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue={editing.sessions_included ?? 0}
                />
              </Field>
              <Field label="Validity (days)">
                <Input
                  name="validity_days"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing.validity_days ?? ''}
                  placeholder="Not recorded"
                />
              </Field>
            </div>
            <label className="membership-active-toggle">
              <input type="checkbox" name="active" defaultChecked={Boolean((editing as any).active ?? true)} />
              <span>
                <strong>Available in catalogue</strong>
                <small>Inactive products are hidden from the customer offering catalogue.</small>
              </span>
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}

function drillMetricLabel(metric: string) {
  return (
    (
      {
        sales: 'Sales overview',
        category: 'Category performance',
        studio: 'Location performance',
        sessions: 'Sessions included',
        validity: 'Validity settings',
        price: 'Price performance',
        terms: 'Terms & conditions',
      } as Record<string, string>
    )[metric] || 'Product analytics'
  );
}
function drillDescription(metric: string, product: CatalogueProduct, year: number) {
  const messages: Record<string, string> = {
    sales: `Sales are matched to “${product.name}” by exact product name and shown as observed imported transactions.`,
    category: `Category is catalogue metadata. Sales metrics below show purchases matched to this product within the selected location scope.`,
    studio: `Location reflects the product catalogue host. Sales below follow the location selected in the workspace.`,
    sessions: `Session allowance comes from the catalogue; the sales table shows actual matched purchases, not a projected redemption count.`,
    validity: `Validity is the configured product duration. Sales history is shown as recorded, without assuming a start-date relationship.`,
    price: `Catalogue list price is compared with recorded transaction values. The difference is context only and is not treated as a discount calculation.`,
    terms:
      'These are conditions saved to linked offers. The catalogue does not contain separate product-level legal terms.',
  };
  return messages[metric] || `Observed sales context for ${year}.`;
}

function DrillCell({
  product,
  metric,
  onOpen,
  children,
}: {
  product: CatalogueProduct;
  metric: string;
  onOpen: (product: CatalogueProduct, metric: string) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="table-drill-cell"
      onClick={() => onOpen(product, metric)}
      aria-label={`Open ${drillMetricLabel(metric)} for ${product.name}`}
    >
      {children}
    </button>
  );
}

function ExpandedProductTerms({ product, related }: { product: CatalogueProduct; related: CatalogueOffer[] }) {
  return (
    <section className="drill-terms-list">
      <h3>
        <ShieldCheck size={16} /> Linked offer terms
      </h3>
      {related.length ? (
        related.map(offer => (
          <article key={offer.id}>
            <header>
              <strong>{offer.name}</strong>
              <StatusBadge status={offer.status} />
            </header>
            <p>{offer.redemption_conditions || 'No redemption conditions were recorded for this offer.'}</p>
            <small>
              {offer.studio || 'All locations'} · {offer.validity_start || 'No start date'}
              {offer.validity_end ? ` to ${offer.validity_end}` : ''}
            </small>
          </article>
        ))
      ) : (
        <EmptyState
          title="No linked offer terms"
          text={`No offer currently references ${product.name}. Product-specific legal terms have not been supplied in the catalogue.`}
        />
      )}
    </section>
  );
}

function ProductTerms({ product, related }: { product: CatalogueProduct; related: CatalogueOffer[] }) {
  return (
    <details className="membership-terms">
      <summary>
        <ShieldCheck size={14} /> Terms & conditions{' '}
        <Badge tone="neutral">
          {related.length ? `${related.length} linked offer${related.length === 1 ? '' : 's'}` : 'Not in catalogue'}
        </Badge>
      </summary>
      {related.length ? (
        <div className="related-terms">
          {related.map(o => (
            <section key={o.id}>
              <div className="related-term-heading">
                <strong>{o.name}</strong>
                <StatusBadge status={o.status} />
              </div>
              {o.redemption_conditions ? (
                <p>{o.redemption_conditions}</p>
              ) : (
                <p className="terms-missing">No redemption conditions were recorded for this offer.</p>
              )}
              <small>
                {o.studio || 'All locations'} · {o.validity_start || 'No start date'}
                {o.validity_end ? ` to ${o.validity_end}` : ''}
              </small>
            </section>
          ))}
        </div>
      ) : (
        <p className="terms-missing">
          No product-specific terms were supplied for {product.name}. Review linked offers under “Offers & terms”; offer
          conditions do not automatically apply to the catalogue item.
        </p>
      )}
    </details>
  );
}

function OfferCard({ offer, products }: { offer: CatalogueOffer; products: CatalogueProduct[] }) {
  const eligible = offer.eligible_products.map(
    id => products.find((p: CatalogueProduct) => p.id === id)?.name || `Product #${id}`,
  );
  return (
    <article className="membership-offer-card">
      <header className="membership-offer-card-head">
        <div>
          <span className="offer-eyebrow">
            {titleCase(offer.objective)} <i /> {titleCase(offer.offer_type)}
          </span>
          <h3>{offer.name}</h3>
        </div>
        <div className="membership-badges">
          <StatusBadge status={offer.status} />
          <Badge tone={offer.data_mode === 'demo' ? 'purple' : offer.data_mode === 'actual' ? 'green' : 'amber'}>
            {titleCase(offer.data_mode)}
          </Badge>
        </div>
      </header>
      {offer.benefit && <div className="offer-benefit-strip">{offer.benefit}</div>}
      {offer.customer_copy && <p className="offer-customer-copy">{offer.customer_copy}</p>}
      <div className="offer-meta-grid">
        <div>
          <span>Studio</span>
          <strong>{offer.studio || 'All locations'}</strong>
        </div>
        <div>
          <span>Validity</span>
          <strong>
            {offer.validity_start || 'Not specified'}
            {offer.validity_end ? ` → ${offer.validity_end}` : ''}
          </strong>
        </div>
        <div>
          <span>Eligible products</span>
          <strong>{eligible.length ? eligible.join(', ') : 'Not specified'}</strong>
        </div>
        <div>
          <span>Approval</span>
          <strong>{titleCase(offer.approval_status)}</strong>
        </div>
      </div>
      <section className="offer-terms-panel">
        <div className="offer-terms-title">
          <ShieldCheck size={16} />
          <h4>Terms & conditions</h4>
        </div>
        {offer.redemption_conditions ? (
          <p>{offer.redemption_conditions}</p>
        ) : (
          <p className="terms-missing">No redemption conditions have been recorded for this offer.</p>
        )}
      </section>
      {offer.performance_notes && (
        <details className="offer-notes">
          <summary>Planning notes</summary>
          <p>{offer.performance_notes}</p>
        </details>
      )}
    </article>
  );
}
