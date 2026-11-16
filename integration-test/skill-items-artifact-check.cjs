#!/usr/bin/env node
'use strict';
// 五项奇物/技能定稿与舍身回位：源码/维护包双验收，不启动浏览器或访问网络。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sourceOnly = process.argv.includes('--source');
const detectArtifact = () => {
    const files = fs.readdirSync(ROOT).filter(f => /^regex-前端战斗(?!.*-公开版).*\.json$/.test(f));
    if (files.length !== 1) throw new Error('根目录应有且仅有一个维护版 regex-前端战斗*.json，实际：' + files.join(', '));
    return files[0];
};
const file = path.resolve(ROOT, process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : detectArtifact());
const pkg = sourceOnly ? null : JSON.parse(fs.readFileSync(file, 'utf8'));
const fence = pkg && pkg.replaceString, immune = fence && fence.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
const raw = immune && immune.replace(/&amp;/g, '&');
let passed = 0, failed = 0;
const count = (s, n) => s.split(n).length - 1;
function check(ok, name) { console.log((ok ? '[PASS] ' : '[FAIL] ') + name); ok ? passed++ : failed++; }
function objectOf(text, name) {
    const found = text.match(new RegExp('\\b' + name + '\\s*=\\s*\\{'));
    if (!found) throw new Error('缺少对象 ' + name);
    const at = found.index + found[0].length - 1;
    let depth = 0, quote = '';
    for (let i = at; i < text.length; i++) {
        const c = text[i];
        if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
        else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth++;
        else if (c === '}' && !--depth) return vm.runInNewContext('(' + text.slice(at, i + 1) + ')', { ASSET_BASE:'http://192.168.110.83:8766', RLYEH_FOG_CLOUD_URL:'fog', itemFxAssetUrl:f => 'http://192.168.110.83:8766/' + f.split('/').map(encodeURIComponent).join('/') });
    }
    throw new Error('未闭合对象 ' + name);
}
const tagNames = ['谐律之庇','静默之域','碎裂之响','塞赫美特之愠','逆咒归源镜'];
const delays = [0.90,0.95,0.95,1.45,0.45], categories = ['B','A','A','A','A'];
const files = {
    fork432:'vfx_fork_432_strike.mp3', forkHum:'vfx_fork_physics_hum.mp3', forkMute:'vfx_fork_muted_stop.mp3',
    bowlBronze:'vfx_bowl_bronze_silence.mp3', bowlClear:'vfx_bowl_crystal_clear.mp3', bellPing:'vfx_bell_dispel_ping.mp3',
    crystalSnap:'vfx_crystal_shatter_snap.mp3', mirrorRing:'vfx_mirror_ring_activate.mp3', mirrorStream:'vfx_mirror_mana_stream.mp3'
};
const reuse = { ranshao:'ranshao.mp3', fire01:'fire01.mp3', explosion_aoe_blast:'explosion_aoe_blast.mp3', mx_giant_roar:'vfx_giant_roar_mx1972.mp3', mx_vacuum:'vfx_vacuum_suck_mx2608.mp3', leech_flow:'vfx_variant_leech_flow.mp3', sd_ring_blast:'B2_脉冲环状冲击波爆_fs211423_Ring_Blast_Explosion.mp3', sd_shatter_blast:'B4_破片贯穿引爆_mx1693_Shatter_shot_explosion.mp3' };
console.log('== 五项定稿与舍身 v12.11 ' + (sourceOnly ? '源码' : '产物') + '专项 ==');
check(count(source, '```') === 2, '源码仅头尾围栏');
if (pkg) {
    const stem = path.basename(file).match(/v(\d+)_(\d+)\.json$/);
    check(!!stem && pkg.scriptName === '前端战斗v' + stem[1] + '.' + stem[2], '文件名与scriptName版本同步（' + pkg.scriptName + '）');
    check(count(fence, '```') === 2 && !immune.includes('```'), '产物围栏加固');
    check(!/&(?!amp;)/.test(immune) && raw.replace(/&/g, '&amp;') === immune, '全量&amp;免疫及单遍还原');
    check(!/\$[$&`'\d<]/.test(raw), '$捕获组替换免疫');
}
for (const [label, text] of [['源码',source], ...(raw ? [['产物',raw]] : [])]) {
    try { [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].forEach(m => new vm.Script(m[1])); check(true,label+'脚本语法'); }
    catch (error) { check(false,label+'语法 '+error.message); }
    check(count(text,'monsterAttack') === 3,label+'monsterAttack恰好三处');
    check(text.includes('192.168.110.83:8766') && !text.includes('cdn.tailwindcss.com'),label+'内网资源和静态Tailwind隔离');
    for (let i = 0; i < tagNames.length; i++) check(text.includes(tagNames[i]),label+'新技能入包 '+tagNames[i]);
    for (const name of Object.values(files)) check(text.includes('RpgCombat_Sound/'+name),label+'新MP3分类路径 '+name);
    for (const name of Object.values(reuse)) check(text.includes('/'+name),label+'复用MP3保持根路径 '+name);
    const rg = objectOf(text, 'WEBM_FX_REGISTRY');
    tagNames.forEach((tag,i) => check(rg[tag] && rg[tag].url === '' && rg[tag].scale === 1 && rg[tag].particles === 'arcane' && rg[tag].delay === delays[i],label+'视觉结算延迟 '+tag));
    const urls = objectOf(text, 'audioUrls');
    Object.keys(files).forEach(key => check(urls[key] === 'http://192.168.110.83:8766/RpgCombat_Sound/'+files[key],label+'audioUrls注册 '+key));
    Object.keys(reuse).forEach(key => check(urls[key] === 'http://192.168.110.83:8766/'+reuse[key],label+'audioUrls复用 '+key));
    check(['arcane-tint-overlay','arcane-prop-wrap','arcane-webm-cv','arcane-f-silence','arcane-f-shatter','arcane-f-lava','arcane-f-drain','arcane-fork-hum','arcane-fork-viol','arcane-pulse-ring','arcane-beam-slash'].every(n => text.includes(n)),label+'指定CSS与动画入包');
}
const entry = objectOf(source, 'ITEM_SKILL_FX');
tagNames.forEach((tag,i) => check(entry[tag].category === categories[i], '定稿分类 '+tag+'='+categories[i]));
const item = source.slice(source.indexOf('// ===== 奇物与技能定稿 v12.11 BEGIN ====='), source.indexOf('// ===== 奇物与技能定稿 v12.11 END ====='));
check(!/audioPresetState|__ARCANE_AUDIO_PRESET|arcane-preset-btn|new Audio|new AudioContext|forkWiki|forkAbyss|fork440|flamePure|resetDemo|renderSkillCards/.test(item), '不带Demo试听UI、落选音或独立音频旁路');
check(source.includes("file.split('/').map(encodeURIComponent).join('/')") && item.includes('RpmCombat_Spine/'), '多级素材逐段编码且目录拼写正确');
check(item.includes("v.muted = true; v.playsInline = true;") && item.includes('g.clearRect') && item.includes('g.drawImage') && item.includes('requestVideoFrameCallback') && item.includes('owner.onClean(cleanup)'), 'VP9透明画布、解码帧驱动与owner视频清理');
check(item.includes('S.sampleAudios.add(cue)') && item.includes('playSound(key') && item.includes('audioContext:owner.audioContext') && item.includes('sync:true'), '真实采样全部接入三轨Mixer及owner');
check(source.includes('S.videos.forEach(cleanup => cleanup())') && source.includes('S.sampleAudios.forEach(stop => stop())'), '全局同步清理视频与音频');
for (const cls of ['silence','shatter','lava','drain']) check(new RegExp('arcane-flash-'+cls+'\\s*\\{[^}]*steps\\(1\\)').test(source), '离散闪色 steps(1) '+cls);
for (const shape of ['gradOrb','gradMist','gradFlare','gradRing']) check(source.includes('if (p.itemFx) return DRAW.item_'+shape), '旧绘制保留，仅新参数分支 '+shape);
check(source.includes('histOrb(g, p)') && source.includes('pt.x - p.x') && source.includes('if (p.trailMax)'), 'DPR安全相对坐标历史拖尾');
let baseline;
try { baseline = cp.execFileSync('git',['show','HEAD:index.html'], { cwd:ROOT, maxBuffer:8*1024*1024, timeout:10000 }).toString(); } catch (e) { check(false,'无法读取提交基线 '+e.message); }
if (baseline) {
    const oldRing = baseline.match(/        ring\(g, p\) \{[^\r\n]+/)[0];
    check(source.includes(oldRing), '旧DRAW.ring原样未覆盖');
}
const drain = source.slice(source.indexOf("registerTagHandler('吸蓝'"),source.indexOf("registerTagHandler('冲'"));
const dispel = source.slice(source.indexOf("registerTagHandler('驱散'"),source.indexOf("registerTagHandler('回蓝'"));
check(/if \(!isArcaneSkillFx\(ctx\.skill\?\.fxTag\)\) \{ playSound\('mpHeal'\); playSVGEffect\(ctx.targetDom, 'debuff'\); \}/.test(drain), '吸蓝默认音与紫雾统一门控');
check(/if \(!isArcaneSkillFx\(ctx\.skill\?\.fxTag\)\) \{ playSound\('defUp'\); playSVGEffect\(ctx.targetDom, 'buff'\); \}/.test(dispel) && dispel.includes('_arcaneFx.dispel'), '驱散默认音门控且真实dispel回调保留');
const sheshen = source.slice(source.indexOf('function playRescueSheshen('), source.indexOf('function playRescueGrit('));
const release = sheshen.slice(sheshen.indexOf('    function release()'), sheshen.indexOf('    // 1. 决意蓄势'));
check(release.includes('owner.resume(830)') && release.includes('owner.at(300') && count(release,'duration: 500') === 2 && !release.includes('duration: 350'), '舍身停驻300ms、双回位500ms、完整收尾830ms');
check(sheshen.includes('owner.at(630, triggerBlockImpact)') && sheshen.includes('owner.at(1110,'), '舍身到达/ready拍点未变');
check(!release.includes('triggerBlockImpact') && release.includes("phase: 'return'"), '回位不再格挡');
for (const spec of Object.values(entry)) for (const name of spec.videoFiles) check(source.includes(name) && (!raw || raw.includes(name)), 'WebM素材清单入包 '+name);
const demoHash = cp.execFileSync('git', ['hash-object','demo-skill-items-vfx.html'], { cwd:ROOT, timeout:10000, maxBuffer:1024 }).toString().trim();
check(demoHash === '5b4804fe14069e9b77835760efddad5d9eb8cda6', '原Demo指纹完全未变');
console.log('SUMMARY '+JSON.stringify({ passed, failed }));
if (failed) process.exitCode = 1;
