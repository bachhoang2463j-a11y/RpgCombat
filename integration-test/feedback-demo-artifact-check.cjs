#!/usr/bin/env node
'use strict';
// 四Demo合并产物专项：只读源码/维护包与资源manifest，不启动战斗或访问网络。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const detectArtifact=()=>{const files=fs.readdirSync(ROOT).filter(f=>/^regex-前端战斗(?!.*-公开版).*\.json$/.test(f));if(files.length!==1)throw new Error('根目录应有且仅有一个维护版 regex-前端战斗*.json，实际：'+files.join(', '));return files[0];};
const ROOT=path.resolve(__dirname,'..'),file=path.resolve(ROOT,process.argv[2]||detectArtifact());
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),pkg=JSON.parse(fs.readFileSync(file,'utf8'));
const fenced=pkg.replaceString,immune=fenced.replace(/^```[^\r\n]*\r?\n/,'').replace(/\r?\n```\s*$/,''),raw=immune.replace(/&amp;/g,'&');
const count=(s,n)=>s.split(n).length-1;
let pass=0,fail=0;
function check(ok,name){console.log((ok?'[PASS] ':'[FAIL] ')+name);ok?pass++:fail++;}
function objectOf(text,name){
    const m=text.match(new RegExp('\\b'+name+'\\s*=\\s*\\{'));if(!m)throw new Error('未找到'+name);
    const at=m.index+m[0].length-1;let depth=0,quote='';
    for(let i=at;i<text.length;i++){const c=text[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';}
        else if(c==='"'||c==="'"||c==='`')quote=c;else if(c==='{')depth++;else if(c==='}'&&!--depth)return vm.runInNewContext('('+text.slice(at,i+1)+')',{ASSET_BASE:'http://192.168.110.83:8766'});}
    throw new Error('未闭合'+name);
}
console.log('== 四Demo反馈合并 v12.11 产物专项 ==');
const stemFile=path.basename(file).match(/v(\d+)_(\d+)\.json$/);
check(!!stemFile&&pkg.scriptName==='前端战斗v'+stemFile[1]+'.'+stemFile[2],'文件名与scriptName版本同步（'+pkg.scriptName+'）');
check(count(src,'```')===2&&count(fenced,'```')===2,'源码与产物仅头尾围栏');
check(!immune.includes('```')&&!/&(?!amp;)/.test(immune)&&raw.replace(/&/g,'&amp;')===immune,'围栏/单遍实体还原免疫');
check(!/\$[$&`'\d<]/.test(raw),'捕获组替换免疫');
for(const [label,text]of[['源码',src],['产物',raw]]){try{[...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].forEach(m=>new vm.Script(m[1]));check(true,label+'脚本语法');}catch(e){check(false,label+'语法：'+e.message);}}
check(count(raw,'monsterAttack')===3,'monsterAttack仍恰三处且自爆预警保留');
check(raw.includes('192.168.110.83:8766')&&!raw.includes('cdn.tailwindcss.com'),'内网资源及静态Tailwind隔离');
check(!/RESIST_SAMPLE_B64|STATUS_SAMPLE_B64|SD_SAMPLE_B64|RESCUE_SAMPLE_B64|IDENTITY_SAMPLE_B64|data:audio|__playResistSample|__playStatusSample|playIncomingToPoint|AVOID_SFX_PRESETS|DEMO_GROUPS|DEMO_CARDS|resetDemo/.test(raw),'无四Demo采样宿主、模拟来袭、Base64或落选音效方案');
for(const name of ['entityVisualRect','identityRun','variantRun','cloneVisualOnly','svgGlowDef','playVariantResistFx','playStatusTickFx','playSelfDestructWindup','playSelfDestructBurst','playRescueSheshen','playRescueGrit','playRescueAvoidFatal']){
    const internal = ['entityVisualRect','identityRun','variantRun','cloneVisualOnly','svgGlowDef'].includes(name);
    check((src.match(new RegExp('function '+name+'\\(','g'))||[]).length===1 && (internal || raw.includes(name)),'接口/共享件仅一份，内部名允许mangle：'+name);
}
check(src.includes('owner.hold =')&&src.includes('owner.resume =')&&raw.includes('held'),'保持/释放生命周期入包，无固定弹窗超时');
const resist=src.slice(src.indexOf('// ===== 抗性与免疫演出 BEGIN'),src.indexOf('// ===== 抗性与免疫演出 END'));
check(!/\b(?:tone|whoosh|click|crystal)\(/.test(resist)&&/variantRun\(total, null, \[entity\]\)/.test(resist),'抗性真实采样且不锁受击实体');
const sizes=[...resist.matchAll(/shape:\s*'gradRing'[^}]*size:\s*([\d.]+)/g)].map(m=>Number(m[1]));
check(sizes.length===3&&sizes.every(n=>n>=1&&n<=1.5),'抗性三处渐变环大小适配正式半径');
check(src.includes('const out = 10 + p.size * (1 - p.life) * 44'),'正式DRAW.gradRing未覆盖');
check(src.includes('DRAW.rescueBloodDrop =')&&src.includes('bloodDrop(g, p)'),'救场竖血滴另命名，原飞血形状保留');
check(raw.includes('arcane-status-badge-expiring')&&raw.includes('data-buff-type')&&raw.includes('healSuppressed'),'临期徽章与已批准禁疗提示入包');
check(!raw.includes('playStatusDispel'),'不迁驱散演出');
check(/if \(!isEntityVariantLocked\(dom\)\)[\s\S]{0,900}?duration: 350/.test(src),'麻痹硬直尊重变种锁');
check(src.includes('clearStatusLayers(); clearSelfDestructState(); clearRescueState();'),'全局清理联动三类新增状态');
const sampleMap=objectOf(src,'SD_SAMPLES');
check(Object.values(sampleMap).every(key=>objectOf(raw,'audioUrls')[key]) && Object.keys(sampleMap).every(key=>raw.includes(key)),'自爆采样映射键和值均入包并指向已注册音频');
check(src.includes("variant: true, category:'J'"),'抗性沿用低优先级J类，不放大主结果音');
check(src.includes('await rescueHandle.ready')&&src.includes('prepared.rescueHandle.release()'),'舍身停驻和反击后归位接入prepared');
check(src.includes("owner.at(630, triggerBlockImpact)")&&src.includes('owner.at(1110'),'舍身到位格挡后再放行反应/结算');
check(src.includes('playSelfDestructAttackWave(caster,targets')&&raw.includes('_selfDestructWindup'),'自爆真实逐目标prepare/接触结算分支入包');
check(src.includes("windup.interrupt('kanpo')")&&src.includes("playSelfDestructInterrupt(target,'subdued'"),'看破压灭与敏捷按住双结局接线');
check(src.includes('entity.selfDestructDom =')&&raw.includes('selfDestructDom'),'自爆召唤物尸体寿命协调入包');
const urls=objectOf(raw,'audioUrls'),base='http://192.168.110.83:8766/';
const resistKeys=['resist_fluid','resist_phantom','resist_antimagic','resist_vital','resist_fireproof','resist_poisonproof','resist_ironbody'];
for(const key of resistKeys)check(urls[key]===base+'vfx_variant_'+key+'.mp3','抗性采样注册：'+key);
check(Object.values(urls).filter(u=>u.includes('/vfx_variant_resist_')).length===7,'抗性资源恰七条');
const added={ranshao:'ranshao.mp3',fog:'fog.mp3',mx_rift_tear:'vfx_rift_tear_mx788.mp3',mx_vacuum:'vfx_vacuum_suck_mx2608.mp3',mx_armor_strike:'vfx_armor_strike_mx2765.mp3',sd_ring_blast:'B2_脉冲环状冲击波爆_fs211423_Ring_Blast_Explosion.mp3',sd_shatter_blast:'B4_破片贯穿引爆_mx1693_Shatter_shot_explosion.mp3',huoyan01:'huoyan01.mp3',parry_perfect:'parry_Weapon_Perfect.wav',avoid_dash_perfect:'avoid_dash_fs521999.mp3',sheshen_armor_step:'sheshen_armor_step_fs705490.mp3'};
for(const [key,name]of Object.entries(added))check(urls[key]===base+name,'真实采样补登：'+key);
const warmed=src.match(/const IDENTITY_CLIP_KEYS = new Set\(\[([^\]]+)\]/)[1];
for(const key of [...resistKeys,...Object.keys(added),'thunder_charge','hide'])check(warmed.includes("'"+key+"'"),'预解码键入包：'+key);
for(const folder of ['variant-resist','self-destruct']){
    const dir=path.join(ROOT,'资源',folder),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
    check(manifest.samples.length===(folder==='variant-resist'?7:2),folder+'资源manifest条数');
    for(const sample of manifest.samples){const bytes=fs.readFileSync(path.join(dir,sample.file));check(bytes.length===sample.bytes&&crypto.createHash('sha256').update(bytes).digest('hex')===sample.sha256,'素材指纹：'+sample.key);}
}
console.log('\n统计：通过 '+pass+' 项，失败 '+fail+' 项');process.exitCode=fail?1:0;
