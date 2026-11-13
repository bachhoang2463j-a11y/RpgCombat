#!/usr/bin/env node
'use strict';
// 独立检查 v12.06 真实正则产物：只读、离线，不运行战斗或访问资源服务。
// 默认检查 regex-前端战斗v12_06.json，可用 argv[2] 指定其它产物路径。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const ASSET = 'http://192.168.110.83:8766';
const artifact = path.resolve(ROOT, process.argv[2] || 'regex-前端战斗v12_06.json');
let pass = 0, fail = 0;
const count = (text, needle) => text.split(needle).length - 1;
function check(ok, label) { console.log((ok ? '[PASS] ' : '[FAIL] ') + label); ok ? pass++ : fail++; }
function pending(label) { console.log('[PENDING] ' + label); }

if (!fs.existsSync(artifact)) {
  pending('产物尚未生成：' + path.basename(artifact) + '（接口与打包完成后再跑本专项）');
  process.exit(0);
}
const pkg = JSON.parse(fs.readFileSync(artifact, 'utf8'));
const base = path.basename(artifact);
if (base !== 'regex-前端战斗v12_06.json' || pkg.scriptName !== '前端战斗v12.06') {
  pending('产物版本为 ' + base + ' / ' + pkg.scriptName + '，等待 v12.06 打包');
  process.exit(0);
}

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fenced = pkg.replaceString || '';
const immune = fenced.replace(/^```[^\r\n]*\r?\n/, '').replace(/\r?\n```\s*$/, '');
const raw = immune.replace(/&amp;/g, '&');
function objectOf(text, name) {
  const match = text.match(new RegExp('\\b' + name + '\\s*=\\s*\\{'));
  if (!match) throw new Error('未找到对象：' + name);
  const start = match.index + match[0].length - 1;
  let depth = 0, quote = '';
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
    else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return vm.runInNewContext('(' + text.slice(start, i + 1) + ')', { ASSET_BASE: ASSET, RLYEH_FOG_CLOUD_URL: 'fog_cloud.ogg' });
  }
  throw new Error('对象未闭合：' + name);
}
function functionBody(text, name) {
  const at = text.search(new RegExp('function\\s+' + name + '\\s*\\('));
  if (at < 0) return '';
  const open = text.indexOf('{', at);
  let depth = 0, quote = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
    else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  return '';
}
function keyframeBody(text, name) {
  const at = text.indexOf('@keyframes ' + name);
  if (at < 0) return '';
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  return '';
}
function syntax(text, label) {
  const scripts = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  try { scripts.forEach(m => new vm.Script(m[1])); check(scripts.length === 2, label + '两个内联脚本语法通过'); }
  catch (e) { check(false, label + '语法：' + e.message); }
}

