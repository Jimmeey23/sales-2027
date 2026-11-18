# One-off: apply the instructions left as tags on the Planned offers cards (Nov 2026), clear the tags,
# and delete archived offers nothing uses. Edits the local SQLite file; the sync triggers queue every
# change, and the next server start sends them to Supabase before loading.
import json, re, sqlite3, sys

DB = sys.argv[1] if len(sys.argv) > 1 else 'p57-data/studio.db'
c = sqlite3.connect(DB)
c.row_factory = sqlite3.Row


def inr(n):
    n = int(round(n))
    s = str(n)
    if len(s) <= 3:
        return '₹' + s
    head, tail = s[:-3], s[-3:]
    head = re.sub(r'(\d)(?=(\d\d)+$)', r'\1,', head)
    return f'₹{head},{tail}'


def lakh(n):
    return f'₹{n / 100000:.1f}L'.replace('.0L', 'L')


# Prices by city: M = Mumbai (KC, BA), B = Bengaluru (KH), P = Pop-up.
P = {
    'M': dict(m1=20239, m3=57855, m6=113715, ann=219450, pack4=7088, cls=1651, priv=5250, inst=14438),
    'B': dict(m1=14595, m3=42210, m6=82215, ann=156240, pack4=4673, cls=1205, priv=4121, inst=10416),
    'P': dict(pack10=8505, pack8=6930, cls=723),
}
CITY = {1: 'M', 2: 'M', 3: 'B', 4: 'P'}
off = lambda price, pct: round(price * (1 - pct / 100))


def spec_sweating(city, r):
    p = P[city]
    net = off(p['m1'], 15)
    credit, cap = (800, '₹12,000') if city == 'M' else (600, '₹9,000')
    benefit = (f'Your first 1-Month Unlimited at 15% off ({inr(net)}). From your 10th class in the 30 days, every class earns '
               f'₹{credit} in credit, up to {cap} (15 classes), spent on a 3-Month Unlimited or bigger.')
    return dict(
        benefit=benefit, price=net, list=p['m1'], eff=15.5,
        simple=f'First 1-Month Unlimited at 15% off. From your 10th class, each class earns ₹{credit} credit (up to {cap}) towards a 3-Month or longer.',
        internal='15.0% on the 1-Month Unlimited; across both purchases: 15.5% with the maximum credit on a 3-Month' if r['internal_description'] else '',
    )


def spec_punctuality(city, r):
    p = P[city]
    benefit = (f'Renew on a 3-Month at full price ({inr(p["m3"])}) and get 7 extra days, if you attended at least 8 classes a month '
               f'in your current term (24 on a 3-Month). Hit that and have zero late cancels and no-shows too, and you get 14 extra days '
               f'and the "On Time, Every Time" water bottle instead.')
    return dict(
        benefit=benefit, price=p['m3'], list=p['m3'], eff=r['effective_discount'],
        simple='Renew on a 3-Month at full price: 7 extra days if you averaged 8+ classes a month; 14 days and a water bottle if you also had no late cancels.',
        audience='Members expiring in July and August who attended at least 8 classes a month in their current term',
        redemption_add='Attendance is checked in Momence at the desk: at least 8 attended classes per month of the current term (24 on a 3-Month, 48 on a 6-Month); late cancels and no-shows count against the 14-day tier only.',
    )


def spec_partners(city, r):
    p = P[city]
    net = off(p['m1'], 17)
    benefit = (f'Come back on a 1-Month Unlimited at 17% off ({inr(net)}) with a named trainer as your partner in crime: a 15-minute '
               f'check-in in week 1 and week 3, and 1 guest pass if you want company. Renew at the end of the month and get a bonus class '
               f'and the "Partners in Crime" tee.')
    return dict(
        benefit=benefit, price=net, list=p['m1'], eff=r['effective_discount'],
        headline='Coming back alone is awkward. Coming back with an accomplice on staff is a heist.',
        simple='A returning client buys 1 month at 17% off with a named trainer checking in twice and a guest pass; renew and get a bonus class and the tee.',
        audience='Clients lapsed 60+ days',
        rationale=('Lapsed clients say they stopped because their routine or workout partner changed. A named trainer who checks in twice '
                   'in the first month replaces the missing partner, so the comeback does not depend on bringing a friend.'),
        objective='Win lapsed clients back on their own, with a trainer as the accountability partner.',
    )


def spec_treaty(city, r):
    return dict(name='The Pre-Diwali Prenup')


