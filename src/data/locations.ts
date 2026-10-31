import type { Studio } from '../types';

// The four planning locations shown as top-level tabs. Pop-up rolls up Copper + Cloves and Plash Pilates.
export const LOCATION_NAMES = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'] as const;
export const POPUP_VENUES = ['Copper + Cloves', 'Plash Pilates'];
// Each location's accent; the whole workspace takes on the selected location's colour.
// Four hues far enough apart to be told apart at 6px (a dot in a list, a bar in a
// chart) and each dark enough to carry white text at AA: teal, indigo, raspberry,
// ochre. Every one of them holds its own on the ivory canvas without competing with
// the shell's gold, which stays reserved for the plan's own signal.
export const LOCATION_COLORS: Record<string, string> = {
  'Kemps Corner': '#0d6b58', // Kemps: deep teal — calm, the flagship
  Bandra: '#28489b', // Bandra: indigo — the loudest room in the portfolio
  'Kenkere House': '#9b2c58', // Kenkere: raspberry — Bengaluru, warmer and newer
  'Pop-up': '#8d5a12', // Pop-up: ochre — small, seasonal, all about the moment
};
// A lighter partner for each accent, for fills behind dark text and for map pins.
export const LOCATION_SOFT: Record<string, string> = {
  'Kemps Corner': '#e3f0ec',
  Bandra: '#e5eaf7',
  'Kenkere House': '#f7e5ec',
  'Pop-up': '#f6eddc',
};
export const ALL_LOCATIONS_COLOR = '#3c3830';
export const softFor = (name?: string | null) => (name && LOCATION_SOFT[name]) || '#f1ede4';
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
