// Reads an offer's own written terms into named sections. Plan offers are written as one
// string — "▪ Tuck & Earn ▪ What you get: – 8 group classes ▪ Price: ₹9,375 (usual price
// ₹12,500; you save ₹3,125) ▪ How it works: – Attend… – When you do… ▪ Offer window: …" — and
// this turns that into fields the card and the description can show plainly.

export interface OfferSections {
  getText: string | null;
  price: number | null;
  usual: number | null;
  save: number | null;
  priceNote: string | null;
  how: string[];
  window: string | null;
  who: string | null;
  found: boolean;
}

const rupee = (s?: string | null) => (s ? Number(s.replace(/[^\d.]/g, '')) || null : null);
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/^[–—\-•▪\s]+/, '').replace(/[.;\s]+$/, '').trim();

function sourceText(o: any): string {
  const prov = typeof o?.provenance === 'string' ? safe(o.provenance) : o?.provenance || {};
  const fields = prov?.fields || o?.fields || {};
  const fromFields = Object.values(fields)
    .map(v => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
    .join(' ▪ ');
  return [o?.customer_copy, o?.benefit, o?.internal_description, fromFields].filter(Boolean).join(' ▪ ');
}
function safe(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export function offerSections(o: any): OfferSections {
  const text = String(sourceText(o) || '');
  const grab = (label: RegExp) => {
    const m = text.match(new RegExp(`(?:${label.source})\\s*:\\s*([\\s\\S]*?)(?=\\s*[▪•]\\s|$)`, 'i'));
    return m && m[1] ? m[1].trim() : null;
  };
  const get = grab(/what you get/);
  const priceRaw = grab(/price/);
  const howRaw = grab(/how it works|rules/);
  const windowRaw = grab(/offer window|purchase window|valid/);
  const whoRaw = grab(/who can buy|who qualifies/);

  const getText = get ? tidy(get.split(/\s+[–—]\s+/).map(tidy).filter(Boolean).join(', ')) : null;
  const price = rupee(priceRaw?.match(/₹\s*([\d,]+)/)?.[1]);
  const usual = rupee(priceRaw?.match(/(?:usual|list|normal|regular)\s+price\s*(?:of\s*)?₹\s*([\d,]+)/i)?.[1]);
  const saveStated = rupee(priceRaw?.match(/(?:save|saving)\s*₹\s*([\d,]+)/i)?.[1]);
  const save = saveStated ?? (usual && price && usual > price ? usual - price : null);
  const atList = /list price\)|at list price/i.test(priceRaw || '');
  const how = howRaw
    ? howRaw
        .split(/\s*[–—]\s+|(?<=[.!?])\s+(?=[A-Z])/)
        .map(tidy)
        .filter(x => x.length > 2)
    : [];
  return {
    getText,
    price,
    usual: usual ?? (atList ? price : null),
    save,
    priceNote: atList ? 'list price' : null,
    how,
    window: windowRaw ? tidy(windowRaw.split(/(?<=[.!?])\s+/)[0]) : null,
    who: whoRaw ? tidy(whoRaw) : null,
    found: Boolean(getText || price || how.length),
  };
}
