import assert from 'node:assert/strict';
import { DEFAULT_FX_ENTRIES, playWebmFx } from '../../../tactics/src/fx-library.mjs';
import { createViewScope } from '../../../tactics/src/view-scope.mjs';
import { createVfxHost } from '../../../tactics/src/vfx-host.mjs';

function node(tag = 'div') {
  const children = [];
  return {
    tag, children, style: {}, attrs: {}, paused: true, ended: false, duration: 10, currentTime: 0,
    get isConnected() { return this.root || !!this.parentElement?.isConnected; },
    get firstChild() { return children[0] || node(); },
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(child) { children.push(child); child.parentElement = this; return child; },
    remove() {
      if (this.parentElement) {
        const siblings = this.parentElement.children;
        siblings.splice(siblings.indexOf(this), 1);
        this.parentElement = null;
      }
    },
    animate() { return { cancel() {} }; },
    getContext() { return { clearRect() {}, drawImage() {}, putImageData() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) }; },
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
    removeAttribute(k) { delete this[k]; }, load() {},
    requestVideoFrameCallback(fn) { this.frame = fn; return 1; },
  };
}

export const groups = {
  'VEIL-VIDEO': { async run() {
    const cases = [], videos = [], waits = [], pending = new Map();
    let now = 0, seq = 0;
    const scope = createViewScope({ time: () => now, scale: () => 1,
      setTimeout(fn, ms) { const id = ++seq; pending.set(id, { fn, at: now + ms }); return id; },
      clearTimeout: id => pending.delete(id),
    });
    const advance = ms => {
      now += ms;
      for (const [id, task] of [...pending]) if (task.at <= now) { pending.delete(id); task.fn(); }
    };
    const root = node(); root.root = true;
    const host = createVfxHost({ domLayer: root }, { scope, metersPerArtPx: 1 / 50 });
    const previous = globalThis.document;
    globalThis.document = { createElement(tag) { const el = node(tag); if (tag === 'video') videos.push(el); return el; } };
    const check = (id, fn) => {
      try { fn(); cases.push({ id, pass: true }); }
      catch (e) { cases.push({ id, pass: false, detail: e.stack }); }
    };
    let uid = 0;
    const ctx = {
      casterId: 'h', result: { query: { shape: { radius: 5 } }, events: [] }, centerOf: () => ({ x: 4, y: 4 }),
      sandbox: { getScope: () => scope }, av: { ASSET_BASE: 'https://video.invalid' },
      fx: { top: host.layer, ground: host.layer, uid: () => ++uid, sfx() {}, shake() {} },
      wait: async ms => { waits.push(ms); advance(ms); return true; },
      awaitHandle() { throw new Error('圣域帷幕不能等待视频结束'); },
    };
    try {
      const entry = DEFAULT_FX_ENTRIES.find(e => e.id === 'sanctum-veil');
      const finished = await entry.play(ctx);
      const video = videos[0], canvas = video.parentElement.children.find(el => el.tag === 'canvas');
      video.onloadedmetadata();
      check('VEIL-01 技能按原前摇与收尾返回，10秒视频仍在播放，不锁操作', () => {
        assert.equal(finished, true);
        assert.deepEqual(waits, [1220, 1900]);
        assert.equal(video.duration, 10);
        assert.equal(video.paused, false);
        assert.equal(canvas.isConnected, true);
        assert.equal(video.muted, true);
      });
      const nextAction = host.layer('后续行动', 200);
      advance(4000);
      video.currentTime = 6;
      video.frame();
      check('VEIL-02 后续行动与固定收尾计时不会移除帷幕视频层', () => {
        assert.equal(nextAction.isConnected, false);
        assert.equal(canvas.isConnected, true);
        assert.equal(video.paused, false);
        assert.equal(scope.counts().disposers, 1);
      });
      let ended = null;
      canvas.handle.onFinish.add(ok => { ended = ok; });
      video.currentTime = 10; video.ended = true; video.onended();
      check('VEIL-03 自然结束才收回视频，释放节点与清场回调', () => {
        assert.equal(ended, true);
        assert.equal(canvas.isConnected, false);
        assert.equal(video.paused, true);
        assert.equal(scope.counts().nodes, 0);
        assert.equal(scope.counts().disposers, 0);
      });
      const timed = playWebmFx(ctx, 'other.webm', 0, 0, 100);
      advance(1600);
      check('VEIL-04 其他未要求完整播放的视频仍保留原定时层寿命', () => assert.equal(timed.isConnected, false));
      const failed = playWebmFx(ctx, 'weimu.webm', 0, 0, 100, { fullLength: true });
      let failedResult;
      failed.handle.onFinish.add(ok => { failedResult = ok; });
      videos.at(-1).onerror();
      check('VEIL-05 视频错误释放自身，不等待固定超时', () => {
        assert.equal(failedResult, false);
        assert.equal(failed.isConnected, false);
        assert.equal(scope.counts().disposers, 0);
      });
      const cancelled = playWebmFx(ctx, 'weimu.webm', 0, 0, 100, { fullLength: true });
      const activeVideo = videos.at(-1);
      let cancellations = 0;
      cancelled.handle.onFinish.add(ok => { if (!ok) cancellations++; });
      scope.dispose(); scope.dispose();
      check('VEIL-06 重开或退出的作用域清场立即停止视频并幂等释放', () => {
        assert.equal(activeVideo.paused, true);
        assert.equal(activeVideo.src, undefined);
        assert.equal(cancelled.isConnected, false);
        assert.equal(cancellations, 1);
        assert.equal(scope.counts().nodes, 0);
        assert.equal(scope.counts().disposers, 0);
      });
    } finally { scope.dispose(); globalThis.document = previous; }
    return { cases };
  } },
};
