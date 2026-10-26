import sys, json; sys.path.insert(0,'.')
from common import *
T0,T1=pd.Timestamp('2025-10-01'),pd.Timestamp('2026-10-01')
LOCS=['Kemps Corner','Bandra','Kenkere House','Pop-up']
out={'meta':{'generated':'2026-10-26','ttm':'Oct-2025 to Sep-2026','basis':'₹ incl. GST, succeeded non-voided payments'}}
R={L:{} for L in LOCS}
# ---------- SALES ----------
S=sales(); S=S[S['Cleaned Category']!='Retail'].sort_values('d'); mid='Paying Member ID'
S['prev']=S.groupby(mid).d.shift(); S['gap']=(S.d-S.prev).dt.days
S['day']=S.d.dt.normalize()
def _nx(g):
    days=np.sort(g.day.unique()); idx=np.searchsorted(days,g.day.values,side='right')
    nxt=np.where(idx<len(days),days[np.minimum(idx,len(days)-1)],np.datetime64('NaT','ns'))
    return pd.Series(nxt,index=g.index)
S['next']=pd.to_datetime(S.groupby(mid,group_keys=False).apply(_nx)); S['ngap']=(S.next-S.day).dt.days
S['stream']=np.where(S.prev.isna(),'new',np.where(S.gap<=45,'renewal',np.where(S.gap<=120,'return','winback')))
S['y']=S.d.dt.year; S['m']=S.d.dt.month
ALL=sales()  # incl retail for headline revenue
ALL['y']=ALL.d.dt.year; ALL['m']=ALL.d.dt.month
home=S.groupby([mid,'loc']).v.sum().reset_index().sort_values('v').groupby(mid).last()['loc']
first=S.groupby(mid).first()
# first-year value of a new paying client (cohort Jul-24..Sep-25)
fc=first[(first.d>='2024-07-01')&(first.d<'2025-10-01')]
s2=S.merge(fc[['d']].rename(columns={'d':'fd'}),left_on=mid,right_index=True)
fy=s2[(s2.d-s2.fd).dt.days<365].groupby(mid).v.sum()
fc=fc.assign(fyv=fy)
for L in LOCS:
    r=R[L]; a=ALL[ALL['loc']==L]; s=S[S['loc']==L]
    ttm=a[(a.d>=T0)&(a.d<T1)].v.sum(); prev=a[(a.d>=T0-pd.DateOffset(years=1))&(a.d<T0)].v.sum()
    ytd26=a[(a.y==2026)&(a.m<=9)].v.sum(); ytd25=a[(a.y==2025)&(a.m<=9)].v.sum()
    q4_25=a[(a.y==2025)&(a.m>=10)].v.sum(); fy25=a[a.y==2025].v.sum()
    g=ytd26/ytd25 if ytd25>5e5 else 1.0; gc=min(max(g,0.9),1.3)
    fc26=ytd26+(q4_25*gc if q4_25>0 else ytd26/9*3)
    r['revenue']=dict(ttm=ttm,prevTtm=prev,yoy=(ttm/prev-1)*100 if prev>5e5 else None,ytd2026=ytd26,ytd2025=ytd25,ytdGrowth=(g-1)*100 if ytd25>5e5 else None,fy2025=fy25,forecast2026=fc26)
    mon={}
    for y in [2024,2025,2026]:
        mon[str(y)]=[round(a[(a.y==y)&(a.m==m)].v.sum()) for m in range(1,13)]
    mon['2026'][9]=None if True else 0; mon['2026'][10]=None; mon['2026'][11]=None
    r['monthly']=mon
    # seasonality: share of annual by month (2025 full yr; for new venue use 2026)
    base=a[a.y==2025] if fy25>20e5 else a[(a.d>=T0)&(a.d<T1)]
    sh=[base[base.m==m].v.sum() for m in range(1,13)]; tot=sum(sh); r['seasonality']=[x/tot*12 for x in sh]
    t=s[(s.d>=T0)&(s.d<T1)]
    r['streams']={k:float(t[t.stream==k].v.sum()) for k in ['new','renewal','return','winback']}
    r['clients']=int(t[mid].nunique()); r['newBuyers']=int((t.stream=='new').sum())
    r['atv']=float(t.v.mean()); r['revPerClient']=float(t.v.sum()/t[mid].nunique())
    # categories
    cat=a[(a.d>=T0)&(a.d<T1)].groupby('Cleaned Category').v.sum().sort_values(ascending=False)
    r['categories']=[[k,float(v)] for k,v in cat.items() if v>0]
    tp=t.groupby('Cleaned Product').agg(rev=('v','sum'),n=('v','size'),avg=('v','mean')).sort_values('rev',ascending=False).head(8)
    r['topProducts']=[[k,float(x.rev),int(x.n),float(x.avg)] for k,x in tp.iterrows()]
    # discount
    def dr(df): return float(df.disc.sum()/(df.v.sum()+df.disc.sum())*100) if len(df) else None
    r['discount']=dict(ttm=dr(t),y2025=dr(s[s.y==2025]),y2024=dr(s[s.y==2024]),valueTtm=float(t.disc.sum()))
    SHORT=s['Cleaned Product'].str.contains(r'1 Month Unlimited|1 month Unlimited|4 Class|8 Class|10 Class|12 Class|2 Week',case=False,regex=True)
    w=s[(s.d>='2024-10-01')&(s.d<'2026-06-01')&SHORT]
    w=w.assign(rep=w.ngap<=120,hd=w.disc>0)
    r['discount'].update(repurchaseDiscounted=float(w[w.hd].rep.mean()*100),repurchaseFull=float(w[~w.hd].rep.mean()*100),nDiscounted=int(w.hd.sum()),nFull=int((~w.hd).sum()))
    tt=t[t['Cleaned Category'].isin(['Memberships','Class Packages'])]
    r['discount'].update(memPackTtmCount=int(len(tt)),memPackDiscCount=int((tt.disc>0).sum()),memPackAvg=float(tt.v.mean()) if len(tt) else 0,grossTtm=float(t.v.sum()+t.disc.sum()))
    ap=s[(s.y==2026)&(s.m==4)&SHORT]
    ap=ap.assign(rep=ap.ngap<=150,hd=ap.disc>0)
    r['april']=dict(rev2025=float(a[(a.y==2025)&(a.m==4)].v.sum()),rev2026=float(a[(a.y==2026)&(a.m==4)].v.sum()),
        dr2025=dr(s[(s.y==2025)&(s.m==4)]),dr2026=dr(s[(s.y==2026)&(s.m==4)]),
        repDisc=float(ap[ap.hd].rep.mean()*100) if ap.hd.sum()>=10 else None,repFull=float(ap[~ap.hd].rep.mean()*100) if (~ap.hd).sum()>=10 else None,
        nDisc=int(ap.hd.sum()),nFull=int((~ap.hd).sum()),
        may2026=float(a[(a.y==2026)&(a.m==5)].v.sum()),mar2026=float(a[(a.y==2026)&(a.m==3)].v.sum()))
    # entry products
    f=first[(first['loc']==L)&(first.d>='2024-07-01')&(first.d<'2026-04-01')]
    s3=S.merge(f[['d']].rename(columns={'d':'fd'}),left_on=mid,right_index=True)
    w6=s3[(s3.d-s3.fd).dt.days<=180]
    f=f.assign(ltv=w6.groupby(mid).v.sum(),n=w6.groupby(mid).v.size())
    ep=f.groupby('Cleaned Product').agg(n=('v','size'),first=('v','mean'),ltv=('ltv','mean'),rep=('n',lambda x:(x>1).mean())).query('n>=25').sort_values('ltv',ascending=False)
    r['entryProducts']=[[k,int(x.n),float(x['first']),float(x.ltv),float(x.rep*100)] for k,x in ep.iterrows()]
    c=fc[fc['loc']==L]; r['firstYearValue']=float(c.fyv.mean()) if len(c)>=20 else float(t[t.stream=='new'].v.mean()*2.2)
    # dormant pool
    h=S[S.d<pd.Timestamp('2026-10-22')]; last=h.groupby(mid).d.max(); cnt=h.groupby(mid).v.size(); ltv=h.groupby(mid).v.sum()
    df=pd.DataFrame({'last':last,'cnt':cnt,'ltv':ltv}); df['days']=(pd.Timestamp('2026-10-22')-df['last']).dt.days; df['loc']=home.reindex(df.index)
    d=df[(df['loc']==L)]
    r['dormant']=dict(d60_365=int(((d.days>60)&(d.days<=365)).sum()),loyal60_365=int(((d.days>60)&(d.days<=365)&(d.cnt>=3)).sum()),
        d60_120=int(((d.days>60)&(d.days<=120)).sum()),d120_365=int(((d.days>120)&(d.days<=365)).sum()),over365=int((d.days>365).sum()),
        loyalLtvMedian=float(d[(d.days>60)&(d.days<=365)&(d.cnt>=3)].ltv.median()) if len(d) else 0)
    # historical win-back rates
    hh=S[S.d<T0]; l2=hh.groupby(mid).d.max(); c2=hh.groupby(mid).v.size()
    p=pd.DataFrame({'last':l2,'cnt':c2}); p['days']=(T0-p['last']).dt.days; p['loc']=home.reindex(p.index)
    fut=S[(S.d>=T0)&(S.d<T1)].groupby(mid).v.sum()
    p=p[(p['loc']==L)&(p.days>60)&(p.days<=365)]; p['back']=p.index.isin(fut.index); p['bv']=fut.reindex(p.index)
    r['winback']=dict(rateLoyal=float(p[p.cnt>=3].back.mean()*100) if (p.cnt>=3).sum()>=10 else None,rateLight=float(p[p.cnt<3].back.mean()*100) if (p.cnt<3).sum()>=10 else None,
        avgReturnValue=float(p[p.back].bv.mean()) if p.back.sum()>=5 else None)
