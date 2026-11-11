#!/usr/bin/env python3
"""Build the 2027 team comms pack from server/data/approved-plan-2027.json + content.py.

Outputs (docs/comms-2027/):
  anniversary-plan-2027.html        redesigned 9th anniversary plan ("Nine Lives")
  emails/00-annual-overview.html    year strategy, traffic, offers + collateral (inline styles)
  emails/01-january.html … 12-december.html   friendly monthly offer emails
  calendar/index.html               interactive annual offer calendar
  calendar/p57-offers-2027.ics      Google / Apple Calendar import

Run: python3 scripts/comms2027/build.py
"""
import datetime as dt
import html
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from content import (ACCENT, ANNIV, BASE_COLLATERAL, CITY, MONTH_COLLATERAL, MONTH_COPY, SEASONAL,  # noqa: E402
                     STUDIOS)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'comms-2027'
YEAR = 2027
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
          'November', 'December']
MON = {m[:3].lower(): i + 1 for i, m in enumerate(MONTHS)}
SHORT = {'Kemps Corner': 'KC', 'Bandra': 'BA', 'Kenkere House': 'KH', 'Pop-up': 'Pop'}
SLOT_LABEL = {'newcomer': 'New clients', 'lapsed': 'Win-back', 'renewal': 'Members & renewals'}
SLOT_COLOR = {'newcomer': '#1f6a57', 'lapsed': '#a2712f', 'renewal': '#2b5c85', 'activation': '#7a3b56',
              'seasonal': '#6b6458', 'deadline': '#b4532a'}

# palette (Atelier)
INK, SOFT, MUTED, LINE, CANVAS, PAPER, GOLD, GOLD_SOFT = ('#24211c', '#4a453c', '#7a7266', '#e6dfd2', '#f7f3ec',
                                                          '#ffffff', '#b08d4a', '#f3ead8')
SERIF = "Georgia,'Times New Roman',serif"
SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif"

e = html.escape
plan = json.loads((ROOT / 'server/data/approved-plan-2027.json').read_text())


def inr(n):
    """Indian-format rupees: ₹1,05,40,000 → short form ₹1.05 Cr / ₹33.0L."""
    if n >= 1e7:
        return f'₹{n / 1e7:.2f} Cr'
    if n >= 1e5:
        return f'₹{n / 1e5:.1f}L'
    if n >= 1e3:
        return f'₹{n / 1e3:.1f}k'
    return f'₹{n:,.0f}'


def d(m, day):
    return dt.date(YEAR, m, day)


def month_end(m):
    return (d(m + 1, 1) - dt.timedelta(days=1)) if m < 12 else d(12, 31)


# ---------------------------------------------------------------- "When" parser
def parse_when(text, m):
    t = text.replace('–', '-').replace('—', '-').strip().rstrip('.')
    low = t.lower()
    ms, me = d(m, 1), month_end(m)

    def dm(day, mon=None):
        return d(MON[mon[:3].lower()] if mon else m, int(day))

    if low.startswith('all ') or low.startswith('every') or low.startswith('monthly'):
        return ms, me
    if 'diwali week' in low:
        return d(10, 25), d(10, 31)
    if 'reunion mid-march' in low:
        return d(3, 13), d(3, 22)
    if low.startswith('squads start'):
        return ms, d(m, 17)
    r = re.search(r'(\d{1,2})\s*([A-Za-z]{3})?[a-z]*\s*-\s*(\d{1,2})\s*([A-Za-z]{3})', t)
    if r:
        a = dm(r.group(1), r.group(2) or r.group(4))
        b = dm(r.group(3), r.group(4))
        return a, b
    r = re.search(r'(?:buy|book) by (\d{1,2}) ([A-Za-z]{3})', low)
    if r:
        days = re.findall(r'(\d{1,2}) ([a-z]{3})', low)
        last = days[-1] if '/' in low else days[0]
        end = dm(*last)
        if low.startswith('buy by 7 feb'):  # scaled entries allowed to 15 Feb
            end = d(2, 15)
        return ms, end
    r = re.search(r'from (\d{1,2}) ([a-z]{3})', low)
    if r:
        start = dm(r.group(1), r.group(2))
        end = d(5, 31) if start.month == 4 else d(12, 31)
        return start, end
    raise ValueError(f'Unparsed When: {text!r} (month {m})')


