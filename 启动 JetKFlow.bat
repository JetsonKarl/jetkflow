@echo off
chcp 65001 >nul
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
cd /d "%~dp0"
start "" "http://127.0.0.1:5173/"
call pnpm.cmd dev