json.dump({'R':R},open('part_sales.json','w'),default=float)
print(json.dumps({L:{k:R[L][k] for k in ['revenue','discount','april','dormant','winback','firstYearValue','streams']} for L in LOCS},indent=0,default=lambda x: round(float(x),1))[:6000])
# ---------- LEADS ----------
LD=pd.read_csv('leads.csv',low_memory=False); LD['d']=pd.to_datetime(LD['Created At'],errors='coerce')
CM={'Kwality House, Kemps Corner':'Kemps Corner','Supreme HQ, Bandra':'Bandra','Kenkere House, Bengaluru':'Kenkere House',
    'the Studio by Copper + Cloves, Indiranagar':'Pop-up','Plash Pilates':'Pop-up','Plash pilates studios':'Pop-up','Pop up':'Pop-up','pop up plash':'Pop-up'}
LD['loc']=LD.Center.map(CM); LD['tr']=LD['Trial Status'].ne('Not Tried'); LD['cv']=LD['Conversion Status'].eq('Converted')
CH={'Website & Online Sources':'Website & online','Referrals & Word-of-Mouth':'Referrals','Calls, Messages & Automated Enquiries':'Calls & WhatsApp',
    'Direct & Walk-in ◉ Leads':'Hosted & walk-in','Social Media & Influencer Marketing':'Social & influencer','Miscellaneous & Other':'Other'}
