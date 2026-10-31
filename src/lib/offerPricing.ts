// Reading an offer's price back out of the plan.
//
// The approved plan states each offer's price in its own sentence — "1M unlimited: ₹17.2k
// (15% off the ₹20.2k list price)" — and states how the effective discount splits between
// cash and perks: "7.0% effective = 0% cash + 7.0% in extras". Offer records carry no price
// column, only an average selling price, so a card that printed `expected_asp` as the "offer
// price" was quoting an average of what buyers spent as if it were the ticket. This module
// reads the plan's own words so the cards can quote the real price, the real list price, and
// the cash share of the discount — and label the average as an average when that is all there is.

export interface PlanPricing {
  /** What the client actually pays, in rupees. Null when the plan states no price. */
  price: number | null;
  /** The list price the offer is measured against, in rupees, when the plan states one. */
  list: number | null;
  /** Share of the effective discount given in cash, 0–100. */
  cashPct: number | null;
  /** Share of the effective discount given in perks/extras, 0–100. */
  perkPct: number | null;
  /** The plan's own effective-discount figure, 0–100. */
  effectivePct: number | null;
  /** The intro fee is credited back against a purchase. */
  credited: boolean;
  /** The plan sells this at the product's own list price, with no figure to read. */
  atList: boolean;
  /** The plan's own name for what is being sold ("1M unlimited", "Intro"), when it gives one. */
  label: string | null;
}

// The unit must be a whole word: "₹45,000 list price" is forty-five thousand, not 45 lakh.
const AMOUNT = /₹\s*([\d][\d,]*(?:\.\d+)?)\s*(k|lakhs?|l|cr)?(?![a-z])/gi;

/** `₹17.2k` → 17200, `₹1,877` → 1877, `₹1.5L` → 150000. */
export function parseRupees(value: string): number | null {
  const match = /₹\s*([\d][\d,]*(?:\.\d+)?)\s*(k|l|lakh|lakhs|cr)?/i.exec(String(value || ''));
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base) || base <= 0) return null;
  const unit = (match[2] || '').toLowerCase();
  const multiplier =
    unit === 'k' ? 1_000 : unit === 'l' || unit.startsWith('lakh') ? 100_000 : unit === 'cr' ? 10_000_000 : 1;
  return Math.round(base * multiplier);
}

const amountsIn = (text: string) => {
  const found: Array<{ value: number; index: number; end: number }> = [];
  AMOUNT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AMOUNT.exec(text))) {
    const value = parseRupees(match[0]);
    if (value) found.push({ value, index: match.index, end: match.index + match[0].length });
  }
  return found;
};

const percent = (text: string, pattern: RegExp): number | null => {
  const match = pattern.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const asText = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return asText(record.summary ?? record.text ?? record.description ?? record.mechanic ?? '');
  }
  return String(value).trim();
};

const field = (fields: Record<string, unknown> | undefined, ...names: string[]) => {
  if (!fields) return '';
  for (const name of names) {
    const key = Object.keys(fields).find(k => k.toLowerCase() === name.toLowerCase());
    if (key) {
      const text = asText(fields[key]);
      if (text) return text;
    }
  }
  return '';
};

/**
 * Price, list price, and the cash/perk split of the discount, read from the offer's plan
 * provenance. Always returns an object; every figure is independently nullable.
 */
export function planPricing(offer: any): PlanPricing {
  const fields = offer?.provenance?.fields || {};
  const pay = field(fields, 'You pay', 'Price', 'What you pay');
  const effective = field(fields, 'Effective discount', 'Discount');

  const amounts = amountsIn(pay);
  // An amount immediately followed by "list price" / "MRP" is the list price, not the ticket.
  const isListAmount = (entry: { end: number }) =>
    /^\s*[)\s]*(?:the\s+)?(?:list|mrp)/i.test(pay.slice(entry.end, entry.end + 16));
  const listEntry = amounts.find(isListAmount) || null;
  const priceEntry = amounts.find(entry => entry !== listEntry) || null;

  const cashPct = percent(effective, /([\d.]+)\s*%\s*cash/i);
  const perkPct = percent(effective, /([\d.]+)\s*%\s*in\s*extras/i);
  const effectivePct = percent(effective, /([\d.]+)\s*%\s*(?:effective|total)/i);

  // "1M unlimited: ₹17.2k …" — the words before the colon name the product.
  const labelMatch = /^\s*([A-Za-z0-9][^:;.]{2,38}?)\s*:/.exec(pay);
  const label = labelMatch ? labelMatch[1].replace(/\s+/g, ' ').trim() : null;

  let list = listEntry?.value ?? null;
  let price = priceEntry?.value ?? null;

  // "15% off the ₹20.2k list price" with no separate selling price: derive it.
  if (price == null && list != null) {
    const cut = percent(pay, /([\d.]+)\s*%\s*off/i) ?? cashPct;
    if (cut != null && cut > 0 && cut < 100) price = Math.round(list * (1 - cut / 100));
  }
  if (list != null && price != null && list <= price) list = null;

  return {
    price,
    list,
    cashPct,
    perkPct,
    effectivePct,
    credited: /credit/i.test(pay),
    atList: price == null && /list\s*price/i.test(pay),
    label,
  };
}

/** True when the offer states a real ticket rather than only an average selling price. */
export const hasStatedPrice = (pricing: PlanPricing | null | undefined) => Boolean(pricing && pricing.price);
