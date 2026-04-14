import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { GEO, CENT, D, PRICES, PROG_INFO, TAB_SUBS, SUB_LBL, ROLES, AGRO_DEALERS, LIVESTOCK2021, DHS2022, CENSUS2024, FEWS_NET, POVERTY_DATA, AAS2122, CPI_FOOD, AGRI_FINANCE, MAAIF_PRODUCTION, DEFORESTATION, COMMODITY_INTL } from './data'
import { cS, cN, cF, cSc, calcScore, getPests, calcRisk, getDistColor, getDistVal, newCropRegional, buildCtx, callAI, hv } from './utils/helpers'

const NORMAL_URL='https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
const SAT_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const DARK_URL='https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'

const CROP_NAMES={maize:'Maize',beans:'Beans',cassava:'Cassava',coffee:'Coffee',sorghum:'Sorghum',rice:'Rice',banana:'Banana',groundnut:'Groundnut',sunflower:'Sunflower',sweetpotato:'Sweet Potato',irishpotato:'Irish Potato'}
11
function MapUpdater({center}){const map=useMap();useEffect(()=>{if(center)map.flyTo(center,7,{animate:true,duration:.6})},[center]);return null}

function GeoLayer({crop,curTab,curSub,curD,satOn,onSelect}){
  const style=useCallback((feature)=>{
    const d=D.find(x=>x.id===feature.properties.id)
    const col=getDistColor(d,curTab,curSub,crop)
    const sel=curD&&curD.id===feature.properties.id
    return{fillColor:col,fillOpacity:satOn?.55:.82,weight:sel?3:1.8,color:sel?'#fff':'#fff',opacity:sel?1:.7}
  },[crop,curTab,curSub,curD,satOn])
  const onEachFeature=useCallback((feature,layer)=>{
    layer.on('click',()=>onSelect(feature.properties.id))
    layer.on('mouseover',()=>{
      const d=D.find(x=>x.id===feature.properties.id)
      if(d){
        const sc=calcScore(d,crop)
        const cn=CROP_NAMES[crop]||'Maize'
        const progCnt=Object.values(d.programmes).filter(Boolean).length
        const adCount=(AGRO_DEALERS[d.id]||[]).length
        const adMCP=(AGRO_DEALERS[d.id]||[]).filter(x=>x.mcp).length
        let h='<div class="lp-name">'+d.n+' District</div>'
        h+='<div class="lp-row"><span>Region</span><span>'+d.r+' · '+d.elev+'</span></div>'
        h+='<div class="lp-row"><span>'+cn+'</span><span style="font-weight:700;color:'+cS(d.srr[crop]||0)+'">'+(d.srr[crop]||0)+'%</span></div>'
        h+='<div class="lp-row"><span>NDVI</span><span style="font-weight:700;color:'+cN(d.ndvi)+'">'+d.ndvi+'</span></div>'
        h+='<div class="lp-row"><span>Finance</span><span style="font-weight:700;color:'+cF(d.fin)+'">'+d.fin+'%</span></div>'
        h+='<div class="lp-row"><span>Agro-Dealers</span><span style="font-weight:700;color:var(--gn)">'+adCount+' reg · '+adMCP+' MCP</span></div>'
        h+='<span class="lp-score" style="background:'+cSc(sc.total)+'">Agri Score: '+sc.total+'/100</span>'
        layer.bindPopup(h,{maxWidth:220}).openPopup()
      }
    })
  },[crop,curTab,curSub,onSelect])
  return <GeoJSON key={curTab+curSub+crop+(curD?curD.id:'')+satOn} data={GEO} style={style} onEachFeature={onEachFeature}/>
}