# ---------------------------------------------------------------- month data
def offers_for_month(m):
    """Grouped offers for a month: name -> {slot, tagline, studios, fields{field:{studio:val}}, start, end}."""
    grouped = OrderedDict()
    for entry in plan:
        if entry['month'] != m:
            continue
        if m == 4 and entry['studio'] != 'Pop-up':
            continue  # replaced by the Nine Lives anniversary plan
        for o in entry['offers']:
            g = grouped.setdefault(o['name'], {'slot': o['slot'], 'tagline': o['tagline'], 'studios': [],
                                               'fields': OrderedDict(), 'source': 'approved'})
            g['studios'].append(entry['studio'])
            for k, v in o['fields'].items():
                g['fields'].setdefault(k, OrderedDict())[entry['studio']] = ' '.join(v)
            when = o['fields'].get('When', ['All month'])[0]
            g['start'], g['end'] = parse_when(when, m)
    if m == 4:
        for o in ANNIV['offers']:
            if o.get('model_only'):
                continue
            studios = [s for s in STUDIOS if s != 'Pop-up' or o['name'] in ('Cloud Nine Intro', 'The 9:09 Flash Pack',
                                                                         'Nine Years, Nine Reasons', 'Gift Nine',
                                                                         'Nine Lives merch capsule',
                                                                         'Lock In Before You Clock Out')]
            f = OrderedDict()
            for k, key in [('Who qualifies', 'who'), ('You pay', 'pay'), ('When', 'when'), ('Effective discount', 'disc')]:
                f[k] = {s: o[key] for s in studios}
            f['You get'] = {s: ' '.join('• ' + x for x in o['get']) for s in studios}
            grouped[o['name']] = {'slot': o['slot'], 'tagline': o['tagline'], 'studios': studios, 'fields': f,
                                  'start': d(*o['start']), 'end': d(*o['end']), 'source': 'anniv', 'emoji': o['emoji']}
    if m == 3:
        p = ANNIV['presale']
        studios = ['Kemps Corner', 'Bandra', 'Kenkere House']
        grouped[p['name']] = {'slot': 'renewal', 'tagline': 'Renew in March, get the anniversary first.',
                              'studios': studios, 'source': 'anniv',
                              'fields': OrderedDict([('You get', {s: p['body'] for s in studios}),
                                                     ('When', {s: p['when'] for s in studios}),
                                                     ('Effective discount', {s: '23.1% Mumbai · 23.0% Bengaluru' for s in studios})]),
                              'start': d(3, 25), 'end': d(3, 31)}
    return grouped


def figures(m):
    rows = OrderedDict()
    for entry in plan:
        if entry['month'] == m:
            f = entry['figures']
            rows[entry['studio']] = {
                'target': f['target'], 'leads': f['leadsTrials'][0], 'trials': f['leadsTrials'][1],
                'due': f['renewals'][0], 'renew': f['renewals'][1], 'lapsed': f['lapsed'][0],
                'winback': f['lapsed'][1], 'newBuyers': f['newBuyers'], 'new': f['newClientPlan'],
                'ren': f['renewalPlan'], 'react': f['reactivationPlan'], 'other': f['otherPlan'],
                'theme': entry['theme'], 'hook': entry['hook'], 'job': entry['job'], 'moment': entry['moment']}
    return rows


def total(rows, k):
    return sum(r[k] for r in rows.values())


# ---------------------------------------------------------------- anniversary revenue model
def anniv_model():
    lines = []
    for o in ANNIV['offers']:
        per = {}
        if 'units3' in o:
            p3 = {'Mumbai': 52070, 'Bengaluru': 37989}
            p6 = {'Mumbai': 102344, 'Bengaluru': 73994}
            for i, s in enumerate(STUDIOS):
                c = CITY[s]
                per[s] = (o['units3'][i] + o['units6'][i], o['units3'][i] * p3[c] + o['units6'][i] * p6[c])
        else:
            for i, s in enumerate(STUDIOS):
                per[s] = (o['units'][i], o['units'][i] * o['price'][CITY[s]])
        lines.append({'name': o['name'], 'stream': o['stream'], 'per': per,
                      'units': sum(v[0] for v in per.values()), 'rev': sum(v[1] for v in per.values())})
    return lines


MODEL = anniv_model()
APR = figures(4)
APR_TARGET = total(APR, 'target')
MODEL_TOTAL = sum(x['rev'] for x in MODEL)

# ---------------------------------------------------------------- email building blocks (inline only)


