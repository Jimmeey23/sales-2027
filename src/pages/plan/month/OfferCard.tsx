import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CalendarHeart,
  Check,
  ChevronDown,
  Copy,
  MessageSquare,
  FileText,
  Gift,
  Link2,
  Minus,
  Package,
  Pencil,
  Save,
  StickyNote,
  Loader2,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Wallet,
  Trash2,
  Unlink,
} from 'lucide-react';
import { MONTHS, money, number, titleCase } from '../../../types';
import { MechanicStage } from '../AnniversaryMechanics';
import { lakh } from '../usePlanData';
import { planPricing } from '../../../lib/offerPricing';
import { offerSummary, offerHighlights, offerDetails, splitPoints, offerReasoning } from '../../../lib/offerSummary';
import { hasValidForecast } from '../../../lib/forecast';
import { offerCategory, OFFER_CATEGORY_LABELS } from '../../../lib/offerCategory';
import { inline, n } from './shared';
import { OFFER_OBJECTIVES } from './OfferEditor';

export type CardPhoto = { url: string; pos: string; tags: string[] };
export const OFFER_CARD_PHOTOS: CardPhoto[] = [
  // Duo, referral, partner & bring-a-friend energy
  { url: '/p57/pro/n23.jpg', pos: '54% 30%', tags: ['duo', 'newcomer', 'lapsed'] },
  { url: '/p57/pro/n03.jpg', pos: '58% 24%', tags: ['duo', 'barre', 'newcomer'] },
  { url: '/p57/pro/n25.jpg', pos: '54% 40%', tags: ['duo', 'strength', 'renewal'] },
  // Community, party, founding & She Moves moments
  { url: '/p57/pro/n20.jpg', pos: '56% 24%', tags: ['community', 'duo', 'newcomer', 'renewal'] },
  { url: '/p57/class-1.jpg', pos: '58% 24%', tags: ['community', 'barre', 'newcomer'] },
  // 1-on-1 coaching, privates & trainer consultations
  { url: '/p57/pro/n13.jpg', pos: '64% 8%', tags: ['coaching', 'newcomer', 'renewal'] },
  { url: '/p57/pro/n12.jpg', pos: '62% 22%', tags: ['coaching', 'duo', 'newcomer'] },
  { url: '/p57/pro/n02.jpg', pos: '50% 8%', tags: ['coaching', 'strength', 'lapsed'] },
  // Indoor cycle, flash & high-tempo challenges
  { url: '/p57/pro/n01.jpg', pos: '54% 24%', tags: ['cycle', 'flash', 'renewal'] },
  { url: '/p57/pro/n08.jpg', pos: '52% 24%', tags: ['cycle', 'flash', 'newcomer'] },
  // Strength, class packs, trade-ups & boxes
  { url: '/p57/pro/p34.jpg', pos: '58% 26%', tags: ['strength', 'community', 'renewal'] },
  { url: '/p57/pro/n24.jpg', pos: '62% 26%', tags: ['strength', 'barre', 'newcomer'] },
  { url: '/p57/pro/n10.jpg', pos: '62% 28%', tags: ['strength', 'lapsed', 'renewal'] },
  { url: '/p57/pro/p38.jpg', pos: '54% 26%', tags: ['strength', 'flash', 'renewal'] },
  // Signature barre, stretch, newcomers & welcome offers
  { url: '/p57/pro/n18.jpg', pos: '56% 36%', tags: ['barre', 'calm', 'renewal'] },
  { url: '/p57/barre-solo.jpg', pos: '68% 20%', tags: ['barre', 'newcomer', 'renewal'] },
  // Comeback, travel-proof, freeze & reactivation
  { url: '/p57/class-2.jpg', pos: '54% 32%', tags: ['calm', 'lapsed', 'renewal'] },
  { url: '/p57/pro/n16.jpg', pos: '54% 28%', tags: ['calm', 'lapsed'] },
  { url: '/p57/pro/n26.jpg', pos: '58% 20%', tags: ['calm', 'strength', 'lapsed'] },
];

// Remaining studio photography, used to keep every card in a month on its own image.
export const CARD_PHOTO_EXTRAS: CardPhoto[] = [
  { url: '/p57/pro/n04.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n05.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n06.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n07.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n09.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n11.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n14.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n15.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n17.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n19.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n21.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n22.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n27.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/n28.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p01.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p02.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p03.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p04.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p05.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p06.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p08.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p09.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p10.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p12.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p13.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p14.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p15.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p16.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p17.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p18.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p19.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p20.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p21.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p23.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p24.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p25.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p26.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p27.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p28.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p29.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p30.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p31.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p32.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p33.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p35.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p36.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p37.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p39.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p40.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p41.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p42.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p43.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p44.jpg', pos: '50% 22%', tags: [] },
  { url: '/p57/pro/p45.jpg', pos: '50% 22%', tags: [] },
];

export const CARD_PHOTO_THEMES: [RegExp, string][] = [
  [/private|consult|1-on-1|trainer|personal|coach/i, 'coaching'],
  [/friend|duo|pair|squad|refer|bring|together|reunion|couple/i, 'duo'],
  [/cycle|ride|spin|c\+c|flash|72-hour|earn it back/i, 'cycle'],
  [/she moves|women|party|founding|passport|festival/i, 'community'],
  [/travel|freeze|comeback|missed|return|lapsed|reset|stretch|calm/i, 'calm'],
  [/strength|lift|box|trade-up|upgrade|level up|20-class|10-pack|pack/i, 'strength'],
  [/barre|welcome|first|trial|intro|golden|bonus|punch/i, 'barre'],
];

