/* ===== Service Due Alerts (shared by site + admin) ===== */
const SVC_FALLBACK={
  lmv:{unit:'KM',interval:5000,warn:500},
  hmv:{unit:'KM',interval:10000,warn:1000},
  forklift:{unit:'HR',interval:250,warn:25},
  crane:{unit:'HR',interval:250,warn:25},
  loader:{unit:'HR',interval:250,warn:25},
  generator:{unit:'HR',interval:250,warn:25}
};
const SVC_LEVELS={
  OVERDUE:{label:'OVERDUE',color:'#d7191e',rank:0},
  HIGH:{label:'HIGH PRIORITY',color:'#e8590c',rank:1},
  MEDIUM:{label:'DUE SOON',color:'#d99a00',rank:2},
  NONE:{label:'SET UP NEEDED',color:'#8a8f98',rank:3},
  OK:{label:'OK',color:'#1f8a4c',rank:4}
};
function plateKey(p){ return String(p==null?'':p).toUpperCase().replace(/[^A-Z0-9]/g,''); }
function fmtNum(n){ return (n==null||isNaN(n))?'—':Number(n).toLocaleString('en-US'); }
function svcDefaultFor(equip,defs){
  return Object.assign({}, SVC_FALLBACK[equip]||{unit:'KM',interval:5000,warn:500}, (defs&&defs[equip])||{});
}

/* ---- keep "latest reading per plate" up to date ---- */
async function svcUpdateStatus(rec){
  try{
    const key=plateKey(rec.eqptNo); const reading=parseInt(rec.kmr,10);
    if(!key||isNaN(reading)) return;
    const ref=db.collection('fleetStatus').doc(key);
    const snap=await ref.get(); const cur=snap.exists?snap.data():null;
    const newer=!cur||rec.date>cur.date||(rec.date===cur.date&&reading>=cur.reading);
    if(newer) await ref.set({plate:String(rec.eqptNo).trim().toUpperCase(),equip:rec.equip||'',equipLabel:rec.equipLabel||'',reading,date:rec.date||''});
  }catch(e){ console.warn('svcUpdateStatus',e); }
}
async function svcRebuildStatus(){
  const recs=await fsList(500); const best={};
  recs.forEach(r=>{
    const k=plateKey(r.eqptNo); const rd=parseInt(r.kmr,10);
    if(!k||isNaN(rd)) return;
    const c=best[k];
    if(!c||r.date>c.date||(r.date===c.date&&rd>=c.reading))
      best[k]={plate:String(r.eqptNo).trim().toUpperCase(),equip:r.equip||'',equipLabel:r.equipLabel||'',reading:rd,date:r.date||''};
  });
  const batch=db.batch();
  Object.keys(best).forEach(k=>batch.set(db.collection('fleetStatus').doc(k),best[k]));
  await batch.commit();
  return Object.keys(best).length;
}

/* ---- load + calculate ---- */
async function svcLoadRaw(){
  const [a,b,c]=await Promise.all([
    db.collection('fleetStatus').get(), db.collection('serviceAlerts').get(), db.collection('serviceDefaults').get()]);
  const status={},alerts={},defs={};
  a.forEach(d=>status[d.id]=d.data()); b.forEach(d=>alerts[d.id]=d.data()); c.forEach(d=>defs[d.id]=d.data());
  return {status,alerts,defs};
}
function svcBuild(raw){
  const keys=new Set([...Object.keys(raw.status),...Object.keys(raw.alerts)]);
  const items=[]; const today=new Date();
  keys.forEach(key=>{
    const st=raw.status[key]||{}, al=raw.alerts[key]||null;
    const equip=(al&&al.equip)||st.equip||'';
    const d=svcDefaultFor(equip,raw.defs);
    const unit=(al&&al.unit)||d.unit;
    const interval=(al&&+al.interval)||+d.interval||5000;
    const warn=(al&&+al.warn)||+d.warn||Math.round(interval*0.1);
    const reading=(st.reading==null)?null:+st.reading;
    const last=(al&&al.lastServiceReading!=null&&al.lastServiceReading!=='')?+al.lastServiceReading:null;
    const it={key,plate:(al&&al.plate)||st.plate||key,equip,
      equipLabel:(typeof TEMPLATES!=='undefined'&&TEMPLATES[equip])?TEMPLATES[equip].label:(st.equipLabel||equip||'—'),
      unit,interval,warn,reading,readingDate:st.date||'',last,lastDate:(al&&al.lastServiceDate)||'',
      notes:(al&&al.notes)||'',hasAlert:!!al,customInterval:!!(al&&+al.interval),customWarn:!!(al&&+al.warn),
      due:null,remaining:null,pct:0,level:'NONE',note:'',staleDays:0};
    if(last!=null) it.due=last+interval;
    if(reading==null) it.note='No checklist reading recorded yet';
    else if(last==null) it.note='Last service reading not set — admin needs to set it up';
    else{
      it.remaining=it.due-reading;
      it.pct=Math.max(0,Math.min(100,(reading-last)/interval*100));
      it.level = it.remaining<=0?'OVERDUE' : it.remaining<=warn*0.5?'HIGH' : it.remaining<=warn?'MEDIUM' : 'OK';
    }
    if(it.readingDate){ const dd=Math.floor((today-new Date(it.readingDate))/86400000); if(dd>30) it.staleDays=dd; }
    items.push(it);
  });
  items.sort((a,b)=>{
    const ra=SVC_LEVELS[a.level].rank, rb=SVC_LEVELS[b.level].rank;
    if(ra!==rb) return ra-rb;
    const xa=a.remaining==null?1e12:a.remaining, xb=b.remaining==null?1e12:b.remaining;
    return xa-xb || String(a.plate).localeCompare(String(b.plate));
  });
  return items;
}
async function svcItems(){ return svcBuild(await svcLoadRaw()); }