def wrap_email(title, preheader, body, accent=INK):
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><title>{e(title)}</title></head>
<body style="margin:0;padding:0;background:{CANVAS};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{CANVAS};">{e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{CANVAS};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:{PAPER};border:1px solid {LINE};border-radius:14px;overflow:hidden;">
<tr><td style="height:6px;background:{accent};font-size:0;line-height:0;">&nbsp;</td></tr>
{body}
<tr><td style="padding:22px 32px 28px;border-top:1px solid {LINE};font-family:{SANS};font-size:12px;line-height:18px;color:{MUTED};">
Physique 57 India · 2027 Sales &amp; Offer Plan<br>
Numbers come from the approved 2027 plan in P57 Sales Intelligence Studio. Questions? Just hit reply. 💛
</td></tr>
</table></td></tr></table></body></html>'''


def hero(kicker, title, sub, accent=INK, emoji=''):
    return f'''<tr><td style="padding:34px 32px 26px;background:{accent};">
<div style="font-family:{SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{GOLD_SOFT};">{e(kicker)}</div>
<div style="font-family:{SERIF};font-size:34px;line-height:40px;color:#ffffff;margin-top:10px;">{emoji}{e(title)}</div>
<div style="font-family:{SANS};font-size:15px;line-height:23px;color:#efe9df;margin-top:10px;">{e(sub)}</div>
</td></tr>'''


def section(title, inner, kicker=''):
    k = (f'<div style="font-family:{SANS};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:{GOLD};'
         f'margin-bottom:6px;">{e(kicker)}</div>') if kicker else ''
    return f'''<tr><td style="padding:26px 32px 4px;">{k}
<div style="font-family:{SERIF};font-size:22px;line-height:28px;color:{INK};padding-bottom:10px;border-bottom:2px solid {GOLD};display:inline-block;">{e(title)}</div>
<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>{inner}</td></tr>'''


def p(text, size=15, color=SOFT, extra=''):
    return f'<p style="margin:0 0 12px;font-family:{SANS};font-size:{size}px;line-height:{int(size * 1.55)}px;color:{color};{extra}">{text}</p>'


def kpis(items, accent=INK):
    cells = ''.join(
        f'''<td width="{100 // len(items)}%" valign="top" style="padding:4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{CANVAS};border:1px solid {LINE};border-radius:10px;">
<tr><td style="padding:14px 12px;">
<div style="font-family:{SANS};font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:{MUTED};">{e(lab)}</div>
<div style="font-family:{SERIF};font-size:24px;line-height:30px;color:{accent};margin-top:4px;">{e(val)}</div>
<div style="font-family:{SANS};font-size:12px;line-height:16px;color:{MUTED};margin-top:2px;">{e(note)}</div>
</td></tr></table></td>''' for lab, val, note in items)
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>{cells}</tr></table>'


def table(head, rows, align=None, foot=None, accent=INK):
    align = align or (['left'] + ['right'] * (len(head) - 1))
    th = ''.join(f'<th align="{a}" style="padding:9px 8px;font-family:{SANS};font-size:10px;letter-spacing:1px;'
                 f'text-transform:uppercase;color:#fff;background:{accent};font-weight:600;">{e(h)}</th>'
                 for h, a in zip(head, align))
    body = ''
    for i, r in enumerate(rows):
        bg = PAPER if i % 2 == 0 else CANVAS
        body += '<tr>' + ''.join(
            f'<td align="{a}" style="padding:8px;font-family:{SANS};font-size:13px;line-height:18px;color:{INK};'
            f'background:{bg};border-bottom:1px solid {LINE};">{c}</td>' for c, a in zip(r, align)) + '</tr>'
    if foot:
        body += '<tr>' + ''.join(
            f'<td align="{a}" style="padding:9px 8px;font-family:{SANS};font-size:13px;font-weight:700;color:{INK};'
            f'background:{GOLD_SOFT};">{c}</td>' for c, a in zip(foot, align)) + '</tr>'
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;'
            f'border:1px solid {LINE};border-radius:8px;overflow:hidden;">{th and "<tr>" + th + "</tr>"}{body}</table>')


def pill(text, color):
    return (f'<span style="display:inline-block;padding:3px 9px;margin:0 4px 4px 0;border-radius:999px;background:{color};'
            f'color:#fff;font-family:{SANS};font-size:11px;line-height:14px;font-weight:600;">{e(text)}</span>')


def studio_pills(studios):
    return ''.join(pill(s, ACCENT[s]) for s in studios)


def fmt_range(a, b):
    if a == b:
        return f'{a.day} {MONTHS[a.month - 1][:3]}'
    if a.month == b.month:
        return f'{a.day}–{b.day} {MONTHS[a.month - 1][:3]}'
    return f'{a.day} {MONTHS[a.month - 1][:3]} – {b.day} {MONTHS[b.month - 1][:3]}'


def field_html(vals):
    """vals: {studio: text}. One line if identical, else per studio."""
    uniq = list(OrderedDict.fromkeys(vals.values()))
    if len(uniq) == 1:
        return bulletize(uniq[0])
    return ''.join(f'<div style="margin-bottom:4px;"><b style="color:{ACCENT[s]};">{SHORT[s]}:</b> {bulletize(v)}</div>'
                   for s, v in vals.items())


def bulletize(text):
    parts = [x.strip() for x in text.split('•') if x.strip()]
    if len(parts) <= 1:
        return e(text.replace('•', '').strip())
    return '<br>'.join('• ' + e(x) for x in parts)


SHOW_FIELDS = ['Who qualifies', 'You pay', 'You get', 'When', 'Rules', 'Effective discount']


def offer_card(name, g):
    color = SLOT_COLOR[g['slot']]
    rows = ''
    for k in SHOW_FIELDS:
        if k in g['fields']:
            rows += (f'<tr><td valign="top" width="112" style="padding:6px 10px 6px 0;font-family:{SANS};font-size:11px;'
                     f'letter-spacing:1px;text-transform:uppercase;color:{MUTED};">{e(k)}</td>'
                     f'<td valign="top" style="padding:6px 0;font-family:{SANS};font-size:13.5px;line-height:20px;color:{INK};">'
                     f'{field_html(g["fields"][k])}</td></tr>')
    tag = pill(SLOT_LABEL[g['slot']], color) + (pill('NEW · Nine Lives', GOLD) if g.get('source') == 'anniv' else '')
    return f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border:1px solid {LINE};border-left:5px solid {color};border-radius:10px;">
<tr><td style="padding:16px 18px;">
<div>{tag}</div>
<div style="font-family:{SERIF};font-size:20px;line-height:26px;color:{INK};margin-top:6px;">{g.get('emoji', '')} {e(name)}</div>
<div style="font-family:{SANS};font-size:14px;line-height:20px;color:{SOFT};font-style:italic;margin:4px 0 8px;">“{e(g['tagline'])}”</div>
<div style="margin-bottom:6px;">{studio_pills(g['studios'])}<span style="font-family:{SANS};font-size:12px;color:{MUTED};"> · {fmt_range(g['start'], g['end'])}</span></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
</td></tr></table>'''


def traffic_table(rows, accent=INK):
    head = ['Studio', 'Target', 'Leads', 'Trials', 'Renewals', 'Win-backs', 'New buyers']
    body = [[f'<b style="color:{ACCENT[s]}">{e(s)}</b>', inr(r['target']), f"{r['leads']:,}", f"{r['trials']:,}",
             f"{r['renew']} <span style='color:{MUTED}'>/ {r['due']} due</span>",
             f"{r['winback']} <span style='color:{MUTED}'>/ {r['lapsed']}</span>", r['newBuyers']] for s, r in rows.items()]
    foot = ['All studios', inr(total(rows, 'target')), f"{total(rows, 'leads'):,}", f"{total(rows, 'trials'):,}",
            f"{total(rows, 'renew')} / {total(rows, 'due')}", f"{total(rows, 'winback')} / {total(rows, 'lapsed')}",
            total(rows, 'newBuyers')]
    return table(head, body, foot=foot, accent=accent)


def collateral_rows(m):
    first = d(m, 1)
    if m == 4:
        first = d(3, 25)  # anniversary starts with the Pre-Party
    rows = [[e(a), e(f), e(c), (first - dt.timedelta(days=t)).strftime('%a %d %b')] for a, f, c, t in BASE_COLLATERAL]
    for x in MONTH_COLLATERAL.get(m, []):
        rows.append([f'<b>{e(x)}</b>', 'Special for this month', 'In-studio / social',
                     (first - dt.timedelta(days=14 if m != 4 else 21)).strftime('%a %d %b')])
    return rows


def button(label, href, color=INK):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr><td style="border-radius:999px;background:{color};">'
            f'<a href="{href}" style="display:inline-block;padding:11px 22px;font-family:{SANS};font-size:13px;font-weight:600;'
            f'color:#fff;text-decoration:none;border-radius:999px;">{e(label)}</a></td></tr></table>')


