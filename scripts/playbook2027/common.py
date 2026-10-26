import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_rows',200); pd.set_option('display.max_columns',40)
def num(x): return pd.to_numeric(x.astype(str).str.replace(',','').str.replace('₹','').str.replace('%',''),errors='coerce')
LOC={'Kwality House, Kemps Corner':'Kemps Corner','Supreme HQ, Bandra':'Bandra','Kenkere House':'Kenkere House','Pop-up':'Pop-up'}
def sales():
    s=pd.read_csv('sales.csv',low_memory=False)
    s['v']=num(s['Payment Value']); s['d']=pd.to_datetime(s['Payment Date']); s['ym']=s.d.dt.to_period('M')
    s['loc']=s['Calculated Location'].map(LOC); s['disc']=num(s['Discount Value In Currency']).fillna(0)
    s=s[s['Sec. Is Voided']!='TRUE']
    return s
