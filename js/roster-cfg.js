'use strict';
// ════════════════════════════════════════════
//  轉珠角色與技能：所有角色、技能、隊伍加成數值都在這一個檔案
//  新增角色：在 PZ_CHARS 加一筆（指定 lead 隊長技 id、sk 主動技 id），放一張頭像 face 與一張立繪 art 即可
//  新增技能：在 PZ_SKILLS 加一筆，fx 從下方「效果庫」挑效果組合，不用改程式
//  邏輯在 js/roster.js（存檔、組隊、編組畫面、道侶快照），戰鬥套用在 js/puzzle.js
// ════════════════════════════════════════════

// ───────── 效果庫（隊長技與主動技共用，一個技能的 fx 可放多個效果）─────────
//  t: 'atk'     攻擊倍率 mult；可限定 el 屬性、fac 陣營、role 定位（都不填＝全隊）。隊長技＝整場；主動技＝本回合
//  t: 'hp'      氣血倍率 mult（同樣可限定 el／fac／role）。只在隊長技有效
//  t: 'rcv'     回復倍率 mult（同上）。只在隊長技有效
//  t: 'heal'    立即回復 pct 成最大氣血。主動技
//  t: 'delay'   全體敵人出手倒數 +n。主動技；放在隊長技＝每波開場生效
//  t: 'convert' 把 from 珠全轉成 to 珠（to 不填＝施放者屬性）。主動技
//  t: 'pierce'  無視敵方防禦與減傷。主動技＝本回合；隊長技＝整場
//  t: 'combo'   結算 Combo 數 +n。主動技＝本回合；隊長技＝每回合
//  t: 'nuke'    以 el 屬性（不填＝施放者屬性）對目標造成施放者攻擊 mult 倍傷害（計算相剋）。主動技
//  el／fac 填 'self'＝施放者自己的屬性／陣營
const PZ_SKILLS = {
  // 主角（隊長）
  hero_lead:  { name: '靈根共鳴', desc: '與隊長同屬性的隊員攻擊 ×1.5', fx: [{ t: 'atk', el: 'self', mult: 1.5 }] },
  hero_sub:   { name: '同心護持', desc: '全隊氣血 ×1.2', fx: [{ t: 'hp', mult: 1.2 }] },
  // 仙寶（主角兵器）給的主動技：見 PZ_HERO.wpnSk
  jianqi:     { name: '劍氣', cd: 4, desc: '以自身屬性造成攻擊 10 倍傷害', fx: [{ t: 'nuke', mult: 10 }] },
  liuyun_sk:  { name: '流雲', cd: 5, desc: '心珠全部轉為自身屬性珠，回復兩成氣血', fx: [{ t: 'convert', from: 'heart' }, { t: 'heal', pct: 0.2 }] },
  shuang_sk:  { name: '霜寒', cd: 5, desc: '全體敵人出手倒數 +1', fx: [{ t: 'delay', n: 1 }] },
  qingming_sk:{ name: '青冥劍意', cd: 5, desc: '以自身屬性造成攻擊 16 倍傷害', fx: [{ t: 'nuke', mult: 16 }] },
  nitian_sk:  { name: '逆天', cd: 6, desc: '本回合無視防禦，且自身屬性攻擊 ×2', fx: [{ t: 'pierce' }, { t: 'atk', el: 'self', mult: 2 }] },
  jinxia_sk:  { name: '破防', cd: 4, desc: '本回合無視敵方的防禦與減傷', fx: [{ t: 'pierce' }] },
  chixiao_sk: { name: '連擊', cd: 4, desc: '本回合結算 Combo 數 +2', fx: [{ t: 'combo', n: 2 }] },
  // 抽卡角色：隊長技
  ld_sect:    { name: '同門同心', desc: '正道宗門隊員攻擊 ×1.6', fx: [{ t: 'atk', fac: 'sect', mult: 1.6 }] },
  ld_demon:   { name: '魔血沸騰', desc: '魔族隊員攻擊 ×2，全隊氣血 ×0.9', fx: [{ t: 'atk', fac: 'demon', mult: 2 }, { t: 'hp', mult: 0.9 }] },
  ld_rogue:   { name: '獨行', desc: '散修隊員攻擊與氣血 ×1.4', fx: [{ t: 'atk', fac: 'rogue', mult: 1.4 }, { t: 'hp', fac: 'rogue', mult: 1.4 }] },
  ld_fire:    { name: '炎心', desc: '火屬性隊員攻擊 ×1.8', fx: [{ t: 'atk', el: 'fire', mult: 1.8 }] },
  ld_water:   { name: '寒潭', desc: '水屬性隊員攻擊 ×1.8', fx: [{ t: 'atk', el: 'water', mult: 1.8 }] },
  ld_heal:    { name: '春風化雨', desc: '全隊回復 ×1.8、氣血 ×1.1', fx: [{ t: 'rcv', mult: 1.8 }, { t: 'hp', mult: 1.1 }] },
  ld_atk:     { name: '殺伐', desc: '輸出定位隊員攻擊 ×1.7', fx: [{ t: 'atk', role: 'dps', mult: 1.7 }] },
  ld_combo:   { name: '行雲流水', desc: '每回合 Combo +1', fx: [{ t: 'combo', n: 1 }] },
  ld_guard:   { name: '固守', desc: '全隊氣血 ×1.5', fx: [{ t: 'hp', mult: 1.5 }] },
  ld_slow:    { name: '先機', desc: '每波開場敵人出手倒數 +1，全隊攻擊 ×1.2', fx: [{ t: 'delay', n: 1 }, { t: 'atk', mult: 1.2 }] },
  // 抽卡角色：主動技
  sk_burst:   { name: '一劍光寒', cd: 5, desc: '以自身屬性造成攻擊 14 倍傷害', fx: [{ t: 'nuke', mult: 14 }] },
  sk_heal:    { name: '回春', cd: 4, desc: '回復三成氣血', fx: [{ t: 'heal', pct: 0.3 }] },
  sk_toWater: { name: '化水', cd: 5, desc: '火珠全部轉為水珠', fx: [{ t: 'convert', from: 'fire', to: 'water' }] },
  sk_toFire:  { name: '燎原', cd: 5, desc: '木珠全部轉為火珠', fx: [{ t: 'convert', from: 'wood', to: 'fire' }] },
  sk_toSelf:  { name: '聚靈', cd: 6, desc: '心珠全部轉為自身屬性珠', fx: [{ t: 'convert', from: 'heart' }] },
  sk_delay2:  { name: '定身', cd: 7, desc: '全體敵人出手倒數 +2', fx: [{ t: 'delay', n: 2 }] },
  sk_pierce:  { name: '碎甲', cd: 4, desc: '本回合無視敵方的防禦與減傷', fx: [{ t: 'pierce' }] },
  sk_combo:   { name: '疾風', cd: 4, desc: '本回合結算 Combo 數 +3', fx: [{ t: 'combo', n: 3 }] },
  sk_rally:   { name: '號令', cd: 6, desc: '本回合同陣營隊員攻擊 ×1.8', fx: [{ t: 'atk', fac: 'self', mult: 1.8 }] },
  sk_demon:   { name: '魔焰', cd: 6, desc: '本回合火屬性隊員攻擊 ×2.5', fx: [{ t: 'atk', el: 'fire', mult: 2.5 }] },
};

