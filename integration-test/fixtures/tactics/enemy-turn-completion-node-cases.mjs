import { readFileSync } from 'node:fs';

export const groups = {
  'ENEMY-TURN-COMPLETION': {
    run() {
      const main = readFileSync(new URL('../../../tactics/src/main.mjs', import.meta.url), 'utf8');
      const start = main.indexOf('    promptRetarget:');
      const end = main.indexOf('    getUnitStyle:', start);
      const hook = main.slice(start, end);
      let prompts = 0;
      const factory = new Function('unitById', 'isPlayerUnit', 'beginRetargetPrompt', 'return ({' + hook + '}).promptRetarget;');
      const prompt = factory(id => ({ id, controller: id === 'hero' ? 'player' : 'ai' }), u => u?.controller === 'player', req => { prompts++; return req; });
      const ai = prompt({ casterId: 'enemy' });
      const hero = prompt({ casterId: 'hero' });
      return { cases: [
        { id: 'ET-AI 多段转火由AI沿用目标，不创建玩家等待弹窗', pass: ai instanceof Promise && prompts === 1 },
        { id: 'ET-HERO 玩家多段转火仍使用原选择流程', pass: hero.casterId === 'hero' },
      ] };
    },
  },
};
