'use strict';
// ════════════════════════════════════════════
//  轉珠戰鬥原型（P0）：只在開發模式開啟，舊戰鬥 Battle 完全不動，也不讀寫存檔
//  進入：網址 ?dev&pz 直接開，或開發模式下「歷練」頁最上方的「轉珠試煉」
//  玩法：按住珠子拖曳，經過的珠子會換位；放開或轉珠時間到就結算
//        橫或直三顆以上同色相連即消除，相連的同色一起算一個 Combo；消除後上方掉落補珠，可連鎖
// ════════════════════════════════════════════

// ───────── 可替換素材 ─────────
// 之後換日系手繪風時只改這裡：填上路徑就用圖，null 或載入失敗就用程式畫的色塊珠／漸層背景
// 珠子圖建議正方形透明底（例 160×160），會縮放到格子大小
const PZ_ART = {
  bg: ['assets/bg/pz_day.webp', 'assets/bg/pz_dusk.webp', 'assets/bg/pz_night.webp'],   // 上半部戰鬥背景，依首領第一／二／三相換晨、昏、夜
  bgPos: '50% 40%',
  boss: 'assets/mon/xuejia.webp',      // 首領立繪（透明底）
  board: 'assets/pz/board.webp',       // 盤面底板（奶油紙棕框），null＝不貼
  card: 'assets/pz/card.webp',         // 隊員卡框（透明底）
  paper: 'assets/pz/paper.webp',       // 下半部紙紋（壓暗疊在底色上）
  orbs: { wood: 'assets/orb/wood.webp', fire: 'assets/orb/fire.webp', earth: 'assets/orb/earth.webp',
    metal: 'assets/orb/metal.webp', water: 'assets/orb/water.webp', heart: 'assets/orb/heart.webp' },
  // 技能特效：黑底圖，用 mix-blend-mode:screen 疊在戰鬥區；key 對應隊員 id，沒填的技能不放圖
  // 消除特效：黑底圖，依消除珠子屬性選圖疊在盤面；沒填或載入失敗就用程式效果（珠子放大淡出）
  clear: { wood: 'assets/fx/pz_clr_wood.webp', fire: 'assets/fx/pz_clr_fire.webp', earth: 'assets/fx/pz_clr_earth.webp',
    metal: 'assets/fx/pz_clr_metal.webp', water: 'assets/fx/pz_clr_water.webp', heart: 'assets/fx/pz_clr_heart.webp' },
  fx: { hero: 'assets/fx/pz_slash.webp', mate: 'assets/fx/pz_heal.webp', jinxia: 'assets/fx/pz_break.webp', zichen: 'assets/fx/pz_ice.webp' },
};

// ───────── 規則數值 ─────────
const PZ_CFG = {
  cols: 6, rows: 5,
  moveTime: 5,          // 轉珠秒數（第一次換位才開始計時）；網址加 &pzt=8 可改
  comboStep: 0.25,      // 每多 1 Combo 傷害 +25%
  extraOrb: 0.25,       // 一組超過 3 顆，每多 1 顆 +25%
  beat: 1.5, beaten: 0.5,
  comboGap: 450,        // 每個 Combo 消除之間的停頓（毫秒）
};
// ───────── 拖曳手感（之後只改這裡）─────────
const PZ_DRAG = {
  enter: 0.1,        // 換位門檻：手指越過格線、進入新格子多深（格寬比例）就換；各軸分開算，0＝碰到格線就換（易在格線上來回抖）
  subStep: 0.25,     // 快速拖曳時兩個取樣點之間每隔幾格補一個判定點，確保沿路逐格換、不跳格
  swapMs: 70,        // 被讓位的珠子滑到空位的時間（ease-out cubic，換位當下就開始）
  liftScale: 1.1,    // 拿起的珠子放大倍率
  liftOffset: 0.2,   // 拿起的珠子往上偏離手指幾格（頂列會自動收回不出盤面）
  liftAlpha: 0.9,    // 拿起的珠子透明度
  ghostAlpha: 0.3,   // 原位虛影透明度
};
const PZ_EL = {
  wood:  { ch: '木', c: '#58d07a', d: '#17602f' },
  fire:  { ch: '火', c: '#ff5a3a', d: '#8a1e0e' },
  earth: { ch: '土', c: '#c98a46', d: '#5e3612' },
  metal: { ch: '金', c: '#f3e7b0', d: '#8d7a30' },
  water: { ch: '水', c: '#48a6ff', d: '#123f78' },
  heart: { ch: '心', c: '#ff8ec0', d: '#962c5c' },
};
const PZ_COLORS = Object.keys(PZ_EL);
// 五行相剋：木剋土、土剋水、水剋火、火剋金、金剋木
const PZ_BEATS = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
const pzRel = (a, d) => (PZ_BEATS[a] === d ? PZ_CFG.beat : PZ_BEATS[d] === a ? PZ_CFG.beaten : 1);
// 靈根對應珠色：雷歸火、冰歸水
const PZ_ROOT = { metal: 'metal', wood: 'wood', water: 'water', fire: 'fire', earth: 'earth', thunder: 'fire', ice: 'water' };

// 首領血量：一般玩家（每回合 3～6 Combo）約 5～8 回合打完；調難度只改這個數字
const PZ_BOSS_HP = 28000;
// 首領：沿用血甲妖將的三相概念（減傷、暴怒吸血），出手改成倒數回合；每第 3 次出手為蓄力大招「血刃斬」
const PZ_BOSS = {
  name: '血甲妖將・厲蒼', hp: PZ_BOSS_HP, atk: 1500, def: 60, heavyEvery: 3, heavyName: '血刃斬',
  phases: [
    { name: '第一相', el: 'fire', cd: 3, heavyMult: 2.8 },
    { at: 0.66, name: '第二相', el: 'earth', cd: 3, heavyMult: 2.8, dr: 0.25, banner: ['妖將祭陣', '血陣護身，減傷兩成五，屬性轉為土'] },
    { at: 0.33, name: '第三相', el: 'fire', cd: 2, heavyMult: 2.6, atk: 1.3, leech: 0.25, banner: ['血甲暴怒', '出手加快，以血養血'] },
  ],
};