// ───────── 分類 ─────────
const PZ_ROLES = { dps: '輸出', heal: '回血', ctrl: '控場', sup: '輔助' };
const PZ_FACS = { sect: { name: '正道宗門', c: '#9fd8ff' }, demon: { name: '魔族', c: '#ff7a9a' }, rogue: { name: '散修', c: '#d8c48a' } };
// 稀有度：maxStar 星級上限
const PZ_RARITY = { R: { c: '#bfc4ca', maxStar: 3 }, SR: { c: '#ffd36a', maxStar: 4 }, SSR: { c: '#ff7a4a', maxStar: 5 } };
// 星級加成：數值 ×（1 ＋（星級−1）× step）；之後抽到重複角色升星
const PZ_STAR = { step: 0.12 };
// 同陣營加成：隊伍 5 人（含主角與副隊長）裡同陣營人數 → 該陣營成員攻擊、氣血倍率（取達到的最高一檔）
const PZ_FAC_BONUS = [{ n: 3, atk: 1.1, hp: 1.05 }, { n: 4, atk: 1.2, hp: 1.1 }, { n: 5, atk: 1.35, hp: 1.15 }];

// ───────── 主角（隊長／副隊長）─────────
// 屬性＝靈根；數值 ×（1 ＋ 境界 lv × lvStep）；主手兵器（仙寶）每 1 點攻擊再加 wpnAtk 點轉珠攻擊，並決定主動技
// lead 當隊長時的隊長技、sub 當副隊長時的副隊長技
const PZ_HERO = {
  fac: 'sect', role: 'dps', atk: 520, hp: 1400, rcv: 140, lvStep: 0.08, wpnAtk: 3,
  lead: 'hero_lead', sub: 'hero_sub', sk: 'jianqi',
  wpnSk: { qinggang: 'jianqi', xuantie: 'jianqi', liuyun: 'liuyun_sk', bitao: 'liuyun_sk', shuanghan: 'shuang_sk', zichen: 'shuang_sk',
    jinxia: 'jinxia_sk', qingming: 'qingming_sk', chixiao: 'chixiao_sk', nitian: 'nitian_sk' },
};
// 沒綁道侶時的副隊長補位（綁了但對方還沒同步過快照：用這組數值、名字換成道侶名字）
const PZ_MATE_DEFAULT = { name: '雲遊道友', char: 'yunxi', el: 'wood', lv: 0, atk: 460, hp: 1300, rcv: 200, wpn: null, sk: 'liuyun_sk', sub: 'hero_sub' };

