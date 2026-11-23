# 角色 A 第二輪：新存檔，320／390 直式
import sys, asyncio, json, statistics, math
from playwright.async_api import async_playwright
OUT = '/Volumes/阿扁出事了/Claude 專屬/仙術/問道青冥-網頁版/.claude/worktrees/ui-art-1123-9ef23a/測試截圖-1123-驗收'
W = int(sys.argv[1]); H = 568 if W < 360 else 844; URL = 'http://127.0.0.1:8811/'
OLD = open('/Volumes/阿扁出事了/Claude 專屬/仙術/問道青冥存檔-2026-11-09.json', encoding='utf-8').read()
R = {}
def frames(ms): return '() => { window.__fr = []; let l = 0; const t0 = performance.now(); const f = (n) => { if (l) window.__fr.push(n - l); l = n; if (n - t0 < %d) requestAnimationFrame(f); }; requestAnimationFrame(f); }' % ms
def st(fr): fr = sorted(fr); return { 'mean': round(statistics.mean(fr), 1), 'p95': round(fr[int(len(fr) * .95)], 1), 'max': round(fr[-1], 1), 'n': len(fr) }
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome')
        mk = lambda: b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, is_mobile=True)
        logs, bad = [], []
        def hook(pg):
            pg.on('console', lambda m: m.type in ('error', 'warning') and logs.append(f'{m.type}: {m.text[:160]}'))
            pg.on('pageerror', lambda e: logs.append(f'pageerror: {str(e)[:200]}'))
            pg.on('response', lambda r: r.status >= 400 and bad.append(f'{r.status} {r.url}'))
            pg.on('requestfailed', lambda r: bad.append(f'failed {r.url} {r.failure}'))
        KB = 'performance.getEntriesByType("resource").reduce((a, e) => [a[0] + 1, a[1] + e.transferSize / 1024], [0, 0]).map(Math.round)'
        # ── 1. 預載大小：一般入口（標題）vs 進轉珠地圖之後
        ctx = await mk(); pg = await ctx.new_page(); hook(pg)
        await pg.goto(URL); await pg.wait_for_timeout(6000)
        R['preload_title'] = await pg.evaluate(KB)
        R['pz_in_title'] = await pg.evaluate('performance.getEntriesByType("resource").filter((e) => PZ_ASSET.test(e.name.replace(location.origin + "/", ""))).length')
        await ctx.close()
        # ── 2. 新存檔進轉珠
        ctx = await mk(); pg = await ctx.new_page(); hook(pg); E = pg.evaluate
        shot = lambda n: pg.screenshot(path=f'{OUT}/A_{W}_{n}.png')
        await pg.goto(URL + '?dev&pz'); await pg.wait_for_function('typeof Stage !== "undefined" && Stage.mapOn', timeout=60000)
        await pg.wait_for_timeout(1500); R['preload_map_start'] = await E(KB)
        R['dev_root_before'] = await E('S.d.root || null'); await E('() => { S.d.root = "fire"; S.save(); Stage.renderMap(); }')
        await shot('01_map')
        R['sta_text'] = await E('document.querySelector("#pzmSta").innerText.replace(/\\n/g, " | ")')
        # 4 步教學：從地圖正常進 1-1
        await E('Stage.detail("1-1")'); await pg.wait_for_timeout(300); await shot('02_detail')
        await pg.click('#pzmPanel [data-b="0"]'); await pg.wait_for_timeout(1600)
        tut = []
        for i in range(5):
            t = await E('(() => { const e = document.querySelector("#pzTut"); return e ? e.innerText.replace(/\\n/g, " ").slice(0, 50) : null; })()')
            if not t: break
            tut.append(t); await shot(f'03_tut{i+1}')
            if i == 1: await pg.click('#pzTut [data-t="skip"]'); await pg.wait_for_timeout(300); break
            await pg.click('#pzTut [data-t="next"]'); await pg.wait_for_timeout(300)
        R['tut_seen'] = tut; R['tut_after_skip'] = await E('({ el: !!document.querySelector("#pzTut"), saved: S.d.pz.tut })')
        await E('Puzzle.close(false)'); await pg.wait_for_timeout(300)
        await E('() => { Stage.hideMap(); Puzzle.open({ stage: stageById("1-1") }); }'); await pg.wait_for_timeout(1800)
        R['tut_reopen'] = await E('!!document.querySelector("#pzTut")')
        await pg.wait_for_function('Puzzle.state === "idle"'); await shot('04_battle')
        R['preload_after_pz'] = await E(KB)
        # 缺圖：pa- 類別、珠子／消除／5 連珠圖、敵人佔位、頭像
        R['art'] = await E('''(() => ({ pa: [...document.documentElement.classList].filter((c) => c.startsWith("pa-")).length, orb: Object.keys(Puzzle.art).length, clr: Object.keys(Puzzle.clr).length, five: Object.keys(Puzzle.five).length,
          foePh: document.querySelectorAll(".pz-fph").length, faceNoImg: [...document.querySelectorAll(".pz-mem")].filter((b) => !b.querySelector("img")).length,
          brokenImg: [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")) }))()''')
        # 設定入口
        await pg.click('#pzSet'); await pg.wait_for_timeout(300); await shot('05_settings')
        R['settings'] = await E('document.querySelector("#pzEnd").innerText.replace(/\\n/g, " | ").slice(0, 120)'); await E('Puzzle.endClose()')
        # 拖曳效能
        box = await E('(() => { const r = Puzzle.cv.getBoundingClientRect(); return { x: r.left, y: r.top, c: Puzzle.cell }; })()')
        X = lambda f: box['x'] + f * box['c']; Y = lambda f: box['y'] + f * box['c']
        await E('Puzzle.moveTime = 30'); await E(frames(2300))
        await pg.mouse.move(X(0.5), Y(0.5)); await pg.mouse.down()
        for i in range(120):
            a = i / 120 * 4 * math.pi; await pg.mouse.move(X(3 + 2.2 * math.cos(a)), Y(2.5 + 1.8 * math.sin(a))); await pg.wait_for_timeout(16)
        await shot('06_drag'); await pg.mouse.up(); R['drag_frame'] = st(await E('window.__fr'))
        await pg.wait_for_function('Puzzle.state === "idle"', timeout=40000)
        # 5 連珠第一次
        await E('''() => { const P = Puzzle, pal = ['earth', 'water', 'metal', 'heart']; P.grid.forEach((row, r) => row.forEach((o, c) => { o.c = pal[(r * 2 + c) % 4]; o.die = 0; o.x = c; o.y = r; o.fall = false; o.tw = null; }));
          for (let c = 0; c < 5; c++) P.grid[2][c].c = 'fire'; P.foes.forEach((f) => (f.hp = f.max = 1e6)); }''')
        await E(frames(1600)); await E('() => { Puzzle.state = "resolve"; Puzzle.resolve(); }')
        await pg.wait_for_timeout(250); await shot('07_five'); await pg.wait_for_timeout(1500); R['five_frame'] = st(await E('window.__fr'))
        await pg.wait_for_function('Puzzle.state === "idle"', timeout=40000)
        await E('() => Puzzle.close(false)'); await pg.wait_for_timeout(300)
        # 修為溢出與突破入口
        await E('() => { S.d.exp = S.need(); S.save(); }')
        ov0 = await E('S.d.pz.ovf')
        await E('() => { window.__toasts = []; const t0 = Stage.toast.bind(Stage); Stage.toast = (m) => { window.__toasts.push(m); t0(m); }; Stage.onWin("1-2", { turns: 3, maxCombo: 5, hpRatio: 1 }); }'); await pg.wait_for_timeout(300)
        await E('() => Stage.onWin("1-1", { turns: 3, maxCombo: 5, hpRatio: 1 })'); await pg.wait_for_timeout(300)
        R['ovf'] = await E(f'({{ before: {ov0}, after: S.d.pz.ovf, exp: S.d.exp, need: S.need(), toasts: window.__toasts.slice(-2) }})')
        await E("() => { Stage.closePanel(); Stage.showMap(1); }"); await pg.wait_for_timeout(300); await shot('08_map_break_ovf')
        R['break_btn'] = await E('(() => { const b = document.querySelector("#pzmBreak"); return b ? { text: b.innerText.replace(/\\n/g, " "), ready: b.classList.contains("ready") } : null; })()')
        lv0 = await E('S.d.lv')
        R['break'] = await E('() => { const r0 = Math.random; Math.random = () => 0; const ov = S.d.pz.ovf, r = S.breakthrough({}); Math.random = r0; return { ok: r && r.ok, ovfIn: r && r.ovfIn, ovfBefore: ov, ovfLeft: S.d.pz.ovf, exp: Math.round(S.d.exp), need: Math.round(S.need()), lv: S.d.lv }; }')
        R['break']['lv0'] = lv0
        # 修為未滿時按突破
        await E("() => Stage.showMap(1)"); await pg.click('#pzmBreak'); await pg.wait_for_timeout(300); await shot('09_break_notfull')
        R['break_notfull_toast'] = await E('document.querySelector("#pzmToast") ? document.querySelector("#pzmToast").innerText : ""')
        # 掃蕩與體力
        await E('() => { Stage.refill(); S.d.pz.st["1-1"] = { s: 7, c: 3 }; S.save(); Stage.renderMap(); Stage.detail("1-1"); }'); await pg.wait_for_timeout(300); await shot('10_detail_sweep')
        s0 = await E('Stage.sta()'); stone0 = await E("S.d.inv.stone")
        await E('() => Stage.doSweep("1-1", 5)'); await pg.wait_for_timeout(400); await shot('11_sweep_done')
        R['sweep'] = await E(f'({{ sta0: {s0}, sta1: Stage.sta(), cost: stageById("1-1").cost * 5, stone: S.d.inv.stone - {stone0}, today: S.d.pz.sw.n["1-1"], panel: document.querySelector("#pzmPanel").innerText.replace(/\\n/g, " ").slice(0, 120) }})')
        await E('() => { S.d.pz.sta = 2; S.d.pz.staAt = Date.now() - 12000; Stage.closePanel(); Stage.play("1-2"); }'); await pg.wait_for_timeout(300); await shot('12_no_stamina')
        R['nosta_text'] = await E('document.querySelector("#pzmPanel").innerText.replace(/\\n/g, " | ").slice(0, 160)')
        R['sta_text2'] = await E('(() => { Stage.renderMap(); return document.querySelector("#pzmSta").innerText.replace(/\\n/g, " | "); })()')
        await E('() => { Stage.closePanel(); Stage.refill(); }')
        # 舊存檔升級：11/09 的存檔（沒有 pz 欄位）＋ 一份欄位殘缺／錯型的 pz
        old = json.loads(OLD)
        R['old_import'] = await E('''(t) => { const o = JSON.parse(t), r = S.importText(t); return { r, hadPz: 'pz' in o, lv: [o.lv, S.d.lv], exp: [Math.round(o.exp), Math.round(S.d.exp)], stone: [o.inv && o.inv.stone, S.d.inv.stone], pz: S.d.pz }; }''', OLD)
        bad_pz = dict(old); bad_pz['pz'] = { 'sta': 'abc', 'staAt': 9e15, 'st': { '1-1': { 's': 15, 'c': -3 }, 'x': None }, 'sw': [], 'ovf': -50 }
        R['broken_pz_import'] = await E('(t) => { const r = S.importText(t); return { r, pz: S.d.pz }; }', json.dumps(bad_pz, ensure_ascii=False))
        await pg.reload(); await pg.wait_for_function('typeof Stage !== "undefined" && Stage.mapOn', timeout=60000); await pg.wait_for_timeout(800)
        R['after_reload'] = await E('({ lv: S.d.lv, pz: S.d.pz, nodes: document.querySelectorAll(".pzm-node").length })')
        await shot('13_old_save_map')
        await ctx.close()
        R['logs'] = logs[:30]; R['bad'] = bad[:30]
        print(json.dumps(R, ensure_ascii=False, indent=0))
        await b.close()
asyncio.run(run())
