'use strict';
// ════════════════════════════════════════════
//  雲端：Google 登入、雲端存檔、道侶連線（Firebase Realtime Database）
//  資料結構：
//    users/<uid>   公開資料 { name, char, pid, at }（登入者可讀，本人可寫）
//    pids/<pid>    道侶編號 → uid
//    status/<uid>  上下線 { online, at }（斷線時自動設為離線）
//    saves/<uid>   雲端存檔 { at, data }（只有本人可讀寫）
//    inbox/<uid>/<id>  給該玩家的訊息（締結、贈禮、邀請、演出同步…），處理後刪除
//  沒網路或沒登入時一切照單機運作
// ════════════════════════════════════════════

const FIREBASE_CFG = {
  apiKey: 'AIzaSyB4_uUfqfYmO4jKSJ4IOdfxwroowp1Furw',
  authDomain: 'wendao-934c1.firebaseapp.com',
  databaseURL: 'https://wendao-934c1-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'wendao-934c1',
  storageBucket: 'wendao-934c1.firebasestorage.app',
  messagingSenderId: '121159419424',
  appId: '1:121159419424:web:14f29de6da9a941290de45',
};
const FB_VER = '10.12.2';

// ───────── Firebase 接口（測試時可用 window.__CLOUD_ADAPTER 取代）─────────
const FirebaseAdapter = {
  async boot() {
    const load = (n) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${n}-compat.js`; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    await load('app'); await Promise.all([load('auth'), load('database')]);
    firebase.initializeApp(FIREBASE_CFG); this.auth = firebase.auth(); this.db = firebase.database();
    try { await this.auth.getRedirectResult(); } catch (e) {}
  },
  onAuth(cb) { this.auth.onAuthStateChanged((u) => cb(u && { uid: u.uid, name: u.displayName || '', email: u.email || '' })); },
  async signIn() {
    const p = new firebase.auth.GoogleAuthProvider();
    try { await this.auth.signInWithPopup(p); }
    catch (e) { if (/popup|operation-not-supported/.test(e.code || '')) await this.auth.signInWithRedirect(p); else throw e; }
  },
  signOut() { return this.auth.signOut(); },
  async get(p) { return (await this.db.ref(p).get()).val(); },
  set(p, v) { return this.db.ref(p).set(v); },
  remove(p) { return this.db.ref(p).remove(); },
  push(p, v) { return this.db.ref(p).push(v); },
  on(p, cb) { const r = this.db.ref(p), f = (s) => cb(s.val()); r.on('value', f); return () => r.off('value', f); },
  onChild(p, cb) { const r = this.db.ref(p), f = (s) => cb(s.key, s.val()); r.on('child_added', f); return () => r.off('child_added', f); },
  presence(uid) {
    const st = this.db.ref(`status/${uid}`), TS = firebase.database.ServerValue.TIMESTAMP;
    this.db.ref('.info/connected').on('value', (s) => { if (!s.val()) return; st.onDisconnect().set({ online: false, at: TS }).then(() => st.set({ online: true, at: TS })); });
  },
  offline(uid) { return this.db.ref(`status/${uid}`).set({ online: false, at: Date.now() }); },
};

const Cloud = {
  A: null, user: null, booted: false, partnerOnline: false, offs: [], pending: {}, saveT: 0,
  async init() {
    this.A = window.__CLOUD_ADAPTER || FirebaseAdapter;
    if (location.protocol === 'file:' && !window.__CLOUD_ADAPTER) return;
    try { await this.A.boot(); this.booted = true; } catch (e) { console.warn('[雲端] 無法連線（離線或被擋），以單機模式遊玩'); return; }
    this.A.onAuth((u) => this.onUser(u).catch((e) => console.warn('[雲端] 登入後同步失敗', e)));
  },
  get on() { return !!this.user; },
  async signIn() {
    if (!this.booted) { UI.toast('目前連不到雲端，請確認網路', '#ff9a9a'); return; }
    try { await this.A.signIn(); } catch (e) { console.warn(e); UI.toast('登入未完成', '#ff9a9a'); }
  },
  async signOut() { if (!this.user) return; await this.upload(); await this.A.offline(this.user.uid); this.offs.forEach((f) => f()); this.offs = []; await this.A.signOut(); },

  async onUser(u) {
    this.offs.forEach((f) => f()); this.offs = []; this.user = u; this.partnerOnline = false; this.registered = null;   // 換帳號或重新登入：重新註冊、重新監聽收件匣
    if (!u) { this.refresh(); return; }
    // 雲端存檔：本機沒進度就直接用雲端；兩邊都有且雲端較新時讓玩家選
    const cs = await this.A.get(`saves/${u.uid}`);
    if (cs && cs.data && (!S.d || !S.d.root)) return this.adopt(cs.data);   // 本機還沒入道（新手機）：直接用雲端
    if (cs && cs.data && cs.at > ((S.d && S.d.last) || 0) + 5000) {
      const pick = await new Promise((res) => UI.modal('雲端存檔', `<p class="big">雲端有較新的存檔</p><p class="note" style="text-align:center">雲端：${new Date(cs.at).toLocaleString()}<br>本機：${new Date(S.d.last).toLocaleString()}</p>
        <div class="row center"><button class="seal" id="cC">用雲端</button><button class="seal ghost sm" id="cL">用本機</button></div>`, { '#cC': () => { UI.close(); res('c'); }, '#cL': () => { UI.close(); res('l'); } }));
      if (pick === 'c') return this.adopt(cs.data);
    }
    if (!S.d || !S.d.root) { this.refresh(); return; }   // 還沒入道：先不註冊，入道後再上傳
    await this.register();
  },
  adopt(data) { try { localStorage.setItem(SAVE_KEY, data); } catch (e) {} location.reload(); },
  // 公開資料、道侶編號、上下線、收件匣、道侶狀態
  async register() {
    const u = this.user, g = S.d.dao;
    if (!u || this.registered === u.uid) return; this.registered = u.uid;
    const own = await this.A.get(`pids/${g.pid}`);
    if (own && own !== u.uid) { g.pid = Math.random().toString(36).slice(2, 10).toUpperCase(); S.save(); }   // 編號撞到別人：換一個
    await this.A.set(`pids/${g.pid}`, u.uid);
    await this.A.set(`users/${u.uid}`, { name: HERO_NAME, char: g.char, pid: g.pid, at: Date.now() });
    this.A.presence(u.uid);
    this.offs.push(this.A.onChild(`inbox/${u.uid}`, (id, m) => { this.A.remove(`inbox/${u.uid}/${id}`); this.handle(m); }));
    this.watchPartner(); g.outbox = []; await this.upload(); this.refresh();
  },
  watchPartner() {
    if (this.pOff) { this.pOff(); this.pOff = null; }
    const P = S.d.dao.partner; this.partnerOnline = false;
    if (!P || !P.uid) return;
    this.pOff = this.A.on(`status/${P.uid}`, (st) => { const on = !!(st && st.online); if (on !== this.partnerOnline) { this.partnerOnline = on; if (on) UI.toast(`道侶${P.name}上線了`, '#ff9ec4'); this.refresh(); } });
    this.offs.push(() => this.pOff && this.pOff());
  },
  refresh() { if (UI.tab === 'dao' && !Battle.on && $('#dBack')) UI.dao(); UI.cloudBadge && UI.cloudBadge(); },
  // 存檔上傳（S.save 後 10 秒合併一次；切到背景時立即）
  async upload() { if (!this.user || !S.d || !S.d.root) return; clearTimeout(this.saveT); this.saveT = 0; try { await this.A.set(`saves/${this.user.uid}`, { at: S.d.last || Date.now(), data: JSON.stringify(S.d) }); } catch (e) { console.warn('[雲端] 存檔上傳失敗', e); } },
  queueUpload() { if (this.user && !this.saveT) this.saveT = setTimeout(() => this.upload(), 10000); },

  // ───────── 傳訊 ─────────
  send(uid, m) { if (!this.user || !uid) return false; this.A.push(`inbox/${uid}`, { ...m, from: this.user.uid, fromName: HERO_NAME, at: Date.now() }); return true; },
  toPartner(m) { const P = S.d.dao.partner; return P && P.uid ? this.send(P.uid, m) : false; },
  wait(key, ms) { return new Promise((res) => { const t = setTimeout(() => { delete this.pending[key]; res(null); }, ms); this.pending[key] = (m) => { clearTimeout(t); delete this.pending[key]; res(m); }; }); },
  async requestBond(pid) {
    pid = String(pid || '').trim().toUpperCase();
    if (!pid) return '請輸入對方的道侶編號';
    if (pid === S.d.dao.pid) return '這是你自己的編號';
    const uid = await this.A.get(`pids/${pid}`); if (!uid) return '找不到這個道侶編號（對方需先登入）';
    const info = (await this.A.get(`users/${uid}`)) || {};
    this.send(uid, { type: 'bondReq', pid: S.d.dao.pid, char: S.d.dao.char });
    UI.toast(`已向${info.name || '對方'}送出締結邀請，等待回應`, '#ff9ec4');
    const r = await this.wait('bond', 120000);
    if (!r) return '對方沒有回應（可能不在線），稍後再試';
    if (r.type === 'bondNo') return `${r.fromName}婉拒了締結`;
    Dao.bondWith({ name: r.fromName, pid, uid: r.from }); this.watchPartner(); return true;
  },
  // 收到的訊息
  async handle(m) {
    const g = S.d.dao, P = g.partner, fromPartner = P && P.uid === m.from;
    switch (m.type) {
      case 'bondReq': {
        if (g.partner) { this.send(m.from, { type: 'bondNo' }); return; }
        UI.modal('道侶締結', `<p class="big">${m.fromName}</p><p class="note" style="text-align:center">道侶編號 ${m.pid}<br>想與你結為道侶</p><div class="row center"><button class="seal" id="bY">結為道侶</button><button class="seal ghost sm" id="bN">婉拒</button></div>`, {
          '#bY': () => { UI.close(); Dao.bondWith({ name: m.fromName, pid: m.pid, uid: m.from }); this.send(m.from, { type: 'bondOk' }); this.watchPartner(); Audio2.play('bell'); UI.toast(`與${m.fromName}結為道侶`, '#ff9ec4'); this.refresh(); },
          '#bN': () => { UI.close(); this.send(m.from, { type: 'bondNo' }); },
        });
        return;
      }
      case 'bondOk': case 'bondNo': if (this.pending.bond) this.pending.bond(m); return;
      case 'unbond': if (fromPartner) { Dao.unbond(true); this.watchPartner(); UI.toast(`${m.fromName}解除了道侶`, '#ff9a9a'); this.refresh(); } return;
      case 'gift': if (fromPartner && ITEMS[m.item]) { S.add(m.item); Dao.addIntimacy(DAO.gifts[m.item] || 1, `收到${m.fromName}贈送的${ITEMS[m.item].name}`); S.save(); UI.toast(`${m.fromName}贈你${ITEMS[m.item].name}`, '#ff9ec4'); UI.hud(); this.refresh(); } return;
      case 'invite': {
        if (!fromPartner) return;
        if (Battle.on || DualShow.state === 'playing' || Story.waiting) { this.send(m.from, { type: 'inviteNo', why: 'busy' }); return; }
        const R = Dao.room(m.room); let answered = false;
        const reply = (ok) => { if (answered) return; answered = true; UI.close(); this.send(m.from, { type: ok ? 'inviteOk' : 'inviteNo' }); };
        UI.modal('雙修邀請', `<p class="big">${m.fromName}</p><p class="note" style="text-align:center">邀你前往${R ? R.name : '合修室'}雙修</p><div class="row center"><button class="seal" id="iY">前往</button><button class="seal ghost sm" id="iN">婉拒</button></div>`, { '#iY': () => reply(true), '#iN': () => reply(false) });
        Audio2.play('bell'); setTimeout(() => reply(false), 30000);
        return;
      }
      case 'inviteOk': case 'inviteNo': if (this.pending.invite) this.pending.invite(m); return;
      case 'dualStart': if (fromPartner) UI.daoDualRun({ room: m.room, style: m.style, intensity: m.intensity, speed: m.speed, guest: true, host: m.fromName }); return;
      case 'dualCtl': if (fromPartner && DualShow.state === 'playing') { if (m.skip) DualShow.skip(); if (m.speed) { UI.daoSpeed = m.speed; DualShow.setSpeed(m.speed); const b = $('#dsFast'); if (b) b.textContent = `加速 ×${m.speed}`; } } return;
      case 'explore': if (fromPartner) { Dao.addIntimacy(DAO.gain.explore, `${m.fromName}在外歷練時念著你`); S.save(); } return;
    }
  },
};

// ───────── 接到既有系統 ─────────
(() => {
  const save0 = S.save.bind(S); S.save = () => { save0(); Cloud.queueUpload(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) Cloud.upload(); });
  // 道侶連線：有登入且道侶有雲端帳號時改走真正的連線
  const online0 = DaoNet.online.bind(DaoNet), invite0 = DaoNet.invite.bind(DaoNet), send0 = DaoNet.send.bind(DaoNet);
  const linked = () => Cloud.on && S.d.dao.partner && S.d.dao.partner.uid;
  DaoNet.online = () => (linked() ? Cloud.partnerOnline || S.d.dao.simOnline : online0());
  DaoNet.invite = async (room) => {
    if (!linked()) return invite0(room);
    if (!Cloud.partnerOnline) return { ok: false, reason: 'offline' };
    Cloud.toPartner({ type: 'invite', room });
    UI.toast('已送出邀請，等待道侶回應…', '#ff9ec4');
    const r = await Cloud.wait('invite', 35000);
    return r && r.type === 'inviteOk' ? { ok: true } : { ok: false, reason: r ? r.why || 'declined' : 'timeout' };
  };
  DaoNet.send = (evt) => {
    if (!linked()) return send0(evt);
    if (evt.type === 'gift') Cloud.toPartner({ type: 'gift', item: evt.item });
    else if (evt.type === 'unbond') Cloud.toPartner({ type: 'unbond' });
  };
  // 一起歷練：通知道侶
  const ex0 = Dao.onExplore.bind(Dao); Dao.onExplore = () => { const r = ex0(); if (r && linked()) Cloud.toPartner({ type: 'explore' }); return r; };
})();

// 入道後補註冊（新遊戲時還沒有角色資料）
setInterval(() => { if (Cloud.user && S.d && S.d.root && Cloud.registered !== Cloud.user.uid) Cloud.register(); }, 3000);