// ───────── 抽卡角色 ─────────
// id 唯一；el 五行；role 定位；fac 陣營；rare 稀有度；atk/hp/rcv 一星數值；lead 隊長技、sk 主動技（PZ_SKILLS 的 id）
// face 頭像（正方形，建議 256×256）；art 立繪（直式，建議 720×1280 透明底）。face 沒有就裁 art 上半部，都沒有就用屬性色塊＋名字
const PZ_CHARS = [
  { id: 'shizun',   name: '師尊',     el: 'metal', role: 'sup',  fac: 'sect',  rare: 'SSR', atk: 700, hp: 1500, rcv: 120, lead: 'ld_sect',  sk: 'sk_rally',   art: 'assets/npc/shizun.webp' },
  { id: 'shijie',   name: '師姐',     el: 'water', role: 'heal', fac: 'sect',  rare: 'SR',  atk: 480, hp: 1150, rcv: 260, lead: 'ld_heal',  sk: 'sk_heal',    art: 'assets/npc/shijie.webp' },
  { id: 'shixiong', name: '師兄',     el: 'fire',  role: 'dps',  fac: 'sect',  rare: 'SR',  atk: 760, hp: 1000, rcv: 60,  lead: 'ld_fire',  sk: 'sk_burst',   art: 'assets/npc/shixiong.webp' },
  { id: 'shidi',    name: '同門師弟', el: 'wood',  role: 'sup',  fac: 'sect',  rare: 'R',   atk: 430, hp: 950,  rcv: 120, lead: 'ld_combo', sk: 'sk_combo' },
  { id: 'guard',    name: '守山弟子', el: 'earth', role: 'ctrl', fac: 'sect',  rare: 'R',   atk: 420, hp: 1250, rcv: 80,  lead: 'ld_guard', sk: 'sk_delay2',  art: 'assets/npc/guard.webp' },
  { id: 'hunter',   name: '獵戶',     el: 'wood',  role: 'dps',  fac: 'rogue', rare: 'R',   atk: 560, hp: 1000, rcv: 70,  lead: 'ld_atk',   sk: 'sk_toFire',  art: 'assets/npc/hunter.webp' },
  { id: 'sanxiu',   name: '散修劍客', el: 'metal', role: 'dps',  fac: 'rogue', rare: 'SR',  atk: 720, hp: 1050, rcv: 50,  lead: 'ld_rogue', sk: 'sk_pierce' },
  { id: 'yaoshi',   name: '藥師',     el: 'water', role: 'heal', fac: 'rogue', rare: 'R',   atk: 400, hp: 1100, rcv: 240, lead: 'ld_water', sk: 'sk_toWater' },
  { id: 'mozhu',    name: '魔族少主', el: 'fire',  role: 'dps',  fac: 'demon', rare: 'SSR', atk: 880, hp: 1100, rcv: 40,  lead: 'ld_demon', sk: 'sk_demon' },
  { id: 'monv',     name: '魔族聖女', el: 'earth', role: 'ctrl', fac: 'demon', rare: 'SR',  atk: 600, hp: 1150, rcv: 90,  lead: 'ld_slow',  sk: 'sk_delay2' },
  { id: 'mojiang',  name: '魔將',     el: 'earth', role: 'dps',  fac: 'demon', rare: 'R',   atk: 640, hp: 1200, rcv: 40,  lead: 'ld_atk',   sk: 'sk_toSelf' },
];
// 新存檔與舊存檔升級時送的角色（之後抽卡才會產出其他角色）
const PZ_STARTER = ['shidi', 'guard', 'hunter'];
