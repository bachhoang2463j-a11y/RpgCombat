import { readFileSync } from 'node:fs';
import { createBattle } from '../../../tactics/src/battle.mjs';
import { parseSkill } from '../../../tactics/src/parser.mjs';
const source = readFileSync(new URL('../../../tactics/src/vendor/rpg-av/rpg-av.mjs', import.meta.url), 'utf8');
const check = (id, pass, detail = '') => ({ id, pass: !!pass, detail });
function functionText(name) {
  const start = source.indexOf('    function ' + name + '(');
  const firstEnd = source.indexOf('\n', start);
  if (start >= 0 && source.slice(start, firstEnd).trim().endsWith('}')) return source.slice(start, firstEnd);
  const end = source.indexOf('\n    }', start) + 6;
  if (start < 0 || end < 6) throw new Error('缺真实函数 ' + name);
  return source.slice(start, end);
}
function battleFixture(tags, hp = 100) {
  const unit = (id, side) => ({ id, name: id, side, footprint: { width: 1, height: 1 }, skills: [], attrTags: side === 'enemy' ? tags : [],
    ref: { hp: side === 'enemy' ? hp : 100, maxHp: 100, mp: 100, maxMp: 100, shield: 0, atk: 10, def: 0, spd: side === 'hero' ? 300 : 1, evasion: 0, moveDistance: 6, reviveCount: 1 } });
  const units = [unit('c', 'hero'), unit('t', 'enemy')];
  const battle = createBattle({ units, placementsById: { c: { col: 2, row: 2 }, t: { col: 4, row: 2 } },
    scene: { sceneId: 'status-test', grid: { columns: 10, rows: 10, metersPerCell: 1 }, objects: [] }, random: () => 0.5 });
  battle.start();
  return { battle, target: units[1], attack: text => battle.attack(parseSkill('【真实状态】' + text + '[必中][远程][范围:单体;射程:10]'), { x: 4.5, y: 2.5, targetId: 't' }) };
}
export const groups = {
  'TSV-01': { run() {
    const cases = [], calls = [], ST = { persists: new Map(), persistIds: new Map() }, dom = {};
    const sync = new Function('ST', 'statusDomOf', 'statusEntityId', 'setStatusPersist', 'clearStatusLayers', functionText('syncStatusLayers') + '\nreturn syncStatusLayers;')(
      ST, () => dom, e => e.id, (_, kind, active) => calls.push([kind, active]), () => calls.push(['clear']));
    sync({ id: 't', hp: 10, isAlive: true, buffs: [{ type: 'burn', duration: 3 }, { type: 'poison', permanent: true }, { type: 'paralyze', duration: 0 }] });
    cases.push(check('真实 syncStatusLayers 活跃燃烧/永久毒/到期麻痹', JSON.stringify(calls) === JSON.stringify([['poison', true], ['burn', true], ['paralyze', false]])));
    sync({ id: 't', hp: 0, isAlive: false });
    cases.push(check('真实 syncStatusLayers 死亡清层', calls.at(-1)[0] === 'clear'));
    const tickNames = ['playStatusPoisonTick','playStatusBurnTick','playStatusHealSuppressed','playStatusParaProc','playStatusParaMiss','playStatusExpire'];
    const dispatch = new Function(...tickNames, functionText('playStatusTickFx') + '\nreturn playStatusTickFx;')(...tickNames.map(name => (...args) => ({ name, args })));
    for (const [event, name] of [['poisonTick', tickNames[0]], ['burnTick', tickNames[1]], ['paraProc', tickNames[3]], ['expire', tickNames[5]]])
      cases.push(check('真实 tick dispatcher ' + event, dispatch({ event, entity: dom, meta: { layers: 3 } }).name === name));
    for (const name of ['clearStatusLayers', 'clearVariantState', 'playVariantTriggerFx', 'syncVariantState', 'isEntityVariantLocked'])
      cases.push(check('原版入口非空桩 ' + name, functionText(name).length > (name === 'isEntityVariantLocked' ? 60 : 100)));
    const locks = new Map([['t', 2]]);
    const isLocked = new Function('V', 'entityIdOf', functionText('isEntityVariantLocked') + '\nreturn isEntityVariantLocked;')({ locks }, e => e.id);
    cases.push(check('真实实体锁计数与释放', isLocked({ id: 't' }) && !isLocked({ id: 'c' })));
    locks.delete('t');
    cases.push(check('真实实体锁删除后解除', !isLocked({ id: 't' })));
    cases.push(check('状态常量与 owner 入闭包', source.includes('const ST = {') && source.includes('const STATUS_COLORS =') && source.includes('function variantRun(')));
    return { cases };
  } },
  'TSV-02': { run() {
    const cases = [], molt = battleFixture(['[蜕皮]']);
    const m = molt.attack('[伤害;power:60]');
    cases.push(check('实际蜕皮结算只发一次事件且回血不改算值', m.ok && molt.target.ref.molted && molt.target.ref.hp === 70 && m.events.filter(e => e.trigger === 'molt').length === 1, JSON.stringify(m.events)));
    const revive = battleFixture(['[复活]']);
    const r = revive.attack('[伤害;power:200]');
    cases.push(check('实际复活致死拦截事件', r.ok && revive.target.ref.hp === 30 && revive.target.ref.reviveCount === 0 && r.events.some(e => e.trigger === 'revive')));
    const rage = battleFixture(['[狂暴]'], 25);
    cases.push(check('狂暴依据真实规则倍率输出结果', rage.battle.snapshot().events.some(e => e.trigger === 'rage')));
    rage.target.ref.hp = 60;
    cases.push(check('狂暴恢复退出事件', rage.battle.snapshot().events.some(e => e.trigger === 'rageExit')));
    const dot = battleFixture([]);
    dot.attack('[燃烧;power:5;turns:2]');
    for (let i = 0; i < 400 && !dot.battle.snapshot().events.some(e => e.type === 'status-tick'); i++) dot.battle.endAction();
    cases.push(check('真实 clock tick 收口事件', dot.battle.snapshot().events.some(e => e.type === 'status-tick' && e.kind === 'burn' && e.damage > 0)));
    return { cases };
  } },
};
