import json,sys
root=sys.argv[1]
d=json.load(open(root+'/server/data/approved-plan-2027.json'))
order={'Kemps Corner':0,'Bandra':1,'Kenkere House':2,'Pop-up':3}
d.sort(key=lambda e:(order[e['studio']],e['month']))
out=[]
for e in d:
    out.append({k:e[k] for k in ['studio','month','theme','hook','job','moment','figures']}|{'offers':[{'slot':o['slot'],'name':o['name'],'tagline':o['tagline'],'fields':o['fields']} for o in e['offers']]})
s=json.dumps(out,ensure_ascii=False,indent=1)
hdr='''// Final approved 2027 Sales and Offer Plan, generated from server/data/approved-plan-2027.json
// (alternatives omitted). Every plan, guide and offer text in src/data derives from this.
export type ApprovedStudio = 'Kemps Corner' | 'Bandra' | 'Kenkere House' | 'Pop-up';
export type ApprovedSlot = 'newcomer' | 'lapsed' | 'renewal';
export interface ApprovedOffer {
  slot: ApprovedSlot;
  name: string;
  tagline: string;
  fields: Record<string, string[]>;
}
export interface ApprovedEntry {
  studio: ApprovedStudio;
  month: number;
  theme: string;
  hook: string;
  job: string;
  moment: string;
  figures: {
    target: number;
    projected: number;
    newClientPlan: number;
    renewalPlan: number;
    reactivationPlan: number;
    otherPlan: number;
    leadsTrials: number[];
    renewals: number[];
    lapsed: number[];
    newBuyers: number;
  };
  offers: ApprovedOffer[];
}

export const APPROVED_PLAN_2027: ApprovedEntry[] = '''
tail='''

export const APPROVED_STUDIOS: ApprovedStudio[] = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];

export function approvedEntry(studio: string, month: number): ApprovedEntry | undefined {
  return APPROVED_PLAN_2027.find(e => e.studio === studio && e.month === month);
}

/** The flagship (Kemps Corner) entry stands for the month where a screen is not studio-specific. */
export function approvedMonth(month: number): ApprovedEntry {
  return approvedEntry('Kemps Corner', Math.min(12, Math.max(1, month)))!;
}

export function approvedOffer(entry: ApprovedEntry | undefined, slot: ApprovedSlot): ApprovedOffer | undefined {
  return entry?.offers.find(o => o.slot === slot);
}

/** A field as one line of text. */
export function field(offer: ApprovedOffer | undefined, key: string, sep = ' '): string {
  return (offer?.fields[key] || []).map(s => s.replace(/^•\\s*/, '')).join(sep).trim();
}
'''
open(root+'/src/data/approvedPlan2027.ts','w').write(hdr+s+';'+tail)
