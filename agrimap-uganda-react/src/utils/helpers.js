import { LIVESTOCK2021, DHS2022, CENSUS2024, PRICES, PROG_INFO, AGRO_DEALERS, FEWS_NET, POVERTY_DATA } from '../data'

export function hv(id){var h=0;for(var i=0;i<id.length;i++)h+=id.charCodeAt(i)*(i+1);return h}
export function cS(v){return v>=65?'#16a34a':v>=50?'#ca8a04':v>=35?'#ea580c':'#dc2626'}
export function cN(v){return v>.65?'#16a34a':v>.50?'#ca8a04':v>.35?'#ea580c':'#dc2626'}
export function cF(v){return v>=60?'#2563eb':v>=44?'#7c3aed':v>=30?'#ea580c':'#dc2626'}
export function cSc(v){return v>=75?'#16a34a':v>=60?'#0891b2':v>=45?'#ca8a04':'#dc2626'}

export function calcScore(d, crop='maize'){
  var c=crop;
  var ymax={maize:3,beans:1.5,cassava:15,coffee:0.8,sorghum:2,rice:4,banana:20};
  var cs=d.srr[c]||0;
  var ns=Math.round(d.ndvi*100);
  var ss=d.soil.n==='H'?85:d.soil.n==='M'?60:35;
  var fs=d.fin;
  var ys=d.yld[c]?Math.min(100,Math.round(d.yld[c]/(ymax[c]||3)*100)):50;
  var ms=Math.round(55+d.irr*0.3-(d.flood*10));
  var distCattle=LIVESTOCK2021&&LIVESTOCK2021.district_cattle?LIVESTOCK2021.district_cattle[d.id]||0:0;
  var crossPct=LIVESTOCK2021&&LIVESTOCK2021.district_crossbred_pct?LIVESTOCK2021.district_crossbred_pct[d.id]||5:5;
  var ls=Math.min(100,Math.round(crossPct*1.5+(distCattle>50000?20:distCattle>10000?10:0)));
  var regionNutr=DHS2022&&DHS2022.regions?DHS2022.regions[d.r]||DHS2022.national:null;
  var nutScore=regionNutr?Math.round(100-regionNutr.stunting_pct*2):50;
  var total=Math.round((cs+ns+ss+fs+ys+ms)/6);
  var grade=total>=75?'A — Excellent':total>=60?'B — Good':total>=45?'C — Average':'D — Needs Support';
  return{crop:cs,ndvi:ns,soil:ss,fin:fs,yield:ys,market:ms,livestock:ls,nutrition:nutScore,total:total,grade:grade};
}

export function getPests(d){
  var p=[];
  if(d.srr.maize>50)p.push({name:'Fall Armyworm',risk:d.srr.maize>62?'HIGH':'MEDIUM',crop:'Maize',col:d.srr.maize>62?'#dc2626':'#ea580c',msg:'Push-pull (Desmodium+Napier) 86% reduction. ANOVA Gold EC if >20% damage.'});
  if(d.coffee_prod>0)p.push({name:'Coffee Wilt Disease',risk:'HIGH',crop:'Coffee',col:'#dc2626',msg:'No cure. Uproot+burn. Plant CRI-certified resistant clones only.'});
  if(d.srr.banana>45)p.push({name:'Banana Bacterial Wilt',risk:'HIGH',crop:'Banana',col:'#dc2626',msg:'Remove male bud at emergence. Sterilize tools. Single Diseased Stem Removal.'});
  if(d.srr.cassava>45)p.push({name:'Cassava Brown Streak',risk:d.r==='Eastern'||d.r==='Central'?'HIGH':'MEDIUM',crop:'Cassava',col:d.r==='Eastern'||d.r==='Central'?'#dc2626':'#ea580c',msg:'Use NASE 19 only. Eastern+Central Uganda hotspot zones.'});
  return p;
}

export function calcRisk(d){
  var r=0;
  if(d.ndvi<.40)r+=28;else if(d.ndvi<.52)r+=12;
  r+=getPests(d).filter(function(p){return p.risk==='HIGH'}).length*14;
  if(d.flood>=2)r+=18;if(d.fin<40)r+=8;
  return r;
}

export var newCropRegional={groundnut:{Northern:65,Eastern:45,Western:20,Central:15},sunflower:{Northern:55,Eastern:30,Western:15,Central:8},sweetpotato:{Northern:45,Eastern:55,Western:35,Central:25},irishpotato:{Northern:5,Eastern:20,Western:35,Central:12}};

