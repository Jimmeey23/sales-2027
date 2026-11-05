import { useLayoutEffect, type RefObject } from 'react';

/* Side-by-side cards line up section by section: for each selector, every card in the same
   visual row gets the tallest card's height for that section. Re-measures on resize and on
   content changes, and clears itself when cards stack one per row. */
export function useRowAlign(container: RefObject<HTMLElement | null>, cardSelector: string, sections: string[]) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards = [...root.querySelectorAll<HTMLElement>(cardSelector)];
        // Reset first so heights are measured from content, not from the last pass.
        for (const card of cards)
          for (const sel of sections) card.querySelectorAll<HTMLElement>(sel).forEach(el => (el.style.minHeight = ''));
        const rows = new Map<number, HTMLElement[]>();
        for (const card of cards) {
          const top = Math.round(card.getBoundingClientRect().top);
          const key = [...rows.keys()].find(k => Math.abs(k - top) < 4) ?? top;
          rows.set(key, [...(rows.get(key) || []), card]);
        }
        for (const row of rows.values()) {
          if (row.length < 2) continue;
          for (const sel of sections) {
            const els = row.map(c => c.querySelector<HTMLElement>(sel)).filter(Boolean) as HTMLElement[];
            if (els.length < 2) continue;
            const max = Math.max(...els.map(e => e.getBoundingClientRect().height));
            els.forEach(e => (e.style.minHeight = `${Math.ceil(max)}px`));
          }
        }
      });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(root);
    const mo = new MutationObserver(muts => {
      // Ignore our own style writes.
      if (muts.every(m => m.type === 'attributes' && m.attributeName === 'style')) return;
      run();
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'open'] });
    window.addEventListener('resize', run);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', run);
    };
  });
}
