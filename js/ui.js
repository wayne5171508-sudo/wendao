'use strict';
// ════════════════════════════════════════════
//  介面：場景／控制區切換、洞府、地圖、丹房、功法、法寶、彈窗、提示
// ════════════════════════════════════════════

const $ = (s) => document.querySelector(s);
const IMG_SRC = {
  hero_front: 'assets/hero/front.webp', hero_meditate: 'assets/hero/meditate.webp',
  bg_title: 'assets/bg/title.webp', bg_village: 'assets/bg/village.webp', bg_sect: 'assets/bg/sect.webp',
  bg_dongfu: 'assets/bg/dongfu.webp', bg_wild: 'assets/bg/wild.webp', bg_realm: 'assets/bg/realm.webp',
};
const BG_POS = { title: '74% 40%', village: '52% 62%', sect: '58% 50%', dongfu: '50% 62%', wild: '40% 55%', realm: '50% 55%' };
// 施法立繪：assets/cast/<技能id>.webp；沒有圖的技能不顯示切入演出
const CAST_IMG = { jianqi: 'assets/cast/jianqi.webp', leifa: 'assets/cast/leifa.webp', huti: 'assets/cast/huti.webp', wanjian: 'assets/cast/wanjian.webp', yujian: 'assets/cast/yujian.webp', jianyi: 'assets/cast/jianyi.webp' };
const W_IMG = (id) => `assets/weapon/${id}.webp`;
const NPC_IMG = (key) => `assets/npc/${key}.webp`;
// 兵器圖示：階級以顏色與邊框區分
const wVars = (w) => `--c:${WTIERS[w.tier].color};--e:${WTIERS[w.tier].edge};--r:${w.rot || 0}deg`;
const gImg = (g) => (g.type ? FB_IMG(g) : W_IMG(g.id));   // 兵器或法寶（鐘鏡塔）的圖
const wFrame = (w, cls = '') => `<span class="wframe t${w.tier} ${w.type ? 'fb' : ''} ${cls}" style="${wVars(w)}"><img src="${gImg(w)}" alt="${w.name}"></span>`;
// 主角佩劍立繪：持劍（法寶頁）、背劍（劇情）。座標為圖內比例，用來把劍光疊在劍身與劍柄上
const HERO_SWORD = {
  hold: { img: 'assets/hero/hold_sword.webp', ar: 575 / 1093, blade: [0.264, 0.549, 0.013, 0.91] },
  back: { img: 'assets/hero/back_sword.webp', ar: 461 / 1084, hilt: [0.8, 0.11] },
  sit: { img: 'assets/hero/meditate_sword.webp', ar: 759 / 861, blade: [0.035, 0.58, 0.91, 0.665] },        // 打坐，劍橫膝上
  sitBack: { img: 'assets/hero/meditate_backsword.webp', ar: 612 / 934, hilt: [0.76, 0.12] },           // 打坐背劍（備用）
  bhold: { img: 'assets/hero/battle_hold.webp', ar: 768 / 1078, blade: [0.72, 0.55, 0.995, 0.8] },       // 戰鬥背影持劍
  bstance: { img: 'assets/hero/battle_stance.webp', ar: 715 / 969, blade: [0.28, 0.22, 0.005, 0.267] }, // 戰鬥起手式
  bnitian: { img: 'assets/hero/hold_nitian.webp', ar: 747 / 1045, blade: [0.38, 0.45, 0.013, 0.895] },   // 持逆天劍正面（備用）
  blean: { img: 'assets/hero/battle_lean.webp', ar: 700 / 840, blade: [0.27, 0.32, 0.02, 0.8] },         // 戰鬥前傾持逆天劍（神器）
};
// 戰鬥立繪依主手兵器品階切換：[凡, 靈, 法寶, 仙, 神]；沒裝備時用凡階那組
const BATTLE_POSE = [
  { hold: 'bhold', stance: 'bstance' }, { hold: 'bhold', stance: 'bstance' }, { hold: 'bhold', stance: 'bstance' },
  { hold: 'bhold', stance: 'bstance' }, { hold: 'blean', stance: 'blean' },
];
// 凡～仙器目前沿用背影圖以程式前傾模擬；補上拿普通長劍的前傾圖後，把前四階換成新的 key 即可
const battlePose = (w) => BATTLE_POSE[w ? w.tier : 0];
// 兵器光效：階級越高越華麗（發光 → 粒子環繞 → 紫金雙光 → 赤金天象）
const wAura = (w) => {
  if (!w) return '';
  return `<div class="waura t${w.tier}" style="${wVars(w)}"><div class="wglow"></div></div>`;   // 繞身光點改由 Halo 的靈氣粒子負責
};
const heaven = (w) => (w && w.tier >= 4 ? '<div class="heaven"></div>' : '');
const heroArmed = (w, kind, cls = '') => {
  const H = HERO_SWORD[kind];
  let fx = '';
  if (w && H.blade) {
    const [x1, y1, x2, y2] = H.blade, dx = x2 - x1, dy = (y2 - y1) / H.ar;
    fx = `<i class="blade" style="left:${x1 * 100}%;top:${y1 * 100}%;width:${Math.hypot(dx, dy) * 100}%;transform:rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)"></i>`;
  }
  if (w && H.hilt) fx = `<i class="hilt" style="left:${H.hilt[0] * 100}%;top:${H.hilt[1] * 100}%"></i>`;
  return `<div class="hfig ${kind} ${cls} ${w ? 't' + w.tier : ''}" style="aspect-ratio:${H.ar};${w ? wVars(w) : ''}">${wAura(w)}<img src="${H.img}" alt="${HERO_NAME}">${fx}</div>`;
};
// 靈石：全遊戲共用同一個圖示元件（HUD、抽卡、商店、戰鬥獎勵、背包、提示）
const STONE_IMG = 'assets/ui/stone.webp';
const stoneIco = () => `<img class="stone-ico" src="${STONE_IMG}" alt="靈石">`;
const stoneAmt = (n, sign = '') => `<span class="stone-amt">${stoneIco()}<b>${sign}${typeof n === 'number' ? U.fmt(n) : n}</b></span>`;
const escHtml = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
// 純文字裡的「靈石 +120」「靈石 1800」換成圖示＋數字
const stoneText = (t) => escHtml(t).replace(/靈石\s*([+＋\-−]?)\s*([\d,.]+[萬億]?)/g, (_, sg, n) => stoneAmt(n, sg));
const ico = (id) => id === 'stone' ? `<i class="ico img">${stoneIco()}</i>` : `<i class="ico" style="--c:${ITEMS[id].color}">${{ scroll: '卷', ore: '鐵', star: '砂' }[id] || (ITEMS[id].pill ? '丹' : '草')}</i>`;
// 兵器展示框：玉框蓮台底座圖當外框，仙劍放在框中央緩慢旋轉、上下浮動；普通品階只有柔光，神器加電光粒子與外圈光暈
// 框內空洞位置（圖內比例）：左右 26%～74%，上下 14%～74%
const CASE_IMG = 'assets/ui/case_frame.webp';
const wCase = (w, o) => {
  const T = WTIERS[w.tier];
  if (w.type) {   // 法寶：單一加成
    const F = FB_TYPES[w.type], v = o ? S.fStat(w.id) : w.val;
    return `<div class="wcase t${w.tier} fb" style="${wVars(w)}">
    <div class="wc-halo"></div>
    <div class="wc-in"><i class="wc-glow"></i><div class="wc-spin"><img src="${gImg(w)}" alt="${w.name}"></div></div>
    ${w.tier >= 4 ? `<canvas class="wc-cv" data-t="${w.tier}" data-c="${T.color}" data-e="${T.edge}"></canvas>` : ''}
    <img class="wc-frame" src="${CASE_IMG}" alt="">
  </div>
  <div class="wc-plate" style="--c:${T.color};--e:${T.edge}"><b>${w.name}${o && o.lv ? ' +' + o.lv : ''}</b><i>${T.name}・${F.name}${o && o.brk ? `・${'一二三'[o.brk - 1]}重` : ''}</i></div>
  <div class="wc-stats one" style="--c:${T.color}"><span><small>${F.label}</small><b>+${v}${F.unit}</b></span></div>
  <p class="wc-fx">${w.desc}</p>`;
  }
  const st = o ? S.wStat(w.id) : { atk: w.atk, crit: w.crit, regen: w.regen };
  return `<div class="wcase t${w.tier}" style="${wVars(w)}">
    <div class="wc-halo"></div>
    <div class="wc-in"><i class="wc-glow"></i><div class="wc-spin"><img src="${W_IMG(w.id)}" alt="${w.name}"></div></div>
    ${w.tier >= 4 ? `<canvas class="wc-cv" data-t="${w.tier}" data-c="${T.color}" data-e="${T.edge}"></canvas>` : ''}
    <img class="wc-frame" src="${CASE_IMG}" alt="">
  </div>
  <div class="wc-plate" style="--c:${T.color};--e:${T.edge}"><b>${w.name}${o && o.lv ? ' +' + o.lv : ''}</b><i>${T.name}${o && o.brk ? `・${'一二三'[o.brk - 1]}重` : ''}</i></div>
  <div class="wc-stats" style="--c:${T.color}"><span><small>攻擊</small><b>${st.atk}</b></span><span><small>暴擊</small><b>${st.crit}%</b></span><span><small>回靈</small><b>${st.regen}</b></span></div>
  ${w.fx ? `<p class="wc-fx" style="--c:${T.color}"><b>${w.fxName}</b>${w.fxDesc}</p>` : `<p class="wc-fx">${w.desc}</p>`}`;
};
// 抽中素材：依「類型＋品階」讀圖 assets/loot/<類型>_t<品階>.webp（類型：art 功法、scroll 殘卷）；兵器用兵器圖
// 沒有該品階的圖就用同類型凡階圖加品階濾鏡；凡階圖也載入失敗時換成內建卷軸 SVG，不會退回白球
const LOOT_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160"><rect x="30" y="18" width="60" height="124" fill="#e9dcb8" stroke="#7a5a2e" stroke-width="3"/><rect x="20" y="10" width="80" height="12" rx="6" fill="#6b4421"/><rect x="20" y="138" width="80" height="12" rx="6" fill="#6b4421"/><path d="M60 40v70M48 56h24M50 84h20" stroke="#3a2410" stroke-width="5" stroke-linecap="round"/></svg>');
const lootImg = (r) => {
  if (r.type === 'f') { const f = FABAO.find((x) => x.id === r.id); return `<img class="loot t${r.tier}" src="${FB_IMG(f)}" data-fb="${LOOT_SVG}" alt="${f.name}">`; }
  if (r.type === 'w') { const w = WEAPONS.find((x) => x.id === r.id); return `<span class="loot-w" style="${wVars(w)}"><img class="loot t${r.tier}" src="${W_IMG(w.id)}" data-fb="${LOOT_SVG}" alt="${w.name}"></span>`; }
  // 殘卷各品階共用同一張破卷（只加品階光暈）；功法依品階用不同卷軸
  if (r.type !== 'art') return `<img class="loot loot-glow t${r.tier}" src="assets/loot/scroll_t0.webp" data-fb="${LOOT_SVG}" alt="${r.base || r.name}">`;
  const type = 'art', own = `assets/loot/${type}_t${r.tier}.webp`, base = `assets/loot/${type}_t0.webp`;
  const exact = r.tier === 0 || Knock.has(own);
  return `<img class="loot ${exact ? '' : 'loot-fb'} t${r.tier}" src="${exact ? own : base}" data-fb="${exact && r.tier ? base : LOOT_SVG}" alt="${r.base || r.name}">`;
};
const wCaseFx = () => requestAnimationFrame(() => document.querySelectorAll('#mBody .wc-cv').forEach((cv) => Showcase.start(cv, +cv.dataset.t, cv.dataset.c, cv.dataset.e)));

