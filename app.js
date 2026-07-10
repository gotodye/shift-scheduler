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

const APOLLO_HEADER = [
  '*工號','姓名','*日期(YYYY/MM/DD)','*狀態代碼','班次代碼','上班時間(HH:mm)','下班時間(HH:mm)',
  '休息時間(hh:mm~hh:mm；如有多組以","分隔；最多3組)','全天支援單位代碼',
  '(1)支援單位代碼','(1)支援起時-hh:mm','(1)支援迄時-hh:mm',
  '(2)支援單位代碼','(2)支援起時-hh:mm','(2)支援迄時-hh:mm',
  '(3)支援單位代碼','(3)支援起時-hh:mm','(3)支援迄時-hh:mm',
];

/* 每個單位一個色，方便辨識 */
const UNIT_COLOR = { ID:'#2f6fed', VN:'#0f9d58', TH:'#d8632f', PH:'#8b3fd8', KYC:'#c0396b' };

/* 常用班別範本（管理員首次登入、範本為空時自動建立，可自行增刪修改） */
const DEFAULT_TEMPLATES = [
  { name:'早班', start:'09:00', end:'18:00' },
  { name:'中班', start:'12:00', end:'21:00' },
  { name:'晚班', start:'14:00', end:'23:00' },
  { name:'早半', start:'09:00', end:'13:00' },
  { name:'午半', start:'14:00', end:'18:00' },
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
  (d.people||[]).forEach(p => { if(!people[p.unitId]) people[p.unitId] = []; people[p.unitId].push({ id:p.id, unitId:p.unitId, empNo:p.empNo, name:p.name }); });
  state.people = people;
  state.templates = (d.templates||[]).slice().sort((a,b)=> (a.start||'').localeCompare(b.start||''));
  maybeSeedTemplates();
  const sched = {};
  (d.shifts||[]).forEach(s => { if(!sched[s.date]) sched[s.date] = {}; sched[s.date][s.personId] = { work:s.work||[], off:s.off||[] }; });
  state.schedule = sched;
  usersList = d.users || [];
  scheduleRender();
}
window.applyCloudSnapshot = applyCloudSnapshot;

/* 各單位一份範本。管理員首次載入（每瀏覽器一次）：刪掉舊的共用（無單位）範本，
   並為沒有範本的單位建立一組常用預設。 */
let _tplMigrated = false;
function maybeSeedTemplates(){
  if(_tplMigrated || !isAdmin) return;
  _tplMigrated = true;
  try{ if(localStorage.getItem('ss.tpl.v2')) return; localStorage.setItem('ss.tpl.v2','1'); }catch(e){}
  // 刪掉舊版共用（無單位）範本
  state.templates.filter(t => !t.unitId).forEach(t => { if(window.SB) window.SB.deleteTemplate(t.id); });
  // 每個單位若還沒有專屬範本，建立一組預設
  UNIT_IDS.forEach(uid => {
    if(state.templates.some(t => t.unitId === uid)) return;
    DEFAULT_TEMPLATES.forEach(tp => { if(window.SB) window.SB.writeTemplate({ id:pid(), unitId:uid, name:tp.name, start:tp.start, end:tp.end }); });
  });
}

/* 雲端快照可能連續進來（例如整月套用一次寫很多筆），用去抖動避免反覆重繪 */
let _renderPending = false;
function scheduleRender(){
  if(_renderPending) return;
  _renderPending = true;
  requestAnimationFrame(() => {
    _renderPending = false;
    if($('#userModal') && !$('#userModal').hidden) renderUserMgmt();
    if(monthOpen) renderMonth();
    else if(compareOpen) renderCompare();
    else renderAll();
  });
}