export function getDistColor(d, curTab, curSub, crop){
  if(!d)return'#94a3b8';
  var c=crop||'maize';
  var t=curTab,s=curSub;
  if(t==='production'){if(s==='ndvi'||s==='environment')return cN(d.ndvi);if(!d.srr[c]&&newCropRegional[c])return newCropRegional[c][d.r]||'#94a3b8';return cS(d.srr[c]||0)}
  if(t==='environment'){if(s==='ndvi')return cN(d.ndvi);if(s==='soil')return d.soil.n==='H'?'#16a34a':d.soil.n==='M'?'#ca8a04':'#dc2626';if(s==='pest'){var p=getPests(d).filter(function(x){return x.risk==='HIGH'}).length;return p>=2?'#dc2626':p>=1?'#ea580c':'#16a34a'}return cN(d.ndvi)}
  if(t==='market')return'#0891b2';
  if(t==='inputs'){var ad=AGRO_DEALERS[d.id]||[];if(s==='agrodealers'){var mc=ad.filter(function(x){return x.mcp}).length;return mc>=2?'#16a34a':mc>=1?'#ea580c':ad.length>=2?'#2563eb':ad.length>=1?'#ca8a04':'#94a3b8';}return cS(d.srr[c]||0);}
  if(t==='finance')return cF(d.fin);
  if(t==='youth')return cF(d.youth);
  if(t==='dairy'){return d.dairy===1?'#0e7490':'#94a3b8';}
  if(t==='programmes'){var prog_cnt=Object.values(d.programmes).filter(Boolean).length;return prog_cnt>=4?'#16a34a':prog_cnt>=2?'#2563eb':prog_cnt>=1?'#7c3aed':'#94a3b8'}
  if(t==='foundation')return cF(d.youth);
  if(t==='intelligence'){var r=calcRisk(d);return r>=50?'#dc2626':r>=30?'#ea580c':r>=15?'#ca8a04':'#16a34a'}
  if(t==='ai')return cSc(calcScore(d,c).total);
  if(!d.srr[c]&&newCropRegional[c])return newCropRegional[c][d.r]||'#94a3b8';
  return cS(d.srr[c]||0);
}

export function getDistVal(d, curTab, curSub, crop){
  if(!d)return'';
  var c=crop||'maize';
  if(curTab==='environment'&&curSub==='ndvi')return d.ndvi.toFixed(2);
  if(curTab==='finance')return d.fin+'%';
  if(curTab==='youth')return d.youth+'%';
  if(curTab==='dairy')return (LIVESTOCK2021&&LIVESTOCK2021.district_cattle[d.id]?Math.round(LIVESTOCK2021.district_cattle[d.id]/1000)+'K':d.dairy?'Yes':'—');
  if(curTab==='programmes'){var cnt=Object.values(d.programmes).filter(Boolean).length;return cnt+' progs'}
  if(curTab==='intelligence')return calcRisk(d)+'pts';
  if(curTab==='ai')return calcScore(d,c).total+'/100';
  if(curTab==='datasources')return d.n.slice(0,3);
  if(!d.srr[c]&&newCropRegional[c])return(newCropRegional[c][d.r]||10)+'%';
  return d.srr[c]!==undefined?d.srr[c]+'%':'—';
}

export function buildCtx(d){
  var sc=calcScore(d);
  var progs=Object.entries(d.programmes).filter(function(e){return e[1]}).map(function(e){return PROG_INFO[e[0]]?PROG_INFO[e[0]].name:e[0]}).join(', ');
  var distCattle=LIVESTOCK2021.district_cattle[d.id]||0;
  var crossPct=LIVESTOCK2021.district_crossbred_pct[d.id]||10;
  var regionNutr=DHS2022.regions[d.r]||DHS2022.national;
  var regionPov=POVERTY_DATA.regions[d.r]||{poverty_pct:POVERTY_DATA.national_poverty_line_pct};
  return [
    'DISTRICT: '+d.n+', '+d.r+' Region, Uganda. Elevation: '+d.elev+'. Population (NPHC 2024): '+Math.round(d.pop/1000)+'K. Agri: '+d.agri_pct+'% of economy.',
    'NDVI current: '+d.ndvi+' | Previous: '+d.ndvi_p+' | Soil: '+d.soil.type+' pH:'+d.soil.ph+' N:'+d.soil.n+' P:'+d.soil.p+' K:'+d.soil.k,
    'Maize: '+d.srr.maize+'% HH, '+d.yld.maize+' t/ha | Coffee: '+d.coffee_prod+' MT ('+d.coffee_type+')',
    'Finance: '+d.fin+'% | Mobile money: '+d.mm+'% | SACCO: '+d.sacco+'% | Youth: '+d.youth+'% | Women: '+d.women+'%',
    'Cattle: ~'+distCattle.toLocaleString()+' | Crossbred: '+crossPct+'% | Stunting: '+regionNutr.stunting_pct+'%',
    'Poverty: '+regionPov.poverty_pct+'% | Food insecure: '+(regionNutr.food_insecure_pct||42)+'%',
    'Programmes active: '+(progs||'None') + ' | AgriScore: '+sc.total+'/100 ('+sc.grade+')',
    'Agro-dealers in district: '+(AGRO_DEALERS[d.id]||[]).length
  ].join('\n');
}

export async function callAI(prompt){
  try{
    var res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})
    });
    var data=await res.json();
    var text=(data.content||[]).filter(function(b){return b.type==='text'}).map(function(b){return b.text}).join('\n');
    text=text.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
    return text||'No response.';
  }catch(e){return '<span style="color:var(--rd)">Error connecting to AI. Please try again.</span>';}
}
