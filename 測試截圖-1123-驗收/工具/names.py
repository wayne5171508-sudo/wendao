# 各關每一波敵人名字是否被切（320／360／390），以及 320 關卡詳情面板是否超出畫面
import asyncio, json
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome'); out = {}
        for w, h in [(320, 568), (360, 740), (390, 844)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1); pg = await ctx.new_page()
            await pg.goto('http://127.0.0.1:8811/?dev&pz'); await pg.wait_for_function('typeof Stage !== "undefined" && Stage.mapOn', timeout=60000)
            await pg.evaluate("() => { S.d.pz.tut = 1; S.d.root = 'fire'; }")
            clip = []
            for sid in [s for s in await pg.evaluate('PZ_STAGES.map((s) => s.id)')]:
                await pg.evaluate("(id) => { if (Puzzle.on) Puzzle.close(false); Stage.hideMap(); Puzzle.open({ stage: stageById(id) }); }", sid)
                for wv in range(await pg.evaluate('Puzzle.stage.waves.length')):
                    c = await pg.evaluate("""(i) => { Puzzle.spawn(i); Puzzle.foes.forEach((f) => { if (f.boss && f.M.phases) { f.hp = f.max * 0.2; Puzzle.phaseCheck(f); } }); Puzzle.hud();
                      return [...document.querySelectorAll('.pz-foe')].map((e) => { const n = e.querySelector('.pz-fname'), b = n.querySelector('b'), r = n.getBoundingClientRect();
                        return { name: b.textContent, cut: b.scrollWidth > b.clientWidth + 1, out: r.right > innerWidth + 0.5 || r.left < -0.5 }; }).filter((x) => x.cut || x.out); }""", wv)
                    if c: clip.append([sid, wv + 1, c])
            await pg.evaluate("() => { Puzzle.close(false); S.d.pz.st['1-1'] = { s: 7, c: 3 }; Stage.showMap(1); Stage.detail('1-1'); }"); await pg.wait_for_timeout(400)
            pn = await pg.evaluate("""() => { const P = document.querySelector('#pzmPanel'), k = P.firstElementChild || P, bs = [...P.querySelectorAll('button')].map((x) => { const r = x.getBoundingClientRect(); return [x.innerText, Math.round(r.top), Math.round(r.bottom)]; });
              return { vh: innerHeight, btns: bs, scroll: [k.scrollHeight, k.clientHeight] }; }""")
            await pg.screenshot(path=f'/Volumes/阿扁出事了/Claude 專屬/仙術/問道青冥-網頁版/.claude/worktrees/ui-art-1123-9ef23a/測試截圖-1123-驗收/B_{w}_detail_sweep.png')
            out[w] = { 'clipped_names': clip, 'panel': pn }
            await ctx.close()
        print(json.dumps(out, ensure_ascii=False))
        await b.close()
asyncio.run(run())