/* 由 Firebase 模組呼叫：設定登入者權限 */
function setAccess(a){
  myEmail = a.email; isAdmin = a.admin; myUnits = a.units || [];
  if(myUnits.indexOf(curUnit) < 0 && !isAdmin){ curUnit = myUnits[0] || 'ID'; }
  const chip = $('#userChip'); if(chip){ chip.textContent = (a.name||a.email) + (isAdmin?t('admin_paren'):''); }
  $('#userMgmtBtn').hidden = !isAdmin;
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

/* ---------- 渲染 ---------- */
function renderTabs(){
  const el = $('#unitTabs'); el.innerHTML = '';
  visibleUnits().forEach(u => {
    const cnt = (state.people[u.id]||[]).length;
    const b = document.createElement('button');
    b.className = 'unit-tab' + (u.id===curUnit?' active':'');
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

function renderGrid(){
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

  const ar = document.createElement('div'); ar.className='row add-row';
  const nc = document.createElement('div'); nc.className='name-cell'; nc.textContent=t('add_person');
  nc.onclick = () => openPersonModal();
  const tk = document.createElement('div'); tk.className='track';
  ar.appendChild(nc); ar.appendChild(tk); grid.appendChild(ar);
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
  mvBtn.className='mini'; mvBtn.textContent=t('month_btn'); mvBtn.title=t('title_month');
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
function applyTemplateTo(date, personId){
  if(!activeTpl) return;
  const t = state.templates.find(x=>x.id===activeTpl);
  const r = [timeToSlot(t.start), timeToSlot(t.end)];
  const day = getDay(date, personId);
  setDay(date, personId, { work: [[r[0], r[1]]], off: subtractRange(day.off, r) });
  refreshView();
}
function applyTemplateAll(){
  if(!activeTpl) return;
  const t = state.templates.find(x=>x.id===activeTpl);
  const r = [timeToSlot(t.start), timeToSlot(t.end)];
  (state.people[curUnit]||[]).forEach(p => {
    const day = getDay(curDate, p.id);
    if(isFullOff(day)) return;                 // 整日休假者略過
    setDay(curDate, p.id, { work:[[r[0],r[1]]], off: subtractRange(day.off, r) });
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
  const t = state.templates.find(x => x.id === activeTpl);
  const r = [timeToSlot(t.start), timeToSlot(t.end)];
  monthDates().forEach(date => {
    const dow = new Date(date + 'T00:00:00').getDay();
    if(scope === 'weekday' && (dow===0 || dow===6)) return;
    const day = getDay(date, monthCtx.personId);
    if(isFullOff(day)) return;      // 整日休假者略過
    setDay(date, monthCtx.personId, { work:[[r[0],r[1]]], off: subtractRange(day.off, r) });
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
  if(editingPerson){ editingPerson.empNo=empNo; editingPerson.name=name; if(window.SB) window.SB.writePerson(editingPerson); }
  else { const np={ id:pid(), unitId:curUnit, empNo, name }; state.people[curUnit].push(np); if(window.SB) window.SB.writePerson(np); }
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
    it.innerHTML=`<span class="nm">${esc(tplLabel(t.name))}</span><span class="tm">${t.start}–${t.end}</span>`;
    const rm=document.createElement('button'); rm.className='rm'; rm.textContent=t('delete');
    rm.onclick=()=>{ if(window.SB) window.SB.deleteTemplate(t.id); state.templates=state.templates.filter(x=>x.id!==t.id); if(activeTpl===t.id)activeTpl=null; save(); renderTplModal(); renderTemplates(); updateBrushHint(); };
    it.appendChild(rm); list.appendChild(it);
  });
}
$('#tplAdd').onclick = ()=>{
  const name = $('#tplName').value.trim();
  const s = +$('#tplStart').value, e = +$('#tplEnd').value;
  if(!name){ alert(t('tpl_err_name')); return; }
  if(e<=s){ alert(t('tpl_err_time')); return; }
  const nt = { id:pid(), unitId:curUnit, name, start:slotToTime(s), end:slotToTime(e) };
  state.templates.push(nt); if(window.SB) window.SB.writeTemplate(nt);
  $('#tplName').value='';
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
  const rows = [];
  const warns = [];
  let d = new Date(from+'T00:00:00'); const end = new Date(to+'T00:00:00');
  while(d <= end){
    const key = dateKey(d);
    unitIds.forEach(uid=>{
      (state.people[uid]||[]).forEach(p=>{
        const day = getDay(key, p.id);
        const work = normalize(day.work);
        if(work.length){
          const on = slotToTime(work[0][0]);
          const off = slotToTime(work[work.length-1][1]);
          const breaks = [];
          for(let i=0;i<work.length-1;i++) breaks.push(slotToTime(work[i][1])+'~'+slotToTime(work[i+1][0]));
          if(breaks.length>3) warns.push(t('exp_warn_break', { name:p.name, date:apolloDate(key) }));
          rows.push([p.empNo, p.name, apolloDate(key), STATUS_WORK, SHIFT_CODE, on, off, breaks.slice(0,3).join(','), '', '', '', '', '', '', '', '', '', '']);
        } else if(isFullOff(day)){
          rows.push([p.empNo, p.name, apolloDate(key), STATUS_LEAVE, '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        }
        // 只有部分休假、或完全空白 → 不輸出（代表可臨時加班）
      });
    });
    d.setDate(d.getDate()+1);
  }
  return { rows, warns };
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

/* ---------- 語言 ---------- */
$$('.lang-sel').forEach(s => { s.value = getLang(); s.onchange = (e)=> setLang(e.target.value); });
window.onLangChange = function(){
  if(!$('#userModal').hidden) renderUserMgmt();
  if(monthOpen) renderMonth();
  else if(compareOpen) renderCompare();
  else if(document.body.classList.contains('authed')) renderAll();
};

/* ---------- 初始化 ---------- */
function renderAll(){ renderTabs(); renderTemplates(); renderGrid(); updateBrushHint(); }
fillTimeSelect($('#segStart')); fillTimeSelect($('#segEnd'));
fillTimeSelect($('#tplStart')); fillTimeSelect($('#tplEnd'));
$('#tplStart').value = timeToSlot('09:00'); $('#tplEnd').value = timeToSlot('18:00');
applyStaticI18n();
/* 初始畫面等 Firebase 決定登入狀態後再繪製（見 firebase-init.js） */
