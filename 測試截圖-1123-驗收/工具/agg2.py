import json, sys, statistics as s
# 用法：agg2.py 檔案…；每回合實際耗時估 7.5 秒、每關進出 15 秒（11/23 真實拖曳試玩量到 1-1 三回合 24 秒）
COST = {'1-1':4,'1-2':4,'1-3':5,'1-4':5,'1-5':6,'1-6':6,'1-7':6,'1-8':7,'1-9':7,'1-10':10}
for f in sys.argv[1:]:
    d = json.load(open(f)); runs = d['runs']; ids = [r['id'] for r in runs[0]]
    print(f'## {f}  平均目標 {d["mean"]} Combo，{len(runs)} 輪  errs={d["errs"]}')
    allc = [r['avgCombo'] for run in runs for r in run if r['turns']]
    print(f'實測平均 Combo {s.mean(allc):.2f}')
    print('| 關卡 | 通關率 | 平均回合 | 結束氣血 | 輸時打到 |'); print('|---|---|---|---|---|')
    tsec = []
    for i, sid in enumerate(ids):
        rs = [run[i] for run in runs]; w = [r for r in rs if r['win']]; l = [r for r in rs if not r['win']]
        lose = '、'.join(f"第{r['wave']}波" + (f"（首領剩 {r['bossHp']}%）" if r['bossHp'] is not None and r['wave'] == r['waves'] else '') for r in l) or '—'
        print(f"| {sid} | {len(w)}/{len(rs)} | {s.mean(r['turns'] for r in rs):.1f} | {s.mean(r['hp'] for r in rs):.0f}% | {lose} |")
    for run in runs: tsec.append(sum(r['turns'] * 7.5 + 15 for r in run))
    # 體力：一輪 10 關各一次＝60 點；輸的關要重打（假設重打一次的花費）
    need = [sum(COST[r['id']] for r in run) + sum(COST[r['id']] for r in run if not r['win']) for run in runs]
    print(f"一輪總耗時約 {s.mean(tsec)/60:.1f} 分（估）；一輪體力 60 點＋輸掉重打一次 → 平均 {s.mean(need):.0f} 點（起始 60，期間自然回 {s.mean(tsec)/300:.1f} 點）\n")
