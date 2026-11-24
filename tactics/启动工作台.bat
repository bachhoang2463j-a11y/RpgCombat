@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js，然后重新运行本文件。
  pause
  exit /b 1
)
echo 战棋特效完整工作台：http://127.0.0.1:8127/tactics/vfx-stage.html
echo 战棋纯净空白母版（多文件）：http://127.0.0.1:8127/tactics/vfx-template.html
echo 关闭此窗口即可停止本地服务。
node tactics/tools/serve.cjs "%CD%" 8127
pause