# ---------------------------------------------------------------- monthly emails
def month_email(m):
    rows = figures(m)
    offers = offers_for_month(m)
    name = MONTHS[m - 1]
    head, intro = MONTH_COPY[m]
    theme = rows['Kemps Corner']['theme']
    accent = '#3a2a4a' if m == 4 else INK
    tgt = total(rows, 'target')
    body = hero(f'{name} 2027 · team offer brief', head, f'Theme: {theme}. {intro}', accent)
    body += f'<tr><td style="padding:26px 32px 0;">{p("Hey team 👋", 16, INK, "font-weight:600;")}' \
            f'{p("Here is everything for " + name + " in one place: what we are aiming for, the offers, who they are for and what the design team needs to ship. Skim the cards, keep this handy at the desk, and shout if anything is unclear.")}</td></tr>'
    body += f'<tr><td style="padding:8px 28px 0;">' + kpis([
        ('Month target', inr(tgt), 'all studios'),
        ('Leads → trials', f"{total(rows, 'leads'):,} → {total(rows, 'trials'):,}", 'to find'),
        ('Renewals', f"{total(rows, 'renew')}", f"{total(rows, 'due')} due"),
        ('New buyers', f"{total(rows, 'newBuyers')}", f"+ {total(rows, 'winback')} win-backs")], accent) + '</td></tr>'
    if m == 4:
        body += section('The plan in three acts', ''.join(
            f'<div style="margin-bottom:8px;font-family:{SANS};font-size:14px;line-height:21px;color:{SOFT};">'
            f'<b style="color:{INK};">{e(a)}</b> <span style="color:{GOLD};">{e(w)}</span><br>{e(t)}</div>'
            for a, w, t in ANNIV['acts']) + p(f'Our April target is <b>{inr(APR_TARGET)}</b>. The Nine Lives plan models '
                                               f'<b>{inr(MODEL_TOTAL)}</b> if we hit the unit goals below, so we have some cushion.'),
            'Nine Lives')
    body += section('What each studio is chasing', traffic_table(rows, accent) + p(
        '<span style="font-size:12px;color:#7a7266;">Renewals = purchases needed / memberships falling due. '
        'Win-backs = buyers needed / lapsed pool.</span>', 12), 'Traffic & targets')
    # studio focus
    focus = ''.join(
        f'<div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;background:{CANVAS};font-family:{SANS};font-size:13.5px;line-height:20px;color:{SOFT};">'
        f'<b style="color:{ACCENT[s]};">{e(s)}</b> · <i>{e(r["hook"])}</i><br>{e(r["job"])}</div>'
        for s, r in rows.items())
    body += section('The job this month, by studio', focus, 'Focus')
    cards = ''.join(offer_card(n, g) for n, g in offers.items())
    body += section(f'{name} offers', p('Remember: <b>one offer per purchase</b>, nothing stacks. If a client fits two, give them the one that gets them committing longer. 😉') + cards, 'The offers')
    if m == 4:
        acts = [[fmt_range(d(am, a), d(am, b)), f'<b>{e(t)}</b><br><span style="color:{MUTED}">{e(w)}</span>']
                for am, a, b, t, w in ANNIV['activations']]
        body += section('Party calendar', table(['When', 'What happens'], acts, ['left', 'left'], accent=accent), 'Activations')
        mrows = [[e(x['name']), e(x['stream']), str(x['units']), inr(x['rev'])] for x in MODEL]
        body += section('Unit goals (how we get there)', table(['Lever', 'Stream', 'Units', 'Revenue'], mrows,
                                                              foot=['Total', '', str(sum(x['units'] for x in MODEL)), inr(MODEL_TOTAL)], accent=accent),
                        'Revenue model')
        body += section('Ground rules', ''.join(p('✔︎ ' + e(g), 14) for g in ANNIV['guardrails']), 'Guardrails')
    body += section('Collateral checklist', table(['Asset', 'Formats', 'Where', 'Due'], collateral_rows(m),
                                                  ['left', 'left', 'left', 'right'], accent=accent), 'For design & marketing')
    body += f'''<tr><td style="padding:22px 32px 6px;">{p("Quick reminders 💡", 15, INK, "font-weight:600;")}
{p("• Log every offer sale with the right code in Momence so we can track it.<br>• Book the client's next class before they leave the desk.<br>• Effective discount includes freebies valued at list. Never go above 25%.")}
{button("Open the 2027 offer calendar", "../calendar/index.html", accent)}
{p("Let's have a great " + name + "! 🙌<br>— Sales & Marketing", 15, INK)}</td></tr>'''
    return wrap_email(f'{name} 2027 offers · Physique 57', f'{name}: {theme}. {len(offers)} offers, {inr(tgt)} target.', body, accent)


