// Festivals, public holidays and marketing moments that shape demand in Mumbai and Bengaluru.
// Lunar-calendar festivals move every year; `approx` dates should be confirmed against the official
// holiday list before campaign dates are locked.
export type KeyDateKind = 'festival' | 'holiday' | 'awareness' | 'global' | 'retail' | 'brand';
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
  global: 'International day',
  retail: 'Retail moment',
  brand: 'P57 moment',
};

const KEY_DATES: Record<number, KeyDate[][]> = {
  2027: [
    [
      { day: 1, name: 'New Year’s Day', kind: 'holiday' },
      { day: 4, name: 'World Braille Day', kind: 'global' },
      { day: 14, name: 'Makar Sankranti / Pongal', kind: 'festival' },
      { day: 24, name: 'International Day of Education', kind: 'global' },
      { day: 26, name: 'Republic Day', kind: 'holiday' },
    ],
    [
      { day: 4, name: 'World Cancer Day', kind: 'global' },
      { day: 11, name: 'Vasant Panchami', kind: 'festival', approx: true },
      { day: 11, name: 'International Day of Women and Girls in Science', kind: 'global' },
      { day: 14, name: 'Valentine’s Day', kind: 'retail' },
      { day: 20, name: 'World Day of Social Justice', kind: 'global' },
      { day: 19, name: 'Shivaji Jayanti (MH)', kind: 'holiday' },
      { day: 21, name: 'International Mother Language Day', kind: 'global' },
    ],
    [
      { day: 6, name: 'Maha Shivaratri', kind: 'festival', approx: true },
      { day: 8, name: 'International Women’s Day', kind: 'global' },
      { day: 20, name: 'International Day of Happiness', kind: 'global' },
      { day: 21, name: 'World Down Syndrome Day', kind: 'global' },
      { day: 22, name: 'World Water Day', kind: 'global' },
      { day: 10, name: 'Eid al-Fitr', kind: 'festival', approx: true },
      { day: 22, name: 'Holi', kind: 'festival', approx: true },
    ],
    [
      { day: 7, name: 'Gudi Padwa / Ugadi', kind: 'festival', approx: true },
      { day: 2, name: 'World Autism Awareness Day', kind: 'global' },
      { day: 7, name: 'World Health Day', kind: 'global' },
      { day: 15, name: 'Ram Navami', kind: 'festival', approx: true },
      { day: 22, name: 'International Mother Earth Day', kind: 'global' },
      { day: 23, name: 'World Book and Copyright Day', kind: 'global' },
      { day: 1, end: 30, name: 'Physique 57 anniversary month', kind: 'brand' },
    ],
    [
      { day: 1, name: 'Maharashtra Day', kind: 'holiday' },
      { day: 9, name: 'Mother’s Day', kind: 'retail' },
      { day: 15, name: 'International Day of Families', kind: 'global' },
      { day: 22, name: 'International Day for Biological Diversity', kind: 'global' },
      { day: 31, name: 'World No-Tobacco Day', kind: 'global' },
      { day: 17, name: 'Eid al-Adha (Bakri Eid)', kind: 'festival', approx: true },
      { day: 28, name: 'Menstrual Hygiene Day', kind: 'awareness' },
    ],
    [
      { day: 5, name: 'World Environment Day', kind: 'global' },
      { day: 3, name: 'World Bicycle Day', kind: 'global' },
      { day: 8, name: 'World Oceans Day', kind: 'global' },
      { day: 11, name: 'International Day of Play', kind: 'global' },
      { day: 14, name: 'World Blood Donor Day', kind: 'global' },
      { day: 20, name: 'Father’s Day', kind: 'retail' },
      { day: 21, name: 'International Yoga Day', kind: 'global' },
      { day: 10, end: 30, name: 'Monsoon arrives (Mumbai)', kind: 'brand' },
    ],
    [
      { day: 1, name: 'Doctors’ Day', kind: 'awareness' },
      { day: 11, name: 'World Population Day', kind: 'global' },
      { day: 18, name: 'Nelson Mandela International Day', kind: 'global' },
      { day: 16, name: 'Muharram', kind: 'festival', approx: true },
      { day: 30, name: 'International Day of Friendship', kind: 'global' },
    ],
    [
      { day: 1, name: 'Friendship Day (India)', kind: 'retail' },
      { day: 9, name: 'International Day of the World’s Indigenous Peoples', kind: 'global' },
      { day: 12, name: 'International Youth Day', kind: 'global' },
      { day: 19, name: 'World Humanitarian Day', kind: 'global' },
      { day: 15, name: 'Independence Day', kind: 'holiday' },
      { day: 17, name: 'Raksha Bandhan', kind: 'festival', approx: true },
      { day: 25, name: 'Janmashtami', kind: 'festival', approx: true },
    ],
    [
      { day: 4, end: 14, name: 'Ganesh Chaturthi → Anant Chaturdashi', kind: 'festival', approx: true },
      { day: 8, name: 'International Literacy Day', kind: 'global' },
      { day: 21, name: 'International Day of Peace', kind: 'global' },
      { day: 27, name: 'World Tourism Day', kind: 'global' },
      { day: 29, name: 'World Heart Day', kind: 'global' },
      { day: 30, name: 'Navratri begins', kind: 'festival', approx: true },
    ],
    [
      { day: 2, name: 'Gandhi Jayanti', kind: 'holiday' },
      { day: 9, name: 'Dussehra', kind: 'festival', approx: true },
      { day: 1, name: 'International Day of Older Persons', kind: 'global' },
      { day: 10, name: 'World Mental Health Day', kind: 'global' },
      { day: 11, name: 'International Day of the Girl Child', kind: 'global' },
      { day: 16, name: 'World Food Day', kind: 'global' },
      { day: 18, name: 'Karva Chauth', kind: 'festival', approx: true },
      { day: 29, name: 'Diwali', kind: 'festival', approx: true },
    ],
    [
      { day: 1, name: 'Kannada Rajyotsava (KA)', kind: 'holiday' },
      { day: 14, name: 'Guru Nanak Jayanti', kind: 'festival', approx: true },
      { day: 14, name: 'World Diabetes Day', kind: 'global' },
      { day: 19, name: 'World Toilet Day', kind: 'global' },
      { day: 25, name: 'International Day for the Elimination of Violence against Women', kind: 'global' },
      { day: 26, name: 'Black Friday', kind: 'retail' },
      { day: 29, name: 'Cyber Monday', kind: 'retail' },
    ],
    [
      { day: 1, end: 31, name: 'Wedding & party season', kind: 'brand' },
      { day: 1, name: 'World AIDS Day', kind: 'global' },
      { day: 3, name: 'International Day of Persons with Disabilities', kind: 'global' },
      { day: 10, name: 'Human Rights Day', kind: 'global' },
      { day: 21, name: 'World Meditation Day', kind: 'global' },
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
