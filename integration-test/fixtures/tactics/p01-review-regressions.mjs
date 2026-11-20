import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export async function runReviewRegressions(modules) {
  const { createTavernMock, installGlobalMock } = await import('./p01-tavern-mock.mjs');
  installGlobalMock(createTavernMock());
  const require = createRequire(import.meta.url);
  const runnerPath = fileURLToPath(new URL('../../../tactics/tools/run-tests.cjs', import.meta.url));
  const gates = require(runnerPath);
  const cases = [];
  const check = (id,input,expected,actual) => cases.push({id,input,expected,actual,pass:JSON.stringify(expected)===JSON.stringify(actual)});
  for (const scope of ['all','hero']) {
    const hero = modules.parser.parseHeroEntry({名字:'往返角色',原型:'轻型生物',属性:{evasion:0,maxHp:200},技能:[],物品:[],持久化:{persistSpd:false}});
    const original=modules.configPackage.buildConfigPackage([hero],scope);
    const draft=modules.configPackage.finalizeImportDraft(modules.configPackage.createImportDraft([],original).draft);
    modules.storage.saveTacticsRoster({version:1,heroes:draft});
    const actual=modules.configPackage.buildConfigPackage(modules.storage.readTacticsRoster().heroes,scope);
    check('T01-08 review roundtrip '+scope,{scope},original,actual);
  }
  for (const value of [undefined,0,null,{}]) {
    let actual='accepted';
    try { gates.assertRequiredExports({sample:{missing:value}},[['sample','missing']]); } catch(e) {actual=e.message;}
    check('T01-06 review missing function '+String(value),{value:String(value)},true,actual.includes('业务导出'));
  }
  const real={sample:{fn:()=>1}};
  gates.assertRequiredExports(real,[['sample','fn']]);
  check('T01-06 review real function control',{},1,real.sample.fn());
  let rejected=false;
  try {await gates.runGroup({groups:{empty:{run:async()=>({cases:[]})}}},'empty',{});}catch(e){rejected=e.message.includes('用例数为 0');}
  check('T01-06 review zero case rejected',{},true,rejected);
  const probes=[
    ['empty group',['--stage=p01','--group=']],
    ['empty stage',['--stage=']],
    ['conflicting mode',['--self-check','--stage=nonexistent']],
  ];
  for(const [name,args] of probes){
    const result=spawnSync(process.execPath,[runnerPath,...args],{encoding:'utf8',timeout:30000,maxBuffer:65536});
    check('T01-06 review '+name,{args},1,result.status);
  }
  for (const expression of [
    "g.assertRequiredExports({x:{}},[['x','absent']]);",
    "g.runGroup({groups:{empty:{run:async()=>({cases:[]})}}},'empty',{}).catch(e=>{console.error(e.message);process.exitCode=1});",
  ]) {
    const code='const g=require('+JSON.stringify(runnerPath)+');'+expression;
    const result=spawnSync(process.execPath,['-e',code],{encoding:'utf8',timeout:30000,maxBuffer:65536});
    check('T01-06 review subprocess failure '+cases.length,{expression},1,result.status);
  }
  return cases;
}