/* ---- UI helpers ---- */
function svcCardHtml(it,admin){
  const L=SVC_LEVELS[it.level]; let line='';
  if(it.level==='NONE'){ line=`<div class="svc-line">${escHtml(it.note)}</div>`; }
  else{
    const left = it.remaining<0 ? `Overdue by <b>${fmtNum(-it.remaining)} ${it.unit}</b>` : it.remaining===0 ? '<b>Due now</b>' : `<b>${fmtNum(it.remaining)} ${it.unit}</b> left`;
    line=`<div class="svc-line">${left} · Due at <b>${fmtNum(it.due)} ${it.unit}</b> · Current <b>${fmtNum(it.reading)}</b></div>
      <div class="svc-bar"><i style="width:${it.pct}%"></i></div>
      <div class="t2" style="margin-top:6px">Serviced at ${fmtNum(it.last)} ${it.unit}${it.lastDate?' ('+escHtml(it.lastDate)+')':''} · every ${fmtNum(it.interval)} ${it.unit}${admin?' · alert before '+fmtNum(it.warn):''}</div>`;
  }
  const stale = it.staleDays ? `<div class="svc-stale">⚠ Last reading is ${it.staleDays} days old (${escHtml(it.readingDate)}) — checklist needed</div>` : '';
  const notes = it.notes ? `<div class="t2" style="margin-top:4px">📝 ${escHtml(it.notes)}</div>` : '';
  let btns='';
  if(admin){
    btns=`<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">
      ${it.hasAlert?`<button class="btn ghost sm" data-act="edit" data-k="${it.key}">Edit</button>`:`<button class="btn sm" data-act="edit" data-k="${it.key}">Set up</button>`}
      ${it.reading!=null?`<button class="btn ghost sm" data-act="svc" data-k="${it.key}">Mark serviced</button>`:''}
      ${it.hasAlert?`<button class="btn danger-ghost sm" data-act="del" data-k="${it.key}">Delete</button>`:''}</div>`;
  }
  return `<div class="svc-card lvl-${it.level}" style="--lc:${L.color}">
    <div class="svc-top"><span class="svc-plate">${escHtml(it.plate)}</span><span class="svc-type">${escHtml(it.equipLabel)}</span><div class="sp"></div>
    <span class="badge" style="background:${L.color}">${L.label}</span></div>${line}${stale}${notes}${btns}</div>`;
}
function svcTilesHtml(items){
  const c=k=>items.filter(i=>i.level===k).length;
  const t=(k,l)=>`<div class="svc-tile" style="background:${SVC_LEVELS[k].color}"><b>${c(k)}</b><span>${l}</span></div>`;
  return `<div class="svc-tiles">${t('OVERDUE','OVERDUE')}${t('HIGH','HIGH')}${t('MEDIUM','DUE SOON')}${t('OK','OK')}</div>`;
}
function svcPrompt(title,msg,def){
  return new Promise(resolve=>{
    const bg=document.createElement('div'); bg.className='modal-bg';
    bg.innerHTML=`<div class="modal"><h3>${escHtml(title)}</h3><p>${escHtml(msg)}</p>
      <div class="field"><input id="svcPromptIn" inputmode="numeric" value="${escHtml(def==null?'':def)}"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost sm" id="spNo">Cancel</button><button class="btn sm" id="spYes">Save</button></div></div>`;
    document.body.appendChild(bg);
    bg.querySelector('#spNo').onclick=()=>{bg.remove();resolve(null);};
    bg.querySelector('#spYes').onclick=()=>{ const v=bg.querySelector('#svcPromptIn').value.trim(); if(!/^\d{1,9}$/.test(v)){ toast('Enter a number'); return; } bg.remove(); resolve(+v); };
  });
}

/* ---- notifications (shown when the app is opened) ---- */
function svcNotifySupported(){ return 'Notification' in window; }
async function svcEnableNotify(){
  if(!svcNotifySupported()){ toast('Notifications not supported on this browser'); return false; }
  const p=await Notification.requestPermission();
  toast(p==='granted'?'Notifications enabled':'Notifications not allowed');
  return p==='granted';
}
function svcMaybeNotify(items){
  try{
    if(!svcNotifySupported()||Notification.permission!=='granted') return;
    const od=items.filter(i=>i.level==='OVERDUE').length, hi=items.filter(i=>i.level==='HIGH').length;
    if(!od&&!hi) return;
    const today=new Date().toISOString().slice(0,10);
    if(localStorage.getItem('gac_svc_notified')===today) return;
    localStorage.setItem('gac_svc_notified',today);
    new Notification('GAC Service Alerts',{body:`${od} overdue, ${hi} high priority service(s) — open Service Due tab`,icon:(typeof LOGO_DATA_URI!=='undefined'?LOGO_DATA_URI:undefined)});
  }catch(e){ console.warn(e); }
}
