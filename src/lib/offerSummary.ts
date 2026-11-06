// What an offer is, said plainly.
//
// Every offer already carries a pile of correct detail — a mechanic, a benefit paragraph, a
// rationale, an auditor's score — and none of it answers the question a studio manager asks
// first: what am I selling, what does the client get, and what is it for? Those three things
// are the description, and they fit in one line:
//
//   3-month unlimited at 20% off — aimed at winning new clients.
//
// So the description is derived, not authored: the membership is read from the offer's own
// pricing sentence, the benefit from its discount and its extras, and the purpose from the
// stream it serves. The long copy stays where it belongs (customer copy, rationale, the
// calculation), and this is the sentence that leads.

// The extension is not decoration. This module is imported by the API as well as by the
// browser (the plan export describes every offer), and the serverless runtime runs Node's
// ESM loader over compiled .js files, where an extensionless specifier does not resolve.
import { planPricing, type PlanPricing } from './offerPricing.js';
import { offerSections } from './offerSections.js';

export interface OfferSummary {
  /** What is being sold: "3-month unlimited", "12-class pack", "7-day unlimited intro". */
  membership: string;
  /** What the client gets: "at 20% off the list price", "with 7 extra days". */
  benefit: string;
  /** Who it is for: "lapsed clients", "first-time clients", "members renewing this month". */
  audience: string;
  /** What it is meant to do: "winning new clients", "bringing lapsed clients back". */
  purpose: string;
  /** The whole description, one sentence. */
  sentence: string;
}

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/^[•\-–—\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

const asText = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('; ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return asText(record.summary ?? record.text ?? record.description ?? record.mechanic ?? '');
  }
  return clean(value);
};

/** The plan's written fields, from a database row's provenance or from the plan offer itself. */
const fieldsOf = (offer: any): Record<string, unknown> | undefined =>
  offer?.provenance?.fields || offer?.fields || undefined;

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

/* "1M" and "3M" are how the plan writes a term; the reader should not have to decode it. */
const spelledTerm = (value: string) =>
  value
    .replace(/\b(\d+)\s*M\b/g, '$1-month')
    .replace(/\b(\d+)\s*mo\b/gi, '$1-month')
    .replace(/\b12M\b/g, '12-month')
    .replace(/\bannual\b/gi, 'annual');

const GENERIC = /^(intro|offer|membership|pack|plan|renewal|renew|discount|special)$/i;

/* The membership, from the offer's own words. The plan names it in half a dozen ways —
   "1M unlimited: ₹17.2k …", "Intro: ₹2k for the 7-day unlimited intro", "12-class pack",
   "Renewal at your product's list price" — so the patterns lead and the fallbacks follow. */
