import { BadgeCheck, BarChart3, LayoutDashboard, Settings2, Target, type LucideIcon } from 'lucide-react';

// Single source of truth for the sidebar, breadcrumbs and section detection.
// Routes themselves live in App.tsx; every path below must exist there.
export interface NavLinkDef {
  to: string;
  label: string;
  detail?: string;
  permission?: string;
  match?: string[];
}
export interface NavSection {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  links: NavLinkDef[];
  locationAware: boolean;
}

export const NAV: NavSection[] = [
  { id: 'overview', to: '/', label: 'Overview', icon: LayoutDashboard, locationAware: true, links: [] },
  {
    id: 'plan',
    to: '/sales-plan',
    label: 'Plan',
    icon: Target,
    locationAware: true,
    links: [
      {
        to: '/sales-plan/targets',
        label: 'Target Metrics',
        detail: 'One target per location and its month-by-month breakdown',
        match: ['/sales-plan'],
      },
      {
        to: '/sales-plan/approvals',
        label: 'Approvals & Calculations',
        detail: 'Edit and approve targets; how each month is made up',
      },
      { to: '/sales-plan/plan', label: 'Sales Plan', detail: 'Location playbook, offers and month plans' },
      {
        to: '/sales-plan/activations',
        label: 'Activations & Community Activations',
        detail: 'Challenges, events, partnerships and retention plays',
      },
      { to: '/sales-plan/anniversary', label: 'Anniversary Plan', detail: 'April anniversary programme' },
      {
        to: '/sales-plan/marketing',
        label: 'Marketing & Performance Marketing',
        detail: 'Channel plan, ads and creative hooks',
      },
    ],
  },
  {
    id: 'offers',
    to: '/offers',
    label: 'Offers',
    icon: BadgeCheck,
    locationAware: true,
    links: [
      {
        to: '/offers',
        label: 'Offer studio',
        detail: 'Planned, library, playbook, generate, revenue gap, build',
        match: ['/offers/'],
      },
      { to: '/memberships', label: 'Memberships & pricing', detail: 'Packages, memberships and prices' },
    ],
  },
  {
    id: 'insights',
    to: '/insights',
    label: 'Insights',
    icon: BarChart3,
    locationAware: true,
    links: [
      {
        to: '/insights',
        label: 'Studio performance',
        detail: 'Revenue, attendance and segments',
        match: ['/studios/'],
      },
      { to: '/retention', label: 'Retention & reactivation', detail: 'Renewals due and lapsed clients' },
    ],
  },
  {
    id: 'admin',
    to: '/reports',
    label: 'Admin',
    icon: Settings2,
    locationAware: false,
    links: [
      { to: '/reports', label: 'Reports & exports', permission: 'export' },
      { to: '/imports', label: 'Data import', permission: 'import' },
      { to: '/settings', label: 'Settings', permission: 'settings' },
    ],
  },
];

const within = (path: string, base: string) => path === base || path.startsWith(base.endsWith('/') ? base : `${base}/`);
const linkMatches = (path: string, link: NavLinkDef) =>
  path === link.to || (link.match || []).some(m => (m.endsWith('/') ? path.startsWith(m) : path === m));

export function locate(path: string): { section?: NavSection; link?: NavLinkDef } {
  for (const section of NAV) {
    const link = section.links.find(l => linkMatches(path, l));
    if (link) return { section, link };
  }
  if (path === '/') return { section: NAV[0] };
  return { section: NAV.find(s => s.id !== 'overview' && within(path, s.to)) };
}
export { linkMatches };
