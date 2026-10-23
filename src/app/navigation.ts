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
        label: 'Targets & promotions',
        detail: 'Monthly targets, scenario and lead promotions',
        match: ['/sales-plan'],
      },
      {
        to: '/sales-plan/approvals',
        label: 'Target approvals',
        detail: 'Edit and approve the monthly target matrix',
        permission: 'target_edit',
      },
      { to: '/sales-plan/revenue', label: 'Revenue mix', detail: 'How each month’s target is made up' },
      {
        to: '/plan',
        label: 'Monthly studio plans',
        detail: 'Month strategy, offer slots and playbooks',
        match: ['/plan/'],
      },
      { to: '/sales-plan/campaigns', label: 'Campaigns & activations', detail: 'Planned activations by month' },
      { to: '/calendar', label: 'Campaign calendar', detail: 'Schedule campaigns and spot overlaps' },
      { to: '/anniversary', label: 'April anniversary', detail: 'Anniversary revenue programme' },
      { to: '/sales-plan/marketing', label: 'Marketing & ads', detail: 'Channel plan and ad hooks' },
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
      { to: '/performance', label: 'Campaign results', detail: 'How campaigns performed' },
      { to: '/funnel', label: 'Funnel simulator', detail: 'Model leads → trials → buyers' },
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
