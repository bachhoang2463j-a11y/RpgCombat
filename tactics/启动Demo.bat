@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js，然后重新运行本文件。
  pause
  exit /b 1
)
echo 请在浏览器打开 http://127.0.0.1:8126/tactics/index.html
echo 关闭此窗口即可停止本地服务。
node tactics/tools/serve.cjs "%CD%" 8126
pause
