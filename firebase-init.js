// Firebase 初始化 + 登入 + Firestore 同步（以 CDN modular SDK 載入，免建置）
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
         collection, doc, setDoc, deleteDoc, getDoc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkJ9mmrzsI2yCLmPUMY3PiTE4uSTDCHdo",
  authDomain: "shift-schedule-e8e37.firebaseapp.com",
  projectId: "shift-schedule-e8e37",
  storageBucket: "shift-schedule-e8e37.firebasestorage.app",
  messagingSenderId: "260873555598",
  appId: "1:260873555598:web:772c51e61e54529e1b03df",
};

const OWNER = "gotodye@gmail.com";           // 首位管理員（可建立其他使用者）

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// 離線快取：沒網路也能顯示上次資料、離線期間的寫入會排入佇列，連線後自動同步（多分頁共用）
let db;
try{
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
}catch(e){
  console.warn('persistent cache unavailable, fallback', e);
  db = initializeFirestore(app, {});
}
const provider = new GoogleAuthProvider();

const toDocs = a => (a || []).map(x => ({ s:x[0], e:x[1] }));
const fromDocs = a => (a || []).map(o => [o.s, o.e]);

const tt = (k, d) => (window.t ? window.t(k) : d);

// 提供給 app.js 的寫入 API
window.SB = {
  signIn(){ return signInWithPopup(auth, provider).catch(e => alert(tt('login_fail','登入失敗：') + e.message)); },
  signOut(){ return signOut(auth); },
  writeShift(date, personId, unitId, day){
    const ref = doc(db, "shifts", date + "__" + personId);
    const empty = (!day.work || !day.work.length) && (!day.off || !day.off.length);
    if(empty) return deleteDoc(ref).catch(()=>{});
    return setDoc(ref, { date, personId, unitId: unitId || "", work: toDocs(day.work), off: toDocs(day.off) })
      .catch(e => console.warn("writeShift", e));
  },
  deleteShift(date, personId){ return deleteDoc(doc(db, "shifts", date + "__" + personId)).catch(()=>{}); },
  writePerson(p){ return setDoc(doc(db, "people", p.id), { unitId:p.unitId, empNo:p.empNo, name:p.name, foreignStudent:!!p.foreignStudent }).catch(e=>alert(tt('save_person_fail','儲存人員失敗：')+e.message)); },
  deletePerson(id){ return deleteDoc(doc(db, "people", id)).catch(e=>console.warn(e)); },
  writeTemplate(t){ return setDoc(doc(db, "templates", t.id), { name:t.name, start:t.start, end:t.end, unitId:t.unitId||'', bs:t.bs||'', be:t.be||'' }).catch(e=>console.warn(e)); },
  deleteTemplate(id){ return deleteDoc(doc(db, "templates", id)).catch(e=>console.warn(e)); },
  writeUser(email, data){ return setDoc(doc(db, "users", email.toLowerCase()), data).catch(e=>alert(tt('um_save_fail','儲存使用者失敗：')+e.message)); },
  deleteUser(email){ return deleteDoc(doc(db, "users", email.toLowerCase())).catch(e=>console.warn(e)); },
};

// 即時同步
const store = { people:[], templates:[], shifts:[], users:[] };
let tplLoaded = false;
let listening = false;
function push(){
  window.applyCloudSnapshot({
    people: store.people,
    templates: store.templates,
    shifts: store.shifts.map(s => ({ date:s.date, personId:s.personId, work:fromDocs(s.work), off:fromDocs(s.off) })),
    users: store.users,
    tplReady: tplLoaded,           // templates 首次載入後才允許自動建立/去重
  });
}
function startListeners(){
  if(listening) return; listening = true;
  onSnapshot(collection(db, "people"),    qs => { store.people    = qs.docs.map(d => ({ id:d.id, ...d.data() })); push(); }, e => console.warn("people", e));
  onSnapshot(collection(db, "templates"), qs => { store.templates = qs.docs.map(d => ({ id:d.id, ...d.data() })); tplLoaded = true; push(); }, e => console.warn("templates", e));
  onSnapshot(collection(db, "shifts"),    qs => { store.shifts    = qs.docs.map(d => ({ ...d.data() }));          push(); }, e => console.warn("shifts", e));
  onSnapshot(collection(db, "users"),     qs => { store.users     = qs.docs.map(d => ({ email:d.id, ...d.data() })); push(); }, e => console.warn("users", e));
}

onAuthStateChanged(auth, async (user) => {
  if(!user){ window.onSignedOut && window.onSignedOut(); return; }
  const email = (user.email || "").toLowerCase();
  const owner = (email === OWNER);
  try{
    const uref = doc(db, "users", email);
    let snap = await getDoc(uref);
    if(!snap.exists() && owner){
      await setDoc(uref, { admin:true, units: window.UNIT_IDS, name: user.displayName || "" });
      snap = await getDoc(uref);
    }
    if(!snap.exists()){ window.onNoAccess && window.onNoAccess(user); return; }
    const ud = snap.data();
    const admin = owner || ud.admin === true;
    window.setAccess({
      email, name: user.displayName || email, photo: user.photoURL || "",
      admin, units: admin ? window.UNIT_IDS : (ud.units || []),
    });
    startListeners();
  }catch(e){
    alert(tt('access_fail','讀取權限失敗：') + e.message);
    window.onSignedOut && window.onSignedOut();
  }
});
