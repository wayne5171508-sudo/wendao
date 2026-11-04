'use strict';
// node test/gacha.js
// 機緣花費與保底。不啟動瀏覽器，直接載入 js/data.js 與 js/state.js。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const context = { localStorage, console, Math, Date, Object, Array, JSON, Number, String };
context.globalThis = context;
vm.createContext(context);
const js = (...n) => fs.readFileSync(path.join(__dirname, '..', 'js', ...n), 'utf8');
vm.runInContext(`${js('data.js')}\n${js('state.js')}\nglobalThis.__api = { S, GACHA, WEAPONS, SAVE_KEY };`, context);

const { S, GACHA, WEAPONS, SAVE_KEY } = context.__api;
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
  passed++;
}

function prep(stone = 100000) {
  S.d = S.fresh();
  S.d.root = 'metal';
  S.d.grade = '黃';
  S.d.daily.free = true;
  S.d.inv.stone = stone;
  S.d.inv.ore = 0;
  S.d.inv.scroll = 0;
}

function ownAll() {
  for (const w of WEAPONS) S.d.weapons[w.id] = { lv: 0, brk: 0, fail: 0 };
}

// ── 費用：法寶池單抽、十連都是扣款，付不起就整次取消 ──
{
  assert(GACHA.cost === 200 && GACHA.cost10 === 1800 && GACHA.pity === 90, 'gacha constants');
  assert(GACHA.rates.slice().join(',') === '0.5,0.3,0.14,0.05,0.01', 'drop rates unchanged');

  prep(1000);
  context.Math.random = () => 0;
  let res = S.draw('wpn', 1);
  assert(res && res[0].isNew && res[0].id === 'qinggang', 'first single grants the common sword');
  assert(S.d.inv.stone === 800, 'paid single deducts 200');

  res = S.draw('wpn', 1);
  assert(res && !res[0].isNew, 'second single is a duplicate');
  assert(S.d.inv.stone === 600, 'duplicate single still deducts 200 and does not refund stones');
  assert(S.d.inv.ore === 5, 'duplicate still converts to ore');
  assert(String(res[0].note).includes('玄鐵') && !String(res[0].note).includes('靈石'), 'gacha duplicate note has no stone refund');

  prep(5000);
  ownAll();
  const before = S.d.inv.stone;
  res = S.draw('wpn', 10);
  assert(res && res.length === 10, '10-pull returns 10 results');
  assert(res.some((x) => x.tier >= 1), '10-pull still guarantees a spirit-tier result');
  assert(S.d.inv.stone === before - 1800, '10-pull deducts 1800 even when every weapon is owned');
  assert(S.d.inv.stone < before, '10-pull does not add money');
  assert(S.d.inv.ore === 9 * 5 + 10, 'ore conversion amounts unchanged');

  prep(1800);
  ownAll();
  res = S.draw('wpn', 10);
  assert(res && S.d.inv.stone === 0, 'exact balance ends at zero, not negative');

  prep(1799);
  const pity = (S.d.gacha.wpn = 4);
  const weapons = Object.keys(S.d.weapons).length;
  res = S.draw('wpn', 10);
  assert(res === null && S.d.inv.stone === 1799 && S.d.gacha.wpn === pity, 'unaffordable 10-pull is refused');
  assert(Object.keys(S.d.weapons).length === weapons, 'refused pull grants nothing');

  prep(0);
  assert(S.draw('wpn', 1) === null && S.d.inv.stone === 0, 'unaffordable single is refused');
  assert(S.draw('wpn', 10) === null && S.d.inv.stone === 0, 'zero stones stays zero');

  prep(500);
  S.d.weapons.qinggang = { lv: 0, brk: 0, fail: 0 };
  S.d.daily.free = false;
  context.Math.random = () => 0;
  S.draw('wpn', 1);
  assert(S.d.inv.stone === 500 && S.d.daily.free === true && S.d.inv.ore === 5, 'daily free single costs nothing');
  S.draw('wpn', 1);
  assert(S.d.inv.stone === 300, 'next single costs 200');

  prep(4000);
  const artBefore = S.d.inv.stone;
  res = S.draw('art', 10);
  assert(res && res.length === 10 && S.d.inv.stone === artBefore - 1800, 'art pool 10-pull still deducts 1800');
  assert((S.d.inv.scroll || 0) > 0, 'art pool still grants scrolls');

  prep(50);
  S.d.weapons.liuyun = { lv: 0, brk: 0, fail: 0 };
  const shopStone = S.d.inv.stone;
  const note = S.gainWeapon('liuyun');
  assert(S.d.inv.stone === shopStone + 400 && S.d.inv.ore === 10, 'non-gacha duplicate still refunds stones');
  assert(String(note).includes('靈石'), 'non-gacha note unchanged');
}

