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

   The cover shows its photograph whole, in a framed plate beside the type rather
   than behind it, so the frame can hold a 3:2 photograph without cropping a face
   out of it. `pos` is the focal point the plate falls back to when the viewport is
   narrow enough to crop the sides.

   The choice is mood before matching: a dark, lit studio for January, a pair for
   February, the room itself for the morning after in May. */
export const MONTH_COVER_PHOTOS: HeroPhoto[] = [
  { url: '/p57/pro/p33.jpg', pos: '50% 30%' }, // January — the year opens on one clean line
  { url: '/p57/pro/p35.jpg', pos: '50% 20%' }, // February — the pair
  { url: '/p57/pro/p03.jpg', pos: '48% 50%' }, // March — she moves: white room, one body
  // April — the studio dressed for the ninth anniversary: nine candles, gold balloons,
  // confetti still in the air, shot wide so the plate holds the room.
  { url: '/p57/april-anniversary-2027.jpg', pos: '54% 52%' },
  { url: '/p57/pro/p21.jpg', pos: '50% 50%' }, // May — the room after
  { url: '/p57/pro/p12.jpg', pos: '46% 34%' }, // June — cool light across the floor
  { url: '/p57/pro/p34.jpg', pos: '50% 44%' }, // July — rows, attendance
  { url: '/p57/pro/p39.jpg', pos: '50% 40%' }, // August — strength, the upgrade
  { url: '/p57/pro/p36.jpg', pos: '52% 26%' }, // September — the cohort returns
  { url: '/p57/pro/p41.jpg', pos: '48% 40%' }, // October — warm dark, the gifting window
  { url: '/p57/pro/p02.jpg', pos: '50% 32%' }, // November — commitment
  { url: '/p57/pro/p28.jpg', pos: '50% 40%' }, // December — the last month, lit
];

/** The cover photograph for a month, 1-indexed. */
export function coverPhotoFor(month: number): HeroPhoto {
  return MONTH_COVER_PHOTOS[(month - 1 + MONTH_COVER_PHOTOS.length) % MONTH_COVER_PHOTOS.length];
}
