/** One lifecycle taxonomy for offer cards, lists and library filters. */
export const OFFER_CATEGORIES = [
  { key: 'new', label: 'New' },
  { key: 'winback', label: 'Winback' },
  { key: 'renewal', label: 'Renewal' },
  { key: 'other', label: 'Other' },
] as const;

export type OfferCategory = (typeof OFFER_CATEGORIES)[number]['key'];
export interface CategorizedOffer {
  plan_slot?: string | null;
  planSlot?: string | null;
  objective?: string | null;
}

export const OFFER_CATEGORY_LABELS: Record<OfferCategory, string> = Object.fromEntries(
  OFFER_CATEGORIES.map(category => [category.key, category.label]),
) as Record<OfferCategory, string>;

const SLOT_CATEGORIES = new Map<string, OfferCategory>([
  ['new', 'new'],
  ['newcomer', 'new'],
  ['newcomers', 'new'],
  ['new_client', 'new'],
  ['new_clients', 'new'],
  ['winback', 'winback'],
  ['win_back', 'winback'],
  ['lapsed', 'winback'],
  ['reactivation', 'winback'],
  ['comeback', 'winback'],
  ['renewal', 'renewal'],
  ['renewals', 'renewal'],
  ['retention', 'renewal'],
  ['other', 'other'],
]);

const OBJECTIVE_CATEGORIES = new Map<string, OfferCategory>([
  ...SLOT_CATEGORIES,
  ['acquisition', 'new'],
  ['new_client_acquisition', 'new'],
  ['trial_conversion', 'new'],
  ['referral', 'new'],
  ['lead_source', 'new'],
  ['retention_winback', 'winback'],
  ['annual_membership', 'renewal'],
]);

const token = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
    : '';

/**
 * A month's chosen slot is authoritative, followed by the offer's saved slot.
 * Only unslotted offers fall back to their objective. In particular, an upsell,
 * flash sale or higher-ticket purchase is not automatically a renewal, and a
 * non-lifecycle slot (privates, gifting, bookouts, etc.) belongs in Other.
 * Never guess from a campaign name or incidental words in its marketing copy.
 */
export function offerCategory(offer: CategorizedOffer, monthSlot?: string | null): OfferCategory {
  for (const value of [monthSlot, offer.plan_slot, offer.planSlot]) {
    const slot = token(value);
    if (slot) return SLOT_CATEGORIES.get(slot) ?? 'other';
  }
  return OBJECTIVE_CATEGORIES.get(token(offer.objective)) ?? 'other';
}

/** Fixed category order, preserving the caller's sort within each category. */
export function groupOffersByCategory<T extends CategorizedOffer>(
  offers: readonly T[],
  monthSlotFor?: (offer: T) => string | null | undefined,
): Array<{ key: OfferCategory; label: string; offers: T[] }> {
  const groups = OFFER_CATEGORIES.map(category => ({ ...category, offers: [] as T[] }));
  const byCategory = new Map(groups.map(group => [group.key, group.offers]));
  for (const offer of offers) {
    byCategory.get(offerCategory(offer, monthSlotFor?.(offer)))!.push(offer);
  }
  return groups.filter(group => group.offers.length > 0);
}
