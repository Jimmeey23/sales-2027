// Festivals, public holidays and marketing moments that shape demand in Mumbai and Bengaluru.
// Lunar-calendar festivals move every year; `approx` dates should be confirmed against the official
// holiday list before campaign dates are locked.
export type KeyDateKind = 'festival' | 'holiday' | 'awareness' | 'retail' | 'brand';
export interface KeyDate {
  day: number;
  end?: number;
  name: string;
  kind: KeyDateKind;
  approx?: boolean;
}

export const KEY_DATE_LABELS: Record<KeyDateKind, string> = {
  festival: 'Festival',
  holiday: 'Holiday',
  awareness: 'Wellness day',
  retail: 'Retail moment',
  brand: 'P57 moment',
};

const KEY_DATES: Record<number, KeyDate[][]> = {
  2027: [
    [
      { day: 1, name: 'New Year’s Day', kind: 'holiday' },
      { day: 14, name: 'Makar Sankranti / Pongal', kind: 'festival' },
      { day: 26, name: 'Republic Day', kind: 'holiday' },
    ],
    [
      { day: 4, name: 'World Cancer Day', kind: 'awareness' },
      { day: 11, name: 'Vasant Panchami', kind: 'festival', approx: true },
      { day: 14, name: 'Valentine’s Day', kind: 'retail' },
      { day: 19, name: 'Shivaji Jayanti (MH)', kind: 'holiday' },
    ],
    [
      { day: 6, name: 'Maha Shivaratri', kind: 'festival', approx: true },
      { day: 8, name: 'International Women’s Day', kind: 'awareness' },
      { day: 10, name: 'Eid al-Fitr', kind: 'festival', approx: true },
      { day: 22, name: 'Holi', kind: 'festival', approx: true },
    ],
    [
      { day: 7, name: 'Gudi Padwa / Ugadi', kind: 'festival', approx: true },
      { day: 7, name: 'World Health Day', kind: 'awareness' },
      { day: 15, name: 'Ram Navami', kind: 'festival', approx: true },
      { day: 1, end: 30, name: 'Physique 57 anniversary month', kind: 'brand' },
    ],
    [
      { day: 1, name: 'Maharashtra Day', kind: 'holiday' },
      { day: 9, name: 'Mother’s Day', kind: 'retail' },
      { day: 17, name: 'Eid al-Adha (Bakri Eid)', kind: 'festival', approx: true },
      { day: 28, name: 'Menstrual Hygiene Day', kind: 'awareness' },
    ],
    [
      { day: 5, name: 'World Environment Day', kind: 'awareness' },
      { day: 20, name: 'Father’s Day', kind: 'retail' },
      { day: 21, name: 'International Yoga Day', kind: 'awareness' },
      { day: 10, end: 30, name: 'Monsoon arrives (Mumbai)', kind: 'brand' },
    ],
    [
      { day: 1, name: 'Doctors’ Day', kind: 'awareness' },
      { day: 16, name: 'Muharram', kind: 'festival', approx: true },
      { day: 30, name: 'International Friendship Day', kind: 'retail' },
    ],
    [
      { day: 1, name: 'Friendship Day (India)', kind: 'retail' },
      { day: 15, name: 'Independence Day', kind: 'holiday' },
      { day: 17, name: 'Raksha Bandhan', kind: 'festival', approx: true },
      { day: 25, name: 'Janmashtami', kind: 'festival', approx: true },
    ],
    [
      { day: 4, end: 14, name: 'Ganesh Chaturthi → Anant Chaturdashi', kind: 'festival', approx: true },
      { day: 29, name: 'World Heart Day', kind: 'awareness' },
      { day: 30, name: 'Navratri begins', kind: 'festival', approx: true },
    ],
    [
      { day: 2, name: 'Gandhi Jayanti', kind: 'holiday' },
      { day: 9, name: 'Dussehra', kind: 'festival', approx: true },
      { day: 10, name: 'World Mental Health Day', kind: 'awareness' },
      { day: 18, name: 'Karva Chauth', kind: 'festival', approx: true },
      { day: 29, name: 'Diwali', kind: 'festival', approx: true },
    ],
    [
      { day: 1, name: 'Kannada Rajyotsava (KA)', kind: 'holiday' },
      { day: 14, name: 'Guru Nanak Jayanti', kind: 'festival', approx: true },
      { day: 14, name: 'World Diabetes Day', kind: 'awareness' },
      { day: 26, name: 'Black Friday', kind: 'retail' },
      { day: 29, name: 'Cyber Monday', kind: 'retail' },
    ],
    [
      { day: 1, end: 31, name: 'Wedding & party season', kind: 'brand' },
      { day: 25, name: 'Christmas', kind: 'holiday' },
      { day: 31, name: 'New Year’s Eve', kind: 'retail' },
    ],
  ],
};

// Years without a curated list fall back to the closest one we have (fixed-date days still line up).
export function keyDatesFor(year: number, month: number): KeyDate[] {
  const years = Object.keys(KEY_DATES).map(Number),
    closest = years.reduce((a, b) => (Math.abs(b - year) < Math.abs(a - year) ? b : a));
  return [...(KEY_DATES[closest][month - 1] || [])]
    .map(d => (closest === year ? d : { ...d, approx: true }))
    .sort((a, b) => a.day - b.day);
}

export const formatKeyDate = (d: KeyDate) => (d.end ? `${d.day}–${d.end}` : String(d.day));
