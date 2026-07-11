'use strict';
/* 排班系統 — 第一版（本機 localStorage）。資料結構刻意與 Firebase 相容，之後可接雲端。
   每人每日資料：{ work:[[s,e],...], off:[[s,e],...] }
   work = 上班區塊；off = 休假/不可上班區塊（可整日或某時段；整日 = [0,48]）。 */

/* ---------- 常數 ---------- */
const SLOTS = 48;              // 一天 48 個半小時
const STORE_KEY = 'shiftScheduler.v1';

const UNITS = [
  { id: 'ID',  name: '印尼',    apollo: '51ID'  },
  { id: 'VN',  name: '越南',    apollo: '52VN'  },
  { id: 'TH',  name: '泰國',    apollo: '55TH'  },
  { id: 'PH',  name: '菲律賓',  apollo: '53PH'  },
  { id: 'KYC', name: '客戶審查', apollo: '61KYC' },
];
const SHIFT_CODE = 'B001';     // 班次代碼：客服班（已確認）
const STATUS_WORK = 'W0001';
const STATUS_LEAVE = 'H0001';

/* 勞動條件上限 */
const MAX_DAY_MIN = 480;             // 每天 8 小時
const MAX_WEEK_STUDENT_MIN = 1200;   // 外籍學生每週 20 小時
const MAX_CONSEC = 5;                // 連續上班 5 天

const APOLLO_HEADER = [
  '*工號','姓名','*日期(YYYY/MM/DD)','*狀態代碼','班次代碼','上班時間(HH:mm)','下班時間(HH:mm)',
  '休息時間(hh:mm~hh:mm；如有多組以","分隔；最多3組)','全天支援單位代碼',
  '(1)支援單位代碼','(1)支援起時-hh:mm','(1)支援迄時-hh:mm',
  '(2)支援單位代碼','(2)支援起時-hh:mm','(2)支援迄時-hh:mm',
  '(3)支援單位代碼','(3)支援起時-hh:mm','(3)支援迄時-hh:mm',
];

/* 每個單位一個色，方便辨識 */
const UNIT_COLOR = { ID:'#007aff', VN:'#34c759', TH:'#ff9500', PH:'#af52de', KYC:'#ff2d55' };

/* 常用班別範本（管理員首次登入、範本為空時自動建立，可自行增刪修改） */
const DEFAULT_TEMPLATES = [
  { name:'早班', start:'09:00', end:'18:00', bs:'12:00', be:'13:00' },
  { name:'中班', start:'12:00', end:'21:00', bs:'', be:'' },
  { name:'晚班', start:'18:00', end:'22:00', bs:'', be:'' },
  { name:'早半', start:'09:00', end:'13:00', bs:'', be:'' },
  { name:'午半', start:'14:00', end:'18:00', bs:'', be:'' },
];

/* ---------- 工具 ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const pad = n => String(n).padStart(2,'0');

function slotToTime(slot){ return pad(Math.floor(slot/2)) + ':' + (slot%2 ? '30':'00'); }
function timeToSlot(t){ const [h,m] = t.split(':').map(Number); return h*2 + (m>=30?1:0); }
function todayKey(){ return dateKey(new Date()); }
function dateKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function weekdayCh(key){ const d=new Date(key+'T00:00:00'); return '（'+dowLabel(d.getDay())+'）'; }
function apolloDate(key){ return key.replace(/-/g,'/'); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

/* ---------- 狀態 ---------- */
const UNIT_IDS = UNITS.map(u => u.id);
window.UNIT_IDS = UNIT_IDS;
let state = { people:{}, templates:[], schedule:{} };
UNIT_IDS.forEach(id => state.people[id] = []);
let curUnit = localStorage.getItem('ss.curUnit') || 'ID';
let curDate = todayKey();
let activeTpl = null;          // 目前選取的範本 id（當筆刷）
let brushType = 'work';        // 拖拉筆刷：'work' 上班 / 'off' 休假

/* 權限 */
let myEmail = '';
let isAdmin = false;
let myUnits = [];              // 可編輯的單位代碼
let usersList = [];            // 使用者清單（管理用）
function canEdit(unitId){ return isAdmin || myUnits.indexOf(unitId) >= 0; }
function visibleUnits(){ return isAdmin ? UNITS : UNITS.filter(u => myUnits.indexOf(u.id) >= 0); }

function pid(){ return 'p' + Math.random().toString(36).slice(2,9); }
function saveUi(){ try{ localStorage.setItem('ss.curUnit', curUnit); }catch(e){} }
function save(){ saveUi(); }   // 資料改存雲端；此處僅保留介面偏好

function findPerson(personId){
  for(const u of UNIT_IDS){ const p = (state.people[u]||[]).find(x=>x.id===personId); if(p) return p; }
  return null;
}

/* 取某人某日資料（不存在則回空） */
function getDay(date, personId){
  const d = state.schedule[date];
  if(!d || !d[personId]) return { work:[], off:[] };
  const v = d[personId];
  return { work: v.work||[], off: v.off||[] };
}
function cloneDay(day){ return { work: day.work.map(x=>[x[0],x[1]]), off: day.off.map(x=>[x[0],x[1]]) }; }
function setDay(date, personId, val){
  const day = { work: normalize(val.work||[]), off: normalize(val.off||[]) };
  const isEmpty = !day.work.length && !day.off.length;
  if(!state.schedule[date]) state.schedule[date] = {};
  if(isEmpty){ delete state.schedule[date][personId]; }
  else{ state.schedule[date][personId] = day; }
  const p = findPerson(personId);
  if(window.SB) window.SB.writeShift(date, personId, p ? p.unitId : '', day);
}
function isFullOff(day){ return day.off.some(o => o[0] <= 0 && o[1] >= SLOTS); }

/* 雲端資料進來時重建 state 並重繪 */
function applyCloudSnapshot(d){
  const people = {}; UNIT_IDS.forEach(id => people[id] = []);
  (d.people||[]).forEach(p => { if(!people[p.unitId]) people[p.unitId] = []; people[p.unitId].push({ id:p.id, unitId:p.unitId, empNo:p.empNo, name:p.name, foreignStudent:!!p.foreignStudent }); });
  state.people = people;
  state.templates = (d.templates||[]).slice().sort((a,b)=> (a.start||'').localeCompare(b.start||''));
  maybeSeedTemplates(d.tplReady);
  const sched = {};
  (d.shifts||[]).forEach(s => { if(!sched[s.date]) sched[s.date] = {}; sched[s.date][s.personId] = { work:s.work||[], off:s.off||[] }; });
  state.schedule = sched;
  usersList = d.users || [];
  clearSplitCache();
  scheduleRender();
}
window.applyCloudSnapshot = applyCloudSnapshot;

/* 各單位一份範本。管理員首次載入（每瀏覽器一次）：刪掉舊的共用（無單位）範本，
   並為沒有範本的單位建立一組常用預設。 */
let _tplMigrated = false;
function maybeSeedTemplates(ready){
  if(!ready || _tplMigrated || !isAdmin) return;   // 等 templates 載入完再動作，避免時序造成的重複
  _tplMigrated = true;
  const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const lsSet = k => { try{ localStorage.setItem(k,'1'); }catch(e){} };
  // v2：刪掉舊版共用（無單位）範本，並為沒有範本的單位建立預設
  if(!lsGet('ss.tpl.v2')){
    lsSet('ss.tpl.v2');
    state.templates.filter(t => !t.unitId).forEach(t => { if(window.SB) window.SB.deleteTemplate(t.id); });
    UNIT_IDS.forEach(uid => {
      if(state.templates.some(t => t.unitId === uid)) return;
      DEFAULT_TEMPLATES.forEach(tp => { if(window.SB) window.SB.writeTemplate({ id:pid(), unitId:uid, name:tp.name, start:tp.start, end:tp.end, bs:tp.bs, be:tp.be }); });
    });
  }
  // v3：把仍是舊預設值的範本，更新成新的時間/午休（不動已被自訂的）
  if(!lsGet('ss.tpl.v3')){
    lsSet('ss.tpl.v3');
    state.templates.forEach(t => {
      if(t.name==='早班' && t.start==='09:00' && t.end==='18:00' && !t.bs){
        if(window.SB) window.SB.writeTemplate(Object.assign({}, t, { bs:'12:00', be:'13:00' }));
      } else if(t.name==='晚班' && t.start==='14:00' && t.end==='23:00'){
        if(window.SB) window.SB.writeTemplate(Object.assign({}, t, { start:'18:00', end:'22:00', bs:'', be:'' }));
      }
    });
  }
  // v4：去除重複範本（多裝置同時首次載入造成的），並補正規化
  if(!lsGet('ss.tpl.v4')){
    lsSet('ss.tpl.v4');
    const sig = t => {
      let s=t.start, e=t.end, bs=t.bs||'', be=t.be||'';
      if(t.name==='晚班' && s==='14:00' && e==='23:00'){ s='18:00'; e='22:00'; bs=''; be=''; }
      if(t.name==='早班' && s==='09:00' && e==='18:00' && !bs){ bs='12:00'; be='13:00'; }
      return [t.unitId, t.name, s, e, bs, be].join('|');
    };
    const seen = {};
    state.templates.slice().sort((a,b)=> (a.id<b.id?-1:1)).forEach(t => {
      const k = sig(t);
      if(seen[k]){ if(window.SB) window.SB.deleteTemplate(t.id); return; }   // 重複 → 刪
      seen[k] = 1;
      if(t.name==='晚班' && t.start==='14:00' && t.end==='23:00' && window.SB) window.SB.writeTemplate(Object.assign({}, t, { start:'18:00', end:'22:00', bs:'', be:'' }));
      else if(t.name==='早班' && t.start==='09:00' && t.end==='18:00' && !t.bs && window.SB) window.SB.writeTemplate(Object.assign({}, t, { bs:'12:00', be:'13:00' }));
    });
  }
  // v5：修正時序後再乾淨去重一次（涵蓋先前已設過 v4 旗標的瀏覽器）
  if(!lsGet('ss.tpl.v5')){
    lsSet('ss.tpl.v5');
    const sig5 = t => { let s=t.start,e=t.end,bs=t.bs||'',be=t.be||''; if(t.name==='晚班'&&s==='14:00'&&e==='23:00'){s='18:00';e='22:00';bs='';be='';} if(t.name==='早班'&&s==='09:00'&&e==='18:00'&&!bs){bs='12:00';be='13:00';} return [t.unitId,t.name,s,e,bs,be].join('|'); };
    const seen5 = {};
    state.templates.slice().sort((a,b)=> (a.id<b.id?-1:1)).forEach(t => {
      const k = sig5(t);
      if(seen5[k]){ if(window.SB) window.SB.deleteTemplate(t.id); return; }
      seen5[k] = 1;
      if(t.name==='晚班' && t.start==='14:00' && t.end==='23:00' && window.SB) window.SB.writeTemplate(Object.assign({}, t, { start:'18:00', end:'22:00', bs:'', be:'' }));
      else if(t.name==='早班' && t.start==='09:00' && t.end==='18:00' && !t.bs && window.SB) window.SB.writeTemplate(Object.assign({}, t, { bs:'12:00', be:'13:00' }));
    });
  }
}

