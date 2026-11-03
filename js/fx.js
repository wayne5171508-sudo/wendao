'use strict';
// ════════════════════════════════════════════
//  特效層：覆蓋整個畫面的一張畫布（靈氣光點、雲霧、劍光、雷、靈罩、天象、傷害數字）
// ════════════════════════════════════════════

const BRUSH = '"LXGW WenKai TC","Kaiti TC","STKaiti","BiauKai","Songti TC",serif';

const FX = {
  cv: null, c: null, w: 0, h: 0, dpr: 1, list: [], motes: [], mists: [], ambient: 'qi', storm: 0, stormT: 0, flash: 0, t: 0,
  cranes: [], craneT: 2, cranesOn: false,
  // 遠景白鶴：淡色剪影成群掠過
  drawCranes(dt) {
    const c = this.c;
    this.craneT -= dt;
    if (this.craneT <= 0) {
      this.craneT = U.rand(8, 15);
      const dir = U.chance(0.5) ? 1 : -1, y = U.rand(0.1, 0.32), n = U.randi(2, 4), s = U.rand(0.55, 0.9);
      for (let i = 0; i < n; i++) this.cranes.push({ x: dir > 0 ? -0.1 - i * 0.06 : 1.1 + i * 0.06, y: y + i * 0.03 * (i % 2 ? 1 : -1), dir, s: s * U.rand(0.85, 1), v: U.rand(0.03, 0.045), ph: Math.random() * 7 });
    }
    for (const k of this.cranes) {
      k.x += k.v * k.dir * dt; k.ph += dt * 3.2;
      const x = k.x * this.w, y = k.y * this.h, flap = Math.sin(k.ph * 0.75);
      c.save(); c.translate(x, y); c.scale(k.dir * k.s, k.s); c.globalAlpha = 0.7;
      c.fillStyle = '#e4ecf2'; c.strokeStyle = '#e4ecf2'; c.lineCap = 'round';
      c.beginPath(); c.ellipse(0, 0, 13, 3, -0.06, 0, 7); c.fill();
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(11, -1); c.quadraticCurveTo(20, -5, 27, -3); c.stroke();
      c.lineWidth = 1; c.beginPath(); c.moveTo(-11, 1); c.lineTo(-25, 3); c.stroke();
      for (const sd of [1, -0.45]) { const ty = -26 * flap * sd; c.fillStyle = '#e4ecf2'; c.beginPath(); c.moveTo(-6, 0); c.bezierCurveTo(-4, ty * 0.6, -6, ty, -16, ty - 2); c.bezierCurveTo(-10, ty * 0.5, 0, ty * 0.15, 6, 0); c.fill(); c.fillStyle = 'rgba(20,28,40,0.55)'; c.beginPath(); c.ellipse(-13, ty - 1, 4, 2, 0.4, 0, 7); c.fill(); }
      c.fillStyle = '#c8302a'; c.beginPath(); c.arc(26, -4, 1.2, 0, 7); c.fill(); c.restore();
    }
    this.cranes = this.cranes.filter((k) => k.x > -0.4 && k.x < 1.4);
  },
  init(cv) {
    this.cv = cv; this.c = cv.getContext('2d');
    for (let i = 0; i < 6; i++) this.mists.push({ x: Math.random(), y: 0.25 + Math.random() * 0.7, r: U.rand(0.35, 0.7), v: U.rand(0.006, 0.016), a: U.rand(0.05, 0.1) });
    this.resize();
  },
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = Math.min(2, devicePixelRatio || 1); this.w = r.width; this.h = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
  },
  add(p) { p.t = 0; p.life = p.life || 0.6; this.list.push(p); return p; },
  clear() { this.list.length = 0; },

  // ───────── 產生器 ─────────
  burst(x, y, color, n = 12, speed = 160, size = 3, life = 0.6) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * U.rand(0.3, 1); this.add({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: size * U.rand(0.5, 1.4), color, life: life * U.rand(0.6, 1.2), drag: 3 }); }
  },
  sparks(x, y, color, n = 8, speed = 320) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * U.rand(0.4, 1); this.add({ k: 'streak', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: U.rand(0.15, 0.3), drag: 6 }); }
  },
  ring(x, y, color, r0, r1, life = 0.4, width = 3) { this.add({ k: 'ring', x, y, r0, r1, color, life, width }); },
  // 劍光：斜向新月弧
  slash(x, y, r, ang, color, life = 0.28) { this.add({ k: 'slash', x, y, r, ang, color, life }); },
  wave(x0, y0, x1, y1, color, life = 0.32) { this.add({ k: 'wave', x0, y0, x1, y1, color, life }); },
  bolt(x, y, color = '#e6d6ff', width = 4, life = 0.32) {
    const pts = []; let px = x + U.rand(-60, 60);
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push({ x: U.lerp(px, x, t) + (i && i < 12 ? U.rand(-22, 22) : 0), y: U.lerp(-20, y, t) }); }
    this.add({ k: 'bolt', pts, color, width, life });
  },
  text(x, y, str, color = '#fff', size = 22) {
    // 不飄進頂部怪物名牌與血條（約佔畫面上方 110px）：起點至少在血條下方「字高＋飄升距離」
    const rise = 70 * Math.min(1, this.h / 520), floor = Math.min(250, Math.max(this.h * 0.48, 110 + size + rise));
    let yy = Math.max(y, floor);
    for (const p of this.list) if (p.k === 'text' && p.t < 0.3 && Math.abs(p.x - x) < 50 && Math.abs(p.y - yy) < size) yy = p.y - size - 2;
    if (yy < floor) { yy = floor; x += U.pick([-1, 1]) * U.rand(45, 80); }   // 疊太高就改往左右錯開
    this.add({ k: 'text', x: x + U.rand(-10, 10), y: yy, vy: -rise,   // 矮畫面飄短一點
      str, color, size, life: 1.0 });
  },
  converge(x, y, color, n = 20, radius = 260, life = 1.2) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = radius * U.rand(0.6, 1.1); this.add({ k: 'conv', sx: x + Math.cos(a) * r, sy: y + Math.sin(a) * r, tx: x, ty: y, color, size: U.rand(1.6, 3.6), life: life * U.rand(0.7, 1.2), curl: U.rand(-1.2, 1.2) }); }
  },
  pillar(x, y, color, w = 90, life = 2) { this.add({ k: 'pillar', x, y, w, color, life }); },
  array(x, y, r, color, life = 1.2, spin = 1.6) { this.add({ k: 'array', x, y, r, color, life, spin }); },
  swordRain(x, y, color) {
    for (let i = 0; i < 18; i++) { const sx = x + U.rand(-120, 120), d = i * 0.035; this.add({ k: 'sword', x0: sx + U.rand(-30, 30), y0: -40, x1: x + U.rand(-50, 50), y1: y + U.rand(-30, 30), color, life: 0.45 + d, delay: d }); }
  },
  shake(el, mag = 6) {
    if (!el || this.noShake || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${mag}px,${-mag / 2}px)` }, { transform: `translate(${-mag}px,${mag / 2}px)` }, { transform: `translate(${mag / 2}px,0)` }, { transform: 'translate(0,0)' }], { duration: 220 });
  },

  // ───────── 更新與繪製 ─────────
  frame(dt) {
    this.t += dt;
    const c = this.c, W = this.w, H = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, W, H);
    // 天象異變
    this.storm = U.lerp(this.storm, this.stormT, Math.min(1, dt * 1.5));
    if (this.storm > 0.02) {
      c.fillStyle = `rgba(18,8,40,${0.55 * this.storm})`; c.fillRect(0, 0, W, H);
      c.save(); c.translate(W / 2, H * 0.08); c.scale(1, 0.4); c.rotate(this.t * 0.35);
      for (let i = 0; i < 7; i++) { c.rotate(0.9); blob(c, W * 0.22, 0, W * 0.32, `rgba(70,30,110,${0.4 * this.storm})`); }
      c.restore();
      if (this.storm > 0.6 && Math.random() < dt * 0.9) { this.flash = 0.7; this.bolt(U.rand(W * 0.1, W * 0.9), U.rand(H * 0.15, H * 0.45), '#d8c8ff', 2.5, 0.25); Audio2.play('thunder'); }
    }
    // 雲霧帶與靈氣光點
    if (this.ambient) {
      for (const m of this.mists) {
        m.x += m.v * dt; if (m.x - m.r > 1.2) m.x = -m.r;
        c.save(); c.globalAlpha = m.a; c.translate(m.x * W, m.y * H); c.scale(1, 0.28); blob(c, 0, 0, m.r * W * 1.4, this.ambient === 'realm' ? 'rgba(150,70,110,1)' : 'rgba(215,228,245,1)'); c.restore();
      }
      while (this.motes.length < 34) this.motes.push({ x: Math.random() * W, y: H * U.rand(0.2, 1.05), vy: U.rand(-26, -8), s: U.rand(0.8, 2.2), t: 0, life: U.rand(4, 9), ph: Math.random() * 7, gold: Math.random() < 0.25 });
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        m.t += dt; m.y += m.vy * dt; m.x += Math.sin(this.t * 1.1 + m.ph) * 0.3;
        const a = Math.sin((Math.PI * m.t) / m.life), col = this.ambient === 'realm' ? (m.gold ? '255,150,90' : '255,90,130') : m.gold ? '255,226,160' : '160,225,255';
        c.fillStyle = `rgba(${col},${a * 0.12})`; c.beginPath(); c.arc(m.x, m.y, m.s * 3, 0, 7); c.fill();
        c.fillStyle = `rgba(${col},${a * 0.85})`; c.beginPath(); c.arc(m.x, m.y, m.s * 0.8, 0, 7); c.fill();
      }
      c.restore();
      this.motes = this.motes.filter((m) => m.t < m.life);
    }
    if (this.cranesOn) this.drawCranes(dt);
    // 特效
    for (const p of this.list) {
      p.t += dt;
      if (p.vx !== undefined) { p.x += p.vx * dt; p.y += (p.vy || 0) * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; } }
      else if (p.vy) p.y += p.vy * dt;
      const t = p.t - (p.delay || 0); if (t < 0) continue;
      const k = Math.max(0, 1 - t / (p.life - (p.delay || 0)));
      c.save(); c.globalAlpha = k;
      if (p.k !== 'text') c.globalCompositeOperation = 'lighter';
      switch (p.k) {
        case 'dot': c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, 7); c.fill(); break;
        case 'streak': { const sp = Math.hypot(p.vx, p.vy) || 1, L = Math.min(18, sp * 0.06) * k + 2; c.strokeStyle = p.color; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - (p.vx / sp) * L, p.y - (p.vy / sp) * L); c.stroke(); break; }
        case 'ring': c.strokeStyle = p.color; c.lineWidth = p.width * k + 0.5; c.beginPath(); c.arc(p.x, p.y, U.lerp(p.r0, p.r1, 1 - k), 0, 7); c.stroke(); break;
        case 'slash': {
          const prog = Math.min(1, t / (p.life * 0.45)), a0 = p.ang - 1.1, a1 = a0 + 2.2 * (1 - Math.pow(1 - prog, 3));
          c.translate(p.x, p.y); c.rotate(-0.35);
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = k * 0.4; c.strokeStyle = '#0a0e18'; c.lineWidth = p.r * 0.26; c.lineCap = 'round';
          c.beginPath(); c.arc(0, 0, p.r * 0.84, a0, a1); c.stroke();
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = k;
          const g = c.createRadialGradient(0, 0, p.r * 0.5, 0, 0, p.r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, p.color); g.addColorStop(1, '#ffffff');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r, a0, a1); c.arc(0, 0, p.r * 0.66, a1, a0, true); c.closePath(); c.fill();
          c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.shadowColor = p.color; c.shadowBlur = 16; c.beginPath(); c.arc(0, 0, p.r, Math.max(a0, a1 - 0.5), a1); c.stroke();
          break;
        }
        case 'wave': {
          const prog = Math.min(1, t / (p.life * 0.7)), x = U.lerp(p.x0, p.x1, prog), y = U.lerp(p.y0, p.y1, prog), ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
          c.translate(x, y); c.rotate(ang); c.shadowColor = p.color; c.shadowBlur = 22; c.fillStyle = p.color;
          c.beginPath(); c.arc(-12, 0, 40, -1.2, 1.2); c.arc(-30, 0, 44, 1.0, -1.0, true); c.closePath(); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(-12, 0, 40, -0.8, 0.8); c.arc(-20, 0, 36, 0.7, -0.7, true); c.closePath(); c.fill();
          break;
        }
        case 'bolt': c.strokeStyle = p.color; c.lineWidth = p.width; c.shadowColor = p.color; c.shadowBlur = 20; c.beginPath(); p.pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); c.lineWidth = p.width * 0.4; c.strokeStyle = '#fff'; c.stroke(); break;
        case 'conv': {
          const e = Math.min(1, t / p.life), ee = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2, sw = Math.sin(ee * Math.PI) * 60 * p.curl;
          const dx = p.tx - p.sx, dy = p.ty - p.sy, l = Math.hypot(dx, dy) || 1, x = U.lerp(p.sx, p.tx, ee) + (-dy / l) * sw, y = U.lerp(p.sy, p.ty, ee) + (dx / l) * sw;
          c.globalAlpha = Math.sin(ee * Math.PI); c.fillStyle = p.color; c.beginPath(); c.arc(x, y, p.size, 0, 7); c.fill(); blob(c, x, y, p.size * 4, p.color.replace(/[\d.]+\)$/, '0.25)'));
          break;
        }
        case 'pillar': {
          // 光柱：橫向多層柔邊，縱向由下往上漸淡
          // 在離屏畫布上畫橫向柔邊，再用縱向漸層遮罩淡出，避免分段色帶
          const h = Math.max(1, Math.ceil(p.y * Math.min(1, t / 0.25))), w = Math.ceil(p.w), oc = this._pc || (this._pc = document.createElement('canvas')), o = oc.getContext('2d');
          oc.width = w; oc.height = h;
          const gx = o.createLinearGradient(0, 0, w, 0);
          gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.3, p.color); gx.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gx.addColorStop(0.7, p.color); gx.addColorStop(1, 'rgba(0,0,0,0)');
          o.fillStyle = gx; o.fillRect(0, 0, w, h);
          o.globalCompositeOperation = 'destination-in'; const gy = o.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(1, '#000'); o.fillStyle = gy; o.fillRect(0, 0, w, h);
          c.globalAlpha = k * 0.85; c.drawImage(oc, p.x - w / 2, p.y - h);
          break;
        }
        case 'array': c.translate(p.x, p.y); c.scale(1, 0.42); c.rotate(p.t * p.spin); drawArray(c, p.r * (0.7 + 0.3 * Math.min(1, t / 0.2)), p.color); break;
        case 'sword': {
          const e = Math.min(1, t / (p.life - p.delay)), x = U.lerp(p.x0, p.x1, e * e), y = U.lerp(p.y0, p.y1, e * e), ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
          c.translate(x, y); c.rotate(ang); c.shadowColor = p.color; c.shadowBlur = 14; c.fillStyle = p.color;
          c.beginPath(); c.moveTo(26, 0); c.lineTo(-14, -3.5); c.lineTo(-14, 3.5); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(-18, -6, 3, 12);
          break;
        }
        case 'text': {
          const sc = 1 + Math.max(0, 0.12 - t) * 5; c.globalAlpha = Math.min(1, k * 2.2);
          c.translate(p.x, p.y); c.scale(sc, sc); c.font = `700 ${p.size}px ${BRUSH}`; c.textAlign = 'center';
          c.lineWidth = 4; c.strokeStyle = 'rgba(6,8,14,0.85)'; c.strokeText(p.str, 0, 0); c.fillStyle = p.color; c.fillText(p.str, 0, 0);
          break;
        }
      }
      c.restore();
    }
    this.list = this.list.filter((p) => p.t < p.life);
    if (this.flash > 0) { c.fillStyle = `rgba(230,220,255,${this.flash * 0.45})`; c.fillRect(0, 0, W, H); this.flash = Math.max(0, this.flash - dt * 2.5); }
  },
};

function blob(c, x, y, r, color) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function drawArray(c, R, color) {
  c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 12; c.lineWidth = 2;
  c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R * 0.8, 0, 7); c.stroke();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82); c.lineTo(Math.cos(a) * R * (i % 3 ? 0.9 : 0.98), Math.sin(a) * R * (i % 3 ? 0.9 : 0.98)); c.stroke(); }
  for (let t = 0; t < 2; t++) { c.beginPath(); for (let j = 0; j <= 3; j++) { const a = (j / 3) * Math.PI * 2 + (t * Math.PI) / 3; c.lineTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); } c.stroke(); }
}