function membershipOf(offer: any, pricing: PlanPricing): string {
  const explicit = clean(
    offer?.productName ||
      offer?.product_name ||
      offer?.membership ||
      offer?.product ||
      offer?.pricing?.product ||
      (Array.isArray(offer?.eligible_products) ? offer.eligible_products[0] : '') ||
      '',
  );
  if (explicit && !GENERIC.test(explicit)) return spelledTerm(explicit);

  const fields = fieldsOf(offer);
  const haystack = [
    field(fields, 'You pay', 'Price', 'What you pay'),
    clean(offer?.benefit),
    field(fields, 'Featured product', 'Product'),
    clean(offer?.provenance?.plainUsage),
    clean(offer?.headline),
    clean(offer?.customer_copy),
    clean(offer?.internal_description),
    asText(offer?.mechanics),
    clean(pricing.label),
  ]
    .filter(Boolean)
    .join(' · ');

  const patterns: Array<[RegExp, (m: RegExpExecArray) => string]> = [
    [/(\d+)\s*-?\s*(?:day|week)\s+unlimited\s+intro/i, m => `${m[1]}-day unlimited intro`],
    [/(\d+)\s*-?\s*(?:day|week)\s+unlimited/i, m => `${m[1]}-day unlimited`],
    [/(\d+)\s*-?\s*(?:month|M)\b\s+unlimited/i, m => `${m[1]}-month unlimited`],
    [/annual\s+unlimited|annual\s+membership|12-month\s+unlimited/i, () => 'annual unlimited'],
    [/(\d+)-?class\s+pack/i, m => `${m[1]}-class pack`],
    [/\b(\d+)\s*M\b/i, m => `${m[1]}-month unlimited`],
    [/(\d+)-?class\s+pass/i, m => `${m[1]}-class pass`],
    [/gift\s*cards?/i, () => 'a gift card'],
    [/kickstart\s*21(?:\s+cohort)?/i, () => 'Kickstart 21 cohort'],
    [/tasting\s+flight/i, () => 'Tasting Flight'],
    [/student\s+tasting\s+flight/i, () => 'student Tasting Flight'],
    [/private\s+session|60-minute\s+private/i, () => '60-minute private'],
    [/duo|for\s+two|bring\s+a\s+friend|pair/i, () => 'duo membership'],
    [/any\s+pack\s+or\s+membership/i, () => 'any pack or membership'],
    [/your\s+product|current\s+membership/i, () => 'your current membership'],
  ];
  for (const [pattern, build] of patterns) {
    const match = pattern.exec(haystack);
    if (match) return build(match);
  }

  const label = clean(pricing.label);
  if (label && !GENERIC.test(label)) return spelledTerm(label);

  const type = clean(offer?.offer_type || offer?.offerType || '');
  const byType: Record<string, string> = {
    membership: 'a membership',
    bundle: 'a class pack',
    buy_x_for_y: 'a class pack',
    bonus_classes: 'a class pack',
    validity_extension: 'your current membership',
    percentage: 'a membership',
    bogo_duo: 'a duo membership',
    value_add: 'a membership',
    experience: 'a studio experience',
    referral: 'a referral reward',
    trial: 'a trial',
  };
  return byType[type] || 'a membership';
}

/* The extras an offer gives away that are not a percentage: bonus days, free classes, freezes.
   Only explicit wording counts — "21 days unlimited" is what the product is, "+7 days on 3M"
   is what the offer adds. */
function extrasOf(offer: any) {
  const fields = fieldsOf(offer);
  const haystack = [
    field(fields, 'You get', 'What you get', 'Perks'),
    clean(offer?.benefit),
    field(fields, 'You pay', 'Price'),
    clean(offer?.provenance?.plainUsage),
  ]
    .filter(Boolean)
    .join(' · ');
  const extras: string[] = [];
  const days = /\+\s*(\d+)\s*days?/i.exec(haystack) || /(\d+)\s*(?:extra|bonus)\s+days?/i.exec(haystack);
  if (days && Number(days[1]) > 0) extras.push(`${Number(days[1])} extra days`);
  const classes = /(\d+)\s*(?:free|bonus|extra|complimentary)\s+classes?/i.exec(haystack);
  if (classes && Number(classes[1]) > 0) extras.push(`${Number(classes[1])} free classes`);
  const freezes = /(\d+)\s*(?:extra\s+|more\s+)?freezes?/i.exec(haystack);
  if (freezes && Number(freezes[1]) > 0) extras.push(`${Number(freezes[1])} extra freezes`);
  const credit = /credit(?:ed)?\s+(?:back\s+)?in full|fee credited|credited against|credited back/i.test(haystack);
  return { extras, credit };
}

function benefitOf(offer: any, pricing: PlanPricing) {
  const cash = Number(pricing.cashPct ?? 0);
  const perk = Number(pricing.perkPct ?? 0);
  const effective = Number(pricing.effectivePct ?? offer?.effective_discount ?? 0) || 0;
  const { extras, credit } = extrasOf(offer);
  const percentOff = (value: number) => `${Number(value.toFixed(value < 10 ? 1 : 0))}% off`;
  // "at list price, with 7% back in extras, 7 extra days" — never two "with"s in one clause.
  const withExtras = (base: string) =>
    extras.length ? `${base}${base.includes(' with ') ? ', ' : ' with '}${extras.join(', ')}` : base;

  // The bank's offers state the cut in words rather than in the split field — "3M at the
  // standing 15%", "20% off" — so read it from there when the split is missing.
  const statedCash = (() => {
    if (cash > 0) return cash;
    const text = [
      field(fieldsOf(offer), 'You pay', 'Price'),
      clean(offer?.benefit),
      clean(offer?.provenance?.plainUsage),
    ]
      .filter(Boolean)
      .join(' · ');
    const match =
      /(\d+(?:\.\d+)?)\s*%\s*(?:off|discount)/i.exec(text) ||
      /standing\s+(\d+(?:\.\d+)?)\s*%/i.exec(text) ||
      /(\d+(?:\.\d+)?)\s*%\s*below/i.exec(text);
    return match ? Number(match[1]) : 0;
  })();

  if (credit) return withExtras('with the fee credited back on your first purchase');
  if (statedCash > 0) return withExtras(`at ${percentOff(statedCash)} the list price`);
  if (perk > 0) return withExtras(`at list price, with ${Number(perk.toFixed(perk < 10 ? 1 : 0))}% back in extras`);
  if (effective > 0)
    return withExtras(`at list price, with ${Number(effective.toFixed(effective < 10 ? 1 : 0))}% back in extras`);
  return withExtras('at list price');
}

