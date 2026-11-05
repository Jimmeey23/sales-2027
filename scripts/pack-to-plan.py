#!/usr/bin/env python3
"""Convert the P57 2027 Sales Plan Pack into one `p57-sales-plan/1` portfolio document.

The pack (folder of .xlsx target workbooks and .docx playbooks) is the source of truth.
Targets, streams and funnel come from each studio's `<Studio>_2_Targets_2027.xlsx`
('Monthly Targets' sheet); month themes, focus, offers, activation, weekly plan and
channels come from `<Studio>_3_Sales_Playbook_2027.docx`.

    python3 scripts/pack-to-plan.py ~/Downloads/P57_2027_Sales_Plan_Pack > plan.json

Needs openpyxl, and macOS `textutil` to read the .docx files.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import openpyxl

STUDIOS = {  # pack file prefix -> app studio name
    'Kemps_Corner': 'Kemps Corner',
    'Bandra': 'Bandra',
    'Kenkere_House': 'Kenkere House',
    'Pop-ups': 'Pop-up',
}
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
          'September', 'October', 'November', 'December']
MON3 = {m[:3]: i + 1 for i, m in enumerate(MONTHS)}
SLOT = {'Newcomer': 'newcomer', 'Winback': 'lapsed', 'Renewal': 'renewal', 'Revenue booster': 'upsell'}
OFFER_TYPE = {'newcomer': 'New clients', 'lapsed': 'Win-back', 'renewal': 'Renewal', 'upsell': 'Revenue boost'}
FIELDS = ['Client gets', 'Who', 'When', 'Price', 'Effective discount', 'Commercial job', 'Why it works', 'Target']


def money(text):
    m = re.search(r'₹\s*([\d,]+)', text or '')
    return int(m.group(1).replace(',', '')) if m else None


def docx_text(path):
    return subprocess.run(['textutil', '-convert', 'txt', '-stdout', str(path)],
                          capture_output=True, text=True, check=True).stdout


def targets(path):
    ws = openpyxl.load_workbook(path, data_only=True)['Monthly Targets']
    rows = list(ws.iter_rows(values_only=True))
    head = next(i for i, r in enumerate(rows) if r and r[0] == 'Month')
    cols = [str(c or '').strip() for c in rows[head]]
    out = {}
    for r in rows[head + 1:head + 13]:
        rec = dict(zip(cols, r))
        out[rec['Month'].month] = rec
    return cols, out


def col(rec, *names):
    for n in names:
        for k, v in rec.items():
            if k.lower().startswith(n.lower()) and isinstance(v, (int, float)):
                return v
    return None


def validity(when, month):
    """'2–31 Jan; buy within…' -> ISO start/end in 2027."""
    m = re.search(r'(\d{1,2})\s*(?:([A-Z][a-z]{2})\s*)?[–-]\s*(\d{1,2})\s*([A-Z][a-z]{2})', when or '')
    if not m:
        return f'2027-{month:02d}-01', None
    d1, m1, d2, m2 = m.groups()
    m2n = MON3.get(m2, month)
    m1n = MON3.get(m1, m2n) if m1 else m2n
    return f'2027-{m1n:02d}-{int(d1):02d}', f'2027-{m2n:02d}-{int(d2):02d}'


def months_from_playbook(text):
    lines = [l.rstrip() for l in text.splitlines()]
    starts = [i for i, l in enumerate(lines) if re.match(rf'^({"|".join(MONTHS)}) 2027: ', l)]
    out = {}
    for n, s in enumerate(starts):
        block = lines[s:starts[n + 1] if n + 1 < len(starts) else len(lines)]
        name, theme = block[0].split(' 2027: ', 1)
        month = MONTHS.index(name) + 1
        get = lambda prefix: next((l[len(prefix):].strip() for l in block if l.startswith(prefix)), '')
        offers, i = [], 0
        while i < len(block):
            m = re.match(r'^(Newcomer|Winback|Renewal|Revenue booster): (.+)$', block[i])
            if not m:
                i += 1
                continue
            kind, oname = m.groups()
            o = {'kind': kind, 'name': oname.strip(), 'headline': block[i + 1].strip().strip('“”"')}
            j = i + 2
            while j < len(block) and not re.match(r'^(Newcomer|Winback|Renewal|Revenue booster): |^Activation$', block[j]):
                if block[j] in FIELDS and j + 1 < len(block):
                    o[block[j]] = block[j + 1].strip()
                    j += 2
                else:
                    j += 1
            offers.append(o)
            i = j
        idx = lambda label: next((k for k, l in enumerate(block) if l.strip() == label), None)
        act_i, wk_i, ch_i = idx('Activation'), idx('Week by week'), idx('Channels')
        activation = ' '.join(block[act_i + 1:wk_i]).strip() if act_i is not None and wk_i else ''
        weeks = [re.sub(r'^\s*•\s*', '', l).strip() for l in block[(wk_i or 0) + 1:ch_i or 0] if l.strip()]
        channels = ' '.join(block[ch_i + 1:]).strip() if ch_i is not None else ''
        out[month] = dict(theme=theme.strip(), focus=get('Focus: '), meaning=get('What it means. '),
                          offers=offers, activation=activation, weeks=weeks, channels=channels)
    return out


def offer_doc(o, month, rank):
    slot = SLOT[o['kind']]
    price, listp = money(o.get('Price')), None
    lm = re.search(r'list\s*₹\s*([\d,]+)', o.get('Price', ''))
    if lm:
        listp = int(lm.group(1).replace(',', ''))
    buyers = re.match(r'\s*(\d+)', o.get('Target', ''))
    buyers = int(buyers.group(1)) if buyers else 0  # 'Upside only' offers carry no unit target
    disc = re.match(r'\s*([\d.]+)%', o.get('Effective discount', ''))
    start, end = validity(o.get('When'), month)
    return {
        'name': o['name'], 'slot': slot, 'rank': rank,
        'headline': o['headline'],
        'benefit': o.get('Client gets', ''),
        'customerCopy': f"{o['headline']}\n{o.get('Client gets', '')}",
        'audience': o.get('Who', ''),
        'conditions': f"When: {o.get('When', '')}\nNo stacking with standing perks. Max effective discount 25%.",
        'objective': o.get('Commercial job', ''),
        'rationale': o.get('Why it works', ''),
        'offerType': OFFER_TYPE[slot],
        'price': price, 'ticket': price, 'buyers': buyers,
        'expectedRevenue': price * buyers if price and buyers else None,
        'discountPercent': float(disc.group(1)) if disc else None,
        'validityStart': start, 'validityEnd': end,
        'kpi': o.get('Target', ''),
        'mechanics': {'listPrice': listp, 'when': o.get('When', ''), 'priceText': o.get('Price', '')},
        'status': 'draft', 'approval': 'pending',
    }


def studio_block(pack, prefix, name):
    _, tg = targets(pack / '2_Targets' / f'{prefix}_2_Targets_2027.xlsx')
    pb = months_from_playbook(docx_text(pack / '3_Playbooks' / f'{prefix}_3_Sales_Playbook_2027.docx'))
    months = []
    for m in range(1, 13):
        t, p = tg[m], pb.get(m, {})
        leads, visits = col(t, 'Leads'), col(t, 'First visits')
        paying, members = col(t, 'New paying clients', 'New clients'), col(t, 'of which new members', 'New members')
        ren, due, wb = col(t, 'Renewals to sell'), col(t, 'Renewals due'), col(t, 'Winbacks')
        sections = [{'title': f'Week {k + 1}', 'items': [{'label': '', 'value': '', 'detail': re.sub(r'^W\d[^:]*:\s*', '', w)}]}
                    for k, w in enumerate(p.get('weeks', []))]
        months.append({
            'month': m,
            'theme': p.get('theme', ''),
            'focus': p.get('focus', ''),
            'objective': p.get('focus', ''),
            'strategy': p.get('meaning', ''),
            'notes': '\n'.join(x for x in [
                f"Activation: {p['activation']}" if p.get('activation') else '',
                f"Channels: {p['channels']}" if p.get('channels') else ''] if x),
            'target': round(col(t, '2027 target')),
            'priorYear': round(col(t, '2026 actual') or 0),
            'streams': {'newClient': round(col(t, 'New-client revenue') or 0),
                        'renewal': round(col(t, 'Renewal revenue') or 0),
                        'reactivation': round(col(t, 'Reactivation revenue') or 0),
                        'other': round(col(t, 'Add-on revenue') or 0)},
            'funnel': {'leads': leads, 'trials': visits, 'buyers': paying, 'newBuyers': paying,
                       'newMembers': members, 'renewals': ren, 'renewalsDue': due,
                       'renewalCoverage': (ren / due) if ren and due else None, 'winbacksNeeded': wb,
                       'source': 'P57_2027_Sales_Plan_Pack'},
            'sections': sections,
            'status': 'draft',
            'offers': [offer_doc(o, m, k + 1) for k, o in enumerate(p.get('offers', []))],
        })
    return {'studio': {'name': name}, 'months': months}


def main():
    pack = Path(sys.argv[1]).expanduser()
    doc = {'schema': 'p57-sales-plan/1', 'year': 2027, 'version': 'P57_2027_Sales_Plan_Pack',
           'studios': [studio_block(pack, p, n) for p, n in STUDIOS.items()]}
    json.dump(doc, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
