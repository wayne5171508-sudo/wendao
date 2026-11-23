// 三種水準的自動玩家：每回合從隨機路徑裡挑「轉出的 Combo 數＝目標值」的那條（目標在平均值 ±1 之間抽）
// 不等動畫；Combo 數含天降。改自 11/23 的 sim.js
window.SIM2 = {
  mean: 3, N: 2500,
  setup() {
    U.wait = () => Promise.resolve();
    Puzzle.waitSettle = function () { this.grid.forEach((row, r) => row.forEach((o, c) => { if (o) { o.x = c; o.y = r; o.fall = false; o.vy = 0; o.tw = null; o.die = 0; } })); return Promise.resolve(); };
    Puzzle.settled = () => true; Puzzle.tutorial = () => {};
    const c0 = Puzzle.calc.bind(Puzzle), me = this; window.__cmb = []; Puzzle.calc = (cs) => { window.__cmb.push(cs.length); me.cnt = (me.cnt || 0) + 1; me.sum = (me.sum || 0) + cs.length; return c0(cs); };
  },
  // 回饋控制：讓「含天降」的實測平均 Combo 貼近 mean（天降會多給，所以轉出的目標要自動往下修）
  target() { const k = this.cnt || 0, sum = this.sum || 0; return Math.max(1, Math.min(this.mean + 2, Math.round(this.mean * (k + 1) - sum))); },
  plan() {
    const P = Puzzle, R = 5, C = 6, base = P.grid.map((row) => row.map((o) => o.c)), want = new Set(P.team.map((m) => m.el)), low = P.hp / P.hpMax < 0.5;
    const eval_ = (g) => { const mk = [...Array(R)].map(() => Array(C).fill(0)); let s = 0, n = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C - 2; c++) if (g[r][c] === g[r][c + 1] && g[r][c] === g[r][c + 2]) mk[r][c] = mk[r][c + 1] = mk[r][c + 2] = 1;
      for (let c = 0; c < C; c++) for (let r = 0; r < R - 2; r++) if (g[r][c] === g[r + 1][c] && g[r][c] === g[r + 2][c]) mk[r][c] = mk[r + 1][c] = mk[r + 2][c] = 1;
      const seen = mk.map((x) => x.map(() => 0));
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (mk[r][c] && !seen[r][c]) { const k = g[r][c]; let q = 0; const st = [[r, c]]; seen[r][c] = 1; n++;
        while (st.length) { const [y, x] = st.pop(); q++; [[1,0],[-1,0],[0,1],[0,-1]].forEach(([a, b]) => { const yy = y + a, xx = x + b; if (yy >= 0 && yy < R && xx >= 0 && xx < C && mk[yy][xx] && !seen[yy][xx] && g[yy][xx] === k) { seen[yy][xx] = 1; st.push([yy, xx]); } }); }
        s += q * 6 + (want.has(k) ? 30 : 0) + (k === 'heart' ? (low ? 60 : -10) : 0); }
      return { s, n }; };
    // 束搜尋：從每格出發，逐步延長路徑（最長 24 步），保留 Combo 多、分數高的前 B 條；途中每種 Combo 數都記最好的盤面
    const t = this.target(), byN = {}, B = 40, keep = (g, e) => { if (!byN[e.n] || e.s > byN[e.n].s) byN[e.n] = { s: e.s, g }; };
    let beam = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) beam.push({ g: base, r, c, pr: -1, pc: -1 });
    for (let step = 0; step < 24 && beam.length; step++) {
      const nx = [];
      for (const b of beam) for (const [a, d] of [[1,0],[-1,0],[0,1],[0,-1]]) { const r = b.r + a, c = b.c + d; if (r < 0 || r >= R || c < 0 || c >= C || (r === b.pr && c === b.pc)) continue;
        const g = b.g.map((x) => x.slice()); const x = g[r][c]; g[r][c] = g[b.r][b.c]; g[b.r][b.c] = x; const e = eval_(g); keep(g, e);
        nx.push({ g, r, c, pr: b.r, pc: b.c, k: e.n * 1000 + e.s + Math.random() * 20 }); }
      nx.sort((a, b) => b.k - a.k); beam = nx.slice(0, B);
    }
    const ns = Object.keys(byN).map(Number); let n = ns.includes(t) ? t : ns.filter((x) => x < t).sort((a, b) => b - a)[0];
    if (n === undefined) n = Math.min(...ns);
    byN[n].g.forEach((row, r) => row.forEach((k, c) => (P.grid[r][c].c = k)));
    return n;
  },
  async stage(id) {
    const P = Puzzle; if (P.on) P.close(false); P.open({ stage: stageById(id) }); Stage.hideMap();
    let turns = 0, waits = 0, casts = 0; const c0 = window.__cmb.length;
    while (P.on && P.state !== 'end' && turns < 60) {
      if (P.state !== 'idle') { await new Promise((r) => setTimeout(r, 5)); if (++waits > 6000) break; continue; }
      const i = P.team.findIndex((m) => m.sk && m.cd === 0);
      if (i >= 0 && casts < 40) { casts++; P.skill(i); await new Promise((r) => setTimeout(r, 30)); continue; }
      this.plan(); P.state = 'resolve'; await P.resolveTurn().catch(() => {}); turns++;
    }
    const win = P.state === 'end' && P.hp > 0 && P.alive().length === 0;
    const cm = window.__cmb.slice(c0);
    const boss = P.foes.find((f) => f.boss);
    const r = { id, win, turns: P.turn, hp: Math.round(P.hp / P.hpMax * 100), wave: P.wave + 1, waves: P.stage.waves.length, avgCombo: cm.length ? cm.reduce((a, b) => a + b, 0) / cm.length : 0, bossHp: boss ? Math.round(boss.hp / boss.max * 100) : null };
    if (win) Stage.onWin(id, P.result()); P.close(false); return r;
  },
  // 新存檔，1-1 到 1-10 各打一次（輸了也往下打，不重打）
  async run(mean) {
    this.mean = mean; this.cnt = this.sum = 0; S.d = S.fresh(); S.d.root = 'fire'; S.d.pz.tut = 1; Stage.fix(S.d);
    const out = []; for (const st of PZ_STAGES) out.push(await this.stage(st.id)); return out;
  },
};