def spec_mothers(city, r):
    if city == 'P':
        p = P['P']
        net = off(p['pack10'], 15)
        return dict(
            benefit=f'10-class pack at 15% off ({inr(net)}) plus 1 friend pass and 30 extra days of validity.',
            price=net, list=p['pack10'], eff=24.5,
            simple='Buy a 10-class pack at 15% off, with a friend pass and 30 extra days to use it.',
        )
    p = P[city]
    net = off(p['m1'], 5)
    benefit = (f'Buy a 1-Month Unlimited gift card at 5% off ({inr(net)}): the buyer gets 1 bonus class, and the recipient gets '
               f'a 30-minute trainer consult and 7 extra days on the month when they book their first class within 14 days.')
    return dict(
        benefit=benefit, price=net, list=p['m1'], eff=23.4,
        simple='Buy a 1-Month gift card at 5% off: you get a bonus class; the recipient gets a free trainer consult and 7 extra days.',
    )


def spec_balls(city, r):
    if city == 'P':
        p = P['P']
        return dict(
            benefit=f'Buy your next pack when 2 or fewer classes are left and get 2 bonus classes (10-class pack at {inr(p["pack10"])}).',
            price=p['pack10'], list=p['pack10'], eff=20.0,
            simple='Rebuy your 10-class pack with 2 or fewer classes left and get 2 bonus classes.',
        )
    p = P[city]
    net = off(p['m3'], 10)
    benefit = (f'Renew on a 3-Month at 10% off ({inr(net)}) with a free festival-week freeze and 4 "damage control" bonus classes '
               f'to use in the 14 days after Diwali.')
    return dict(
        benefit=benefit, price=net, list=p['m3'], eff=21.6,
        simple='Renew on a 3-Month at 10% off, with a free Diwali-week freeze and 4 bonus classes to use after Diwali.',
    )


def spec_corporate(city, r):
    p = P[city]
    n10, n20, m1 = off(p['pack4'], 10), off(p['pack4'], 15), off(p['m1'], 15)
    benefit = (f'Team 4-class packs for companies: 10–19 packs at 10% off ({inr(n10)} each), 20 or more at 15% off ({inr(n20)} each), '
               f'plus a free team class (in studio or virtual) and a team leaderboard for the quarter. Any employee who finishes the pack '
               f'and buys a 1-Month Unlimited within 7 days gets the standard 15% ({inr(m1)}) with the pack price credited in full.')
    return dict(
        benefit=benefit, price=n20, list=p['pack4'], eff=15.0,
        simple='Corporate: 10+ 4-class packs at 10% off (20+ at 15%), a free team class and leaderboard; employees who join within 7 days get the pack credited.',
        rationale=('Corporate packs bring in groups of new clients at once. Tiering the discount rewards bigger orders, and crediting the '
                   'pack against a 1-Month turns the employees who enjoy it into members instead of one-pack visitors.'),
        objective='Bulk prepaid trials for new audiences that convert into memberships.',
        redemption_add='Pack credit applies once per employee, only to a 1-Month Unlimited bought within 7 days of their 4th class.',
    )


def spec_glute(city, r):
    if city == 'P':
        p = P['P']
        return dict(
            benefit=f'Buy your next pack when 2 or fewer classes are left and get 2 bonus classes (10-class pack at {inr(p["pack10"])}).',
            price=p['pack10'], list=p['pack10'], eff=20.0,
            simple='Rebuy your 10-class pack with 2 or fewer classes left and get 2 bonus classes.',
        )
    p = P[city]
    benefit = (f'Renew before your expiry and earn rewards by term: 3 Months ({inr(p["m3"])}) — 2 guest passes + 7 extra days; '
               f'6 Months ({inr(p["m6"])}) — 1 private session + 4 guest passes + 7 extra days; 12 Months ({inr(p["ann"])}) — '
               f'2 private sessions + 6 guest passes + 14 extra days + priority booking. Full price, no percentage discount. '
               f'Rewards must be redeemed within a defined window.')
    value = p['priv'] + 4 * p['cls'] + 7 / 182 * p['m6'] * 0.5
    eff = round(value / p['m6'] * 100, 1)
    m = json.loads(r['mechanics'] or '{}')
    calc = m.get('calc', '')
    calc = re.sub(r'Give-away value:.*$', f'Give-away value: 6-Month tier: 1 private + 4 guest passes + 7 days ({eff}% effective).', calc)
    return dict(
        benefit=benefit, price=p['m6'], list=p['m6'], eff=eff,
        simple='Renew before expiry at full price: 3M gets 2 passes + 7 days, 6M a private + 4 passes + 7 days, 12M 2 privates + 6 passes + 14 days + priority booking.',
        calc=calc,
    )