// ── 保底：每抽 +1，仙階以上（含自然、含滿保底）歸零，舊檔夾回上限 ──
{
  function lowPulls(pool, n) {
    context.Math.random = () => 0;
    prep(1e9);
    S.d.gacha[pool] = 0;
    let resets = 0;
    for (let i = 0; i < n; i++) {
      const res = S.draw(pool, 1);
      assert(S.d.gacha[pool] >= 0 && S.d.gacha[pool] < GACHA.pity, `${pool} pity stays below cap`);
      if (res[0].tier >= 3) {
        assert(S.d.gacha[pool] === 0, `${pool} pity resets when the guarantee hits`);
        resets++;
      } else {
        assert(res[0].tier === 0, `${pool} low roll stays common when random is 0`);
      }
    }
    return resets;
  }
  assert(lowPulls('art', 200) === 2, 'art pity triggers at 90 and 180, then stops');
  assert(lowPulls('wpn', 90) === 1, 'weapon pity also resets at the cap');

  prep();
  context.Math.random = () => 0.96;
  S.d.gacha.art = 10;
  let res = S.draw('art', 1);
  assert(res[0].tier === 3 && S.d.gacha.art === 0, 'natural immortal tier resets art pity');
  context.Math.random = () => 0.995;
  S.d.gacha.art = 4;
  res = S.draw('art', 1);
  assert(res[0].tier === 4 && S.d.gacha.art === 0, 'natural divine tier resets art pity');

  prep();
  context.Math.random = () => 0;
  S.d.gacha.art = 0;
  S.draw('art', 10);
  assert(S.d.gacha.art === 10, 'a low 10-pull adds one pity per pull');
  assert(S.pityLeft('art') === 80, 'pity display is pulls remaining');

  prep();
  context.Math.random = () => 0;
  S.d.gacha.art = 85;
  res = S.draw('art', 10);
  assert(res.some((x) => x.tier >= 3), 'crossing the cap inside a 10-pull grants the guarantee');
  assert(S.d.gacha.art === 5, 'pity continues counting after the reset');
  assert(S.pityLeft('art') === 85, 'display follows the reset counter');

  const save = S.fresh();
  save.root = 'wood';
  save.grade = '地';
  save.lv = 4;
  save.exp = 123;
  save.inv.stone = 321;
  save.inv.herb_q = 9;
  save.weapons = { qinggang: { lv: 2, brk: 1, fail: 0 } };
  save.wslot = ['qinggang', null];
  save.arts = { yinqi: 3 };
  save.gacha = { wpn: 12, art: 5000 };
  save.story = { ch1: true, joined: true };
  save.ver = 2;
  save.cleared = { 'sect-0': 1 };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  assert(S.load() === true, 'inflated save loads');
  assert(S.d.gacha.art === GACHA.pity - 1 && S.d.gacha.wpn === 12, 'inflated pity clamps to the cap, healthy pity stays');
  assert(S.pityLeft('art') === 1 && S.pityLeft('wpn') === 78, 'clamped pity displays as one pull remaining');
  assert(S.d.ver === 2 && S.d.lv === 4 && S.d.exp === 123 && S.d.root === 'wood' && S.d.grade === '地', 'load keeps progression');
  assert(S.d.inv.stone === 321 && S.d.inv.herb_q === 9, 'load keeps inventory');
  assert(S.d.weapons.qinggang.lv === 2 && S.d.weapons.qinggang.brk === 1 && S.d.wslot[0] === 'qinggang', 'load keeps weapons');
  assert(S.d.arts.yinqi === 3 && S.d.story.ch1 === true && S.d.cleared['sect-0'] === 1, 'load keeps arts, story, clears');

  const badNums = S.fresh();
  badNums.root = 'fire';
  badNums.gacha = { wpn: -4, art: '40.9' };
  badNums.inv.stone = 8;
  assert(S.importText(JSON.stringify(badNums)) === true, 'import accepts a real save');
  assert(S.d.gacha.wpn === 0 && S.d.gacha.art === 40 && S.d.inv.stone === 8 && S.d.root === 'fire', 'import clamps each pool without touching stones');

  const keepStone = S.d.inv.stone;
  assert(S.importText('{') !== true && S.d.inv.stone === keepStone, 'bad import does not replace the current save');

  const missing = S.fresh();
  missing.root = 'metal';
  delete missing.gacha;
  assert(S.importText(JSON.stringify(missing)) === true, 'save without gacha still imports');
  assert(S.d.gacha.wpn === 0 && S.d.gacha.art === 0 && S.d.root === 'metal', 'missing pity becomes zero');
}

context.Math.random = Math.random;
console.log(`gacha tests passed (${passed})`);