LD['ch']=LD.Channel.map(CH).fillna('Other')
lt=LD[(LD.d>=T0)&(LD.d<T1)]; lp=LD[(LD.d>=T0-pd.DateOffset(years=1))&(LD.d<T0)]
best_web=lt[lt.ch=='Website & online'].groupby('loc').tr.mean().max()
for L in LOCS:
    x=lt[lt['loc']==L]; r=R[L]
    chs=x.groupby('ch').agg(n=('tr','size'),tr=('tr','mean'),cv=('cv','mean')).sort_values('n',ascending=False)
    r['leads']=dict(ttm=int(len(x)),prevTtm=int((lp['loc']==L).sum()),trialRate=float(x.tr.mean()*100),convRate=float(x.cv.mean()*100),
        trialToConv=float(x.cv.sum()/max(x.tr.sum(),1)*100),
        channels=[[k,int(v.n),float(v.tr*100),float(v.cv*100)] for k,v in chs.iterrows()],bestWebTrialRate=float(best_web*100))
    if L=='Pop-up':
        r['leads']['venues']=[[k,int(v)] for k,v in x.Center.value_counts().items()]
# ---------- NEW CLIENTS ----------
N=pd.read_csv('new.csv',low_memory=False); N['d']=pd.to_datetime(N['First Visit Date'],errors='coerce')
N=N[N['Conversion Status'].isin(['Converted','Not Converted'])]
N['loc']=N['First Visit Location'].map(LOC).fillna(N['First Visit Location']).str.strip()
N.loc[N['loc'].isin(['Plash Pilates','the Studio By Copper + Cloves','The Studio by Copper + Cloves']),'loc']='Pop-up'
N['cv']=N['Conversion Status'].eq('Converted'); N['rt']=N['Retention Status'].eq('Retained'); N['hosted']=N['Is New'].eq('New - Hosted Class')
N['d2']=num(N['Days To Second Visit']); N['nv']=num(N['No of Visits'])
for L in LOCS:
    r=R[L]; n=N[N['loc']==L]; t=n[(n.d>=T0)&(n.d<T1)]
    h25=n[(n.d>='2025-01-01')&(n.d<'2025-07-01')&~n.hosted]; h26=n[(n.d>='2026-01-01')&(n.d<'2026-07-01')&~n.hosted]
    ty=t.groupby('Is New').agg(n=('cv','size'),cv=('cv','mean')).query('n>=15').sort_values('n',ascending=False)
    sl=t[~t.hosted].groupby('First Visit Time Slot').agg(n=('cv','size'),cv=('cv','mean')).query('n>=15')
    wk=t[~t.hosted].assign(w=t['First Visit Day'].isin(['Saturday','Sunday']).map({True:'Weekend',False:'Weekday'})).groupby('w').agg(n=('cv','size'),cv=('cv','mean'))
    sec=t[~t.hosted]; has2=sec.d2.notna()&(sec.nv>=2)
    within7=sec[has2&(sec.d2<=7)]
    tr=t[~t.hosted].groupby('Trainer Name').agg(n=('cv','size'),cv=('cv','mean')).query('n>=20').sort_values('cv',ascending=False)
    r['newClients']=dict(firstVisitsTtm=int(len(t)),hostedTtm=int(t.hosted.sum()),nonHostedTtm=int((~t.hosted).sum()),
        convAll=float(t.cv.mean()*100),convNonHosted=float(t[~t.hosted].cv.mean()*100),convHosted=float(t[t.hosted].cv.mean()*100) if t.hosted.sum()>=10 else None,
        convH1_2025=float(h25.cv.mean()*100) if len(h25)>=30 else None,convH1_2026=float(h26.cv.mean()*100) if len(h26)>=30 else None,
        byType=[[k,int(v.n),float(v.cv*100)] for k,v in ty.iterrows()],bySlot=[[k,int(v.n),float(v.cv*100)] for k,v in sl.iterrows()],
        byDayType=[[k,int(v.n),float(v.cv*100)] for k,v in wk.iterrows()],
        secondVisitShare=float(has2.mean()*100),convWithSecond=float(sec[has2].cv.mean()*100),convNoSecond=float(sec[~has2].cv.mean()*100),
        convSecondWithin7=float(within7.cv.mean()*100) if len(within7)>=15 else None,
        topTrainers=[[k,int(v.n),float(v.cv*100)] for k,v in tr.head(3).iterrows()],
        trainerSpread=[float(tr.cv.min()*100),float(tr.cv.max()*100)] if len(tr)>=2 else None)
