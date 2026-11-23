import sys, asyncio, json
from playwright.async_api import async_playwright
SP = '/private/tmp/claude-501/-Users-yuwen--claude-spares-spare-FFBwhS/8de0c88f-5e6e-4ad2-b15a-15167da3a2bd/scratchpad'
MEAN = int(sys.argv[1]); K = int(sys.argv[2]); TAG = sys.argv[3]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--disable-background-timer-throttling', '--disable-renderer-backgrounding'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200])); await ctx.route('**/assets/**', lambda r: r.abort())
        await pg.goto('http://127.0.0.1:8811/?dev&pz'); await pg.wait_for_function('typeof Stage !== "undefined" && Stage.mapOn', timeout=60000)
        await pg.add_script_tag(content=open(f'{SP}/sim2.js').read()); await pg.evaluate('SIM2.setup()')
        if len(sys.argv) > 4: await pg.evaluate(sys.argv[4]); await pg.evaluate('PZ_STAGES.forEach((s) => { const o = PZ_CHAPTERS[0].stages.find((x) => x.id === s.id); s.k = o.k; })')
        runs = []
        for k in range(K): runs.append(await pg.evaluate(f'SIM2.run({MEAN})'))
        json.dump({'mean': MEAN, 'runs': runs, 'errs': errs[:10]}, open(f'{SP}/res_{TAG}_{MEAN}.json', 'w'), ensure_ascii=False)
        await b.close()
asyncio.run(run())
