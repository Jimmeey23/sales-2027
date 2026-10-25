import json, re, sys

src, out = sys.argv[1], sys.argv[2]
import html as H
WL = []  # (text, words[(x,text)])
for page in open(src, encoding='utf-8').read().split('<page ')[1:]:
    ws = [(float(a), float(b), H.unescape(c)) for a, b, c in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>(.*?)</word>', page)]
    ws.sort(key=lambda w: (w[1], w[0]))
    rows = []
    for x, y, t in ws:
        if rows and abs(rows[-1][0] - y) < 2.5: rows[-1][1].append((x, t))
        else: rows.append([y, [(x, t)]])
    prev = None
    for y, words in rows:
        words.sort()
        if prev is not None and y - prev > 14: WL.append(('', []))
        prev = y
        text = ' '.join(t for _, t in words)
        if text.startswith('P57 India · 2027 Annual Sales'): continue
        WL.append((text, words))
    WL.append(('', []))
lines = [t for t, _ in WL]

STUDIOS = {'KWALITY HOUSE': 'Kemps Corner', 'SUPREME HQ BANDRA': 'Bandra', 'KENKERE HOUSE': 'Kenkere House', 'BENGALURU POP-UPS': 'Pop-up'}
MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
STREAM = {'NEWCOMER': 'newcomer', 'WINBACK': 'lapsed', 'RENEWAL': 'renewal'}
LABELS = ['Commercial job','Mechanics','Stacked perks (no cash cost)','Stacked perks (no cash','Featured product','Effective discount','Expected revenue','Why it works','What to watch','Model']
head_re = re.compile(r'^(%s) · (%s)-2027$' % ('|'.join(STUDIOS), '|'.join(MONTHS)))
offer_re = re.compile(r'^(NEWCOMER|WINBACK|RENEWAL) OFFER · SELECTED( · PANEL PICK)?$')

def money(s):
    m = re.match(r'[−-]?₹([\d.,]+)([Lk])', s)
    if not m: return None
    v = float(m.group(1).replace(',', ''))
    return round(v * (100000 if m.group(2) == 'L' else 1000))

months, cur, i = [], None, 0
def nonblank(j):
    while j < len(lines) and not lines[j].strip(): j += 1
    return j

while i < len(lines):
    l = lines[i].strip()
    m = head_re.match(l)
    if m:
        cur = {'studio': STUDIOS[m.group(1)], 'month': MONTHS.index(m.group(2)) + 1, 'offers': []}
        months.append(cur)
        j = nonblank(i + 1); cur['theme'] = lines[j].strip()
        j = nonblank(j + 1); cur['hook'] = lines[j].strip()
        j += 1; job, moment, mode = [], [], None
        while not lines[j].strip().startswith('Month target'):
            t = lines[j].strip()
            if t.startswith('Commercial job:'): mode = job; t = t[len('Commercial job:'):].strip()
            elif t.startswith('Moment:'): mode = moment; t = t[len('Moment:'):].strip()
            if t and mode is not None: mode.append(t)
            j += 1
        cur['job'], cur['moment'] = ' '.join(job), ' '.join(moment)
        plan = {}
        k = j
        while len(plan) < 10:
            t = lines[k]; k += 1
            if not t.strip(): continue
            a = re.match(r'\s*(Month target|New-client plan|Renewal plan|Reactivation plan|Drop-ins, privates, retail)\s+(₹[\d.]+L)\s+(.*?)\s+(₹[\d.]+L \([^)]*\)|\d+ → \d+|\d+)$', t)
            if not a: raise SystemExit('plan line: ' + t)
            plan[a.group(1)] = money(a.group(2)); plan[a.group(3)] = a.group(4).strip()
        cur['plan'] = plan
        i = k; continue
    m = offer_re.match(l)
    if m:
        o = {'stream': STREAM[m.group(1)], 'panelPick': bool(m.group(2)), 'selected': True}
        j = nonblank(i + 1); o['name'] = lines[j].strip()
        j = nonblank(j + 1); o['tagline'] = lines[j].strip().strip('“”"')
        j += 1; fields, key = {}, None
        while True:
            t = lines[j]
            if t.strip().startswith('Alternatives considered') or offer_re.match(t.strip()) or head_re.match(t.strip()): break
            fm = re.match(r'^(%s)\s+(.*)$' % '|'.join(re.escape(x) for x in LABELS), t)
            if fm:
                key = fm.group(1); fields[key] = fm.group(2).strip()
            elif t.strip() == 'cost)': pass
            elif t.strip() and key: fields[key] += ' ' + t.strip()
            j += 1
        fields['Stacked perks'] = fields.pop('Stacked perks (no cash cost)', fields.pop('Stacked perks (no cash', None))
        o.update(fields)
        er = o['Expected revenue']
        o['buyers'] = int(re.search(r'(\d+) buyers', er).group(1))
        mm = re.search(r'= ([\d.]+) buyers × ₹([\d.]+)k ticket', o['Model'])
        o['modelBuyers'], o['ticket'] = float(mm.group(1)), round(float(mm.group(2)) * 1000)
        o['revenue'] = money(er.split(' ')[0])
        o['streamPlan'] = money(re.search(r'the (₹[\d.]+L) stream plan', er).group(1))
        o['effective'] = float(o['Effective discount'].rstrip('%'))
        cur['offers'].append(o)
        i = j; continue
    if l.startswith('Alternatives considered'):
        stream = cur['offers'][-1]['stream']
        j, rows, cols = i + 1, [], None
        while j < len(lines):
            t = lines[j]; s = t.strip()
            if offer_re.match(s) or head_re.match(s) or re.match(r'^\d\. ', s) or s.startswith('Alternatives considered'): break
            words = WL[j][1]
            if s.startswith('Option') and 'Job and mechanics' in s and 'Why' in s:
                d = {w: x for x, w in words}
                cols = [d['Option'], d['Job'], d['Effective'], d['Expected'], d['Why']]
                j += 1; continue
            if not s: j += 1; continue
            cells = [[] for _ in cols]
            for x, w in words:
                k = max(n for n in range(5) if cols[n] <= x + 4)
                cells[k].append(w)
            cells = [' '.join(c) for c in cells]
            if re.match(r'^[\d.]+%$', cells[2]) or not rows:
                rows.append({'o': [], 'j': [], 'w': [], 'nums': []})
            r = rows[-1]
            if cells[0]: r['o'].append(cells[0])
            r['j'].append(cells[1]); r['nums'].append(cells[2] + ' ' + cells[3]); r['w'].append(cells[4])
            j += 1
        for r in rows:
            name = ' '.join(r['o'])
            pick = '(pick)' in name
            name = name.replace('(pick)', '').strip()
            nm = re.match(r'^(.*?)\s*“(.*)”$', name)
            title, tag = (nm.group(1).strip(), nm.group(2)) if nm else (name, '')
            nums = ' '.join(r['nums'])
            eff = re.search(r'([\d.]+)%', nums); rev = re.search(r'(₹[\d.]+L)', nums); b = re.search(r'(\d+) buyers', nums)
            if not b: raise SystemExit(repr(r))
            why = ' '.join(x for x in r['w'] if x)
            job = ' '.join(x for x in r['j'] if x)
            jm = job.split('. ', 1)
            watch = None
            if 'Watch: ' in why: why, watch = why.split('Watch: ', 1)
            cur['offers'].append({'stream': stream, 'selected': False, 'panelPick': pick, 'name': title, 'tagline': tag,
                'Commercial job': jm[0].rstrip('.'), 'Mechanics': jm[1] if len(jm) > 1 else job,
                'effective': float(eff.group(1)), 'revenue': money(rev.group(1)), 'buyers': int(b.group(1)),
                'Why it works': why.strip(), 'What to watch': (watch or '').strip()})
        i = j; continue
    i += 1

json.dump(months, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(months), 'studio-months;', sum(len(m['offers']) for m in months), 'offers')
from collections import Counter
print(Counter((m['studio'], sum(o['selected'] for o in m['offers']), len(m['offers'])) for m in months))
