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