def spec_fomo(city, r):
    p = P[city]
    net = off(p['ann'], 18)
    benefit = (f'Annual Unlimited at 18% off ({inr(net)}) with a gold-foil membership card, 1 private session, 4 guest passes, '
               f'priority booking for the year and a Physique 57 hoodie. One day only.')
    return dict(
        benefit=benefit, price=net, list=p['ann'], eff=24.4,
        simple='One day only: Annual Unlimited at 18% off, with a gold card, a private session, 4 guest passes, priority booking and a hoodie.',
    )


def spec_smug(city, r):
    p = P[city]
    net = off(p['ann'], 20)
    benefit = (f'Five days only. Annual Unlimited at the standard 20% (net {inr(net)}) and with it: your 2028 renewal price locked '
               f'at 2027 rates in writing, 15 bonus days on top of the 12 months, 12 freeze days to use whenever your year goes sideways, '
               f'three transferable gift classes you can hand to whoever needs the push, 48-hour priority booking all year, a 20-minute '
               f'trainer progress check every quarter, and your name on the Annual Wall. Prefer not to pay in one go? The same lock and '
               f'the same perks on the monthly installment route ({inr(p["inst"])} / month x 12), card on file, cancel-proof for 12 months. '
               f'Anyone upgrading from a live 3M or 6M gets the unused balance credited in full.')
    return dict(
        benefit=benefit, price=net, list=p['ann'], eff=r['effective_discount'],
        simple='Annual at 20% off, 13–17 Aug only, with your 2028 price locked, 15 bonus days, 12 freeze days, 3 gift classes, priority booking, quarterly trainer checks and your name on the Annual Wall. Monthly installments available.',
        tags_add=['priority booking', 'quarterly trainer check'],
    )


def spec_quitting(city, r):
    if city == 'P':
        p = P['P']
        net = off(p['pack10'], 15)
        benefit = (f'How it works: renew in August on a 10-class pack at the standard 15% off ({inr(net)}). You get 30 extra days of '
                   f'validity and 2 freeze blocks. A freeze block pauses your pack for at least 3 days; ask the desk 48 hours ahead and '
                   f'use it any time from 1 Sep to 30 Nov, for any reason. Renew by 10 Aug and you get a third block. Any block you have '
                   f'not used by 30 Nov turns into guest classes for one friend who has never been, valid to 31 Dec.')
        return dict(benefit=benefit, price=net, list=p['pack10'], eff=r['effective_discount'],
                    simple='Renew your 10-class pack in August at 15% off: 30 extra days and 2 pauses for Sep–Nov; unused pauses become guest classes for a friend.')
    p = P[city]
    n3, n6, na = off(p['m3'], 15), off(p['m6'], 15), off(p['ann'], 20)
    benefit = (f'How it works: renew in August and pick your term. 3 Months at the standard 15% off ({inr(n3)}) comes with 2 freeze '
               f'blocks. 6 Months at 15% off ({inr(n6)}) comes with 3 freeze blocks and 1 private class. The Annual at the standard 20% '
               f'off ({inr(na)}) comes with 4 freeze blocks and the same 2028 price lock as The Insufferably Smug Annual. A freeze block '
               f'pauses your membership for at least 3 days; ask the desk 48 hours ahead and use it any time from 1 Sep to 30 Nov, for any '
               f'reason. Renew by 10 Aug and you get one extra block. Any block you have not used by 30 Nov turns into guest classes for '
               f'one friend who has never been, valid to 31 Dec.')
    return dict(benefit=benefit, price=n6, list=p['m6'], eff=r['effective_discount'],
                simple='Renew in August: 15% off 3 or 6 months, 20% off the annual. Each comes with pauses (freeze blocks) for Sep–Nov; unused pauses become guest classes for a friend.')