/* The purpose is the stream the offer serves, said the way the studio says it. */
function purposeOf(offer: any): string {
  const objective = clean(offer?.objective || '').toLowerCase();
  const slot = clean(offer?.plan_slot || offer?.planSlot || offer?.slot || '').toLowerCase();
  // The plan slot is the offer's job; imported objectives are free sentences, so they only decide
  // when no slot is set.
  if (slot === 'newcomer') return 'winning new clients';
  if (slot === 'lapsed') return 'bringing lapsed clients back';
  if (slot === 'renewal') return 'renewing members before they lapse';
  if (slot === 'upsell') return 'growing the month’s revenue with a bigger purchase';
  if (slot === 'flash') return 'a short flash-sale spike';
  const key = objective || slot;
  if (/acquisition|new_client|newclient|new client|conversion|trial|referral/.test(key)) return 'winning new clients';
  if (/reactivation|winback|win-back|lapsed|retention_winback/.test(key)) return 'bringing lapsed clients back';
  if (/annual/.test(key)) return 'selling annual plans before the year starts';
  if (/anniversary/.test(key)) return 'marking the anniversary month';
  if (/revenue_gap|gap/.test(key)) return 'closing the month’s revenue gap';
  if (/additional_purchase|upsell|add_on|cross_sell/.test(key)) return 'adding a second purchase';
  if (/capacity/.test(key)) return 'filling the quiet slots';
  if (/retention|renewal|retain/.test(key)) return 'renewing members before they lapse';
  if (slot === 'newcomer') return 'winning new clients';
  if (slot === 'lapsed') return 'bringing lapsed clients back';
  if (slot === 'renewal') return 'renewing members before they lapse';
  return 'growing the month’s revenue';
}

