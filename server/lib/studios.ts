export const STUDIO_DEFINITIONS = [
  { name: 'Kemps Corner', code: 'KC', city: 'Mumbai', aliases: ['Kwality House, Kemps Corner'] },
  { name: 'Bandra', code: 'BA', city: 'Mumbai', aliases: ['Supreme HQ, Bandra'] },
  { name: 'Kenkere House', code: 'KH', city: 'Bengaluru', aliases: ['Kenkere House', 'Kenkere House, Bengaluru'] },
  { name: 'Pop-up', code: 'POP', city: 'Bengaluru', aliases: ['Pop-up', 'Pop up', 'pop up plash', 'Pop-up '] },
  { name: 'Copper + Cloves', code: 'CC', city: 'Bengaluru', aliases: ['the Studio By Copper + Cloves', 'The Studio by Copper + Cloves', 'the Studio by Copper + Cloves, Indiranagar'] },
  { name: 'Plash Pilates', code: 'PP', city: 'Bengaluru', aliases: ['Plash Pilates', 'Plash pilates studios', 'Plash Pilates '] },
  { name: 'Taj Wellington Mews', code: 'TWM', city: 'Mumbai', aliases: ['Taj Wellington Mews, Colaba, Mumbai'] },
  { name: 'South United FC', code: 'SUFC', city: 'Bengaluru', aliases: ['South United Football Club'] },
  { name: 'WeWork Prestige Central', code: 'WPC', city: 'Bengaluru', aliases: ['WeWork Prestige Central'] },
  { name: 'WeWork Galaxy', code: 'WG', city: 'Bengaluru', aliases: ['WeWork Galaxy'] },
  { name: 'Outdoor / Unassigned', code: 'OUT', city: 'Unspecified', aliases: ['Out Door', 'Physique 57 India'] },
];

export function canonicalStudio(value: unknown): string | null {
  const text = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text || text === '-') return null;
  for (const studio of STUDIO_DEFINITIONS) {
    if (studio.name.toLowerCase() === text || studio.aliases.some(alias => alias.trim().toLowerCase() === text)) return studio.name;
  }
  if (text.includes('kemps') || text.includes('kwality')) return 'Kemps Corner';
  if (text.includes('bandra') || text.includes('supreme hq')) return 'Bandra';
  if (text.includes('kenkere')) return 'Kenkere House';
  if (text.includes('copper') && text.includes('cloves')) return 'Copper + Cloves';
  if (text.includes('plash')) return 'Plash Pilates';
  if (text.includes('pop') && text.includes('up')) return 'Pop-up';
  return null;
}