def spec_blind(city, r):  # Replace
    if city == 'P':
        p = P['P']
        net = off(p['pack8'], 15)
        benefit = (f'Take your first class in February, then buy within 48 hours: an 8-class pack at the standard 15% off ({inr(net)}) '
                   f'plus P57 grip socks.')
        simple = 'Love your first class? Buy within 48 hours: 8-class pack at 15% off plus grip socks.'
        return dict(name='Love at First Plié', benefit=benefit, price=net, list=p['pack8'], eff=17.0, simple=simple,
                    **BLIND_COMMON)
    p = P[city]
    net = off(p['m1'], 15)
    benefit = (f'Take your first class in February, then buy within 48 hours: a 1-Month Unlimited at the standard 15% off ({inr(net)}), '
               f'P57 grip socks, a 15-minute check-in with your trainer in week 2, and 1 guest pass to bring a date.')
    simple = 'Love your first class? Buy 1 month within 48 hours at 15% off, with grip socks, a week-2 trainer check-in and a guest pass for a date.'
    return dict(name='Love at First Plié', benefit=benefit, price=net, list=p['m1'], eff=23.3, simple=simple, **BLIND_COMMON)


BLIND_COMMON = dict(
    headline='One class. Butterflies. A 48-hour window to make it official.',
    cust='Love at first plié? Buy within 48 hours of your first class and get 15% off your first month, grip socks and a guest pass to bring a date.',
    audience='First-time clients (phone verified), within 48 hours of their first class',
    rationale=('Newcomers who buy within two days of their first class convert at several times the rate of those who wait a week. '
               'A short window at the standard 15% replaces the mystery-class mechanic and the 50% codes, and the guest pass brings '
               'the next first-timer in.'),
    objective='Turn Valentine’s-season first classes into first memberships within 48 hours, at the standard discount.',
    redemption='When: 1 Feb–21 Feb\nOne per phone number. Purchase within 48 hours of the first class. Standard 15% only; no stacking.',
    tags=['48-hour window', 'standard 15%', 'guest pass'],
    kpi='First class → purchase within 48 hours (target 30%); guest passes redeemed.',
)


def spec_schedule(city, r):  # Replace
    if city == 'P':
        p = P['P']
        net = off(p['pack8'], 15)
        benefit = (f'Lapsed 61–365 days: one free comeback class. Buy within 72 hours of it and get an 8-class pack at the standard '
                   f'15% off ({inr(net)}) with 30 extra days of validity.')
        simple = 'Lapsed? One free comeback class; buy within 72 hours for an 8-class pack at 15% off with 30 extra days.'
        return dict(name='Closure (Finally)', benefit=benefit, price=net, list=p['pack8'], eff=15.0, simple=simple, **SCHED_COMMON)
    p = P[city]
    n1, n3 = off(p['m1'], 15), off(p['m3'], 15)
    benefit = (f'Lapsed 61–365 days: one free comeback class, no questions asked. Buy within 72 hours of it and get the standard 15% '
               f'off a 1-Month Unlimited ({inr(n1)}) or a 3-Month Unlimited ({inr(n3)}) with 7 extra days.')
    simple = 'Lapsed? One free comeback class; buy within 72 hours for 15% off 1 month, or 3 months with 7 extra days.'
    return dict(name='Closure (Finally)', benefit=benefit, price=n1, list=p['m1'], eff=23.2, simple=simple, **SCHED_COMMON)


SCHED_COMMON = dict(
    headline='No hard feelings. One free class to talk it out.',
    cust='Closure, finally: come back for one free class, no questions asked. Buy within 72 hours and get 15% off your month, or 3 months with 7 extra days.',
    audience='Lapsed 61–365 days.',
    rationale=('Lapsed clients rarely return on a discount alone; the first class back is the hurdle. A free comeback class removes it, '
               'and a 72-hour window at the standard 15% turns the visit into a purchase while the habit is fresh.'),
    objective='Bring lapsed clients back through one free class, then convert them at the standard lapsed 15%.',
    redemption='When: 1 Feb–21 Feb\nLapsed 61–365 days. One comeback class per client. Purchase within 72 hours of it. Standard lapsed 15% only; no stacking.',
    tags=['free comeback class', '72-hour window', 'standard 15% lapsed'],
    kpi='Comeback classes booked; comeback → purchase within 72 hours (target 35%).',
)

SPECS = {
    'Sweating Through Your Dignity for Cash': spec_sweating,
    'Punctuality Is My Love Language': spec_punctuality,
    'Partners in Crime & Joint Inflammation': spec_partners,
    'Pre-Diwali Damage Limitation Treaty': spec_treaty,
    "Mothers I'd Like to Tuck": spec_mothers,
    'Balls to the Wall': spec_balls,
    '“Per My Last Nervous Breakdown”': spec_corporate,
    'The Glute Custody Battle': spec_glute,
    'FOMO, Fatso': spec_fomo,
    'The Insufferably Smug Annual': spec_smug,
    'Quitting Is For Cowards': spec_quitting,
    'Blind Date (No Catfishing)': spec_blind,
    'It’s Not You, It’s Your Schedule': spec_schedule,
}

