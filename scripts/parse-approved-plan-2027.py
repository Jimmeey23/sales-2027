"""Parse the exported 2027 Sales and Offer Plan PDF text (pdftotext, no -layout) into JSON.
Usage: pdftotext plan.pdf plan.txt && python3 scripts/parse-approved-plan-2027.py plan.txt > server/data/approved-plan-2027.json"""
import json, re, sys

STUDIOS = {'KWALITY HOUSE': 'Kemps Corner', 'SUPREME HQ BANDRA': 'Bandra', 'KENKERE HOUSE': 'Kenkere House', 'BENGALURU POP-UPS': 'Pop-up'}
MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split()
KEYS = ['Journey', 'Commercial job', 'Who qualifies', 'You pay', 'You get', 'When', 'Rules', 'Effective discount',
        'Expected revenue', 'Rate of sale', 'Why it works', 'What to watch', 'Offer auditor', 'Model']
SLOT = {'NEWCOMER': 'newcomer', 'WINBACK': 'lapsed', 'RENEWAL': 'renewal'}
FIGS = {'Month target': 'target', 'Projected with selected offers': 'projected', 'New-client plan': 'newClientPlan',
        'Renewal plan': 'renewalPlan', 'Reactivation plan': 'reactivationPlan', 'Drop-ins, privates, retail': 'otherPlan'}

lines = [l.rstrip().lstrip('\f') for l in open(sys.argv[1], encoding='utf-8')]
lines = [l for l in lines if not l.startswith('P57 India · 2027 Annual') and not re.fullmatch(r'\d+ / 161', l)]
head = re.compile(r'^(%s) · (%s)-2027$' % ('|'.join(STUDIOS), '|'.join(MONTHS)))
starts = [i for i, l in enumerate(lines) if head.match(l)]
lakh = lambda s: round(float(re.search(r'₹([\d.]+)L', s).group(1)) * 100000)

out = []
for n, s in enumerate(starts):
    block = lines[s:starts[n + 1] if n + 1 < len(starts) else len(lines)]
    m = head.match(block[0])
    body = [l for l in block[1:]]
    text = '\n'.join(body)
    nonblank = [l for l in body if l.strip()]
    theme, hook = nonblank[0], nonblank[1]
    job = re.search(r'Commercial job: (.*?)\nMoment:', text, re.S).group(1).replace('\n', ' ')
    moment = re.search(r'\nMoment: (.*?)\nMonth target', text, re.S).group(1).replace('\n', ' ')
    figs = {}
    for label, key in FIGS.items():
        mm = re.search(re.escape(label) + r'\s*\n+\s*(₹[\d.]+L)', text)
        if mm: figs[key] = lakh(mm.group(1))
    # Some pages extract the right-hand column after the labels, so read the header figures in order.
    header = text[text.index('Month target'):text.index('OFFER · SELECTED')]
    mm = re.search(r'(₹[\d.]+L) \([+−-]', header)
    if mm: figs['projected'] = lakh(mm.group(1))
    pairs = re.findall(r'(?m)^\s*(\d+) → (\d+)\s*$', header)
    for key, (a, b) in zip(['leadsTrials', 'renewals', 'lapsed'], pairs):
        figs[key] = [int(a), int(b)]
    mm = re.search(r'(?m)^\s*(\d+)\s*$', header[header.rindex('→'):])
    if mm: figs['newBuyers'] = int(mm.group(1))
    offers = []
    for om in re.finditer(r'(NEWCOMER|WINBACK|RENEWAL) OFFER · SELECTED[^\n]*\n+(.+?)\n(“.*?”)\n(.*?)(?=\nAlternatives considered)', text, re.S):
        fields, cur = {}, None
        for l in om.group(4).split('\n'):
            if l.strip() in KEYS: cur = l.strip(); fields[cur] = []; continue
            if cur and l.strip(): fields[cur].append(l.strip())
        f = {}
        for k, v in fields.items():
            joined = []
            for l in v:  # rejoin wrapped lines; keep bullets as separate items
                if l.startswith('•') or not joined: joined.append(l)
                else: joined[-1] += ' ' + l
            f[k] = joined
        offers.append({'slot': SLOT[om.group(1)], 'name': om.group(2).strip(), 'tagline': om.group(3).strip('“”'), 'fields': f})
    out.append({'studio': STUDIOS[m.group(1)], 'month': MONTHS.index(m.group(2)) + 1, 'theme': theme, 'hook': hook,
                'job': job, 'moment': moment, 'figures': figs, 'offers': offers})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