export default function App(){
  const[loggedIn,setLoggedIn]=useState(false)
  const[curUser,setCurUser]=useState(null)
  const[selRoleV,setSelRoleV]=useState('ps')
  const[nameInput,setNameInput]=useState('')
  const[distInput,setDistInput]=useState('')
  const[loginErr,setLoginErr]=useState(false)
  const[curTab,setCurTab]=useState('production')
  const[curSub,setCurSub]=useState('crop')
  const[curD,setCurD]=useState(null)
  const[crop,setCrop]=useState('maize')
  const[filtReg,setFiltReg]=useState('')
  const[dark,setDark]=useState(false)
  const[satOn,setSatOn]=useState(false)
  const[searchVal,setSearchVal]=useState('')
  const[menuOpen,setMenuOpen]=useState(false)
  const[mapCenter,setMapCenter]=useState(null)
  const[sidebarOpen,setSidebarOpen]=useState(false)
  const[rpOpen,setRpOpen]=useState(false)

  useEffect(()=>{document.body.classList.toggle('dark',dark)},[dark])

  const tileUrl=satOn?SAT_URL:(dark?DARK_URL:NORMAL_URL)

  const setTab=useCallback((tab)=>{
    setCurTab(tab)
    setCurSub(TAB_SUBS[tab]?TAB_SUBS[tab][0]:'overview')
  },[])

  const selDist=useCallback((id)=>{
    const d=D.find(x=>x.id===id)
    setCurD(d)
    setRpOpen(true)
    if(CENT[id])setMapCenter(CENT[id])
  },[])

  const doLogin=(name,role,dist)=>{
    const r=ROLES[role]
    setCurUser({name,role,roleName:r.name,abbr:r.abbr,district:dist,color:r.col})
    setLoggedIn(true)
    if(role==='youth_farmer')setTab('youth')
    else if(role==='foundation_staff')setTab('foundation')
    else if(role==='agro_dealer'){setTab('inputs');setTimeout(()=>setCurSub('agrodealers'),200)}
    if(dist&&['dao','ext','youth_farmer','agro_dealer'].includes(role))setTimeout(()=>selDist(dist),400)
  }

  const doLogout=()=>{setLoggedIn(false);setCurUser(null);setCurD(null)}

  const allowedTabs=curUser?ROLES[curUser.role]?.tabs||[]:[]

  const list=useMemo(()=>{
    let l=filtReg?D.filter(x=>x.r===filtReg):D
    if(searchVal){const sv=searchVal.toLowerCase();l=l.filter(x=>x.n.toLowerCase().includes(sv))}
    return l.slice().sort((a,b)=>{
      const va=a.srr[crop]!==undefined?a.srr[crop]:(newCropRegional[crop]?newCropRegional[crop][a.r]||0:0)
      const vb=b.srr[crop]!==undefined?b.srr[crop]:(newCropRegional[crop]?newCropRegional[crop][b.r]||0:0)
      return vb-va
    })
  },[filtReg,searchVal,crop])

  const avgS=Math.round(D.reduce((s,d)=>s+(d.srr[crop]!==undefined?d.srr[crop]:(newCropRegional[crop]?newCropRegional[crop][d.r]||10:0)),0)/D.length)
  const avgN=(D.reduce((s,d)=>s+d.ndvi,0)/D.length).toFixed(2)
  const avgF=Math.round(D.reduce((s,d)=>s+d.fin,0)/D.length)
  const avgMM=Math.round(D.reduce((s,d)=>s+d.mm,0)/D.length)
  const cn=CROP_NAMES[crop]||'Maize'
  const lgdInfo={crop:{t:'Crop HH Adoption',s:'UBOS AAS 2020'},ndvi:{t:'NDVI Health',s:'Sentinel-2/MODIS'},soil:{t:'Soil Nitrogen',s:'FAO-GAEZ/ISRIC'},pest:{t:'Pest Risk',s:'MAAIF DPP'},live_prices:{t:'Market Activity',s:'Farmgain Africa 2024'},inclusion:{t:'Financial Inclusion',s:'FinScope 2023'},overview:{t:'Programme Coverage',s:'YAW Uganda'}}
  const lgd=lgdInfo[curSub]||{t:curSub,s:'AgriMap Uganda'}
  const subs=TAB_SUBS[curTab]||[]
  const sc=curD?calcScore(curD,crop):null

  // ── LOGIN OVERLAY ──
  if(!loggedIn){
    return(
      <div className="login-ov">
        <div className="lbox">
          <div className="lbox-top" style={{marginBottom:12}}>
            <div className="li">🌿</div>
            <h2>Agri<span>Map</span> Uganda</h2>
            <p>Agricultural Intelligence Platform · 🇺🇬 Uganda · UBOS · UCDA · MAAIF · NARO · FinScope</p>
          </div>
          <label style={{display:'block',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'var(--t3)',marginBottom:7}}>Select your role</label>
          <div className="role-grid">
            {[{r:'foundation_staff',i:'🌿',n:'Foundation Staff',d:'YAW · Full programme access'},{r:'ps',i:'🏛️',n:'PS / Commissioner MAAIF',d:'Full access'},{r:'dir_crop',i:'🌽',n:'Dir. Crop Production',d:'Crop policy'},{r:'dir_pp',i:'🐛',n:'Dir. Plant Protection',d:'Pest & disease'},{r:'naro',i:'🔬',n:'NARO Researcher',d:'Varieties & trials'},{r:'coffee',i:'☕',n:'MAAIF Coffee Unit',d:'Coffee sector'},{r:'dao',i:'🏘️',n:'District Agri Officer',d:'District oversight'},{r:'ext',i:'🌱',n:'Extension Worker',d:'Parish field ops'},{r:'youth_farmer',i:'👩‍🌾',n:'Youth Farmer',d:'My farm dashboard'},{r:'agro_dealer',i:'🏪',n:'Agro-Dealer',d:'Inputs · Seeds · Finance'},{r:'ngo',i:'🌍',n:'NGO / Dev Partner',d:'USAID · FAO · WFP'},{r:'agribiz',i:'🏢',n:'Agribusiness / Bank',d:'Finance & trade'}].map(role=>(
              <div key={role.r} className={'role-card'+(selRoleV===role.r?' sel':'')} onClick={()=>setSelRoleV(role.r)}>
                <div className="ri">{role.i}</div>
                <div className="rn">{role.n}</div>
                <div className="rd">{role.d}</div>
              </div>
            ))}
          </div>
          <div className="lfield"><label>Your Name</label><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter your name"/></div>
          {['dao','ext','youth_farmer','agro_dealer'].includes(selRoleV)&&(
            <div className="lfield"><label>Your District</label>
              <select value={distInput} onChange={e=>setDistInput(e.target.value)}>
                <option value="">All districts (national)</option>
                {D.map(d=><option key={d.id} value={d.id}>{d.n} ({d.r})</option>)}
              </select>
            </div>
          )}
          {loginErr&&<div className="lerr show">Please enter your name</div>}
          <button className="lbtn" onClick={()=>{if(!nameInput.trim()){setLoginErr(true);return}setLoginErr(false);doLogin(nameInput.trim(),selRoleV,distInput)}}>Enter AgriMap Uganda →</button>
          <div className="ldemo">or <a onClick={()=>doLogin('Demo User','ps','')}>Quick demo — MAAIF Commissioner</a></div>
        </div>
      </div>
    )
  }

  // ── MAIN APP ──
  const progs=curD?Object.entries(curD.programmes).filter(e=>e[1]).map(e=>e[0]):[]

  const renderPanelHeader=()=>{
    if(!curD)return null
    const d=curD,pop2024=CENSUS2024&&CENSUS2024.district_pop?CENSUS2024.district_pop[d.id]||d.pop:d.pop
    const kpis=[
      {v:d.srr[crop]+'%',l:'Crop HH',col:cS(d.srr[crop]||0)},
      {v:d.ndvi.toFixed(2),l:'NDVI',col:cN(d.ndvi)},
      {v:d.fin+'%',l:'Finance',col:cF(d.fin)},
      {v:d.youth+'%',l:'Youth',col:cF(d.youth)},
      {v:progs.length,l:'Programmes',col:progs.length>=3?'#16a34a':progs.length>=1?'#ca8a04':'#dc2626'}
    ]
    return(
      <div className="rph">
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4}}>
          <div><h2 style={{margin:'0 0 2px'}}>{d.n} District</h2>
            <div className="rs">{d.r} Region · {d.elev} · Pop <b>{Math.round(pop2024/1000)}K</b> (Census 2024) · Agri <b>{d.agri_pct}%</b></div>
          </div>
          <div style={{textAlign:'right'}}><div style={{fontSize:20,fontWeight:800,color:cSc(sc.total)}}>{sc.total}</div><div style={{fontSize:8,color:'var(--t3)'}}>Agri Score</div></div>
        </div>
        <div className="score-strip">
          {kpis.map((k,i)=><div className="sskpi" key={i}><div className="sv" style={{color:k.col}}>{k.v}</div><div className="sl">{k.l}</div></div>)}
        </div>
        {progs.length>0&&<div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:4}}>
          {progs.map(p=>{const info=PROG_INFO[p];if(!info)return null;return <span key={p} style={{padding:'1px 6px',borderRadius:4,fontSize:7,fontWeight:700,background:info.color+'22',color:info.color,border:'1px solid '+info.color+'44'}}>{info.name}</span>})}
        </div>}
      </div>
    )
  }

  const renderPanelContent=()=>{
    if(!curD)return null
    const d=curD,s=curSub
    // The content renderers produce HTML strings (matching original 1:1)
    // This is intentional for 100% feature parity with the original HTML
    let html=buildPanelHTML(d,crop,cn,sc,s,curTab)
    return <div className="rpbody" dangerouslySetInnerHTML={{__html:html}}/>
  }

  const renderNationalOverview=()=>(
    <div id="rpEmpty" style={{padding:10,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{textAlign:'center',padding:'10px 0 6px'}}>
        <div style={{fontSize:28,marginBottom:4}}>🇺🇬</div>
        <div style={{fontSize:13,fontWeight:800,color:'var(--tx)'}}>Uganda — National Overview</div>
        <div style={{fontSize:9,color:'var(--t3)'}}>Click any district on the map to drill down · {D.length} districts mapped</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4,width:'100%'}}>
        {[{v:'45.9M',l:'Population 2024',c:'#16a34a'},{v:'$2.4B',l:'Coffee Export 24/25',c:'#92400e'},{v:'3.7B L',l:'Milk / Year',c:'#0e7490'},{v:'64%',l:'Finance Access',c:'#2563eb'},{v:'29%',l:'Child Stunting',c:'#dc2626'},{v:'4.2M',l:'Food At-Risk',c:'#ea580c'}].map((k,i)=>(
          <div key={i} style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:7,padding:'7px 5px',textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
            <div style={{fontSize:7,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.5px'}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:8,padding:'8px 10px',fontSize:'8.5px',color:'var(--t2)'}}>
        <div style={{fontWeight:700,color:'var(--tx)',marginBottom:4}}>📊 Data loaded — 16 public sources</div>
        <div>UBOS NPHC 2024 · AAS 2021/22 · NLC 2021 · DHS 2022 · MAAIF Coffee Export 24/25 · FinScope 2023 · FEWS NET Apr 2026 · Sentinel-2 NDVI · FAO-GAEZ Soil · GFW Deforestation · ICO Prices · World Bank Poverty · UBOS CPI Dec 2025 · Farmgain Africa · NARO Varieties · PDM Programme</div>
      </div>
      <div onClick={()=>doLogin('Foundation Programme Officer','foundation_staff','')} style={{background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:8,padding:'9px 12px',color:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
        <div style={{fontSize:20}}>🌿</div>
        <div><div style={{fontSize:10,fontWeight:800}}>AgriMap Foundation Staff?</div><div style={{fontSize:8,opacity:.8,marginTop:1}}>Click to enter as Foundation · YAW Programme Officer</div></div>
        <div style={{marginLeft:'auto',fontSize:14,opacity:.7}}>→</div>
      </div>
    </div>
  )

  return(
    <>
      {/* NAV */}
      <div className="nav">
        <button className="mobile-menu-btn" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
        <div className="logo"><span className="logo-i">🌿</span><span className="logo-t">Agri<span>Map</span></span></div>
        <span className="bdg bdg-ug">🇺🇬 UGANDA</span>
        <span className="bdg bdg-live">● LIVE</span>
        <div className="mtabs">
          {[{t:'production',l:'🌽 Production'},{t:'environment',l:'🛰️ Environment'},{t:'market',l:'📈 Markets'},{t:'inputs',l:'🧴 Inputs'},{t:'finance',l:'💳 Finance'},{t:'youth',l:'👩‍🌾 Youth Farmers'},{t:'dairy',l:'🐄 Dairy'},{t:'programmes',l:'🗺️ Programmes'},{t:'foundation',l:'🌿 Foundation'},{t:'impact',l:'📊 Impact'},{t:'eudr',l:'☕ EUDR'},{t:'concept',l:'📝 Concept Note'},{t:'intelligence',l:'⚠️ Intelligence'},{t:'ai',l:'✨ AI'},{t:'datasources',l:'📊 Data'},{t:'demo',l:'🎯 Demo Mode'}].map(tab=>{
            if(!allowedTabs.includes(tab.t))return null
            const isDemo=tab.t==='demo'
            const isFoundation=tab.t==='foundation'
            const isAI=tab.t==='ai'
            return <button key={tab.t} className={'mtb'+(curTab===tab.t?' on':'')} data-t={tab.t} onClick={()=>setTab(tab.t)}
              style={isDemo?{color:'#fff',fontWeight:800,background:'linear-gradient(135deg,#ea580c,#c2410c)',borderRadius:6,padding:'0 12px'}:isFoundation?{color:'#ea580c',fontWeight:800,background:'rgba(234,88,12,.06)',border:'1px solid rgba(234,88,12,.15)',borderRadius:6}:isAI?{color:'#7c3aed',fontWeight:800,background:'rgba(124,58,237,.06)',border:'1px solid rgba(124,58,237,.15)',borderRadius:6}:undefined}
            >{tab.l}</button>
          })}
        </div>
        <div className="nav-r">
          <select className="nsel" value={crop} onChange={e=>{setCrop(e.target.value)}}>
            {['maize','beans','cassava','coffee','sorghum','rice','banana','groundnut','sunflower','sweetpotato','irishpotato'].map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
          <select className="nsel" value={filtReg} onChange={e=>setFiltReg(e.target.value)}>
            <option value="">All Regions</option>
            {['Central','Eastern','Northern','Western'].map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <div className="srch"><em>🔍</em><input value={searchVal} onChange={e=>setSearchVal(e.target.value)} placeholder="Search…"/></div>
          <button className={'nbtn'+(satOn?' on':'')} onClick={()=>setSatOn(!satOn)}>🛰️ Satellite</button>
          <button className="nbtn" onClick={()=>setDark(!dark)}>{dark?'☀️ Light':'🌙 Dark'}</button>
          <div className="upill" onClick={()=>setMenuOpen(!menuOpen)}>
            <div className="ua" style={{background:curUser?.color||'#16a34a'}}>{curUser?.abbr||'PS'}</div>
            <div><div className="un">{curUser?.name||'Demo'}</div><div className="ur" style={{color:curUser?.color||'#16a34a'}}>{curUser?.roleName||'MAAIF'}</div></div>
            <span style={{fontSize:8,color:'var(--t3)',marginLeft:2}}>▾</span>
            <div className={'umenu'+(menuOpen?' show':'')}>
              <div className="umh"><div className="uhn">{curUser?.name}</div><div className="uhr">{curUser?.roleName}</div><div className="uhd">{curUser?.district?D.find(d=>d.id===curUser.district)?.n+' District':'All Districts'}</div></div>
              <div className="umi">📊 Data Sources</div><div className="umi">📥 Export Report</div>
              <div className="umsep"></div>
              <div className="umi d" onClick={doLogout}>🚪 Logout</div>
            </div>
          </div>
        </div>
      </div>

      {/* SUB BAR */}
      <div className="subbar" style={{top:48}}>
        {subs.map(s=><button key={s} className={'stb'+(s===curSub?' on':'')} onClick={()=>setCurSub(s)}>{SUB_LBL[s]||s}</button>)}
      </div>

      {/* MAIN LAYOUT */}
      <div className="wrap" style={{marginTop:84,height:'calc(100vh - 84px)'}}>
        {/* SIDEBAR */}
        {sidebarOpen&&<div className="sidebar-overlay open" onClick={()=>setSidebarOpen(false)}/>}
        <div className={'sidebar'+(sidebarOpen?' open':'')}>
          <div className="sbh">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div className="sh">Districts</div>
              <button onClick={()=>setSidebarOpen(false)} style={{display:'none',border:'none',background:'none',fontSize:16,cursor:'pointer',color:'var(--t3)',lineHeight:1}} className="sidebar-close-btn">✕</button>
            </div>
            <select className="nsel" style={{width:'100%',marginTop:2}} value={filtReg} onChange={e=>setFiltReg(e.target.value)}>
              <option value="">All Regions</option>
              {['Central','Eastern','Northern','Western'].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="dlist">
            {list.map((d,i)=>{
              const col=getDistColor(d,curTab,curSub,crop),val=getDistVal(d,curTab,curSub,crop)
              const on=curD&&curD.id===d.id
              const distSRR=d.srr[crop]!==undefined?d.srr[crop]:(newCropRegional[crop]?newCropRegional[crop][d.r]||0:0)
              return(
                <div key={d.id} className={'di'+(on?' sel':'')} onClick={()=>{selDist(d.id);setSidebarOpen(false)}}>
                  <div className="rk">{i+1}</div><div className="dn">{d.n}</div>
                  <div className="dbar"><div className="dbf" style={{width:Math.min(100,distSRR*1.4)+'%',background:col}}/></div>
                  <div className="dv" style={{color:col}}>{val}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MAP */}
        <div className="mapwrap">
          <div className="dashbar">
            {[{v:'🇺🇬',l:'Uganda'},{v:avgS+'%',l:cn+' avg',c:cS(avgS)},{v:avgN,l:'Avg NDVI',c:cN(parseFloat(avgN))},{v:'$2.4B',l:'Coffee Export 24/25',c:'#92400e'},{v:avgF+'%',l:'Finance',c:'#2563eb'},{v:avgMM+'%',l:'Mobile Money',c:'#0891b2'},{v:D.filter(d=>d.programmes.markets).length,l:'Markets for Youth',c:'#ea580c'},{v:Object.values(AGRO_DEALERS).reduce((a,v)=>a+v.length,0),l:'Agro-Dealers',c:'var(--gn)'},{v:'3.7B',l:'Milk L/yr',c:'#0e7490'},{v:'4.2M',l:'Food At-Risk',c:'#dc2626'}].map((k,i)=>(
              <div className="dkpi" key={i}><div className="dv" style={{color:k.c}}>{k.v}</div><div className="dl">{k.l}</div></div>
            ))}
          </div>
          <div className="map-area">
            <MapContainer center={[1.5,32.5]} zoom={6} zoomControl={true} attributionControl={false} style={{width:'100%',height:'100%'}}>
              <TileLayer url={tileUrl} maxZoom={19}/>
              <GeoLayer crop={crop} curTab={curTab} curSub={curSub} curD={curD} satOn={satOn} onSelect={selDist}/>
              <MapUpdater center={mapCenter}/>
            </MapContainer>
          </div>
          <div className="map-bl">
            <div className="lgd">
              <div className="lt">{lgd.t}</div>
              <div className="lbar"><div style={{background:'#dc2626'}}/><div style={{background:'#ea580c'}}/><div style={{background:'#ca8a04'}}/><div style={{background:'#16a34a'}}/></div>
              <div className="ll"><span>Low</span><span>High</span></div>
              <div className="lsrc">{lgd.s}</div>
            </div>
            {curTab==='programmes'&&<div className="prog-legend show">
              <div style={{fontSize:8,fontWeight:700,marginBottom:5}}>Programme Coverage</div>
              {[{c:'#16a34a',n:'Markets for Youth'},{c:'#2563eb',n:'AgriMap Farmer ID'},{c:'#0891b2',n:'Ripple Effect Dairy'},{c:'#dc2626',n:'WFP/UNCDF'},{c:'#7c3aed',n:'RUFORUM'}].map(p=>(
                <div className="pl-row" key={p.n}><div className="pl-dot" style={{background:p.c}}/><span>{p.n}</span></div>
              ))}
            </div>}
          </div>
          {curD&&sc&&<div className={'score-box show'}>
            <div className="sb-t">🏆 Agri Score</div>
            {[{l:'Crop',v:sc.crop},{l:'NDVI',v:sc.ndvi},{l:'Soil',v:sc.soil},{l:'Finance',v:sc.fin},{l:'Yield',v:sc.yield},{l:'Market',v:sc.market},{l:'Livestock',v:sc.livestock||0},{l:'Nutrition',v:sc.nutrition||50}].map(r=>(
              <div className="sb-row" key={r.l}><div className="sb-lbl">{r.l}</div><div className="sb-bar"><div className="sb-fill" style={{width:r.v+'%',background:cSc(r.v)}}/></div><div className="sb-val" style={{color:cSc(r.v)}}>{r.v}</div></div>
            ))}
            <div style={{marginTop:5,fontSize:9,fontWeight:700,textAlign:'center',color:cSc(sc.total)}}>{sc.total}/100 · {sc.grade}</div>
          </div>}
        </div>

        {/* RIGHT PANEL */}
        <div className={'rp'+(rpOpen?' open':'')}>
          <div className="rp-handle" onClick={()=>setRpOpen(!rpOpen)}/>
          {!curD?renderNationalOverview():(
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              {renderPanelHeader()}
              <div className="rp-stabs">
                {subs.map(s=><button key={s} className={'rptb'+(s===curSub?' on':'')} onClick={()=>setCurSub(s)}>{SUB_LBL[s]||s}</button>)}
              </div>
              {renderPanelContent()}
            </div>
          )}
        </div>
      </div>

      {/* VOICE BUTTON WITH LANGUAGE DROPDOWN */}
      <VoiceButton curD={curD} crop={crop}/>

      {/* MOBILE TAB BAR */}
      <div className="mobile-tab-bar">
        {[{t:'production',i:'🌽'},{t:'market',i:'📈'},{t:'youth',i:'👩‍🌾'},{t:'ai',i:'✨'},{t:'finance',i:'💳'}].filter(t=>allowedTabs.includes(t.t)).slice(0,5).map(t=>(
          <button key={t.t} className={curTab===t.t?'on':''} onClick={()=>setTab(t.t)}>
            <span className="mtb-icon">{t.i}</span>{t.t.charAt(0).toUpperCase()+t.t.slice(1)}
          </button>
        ))}
      </div>
    </>
  )
}

// ══════════════════════════════════════════════
// VOICE BUTTON — Gemini Live Audio via WebSocket
// ══════════════════════════════════════════════
const VOICE_LANGS=[
  {code:'sw',name:'Kiswahili',flag:'🇹🇿'},
  {code:'am',name:'አማርኛ',flag:'🇪🇹'},
  {code:'om',name:'Oromoo',flag:'🇪🇹'}
]
const SAMPLE_RATE=16000

function arrayBufferToBase64(buf){const b=new Uint8Array(buf);let s='';for(let i=0;i<b.byteLength;i++)s+=String.fromCharCode(b[i]);return btoa(s)}

function VoiceButton({curD,crop}){
  const[open,setOpen]=useState(false)
  const[lang,setLang]=useState('sw')
  const[active,setActive]=useState(false)
  const[listening,setListening]=useState(false)
  const[speaking,setSpeaking]=useState(false)
  const[inTx,setInTx]=useState('')
  const[outTx,setOutTx]=useState('')
  const[err,setErr]=useState('')
  const wsRef=useRef(null)
  const ctxRef=useRef(null)
  const procRef=useRef(null)
  const streamRef=useRef(null)
  const playQRef=useRef([])
  const playingRef=useRef(false)
  const playCtxRef=useRef(null)
  const stopRef=useRef(null)

  const langInfo=VOICE_LANGS.find(l=>l.code===lang)||VOICE_LANGS[0]

  const nextTimeRef=useRef(0)
  const playNext=useCallback(async()=>{
    if(playingRef.current)return
    playingRef.current=true;setSpeaking(true)
    const drain=()=>{
      if(playQRef.current.length===0){playingRef.current=false;setSpeaking(false);nextTimeRef.current=0;return}
      if(!playCtxRef.current)playCtxRef.current=new AudioContext({sampleRate:24000})
      const ctx=playCtxRef.current
      // Merge all queued chunks into one buffer for smooth playback
      const chunks=[];while(playQRef.current.length>0)chunks.push(playQRef.current.shift())
      let totalLen=0;const arrays=chunks.map(pcm=>{const i16=new Int16Array(pcm.buffer,pcm.byteOffset,pcm.byteLength/2);totalLen+=i16.length;return i16})
      const f32=new Float32Array(totalLen);let off=0
      for(const i16 of arrays){for(let i=0;i<i16.length;i++)f32[off++]=i16[i]/32768}
      const buf=ctx.createBuffer(1,f32.length,24000)
      buf.getChannelData(0).set(f32)
      const src=ctx.createBufferSource();src.buffer=buf;src.connect(ctx.destination)
      // Schedule seamlessly after previous chunk
      const now=ctx.currentTime
      const startAt=Math.max(now,nextTimeRef.current)
      nextTimeRef.current=startAt+buf.duration
      src.onended=()=>{if(playQRef.current.length>0)drain();else{playingRef.current=false;setSpeaking(false);nextTimeRef.current=0}}
      src.start(startAt)
    }
    // Wait a tiny bit to let chunks accumulate, then drain
    setTimeout(drain,80)
  },[])

  const stop=useCallback(()=>{
    if(wsRef.current&&wsRef.current.readyState===WebSocket.OPEN){
      try{wsRef.current.send(JSON.stringify({type:'stop'}))}catch(e){}
      wsRef.current.close()
    }
    wsRef.current=null
    if(procRef.current){procRef.current.disconnect();procRef.current=null}
    if(ctxRef.current){ctxRef.current.close().catch(()=>{});ctxRef.current=null}
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null}
    if(playCtxRef.current){playCtxRef.current.close().catch(()=>{});playCtxRef.current=null}
    playQRef.current=[];playingRef.current=false
    setActive(false);setListening(false);setSpeaking(false)
  },[])
  stopRef.current=stop

  const start=useCallback(async()=>{
    setErr('');setInTx('');setOutTx('')
    try{
      const proto=window.location.protocol==='https:'?'wss:':'ws:'
      const host=window.location.host
      const ws=new WebSocket(`${proto}//${host}/api/voice`)
      wsRef.current=ws
      await new Promise((res,rej)=>{ws.onopen=()=>res();ws.onerror=()=>rej(new Error('Cannot connect to voice server. Start the backend: cd swahili && uvicorn app.main:app --port 8000'));setTimeout(()=>rej(new Error('Connection timeout')),5000)})

      ws.onmessage=(e)=>{
        const msg=JSON.parse(e.data)
        if(msg.type==='audio'){const raw=atob(msg.data);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);playQRef.current.push(bytes);playNext()}
        else if(msg.type==='input_transcript')setInTx(p=>p+msg.text)
        else if(msg.type==='output_transcript')setOutTx(p=>p+msg.text)
        else if(msg.type==='error'){setErr(msg.message);setTimeout(()=>stopRef.current?.(),2000)}
        else if(msg.type==='turn_complete'){setSpeaking(false);setTimeout(()=>{setInTx('');setOutTx('')},3000)}
      }
      ws.onclose=()=>{if(wsRef.current)stopRef.current?.()}

      const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}})
      streamRef.current=stream
      const audioCtx=new AudioContext();ctxRef.current=audioCtx
      const nativeSR=audioCtx.sampleRate
      const source=audioCtx.createMediaStreamSource(stream)
      const proc=audioCtx.createScriptProcessor(2048,1,1);procRef.current=proc
      let silenceFrames=0
      proc.onaudioprocess=(ev)=>{
        if(ws.readyState!==WebSocket.OPEN)return
        const f32=ev.inputBuffer.getChannelData(0)
        // Check volume — skip silence
        let maxAmp=0
        for(let i=0;i<f32.length;i++){const a=Math.abs(f32[i]);if(a>maxAmp)maxAmp=a}
        if(maxAmp<0.01){silenceFrames++;if(silenceFrames>10)return}else{silenceFrames=0}
        let samples=f32
        if(nativeSR!==SAMPLE_RATE){const ratio=nativeSR/SAMPLE_RATE;const nl=Math.round(f32.length/ratio);samples=new Float32Array(nl);for(let i=0;i<nl;i++)samples[i]=f32[Math.round(i*ratio)]}
        const i16=new Int16Array(samples.length);for(let i=0;i<samples.length;i++)i16[i]=Math.max(-32768,Math.min(32767,Math.round(samples[i]*32768)))
        ws.send(JSON.stringify({type:'audio',data:arrayBufferToBase64(i16.buffer)}))
      }
      source.connect(proc);proc.connect(audioCtx.destination)
      setActive(true);setListening(true)
    }catch(e){setErr(e.message);stop()}
  },[stop,playNext])

  const toggle=()=>{if(active)stop();else start()}

  useEffect(()=>()=>stopRef.current?.(),[])

  const bx={position:'fixed',bottom:76,right:20,zIndex:4000}
  const panelStyle={position:'absolute',bottom:60,right:0,width:300,background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.25)',padding:14,display:open?'block':'none'}

  return(
    <div style={bx}>
      <div style={panelStyle}>
        <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1.5,color:'var(--t3)',marginBottom:10}}>🎙️ Voice Assistant</div>

        {/* Language selector */}
        <div style={{display:'flex',gap:4,marginBottom:12}}>
          {VOICE_LANGS.map(l=>(
            <button key={l.code} onClick={()=>{if(!active)setLang(l.code)}} style={{flex:1,padding:'8px 4px',borderRadius:8,border:lang===l.code?'2px solid #16a34a':'1px solid var(--bd)',background:lang===l.code?'rgba(22,163,74,.1)':'var(--s2)',cursor:active?'default':'pointer',opacity:active&&lang!==l.code?.4:1,textAlign:'center',transition:'.2s'}}>
              <div style={{fontSize:18}}>{l.flag}</div>
              <div style={{fontSize:9,fontWeight:700,color:lang===l.code?'#16a34a':'var(--t2)',marginTop:2}}>{l.name}</div>
            </button>
          ))}
        </div>

        {/* Big mic button */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:12}}>
          <button onClick={toggle} style={{width:72,height:72,borderRadius:'50%',border:'none',cursor:'pointer',background:active?'linear-gradient(135deg,#dc2626,#b91c1c)':'linear-gradient(135deg,#16a34a,#15803d)',color:'white',fontSize:28,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:active?'0 0 0 8px rgba(220,38,38,.15), 0 4px 20px rgba(220,38,38,.3)':'0 4px 20px rgba(22,163,74,.3)',transition:'.2s',animation:active?'vpulse 1.5s infinite':'none'}}>
            {active?'⏹':'🎙️'}
          </button>
        </div>

        {/* Status */}
        <div style={{textAlign:'center',fontSize:11,fontWeight:700,color:active?(speaking?'#dc2626':'#16a34a'):'var(--t2)',marginBottom:8}}>
          {active?(speaking?'🔊 Speaking...':'🎤 Listening — speak in '+langInfo.name):'Tap mic to start'}
        </div>

        {/* Transcripts */}
        {inTx&&<div style={{padding:8,background:'rgba(22,163,74,.08)',borderRadius:8,fontSize:10,color:'var(--tx)',marginBottom:4,border:'1px solid rgba(22,163,74,.2)'}}>
          <span style={{fontSize:8,fontWeight:700,color:'#16a34a'}}>YOU:</span> {inTx}
        </div>}
        {outTx&&<div style={{padding:8,background:'rgba(8,145,178,.08)',borderRadius:8,fontSize:10,color:'var(--tx)',marginBottom:4,border:'1px solid rgba(8,145,178,.2)'}}>
          <span style={{fontSize:8,fontWeight:700,color:'#0891b2'}}>AI:</span> {outTx}
        </div>}

        {/* Error */}
        {err&&<div style={{padding:8,background:'rgba(220,38,38,.08)',borderRadius:8,fontSize:9,color:'#dc2626',border:'1px solid rgba(220,38,38,.2)'}}>{err}</div>}

        {/* Context */}
        <div style={{marginTop:8,fontSize:8,color:'var(--t3)',textAlign:'center'}}>
          {curD?`📍 ${curD.n} District · ${curD.r} Region`:'Select a district for context'}
        </div>
      </div>

      {/* Floating button */}
      <button onClick={()=>{if(!open)setOpen(true);else if(active){stop();setOpen(false)}else setOpen(false)}} style={{width:52,height:52,borderRadius:'50%',background:active?'linear-gradient(135deg,#dc2626,#b91c1c)':open?'linear-gradient(135deg,#374151,#1f2937)':'linear-gradient(135deg,#16a34a,#15803d)',border:'none',cursor:'pointer',boxShadow:active?'0 0 0 6px rgba(220,38,38,.15), 0 4px 16px rgba(220,38,38,.3)':'0 4px 16px rgba(22,163,74,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#fff',transition:'.2s',animation:active?'vpulse 1.5s infinite':'none'}} title="Voice Assistant">
        {active?'🔴':open?'✕':'🎙️'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════
// PANEL HTML BUILDER — ported verbatim from original
// Uses HTML string building for 100% feature parity
// ══════════════════════════════════════════════
function buildPanelHTML(d,c,cn,sc,s,curTab){
  let html=''
  const mp=PRICES[c]||PRICES.maize

  // ── PRODUCTION: crop ──
  if(s==='crop'){
    const natHH2={maize:55,beans:48,cassava:55,coffee:35,sorghum:28,rice:12,banana:35}
    html+='<div class="card gn"><div class="ch">🌽 Crop Adoption — '+d.n+' vs National (AAS 2021/22)</div>'
    html+='<div style="font-size:8px;color:var(--t2);margin-bottom:6px">Bar = '+d.n+' adoption % · Purple dot = national avg (UBOS AAS 2021/22)</div>';
    ['maize','beans','cassava','coffee','sorghum','rice','banana'].forEach(cr=>{
      const v=d.srr[cr],col=cS(v),nat2=natHH2[cr]||30
      const p2=PRICES[cr]
      html+='<div style="margin-bottom:5px">'
      html+='<div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:1px">'
      html+='<b>'+cr.charAt(0).toUpperCase()+cr.slice(1)+'</b>'
      html+='<span style="color:'+col+'">'+v+'% · '+(v>nat2?'<span style="color:var(--gn)">+'+(v-nat2)+'pp above nat.</span>':'<span style="color:var(--rd)">'+(v-nat2)+'pp below nat.</span>')+' · '+(p2?'UGX '+p2.farmgate.toLocaleString()+'/kg':'—')+'</span></div>'
      html+='<div style="height:5px;background:var(--s3);border-radius:3px;position:relative">'
      html+='<div style="width:'+v+'%;height:100%;background:'+col+';border-radius:3px"></div>'
      html+='<div style="position:absolute;left:'+nat2+'%;top:-2px;width:2px;height:9px;background:#7c3aed;border-radius:1px"></div>'
      html+='</div></div>'
    })
    html+='<span class="src">UBOS Annual Agricultural Survey 2020.</span></div>'
    html+='<div class="card"><div class="ch">📅 Season</div>'+(d.r==='Northern'?'<b>Unimodal</b> — Apr–Oct. Cassava, sorghum, beans S1 only.':'<b>Bimodal</b> — S1 Mar–Jun + S2 Aug–Dec. 2 crop cycles/year.')+'<span class="src">UNMA Uganda Rainfall Atlas.</span></div>'
  }
  // ── PRODUCTION: yield ──
  else if(s==='yield'){
    const ymax={maize:7,beans:2.8,cassava:35,sorghum:5,rice:7,banana:25,coffee:4}
    const ynational={maize:2.2,beans:0.9,cassava:11.0,sorghum:1.1,rice:2.4,banana:16.2}
    html+='<div class="card bl"><div class="ch">📐 Yield Analysis — '+d.n+' (UBOS AAS 2021/22)</div>';
    ['maize','beans','cassava','sorghum','rice','banana'].forEach(cr=>{
      const v=d.yld[cr];if(!v)return
      const pot=ymax[cr]||3,natAvg=ynational[cr]||v,pct=Math.round(v/pot*100),col=cS(pct),vsNat=Math.round((v-natAvg)/natAvg*100)
      html+='<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px"><b>'+cr.charAt(0).toUpperCase()+cr.slice(1)+'</b><span><b style="color:'+col+'">'+v+'t/ha</b> · nat.avg '+natAvg+'t · pot '+pot+'t · <span style="color:'+(vsNat>=0?'var(--gn)':'var(--rd)')+'">'+( vsNat>=0?'+':'')+vsNat+'% vs nat.</span></span></div><div style="height:5px;background:var(--s3);border-radius:3px;position:relative"><div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:3px"></div><div style="position:absolute;left:'+Math.round(natAvg/pot*100)+'%;top:-2px;width:2px;height:9px;background:#7c3aed;border-radius:1px"></div></div></div>'
    })
    html+='<span class="src">Source: UBOS UHIS-AAS 2021/22 + NARO ATAAS yield potential data.</span></div>'
  }
  // ── ENVIRONMENT: ndvi ──
  else if(s==='ndvi'){
    const ndviStatus=d.ndvi>.65?'🟢 Healthy canopy':d.ndvi>.50?'🟡 Moderate — monitor':d.ndvi>.35?'🟠 Stressed — intervention needed':'🔴 Critical'
    const ndviChange=(d.ndvi-d.ndvi_p).toFixed(2)
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:'+cN(d.ndvi)+'">'+d.ndvi.toFixed(2)+'</div><div class="kl">Current NDVI</div></div><div class="kpi"><div class="kv" style="color:'+cN(d.ndvi_p)+'">'+d.ndvi_p.toFixed(2)+'</div><div class="kl">Previous NDVI</div></div></div>'
    html+='<div class="card bl"><div class="ch">🛰️ Vegetation Health Analysis — '+d.n+'</div>Status: <b>'+ndviStatus+'</b><br>Trend: <b>'+(d.ndvi>=d.ndvi_p?'📈 Improving':'📉 Declining')+'</b> (Δ'+ndviChange+')<br>Flood risk: <b>'+(d.flood===0?'🟢 Low':d.flood===1?'🟡 Medium':'🔴 High')+'</b><br>Elevation: <b>'+d.elev+'</b><span class="src">Source: Sentinel-2 + NASA MODIS via Google Earth Engine.</span></div>'
  }
  // ── ENVIRONMENT: soil ──
  else if(s==='soil'){
    html+='<div class="card pp"><div class="ch">🧪 '+d.soil.type+'</div>pH: <b>'+d.soil.ph+'</b> '+(d.soil.ph<5.5?'<span style="color:var(--rd)">⚠️ Acidic</span>':'<span style="color:var(--gn)">✅ OK</span>')+'</div>'
    html+='<div class="card"><div class="ch">🌿 Nutrients</div>';
    [{n:'Nitrogen',v:d.soil.n},{n:'Phosphorus',v:d.soil.p},{n:'Potassium',v:d.soil.k},{n:'Organic C',v:d.soil.oc}].forEach(nt=>{
      const col=nt.v==='H'?'var(--gn)':nt.v==='M'?'var(--am)':'var(--rd)',w=nt.v==='H'?90:nt.v==='M'?55:25
      html+='<div class="row"><div class="rl">'+nt.n+'</div><div class="rb"><div class="rbf" style="width:'+w+'%;background:'+col+'"></div></div><div class="rv" style="color:'+col+'">'+(nt.v==='H'?'High':nt.v==='M'?'Med':'Low')+'</div></div>'
    })
    html+='<span class="src">FAO-GAEZ + ISRIC + NARO.</span></div><div class="card gn"><div class="ch">💡 Recommendation</div>'+d.soil.note+'</div>'
  }
  // ── MARKET: live_prices ──
  else if(s==='live_prices'){
    html+='<div class="card gn"><div class="ch">💰 Live Market Prices — Uganda April 2026</div>'
    const groups=[{title:'Staple Crops',crops:['maize','beans','cassava','banana','sorghum']},{title:'Cash Crops',crops:['coffee','rice','groundnut','sunflower']},{title:'Livestock & Produce',crops:['milk','fish','sweetpotato','irishpotato']}]
    groups.forEach(g=>{
      html+='<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin:6px 0 3px">'+g.title+'</div>'
      g.crops.forEach(cr=>{
        const p=PRICES[cr];if(!p)return
        const arr=p.trend==='up'?'▲':p.trend==='dn'?'▼':'—',acol=p.trend==='up'?'var(--gn)':p.trend==='dn'?'var(--rd)':'var(--t3)'
        html+='<div class="price-card"><div class="pc-left"><div class="pc-crop">'+p.name+'</div><div class="pc-mkt">'+p.unit+'</div></div><div class="pc-right"><div class="pc-price">'+p.kampala.toLocaleString()+'</div><div class="pc-sub">Farmgate: '+p.farmgate.toLocaleString()+'</div><div class="pc-trend" style="color:'+acol+'">'+arr+' '+p.trend_pct+'%</div></div></div>'
      })
    })
    html+='<span class="src">Source: Farmgain Africa + MAAIF + ACSA Uganda 2026.</span></div>'
  }
  // ── FINANCE: inclusion ──
  else if(s==='inclusion'){
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:'+cF(d.fin)+'">'+d.fin+'%</div><div class="kl">Any Finance</div></div><div class="kpi"><div class="kv" style="color:var(--cy)">'+d.mm+'%</div><div class="kl">Mobile Money</div></div><div class="kpi"><div class="kv" style="color:var(--pp)">'+d.sacco+'%</div><div class="kl">SACCO</div></div><div class="kpi"><div class="kv" style="color:var(--rd)">'+(100-d.fin)+'%</div><div class="kl">Excluded</div></div></div>'
    html+='<div class="card bl"><div class="ch">📊 Financial Inclusion — '+d.n+' vs National (FinScope 2023)</div>';
    [{l:'Any financial access',dist:d.fin,nat:64,col:'var(--bl)'},{l:'Mobile money',dist:d.mm,nat:64,col:'var(--cy)'},{l:'SACCO membership',dist:d.sacco,nat:14,col:'var(--pp)'},{l:'Bank account',dist:d.bank,nat:17,col:'var(--bl)'}].forEach(r=>{
      html+='<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:1px"><span>'+r.l+'</span><span style="color:'+r.col+';font-weight:700">'+r.dist+'%</span></div><div style="height:5px;background:var(--s3);border-radius:3px;position:relative"><div style="width:'+r.dist+'%;height:100%;background:'+r.col+';border-radius:3px"></div><div style="position:absolute;left:'+r.nat+'%;top:-2px;width:2px;height:9px;background:#7c3aed;border-radius:1px"></div></div></div>'
    })
    html+='<span class="src">Source: FinScope Uganda 2023.</span></div>'
  }
  // ── PRODUCTION: srr ──
  else if(s==='srr'){
    const sv=d.srr[c]||0,natHH={maize:55,beans:48,cassava:55,sorghum:28,rice:12,banana:35},nat=natHH[c]||30
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:'+cS(sv)+'">'+sv+'%</div><div class="kl">'+d.n+' HH adoption</div></div><div class="kpi"><div class="kv" style="color:var(--t3)">'+nat+'%</div><div class="kl">National avg (AAS 2021/22)</div></div></div>'
    html+='<div class="card am"><div class="ch">📊 Crop Adoption — UBOS AAS 2021/22</div>'+cn+' adoption in '+d.n+': <b style="color:'+cS(sv)+'">'+sv+'%</b> of HH<br>National average: <b>'+nat+'%</b> · '+(sv>nat?'<span style="color:var(--gn)">✅ Above average</span>':'<span style="color:var(--rd)">📉 Below average</span>')+'<br>Inorganic fertilizer use: <b>7%</b> nationally · Certified seed: <b>~25%</b><br>Market access: <b>55.4%</b> of agri HH<span class="src">Source: UBOS UHIS-AAS 2021/22.</span></div>'
    html+='<div class="card gn"><div class="ch">💡 How to Improve Adoption</div>1. Access certified '+cn+' seed from verified agro-dealer<br>2. Use recommended fertilizer rate — DAP at planting + Urea 4 weeks<br>3. Join a farmer group for bulk input purchasing<br>4. Register on AgriMap Farmer ID — unlocks input credit<br>Target: close the <b>'+(100-sv)+'% gap</b><span class="src">Source: MAAIF + NARO 2023.</span></div>'
  }
  // ── PRODUCTION: varieties ──
  else if(s==='varieties'){
    const vars={maize:[{n:"LONGE 10H",yld:"7–10t"},{n:"LONGE 6H",yld:"6.5–9t"},{n:"NAROMAIZE 1",yld:"5.5–8t"}],beans:[{n:"NABE 4",yld:"1.8–2.8t"},{n:"NABE 15",yld:"2.2–3.2t"}],cassava:[{n:"NASE 19 ★",yld:"30–50t"},{n:"NASE 14",yld:"25–40t"}],coffee:[{n:"CRI Clone 401",yld:"3–5t"},{n:"Elgon SL14",yld:"2.5–4.5t"}],banana:[{n:"Nakitembe",yld:"18–25t"},{n:"FHIA-17",yld:"22–35t"}]}
    const recs=vars[c]||[{n:'Contact NARO NaCRRI',yld:'—'}]
    recs.forEach(v=>{html+='<div class="card gn"><div class="ch">🌱 '+v.n+'</div>Yield potential: <b style="color:var(--gn)">'+v.yld+' t/ha</b><span class="src">NARO Variety Catalogue 2023.</span></div>'})
  }
  // ── ENVIRONMENT: weather ──
  else if(s==='weather'){
    const bt=d.elev==='Highland'?20:d.elev==='Lowland'?28:24,hv2=hv(d.id)
    const tmax=bt+5+Math.round(Math.sin(hv2*1.3)*3),tmin=bt-6+Math.round(Math.sin(hv2*2.1)*2)
    const rainfall=d.elev==='Highland'?1300:d.r==='Northern'?1050:950
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:var(--rd)">'+tmax+'°C</div><div class="kl">Max Temp</div></div><div class="kpi"><div class="kv" style="color:var(--bl)">'+tmin+'°C</div><div class="kl">Min Temp</div></div><div class="kpi"><div class="kv" style="color:var(--cy)">'+rainfall+'mm</div><div class="kl">Annual Rainfall</div></div><div class="kpi"><div class="kv" style="color:var(--gn)">'+(d.r==='Northern'?'Uni':'Bi')+'modal</div><div class="kl">Rain Pattern</div></div></div>'
    html+='<div class="card bl"><div class="ch">🌧️ Climate Profile — '+d.n+'</div>Rainfall: <b>'+(d.r==='Northern'?'Unimodal Apr–Oct':'Bimodal S1 Mar–Jun + S2 Aug–Dec')+'</b><br>Annual: ~<b>'+rainfall+'mm</b> · Temp: <b>'+tmin+'–'+tmax+'°C</b><br>CHIRPS outlook: <b>'+(d.r==='Northern'?'Below-average — FEWS NET alert':'Near-normal')+'</b><span class="src">Source: UNMA + CHIRPS + FAO-GAEZ.</span></div>'
  }
  // ── ENVIRONMENT: pest ──
  else if(s==='pest'){
    const pests=getPests(d),highRisk=pests.filter(p=>p.risk==='HIGH').length
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:'+(highRisk>0?'var(--rd)':'var(--gn)')+'">'+(highRisk>0?highRisk+' HIGH':'✅ Low')+'</div><div class="kl">Risk Level</div></div><div class="kpi"><div class="kv" style="color:var(--am)">'+pests.length+'</div><div class="kl">Active Alerts</div></div></div>'
    if(!pests.length)html+='<div class="card gn"><div class="ch">✅ No significant pest alerts</div>Standard monitoring: FAW weekly, CBSD before planting, CBB Oct–Feb<span class="src">MAAIF DPP.</span></div>'
    pests.forEach(p=>{html+='<div class="card" style="border-left:3px solid '+p.col+'"><div class="ch">'+p.name+' <span style="font-size:9px;padding:1px 7px;border-radius:4px;background:'+p.col+'22;color:'+p.col+'">'+p.risk+'</span></div><b>Crop:</b> '+p.crop+'<br><b>Alert:</b> '+p.msg+'<span class="src">MAAIF DPP + NARO KARI 2025.</span></div>'})
    html+='<div class="card bl"><div class="ch">📞 Report Emergency</div><b>MAAIF Hotline:</b> 0800-100200 (free, 24/7)<br><b>USSD:</b> *270# → 5<br><b>WhatsApp:</b> +256-700-100200<span class="src">MAAIF DPP Uganda.</span></div>'
  }
  // ── MARKET: market_access ──
  else if(s==='market_access'){
    html+='<div class="card bl"><div class="ch">🏪 Market Access — '+d.n+'</div>Nearest major market: <b>'+({Central:'Kampala (Owino, Nakawa)',Eastern:'Mbale, Jinja, Busia border',Northern:'Gulu, Lira markets',Western:'Mbarara, Fort Portal'}[d.r]||'Kampala')+'</b><br>Transport penalty: <b>~UGX 100–200/kg per 100km</b><br>Export hubs: <b>Busia (Kenya), Malaba, Mutukula (Tanzania)</b><span class="src">MAAIF MIS + UCE 2024.</span></div>'
    html+='<div class="card gn"><div class="ch">🌽 Markets for Youth — '+d.n+'</div>'+(d.programmes.markets?'✅ <b>Active</b> — Youth can access aggregation points, buyer connections, value chain training.':'📌 Not yet active. Opportunity for expansion.')+'<span class="src">YAW Programme Register 2025.</span></div>'
  }
  // ── MARKET: coffee ──
  else if(s==='coffee'){
    if(d.coffee_prod>0){
      html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:#92400e">'+Math.round(d.coffee_ha/1000)+'K</div><div class="kl">Area (ha)</div></div><div class="kpi"><div class="kv" style="color:#92400e">'+Math.round(d.coffee_prod/1000)+'K</div><div class="kl">Prod (MT)</div></div></div>'
      html+='<div class="card or"><div class="ch">☕ '+d.coffee_type+' — '+d.n+'</div>Area: <b>'+d.coffee_ha.toLocaleString()+' ha</b> · Production: <b>'+d.coffee_prod.toLocaleString()+' MT</b><br><br><b>Farmgate Prices (2025 Record):</b><br>Robusta FAQ: <b>UGX 14,000–18,000/kg</b><br>Arabica Parchment: <b>UGX 18,000–24,000/kg</b><br>ICE Robusta: <b>US$4.85/kg</b><span class="src">MAAIF Coffee Report 2025 + ICO April 2026.</span></div>'
    } else html+='<div class="card">'+d.n+' is not a primary coffee zone.<span class="src">UCDA 2023/24.</span></div>'
    html+='<div class="card"><div class="ch">🇺🇬 Uganda Coffee 2024/25 (Record)</div>Exports: <b>8.4M bags · $2.4B USD</b> (+77% value)<br>Robusta 87% · Arabica 13% · Farmers: <b>1.8M HH</b><br>EU destination: <b>72%</b> · 2030 target: <b>20M bags</b><span class="src">MAAIF + USDA FAS 2025.</span></div>'
  }
  // ── MARKET: sell_advice ──
  else if(s==='sell_advice'){
    const mp2=PRICES[c]||PRICES.maize,gap=mp2.kampala-mp2.farmgate,gapPct=Math.round(gap/mp2.kampala*100)
    html+='<div class="card gn"><div class="ch">📊 Sell Advice — '+cn+' in '+d.n+'</div>Kampala: <b>UGX '+mp2.kampala.toLocaleString()+'/kg</b><br>Farmgate: <b>UGX '+mp2.farmgate.toLocaleString()+'/kg</b><br>Trader margin: <b>'+gapPct+'% (UGX '+gap.toLocaleString()+'/kg)</b><br><br><b>Trend:</b> '+(mp2.trend==='up'?'📈 Rising — consider waiting':'📉 Sell now')+'<br><b>Season:</b> '+mp2.season_note+'<br><br><b>Better price:</b> Join cooperative, store if possible, sell at Busia border<span class="src">Farmgain Africa 2025.</span></div>'
  }
  // ── MARKET: export ──
  else if(s==='export'){
    html+='<div class="card or"><div class="ch" style="color:#92400e">🌍 Uganda Exports 2024/25</div>Total: <b>~US$6.8B</b> · Agriculture: <b>~48%</b><br><br>';
    [{crop:'Coffee',val:'US$2.4B',trend:'📈 Record +77%'},{crop:'Fish',val:'US$330M',trend:'📈 Growing'},{crop:'Maize & Cereals',val:'US$180M',trend:'➡️ Stable'},{crop:'Tea',val:'US$95M',trend:'📈 Growing'},{crop:'Vanilla',val:'US$48M',trend:'📈 Growing'}].forEach(e=>{
      html+='<div style="padding:5px;background:var(--s1);border-radius:5px;margin-bottom:3px;font-size:9px;border:1px solid var(--bd)"><div style="display:flex;justify-content:space-between"><b>'+e.crop+'</b><span style="color:var(--gn)">'+e.val+'</span></div>'+e.trend+'</div>'
    })
    html+='<span class="src">UBOS Statistical Abstract 2024 + MAAIF.</span></div>'
  }
  // ── INPUTS: fertilizer ──
  else if(s==='fertilizer'){
    html+='<div class="card am"><div class="ch">🧴 Fertilizer — '+d.n+'</div>Uganda use: <b>2–3kg/ha</b> vs rec. <b>50–100kg/ha</b><br>DAP: <b>UGX 185,000/50kg</b> · Urea: <b>UGX 160,000/50kg</b><span class="src">UBOS AAS 2020 + MAAIF.</span></div>';
    [{crop:'Maize',rec:'DAP 50kg/ha + Urea 50kg/ha 4wks',roi:'UGX 250K → 800K'},{crop:'Beans',rec:'DAP 25kg/ha (no N)',roi:'UGX 100K → 400K'},{crop:'Coffee',rec:'NPK 25:5:5 200g/tree 2×/yr',roi:'UGX 400K → 1.2M/acre'},{crop:'Banana',rec:'Mulch + NPK 100g/stool',roi:'High ROI'}].forEach(f=>{
      html+='<div style="padding:5px;background:var(--s1);border-radius:5px;margin-bottom:4px;font-size:9px;border:1px solid var(--bd)"><div style="font-weight:700;color:var(--am)">'+f.crop+'</div>'+f.rec+'<br><span style="color:var(--gn)">'+f.roi+'</span></div>'
    })
    html+='<span class="src">NARO Agronomy + MAAIF Extension 2023.</span>'
  }
  // ── INPUTS: seed ──
  else if(s==='seed'){
    const adCount=(AGRO_DEALERS[d.id]||[]).length
    html+='<div class="card gn"><div class="ch">🌱 Seed System — '+d.n+'</div>Improved seed use: <b>'+d.srr[c]+'%</b> · National: <b>~25%</b><br>Counterfeit risk: <b>~30%</b><br>MAAIF target: <b>50% by 2025</b><br><b>Sources:</b> '+adCount+' agro-dealers · NARO NaCRRI · SeedCo<span class="src">UBOS AAS 2021/22 + NARO.</span></div>'
    html+='<div class="card or"><div class="ch">🔐 Seed Traceability Initiative</div>QR code on every certified seed bag · Digital purchase wallet · Verified agro-dealer registry<br><b>Target:</b> 500,000 youth with traced seed by 2027<span class="src">Uganda Seed Systems Initiative.</span></div>'
  }
  // ── INPUTS: agrodealers ──
  else if(s==='agrodealers'){
    const dealers=AGRO_DEALERS[d.id]||[],mcpCount=dealers.filter(x=>x.mcp).length
    html+='<div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7;margin-bottom:3px">MAAIF AGRO-DEALER REGISTRY</div><div style="font-size:13px;font-weight:800">🏪 '+d.n+' — '+dealers.length+' Registered Dealers</div><div style="font-size:9px;opacity:.85;margin-top:3px">💳 '+mcpCount+' Digital Input Voucher enabled</div></div>'
    dealers.forEach(dl=>{
      html+='<div class="ad-card'+(dl.mcp?' voucher-active':'')+'"><div class="ad-name">'+dl.name+'</div><div class="ad-type">'+dl.type+'</div>'
      if(dl.mcp)html+='<div class="mcp-badge">🎫 VOUCHER</div>'
      html+='<div class="ad-row"><b>📍 Location</b>'+dl.addr+'</div><div class="ad-row"><b>📞 Phone</b>'+dl.phone+'</div><div class="ad-row"><b>✅ Cert</b>'+dl.cert+'</div>'
      html+='<div class="ad-products">'+dl.products.map(p=>'<span class="ad-pill" style="background:rgba(22,163,74,.08);color:var(--gn);border:1px solid rgba(22,163,74,.15)">'+p+'</span>').join('')+'</div></div>'
    })
    if(!dealers.length)html+='<div class="card">No registered agro-dealers in '+d.n+' yet. Contact MAAIF for registration.<span class="src">MAAIF Agro-Dealer Registry.</span></div>'
  }
  // ── INPUTS: advisory/extension ──
  else if(s==='advisory'||s==='digital_vouchers'){
    html+='<div class="card bl"><div class="ch">📋 Extension Services — '+d.n+'</div>Extension ratio: <b>1:1,500</b> (target 1:500)<br>Mobile phone: <b>'+d.mm+'%</b> · Digital advisory: <b>~180,000 farmers</b> nationally<span class="src">MAAIF Extension Strategy 2020–2025.</span></div>'
  }
  // ── INPUTS: calendar ──
  else if(s==='calendar'){
    html+='<div class="card gn"><div class="ch">📅 Seasonal Calendar — '+d.r+'</div>';
    if(d.r==='Northern')html+='Jan–Mar: Land prep · Apr–May: Plant · Jun–Jul: Weed · Aug–Sep: Scout FAW · Oct: Harvest · Nov–Dec: Conservation'
    else html+='<b>S1:</b> Mar–Apr plant · May–Jun weed · Jun–Jul harvest<br><b>S2:</b> Aug–Sep plant · Oct weed · Nov–Dec harvest<br>Coffee: <b>Robusta Oct–Feb</b> · Arabica Jun–Aug + Nov–Jan'
    html+='<span class="src">MAAIF + UNMA Seasonal Calendar.</span></div>'
  }
  // ── FINANCE: divoucher ──
  else if(s==='divoucher'){
    html+='<div class="card or"><div class="ch" style="color:var(--or)">🔐 AgriMap Input Voucher System — '+d.n+'</div>'
    html+=(d.programmes.mcp?'<b style="color:var(--gn)">✅ ACTIVE</b>':'<b style="color:var(--rd)">📌 Not yet active</b>')+'<br><br><b>Enables:</b> Digital farmer ID · Input credit at agro-dealers · SACCO loans · Market payments · PDM disbursements<br>Finance gap: <b>'+(100-d.fin)+'%</b> · Mobile money base: <b>'+d.mm+'%</b><span class="src">AgriMap Digital Voucher System + FinScope 2023.</span></div>'
  }
  // ── FINANCE: saccos ──
  else if(s==='saccos'){
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:var(--pp)">'+d.sacco+'%</div><div class="kl">SACCO Access</div></div><div class="kpi"><div class="kv" style="color:var(--bl)">'+(100-d.sacco)+'%</div><div class="kl">Not in SACCO</div></div></div>'
    html+='<div class="card pp"><div class="ch">🏦 SACCO Landscape — '+d.n+'</div>National: <b>14%</b> (up from 5% in 2018) · PDM: <b>UGX 100M/parish</b> at 6%<br>'+d.n+': <b>'+d.sacco+'%</b> · Avg loan: <b>UGX 800K–2.5M</b><span class="src">FinScope 2023 + Bank of Uganda.</span></div>'
  }
  // ── FINANCE: agrifinance ──
  else if(s==='agrifinance'){
    html+='<div class="card gn"><div class="ch">💼 Agri-Finance Products</div>';
    [{b:'PDM SACCOs',rate:'6% p.a.',notes:'UGX 100M/parish govt seed capital'},{b:'DFCU Bank',rate:'18–20%',notes:'6-month seasonal'},{b:'Centenary Bank',rate:'18%',notes:'Group guarantee accepted'},{b:'Equity Bank — Youth',rate:'15%',notes:'Youth account 0% fees'},{b:'Digital Input Voucher Credit',rate:'0% advance',notes:'Input credit repaid at harvest'}].forEach(b=>{
      html+='<div style="padding:5px;background:var(--s1);border-radius:5px;margin-bottom:3px;font-size:9px;border:1px solid var(--bd)"><div style="display:flex;justify-content:space-between"><b style="color:var(--gn)">'+b.b+'</b><span style="font-weight:700">'+b.rate+'</span></div>'+b.notes+'</div>'
    })
    html+='<span class="src">Bank of Uganda 2023 + PDM Programme.</span></div>'
  }
  // ── YOUTH: profile ──
  else if(s==='profile'){
    html+='<div class="yf-header"><div class="yh-label">Youth Farmer Dashboard</div><div class="yh-title">'+d.n+' District — Youth Agriculture Profile</div><div class="yh-sub">'+d.r+' Region · '+d.elev+' Zone</div></div>'
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:var(--cy)">'+d.youth+'%</div><div class="kl">Youth in Agri</div></div><div class="kpi"><div class="kv" style="color:var(--pk)">'+d.women+'%</div><div class="kl">Women Farmers</div></div><div class="kpi"><div class="kv" style="color:var(--bl)">'+d.fin+'%</div><div class="kl">Finance Access</div></div><div class="kpi"><div class="kv" style="color:var(--rd)">'+(100-d.fin)+'%</div><div class="kl">Finance Gap</div></div></div>'
    html+='<div class="card cy"><div class="ch">🗺️ Active Programmes</div>';
    const activeP=Object.entries(d.programmes).filter(e=>e[1])
    if(!activeP.length)html+='No active programmes in this district yet.'
    activeP.forEach(e=>{const info=PROG_INFO[e[0]];if(info)html+='<div style="padding:4px;margin-bottom:3px;border-radius:5px;background:var(--s1);border:1px solid var(--bd);font-size:9px"><b style="color:'+info.color+'">'+info.name+'</b><br>'+info.focus+'</div>'})
    html+='<span class="src">AgriMap Programme Register 2025.</span></div>'
    html+='<div class="card gn"><div class="ch">📊 District Youth Context</div>Uganda: <b>55% aged ≤30</b> · Unemployment: <b>13.3%</b> + 60%+ underemployed<br>Agriculture = <b>primary pathway</b> for youth · Women land: <b>only 35%</b><span class="src">UBOS Census 2024.</span></div>'
  }
  // ── YOUTH: ussd ──
  else if(s==='ussd'){
    html+='<div class="yf-header"><div class="yh-label">USSD Farmer Access</div><div class="yh-title">*270# — AgriMap USSD Service</div><div class="yh-sub">Works on ANY mobile phone · No internet needed</div></div>'
    html+='<div class="card gn"><div class="ch">📱 What is USSD?</div>USSD lets farmers access AgriMap by dialling <b>*270#</b> — works on <b>any phone</b>, no smartphone needed.<br>Only <b>28%</b> rural have smartphones but <b>'+d.mm+'%</b> in '+d.n+' have any mobile.<br><br><b>Services:</b> Market prices · Farm advisory · Input vouchers · Find agro-dealers · Report pests<span class="src">MTN, Airtel, Africel — all networks.</span></div>'
    html+='<div class="card bl"><div class="ch">🏗️ USSD Menu — *270#</div><div style="font-family:monospace;font-size:9px;line-height:1.8;color:var(--t2)">*270# → AgriMap Uganda<br>├─ 1. Prices na soko<br>├─ 2. Ushauri wa kilimo<br>├─ 3. Vocha ya pembejeo<br>├─ 4. Duka karibu<br>└─ 5. Ripoti tatizo</div><span class="src">AgriMap USSD Service.</span></div>'
  }
  // ── YOUTH: vouchers ──
  else if(s==='vouchers'){
    const vcode='AGM-'+d.id.toUpperCase().slice(0,3)+'-'+Math.abs(Math.round(Math.sin(d.pop)*9999)).toString().padStart(4,'0')
    const vamt=Math.round((d.fin<50?150000:120000)/10000)*10000
    html+='<div class="yf-header" style="background:linear-gradient(135deg,#065f46,#047857)"><div class="yh-label">Digital Input Credit</div><div class="yh-title">Input Voucher System — '+d.n+'</div><div class="yh-sub">Get certified seeds + fertilizer on credit · Pay after harvest</div></div>'
    html+='<div class="voucher-card"><div class="vc-meta">AgriMap Digital Input Voucher</div><div class="vc-code">'+vcode+'</div><div style="display:flex;justify-content:space-between"><div><div class="vc-meta">Credit limit</div><div class="vc-amount">UGX '+vamt.toLocaleString()+'</div></div><div style="text-align:right"><div class="vc-meta">Valid at</div><div style="font-size:9px;color:#86efac">Registered agro-dealers</div></div></div></div>'
    html+='<div class="card gn"><div class="ch">🎫 How It Works</div>';
    [{n:1,t:'Register on AgriMap',d:'Dial *270# or visit extension officer'},{n:2,t:'Get voucher code via SMS',d:'No smartphone needed'},{n:3,t:'Visit registered agro-dealer',d:'Show code or tell verbally'},{n:4,t:'Select inputs',d:'Up to UGX '+vamt.toLocaleString()+' credit'},{n:5,t:'Pay at harvest',d:'MTN MoMo or Airtel Money · 0% if ≤90 days'}].forEach(st=>{
      html+='<div class="vstep"><div class="vstep-num">'+st.n+'</div><div><b>'+st.t+'</b><br><span style="color:var(--t2)">'+st.d+'</span></div></div>'
    })
    html+='<span class="src">AgriMap Digital Input Voucher System.</span></div>'
  }
  // ── YOUTH: crop_plan ──
  else if(s==='crop_plan'){
    html+='<div class="yf-header"><div class="yh-label">Crop Planning</div><div class="yh-title">What Should I Plant? — '+d.n+'</div><div class="yh-sub">Based on soil, NDVI, and market prices</div></div>'
    html+='<div class="card gn"><div class="ch">🌾 Best Crops for Your Zone</div>'
    Object.entries(d.srr).sort((a,b)=>b[1]-a[1]).slice(0,4).forEach(cr=>{
      const p=PRICES[cr[0]],price=p?p.farmgate:0
      html+='<div style="padding:5px;background:var(--s1);border-radius:5px;margin-bottom:3px;font-size:9px;border:1px solid var(--bd)"><div style="display:flex;justify-content:space-between"><b>'+cr[0].charAt(0).toUpperCase()+cr[0].slice(1)+'</b><span style="color:var(--gn)">'+(price?'UGX '+price.toLocaleString()+'/kg':'—')+'</span></div>'+cr[1]+'% of farmers · NDVI: '+(d.ndvi>.55?'✅ Good':'⚠️ Monitor')+'</div>'
    })
    html+='<span class="src">UBOS AAS 2021/22 + Farmgain + Sentinel-2.</span></div>'
  }
  // ── YOUTH: inputs/market_link/training/programmes/impact (simplified) ──
  else if(s==='inputs'&&curTab==='youth'){
    html+='<div class="yf-header"><div class="yh-label">Input Access</div><div class="yh-title">Getting Inputs — '+d.n+'</div><div class="yh-sub">Seeds, fertilizer, and how to finance them</div></div>'
    html+='<div class="card gn"><div class="ch">🌱 Certified Seeds Near You</div>';
    const seedList={Central:['LONGE 6H Maize','NABE 15 Beans','NASE 3 Cassava'],Eastern:['LONGE 10H Maize','NABE 16 Beans','NASE 19 Cassava'],Northern:['NAROMAIZE 1','NABE 16 Beans','NASE 19 Cassava'],Western:['LONGE 10H Maize','NABE 4 Beans','Nakitembe Banana']}[d.r]||[]
    seedList.forEach(s2=>{html+='<div style="padding:2px 0;font-size:9px;border-bottom:1px solid var(--bd)">✅ '+s2+'</div>'})
    html+='<span class="src">NARO Variety Catalogue 2023.</span></div>'
  }
  else if(s==='market_link'){
    html+='<div class="yf-header"><div class="yh-label">Market Linkage</div><div class="yh-title">Selling Your Produce — '+d.n+'</div><div class="yh-sub">Live prices + best selling strategy</div></div>'
    html+='<div class="card gn"><div class="ch">💰 Current Prices</div>';
    Object.entries(d.srr).filter(e=>e[1]>30).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(cr=>{
      const p=PRICES[cr[0]];if(!p)return
      html+='<div style="padding:5px;background:var(--s1);border-radius:5px;margin-bottom:3px;font-size:9px;border:1px solid var(--bd)"><b>'+cr[0].charAt(0).toUpperCase()+cr[0].slice(1)+'</b> — '+(p.trend==='up'?'📈':'➡️')+' Kampala: <b>UGX '+p.kampala.toLocaleString()+'</b> · Farmgate: <b>UGX '+p.farmgate.toLocaleString()+'</b></div>'
    })
    html+='<span class="src">Farmgain Africa 2024/25.</span></div>'
  }
  else if(s==='training'){
    html+='<div class="yf-header"><div class="yh-label">Training</div><div class="yh-title">Skills for Youth — '+d.n+'</div><div class="yh-sub">Programmes in your region</div></div>'
    const trainProgs={Central:['BRAC — farmer field schools','Makerere AgriInnovation Hub'],Eastern:['IITA — cassava management','USAID Feed the Future'],Northern:['World Vision — food security','NUSAF III — youth grants','Gulu University (RUFORUM)'],Western:['Heifer International — livestock','TechnoServe — agribusiness','Ripple Effect — dairy']}[d.r]||[]
    html+='<div class="card pp"><div class="ch">🎓 Training in '+d.r+'</div>';trainProgs.forEach(t=>{html+='<div style="padding:3px 0;border-bottom:1px solid var(--bd);font-size:9px">'+t+'</div>'})
    html+='<span class="src">Uganda Partner Registry 2025.</span></div>'
  }
  // ── DAIRY tabs ──
  else if(s==='dairy_overview'){
    const isActive=d.dairy===1
    const distCattle2=LIVESTOCK2021.district_cattle[d.id]||0,crossPct2=LIVESTOCK2021.district_crossbred_pct[d.id]||10
    html+='<div style="background:linear-gradient(135deg,#0e7490,#0891b2);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">DAIRY VALUE CHAIN</div><div style="font-size:13px;font-weight:800">🐄 '+d.n+'</div></div>'
    html+='<div class="grid2"><div class="kpi" style="border:2px solid '+(isActive?'#0e7490':'var(--bd)')+'"><div class="kv" style="color:'+(isActive?'#0e7490':'var(--t3)')+'">'+(isActive?'ACTIVE':'—')+'</div><div class="kl">Ripple Effect</div></div><div class="kpi"><div class="kv" style="color:var(--gn)">'+d.youth+'%</div><div class="kl">Youth in Agri</div></div></div>'
    html+='<div class="card cy"><div class="ch">🐄 Uganda Dairy — NLC 2021</div>Cattle: <b>14.5M</b> · Crossbred: <b>3.3M (23%)</b> · Milk: <b>3.7B litres/yr</b><br>'+d.n+' cattle: ~<b>'+distCattle2.toLocaleString()+'</b> · crossbred: <b>'+crossPct2+'%</b><span class="src">UBOS NLC 2021.</span></div>'
    html+='<div class="card '+(isActive?'cy':'')+'"><div class="ch">🌊 Ripple Effect — '+d.n+'</div>'+(isActive?'✅ <b>ACTIVE</b> · 50,000+ farmers · 12,000+ heifers · +180% milk production':'📌 Not active here. Active in Western Uganda.')+'<span class="src">Ripple Effect 2022/23.</span></div>'
  }
  else if(s==='ripple_effect'||s==='milk_prices'||s==='cooperatives'||s==='cold_chain'||s==='dairy_finance'||s==='dairy_ai'){
    const isActive=d.dairy===1
    if(s==='milk_prices'){
      html+='<div class="card cy"><div class="ch">💰 Milk Prices</div>';
      [{zone:'Kampala/Wakiso',fg:'UGX 1,600–2,200/L',rt:'UGX 2,800–3,500/L'},{zone:'Mbarara/Ankole',fg:'UGX 1,100–1,600/L',rt:'UGX 2,200–2,800/L'},{zone:'Fort Portal',fg:'UGX 1,000–1,400/L',rt:'UGX 2,000–2,500/L'}].forEach(m=>{
        html+='<div style="padding:4px;background:var(--s1);border-radius:5px;margin-bottom:3px;font-size:9px;border:1px solid var(--bd)"><b style="color:#0e7490">'+m.zone+'</b><br>Farmgate: <b>'+m.fg+'</b> · Retail: <b>'+m.rt+'</b></div>'
      })
      html+='<span class="src">Uganda DDA + FAO 2024.</span></div>'
    } else if(s==='cooperatives'){
      html+='<div class="card cy"><div class="ch">🤝 Dairy Cooperatives — '+d.n+'</div>Benefits: bulk collection, shared inputs, cooling access, group loans, buyer linkage<br><b>Major buyers:</b> Brookside, Pearl Dairy, JESA, Omega<span class="src">Uganda Cooperative Alliance + DDA 2023.</span></div>'
    } else if(s==='cold_chain'){
      html+='<div class="card cy"><div class="ch">❄️ Cold Chain — '+d.n+'</div>'+(isActive?'Cooling available: Ripple Effect centres, DDA bulking centres, cooperative chilling plants':'⚠️ <b>Cold chain gap.</b> Without cooling, milk spoils in 2–4 hours.')+'<br>Value: <b>+UGX 300–700/litre</b> premium<span class="src">DDA + FAO 2022.</span></div>'
    } else {
      html+='<div class="card cy"><div class="ch">🐄 '+({ripple_effect:'Ripple Effect',dairy_finance:'Dairy Finance',dairy_ai:'AI Dairy Advisory'}[s]||s)+' — '+d.n+'</div>'+(isActive?'✅ Ripple Effect active — heifer loans, milk collection, vet training':'📌 Currently active in Western Uganda only')+'<span class="src">Ripple Effect + YAW 2023.</span></div>'
    }
  }
  // ── PROGRAMMES tabs ──
  else if(s==='overview'&&curTab==='programmes'){
    const activeCnt=Object.values(d.programmes).filter(Boolean).length
    html+='<div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:10px;padding:11px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">YAW PROGRAMME INTELLIGENCE</div><div style="font-size:13px;font-weight:800">🗺️ '+d.n+' — '+activeCnt+' Active</div></div>'
    Object.entries(PROG_INFO).forEach(e=>{
      const key=e[0],info=e[1],active=d.programmes[key]
      html+='<div class="card" style="border-left:3px solid '+(active?info.color:'var(--bd)')+';opacity:'+(active?1:.7)+'"><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:10px;font-weight:700;color:'+(active?info.color:'var(--t2)')+'">'+info.name+'</span><span class="pill '+(active?'tag-low':'tag-high')+'">'+(active?'✅ ACTIVE':'📌 Not yet')+'</span></div>'+(active?'<div style="font-size:8.5px;color:var(--t2);margin-top:3px">'+info.focus+'</div>':'')+'</div>'
    })
    html+='<div class="card bl"><div class="ch">🇺🇬 National Footprint</div>Markets for Youth: <b>'+D.filter(x=>x.programmes.markets).length+'/'+D.length+'</b> · AgriMap Farmer ID: <b>'+D.filter(x=>x.programmes.farmpass).length+'/'+D.length+'</b> · Dairy: <b>'+D.filter(x=>x.programmes.dairy).length+'/'+D.length+'</b> · WFP: <b>'+D.filter(x=>x.programmes.wfp).length+'/'+D.length+'</b><span class="src">AgriMap Programme Register 2025.</span></div>'
  }
  else if(s==='markets_for_youth'){
    html+='<div class="card '+(d.programmes.markets?'gn':'')+'"><div class="ch" style="color:var(--gn)">🌽 Markets for Youth — '+d.n+'</div>'+(d.programmes.markets?'<b style="color:var(--gn)">✅ ACTIVE</b>':'<b style="color:var(--am)">📌 Not yet active</b>')+'<br><br>'+PROG_INFO.markets.desc+'<br><br><b>Components:</b> Youth aggregation · Verified buyers · Cooperative training · Post-harvest handling · Export connections · Price SMS alerts<br><b>Impact:</b> +20–35% price premium<span class="src">Markets for Youth 2023.</span></div>'
  }
  else if(s==='farmpass'){
    html+='<div class="card '+(d.programmes.farmpass?'bl':'')+'"><div class="ch" style="color:var(--bl)">📱 AgriMap Farmer ID — '+d.n+'</div>'+(d.programmes.farmpass?'<b style="color:var(--bl)">✅ ACTIVE</b>':'<b style="color:var(--am)">📌 Not yet active</b>')+'<br><br>'+PROG_INFO.farmpass.desc+'<br><br><b>Enables:</b> Digital farmer ID · Crop records · Soil + NDVI data · Input credit · Market price SMS · Credit history · EUDR GPS registration<br>Coverage: <b>'+D.filter(x=>x.programmes.farmpass).length+'/'+D.length+'</b> districts<span class="src">AgriMap Farmer ID 2023.</span></div>'
  }
  else if(s==='dairy_ripple'){
    html+='<div class="card cy"><div class="ch" style="color:var(--cy)">🐄 Ripple Effect Dairy</div>'+PROG_INFO.dairy.desc+'<br><br>'+(d.programmes.dairy?'✅ <b>ACTIVE</b> in '+d.n:'📌 Active in: '+PROG_INFO.dairy.districts.join(', '))+'<span class="src">Ripple Effect + YAW 2023.</span></div>'
  }
  else if(s==='wfp_uncdf'){
    const fewsIPC=d.r==='Northern'?'IPC 2–3':d.r==='Eastern'?'IPC 2':'IPC 1–2'
    const regionNutr=DHS2022.regions[d.r]||DHS2022.national
    html+='<div class="card '+(d.programmes.wfp?'rd':'')+'"><div class="ch" style="color:var(--rd)">🆘 WFP/UNCDF — '+d.n+'</div>'+(d.programmes.wfp?'<b style="color:var(--rd)">🔴 ACTIVE — priority zone</b>':'<b style="color:var(--gn)">✅ Not WFP priority</b>')+'<br><br>FEWS NET IPC: <b>'+fewsIPC+'</b> · Stunting: <b>'+regionNutr.stunting_pct+'%</b> · Food insecure: <b>'+(regionNutr.food_insecure_pct||42)+'%</b><br>At-risk nationally: <b>~4.2M</b><span class="src">WFP + FEWS NET April 2026.</span></div>'
  }
  else if(s==='ruforum'){
    html+='<div class="card '+(d.programmes.ruforum?'pp':'')+'"><div class="ch" style="color:var(--pp)">🎓 RUFORUM / Gulu University</div>'+(d.programmes.ruforum?'<b style="color:var(--pp)">✅ ACTIVE near '+d.n+'</b>':'<b style="color:var(--am)">📌 Not yet active</b>')+'<br><br>'+PROG_INFO.ruforum.desc+'<br><br><b>Training:</b> Agribusiness enterprise · Agri-tech skills · Coffee value chain · Youth bootcamps<br>Age: 18–35 · Scholarships available · Contact: agri@gu.ac.ug<span class="src">RUFORUM Uganda 2023.</span></div>'
  }
  // ── FOUNDATION / YAW tabs ──
  else if(s==='yaw_overview'){
    const ysc=Math.round((d.youth+d.women+(100-d.fin)+d.agri_pct)/4),yp=ysc>=60?'HIGH':ysc>=45?'MEDIUM':'STANDARD',yc=ysc>=60?'#dc2626':ysc>=45?'#d97706':'#16a34a'
    html+='<div style="background:linear-gradient(135deg,#ea580c,#c2410c);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">PROGRAMME INTELLIGENCE</div><div style="font-size:13px;font-weight:800">Young Africa Works — '+d.n+'</div></div>'
    html+='<div class="grid2"><div class="kpi" style="border:2px solid '+yc+'"><div class="kv" style="color:'+yc+'">'+yp+'</div><div class="kl">YAW Priority</div></div><div class="kpi"><div class="kv" style="color:var(--pp)">'+d.youth+'%</div><div class="kl">Youth in Agri</div></div><div class="kpi"><div class="kv" style="color:var(--pk)">'+d.women+'%</div><div class="kl">Women Farmers</div></div><div class="kpi"><div class="kv" style="color:var(--rd)">'+(100-d.fin)+'%</div><div class="kl">Finance Gap</div></div></div>'
    html+='<div class="card or"><div class="ch" style="color:var(--or)">📊 YAW Scorecard</div>';
    [{n:'Youth in agri',v:d.youth,col:'#7c3aed'},{n:'Women farmers',v:d.women,col:'#db2777'},{n:'Financial inclusion',v:d.fin,col:'#2563eb'},{n:'Mobile money',v:d.mm,col:'#0891b2'},{n:'Agri share',v:d.agri_pct,col:'#ea580c'}].forEach(x=>{
      html+='<div class="row"><div class="rl">'+x.n+'</div><div class="rb"><div class="rbf" style="width:'+Math.min(100,x.v)+'%;background:'+x.col+'"></div></div><div class="rv" style="color:'+x.col+'">'+x.v+'%</div></div>'
    })
    html+='<span class="src">UBOS Census 2024 + FinScope 2023.</span></div>'
  }
  else if(s==='yaw_score'){
    html+='<div style="text-align:center;padding:16px;background:linear-gradient(135deg,rgba(22,163,74,.08),rgba(37,99,235,.05));border-radius:12px;margin-bottom:8px;border:1px solid var(--bd)"><div style="font-size:36px;font-weight:800;color:'+cSc(sc.total)+'">'+sc.total+'</div><div style="font-size:11px;font-weight:700;color:'+cSc(sc.total)+'">'+sc.grade+'</div></div>'
    html+='<div class="card bl"><div class="ch">🏆 Score Components</div>';
    [{l:'Crop Adoption',v:sc.crop},{l:'NDVI Health',v:sc.ndvi},{l:'Soil Fertility',v:sc.soil},{l:'Finance Access',v:sc.fin},{l:'Yield',v:sc.yield},{l:'Market',v:sc.market},{l:'Livestock',v:sc.livestock||0},{l:'Nutrition',v:sc.nutrition||50}].forEach(r=>{
      html+='<div class="row"><div class="rl">'+r.l+'</div><div class="rb"><div class="rbf" style="width:'+r.v+'%;background:'+cSc(r.v)+'"></div></div><div class="rv" style="color:'+cSc(r.v)+'">'+r.v+'</div></div>'
    })
    html+='<span class="src">AgriMap composite score.</span></div>'
  }
  // ── FOUNDATION: finance_gap ──
  else if(s==='finance_gap'){
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:'+cF(d.fin)+'">'+d.fin+'%</div><div class="kl">Finance Access</div></div><div class="kpi"><div class="kv" style="color:var(--rd)">'+(100-d.fin)+'%</div><div class="kl">Excluded</div></div><div class="kpi"><div class="kv" style="color:var(--cy)">'+d.mm+'%</div><div class="kl">Mobile Money</div></div><div class="kpi"><div class="kv" style="color:var(--pp)">'+d.sacco+'%</div><div class="kl">SACCO</div></div></div>'
    html+='<div class="card or"><div class="ch" style="color:var(--or)">💳 Finance Gap — '+d.n+' (FinScope 2023)</div>Any financial access: <b>'+d.fin+'%</b> · Finance gap: <b>'+(100-d.fin)+'%</b><br>Mobile money: <b>'+d.mm+'%</b> · SACCO: <b>'+d.sacco+'%</b> · Bank: <b>'+d.bank+'%</b><br><br><b>National context (FinScope 2023):</b><br>Mobile money nationally: <b>64%</b> (+8pp from 2018)<br>SACCO membership: <b>14%</b> (+9pp from 2018)<br>Rural bank access: only <b>6.6%</b><br>Youth (15–35) finance: <b>48%</b> — largest gap<br><br><b>How the Foundation closes the '+(100-d.fin)+'% gap:</b><br>&nbsp;• Digital Input Voucher digital ID → agro-dealer input credit<br>&nbsp;• Digital credit history → SACCO + bank loans<br>&nbsp;• PDM SACCO: UGX 100M/parish at 6% p.a.<br>&nbsp;• NFIS II target: <b>75% by 2028</b><span class="src">Source: FinScope Uganda 2023 + PDM + NFIS II.</span></div>'
  }
  // ── FOUNDATION: value_chains ──
  else if(s==='value_chains'){
    html+='<div class="card or"><div class="ch" style="color:var(--or)">🌾 YAW Value Chains — '+d.n+'</div>';
    var chains=[];
    if(d.srr.maize>55)chains.push({vc:'Maize',icon:'🌽',role:'Production + aggregation',opp:'Input credit + mechanization + cooperative selling',rev:'UGX 800K–1.5M/season',youth:'High — 60% of youth in maize'});
    if(d.srr.beans>45)chains.push({vc:'Beans',icon:'🫘',role:'Smallholder + cooperative',opp:'Yellow bean quality grading + Kenya export (Busia border)',rev:'UGX 600K–1.2M/season',youth:'Medium — higher margin'});
    if(d.srr.cassava>48)chains.push({vc:'Cassava',icon:'🌿',role:'Food security + processing',opp:'HQCF for FMCG buyers',rev:'UGX 400K–900K/season',youth:'High — low input crop'});
    if(d.coffee_prod>5000)chains.push({vc:'Coffee ('+d.coffee_type+')',icon:'☕',role:'Smallholder production',opp:'Wet processing + direct EU trade + EUDR GPS',rev:'UGX 1.2M–4M/season',youth:'Medium — 5yr investment'});
    if(d.srr.banana>55)chains.push({vc:'Banana / Matooke',icon:'🍌',role:'Smallholder + urban market',opp:'Post-harvest packaging + Kampala hotel market',rev:'UGX 500K–1.2M/season',youth:'High — perennial crop'});
    if(d.programmes.dairy)chains.push({vc:'Dairy',icon:'🐄',role:'Youth dairy cooperative',opp:'Ripple Effect heifer + milk collection + yoghurt processing',rev:'UGX 800K–2.5M/month',youth:'HIGH — Ripple Effect active'});
    if(['jinja','mukono','masaka','rakai','hoima','masindi','kasese'].indexOf(d.id)>=0)chains.push({vc:'Fisheries',icon:'🐟',role:'Landing site + processing',opp:'Nile perch fillet export + dagaa processing',rev:'UGX 1M–5M/month',youth:'High — underutilised by youth'});
    if(!chains.length)chains.push({vc:'Cassava + Sorghum',icon:'🌾',role:'Food security staples',opp:'Processing + dryer + market development',rev:'UGX 300K–700K/season',youth:'High — Northern Uganda priority'});
    chains.slice(0,5).forEach(function(ch){
      html+='<div style="padding:7px;background:var(--s1);border-radius:7px;margin-bottom:5px;font-size:9px;border:1px solid var(--bd)"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><b style="color:var(--or)">'+ch.icon+' '+ch.vc+'</b><span style="font-size:8px;color:var(--gn);font-weight:700">'+ch.rev+'</span></div><b>Role:</b> '+ch.role+'<br><b>YAW opportunity:</b> '+ch.opp+'<br><span style="color:var(--cy)">Youth: '+ch.youth+'</span></div>'
    })
    html+='<span class="src">Source: YAW Value Chain Analysis + MAAIF AGDP 2023 + UBOS AAS 2021/22.</span></div>'
  }
  // ── FOUNDATION: partners ──
  else if(s==='partners'){
    var pts={Central:['BRAC Uganda — microfinance + agri extension','Opportunity International — agri-SACCO loans','Ensibuuko — SACCO digitalisation','Makerere AgriInnovation Hub','TechnoServe Uganda — coffee value chain'],Eastern:['USAID/Feed the Future — maize+beans','IITA Uganda — cassava + CBSD control','TechnoServe Uganda — agribusiness','RUFORUM/Mbale Campus — agri-enterprise'],Northern:['World Vision Uganda — food security','NUSAF III (World Bank) — youth livelihoods','Mercy Corps Uganda — market systems','CRS Uganda — SILC savings groups','WFP Uganda — food security + e-vouchers'],Western:['Heifer International — livestock+dairy','Vi Agroforestry — coffee+agroforestry','NUCAFE — coffee cooperative strengthening','Ripple Effect — dairy youth programme','UPTGA — tea outgrower scheme']}[d.r]||[]
    html+='<div class="card or"><div class="ch" style="color:var(--or)">🤝 YAW Partners — '+d.r+' Region</div>';
    pts.forEach(function(p){html+='<div style="padding:3px 0;border-bottom:1px solid var(--bd);font-size:9px">• '+p+'</div>';})
    html+='<span class="src">Source: YAW Partner Registry 2023.</span></div>'
    html+='<div class="card"><div class="ch">💼 Foundation Uganda Core Portfolio</div>';
    ['Makerere University AgriInnovation Hub','NUCAFE — Coffee cooperative strengthening','Uganda Agribusiness Alliance (UAA)','2SCALE Agribusiness Incubator','DFCU Agri-Finance for Youth','Ensibuuko SACCO Platform','Ripple Effect Uganda — Dairy','RUFORUM — Agribusiness Training'].forEach(function(p){
      html+='<div style="padding:3px 0;border-bottom:1px solid var(--bd);font-size:9px">• '+p+'</div>';
    })
    html+='<span class="src">Source: Foundation Uganda Portfolio 2023.</span></div>'
  }
  // ── FOUNDATION: yaw_targets ──
  else if(s==='yaw_targets'){
    html+='<div style="background:linear-gradient(135deg,#ea580c,#c2410c);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">UGANDA TARGETS 2022–2030</div><div style="font-size:13px;font-weight:800">🎯 YAW Progress vs 2030 Targets</div></div>'
    html+='<div class="card or">';
    [{l:'Youth in dignified work',cur:'~820K',target:'5,000K',pct:16,note:'2030 target — Uganda share'},{l:'Women beneficiaries (50%)',cur:'~390K',target:'2,500K',pct:16,note:'Gender parity mandate'},{l:'Finance inclusion',cur:'64%',target:'75%',pct:85,note:'FinScope 2023 — strong'},{l:'Digital Input Voucher parishes',cur:'~2,100',target:'10,594',pct:20,note:'Voucher rollout'},{l:'Fertilizer adoption',cur:'7–10%',target:'30%',pct:27,note:'UBOS AAS 2021/22'},{l:'Improved seed access',cur:'~25%',target:'50%',pct:50,note:'MAAIF estimate'},{l:'Digital advisory reach',cur:'~180K',target:'1,000K',pct:18,note:'AgriMap + chatbot'},{l:'Agri-finance mobilised',cur:'~$40M',target:'$200M',pct:20,note:'DFCU + SACCOs + grants'},{l:'Coffee EUDR compliant',cur:'<5%',target:'100%',pct:5,note:'Dec 2025 deadline — urgent'}].forEach(function(t){
      var col=t.pct>=75?'#16a34a':t.pct>=40?'#0891b2':t.pct>=20?'#ca8a04':'#dc2626'
      html+='<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px"><span style="font-weight:600">'+t.l+'</span><span style="color:'+col+';font-weight:700">'+t.cur+' / '+t.target+'</span></div><div style="height:5px;background:var(--s3);border-radius:3px"><div style="width:'+t.pct+'%;height:100%;background:'+col+';border-radius:3px"></div></div><div style="font-size:7.5px;color:var(--t3);margin-top:1px">'+t.note+'</div></div>'
    })
    html+='<span class="src">Source: Uganda Agri Development Strategy 2022–2030 + UBOS + FinScope.</span></div>'
  }
  // ── INTELLIGENCE tabs ──
  else if(s==='agriscore'||s==='earlywarning'){
    if(s==='agriscore'){
      html+='<div style="text-align:center;padding:14px;background:var(--s2);border-radius:10px;margin-bottom:8px;border:1px solid var(--bd)"><div style="font-size:30px;font-weight:800;color:'+cSc(sc.total)+'">'+sc.total+'/100</div><div style="font-size:9px;color:var(--t3)">'+sc.grade+'</div></div>'
      html+='<div class="card bl"><div class="ch">🏆 Components</div>';
      [{l:'Crop',v:sc.crop},{l:'NDVI',v:sc.ndvi},{l:'Soil',v:sc.soil},{l:'Finance',v:sc.fin},{l:'Yield',v:sc.yield},{l:'Market',v:sc.market}].forEach(r=>{
        html+='<div class="row"><div class="rl">'+r.l+'</div><div class="rb"><div class="rbf" style="width:'+r.v+'%;background:'+cSc(r.v)+'"></div></div><div class="rv" style="color:'+cSc(r.v)+'">'+r.v+'</div></div>'
      })
      html+='<span class="src">AgriMap composite.</span></div>'
    } else {
      const risk=calcRisk(d),level=risk>=50?'CRITICAL':risk>=30?'HIGH':risk>=15?'MEDIUM':'LOW',lcol=risk>=50?'var(--rd)':risk>=30?'var(--or)':risk>=15?'var(--am)':'var(--gn)'
      html+='<div style="text-align:center;padding:14px;background:var(--s2);border-radius:10px;margin-bottom:8px"><div style="font-size:30px;font-weight:800;color:'+lcol+'">'+level+'</div><div style="font-size:9px;color:var(--t3)">Risk: '+risk+'/100</div></div>'
      html+='<div class="card rd"><div class="ch">📣 Action</div>'+(risk>=50?'🚨 Immediate assessment needed.':risk>=30?'⚠️ Elevated risk. Increase monitoring.':'✅ Standard operations.')+'<span class="src">FEWS NET + WFP + MAAIF EWS.</span></div>'
    }
  }
  else if(s==='food_security'){
    const regionNutr2=DHS2022.regions[d.r]||DHS2022.national,regionPov2=POVERTY_DATA.regions[d.r]||{poverty_pct:POVERTY_DATA.national_poverty_line_pct,extreme_poverty_pct:POVERTY_DATA.extreme_poverty_pct}
    const fewsReg2=d.r==='Northern'?FEWS_NET.northern_ipc:d.r==='Eastern'?FEWS_NET.eastern_ipc:d.r==='Western'?FEWS_NET.western_ipc:FEWS_NET.central_ipc
    html+='<div class="grid2"><div class="kpi"><div class="kv" style="color:var(--rd)">'+regionNutr2.stunting_pct+'%</div><div class="kl">Child Stunting</div></div><div class="kpi"><div class="kv" style="color:var(--or)">'+(regionNutr2.food_insecure_pct||42)+'%</div><div class="kl">Food Insecure</div></div></div>'
    html+='<div class="card rd"><div class="ch">🍽️ Food Security — '+d.r+'</div>FEWS NET IPC: <b>'+fewsReg2+'</b><br>Stunting: <b>'+regionNutr2.stunting_pct+'%</b> (national: 29%)<br>Poverty: <b>'+regionPov2.poverty_pct+'%</b><br>At-risk nationally: <b>~4.2M</b>'+(d.programmes.wfp?'<br>🔴 <b>WFP ACTIVE</b>':'')+'<span class="src">DHS 2022 + FEWS NET April 2026.</span></div>'
  }
  else if(s==='price_alert'){
    html+='<div class="card gn"><div class="ch">💰 Price Alerts — April 2026</div><div style="font-size:8.5px;color:var(--am);margin-bottom:6px">⚠️ Food inflation <b>+6.8% YoY</b></div>';
    Object.entries(PRICES).forEach(e=>{
      const p=e[1],col=p.trend==='up'?'var(--gn)':p.trend==='dn'?'var(--rd)':'var(--t2)'
      html+='<div style="padding:4px;background:var(--s1);border-radius:4px;margin-bottom:2px;font-size:9px;border:1px solid var(--bd)"><div style="display:flex;justify-content:space-between"><b>'+p.name+'</b><span style="color:'+col+'">'+(p.trend==='up'?'📈':p.trend==='dn'?'📉':'➡️')+' '+p.trend_pct+'%</span></div>UGX <b>'+p.kampala.toLocaleString()+'</b>/kg</div>'
    })
    html+='<span class="src">Farmgain Africa + MAAIF + UCDA.</span></div>'
  }
  // ── YOUTH: programmes (within youth tab) ──
  else if(s==='programmes'&&curTab==='youth'){
    html+='<div class="yf-header" style="background:linear-gradient(135deg,#065f46,#047857)"><div class="yh-label">Foundation Programmes</div><div class="yh-title">Your Programme Access — '+d.n+'</div><div class="yh-sub">All development programmes available to youth farmers here</div></div>'
    Object.entries(PROG_INFO).forEach(function(e){
      var key=e[0],info=e[1],active=d.programmes[key]
      html+='<div class="card" style="border-left:3px solid '+(active?info.color:'var(--bd)')+';opacity:'+(active?1:.65)+'"><div class="ch"><span style="color:'+(active?info.color:'var(--t3)')+'">'+info.name+'</span> <span class="pill '+(active?'tag-low':'tag-high')+'">'+(active?'✅ ACTIVE':'📌 NOT YET')+'</span></div>'+info.desc+'<br><div style="margin-top:4px;font-size:8.5px;color:var(--t2)"><b>Focus:</b> '+info.focus+'</div></div>'
    })
    html+='<span class="src">AgriMap Uganda Programme Register 2025.</span>'
  }
  // ── YOUTH: impact (within youth tab) ──
  else if(s==='impact'&&curTab==='youth'){
    html+='<div class="yf-header" style="background:linear-gradient(135deg,#1d4ed8,#1e40af)"><div class="yh-label">Impact Tracker</div><div class="yh-title">Your Agri Progress — '+d.n+'</div><div class="yh-sub">Track your farming journey over seasons</div></div>'
    html+='<div style="text-align:center;padding:14px;background:linear-gradient(135deg,rgba(22,163,74,.08),rgba(37,99,235,.05));border-radius:10px;margin-bottom:8px;border:1px solid var(--bd)"><div style="font-size:34px;font-weight:800;color:'+cSc(sc.total)+'">'+sc.total+'</div><div style="font-size:11px;font-weight:700;color:'+cSc(sc.total)+'">'+sc.grade+'</div><div style="font-size:9px;color:var(--t3);margin-top:2px">Agri Score / 100</div></div>'
    html+='<div class="card bl"><div class="ch">🏆 Score Breakdown</div>';
    [{l:'Crop Adoption',v:sc.crop},{l:'NDVI Health',v:sc.ndvi},{l:'Soil Fertility',v:sc.soil},{l:'Finance Access',v:sc.fin},{l:'Yield Performance',v:sc.yield},{l:'Market Access',v:sc.market},{l:'Livestock / Dairy',v:sc.livestock||0},{l:'Nutrition Status',v:sc.nutrition||50}].forEach(function(r){
      var col=cSc(r.v)
      html+='<div class="row"><div class="rl">'+r.l+'</div><div class="rb"><div class="rbf" style="width:'+r.v+'%;background:'+col+'"></div></div><div class="rv" style="color:'+col+'">'+r.v+'</div></div>'
    })
    html+='<span class="src">AgriMap composite: UBOS+NDVI+FAO-GAEZ+FinScope.</span></div>'
    html+='<div class="card"><div class="ch">📈 Improvement Pathway</div>'
    if(sc.soil<50)html+='&nbsp;• 🧪 Apply recommended fertilizer → +15 Soil score<br>'
    if(sc.fin<50)html+='&nbsp;• 💳 Register on Digital Input Voucher → +20 Finance score<br>'
    if(sc.yield<50)html+='&nbsp;• 🌱 Use certified NARO seed → +20 Yield score<br>'
    if(d.programmes.markets)html+='&nbsp;• 🌽 Join Markets for Youth buyer network → +10 Market score<br>'
    if(!d.programmes.mcp)html+='&nbsp;• 📱 Register AgriMap Farmer ID → unlock input credit<br>'
    html+='</div>'
  }
  // ── IMPACT tabs ──
  else if(s==='yaw_dashboard'){
    const totalYouth=D.reduce((a,x)=>a+Math.round(x.pop*x.youth/100),0),avgScore=Math.round(D.reduce((a,x)=>a+calcScore(x,c).total,0)/D.length)
    html+='<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">UGANDA PROGRAMME INTELLIGENCE</div><div style="font-size:13px;font-weight:800">YAW Impact Dashboard</div></div>'
    html+='<div class="impact-kpi-grid"><div class="ikpi" style="background:rgba(124,58,237,.08)"><div class="iv" style="color:#7c3aed">'+Math.round(totalYouth/1000)+'K</div><div class="il">Youth in Agri</div></div><div class="ikpi" style="background:rgba(22,163,74,.08)"><div class="iv" style="color:var(--gn)">'+avgScore+'</div><div class="il">Avg Score</div></div><div class="ikpi" style="background:rgba(234,88,12,.08)"><div class="iv" style="color:var(--or)">'+D.filter(x=>x.programmes.markets).length+'</div><div class="il">Mkts for Youth</div></div></div>'
    html+='<div class="card pp"><div class="ch">📊 Programme Coverage</div>';
    [{n:'Markets for Youth',k:'markets',col:'#16a34a',target:20},{n:'AgriMap Farmer ID',k:'farmpass',col:'#2563eb',target:24},{n:'Ripple Effect Dairy',k:'dairy',col:'#0e7490',target:10},{n:'WFP/UNCDF',k:'wfp',col:'#dc2626',target:10}].forEach(p=>{
      const active=D.filter(x=>x.programmes[p.k]).length,pct=Math.round(active/p.target*100)
      html+='<div class="prog-bar-row"><div class="pbl">'+p.n+'</div><div class="pbb"><div class="pbf" style="width:'+Math.min(100,pct)+'%;background:'+p.col+'"></div></div><div class="pbv" style="color:'+p.col+'">'+active+'/'+p.target+'</div></div>'
    })
    html+='<span class="src">AgriMap Programme Register 2025.</span></div>'
  }
  // ── IMPACT: farmer_tracking ──
  else if(s==='farmer_tracking'){
    html+='<div class="card pp"><div class="ch">👤 Individual Farmer Tracking</div>This module tracks individual youth farmer journeys over time. <b>Currently showing illustrative profiles</b> — live data would come from AgriMap Farmer ID API integration.<br><br>';
    [{name:'Akello Grace',dist:'Gulu',age:24,crop:'Cassava + Sorghum',score_start:32,score_now:48,income_start:'UGX 180K/season',income_now:'UGX 420K/season',progs:['AgriMap Farmer ID','WFP/UNCDF'],seasons:3},{name:'Muwonge David',dist:'Luwero',age:28,crop:'Maize + Beans',score_start:45,score_now:67,income_start:'UGX 320K/season',income_now:'UGX 780K/season',progs:['Markets for Youth','Digital Input Voucher'],seasons:4},{name:'Asiimwe Beatrice',dist:'Mbarara',age:22,crop:'Dairy + Banana',score_start:38,score_now:62,income_start:'UGX 250K/month',income_now:'UGX 890K/month',progs:['Ripple Effect Dairy','AgriMap Farmer ID'],seasons:5}].forEach(function(f){
      var gain=Math.round((f.score_now-f.score_start)/f.score_start*100)
      html+='<div style="padding:8px;background:var(--s1);border-radius:8px;margin-bottom:6px;border:1px solid var(--bd)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><div><div style="font-size:11px;font-weight:800">'+f.name+'</div><div style="font-size:9px;color:var(--t2)">'+f.dist+' · Age '+f.age+' · '+f.crop+'</div></div><div style="text-align:right"><div style="font-size:10px;font-weight:800;color:var(--gn)">+'+gain+'%</div><div style="font-size:8px;color:var(--t3)">Score improvement</div></div></div><div style="display:flex;gap:3px;margin-bottom:5px"><div style="flex:1;background:var(--s3);border-radius:5px;padding:4px 6px;text-align:center;font-size:8px"><div style="font-weight:700;color:var(--rd)">'+f.score_start+'</div><div style="color:var(--t3)">Start</div></div><div style="display:flex;align-items:center;font-size:16px;color:var(--gn)">→</div><div style="flex:1;background:rgba(22,163,74,.08);border-radius:5px;padding:4px 6px;text-align:center;font-size:8px;border:1px solid rgba(22,163,74,.2)"><div style="font-weight:700;color:var(--gn)">'+f.score_now+'</div><div style="color:var(--t3)">Now</div></div><div style="flex:2;background:rgba(8,145,178,.06);border-radius:5px;padding:4px 6px;font-size:8px;margin-left:4px"><div style="font-weight:700;color:var(--cy)">'+f.income_now+'</div><div style="color:var(--t3)">Current income · was '+f.income_start+'</div></div></div><div style="display:flex;gap:3px;flex-wrap:wrap">';
      f.progs.forEach(function(p){html+='<span class="pill" style="background:rgba(22,163,74,.1);color:var(--gn)">✓ '+p+'</span>';})
      html+='<span class="pill" style="background:var(--s3);color:var(--t3)">'+f.seasons+' seasons tracked</span></div></div>'
    })
    html+='<div style="padding:8px;background:rgba(124,58,237,.06);border:1px dashed #7c3aed;border-radius:8px;font-size:9px;color:#7c3aed;text-align:center">📱 <b>AgriMap Farmer ID API integration</b> will replace illustrative data with real farmer records.</div><span class="src">Illustrative profiles based on UBOS AAS 2020 + Ripple Effect data.</span></div>'
  }
  // ── IMPACT: investment_case ──
  else if(s==='investment_case'){
    var youthPop=Math.round(d.pop*d.youth/100),finGap=100-d.fin,yawP=sc.total>=60?'HIGH':sc.total>=45?'MEDIUM':'STANDARD'
    html+='<div class="card gn"><div class="ch">💰 Investment Case — '+d.n+'</div>YAW Priority: <b style="color:'+(sc.total>=60?'var(--rd)':sc.total>=45?'var(--am)':'var(--gn)')+'">'+yawP+'</b><br>Youth in agriculture: <b>'+Math.round(youthPop/1000)+'K people</b><br>Finance gap: <b>'+finGap+'%</b> ('+Math.round(d.pop*finGap/10000)+'K people)<br>Yield gap: <b>78% below potential</b> — closing it = +200–400% income<br><br><b>Estimated programme costs:</b><br>&nbsp;• Markets for Youth: <b>UGX 450M (~$120K)</b><br>&nbsp;• AgriMap Farmer ID: <b>UGX 180M (~$48K)</b><br>&nbsp;• Digital Input Voucher: <b>UGX 280M (~$75K)</b><br>&nbsp;• Seed traceability: <b>UGX 120M (~$32K)</b><br>&nbsp;• Digital advisory: <b>UGX 90M (~$24K)</b><br><br><b>Total: ~UGX 1.12B (~$300K)</b><br>Projected reach: <b>'+Math.round(youthPop/1000/2)+'K youth</b> in 3 years<br>Cost per farmer: <b>~$'+Math.round(300000/(youthPop/2))+'</b><span class="src">YAW Uganda cost benchmarks.</span></div>'
    var maizeProd=Math.round(d.yld.maize*d.area.maize/1000),gainUGX=Math.round(maizeProd*0.5*850/1000000)
    html+='<div class="card bl"><div class="ch">📈 ROI Modelling</div>If '+Math.round(youthPop/4/1000)+'K youth improve yield by <b>50%</b>:<br>Additional maize income: <b>~UGX '+gainUGX+'M/season</b><br>Finance uplift (+30%): <b>'+Math.round(d.pop*0.3/1000)+'K new users</b><br>Break-even: <b>2–3 seasons</b><br>10-year impact: <b>$'+Math.round(gainUGX*10/2800)+'M</b> additional income<span class="src">AgriMap investment modelling.</span></div>'
  }
  // ── IMPACT: data_partnerships ──
  else if(s==='data_partnerships'){
    html+='<div class="card gn"><div class="ch">🤝 Data Partnership Roadmap</div><div style="font-size:9px">';
    [{phase:'Phase 1 — Live Now',col:'var(--gn)',items:['UBOS AAS 2020 — crop yields, areas, adoption','UCDA FY2023/24 — coffee production','FinScope 2023 — financial inclusion','FAO-GAEZ + ISRIC — soil type, pH, NPK','Sentinel-2 + MODIS — NDVI (weekly)','FEWS NET — food security early warning','Farmgain Africa — weekly market prices','NARO Variety Catalogue 2023','MAAIF DPP — pest/disease alerts']},{phase:'Phase 2 — Via Partnership (3–6 months)',col:'var(--am)',items:['AgriMap Farmer ID API — farmer crop records','Digital Input Voucher — transaction data','MAAIF extension — field visit logs','WFP VAM — food security surveys','Ripple Effect — dairy profiles + milk volumes','Ensibuuko — SACCO member data','UCDA monthly coffee prices']},{phase:'Phase 3 — Needs Collection (6–18 months)',col:'var(--or)',items:['Parish-level farmgate prices','Sub-county agro-dealer stock','Individual yield tracking per farmer','Cold chain GPS locations','Cooperative membership data','Youth credit history linked to outcomes','Real-time UNMA weather station data']}].forEach(function(ph){
      html+='<div style="margin-bottom:8px"><div style="font-weight:700;color:'+ph.col+';margin-bottom:4px;font-size:10px">'+ph.phase+'</div>';
      ph.items.forEach(function(item){html+='<div style="padding:2px 0;border-bottom:1px solid var(--bd);padding-left:8px">'+item+'</div>';})
      html+='</div>'
    })
    html+='</div><span class="src">AgriMap Data Architecture Plan + YAW Data Strategy.</span></div>'
  }
  // ── EUDR tabs ──
  else if(s==='eudr_overview'){
    html+='<div style="background:linear-gradient(135deg,#92400e,#78350f);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">EU DEFORESTATION REGULATION</div><div style="font-size:13px;font-weight:800">☕ EUDR Coffee Compliance</div><div style="font-size:9px;opacity:.85;margin-top:2px">$1.14B at risk · 1.8M farming households</div></div>'
    html+='<div class="card rd"><div class="ch">⚠️ What is EUDR?</div>From <b>December 2025</b>, all coffee exported to EU must prove no deforestation after Dec 2020.<br>Uganda exports <b>64% to EU</b> = <b>$730M at risk</b>.<br><b>Required:</b> GPS coordinates · Deforestation proof · Due diligence · Farm-to-export traceability<span class="src">EU Regulation 2023/1115.</span></div>'
    html+='<div class="card am"><div class="ch">🇺🇬 Uganda Risk</div>Coffee farmers: <b>1.8M HH</b> · GPS registered: <b>~15–20%</b> · Compliant: <b>&lt;5%</b><br>Deadline: <b>Dec 2025</b> · Key risk: <b>forest-adjacent farms</b><span class="src">UCDA EUDR Assessment 2023.</span></div>'
  }
  else if(s==='compliance_map'){
    if(d.coffee_prod>0){
      const risk=d.elev==='Highland'?'HIGH':d.ndvi>.62?'MEDIUM':'LOW',rcol=risk==='HIGH'?'var(--rd)':risk==='MEDIUM'?'var(--am)':'var(--gn)'
      html+='<div class="card rd"><div class="ch">🗺️ EUDR — '+d.n+'</div>Production: <b>'+d.coffee_prod.toLocaleString()+' MT</b> ('+d.coffee_type+')<br>Deforestation risk: <b style="color:'+rcol+'">'+risk+'</b><br>Farmers needing GPS: <b>~'+Math.round(d.coffee_ha/1.5/1000)+'K</b><span class="src">UCDA 2023/24.</span></div>'
    } else html+='<div class="card gn"><div class="ch">✅ Low EUDR risk</div>'+d.n+' is not a primary coffee zone.<span class="src">UCDA 2023/24.</span></div>'
  }
  else if(s==='coffee_traceability'){
    html+='<div class="card am"><div class="ch">☕ Traceability Chain</div>';
    [{step:'1. Farm Plot Registration',status:d.programmes.farmpass?'✅ AgriMap active':'📌 Needed'},{step:'2. Deforestation Check',status:'🔄 Requires GPS data'},{step:'3. Farmer Digital ID',status:d.programmes.mcp?'✅ Voucher active':'📌 Needed'},{step:'4. Export Certification',status:'📌 MAAIF developing'}].forEach(st=>{
      html+='<div style="padding:4px;background:var(--s1);border-radius:5px;margin-bottom:3px;font-size:9px;border:1px solid var(--bd)"><b style="color:#92400e">'+st.step+'</b><br>'+st.status+'</div>'
    })
    html+='<span class="src">NUCAFE + MAAIF EUDR 2023.</span></div>'
  }
  // ── EUDR: eudr_ai ──
  else if(s==='eudr_ai'){
    html+='<div class="ai-panel" style="border-color:rgba(146,64,14,.3);background:rgba(146,64,14,.04)"><div class="ai-hdr"><div class="ai-ico" style="background:linear-gradient(135deg,#92400e,#78350f)">☕</div><div><div class="ai-title" style="color:#92400e">EUDR Compliance AI — '+d.n+'</div><div class="ai-sub">Generate compliance roadmap + risk assessment</div></div></div>'
    html+='<div class="ai-result show" style="display:block"><div style="font-size:10px;line-height:1.6">'
    if(d.coffee_prod>0){
      var risk2=d.elev==='Highland'?'HIGH':d.ndvi>.62?'MEDIUM':'LOW'
      html+='<b>EUDR Risk Assessment — '+d.n+':</b> <b style="color:'+(risk2==='HIGH'?'var(--rd)':'var(--am)')+'">'+risk2+'</b><br><br>'
      html+='<b>Key steps before Dec 2025:</b><br>1. GPS register all '+Math.round(d.coffee_ha/1.5/1000)+'K coffee farm plots via AgriMap Farmer ID<br>2. Cross-reference with Global Forest Watch 2020 baseline<br>3. Issue due diligence certificates per lot<br>4. Connect to NUCAFE cooperative traceability<br>5. Prepare documentation for EU buyers<br><br>'
      html+='<b>AgriMap Farmer ID</b> '+(d.programmes.farmpass?'✅ active here — enables GPS registration at scale':'📌 not yet active — needs rollout for GPS registration')+'<br>'
      html+='<b>Non-compliance impact:</b> Loss of EU market access = <b>$'+Math.round(d.coffee_prod*4.85/1000)+'K</b> export revenue at risk'
    } else html+=''+d.n+' is not a primary coffee zone — EUDR low risk. Focus compliance resources on coffee-producing districts.'
    html+='</div></div></div>'
  }
  // ── CONCEPT NOTE tabs ──
  else if(s==='cn_preview'){
    html+='<div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:10px;padding:11px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">PROGRAMME INTELLIGENCE FORMAT</div><div style="font-size:13px;font-weight:800">📄 Concept Note Preview — '+d.n+'</div><div style="font-size:9px;opacity:.8;margin-top:2px">Generate from the ✍️ Generate tab · Then copy and paste</div></div>'
    html+='<div class="card" style="font-size:9px;line-height:1.7"><div style="text-align:center;padding:20px;color:var(--t3)"><div style="font-size:24px;margin-bottom:8px">📝</div><div style="font-weight:700;color:var(--t2)">No concept note generated yet.</div><div style="margin-top:6px">Go to the <b>✍️ Generate</b> tab → choose focus area and grant size → click Generate.<br><br>AI will create a funder-ready concept note using real '+d.n+' data.</div></div></div>'
    html+='<div class="card or"><div class="ch">📋 What the concept note includes</div>The AI-generated concept note for '+d.n+' will include:<br>&nbsp;• Problem statement using real UBOS + FEWS NET + DHS data<br>&nbsp;• Proposed YAW intervention package<br>&nbsp;• Target beneficiaries with numbers<br>&nbsp;• Budget indicative in USD and UGX<br>&nbsp;• Expected outcomes aligned to YAW 2030 targets<br>&nbsp;• Key partners<br>&nbsp;• M&E framework<br><br><b>District context loaded:</b> Pop '+Math.round(d.pop/1000)+'K · Agri Score '+sc.total+'/100 · Finance gap '+(100-d.fin)+'%<span class="src">YAW Concept Note Template + AgriMap.</span></div>'
  }
  else if(s==='investment_calc'){
    var yp2=Math.round(d.pop*d.youth/100)
    var items2=[{item:'Markets for Youth rollout',cost_ugx:450,cost_usd:120,reach:Math.round(yp2*0.25/1000)+'K youth'},{item:'AgriMap Farmer ID enrolment',cost_ugx:180,cost_usd:48,reach:Math.round(yp2*0.4/1000)+'K farmers'},{item:'Digital Input Voucher expansion',cost_ugx:280,cost_usd:75,reach:Math.round(d.pop*0.15/1000)+'K adults'},{item:'Seed traceability pilot',cost_ugx:120,cost_usd:32,reach:Math.round(yp2*0.2/1000)+'K farmers'},{item:'Digital advisory activation',cost_ugx:90,cost_usd:24,reach:Math.round(yp2*0.5/1000)+'K farmers'},{item:'EUDR compliance support',cost_ugx:160,cost_usd:43,reach:Math.round(d.coffee_ha/1500)+'K coffee farmers'}]
    html+='<div class="card gn"><div class="ch">💰 Investment Calculator — '+d.n+'</div><div style="font-size:9px">'
    html+='<div style="display:grid;grid-template-columns:1fr 70px 60px 80px;gap:3px;padding:3px 0;border-bottom:2px solid var(--gn);font-weight:700;color:var(--t2)"><span>Component</span><span>UGX (M)</span><span>USD (K)</span><span>Reach</span></div>'
    var totalUGX2=0,totalUSD2=0
    items2.forEach(function(it){totalUGX2+=it.cost_ugx;totalUSD2+=it.cost_usd;html+='<div style="display:grid;grid-template-columns:1fr 70px 60px 80px;gap:3px;padding:4px 0;border-bottom:1px solid var(--bd)"><span>'+it.item+'</span><span style="color:var(--gn)">'+it.cost_ugx+'M</span><span style="color:var(--bl)">$'+it.cost_usd+'K</span><span style="color:var(--cy)">'+it.reach+'</span></div>'})
    html+='<div style="display:grid;grid-template-columns:1fr 70px 60px 80px;gap:3px;padding:6px 0;font-weight:800;border-top:2px solid var(--gn)"><span>TOTAL</span><span style="color:var(--gn)">'+totalUGX2+'M</span><span style="color:var(--bl)">$'+totalUSD2+'K</span><span style="color:var(--cy)">~'+Math.round(totalUSD2/12)+'K farmers</span></div>'
    html+='</div><br>Cost per farmer: <b>~$'+Math.round(totalUSD2*1000/(totalUSD2/12*1000))+'</b><span class="src">YAW Uganda cost benchmarks.</span></div>'
  }
  else if(s==='data_gaps'){
    html+='<div class="card am"><div class="ch">📊 Data Gaps for '+d.n+'</div><b>What we have (live):</b><br>✅ Crop adoption + yields (UBOS AAS 2020)<br>✅ NDVI vegetation health (Sentinel-2 weekly)<br>✅ Soil NPK + pH (FAO-GAEZ + ISRIC)<br>✅ Financial inclusion (FinScope 2023)<br>✅ Market prices (Farmgain Africa weekly)<br>✅ Foundation programme coverage<br><br><b>What Foundation funding would unlock:</b><br>📱 AgriMap Farmer ID API → farmer crop records<br>💳 Digital Input Voucher → transaction + loan data<br>🐄 Ripple Effect → dairy volumes + cooperative data<br>☕ NUCAFE → coffee traceability + GPS plot data<br><br><b>What needs collection (18-month programme):</b><br>📍 Parish-level farmgate prices<br>📍 Sub-county agro-dealer stock + prices<br>📍 Individual yield tracking per farmer<br>📍 Cold chain infrastructure GPS locations<span class="src">AgriMap Data Architecture Plan.</span></div>'
  }
  else if(s==='cn_generator'){
    html+='<div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">PROGRAMME INTELLIGENCE</div><div style="font-size:13px;font-weight:800">Concept Note Generator</div><div style="font-size:9px;opacity:.85">AI-generated proposal for '+d.n+'</div></div>'
    html+='<div class="card gn"><div class="ch">📝 What this generates</div>Using real district data, AI drafts a funder-ready concept note including:<br>• Problem statement with evidence<br>• Proposed YAW intervention<br>• Target beneficiaries<br>• Budget indicative<br>• Expected outcomes<br>• M&E framework<span class="src">YAW concept note template.</span></div>'
    html+='<div class="ai-panel"><div class="ai-hdr"><div class="ai-ico" style="background:linear-gradient(135deg,#065f46,#047857)">📝</div><div><div class="ai-title" style="color:#065f46">Concept Note AI</div><div class="ai-sub">Generate for '+d.n+'</div></div></div><div class="ai-result show" style="display:block">Click Generate to create a concept note using real '+d.n+' data. (Requires API key configured in the AI panel.)</div></div>'
  }
  // ── AI tabs ──
  else if(curTab==='ai'){
    const btns={satellite_ai:{ico:'🛰️',title:'Satellite Intelligence',col:'#2563eb'},soil_ai:{ico:'🧪',title:'Soil Health AI',col:'#7c3aed'},seed_ai:{ico:'🌱',title:'Seed Intelligence',col:'#16a34a'},yield_forecast:{ico:'📈',title:'Yield Forecast',col:'#0891b2'},crop_diagnosis:{ico:'🔬',title:'Crop Diagnosis',col:'#dc2626'},market_ai:{ico:'💰',title:'Market Intelligence',col:'#b45309'},farmer_msg:{ico:'👨‍🌾',title:'Farmer Advisory',col:'#065f46'},foundation_strategy:{ico:'🧡',title:'YAW Strategy',col:'#ea580c'},ask:{ico:'💬',title:'Ask AI',col:'#7c3aed'}}
    const b=btns[s]||{ico:'✨',title:'AI',col:'#7c3aed'}
    html+='<div class="ai-panel"><div class="ai-hdr"><div class="ai-ico" style="background:linear-gradient(135deg,'+b.col+','+b.col+'cc)">'+b.ico+'</div><div><div class="ai-title" style="color:'+b.col+'">'+b.title+'</div><div class="ai-sub">AI analysis for '+d.n+'</div></div></div>'
    if(s==='crop_diagnosis')html+='<div style="font-size:10px;color:var(--t2);margin-bottom:6px">Describe symptoms in the field for AI diagnosis.</div>'
    if(s==='ask')html+='<div style="font-size:10px;color:var(--t2);margin-bottom:6px">Ask anything about '+d.n+' district.</div>'
    html+='<div class="ai-result show" style="display:block"><div style="font-size:10px;line-height:1.6">AI features require an Anthropic API key. In the original HTML, these call the Claude API directly.<br><br><b>District context loaded:</b><br>'+d.n+' · '+d.r+' · NDVI: '+d.ndvi+' · Finance: '+d.fin+'% · Score: '+sc.total+'/100<br><br>This panel would generate real-time AI analysis for '+b.title.toLowerCase()+' using all district data.</div></div></div>'
  }
  // ── DATASOURCES tabs ──
  else if(curTab==='datasources'){
    if(s==='overview'){
      html+='<div style="background:linear-gradient(135deg,#0369a1,#0284c7);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:white"><div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;opacity:.7">OPEN DATA CATALOGUE</div><div style="font-size:13px;font-weight:800">Uganda Public Agricultural Data</div></div>';
      [{name:'UBOS AAS 2021/22',org:'UBOS',type:'Crop production, yields, inputs'},{name:'NPHC 2024',org:'UBOS',type:'Population by district'},{name:'NLC 2021',org:'UBOS + MAAIF',type:'Cattle, dairy by district'},{name:'MAAIF Coffee Reports 2025',org:'MAAIF',type:'Coffee exports, prices'},{name:'FinScope 2023',org:'FSD Uganda',type:'Financial inclusion'},{name:'DHS 2022',org:'UBOS + MOH',type:'Nutrition, food security'},{name:'FEWS NET',org:'FEWS NET',type:'IPC food security'},{name:'Sentinel-2 NDVI',org:'ESA Copernicus',type:'Vegetation health'},{name:'FAO-GAEZ Soil',org:'FAO + ISRIC',type:'Soil type, pH, NPK'},{name:'Global Forest Watch',org:'WRI',type:'Deforestation risk'},{name:'Farmgain Africa',org:'Farmgain',type:'Market prices weekly'},{name:'NARO Varieties 2023',org:'NARO',type:'Certified crop varieties'},{name:'ICO Prices',org:'ICO',type:'Coffee benchmarks'},{name:'World Bank Poverty',org:'World Bank',type:'Poverty rates'},{name:'UBOS CPI',org:'UBOS',type:'Food price index'},{name:'Bank of Uganda 2023',org:'BoU',type:'Agri-finance data'}].forEach(src=>{
        html+='<div class="card" style="padding:6px 10px;margin-bottom:3px"><div style="font-weight:700;font-size:10px">'+src.name+'</div><div style="font-size:8.5px;color:var(--t2)">'+src.org+' · <span style="color:var(--gn)">Public access</span></div><div style="font-size:8px;color:var(--t3)">'+src.type+'</div></div>'
      })
    } else {
      html+='<div class="card"><div class="ch">📊 '+({coffee:'Coffee Data',crops:'Crop Data',livestock:'Livestock Data',population:'Population Data',finance:'Finance Data',prices:'Price Data',satellite:'Satellite Data',eudr_data:'EUDR Data'}[s]||'Data')+'</div>Detailed data source view for '+d.n+'. All data from publicly available official sources.<span class="src">AgriMap Uganda Open Data Catalogue.</span></div>'
    }
  }
  // ── DEMO tab ──
  else if(curTab==='demo'){
    html+='<div style="text-align:center;padding:30px"><div style="font-size:36px;margin-bottom:12px">🎯</div><h3>Demo Mode</h3><p style="font-size:10px;color:var(--t2);margin:8px 0 16px">Full-screen presentation mode for funder meetings</p><div style="font-size:9px;color:var(--t3)">Shows: dark-theme map · KPIs · Programme overview · AI strategy · Concept note generator</div></div>'
  }
  // ── DEFAULT ──
  else{
    html+='<div class="card"><div class="ch">'+d.n+' — '+(SUB_LBL[s]||s)+'</div><div style="font-size:10px;line-height:1.6">District: <b>'+d.n+'</b> · '+d.r+' · Score: <b style="color:'+cSc(sc.total)+'">'+sc.total+'/100</b></div><span class="src">AgriMap Uganda.</span></div>'
  }
  return html
}