# old name -> (new name, new kpi line or None, {old benefit: new benefit}, new launch copy or None)
plan_edits = {}

for old_name, fn in SPECS.items():
    rows = c.execute("SELECT * FROM offers WHERE name=? AND COALESCE(status,'')!='archived' AND year=2027", (old_name,)).fetchall()
    assert rows, old_name
    for r in rows:
        city = CITY[r['studio_id']]
        s = fn(city, r)
        upd = {}
        name = s.get('name', r['name'])
        upd['name'] = name
        if 'benefit' in s:
            upd['benefit'] = s['benefit']
            headline = s.get('headline', r['headline'])
            upd['headline'] = headline
            cc = r['customer_copy'] or ''
            if cc.startswith(r['headline'] or '\0'):
                upd['customer_copy'] = f"{headline}\n{s['benefit']}"
            elif 'cust' in s:
                upd['customer_copy'] = s['cust']
            else:
                upd['customer_copy'] = f"{headline}\n{s['benefit']}"
            m = json.loads(r['mechanics'] or '{}')
            m['simple'] = s['simple']
            if m.get('listPrice') is not None or 'list' in s and r['target_purchases']:
                m['listPrice'] = s['list']
            pt = m.get('priceText', '')
            if '(list' in pt or (m.get('listPrice') and pt != 'Revenue'):
                tail = ' — 6-Month tier' if '6-Month tier' in pt else ''
                m['priceText'] = f"{inr(s['price'])} (list {inr(s['list'])}){tail}" if '(list' in pt else inr(s['price'])
            if 'calc' in s:
                m['calc'] = s['calc']
            if 'tags' in s:
                m['tags'] = s['tags']
            if 'tags_add' in s:
                m['tags'] = list(dict.fromkeys((m.get('tags') or []) + s['tags_add']))
            upd['mechanics'] = json.dumps(m, ensure_ascii=False)
            upd['effective_discount'] = s['eff']
            if r['expected_asp']:
                upd['expected_asp'] = s['price']
                n = r['target_purchases'] or 0
                if r['expected_revenue'] is not None and n:
                    upd['expected_revenue'] = round(n * s['price'])
            # success metrics: refresh the numeric lines, keep descriptive ones
            try:
                metrics = json.loads(r['success_metrics'] or '[]')
            except Exception:
                metrics = []
            n = int(r['target_purchases'] or 0)
            rev = upd.get('expected_revenue', r['expected_revenue']) or 0
            new_metrics = []
            for line in metrics:
                if re.match(r'^\d+ (buyers? planned|sales?)', line) and n:
                    if 'planned' in line:
                        new_metrics.append(f'{n} buyers planned')
                    else:
                        new_metrics.append(re.sub(r'= ₹[\d,]+', f'= {inr(rev)}', line))
                elif 'planned revenue' in line and rev:
                    new_metrics.append(f'{lakh(rev) if rev >= 100000 else inr(rev)} planned revenue')
                elif 'effective discount' in line:
                    new_metrics.append(f"{s['eff']:g}% effective discount")
                elif 'kpi' in s and not re.search(r'buyers|revenue|discount|sales?', line):
                    new_metrics.append(s['kpi'])
                else:
                    new_metrics.append(line)
            upd['success_metrics'] = json.dumps(new_metrics, ensure_ascii=False)
            idesc = r['internal_description'] or ''
            if 'internal' in s:
                upd['internal_description'] = s['internal']
            elif idesc.startswith('Plan:'):
                city_lbl = re.search(r'\((\w[\w-]*) pricing\)', idesc)
                upd['internal_description'] = f"Plan: {n} buyers × {inr(s['price'])} = {inr(n * s['price'])} ({city_lbl.group(1) if city_lbl else ''} pricing)."
            elif re.fullmatch(r'[\d.]+%', idesc):
                upd['internal_description'] = f"{s['eff']:.1f}%"
            plan_edits.setdefault(old_name, {'new': name, 'kpi': s.get('kpi'), 'benefits': {}, 'launch': s.get('cust')})
            plan_edits[old_name]['benefits'][r['benefit']] = s['benefit']
            old_simple = json.loads(r['mechanics'] or '{}').get('simple')
            if old_simple and old_simple != s['simple']:
                plan_edits[old_name]['benefits'][old_simple] = s['simple']
        else:
            plan_edits.setdefault(old_name, {'new': name, 'kpi': None, 'benefits': {}, 'launch': None})
        if 'audience' in s and r['audience'] and r['audience'] != s['audience']:
            plan_edits[old_name]['benefits'][f"{old_name}: {r['audience']}"] = f"{old_name}: {s['audience']}"
        for k in ('audience', 'rationale', 'objective'):
            if k in s:
                upd[k] = s[k]
        if 'redemption' in s:
            upd['redemption_conditions'] = s['redemption']
        elif 'redemption_add' in s:
            upd['redemption_conditions'] = (r['redemption_conditions'] or '').rstrip() + '\n' + s['redemption_add']
        upd['plan_tags'] = '[]'
        sets = ','.join(f'{k}=?' for k in upd)
        c.execute(f'UPDATE offers SET {sets}, updated_at=CURRENT_TIMESTAMP WHERE id=?', (*upd.values(), r['id']))
        print(f"{r['id']:>5} {city} {old_name} -> {name}  eff {upd.get('effective_discount', r['effective_discount'])}")