const UI = {
  tab: 'home', bgFront: 'A',

  // 背景淡入切換
  setBg(name, grade) {
    const next = this.bgFront === 'A' ? 'B' : 'A', el = $('#bg' + next), old = $('#bg' + this.bgFront);
    const url = `url(${IMG_SRC['bg_' + name]})`;
    if (old.style.backgroundImage === url && old.dataset.grade === (grade || '')) return;
    el.style.backgroundImage = url; el.style.backgroundPosition = BG_POS[name] || 'center';
    el.className = 'bg' + (grade ? ' grade-' + grade : ''); el.dataset.grade = grade || '';
    el.style.opacity = 1; old.style.opacity = 0; this.bgFront = next;
  },
  scene(html) { $('#sceneContent').innerHTML = html; },
  controls(html) { $('#ctrlContent').innerHTML = html; $('#ctrlContent').scrollTop = 0; },
  mode(m) { FX.cranesOn = m === 'title'; const a = $('#app'); a.classList.toggle('title-mode', m === 'title'); a.classList.toggle('story-mode', m === 'story'); requestAnimationFrame(() => FX.resize()); },

  toast(msg, color) {
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = stoneText(msg); if (color) el.style.color = color;
    const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2300); setTimeout(() => el.remove(), 2900);
  },
  banner(title, sub) {
    document.querySelectorAll('#scene .banner:not(.static)').forEach((b) => b.remove());
    const el = document.createElement('div'); el.className = 'banner'; el.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
    $('#scene').appendChild(el); setTimeout(() => el.remove(), 3500);
  },
  modal(title, html, binds = {}) {
    $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#modal').classList.remove('hidden'); Audio2.play('page');
    for (const [sel, fn] of Object.entries(binds)) document.querySelectorAll('#mBody ' + sel).forEach((el) => (el.onclick = () => fn(el)));
  },
  close() { $('#modal').classList.add('hidden'); },
  fade(on) { $('#fade').classList.toggle('on', on); return U.wait(460); },

  hud() {
    const d = S.d;
    $('#hudSeal').textContent = REALMS[Math.floor(d.lv / 3)][0];
    $('#hudLv').textContent = lvName(d.lv);
    $('#hudRoot').textContent = d.root ? `${ROOTS[d.root].name}（${d.grade}品）・戰力 ${U.fmt(S.stats().power)}` : '';
    $('#hudStone').textContent = U.fmt(d.inv.stone || 0);
    const g = document.querySelector('#nav button[data-tab="gear"]'); if (g) g.classList.toggle('badge', !!d.root && (S.questsReady() > 0 || (!!d.freshW && d.wslot[1] === d.freshW)));
  },
  navLock() {
    const joined = !!S.d.root;
    document.querySelectorAll('#nav button').forEach((b) => { b.classList.toggle('on', b.dataset.tab === this.tab); b.classList.toggle('locked', !joined && b.dataset.tab !== 'home'); });
  },
  go(tab) {
    if (Battle.on) return;
    this.tab = tab; this.navLock();
    $('#app').classList.toggle('tall', tab !== 'home'); $('#app').classList.toggle('fit', tab === 'draw');   // 機緣頁面板依內容高度，其餘給光陣 $('#app').classList.remove('fighting'); FX.clear(); FX.stormT = 0; FX.ambient = 'qi';
    ({ home: () => this.home(), map: () => this.map(), alch: () => this.alch(), arts: () => this.arts(), gear: () => this.gear(), draw: () => this.draw() }[tab] || (() => this.home()))();
    this.hud();
  },

  // ───────── 洞府 ─────────
  home() {
    Audio2.setMood('sect');
    this.setBg('dongfu', '');
    this.scene(`${heaven(S.wTop())}<div class="hero-stage sit">${S.wTop() ? heroArmed(S.wTop(), 'sit') : `<img src="${IMG_SRC.hero_meditate}" alt="${HERO_NAME}打坐">`}</div>`);
    Halo.mount('sit', '.hero-stage.sit > *');   // 腳下法陣＋靈氣絲帶，顏色隨境界
    this.controls(`<div class="cult">
      <div class="cult-head"><h2 id="hLv"></h2><span id="hRate"></span></div>
      <div class="bar xp"><i id="hBar"></i><span id="hTxt"></span></div>
      <div class="stats-line" id="hStats"></div>
      <div class="primary-zone" id="hAct"></div>
      <p class="note" id="hTip"></p></div>`);
    this.homeRefresh(true);
  },
  homeRefresh(force) {
    if (this.tab !== 'home' || Battle.on || !$('#hBar')) return;
    const d = S.d, need = S.need(), full = S.full(), st = S.stats();
    $('#hLv').textContent = lvName(d.lv);
    $('#hRate').textContent = d.root ? `修為 +${S.rate().toFixed(1)}／息` : '尚未踏入仙途';
    $('#hBar').style.width = (100 * Math.min(1, d.exp / need)).toFixed(2) + '%';
    $('#hTxt').textContent = `${U.fmt(d.exp)} / ${U.fmt(need)}`;
    if (force || this._full !== full || this._lv !== d.lv) {
      this._full = full; this._lv = d.lv;
      $('#hStats').innerHTML = [['氣血', st.hp], ['攻擊', st.atk], ['防禦', st.def], ['靈力', st.mp]].map(([k, v]) => `<div><b>${U.fmt(v)}</b>${k}</div>`).join('');
      const pills = ['p_qi'].filter((p) => S.has(p));
      // 每個畫面只有一顆朱紅主印：修為滿時是「突破」，平時是「歷練」
      const canBreak = full && d.lv < MAX_LV;
      $('#hAct').innerHTML = canBreak
        ? `<button class="seal glow" id="bBreak">突破<small>${isMajor(d.lv) ? '大境界・引天劫' : '衝擊瓶頸'}</small></button><button class="seal sm ghost" id="bMap">歷練</button>`
        : `<button class="seal" id="bMap">歷練<small>斬妖得修為與靈石</small></button>${S.has('p_qi') ? `<button class="seal sm ghost" id="bQi">聚氣<small>×${d.inv.p_qi}</small></button>` : ''}`;
      const b = $('#bBreak'); if (b) b.onclick = () => this.breakModal();
      const q = $('#bQi'); if (q) q.onclick = () => { const r = S.usePill('p_qi'); if (r === true) { this.toast('丹藥化開，修為大進', '#9fe8ff'); FX.converge(FX.w / 2, FX.h * 0.6, 'rgba(159,232,255,0.9)', 26, 220, 1); Audio2.play('qi'); this.homeRefresh(true); this.hud(); } else if (r) this.toast(r); };
      $('#bMap').onclick = () => this.go('map');
      $('#hTip').textContent = full ? (d.lv >= MAX_LV ? '已臻此界之巔。' : '修為已滿，靈氣在丹田翻湧。') : '洞府中靈氣自行運轉，離線時也會累積（最多八個時辰）。';
    }
  },

  breakModal() {
    const d = S.d, major = isMajor(d.lv), use = { break: false, zhuji: false };
    const render = () => {
      const rate = Math.round(S.breakRate(use) * 100);
      this.modal(major ? '渡劫' : '突破', `
        <p class="big">${lvName(d.lv)} → ${lvName(d.lv + 1)}</p>
        <p class="note" style="text-align:center">${major ? '大境界突破將引動天劫，失敗會跌落一個小境界並散去修為。' : '衝擊小境界瓶頸，失敗會跌落一個小境界並散去修為。'}</p>
        <div class="list">
          <div class="li">${ico('p_break')}<div><h4>破障丹<em>持有 ${d.inv.p_break || 0}</em></h4><p>成功率 +15%</p></div><button class="seal sm ${use.break ? '' : 'ghost'}" data-p="break" ${S.has('p_break') ? '' : 'disabled'}>${use.break ? '已服' : '服用'}</button></div>
          ${major ? `<div class="li">${ico('p_zhuji')}<div><h4>築基丹<em>持有 ${d.inv.p_zhuji || 0}</em></h4><p>大境界成功率 +30%</p></div><button class="seal sm ${use.zhuji ? '' : 'ghost'}" data-p="zhuji" ${S.has('p_zhuji') ? '' : 'disabled'}>${use.zhuji ? '已服' : '服用'}</button></div>` : ''}
        </div>
        <p class="big" style="color:#ffe7a0">成功率 ${rate}%</p>
        <div class="row center"><button class="seal" id="mGo">${major ? '渡劫' : '突破'}</button><button class="seal ghost sm" id="mNo">稍後</button></div>`,
        { '[data-p]': (el) => { use[el.dataset.p] = !use[el.dataset.p]; render(); }, '#mGo': () => { this.close(); Story.breakShow(use); }, '#mNo': () => this.close() });
    };
    render();
  },

  // ───────── 歷練（地圖） ─────────
  map() {
    Audio2.setMood('wild');
    this.setBg('title', 'dim');
    this.scene('');
    const rows = REGIONS.map((R) => {
      const open = S.d.unlocked[R.id], n = R.stages.filter((_, i) => S.d.cleared[`${R.id}-${i}`]).length;
      const extra = R.daily ? `　今日剩 ${S.dailyLeft()} 次` : '';
      return `<button class="region ${open ? '' : 'locked'}" data-r="${R.id}" style="background-image:url(${IMG_SRC['bg_' + R.bg]});background-position:${BG_POS[R.bg]}"><h4>${R.name}</h4><p>${R.sub}</p><span class="prog">${n} / ${R.stages.length} 關${extra}</span></button>`;
    }).join('');
    this.controls(`<div class="sec-title">歷練</div>${rows}`);
    document.querySelectorAll('.region').forEach((b) => (b.onclick = () => this.stages(b.dataset.r)));
  },
  stages(rid) {
    const R = REGIONS.find((r) => r.id === rid);
    Audio2.setMood(R.mood);
    this.setBg(R.bg, R.grade);
    this.scene(`<div class="banner static" style="animation:none;top:38%"><b style="font-size:clamp(34px,10vw,58px)">${R.name}</b><span>${R.sub}</span></div>`);
    const left = R.daily ? S.dailyLeft() : null;
    const rows = R.stages.map((st, i) => {
      const key = `${rid}-${i}`, done = S.d.cleared[key], open = i === 0 || S.d.cleared[`${rid}-${i - 1}`];
      const lastBoss = st.waves.some((w) => MONSTERS[w.replace('*', '')].boss);
      const foes = [...new Set(st.waves.map((w) => MONSTERS[w.replace('*', '')].name))].join('、');
      return `<div class="li ${open ? '' : 'locked'} ${done ? 'done' : ''}"><i class="ico" style="--c:${lastBoss ? '#ff6a6a' : '#d8c48a'}">${i + 1}</i><div><h4>${st.name}</h4><p>${foes}<br>建議 ${lvName(Math.min(MAX_LV, Math.round(st.p)))}</p></div>
        <button class="seal sm ${done ? 'ghost' : ''}" data-i="${i}" ${open && (left === null || left > 0) ? '' : 'disabled'}>${done ? '再戰' : '挑戰'}</button></div>`;
    }).join('');
    this.controls(`<div class="row spread"><div class="sec-title" style="flex:1">${R.name}</div><button class="seal sm ghost" id="sBack">返回</button></div>
      ${R.daily ? `<p class="note">秘境靈氣紊亂，每日僅能進入三次（今日剩 ${left} 次），掉落紫雷藤、功法殘卷與稀有法寶。</p>` : ''}
      <div class="list">${rows}</div>`);
    $('#sBack').onclick = () => this.map();
    document.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => Battle.start(rid, +b.dataset.i)));
  },

  // ───────── 丹房 ─────────
  alch() {
    Audio2.setMood('sect');
    this.setBg('sect', 'dim');
    // 仙氣三層：後層仙霧（三張不同速度、縮放）、地霧；中層靈氣絲帶螺旋上升；前層 canvas 光粒與符文
    // 仙霧：爐後左右各一份（右側鏡像），兩組錯開循環
    const mist = ['l a', 'r a', 'l b', 'r b'].map((c) => `<img class="xw ${c}" src="assets/fx/xianwu.webp" alt="">`).join('');
    this.scene(`<div class="furnace" id="furn">
      <div class="fz-back">${mist}<i class="fz-ring"></i><i class="fz-ground"></i><i class="fz-ground g2"></i></div>
      <i class="fz-fire"></i><img class="fz idle" src="assets/alch/furnace_idle.webp" alt="丹爐"><img class="fz ok" src="assets/alch/furnace_ok.webp" alt=""><img class="fz fail" src="assets/alch/furnace_fail.webp" alt="">
      <div class="fz-plume"><img class="pl a" src="assets/fx/xianwu.webp" alt=""><img class="pl b" src="assets/fx/xianwu.webp" alt=""><i class="smk"></i><i class="smk b"></i></div><i class="fz-floor"></i>
      <i class="fz-mouth"></i><i class="fz-pill"></i><i class="fz-smoke"></i><i class="fz-smoke s2"></i><i class="fz-burst"></i>
      <canvas class="fz-front"></canvas></div>`);
    requestAnimationFrame(() => { const cv = document.querySelector('#furn .fz-front'); if (cv) Aura.start(cv); });
    const herbs = ['herb_q', 'herb_c', 'herb_b', 'herb_l'].map((h) => `<span class="mat">${ITEMS[h].name} ${S.d.inv[h] || 0}</span>`).join('');
    const rows = RECIPES.map((r, i) => {
      const it = ITEMS[r.out], mats = Object.entries(r.need).map(([k, n]) => `<span class="mat ${S.has(k, n) ? '' : 'lack'}">${ITEMS[k].name} ${S.d.inv[k] || 0}/${n}</span>`).join('') + `<span class="mat ${S.has('stone', r.stone) ? '' : 'lack'}">${stoneAmt(r.stone)}</span>`;
      return `<div class="li">${ico(r.out)}<div><h4>${it.name}<em>成丹 ${Math.round(S.alchRate(r) * 100)}%・持有 ${S.d.inv[r.out] || 0}</em></h4><p>${it.desc}</p><div>${mats}</div></div><button class="seal sm" data-r="${i}" ${S.canCraft(r) ? '' : 'disabled'}>煉</button></div>`;
    }).join('');
    this.controls(`<div class="sec-title">丹房</div><p class="note">靈草：${herbs}</p><div class="list">${rows}</div>`);
    document.querySelectorAll('[data-r]').forEach((b) => (b.onclick = async () => {
      const r = RECIPES[+b.dataset.r];
      document.querySelectorAll('[data-r]').forEach((x) => (x.disabled = true));
      // 煉丹：火勢變旺、爐身震動 → 成丹（成功圖、丹藥升起、金光）或炸爐（失敗圖、黑煙）
      const furn = $('#furn'), fr = furn.getBoundingClientRect(), s0 = $('#scene').getBoundingClientRect(), mx = fr.left - s0.left + fr.width / 2, my = fr.top - s0.top + fr.height * 0.42;
      furn.classList.add('brewing'); Aura.set('brew'); Audio2.play('craft');   // 音效：爐火
      FX.converge(mx, my, 'rgba(255,180,90,0.9)', 30, 200, r.time * 0.4);
      await U.wait(r.time * 400);
      const ok = S.craft(r);
      furn.classList.remove('brewing'); furn.classList.add(ok ? 'done-ok' : 'done-fail'); Aura.set(ok ? 'ok' : 'fail');
      if (ok) {
        furn.querySelector('.fz-pill').style.setProperty('--c', ITEMS[r.out].color);
        Audio2.play('up'); FX.burst(mx, my - 40, '#ffe7a0', 40, 260, 3, 1.1); FX.flash = 0.35;
        this.toast(`成丹——${ITEMS[r.out].name}`, '#ffe7a0');
      } else {
        Audio2.play('fail'); FX.shake($('#scene'), 8);   // 音效：炸爐
        this.toast('爐火失控，靈草化為飛灰', '#ff9a9a');
      }
      this.hud();
      await U.wait(1700);
      if (this.tab === 'alch') this.alch();
    }));
  },

  // ───────── 功法 ─────────
  arts() {
    Audio2.setMood('sect');
    this.setBg('sect', 'dim');
    const best = ['wanjian', 'leifa', 'huti', 'jianqi'].find((id) => S.skillOpen(SKILLS.find((k) => k.id === id))) || 'jianqi';
    this.scene(`<div class="hero-stage cast"><img src="${CAST_IMG[best]}" alt="${HERO_NAME}施展${SKILLS.find((k) => k.id === best).name}"></div>`);
    const rows = ARTS.map((A) => {
      const st = S.artState(A), reqOk = S.d.lv >= A.req * 3;
      const cost = st.learn ? `功法殘卷 ×${A.scroll}${A.req ? `・需 ${REALMS[A.req]}` : ''}` : st.lv >= ART_MAX ? '已臻圓滿' : `${stoneAmt(artCost(st.lv))}`;
      return `<div class="li ${reqOk || st.lv ? '' : 'locked'}"><i class="ico" style="--c:${st.lv ? '#ffe7a0' : '#7a8692'}">${A.name[0]}</i><div><h4>${A.name}<em>${st.lv ? `第 ${st.lv} 層` : '未習得'}</em></h4><p>${A.per}</p><span class="mat ${st.can ? '' : 'lack'}">${cost}</span></div>
        <button class="seal sm ${st.learn ? '' : 'ghost'}" data-a="${A.id}" ${st.can ? '' : 'disabled'}>${st.learn ? '參悟' : '精進'}</button></div>`;
    }).join('');
    this.controls(`<div class="sec-title">功法</div><p class="note">功法殘卷 ${S.d.inv.scroll || 0}　${stoneAmt(S.d.inv.stone || 0)}</p><div class="list">${rows}</div>`);
    document.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const A = ARTS.find((x) => x.id === b.dataset.a), learn = S.artLv(A.id) === 0;
      if (S.upArt(A)) { Audio2.play('up'); FX.array(FX.w / 2, FX.h * 0.92, 120, 'rgba(255,231,160,0.8)', 1.2); this.toast(learn ? `參悟「${A.name}」` : `${A.name}精進至第 ${S.artLv(A.id)} 層`, '#ffe7a0'); this.arts(); this.hud(); }
    }));
  },

  // ───────── 法寶（兵器）：兵器／煉器／商店／任務 ─────────
  gtab: 'wpn',
  gear(sub) {
    if (sub) this.gtab = sub;
    Audio2.setMood('sect');
    this.setBg('sect', 'dim');
    const top = S.wTop(), nitian = S.d.wslot[0] === 'nitian', key = nitian ? 'nitian' : top ? 'hold' : 'front';
    const fig = nitian ? `<div class="hfig nitian" style="aspect-ratio:${747 / 1045}">${wAura(WEAPONS.find((w) => w.id === 'nitian'))}<img src="assets/hero/hold_nitian.webp" alt="${HERO_NAME}持逆天劍"><i class="nt-bolt"></i></div>`
      : top ? heroArmed(top, 'hold') : `<img src="${IMG_SRC.hero_front}" alt="${HERO_NAME}">`;
    this.scene(`${heaven(top)}<div class="hero-stage gear ${this._heroKey && this._heroKey !== key ? 'swap' : ''}">${fig}</div>`);
    if (key === 'nitian' && this._heroKey && this._heroKey !== key) { FX.flash = 0.6; Audio2.play('thunder'); }   // 神器出鞘
    this._heroKey = key;
    const mw = S.wMain();
    Halo.mount('stand', '.hero-stage.gear > *', mw ? { c: WTIERS[mw.tier].color, e: WTIERS[mw.tier].edge } : null);   // 背後多層光環，顏色隨主手品階
    const ready = S.questsReady();
    const tabs = [['wpn', '兵器'], ['fb', '法寶'], ['forge', '煉器'], ['shop', '商店'], ['quest', '任務']].map(([k, n]) => `<button class="${this.gtab === k ? 'on' : ''}" data-g="${k}">${n}${k === 'quest' && ready ? `<i class="pip">${ready}</i>` : ''}</button>`).join('');
    const body = { wpn: () => this.gearWpn(), fb: () => this.gearFb(), forge: () => this.gearForge(), shop: () => this.gearShop(), quest: () => this.gearQuest() }[this.gtab]();
    this.controls(`<div class="sec-title">法寶</div><div class="tabs">${tabs}</div>${body}`);
    document.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { Audio2.play('page'); this.gear(b.dataset.g); }));
    document.querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => this.wDetail(b.dataset.w)));
    document.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { const it = SHOP[+b.dataset.buy]; if (S.buy(it)) { Audio2.play('pickup'); if (it.w) this.wShow(it.w, '購得'); else this.toast(`購得${ITEMS[it.item].name} ×${it.n}`, '#ffe7a0'); this.gear(); this.hud(); } }));
    document.querySelectorAll('[data-fg]').forEach((b) => (b.onclick = () => this.doForge(FORGE[+b.dataset.fg])));
    const sw = $('#wSwap'); if (sw) sw.onclick = () => { S.wSwap(); Audio2.play('pickup'); this.toast(`主手換為${WEAPONS.find((w) => w.id === S.d.wslot[0]).name}`, WTIERS[S.wTop().tier].color); this.gear(); this.hud(); };
    document.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      const q = QUESTS.find((x) => x.id === b.dataset.q), notes = S.claim(q); if (!notes) return;
      Audio2.play('up'); notes.forEach((n) => this.toast(n));
      if (q.reward.w && !notes.length) this.wShow(q.reward.w, '任務獎勵'); else this.toast(`領取「${q.name}」獎勵`, '#ffe7a0');
      this.gear(); this.hud();
    }));
  },
  gearWpn() {
    const d = S.d;
    const slots = W_SLOTS.map((n, i) => {
      const id = d.weapons[d.wslot[i]] ? d.wslot[i] : null, w = id && WEAPONS.find((x) => x.id === id), o = id && d.weapons[id];
      const fresh = i === 1 && d.freshW === id;
      if (w && fresh) return `<button class="wslot fresh" data-w="${id}" style="--c:${WTIERS[w.tier].color}">${wFrame(w)}<span><small>${n}・新得</small><b style="color:${WTIERS[w.tier].color}">${w.name}</b></span></button>`;
      return w ? `<button class="wslot" data-w="${id}">${wFrame(w)}<span><small>${n}</small><b style="color:${WTIERS[w.tier].color}">${w.name}${o.lv ? ' +' + o.lv : ''}</b></span></button>`
        : `<div class="wslot empty"><span class="wframe"></span><span><small>${n}</small><b>空</b></span></div>`;
    }).join('');
    const sum = `攻擊 +${S.wSum('atk')}　暴擊 +${Math.round(S.wSum('crit') * 10) / 10}%　回靈 +${Math.round(S.wSum('regen') * 10) / 10}／息`;
    const sk = SKILLS.filter((k) => k.wt !== undefined).map((k) => `<span class="mat ${S.skillOpen(k) ? '' : 'lack'}">${k.name === '御劍' ? '御劍術' : k.name}・${S.skillOpen(k) ? '已可施展' : `需${WTIERS[k.wt].name}`}</span>`).join('');
    const rows = WEAPONS.map((w) => {
      const o = d.weapons[w.id], T = WTIERS[w.tier];
      if (!o) return `<div class="li locked">${wFrame(w, 'unknown')}<div><h4>${w.name}<i class="tier" style="color:${T.color}">${T.name}</i></h4><p>取得：${W_SOURCE[w.id]}</p></div><span></span></div>`;
      const st = S.wStat(w.id), slot = d.wslot.indexOf(w.id);
      return `<div class="li ${d.freshW === w.id ? 'fresh' : ''}" style="--c:${T.color}">${wFrame(w)}<div><h4 style="color:${T.color}">${w.name}${o.lv ? ' +' + o.lv : ''}<i class="tier">${T.name}${o.brk ? `・${'一二三'[o.brk - 1]}重` : ''}</i></h4><p>攻擊 ${st.atk}・暴擊 ${st.crit}%・回靈 ${st.regen}${w.fx ? `<br><b class="wfx" style="color:${T.color}">${w.fxName}</b>　${w.fxDesc}` : ''}${slot >= 0 ? `<br>${W_SLOTS[slot]}佩戴中` : ''}</p></div>
        <button class="seal sm ${slot >= 0 ? 'ghost' : ''}" data-w="${w.id}">養成</button></div>`;
    }).join('');
    const fw = d.freshW && d.wslot[1] === d.freshW && WEAPONS.find((x) => x.id === d.freshW);
    const bar = fw ? `<div class="fresh-bar" style="--c:${WTIERS[fw.tier].color}"><p>新得<b>${fw.name}</b>已放入副手，主手仍是${WEAPONS.find((x) => x.id === d.wslot[0]).name}。</p><button class="seal sm" id="wSwap">與主手互換</button></div>` : '';
    return `<div class="wslots">${slots}</div>${bar}<p class="note">${sum}</p><div>${sk}</div><div class="list">${rows}</div>`;
  },
  // 法寶分頁：法寶欄（佩一件鐘、鏡或塔）＋十五件法寶
  gearFb() {
    const d = S.d, cur = S.fMain();
    const slot = cur ? `<button class="wslot" data-w="${cur.id}">${wFrame(cur)}<span><small>法寶欄</small><b style="color:${WTIERS[cur.tier].color}">${cur.name}${d.fabao[cur.id].lv ? ' +' + d.fabao[cur.id].lv : ''}</b></span></button>`
      : '<div class="wslot empty"><span class="wframe"></span><span><small>法寶欄</small><b>空</b></span></div>';
    const sum = cur ? `${FB_TYPES[cur.type].label} +${S.fStat(cur.id)}${FB_TYPES[cur.type].unit}` : '佩上一件鐘、鏡或塔：鐘加防禦、鏡加暴擊、塔加氣血';
    const rows = Object.keys(FB_TYPES).map((type) => FABAO.filter((f) => f.type === type).map((f) => {
      const o = d.fabao[f.id], T = WTIERS[f.tier], F = FB_TYPES[type];
      if (!o) return `<div class="li locked">${wFrame(f, 'unknown')}<div><h4>${f.name}<i class="tier" style="color:${T.color}">${T.name}</i></h4><p>${F.label} +${f.val}${F.unit}・取得：機緣・法寶池</p></div><span></span></div>`;
      const on = d.fslot === f.id;
      return `<div class="li" style="--c:${T.color}">${wFrame(f)}<div><h4 style="color:${T.color}">${f.name}${o.lv ? ' +' + o.lv : ''}<i class="tier">${T.name}${o.brk ? `・${'一二三'[o.brk - 1]}重` : ''}</i></h4><p>${F.label} +${S.fStat(f.id)}${F.unit}${on ? '<br>法寶欄佩戴中' : ''}</p></div>
        <button class="seal sm ${on ? 'ghost' : ''}" data-w="${f.id}">養成</button></div>`;
    }).join('')).join('');
    return `<div class="wslots one">${slot}</div><p class="note">${sum}</p><div class="list">${rows}</div>`;
  },
  gearForge() {
    const rows = FORGE.map((f, i) => {
      const w = WEAPONS.find((x) => x.id === f.w), owned = !!S.d.weapons[f.w];
      const mats = Object.entries(f.need).map(([k, n]) => `<span class="mat ${S.has(k, n) ? '' : 'lack'}">${ITEMS[k].name} ${S.d.inv[k] || 0}/${n}</span>`).join('') + `<span class="mat ${S.has('stone', f.stone) ? '' : 'lack'}">${stoneAmt(f.stone)}</span>`;
      return `<div class="li">${wFrame(w)}<div><h4 style="color:${WTIERS[w.tier].color}">${w.name}<i class="tier">${WTIERS[w.tier].name}</i><em>成器 ${Math.round(f.rate * 100)}%</em></h4><p>${w.desc}</p><div>${mats}</div></div>
        <button class="seal sm" data-fg="${i}" ${S.canForge(f) ? '' : 'disabled'}>${owned ? '已有' : '煉'}</button></div>`;
    }).join('');
    return `<p class="note">玄鐵：${S.d.inv.ore || 0}　星辰砂：${S.d.inv.star || 0}。煉器失敗會耗去材料。</p><div class="list">${rows}</div>`;
  },
  gearShop() {
    const rows = SHOP.map((it, i) => {
      const w = it.w && WEAPONS.find((x) => x.id === it.w), open = S.shopOpen(it), owned = w && S.d.weapons[w.id];
      const head = w ? `${wFrame(w)}<div><h4 style="color:${WTIERS[w.tier].color}">${w.name}<i class="tier">${WTIERS[w.tier].name}</i></h4><p>${w.desc}</p>` : `${ico(it.item)}<div><h4>${ITEMS[it.item].name} ×${it.n}</h4><p>${ITEMS[it.item].desc}</p>`;
      return `<div class="li ${open ? '' : 'locked'}">${head}<span class="mat ${S.has('stone', it.stone) ? '' : 'lack'}">${stoneAmt(it.stone)}${open ? '' : `・需${lvName(it.lv)}`}</span></div>
        <button class="seal sm" data-buy="${i}" ${open && !owned && S.has('stone', it.stone) ? '' : 'disabled'}>${owned ? '已有' : '換'}</button></div>`;
    }).join('');
    return `<p class="note">宗門執事以靈石兌換兵器與物資。</p><div class="list">${rows}</div>`;
  },
  gearQuest() {
    const rew = (r) => Object.entries(r).map(([k, n]) => k === 'w' ? `<span class="mat" style="color:${WTIERS[WEAPONS.find((w) => w.id === n).tier].color}">${WEAPONS.find((w) => w.id === n).name}</span>` : (k === 'stone' ? `<span class="mat">${stoneAmt(n)}</span>` : `<span class="mat">${ITEMS[k].name} ×${n}</span>`)).join('');
    const rows = QUESTS.map((q) => {
      const st = S.questState(q);
      return `<div class="li ${st === 'claimed' ? 'done' : ''}"><i class="ico" style="--c:${st === 'todo' ? '#7a8692' : '#ffe7a0'}">任</i><div><h4>${q.name}</h4><p>${q.desc}</p><div>${rew(q.reward)}</div></div>
        ${st === 'done' ? `<button class="seal sm" data-q="${q.id}">領取</button>` : `<span class="qstate">${st === 'claimed' ? '已領' : '未達成'}</span>`}</div>`;
    }).join('');
    return `<div class="list">${rows}</div>`;
  },
  async doForge(f) {
    const w = WEAPONS.find((x) => x.id === f.w);
    document.querySelectorAll('[data-fg]').forEach((x) => (x.disabled = true));
    Audio2.play('craft'); FX.converge(FX.w / 2, FX.h * 0.5, hexA(WTIERS[w.tier].color, 0.9), 34, 240, 1.2);
    await U.wait(1300);
    const ok = S.forge(f);
    if (ok) { Audio2.play('gong'); FX.burst(FX.w / 2, FX.h * 0.5, WTIERS[w.tier].color, 50, 300, 3, 1.2); this.wShow(w.id, '煉成'); }
    else { Audio2.play('fail'); FX.burst(FX.w / 2, FX.h * 0.5, 'rgba(120,120,130,0.8)', 30, 200, 4, 1); this.toast('爐溫失衡，兵胚崩裂', '#ff9a9a'); }
    this.gear(); this.hud();
  },
  // 得到兵器的展示卷軸
  wShow(id, how, onOk, okText = '收下') {
    const w = S.gDef(id), T = WTIERS[w.tier];
    this.modal(how, `${wCase(w, S.gOwn(id))}
      <div class="row center"><button class="seal" id="wsOk">${okText}</button></div>`, { '#wsOk': () => { this.close(); if (onOk) onOk(); } });
    wCaseFx();
    const sub = !w.type && S.subNotice(id); if (sub) setTimeout(() => this.toast(sub + '，可到法寶頁與主手互換', T.color), 300);
    if (w.tier >= 4) { FX.stormT = 1; FX.flash = 0.9; Audio2.play('thunder'); FX.shake($('#scene'), 10); setTimeout(() => (FX.stormT = 0), 2600); }
  },
  // 兵器養成：佩戴、強化（失敗率與保底）、突破
  wDetail(id) {
    const w = S.gDef(id), o = S.gOwn(id), T = WTIERS[w.tier], fb = !!w.type;
    if (!o) return;
    const cap = S.wCap(id), slot = fb ? -1 : S.d.wslot.indexOf(id), maxed = o.lv >= cap;
    const cost = wEnhCost(w, o.lv), rate = o.fail >= W_PITY ? 100 : Math.round(wEnhRate(o.lv) * 100);
    const brk = o.brk < W_BRK_MAX ? wBrkNeed(w, o.brk) : null;
    const brkMats = brk ? Object.entries(brk.need).map(([k, n]) => `<span class="mat ${S.has(k, n) ? '' : 'lack'}">${ITEMS[k].name} ${S.d.inv[k] || 0}/${n}</span>`).join('') + `<span class="mat ${S.has('stone', brk.stone) ? '' : 'lack'}">${stoneAmt(brk.stone)}</span>` : '';
    const eqBtns = fb ? (S.d.fslot === id ? '<button class="seal sm ghost" id="fUn">卸下法寶</button>' : '<button class="seal sm" id="fEq">佩於法寶欄</button>')
      : W_SLOTS.map((n, i) => slot === i ? `<button class="seal sm ghost" data-un="${i}">卸下${n}</button>` : `<button class="seal sm ghost" data-eqs="${i}">佩於${n}</button>`).join('');
    this.modal(w.name, `${wCase(w, o)}
      <p class="note" style="text-align:center;margin:2px 0 0">強化 +${o.lv}／${cap}</p>
      <div class="list">
        ${maxed ? (brk ? `<div class="li"><i class="ico" style="--c:${T.color}">破</i><div><h4>突破<em>強化上限 +10、屬性 +25%</em></h4><div>${brkMats}</div></div><button class="seal sm" id="wBrk" ${S.wCanBreak(id) ? '' : 'disabled'}>突破</button></div>` : '<p class="note" style="text-align:center">已臻圓滿。</p>')
          : `<div class="li"><i class="ico" style="--c:${T.color}">強</i><div><h4>強化<em>成功率 ${rate}%</em></h4><p>每級屬性 +8%。保底 ${Math.min(o.fail, W_PITY)}／${W_PITY}：連敗三次，下次必成。</p><span class="mat ${S.has('stone', cost) ? '' : 'lack'}">${stoneAmt(cost)}</span></div><button class="seal sm" id="wEnh" ${S.has('stone', cost) ? '' : 'disabled'}>強化</button></div>`}
      </div>
      <div class="row center">${eqBtns}</div>`, {
      '#wEnh': () => { const r = S.wEnhance(id); if (!r) return; if (r.ok) { Audio2.play('up'); this.toast(`${w.name}強化至 +${o.lv}${r.pity ? '（保底）' : ''}`, T.color); } else { Audio2.play('fail'); this.toast(`強化失敗（保底 ${Math.min(o.fail, W_PITY)}／${W_PITY}）`, '#ff9a9a'); } this.wDetail(id); this.gear(); this.hud(); },
      '#wBrk': () => { if (S.wBreak(id)) { Audio2.play('gong'); FX.pillar(FX.w / 2, FX.h, hexA(T.color, 0.5), 90, 2); this.toast(`${w.name}突破・${'一二三'[o.brk - 1]}重`, T.color); this.wDetail(id); this.gear(); this.hud(); } },
      '[data-eqs]': (el) => { S.wEquip(id, +el.dataset.eqs); Audio2.play('pickup'); this.close(); this.gear(); this.hud(); },
      '[data-un]': (el) => { S.wUnequip(+el.dataset.un); this.close(); this.gear(); this.hud(); },
      '#fEq': () => { S.fEquip(id); Audio2.play('pickup'); this.toast(`${w.name}佩於法寶欄`, T.color); this.close(); this.gear(); this.hud(); },
      '#fUn': () => { S.fUnequip(); this.close(); this.gear(); this.hud(); },
    });
    wCaseFx();
  },

  // ───────── 機緣（抽取）─────────
  gpool: 'wpn',
  draw(pool) {
    if (pool) this.gpool = pool;
    Audio2.setMood('sect'); this.setBg('sect', 'dim');
    const P = this.gpool, d = S.d, t = S.today(), G = GACHA, left = G.pity - S.pity(P);   // 讀當前這一池的保底計數
    this.scene(`<div class="gacha-ring" id="gRing"><img src="assets/fx/ring.webp" alt=""></div><i class="gacha-sky" id="gSky"></i>
      <div class="banner static" style="animation:none;top:12%"><b style="font-size:clamp(28px,8vw,46px)">${P === 'wpn' ? '法寶池' : '功法池'}</b><span>祈願光陣</span></div>`);
    const rates = WTIERS.map((T, i) => `<span class="mat" style="color:${T.color};border-color:${T.edge}">${T.name} ${Math.round(G.rates[i] * 1000) / 10}%</span>`).join('');
    const gives = P === 'art' ? '<p class="note">凡：殘卷×1　靈：殘卷×2　法寶：殘卷×4　仙：隨機功法 +1 層　神：萬劍歸宗 +1 層</p>' : '<p class="note">重複的兵器化為玄鐵與靈石（強化材料）。</p>';
    this.controls(`<div class="sec-title">機緣</div>
      <div class="tabs"><button class="${P === 'wpn' ? 'on' : ''}" data-gp="wpn">法寶池</button><button class="${P === 'art' ? 'on' : ''}" data-gp="art">功法池</button></div>
      <div class="pity"><span>保底</span><b>${left}</b><span>抽內必出仙階以上</span></div>
      <div class="pity-bar" style="--p:${(100 * (G.pity - left)) / G.pity}%"><i></i></div>
      <div class="gpeek"><small>本池神品</small>${(P === 'wpn' ? [...WEAPONS, ...FABAO].filter((g) => g.tier === 4).map((g) => wFrame(g))
        : [0, 1, 2, 3, 4].map((t) => `<span class="loot-sm" style="--c:${WTIERS[t].color}">${lootImg({ type: 'art', tier: t, base: '' })}</span>`)).join('')}</div>
      <div>${rates}</div>${gives}
      <div class="row center gacha-btns"><button class="seal ${t.free ? 'ghost' : ''}" id="g1">單抽<small>${t.free ? stoneAmt(G.cost) : '今日免費'}</small></button><button class="seal ${t.free ? '' : 'ghost'}" id="g10">十連<small>${stoneAmt(G.cost10)}・保底靈階</small></button></div>
      <div class="li"><i class="ico" style="--c:#9fe8d8">簽</i><div><h4>每日簽到</h4><p>${stoneAmt(G.sign(d.lv), '+')}（隨境界提高）</p></div><button class="seal sm ${t.sign ? 'ghost' : ''}" id="gSign" ${t.sign ? 'disabled' : ''}>${t.sign ? '已簽' : '簽到'}</button></div>
      <p class="note">機緣只消耗遊戲內靈石，靈石來自修煉、歷練、簽到與任務，沒有任何真實付費。</p>`);
    document.querySelectorAll('[data-gp]').forEach((b) => (b.onclick = () => { Audio2.play('page'); this.draw(b.dataset.gp); }));
    $('#gSign').onclick = () => { const n = S.sign(); if (n) { Audio2.play('pickup'); this.toast(`簽到成功，靈石 +${n}`, '#9fe8d8'); this.draw(); this.hud(); } };
    $('#g1').onclick = () => this.pull(1);
    $('#g10').onclick = () => this.pull(10);
  },
  async pull(n) {
    if (this._pulling) return;   // 演出期間鎖住，避免連點重複扣款
    const pool = this.gpool, free = n === 1 && !S.today().free, cost = S.drawCost(n);
    this._pulling = true; document.querySelectorAll('#g1,#g10').forEach((b) => (b.disabled = true));
    const res = S.draw(pool, n);
    if (!res) { this._pulling = false; document.querySelectorAll('#g1,#g10').forEach((b) => (b.disabled = false)); this.toast(`靈石不足：需要靈石 ${U.fmt(cost)}，現有靈石 ${U.fmt(S.d.inv.stone || 0)}`, '#ff9a9a'); return; }
    this.hud();
    if (!free) this.toast(`扣除靈石 −${U.fmt(cost)}`, '#9fe8d8');
    $('#controls').classList.add('busy'); $('#ctrlContent').style.pointerEvents = 'none'; $('#nav').style.pointerEvents = 'none';
    try { await Story.run(() => this.gachaShow(pool, res)); }
    finally {
      $('#app').classList.remove('gacha-show'); requestAnimationFrame(() => FX.resize());
      $('#scene').classList.remove('bt-white'); FX.clear(); FX.stormT = 0;
      $('#controls').classList.remove('busy'); $('#ctrlContent').style.pointerEvents = ''; $('#nav').style.pointerEvents = '';
      this._pulling = false;
    }
    this.gachaResults(res);
  },
  // 抽取演出：暗場淡入法寶室／功法閣 → 背景緩慢推近 → 靈氣光團從四面八方飛向中心匯聚 → 光團爆開 → 顯示結果
  // 匯聚時間：凡、靈約 1.5 秒；法寶、仙器約 2.5 秒；神器約 4 秒加全螢幕閃光。十連快速逐件認主，最後一次展示
  GS_DUR: [1500, 1500, 2500, 2500, 4000],
  async gachaShow(pool, res) {
    const wpn = pool === 'wpn', ten = res.length > 1;
    await this.fade(true);
    $('#app').classList.add('gacha-show'); requestAnimationFrame(() => FX.resize());   // 收起下方面板，全螢幕
    this.scene(`<div class="gs-hall ${pool}"><div class="gs-bg" style="background-image:url(assets/bg/gacha_${pool}.webp)"></div><i class="gs-dark"></i>
      <div class="gs-title">${wpn ? '法寶室' : '功法閣'}</div><div id="gsFly"></div>
      <div class="gs-orb" id="gsOrb"><img data-knock="assets/fx/qi_orb.webp" alt=""></div><div class="gs-reveal" id="gsRev"></div><div class="gs-count" id="gsCnt"></div></div>`);
    Knock.apply($('.gs-hall'));
    this.fade(false); Audio2.play('array');
    await Story.wait(900);
    const orb = $('#gsOrb'), sc = $('#scene'), fly = $('#gsFly');
    const at = () => { const r = orb.getBoundingClientRect(), s0 = sc.getBoundingClientRect(); return { x: r.left - s0.left + r.width / 2, y: r.top - s0.top + r.height / 2 }; };
    // 一團靈氣從畫面邊緣飛向中心
    const mote = (p, ms) => {
      const W = FX.w, H = FX.h, side = U.randi(0, 3), sx = side === 0 ? -40 : side === 1 ? W + 40 : U.rand(0, W), sy = side === 2 ? -40 : side === 3 ? H + 40 : U.rand(0, H);
      const u = Knock.url('assets/fx/qi_orb.webp'); if (!u) return;   // 去黑圖還沒好就只用粒子
      const el = document.createElement('img'); el.src = u; el.alt = ''; el.className = 'gs-mote'; fly.appendChild(el);
      const s = U.rand(0.35, 0.7), mx = (sx + p.x) / 2 + U.rand(-80, 80), my = (sy + p.y) / 2 + U.rand(-80, 80);
      el.animate([{ transform: `translate(${sx}px,${sy}px) scale(${s}) rotate(0deg)`, opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${mx}px,${my}px) scale(${s * 0.7}) rotate(200deg)`, offset: 0.55 }, { transform: `translate(${p.x}px,${p.y}px) scale(.08) rotate(420deg)`, opacity: 0.2 }], { duration: ms, easing: 'cubic-bezier(.5,0,.9,.5)' }).onfinish = () => el.remove();
    };
    for (let i = 0; i < res.length && !Story.skip; i++) {
      const r = res[i], T = WTIERS[r.tier], p = at();
      const dur = ten ? (r.tier >= 4 ? 1600 : 380 + r.tier * 120) : this.GS_DUR[r.tier];
      $('#gsCnt').textContent = ten ? `第 ${i + 1} 件・共 ${res.length} 件` : '';
      $('#gsRev').innerHTML = ''; orb.className = 'gs-orb on'; orb.style.setProperty('--c', '#e8f4ff'); orb.style.setProperty('--k', 0);
      Audio2.play('qi');
      const t0 = Date.now(); let lastM = 0;
      while (!Story.skip) {
        const el = Date.now() - t0, k = Math.min(1, el / dur);
        if (el - lastM > (ten ? 110 : 170)) { lastM = el; mote(p, ten ? 600 : 900); }
        FX.converge(p.x, p.y, k > 0.6 ? hexA(T.color, 0.95) : 'rgba(232,244,255,0.9)', 2 + r.tier, Math.hypot(FX.w, FX.h) * 0.6, 0.8);
        orb.style.setProperty('--k', k.toFixed(3)); if (k > 0.6) orb.style.setProperty('--c', T.color);
        if (k >= 1) break;
        await Story.wait(70);
      }
      if (Story.skip) break;
      orb.className = 'gs-orb pop';
      FX.burst(p.x, p.y, T.color, 30 + r.tier * 16, 220 + r.tier * 60, 3 + r.tier * 0.6, 1.1); FX.ring(p.x, p.y, T.color, 20, 160 + r.tier * 60, 0.7, 4 + r.tier);
      FX.shake(sc, 4 + r.tier * 3); Audio2.play(r.tier >= 3 ? 'thunder' : 'gong');
      if (r.tier >= 4) { FX.flash = 1; sc.classList.remove('bt-white'); void sc.offsetWidth; sc.classList.add('bt-white'); }
      else if (r.tier >= 3) FX.flash = 0.45;
      // 光團爆開後，對應類型與品階的素材圖淡入；下方是名稱、數量、品階
      $('#gsRev').innerHTML = `<div class="gs-card t${r.tier}" style="--c:${T.color};--e:${T.edge}"><div class="gs-loot">${lootImg(r)}</div><b>${r.base || r.name}</b><span class="gs-qty">${r.qty || ''}</span><i>${T.name}${r.isNew ? '・新' : ''}</i></div>`;
      await Story.wait(ten ? 360 + r.tier * 100 : 1100);
    }
  },
  resIcon(x) { return x.type === 'w' || x.type === 'f' ? wFrame(S.gDef(x.id)) : `<span class="loot-sm" style="--c:${WTIERS[x.tier].color}">${lootImg(x)}</span>`; },
  // 結果：單抽得到兵器直接進展示框；十連列表中的兵器可點開展示框，看完回到列表
  gachaResults(res) {
    const back = () => { this.close(); this.draw(); };
    const tap = (x) => x.type === 'w' || x.type === 'f';
    if (res.length === 1 && tap(res[0])) { this.wShow(res[0].id, '認主', back); return; }
    const rows = res.map((x, i) => { const sub = x.type === 'w' && S.subNotice(x.id); return `<div class="li gres t${x.tier} ${tap(x) ? 'tap' : ''}" ${tap(x) ? `data-gi="${i}"` : ''} style="--c:${WTIERS[x.tier].color}">${this.resIcon(x)}<div><h4 style="color:${WTIERS[x.tier].color}">${x.name}${x.isNew ? '<i class="new">新</i>' : ''}<i class="tier">${WTIERS[x.tier].name}</i></h4>${x.note || sub ? `<p>${stoneText(x.note || sub)}</p>` : ''}</div><span>${tap(x) ? '›' : ''}</span></div>`; }).join('');
    this.modal(res.length === 10 ? '十連機緣' : '機緣', `<div class="list">${rows}</div><div class="row center"><button class="seal" id="gOk">收下</button></div>`, {
      '#gOk': back,
      '[data-gi]': (el) => this.wShow(res[+el.dataset.gi].id, '認主', () => this.gachaResults(res), '返回'),
    });
  },

  settings() {
    const d = S.d;
    this.modal('閣', `
      <div class="list">
        <div class="li"><i class="ico" style="--c:#c8b48a">琴</i><div><h4>配樂</h4><p>古琴、竹笛與低鳴</p></div><button class="seal sm ${Audio2.musOn ? '' : 'ghost'}" id="sMus">${Audio2.musOn ? '開' : '關'}</button></div>
        <div class="li"><i class="ico" style="--c:#c8b48a">音</i><div><h4>音效</h4><p>斬擊、雷鳴、丹爐</p></div><button class="seal sm ${Audio2.sfxOn ? '' : 'ghost'}" id="sSfx">${Audio2.sfxOn ? '開' : '關'}</button></div>
        <div class="li"><i class="ico" style="--c:#c8b48a">震</i><div><h4>畫面震動</h4><p>雷劫、重擊時的畫面晃動</p></div><button class="seal sm ${FX.noShake ? 'ghost' : ''}" id="sShake">${FX.noShake ? '關' : '開'}</button></div>
        <div class="li"><i class="ico" style="--c:#c8b48a">卷</i><div><h4>劇情回顧</h4><p>第一章「凡塵問道」</p></div><button class="seal sm ghost" id="sStory">重溫</button></div>
        <div class="li"><i class="ico" style="--c:#9fe8d8">存</i><div><h4>匯出存檔</h4><p>下載存檔檔案，也可複製文字備份</p></div><button class="seal sm ghost" id="sExp">匯出</button></div>
        <div class="li"><i class="ico" style="--c:#9fe8d8">讀</i><div><h4>匯入存檔</h4><p>換手機或清除快取後還原進度</p></div><button class="seal sm ghost" id="sImp">匯入</button></div>
        <div class="li"><i class="ico" style="--c:#c8b48a">歸</i><div><h4>回標題畫面</h4><p>存檔後回到標題，可再「續緣」</p></div><button class="seal sm ghost" id="sTitle">回標題</button></div>
        <div class="li"><i class="ico" style="--c:#ff8a8a">重</i><div><h4>重新修行</h4><p>刪除存檔，從青石村重新開始</p></div><button class="seal sm" id="sReset">重修</button></div>
      </div>`, {
      '#sMus': () => { Audio2.unlock(); Audio2.setMusic(!Audio2.musOn); d.settings.music = Audio2.musOn; S.save(); this.settings(); },
      '#sShake': () => { FX.noShake = !FX.noShake; d.settings.shake = !FX.noShake; S.save(); this.settings(); },
      '#sSfx': () => { Audio2.setSfx(!Audio2.sfxOn); d.settings.sfx = Audio2.sfxOn; S.save(); this.settings(); },
      '#sStory': () => { this.close(); Story.replay(); },
      '#sTitle': () => this.modal('回標題畫面', '<p class="big">回到標題畫面？</p><p class="note" style="text-align:center">進度會先存檔，之後按「續緣」即可接著修行。</p><div class="row center"><button class="seal" id="tY">回標題</button><button class="seal ghost sm" id="tN">取消</button></div>', { '#tY': () => { S.save(); this.close(); Game.title(true); }, '#tN': () => this.settings() }),
      '#sExp': () => this.exportSave(),
      '#sImp': () => this.importSave(),
      '#sReset': () => this.modal('重新修行', '<p class="big">確定刪除存檔？</p><div class="row center"><button class="seal" id="rY">刪除</button><button class="seal ghost sm" id="rN">取消</button></div>', { '#rY': () => { S.reset(); location.reload(); }, '#rN': () => this.settings() }),
    });
  },

  // ───────── 存檔備份 ─────────
  exportSave() {
    S.save();
    const text = JSON.stringify(S.d), name = `問道青冥存檔-${new Date().toISOString().slice(0, 10)}.json`;
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); } catch (e) {}
    this.modal('匯出存檔', `<p class="note">已下載「${name}」。若手機沒有跳出下載，可以複製下面的文字自行保存（例如貼到備忘錄）。</p>
      <textarea id="expTxt" class="save-txt" readonly>${text.replace(/</g, '&lt;')}</textarea>
      <div class="row center"><button class="seal sm" id="expCopy">複製文字</button><button class="seal ghost sm" id="expBack">返回</button></div>`, {
      '#expCopy': () => { const t = $('#expTxt'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => document.execCommand('copy')).finally(() => this.toast('存檔文字已複製', '#9fe8d8')); },
      '#expBack': () => this.settings(),
    });
  },
  importSave(fromTitle) {
    this.modal('匯入存檔', `<p class="note">選擇匯出的存檔檔案，或把存檔文字貼在下面。<b style="color:#ff9a9a">目前的進度會被覆蓋。</b></p>
      <input type="file" id="impFile" accept=".json,application/json,text/plain" class="save-file">
      <textarea id="impTxt" class="save-txt" placeholder="或貼上存檔文字"></textarea>
      <div class="row center"><button class="seal sm" id="impGo">匯入</button><button class="seal ghost sm" id="impBack">返回</button></div>`, {
      '#impGo': async () => {
        const f = $('#impFile').files[0], text = f ? await f.text() : $('#impTxt').value.trim();
        const r = S.importText(text);
        if (r !== true) { this.toast(r, '#ff9a9a'); return; }
        this.toast('存檔已匯入，重新載入中', '#9fe8d8'); setTimeout(() => location.reload(), 700);
      },
      '#impBack': () => (fromTitle ? this.close() : this.settings()),
    });
  },

  offlineModal(o) {
    this.modal('出關', `<p class="big">閉關 ${U.dur(o.sec)}${o.capped ? '（已達上限）' : ''}</p>
      <div class="list"><div class="li"><i class="ico" style="--c:#f2dc94">修</i><div><h4>修為 +${U.fmt(o.gain)}</h4><p>${o.full ? '修為已滿，可嘗試突破' : '靈氣自行運轉，不曾停歇'}</p></div><span></span></div>
      <div class="li">${ico('stone')}<div><h4>${stoneAmt(o.stone, '+')}</h4><p>洞府靈脈所產</p></div><span></span></div></div>
      <div class="row center"><button class="seal" id="oOk">收下</button></div>`, { '#oOk': () => { this.close(); this.go('home'); } });
  },
};
