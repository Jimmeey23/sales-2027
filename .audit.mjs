import 'dotenv/config'; import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});await c.connect();
const {rows}=await c.query(`select o.id,s.name st,o.month m,o.name,o.audience,o.benefit,o.mechanics,o.customer_copy from offers o join studios s on s.id=o.studio_id where year=2027 and status<>'archived' and s.name in ('Kemps Corner','Bandra','Kenkere House') order by m,o.id`);
const norm=t=>(t||'').replace(/₹[\d,\.]+/g,'₹X').trim();
for(let m=1;m<=12;m++){const r=rows.filter(x=>+x.m===m);const by={};for(const x of r)(by[x.st]??={})[x.name]=x;
 const K=by['Kemps Corner']||{};const out=[];
 for(const st of ['Bandra','Kenkere House']){const S=by[st]||{};
  for(const n of Object.keys(S)) if(!K[n]) out.push(`${st}: EXTRA "${n}" [${S[n].id}]`);
  const missing=Object.keys(K).filter(n=>!S[n]); if(missing.length>2) out.push(`${st}: missing ${missing.length}: ${missing.join(' | ')}`); else if(missing.length) out.push(`${st}: missing(ok) ${missing.join(' | ')}`);
  for(const n of Object.keys(S)) if(K[n]){const a=K[n],b=S[n];
   if(a.audience!==b.audience) out.push(`${st} "${n}" [${b.id}] AUD: "${b.audience}" vs "${a.audience}"`);
   if(norm(a.benefit)!==norm(b.benefit)) out.push(`${st} "${n}" [${b.id}] BEN:\n   K: ${a.benefit}\n   S: ${b.benefit}`);
   const wa=JSON.parse(a.mechanics||'{}').when, wb=JSON.parse(b.mechanics||'{}').when; const ca=norm((a.customer_copy||"").split("\n")[0]),cb=norm((b.customer_copy||"").split("\n")[0]); if(ca!==cb) out.push(`${st} "${n}" [${b.id}] COPY: "${cb}" vs "${ca}"`); const sa=norm(JSON.parse(a.mechanics||"{}").simple),sb=norm(JSON.parse(b.mechanics||"{}").simple); if(sa!==sb) out.push(`${st} "${n}" [${b.id}] SIMPLE: "${sb}" vs "${sa}"`); if(wa!==wb) out.push(`${st} "${n}" [${b.id}] WHEN: "${wb}" vs "${wa}"`);
  }}
 console.log(`== M${m} K=${Object.keys(K).length} B=${Object.keys(by.Bandra||{}).length} KH=${Object.keys(by['Kenkere House']||{}).length}`);out.forEach(l=>console.log(' '+l));}
await c.end();
