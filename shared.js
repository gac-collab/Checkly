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
const ID_RE = /^[0-9]{1,10}$/;
const FIELD_RULES = {
  fEqptNo:  {re:/^[A-Za-z0-9][A-Za-z0-9\-\/ ]{0,19}$/, msg:'Plate / Equipment No. is required (letters, numbers, - and / allowed, e.g. EG49-0017)', required:true},
  fEqptCode:{re:/^[A-Za-z0-9\-\/ ]{1,20}$/, msg:'Equipment Code is required (letters, numbers, - and / only)', required:true},
  fMake:    {re:/^[A-Za-z0-9 \-]{1,30}$/,   msg:'Make is required',                                required:true},
  fModel:   {re:/^[A-Za-z0-9 \-]{1,30}$/,   msg:'Model is required',                               required:true},
  fEngMake: {re:/^[A-Za-z0-9 \-]{1,30}$/,   msg:'Engine Make is required',                         required:true},
  fEngModel:{re:/^[A-Za-z0-9 \-]{1,30}$/,   msg:'Engine Model is required',                        required:true},
  fKmr:     {re:/^[0-9]{1,9}$/,             msg:'KMR / HMR is required (numbers only)',            required:true},
  fDate:    {re:/^\d{4}-\d{2}-\d{2}$/,      msg:'Date is required',                                required:true},
  fRemarks: {re:/^[\s\S]{1,500}$/,          msg:'Remarks are required (write "None" if no remarks)', required:true},
  fMech:    {re:ID_RE,                      msg:'Mechanic ID No. is required (numbers only)',      required:true},
  fOper:    {re:ID_RE,                      msg:'Operator ID No. is required (numbers only)',      required:true},
  fSup:     {re:ID_RE,                      msg:'Supervisor ID No. is required (numbers only)',    required:true},
  fRev:     {re:ID_RE,                      msg:'Reviewed By ID No. is required (numbers only)',   required:true}
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
function validateItems(container){
  container = container || document.getElementById('itemsWrap');
  if(!container) return true;
  let ok=true, first=null;
  container.querySelectorAll('.item').forEach(item=>{
    const on=item.querySelector('.cbtn.on');
    const ta=item.querySelector('textarea');
    const needsNote = on && on.dataset.v!=='OK';
    const noteMissing = needsNote && ta && ta.value.trim()==='';
    const bad = !on || noteMissing;
    item.classList.toggle('item-invalid', !!bad);
    let msg=item.querySelector('.item-err');
    if(!msg){ msg=document.createElement('div'); msg.className='errmsg item-err'; item.appendChild(msg); }
    msg.textContent = !on ? 'Select OK, NOT OK or MISSING' : (noteMissing ? 'Findings / action taken is required for NOT OK / MISSING items' : '');
    msg.classList.toggle('show', !!bad);
    if(bad){ ok=false; if(!first) first=item; }
  });
  if(first) first.scrollIntoView({behavior:'smooth',block:'center'});
  return ok;
}
function validateAllFields(){
  let allOk=true, firstBad=null;
  Object.keys(FIELD_RULES).forEach(id=>{
    if(document.getElementById(id)){
      if(!validateOneField(id)){ allOk=false; if(!firstBad) firstBad=document.getElementById(id); }
    }
  });
  const itemsOk = validateItems();
  if(firstBad && itemsOk) firstBad.scrollIntoView({behavior:'smooth',block:'center'});
  return allOk && itemsOk;
}

/* ---------- header fields HTML (shared between new + edit) ---------- */
function headerFieldsHtml(r){
  r=r||{};
  const f=(id,label,val,ph,req)=>`<div class="field"><label>${label}${req?' <span class="req">*</span>':''}</label>
    <input id="${id}" value="${escHtml(val||'')}" placeholder="${ph||''}" inputmode="${id==='fKmr'?'numeric':'text'}">
    <div class="errmsg" id="${id}Err">${FIELD_RULES[id]?FIELD_RULES[id].msg:''}</div></div>`;
  return `<div class="grid">
    ${f('fEqptNo','Equipment / Plate No.',r.eqptNo,'e.g. EG49-0017',true)}
    ${f('fEqptCode','Equipment Code',r.eqptCode,'e.g. FL-04',true)}
    ${f('fMake','Make',r.make,'e.g. Toyota',true)}
    ${f('fModel','Model',r.model,'e.g. 8FD25',true)}
    ${f('fEngMake','Engine Make',r.engMake,'',true)}
    ${f('fEngModel','Engine Model',r.engModel,'',true)}
    ${f('fKmr','KMR / HMR (numbers)',r.kmr,'e.g. 18500',true)}
    <div class="field"><label>Date <span class="req">*</span></label><input type="date" id="fDate" value="${r.date||''}">
      <div class="errmsg" id="fDateErr">Date is required</div></div>
  </div>`;
}
function signoffFieldsHtml(r){
  r=r||{};
  const f=(id,label,val)=>`<div class="field"><label>${label} <span class="req">*</span></label><input id="${id}" value="${escHtml(val||'')}" placeholder="ID number" inputmode="numeric" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
    <div class="errmsg" id="${id}Err">${FIELD_RULES[id]?FIELD_RULES[id].msg:''}</div></div>`;
  return `<div class="grid">
    ${f('fMech','Mechanic ID No.',r.mechanic)}${f('fOper','Operator ID No.',r.operator)}
    ${f('fSup','Supervisor ID No.',r.supervisor)}${f('fRev','Reviewed By ID No.',r.reviewedBy)}
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
    const it=b.closest('.item'); if(it){ it.classList.remove('item-invalid'); const m=it.querySelector('.item-err'); if(m) m.classList.remove('show'); }
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
