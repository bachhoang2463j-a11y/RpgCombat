#!/usr/bin/env node
/**
 * RpgCombat 断言与测试交互式启动中心
 */
const readline = require('readline');
const { execSync, spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname);

function printHeader() {
  console.log('\x1b[36m=====================================================\x1b[0m');
  console.log('\x1b[1m\x1b[33m        RpgCombat 自动化断言与回归测试中心           \x1b[0m');
  console.log('\x1b[36m=====================================================\x1b[0m\n');
  console.log('  \x1b[32m[1]\x1b[0m 运行【公开版产物专项断言】(秒级校验 Catbox/内网隔离/JSON)');
  console.log('  \x1b[32m[2]\x1b[0m 启动/打开【浏览器 621 项集成测试】(Harness 回归套件)');
  console.log('  \x1b[32m[3]\x1b[0m 重新构建【公开版正则 JSON 包】(build-regex-public)');
  console.log('  \x1b[90m[0]\x1b[0m 退出\n');
  console.log('\x1b[36m-----------------------------------------------------\x1b[0m');
}

function runPublicAssertion() {
  console.log('\n\x1b[33m▶ 正在执行公开版产物专项断言...\x1b[0m\n');
  try {
    execSync('node test-public-release.cjs', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('\x1b[31m断言执行失败！\x1b[0m');
  }
}

function runHarness() {
  console.log('\n\x1b[33m▶ 正在检测服务并打开浏览器集成测试 (Harness)...\x1b[0m\n');
  try {
    execSync('node run-harness.cjs', { cwd: ROOT, stdio: 'inherit' });
    console.log('\n\x1b[32m✔ 已唤起测试页面，请在浏览器中点击「▶ 运行全部断言」查看 621 项结果。\x1b[0m');
  } catch (e) {
    console.error('\x1b[31m唤起集成测试失败：\x1b[0m', e.message);
  }
}

function runBuildPublic() {
  console.log('\n\x1b[33m▶ 正在重新构建公开版正则 JSON 包...\x1b[0m\n');
  try {
    execSync('node build-regex-public.cjs', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('\x1b[31m构建公开版失败！\x1b[0m');
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

printHeader();
rl.question('请输入选项编号 [默认 1，直接按回车执行]: ', (answer) => {
  const choice = (answer || '1').trim();
  if (choice === '1') {
    runPublicAssertion();
  } else if (choice === '2') {
    runHarness();
  } else if (choice === '3') {
    runBuildPublic();
  } else if (choice === '0') {
    console.log('已退出。');
    process.exit(0);
  } else {
    console.log('\x1b[31m无效输入，默认执行选项 1：\x1b[0m');
    runPublicAssertion();
  }
  rl.close();
});
