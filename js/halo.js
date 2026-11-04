'use strict';
// ════════════════════════════════════════════
//  主角光環（Canvas）
//  sit：腳下雙層法陣（外圈符文、內圈八卦，反向慢轉）＋靈氣絲帶螺旋繞身，顏色隨境界
//  stand／battle：背後多層光環（實圈、虛圈、放射光芒），呼吸式明暗，顏色隨主手兵器品階
//  靜態圖層先畫進離屏畫布，每幀只做旋轉貼圖，手機也能穩定 60fps；低階機或掉幀時自動降成單層
// ════════════════════════════════════════════

// 境界顏色：練氣青、築基翠、金丹金、元嬰紫
const REALM_HUE = [
  { c: '#8fe8ff', e: '#d8f8ff' }, { c: '#7dffb8', e: '#d6ffe8' }, { c: '#ffd76a', e: '#fff2c4' }, { c: '#c9a6ff', e: '#f0e2ff' },
];

const Halo = {
  list: [], raf: 0, low: null, slow: 0, ft: [],
  RUNES: '乾坤震巽坎離艮兌天地風雷水火山澤道法自然氣聚丹成',
  TRIGRAMS: ['111', '011', '101', '001', '110', '010', '100', '000'],   // 先天八卦（1＝陽爻）

  // 低階機判斷：減少動態、核心數或記憶體偏低。執行中若連續掉幀也會降級
  isLow() {
    if (this.low !== null) return this.low;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    return (this.low = reduce || cores < 4 || mem < 3);
  },

  // 掛上光環：mode = sit | stand | battle；target 為主角圖的選擇器，畫布鋪滿整個場景
  mount(mode, target, color) {
    const host = $('#sceneContent'), el = host && host.querySelector(target);
    if (!el) return null;
    const mk = (cls) => { const cv = document.createElement('canvas'); cv.className = 'halo-cv ' + cls; return cv; };
    const back = mk('back'), front = mode === 'sit' ? mk('front') : null;
    host.insertBefore(back, host.firstChild);
    if (front) host.appendChild(front);
    const lv = S.d ? S.d.lv : 0, hue = REALM_HUE[Math.min(3, Math.floor(lv / 3))];
    const inst = { mode, el, back, front, t: Math.random() * 10, c: color ? color.c : hue.c, e: color ? color.e : hue.e, sub: lv % 3, sprites: {} };
    this.list.push(inst); this.fit(inst);
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((n) => this.loop(n)); }
    return inst;
  },
  fit(I) {
    const r = $('#sceneContent').getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    for (const cv of [I.back, I.front]) if (cv) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    I.W = r.width; I.H = r.height; I.dpr = dpr; I.sprites = {};
  },
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.list = this.list.filter((I) => I.back.isConnected);
    if (!this.list.length) { this.raf = 0; return; }
    // 掉幀偵測：最近 90 幀平均超過 24ms 就降成單層
    this.ft.push(dt); if (this.ft.length > 90) this.ft.shift();
    if (!this.low && this.ft.length === 90 && this.ft.reduce((a, b) => a + b) / 90 > 0.024) { this.low = true; this.list.forEach((I) => (I.sprites = {})); }
    for (const I of this.list) {
      const r = $('#sceneContent').getBoundingClientRect();
      if (Math.abs(r.width - I.W) > 1 || Math.abs(r.height - I.H) > 1) this.fit(I);
      I.t += dt; this.draw(I, r);
    }
    this.raf = requestAnimationFrame((n) => this.loop(n));
  },

  // ───────── 離屏圖層 ─────────
  sprite(I, key, R, fn) {
    if (I.sprites[key]) return I.sprites[key];
    const s = Math.ceil(R * 2 * I.dpr) + 4, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const c = cv.getContext('2d'); c.translate(s / 2, s / 2); c.scale(I.dpr, I.dpr); fn(c, R);
    return (I.sprites[key] = cv);
  },
  // 外圈：雙圓＋刻度＋符文
  runeRing(I, c, R) {
    c.strokeStyle = I.c; c.fillStyle = I.e; c.shadowColor = I.c; c.shadowBlur = 10; c.lineWidth = 2.4;
    c.beginPath(); c.arc(0, 0, R * 0.98, 0, 7); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R * 0.78, 0, 7); c.stroke();
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r0 = R * 0.94, r1 = R * (i % 2 ? 0.9 : 0.86); c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke(); }
    c.font = `700 ${Math.round(R * 0.1)}px ${BRUSH}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowBlur = 6;
    const ch = [...this.RUNES];
    for (let i = 0; i < ch.length; i++) { const a = (i / ch.length) * Math.PI * 2; c.save(); c.rotate(a); c.translate(0, -R * 0.86); c.fillText(ch[i], 0, 0); c.restore(); }
  },
  // 內圈：八卦爻象＋太極
  bagua(I, c, R) {
    c.strokeStyle = I.c; c.fillStyle = I.e; c.shadowColor = I.c; c.shadowBlur = 8; c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, R * 0.62, 0, 7); c.stroke();
    // 八角框
    c.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; c.lineTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); } c.stroke();
    const w = R * 0.16, h = R * 0.028, gap = R * 0.045;
    this.TRIGRAMS.forEach((tg, i) => {
      c.save(); c.rotate((i / 8) * Math.PI * 2); c.translate(0, -R * 0.46);
      [...tg].forEach((y, j) => { const yy = (j - 1) * gap; if (y === '1') c.fillRect(-w / 2, yy - h / 2, w, h); else { c.fillRect(-w / 2, yy - h / 2, w * 0.42, h); c.fillRect(w * 0.08, yy - h / 2, w * 0.42, h); } });
      c.restore();
    });
    // 太極
    const r = R * 0.2; c.lineWidth = 1.4;
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
    c.globalAlpha = 0.55; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); c.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); c.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(0, -r / 2, r * 0.12, 0, 7); c.stroke(); c.beginPath(); c.arc(0, r / 2, r * 0.12, 0, 7); c.fill();
  },
  // 背光：放射光芒
  rays(I, c, R) {
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, L = R * (i % 2 ? 0.82 : 1), wd = i % 2 ? 0.035 : 0.06;
      const g = c.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
      g.addColorStop(0, hexA(I.e, 0)); g.addColorStop(0.45, hexA(I.c, 0.55)); g.addColorStop(1, hexA(I.c, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, L, a - wd, a + wd); c.closePath(); c.fill();
    }
  },
  // 虛圈：斷續弧段＋小點
  dashRing(I, c, R) {
    c.strokeStyle = I.e; c.shadowColor = I.c; c.shadowBlur = 8; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.arc(0, 0, R, a, a + 0.32); c.stroke(); }
    c.fillStyle = I.e; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.42; c.beginPath(); c.arc(Math.cos(a) * R, Math.sin(a) * R, 2.2, 0, 7); c.fill(); }
    c.lineWidth = 0.8; c.globalAlpha = 0.6; c.beginPath(); c.arc(0, 0, R * 0.9, 0, 7); c.stroke();
  },

  // ───────── 每幀繪製 ─────────
  draw(I, sc) {
    const er = I.el.getBoundingClientRect(), low = this.low || this.isLow();
    const bc = I.back.getContext('2d'); bc.setTransform(I.dpr, 0, 0, I.dpr, 0, 0); bc.clearRect(0, 0, I.W, I.H);
    if (I.front) { const fc = I.front.getContext('2d'); fc.setTransform(I.dpr, 0, 0, I.dpr, 0, 0); fc.clearRect(0, 0, I.W, I.H); }
    if (!er.width) return;
    const x = er.left - sc.left, y = er.top - sc.top;
    if (I.mode === 'sit') this.drawSit(I, bc, x + er.width / 2, y + er.height * 0.93, er.width, er.height, low);
    else this.drawBack(I, bc, x + er.width * (I.mode === 'battle' ? 0.5 : 0.47), y + er.height * (I.mode === 'battle' ? 0.24 : 0.17), Math.min(er.width * 0.62, er.height * 0.3), low);
  },
  drawSit(I, c, cx, cy, w, h, low) {
    const R = w * 0.6, t = I.t, br = 0.7 + 0.3 * Math.sin(t * 1.4);
    c.save(); c.globalCompositeOperation = 'lighter';
    // 地面光暈
    blob(c, cx, cy, R * 1.1, hexA(I.c, 0.18 * br));
    c.translate(cx, cy); c.scale(1, 0.3);
    const outer = this.sprite(I, 'rune', R, (cc, r) => this.runeRing(I, cc, r));
    c.globalAlpha = 0.85 * br; c.save(); c.rotate(t * 0.18); c.drawImage(outer, -outer.width / 2 / I.dpr, -outer.height / 2 / I.dpr, outer.width / I.dpr, outer.height / I.dpr); c.restore();
    if (!low) {
      const inner = this.sprite(I, 'bagua', R, (cc, r) => this.bagua(I, cc, r));
      c.globalAlpha = 0.9 * br; c.save(); c.rotate(-t * 0.28); c.drawImage(inner, -inner.width / 2 / I.dpr, -inner.height / 2 / I.dpr, inner.width / I.dpr, inner.height / I.dpr); c.restore();
    }
    c.restore();
    if (low) return;
    // 靈氣絲帶：從地面螺旋上升繞身；在身前的段落畫到前層畫布
    const fc = I.front.getContext('2d'), N = 3 + I.sub, SEG = 34, top = h * 0.95;
    for (const cv of [c, fc]) { cv.save(); cv.globalCompositeOperation = 'lighter'; cv.lineCap = 'round'; }
    for (let k = 0; k < N; k++) {
      const ph = (k / N) * Math.PI * 2, spd = 0.55 + k * 0.07;
      let px = null, py = null;
      for (let i = 0; i <= SEG; i++) {
        const s = i / SEG, th = ph + s * Math.PI * 2.4 + t * spd, rr = R * (0.95 - 0.5 * s) * (1 + 0.05 * Math.sin(t * 2 + k));
        const x = cx + Math.cos(th) * rr, y = cy - s * top + Math.sin(th) * rr * 0.3, front = Math.sin(th) > 0;
        if (px !== null) {
          const flow = 0.5 + 0.5 * Math.sin((s * 6 - t * 2.2 + k) * Math.PI);   // 往上流動的亮帶
          const a = Math.sin(s * Math.PI) * (0.25 + 0.6 * flow) * 0.8, cv = front ? fc : c;
          cv.strokeStyle = hexA(flow > 0.8 ? I.e : I.c, a); cv.lineWidth = (1 - s) * 5 + 1;
          cv.beginPath(); cv.moveTo(px, py); cv.lineTo(x, y); cv.stroke();
        }
        px = x; py = y;
      }
      // 絲帶頂端的光點
      const s = (t * 0.25 + k / N) % 1, th = ph + s * Math.PI * 2.4 + t * spd, rr = R * (0.95 - 0.5 * s);
      const x = cx + Math.cos(th) * rr, y = cy - s * top + Math.sin(th) * rr * 0.3, cv = Math.sin(th) > 0 ? fc : c;
      cv.fillStyle = hexA(I.e, Math.sin(s * Math.PI)); cv.beginPath(); cv.arc(x, y, 2.4, 0, 7); cv.fill();
      blob(cv, x, y, 10, hexA(I.c, 0.35 * Math.sin(s * Math.PI)));
    }
    for (const cv of [c, fc]) cv.restore();
  },
  drawBack(I, c, cx, cy, R, low) {
    const t = I.t, br = 0.62 + 0.38 * Math.sin(t * 1.6);   // 呼吸
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(cx, cy);
    blob(c, 0, 0, R * 1.25, hexA(I.c, 0.22 * br));
    const draw = (sp, rot, a, sc = 1) => { c.save(); c.rotate(rot); c.globalAlpha = a; const s = sp.width / I.dpr * sc; c.drawImage(sp, -s / 2, -s / 2, s, s); c.restore(); };
    if (!low) {
      draw(this.sprite(I, 'rays', R * 1.5, (cc, r) => this.rays(I, cc, r)), t * 0.08, 0.55 * br + 0.15, 1 + 0.04 * br);
      draw(this.sprite(I, 'dash', R * 1.18, (cc, r) => this.dashRing(I, cc, r * 0.97)), -t * 0.25, 0.75 * br + 0.2);
    }
    // 實圈：粗光環＋內細環
    c.globalAlpha = 0.55 + 0.45 * br; c.strokeStyle = I.c; c.shadowColor = I.c; c.shadowBlur = 18; c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke();
    c.strokeStyle = I.e; c.shadowBlur = 6; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, R - 3, 0, 7); c.stroke();
    if (!low) { c.globalAlpha = 0.5 * br; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R * 0.72, 0, 7); c.stroke(); }
    c.restore();
  },
};

// ════════════════════════════════════════════
//  兵器展示框粒子：品階越高越密；神器加電光環繞
// ════════════════════════════════════════════
const Showcase = {
  start(cv, tier, color, edge) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = r.width, H = r.height;
    if (!W) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext('2d'), low = Halo.isLow(), n = Math.round([6, 10, 18, 26, 40][tier] * (low ? 0.5 : 1));
    const mk = (init) => ({ x: U.rand(W * 0.15, W * 0.85), y: init ? U.rand(0, H) : H + 4, vy: -U.rand(10, 26) * (1 + tier * 0.25), vx: U.rand(-6, 6), r: U.rand(0.8, 2.2) + (tier >= 3 ? 0.6 : 0), ph: Math.random() * 7, gold: tier >= 3 && Math.random() < 0.4 });
    const ps = Array.from({ length: n }, () => mk(true));
    let arcs = [], arcT = 0, t = 0, last = performance.now();
    const cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.36;
    const loop = (now) => {
      if (!cv.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]; p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 1.5 + p.ph) * 8) * dt;
        if (p.y < -4) { ps[i] = mk(false); continue; }
        const a = Math.min(1, (H - p.y) / 40, p.y / 60) * (0.55 + 0.45 * Math.sin(t * 3 + p.ph));
        c.fillStyle = hexA(p.gold ? edge : color, Math.max(0, a)); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
        if (tier >= 2) blob(c, p.x, p.y, p.r * 4, hexA(p.gold ? edge : color, Math.max(0, a) * 0.25));
      }
      // 神器：沿劍周圍的鋸齒電光，約 90ms 換一次形狀
      if (tier >= 4) {
        arcT -= dt;
        if (arcT <= 0) {
          arcT = 0.09; arcs = [];
          for (let k = 0; k < (low ? 2 : 4); k++) {
            const a0 = Math.random() * Math.PI * 2, span = U.rand(0.6, 1.4), pts = [];
            for (let j = 0; j <= 10; j++) { const a = a0 + (span * j) / 10, rr = R * U.rand(0.86, 1.14); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.25]); }
            arcs.push(pts);
          }
        }
        c.lineJoin = 'round';
        for (const pts of arcs) {
          c.strokeStyle = 'rgba(220,200,255,0.9)'; c.shadowColor = '#b48cff'; c.shadowBlur = 12; c.lineWidth = 2;
          c.beginPath(); pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.stroke();
        }
        c.shadowBlur = 0;
        if (Math.random() < dt * 0.8) FX.flash = Math.max(FX.flash, 0.15);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
};
