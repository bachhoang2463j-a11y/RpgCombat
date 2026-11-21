'use strict';
// 最终唯一战棋全量：捕获真实 runner 输出，保存逐例结果与源码指纹。
const { spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..', '..');
const runner = path.join(__dirname, 'run-tests.cjs');
const started = new Date().toISOString();
const run = spawnSync(process.execPath, [runner, '--all'], {
  cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
  env: { ...process.env, RUN_TESTS_JSON: '1' },
});
const stages = [...run.stdout.matchAll(/__RUN_TESTS_JSON__(.*?)__END__/g)].map(m => JSON.parse(m[1]));
const files = readdirSync(path.join(root, 'tactics', 'src')).filter(f => f.endsWith('.mjs')).map(f => 'tactics/src/' + f);
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 }).stdout.trim();
const report = {
  stage: 'MVP-final-node', executed: true, started, ended: new Date().toISOString(), sourceHead: head, sourceDirty: true,
  command: 'node tactics/tools/run-tests.cjs --all', exitCode: run.status,
  passed: stages.reduce((sum, s) => sum + s.groups.reduce((n, g) => n + g.passed, 0), 0),
  failed: run.status === 0 ? 0 : 1, pending: 0, stages,
  errors: run.stderr || (run.error ? String(run.error) : null),
  files: Object.fromEntries(files.map(f => [f, createHash('sha256').update(readFileSync(path.join(root, f))).digest('hex')])),
};
writeFileSync(path.join(root, 'integration-test', 'fixtures', 'tactics', 'reports', 'MVP-2026-11-21-node.json'), JSON.stringify(report, null, 2) + '\n');
console.log(run.stdout.replace(/__RUN_TESTS_JSON__.*?__END__/g, '').trim());
if (run.stderr) console.error(run.stderr);
console.log(JSON.stringify({ exitCode: run.status, passed: report.passed, report: 'MVP-2026-11-21-node.json' }));
process.exit(run.status === 0 && stages.length === 4 ? 0 : 1);
