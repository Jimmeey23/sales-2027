/* Studio photography for the four month pages' opener bands. These are the wide and
   portrait shots the offer cards never use, so a page banner can never repeat a card
   hero inside the same month. */
export interface HeroPhoto {
  url: string;
  pos: string;
}

export const PAGE_PHOTOS: HeroPhoto[] = [
  { url: '/p57/barre-studio.jpg', pos: '50% 24%' },
  { url: '/p57/class-3.jpg', pos: '50% 22%' },
  { url: '/p57/strength-wide.jpg', pos: '50% 42%' },
  { url: '/p57/cycle.jpg', pos: '50% 26%' },
  { url: '/p57/class-4.jpg', pos: '50% 20%' },
  { url: '/p57/tent-scene.jpg', pos: '50% 30%' },
  { url: '/p57/studio-floor.jpg', pos: '50% 34%' },
  { url: '/p57/barre-group.jpg', pos: '50% 26%' },
];

/* One cover photograph per month.

   These are deliberately outside the offer-card pool above, so a month's cover can never
   reuse a hero image from one of its own cards. Each is a wide frame (1.45+ aspect) that
   survives the full-bleed crop on a laptop and a portrait tablet: `pos` keeps faces and
   the studio architecture in shot as the viewport narrows.

   The choice is seasonal rather than literal — January is a dark room under lights,
   February is a pair, May is the empty floor the morning after. */
export const MONTH_COVER_PHOTOS: HeroPhoto[] = [
  { url: '/p57/pro/p01.jpg', pos: '50% 32%' }, // January — under the lights
  { url: '/p57/pro/p15.jpg', pos: '50% 26%' }, // February — the pair
  { url: '/p57/pro/p03.jpg', pos: '50% 34%' }, // March — the clean return
  { url: '/p57/pro/n09.jpg', pos: '50% 24%' }, // April — shimmer, for the gold treatment
  { url: '/p57/pro/p21.jpg', pos: '50% 46%' }, // May — the room after
  { url: '/p57/pro/p12.jpg', pos: '50% 30%' }, // June — cool light, the freeze
  { url: '/p57/pro/n17.jpg', pos: '50% 40%' }, // July — rows, attendance
  { url: '/p57/pro/p39.jpg', pos: '50% 30%' }, // August — strength, the upgrade
  { url: '/p57/pro/p14.jpg', pos: '50% 26%' }, // September — the cohort returns
  { url: '/p57/pro/n22.jpg', pos: '50% 34%' }, // October — warm mat, the gifting window
  { url: '/p57/pro/p02.jpg', pos: '50% 28%' }, // November — commitment
  { url: '/p57/pro/n28.jpg', pos: '50% 30%' }, // December — the last month, dark and lit
];

/** The cover photograph for a month, 1-indexed. */
export function coverPhotoFor(month: number): HeroPhoto {
  return MONTH_COVER_PHOTOS[(month - 1 + MONTH_COVER_PHOTOS.length) % MONTH_COVER_PHOTOS.length];
}
