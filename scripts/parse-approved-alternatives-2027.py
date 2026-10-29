"""Add each slot's "Alternatives considered" to server/data/approved-plan-2027.json (needs pdfplumber).
Usage: python3 scripts/parse-approved-alternatives-2027.py plan.pdf server/data/approved-plan-2027.json"""
import json, re, sys
import pdfplumber

STUDIOS = {'KWALITY HOUSE': 'Kemps Corner', 'SUPREME HQ BANDRA': 'Bandra', 'KENKERE HOUSE': 'Kenkere House', 'BENGALURU POP-UPS': 'Pop-up'}
MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split()
SLOT = {'NEWCOMER': 'newcomer', 'WINBACK': 'lapsed', 'RENEWAL': 'renewal'}
head = re.compile(r'^(%s) · (%s)-2027$' % ('|'.join(STUDIOS), '|'.join(MONTHS)))
slot_re = re.compile(r'^(NEWCOMER|WINBACK|RENEWAL) OFFER · SELECTED')
flat = lambda s: re.sub(r'\s*\n\s*', ' ', (s or '').strip())

pdf_path, json_path = sys.argv[1], sys.argv[2]
plan = json.load(open(json_path, encoding='utf-8'))
index = {(m['studio'], m['month'], o['slot']): o for m in plan for o in m['offers']}
for o in index.values():
    o['alternatives'] = []

studio = month = slot = None
rows = []  # (key, cells) in reading order
with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        events = []
        for line in page.extract_text_lines():
            t = line['text'].strip()
            if head.match(t) or slot_re.match(t):
                events.append((line['top'], 'mark', t))
        for table in page.find_tables():
            data = table.extract()
            if data and data[0] and data[0][0] == 'Option':
                events.append((table.bbox[1], 'table', data[1:]))
        for _, kind, val in sorted(events, key=lambda e: e[0]):
            if kind == 'mark':
                mh = head.match(val)
                if mh:
                    studio, month = STUDIOS[mh.group(1)], MONTHS.index(mh.group(2)) + 1
                else:
                    slot = SLOT[slot_re.match(val).group(1)]
                continue
            for cells in val:
                cells = [c or '' for c in cells] + [''] * 5
                opt = cells[0].strip()
                if rows and rows[-1][0] == (studio, month, slot) and (not opt or opt.startswith(('Auditor', '“'))):
                    prev = rows[-1][1]  # a row split across pages
                    if opt: prev[0] += '\n' + opt
                    for i in range(1, 5):
                        if cells[i].strip(): prev[i] = (prev[i] + '\n' + cells[i]).strip()
                else:
                    rows.append(((studio, month, slot), cells[:5]))

for key, (opt, details, eff, exp, why) in rows:
    name = re.split(r'\n“', opt, 1)[0]
    tag = re.search(r'“(.*?)”', opt, re.S)
    auditor = re.search(r'Auditor (\d+)/25', opt)
    d = flat(details)
    fields = {}
    for label, nxt in [('Job', 'Who'), ('Who', 'Pay'), ('Pay', 'Get'), ('Get', 'When'), ('When', 'Rules'), ('Rules', None)]:
        mm = re.search(label + r': (.*?)' + (r'(?= ' + nxt + r': |$)' if nxt else r'$'), d)
        if mm: fields[label] = mm.group(1).strip()
    revenue = re.search(r'₹([\d.]+)L', exp)
    buyers = re.search(r'(\d+) buyers', exp)
    index[key]['alternatives'].append({
        'name': flat(name),
        'tagline': flat(tag.group(1)) if tag else '',
        'auditor': int(auditor.group(1)) if auditor else None,
        'fields': fields,
        'effectiveDiscount': float(eff.strip('%')) if eff.strip() else 0,
        'expectedRevenue': round(float(revenue.group(1)) * 100000) if revenue else 0,
        'buyers': int(buyers.group(1)) if buyers else 0,
        'why': flat(why),
    })
json.dump(plan, open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