# ---------------------------------------------------------------- annual overview email
def annual_email():
    body = hero('2027 Sales & Offer Plan · all studios', 'Our year at a glance ✨',
                'Traffic, targets, the strategy for every month, the offers and what we need from design. Bookmark this one.')
    year_t = sum(total(figures(m), 'target') for m in range(1, 13))
    tl = sum(total(figures(m), 'leads') for m in range(1, 13))
    tt = sum(total(figures(m), 'trials') for m in range(1, 13))
    tr = sum(total(figures(m), 'renew') for m in range(1, 13))
    tn = sum(total(figures(m), 'newBuyers') for m in range(1, 13))
    body += f'<tr><td style="padding:26px 32px 0;">{p("Hi everyone 👋", 16, INK, "font-weight:600;")}' + p(
        'This is the master plan for 2027. Each month you will also get a short, friendly brief with the exact offers. '
        'This email is the big picture: how much traffic we need, the plan month by month, and the collateral timeline '
        'so nothing lands late.') + '</td></tr>'
    body += '<tr><td style="padding:8px 28px 0;">' + kpis([
        ('2027 target', inr(year_t), '4 locations'), ('Leads', f'{tl:,}', f'{tt:,} trials'),
        ('Renewals', f'{tr:,}', 'purchases'), ('New buyers', f'{tn:,}', 'first purchases')]) + '</td></tr>'
    strategy = [
        ('Sell the habit, not the discount', 'Every offer sits under a 25% effective-discount cap with bonuses valued at list. We reward commitment (longer memberships, attendance), not price.'),
        ('One hero offer per client type', 'Each month has one offer for new clients, one for lapsed clients and one for members. Simple for the desk, simple for clients.'),
        ('Peaks with a plan', 'Four big moments: January intent, the April anniversary (our first ₹1 Cr month), August back-to-routine and the October–November festive and Black Friday window.'),
        ('Usage drives renewal', 'Clients using 75%+ of their sessions renew at ~80–86%. Challenges, cohorts and the Nine Lives Passport exist to get people into class.'),
        ('Fix the weak months', 'March, June and November get pre-sales, pause options and sharp short windows so they are not empty.'),
    ]
    body += section('The strategy in five lines', ''.join(
        f'<div style="margin-bottom:10px;font-family:{SANS};font-size:14px;line-height:21px;color:{SOFT};">'
        f'<span style="color:{GOLD};font-family:{SERIF};font-size:18px;">{i + 1}.</span> <b style="color:{INK};">{e(h)}.</b> {e(t)}</div>'
        for i, (h, t) in enumerate(strategy)), 'Strategy')
    # traffic by month
    rows = []
    for m in range(1, 13):
        f = figures(m)
        rows.append([f'<b>{MONTHS[m - 1][:3]}</b>', inr(total(f, 'target')), f"{total(f, 'leads'):,}", f"{total(f, 'trials'):,}",
                     f"{total(f, 'renew')}", f"{total(f, 'winback')}", f"{total(f, 'newBuyers')}"])
    body += section('Traffic & targets by month', table(['Month', 'Target', 'Leads', 'Trials', 'Renewals', 'Win-backs', 'New buyers'], rows,
                                                        foot=['Year', inr(year_t), f'{tl:,}', f'{tt:,}', f'{tr:,}',
                                                              f"{sum(total(figures(m), 'winback') for m in range(1, 13)):,}", f'{tn:,}']),
                    'Traffic')
    # studio split
    srows = []
    for s in STUDIOS:
        vals = [figures(m)[s] for m in range(1, 13)]
        srows.append([f'<b style="color:{ACCENT[s]}">{e(s)}</b>', inr(sum(v['target'] for v in vals)),
                      f"{sum(v['leads'] for v in vals):,}", f"{sum(v['trials'] for v in vals):,}",
                      f"{sum(v['renew'] for v in vals):,}", f"{sum(v['newBuyers'] for v in vals):,}"])
    body += section('By studio (full year)', table(['Studio', 'Target', 'Leads', 'Trials', 'Renewals', 'New buyers'], srows), 'Traffic')
    # month by month plan
    mm = ''
    for m in range(1, 13):
        f = figures(m)
        offers = offers_for_month(m)
        kc = f['Kemps Corner']
        olist = ''.join(f'<div style="margin:2px 0;">{pill(SLOT_LABEL[g["slot"]][:3].upper() if False else SLOT_LABEL[g["slot"]], SLOT_COLOR[g["slot"]])}'
                        f'<b>{e(n)}</b> <span style="color:{MUTED};">· {fmt_range(g["start"], g["end"])} · {"/".join(SHORT[s] for s in g["studios"])}</span></div>'
                        for n, g in offers.items())
        coll = ', '.join(MONTH_COLLATERAL.get(m, []))
        lock = (d(3, 25) if m == 4 else d(m, 1)) - dt.timedelta(days=14)
        mm += f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border:1px solid {LINE};border-radius:10px;{'background:#f6f0fa;' if m == 4 else ''}">