/* 雲端快照可能連續進來（例如整月套用一次寫很多筆），用去抖動避免反覆重繪 */
let _renderPending = false;
function scheduleRender(){
  if(_renderPending) return;
  _renderPending = true;
  requestAnimationFrame(() => {
    _renderPending = false;
    if($('#userModal') && !$('#userModal').hidden) renderUserMgmt();
    if(weekOpen) renderWeek();
    if(rosterOpen) renderRoster();
    if(monthOpen) renderMonth();
    else if(compareOpen) renderCompare();
    else if(statsOpen) renderStats();
    else renderAll();
  });
}

/* 由 Firebase 模組呼叫：設定登入者權限 */
function setAccess(a){
  myEmail = a.email; isAdmin = a.admin; myUnits = a.units || [];
  if(myUnits.indexOf(curUnit) < 0 && !isAdmin){ curUnit = myUnits[0] || 'ID'; }
  const chip = $('#userChip'); if(chip){ chip.textContent = (a.name||a.email) + (isAdmin?t('admin_paren'):''); }
  $('#userMgmtBtn').hidden = !isAdmin;
  $('#bonusBtn').hidden = !isAdmin;
  $('#bootView').hidden = true; $('#loginView').hidden = true; $('#noAccessView').hidden = true;
  document.body.classList.add('authed');
  renderAll();
}
window.setAccess = setAccess;
window.onSignedOut = function(){ document.body.classList.remove('authed'); $('#bootView').hidden = true; $('#loginView').hidden = false; $('#noAccessView').hidden = true; };
window.onNoAccess = function(user){ document.body.classList.remove('authed'); $('#bootView').hidden = true; $('#loginView').hidden = true; $('#noAccessView').hidden = false; $('#naDesc').textContent = t('noaccess_desc', { email: user.email || '' }); };

/* 合併重疊/相鄰區塊，保留中間空檔 */
function normalize(segs){
  const s = segs.filter(x => x[1] > x[0]).sort((a,b)=>a[0]-b[0]);
  const out = [];
  for(const seg of s){
    const last = out[out.length-1];
    if(last && seg[0] <= last[1]) last[1] = Math.max(last[1], seg[1]);
    else out.push([seg[0], seg[1]]);
  }
  return out;
}
/* 從 list 中挖掉 r 區間（重疊處切掉） */
function subtractRange(list, r){
  const out = [];
  for(const seg of list){
    if(seg[1] <= r[0] || seg[0] >= r[1]){ out.push([seg[0], seg[1]]); continue; }
    if(seg[0] < r[0]) out.push([seg[0], r[0]]);
    if(seg[1] > r[1]) out.push([r[1], seg[1]]);
  }
  return out;
}