function audienceOf(offer: any): string {
  const raw = clean(offer?.audience || field(fieldsOf(offer), 'Who qualifies') || '');
  if (!raw) return '';
  // "Clients lapsed 61–365 days." reads better as "clients lapsed 61–365 days".
  return raw
    .replace(/\(.*?\)/g, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * One plain sentence: the membership, what the client gets, and what it is for.
 * Works on a database row, an API offer or a plan offer — it only reads fields when present.
 */
export function offerSummary(offer: any): OfferSummary {
  const pricing = planPricing(offer);
  const membership = membershipOf(offer, pricing);
  const benefit = benefitOf(offer, pricing);
  const purpose = purposeOf(offer);
  const audience = audienceOf(offer);

  // An imported offer carries its own one-line description ("12-class pack at ₹19,688 …"):
  // that is the truth about this offer, so it wins over anything derived from pricing fields.
  const prov = (() => {
    try {
      return typeof offer?.provenance === 'string' ? JSON.parse(offer.provenance) : offer?.provenance || {};
    } catch {
      return {};
    }
  })();
  const stated = clean(prov?.description || offer?.description || '').replace(/\.\s*$/, '');
  if (stated)
    return { membership, benefit, audience, purpose, sentence: `${stated.charAt(0).toUpperCase()}${stated.slice(1)} — aimed at ${purpose}.` };

  // When the offer states its own terms, describe it in those words; the derived
  // membership/benefit guess is only for offers that say nothing.
  const sec = offerSections(offer);
  const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
  if (sec.getText && sec.price) {
    const money = sec.save && sec.usual ? ` for ${inr(sec.price)} (usual ${inr(sec.usual)}, save ${inr(sec.save)})` : ` for ${inr(sec.price)}`;
    // The description is one line: the first two things the client gets, then the money.
    const items = sec.getText.split(/,\s*/);
    const getShort = items.length > 2 ? `${items.slice(0, 2).join(', ')} + more` : sec.getText;
    const text = `${getShort}${money}`;
    return { membership, benefit, audience, purpose, sentence: `${text.charAt(0).toUpperCase()}${text.slice(1)} — aimed at ${purpose}.` };
  }
  const lead = `${membership} ${benefit}`.replace(/\s+/g, ' ').trim();
  const sentence = `${lead.charAt(0).toUpperCase()}${lead.slice(1)} — aimed at ${purpose}.`;
  return { membership, benefit, audience, purpose, sentence };
}

/** The description alone, for the many places that only need the line. */
export function offerDescription(offer: any): string {
  return offerSummary(offer).sentence;
}

export interface OfferHighlights {
  /** The actual price/terms from the offer, not its marketing headline. */
  terms: string;
  inclusions: string[];
}

/* "Then any pack at 15% off; 10% until day 14." → two clean clauses, capitalised. */
export function splitPoints(text: string): string[] {
  return String(text || '')
    .split(/;\s+|\.\s+(?=[A-Z₹0-9])|\n+/)
    .map(part =>
      part
        .trim()
        .replace(/^(then|and|plus)\s+/i, '')
        .replace(/[.;]+$/, '')
        .trim(),
    )
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));
}

/** The commercial promise leads the card, without truncating conditions or perks. */
export function offerHighlights(offer: any): OfferHighlights {
  const fields = fieldsOf(offer);
  const terms =
    field(fields, 'You pay', 'What you pay', 'Price', 'The offer') ||
    asText(offer?.benefit) ||
    asText(offer?.mechanics) ||
    offerSummary(offer).sentence;
  const includedKey =
    fields && Object.keys(fields).find(key => /^(you get|what you get|what.s included|includes|perks)$/i.test(key));
  const included = includedKey && fields ? fields[includedKey] : [];
  const items = Array.isArray(included) ? included : typeof included === 'string' ? included.split(/\n+/) : [included];
  const inclusions = [...new Set(items.map(asText).filter(text => text && text !== terms))];
  return { terms, inclusions };
}

export interface OfferDetails {
  /** Every clause of the client-facing copy, one per bullet. */
  deal: string[];
  /** When it runs. */
  validity: string;
  /** Who it is for, and who it is not. */
  who: string;
  notFor: string;
  /** House rules that the deal bullets do not already say. */
  fine: string[];
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9%₹]+/g, ' ').trim();

/** All of an offer's details, broken into short bullets for the offer banner. */
export function offerDetails(offer: any): OfferDetails {
  const name = clean(offer?.name || '');
  let copy = asText(offer?.customer_copy) || asText(offer?.provenance?.description) || '';
  // "Name: 8 classes…" — the name is already the card's title.
  if (name && copy.toLowerCase().startsWith(name.toLowerCase())) copy = copy.slice(name.length).replace(/^\s*[:—–-]\s*/, '');
  const points = splitPoints(copy);
  const validity = points.find(p => /^valid\b/i.test(p)) || '';
  // A bracketed rule of three words or more reads better as its own bullet.
  const deal = points
    .filter(p => p !== validity && !/^prices? exclude gst$/i.test(p))
    .flatMap(p => {
      const inner = [...p.matchAll(/\s*\(([^()]{12,})\)/g)];
      if (!inner.length) return [p];
      const main = p.replace(/\s*\(([^()]{12,})\)/g, '').replace(/\s+/g, ' ').trim();
      return [main, ...inner.map(m => m[1].charAt(0).toUpperCase() + m[1].slice(1))];
    });
  const gst = points.some(p => /^prices? exclude gst$/i.test(p));
  const said = new Set(points.map(norm));
  const fine = splitPoints(asText(offer?.redemption_conditions))
    .filter(p => !/^valid\b/i.test(p) || !validity)
    .filter(p => !said.has(norm(p)));
  if (gst && !fine.some(p => /gst/i.test(p))) fine.unshift('Prices exclude GST');
  return {
    deal,
    validity: validity.replace(/^valid\s*/i, ''),
    who: asText(offer?.audience).replace(/\.$/, ''),
    notFor: asText(offer?.excluded_audience).replace(/\.$/, ''),
    fine,
  };
}

