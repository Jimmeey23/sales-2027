import { prefetch } from '../api';
import { planningLocations } from '../data/locations';
import type { Studio } from '../types';

// Route chunks are already split (App.tsx lazy-loads each page). This starts the download on
// intent — a pointer over a nav link, or keyboard focus on it — so the click lands on a module
// that is already in memory. In dev this also warms Vite's transform cache for that page, which
// is where most of a first navigation is spent. Repeated calls are free: the browser and Vite
// both de-duplicate an import that has already been requested.
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Dashboard'),
  '/sales-plan': () => import('../pages/SalesPlan'),
  '/sales-plan/approvals': () => import('../pages/SalesPlan'),
  '/sales-plan/plan': () => import('../pages/SalesPlan'),
  '/sales-plan/targets': () => import('../pages/SalesPlan'),
  '/sales-plan/activations': () => import('../pages/SalesPlan'),
  '/sales-plan/anniversary': () => import('../pages/SalesPlan'),
  '/sales-plan/marketing': () => import('../pages/SalesPlan'),
  '/sales-plan/campaigns': () => import('../pages/SalesPlan'),
  '/offers': () => import('../pages/OfferStudio'),
  '/offers/planned': () => import('../pages/OfferStudio'),
  '/offers/generate': () => import('../pages/OfferStudio'),
  '/offers/gap': () => import('../pages/OfferStudio'),
  '/offers/manual': () => import('../pages/OfferStudio'),
  '/memberships': () => import('../pages/Memberships'),
  '/insights': () => import('../pages/InsightsHome'),
  '/retention': () => import('../pages/Retention'),
  '/reports': () => import('../pages/Reports'),
  '/settings': () => import('../pages/Settings'),
  '/imports': () => import('../pages/DataImport'),
};

export function preloadRoute(to: string) {
  const path = to.split('?')[0].replace(/\/$/, '') || '/';
  const load = loaders[path] || (path.startsWith('/sales-plan') ? loaders['/sales-plan'] : undefined);
  if (load) void load().catch(() => {});
}

/** Warm the one request the year plan needs, for the location scope the browser is showing. */
export function preloadPlanBundle(studios: Studio[], studioId: number | null, year: number) {
  // Same scope and the same URL the hook asks for, so the prefetch is a cache hit rather than
  // a second identical request.
  const scope = studioId ? studios.filter(s => s.id === studioId) : planningLocations(studios);
  if (scope.length) prefetch(`/plan/bundle?year=${year}&studios=${scope.map(s => s.id).join(',')}`);
}