# ---------- SESSIONS / CAPACITY ----------
X=pd.read_csv('sessions.csv',low_memory=False); X['d']=pd.to_datetime(X.Date); X['Location']=X.Location.str.strip(); X['loc']=X.Location.map(LOC).fillna(X.Location)
X=X[(X.d>='2026-04-01')&(X.d<'2026-10-01')]
for c in ['CheckedIn','Capacity','Revenue','LateCancelled','Booked']: X[c]=num(X[c])
X['h']=pd.to_datetime(X.Time,format='%H:%M:%S').dt.hour
X['slot']=pd.cut(X.h,[0,9,12,16,19,24],right=False,labels=['Early (before 9)','Late morning (9–12)','Afternoon (12–4)','Evening (4–7)','Late evening (7+)']).astype(str)
X['wk']=np.where(X.Day.isin(['Saturday','Sunday']),'Weekend','Weekday')
X['fmt']=X.Type.replace({'Strength Lab!':'Strength Lab','Barre 57':'Barre 57','powerCycle':'powerCycle'})
def ag(g): return dict(sessions=int(len(g)),fill=float(g.CheckedIn.sum()/g.Capacity.sum()*100),avg=float(g.CheckedIn.mean()),rps=float(g.Revenue.sum()/len(g)),lateCancel=float(g.LateCancelled.sum()/max(g.Booked.sum(),1)*100),empty=float((g.CheckedIn==0).mean()*100))
for L in LOCS:
    x=X[X['loc']==L] if L!='Pop-up' else X[X['loc'].isin(['Pop-up','Plash Pilates','the Studio By Copper + Cloves','The Studio by Copper + Cloves'])]
    r=R[L]; r['capacity']=dict(window='Apr–Sep 2026',overall=ag(x),
        formats=[[k,ag(g)] for k,g in x.groupby('fmt') if len(g)>=20],
        slots=[[w+' · '+s,ag(g)] for (w,s),g in x.groupby(['wk','slot']) if len(g)>=10])
