import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CalendarHeart,
  Check,
  ChevronDown,
  Copy,
  MessageSquare,
  ArrowLeftRight,
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
import { offerSections } from '../../../lib/offerSections';
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
  onUnits,
  onEdit,
  onDuplicate,
  onChat,
  onReplace,
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
  // The commercial record is reference material — open it, do not scroll past it.
  const [recordOpen, setRecordOpen] = useState(false);
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

  // How the ticket is described when the plan does not state a price outright.
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

    // The one-line brief leads the record now that the key-terms strip is gone.
    if (tidy(offerDescription)) rows.push({ label: 'The brief', value: cut(tidy(offerDescription), 320) });

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

  // Who / when / why: the three lines a front desk needs, always visible.
  const whyLine = (() => {
    const hit = reasons.find(r => /why/i.test(r[1]));
    const text = String(hit?.[2] || o.rationale || '')
      .replace(/^(Why|Watch|Model|Logic|KPI):\s*/gim, '')
      .split('\n')[0]
      .trim();
    return text;
  })();
  const gets = String(o.benefit || mechanicsText || offerDescription || '').trim();
  // The plan pack states each offer's list price in its mechanics; show it struck through.
  let packListStated = false;
  const packList = (() => {
    try {
      const m = typeof o.mechanics === 'string' ? JSON.parse(o.mechanics || '{}') : o.mechanics || {};
      const v = Number(m.listPrice);
      packListStated = Number.isFinite(v) && v > 0;
      return Number.isFinite(v) && v > offerPrice + 1 ? v : null;
    } catch {
      return null;
    }
  })();
  const shownStrike = strikePrice || packList;
  const shownSub = packList ? null : packListStated ? 'at list price' : offerColSub;
  const listCut = packList && offerPrice > 0 ? ((packList - offerPrice) / packList) * 100 : null;
  // Compact: name and numbers only.
  const [compact, setCompact] = useState(false);
  // Units: the stepper saves the new count (after a short pause, so a run of clicks is one
  // save); until the month reloads, the card shows the pending figure.
  const [whatIf, setWhatIf] = useState<number | null>(null);
  const [savingUnits, setSavingUnits] = useState(false);
  const unitsTimer = useRef<number | undefined>(undefined);
  useEffect(() => setWhatIf(null), [units]);
  useEffect(() => () => window.clearTimeout(unitsTimer.current), []);
  const [copied, setCopied] = useState(false);
  const perUnit = units > 0 && revenue !== null ? revenue / units : asp || offerPrice;
  const liveUnits = whatIf ?? units;
  const liveRevenue = whatIf !== null ? whatIf * perUnit : revenue;
  const liveShare = monthTarget > 0 && liveRevenue !== null ? (liveRevenue / monthTarget) * 100 : sharePct;
  const livePerWeek = liveUnits ? Math.max(1, Math.round((liveUnits / days) * 7)) : 0;
  const stepUnits = (d: number) => {
    const next = Math.max(0, (whatIf ?? units) + d);
    setWhatIf(next);
    if (!onUnits) return;
    window.clearTimeout(unitsTimer.current);
    unitsTimer.current = window.setTimeout(async () => {
      setSavingUnits(true);
      const ok = await onUnits(o, next);
      setSavingUnits(false);
      if (!ok) setWhatIf(null);
    }, 700);
  };
  // Where the offer stands today.
  const status = (() => {
    if (!o.validity_start) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${o.validity_start}T00:00:00`);
    const end = o.validity_end ? new Date(`${o.validity_end}T00:00:00`) : null;
    const dayMs = 86400000;
    if (today < start) {
      const d = Math.round((+start - +today) / dayMs);
      return { tone: 'soon', text: d > 60 ? `Starts ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : `Starts in ${d}d` };
    }
    if (end && today > end) return { tone: 'ended', text: 'Ended' };
    const left = end ? Math.round((+end - +today) / dayMs) + 1 : null;
    return { tone: 'live', text: left !== null ? `Live · ${left}d left` : 'Live' };
  })();
  // The house rule: no offer gives more than 25% effective discount, extras included.
  const overCap = effPct > 25;
  const copyOffer = async () => {
    const text = [o.name, o.headline, gets, o.audience && `Who: ${o.audience}`, `When: ${windowText}`, offerPrice > 0 && `Price: ${money(offerPrice)}${shownStrike ? ` (list ${money(shownStrike)})` : ''}`, o.redemption_conditions && `Terms: ${o.redemption_conditions}`]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const [briefOpen, setBriefOpen] = useState(false);

  return (
    <article
      className={`oc ocx cat-${category}${compact ? ' is-compact' : ''}${shown ? ' is-approved' : ''}${slot ? ` slot-${slot}` : ''}`}
      aria-labelledby={`ocx-title-${o.id}`}
      data-offer-category={category}
    >
      <div className="ocx-split">
        {/* Left: what the offer is. */}
        <div className="ocx-main">
          <div className="ocx-kicker">
            <span className="ocx-slot">{slotLabel || streamLabel || 'Offer'}</span>
            <span className="ocx-no">#{offerNum}</span>
            {linked ? (
              <span className="ocx-link" title="Runs at all locations">
                <Link2 size={11} /> All rooms
              </span>
            ) : null}
            {status && <span className={`ocx-live is-${status.tone}`}>{status.text}</span>}
            {overCap && (
              <span className="ocx-cap" title="Above the 25% effective-discount cap">
                Over 25% cap
              </span>
            )}
            <span className={`ocx-state${shown ? ' is-approved' : ''}`}>
              {shown ? <Check size={11} strokeWidth={3} /> : <i aria-hidden="true" />}
              {shown ? 'Approved' : 'Draft'}
            </span>
            <button
              type="button"
              className="ocx-collapse"
              aria-label={compact ? `Expand ${o.name}` : `Collapse ${o.name}`}
              aria-expanded={!compact}
              title={compact ? 'Expand card' : 'Collapse card'}
              onClick={() => setCompact(v => !v)}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <h3 className="ocx-title" id={`ocx-title-${o.id}`}>
            {o.name}
          </h3>
          {o.headline && <p className="ocx-hook">{o.headline}</p>}
          {gets && (
            <p className="ocx-gets">
              <Gift size={13} aria-hidden="true" />
              <span>{gets}</span>
            </p>
          )}
          {membership && (
            <span className="ocx-chip">
              <Tag size={10} /> {membership}
            </span>
          )}
          {compact && <div className="ocx-art" style={{ backgroundImage: `url(${heroPhoto.url})`, backgroundPosition: heroPhoto.pos }} aria-hidden="true" />}
        </div>

        {/* Right: the numbers. */}
        <aside className="ocx-price" aria-label={`${o.name} — price and forecast`}>
          <div className="ocx-ticket">
            <b>{offerPrice > 0 ? money(offerPrice) : '—'}</b>
            {shownStrike ? <s>{money(shownStrike)}</s> : null}
            {shownSub ? <em>{shownSub}</em> : null}
          </div>
          <div className="ocx-disc">
            {listCut ? (
              <span className="ocx-pill">{fmtPct(listCut)} off list</span>
            ) : savesPrimary ? (
              <span className="ocx-pill">{hasCashCut && directPct > 0 ? `${fmtPct(directPct * 100)} off` : savesPrimary}</span>
            ) : null}
            <small>{effPct > 0 ? `${fmtPct(effPct)} effective incl. extras` : discountNote}</small>
          </div>
          <dl className="ocx-stats">
            <div>
              <dt>Units</dt>
              <dd className="ocx-units">
                <button type="button" className="ocx-step" aria-label={onUnits ? "One fewer unit" : "One fewer unit (what-if)"} onClick={() => stepUnits(-1)} disabled={!liveUnits}>
                  −
                </button>
                <span className={whatIf !== null ? 'is-whatif' : ''}>{liveUnits ? number(liveUnits) : '0'}</span>
                <button type="button" className="ocx-step" aria-label={onUnits ? "One more unit" : "One more unit (what-if)"} onClick={() => stepUnits(1)}>
                  +
                </button>
                {livePerWeek ? <small> ~{livePerWeek}/wk</small> : null}
              </dd>
            </div>
            <div>
              <dt>Revenue</dt>
              <dd className={whatIf !== null ? 'is-whatif' : ''}>{liveRevenue !== null ? lakh(liveRevenue) : '—'}</dd>
            </div>
            <div>
              <dt>Of month</dt>
              <dd className={whatIf !== null ? 'is-whatif' : ''}>{liveShare !== null ? fmtPct(liveShare) : '—'}</dd>
            </div>
          </dl>
          {liveShare !== null && (
            <span className="ocx-meter" aria-hidden="true">
              <i style={{ width: `${Math.max(2, Math.min(100, liveShare))}%` }} />
            </span>
          )}
          {whatIf !== null &&
            (onUnits ? (
              <span className="ocx-whatif-reset" aria-live="polite">
                {savingUnits ? 'Saving units…' : 'Updating revenue…'}
              </span>
            ) : (
              <button type="button" className="ocx-whatif-reset" onClick={() => setWhatIf(null)} title="What-if only — not saved">
                What-if · reset to {number(units)}
              </button>
            ))}
        </aside>
      </div>

      {/* Who · when · why. */}
      <div className="ocx-meta">
        <div>
          <span>
            <Users size={11} /> Who
          </span>
          <p>{o.audience || 'All clients'}</p>
        </div>
        <div>
          <span>
            <Calendar size={11} /> When
          </span>
          <p>
            {windowText} · {days} days
          </p>
        </div>
        <div className="is-why">
          <span>
            <Sparkles size={11} /> Why
          </span>
          <p>{whyLine || o.objective || '—'}</p>
        </div>
      </div>

      {/* The full record, on demand. */}
      <button
        type="button"
        className={`ocx-brief-toggle${briefOpen ? ' is-open' : ''}`}
        aria-expanded={briefOpen}
        onClick={() => setBriefOpen(v => !v)}
      >
        <FileText size={12} /> Full brief &amp; terms <ChevronDown size={13} />
      </button>
      {briefOpen && (
        <dl className="ocx-brief">
          {specRows.map((row, i) => (
            <div key={i}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Note: one line, saves on ⌘↵ or the button. */}
      <div className="ocx-note">
        <StickyNote size={12} aria-hidden="true" />
        <textarea
          rows={1}
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
          placeholder={onPlanning ? 'Add a note…' : 'Read-only for your role'}
          aria-label={`Note for ${o.name}`}
          disabled={!onPlanning}
        />
        {noteDirty || noteState === 'saving' ? (
          <button type="button" className="ocx-save" onClick={saveNote} disabled={noteState === 'saving'} title="Save note (⌘↵)">
            <Save size={11} /> {noteState === 'saving' ? 'Saving…' : 'Save'}
          </button>
        ) : noteState === 'saved' ? (
          <em className="ocx-saved">Saved</em>
        ) : noteState === 'error' ? (
          <em className="ocx-saved is-error">Not saved</em>
        ) : null}
      </div>

      {/* Actions. */}
      <footer className="ocx-foot">
        <div className="ocx-marks">
          <button
            type="button"
            role="checkbox"
            aria-checked={shown}
            aria-label={`Approve ${o.name}`}
            aria-busy={pending !== null}
            className={`ocx-toggle is-approve${shown ? ' is-on' : ''}`}
            title={shown ? 'Approved · click to reopen' : 'Approve this offer'}
            disabled={!canApprove || pending !== null}
            onClick={() => {
              if (!canApprove) return;
              setPending(!shown);
              Promise.resolve(onApprove(!shown)).then(ok => ok === false && setPending(null));
            }}
          >
            <Check size={12} strokeWidth={3} />
            {pending !== null ? 'Saving…' : shown ? 'Approved' : 'Approve'}
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={runAds}
            aria-label={`Run ads for ${o.name}`}
            aria-busy={adsPending}
            className={`ocx-toggle is-ads${runAds ? ' is-on' : ''}`}
            title={runAds ? 'Paid media planned · click to remove' : 'Plan paid media behind this offer'}
            disabled={!onPlanning || adsPending}
            onClick={toggleAds}
          >
            <TrendingUp size={12} />
            {adsPending ? 'Saving…' : runAds ? 'Ads on' : 'Organic'}
          </button>
        </div>
        {(
          <div className="ocx-tools">
            <button type="button" aria-label={`Copy ${o.name} offer text`} title={copied ? 'Copied' : 'Copy offer text'} className={`ocx-tool${copied ? ' is-done' : ''}`} onClick={copyOffer}>
              {copied ? <Check size={13} /> : <FileText size={13} />}
            </button>
            {canSwap && !shown && (
              <button
                type="button"
                aria-label={`Generate a new offer with AI in place of ${o.name}`}
                title="Generate with AI — a new, better-optimised offer replaces this one"
                className={`ocx-tool is-ai${regenerating ? ' is-loading' : ''}`}
                onClick={onSwap}
                disabled={busy || regenerating}
                aria-busy={regenerating}
              >
                {regenerating ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
              </button>
            )}
            {editable && onReplace && (
              <button type="button" aria-label={`Replace ${o.name} with another offer`} title="Replace" className="ocx-tool" onClick={onReplace} disabled={busy}>
                <ArrowLeftRight size={13} />
              </button>
            )}
            {editable && onChat && (
              <button type="button" aria-label={`Edit ${o.name} with copilot`} title="Edit with copilot" className="ocx-tool" onClick={onChat} disabled={busy}>
                <MessageSquare size={13} />
              </button>
            )}
            {editable && onDuplicate && (
              <button type="button" aria-label={`Duplicate ${o.name}`} title="Duplicate as new offer" className="ocx-tool" onClick={onDuplicate} disabled={busy}>
                <Copy size={13} />
              </button>
            )}
            {editable && (
              <button type="button" aria-label={`Edit ${o.name}`} title="Edit all offer details" className="ocx-tool" onClick={onEdit} disabled={busy}>
                <Pencil size={13} />
              </button>
            )}
            {(editable || !shown) && (
              <button type="button" aria-label={`Remove ${o.name} from month`} title="Remove from month plan" className="ocx-tool is-danger" onClick={onRemove} disabled={busy}>
                <Minus size={14} />
              </button>
            )}
            {editable && onDelete && (
              <button type="button" aria-label={`Delete ${o.name}`} title="Delete offer permanently" className="ocx-tool is-danger" onClick={onDelete} disabled={busy}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}
