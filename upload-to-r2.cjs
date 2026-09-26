#!/usr/bin/env node
/**
 * RpgCombat 资源批量上传到 Cloudflare R2
 *
 * 用法：
 *   1. 在下方【配置区】填入 4 个值（账户 ID / Access Key / Secret / 桶名）
 *   2. 运行：node upload-to-r2.cjs
 *   3. 只想预览不实际上传：node upload-to-r2.cjs --dry-run
 *
 * 上传后的公开访问地址形如：
 *   https://pub-28508adcb2484e98a7a7965b78878723.r2.dev/rpgcombat/basic-sfx/hpHeal.mp3
 *
 * 说明：本脚本零依赖（只用 Node 内置模块 + 全局 fetch），会自动为每个对象设置
 *       Content-Type（按扩展名推断）与长缓存 Cache-Control。若不想设置缓存头，
 *       把 CACHE_CONTROL 改成 null 即可。
 */

// ============================ 配置区 ============================
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '在这里填 Cloudflare 账户 ID';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || '在这里填 R2 Access Key ID';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || '在这里填 R2 Secret Access Key';
const BUCKET = process.env.R2_BUCKET || '在这里填 R2 桶名'; // 桶名，不是 r2.dev 子域

const PREFIX = 'rpgcombat'; // R2 中的 key 前缀（总项目名）
const LOCAL_ROOT = 'D:/Project/RpgCombat/资源';
const FOLDERS = ['basic-sfx', 'misc-sfx', 'vfx', 'suoen', 'feng', 'weilan', 'dadi'];
const PUBLIC_BASE = 'https://pub-28508adcb2484e98a7a7965b78878723.r2.dev';
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const CONCURRENCY = 5;
// ================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run');

const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const sha256hex = (d) => crypto.createHash('sha256').update(d).digest('hex');
const hmac = (key, d) => crypto.createHmac('sha256', key).update(d).digest();
const hmacHex = (key, d) => crypto.createHmac('sha256', key).update(d).digest('hex');
const encodeKey = (k) => k.split('/').map(encodeURIComponent).join('/');

/** AWS SigV4 签名并 PUT 一个对象 */
async function putObject(key, body, contentType) {
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const payloadHash = sha256hex(body);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = '/' + BUCKET + '/' + encodeKey(key);

  const headerPairs = [];
  if (CACHE_CONTROL) headerPairs.push(['cache-control', CACHE_CONTROL]);
  headerPairs.push(['content-type', contentType]);
  headerPairs.push(['host', host]);
  headerPairs.push(['x-amz-content-sha256', payloadHash]);
  headerPairs.push(['x-amz-date', amzDate]);
  headerPairs.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const canonicalHeaders = headerPairs.map(([k, v]) => `${k}:${v}`).join('\n') + '\n';
  const signedHeaders = headerPairs.map(([k]) => k).join(';');
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const kSigning = hmac(hmac(hmac(hmac('AWS4' + SECRET_KEY, dateStamp), 'auto'), 's3'), 'aws4_request');
  const signature = hmacHex(kSigning, stringToSign);

  const headers = {
    Authorization: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'Content-Type': contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (CACHE_CONTROL) headers['Cache-Control'] = CACHE_CONTROL;

  const res = await fetch(`https://${host}${canonicalUri}`, { method: 'PUT', headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
  return res.headers.get('etag');
}

/** 收集待上传文件清单 */
function collectFiles() {
  const list = [];
  for (const folder of FOLDERS) {
    const dir = path.join(LOCAL_ROOT, folder);
    if (!fs.existsSync(dir)) {
      console.log(`  [警告] 目录不存在，跳过: ${folder}`);
      continue;
    }
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (!fs.statSync(full).isFile()) continue;
      const ext = path.extname(name).toLowerCase();
      list.push({
        rel: `${folder}/${name}`,
        key: `${PREFIX}/${folder}/${name}`,
        full,
        size: fs.statSync(full).size,
        type: MIME[ext] || 'application/octet-stream',
      });
    }
  }
  return list;
}

(async () => {
  const files = collectFiles();
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  console.log('====================================================');
  console.log('   RpgCombat 资源上传 → Cloudflare R2');
  console.log('====================================================');
  console.log(`  文件夹: ${FOLDERS.length} 个    文件: ${files.length} 个    体积: ${(totalBytes / 1048576).toFixed(2)} MB`);
  console.log(`  key 前缀: ${PREFIX}/    缓存头: ${CACHE_CONTROL || '(不设置)'}`);
  console.log('====================================================\n');

  if (DRY_RUN) {
    for (const f of files) {
      console.log(`  ${f.key}  (${(f.size / 1024).toFixed(0)} KB, ${f.type})`);
    }
    console.log(`\n[dry-run] 共 ${files.length} 个文件待上传，未实际上传。`);
    return;
  }

  if (ACCOUNT_ID.includes('在这里填') || ACCESS_KEY.includes('在这里填') || SECRET_KEY.includes('在这里填') || BUCKET.includes('在这里填')) {
    console.error('请先在脚本顶部的【配置区】填写 ACCOUNT_ID / ACCESS_KEY / SECRET_KEY / BUCKET。');
    console.error('（或先跑 `node upload-to-r2.cjs --dry-run` 预览待上传清单）');
    process.exit(1);
  }

  let ok = 0, fail = 0;
  const failures = [];
  let cursor = 0;

  async function worker(id) {
    while (cursor < files.length) {
      const f = files[cursor++];
      let lastErr;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await putObject(f.key, fs.readFileSync(f.full), f.type);
          ok++;
          console.log(`  [${ok + fail}/${files.length}] OK   ${f.key}`);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          if (attempt === 1) await new Promise((r) => setTimeout(r, 800));
        }
      }
      if (lastErr) {
        fail++;
        failures.push({ key: f.key, err: lastErr.message });
        console.error(`  [${ok + fail}/${files.length}] FAIL ${f.key} :: ${lastErr.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, (_, i) => worker(i)));

  console.log('\n====================================================');
  console.log(`  完成：成功 ${ok} 个，失败 ${fail} 个`);
  console.log('====================================================');
  if (fail) {
    console.log('\n失败清单：');
    failures.forEach((f) => console.log(`  ${f.key} :: ${f.err}`));
  }
  console.log('\n公开访问地址示例：');
  console.log(`  ${PUBLIC_BASE}/${PREFIX}/basic-sfx/hpHeal.mp3`);
  console.log(`  ${PUBLIC_BASE}/${PREFIX}/suoen/suoen-first.mp3`);
  console.log('\n验证一条：curl -I "' + PUBLIC_BASE + '/' + PREFIX + '/basic-sfx/hpHeal.mp3"');
})();
