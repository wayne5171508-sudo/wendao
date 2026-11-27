'use strict';
// ════════════════════════════════════════════
//  超級大放送與靈石礦脈：所有可調數值都在這個檔案，邏輯在 js/bonus.js
//  狀態只存本機（localStorage 'wendao_fang_v1'），不進主存檔、不寫雲端
//  換日、週末以台北時間為準（DAILY_CFG.tzOffsetH）
// ════════════════════════════════════════════

const FANG_CFG = {
  mult: 2,   // 放送預設倍率（觸發沒寫自己的 mult 時用這個）；不常駐，只在放送期間生效
  // 三種觸發並行；同時生效取最高，不相乘
  first:   { mult: 3, min: 30 },                 // 每日（台北時間）第一次通關任一關後 min 分鐘
  weekend: { days: [6, 0] },                     // 週六、週日全天，倍率＝mult
  ticket:  { mult: 2.5, min: 20, drop: 0.08, sweepDrop: 0.02 },   // 放送券：通關 drop、每次掃蕩 sweepDrop 機率掉 1 張；使用後 min 分鐘，時間可疊加
  // 吃放送的來源；離線只吃週末（首通放送、放送券對離線不加成），且只算和週末重疊的時段
  include: ['stage', 'first', 'sweep', 'offline', 'battle', 'sign', 'daily'],
  excludeFromBonus: ['dust', 'quest', 'mine'],   // 星塵兌換、任務獎勵、靈石礦脈不吃放送（include 沒列的也不吃）
  // 保底：上一個有玩的日子靈石收入低於 min，換日後第一次登入補發差額，最多 cap
  floor: { min: 4000, cap: 2000 },
  rollbackTol: 120,   // 秒；手機時間比上次看到的早超過這個值＝時間被調回去，期間不給任何放送與新放送
};

// 靈石礦脈：通過青冥宗三場試劍（與締結道侶同門檻）後開放；不佔 1-1～1-10
const MINE_CFG = {
  unlock: 'sect-2',   // S.d.cleared 的旗標（放置版青冥宗第三場試劍）
  cost: 8,            // 每次進場體力
  daily: 5,           // 每日破關次數上限（台北時間換日重置；戰敗不算次數）
  stone: 5000,        // 每次破關
  first: 5000,        // 首次破關額外（只一次）
  // 怪物強度依主角境界 lv 縮放：k ＝ base × step^(lv − ref)，上下限 [min, max]
  // 驗收 1127（3 Combo 自動玩家、單人主角）：築基初期 k≈0.75 約 16 回合、結丹後期 k＝1 與縮放前相同；一回合約 8 秒（轉珠 5 秒＋結算 3 秒）
  scale: { ref: 8, base: 1, step: 1.06, min: 0.5, max: 3 },
};

// 礦脈關卡：沿用轉珠戰鬥結構；怪物偏肉不偏兇（血量高、傷害低），鼓勵連消
const MINE_MONS = {
  mine_ling: { name: '礦脈石靈', el: 'earth', hp: 4200, atk: 260, def: 20, cd: 3, img: 'assets/mon/mine_ling.webp' },
  mine_kui:  { name: '晶甲礦傀', el: 'metal', hp: 5600, atk: 320, def: 30, cd: 3, img: 'assets/mon/mine_kui.webp' },
  mine_boss: { name: '靈脈守礦獸', el: 'earth', hp: 26000, atk: 420, def: 40, cd: 3, img: 'assets/mon/mine_boss.webp', boss: true,
    heavy: { every: 3, mult: 1.6, name: '礦石崩落' } },
};
const MINE_STAGE = { id: 'mine', mine: true, name: '靈石礦脈', cost: MINE_CFG.cost, k: 1,
  waves: [['mine_ling', 'mine_ling'], ['mine_kui', 'mine_ling'], ['mine_boss']],
  tip: '礦脈守衛皮厚但出手不重，多連消、打大 Combo 最快', bg: ['assets/bg/pz_mine1.webp', 'assets/bg/pz_mine2.webp', 'assets/bg/pz_mine3.webp'] };   // 前段木架坑道 → 中段藍水晶深洞 → 首領金色晶礦廳
