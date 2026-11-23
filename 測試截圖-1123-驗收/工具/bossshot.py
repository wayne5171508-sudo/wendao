# 首領名字＋範圍攻擊預告：320/360/390 截圖並量測溢出
import asyncio, sys, json
from playwright.async_api import async_playwright
OUT = sys.argv[1]; TAG = sys.argv[2]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome')
        res = {}
        for w, h in [(320, 568), (360, 740), (390, 844)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True, is_mobile=True)
            pg = await ctx.new_page()
            await pg.goto('http://127.0.0.1:8811/?dev&pz'); await pg.wait_for_function('typeof Stage !== "undefined" && Stage.mapOn', timeout=60000)
            await pg.evaluate("() => { S.d.pz.tut = 1; Stage.hideMap && Stage.hideMap(); Puzzle.open({ stage: stageById('1-10') }); Puzzle.spawn(2); }")
            await pg.wait_for_timeout(2600)
            for ph in (0, 2):
                await pg.evaluate("(ph) => { const f = Puzzle.foes.find((x) => x.boss); if (ph) { f.hp = f.max * 0.2; Puzzle.phaseCheck(f); } f.age = 2; Puzzle.hud(); }", ph)
                await pg.wait_for_timeout(2200 if ph else 300)
                m = await pg.evaluate("""() => { const o = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), h: Math.round(r.height), clip: e.scrollWidth > e.clientWidth + 1, text: e.innerText.replace(/\\n/g,'|') }; };
                  return { warn: o('#pzWarn'), hv: o('#pzWarn .hv'), name: o('.pz-foe.boss .pz-fname'), nameB: o('.pz-foe.boss .pz-fname b'), em: o('.pz-foe.boss .pz-fname em'), vw: innerWidth }; }""")
                res[f'{w}_ph{ph}'] = m
                await pg.screenshot(path=f'{OUT}/{TAG}_{w}_boss_ph{ph+1}.png')
            await ctx.close()
        print(json.dumps(res, ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(run())
