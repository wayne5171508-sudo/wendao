'use strict';
// ════════════════════════════════════════════
//  存檔與數值：修為、資源、屬性、離線累積、突破、煉丹、功法、兵器、任務
// ════════════════════════════════════════════

const SAVE_KEY = 'wendao_idle_v1';

const S = {
  d: null,
  fresh() {
    return {
      ver: 2, created: Date.now(), last: Date.now(),
      lv: 0, exp: 0, root: null, grade: null,
      inv: { stone: 50, herb_q: 2, herb_c: 2, p_heal: 1 },
      arts: {}, weapons: {}, wslot: [null, null], quests: {},
      bonus: { atk: 0, hp: 0 },
      cleared: {}, unlocked: { sect: false, village: false, wild: false, realm: false },
      daily: { date: U.today(), realm: 0, free: false, sign: false }, gacha: { wpn: 0, art: 0 },
      story: {}, auto: false, settings: { music: true, sfx: true },
    };
  },
  load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { this.d = Object.assign(this.fresh(), JSON.parse(raw)); this.migrate(); this.fixSlots(); this.fixGacha(); if (this.d.root && !this.d.grade) this.d.grade = '黃'; return true; } } catch (e) {}
    this.d = this.fresh(); return false;
  },
  // v1 的隨機法寶改為兵器系統：舊法寶折成靈石
  migrate() {
    const d = this.d;
    if (d.ver >= 2) return;
    if (Array.isArray(d.bag) && d.bag.length) { d.inv.stone = (d.inv.stone || 0) + d.bag.reduce((a, it) => a + 60 * (it.tier + 1) * (1 + it.lv), 0); this.migrated = d.bag.length; }
    delete d.bag; delete d.equip; delete d.nextId; d.ver = 2;
  },
  // 佩戴欄只能放已擁有的兵器
  fixSlots() { this.d.wslot = this.d.wslot.map((id) => (id && this.d.weapons[id] ? id : null)); },
  // 保底是「距上次仙階的抽數」，合法範圍 0..pity-1。舊檔若一直累加，載入時夾回上限，其餘欄位不動
  fixGacha() {
    const d = this.d, cap = GACHA.pity - 1;
    if (!d.gacha || typeof d.gacha !== 'object' || Array.isArray(d.gacha)) d.gacha = { wpn: 0, art: 0 };
    const norm = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0; };
    d.gacha.wpn = norm(d.gacha.wpn); d.gacha.art = norm(d.gacha.art);
  },
  pityLeft(pool) {
    const g = this.d && this.d.gacha, n = g ? Number(g[pool]) : NaN;
    const cur = Number.isFinite(n) && n > 0 ? Math.min(GACHA.pity - 1, Math.floor(n)) : 0;
    return GACHA.pity - cur;
  },
  save() { if (!this.d) return; this.d.last = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) {} },
  // 匯入存檔：驗證格式後覆蓋；成功回傳 true，失敗回傳原因
  importText(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { return '存檔格式不正確，無法讀取'; }
    if (!d || typeof d !== 'object' || typeof d.lv !== 'number' || !d.inv || typeof d.inv !== 'object' || !d.root) return '這不是《問道青冥》的存檔';
    const keep = this.d; this.d = Object.assign(this.fresh(), d); this.migrate(); this.fixSlots(); this.fixGacha();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { this.d = keep; return '瀏覽器無法寫入存檔'; }
    return true;
  },
  reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },

  // ───────── 屬性 ─────────
  artLv(id) { return this.d.arts[id] || 0; },
  // 兵器數值：強化每級 +8%，突破每次 +25%
  wStat(id) {
    const w = WEAPONS.find((x) => x.id === id), o = this.d.weapons[id]; if (!w || !o) return null;
    const k = (1 + 0.08 * o.lv) * (1 + 0.25 * o.brk);
    return { atk: Math.round(w.atk * k), crit: Math.round(w.crit * (1 + 0.1 * o.brk) * 10) / 10, regen: Math.round(w.regen * (1 + 0.04 * o.lv) * (1 + 0.25 * o.brk) * 10) / 10 };
  },
  equipped() { return this.d.wslot.filter((id) => id && this.d.weapons[id]).map((id) => WEAPONS.find((w) => w.id === id)); },
  wTop() { return this.equipped().reduce((t, w) => (!t || w.tier > t.tier ? w : t), null); },   // 最高階的已裝備兵器，決定光效
  wFx(fx) { return this.equipped().some((w) => w.fx === fx); },
  wSum(key) { return this.d.wslot.reduce((a, id) => a + ((id && this.wStat(id)) ? this.wStat(id)[key] : 0), 0); },
  stats() {
    const d = this.d, L = d.lv, k = Math.pow(1.45, L), r = this.rootFx();
    const art = (key) => ARTS.reduce((a, A) => a + (A.stat[key] || 0) * this.artLv(A.id), 0);
    const hp = Math.round(120 * k * (1 + art('hp') + (r.hp || 0) + d.bonus.hp));
    const atk = Math.round((15 * k + this.wSum('atk')) * (1 + art('atk') + (r.atk || 0) + d.bonus.atk));
    const def = Math.round(3 * k * (1 + art('def') + (r.def || 0)));
    const mp = Math.round((80 + 20 * L) * (1 + (r.mp || 0)));
    return { hp, atk, def, mp, mpRegen: 4 + L * 0.6 + (r.mp ? 2 : 0) + this.wSum('regen'), crit: 0.08 + (r.crit || 0) + this.wSum('crit') / 100, interval: 1.0, power: Math.round(hp * 0.2 + atk * 3 + def * 2) };
  },
  // 靈根加成乘上品階倍率
  rootFx() {
    if (!this.d.root) return {};
    const m = GRADES[this.d.grade || '黃'].mult;
    return Object.fromEntries(Object.entries(ROOTS[this.d.root]).map(([k, v]) => [k, typeof v === 'number' ? v * m : v]));
  },
  rate() {
    const d = this.d, r = this.rootFx();
    return baseRate(d.lv) * (1 + 0.12 * this.artLv('yinqi') + (r.rate || 0));
  },
  need() { return expNeed(this.d.lv); },
  full() { return this.d.exp >= this.need(); },
  addExp(n) { if (this.d.lv >= MAX_LV && this.full()) return; this.d.exp = Math.min(this.need() * 1.0, this.d.exp + n); },
  add(id, n = 1) { this.d.inv[id] = (this.d.inv[id] || 0) + n; },
  has(id, n = 1) { return (this.d.inv[id] || 0) >= n; },
  take(id, n = 1) { if (!this.has(id, n)) return false; this.d.inv[id] -= n; return true; },

  // 離線累積（最多八個時辰）
  offline() {
    const sec = Math.min(OFFLINE_CAP, Math.max(0, (Date.now() - this.d.last) / 1000));
    if (sec < 60 || !this.d.root) return null;
    const before = this.d.exp, room = this.need() - before;
    const gain = Math.min(room, this.rate() * sec);
    this.d.exp += gain;
    const stone = Math.floor(sec / 60) * (1 + this.d.lv);
    this.add('stone', stone);
    return { sec, gain, stone, capped: sec >= OFFLINE_CAP, full: this.full() };
  },

  // 每日秘境次數
  today() {
    if (this.d.daily.date !== U.today()) this.d.daily = { date: U.today(), realm: 0, free: false, sign: false };
    return this.d.daily;
  },
  dailyLeft() { return REGIONS.find((r) => r.id === 'realm').daily - this.today().realm; },
  sign() { const t = this.today(); if (t.sign) return 0; t.sign = true; const n = GACHA.sign(this.d.lv); this.add('stone', n); this.save(); return n; },

  // ───────── 機緣抽取 ─────────
  rollTier(pool) {
    const g = this.d.gacha || (this.d.gacha = { wpn: 0, art: 0 });
    let n = Number(g[pool]);
    if (!Number.isFinite(n) || n < 0) n = 0;
    else n = Math.floor(n);
    let tier;
    // 每抽 +1；滿保底必出仙階以上。自然抽到仙、神同樣歸零，計數不會超過 pity-1
    if (++n >= GACHA.pity) tier = U.chance(1 / 6) ? 4 : 3;
    else { let r = Math.random(); tier = GACHA.rates.findIndex((p) => (r -= p) < 0); if (tier < 0) tier = 0; }
    g[pool] = tier >= 3 ? 0 : n;
    return tier;
  },
  // 單抽每日首抽免費；十連保底一個靈階以上。回傳結果陣列，靈石不足回傳 null
  draw(pool, n) {
    const t = this.today(), free = n === 1 && !t.free, cost = n === 10 ? GACHA.cost10 : GACHA.cost;
    // 費用一定是正數扣除。付不起就整次取消（不抽、不加保底）；扣完不會是負數
    if (!free && (!(cost > 0) || !this.take('stone', cost))) return null;
    if (!free && this.d.inv.stone < 0) this.d.inv.stone = 0;
    if (free) t.free = true;
    const tiers = Array.from({ length: n }, () => this.rollTier(pool));
    if (n === 10 && tiers.every((x) => x === 0)) tiers[9] = 1;
    const res = tiers.map((tier) => (pool === 'wpn' ? this.grantWeapon(tier) : this.grantArt(tier)));
    this.save(); return res;
  },
  grantWeapon(tier) {
    const w = WEAPONS.find((x) => x.tier === tier), isNew = !this.d.weapons[w.id];
    return { tier, type: 'w', id: w.id, name: w.name, isNew, note: this.gainWeapon(w.id, { gacha: true }) };
  },
  grantArt(tier) {
    const R = ART_GACHA[tier];
    const open = ARTS.filter((A) => this.artLv(A.id) < ART_MAX);
    const A = R.art === 'wanjian' && this.artLv('wanjian') < ART_MAX ? ARTS.find((x) => x.id === 'wanjian') : R.art ? U.pick(open) : null;
    if (!A) { const n = R.scroll || 10; this.add('scroll', n); return { tier, type: 'item', id: 'scroll', name: `功法殘卷 ×${n}`, isNew: false }; }
    const lv = this.artLv(A.id) + 1; this.d.arts[A.id] = lv;
    return { tier, type: 'art', id: A.id, name: `${A.name}・第 ${lv} 層`, isNew: lv === 1 };
  },

  // ───────── 突破 ─────────
  breakRate(usePills) {
    const major = isMajor(this.d.lv);
    let r = major ? 0.55 : 0.95;
    if (usePills.break) r += 0.15;
    if (usePills.zhuji && major) r += 0.3;
    return Math.min(0.98, r);
  },
  // bonus：渡劫時點準時機換來的成功率加成（可為負）
  breakthrough(usePills, bonus = 0) {
    if (!this.full() || this.d.lv >= MAX_LV) return null;
    if (usePills.break && !this.take('p_break')) usePills.break = false;
    if (usePills.zhuji && !this.take('p_zhuji')) usePills.zhuji = false;
    const rate = U.clamp(this.breakRate(usePills) + bonus, 0.02, 0.98), ok = Math.random() < rate, major = isMajor(this.d.lv), from = this.d.lv;
    // 失敗：跌回上一個小境界，修為只剩該境界的一半
    if (ok) { this.d.lv++; this.d.exp = 0; }
    else { this.d.lv = Math.max(0, this.d.lv - 1); this.d.exp = Math.floor(this.need() * 0.5); }
    this.save();
    return { ok, major, from, to: this.d.lv };
  },

  // ───────── 煉丹 ─────────
  alchRate(r) { return Math.min(0.95, r.rate + Math.floor(this.d.lv / 3) * 0.06 + (this.d.root === 'fire' ? 0.05 : 0)); },
  canCraft(r) { return Object.entries(r.need).every(([k, n]) => this.has(k, n)) && this.has('stone', r.stone); },
  craft(r) {
    if (!this.canCraft(r)) return null;
    for (const [k, n] of Object.entries(r.need)) this.take(k, n);
    this.take('stone', r.stone);
    const ok = Math.random() < this.alchRate(r);
    if (ok) this.add(r.out);
    this.save(); return ok;
  },
  usePill(id) {
    if (!this.has(id)) return null;
    if (id === 'p_qi') { if (this.full()) return '修為已滿，先行突破'; this.take(id); this.d.exp = Math.min(this.need(), this.d.exp + this.need() * 0.3); }
    else if (id === 'p_zao') { this.take(id); this.d.bonus.atk += 0.08; this.d.bonus.hp += 0.08; }
    else return '此丹在突破或戰鬥時自動使用';
    this.save(); return true;
  },

  // ───────── 功法 ─────────
  artState(A) {
    const lv = this.artLv(A.id);
    if (lv === 0) return { lv, can: this.d.lv >= A.req * 3 && this.has('scroll', A.scroll), learn: true };
    return { lv, can: lv < ART_MAX && this.has('stone', artCost(lv)), learn: false };
  },
  upArt(A) {
    const st = this.artState(A); if (!st.can) return false;
    if (st.learn) this.take('scroll', A.scroll); else this.take('stone', artCost(st.lv));
    this.d.arts[A.id] = st.lv + 1; this.save(); return true;
  },
  skillOpen(sk) { if (sk.wt !== undefined) { const t = this.wTop(); return !!t && t.tier >= sk.wt; } return this.artLv(sk.from) > 0; },

  // ───────── 兵器 ─────────
  // 取得兵器；已擁有則折成玄鐵與靈石，回傳說明文字。機緣除外：折返靈石會蓋過十連花費
  gainWeapon(id, opt) {
    const w = WEAPONS.find((x) => x.id === id);
    if (this.d.weapons[id]) {
      const ore = 5 * (w.tier + 1), st = 200 * (w.tier + 1);
      this.add('ore', ore);
      if (opt && opt.gacha) return `${w.name}重複，化為玄鐵 ×${ore}`;
      this.add('stone', st);
      return `${w.name}重複，化為玄鐵 ×${ore}、靈石 ${st}`;
    }
    this.d.weapons[id] = { lv: 0, brk: 0, fail: 0 };
    // 主手空著就放主手；主手已有劍就放副手，並標記讓法寶頁高亮
    if (!this.d.wslot[0]) this.d.wslot[0] = id;
    else if (!this.d.wslot[1]) { this.d.wslot[1] = id; this.d.freshW = id; }
    return null;
  },
  // 剛自動放入副手的兵器，提示一次
  subNotice(id) { return this.d.freshW === id && this.d.wslot[1] === id ? `${WEAPONS.find((w) => w.id === id).name}已放入副手` : null; },
  wSwap() { this.d.wslot = [this.d.wslot[1], this.d.wslot[0]]; this.d.freshW = null; this.save(); },
  wEquip(id, slot) {
    this.d.freshW = null;
    const o = slot === 0 ? 1 : 0;
    if (this.d.wslot[o] === id) this.d.wslot[o] = this.d.wslot[slot];   // 兩欄互換
    this.d.wslot[slot] = id; this.save();
  },
  wUnequip(slot) { this.d.wslot[slot] = null; this.save(); },
  wCap(id) { return 10 * (1 + this.d.weapons[id].brk); },
  // 強化：失敗只扣靈石，連敗三次後必成
  wEnhance(id) {
    const w = WEAPONS.find((x) => x.id === id), o = this.d.weapons[id], cost = wEnhCost(w, o.lv);
    if (o.lv >= this.wCap(id) || !this.take('stone', cost)) return null;
    const pity = o.fail >= W_PITY, ok = pity || Math.random() < wEnhRate(o.lv);
    if (ok) { o.lv++; o.fail = 0; } else o.fail++;
    this.save(); return { ok, pity };
  },
  wCanBreak(id) {
    const w = WEAPONS.find((x) => x.id === id), o = this.d.weapons[id];
    if (o.brk >= W_BRK_MAX || o.lv < this.wCap(id)) return false;
    const { need, stone } = wBrkNeed(w, o.brk);
    return Object.entries(need).every(([k, n]) => this.has(k, n)) && this.has('stone', stone);
  },
  wBreak(id) {
    if (!this.wCanBreak(id)) return false;
    const w = WEAPONS.find((x) => x.id === id), o = this.d.weapons[id], { need, stone } = wBrkNeed(w, o.brk);
    for (const [k, n] of Object.entries(need)) this.take(k, n);
    this.take('stone', stone); o.brk++; this.save(); return true;
  },
  // 商店與煉器
  shopOpen(it) { return this.d.lv >= (it.lv || 0); },
  buy(it) {
    if (!this.shopOpen(it) || (it.w && this.d.weapons[it.w]) || !this.take('stone', it.stone)) return false;
    if (it.w) this.gainWeapon(it.w); else this.add(it.item, it.n);
    this.save(); return true;
  },
  canForge(f) { return !this.d.weapons[f.w] && Object.entries(f.need).every(([k, n]) => this.has(k, n)) && this.has('stone', f.stone); },
  forge(f) {
    if (!this.canForge(f)) return null;
    for (const [k, n] of Object.entries(f.need)) this.take(k, n);
    this.take('stone', f.stone);
    const ok = Math.random() < f.rate;
    if (ok) this.gainWeapon(f.w);
    this.save(); return ok;
  },
  // 任務：done 達成未領、claimed 已領
  questState(q) { return this.d.quests[q.id] ? 'claimed' : q.check(this) ? 'done' : 'todo'; },
  claim(q) {
    if (this.questState(q) !== 'done') return null;
    const notes = [];
    for (const [k, n] of Object.entries(q.reward)) { if (k === 'w') { const r = this.gainWeapon(n); if (r) notes.push(r); } else this.add(k, n); }
    this.d.quests[q.id] = true; this.save(); return notes;
  },
  questsReady() { return QUESTS.filter((q) => this.questState(q) === 'done').length; },
};

