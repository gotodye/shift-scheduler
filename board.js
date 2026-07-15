// 部門排班看板（唯讀）。以共用帳號登入，僅顯示該帳號被指派單位的班表。
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// 與 firebase-init.js 同一個專案（apiKey 本就是公開識別碼，非機密）
const firebaseConfig = {
  apiKey: "AIzaSyCkJ9mmrzsI2yCLmPUMY3PiTE4uSTDCHdo",
  authDomain: "shift-schedule-e8e37.firebaseapp.com",
  projectId: "shift-schedule-e8e37",
  storageBucket: "shift-schedule-e8e37.firebasestorage.app",
  messagingSenderId: "260873555598",
  appId: "1:260873555598:web:772c51e61e54529e1b03df",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SLOTS = 48;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
function drawIcons(){ if(window.lucide){ try{ lucide.createIcons(); }catch(e){} } }
const UNIT_COLOR = { ID:'#7a8af1', VN:'#67cdb4', TH:'#f6ad55', PH:'#a78bfa', KYC:'#f48fb1' };   // 同排班系統
function slotPx(){ return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot')); }

/* ---- 日期／時間工具 ---- */
function dateKey(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function todayKey(){ return dateKey(new Date()); }
function addDaysKey(key, n){ const d = new Date(key+'T00:00:00'); d.setDate(d.getDate()+n); return dateKey(d); }
function weekMonday(key){ const d = new Date(key+'T00:00:00'); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return dateKey(d); }
function weekDates(){ const m = weekMonday(curDate); return Array.from({length:7}, (_,i)=> addDaysKey(m, i)); }
function monthDays(key){ const d = new Date(key+'T00:00:00'), y = d.getFullYear(), m = d.getMonth();
  const n = new Date(y, m+1, 0).getDate(); return Array.from({length:n}, (_,i)=> `${y}-${pad(m+1)}-${pad(i+1)}`); }
function dowOf(dateKey){ return new Date(dateKey+'T00:00:00').getDay(); }
function slotToTime(slot){ return pad(Math.floor(slot/2)) + ':' + (slot%2 ? '30' : '00'); }
function fmtHrs(min){ return (Math.round(min/60*10)/10).toString(); }

/* ---- 資料狀態 ---- */
let myUnits = [];
let people = {};                 // id -> { unitId, name }
let shifts = {};                 // date -> personId -> { work:[{s,e}], off:[{s,e}] }
let curDate = todayKey();
let mode = 'day';                // day | week | month
let listening = false;

function peopleOf(uid){ return Object.values(people).filter(p => p.unitId === uid).sort((a,b)=> (a.name||'').localeCompare(b.name||'')); }
function isFullOff(d){ return (d.off||[]).some(o => o.s <= 0 && o.e >= SLOTS); }
function shiftText(personId, date, withHours){
  const d = shifts[date] && shifts[date][personId];
  if(!d) return '';
  if(isFullOff(d)) return t('off');
  const ws = (d.work||[]).filter(o => o.e > o.s);
  if(!ws.length) return '';
  const s = Math.min(...ws.map(o=>o.s)), e = Math.max(...ws.map(o=>o.e));
  const range = slotToTime(s) + '–' + slotToTime(e);
  if(!withHours) return range;
  const mins = ws.reduce((a,o)=> a + (o.e-o.s)*30, 0);
  return `${range} (${fmtHrs(mins)}h)`;
}

/* ---- 渲染 ---- */
function updateHeader(){
  $('#boardUnit').textContent = myUnits.map(u => unitName(u)).join(' · ');
  let label = '';
  if(mode === 'day'){ label = curDate.replace(/-/g,'/') + ' (' + dowLabel(dowOf(curDate)) + ')'; }
  else if(mode === 'week'){ const ds = weekDates(); label = ds[0].slice(5).replace('-','/') + ' – ' + ds[6].slice(5).replace('-','/'); }
  else { const d = new Date(curDate+'T00:00:00'); label = monthLabel(d.getFullYear(), d.getMonth()); }
  $('#boardRange').textContent = label;
  $$('.bmode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}
function dayList(ppl){
  return `<div class="board-day">` + ppl.map(p=>{
    const txt = shiftText(p.id, curDate, true);
    const cls = txt === t('off') ? 'off' : (txt ? 'work' : 'none');
    return `<div class="bd-row ${cls}"><span class="bd-name">${esc(p.name)}</span><span class="bd-shift">${txt || '—'}</span></div>`;
  }).join('') + `</div>`;
}
/* 日檢視：時間軸條狀班段（唯讀，重用排班的 .grid/.track/.seg 樣式） */
function dayTimeline(ppl, uid){
  const w = slotPx();
  const hours = Array.from({length:24}, (_,h)=> `<div class="th-hour">${pad(h)}</div>`).join('');
  const color = UNIT_COLOR[uid] || '#7a8af1';
  const rows = ppl.map(p=>{
    const d = shifts[curDate] && shifts[curDate][p.id];
    let segs = '';
    if(d){
      if(isFullOff(d)){
        segs = `<div class="seg off" style="left:0;width:${SLOTS*w}px"><span class="lbl">${t('off')}</span></div>`;
      } else {
        (d.off||[]).forEach(o=>{ if(o.e>o.s) segs += `<div class="seg off" style="left:${o.s*w}px;width:${(o.e-o.s)*w}px"></div>`; });
        (d.work||[]).forEach(o=>{ if(o.e>o.s) segs += `<div class="seg" style="left:${o.s*w}px;width:${(o.e-o.s)*w}px;background:${color}"><span class="lbl">${slotToTime(o.s)}–${slotToTime(o.e)}</span></div>`; });
      }
    }
    return `<div class="row"><div class="name-cell"><span class="who"><span class="nm">${esc(p.name)}</span></span></div><div class="track">${segs}</div></div>`;
  }).join('');
  return `<div class="board-grid-wrap"><div class="grid"><div class="time-header"><div class="th-spacer"></div><div class="th-hours">${hours}</div></div>${rows}</div></div>`;
}
function rosterTable(ppl, dates){
  const heads = dates.map(d=>{ const w = dowOf(d); return `<th class="${(w===0||w===6)?'wke':''}">${d.slice(8)}<br><span class="rd">${dowLabel(w)}</span></th>`; }).join('');
  const rows = ppl.map(p => `<tr><td class="rn">${esc(p.name)}</td>` + dates.map(d=>{
    const w = dowOf(d); const txt = shiftText(p.id, d, false);
    return `<td class="${(w===0||w===6)?'wke':''}">${txt}</td>`;
  }).join('') + `</tr>`).join('');
  return `<div class="board-table-wrap"><table class="cmp-table roster-table"><thead><tr><th class="rn">${t('bh_name')}</th>${heads}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function sectionForUnit(uid){
  const ppl = peopleOf(uid);
  const head = myUnits.length > 1 ? `<div class="board-sec-h">${esc(unitName(uid))}</div>` : '';
  if(!ppl.length) return head + `<div class="empty">${t('board_no_people')}</div>`;
  if(mode === 'day') return head + dayTimeline(ppl, uid);
  return head + rosterTable(ppl, mode === 'week' ? weekDates() : monthDays(curDate));
}
function renderBoard(){
  if($('#boardMain').hidden) return;
  updateHeader();
  $('#boardBody').innerHTML = myUnits.map(sectionForUnit).join('') || `<div class="empty">${t('board_no_people')}</div>`;
  drawIcons();
}

/* ---- 資料訂閱（即時） ---- */
function startData(){
  if(listening) return; listening = true;
  onSnapshot(collection(db, 'people'), qs => {
    people = {}; qs.forEach(d => { const x = d.data(); people[d.id] = { id:d.id, unitId:x.unitId, name:x.name }; });
    renderBoard();
  }, e => console.warn('people', e));
  onSnapshot(collection(db, 'shifts'), qs => {
    shifts = {}; qs.forEach(d => { const x = d.data(); (shifts[x.date] = shifts[x.date] || {})[x.personId] = { work:x.work||[], off:x.off||[] }; });
    renderBoard();
  }, e => console.warn('shifts', e));
}

/* ---- 畫面切換 ---- */
function show(view){ ['bootView','loginView','boardMain'].forEach(id => $('#'+id).hidden = (id !== view)); }

/* ---- 登入流程 ---- */
onAuthStateChanged(auth, async (user) => {
  if(!user){ show('loginView'); return; }
  try{
    const snap = await getDoc(doc(db, 'users', (user.email||'').toLowerCase()));
    if(!snap.exists() || !((snap.data().units||[]).length) && snap.data().admin !== true){
      $('#bErr').textContent = t('board_no_access'); $('#bErr').hidden = false;
      show('loginView'); await signOut(auth); return;
    }
    const d = snap.data();
    myUnits = d.admin ? ['ID','VN','TH','PH','KYC'] : (d.units || []);
    show('boardMain');
    startData();
    renderBoard();
  }catch(e){ $('#bErr').textContent = (t('board_err')+e.message); $('#bErr').hidden = false; show('loginView'); }
});

/* ---- 事件綁定 ---- */
function initUI(){
  applyStaticI18n();
  $$('.lang-sel').forEach(s => { s.value = getLang(); s.onchange = e => setLang(e.target.value); });
  window.onLangChange = () => { applyStaticI18n(); if(!$('#boardMain').hidden) renderBoard(); };

  $('#bLogin').onclick = () => doLogin();
  $('#bPass').addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); });
  $('#bSignout').onclick = () => signOut(auth);

  $('#bPrev').onclick = () => shiftBy(-1);
  $('#bNext').onclick = () => shiftBy(1);
  $('#bToday').onclick = () => { curDate = todayKey(); renderBoard(); };
  $$('.bmode').forEach(b => b.onclick = () => { mode = b.dataset.mode; renderBoard(); });
  drawIcons();
}
function shiftBy(dir){
  if(mode === 'day') curDate = addDaysKey(curDate, dir);
  else if(mode === 'week') curDate = addDaysKey(curDate, dir*7);
  else { const d = new Date(curDate+'T00:00:00'); d.setMonth(d.getMonth()+dir); curDate = dateKey(d); }
  renderBoard();
}
function doLogin(){
  const email = $('#bEmail').value.trim(), pass = $('#bPass').value;
  $('#bErr').hidden = true;
  signInWithEmailAndPassword(auth, email, pass).catch(err => {
    $('#bErr').textContent = t('board_login_fail'); $('#bErr').hidden = false;
  });
}
initUI();

// 除錯用：注入假資料預覽渲染（不寫入雲端、無安全影響）。例：__board({units:['ID'],people:{...},shifts:{...},mode:'week'})
window.__board = (d)=>{ people=d.people||{}; shifts=d.shifts||{}; myUnits=d.units||[]; if(d.date)curDate=d.date; if(d.mode)mode=d.mode;
  show('boardMain'); renderBoard(); };
