'use strict';
// ════════════════════════════════════════════
//  聲音：即時合成音效＋古琴、竹笛、低鳴氛圍配樂（不需任何音檔）
// ════════════════════════════════════════════

const Audio2 = {
  ctx: null, sfxOut: null, musOut: null, verb: null,
  sfxOn: true, musOn: true, mood: 'title', timer: null, nextT: 0, beat: 0, drone: null,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.sfxOut = c.createGain(); this.sfxOut.gain.value = this.sfxOn ? 0.32 : 0; this.sfxOut.connect(c.destination);
    this.musOut = c.createGain(); this.musOut.gain.value = this.musOn ? 0.5 : 0; this.musOut.connect(c.destination);
    // 殘響：以衰減噪聲做脈衝響應
    this.verb = c.createConvolver();
    const len = c.sampleRate * 3.8, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.55; this.verb.connect(wet); wet.connect(this.musOut);
    this.startMusic();
  },

  setSfx(on) { this.sfxOn = on; if (this.sfxOut) this.sfxOut.gain.value = on ? 0.32 : 0; },
  setMusic(on) { this.musOn = on; if (this.musOut) this.musOut.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.4); },

  // ───────── 音效 ─────────
  tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxOut); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.3, freq = 1200, q = 1, delay = 0, type = 'bandpass') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxOut); src.start(t);
  },
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'swing1': this.noise(0.13, 0.22, 3200, 0.7); break;
      case 'swing2': this.noise(0.13, 0.22, 2600, 0.7); break;
      case 'swing3': this.noise(0.22, 0.3, 1800, 0.6); this.tone(700, 0.25, 'triangle', 0.08, 500); break;
      case 'hit': this.noise(0.07, 0.35, 900, 1.2); this.tone(140, 0.09, 'square', 0.07, -60); break;
      case 'hitHeavy': this.noise(0.14, 0.45, 500, 1); this.tone(90, 0.18, 'square', 0.1, -40); break;
      case 'hurt': this.tone(240, 0.22, 'sawtooth', 0.12, -140); this.noise(0.1, 0.2, 600); break;
      case 'blink': this.tone(1200, 0.18, 'sine', 0.12, -800); this.noise(0.18, 0.12, 5000, 2); break;
      case 'wave': this.tone(900, 0.28, 'triangle', 0.13, 700); this.noise(0.22, 0.14, 4200, 2); break;
      case 'dash': this.noise(0.32, 0.2, 1800, 0.5); this.tone(500, 0.3, 'sine', 0.1, 700); break;
      case 'thunder': this.noise(0.7, 0.5, 260, 0.4); this.noise(0.14, 0.35, 3200, 0.5); break;
      case 'shield': this.tone(440, 0.6, 'sine', 0.13, 440); this.tone(660, 0.6, 'sine', 0.09, 330); break;
      case 'pickup': this.tone(1046, 0.14, 'sine', 0.12, 300); this.tone(1568, 0.18, 'sine', 0.06, 0, 0.05); break;
      case 'bell': this.tone(523, 1.6, 'sine', 0.14); this.tone(1318, 1.2, 'sine', 0.05); this.tone(2093, 0.8, 'sine', 0.03); break;
      case 'up': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.14, 0, i * 0.09)); break;
      case 'fail': this.tone(300, 0.6, 'sawtooth', 0.12, -200); break;
      case 'craft': this.tone(330, 0.4, 'sine', 0.1, 200); this.noise(0.6, 0.08, 400, 0.5); break;
      case 'gong': this.tone(110, 2.4, 'sine', 0.3, -10); this.tone(220, 1.8, 'triangle', 0.08); this.noise(0.5, 0.15, 300, 0.5); break;
      case 'roar': this.tone(70, 1.1, 'sawtooth', 0.25, -25); this.noise(0.9, 0.25, 220, 0.5); break;
      case 'shoot': this.tone(320, 0.16, 'square', 0.05, -160); break;
      case 'array': this.tone(220, 0.8, 'triangle', 0.08, 220); break;
      case 'boom': this.noise(0.5, 0.4, 180, 0.6); this.tone(60, 0.4, 'sine', 0.3, -20); break;
      case 'orb': this.tone(660, 1.4, 'sine', 0.1, 200); this.tone(990, 1.2, 'sine', 0.06, 300); break;
      case 'page': this.noise(0.12, 0.08, 2500, 0.8); break;
      case 'qi': this.tone(180, 2.4, 'sine', 0.07, 180); this.tone(270, 2.4, 'sine', 0.05, 270); break;
    }
  },

  // ───────── 配樂 ─────────
  // 五聲音階（宮商角徵羽），依場景換調
  SCALES: {
    title:   { root: 146.83, steps: [0, 2, 4, 7, 9], density: 0.45, flute: 0.35 },
    village: { root: 164.81, steps: [0, 2, 4, 7, 9], density: 0.5, flute: 0.2 },
    sect:    { root: 146.83, steps: [0, 2, 4, 7, 9], density: 0.55, flute: 0.3 },
    wild:    { root: 130.81, steps: [0, 3, 5, 7, 10], density: 0.4, flute: 0.18 },
    dungeon: { root: 110.0, steps: [0, 3, 5, 7, 10], density: 0.28, flute: 0.08 },
    battle:  { root: 110.0, steps: [0, 3, 5, 7, 10], density: 0.75, flute: 0.05 },
  },
  setMood(m) { if (this.mood === m) return; this.mood = m; this.retuneDrone(); },

  startMusic() {
    const c = this.ctx;
    // 低鳴：兩個慢慢起伏的正弦
    this.drone = [0, 7].map((st, i) => {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sine'; g.gain.value = 0.035 - i * 0.01;
      lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.015;
      lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(this.musOut); g.connect(this.verb);
      o.start(); lfo.start();
      return { o, st };
    });
    this.retuneDrone();
    this.nextT = c.currentTime + 0.5;
    this.timer = setInterval(() => this.schedule(), 120);
  },
  retuneDrone() {
    if (!this.drone) return;
    const S = this.SCALES[this.mood] || this.SCALES.title;
    for (const d of this.drone) d.o.frequency.setTargetAtTime((S.root / 2) * Math.pow(2, d.st / 12), this.ctx.currentTime, 1.5);
  },
  note(S, octave = 0) {
    const st = U.pick(S.steps) + 12 * octave;
    return S.root * Math.pow(2, st / 12);
  },
  schedule() {
    const c = this.ctx; if (!c) return;
    const S = this.SCALES[this.mood] || this.SCALES.title, step = this.mood === 'battle' ? 0.42 : 0.62;
    while (this.nextT < c.currentTime + 0.4) {
      const t = this.nextT; this.beat++;
      if (Math.random() < S.density) {
        if (Math.random() < 0.18) { // 短句：上行或下行三四音
          let o = U.randi(0, 1), dir = U.chance(0.5) ? 1 : -1, i0 = U.randi(0, 4);
          for (let k = 0; k < U.randi(3, 4); k++) {
            const idx = ((i0 + k * dir) % 5 + 5) % 5;
            this.guqin(S.root * Math.pow(2, (S.steps[idx] + 12 * o) / 12), t + k * step * 0.5, 0.18);
          }
        } else this.guqin(this.note(S, U.randi(0, 1)), t, U.rand(0.12, 0.22));
      }
      if (this.beat % 16 === 0 && Math.random() < S.flute) this.dizi(this.note(S, 1), t + 0.1, U.rand(3, 5));
      this.nextT += step * (Math.random() < 0.15 ? 2 : 1);
    }
  },
  // 古琴：多泛音撥弦，起音微微滑音（吟猱感）
  guqin(f, t, vel) {
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 1.5);
    [[1, 1], [2, 0.45], [3, 0.2], [4.02, 0.08]].forEach(([m, a]) => {
      const o = c.createOscillator(), og = c.createGain();
      o.type = m === 1 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f * m * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.18);
      if (Math.random() < 0.25) o.frequency.setTargetAtTime(f * m * 1.006, t + 0.8, 0.3);
      og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 3.3);
    });
    lp.connect(g); g.connect(this.musOut); g.connect(this.verb);
  },
  // 竹笛：柔和正弦＋漸深顫音＋氣聲
  dizi(f, t, dur) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    const vib = c.createOscillator(), vg = c.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2;
    vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
    vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    const g2 = c.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g);
    o.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.5); g.gain.setValueAtTime(0.06, t + dur - 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.musOut); g.connect(this.verb);
    // 氣聲
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3;
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.012, t + 0.4); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(ng); ng.connect(this.verb);
    [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + dur + 0.1); }); src.start(t);
  },
};
