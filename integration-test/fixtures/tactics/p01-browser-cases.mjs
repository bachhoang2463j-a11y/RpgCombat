// ==========================================
// P01 浏览器侧用例（在 tactics-harness.html 的 srcdoc iframe 内执行）
// 测试真实业务模块（tactics/src/*.mjs 经 <base href> 相对 import），不复制实现。
// 结果 postMessage 回宿主页汇总。
// ==========================================

export async function runBrowserCases() {
  const results = [];
  const ok = (id, pass, detail) => results.push({ id, pass: !!pass, detail: detail || '' });

  // mock 由宿主页在业务 boot 前注入（window.__P01_MOCK_API + __P01_MOCK_COUNTS）
  const counts = window.__P01_MOCK_COUNTS;
  const api = window.__P01_MOCK_API;

  // 动态 import 真实业务模块（相对本文件 URL → tactics/src/）
  const storage = await import('../../../tactics/src/storage.mjs');
  const protocol = await import('../../../tactics/src/protocol.mjs');
  const parser = await import('../../../tactics/src/parser.mjs');
  const lifecycle = await import('../../../tactics/src/lifecycle.mjs');

  // 1. 三作用域 / 两楼层隔离（真实 mock 语义）
  api.insertOrAssignVariables({ scope: 'global' }, { type: 'global' });
  api.insertOrAssignVariables({ scope: 'chat' }, { type: 'chat' });
  api.insertOrAssignVariables({ floor: 0 }, { type: 'message', message_id: 0 });
  api.insertOrAssignVariables({ floor: 1 }, { type: 'message', message_id: 1 });
  ok('T01-05-iframe global/chat/message 隔离',
    api.getVariables({ type: 'global' }).scope === 'global' &&
    api.getVariables({ type: 'chat' }).scope === 'chat' &&
    api.getVariables({ type: 'message', message_id: 0 }).floor === 0 &&
    api.getVariables({ type: 'message', message_id: 1 }).floor === 1,
    JSON.stringify([api.getVariables({ type: 'global' }).scope, api.getVariables({ type: 'chat' }).scope]));

  // 2. storage.saveTacticsKey 整档替换保留外部键 + 删除不残留
  api.insertOrAssignVariables({ 'rpg_combat_roster': { version: 1, heroes: [{ name: '原版' }] }, '$shop_catalog': { managed: true } }, { type: 'chat' });
  storage.saveTacticsKey(protocol.TACTICS_ROSTER_KEY, { version: 1, heroes: [{ name: '战棋甲' }] }, 'chat');
  let chat = api.getVariables({ type: 'chat' });
  ok('T01-05-iframe 保留原RPG键', chat['rpg_combat_roster'] && chat['rpg_combat_roster'].heroes[0].name === '原版' && chat['$shop_catalog'].managed === true, JSON.stringify(Object.keys(chat)));
  ok('T01-05-iframe 战棋键写入', chat[protocol.TACTICS_ROSTER_KEY].heroes[0].name === '战棋甲', '');
  storage.saveTacticsKey(protocol.TACTICS_ROSTER_KEY, { version: 1, heroes: [] }, 'chat');
  ok('T01-05-iframe 整档替换无残留', api.getVariables({ type: 'chat' })[protocol.TACTICS_ROSTER_KEY].heroes.length === 0, '');

  // 3. replaceVariables 真删键（业务侧整表读写路径）
  api.insertOrAssignVariables({ a: 1, b: 2 }, { type: 'global' });
  const cur = api.getVariables({ type: 'global' });
  delete cur.a;
  api.replaceVariables(cur, { type: 'global' });
  ok('T01-05-iframe 业务删键生效', !('a' in api.getVariables({ type: 'global' })) && api.getVariables({ type: 'global' }).b === 2, '');

  // 4. 传输反解标记存在（宿主页经契约 B 通道送达；script 为 raw text，&amp; 保持字面）
  ok('T01-05-iframe 传输样本标记', window.__P01_TRANSPORT_MARKER === 'rt-$1-$&-$$-&amp;-预转义实体-反引号`x`&实体<ok>', JSON.stringify(window.__P01_TRANSPORT_MARKER));

  // 5. 真实模块在 iframe 内执行（parseYamlText 冒烟 + 生命周期冒烟）
  const block = parser.parseYamlText('战斗数据栏:\n  协议版本: 1\n  场景ID: sc-b\n  战斗ID: bt-b\n  我方列表:\n    - 角色:\n        名字: 浏览器丁\n        原型: 轻型生物\n        属性: "[Speed:90]"\n        技能: []\n        物品: []\n');
  ok('T01-05-iframe 真实模块解析', block.heroes.length === 1 && block.heroes[0].evasion === 70, JSON.stringify(block.heroes[0] && block.heroes[0].evasion));
  let browserSceneCalls = 0;
  const r = lifecycle.applyLoad(null, { sceneId: 'sc-b', battleId: 'bt-b' }, null, { initScene: () => { browserSceneCalls++; return { ok: true }; } });
  ok('T01-05-iframe 生命周期冒烟', r.branch === 'new-scene' && r.initSceneCalls === 1 && browserSceneCalls === 1, r.branch + ' init=' + r.initSceneCalls);

  // 6. LLM 计数为 0（generateRaw + generate 双计数）
  ok('T01-05-iframe generateRaw=0', counts.generateRaw === 0, String(counts.generateRaw));
  ok('T01-05-iframe generate=0', counts.generate === 0, String(counts.generate));

  return results;
}
