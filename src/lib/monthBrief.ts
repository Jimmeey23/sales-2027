// Imported portfolio briefs and round-tripped workspace exports use different
// shapes. Normalize only their presentation; never rewrite the saved plan.
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : value == null ? [] : [value]);
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/** Read text rather than coercing objects (or React elements) into strings. */
export function briefText(value: unknown, depth = 0): string {
  if (depth > 6 || value == null || typeof value === 'boolean') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (Array.isArray(value)) return unique(value.map(item => briefText(item, depth + 1))).join(' · ');
  const obj = record(value);
  for (const key of [
    'text',
    'summary',
    'description',
    'headline',
    'title',
    'name',
    'label',
    'message',
    'rule',
    'detail',
  ]) {
    const text = briefText(obj[key], depth + 1);
    if (text) return text;
  }
  return Object.entries(obj)
    .map(([key, item]) => {
      const text = briefText(item, depth + 1);
      const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
      return text ? `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${text}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

export interface BriefChannel {
  label: string;
  due: string;
}
export interface BriefPiece {
  offer: string;
  headline: string;
  detail: string;
  copy: string;
  channels: BriefChannel[];
}
export interface BriefSend {
  label: string;
  audience: string;
  offers: string[];
  message: string;
  note: string;
  day: string;
  channel: string;
}
export interface MonthBriefData {
  present: boolean;
  focus: string;
  studioRole: string;
  filedRevenue: number | null;
  collateralTitle: string;
  collateralSubtitle: string;
  pieces: BriefPiece[];
  crmRule: string;
  sends: BriefSend[];
  reportedSends: number | null;
}

function finiteNumber(value: unknown): number | null {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
const dayOf = (value: unknown) => {
  const text = briefText(value);
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text)) return text;
  const date = new Date(text);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : text;
};

export function monthBrief(content: unknown, offers: readonly unknown[] = []): MonthBriefData {
  const source = record(content);
  const collateral = record(source.collateral);
  const crm = record(source.crm);
  const names = new Map<string, string>();
  for (const value of offers) {
    const offer = record(value);
    const origin = record(offer.provenance);
    const name = briefText(offer.name);
    if (!name) continue;
    for (const id of [offer.id, offer.offer_uid, origin.bankId, origin.planId]) {
      if (typeof id === 'number' || typeof id === 'string') names.set(String(id), name);
    }
  }
  const offerName = (value: unknown) => {
    const obj = record(value);
    const text = briefText(obj.name ?? obj.offerId ?? obj.id ?? value);
    return names.get(text) || text;
  };
  const pieces = list(collateral.pieces).map((value, index): BriefPiece => {
    const piece = record(value);
    const copy = record(piece.copy);
    return {
      offer:
        offerName(piece.offer ?? piece.offerId ?? piece.offer_id) ||
        briefText(piece.title) ||
        `Collateral ${index + 1}`,
      headline: briefText(piece.headline) || briefText(copy.headline),
      detail:
        briefText(piece.detail) ||
        briefText(copy.detail) ||
        briefText(piece.description) ||
        (typeof value === 'string' ? value.trim() : ''),
      copy:
        typeof piece.copy === 'string'
          ? piece.copy.trim()
          : briefText(copy.waLaunchText ?? copy.body ?? copy.text ?? copy.intro),
      channels: list(piece.channels)
        .map(value => {
          const channel = record(value);
          return { label: briefText(channel.title ?? channel.label ?? channel.key ?? value), due: dayOf(channel.due) };
        })
        .filter(channel => channel.label),
    };
  });
  const sends = list(crm.sends).map((value): BriefSend => {
    const send = record(value);
    return {
      label: briefText(send.label ?? send.title),
      audience: briefText(send.audience),
      offers: unique(list(send.offers ?? send.offer ?? send.offerId ?? send.offer_id).map(offerName)),
      message: briefText(send.message) || briefText(send.copy) || (typeof value === 'string' ? value.trim() : ''),
      note: briefText(send.note),
      day: briefText(send.day) || dayOf(send.date),
      channel: briefText(send.channel),
    };
  });
  const filedRevenue = finiteNumber(source.offersPlannedRevenue);
  return {
    present: Boolean(source.focus || source.studioRole || source.collateral || source.crm || filedRevenue !== null),
    focus: briefText(source.focus),
    studioRole: briefText(source.studioRole),
    filedRevenue,
    collateralTitle: briefText(collateral.title) || 'Collateral to produce',
    collateralSubtitle:
      briefText(collateral.subtitle) || (typeof source.collateral === 'string' ? source.collateral.trim() : ''),
    pieces,
    crmRule: briefText(crm.rule) || (typeof source.crm === 'string' ? source.crm.trim() : ''),
    sends,
    reportedSends: finiteNumber(crm.sendsCount),
  };
}