// Assigns each card in a month its own photograph so no two cards share a hero image.
export function assignMonthPhotos(offers: { offer: any; slot?: string }[]): Map<number, CardPhoto> {
  const used = new Set<string>();
  const assigned = new Map<number, CardPhoto>();
  const pool = [...OFFER_CARD_PHOTOS, ...CARD_PHOTO_EXTRAS];
  offers.forEach(({ offer, slot }, index) => {
    const preferred = pickOfferCardPhoto(offer, slot, index + 1);
    const chosen =
      (used.has(preferred.url) ? undefined : preferred) ||
      pool.find(photo => !used.has(photo.url)) ||
      CARD_PHOTO_EXTRAS.find(photo => !used.has(photo.url)) ||
      preferred;
    used.add(chosen.url);
    assigned.set(offer.id, chosen);
  });
  return assigned;
}

export function pickOfferCardPhoto(o: any, slot?: string, no?: number): CardPhoto {
  if (o.provenance?.photoKey) {
    const chosen = OFFER_CARD_PHOTOS.find(
      p => p.url === o.provenance.photoKey || p.url.endsWith(`/${o.provenance.photoKey}.jpg`),
    );
    if (chosen) return chosen;
  }
  const text = `${o.name || ''} ${o.benefit || ''} ${o.headline || ''} ${o.objective || ''}`;
  const theme = CARD_PHOTO_THEMES.find(([re]) => re.test(text))?.[1];
  const byTheme = theme ? OFFER_CARD_PHOTOS.filter(p => p.tags.includes(theme)) : [];
  const bySlot = slot ? OFFER_CARD_PHOTOS.filter(p => p.tags.includes(slot)) : [];
  const merged = [...new Map([...byTheme, ...bySlot].map(p => [p.url, p])).values()];
  const pool = merged.length >= 2 ? merged : OFFER_CARD_PHOTOS;
  const seed = [...String(o.name || o.id || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 13);
  const idx = (seed + (o.month || 1) * 3 + (no || 1) * 5) % pool.length;
  return pool[idx];
}

export function OfferCard({
  offer: o,
  no,
  slot,
  streamLabel,
  list: catalogueList,
  productLabel,
  editable,
  canSwap = editable,
  approved,
  canApprove,
  busy,
  onApprove,
  onPlanning,
  onEdit,
  onDuplicate,
  onChat,
  onRemove,
  onDelete,
  onSwap,
  regenerating = false,
  monthTarget = 0,
  monthUnits = 0,
  monthUnitsLabel = '',
  photo,
  studioName = '',
  monthName = '',
  monthTheme = '',
  monthJob = '',
}: any) {
  // The banner flips to say why the offer is in this month at this studio.
  const [flipped, setFlipped] = useState(false);
  const linked = !!o.provenance?.linkGroup;
  // The two decisions a team makes around an offer, plus the note that explains them. Both
  // are optimistic: the refetch that follows a save is the confirmation, not the trigger.
  const savedNote = useRef(String(o.performance_notes || ''));
  const [noteDraft, setNoteDraft] = useState<string>(String(o.performance_notes || ''));
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [adsPending, setAdsPending] = useState(false);
  // The commercial record stays visible. Audience, timing and the team's notes are
  // secondary fields, opened explicitly without turning the whole card into a click target.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const next = String(o.performance_notes || '');
    if (next === savedNote.current) return;
    savedNote.current = next;
    if (noteState !== 'saving') setNoteDraft(next);
  }, [o.performance_notes, noteState]);
  const noteDirty = noteDraft !== savedNote.current;
  const runAds = Boolean(Number(o.run_ads || 0));
  const saveNote = async () => {
    if (!onPlanning || !noteDirty) return;
    setNoteState('saving');
    const ok = await onPlanning(o, { performanceNotes: noteDraft.trim() || null });
    if (ok === false) return setNoteState('error');
    savedNote.current = noteDraft.trim();
    setNoteState('saved');
  };
  const toggleAds = async () => {
    if (!onPlanning || adsPending) return;
    setAdsPending(true);
    await onPlanning(o, { runAds: !runAds });
    setAdsPending(false);
  };
  const parseList = (value: any) => {
    if (Array.isArray(value)) return value;
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  };
  const metrics = parseList(o.success_metrics),
    risks = parseList(o.risks);

  // The record carries an average selling price, not a ticket. Where the plan states the
  // price and the list price in its own sentence, those are what the card quotes; the average
  // is then only used for the revenue arithmetic, and labelled as an average.
  const plan = planPricing(o);
  const asp = n(o.expected_asp);
  const quotedPrice = plan.price && plan.price > 0 ? plan.price : null;
  const isAverageTicket = quotedPrice === null;
  const offerPrice = quotedPrice ?? asp;
  const list = plan.list ?? catalogueList;
  const rawDisc = o.provenance?.pricing?.discount;
  const cashDisc =
    plan.cashPct != null ? plan.cashPct / 100 : rawDisc !== undefined && rawDisc !== null ? n(rawDisc) : null;
  const perkDisc = plan.perkPct != null ? plan.perkPct / 100 : null;
  const effPct = n(o.effective_discount);
  const featuredSell = list ? Math.round(list * (1 - (cashDisc ?? 0))) : null;
  const isBlendedTicket = Boolean(
    list &&
      featuredSell &&
      offerPrice > 0 &&
      Math.abs(offerPrice - featuredSell) > Math.max(100, list * 0.03) &&
      offerPrice < featuredSell * 0.9,
  );
  // A struck-out price needs a real reference: either the plan's list price, or a percentage
  // offer whose list can be derived from its own discount. Never invent one for a ticket the
  // plan states outright.
  const isDirectCashCut =
    !isBlendedTicket &&
    ((list && offerPrice > 0 && list - offerPrice > 1) ||
      (!list &&
        isAverageTicket &&
        !plan.atList &&
        o.offer_type === 'percentage' &&
        ((cashDisc !== null && cashDisc > 0 && cashDisc < 1) || (cashDisc === null && effPct > 0 && effPct < 100))));
  const strikePrice = isDirectCashCut
    ? list && list > offerPrice + 1
      ? list
      : offerPrice > 0
        ? Math.round(offerPrice / (1 - (cashDisc ?? effPct / 100)))
        : null
    : null;
  const directSaving = strikePrice && offerPrice ? Math.max(0, strikePrice - offerPrice) : 0;
  const directPct = strikePrice && strikePrice > 0 ? directSaving / strikePrice : 0;

  const fmtPct = (v: number) => `${Number(v.toFixed(1))}%`;

  // Column 1: List price / Featured MRP (only crossed out when there is a real direct price cut)
  const listColLabel = isBlendedTicket ? 'Featured MRP' : 'List price';
  const listColSub = isBlendedTicket && productLabel ? productLabel : !list && !strikePrice ? 'Standard tariff' : null;

  // Column 2: Offer price when the plan states one; otherwise the average ticket, said plainly.
  const offerColLabel = isAverageTicket ? 'Average ticket' : isBlendedTicket ? 'Avg ticket' : 'Offer price';
  const offerColSub = isAverageTicket
    ? plan.atList
      ? 'renews at list price'
      : 'per buyer, price varies'
    : isBlendedTicket
      ? cashDisc && cashDisc > 0
        ? `Featured: ${money(featuredSell, true)} (${Math.round(cashDisc * 100)}% off)`
        : 'Blended across tiers'
      : null;

  // What the client gets: a real cash cut off list, or the value the plan adds on top.
  const hasCashCut = cashDisc !== null && cashDisc > 0;
  const cashCutPct = hasCashCut ? cashDisc * 100 : 0;
  const perkValuePct = perkDisc !== null && perkDisc > 0 ? perkDisc * 100 : 0;
  const savesPrimary = hasCashCut
    ? directSaving > 0
      ? money(directSaving)
      : `${fmtPct(cashCutPct)} off`
    : perkValuePct > 0
      ? `+${fmtPct(perkValuePct)}`
      : effPct > 0
        ? `+${fmtPct(effPct)}`
        : null;
  const savesNote = hasCashCut
    ? directSaving > 0 && list
      ? `off the ${money(list)} list price`
      : plan.credited
        ? 'off the next purchase'
        : 'Off the list price'
    : perkValuePct > 0 || effPct > 0
      ? 'In perks & extras'
      : 'No price cut';
  const discountNote =
    hasCashCut && perkValuePct > 0
      ? `${fmtPct(cashCutPct)} cash + ${fmtPct(perkValuePct)} perks`
      : hasCashCut
        ? 'Cash off the list price'
        : perkValuePct > 0 || effPct > 0
          ? 'Perk value only'
          : 'No discount';
  const savesPillText =
    directSaving > 0
      ? `${fmtPct(directPct * 100)} off list`
      : hasCashCut
        ? effPct > cashCutPct + 0.2
          ? `${fmtPct(effPct)} total value`
          : 'Campaign rate'
        : effPct > 0
          ? `+${fmtPct(effPct)} perk value`
          : 'Value-add, no price cut';

  const category = offerCategory(o, slot);
  const slotLabel = OFFER_CATEGORY_LABELS[category];
  const membership = productLabel || o.provenance?.pricing?.product || (o.offer_type ? titleCase(o.offer_type) : '');
  const objectiveLabel = o.objective ? titleCase(o.objective) : null;
  const showObjective = objectiveLabel && (!membership || objectiveLabel.toLowerCase() !== membership.toLowerCase());

  const monthEndDay = o.month ? new Date(o.year || 2027, o.month, 0).getDate() : 30;
  const windowText = o.validity_start
    ? `${new Date(o.validity_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${
        o.validity_end
          ? ` – ${new Date(o.validity_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
          : ''
      }`
    : o.month
      ? `1 – ${monthEndDay} ${MONTHS[o.month - 1].slice(0, 3)}${o.year ? ` ${o.year}` : ''}`
      : 'Full month';

  const days =
    o.validity_start && o.validity_end
      ? Math.max(1, Math.round((+new Date(o.validity_end) - +new Date(o.validity_start)) / 86400000) + 1)
      : monthEndDay;
  const units = n(o.target_purchases);
  const perWeek = units ? Math.max(1, Math.round((units / days) * 7)) : 0;
  const fin = (() => {
    if (o.financials && typeof o.financials === 'object') return o.financials;
    try {
      return JSON.parse(o.financials || '{}');
    } catch {
      return {};
    }
  })();
  const margin = fin.contributionMargin ?? o.margin_impact;
  const mechanic = [o.offer_type ? titleCase(o.offer_type) : '', productLabel].filter(Boolean).join(' · ');
  // The closing words of the name carry the accent, as in the studio's own cards.
  const titleWords = String(o.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const titleAccent = titleWords.length > 1 ? (titleWords.pop() as string) : titleWords[0] || '';
  const titleLead = titleWords.join(' ');
  const heroPhoto: CardPhoto = photo || pickOfferCardPhoto(o, slot, no);
  const offerNum = no ? String(no).padStart(2, '0') : '01';

  // Imported rationale uses "Why: … / Watch: … / Model: … / Logic: … / KPI: …" lines.
  const reasons = String(o.rationale || '')
    .split('\n')
    .map(line => line.match(/^(Why|Watch|Model|Logic|KPI):\s*(.*)$/i))
    .filter(Boolean) as RegExpMatchArray[];

  // Optimistic approval: the tick flips immediately and settles once the month reloads.
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => setPending(null), [approved]);
  const shown = pending ?? !!approved;
  const revenue = hasValidForecast(o) ? n(o.expected_revenue) : null;
  const contribution = margin != null && Number.isFinite(Number(margin)) ? Number(margin) : null;
  const sharePct = monthTarget && monthTarget > 0 && revenue !== null ? (revenue / monthTarget) * 100 : null;
  // The plan's offers carry the written mechanic in provenance; older ones keep it in mechanics,
  // customer copy or the benefit line.
  const mechanicsText = (() => {
    const asText = (value: any): string => {
      if (!value) return '';
      if (typeof value === 'object') {
        return String(value.summary || value.text || value.description || value.mechanic || '').trim();
      }
      const text = String(value).trim();
      if (!/^[[{]/.test(text)) return text;
      try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object'
          ? String(parsed.summary || parsed.text || parsed.description || '').trim()
          : '';
      } catch {
        return '';
      }
    };
    const written = asText(o.provenance?.pricing?.mechanic) || asText(o.mechanics);
    if (written) return written;
    if (o.customer_copy && o.customer_copy !== o.headline && o.customer_copy !== o.benefit) return o.customer_copy;
    return o.benefit && o.benefit !== o.headline ? o.benefit : '';
  })();

  // Lead with the written commercial terms and inclusions, not just the campaign
  // hook. The derived description still helps deduplicate the supporting record.
  const offerDescription = offerSummary(o).sentence;
  const highlights = offerHighlights(o);
  const details = offerDetails(o);

  // Bars are the chart line for each figure; they all share one 0–100 scale.
  const clampPct = (value: number) =>
    Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value)) * 10) / 10 : 0;
  const valueBar = clampPct(effPct);
  const cashBar = clampPct(hasCashCut ? Math.min(cashCutPct, effPct) : 0);
  const ticketBase = strikePrice || (isBlendedTicket ? featuredSell : list);
  const ticketBar = ticketBase && offerPrice ? clampPct((offerPrice / ticketBase) * 100) : 0;
  const unitsBar = monthUnits > 0 && units ? clampPct((units / monthUnits) * 100) : 0;
  const revenueBar = sharePct !== null ? Math.max(2, clampPct(sharePct)) : 0;
  const marginPct = contribution !== null && revenue ? (contribution / revenue) * 100 : null;
  const marginBar = marginPct !== null ? clampPct(marginPct) : 0;
  // Delivery costs are not in the data yet, so a contribution figure cannot be computed and the
  // card does not pretend otherwise. What the offer gives away, however, is arithmetic: the
  // effective discount applied to its own forecast.
  const discountCost = revenue !== null && effPct > 0 ? (revenue * effPct) / 100 : null;
  const cashCost = revenue !== null && hasCashCut ? (revenue * cashCutPct) / 100 : null;

  // The spec sheet: what the offer is, in the client's own words, on what terms, and the arithmetic
  // behind its forecast. Every line is derived from the offer record or its plan provenance.
  const specRows = (() => {
    const rows: Array<{ label: string; value: React.ReactNode }> = [];
    const tidy = (value: unknown) =>
      String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    const cut = (value: string, max: number) =>
      value.length > max ? `${value.slice(0, max).replace(/[\s,;:.]+$/, '')}\u2026` : value;
    const line = (names: string[]) => {
      const hit = reasons.find(entry => names.some(name => new RegExp(name, 'i').test(entry[1])));
      return tidy(hit?.[2]);
    };
    // Avoid exact duplicates of the highlighted terms, but keep distinct
    // conditions even when they start with the same words.
    const fresh = (value: string) =>
      value && ![offerDescription, highlights.terms, ...highlights.inclusions].some(text => text === value);

    // Who is eligible is already the "Who" column above; only the exclusion needs saying.
    const excluded = tidy(o.excluded_audience);
    if (excluded) rows.push({ label: 'Excludes', value: cut(excluded, 200) });

    const mechanicRow = tidy(mechanicsText);
    if (mechanicRow && fresh(mechanicRow)) rows.push({ label: 'The offer', value: cut(mechanicRow, 300) });

    const included = tidy(o.benefit);
    if (included && included !== mechanicRow && fresh(included)) {
      rows.push({ label: "What's included", value: cut(included, 260) });
    }

    const why = line(['why']);
    if (why) rows.push({ label: 'Why it works', value: cut(why, 300) });

    // How the number is actually sold: the play, the pace it needs, and what it carries.
    const salesLogic = [
      OFFER_OBJECTIVES.find(([key]) => key === o.objective)?.[1] || objectiveLabel || slotLabel,
      units ? `${number(units)} buyers over ${days} days` : '',
      perWeek ? `~${number(perWeek)} a week` : '',
      sharePct !== null ? `${fmtPct(sharePct)} of the month's target` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    if (salesLogic) rows.push({ label: 'Sales logic', value: salesLogic });

    const model = line(['model', 'revenue', 'logic']);
    // Revenue is units × average ticket; the ticket the plan states is not the multiplier, so
    // the line names the average explicitly instead of implying the price builds the forecast.
    const arithmetic =
      units && asp && revenue !== null
        ? `${number(units)} buyers × ${money(asp)} average ticket = ${lakh(revenue)}${
            sharePct !== null ? ` (${fmtPct(sharePct)} of the month)` : ''
          }`
        : '';
    if (model) rows.push({ label: 'Revenue logic', value: cut(model, 320) });
    else if (arithmetic) rows.push({ label: 'Revenue logic', value: arithmetic });

    const kpis = metrics.length ? metrics.slice(0, 4).join(' · ') : line(['kpi']);
    if (kpis) rows.push({ label: 'Success metrics', value: cut(kpis, 300) });
    else if (units && revenue !== null) {
      const closeLabel = o.month ? `${monthEndDay} ${MONTHS[o.month - 1].slice(0, 3)}` : 'month end';
      rows.push({
        label: 'Success metrics',
        value: `${number(units)} buyers and ${lakh(revenue)} booked by ${closeLabel}${
          effPct > 0 ? ` · hold the effective discount at ${fmtPct(effPct)}` : ''
        }`,
      });
    }

    const watch = line(['watch']);
    if (watch) rows.push({ label: 'What to watch', value: cut(watch, 260) });

    if (risks.length) rows.push({ label: 'Risk & mitigation', value: cut(risks.slice(0, 3).join(' · '), 260) });

    rows.push({
      label: 'Terms',
      value: tidy(o.redemption_conditions)
        ? cut(tidy(o.redemption_conditions), 240)
        : 'One per client; no cash discount beyond the campaign rate.',
    });

    if (o.validity_start) rows.push({ label: 'Window', value: `${windowText} · ${days} days` });

    const quote = tidy(o.customer_copy);
    if (quote && fresh(quote) && quote !== included) {
      rows.push({ label: 'In their words', value: `\u201c${cut(quote, 160)}\u201d` });
    }

    return rows;
  })();

  return (
    <article
      className={`oc is-v3${shown ? ' is-approved' : ''}${slot ? ` slot-${slot}` : ''}`}
      aria-labelledby={`ocv-title-${o.id}`}
      data-offer-category={category}
    >
      {/* A photo-led masthead and a clean commercial sheet share the same hierarchy in
          one- and two-column views. The card itself is the named container-query target. */}
      <div className="ocv-shell">
        {/* The image carries the identity; the white sheet carries the evidence. */}
        <div className="ocv-plate">
          <div
            className="ocv-photo"
            aria-hidden="true"
            style={
              {
                backgroundImage: `url(${heroPhoto.url})`,
                // Keep each photograph's focal point as the masthead changes width.
                '--photo-focus': heroPhoto.pos,
              } as React.CSSProperties
            }
          />
          <span className="ocv-wash" aria-hidden="true" />

          <div className="ocv-plate-top">
            <span className="ocv-index">
              <em>Offer</em>
              <b>{offerNum}</b>
            </span>
            <span
              className={`ocv-link ${linked ? 'is-linked' : 'is-solo'}`}
              title={linked ? 'Runs at all locations' : 'This location only'}
              aria-label={linked ? 'Runs at all locations' : 'This location only'}
            >
              {linked ? <Link2 size={11} /> : <Unlink size={11} />}
              {linked ? 'All rooms' : 'Solo'}
            </span>
          </div>

          <div className="ocv-plate-foot">
            <span className="ocv-eyebrow">
              {[slotLabel || streamLabel, objectiveLabel && showObjective ? objectiveLabel : null]
                .filter(Boolean)
                .join(' · ') || 'Offer plan'}
            </span>
            <h3 className="ocv-title" id={`ocv-title-${o.id}`}>
              {titleLead && <>{titleLead} </>}
              <span className="ocv-title-accent">{titleAccent}</span>
            </h3>
            {o.headline && o.headline !== o.customer_copy && !offerDescription.startsWith(o.headline) && (
              <p className="ocv-lede">{o.headline}</p>
            )}
            <div className="ocv-chips">
              {membership && (
                <span className="ocv-chip">
                  <Tag size={10} />
                  {membership}
                </span>
              )}
              {o.provenance?.moment && (
                <span className="ocv-chip is-moment" title={`Built around ${o.provenance.moment} this month`}>
                  <CalendarHeart size={10} />
                  {o.provenance.moment}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="ocv-body">
          {/* The five things a manager needs before anything else, in one place. */}
          <dl className="ocv-keyterms" aria-label="Offer at a glance">
            <div>
              <dt>Membership / package</dt>
              <dd>{membership || plan.label || '—'}</dd>
            </div>
            <div>
              <dt>Original price</dt>
              <dd>{strikePrice ? money(strikePrice) : list ? money(list) : '—'}</dd>
            </div>
            <div>
              <dt>Effective price</dt>
              <dd>{offerPrice > 0 ? money(offerPrice) : '—'}{isAverageTicket && offerPrice > 0 ? ' avg' : ''}</dd>
            </div>
            <div>
              <dt>Effective discount</dt>
              <dd>
                {(() => {
                  const base = strikePrice || list || 0;
                  const pct = effPct > 0 ? effPct : directPct > 0 ? directPct * 100 : hasCashCut ? cashCutPct : 0;
                  const value = directSaving > 0 ? directSaving : base && pct ? Math.round((base * pct) / 100) : 0;
                  if (!pct && !value) return 'No discount';
                  return [value ? money(value) : null, pct ? fmtPct(pct) : null].filter(Boolean).join(' · ');
                })()}
              </dd>
            </div>
            <div className="is-wide">
              <dt>Conditions</dt>
              <dd>{String(o.redemption_conditions ?? '').replace(/\s+/g, ' ').trim() || 'One per client; no cash discount beyond the campaign rate.'}</dd>
            </div>
            <div className="is-wide">
              <dt>Brief</dt>
              <dd>{offerDescription}</dd>
            </div>
          </dl>
          <header className="ocv-head">
            <div className="ocv-head-top">
              <span className={`ocv-state${shown ? ' is-approved' : ''}`}>
                {shown ? <Check size={12} strokeWidth={2.5} /> : <i aria-hidden="true" />}
                {shown ? 'Approved' : 'Awaiting sign-off'}
              </span>
              <div className="ocv-head-actions">
                {(editable || (canSwap && !shown)) && (
                  <div className="ocv-tools">
                    {canSwap && !shown && (
                      <button
                        type="button"
                        aria-label={`Generate a new offer with AI in place of ${o.name}`}
                        title="Generate with AI — a new, better-optimised offer replaces this one"
                        className={`ocv-tool is-ai${regenerating ? ' is-loading' : ''}`}
                        onClick={onSwap}
                        disabled={busy || regenerating}
                        aria-busy={regenerating}
                      >
                        {regenerating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                      </button>
                    )}
                    {editable && onChat && (
                      <button
                        type="button"
                        aria-label={`Edit ${o.name} with copilot`}
                        title="Edit with copilot"
                        className="ocv-tool"
                        onClick={onChat}
                        disabled={busy}
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}
                    {editable && onDuplicate && (
                      <button
                        type="button"
                        aria-label={`Duplicate ${o.name}`}
                        title="Duplicate as new offer"
                        className="ocv-tool"
                        onClick={onDuplicate}
                        disabled={busy}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {editable && (
                      <button
                        type="button"
                        aria-label={`Edit ${o.name}`}
                        title="Edit all offer details"
                        className="ocv-tool"
                        onClick={onEdit}
                        disabled={busy}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {(editable || !shown) && (
                      <button
                        type="button"
                        aria-label={`Remove ${o.name} from month`}
                        title="Remove from month plan"
                        className="ocv-tool is-danger"
                        onClick={onRemove}
                        disabled={busy}
                      >
                        <Minus size={15} />
                      </button>
                    )}
                    {editable && onDelete && (
                      <button
                        type="button"
                        aria-label={`Delete ${o.name}`}
                        title="Delete offer permanently"
                        className="ocv-tool is-danger"
                        onClick={onDelete}
                        disabled={busy}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`ocv-flip${flipped ? ' is-flipped' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label={flipped ? `${o.name}: show the offer` : `${o.name}: show why this offer was planned`}
              onClick={() => setFlipped(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFlipped(v => !v);
                }
              }}
            >
            <section className="ocv-offer-highlight ocv-face is-front" aria-hidden={flipped} aria-label={`${o.name} — offer details`}>
              <span className="ocv-offer-kicker">
                <Gift size={13} /> The offer
                <em className="ocv-flip-hint">Why this offer? ↻</em>
              </span>
              {(() => {
                const deal = details.deal.length ? details.deal : [highlights.terms];
                const seen = new Set(deal.map(d => d.toLowerCase()));
                const extras = highlights.inclusions
                  .flatMap(inclusion => splitPoints(inclusion))
                  .filter(p => !seen.has(p.toLowerCase()));
                const [lead, ...rest] = deal;
                // Three or four bullets at most: the deal first, then the validity window.
                const bullets = [...rest, ...extras];
                // Short offers borrow from who it is for and the house rules, so every banner reads 3–4 points.
                const fill = [
                  (() => {
                    const who = details.who
                      .replace(/\s*\([^)]*\)/g, '')
                      .replace(/\.\s*Band:.*$/i, '')
                      .replace(/\.$/, '')
                      .trim();
                    return who && `For ${who.charAt(0).toLowerCase()}${who.slice(1)}`;
                  })(),
                  ...details.fine,
                ].filter(Boolean) as string[];
                while (bullets.length < 2 && fill.length) bullets.push(fill.shift()!);
                if (details.validity) bullets.push(`Valid ${details.validity}`);
                while (bullets.length < 3 && fill.length) bullets.splice(bullets.length - 1, 0, fill.shift()!);
                const shown = bullets.length > 4 ? [...bullets.slice(0, 3), bullets[bullets.length - 1]] : bullets;
                return (
                  <>
                    <p className="ocv-brief">{inline(lead)}</p>
                    {shown.length > 0 && (
                      <ul className="ocv-inclusions">
                        {shown.map((point, index) => (
                          <li key={index}>
                            <Check size={14} aria-hidden="true" />
                            <span>{inline(point)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                );
              })()}
            </section>
            {(() => {
              const r = offerReasoning(o, {
                studio: studioName,
                month: monthName,
                theme: monthTheme,
                job: monthJob,
                monthTarget,
                stream: streamLabel,
              });
              const block = (title: string, items: string[]) =>
                items.length > 0 && (
                  <div className="ocv-why-block">
                    <span>{title}</span>
                    <ul>
                      {items.map((item, index) => (
                        <li key={index}>{inline(item)}</li>
                      ))}
                    </ul>
                  </div>
                );
              return (
                <section className="ocv-offer-highlight ocv-face is-back" aria-hidden={!flipped}>
                  <span className="ocv-offer-kicker">
                    <Sparkles size={13} /> Why this offer
                    <em className="ocv-flip-hint">Back to the offer ↻</em>
                  </span>
                  {r.goal && <p className="ocv-why-goal">{inline(r.goal)}</p>}
                  <div className="ocv-why-grid">
                    {block('The reasoning', r.why)}
                    {block('Why here, why now', r.fit)}
                    {block('The logic', r.logic)}
                    {block('What to watch', r.watch)}
                  </div>
                </section>
              );
            })()}
            </div>
          </header>

          {/* Anniversary offers are played, not just read: the wheel, the ticket and the nine
              gifts each carry their own stage here, between the copy and the figures. */}
          <MechanicStage offer={o} />

          {/* The figures that carry the month: revenue first and largest, then the units it
            needs and what it leaves behind. */}
          <div className="ocv-figures">
            <div
              className="ocv-fig is-hero"
              style={{ ['--fill' as string]: `${Math.round(revenueBar)}%` } as React.CSSProperties}
            >
              <span className="ocv-fig-label">
                <TrendingUp size={12} />
                Forecast revenue
              </span>
              <strong className="ocv-fig-value">{revenue !== null ? lakh(revenue) : '—'}</strong>
              <span className="ocv-fig-note">
                {sharePct !== null
                  ? `${fmtPct(sharePct)} of ${monthTarget ? lakh(monthTarget) : 'the'} target`
                  : 'No forecast yet'}
              </span>
              <span className="ocv-meter" aria-hidden="true">
                <i />
              </span>
            </div>

            <div
              className="ocv-fig"
              style={{ ['--fill' as string]: `${Math.round(unitsBar)}%` } as React.CSSProperties}
            >
              <span className="ocv-fig-label">
                <Package size={12} />
                Buyers needed
              </span>
              <strong className="ocv-fig-value">
                {number(units)}
                {perWeek > 0 && <em>~{perWeek}/wk</em>}
              </strong>
              <span className="ocv-fig-note">
                {monthUnits > 0
                  ? units > monthUnits
                    ? `${fmtPct((units / monthUnits) * 100)} of the ${number(monthUnits)}${monthUnitsLabel ? ` ${monthUnitsLabel}` : ''} planned`
                    : `of ${number(monthUnits)}${monthUnitsLabel ? ` ${monthUnitsLabel}` : ''} this month`
                  : `over ${days} days`}
              </span>
              <span className="ocv-meter" aria-hidden="true">
                <i />
              </span>
            </div>

            <div
              className="ocv-fig"
              style={
                {
                  ['--fill' as string]: `${Math.round(contribution !== null ? marginBar : valueBar)}%`,
                } as React.CSSProperties
              }
              title={
                contribution !== null
                  ? 'Contribution after delivery cost and campaign budget'
                  : discountCost !== null
                    ? 'What the offer gives back: its forecast revenue at the effective discount'
                    : 'No forecast to price the discount against yet'
              }
            >
              <span className="ocv-fig-label">
                <Wallet size={12} />
                {contribution !== null ? 'Contribution' : 'Given back'}
              </span>
              <strong className={`ocv-fig-value${contribution === null && discountCost === null ? ' is-muted' : ''}`}>
                {contribution !== null ? lakh(contribution) : discountCost !== null ? lakh(discountCost) : '—'}
              </strong>
              <span className="ocv-fig-note">
                {contribution !== null
                  ? `${marginPct === null ? '' : `${marginPct.toFixed(0)}% margin`}`
                  : discountCost !== null
                    ? `${fmtPct(effPct)} of revenue${
                        cashCost !== null && perkValuePct > 0 ? ` · ${lakh(cashCost)} in cash` : ''
                      }`
                    : 'No forecast yet'}
              </span>
              <span className="ocv-meter" aria-hidden="true">
                <i />
              </span>
            </div>
          </div>

          {/* The mechanics, read as three facts on one rule rather than three more cards. */}
          <div className="ocv-facts">
            <div className="ocv-fact">
              <span className="ocv-fact-label">{offerColLabel}</span>
              <b>
                {offerPrice ? money(offerPrice) : '—'}
                {strikePrice && <s>{money(strikePrice)}</s>}
              </b>
              <em>
                {strikePrice
                  ? `of ${money(strikePrice)} list`
                  : isBlendedTicket && featuredSell
                    ? `vs ${money(featuredSell)} featured`
                    : list
                      ? `of ${money(list)} list`
                      : isAverageTicket
                        ? offerColSub
                        : plan.credited
                          ? 'credited at purchase'
                          : 'set by the plan'}
              </em>
              <span
                className="ocv-fact-bar"
                aria-hidden="true"
                style={{ ['--fill' as string]: `${Math.round(ticketBar)}%` } as React.CSSProperties}
              />
            </div>
            <div className="ocv-fact">
              <span className="ocv-fact-label">Client gets</span>
              <b>{savesPrimary || (effPct > 0 ? `+${fmtPct(effPct)}` : 'Value-add')}</b>
              <em>{savesNote}</em>
              <span
                className="ocv-fact-bar"
                aria-hidden="true"
                style={{ ['--fill' as string]: `${Math.round(valueBar)}%` } as React.CSSProperties}
              />
            </div>
            <div className="ocv-fact">
              <span className="ocv-fact-label">Effective discount</span>
              <b className={effPct > 0 ? '' : 'is-muted'}>{effPct > 0 ? fmtPct(effPct) : 'None'}</b>
              <em>{discountNote}</em>
              <span
                className="ocv-fact-bar"
                aria-hidden="true"
                style={{ ['--fill' as string]: `${Math.round(Math.max(cashBar, valueBar))}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {/* The record: the whole commercial case, in print, always open. */}
          <section className="ocv-record" aria-label={`${o.name} — the offer record`}>
            <div className="ocv-record-head">
              <span className="ocv-record-title">
                <FileText size={13} />
                Commercial details
              </span>
              <span className="ocv-record-meta">{specRows.length} details</span>
            </div>
            <dl className="ocv-spec">
              {specRows.map(row => (
                <div key={row.label} className="ocv-spec-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <button
            type="button"
            className={`ocv-more${expanded ? ' is-open' : ''}`}
            aria-expanded={expanded}
            aria-controls={`ocv-extra-${o.id}`}
            onClick={() => setExpanded(value => !value)}
          >
            <span className="ocv-more-label">
              <StickyNote size={14} />
              Audience, timing &amp; notes
            </span>
            <span className="ocv-more-action">
              {expanded ? 'Hide' : 'View'}
              <ChevronDown size={14} />
            </span>
          </button>

          {/* Secondary fields: folded on arrival, kept mounted so a half-written note survives. */}
          <div className={`ocv-extra${expanded ? ' is-open' : ''}`} id={`ocv-extra-${o.id}`} inert={!expanded}>
            <div className="ocv-extra-in">
              <div className="ocv-who">
                <div className="ocv-who-cell">
                  <span className="ocv-who-label">
                    <Users size={12} /> Who
                  </span>
                  <b>{o.audience || 'All clients'}</b>
                </div>
                <div className="ocv-who-cell">
                  <span className="ocv-who-label">
                    <Calendar size={12} /> When
                  </span>
                  <b>
                    {windowText} · {days} days
                  </b>
                </div>
                <div className="ocv-who-cell">
                  <span className="ocv-who-label">
                    <Tag size={12} /> How
                  </span>
                  <b>{[mechanic, offerColSub].filter(Boolean).join(' · ') || titleCase(o.offer_type) || 'Value-add'}</b>
                </div>
              </div>

              {/* The log: the two decisions taken around an offer, and the line that explains
              them. Both marks save straight to the offer, so the plan remembers them. */}
              <section className="ocv-log" aria-label={`${o.name} — notes and marks`}>
                <div className="ocv-log-head">
                  <span className="ocv-log-label">
                    <StickyNote size={12} />
                    Notes &amp; comments
                  </span>
                  <span
                    className={`ocv-log-state is-${noteState}${noteDirty && noteState !== 'saving' ? ' is-dirty' : ''}`}
                    aria-live="polite"
                  >
                    {noteState === 'saving'
                      ? 'Saving…'
                      : noteState === 'error'
                        ? 'Not saved'
                        : noteDirty
                          ? 'Unsaved'
                          : noteState === 'saved'
                            ? 'Saved'
                            : savedNote.current
                              ? 'Saved note'
                              : 'No note yet'}
                  </span>
                </div>
                <textarea
                  className="ocv-note"
                  rows={2}
                  value={noteDraft}
                  onChange={event => {
                    setNoteDraft(event.target.value);
                    setNoteState('idle');
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      saveNote();
                    }
                  }}
                  placeholder="A caveat, a staffing note, a follow-up…"
                  aria-label={`Note for ${o.name}`}
                />
                <div className="ocv-log-foot">
                  <span className="ocv-log-hint">{onPlanning ? 'Saves on the offer' : 'Read-only for your role'}</span>
                  <button
                    type="button"
                    className="ocv-save"
                    title="Save note (⌘↵)"
                    disabled={!noteDirty || noteState === 'saving' || !onPlanning}
                    onClick={saveNote}
                  >
                    <Save size={12} />
                    {noteState === 'saving' ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              </section>
            </div>
          </div>

          <footer className="ocv-foot">
            <span className="ocv-sign" title="Offer validity">
              <Calendar size={12} />
              {windowText}
            </span>
            <div className="ocv-marks">
              <button
                type="button"
                role="checkbox"
                aria-checked={shown}
                aria-label={`Approve ${o.name}`}
                aria-busy={pending !== null}
                className={`ocv-check is-approve${shown ? ' is-on' : ''}`}
                title={shown ? 'Approved · click to reopen' : 'Approve this offer'}
                disabled={!canApprove || pending !== null}
                onClick={() => {
                  if (!canApprove) return;
                  setPending(!shown);
                  Promise.resolve(onApprove(!shown)).then(ok => ok === false && setPending(null));
                }}
              >
                <span className="ocv-check-box" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="ocv-check-copy">
                  <b>{pending !== null ? 'Saving…' : shown ? 'Approved' : 'Approve offer'}</b>
                  <em>{shown ? 'Signed off' : 'Awaiting sign-off'}</em>
                </span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={runAds}
                aria-label={`Run ads for ${o.name}`}
                aria-busy={adsPending}
                className={`ocv-check is-ads${runAds ? ' is-on' : ''}`}
                title={runAds ? 'Paid media planned · click to remove' : 'Plan paid media behind this offer'}
                disabled={!onPlanning || adsPending}
                onClick={toggleAds}
              >
                <span className="ocv-check-box" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="ocv-check-copy">
                  <b>{adsPending ? 'Saving…' : 'Run ads'}</b>
                  <em>{runAds ? 'Media planned' : 'Organic only'}</em>
                </span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
