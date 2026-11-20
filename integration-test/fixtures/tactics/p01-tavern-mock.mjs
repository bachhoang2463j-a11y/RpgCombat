// ==========================================
// P01 保真酒馆助手 Mock（Node 与浏览器共用）
// 语义对齐 integration-test/harness.html + 官方文档：
//   - 三作用域分桶（global/chat/message），message 按楼层隔离
//   - replaceVariables 整表替换（真删键）
//   - insertOrAssignVariables 递归深合并（数组/原子整体替换）
//   - getVariables 返回副本
//   - generateRaw/generate 双计数并抛错（P01 必须 0 调用）
// ==========================================

export function createTavernMock() {
  const store = { global: {}, chat: {}, message: {} };
  const counts = { generateRaw: 0, generate: 0 };

  function clone(v) {
    return v === undefined ? v : JSON.parse(JSON.stringify(v));
  }

  function bucket(opt) {
    const o = opt || {};
    if (o.type === 'message') {
      const id = o.message_id == null ? 0 : o.message_id;
      if (!store.message[id]) store.message[id] = {};
      return store.message[id];
    }
    if (o.type === 'chat') return store.chat;
    return store.global;
  }

  function deepMerge(t, s) {
    for (const k of Object.keys(s || {})) {
      const v = s[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) {
        deepMerge(t[k], v);
      } else {
        t[k] = clone(v);
      }
    }
    return t;
  }

  const api = {
    getVariables: (opt) => clone(bucket(opt)),
    replaceVariables: (vars, opt) => {
      const b = bucket(opt);
      for (const k of Object.keys(b)) delete b[k];
      deepMerge(b, vars);
      return clone(bucket(opt));
    },
    insertOrAssignVariables: (vars, opt) => {
      deepMerge(bucket(opt), vars);
      return clone(bucket(opt));
    },
    generateRaw: async () => { counts.generateRaw++; throw new Error('P01 不应调用 generateRaw'); },
    generate: async () => { counts.generate++; throw new Error('P01 不应调用 generate'); },
    getLastMessageId: () => 0,
    getCurrentMessageId: () => 0,
  };

  return { store, api, counts, bucket, deepMerge };
}

// 安装为全局（Node 侧供 storage.mjs 使用；浏览器侧供 iframe 内业务模块使用）
export function installGlobalMock(mock) {
  const g = typeof globalThis !== 'undefined' ? globalThis : window;
  Object.keys(mock.api).forEach(k => { g[k] = mock.api[k]; });
  return mock;
}
