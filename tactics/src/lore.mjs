// ==========================================
// 单位图鉴档案（世界书接入预留）
// 契约与原版 index.html 一致：unit.wbSource = { wbName, entryName, desc }（原版 L19618/L19801 由世界书条目写入，showEnemyInfo 渲染「📚 世界书图鉴档案」）。
// 接入世界书后由宿主写 unit.wbSource 即生效；未接入前用下方示例档案（按去装饰名匹配，A/B/·N 编号共用一条）。
// ==========================================

export const SAMPLE_WB_NAME = '示例档案';

export const SAMPLE_LORE = {
  埃利奥特: '米斯卡塔尼克大学出身的施法者，随身笔记里抄满了不该被抄下的字句。他相信知识能保护同伴，也清楚每一道咒文都在向某个存在支付代价。',
  弗兰克: '前码头搬运工，退伍后成了队伍的盾。不懂神秘学，只知道站在同伴前面——面对深潜者时，他的背从未弯过。',
  玛德琳: '出身墨尔本的私家侦探，习惯藏在暗处观察。左轮与西班牙短枪是她最信任的语言，开口之前，子弹往往已经到了。',
  索恩: '在内陆荒原长大的向导，脚步轻得像风掠过盐湖。他说沙漠里的星空会换位置，没人当真，直到那天晚上。',
  深潜者: '栖于近海深渊的两栖族群，鳞片下残留着人类的轮廓。它们侍奉沉睡的大衮与海德拉，在海岸小镇与人类缔结古老而污秽的契约。',
  伊塔库亚的眷族: '风行者伊塔库亚在极寒高空留下的仆从。被它触碰过的猎物会在暴风雪中被拖上云端，再落下时只剩冻结的空壳。',
  犹格索托斯之子: '门之钥犹格·索托斯在凡间留下的混血后裔，形体只有一部分存在于此处。它看见的时间与空间不止一层，攻击也常从你看不见的角度落下。',
  食尸鬼: '游荡在墓穴与地下隧道的食腐者，犬形的面孔上仍保留着几分人的神情。传说它们曾是人类，因长久啃食亡者而渐渐改变。',
  幻梦行军兽: '幻梦境高原上被驯化的巨兽，皮甲坚如岩层。只听从持有缰绳信物的主人，冲锋时连石墙都会被撞开。',
  化尘者: '由沙暴与残留意志凝成的仆从，没有固定形体。刀剑与子弹穿过它，就像穿过一阵风。',
};

// 去装饰：emoji / ◈〖〗⸨⸩♱❄ 等装饰符号与末尾 A/B/·N 编号
export function loreKey(name) {
  return String(name || '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[◈〖〗⸨⸩♱❄【】\[\]()（）]/g, '')
    .replace(/\s+/g, '')
    .replace(/(·\d+|[A-Z])$/, '');
}

// 档案解析：世界书真值优先，其次示例档案；都没有返回 null
export function resolveLore(unit) {
  if (!unit) return null;
  if (unit.wbSource && (unit.wbSource.desc || unit.wbSource.entryName)) return { ...unit.wbSource, sample: false };
  const key = loreKey(unit.name);
  const desc = SAMPLE_LORE[key];
  return desc ? { wbName: SAMPLE_WB_NAME, entryName: key, desc, sample: true } : null;
}
