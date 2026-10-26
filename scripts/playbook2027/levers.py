import sys, json; sys.path.insert(0,'.')
from common import *
M=json.load(open('model.json')); R=M['R']
T0,T1=pd.Timestamp('2025-10-01'),pd.Timestamp('2026-10-01')
S=sales(); S=S[S['Cleaned Category']!='Retail'].sort_values('d'); mid='Paying Member ID'
first=S.groupby(mid).d.min().rename('fd'); S=S.join(first,on=mid); S['age']=(S.d-S.fd).dt.days
# realisation curve: share of first-year value realised by month k
coh=S[(S.fd>='2024-07-01')&(S.fd<'2025-10-01')&(S.age<365)]
tot=coh.v.sum(); cum=[coh[coh.age<30.4*k].v.sum()/tot for k in range(1,13)]
# client acquired in month m (1..12) realises cum[12-m] by year end
REAL=float(np.mean([cum[12-m] for m in range(1,13)]))
APP={'Kemps Corner':42000000,'Bandra':22820000,'Kenkere House':12590000,'Pop-up':2310000}
LP=pd.read_csv('lapsed.csv',low_memory=False); LP['end']=pd.to_datetime(LP['End Date'],dayfirst=True,errors='coerce')
LP['loc']=LP['Primary Location'].astype(str).str.strip().map(LOC)
out={}
for L,r in R.items():
    lv=[]; fyv=r['firstYearValue']; nc=r['newClients']; ld=r['leads']; fc=r['revenue']['forecast2026']
    g=r['revenue']['ytdGrowth']; mom=0 if g is None else min(max(g/2,-5),10)
    base=fc*(1+mom/100)
    # 1 conversion
    tgt=nc['convH1_2025'] or nc['convH1_2026']; cur=nc['convNonHosted']
    if tgt and tgt>cur:
        add=nc['nonHostedTtm']*(tgt-cur)/100
        lv.append(dict(id='conversion',name='Trial-to-member conversion',value=add*fyv*REAL,
          math=f"{nc['nonHostedTtm']:,} non-hosted first visits × ({cur:.1f}% → {tgt:.1f}%) = +{add:.0f} members × ₹{fyv:,.0f} first-year value × {REAL:.2f} in-year realisation",
          why=(f"Non-hosted trial conversion was {tgt:.1f}% in H1-2025 vs {nc['convH1_2026'] or cur:.1f}% in H1-2026. " if nc['convH1_2025'] else f"Non-hosted conversion reached {tgt:.1f}% in H1-2026 vs {cur:.1f}% over the last 12 months. ")+f"Clients who book a 2nd class convert at {nc['convWithSecond']:.0f}%; those who don't, {nc['convNoSecond']:.0f}%. Only {nc['secondVisitShare']:.0f}% currently return."))
    # 2 online lead response
    web=[c for c in ld['channels'] if c[0]=='Website & online']
    if web:
        n,tr,cv=web[0][1],web[0][2],web[0][3]; best=ld['bestWebTrialRate']; tt=tr+max(best-tr,6)*0.5 if best-tr>1 else tr+3
        t2c=cv/tr if tr else 0; add=n*(tt-tr)/100*t2c
        lv.append(dict(id='leads',name='Online-lead speed to trial',value=add*fyv*REAL,
          math=f"{n:,} online leads × trial rate {tr:.1f}% → {tt:.1f}% × {t2c*100:.0f}% trial→member = +{add:.0f} members × ₹{fyv:,.0f} × {REAL:.2f}",
          why=f"Online leads are {n/ld['ttm']*100:.0f}% of all leads but only {tr:.1f}% ever book a trial (best studio: {best:.1f}%). Calls/WhatsApp leads book at {[c for c in ld['channels'] if c[0]=='Calls & WhatsApp'][0][2]:.0f}%."))
    # 3 referrals
    ref=[c for c in ld['channels'] if c[0]=='Referrals']
    if ref:
        n,tr,cv=ref[0][1],ref[0][2],ref[0][3]; add=n*0.5*cv/100
        lv.append(dict(id='referral',name='Paid-on-conversion referral engine',value=add*fyv*REAL,
          math=f"{n:,} referral leads × +50% volume × {cv:.1f}% lead→member = +{add:.0f} members × ₹{fyv:,.0f} × {REAL:.2f}",
          why=f"Referral leads convert at {cv:.1f}% vs {web[0][3]:.1f}% for online leads — {cv/max(web[0][3],0.1):.1f}× better — but are only {n/ld['ttm']*100:.0f}% of lead volume."))
    # 4 win-back
    d=r['dormant']; wb=r['winback']
    if wb['avgReturnValue']:
        a1=d['loyal60_365']*0.10; a2=(d['d60_365']-d['loyal60_365'])*0.05
        val=a1*wb['avgReturnValue']*0.8+a2*wb['avgReturnValue']*0.4
        lv.append(dict(id='winback',name='Tiered win-back of dormant clients',value=val,
          math=f"{d['loyal60_365']} loyal dormant (3+ purchases) × +10pts return + {d['d60_365']-d['loyal60_365']} light dormant × +5pts = +{a1+a2:.0f} returners × ₹{wb['avgReturnValue']:,.0f} avg return spend (×0.8 / ×0.4)",
          why=f"{d['d60_365']} clients last bought 60–365 days ago. Historically {wb['rateLoyal']:.0f}% of loyal and {wb['rateLight']:.0f}% of light dormant clients came back within 12 months on their own; return probability collapses after 120 days."))
    else:
        a=d['d60_365']*0.12; val=a*4000
        lv.append(dict(id='winback',name='Drop-in reactivation',value=val,math=f"{d['d60_365']} dormant drop-in clients × 12% return × ₹4,000 (≈ one 4-class pack)",why=f"{d['d60_365']} pop-up clients have not booked in 60–365 days; most bought a single credit."))
    # 5 discount discipline
    ds=r['discount']; floor=max(ds['y2025'] or 8,8)
    if ds['ttm']>floor+1:
        v1=ds['grossTtm']*(ds['ttm']-floor)/100*0.5
        v2=ds['memPackDiscCount']*0.6*(ds['repurchaseFull']-ds['repurchaseDiscounted'])/2/100*ds['memPackAvg']
        lv.append(dict(id='discount',name='Swap % discounts for value-adds',value=v1+v2,
          math=f"Price: ₹{ds['grossTtm']/1e5:,.0f}L gross × ({ds['ttm']:.1f}% → {floor:.1f}% effective discount) × 50% kept = ₹{v1/1e5:.1f}L. Renewal: {ds['memPackDiscCount']} discounted membership/pack sales × 60% moved to value-add × half the {ds['repurchaseFull']-ds['repurchaseDiscounted']:.0f}-pt repurchase gap × ₹{ds['memPackAvg']:,.0f} = ₹{v2/1e5:.1f}L",
          why=f"Effective discount rose from {ds['y2025']:.1f}% (2025) to {ds['ttm']:.1f}% (TTM). Discounted short-cycle buyers repurchase {ds['repurchaseDiscounted']:.0f}% vs {ds['repurchaseFull']:.0f}% at full price."))
    # 6 usage-led renewal
    w=LP[(LP['loc']==L)&(LP.end>=T0)&(LP.end<T1)&LP.Status.isin(['Renewed','Lapsed'])&LP['Membership Name'].str.contains('Unlimited',case=False,na=False)]
    lowu=w[num(w['Average Sessions Per Month'])<=4]; ur={k[0]:k[2] for k in M['usageRenewal']}
    if len(lowu)>=10:
        add=len(lowu)*0.30*(ur['5–8 / month']-ur['≤4 / month'])/100
        tick=S[(S['loc']==L)&S['Cleaned Product'].str.contains('1 Month Unlimited',na=False)&(S.d>=T0)].v.mean()
        lv.append(dict(id='usage',name='First-30-day habit programme',value=add*tick*1.5,
          math=f"{len(lowu)} unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +{ur['5–8 / month']-ur['≤4 / month']:.0f}pt renewal = +{add:.0f} renewals × ₹{tick:,.0f} × 1.5 cycles",
          why=f"Unlimited members averaging ≤4 classes/month renew {ur['≤4 / month']:.0f}%; at 5–8 it's {ur['5–8 / month']:.0f}%, at 9+ ~87%. {r['frequency']['lightShare']:.0f}% of monthly active members visit ≤2 times."))
    # 7 capacity / location-specific
    cap=r['capacity']; fm={k:v for k,v in cap['formats']}; sl={k:v for k,v in cap['slots']}
    if L=='Kemps Corner':
        s=fm['Strength Lab']; val=4*52*s['rps']*0.6
        lv.append(dict(id='capacity',name='Add Strength Lab capacity',value=val,math=f"+4 Strength Lab sessions/week × 52 × ₹{s['rps']:,.0f} revenue/session × 60% ramp",why=f"Strength Lab runs at {s['fill']:.0f}% fill vs Barre {fm['Barre 57']['fill']:.0f}% and powerCycle {fm['powerCycle']['fill']:.0f}% — the only format turning people away."))
    if L=='Bandra':
        cur=dict(r['categories']).get('Privates',0); tgt=0.03*fc; val=max(tgt-cur,0)*0.7
        lv.append(dict(id='privates',name='Build a privates line',value=val,math=f"Privates to 3% of revenue (₹{tgt/1e5:.1f}L) from ₹{cur/1e5:.1f}L TTM × 70% year-one",why=f"Privates are ₹{cur/1e5:.1f}L of Bandra's ₹{r['revenue']['ttm']/1e5:.0f}L TTM; at Kemps Corner they are ~{dict(R['Kemps Corner']['categories']).get('Privates',0)/R['Kemps Corner']['revenue']['ttm']*100:.0f}% of revenue."))
    if L=='Kenkere House':
        s=sl['Weekend · Late morning (9–12)']; val=2*52*s['rps']*0.6
        lv.append(dict(id='capacity',name='Second weekend late-morning class',value=val,math=f"+2 weekend 9–12 sessions/week × 52 × ₹{s['rps']:,.0f} revenue/session × 60% ramp",why=f"Weekend late-morning runs at {s['fill']:.0f}% fill (studio avg {cap['overall']['fill']:.0f}%); weekend evenings sit at {sl['Weekend · Evening (4–7)']['fill']:.0f}%."))
    if L=='Pop-up':
        cr=S[(S['loc']==L)&(S.d>=T0)&(S.d<T1)&S['Cleaned Product'].str.contains('Credit',na=False)].groupby(mid).size()
        rep=int((cr>=3).sum()); val=rep*0.3*2*4000
        lv.append(dict(id='packs',name='Credit-to-pack upgrades',value=val,math=f"{rep} clients bought 3+ single credits × 30% upgrade to an 8/10-pack × 2 cycles × ~₹4,000 net uplift",why=f"Pop-up clients average {r['frequency']['visitsPerMember']:.1f} visits/month and {r['frequency']['lightShare']:.0f}% come ≤2 times; revenue is mostly single credits at ~₹470."))
    EXP={'Kemps Corner':(36,5257026),'Bandra':(20,2793775),'Kenkere House':(5,529374)}
    if L in EXP:
        n,v=EXP[L]; val=v*0.20*0.6
        lv.append(dict(id='annual',name='Long-plan renewal desk',value=val,math=f"{n} annual/6-month plans worth ₹{v/1e5:.1f}L expire in 2027 × +20pt renewal × 60% of original value (many step down to 3-month/1-month)",
          why="Of annual plans bought Jun-2024 to Sep-2025, only ~25–34% of holders bought anything within 45 days before / 60 after expiry, and ~10–12% re-committed to a 6- or 12-month plan."))
    levers=sum(x['value'] for x in lv)
    out[L]=dict(baseline=base,momentum=mom,forecast2026=fc,levers=lv,leverTotal=levers,projection=base+levers*0.85,haircut=0.15,appTarget=APP[L],
        coverage=(base+levers*0.85)/APP[L]*100,realisation=REAL)
    print(f"== {L}: fc26 {fc/1e5:.1f}L base {base/1e5:.1f}L (+{mom:.1f}%) levers {levers/1e5:.1f}L proj {(base+levers*.85)/1e5:.1f}L vs app {APP[L]/1e5:.1f}L cov {(base+levers*.85)/APP[L]*100:.0f}%")
    for x in lv: print(f"   {x['name']}: {x['value']/1e5:.1f}L | {x['math']}")
json.dump(out,open('levers.json','w'),indent=1,default=float)
print('REAL',REAL,cum)