console.log('== 变种触发与行军兽移植 v12.06 产物专项 ==');
check(base === 'regex-前端战斗v12_06.json' && pkg.scriptName === '前端战斗v12.06', '文件名与scriptName均为v12.06');
check(count(src, '```') === 2 && count(fenced, '```') === 2, '源码与产物均只有头尾自围栏');
check(!immune.includes('```') && !/&(?!amp;)/.test(immune), '内部围栏加固及全量实体免疫');
check(raw.replace(/&/g, '&amp;') === immune, '单遍实体还原逐字符一致');
check(!/\$[$&`'\d<]/.test(immune) && !/\$[$&`'\d<]/.test(raw), '捕获组替换序列免疫');
syntax(src, '源码'); syntax(raw, '产物');
check(count(raw, 'monsterAttack') === 3, 'monsterAttack恰3处：资产表、红单体前摇、自爆');
check(raw.includes('192.168.110.83:8766') && !raw.includes('cdn.tailwindcss.com'), '内网资源与静态Tailwind隔离');
check(!/IDENTITY_SAMPLE_B64|HERO_DATA|ENEMY_ROWS|DEMO_GROUPS|DEMO_CARDS|playHostSample|ensureHostGunSamples|playDemoSkill|playLegacyBaselineFx|resetDemo|renderSkillCards|__RPG_MARCHER_SCHEME__|data:audio|data-scheme=/i.test(raw),
  '无Demo宿主、演示卡片、采样或内嵌音频');

// —— 旧 ring 不变 ——
const ring = keyframeBody(raw, 'arcane-ring-out');
check(count(raw, '@keyframes arcane-ring-out') === 1, '旧 arcane-ring-out 关键帧仅一份');
check(/r:\s*4\b/.test(ring) && /r:\s*150\b/.test(ring) && /stroke-width:\s*(?:0)?\.5\b/.test(ring), '旧 ring 关键帧语义未改（r 4→150、0.5 收尾）');

// —— grad 形状 / trail / render ——
check(raw.includes('gradOrb') && raw.includes('gradMist'), '渐变粒子形状 gradOrb / gradMist 入包');
check(/gradRing\(g, p\)/.test(src) && /gradFlare\(g, p\)/.test(src) && raw.includes('gradRing') && raw.includes('gradFlare'), '渐变环与光斑追加，旧 ring 描边实现保留');
check(src.includes("ring(g, p) { g.strokeStyle = p.color; g.lineWidth = 3 * p.life;"), '旧 DRAW.ring 描边扩圈原样保留');
check(/if \(p\.trail\)/.test(src) && src.includes('p.hist.pop()') && raw.includes('hist'), '粒子 hist 拖尾维护入包');
check(src.includes("p.shape !== 'gradOrb' && p.shape !== 'spark'") && raw.includes('spark'), 'render 新增 gradOrb/spark 旋转豁免，保留既有形状');

// —— 只迁 vertical + abyss ——
check(raw.includes('is-vertical') && /arcane-marcher-rift-stage is-vertical/.test(src) && !/marcherScheme|__RPG_MARCHER_SCHEME__/.test(raw), '行军兽仅 vertical，无 Demo 构图状态');
check(/const SFX_PRESETS\s*=/.test(src) && /SFX_PRESETS\.abyss\[cue\]/.test(src) && !/sfxPack|activeSfxPack/.test(raw), '只用固定 abyss 音轨，不带 Demo 预设状态');
check(!/is-diag|is-ground|data-scheme="diag"|data-scheme="ground"/.test(raw), '未迁入 diag / ground 方案分支');
const heavyOnly = ['mx_armor_strike', 'mx_metal_door', 'mx_vacuum', 'mx_trailer_impact', 'mx_rift_tear',
  'mx_dragon_growl', 'mx_grave_wind', 'mx_wind_hum', 'mx_golem_walk', 'mx_gear_clank'];
check(heavyOnly.every(k => !raw.includes(k)), '未迁入 heavy / hybrid 专用音轨（只保留 abyss 组合）');

// —— 新秘术参数与注册 ——
check(raw.includes('飞沙化甲') && raw.includes('蝎眼钥匙'), '两个新秘术标签入包');
check(/CHARGE\s*=\s*280/.test(src) && /LIFE\s*=\s*1320/.test(src) && raw.includes('arcane-stygian-shield-wrap'), '飞沙化甲锁定 280/1320 与盾框入包，产物拍点由真实回归验证');
check(/CHARGE\s*=\s*1150/.test(src) && /LIFE\s*=\s*3350/.test(src) && raw.includes('arcane-marcher-veil'), '蝎眼钥匙锁定 1150/3350 与裂隙样式入包');
const registry = objectOf(raw, 'WEBM_FX_REGISTRY');
check(registry['飞沙化甲'] && registry['飞沙化甲'].delay === 0.28 && registry['飞沙化甲'].particles === 'arcane', '飞沙化甲蓄势 delay 0.28 入注册表');
check(registry['蝎眼钥匙'] && registry['蝎眼钥匙'].delay === 1.15 && registry['蝎眼钥匙'].particles === 'arcane', '蝎眼钥匙蓄势 delay 1.15 入注册表');

// —— 变种接口与演出契约 ——
for (const name of ['playVariantTriggerFx', 'isEntityVariantLocked', 'clearVariantState', 'setVariantSfx']) {
  check(new RegExp('window\\.' + name + '\\s*=').test(raw), '公开接口注册：' + name);
  check((src.match(new RegExp('function ' + name + '\\(', 'g')) || []).length === 1, '共享件仅一份：' + name);
}
check(raw.includes('data-arcane-variant-persist'), '常驻层属性 data-arcane-variant-persist 入包');
check(/meta\.triggered/.test(src) && raw.includes('triggered'), 'meta.triggered=false 短路入包');
check(/isMelee/.test(raw) && /reflected/.test(raw), '荆棘近战/反震方向条件入包');
check(/sampled\s*:\s*true/.test(src) && /sampled\s*:\s*(?:true|!0)/.test(raw), '变种采样 sampled 标记完整入包');
check(/variantSfxOn/.test(src) && /setIdentitySfx/.test(raw), '变种开关实现与音效总开关接口保留');
check(!/\)\s*\|\|\s*v(?:Tone|Crunch|Whoosh|Drone|Chime|Crystal)\s*\(/.test(raw), '变种音效无合成 fallback');
check(/maxDurSec/.test(raw) && /fadeOutSec/.test(raw), '真音裁窗参数 maxDurSec / fadeOutSec 入包');
const clearBody = functionBody(src, 'clearArcaneFx');
check(clearBody.includes('clearVariantState()'), 'clearArcaneFx 联动 clearVariantState');

// —— 21 个新增音频 key ——
let urls = {};
try { urls = objectOf(raw, 'audioUrls'); } catch (e) { check(false, 'audioUrls 解析：' + e.message); }
const variantKeys = ['revive_gather', 'revive_bloom', 'molt_crack', 'molt_snap', 'molt_empower', 'rage_exit',
  'link_dash', 'link_chime', 'leech_flow', 'regen_hum', 'thorn_parry'];
for (const key of variantKeys) {
  const names = [key, 'vfx_variant_' + key];
  const hit = names.find(n => urls[n]);
  check(!!hit && urls[hit] === ASSET + '/vfx_variant_' + key + '.mp3', '变种采样注册：' + key);
}
const mx = {
  mx_sand_swish: 'vfx_sand_swish_mx1494.mp3',
  mx_stygian_whoosh: 'vfx_stygian_whoosh_mx2918.mp3',
  mx_sword_metal: 'vfx_sword_metal_mx2795.mp3',
  mx_gear_lock: 'vfx_gear_lock_mx2160.mp3',
  mx_tunnel: 'vfx_tunnel_whoosh_mx1486.mp3',
  mx_rift_charge: 'vfx_rift_charge_mx2900.mp3',
  mx_deep_impact: 'vfx_deep_impact_mx1143.mp3',
  mx_giant_roar: 'vfx_giant_roar_mx1972.mp3',
  mx_dino_roar: 'vfx_dino_roar_mx1976.mp3',
  mx_golem_stomp: 'vfx_golem_stomp_mx2150.mp3'
};
for (const [key, file] of Object.entries(mx)) check(urls[key] === ASSET + '/' + file, '行军兽采样注册：' + key);
check(Object.values(urls).filter(u => String(u).includes('/vfx_variant_')).length === 11, 'vfx_variant_ 资源恰 11 个');
check(!urls.rage_roar && !urls.vfx_variant_rage_roar, 'rage_roar 复用 taunt，不注册重复键');
check(urls.taunt === ASSET + '/taunt.mp3', 'taunt 仍为 rage_roar 的真实来源');

// —— 11 条资产 manifest ——
const manifestPath = path.join(ROOT, '资源', 'variant-trigger', 'manifest.json');
let manifest = null;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { check(false, 'manifest 读取：' + e.message); }
if (manifest) {
  check(Array.isArray(manifest.samples) && manifest.samples.length === 11, 'manifest 恰 11 条变种采样');
  for (const sample of manifest.samples || []) {
    const file = path.join(path.dirname(manifestPath), sample.file);
    let ok = false, size = -1, sha = '';
    try {
      const bytes = fs.readFileSync(file);
      size = bytes.length;
      sha = crypto.createHash('sha256').update(bytes).digest('hex');
      ok = true;
    } catch (e) { /* 缺失在断言中体现 */ }
    check(ok && size === sample.bytes && sha === sample.sha256, '资产完整：' + sample.key);
    check(variantKeys.includes(sample.key), 'manifest key 属于 11 个变种采样：' + sample.key);
  }
}

console.log('\n统计：通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exitCode = fail ? 1 : 0;