// 隊伍：主角（隊長）＋道侶＋兵器 3 把，固定假資料；之後接真實兵器與存檔
function pzTeam() {
  const d = (typeof S !== 'undefined' && S.d) || {};
  const lead = PZ_ROOT[d.root] || 'wood';
  const me = (d.dao && d.dao.char) || 'qingyuan', mate = me === 'yunxi' ? 'qingyuan' : 'yunxi';
  const C = typeof CHARACTERS !== 'undefined' ? CHARACTERS : {};
  const nm = (id, fb) => (C[id] && C[id].name) || fb;
  const mateEl = lead === 'wood' ? 'earth' : 'wood';   // 道侶補上隊上缺的木或土，五行湊齊
  return [
    { id: 'hero', role: '隊長', name: d.name || nm(me, '林清遠'), el: lead, atk: 620, hp: 1500, rcv: 140, img: `assets/ui/char_${me}.webp`,
      sk: { name: '劍氣', cd: 4, desc: '以隊長屬性造成攻擊 12 倍傷害（計算相剋）' } },
    { id: 'mate', role: '道侶', name: nm(mate, '蘇雲汐'), el: mateEl, atk: 480, hp: 1300, rcv: 220, img: `assets/ui/char_${mate}.webp`,
      sk: { name: '同心', cd: 5, desc: '心珠全部轉為隊長屬性珠，回復兩成氣血' } },
    { id: 'jinxia', role: '兵器', name: '金霞劍', el: 'metal', atk: 560, hp: 950, rcv: 60, img: 'assets/weapon/jinxia.webp',
      sk: { name: '破防', cd: 4, desc: '本回合無視首領的防禦與減傷' } },
    { id: 'zichen', role: '兵器', name: '紫宸劍', el: 'water', atk: 650, hp: 1000, rcv: 70, img: 'assets/weapon/zichen.webp',
      sk: { name: '霜寒', cd: 5, desc: '首領出手倒數 +1' } },
    { id: 'chixiao', role: '兵器', name: '赤霄劍', el: 'fire', atk: 780, hp: 1100, rcv: 50, img: 'assets/weapon/chixiao.webp',
      sk: { name: '連擊', cd: 4, desc: '本回合結算 Combo 數 +2' } },
  ];
}