export interface OfferReasoning {
  /** The commercial job this offer does. */
  goal: string;
  /** Why it is shaped the way it is — the evidence behind the mechanic. */
  why: string[];
  /** Why here and now: the studio, the month and the stream it carries. */
  fit: string[];
  /** The plan maths: units × price, share of the month, discount. */
  logic: string[];
  /** What would tell the team it is working, or not. */
  watch: string[];
}

const listOf = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(asText).filter(Boolean);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(asText).filter(Boolean);
    } catch {
      /* plain text */
    }
    return v.trim() ? [v.trim()] : [];
  }
  return [];
};
const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const lakhs = (v: number) => `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;

/** Why this offer was planned for this studio and month, from the offer's own record. */
export function offerReasoning(
  offer: any,
  ctx: { studio?: string; month?: string; theme?: string; job?: string; monthTarget?: number; stream?: string } = {},
): OfferReasoning {
  const fields = fieldsOf(offer);
  const goal = asText(offer?.objective) || field(fields, 'Job', 'Objective', 'Goal') || offerSummary(offer).purpose;
  const why = [
    ...splitPoints(asText(offer?.rationale)),
    ...splitPoints(field(fields, 'Why it works', 'Why')),
  ].filter((p, i, all) => all.findIndex(q => norm(q) === norm(p)) === i);

  const fit: string[] = [];
  if (ctx.studio && ctx.month) fit.push(`Planned for ${ctx.studio} in ${ctx.month}${ctx.theme ? ` — “${ctx.theme}”` : ''}`);
  if (ctx.job) {
    const plain = ctx.job.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    const first = splitPoints(plain)[0] || plain;
    fit.push(`Month’s job: ${first.replace(/\.$/, '')}`);
  }
  const purpose = purposeOf(offer);
  fit.push(`Its role in the plan: ${purpose}`);
  const who = asText(offer?.audience).replace(/\s*\([^)]*\)/g, '').replace(/\.$/, '');
  if (who) fit.push(`Aimed at ${who.charAt(0).toLowerCase()}${who.slice(1)}`);

  const logic: string[] = [];
  const plan = asText(offer?.internal_description);
  if (plan) logic.push(plan.replace(/^plan:\s*/i, 'Plan: ').replace(/\.$/, ''));
  const buyers = Number(offer?.target_purchases) || 0;
  const asp = Number(offer?.expected_asp) || 0;
  const revenue = Number(offer?.expected_revenue) || buyers * asp;
  if (!plan && buyers && asp) logic.push(`${buyers} buyers × ${inr(asp)} = ${inr(buyers * asp)}`);
  if (revenue && ctx.monthTarget)
    logic.push(`${lakhs(revenue)} is ${Math.round((revenue / ctx.monthTarget) * 1000) / 10}% of the ${lakhs(ctx.monthTarget)} month target`);
  const discount = Number(offer?.effective_discount);
  if (Number.isFinite(discount) && discount > 0) logic.push(`Effective discount ${Math.round(discount)}%`);

  const watch = [...listOf(offer?.risks), ...splitPoints(field(fields, 'What to watch', 'Risk'))];
  // Without written risks, turn the plan into checkpoints the team can actually read mid-month.
  if (watch.length < 2 && buyers) {
    const perWeek = Math.max(1, Math.round(buyers / 4));
    watch.push(`On track at about ${perWeek} buyer${perWeek === 1 ? '' : 's'} a week`);
    watch.push(`Under ${Math.ceil(buyers / 2)} buyers by mid-month → push the nudge and follow-up sends`);
  }
  if (watch.length < 3 && Number.isFinite(discount) && discount > 0)
    watch.push(`Keep the discount at ${Math.round(discount)}% — don’t stack it with the standing perk`);

  return { goal, why, fit, logic, watch: watch.slice(0, 4) };
}
