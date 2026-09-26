/* ---------- basics ---------- */
function escHtml(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toast(m){
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=m; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2400);
}
function confirmDialog(title,msg){
  return new Promise(resolve=>{
    const bg=document.createElement('div'); bg.className='modal-bg';
    bg.innerHTML=`<div class="modal"><h3>${escHtml(title)}</h3><p>${escHtml(msg)}</p>
      <div class="row" style="justify-content:flex-end">
        <button class="btn ghost sm" id="cdNo">Cancel</button>
        <button class="btn red sm" id="cdYes">Delete</button>
      </div></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click',e=>{ if(e.target===bg){ bg.remove(); resolve(false); } });
    bg.querySelector('#cdNo').onclick=()=>{bg.remove();resolve(false);};
    bg.querySelector('#cdYes').onclick=()=>{bg.remove();resolve(true);};
  });
}

/* ---------- field validation ---------- */
// rule: {re, msg, required}
const FIELD_RULES = {
  fEqptNo:  {re:/^[0-9]{1,10}$/,            msg:'Plate / Equipment No. must be numbers only',      required:true},
  fEqptCode:{re:/^[A-Za-z0-9\-\/ ]{0,20}$/, msg:'Letters, numbers, - and / only',                  required:false},
  fMake:    {re:/^[A-Za-z0-9 \-]{0,30}$/,   msg:'Letters and numbers only',                         required:false},
  fModel:   {re:/^[A-Za-z0-9 \-]{0,30}$/,   msg:'Letters and numbers only',                         required:false},
  fEngMake: {re:/^[A-Za-z0-9 \-]{0,30}$/,   msg:'Letters and numbers only',                         required:false},
  fEngModel:{re:/^[A-Za-z0-9 \-]{0,30}$/,   msg:'Letters and numbers only',                         required:false},
  fKmr:     {re:/^[0-9]{0,9}$/,             msg:'Numbers only (KM or Hours reading)',               required:false},
  fDate:    {re:/^\d{4}-\d{2}-\d{2}$/,      msg:'Date is required',                                 required:true},
  fMech:    {re:/^[A-Za-z .]{0,40}$/,       msg:'Letters only',                                     required:false},
  fOper:    {re:/^[A-Za-z .]{0,40}$/,       msg:'Letters only',                                     required:false},
  fSup:     {re:/^[A-Za-z .]{0,40}$/,       msg:'Letters only',                                     required:false},
  fRev:     {re:/^[A-Za-z .]{0,40}$/,       msg:'Letters only',                                     required:false}
};
function validateOneField(id){
  const el=document.getElementById(id); const rule=FIELD_RULES[id];
  if(!el||!rule) return true;
  const v=el.value.trim();
  const errEl=document.getElementById(id+'Err');
  let ok = rule.required ? (v!=='' && rule.re.test(v)) : (v==='' || rule.re.test(v));
  el.classList.toggle('invalid', !ok);
  if(errEl) errEl.classList.toggle('show', !ok);
  return ok;
}
function attachValidation(){
  Object.keys(FIELD_RULES).forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('blur',()=>validateOneField(id));
  });
}
function validateAllFields(){
  let allOk=true;
  Object.keys(FIELD_RULES).forEach(id=>{ if(document.getElementById(id)){ if(!validateOneField(id)) allOk=false; } });
  return allOk;
}

/* ---------- header fields HTML (shared between new + edit) ---------- */
function headerFieldsHtml(r){
  r=r||{};
  const f=(id,label,val,ph,req)=>`<div class="field"><label>${label}${req?' <span class="req">*</span>':''}</label>
    <input id="${id}" value="${escHtml(val||'')}" placeholder="${ph||''}" inputmode="${id==='fEqptNo'||id==='fKmr'?'numeric':'text'}">
    <div class="errmsg" id="${id}Err">${FIELD_RULES[id]?FIELD_RULES[id].msg:''}</div></div>`;
  return `<div class="grid">
    ${f('fEqptNo','Equipment / Plate No.',r.eqptNo,'e.g. 123456',true)}
    ${f('fEqptCode','Equipment Code',r.eqptCode,'e.g. FL-04')}
    ${f('fMake','Make',r.make,'e.g. Toyota')}
    ${f('fModel','Model',r.model,'e.g. 8FD25')}
    ${f('fEngMake','Engine Make',r.engMake,'')}
    ${f('fEngModel','Engine Model',r.engModel,'')}
    ${f('fKmr','KMR / HMR (numbers)',r.kmr,'e.g. 18500')}
    <div class="field"><label>Date <span class="req">*</span></label><input type="date" id="fDate" value="${r.date||''}">
      <div class="errmsg" id="fDateErr">Date is required</div></div>
  </div>`;
}
function signoffFieldsHtml(r){
  r=r||{};
  const f=(id,label,val)=>`<div class="field"><label>${label}</label><input id="${id}" value="${escHtml(val||'')}">
    <div class="errmsg" id="${id}Err">${FIELD_RULES[id]?FIELD_RULES[id].msg:''}</div></div>`;
  return `<div class="grid">
    ${f('fMech','Mechanic',r.mechanic)}${f('fOper','Operator',r.operator)}
    ${f('fSup','Supervisor',r.supervisor)}${f('fRev','Reviewed By',r.reviewedBy)}
  </div>`;
}

/* ---------- checklist items block (shared) ---------- */
function itemsBlockHtml(items, existing){
  existing = existing || [];
  return items.map((desc,i)=>{
    const ex = existing[i]||{};
    return `<div class="item">
      <div class="desc">${i+1}. ${escHtml(desc)}</div>
      <div class="cond" data-idx="${i}">
        <button type="button" class="cbtn ${ex.cond==='OK'?'on':''}" data-v="OK">OK</button>
        <button type="button" class="cbtn ${ex.cond==='NOTOK'?'on':''}" data-v="NOTOK">NOT OK</button>
        <button type="button" class="cbtn ${ex.cond==='MISS'?'on':''}" data-v="MISS">MISSING</button>
      </div>
      <textarea placeholder="Findings / action taken" data-f="${i}">${escHtml(ex.findings||'')}</textarea>
    </div>`;
  }).join('');
}
function wireItemButtons(container){
  container.querySelectorAll('.cbtn').forEach(b=>b.onclick=()=>{
    b.parentElement.querySelectorAll('.cbtn').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    updateProgress(container);
  });
  updateProgress(container);
}
function updateProgress(container){
  const bar=document.getElementById('progBar'); if(!bar) return;
  const total=container.querySelectorAll('.cond').length;
  const done=container.querySelectorAll('.cbtn.on').length;
  bar.style.width = total? (done/total*100)+'%' : '0%';
  const lbl=document.getElementById('progLabel'); if(lbl) lbl.textContent = `${done} / ${total} items checked`;
}
function collectItems(items, container){
  return items.map((desc,i)=>{
    const condEl=container.querySelector(`.cond[data-idx="${i}"] .cbtn.on`);
    const findEl=container.querySelector(`[data-f="${i}"]`);
    return {desc, cond: condEl?condEl.dataset.v:"", findings: findEl?findEl.value:""};
  });
}
function val(id){const el=document.getElementById(id); return el?el.value:'';}

/* ---------- firebase helpers ---------- */
async function fsCreate(rec){ const ref=await db.collection('checklists').add(rec); return ref.id; }
async function fsUpdate(id,rec){ await db.collection('checklists').doc(id).update(rec); }
async function fsDelete(id){ await db.collection('checklists').doc(id).delete(); }
async function fsGet(id){ const d=await db.collection('checklists').doc(id).get(); return d.exists?{id:d.id,...d.data()}:null; }
async function fsList(limitN){
  const snap=await db.collection('checklists').orderBy('submittedAt','desc').limit(limitN||500).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

/* ---------- "my submissions" (per-browser, no login) ---------- */
const MYSUB_KEY='gac_my_submissions';
function myLocalIds(){ try{ return JSON.parse(localStorage.getItem(MYSUB_KEY)||'[]'); }catch(e){ return []; } }
function myLocalAdd(id){ const arr=myLocalIds(); arr.unshift(id); localStorage.setItem(MYSUB_KEY, JSON.stringify(arr.slice(0,200))); }
function myLocalRemove(id){ localStorage.setItem(MYSUB_KEY, JSON.stringify(myLocalIds().filter(x=>x!==id))); }