const Puzzle = {
  on: false,

  // ───────── 開關 ─────────
  open() {
    if (this.on) return;
    this.on = true;
    const t = +(new URLSearchParams(location.search).get('pzt'));
    this.moveTime = t >= 2 && t <= 30 ? t : PZ_CFG.moveTime;
    let root = document.getElementById('pz');
    if (!root) { root = document.createElement('div'); root.id = 'pz'; document.body.appendChild(root); }
    this.root = root;
    document.body.classList.add('pz-on');
    if (typeof Audio2 !== 'undefined') Audio2.bgm('pz_battle');
    this.reset();
    this.build();
    this.layout();
    this._rs = () => this.layout(); addEventListener('resize', this._rs);
    this.last = performance.now();
    const loop = (now) => { if (!this.on) return; const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.frame(dt); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },
  close() {
    this.held = null; this.state = 'idle';   // 拖曳中直接關閉：不結算
    this.on = false; cancelAnimationFrame(this.raf); removeEventListener('resize', this._rs);
    (this._win || []).forEach(([t, f, o]) => removeEventListener(t, f, o)); document.removeEventListener('visibilitychange', this._vis);
    this.root.remove(); document.body.classList.remove('pz-on');
    if (typeof Audio2 !== 'undefined') Audio2.setMood(Audio2.mood);   // 切回目前場景的音樂
    if (typeof FX !== 'undefined') requestAnimationFrame(() => FX.resize());
  },

  reset() {
    this.team = pzTeam().map((m) => ({ ...m, cd: Math.ceil(m.sk.cd / 2) }));   // 開場技能冷卻一半
    this.hpMax = this.team.reduce((a, m) => a + m.hp, 0); this.hp = this.hpMax;
    this.rcv = this.team.reduce((a, m) => a + m.rcv, 0);
    const P = PZ_BOSS.phases;
    this.boss = { hp: PZ_BOSS.hp, max: PZ_BOSS.hp, atk: PZ_BOSS.atk, def: PZ_BOSS.def, phase: 0, ph: P[0], el: P[0].el, cd: P[0].cd, hits: 0, dr: 0, leech: 0 };
    this.buff = { pierce: false, combo: 0 };
    this.turn = 0; this.maxCombo = 0; this.state = 'idle'; this.held = null;
    this.grid = this.newBoard();
  },

  // ───────── 盤面資料 ─────────
  orb(c, r, col, y) { return { c, x: col, y: y ?? r, vy: 0, fall: false, die: 0 }; },
  newBoard() {
    const { cols, rows } = PZ_CFG, g = [];
    for (let r = 0; r < rows; r++) {
      g.push([]);
      for (let c = 0; c < cols; c++) {
        let col, n = 0;
        do { col = U.pick(PZ_COLORS); n++; } while (n < 20 && ((c >= 2 && g[r][c - 1].c === col && g[r][c - 2].c === col) || (r >= 2 && g[r - 1][c].c === col && g[r - 2][c].c === col)));   // 開局不預先成組
        g[r].push(this.orb(col, r, c));
      }
    }
    return g;
  },
  // 找出所有可消除的組：先標出橫直三連以上，再把相鄰的同色標記格併成一組（一組＝一個 Combo）
  groups() {
    const { cols, rows } = PZ_CFG, g = this.grid, mk = [...Array(rows)].map(() => Array(cols).fill(false));
    const col = (r, c) => (g[r][c] ? g[r][c].c : null);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols - 2; c++) { const k = col(r, c); if (k && k === col(r, c + 1) && k === col(r, c + 2)) mk[r][c] = mk[r][c + 1] = mk[r][c + 2] = true; }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows - 2; r++) { const k = col(r, c); if (k && k === col(r + 1, c) && k === col(r + 2, c)) mk[r][c] = mk[r + 1][c] = mk[r + 2][c] = true; }
    const seen = [...Array(rows)].map(() => Array(cols).fill(false)), out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!mk[r][c] || seen[r][c]) continue;
      const k = col(r, c), cells = [], st = [[r, c]]; seen[r][c] = true;
      while (st.length) {
        const [y, x] = st.pop(); cells.push([y, x]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dy, dx]) => { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && mk[ny][nx] && !seen[ny][nx] && col(ny, nx) === k) { seen[ny][nx] = true; st.push([ny, nx]); } });
      }
      out.push({ c: k, cells });
    }
    // 由下往上消（掉落感較自然）
    return out.sort((a, b) => Math.max(...b.cells.map((x) => x[0])) - Math.max(...a.cells.map((x) => x[0])));
  },
  // 消除後往下掉，空位從上方補新珠
  drop() {
    const { cols, rows } = PZ_CFG, g = this.grid;
    for (let c = 0; c < cols; c++) {
      let w = rows - 1;
      for (let r = rows - 1; r >= 0; r--) if (g[r][c]) { const o = g[r][c]; g[r][c] = null; g[w][c] = o; if (w !== r) o.fall = true; w--; }
      const n = w + 1;
      for (let r = w; r >= 0; r--) { const o = this.orb(U.pick(PZ_COLORS), r, c, r - n - 0.3); o.fall = true; g[r][c] = o; }
    }
  },
  settled() {
    for (const row of this.grid) for (const o of row) if (o && (o.die || Math.abs(o.y - this.rowOf(o)) > 0.01 || o.fall)) return false;
    return true;
  },
  rowOf(o) { for (let r = 0; r < PZ_CFG.rows; r++) if (this.grid[r].includes(o)) return r; return 0; },

  // ───────── 畫面 ─────────
  build() {
    const T = this.team, B = this.boss;
    this.root.innerHTML = `
      <div class="pz-top" style="background-image:url(${PZ_ART.bg[0]});background-position:${PZ_ART.bgPos}">
        <div class="pz-bar"><button class="pz-btn" id="pzExit">撤</button><span>轉珠試煉・原型</span><button class="pz-btn" id="pzHelp">？</button></div>
        <div class="pz-bhud">
          <div class="pz-bname"><b>${PZ_BOSS.name}</b><em id="pzPh"></em><i class="pz-el" id="pzBEl"></i></div>
          <div class="pz-hp boss"><i id="pzBHp"></i><span id="pzBHpT"></span></div>
          <div class="pz-warn" id="pzWarn"></div>
        </div>
        <div class="pz-boss" id="pzBoss"><img src="${PZ_ART.boss}" alt="" onerror="this.remove()"></div>
        <div class="pz-cd" id="pzCd"><small>倒數</small><b></b></div>
        <div class="pz-fl" id="pzFl"></div><div class="pz-combo" id="pzCombo"></div>
      </div>
      <div class="pz-team">${T.map((m, i) => `<button class="pz-mem" data-m="${i}" style="--c:${PZ_EL[m.el].c};--d:${PZ_EL[m.el].d}">
          <span class="pz-face"><img src="${m.img}" alt="" onerror="this.remove()"><i>${PZ_EL[m.el].ch}</i></span>
          <span class="pz-sk"></span><small>${m.role === '兵器' ? m.name.replace('劍', '') : m.role}</small></button>`).join('')}</div>
      <div class="pz-hp team"><i id="pzTHp"></i><span id="pzTHpT"></span></div>
      <div class="pz-timer"><i id="pzTm"></i></div>
      <div class="pz-boardwrap"><canvas id="pzCv"></canvas><div class="pz-hint" id="pzHint">按住珠子拖曳換位，放開或 ${this.moveTime} 秒到就結算</div></div>
      <div class="pz-toast" id="pzToast"></div>
      <div class="pz-end hidden" id="pzEnd"></div>`;
    const $p = (s) => this.root.querySelector(s);
    ['board', 'card', 'paper'].forEach((k) => this.root.style.setProperty('--pz-' + k, PZ_ART[k] ? `url(${PZ_ART[k]})` : 'none'));
    this.cv = $p('#pzCv'); this.ctx = this.cv.getContext('2d');
    $p('#pzExit').onclick = () => this.close();
    $p('#pzHelp').onclick = () => this.help();
    this.root.querySelectorAll('.pz-mem').forEach((b) => (b.onclick = () => this.skill(+b.dataset.m)));
    // 觸控：pointer capture＋touch-action:none，擋掉 iOS 下拉重整、捲動、長按選取
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.down(e));
    // move／up 掛在 window：capture 沒設成功或手指出了盤面、出了視窗，仍收得到；被系統打斷（cancel、切 App、失焦）一律收尾
    const end = () => this.finish();
    this._win = [['pointermove', (e) => this.move(e)], ['pointerup', (e) => this.up(e)], ['pointercancel', (e) => this.up(e)],
      ['touchcancel', end], ['blur', end], ['touchmove', (e) => this.state === 'drag' && e.preventDefault(), { passive: false }]];
    this._win.forEach(([t, f, o]) => addEventListener(t, f, o));
    this._vis = () => document.hidden && this.finish(); document.addEventListener('visibilitychange', this._vis);
    this.root.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.loadArt();
    this.hud();
  },
  // 盤面大小：寬度貼齊螢幕（最多 480），高度不超過可用高度的一半
  layout() {
    const { cols, rows } = PZ_CFG, W = Math.min(innerWidth - 32, 460);   // 左右各留 10px 給盤面底板框
    // 可用高度＝視窗高 − 隊伍列、血條、計時條 − 上方首領區至少 110px
    const q = (s) => this.root.querySelector(s), used = q('.pz-team').offsetHeight + q('.pz-hp.team').offsetHeight + q('.pz-timer').offsetHeight + 44;
    const cell = Math.floor(Math.max(28, Math.min(W / cols, (innerHeight * 0.5) / rows, (innerHeight - used - 110) / rows)));
    this.cell = cell; this.dpr = Math.min(2.5, devicePixelRatio || 1);
    this.cv.style.width = cols * cell + 'px'; this.cv.style.height = rows * cell + 'px';
    this.cv.width = Math.round(cols * cell * this.dpr); this.cv.height = Math.round(rows * cell * this.dpr);
    this.root.style.setProperty('--board', cols * cell + 'px');
    this.sprites = {};
    PZ_COLORS.forEach((k) => (this.sprites[k] = this.orbSprite(k)));
  },
  loadArt() {
    this.art = {}; this.clr = {};
    Object.entries(PZ_ART.clear).forEach(([k, src]) => { if (!src) return; const im = new Image(); im.onload = () => (this.clr[k] = src); im.src = src; });
    Object.entries(PZ_ART.orbs).forEach(([k, src]) => {
      if (!src) return;
      const im = new Image(); im.onload = () => { this.art[k] = im; this.sprites[k] = this.orbSprite(k); }; im.src = src;
    });
  },
  // 預先把每色珠子畫成小圖，每幀只貼圖（30 顆對手機很輕）
  orbSprite(k) {
    const s = Math.round(this.cell * this.dpr), cv = document.createElement('canvas'); cv.width = cv.height = s;
    const x = cv.getContext('2d'), E = PZ_EL[k], r = s * 0.45;
    if (this.art && this.art[k]) { x.drawImage(this.art[k], 0, 0, s, s); return cv; }
    const g = x.createRadialGradient(s * 0.38, s * 0.34, r * 0.1, s / 2, s / 2, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, E.c); g.addColorStop(1, E.d);
    x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, r, 0, Math.PI * 2); x.fill();
    x.lineWidth = s * 0.035; x.strokeStyle = 'rgba(0,0,0,.45)'; x.stroke();
    x.font = `700 ${Math.round(s * 0.42)}px "LXGW WenKai TC", serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = s * 0.07; x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeText(E.ch, s / 2, s / 2 + s * 0.02);
    x.fillStyle = '#fff'; x.fillText(E.ch, s / 2, s / 2 + s * 0.02);
    return cv;
  },

  frame(dt) {
    const { cols, rows } = PZ_CFG, g = this.grid, ctx = this.ctx, cs = this.cell * this.dpr;
    // 珠子位置往目標格移動：換位用快速內插，掉落用重力
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const o = g[r][c]; if (!o) continue;
      if (o.die) { o.die += dt / 0.22; continue; }
      if (o.tw) {
        const k = Math.min(1, (performance.now() - o.tw.t) / PZ_DRAG.swapMs), e = 1 - Math.pow(1 - k, 3);
        o.x = o.tw.x + (c - o.tw.x) * e; o.y = o.tw.y + (r - o.tw.y) * e; if (k >= 1) o.tw = null;
        continue;
      }
      o.x += (c - o.x) * Math.min(1, dt * 28);
      if (o.fall) { o.vy += 55 * dt; o.y += o.vy * dt; if (o.y >= r) { o.y = r; o.vy = 0; o.fall = false; } }
      else o.y += (r - o.y) * Math.min(1, dt * 28);
      if (Math.abs(o.x - c) < 0.002) o.x = c;
      if (!o.fall && Math.abs(o.y - r) < 0.002) o.y = r;
    }
    // 轉珠計時
    if (this.state === 'drag' && this.t0) {
      const left = this.moveTime - (performance.now() - this.t0) / 1000;
      this.root.querySelector('#pzTm').style.transform = `scaleX(${Math.max(0, left / this.moveTime)})`;
      if (left <= 0) this.finish();
    }
    // 繪製
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { ctx.fillStyle = PZ_ART.board ? ((r + c) % 2 ? 'rgba(120,82,44,.16)' : 'rgba(255,248,228,.28)') : (r + c) % 2 ? 'rgba(20,14,10,.62)' : 'rgba(46,34,24,.62)'; ctx.fillRect(c * cs, r * cs, cs, cs); }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const o = g[r][c]; if (!o || (this.held && o === this.held.o)) continue;
      if (o.y < -0.99) continue;
      let sc = 1, a = 1;
      if (o.die) { if (this.clr[o.c]) continue; const t = Math.min(1, o.die); sc = 1 + 0.35 * t; a = 1 - t; }   // 有消除圖就由圖取代
      ctx.globalAlpha = a;
      const sz = cs * sc; ctx.drawImage(this.sprites[o.c], o.x * cs + (cs - sz) / 2, o.y * cs + (cs - sz) / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    if (this.held) {
      const h = this.held, d = this.dpr;
      // 原位留淡影，手上的珠子跟著手指並放大
      ctx.globalAlpha = PZ_DRAG.ghostAlpha; ctx.drawImage(this.sprites[h.o.c], h.c * cs, h.r * cs, cs, cs);
      // 浮起的珠子：1.15 倍、半透明、帶陰影，往上偏半格避免被手指擋住（頂列不超出盤面）
      const sz = cs * PZ_DRAG.liftScale, ox = h.px * d, oy = Math.max(sz / 2, h.py * d - cs * PZ_DRAG.liftOffset);
      ctx.save(); ctx.globalAlpha = PZ_DRAG.liftAlpha; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = cs * 0.22; ctx.shadowOffsetY = cs * 0.1;
      ctx.drawImage(this.sprites[h.o.c], ox - sz / 2, oy - sz / 2, sz, sz); ctx.restore();
      ctx.globalAlpha = 1;
    }
  },

  // ───────── 拖曳轉珠 ─────────
  pt(e) { const b = this.cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; },
  down(e) {
    if (this.state !== 'idle') return;
    const p = this.pt(e), c = Math.floor(p.x / this.cell), r = Math.floor(p.y / this.cell);
    if (c < 0 || r < 0 || c >= PZ_CFG.cols || r >= PZ_CFG.rows || !this.grid[r][c]) return;
    e.preventDefault();
    try { this.cv.setPointerCapture(e.pointerId); } catch (er) {}
    this.pid = e.pointerId; this.state = 'drag'; this.t0 = 0; this.moved = false;
    this.held = { r, c, o: this.grid[r][c], px: p.x, py: p.y }; this.lastPt = p;
    if (typeof Audio2 !== 'undefined') Audio2.unlock();
    this.sfx('pz_pick');
  },
  move(e) {
    if (this.state !== 'drag' || e.pointerId !== this.pid) return;
    e.preventDefault();
    // 一次 move 事件可能有多個取樣點（手指快速滑動），逐點處理才不會跳格
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    // 相鄰取樣點距離太遠（手指甩很快）時，沿線段每 subStep 格補判定點
    (evs.length ? evs : [e]).forEach((ev) => {
      const p = this.pt(ev), L = this.lastPt || p, n = Math.max(1, Math.ceil(Math.hypot(p.x - L.x, p.y - L.y) / (this.cell * PZ_DRAG.subStep)));
      for (let i = 1; i <= n; i++) this.track({ x: L.x + ((p.x - L.x) * i) / n, y: L.y + ((p.y - L.y) * i) / n });
      this.lastPt = p;
    });
  },
  track(p) {
    const h = this.held, { cols, rows } = PZ_CFG, cell = this.cell;
    h.px = U.clamp(p.x, 0, cols * cell - 1); h.py = U.clamp(p.y, 0, rows * cell - 1);
    // 各軸分開判定：越過格線並進入新格 enter 深度才算換到那一軸；另一軸貼著格線不影響。兩軸都過＝斜換
    const ax = (v, cur) => { const k = Math.floor(v); return k > cur ? (v - k >= PZ_DRAG.enter ? k : k - 1) : k < cur ? (k + 1 - v >= PZ_DRAG.enter ? k : k + 1) : k; };
    const c = ax(h.px / cell, h.c), r = ax(h.py / cell, h.r);
    if (c === h.c && r === h.r) return;
    // 一次跨好幾格時沿路逐格換（含斜向）
    while (h.c !== c || h.r !== r) {
      const nc = h.c + Math.sign(c - h.c), nr = h.r + Math.sign(r - h.r), g = this.grid;
      const other = g[nr][nc]; g[nr][nc] = h.o; g[h.r][h.c] = other;
      if (other) other.tw = { x: other.x, y: other.y, t: performance.now() };   // 手指一經過就滑到空位
      h.o.x = nc; h.o.y = nr; h.c = nc; h.r = nr;
      if (!this.moved) { this.moved = true; this.t0 = performance.now(); const hint = this.root.querySelector('#pzHint'); if (hint) hint.classList.add('off'); }
      this.sfx('pz_tick');
    }
  },
  up(e) {
    if (this.state !== 'drag' || (e && e.pointerId !== this.pid)) return;
    this.finish();
  },
  // 收尾：拿起的珠子已在 grid 目前所在格，清掉 held 就落回原位；有換過位就結算
  finish() {
    if (this.state !== 'drag') return;
    try { this.cv.releasePointerCapture(this.pid); } catch (er) {}
    const moved = this.moved; this.held = null;
    this.root.querySelector('#pzTm').style.transform = 'scaleX(1)';
    if (!moved) { this.state = 'idle'; return; }
    this.resolve();
  },

  // ───────── 結算：消除、連鎖、傷害、首領回合 ─────────
  async resolve() {
    this.state = 'resolve';
    const combos = [];
    for (let wave = 0; wave < 30; wave++) {
      await this.waitSettle();
      const gs = this.groups();
      if (!gs.length) break;
      for (const G of gs) {
        G.cells.forEach(([r, c]) => (this.grid[r][c].die = 0.001));
        combos.push(G);
        this.comboPop(combos.length, G); this.clearFx(G);
        await U.wait(PZ_CFG.comboGap);
      }
      gs.forEach((G) => G.cells.forEach(([r, c]) => (this.grid[r][c] = null)));
      this.drop();
    }
    await this.waitSettle();
    this.turn++;
    if (combos.length) await this.attack(combos);
    if (this.boss.hp <= 0) return this.win();
    await this.bossTurn();
    if (this.hp <= 0) return this.lose();
    this.team.forEach((m) => (m.cd = Math.max(0, m.cd - 1)));
    this.buff = { pierce: false, combo: 0 };
    this.hud();
    this.state = 'idle';
  },
  waitSettle() { return new Promise((res) => { const f = () => (!this.on ? res() : this.settled() ? res() : requestAnimationFrame(f)); f(); }); },
  comboPop(n, G) {
    const el = this.root.querySelector('#pzCombo');
    el.innerHTML = `<b>${n}</b><span>Combo</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');   // 動畫自己淡出
    el.style.setProperty('--c', PZ_EL[G.c].c);
    this.sfx('pz_clear', { combo: n });
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
  },

  // 傷害公式：隊員攻擊 ×（該色每組 1＋多出顆數×25%）×（1＋(Combo−1)×25%）× 相剋 × 隊長加成，再扣防禦、減傷
  calc(combos) {
    const pow = {}; combos.forEach((G) => (pow[G.c] = (pow[G.c] || 0) + 1 + (G.cells.length - 3) * PZ_CFG.extraOrb));
    const n = combos.length + this.buff.combo, mult = 1 + (n - 1) * PZ_CFG.comboStep, B = this.boss, lead = this.team[0].el;
    const hits = this.team.map((m, i) => {
      if (!pow[m.el]) return null;
      const rel = pzRel(m.el, B.el), lm = m.el === lead ? 1.5 : 1;   // 隊長技「靈根共鳴」：與隊長同屬性的隊員攻擊 ×1.5
      let dmg = m.atk * pow[m.el] * mult * rel * lm;
      dmg = this.buff.pierce ? dmg : Math.max(1, (dmg - B.def) * (1 - B.dr));
      return { i, dmg: Math.round(dmg), rel };
    }).filter(Boolean);
    return { n, mult, hits, heal: pow.heart ? Math.round(this.rcv * pow.heart * mult) : 0 };
  },
  async attack(combos) {
    const R = this.calc(combos);
    this.maxCombo = Math.max(this.maxCombo, R.n);
    if (this.buff.combo) this.float(`連擊 +${this.buff.combo}`, '#ffd76a', 'mid');
    for (const h of R.hits) {
      const b = this.root.querySelector(`.pz-mem[data-m="${h.i}"]`); b.classList.remove('atk'); void b.offsetWidth; b.classList.add('atk');
      const el = document.createElement('span');
      el.className = 'pz-mnum' + (h.rel > 1 ? ' beat' : h.rel < 1 ? ' weak' : '');
      el.textContent = (h.rel > 1 ? '剋 ' : h.rel < 1 ? '抗 ' : '') + U.fmt(h.dmg);
      if (h.rel === 1) el.style.color = PZ_EL[this.team[h.i].el].c;
      b.appendChild(el); setTimeout(() => el.remove(), 1600);
      this.sfx('pz_hit', { heavy: h.rel > 1 });
      await U.wait(160);
    }
    const total = R.hits.reduce((s, h) => s + h.dmg, 0);
    if (R.heal) this.heal(R.heal);
    if (total) {
      await U.wait(250); this.totalDmg(total, R); this.hitBoss(total, '', 1, true);
      await U.wait(1350);                                  // 總傷害（滾動約 0.5 秒＋停留約 0.8 秒）播完才換相，兩者不重疊
      if (this.phaseCheck()) { this.hud(); await U.wait(1300); }
    }
    await U.wait(250);
  },
  hitBoss(dmg, color, rel, quiet) {
    const B = this.boss; B.hp = Math.max(0, B.hp - dmg);
    if (!quiet) this.float((rel > 1 ? '剋 ' : rel < 1 ? '抗 ' : '') + U.fmt(dmg), rel > 1 ? '#ffe36a' : rel < 1 ? '#a8b4c0' : color, 'boss', rel > 1);
    const bx = this.root.querySelector('#pzBoss'); bx.classList.remove('hit'); void bx.offsetWidth; bx.classList.add('hit');
    this.sfx('pz_hit', { heavy: rel > 1 });
    if (!quiet) this.phaseCheck(); this.hud();   // quiet＝連鎖總傷害：換相由 attack 等總傷害播完再處理
  },
  heal(n) {
    const real = Math.min(n, this.hpMax - this.hp); this.hp += real;
    this.float('+' + U.fmt(n), '#ff9ccc', 'team'); this.hud();
  },
  phaseCheck() {
    const B = this.boss, P = PZ_BOSS.phases, r = B.hp / B.max;
    let np = 0; P.forEach((p, i) => { if (i && r < p.at) np = i; });
    if (np <= B.phase || B.hp <= 0) return;
    B.phase = np; const ph = (B.ph = P[np]);
    B.el = ph.el; B.dr = ph.dr || 0; B.leech = ph.leech || 0; if (ph.atk) B.atk = Math.round(PZ_BOSS.atk * ph.atk);
    B.cd = Math.min(B.cd, ph.cd);
    this.banner(ph.banner[0], ph.banner[1]);
    if (typeof Audio2 !== 'undefined') Audio2.play('roar');
    this.root.querySelector('#pzBoss').classList.toggle('warded', B.dr > 0);
    this.root.querySelector('#pzBoss').classList.toggle('enrage', np === P.length - 1);
    this.root.querySelector('.pz-top').style.backgroundImage = `url(${PZ_ART.bg[np] || PZ_ART.bg[0]})`;
    return true;
  },
  async bossTurn() {
    const B = this.boss; B.cd--;
    this.hud();
    if (B.cd > 0) { await U.wait(150); return; }
    await U.wait(250);
    B.hits++;
    const heavy = B.hits % PZ_BOSS.heavyEvery === 0, dmg = Math.round(B.atk * (heavy ? B.ph.heavyMult : 1) * U.rand(0.92, 1.08));
    const bx = this.root.querySelector('#pzBoss'); bx.classList.remove('lunge'); void bx.offsetWidth; bx.classList.add('lunge');
    await U.wait(220);
    this.hp = Math.max(0, this.hp - dmg);
    this.float((heavy ? PZ_BOSS.heavyName + ' ' : '-') + U.fmt(dmg), '#ff6a6a', 'team', heavy);
    this.root.classList.remove('hurt'); void this.root.offsetWidth; this.root.classList.add('hurt');
    this.sfx('pz_hurt');
    if (navigator.vibrate) try { navigator.vibrate(heavy ? [40, 40, 60] : 30); } catch (er) {}
    if (B.leech) { const lh = Math.round(dmg * B.leech); B.hp = Math.min(B.max, B.hp + lh); this.float('吸血 +' + U.fmt(lh), '#ff6a7a', 'boss'); }
    B.cd = B.ph.cd;
    this.hud();
    await U.wait(450);
  },

  // ───────── 隊員技能（冷卻以回合計，施放不結束回合） ─────────
  skill(i) {
    const m = this.team[i];
    if (this.state !== 'idle') return;
    if (m.cd > 0) { this.toast(`${m.name}「${m.sk.name}」：${m.sk.desc}（還要 ${m.cd} 回合）`); return; }
    const B = this.boss;
    m.cd = m.sk.cd;
    this.banner(m.sk.name, m.name);
    this.sfx('pz_cast');
    this.fx(m.id);
    if (m.id === 'hero') {
      const rel = pzRel(m.el, B.el), dmg = Math.round(Math.max(1, (m.atk * 12 * rel - B.def) * (1 - B.dr)));
      setTimeout(() => { this.hitBoss(dmg, PZ_EL[m.el].c, rel); if (B.hp <= 0) { this.state = 'resolve'; setTimeout(() => this.win(), 600); } }, 350);
    } else if (m.id === 'mate') {
      const to = this.team[0].el;
      this.grid.forEach((row) => row.forEach((o) => { if (o && o.c === 'heart') { o.c = to; o.die = 0; } }));
      this.heal(Math.round(this.hpMax * 0.2));
    } else if (m.id === 'jinxia') { this.buff.pierce = true; this.float('破防', '#f3e7b0', 'mid'); }
    else if (m.id === 'zichen') { B.cd = Math.min(9, B.cd + 1); this.float('霜寒・倒數 +1', '#9fd8ff', 'boss'); }
    else if (m.id === 'chixiao') { this.buff.combo += 2; this.float('本回合 Combo +2', '#ffb08a', 'mid'); }
    this.hud();
  },

  // ───────── 介面更新與提示 ─────────
  hud() {
    const B = this.boss, q = (s) => this.root.querySelector(s);
    q('#pzBHp').style.width = (100 * B.hp) / B.max + '%'; q('#pzBHpT').textContent = `${U.fmt(B.hp)} / ${U.fmt(B.max)}`;
    q('#pzTHp').style.width = (100 * this.hp) / this.hpMax + '%'; q('#pzTHpT').textContent = `${U.fmt(this.hp)} / ${U.fmt(this.hpMax)}`;
    q('#pzPh').textContent = B.ph.name + (B.dr ? `・減傷 ${Math.round(B.dr * 100)}%` : '') + (B.leech ? '・吸血' : '');
    const E = PZ_EL[B.el], el = q('#pzBEl'); el.textContent = E.ch; el.style.setProperty('--c', E.c); el.style.setProperty('--d', E.d);
    q('#pzCd b').textContent = Math.max(0, B.cd);
    const heavyNext = (B.hits + 1) % PZ_BOSS.heavyEvery === 0;
    q('#pzCd').classList.toggle('danger', B.cd <= 1);
    // 提示剋制：哪個屬性打這隻有 1.5 倍
    const weak = Object.keys(PZ_BEATS).find((k) => PZ_BEATS[k] === B.el);
    q('#pzWarn').innerHTML = (heavyNext ? `<span class="hv">下次出手：${PZ_BOSS.heavyName}（約 ${U.fmt(B.atk * B.ph.heavyMult)}）</span>` : '') + `<span>弱點 <i style="color:${PZ_EL[weak].c}">${PZ_EL[weak].ch}</i>　抗 <i style="color:${PZ_EL[PZ_BEATS[B.el]].c}">${PZ_EL[PZ_BEATS[B.el]].ch}</i></span>`;
    this.root.querySelectorAll('.pz-mem').forEach((b, i) => {
      const m = this.team[i]; b.classList.toggle('ready', m.cd === 0);
      b.querySelector('.pz-sk').textContent = m.cd === 0 ? m.sk.name : `${m.sk.name} ${m.cd}`;
    });
  },
  // 總傷害：數字從 0 滾到總數，下方標 Combo 倍率
  totalDmg(total, R) {
    const el = document.createElement('div'); el.className = 'pz-total';
    el.innerHTML = `<b>0</b><small>${R.n} Combo ×${R.mult.toFixed(2)}</small>`;
    this.root.querySelector('.pz-top').appendChild(el);
    const b = el.firstChild, t0 = performance.now(), dur = 520;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); b.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step); setTimeout(() => el.remove(), 1300);
  },
  float(txt, color, where, big) {
    const fl = this.root.querySelector('#pzFl'), el = document.createElement('span');
    el.className = 'pz-num ' + where + (big ? ' big' : ''); el.textContent = txt; el.style.color = color;
    el.style.setProperty('--dx', where === 'team' ? '0px' : Math.round(U.rand(-40, 40)) + 'px');
    if (where === 'team') { el.style.top = 'auto'; }
    (where === 'team' ? this.root.querySelector('.pz-team') : fl).appendChild(el);
    setTimeout(() => el.remove(), 1100);
  },
  banner(a, b) {
    const el = document.createElement('div'); el.className = 'pz-banner'; el.innerHTML = `<b>${a}</b>${b ? `<span>${b}</span>` : ''}`;
    this.root.querySelector('.pz-top').appendChild(el); setTimeout(() => el.remove(), 1500);
  },
  clearFx(G) {
    const src = this.clr[G.c]; if (!src) return;
    // 每顆被消除的珠子各放一張，固定珠子 1.5 倍大，五行一致、不會蓋到隔壁太多
    const cell = this.cell, size = cell * 1.5, wrap = this.root.querySelector('.pz-boardwrap');
    G.cells.forEach(([r, c]) => {
      const im = new Image(); im.className = 'pz-clr'; im.alt = ''; im.src = src;
      im.style.cssText = `--m:url(${src});width:${size}px;height:${size}px;left:${this.cv.offsetLeft + (c + 0.5) * cell}px;top:${this.cv.offsetTop + (r + 0.5) * cell}px`;
      im.onerror = im.onanimationend = () => im.remove();
      wrap.appendChild(im);
    });
  },
  fx(id) {
    const src = PZ_ART.fx[id]; if (!src) return;
    const im = new Image(); im.className = `pz-fx fx-${id}`; im.alt = ''; im.src = src;
    im.onerror = im.onanimationend = () => im.remove();
    this.root.querySelector('.pz-top').appendChild(im);   // 不放 #pzFl：它有 z-index，screen 混色會只混到透明底而露出黑框
  },
  toast(msg) {
    const t = this.root.querySelector('#pzToast'); t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2600);
  },
  help() {
    this.endPanel(`<h3>轉珠試煉・原型</h3>
      <p>按住任一顆珠子拖曳，經過的珠子會跟它換位（可斜走）。放開手指，或第一次換位後 ${this.moveTime} 秒到，就結算。</p>
      <p>橫或直 3 顆以上同色相連就消除，相連的同色算 1 個 Combo；消除後上方掉珠，可再連鎖。每多 1 Combo 傷害 +25%。</p>
      <p>每位隊員打自己顏色的珠。五行相剋：木剋土、土剋水、水剋火、火剋金、金剋木（剋 1.5 倍、被剋 0.5 倍）。心珠回血。</p>
      <p>首領頭上數字是出手倒數。點隊員頭像施放技能（冷卻歸零才能用，不會結束回合）。</p>`, [['繼續', () => this.endClose()]]);
  },
  endPanel(html, btns) {
    const el = this.root.querySelector('#pzEnd');
    el.innerHTML = `<div class="pz-panel">${html}<div class="pz-row">${btns.map((b, i) => `<button class="pz-btn wide" data-b="${i}">${b[0]}</button>`).join('')}</div></div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('[data-b]').forEach((b) => (b.onclick = btns[+b.dataset.b][1]));
  },
  endClose() { this.root.querySelector('#pzEnd').classList.add('hidden'); },
  win() {
    this.state = 'end';
    if (typeof Audio2 !== 'undefined') Audio2.play('boom');
    this.endPanel(`<h3>斬殺妖將</h3><p class="c">${this.turn} 回合・最高 ${this.maxCombo} Combo・剩餘氣血 ${Math.round((100 * this.hp) / this.hpMax)}%</p><p class="c note">原型不發獎勵、不寫存檔</p>`,
      [['再戰', () => this.restart()], ['離開', () => this.close()]]);
  },
  lose() {
    this.state = 'end';
    this.endPanel(`<h3>道消身殞</h3><p class="c">撐了 ${this.turn} 回合・首領剩 ${Math.round((100 * this.boss.hp) / this.boss.max)}%</p>`, [['再戰', () => this.restart()], ['離開', () => this.close()]]);
  },
  restart() { this.reset(); this.root.querySelector('.pz-top').style.backgroundImage = `url(${PZ_ART.bg[0]})`; const fl = this.root.querySelector('#pzFl'); this.root.querySelector('#pzBoss').className = 'pz-boss'; fl.innerHTML = ''; this.endClose(); this.hud(); },

  // 合成短音（Audio2 的音訊環境與音效音量）
  // 音效一律走 Audio2.play(key)：目前是合成音，之後在 audio.js 的 SFX_MAP 掛上音檔就自動換
  sfx(key, opt) { if (typeof Audio2 !== 'undefined') Audio2.play(key, opt); },
};

// ───────── 開發模式入口 ─────────
if (typeof DEV !== 'undefined' && DEV) {
  // 歷練頁最上方加「轉珠試煉」
  const _map = UI.map;
  UI.map = function () {
    _map.apply(this, arguments);
    const box = $('#ctrlContent'), t = box && box.querySelector('.sec-title');
    if (!t) return;
    const b = document.createElement('button');
    b.className = 'region'; b.id = 'pzEntry';
    b.style.cssText = `background-image:url(${PZ_ART.bg[0]});background-position:${PZ_ART.bgPos}`;
    b.innerHTML = '<h4>轉珠試煉</h4><p>原型・血甲妖將</p><span class="prog">測試・不寫存檔</span>';
    b.onclick = () => Puzzle.open();
    t.after(b);
  };
  // 標題畫面也放一顆入口（沒有存檔也能測）
  const _title = Game.title;
  Game.title = function () {
    _title.apply(this, arguments);
    const b = document.createElement('button'); b.className = 't-imp t-pz'; b.textContent = '轉珠原型'; b.onclick = () => Puzzle.open();
    const s = $('#sceneContent'); if (s) s.appendChild(b);
  };
  // 網址帶 &pz 直接開啟
  if (/[?&]pz(=|&|$)/.test(location.search)) addEventListener('load', () => setTimeout(() => Puzzle.open(), 50));
}