/* ---------- 勞動條件：把工時拆成「打卡」與「獎金」 ---------- */
function workMinutesOfDay(date, personId){
  return normalize(getDay(date, personId).work).reduce((s,seg)=> s + (seg[1]-seg[0])*30, 0);
}
function weekKeyOf(date){
  const d = new Date(date+'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay()+6)%7));   // 回到該週週一
  return dateKey(d);
}
function isNextDay(a, b){
  const d = new Date(a+'T00:00:00'); d.setDate(d.getDate()+1);
  return dateKey(d) === b;
}
/* 依「最早 clockSlots 格」把 work 切成打卡段與獎金段 */
function clipWork(work, clockSlots){
  let rem = clockSlots; const clock=[], bonus=[];
  normalize(work).forEach(seg=>{
    const len = seg[1]-seg[0];
    if(rem<=0){ bonus.push([seg[0],seg[1]]); return; }
    if(len<=rem){ clock.push([seg[0],seg[1]]); rem-=len; }
    else { clock.push([seg[0], seg[0]+rem]); bonus.push([seg[0]+rem, seg[1]]); rem=0; }
  });
  return { clock, bonus };
}
let _splitCache = {};
function clearSplitCache(){ _splitCache = {}; }
/* 某人所有排班日的拆分：date -> {work, clock, bonus, reasons}（分鐘） */
function computeSplit(personId){
  if(_splitCache[personId]) return _splitCache[personId];
  const p = findPerson(personId);
  const student = !!(p && p.foreignStudent);
  const dates = [];
  for(const dt in state.schedule){ const v = state.schedule[dt][personId]; if(v && v.work && v.work.length) dates.push(dt); }
  dates.sort();
  const res = {}; let prev=null, consec=0; const weekClock={};
  dates.forEach(date=>{
    const wmin = workMinutesOfDay(date, personId);
    if(prev && isNextDay(prev, date)) consec++; else consec = 1;
    prev = date;
    let clockMin = 0, bonusMin = 0; const reasons = [];
    if(consec > MAX_CONSEC){ bonusMin = wmin; clockMin = 0; reasons.push('consec'); }
    else { clockMin = Math.min(wmin, MAX_DAY_MIN); if(wmin > MAX_DAY_MIN){ bonusMin += wmin - MAX_DAY_MIN; reasons.push('day8'); } }
    if(student && clockMin > 0){
      const wk = weekKeyOf(date); const used = weekClock[wk] || 0;
      if(used + clockMin > MAX_WEEK_STUDENT_MIN){
        const allow = Math.max(0, MAX_WEEK_STUDENT_MIN - used);
        const moved = clockMin - allow;
        if(moved > 0){ bonusMin += moved; clockMin = allow; reasons.push('week20'); }
      }
      weekClock[wk] = (weekClock[wk] || 0) + clockMin;
    }
    res[date] = { work:wmin, clock:clockMin, bonus:bonusMin, reasons };
  });
  _splitCache[personId] = res;
  return res;
}
function reasonText(reasons){ return (reasons||[]).map(r=> t(r==='consec'?'rs_consec':r==='day8'?'rs_day8':'rs_week20')).join(getLang()==='zh'?'、':', '); }
function fmtHrs(min){ return (Math.round(min/60*10)/10).toString(); }

/* ---------- 渲染 ---------- */
function renderTabs(){
  const el = $('#unitTabs'); el.innerHTML = '';
  visibleUnits().forEach(u => {
    const cnt = (state.people[u.id]||[]).length;
    const b = document.createElement('button');
    b.className = 'unit-tab' + (u.id===curUnit?' active':'');
    b.style.setProperty('--ut', UNIT_COLOR[u.id] || '#007aff');
    b.innerHTML = `${unitName(u.id)}<span class="cnt">${cnt}</span>`;
    b.onclick = () => { curUnit = u.id; activeTpl = null; save(); renderAll(); };
    el.appendChild(b);
  });
}

function unitTemplates(uid){ return state.templates.filter(t => t.unitId === uid); }

function renderTemplates(){
  const wrap = $('#tplChips'); wrap.innerHTML = '';
  unitTemplates(curUnit).forEach(t => {
    const c = document.createElement('button');
    c.className = 'tpl-chip' + (t.id===activeTpl?' active':'');
    c.textContent = `${tplLabel(t.name)} ${t.start}–${t.end}`;
    c.onclick = () => { activeTpl = (activeTpl===t.id? null : t.id); renderTemplates(); renderGrid(); updateBrushHint(); };
    wrap.appendChild(c);
  });
  $('#applyAll').disabled = !activeTpl;
}
function updateBrushHint(){
  const h = $('#brushHint');
  if(activeTpl){
    const tp = state.templates.find(x=>x.id===activeTpl);
    h.hidden = false;
    h.textContent = t('brush_hint', { name:tplLabel(tp.name), start:tp.start, end:tp.end });
  } else h.hidden = true;
}

/* ---------- 覆蓋 / 最低人力 ---------- */
function slotHeadcount(unitId, date){
  const cnt = new Array(SLOTS).fill(0);
  (state.people[unitId]||[]).forEach(p=>{
    normalize(getDay(date, p.id).work).forEach(seg=>{ for(let s=seg[0]; s<seg[1]; s++) cnt[s]++; });
  });
  return cnt;
}
function minStaff(unitId){ try{ return Math.max(0, parseInt(localStorage.getItem('ss.min.'+unitId)||'1',10)||0); }catch(e){ return 1; } }
function buildCoverageRow(unitId, date){
  const cnt = slotHeadcount(unitId, date);
  const min = minStaff(unitId);
  let lo=-1, hi=-1; for(let s=0;s<SLOTS;s++){ if(cnt[s]>0){ if(lo<0)lo=s; hi=s; } }
  const row=document.createElement('div'); row.className='row cov-row';
  const name=document.createElement('div'); name.className='name-cell';
  const who=document.createElement('div'); who.className='who'; who.innerHTML=`<div class="emp">${esc(t('cov_row'))}</div><div class="nm" style="font-size:12px">${esc(t('cov_min'))}</div>`;
  const inp=document.createElement('input'); inp.type='number'; inp.min='0'; inp.value=min; inp.className='cov-min-inp';
  inp.onchange=()=>{ try{ localStorage.setItem('ss.min.'+unitId, String(Math.max(0,parseInt(inp.value||'0',10)||0))); }catch(e){} renderGrid(); };
  name.appendChild(who); name.appendChild(inp);
  const track=document.createElement('div'); track.className='track cov-track';
  for(let s=0;s<SLOTS;s++){
    const c=document.createElement('div'); c.className='cov-cell';
    const inWin = lo>=0 && s>=lo && s<=hi;
    if(cnt[s]>0){ c.textContent=cnt[s]; c.classList.add(cnt[s]<min?'cov-low':'cov-ok'); }
    else if(inWin){ c.classList.add('cov-gap'); }
    track.appendChild(c);
  }
  row.appendChild(name); row.appendChild(track);
  return row;
}

function renderGrid(){
  clearSplitCache();
  $('#weekday').textContent = weekdayCh(curDate);
  $('#datePick').value = curDate;
  const vis = visibleUnits();
  if(vis.length && !vis.some(u=>u.id===curUnit)) curUnit = vis[0].id;
  const grid = $('#grid'); grid.innerHTML = '';
  if(!vis.length){ grid.innerHTML = '<div class="empty">'+esc(t('no_units'))+'</div>'; return; }

  const head = document.createElement('div'); head.className = 'time-header';
  const sp = document.createElement('div'); sp.className = 'th-spacer';
  const hrs = document.createElement('div'); hrs.className = 'th-hours';
  for(let h=0; h<24; h++){ const d=document.createElement('div'); d.className='th-hour'; d.textContent=pad(h); hrs.appendChild(d); }
  head.appendChild(sp); head.appendChild(hrs); grid.appendChild(head);

  const ppl = state.people[curUnit] || [];
  if(ppl.length===0){
    const e = document.createElement('div'); e.className='empty'; e.textContent=t('empty_no_people');
    grid.appendChild(e);
  }
  ppl.forEach(p => grid.appendChild(personRow(p)));
  if(ppl.length) grid.appendChild(buildCoverageRow(curUnit, curDate));

  const ar = document.createElement('div'); ar.className='row add-row';
  const nc = document.createElement('div'); nc.className='name-cell'; nc.textContent=t('add_person');
  nc.onclick = () => openPersonModal();
  const tk = document.createElement('div'); tk.className='track';
  ar.appendChild(nc); ar.appendChild(tk); grid.appendChild(ar);

  // 目前時間指示線（僅在檢視「今天」時）
  if(ppl.length && curDate === todayKey()){
    const now = new Date(); const mins = now.getHours()*60 + now.getMinutes();
    const nl = document.createElement('div'); nl.className='now-line';
    nl.style.left = 'calc(var(--name-w) + 1px + ' + (mins * (slotPx()/30)) + 'px)';
    nl.innerHTML = '<span class="now-dot"></span>';
    grid.appendChild(nl);
  }
}

function personRow(p){
  const day = getDay(curDate, p.id);
  const row = document.createElement('div'); row.className='row'; row.dataset.person=p.id;

  const name = document.createElement('div'); name.className='name-cell';
  const applyBtn = document.createElement('button');
  applyBtn.className='mini apply'; applyBtn.textContent='⤵'; applyBtn.title=t('title_apply_tpl');
  applyBtn.disabled = !activeTpl;
  applyBtn.onclick = (e)=>{ e.stopPropagation(); applyTemplateTo(curDate, p.id); };
  const who = document.createElement('div'); who.className='who';
  who.innerHTML = `<div class="emp">${esc(p.empNo)}</div><div class="nm">${esc(p.name)}</div>`;
  who.style.cursor='pointer'; who.title=t('title_edit_person');
  who.onclick = ()=> openMonthView(p.id);
  const mvBtn = document.createElement('button');
  mvBtn.className='mini mv-mini'; mvBtn.textContent=t('month_btn'); mvBtn.title=t('title_month');
  mvBtn.onclick = (e)=>{ e.stopPropagation(); openMonthView(p.id); };
  const leaveBtn = document.createElement('button');
  leaveBtn.className='mini'+(isFullOff(day)?' on':''); leaveBtn.textContent=t('off_short'); leaveBtn.title=t('title_full_leave');
  leaveBtn.onclick = (e)=>{ e.stopPropagation(); toggleLeave(curDate, p.id); };
  name.appendChild(applyBtn); name.appendChild(who); name.appendChild(mvBtn); name.appendChild(leaveBtn);

  row.appendChild(name); row.appendChild(buildTrack(curDate, p.id));
  return row;
}

/* 依 (日期, 人員) 建立時間軌與區塊，日檢視與月檢視共用 */
function buildTrack(date, personId){
  const day = getDay(date, personId);
  const track = document.createElement('div'); track.className='track';
  track.dataset.person = personId; track.dataset.date = date;
  day.off.forEach((seg, idx) => track.appendChild(segEl(date, personId, 'off', idx, seg)));
  day.work.forEach((seg, idx) => track.appendChild(segEl(date, personId, 'work', idx, seg)));
  // 超出法定範圍的工時 → 紅色標示（純提醒、不影響操作）
  const info = computeSplit(personId)[date];
  if(info && info.bonus > 0){
    clipWork(day.work, info.clock/30).bonus.forEach(seg=>{
      const o = document.createElement('div'); o.className='over'; positionSeg(o, seg);
      o.title = t('bh_bonus') + '：' + reasonText(info.reasons);
      track.appendChild(o);
    });
  }
  track.addEventListener('pointerdown', (ev)=> startPaint(ev, date, personId, track));
  return track;
}

function segEl(date, personId, type, idx, seg){
  const el = document.createElement('div'); el.className = 'seg' + (type==='off' ? ' off' : '');
  if(type==='work') el.style.background = UNIT_COLOR[curUnit] || '#2f6fed';
  positionSeg(el, seg);
  const full = seg[0] <= 0 && seg[1] >= SLOTS;
  const lbl = type==='off'
    ? (full ? t('full_off_label') : t('off_prefix')+' '+slotToTime(seg[0])+'–'+slotToTime(seg[1]))
    : slotToTime(seg[0])+'–'+slotToTime(seg[1]);
  el.innerHTML = `<span class="lbl">${lbl}</span><span class="hd l"></span><span class="hd r"></span>`;
  el.querySelector('.hd.l').addEventListener('pointerdown', e=> startResize(e, date, personId, type, idx, 'l'));
  el.querySelector('.hd.r').addEventListener('pointerdown', e=> startResize(e, date, personId, type, idx, 'r'));
  el.addEventListener('pointerdown', e=> startMove(e, date, personId, type, idx, el));
  return el;
}
function positionSeg(el, seg){
  const w = slotPx();
  el.style.left = (seg[0]*w)+'px';
  el.style.width = ((seg[1]-seg[0])*w)+'px';
}
function slotPx(){ return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot')); }

function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------- 拖拉 ---------- */
let drag = null;
function slotFromEvent(track, ev){
  const r = track.getBoundingClientRect();
  return clamp(Math.floor((ev.clientX - r.left)/slotPx()), 0, SLOTS-1);
}
function startPaint(ev, date, personId, track){
  if(ev.target.classList.contains('seg') || ev.target.classList.contains('hd')) return;
  ev.preventDefault();
  const s = slotFromEvent(track, ev);
  const temp = document.createElement('div'); temp.className='seg temp'+(brushType==='off'?' off':'');
  if(brushType==='work') temp.style.background = UNIT_COLOR[curUnit]||'#2f6fed';
  temp.innerHTML = '<span class="lbl"></span>';
  track.appendChild(temp);
  drag = { mode:'create', type:brushType, date, personId, track, anchor:s, cur:s, el:temp, moved:false };
  paintUpdate();
  bindDrag();
}
function paintUpdate(){
  const a = Math.min(drag.anchor, drag.cur), b = Math.max(drag.anchor, drag.cur)+1;
  positionSeg(drag.el, [a,b]);
  drag.el.querySelector('.lbl').textContent = (drag.type==='off'?t('off_prefix')+' ':'')+slotToTime(a)+'–'+slotToTime(b);
}
function startMove(ev, date, personId, type, idx, el){
  if(ev.target.classList.contains('hd')) return;
  ev.preventDefault(); ev.stopPropagation();
  const seg = getDay(date, personId)[type][idx];
  drag = { mode:'move', type, date, personId, idx, el, track:el.parentElement,
           startX:ev.clientX, orig:[seg[0],seg[1]], moved:false };
  el.style.cursor='grabbing';
  bindDrag();
}
function startResize(ev, date, personId, type, idx, side){
  ev.preventDefault(); ev.stopPropagation();
  const track = ev.target.closest('.track');
  const el = ev.target.closest('.seg');
  const seg = getDay(date, personId)[type][idx];
  drag = { mode:'resize', side, type, date, personId, idx, el, track, orig:[seg[0],seg[1]], moved:false };
  bindDrag();
}
function bindDrag(){
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragUp, { once:true });
}
function onDragMove(ev){
  if(!drag) return;
  drag.moved = true;
  if(drag.mode==='create'){
    drag.cur = slotFromEvent(drag.track, ev);
    paintUpdate();
  } else if(drag.mode==='move'){
    const dx = Math.round((ev.clientX - drag.startX)/slotPx());
    const len = drag.orig[1]-drag.orig[0];
    let s = clamp(drag.orig[0]+dx, 0, SLOTS-len);
    positionSeg(drag.el, [s, s+len]);
    drag.el.querySelector('.lbl').textContent = (drag.type==='off'?t('off_prefix')+' ':'')+slotToTime(s)+'–'+slotToTime(s+len);
    drag._new = [s, s+len];
  } else if(drag.mode==='resize'){
    const cur = slotFromEvent(drag.track, ev);
    let s = drag.orig[0], e = drag.orig[1];
    if(drag.side==='l') s = clamp(cur, 0, e-1);
    else e = clamp(cur+1, s+1, SLOTS);
    positionSeg(drag.el, [s,e]);
    drag.el.querySelector('.lbl').textContent = (drag.type==='off'?t('off_prefix')+' ':'')+slotToTime(s)+'–'+slotToTime(e);
    drag._new = [s,e];
  }
}
function onDragUp(ev){
  window.removeEventListener('pointermove', onDragMove);
  if(!drag){ return; }
  const d = drag; drag = null;
  const other = d.type==='work' ? 'off' : 'work';

  if(d.mode==='create'){
    const a = Math.min(d.anchor, d.cur), b = Math.max(d.anchor, d.cur)+1;
    const day = cloneDay(getDay(d.date, d.personId));
    day[d.type] = normalize([...day[d.type], [a,b]]);
    day[other] = subtractRange(day[other], [a,b]);
    setDay(d.date, d.personId, day);
    refreshView();
  } else if(d.mode==='move' || d.mode==='resize'){
    if(!d.moved){ openSegModal(d.date, d.personId, d.type, d.idx); refreshView(); return; }
    const day = cloneDay(getDay(d.date, d.personId));
    const r = d._new || day[d.type][d.idx];
    day[d.type][d.idx] = r;
    day[d.type] = normalize(day[d.type]);
    day[other] = subtractRange(day[other], r);
    setDay(d.date, d.personId, day);
    refreshView();
  }
}

/* ---------- 整日休假切換 ---------- */
function toggleLeave(date, personId){
  const day = getDay(date, personId);
  if(isFullOff(day)){
    setDay(date, personId, { work: day.work, off: day.off.filter(o=>!(o[0]<=0 && o[1]>=SLOTS)) });
  } else {
    setDay(date, personId, { work: [], off: [[0, SLOTS]] });
  }
  refreshView();
}

/* ---------- 範本套用 ---------- */
/* 範本 → 上班區塊（含休息則拆成兩段）與整體區間 */
function templateSegs(tp){
  const s = timeToSlot(tp.start), e = timeToSlot(tp.end);
  if(tp.bs && tp.be){ const bs = timeToSlot(tp.bs), be = timeToSlot(tp.be); if(s < bs && bs < be && be < e) return [[s,bs],[be,e]]; }
  return [[s,e]];
}
function templateSpan(tp){ return [timeToSlot(tp.start), timeToSlot(tp.end)]; }

function applyTemplateTo(date, personId){
  if(!activeTpl) return;
  const tp = state.templates.find(x=>x.id===activeTpl);
  const day = getDay(date, personId);
  setDay(date, personId, { work: templateSegs(tp), off: subtractRange(day.off, templateSpan(tp)) });
  refreshView();
}
function applyTemplateAll(){
  if(!activeTpl) return;
  const tp = state.templates.find(x=>x.id===activeTpl);
  (state.people[curUnit]||[]).forEach(p => {
    const day = getDay(curDate, p.id);
    if(isFullOff(day)) return;                 // 整日休假者略過
    setDay(curDate, p.id, { work: templateSegs(tp), off: subtractRange(day.off, templateSpan(tp)) });
  });
  renderGrid();
}

/* ---------- 整月模式（單一人員） ---------- */
let monthOpen = false;
let monthCtx = null;   // { personId, y, m }

function refreshView(){ if(monthOpen) renderMonth(); else renderGrid(); }

function openMonthView(personId){
  const d = new Date(curDate + 'T00:00:00');
  monthCtx = { personId, y:d.getFullYear(), m:d.getMonth() };
  monthOpen = true;
  $('#monthView').hidden = false;
  renderMonth();
}
function closeMonthView(){ monthOpen = false; $('#monthView').hidden = true; renderGrid(); }
function monthNav(n){
  let m = monthCtx.m + n, y = monthCtx.y;
  if(m < 0){ m = 11; y--; } if(m > 11){ m = 0; y++; }
  monthCtx.m = m; monthCtx.y = y; renderMonth();
}
function monthDates(){
  const days = new Date(monthCtx.y, monthCtx.m + 1, 0).getDate();
  const out = [];
  for(let dd = 1; dd <= days; dd++) out.push(`${monthCtx.y}-${pad(monthCtx.m+1)}-${pad(dd)}`);
  return out;
}

function renderMonth(){
  clearSplitCache();
  const p = findPerson(monthCtx.personId);
  if(!p){ closeMonthView(); return; }
  const unit = UNITS.find(u => u.id === p.unitId) || UNITS.find(u => u.id === curUnit);
  $('#mvTitle').textContent = `${p.name}（${p.empNo}）· ${unitName(unit.id)}`;
  $('#mvMonth').textContent = monthLabel(monthCtx.y, monthCtx.m);
  renderMvTemplates();

  const grid = $('#monthGrid'); grid.innerHTML = '';
  const head = document.createElement('div'); head.className = 'time-header';
  const sp = document.createElement('div'); sp.className = 'th-spacer';
  const hrs = document.createElement('div'); hrs.className = 'th-hours';
  for(let h = 0; h < 24; h++){ const c = document.createElement('div'); c.className = 'th-hour'; c.textContent = pad(h); hrs.appendChild(c); }
  head.appendChild(sp); head.appendChild(hrs); grid.appendChild(head);

  monthDates().forEach(date => {
    const dow = new Date(date + 'T00:00:00').getDay();
    const day = getDay(date, p.id);
    const dd = date.slice(8);
    const row = document.createElement('div'); row.className = 'row' + ((dow===0||dow===6) ? ' wk' : '');
    const dc = document.createElement('div'); dc.className = 'name-cell day-cell';
    const ab = document.createElement('button');
    ab.className = 'mini apply'; ab.textContent = '⤵'; ab.disabled = !activeTpl; ab.title = t('title_apply_day');
    ab.onclick = (e)=>{ e.stopPropagation(); applyTemplateTo(date, p.id); };
    const who = document.createElement('div'); who.className = 'who';
    who.innerHTML = `<div class="nm">${pad(monthCtx.m+1)}/${dd} <span class="dow">(${dowLabel(dow)})</span></div>`;
    const lv = document.createElement('button');
    lv.className = 'mini' + (isFullOff(day) ? ' on' : ''); lv.textContent = t('off_short'); lv.title = t('title_full_leave');
    lv.onclick = (e)=>{ e.stopPropagation(); toggleLeave(date, p.id); };
    dc.appendChild(ab); dc.appendChild(who); dc.appendChild(lv);
    row.appendChild(dc); row.appendChild(buildTrack(date, p.id));
    grid.appendChild(row);
  });
}

function renderMvTemplates(){
  const w = $('#mvTplChips'); w.innerHTML = '';
  const mp = findPerson(monthCtx.personId); const muid = mp ? mp.unitId : curUnit;
  unitTemplates(muid).forEach(t => {
    const c = document.createElement('button');
    c.className = 'tpl-chip' + (t.id===activeTpl ? ' active' : '');
    c.textContent = `${tplLabel(t.name)} ${t.start}–${t.end}`;
    c.onclick = () => { activeTpl = (activeTpl===t.id ? null : t.id); renderMonth(); };
    w.appendChild(c);
  });
  $('#mvApplyEvery').disabled = !activeTpl;
  $('#mvApplyWeekday').disabled = !activeTpl;
}

function applyMonth(scope){          // 'every' | 'weekday'
  if(!activeTpl) return;
  const tp = state.templates.find(x => x.id === activeTpl);
  monthDates().forEach(date => {
    const dow = new Date(date + 'T00:00:00').getDay();
    if(scope === 'weekday' && (dow===0 || dow===6)) return;
    const day = getDay(date, monthCtx.personId);
    if(isFullOff(day)) return;      // 整日休假者略過
    setDay(date, monthCtx.personId, { work: templateSegs(tp), off: subtractRange(day.off, templateSpan(tp)) });
  });
  renderMonth();
}
function weekendLeave(){
  monthDates().forEach(date => {
    const dow = new Date(date + 'T00:00:00').getDay();
    if(dow===0 || dow===6) setDay(date, monthCtx.personId, { work:[], off:[[0,SLOTS]] });
  });
  renderMonth();
}
function clearMonth(){
  if(!confirm(t('clear_month_confirm'))) return;
  monthDates().forEach(date => setDay(date, monthCtx.personId, { work:[], off:[] }));
  renderMonth();
}

/* ---------- 筆刷切換 ---------- */
function setBrush(t){
  brushType = t;
  $$('.brush-btn').forEach(b => b.classList.toggle('active', b.dataset.brush===t));
}

/* ---------- 人員 CRUD ---------- */
let editingPerson = null;
function openPersonModal(p){
  editingPerson = p || null;
  $('#personModalTitle').textContent = p ? t('pm_edit') : t('pm_add');
  $('#pmEmpNo').value = p ? p.empNo : '';
  $('#pmName').value = p ? p.name : '';
  $('#pmForeign').checked = !!(p && p.foreignStudent);
  $('#pmErr').hidden = true;
  let delBtn = $('#pmDelete');
  if(p){
    if(!delBtn){
      delBtn = document.createElement('button');
      delBtn.id='pmDelete'; delBtn.className='btn danger'; delBtn.textContent=t('delete_person');
      $('#personModal .modal-actions').prepend(delBtn);
    }
    delBtn.hidden=false; delBtn.textContent=t('delete_person');
    delBtn.onclick = ()=>{
      if(confirm(t('pm_confirm_del', { name:p.name }))){
        if(window.SB){
          window.SB.deletePerson(p.id);
          Object.keys(state.schedule).forEach(dt=>{ if(state.schedule[dt][p.id]) window.SB.deleteShift(dt, p.id); });
        }
        state.people[curUnit] = state.people[curUnit].filter(x=>x.id!==p.id);
        Object.values(state.schedule).forEach(d=> delete d[p.id]);
        save(); closeModal('#personModal');
        if(monthOpen) closeMonthView(); else renderAll();
      }
    };
  } else if(delBtn){ delBtn.hidden=true; }
  showModal('#personModal');
  $('#pmName').focus();
}
$('#pmSave').onclick = ()=>{
  const empNo = $('#pmEmpNo').value.trim();
  const name = $('#pmName').value.trim();
  if(!empNo || !name){ showErr('#pmErr', t('pm_err_required')); return; }
  const dup = (state.people[curUnit]||[]).some(x => x.empNo===empNo && x!==editingPerson);
  if(dup){ showErr('#pmErr', t('pm_err_dup')); return; }
  const foreign = $('#pmForeign').checked;
  if(editingPerson){ editingPerson.empNo=empNo; editingPerson.name=name; editingPerson.foreignStudent=foreign; if(window.SB) window.SB.writePerson(editingPerson); }
  else { const np={ id:pid(), unitId:curUnit, empNo, name, foreignStudent:foreign }; state.people[curUnit].push(np); if(window.SB) window.SB.writePerson(np); }
  save(); closeModal('#personModal'); renderAll(); if(monthOpen) renderMonth();
};

/* ---------- 區塊編輯 modal ---------- */
let segCtx = null;
function fillTimeSelect(sel){
  sel.innerHTML='';
  for(let i=0;i<=SLOTS;i++){ const o=document.createElement('option'); o.value=i; o.textContent=slotToTime(i); sel.appendChild(o); }
}
function openSegModal(date, personId, type, idx){
  const seg = getDay(date, personId)[type][idx];
  segCtx = { date, personId, type, idx };
  $('#segType').value = type; $('#segStart').value = seg[0]; $('#segEnd').value = seg[1]; $('#segErr').hidden=true;
  showModal('#segModal');
}
$('#segSave').onclick = ()=>{
  const s = +$('#segStart').value, e = +$('#segEnd').value, newType = $('#segType').value;
  if(e<=s){ showErr('#segErr', t('seg_err')); return; }
  const day = cloneDay(getDay(segCtx.date, segCtx.personId));
  day[segCtx.type].splice(segCtx.idx, 1);                 // 從原清單移除
  day[newType] = normalize([...day[newType], [s,e]]);     // 加入新類型
  const other = newType==='work' ? 'off' : 'work';
  day[other] = subtractRange(day[other], [s,e]);          // 另一類型挖掉重疊
  setDay(segCtx.date, segCtx.personId, day);
  closeModal('#segModal'); refreshView();
};
$('#segDelete').onclick = ()=>{
  const day = cloneDay(getDay(segCtx.date, segCtx.personId));
  day[segCtx.type].splice(segCtx.idx, 1);
  setDay(segCtx.date, segCtx.personId, day);
  closeModal('#segModal'); refreshView();
};

/* ---------- 範本管理 ---------- */
function renderTplModal(){
  const list = $('#tplList'); list.innerHTML='';
  unitTemplates(curUnit).forEach(t=>{
    const it=document.createElement('div'); it.className='tpl-item';
    it.innerHTML=`<span class="nm">${esc(tplLabel(t.name))}</span><span class="tm">${t.start}–${t.end}${t.bs?(' · '+esc(window.t('tpl_break'))+' '+t.bs+'–'+t.be):''}</span>`;
    const rm=document.createElement('button'); rm.className='rm'; rm.textContent=window.t('delete');
    rm.onclick=()=>{ if(window.SB) window.SB.deleteTemplate(t.id); state.templates=state.templates.filter(x=>x.id!==t.id); if(activeTpl===t.id)activeTpl=null; save(); renderTplModal(); renderTemplates(); updateBrushHint(); };
    it.appendChild(rm); list.appendChild(it);
  });
}
$('#tplAdd').onclick = ()=>{
  const name = $('#tplName').value.trim();
  const s = +$('#tplStart').value, e = +$('#tplEnd').value;
  if(!name){ alert(t('tpl_err_name')); return; }
  if(e<=s){ alert(t('tpl_err_time')); return; }
  const bsv = $('#tplBs').value, bev = $('#tplBe').value;
  let bs='', be='';
  if(bsv!=='' && bev!==''){ const bsn=+bsv, ben=+bev; if(bsn>s && ben>bsn && ben<e){ bs=slotToTime(bsn); be=slotToTime(ben); } else { alert(t('tpl_err_time')); return; } }
  const nt = { id:pid(), unitId:curUnit, name, start:slotToTime(s), end:slotToTime(e), bs, be };
  state.templates.push(nt); if(window.SB) window.SB.writeTemplate(nt);
  $('#tplName').value=''; $('#tplBs').value=''; $('#tplBe').value='';
  save(); renderTplModal(); renderTemplates();
};

/* ---------- 複製某日 ---------- */
$('#copyGo').onclick = ()=>{
  const src = $('#copySrc').value;
  if(!src){ showErr('#copyErr', t('copy_err_src')); return; }
  if(src===curDate){ showErr('#copyErr', t('copy_err_same')); return; }
  const units = $('#copyAllUnits').checked ? visibleUnits().map(u=>u.id) : [curUnit];
  units.forEach(uid=>{
    (state.people[uid]||[]).forEach(p=>{
      setDay(curDate, p.id, cloneDay(getDay(src, p.id)));
    });
  });
  closeModal('#copyModal'); renderAll();
};

/* ---------- 清空當日 ---------- */
$('#clearDay').onclick = ()=>{
  if(!confirm(t('clear_confirm', { unit:unitName(curUnit), date:curDate }))) return;
  (state.people[curUnit]||[]).forEach(p=> setDay(curDate, p.id, { work:[], off:[] }));
  renderGrid();
};

/* ---------- 匯出 ---------- */
function buildRows(from, to, unitIds){
  clearSplitCache();
  const rows = [];
  const warns = [];
  let d = new Date(from+'T00:00:00'); const end = new Date(to+'T00:00:00');
  while(d <= end){
    const key = dateKey(d);
    unitIds.forEach(uid=>{
      (state.people[uid]||[]).forEach(p=>{
        const day = getDay(key, p.id);
        if(isFullOff(day)){
          rows.push([p.empNo, p.name, apolloDate(key), STATUS_LEAVE, '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
          return;
        }
        const info = computeSplit(p.id)[key];
        if(!info || info.clock <= 0) return;                     // 無打卡時數（整天進獎金）→ 不輸出
        const work = clipWork(day.work, info.clock/30).clock;    // 只取合法可打卡的部分
        if(!work.length) return;
        const on = slotToTime(work[0][0]);
        const off = slotToTime(work[work.length-1][1]);
        const breaks = [];
        for(let i=0;i<work.length-1;i++) breaks.push(slotToTime(work[i][1])+'~'+slotToTime(work[i+1][0]));
        if(breaks.length>3) warns.push(t('exp_warn_break', { name:p.name, date:apolloDate(key) }));
        rows.push([p.empNo, p.name, apolloDate(key), STATUS_WORK, SHIFT_CODE, on, off, breaks.slice(0,3).join(','), '', '', '', '', '', '', '', '', '', '']);
      });
    });
    d.setDate(d.getDate()+1);
  }
  return { rows, warns };
}

/* 獎金時數：明細 + 每人總計 */
function buildBonusData(from, to, unitIds){
  clearSplitCache();
  const detail = []; const totals = {};
  let d = new Date(from+'T00:00:00'); const end = new Date(to+'T00:00:00');
  while(d <= end){
    const key = dateKey(d); const dow = new Date(key+'T00:00:00').getDay();
    unitIds.forEach(uid=>{
      (state.people[uid]||[]).forEach(p=>{
        const info = computeSplit(p.id)[key];
        if(!info || info.bonus <= 0) return;
        detail.push([unitName(uid), p.empNo, p.name, apolloDate(key), dowLabel(dow), fmtHrs(info.work), fmtHrs(info.clock), fmtHrs(info.bonus), reasonText(info.reasons)]);
        if(!totals[p.id]) totals[p.id] = { unit:unitName(uid), emp:p.empNo, name:p.name, min:0 };
        totals[p.id].min += info.bonus;
      });
    });
    d.setDate(d.getDate()+1);
  }
  return { detail, totals: Object.values(totals) };
}
$('#expGo').onclick = ()=>{
  const from = $('#expFrom').value, to = $('#expTo').value;
  if(!from || !to){ showErr('#expErr', t('exp_err_dates')); return; }
  if(to < from){ showErr('#expErr', t('exp_err_order')); return; }
  const unitIds = $('#expAllUnits').checked ? visibleUnits().map(u=>u.id) : [curUnit];
  const { rows, warns } = buildRows(from, to, unitIds);
  if(rows.length===0){ showErr('#expErr', t('exp_err_empty')); return; }
  if(typeof XLSX === 'undefined'){ showErr('#expErr', t('xlsx_missing')); return; }
  const ws = XLSX.utils.aoa_to_sheet([APOLLO_HEADER, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '匯入檔');
  const fname = `班表匯入_${from.replace(/-/g,'')}_${to.replace(/-/g,'')}.xlsx`;
  XLSX.writeFile(wb, fname);
  closeModal('#exportModal');
  if(warns.length) alert(t('exp_done_warn') + '\n' + warns.join('\n'));
};

/* ---------- modal 基礎 ---------- */
function showModal(sel){ $(sel).hidden=false; }
function closeModal(sel){ $(sel).hidden=true; }
function showErr(sel, msg){ const e=$(sel); e.textContent=msg; e.hidden=false; }
$$('[data-close]').forEach(b=> b.onclick = ()=> b.closest('.modal-mask').hidden=true);
$$('.modal-mask').forEach(m=> m.addEventListener('pointerdown', e=>{ if(e.target===m) m.hidden=true; }));

/* ---------- 事件綁定 ---------- */
$('#prevDay').onclick = ()=> shiftDate(-1);
$('#nextDay').onclick = ()=> shiftDate(1);
$('#todayBtn').onclick = ()=>{ curDate=todayKey(); save(); renderGrid(); };
$('#datePick').onchange = (e)=>{ curDate=e.target.value; save(); renderGrid(); };
function shiftDate(n){ const d=new Date(curDate+'T00:00:00'); d.setDate(d.getDate()+n); curDate=dateKey(d); save(); renderGrid(); }

$('#addPerson').onclick = ()=> openPersonModal();
$('#applyAll').onclick = applyTemplateAll;
$('#manageTpl').onclick = ()=>{ renderTplModal(); showModal('#tplModal'); };
$('#copyDay').onclick = ()=>{ $('#copySrc').value=''; $('#copyErr').hidden=true; showModal('#copyModal'); };
$('#exportBtn').onclick = ()=>{ $('#expFrom').value=curDate; $('#expTo').value=curDate; $('#expErr').hidden=true; showModal('#exportModal'); };

$('#bonusBtn').onclick = ()=>{ if(!isAdmin) return; $('#bonusFrom').value=curDate; $('#bonusTo').value=curDate; $('#bonusErr').hidden=true; showModal('#bonusModal'); };
$('#bonusGo').onclick = ()=>{
  if(!isAdmin) return;
  const from = $('#bonusFrom').value, to = $('#bonusTo').value;
  if(!from || !to){ showErr('#bonusErr', t('exp_err_dates')); return; }
  if(to < from){ showErr('#bonusErr', t('exp_err_order')); return; }
  const unitIds = $('#bonusAllUnits').checked ? visibleUnits().map(u=>u.id) : [curUnit];
  const { detail, totals } = buildBonusData(from, to, unitIds);
  if(!detail.length){ showErr('#bonusErr', t('bonus_none')); return; }
  if(typeof XLSX === 'undefined'){ showErr('#bonusErr', t('xlsx_missing')); return; }
  const h1 = [t('bh_unit'),t('bh_emp'),t('bh_name'),t('bh_date'),t('bh_weekday'),t('bh_actual'),t('bh_clock'),t('bh_bonus'),t('bh_reason')];
  const ws1 = XLSX.utils.aoa_to_sheet([h1, ...detail]);
  const h2 = [t('bh_unit'),t('bh_emp'),t('bh_name'),t('bh_hours')];
  const ws2 = XLSX.utils.aoa_to_sheet([h2, ...totals.map(x=>[x.unit,x.emp,x.name,fmtHrs(x.min)])]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, t('bs_detail'));
  XLSX.utils.book_append_sheet(wb, ws2, t('bs_total'));
  XLSX.writeFile(wb, '獎金時數_'+from.replace(/-/g,'')+'_'+to.replace(/-/g,'')+'.xlsx');
  closeModal('#bonusModal');
};

$('#mvBack').onclick = closeMonthView;
$('#mvEdit').onclick = ()=>{ const p=(state.people[curUnit]||[]).find(x=>x.id===monthCtx.personId); if(p) openPersonModal(p); };
$('#mvPrev').onclick = ()=> monthNav(-1);
$('#mvNext').onclick = ()=> monthNav(1);
$('#mvApplyEvery').onclick = ()=> applyMonth('every');
$('#mvApplyWeekday').onclick = ()=> applyMonth('weekday');
$('#mvWeekendLeave').onclick = weekendLeave;
$('#mvClear').onclick = clearMonth;

$$('.brush-btn').forEach(b => b.onclick = ()=> setBrush(b.dataset.brush));

/* ---------- 打卡比對 ---------- */
let compareOpen = false;
let lastPunches = [];
let lastCompareShown = [];

function minToHHMM(m){ return pad(Math.floor(m/60)) + ':' + pad(m%60); }
function punchDate(v){
  if(v==null || v==='') return '';
  if(typeof v==='number'){ const dt=new Date(Math.round((v-25569)*86400000)); return dateKey(new Date(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate())); }
  const p = String(v).trim().split(/[\/\-\.]/);
  if(p.length>=3) return p[0]+'-'+pad(+p[1])+'-'+pad(+p[2]);
  return String(v).trim();
}
function punchMin(v){
  if(v==null || v==='') return null;
  if(typeof v==='number'){ if(v<2) return Math.round(v*1440); }
  const m = String(v).match(/(\d{1,2}):(\d{2})/);
  return m ? (+m[1]*60 + +m[2]) : null;
}

$('#compareBtn').onclick = ()=> $('#punchFile').click();
$('#punchFile').onchange = (e)=>{
  const f = e.target.files[0]; if(!f) return;
  if(typeof XLSX==='undefined'){ alert(t('xlsx_missing')); return; }
  const rd = new FileReader();
  rd.onload = ev => {
    try{ parsePunch(XLSX.read(new Uint8Array(ev.target.result), {type:'array'})); }
    catch(err){ alert(t('xlsx_read_fail')+err.message); }
  };
  rd.readAsArrayBuffer(f);
  e.target.value = '';
};

function parsePunch(wb){
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
  if(!aoa.length){ alert(t('punch_empty')); return; }
  const head = aoa[0].map(x => String(x).trim());
  const col = names => { for(let i=0;i<head.length;i++){ if(names.some(n=>head[i].includes(n))) return i; } return -1; };
  const ci = { emp:col(['工號','員工編號','工號']), name:col(['姓名']), unit:col(['單位','部門']),
               date:col(['日期']), on:col(['上班時間','上班','簽到','進']), off:col(['下班時間','下班','簽退','出']) };
  if(ci.emp<0 || ci.date<0){ alert(t('punch_nocol')); return; }
  lastPunches = [];
  for(let i=1;i<aoa.length;i++){
    const r = aoa[i]; if(!r) continue;
    const date = punchDate(r[ci.date]); if(!date) continue;
    const emp = String(r[ci.emp]).trim(); if(!emp) continue;
    lastPunches.push({
      emp, date,
      name: ci.name>=0 ? String(r[ci.name]).trim() : '',
      unit: ci.unit>=0 ? String(r[ci.unit]).trim() : '',
      onMin: ci.on>=0 ? punchMin(r[ci.on]) : null,
      offMin: ci.off>=0 ? punchMin(r[ci.off]) : null,
    });
  }
  if(!lastPunches.length){ alert(t('punch_norows')); return; }
  compareOpen = true; $('#compareView').hidden = false; renderCompare();
}

function computeCompare(grace){
  const byEmp = {};
  UNITS.forEach(u => (state.people[u.id]||[]).forEach(p => byEmp[p.empNo] = { p, unitId:u.id }));
  const punchMap = {}; const dates = new Set();
  lastPunches.forEach(pu => { punchMap[pu.emp+'|'+pu.date] = pu; dates.add(pu.date); });
  const keys = {};
  lastPunches.forEach(pu => keys[pu.emp+'|'+pu.date] = true);
  dates.forEach(date => {
    for(const emp in byEmp){
      const day = getDay(date, byEmp[emp].p.id);
      if(day.work.length || isFullOff(day)) keys[emp+'|'+date] = true;
    }
  });
  const out = [];
  Object.keys(keys).forEach(k => {
    const i = k.indexOf('|'); const emp = k.slice(0,i); const date = k.slice(i+1);
    const punch = punchMap[k] || null;
    const info = byEmp[emp] || null;
    const day = info ? getDay(date, info.p.id) : { work:[], off:[] };
    const w = normalize(day.work);
    const span = w.length ? { on:w[0][0]*30, off:w[w.length-1][1]*30 } : null;
    const full = isFullOff(day);
    const name = info ? info.p.name : (punch ? punch.name : '');
    const unit = info ? unitName(info.unitId) : (punch ? punch.unit : '');
    let status, cls;

    if(!info){ status=t('st_unknown'); cls='warn'; }
    else if(span){
      if(!punch){ status=t('st_nopunch'); cls='bad'; }
      else{
        const parts = [];
        const late = punch.onMin!=null ? punch.onMin - span.on : null;
        const early = punch.offMin!=null ? span.off - punch.offMin : null;
        if(late!=null){ if(late>grace) parts.push(t('st_late',{n:late})); else if(late < -grace) parts.push(t('st_early_in',{n:-late})); }
        if(early!=null){ if(early>grace) parts.push(t('st_early_out',{n:early})); else if(early < -grace) parts.push(t('st_late_out',{n:-early})); }
        if(!parts.length){ status=t('st_normal'); cls='ok'; }
        else { status=parts.join(getLang()==='zh'?'、':', '); cls = (late>grace || early>grace) ? 'bad' : 'warn'; }
      }
    }
    else if(full){
      if(!punch) return;                       // 純休假、無打卡 → 略過
      status=t('st_leavework'); cls='bad';
    }
    else{
      if(!punch) return;
      status=t('st_unsched'); cls='warn';
    }
    out.push({ date, emp, name, unit,
      sched: span ? (minToHHMM(span.on)+'–'+minToHHMM(span.off)) : (full ? t('st_fulloff') : '—'),
      actual: punch ? ((punch.onMin!=null?minToHHMM(punch.onMin):'—')+'–'+(punch.offMin!=null?minToHHMM(punch.offMin):'—')) : '—',
      status, cls });
  });
  out.sort((a,b)=> a.date===b.date ? (a.emp<b.emp?-1:1) : (a.date<b.date?-1:1));
  return out;
}

function renderCompare(){
  const grace = Math.max(0, +$('#cmpGrace').value || 0);
  const all = computeCompare(grace);
  const shown = $('#cmpOnlyIssues').checked ? all.filter(x=>x.cls!=='ok') : all;
  lastCompareShown = shown;
  const n = c => all.filter(x=>x.cls===c).length;
  $('#cmpSummary').innerHTML = t('cmp_count',{n:all.length}) + '　'
    + `<span class="pill ok">${t('cmp_ok')} ${n('ok')}</span> `
    + `<span class="pill bad">${t('cmp_bad')} ${n('bad')}</span> `
    + `<span class="pill warn">${t('cmp_warn')} ${n('warn')}</span>`;
  const body = shown.map(x =>
    `<tr class="c-${x.cls}"><td>${x.date}</td><td>${esc(x.emp)}</td><td>${esc(x.name)}</td><td>${esc(x.unit)}</td>`
    + `<td>${x.sched}</td><td>${x.actual}</td><td>${esc(x.status)}</td></tr>`).join('');
  $('#cmpTable').innerHTML =
    `<thead><tr><th>${t('th_date')}</th><th>${t('th_emp')}</th><th>${t('th_name')}</th><th>${t('th_unit')}</th><th>${t('th_sched')}</th><th>${t('th_actual')}</th><th>${t('th_verdict')}</th></tr></thead>`
    + '<tbody>' + (body || `<tr><td colspan="7" class="empty">${t('cmp_none')}</td></tr>`) + '</tbody>';
}

$('#cmpBack').onclick = ()=>{ compareOpen=false; $('#compareView').hidden=true; };
$('#cmpGrace').oninput = ()=>{ if(compareOpen) renderCompare(); };
$('#cmpOnlyIssues').onchange = ()=>{ if(compareOpen) renderCompare(); };
$('#cmpExport').onclick = ()=>{
  if(!lastCompareShown.length){ alert(t('cmp_no_export')); return; }
  const header = [t('th_date'),t('th_emp'),t('th_name'),t('th_unit'),t('th_sched'),t('th_actual'),t('th_verdict')];
  const aoa = [header, ...lastCompareShown.map(x=>[x.date,x.emp,x.name,x.unit,x.sched,x.actual,x.status])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '打卡比對');
  XLSX.writeFile(wb, '打卡比對_'+todayKey().replace(/-/g,'')+'.xlsx');
};

/* ---------- 使用者管理（管理員） ---------- */
$('#loginBtn').onclick = ()=>{ if(window.SB) window.SB.signIn(); };
$('#signoutBtn').onclick = ()=>{ if(window.SB) window.SB.signOut(); };
$('#signoutBtn2').onclick = ()=>{ if(window.SB) window.SB.signOut(); };
$('#userMgmtBtn').onclick = ()=>{ renderUserMgmt(); showModal('#userModal'); };

function renderUserMgmt(){
  // 單位勾選清單
  const unitBoxes = UNITS.map(u => `<label class="uchk"><input type="checkbox" value="${u.id}"> ${esc(unitName(u.id))}</label>`).join('');
  $('#umUnits').innerHTML = unitBoxes;
  const list = $('#umList'); list.innerHTML = '';
  usersList.slice().sort((a,b)=> (a.email||'').localeCompare(b.email||'')).forEach(u => {
    const units = u.admin ? t('um_all') : ((u.units||[]).map(id=>unitName(id)).join(getLang()==='zh'?'、':', ') || t('um_none'));
    const it = document.createElement('div'); it.className='tpl-item';
    it.innerHTML = `<span class="nm">${esc(u.email)}</span><span class="tm">${u.admin?t('um_admin_label'):esc(units)}</span>`;
    const rm = document.createElement('button'); rm.className='rm'; rm.textContent=t('um_remove');
    rm.onclick = ()=>{ if(u.email===myEmail){ alert(t('um_no_self')); return; } if(confirm(t('um_confirm_remove',{email:u.email}))){ if(window.SB) window.SB.deleteUser(u.email); } };
    it.appendChild(rm); list.appendChild(it);
  });
}
$('#umAdd').onclick = ()=>{
  const email = $('#umEmail').value.trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ alert(t('um_err_email')); return; }
  const admin = $('#umAdmin').checked;
  const units = $$('#umUnits input:checked').map(i=>i.value);
  if(!admin && !units.length){ alert(t('um_err_units')); return; }
  if(window.SB) window.SB.writeUser(email, { admin, units, name:'' });
  $('#umEmail').value=''; $('#umAdmin').checked=false; $$('#umUnits input').forEach(i=>i.checked=false);
};

/* ---------- 測試資料（管理員） ---------- */
function seedTestData(){
  if(!isAdmin || !window.SB){ return; }
  if(!confirm(t('test_seed_confirm'))) return;
  const names = {
    ID:['Andi','Budi','Citra'], VN:['An Nguyen','Binh Tran','Cuc Le'],
    TH:['Anan','Busaba','Chai'], PH:['Ana Cruz','Ben Reyes','Carlo Diaz'],
    KYC:['王測試','李測試','陳測試']
  };
  const d0 = new Date(curDate+'T00:00:00'); const y=d0.getFullYear(), m=d0.getMonth();
  const days = new Date(y, m+1, 0).getDate();
  const mk = dd => `${y}-${pad(m+1)}-${pad(dd)}`;
  const EARLY = () => [[18,24],[26,36]];   // 09-18 午休12-13 = 8h
  let count = 0;
  UNIT_IDS.forEach(uid => {
    (names[uid]||[]).forEach((nm, i) => {
      const id = pid(); const foreign = (i===2);
      window.SB.writePerson({ id, unitId:uid, empNo:'TEST'+uid+(i+1), name:nm, foreignStudent:foreign });
      count++;
      for(let dd=1; dd<=days; dd++){
        const dow = new Date(mk(dd)+'T00:00:00').getDay();
        if(dow>=1 && dow<=5) window.SB.writeShift(mk(dd), id, uid, { work:EARLY(), off:[] });
      }
      if(uid==='ID' && i===0){                         // Andi：一天加班10h、一天整日休假
        window.SB.writeShift(mk(Math.min(8,days)),  id, uid, { work:[[16,36]], off:[] });   // 08-18=10h
        window.SB.writeShift(mk(Math.min(15,days)), id, uid, { work:[], off:[[0,48]] });    // 整日休假
      }
      if(uid==='ID' && i===1){                         // Budi：連續 7 天
        for(let dd=6; dd<=Math.min(12,days); dd++) window.SB.writeShift(mk(dd), id, uid, { work:EARLY(), off:[] });
      }
    });
  });
  alert(t('test_seed_done'));
}
function clearTestData(){
  if(!isAdmin || !window.SB){ return; }
  if(!confirm(t('test_clear_confirm'))) return;
  const ids = [];
  UNIT_IDS.forEach(uid => (state.people[uid]||[]).forEach(p => { if(String(p.empNo).indexOf('TEST')===0) ids.push(p.id); }));
  ids.forEach(id => {
    window.SB.deletePerson(id);
    Object.keys(state.schedule).forEach(dt => { if(state.schedule[dt][id]) window.SB.deleteShift(dt, id); });
  });
  alert(t('test_clear_done') + ids.length);
}
$('#seedTestBtn').onclick = seedTestData;
$('#clearTestBtn').onclick = clearTestData;

/* ---------- 工時統計 ---------- */
let statsOpen = false;
let lastStats = null;
function monthRange(dateStr){
  const d = new Date(dateStr+'T00:00:00'); const y=d.getFullYear(), m=d.getMonth();
  return [ `${y}-${pad(m+1)}-01`, dateKey(new Date(y, m+1, 0)) ];
}
function computeStats(from, to, unitIds){
  clearSplitCache();
  const rows = {};
  unitIds.forEach(uid => (state.people[uid]||[]).forEach(p => { rows[p.id] = { unit:unitName(uid), emp:p.empNo, name:p.name, student:!!p.foreignStudent, workDays:0, actual:0, clock:0, bonus:0, leave:0, vioDays:0, over8:0, consec:0, weeks:{}, _wo:{} }; }));
  let d = new Date(from+'T00:00:00'); const end = new Date(to+'T00:00:00');
  while(d <= end){
    const key = dateKey(d);
    unitIds.forEach(uid => (state.people[uid]||[]).forEach(p => {
      const r = rows[p.id]; const info = computeSplit(p.id)[key];
      if(info && info.work > 0){
        r.workDays++; r.actual+=info.work; r.clock+=info.clock; r.bonus+=info.bonus;
        const wk = weekKeyOf(key); r.weeks[wk] = (r.weeks[wk]||0) + info.work;
        if(info.bonus>0) r.vioDays++;
        if(info.reasons.indexOf('day8')>=0) r.over8++;
        if(info.reasons.indexOf('consec')>=0) r.consec++;
        if(info.reasons.indexOf('week20')>=0) r._wo[wk] = 1;
      } else if(isFullOff(getDay(key, p.id))) r.leave++;
    }));
    d.setDate(d.getDate()+1);
  }
  const arr = Object.values(rows);
  arr.forEach(r => { r.weekOver = Object.keys(r._wo).length; });
  return arr;
}
let _statsChart = null;
let _trendChart = null;
function monthTotals(y, m, unitIds){
  const from=`${y}-${pad(m+1)}-01`, to=dateKey(new Date(y,m+1,0));
  return computeStats(from,to,unitIds).reduce((a,r)=>{ a.actual+=r.actual; a.clock+=r.clock; a.bonus+=r.bonus; return a; }, {actual:0,clock:0,bonus:0});
}
function renderStats(){
  const from = $('#statsFrom').value, to = $('#statsTo').value;
  if(!from || !to) return;
  const unitIds = $('#statsAllUnits').checked ? visibleUnits().map(u=>u.id) : [curUnit];
  const data = computeStats(from, to, unitIds);
  lastStats = { from, to, data };
  const box = $('#statsBody');
  if(_statsChart){ _statsChart.destroy(); _statsChart = null; }
  if(_trendChart){ _trendChart.destroy(); _trendChart = null; }
  if(!data.length){ box.innerHTML = '<div class="empty">'+t('stats_none')+'</div>'; return; }

  const sum = data.reduce((a,r)=>{ a.actual+=r.actual; a.clock+=r.clock; a.bonus+=r.bonus; a.vio+=r.vioDays; a.o8+=r.over8; a.cs+=r.consec; a.wo+=r.weekOver; return a; }, {actual:0,clock:0,bonus:0,vio:0,o8:0,cs:0,wo:0});
  const kpi = (label,val,cls)=> `<div class="kpi ${cls}"><div class="kpi-l">${label}</div><div class="kpi-v">${val}</div></div>`;
  const kpis = '<div class="kpi-row">'
    + kpi(t('dash_people'), data.length, 'k-blue')
    + kpi(t('bh_actual'), fmtHrs(sum.actual), 'k-slate')
    + kpi(t('bh_clock'), fmtHrs(sum.clock), 'k-green')
    + kpi(t('bh_bonus'), fmtHrs(sum.bonus), 'k-amber')
    + kpi(t('dash_vio_days'), sum.vio, 'k-red')
    + '</div>';

  const vio = `<div class="dash-card"><div class="dash-h">${t('dash_vio_title')}</div><div class="vio-row">`
    + `<div class="vio"><span class="vio-n">${sum.o8}</span>${t('vio_over8')} <span class="vio-u">${t('unit_days')}</span></div>`
    + `<div class="vio"><span class="vio-n">${sum.cs}</span>${t('vio_consec')} <span class="vio-u">${t('unit_days')}</span></div>`
    + `<div class="vio"><span class="vio-n">${sum.wo}</span>${t('vio_week')} <span class="vio-u">${t('unit_weeks')}</span></div>`
    + `</div></div>`;

  const chart = `<div class="dash-card"><div class="dash-h">${t('dash_chart')}</div><div class="chart-wrap"><canvas id="statsChart"></canvas></div></div>`;
  const trendCard = `<div class="dash-card"><div class="dash-h">${t('trend_title')}</div><div class="chart-wrap"><canvas id="trendChart"></canvas></div></div>`;

  const heads = [t('bh_unit'),t('bh_emp'),t('bh_name'),t('st_workdays'),t('bh_actual'),t('bh_clock'),t('bh_bonus'),t('st_vio'),t('st_leavedays')];
  const rowsHtml = data.map(r => `<tr><td>${esc(r.unit)}</td><td>${esc(r.emp)}</td><td>${esc(r.name)}${r.student?' <span class="stu">'+esc(t('foreign_student'))+'</span>':''}</td><td>${r.workDays}</td><td>${fmtHrs(r.actual)}</td><td>${fmtHrs(r.clock)}</td><td>${fmtHrs(r.bonus)}</td><td>${r.vioDays?('<b class="over-n">'+r.vioDays+'</b>'):'0'}</td><td>${r.leave}</td></tr>`).join('');
  const table = `<div class="dash-card"><table class="cmp-table"><thead><tr>${heads.map(h=>'<th>'+h+'</th>').join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;

  let stuHtml = '';
  const students = data.filter(r=>r.student);
  if(students.length){
    const weeks = Array.from(new Set([].concat(...students.map(r=>Object.keys(r.weeks))))).sort();
    if(weeks.length){
      const wh = `<th>${t('bh_name')}</th>` + weeks.map(w=>`<th>${w.slice(5)}</th>`).join('');
      const wb = students.map(r=> `<tr><td>${esc(r.name)}</td>` + weeks.map(w=>{ const mins=r.weeks[w]||0; const h=mins/60; return `<td class="${h>20?'wk-over':''}">${mins?fmtHrs(mins):''}</td>`; }).join('') + `</tr>`).join('');
      stuHtml = `<div class="dash-card"><div class="dash-h">${t('dash_student_week')}（${t('st_week')}）</div><table class="cmp-table"><thead><tr>${wh}</tr></thead><tbody>${wb}</tbody></table></div>`;
    }
  }

  box.innerHTML = kpis + vio + chart + trendCard + table + stuHtml;

  if(typeof Chart !== 'undefined'){
    _statsChart = new Chart($('#statsChart'), {
      type:'bar',
      data:{ labels:data.map(r=>r.name), datasets:[
        { label:t('bh_clock'), data:data.map(r=>Math.round(r.clock/60*10)/10), backgroundColor:'#2f6fed' },
        { label:t('bh_bonus'), data:data.map(r=>Math.round(r.bonus/60*10)/10), backgroundColor:'#d64545' }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, scales:{ x:{stacked:true}, y:{stacked:true, beginAtZero:true} }, plugins:{ legend:{position:'top'} } }
    });
    // 跨月趨勢（近6個月）
    const toD=new Date(to+'T00:00:00'); const mos=[];
    for(let k=5;k>=0;k--){ const d=new Date(toD.getFullYear(), toD.getMonth()-k, 1); mos.push({y:d.getFullYear(), m:d.getMonth()}); }
    const tr=mos.map(mm=>monthTotals(mm.y, mm.m, unitIds));
    _trendChart = new Chart($('#trendChart'), {
      type:'line',
      data:{ labels:mos.map(mm=>monthLabel(mm.y,mm.m)), datasets:[
        { label:t('bh_actual'), data:tr.map(x=>Math.round(x.actual/60*10)/10), borderColor:'#64748b', backgroundColor:'#64748b', tension:.3 },
        { label:t('bh_clock'),  data:tr.map(x=>Math.round(x.clock/60*10)/10),  borderColor:'#2f6fed', backgroundColor:'#2f6fed', tension:.3 },
        { label:t('bh_bonus'),  data:tr.map(x=>Math.round(x.bonus/60*10)/10),  borderColor:'#d64545', backgroundColor:'#d64545', tension:.3 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{beginAtZero:true} }, plugins:{ legend:{position:'top'} } }
    });
  }
}
$('#statsBtn').onclick = ()=>{ const r = monthRange(curDate); $('#statsFrom').value=r[0]; $('#statsTo').value=r[1]; statsOpen=true; $('#statsView').hidden=false; renderStats(); };
$('#statsBack').onclick = ()=>{ statsOpen=false; $('#statsView').hidden=true; };
$('#statsFrom').onchange = ()=>{ if(statsOpen) renderStats(); };
$('#statsTo').onchange = ()=>{ if(statsOpen) renderStats(); };
$('#statsAllUnits').onchange = ()=>{ if(statsOpen) renderStats(); };
$('#statsExport').onclick = ()=>{
  if(!lastStats || !lastStats.data.length){ alert(t('stats_none')); return; }
  if(typeof XLSX==='undefined'){ alert(t('xlsx_missing')); return; }
  const head = [t('bh_unit'),t('bh_emp'),t('bh_name'),t('foreign_student'),t('st_workdays'),t('bh_actual'),t('bh_clock'),t('bh_bonus'),t('st_leavedays')];
  const aoa = [head, ...lastStats.data.map(r=>[r.unit,r.emp,r.name,(r.student?'V':''),r.workDays,fmtHrs(r.actual),fmtHrs(r.clock),fmtHrs(r.bonus),r.leave])];
  const ws = XLSX.utils.aoa_to_sheet(aoa); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('stats_title').slice(0,31));
  XLSX.writeFile(wb, '工時統計_'+lastStats.from.replace(/-/g,'')+'_'+lastStats.to.replace(/-/g,'')+'.xlsx');
};

/* ---------- 複製上週 / 週檢視 / 交換移動 ---------- */
function addDaysKey(dateStr, n){ const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+n); return dateKey(d); }

$('#copyWeek').onclick = ()=>{
  if(!confirm(t('copy_week')+'？')) return;
  const mon = weekKeyOf(curDate);
  for(let i=0;i<7;i++){ const date=addDaysKey(mon,i), src=addDaysKey(date,-7);
    (state.people[curUnit]||[]).forEach(p=> setDay(date, p.id, cloneDay(getDay(src, p.id)))); }
  renderGrid();
};

let weekOpen=false, weekMon=null;
function dayWorkMin(day){ return normalize(day.work).reduce((s,x)=>s+(x[1]-x[0])*30,0); }
function shiftSummary(day){
  if(isFullOff(day)) return { txt:t('off'), cls:'wk-off' };
  const w=normalize(day.work); if(!w.length) return { txt:'', cls:'' };
  return { txt:slotToTime(w[0][0])+'–'+slotToTime(w[w.length-1][1])+' ('+fmtHrs(dayWorkMin(day))+'h)', cls:'wk-work' };
}
function openWeekView(){ weekMon=weekKeyOf(curDate); weekOpen=true; $('#weekView').hidden=false; renderWeek(); }
function closeWeekView(){ weekOpen=false; $('#weekView').hidden=true; }
function renderWeek(){
  const days=[]; for(let i=0;i<7;i++) days.push(addDaysKey(weekMon,i));
  $('#weekLabel').textContent = unitName(curUnit)+'　'+weekMon+' ~ '+days[6];
  const heads = `<th>${t('bh_name')}</th>`+days.map(d=>`<th>${d.slice(5)}<br><span class="rd">${dowLabel(new Date(d+'T00:00:00').getDay())}</span></th>`).join('')+`<th>${t('week_total')}</th>`;
  const ppl=state.people[curUnit]||[];
  const body=ppl.map(p=>{
    let tot=0;
    const cells=days.map(d=>{ const day=getDay(d,p.id); const s=shiftSummary(day); tot+=dayWorkMin(day); return `<td class="wk-cell ${s.cls}" data-date="${d}" data-p="${p.id}">${esc(s.txt)}</td>`; }).join('');
    return `<tr><td>${esc(p.name)}${p.foreignStudent?' <span class="stu">'+esc(t('foreign_student'))+'</span>':''}</td>${cells}<td><b>${fmtHrs(tot)}</b></td></tr>`;
  }).join('');
  $('#weekTable').innerHTML = `<thead><tr>${heads}</tr></thead><tbody>${body||''}</tbody>`;
  $$('#weekTable .wk-cell').forEach(td=> td.onclick=()=>{ curDate=td.dataset.date; save(); closeWeekView(); renderGrid(); });
}
$('#weekBtn').onclick=openWeekView; $('#weekBack').onclick=closeWeekView;
$('#weekPrev').onclick=()=>{ weekMon=addDaysKey(weekMon,-7); renderWeek(); };
$('#weekNext').onclick=()=>{ weekMon=addDaysKey(weekMon,7); renderWeek(); };

function fillPersonSelect(sel){ sel.innerHTML=''; (state.people[curUnit]||[]).forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.empNo+' '+p.name; sel.appendChild(o); }); }
$('#swapBtn').onclick=()=>{ fillPersonSelect($('#swapA')); fillPersonSelect($('#swapB')); $('#swapDate').value=curDate; $('#swapErr').hidden=true; showModal('#swapModal'); };
$('#swapDo').onclick=()=>{
  const a=$('#swapA').value, b=$('#swapB').value, d=$('#swapDate').value;
  if(!a||!b||a===b){ showErr('#swapErr', t('swap_same')); return; }
  const da=cloneDay(getDay(d,a)), db=cloneDay(getDay(d,b));
  setDay(d,a,db); setDay(d,b,da); closeModal('#swapModal'); refreshView();
};
$('#swapMove').onclick=()=>{
  const a=$('#swapA').value, b=$('#swapB').value, d=$('#swapDate').value;
  if(!a||!b||a===b){ showErr('#swapErr', t('swap_same')); return; }
  setDay(d,b,cloneDay(getDay(d,a))); closeModal('#swapModal'); refreshView();
};

/* ---------- 匯入人員（管理員） ---------- */
$('#importBtn').onclick=()=>{ if(!isAdmin) return; $('#importFile').click(); };
$('#importFile').onchange=(e)=>{
  const f=e.target.files[0]; if(!f) return;
  if(typeof XLSX==='undefined'){ alert(t('xlsx_missing')); return; }
  const rd=new FileReader();
  rd.onload=ev=>{ try{ importPeople(XLSX.read(new Uint8Array(ev.target.result),{type:'array'})); }catch(err){ alert(t('xlsx_read_fail')+err.message); } };
  rd.readAsArrayBuffer(f); e.target.value='';
};
function importPeople(wb){
  const ws=wb.Sheets[wb.SheetNames[0]]; const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  if(!aoa.length){ alert(t('punch_empty')); return; }
  const head=aoa[0].map(x=>String(x).trim());
  const col=names=>{ for(let i=0;i<head.length;i++){ if(names.some(n=>head[i].indexOf(n)>=0)) return i; } return -1; };
  const ci={ emp:col(['工號','員工編號','ID','Mã','รหัส']), name:col(['姓名','Name','Tên','ชื่อ']), unit:col(['單位','部門','Unit','Đơn','หน่วย']), foreign:col(['外籍','Foreign','SV','นศ','student']) };
  if(ci.emp<0||ci.name<0){ alert(t('import_bad')); return; }
  const unitMap={}; UNITS.forEach(u=>{ unitMap[u.id.toLowerCase()]=u.id; unitMap[u.apollo.toLowerCase()]=u.id; ['zh','en','vi','th'].forEach(l=>{ const nm=(I18N[l]&&I18N[l]['unit_'+u.id])||''; if(nm) unitMap[nm.toLowerCase()]=u.id; }); });
  let added=0;
  for(let i=1;i<aoa.length;i++){
    const r=aoa[i]||[]; const empNo=String(r[ci.emp]).trim(), name=String(r[ci.name]).trim();
    if(!empNo||!name) continue;
    let uid=curUnit; if(ci.unit>=0){ const uv=String(r[ci.unit]).trim().toLowerCase(); if(unitMap[uv]) uid=unitMap[uv]; }
    if((state.people[uid]||[]).some(p=>p.empNo===empNo)) continue;
    const foreign = ci.foreign>=0 ? /^(v|y|yes|是|true|1|có|ใช่)$/i.test(String(r[ci.foreign]).trim()) : false;
    const np={ id:pid(), unitId:uid, empNo, name, foreignStudent:foreign };
    if(!state.people[uid]) state.people[uid]=[]; state.people[uid].push(np);
    if(window.SB) window.SB.writePerson(np); added++;
  }
  renderAll(); closeModal('#userModal'); alert(t('import_done')+added);
}

/* ---------- 月班表（可列印） ---------- */
let rosterOpen=false, rosterYM=null;
function rosterData(){
  const y=rosterYM.y, m=rosterYM.m; const days=new Date(y,m+1,0).getDate();
  const unitIds=$('#rosterAllUnits').checked?visibleUnits().map(u=>u.id):[curUnit];
  const dates=[]; for(let dd=1;dd<=days;dd++) dates.push(`${y}-${pad(m+1)}-${pad(dd)}`);
  const rows=[];
  unitIds.forEach(uid=>(state.people[uid]||[]).forEach(p=>{
    rows.push({ unit:unitName(uid), emp:p.empNo, name:p.name, cells:dates.map(d=>{ const day=getDay(d,p.id); if(isFullOff(day)) return t('off'); const w=normalize(day.work); return w.length?(slotToTime(w[0][0])+'-'+slotToTime(w[w.length-1][1])):''; }) });
  }));
  return { y,m,dates,rows };
}
function openRoster(){ const d=new Date(curDate+'T00:00:00'); rosterYM={y:d.getFullYear(),m:d.getMonth()}; rosterOpen=true; $('#rosterView').hidden=false; renderRoster(); }
function closeRoster(){ rosterOpen=false; $('#rosterView').hidden=true; }
function renderRoster(){
  const R=rosterData(); $('#rosterLabel').textContent=monthLabel(R.y,R.m);
  const dayHeads=R.dates.map(d=>{ const dow=new Date(d+'T00:00:00').getDay(); return `<th class="${(dow===0||dow===6)?'wke':''}">${d.slice(8)}<br><span class="rd">${dowLabel(dow)}</span></th>`; }).join('');
  const body=R.rows.map(r=>`<tr><td class="rn">${esc(r.name)}</td>`+r.cells.map((c,i)=>{ const dow=new Date(R.dates[i]+'T00:00:00').getDay(); return `<td class="${(dow===0||dow===6)?'wke':''}">${esc(c)}</td>`; }).join('')+`</tr>`).join('');
  $('#rosterBody').innerHTML=`<table class="cmp-table roster-table"><thead><tr><th class="rn">${t('bh_name')}</th>${dayHeads}</tr></thead><tbody>${body||''}</tbody></table>`;
}
$('#rosterBtn').onclick=openRoster; $('#rosterBack').onclick=closeRoster;
$('#rosterAllUnits').onchange=()=>{ if(rosterOpen) renderRoster(); };
$('#rosterPrev').onclick=()=>{ let m=rosterYM.m-1,y=rosterYM.y; if(m<0){m=11;y--;} rosterYM={y,m}; renderRoster(); };
$('#rosterNext').onclick=()=>{ let m=rosterYM.m+1,y=rosterYM.y; if(m>11){m=0;y++;} rosterYM={y,m}; renderRoster(); };
$('#rosterPrint').onclick=()=> window.print();
$('#rosterExport').onclick=()=>{
  if(typeof XLSX==='undefined'){ alert(t('xlsx_missing')); return; }
  const R=rosterData(); const header=[t('bh_unit'),t('bh_emp'),t('bh_name'),...R.dates.map(d=>d.slice(8))];
  const aoa=[header,...R.rows.map(r=>[r.unit,r.emp,r.name,...r.cells])];
  const ws=XLSX.utils.aoa_to_sheet(aoa); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,t('roster_title').slice(0,31));
  XLSX.writeFile(wb,'月班表_'+R.y+pad(R.m+1)+'.xlsx');
};

/* ---------- 下拉選單 ---------- */
$$('[data-menu]').forEach(m => {
  m.querySelector('.menu-btn').addEventListener('click', e => {
    e.stopPropagation();
    const open = m.classList.contains('open');
    $$('[data-menu]').forEach(x => x.classList.remove('open'));
    if(!open) m.classList.add('open');
  });
  m.querySelectorAll('.menu-keep').forEach(el => el.addEventListener('click', e => e.stopPropagation()));
});
document.addEventListener('click', () => $$('[data-menu]').forEach(x => x.classList.remove('open')));

/* ---------- 主題（自動/淺/深） ---------- */
function applyThemePref(v){
  try{ localStorage.setItem('ss.theme', v); }catch(e){}
  if(v==='light' || v==='dark') document.documentElement.setAttribute('data-theme', v);
  else document.documentElement.removeAttribute('data-theme');
  $$('.seg-theme button').forEach(b=> b.classList.toggle('on', b.dataset.themeVal===v));
}
(function(){
  let v='auto'; try{ v=localStorage.getItem('ss.theme')||'auto'; }catch(e){}
  $$('.seg-theme button').forEach(b=>{ b.onclick=(e)=>{ e.stopPropagation(); applyThemePref(b.dataset.themeVal); }; });
  applyThemePref(v);
})();

/* ---------- 語言 ---------- */
$$('.lang-sel').forEach(s => { s.value = getLang(); s.onchange = (e)=> setLang(e.target.value); });
window.onLangChange = function(){
  if(!$('#userModal').hidden) renderUserMgmt();
  if(weekOpen) renderWeek();
  if(rosterOpen) renderRoster();
  if(monthOpen) renderMonth();
  else if(compareOpen) renderCompare();
  else if(statsOpen) renderStats();
  else if(document.body.classList.contains('authed')) renderAll();
};

/* ---------- 初始化 ---------- */
function drawIcons(){ if(window.lucide){ try{ lucide.createIcons(); }catch(e){} } }
function renderAll(){ renderTabs(); renderTemplates(); renderGrid(); updateBrushHint(); drawIcons(); }
fillTimeSelect($('#segStart')); fillTimeSelect($('#segEnd'));
fillTimeSelect($('#tplStart')); fillTimeSelect($('#tplEnd'));
fillTimeSelect($('#tplBs')); fillTimeSelect($('#tplBe'));
$('#tplBs').insertAdjacentHTML('afterbegin','<option value="">—</option>');
$('#tplBe').insertAdjacentHTML('afterbegin','<option value="">—</option>');
$('#tplStart').value = timeToSlot('09:00'); $('#tplEnd').value = timeToSlot('18:00');
$('#tplBs').value=''; $('#tplBe').value='';
drawIcons();
applyStaticI18n();
/* 初始畫面等 Firebase 決定登入狀態後再繪製（見 firebase-init.js） */