# visit frequency
C=pd.read_csv('checkins.csv',low_memory=False,usecols=['Member ID','Checked In','Location','Date (IST)'])
C['d']=pd.to_datetime(C['Date (IST)'],errors='coerce'); C['Location']=C.Location.astype(str).str.strip(); C['loc']=C.Location.map(LOC).fillna(C.Location)
C=C[(C.d>=T0)&(C.d<T1)&(C['Checked In'].astype(str).str.upper()=='TRUE')]; C['ym']=C.d.dt.to_period('M')
for L in LOCS:
    x=C[C['loc'].isin([L] if L!='Pop-up' else ['Pop-up','Plash Pilates','the Studio By Copper + Cloves'])]; mm=x.groupby(['ym','Member ID']).size()
    R[L]['frequency']=dict(activeMembersPerMonth=float(mm.groupby(level=0).size().mean()),visitsPerMember=float(mm.mean()),
        heavyShareMembers=float((mm>=12).mean()*100),heavyShareVisits=float(mm[mm>=12].sum()/mm.sum()*100),lightShare=float((mm<=2).mean()*100))
# renewal by usage (all studios, lapsed file)
LP=pd.read_csv('lapsed.csv',low_memory=False); LP['end']=pd.to_datetime(LP['End Date'],dayfirst=True,errors='coerce')
w=LP[(LP.end>=T0)&(LP.end<T1)&LP.Status.isin(['Renewed','Lapsed'])&LP['Membership Name'].str.contains('Unlimited',case=False,na=False)]
w=w.assign(b=pd.cut(num(w['Average Sessions Per Month']),[-1,4,8,12,1000],labels=['≤4 / month','5–8 / month','9–12 / month','12+ / month']).astype(str),ren=w.Status.eq('Renewed'))
out['usageRenewal']=[[k,int(v['size']),float(v['mean']*100)] for k,v in w.groupby('b').ren.agg(['size','mean']).iterrows()]
out['R']=R
json.dump(out,open('model.json','w'),default=float,indent=1)
