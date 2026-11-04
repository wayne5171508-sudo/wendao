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
const wVars = (w) => `--c:${WTIERS[w.tier].color};--e:${WTIERS[w.tier].edge};--r:${w.rot}deg`;
const wFrame = (w, cls = '') => `<span class="wframe t${w.tier} ${cls}" style="${wVars(w)}"><img src="${W_IMG(w.id)}" alt="${w.name}"></span>`;
// 主角佩劍立繪：持劍（法寶頁）、背劍（劇情）。座標為圖內比例，用來把劍光疊在劍身與劍柄上
const HERO_SWORD = {
  hold: { img: 'assets/hero/hold_sword.webp', ar: 575 / 1093, blade: [0.264, 0.549, 0.013, 0.91] },
  back: { img: 'assets/hero/back_sword.webp', ar: 461 / 1084, hilt: [0.8, 0.11] },
  sit: { img: 'assets/hero/meditate_sword.webp', ar: 759 / 861, blade: [0.035, 0.58, 0.91, 0.665] },        // 打坐，劍橫膝上
  sitBack: { img: 'assets/hero/meditate_backsword.webp', ar: 612 / 934, hilt: [0.76, 0.12] },           // 打坐背劍（備用）
  bhold: { img: 'assets/hero/battle_hold.webp', ar: 768 / 1078, blade: [0.72, 0.55, 0.995, 0.8] },       // 戰鬥背影持劍
  bstance: { img: 'assets/hero/battle_stance.webp', ar: 715 / 969, blade: [0.28, 0.22, 0.005, 0.267] }, // 戰鬥起手式
};
// 兵器光效：階級越高越華麗（發光 → 粒子環繞 → 紫金雙光 → 赤金天象）
const wAura = (w) => {
  if (!w) return '';
  const n = [0, 0, 6, 10, 14][w.tier];
  const sparks = Array.from({ length: n }, (_, i) => `<i style="--a:${(i * 360) / n}deg;--d:${3.2 + (i % 3) * 0.7}s"></i>`).join('');
  return `<div class="waura t${w.tier}" style="${wVars(w)}"><div class="wglow"></div><div class="wring">${sparks}</div></div>`;
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
const ico = (id) => `<i class="ico" style="--c:${ITEMS[id].color}">${{ stone: '石', scroll: '卷', ore: '鐵', star: '砂' }[id] || (ITEMS[id].pill ? '丹' : '草')}</i>`;

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
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; if (color) el.style.color = color;
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
    $('#app').classList.toggle('tall', tab !== 'home'); $('#app').classList.remove('fighting'); FX.clear(); FX.stormT = 0; FX.ambient = 'qi';
    ({ home: () => this.home(), map: () => this.map(), alch: () => this.alch(), arts: () => this.arts(), gear: () => this.gear(), draw: () => this.draw() }[tab] || (() => this.home()))();
    this.hud();
  },

  // ───────── 洞府 ─────────
  home() {
    Audio2.setMood('sect');
    this.setBg('dongfu', '');
    this.scene(`<div class="aura"></div>${heaven(S.wTop())}<div class="hero-stage sit">${S.wTop() ? heroArmed(S.wTop(), 'sit') : `<img src="${IMG_SRC.hero_meditate}" alt="${HERO_NAME}打坐">`}</div>`);
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
      const it = ITEMS[r.out], mats = Object.entries(r.need).map(([k, n]) => `<span class="mat ${S.has(k, n) ? '' : 'lack'}">${ITEMS[k].name} ${S.d.inv[k] || 0}/${n}</span>`).join('') + `<span class="mat ${S.has('stone', r.stone) ? '' : 'lack'}">靈石 ${r.stone}</span>`;
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
      const cost = st.learn ? `功法殘卷 ×${A.scroll}${A.req ? `・需 ${REALMS[A.req]}` : ''}` : st.lv >= ART_MAX ? '已臻圓滿' : `靈石 ${U.fmt(artCost(st.lv))}`;
      return `<div class="li ${reqOk || st.lv ? '' : 'locked'}"><i class="ico" style="--c:${st.lv ? '#ffe7a0' : '#7a8692'}">${A.name[0]}</i><div><h4>${A.name}<em>${st.lv ? `第 ${st.lv} 層` : '未習得'}</em></h4><p>${A.per}</p><span class="mat ${st.can ? '' : 'lack'}">${cost}</span></div>
        <button class="seal sm ${st.learn ? '' : 'ghost'}" data-a="${A.id}" ${st.can ? '' : 'disabled'}>${st.learn ? '參悟' : '精進'}</button></div>`;
    }).join('');
    this.controls(`<div class="sec-title">功法</div><p class="note">功法殘卷 ${S.d.inv.scroll || 0}　靈石 ${U.fmt(S.d.inv.stone || 0)}</p><div class="list">${rows}</div>`);
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
    const fig = nitian ? `<div class="hfig nitian" style="aspect-ratio:${747 / 1045}"><i class="nt-halo"></i>${wAura(WEAPONS.find((w) => w.id === 'nitian'))}<img src="assets/hero/hold_nitian.webp" alt="${HERO_NAME}持逆天劍"><i class="nt-bolt"></i></div>`
      : top ? heroArmed(top, 'hold') : `<img src="${IMG_SRC.hero_front}" alt="${HERO_NAME}">`;
    this.scene(`${heaven(top)}<div class="hero-stage gear ${this._heroKey && this._heroKey !== key ? 'swap' : ''}">${fig}</div>`);
    if (key === 'nitian' && this._heroKey && this._heroKey !== key) { FX.flash = 0.6; Audio2.play('thunder'); }   // 神器出鞘
    this._heroKey = key;
    const ready = S.questsReady();
    const tabs = [['wpn', '兵器'], ['forge', '煉器'], ['shop', '商店'], ['quest', '任務']].map(([k, n]) => `<button class="${this.gtab === k ? 'on' : ''}" data-g="${k}">${n}${k === 'quest' && ready ? `<i class="pip">${ready}</i>` : ''}</button>`).join('');
    const body = { wpn: () => this.gearWpn(), forge: () => this.gearForge(), shop: () => this.gearShop(), quest: () => this.gearQuest() }[this.gtab]();
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
  gearForge() {
    const rows = FORGE.map((f, i) => {
      const w = WEAPONS.find((x) => x.id === f.w), owned = !!S.d.weapons[f.w];
      const mats = Object.entries(f.need).map(([k, n]) => `<span class="mat ${S.has(k, n) ? '' : 'lack'}">${ITEMS[k].name} ${S.d.inv[k] || 0}/${n}</span>`).join('') + `<span class="mat ${S.has('stone', f.stone) ? '' : 'lack'}">靈石 ${U.fmt(f.stone)}</span>`;
      return `<div class="li">${wFrame(w)}<div><h4 style="color:${WTIERS[w.tier].color}">${w.name}<i class="tier">${WTIERS[w.tier].name}</i><em>成器 ${Math.round(f.rate * 100)}%</em></h4><p>${w.desc}</p><div>${mats}</div></div>
        <button class="seal sm" data-fg="${i}" ${S.canForge(f) ? '' : 'disabled'}>${owned ? '已有' : '煉'}</button></div>`;
    }).join('');
    return `<p class="note">玄鐵：${S.d.inv.ore || 0}　星辰砂：${S.d.inv.star || 0}。煉器失敗會耗去材料。</p><div class="list">${rows}</div>`;
  },
  gearShop() {
    const rows = SHOP.map((it, i) => {
      const w = it.w && WEAPONS.find((x) => x.id === it.w), open = S.shopOpen(it), owned = w && S.d.weapons[w.id];
      const head = w ? `${wFrame(w)}<div><h4 style="color:${WTIERS[w.tier].color}">${w.name}<i class="tier">${WTIERS[w.tier].name}</i></h4><p>${w.desc}</p>` : `${ico(it.item)}<div><h4>${ITEMS[it.item].name} ×${it.n}</h4><p>${ITEMS[it.item].desc}</p>`;
      return `<div class="li ${open ? '' : 'locked'}">${head}<span class="mat ${S.has('stone', it.stone) ? '' : 'lack'}">靈石 ${U.fmt(it.stone)}${open ? '' : `・需${lvName(it.lv)}`}</span></div>
        <button class="seal sm" data-buy="${i}" ${open && !owned && S.has('stone', it.stone) ? '' : 'disabled'}>${owned ? '已有' : '換'}</button></div>`;
    }).join('');
    return `<p class="note">宗門執事以靈石兌換兵器與物資。</p><div class="list">${rows}</div>`;
  },
  gearQuest() {
    const rew = (r) => Object.entries(r).map(([k, n]) => k === 'w' ? `<span class="mat" style="color:${WTIERS[WEAPONS.find((w) => w.id === n).tier].color}">${WEAPONS.find((w) => w.id === n).name}</span>` : `<span class="mat">${k === 'stone' ? '靈石' : ITEMS[k].name} ×${n}</span>`).join('');
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
  wShow(id, how) {
    const w = WEAPONS.find((x) => x.id === id), T = WTIERS[w.tier];
    this.modal(how, `<div class="wshow t${w.tier}" style="${wVars(w)}"><img src="${W_IMG(id)}" alt="${w.name}"></div>
      <p class="big" style="color:${T.color}">${w.name}<i class="tier" style="font-size:13px">${T.name}</i></p><p class="note" style="text-align:center">${w.desc}${w.fx ? `<br>特效「${w.fxName}」：${w.fxDesc}` : ''}</p>
      <div class="row center"><button class="seal" id="wsOk">收下</button></div>`, { '#wsOk': () => this.close() });
    const sub = S.subNotice(id); if (sub) setTimeout(() => this.toast(sub + '，可到法寶頁與主手互換', T.color), 300);
    if (w.tier >= 4) { FX.stormT = 1; FX.flash = 0.9; Audio2.play('thunder'); FX.shake($('#scene'), 10); setTimeout(() => (FX.stormT = 0), 2600); }
  },
  // 兵器養成：佩戴、強化（失敗率與保底）、突破
  wDetail(id) {
    const w = WEAPONS.find((x) => x.id === id), o = S.d.weapons[id], T = WTIERS[w.tier];
    if (!o) return;
    const st = S.wStat(id), cap = S.wCap(id), slot = S.d.wslot.indexOf(id), maxed = o.lv >= cap;
    const cost = wEnhCost(w, o.lv), rate = o.fail >= W_PITY ? 100 : Math.round(wEnhRate(o.lv) * 100);
    const brk = o.brk < W_BRK_MAX ? wBrkNeed(w, o.brk) : null;
    const brkMats = brk ? Object.entries(brk.need).map(([k, n]) => `<span class="mat ${S.has(k, n) ? '' : 'lack'}">${ITEMS[k].name} ${S.d.inv[k] || 0}/${n}</span>`).join('') + `<span class="mat ${S.has('stone', brk.stone) ? '' : 'lack'}">靈石 ${U.fmt(brk.stone)}</span>` : '';
    const eqBtns = W_SLOTS.map((n, i) => slot === i ? `<button class="seal sm ghost" data-un="${i}">卸下${n}</button>` : `<button class="seal sm ghost" data-eqs="${i}">佩於${n}</button>`).join('');
    this.modal(w.name, `<div class="wshow sm t${w.tier}" style="${wVars(w)}"><img src="${W_IMG(id)}" alt="${w.name}"></div>
      <p class="big" style="color:${T.color}">${T.name}・+${o.lv}／${cap}${o.brk ? `・${'一二三'[o.brk - 1]}重` : ''}</p>
      <div class="stats-line" style="grid-template-columns:repeat(3,1fr)"><div><b>${st.atk}</b>攻擊</div><div><b>${st.crit}%</b>暴擊</div><div><b>${st.regen}</b>回靈／息</div></div>
      ${w.fx ? `<p class="note" style="text-align:center;margin-top:8px">特效「${w.fxName}」：${w.fxDesc}</p>` : ''}
      <div class="list">
        ${maxed ? (brk ? `<div class="li"><i class="ico" style="--c:${T.color}">破</i><div><h4>突破<em>強化上限 +10、屬性 +25%</em></h4><div>${brkMats}</div></div><button class="seal sm" id="wBrk" ${S.wCanBreak(id) ? '' : 'disabled'}>突破</button></div>` : '<p class="note" style="text-align:center">已臻圓滿。</p>')
          : `<div class="li"><i class="ico" style="--c:${T.color}">強</i><div><h4>強化<em>成功率 ${rate}%</em></h4><p>每級屬性 +8%。保底 ${Math.min(o.fail, W_PITY)}／${W_PITY}：連敗三次，下次必成。</p><span class="mat ${S.has('stone', cost) ? '' : 'lack'}">靈石 ${U.fmt(cost)}</span></div><button class="seal sm" id="wEnh" ${S.has('stone', cost) ? '' : 'disabled'}>強化</button></div>`}
      </div>
      <div class="row center">${eqBtns}</div>`, {
      '#wEnh': () => { const r = S.wEnhance(id); if (!r) return; if (r.ok) { Audio2.play('up'); this.toast(`${w.name}強化至 +${o.lv}${r.pity ? '（保底）' : ''}`, T.color); } else { Audio2.play('fail'); this.toast(`強化失敗（保底 ${Math.min(o.fail, W_PITY)}／${W_PITY}）`, '#ff9a9a'); } this.wDetail(id); this.gear(); this.hud(); },
      '#wBrk': () => { if (S.wBreak(id)) { Audio2.play('gong'); FX.pillar(FX.w / 2, FX.h, hexA(T.color, 0.5), 90, 2); this.toast(`${w.name}突破・${'一二三'[o.brk - 1]}重`, T.color); this.wDetail(id); this.gear(); this.hud(); } },
      '[data-eqs]': (el) => { S.wEquip(id, +el.dataset.eqs); Audio2.play('pickup'); this.close(); this.gear(); this.hud(); },
      '[data-un]': (el) => { S.wUnequip(+el.dataset.un); this.close(); this.gear(); this.hud(); },
    });
  },

  // ───────── 機緣（抽取）─────────
  gpool: 'wpn',
  draw(pool) {
    if (pool) this.gpool = pool;
    Audio2.setMood('sect'); this.setBg('sect', 'dim');
    const P = this.gpool, d = S.d, t = S.today(), G = GACHA, left = S.pityLeft(P);
    this.scene(`<div class="gacha-ring" id="gRing"><img src="assets/fx/ring.webp" alt=""></div><i class="gacha-sky" id="gSky"></i>
      <div class="banner static" style="animation:none;top:12%"><b style="font-size:clamp(28px,8vw,46px)">${P === 'wpn' ? '法寶池' : '功法池'}</b><span>祈願光陣</span></div>`);
    const rates = WTIERS.map((T, i) => `<span class="mat" style="color:${T.color};border-color:${T.edge}">${T.name} ${Math.round(G.rates[i] * 1000) / 10}%</span>`).join('');
    const gives = P === 'art' ? '<p class="note">凡：殘卷×1　靈：殘卷×2　法寶：殘卷×4　仙：隨機功法 +1 層　神：萬劍歸宗 +1 層</p>' : '<p class="note">重複的兵器化為玄鐵（強化材料）。</p>';
    this.controls(`<div class="sec-title">機緣</div>
      <div class="tabs"><button class="${P === 'wpn' ? 'on' : ''}" data-gp="wpn">法寶池</button><button class="${P === 'art' ? 'on' : ''}" data-gp="art">功法池</button></div>
      <div class="pity"><span>保底</span><b>${left}</b><span>抽內必出仙階以上</span></div>
      <div>${rates}</div>${gives}
      <div class="row center gacha-btns"><button class="seal ${t.free ? 'ghost' : ''}" id="g1">單抽<small>${t.free ? '靈石 ' + G.cost : '今日免費'}</small></button><button class="seal ${t.free ? '' : 'ghost'}" id="g10">十連<small>靈石 ${U.fmt(G.cost10)}・保底靈階</small></button></div>
      <div class="li"><i class="ico" style="--c:#9fe8d8">簽</i><div><h4>每日簽到</h4><p>靈石 +${G.sign(d.lv)}（隨境界提高）</p></div><button class="seal sm ${t.sign ? 'ghost' : ''}" id="gSign" ${t.sign ? 'disabled' : ''}>${t.sign ? '已簽' : '簽到'}</button></div>
      <p class="note">機緣只消耗遊戲內靈石，靈石來自修煉、歷練、簽到與任務，沒有任何真實付費。</p>`);
    document.querySelectorAll('[data-gp]').forEach((b) => (b.onclick = () => { Audio2.play('page'); this.draw(b.dataset.gp); }));
    $('#gSign').onclick = () => { const n = S.sign(); if (n) { Audio2.play('pickup'); this.toast(`簽到成功，靈石 +${n}`, '#9fe8d8'); this.draw(); this.hud(); } };
    $('#g1').onclick = () => this.pull(1);
    $('#g10').onclick = () => this.pull(10);
  },
  async pull(n) {
    const res = S.draw(this.gpool, n);
    if (!res) { this.toast(`靈石不足，需要 ${n === 10 ? GACHA.cost10 : GACHA.cost}`, '#ff9a9a'); return; }
    this.hud();
    const top = Math.max(...res.map((r) => r.tier)), T = WTIERS[top];
    $('#controls').classList.add('busy'); $('#ctrlContent').style.pointerEvents = 'none'; $('#nav').style.pointerEvents = 'none';
    // 演出：光陣聚氣 → 依最高品階的顏色天象 → 神器全畫面閃光；可按「跳過」
    await Story.run(async () => {
      const ring = $('#gRing'), sky = $('#gSky'), r = ring.getBoundingClientRect(), s0 = $('#scene').getBoundingClientRect(), cx = r.left - s0.left + r.width / 2, cy = r.top - s0.top + r.height / 2;
      ring.classList.add('gather'); Audio2.play('qi');
      for (let i = 0; i < 14; i++) { FX.converge(cx, cy, 'rgba(232,232,232,0.9)', 6, 260, 0.9); await Story.wait(90); }
      ring.style.setProperty('--c', T.color); sky.style.setProperty('--c', T.color); sky.style.setProperty('--e', T.edge);
      ring.classList.add('lit'); sky.classList.add('on'); Audio2.play(top >= 3 ? 'thunder' : 'gong'); FX.shake($('#scene'), 6 + top * 3);
      FX.burst(cx, cy, T.color, 30 + top * 12, 260 + top * 40, 4, 1.2); FX.ring(cx, cy, T.color, 20, 300, 1, 5);
      if (top >= 4) { FX.flash = 1; $('#scene').classList.add('bt-white'); }
      await Story.wait(1400);
    });
    $('#scene').classList.remove('bt-white');
    $('#controls').classList.remove('busy'); $('#ctrlContent').style.pointerEvents = ''; $('#nav').style.pointerEvents = '';
    const icon = (x) => (x.type === 'w' ? wFrame(WEAPONS.find((w) => w.id === x.id)) : x.type === 'item' ? ico(x.id) : `<i class="ico" style="--c:${WTIERS[x.tier].color}">${ARTS.find((a) => a.id === x.id).name[0]}</i>`);
    const rows = res.map((x) => { const sub = x.type === 'w' && S.subNotice(x.id); return `<div class="li gres t${x.tier}" style="--c:${WTIERS[x.tier].color}">${icon(x)}<div><h4 style="color:${WTIERS[x.tier].color}">${x.name}${x.isNew ? '<i class="new">新</i>' : ''}<i class="tier">${WTIERS[x.tier].name}</i></h4>${x.note || sub ? `<p>${x.note || sub}</p>` : ''}</div><span></span></div>`; }).join('');
    this.modal(n === 10 ? '十連機緣' : '機緣', `<div class="list">${rows}</div><div class="row center"><button class="seal" id="gOk">收下</button></div>`, { '#gOk': () => { this.close(); this.draw(); } });
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
      <div class="li">${ico('stone')}<div><h4>靈石 +${U.fmt(o.stone)}</h4><p>洞府靈脈所產</p></div><span></span></div></div>
      <div class="row center"><button class="seal" id="oOk">收下</button></div>`, { '#oOk': () => { this.close(); this.go('home'); } });
  },
};