# Any remaining tags anywhere
c.execute("UPDATE offers SET plan_tags='[]' WHERE plan_tags IS NOT NULL AND plan_tags NOT IN ('[]','')")

plan_edits['Blind Date (No Catfishing)']['benefits'].update({
    'through a mystery-class intro': 'through a 48-hour first-class window',
    'Blind Date envelopes at every desk': 'Love at First Plié 48-hour cards at every desk',
})
plan_edits['It’s Not You, It’s Your Schedule']['benefits'].update({
    'let lapsed clients come back on the commitment they choose': 'bring lapsed clients back with a free comeback class',
})

# Monthly plan content: rename, swap benefit text, rewrite launch/KPI lines of replaced offers.
def fix(v, e, old):
    if isinstance(v, str):
        for ob, nb in e['benefits'].items():
            if ob and ob in v:
                v = v.replace(ob, nb)
        if e['launch'] and v.startswith(f'Launch {old}:'):
            v = f"Launch {e['new']}: {e['launch']}"
        if e['kpi'] and v.startswith(f'{old}:'):
            v = f"{e['new']}: {e['kpi']}"
        return v.replace(old, e['new'])
    if isinstance(v, list):
        return [fix(x, e, old) for x in v]
    if isinstance(v, dict):
        return {k: fix(x, e, old) for k, x in v.items()}
    return v

for p in c.execute('SELECT id, content, slots FROM monthly_plans').fetchall():
    changed = {}
    for col in ('content', 'slots'):
        raw = p[col]
        if not raw:
            continue
        data = json.loads(raw)
        new = data
        for old, e in plan_edits.items():
            new = fix(new, e, old)
        out = json.dumps(new, ensure_ascii=False)
        if out != json.dumps(data, ensure_ascii=False):
            changed[col] = out
    if changed:
        sets = ','.join(f'{k}=?' for k in changed)
        c.execute(f'UPDATE monthly_plans SET {sets}, updated_at=CURRENT_TIMESTAMP WHERE id=?', (*changed.values(), p['id']))
        print('plan', p['id'], list(changed))

# Delete archived offers that nothing references.
used = set()
for (ids,) in c.execute('SELECT offer_ids FROM monthly_plans WHERE offer_ids IS NOT NULL'):
    used.update(int(x) for x in json.loads(ids))
for (i,) in c.execute("SELECT original_offer_id FROM offers WHERE original_offer_id IS NOT NULL AND COALESCE(status,'')!='archived'"):
    used.add(i)
for q in ('SELECT offer_id FROM campaigns WHERE offer_id IS NOT NULL',
          'SELECT control_offer_id FROM offer_experiments', 'SELECT variant_offer_id FROM offer_experiments'):
    used.update(i for (i,) in c.execute(q))
archived = [i for (i,) in c.execute("SELECT id FROM offers WHERE status='archived'") if i not in used]
# archived rows pointing at each other
c.executemany('UPDATE offers SET original_offer_id=NULL WHERE original_offer_id=?', [(i,) for i in archived])
c.executemany('DELETE FROM offers WHERE id=?', [(i,) for i in archived])
print(f'deleted {len(archived)} archived offers; kept {len([1 for i in used])} referenced ids')
c.commit()
