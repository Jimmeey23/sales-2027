import type { Studio } from '../types';

// The four planning locations shown as top-level tabs. Pop-up rolls up Copper + Cloves and Plash Pilates.
export const LOCATION_NAMES = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'] as const;
export const POPUP_VENUES = ['Copper + Cloves', 'Plash Pilates'];
// Each location's accent; the whole workspace takes on the selected location's colour.
export const LOCATION_COLORS: Record<string, string> = {
  'Kemps Corner': '#6d4fd8',
  Bandra: '#0b8a8f',
  'Kenkere House': '#c23a6e',
  'Pop-up': '#cf8417',
};
export const ALL_LOCATIONS_COLOR = '#3563d9';
export const accentFor = (name?: string | null) => (name && LOCATION_COLORS[name]) || ALL_LOCATIONS_COLOR;

export function planningLocations(studios: Studio[]) {
  return LOCATION_NAMES.map(name => studios.find(s => s.name === name)).filter(Boolean) as Studio[];
}

// Studio ids whose offers/campaigns belong to a location (Pop-up includes its venues).
export function locationStudioIds(studio: Studio, studios: Studio[]) {
  if (studio.name !== 'Pop-up') return [studio.id];
  return [studio.id, ...studios.filter(s => POPUP_VENUES.includes(s.name)).map(s => s.id)];
}

// Mix a hex colour toward white (amount 0 → colour, 1 → white). Charts need real colours, not CSS variables.
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16),
    mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => mix(c).toString(16).padStart(2, '0')).join('')}`;
}
