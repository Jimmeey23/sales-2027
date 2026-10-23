import type { Studio } from '../types';

// The four planning locations shown as top-level tabs. Pop-up rolls up Copper + Cloves and Plash Pilates.
export const LOCATION_NAMES = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'] as const;
export const POPUP_VENUES = ['Copper + Cloves', 'Plash Pilates'];
export const LOCATION_COLORS: Record<string, string> = {
  'Kemps Corner': '#6857e5',
  Bandra: '#f27d5b',
  'Kenkere House': '#237a67',
  'Pop-up': '#c2932b',
};

export function planningLocations(studios: Studio[]) {
  return LOCATION_NAMES.map(name => studios.find(s => s.name === name)).filter(Boolean) as Studio[];
}

// Studio ids whose offers/campaigns belong to a location (Pop-up includes its venues).
export function locationStudioIds(studio: Studio, studios: Studio[]) {
  if (studio.name !== 'Pop-up') return [studio.id];
  return [studio.id, ...studios.filter(s => POPUP_VENUES.includes(s.name)).map(s => s.id)];
}
