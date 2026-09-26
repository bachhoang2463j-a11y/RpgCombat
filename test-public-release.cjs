#!/usr/bin/env node
/**
 * 公开版产物自动化断言套件
 * 包含：
 * 1. regex-前端战斗v11_2-公开版.json 正则产物格式、围栏加固与内网绝对隔离断言
 * 2. index-公开版.html 源码静态安全特征（无内网IP、无私有角色残留）
 * 3. 全量 Catbox 资源对应表与 HTML 资源 100% 覆盖率验证
 * 4. 新角色（冯·霍恩海姆、威廉·退尔）及别名头像/语音完整性断言
 * 5. 运行时英雄回合语音调度（首回合/半血/平时/简写别名）沙盒模拟验证
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname);
const HTML_PATH = path.join(ROOT, 'index-公开版.html');
const JSON_PATH = path.join(ROOT, 'regex-前端战斗v11_2-公开版.json');
const MAPPING_TXT_PATH = path.join(ROOT, 'catbox', '已有Catbox资源链接对应表.txt');

console.log('====================================================');
console.log('       RpgCombat 公开版产物自动化专项断言套件       ');
console.log('====================================================\n');

let passCount = 0;
function pass(title) {
  passCount++;
  console.log(`\x1b[32m[PASS ${passCount}]\x1b[0m ${title}`);
}

// ---------------------------------------------------------
// 1. 正则产物 JSON 断言
// ---------------------------------------------------------
assert(fs.existsSync(JSON_PATH), `正则产物文件不存在: ${JSON_PATH}`);
const jsonRaw = fs.readFileSync(JSON_PATH, 'utf8');
const scriptObj = JSON.parse(jsonRaw);

assert.strictEqual(scriptObj.scriptName, '前端战斗v11.2（公开版）', 'scriptName 必须为 前端战斗v11.2（公开版）');
assert(typeof scriptObj.id === 'string' && scriptObj.id.length > 20, 'id 必须为合法 UUID');
assert(scriptObj.replaceString.startsWith('```html\n') && scriptObj.replaceString.endsWith('\n```'), 'replaceString 必须遵循酒馆三反引号围栏纪律');

const minified = scriptObj.replaceString.slice(8, -4);
assert(minified.includes('</html>'), '压缩产物缺少 </html> 闭合标签');
assert(!minified.includes('```'), '压缩产物内禁止包含裸三反引号');
assert(!minified.includes('192.168.110.83'), '正则产物严禁残留任何局域网 IP');
pass('正则产物 JSON 结构、三反引号围栏与内网隔离验证通过');

// ---------------------------------------------------------
// 2. 源码安全性与隔离断言
// ---------------------------------------------------------
assert(fs.existsSync(HTML_PATH), `公开版 HTML 不存在: ${HTML_PATH}`);
const html = fs.readFileSync(HTML_PATH, 'utf8');

assert(!html.includes('192.168.110.83'), '公开版源码严禁包含内网 IP');
assert(!html.includes('ASSET_BASE ='), '公开版源码不应再有未解析的内网 ASSET_BASE 常量');
assert(!html.includes('HERO_VOICE_BASE ='), '公开版源码不应再有内网 HERO_VOICE_BASE 常量');

// 私有角色头像与语音清理断言
assert(!html.includes('埃利奥特_开始回合'), '私有角色埃利奥特语音必须清理');
assert(!html.includes('玛德琳_第一回合'), '私有角色玛德琳语音必须清理');
assert(!html.includes('弗兰克_第一回合'), '私有角色弗兰克语音必须清理');
pass('公开版源码内网隔离、私有角色（埃利奥特/玛德琳/弗兰克）音频完全隔离');

// ---------------------------------------------------------
// 3. Catbox 资源对应表映射完整性断言
// ---------------------------------------------------------
assert(fs.existsSync(MAPPING_TXT_PATH), `对应表文件不存在: ${MAPPING_TXT_PATH}`);
const mappingTxt = fs.readFileSync(MAPPING_TXT_PATH, 'utf8');

const catboxUrls = [];
const urlRegex = /https:\/\/files\.catbox\.moe\/[a-z0-9]+\.[a-z0-9]+/gi;
let m;
while ((m = urlRegex.exec(mappingTxt)) !== null) {
  if (!catboxUrls.includes(m[0])) {
    catboxUrls.push(m[0]);
  }
}

// 排除误上传的壮汉.mp3
const expectedUrls = catboxUrls.filter(u => u !== 'https://files.catbox.moe/k6w71i.mp3');
let missingInHtml = 0;
for (const url of expectedUrls) {
  if (!html.includes(url)) {
    missingInHtml++;
    console.error(`  [MISSING] 资源表中的链接未在公开版源码中找到: ${url}`);
  }
}
assert.strictEqual(missingInHtml, 0, `共有 ${missingInHtml} 个 Catbox 资源链接未正确注入 index-公开版.html`);
pass(`全量 Catbox 资源映射核对：已注入全部 ${expectedUrls.length} 项有效云端音视频与头像链接`);

// ---------------------------------------------------------
// 4. 新角色头像与别名映射断言
// ---------------------------------------------------------
// 抽取 AVATAR_MAP
const avatarBlockMatch = html.match(/const\s+AVATAR_MAP\s*=\s*\{([\s\S]*?)\};/);
assert(avatarBlockMatch, '未找到 AVATAR_MAP 定义');
const avatarBlock = avatarBlockMatch[1];

assert(avatarBlock.includes('"索恩"'), '必须包含索恩头像');
assert(avatarBlock.includes('"冯·霍恩海姆": "https://imgur.la/images/2026/09/26/feng_avater.png"'), '冯·霍恩海姆头像 URL 错误');
assert(avatarBlock.includes('"冯": "https://imgur.la/images/2026/09/26/feng_avater.png"'), '冯 简写别名头像 URL 错误');
assert(avatarBlock.includes('"威廉·退尔": "https://imgur.la/images/2026/09/26/weilan_avatar.png"'), '威廉·退尔头像 URL 错误');
assert(avatarBlock.includes('"威廉": "https://imgur.la/images/2026/09/26/weilan_avatar.png"'), '威廉 简写别名头像 URL 错误');
assert(avatarBlock.includes('"伊斯坎达尔": "https://imgur.la/images/2026/09/26/dadi_avatar.png"'), '伊斯坎达尔头像 URL 错误');
assert(avatarBlock.includes('"大帝": "https://imgur.la/images/2026/09/26/dadi_avatar.png"'), '大帝 别名头像 URL 错误');
assert(avatarBlock.includes('"征服王": "https://imgur.la/images/2026/09/26/dadi_avatar.png"'), '征服王 别名头像 URL 错误');

assert(!avatarBlock.includes('"埃利奥特"'), '私有角色埃利奥特头像必须移除');
assert(!avatarBlock.includes('"玛德琳"'), '私有角色玛德琳头像必须移除');
assert(!avatarBlock.includes('"弗兰克"'), '私有角色弗兰克头像必须移除');
pass('AVATAR_MAP 索恩/冯/威廉/伊斯坎达尔及其简写别名头像映射准确，私有角色已排除');

// ---------------------------------------------------------
// 5. 角色专属语音配置与别名断言
// ---------------------------------------------------------
const voiceBlockMatch = html.match(/const\s+HERO_VOICE_LINES\s*=\s*\{([\s\S]*?)\n\};/);
assert(voiceBlockMatch, '未找到 HERO_VOICE_LINES 定义');
const voiceBlock = voiceBlockMatch[1];

assert(voiceBlock.includes('"索恩"'), '必须包含索恩专属语音');
assert(voiceBlock.includes('"冯·霍恩海姆"'), '必须包含冯·霍恩海姆专属语音');
assert(voiceBlock.includes('"威廉·退尔"'), '必须包含威廉·退尔专属语音');
assert(!voiceBlock.includes('"埃利奥特"'), '严禁包含埃利奥特语音');
assert(!voiceBlock.includes('"玛德琳"'), '严禁包含玛德琳语音');
assert(!voiceBlock.includes('"弗兰克"'), '严禁包含弗兰克语音');

assert(html.includes('HERO_VOICE_LINES["冯"] = HERO_VOICE_LINES["冯·霍恩海姆"];'), '必须为 冯 建立简写别名语音引用');
assert(html.includes('HERO_VOICE_LINES["威廉"] = HERO_VOICE_LINES["威廉·退尔"];'), '必须为 威廉 建立简写别名语音引用');
pass('HERO_VOICE_LINES 索恩/冯/威廉专属语音配置完整，别名自动指针已建立');

// ---------------------------------------------------------
// 6. 运行时英雄回合语音调度沙盒模拟断言
// ---------------------------------------------------------
// 提取 HERO_VOICE_LINES 对象与相关调度函数
const evalScope = {};
const heroVoiceScript = `
${html.slice(html.indexOf('const HERO_VOICE_LINES'), html.indexOf('function preloadHeroVoices()'))}
return { HERO_VOICE_LINES, pickHeroVoice, playHeroTurnVoice };
`;
const factory = new Function(heroVoiceScript);
const { HERO_VOICE_LINES, pickHeroVoice, playHeroTurnVoice } = factory();

// 挂载别名
HERO_VOICE_LINES['冯'] = HERO_VOICE_LINES['冯·霍恩海姆'];
HERO_VOICE_LINES['威廉'] = HERO_VOICE_LINES['威廉·退尔'];

// 模拟 state 与 playCustomAudio 捕获
let lastPlayedUrl = null;
let lastPlayedVolume = null;
global.state = { currentRound: 1 };
global.playCustomAudio = function(url, vol) {
  lastPlayedUrl = url;
  lastPlayedVolume = vol;
};

// 6.1 首回合播放 first 台词
const thorne = { name: '索恩', hp: 100, maxHp: 100 };
playHeroTurnVoice(thorne);
assert.strictEqual(lastPlayedUrl, 'https://files.catbox.moe/eottvp.mp3', '索恩首回合应播放 first 台词');
assert.strictEqual(lastPlayedVolume, 2, '语音播放增益应为 2 倍');

// 6.2 第二回合正常血量（>50%）从 turn 列表随机
global.state.currentRound = 2;
const von = { name: '冯·霍恩海姆', hp: 80, maxHp: 100 };
playHeroTurnVoice(von);
assert(HERO_VOICE_LINES['冯·霍恩海姆'].turn.includes(lastPlayedUrl), '冯·霍恩海姆半血以上应从 turn 中选取');

// 6.3 简写别名支持与半血（<=50%）调度
const william = { name: '威廉', hp: 40, maxHp: 100 };
playHeroTurnVoice(william);
assert(HERO_VOICE_LINES['威廉·退尔'].low.includes(lastPlayedUrl), '威廉（简写名）半血以下应从 low 中选取');

// 6.4 防连续重复断言
const mockPool = ['voice_A', 'voice_B'];
const picked1 = pickHeroVoice(mockPool, null);
const picked2 = pickHeroVoice(mockPool, picked1);
assert.notStrictEqual(picked1, picked2, 'pickHeroVoice 应有效排除上回合已播过的语音');

pass('英雄回合语音调度（首回合固定/后续随机/半血绝境/别名解析/防重复）逻辑验证全绿');

console.log('\n====================================================');
console.log(`\x1b[32m✔ 全部 ${passCount} 大类断言验证通过，公开版产物状态完好！\x1b[0m`);
console.log('====================================================\n');