<tr><td style="padding:16px 18px;font-family:{SANS};font-size:13px;line-height:19px;color:{SOFT};">
<div style="font-family:{SANS};font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:{GOLD};">{MONTHS[m - 1]} · {inr(total(f, 'target'))} · {total(f, 'trials'):,} trials · {total(f, 'renew')} renewals</div>
<div style="font-family:{SERIF};font-size:20px;line-height:26px;color:{INK};margin:4px 0 6px;">{e(MONTH_COPY[m][0])} <span style="font-size:14px;color:{MUTED};">({e(kc['theme'])})</span></div>
<div style="margin-bottom:8px;">{e(kc['moment'] if m != 4 else ANNIV['big_idea'])}</div>
{olist}
<div style="margin-top:10px;padding-top:8px;border-top:1px dashed {LINE};"><b style="color:{INK};">Collateral:</b> standard kit (hero creative, landing page, WhatsApp, email, signage, desk script){' + ' + e(coll) if coll else ''}. <b style="color:#b4532a;">Creative lock {lock.strftime('%d %b')}.</b></div>
</td></tr></table>'''
    body += section('Month by month: strategy, offers, collateral', mm, 'The plan')
    # anniversary summary
    body += section('Spotlight: Nine Lives, our 9th anniversary', p(e(ANNIV['big_idea'])) + ''.join(
        p(f'<b style="color:{INK}">{e(h)}.</b> {e(t)}', 14) for h, t in ANNIV['why_better']) +
        p(f'April target <b>{inr(APR_TARGET)}</b> · modelled <b>{inr(MODEL_TOTAL)}</b>. Full plan in the anniversary doc and the April brief.'),
        'April')
    # collateral process
    proc = [[f'T−{t}', e(a), e(f), e(c)] for a, f, c, t in sorted(BASE_COLLATERAL, key=lambda x: -x[3])]
    body += section('Collateral: the standard monthly kit', p('Every month ships the same core kit. "T" is the first day of the month (for April, the Pre-Party on 25 March). Month-specific extras are listed in each monthly brief.') +
                    table(['Due', 'Asset', 'Formats', 'Channel'], proc, ['left', 'left', 'left', 'left']), 'For design & marketing')
    body += f'''<tr><td style="padding:22px 32px 6px;">
{button("Open the 2027 offer calendar", "../calendar/index.html")}
{p("Tip: import the calendar file (p57-offers-2027.ics) into Google or Apple Calendar so every offer start, end and creative deadline is on your phone. 📅")}
{p("Thanks team, let's make 2027 our best year yet! 🚀<br>— Sales & Marketing", 15, INK)}</td></tr>'''
    return wrap_email('2027 annual plan · Physique 57', f'2027: {inr(year_t)} target, {tt:,} trials, {tr:,} renewals.', body)


# ---------------------------------------------------------------- calendar events
def events():
    ev = []
    for m in range(1, 13):
        for n, g in offers_for_month(m).items():
            pay = field_html(g['fields'].get('You pay', {})) if 'You pay' in g['fields'] else ''
            get = g['fields'].get('You get', {})
            who = g['fields'].get('Who qualifies', {})
            desc = [g['tagline']]
            if who:
                desc.append('Who: ' + list(who.values())[0])
            if 'You pay' in g['fields']:
                vals = g['fields']['You pay']
                uniq = list(OrderedDict.fromkeys(vals.values()))
                desc.append('Pay: ' + (uniq[0] if len(uniq) == 1 else ' | '.join(f'{SHORT[s]}: {v}' for s, v in vals.items())))
            if get:
                desc.append('Get: ' + list(get.values())[0].replace('•', '·').strip(' ·'))
            if 'Effective discount' in g['fields']:
                desc.append('Effective discount: ' + list(g['fields']['Effective discount'].values())[0])
            ev.append({'title': n, 'type': g['slot'], 'studios': g['studios'], 'start': g['start'].isoformat(),
                       'end': g['end'].isoformat(), 'month': m, 'desc': '\n'.join(desc), 'anniv': g.get('source') == 'anniv'})
    for am, a, b, t, w in ANNIV['activations']:
        ev.append({'title': '🎂 ' + t, 'type': 'activation', 'studios': STUDIOS[:3], 'start': d(am, a).isoformat(),
                   'end': d(am, b).isoformat(), 'month': am, 'desc': w, 'anniv': True})
    for m, a, b, t in SEASONAL:
        ev.append({'title': t, 'type': 'seasonal', 'studios': STUDIOS, 'start': d(m, a).isoformat(),
                   'end': d(m, b).isoformat(), 'month': m, 'desc': 'Seasonal moment', 'anniv': False})
    for m in range(1, 13):
        first = d(3, 25) if m == 4 else d(m, 1)
        for days, label in [(14, 'Creative lock'), (7, 'WhatsApp + email ready'), (3, 'Team briefing')]:
            x = first - dt.timedelta(days=days)
            if x.year != YEAR:
                x = d(1, 1) if False else x
            ev.append({'title': f'{label}: {MONTHS[m - 1]} offers', 'type': 'deadline', 'studios': STUDIOS,
                       'start': x.isoformat(), 'end': x.isoformat(), 'month': x.month if x.year == YEAR else 0,
                       'desc': f'{label} for {MONTHS[m - 1]} 2027 offers. Standard kit: hero creative, landing page, WhatsApp, email, signage, desk script.'
                               + (' Extras: ' + ', '.join(MONTH_COLLATERAL[m]) if label == 'Creative lock' and MONTH_COLLATERAL.get(m) else ''),
                       'anniv': False})
    ev.sort(key=lambda x: (x['start'], x['type']))
    return ev


def ics(evs):
    def esc(s):
        return s.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')

    def fold(line):
        b = line.encode('utf-8')
        out, cur = [], b''
        for ch in line:
            c = ch.encode('utf-8')
            if len(cur) + len(c) > 73:
                out.append(cur)
                cur = b' ' + c
            else:
                cur += c
        out.append(cur)
        return b'\r\n'.join(out)

    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Physique 57 India//2027 Offer Calendar//EN', 'CALSCALE:GREGORIAN',
         'METHOD:PUBLISH', 'X-WR-CALNAME:P57 Offers 2027', 'X-WR-TIMEZONE:Asia/Kolkata',
         'X-WR-CALDESC:Physique 57 India 2027 offers\\, activations and collateral deadlines']
    for i, x in enumerate(evs):
        s = dt.date.fromisoformat(x['start'])
        en = dt.date.fromisoformat(x['end']) + dt.timedelta(days=1)
        studios = ', '.join(x['studios'])
        prefix = {'newcomer': '[New]', 'lapsed': '[Win-back]', 'renewal': '[Members]', 'activation': '[Anniversary]',
                  'seasonal': '[Moment]', 'deadline': '[Deadline]'}[x['type']]
        uid = re.sub(r'[^a-z0-9]+', '-', f"{x['start']}-{x['title']}".lower()).strip('-')
        L += ['BEGIN:VEVENT', f'UID:{uid}-{i}@p57-offers-2027', f'DTSTAMP:{stamp}',
              f'DTSTART;VALUE=DATE:{s:%Y%m%d}', f'DTEND;VALUE=DATE:{en:%Y%m%d}',
              f"SUMMARY:{esc(prefix + ' ' + x['title'].replace('🎂 ', ''))}",
              f"DESCRIPTION:{esc(x['desc'] + chr(10) + 'Studios: ' + studios)}",
              f'LOCATION:{esc(studios)}', f"CATEGORIES:{esc(SLOT_LABEL.get(x['type'], x['type'].title()))}",
              'TRANSP:TRANSPARENT', 'END:VEVENT']
    L.append('END:VCALENDAR')
    return b'\r\n'.join(fold(l) for l in L) + b'\r\n'


# ---------------------------------------------------------------- anniversary plan page (inline-styled, email-safe too)
def anniv_doc():
    accent = '#3a2a4a'
    body = hero('Physique 57 India · 9th Anniversary', ANNIV['title'], ANNIV['subtitle'], accent, '🎂 ')
    body += f'<tr><td style="padding:26px 32px 0;">{p(e(ANNIV["big_idea"]), 16, INK)}</td></tr>'
    body += '<tr><td style="padding:8px 28px 0;">' + kpis([
        ('April target', inr(APR_TARGET), 'approved plan'), ('Modelled', inr(MODEL_TOTAL), f'{(MODEL_TOTAL / APR_TARGET - 1) * 100:+.0f}% vs target'),
        ('Max discount', '24.0%', 'cap 25%'), ('Hero offers', str(len([o for o in ANNIV['offers'] if not o.get('model_only')])), 'one per buyer')], accent) + '</td></tr>'
    body += section('Why this plan is better', ''.join(p(f'<b style="color:{INK}">{e(h)}.</b> {e(t)}', 14) for h, t in ANNIV['why_better']), 'Rationale')
    body += section('Three acts', table(['Act', 'When', 'What'], [[f'<b>{e(a)}</b>', e(w), e(t)] for a, w, t in ANNIV['acts']],
                                        ['left', 'left', 'left'], accent=accent), 'Structure')
    body += section('The offers', ''.join(offer_card(n, g) for n, g in offers_for_month(4).items() if g.get('source') == 'anniv')
                    + offer_card(ANNIV['presale']['name'], offers_for_month(3)[ANNIV['presale']['name']]), 'Hero offers')
    # revenue model by studio
    rows = []
    for x in MODEL:
        rows.append([e(x['name']), e(x['stream'])] + [f"{x['per'][s][0]} · {inr(x['per'][s][1])}" if x['per'][s][0] else '—' for s in STUDIOS] + [inr(x['rev'])])
    foot = ['Total', ''] + [inr(sum(x['per'][s][1] for x in MODEL)) for s in STUDIOS] + [inr(MODEL_TOTAL)]
    tgt = ['Approved target', ''] + [inr(APR[s]['target']) for s in STUDIOS] + [inr(APR_TARGET)]
    body += section('Revenue model (units · revenue)', table(['Lever', 'Stream', 'KC', 'BA', 'KH', 'Pop', 'Total'], rows + [[f'<i>{c}</i>' for c in tgt]],
                                                            ['left', 'left', 'right', 'right', 'right', 'right', 'right'], foot=foot, accent=accent)
                    + p('<span style="font-size:12px;color:#7a7266;">Prices incl. GST. 9:09 Flash Pack revenue uses a blended flash/regular price. Wheel = 3M + 6M renewals. Intro conversions are net of the credited intro fee. Validate units in the Offer Studio before sign-off.</span>', 12), 'Economics')
    acts = [[fmt_range(d(am, a), d(am, b)), f'<b>{e(t)}</b><br><span style="color:{MUTED}">{e(w)}</span>'] for am, a, b, t, w in ANNIV['activations']]
    body += section('Activation calendar', table(['When', 'What'], acts, ['left', 'left'], accent=accent), 'Fun & games')
    body += section('Guardrails', ''.join(p('✔︎ ' + e(g), 14) for g in ANNIV['guardrails']), 'Protect the margin')
    body += section('Collateral', table(['Asset', 'Formats', 'Where', 'Due'], collateral_rows(4), ['left', 'left', 'left', 'right'], accent=accent), 'Production')
    return wrap_email('Nine Lives · 9th Anniversary Plan', 'Nine Lives: the 9th anniversary plan.', body, accent)


def main():
    (OUT / 'emails').mkdir(parents=True, exist_ok=True)
    (OUT / 'calendar').mkdir(parents=True, exist_ok=True)
    (OUT / 'anniversary-plan-2027.html').write_text(anniv_doc())
    (OUT / 'emails' / '00-annual-overview.html').write_text(annual_email())
    for m in range(1, 13):
        (OUT / 'emails' / f'{m:02d}-{MONTHS[m - 1].lower()}.html').write_text(month_email(m))
    evs = events()
    (OUT / 'calendar' / 'p57-offers-2027.ics').write_bytes(ics(evs))
    (OUT / 'calendar' / 'events.json').write_text(json.dumps(evs, ensure_ascii=False, indent=1))
    tpl = (Path(__file__).parent / 'calendar_template.html').read_text()
    (OUT / 'calendar' / 'index.html').write_text(tpl.replace('/*__EVENTS__*/[]', json.dumps(evs, ensure_ascii=False)))
    print(f'April target {inr(APR_TARGET)} · model {inr(MODEL_TOTAL)} · events {len(evs)}')
    for x in MODEL:
        print(f"  {x['name']:<32} {x['units']:>4}  {inr(x['rev'])}")


if __name__ == '__main__':
    main()
