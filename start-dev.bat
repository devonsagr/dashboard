@echo off
chcp 65001 >nul
title 个人知识库与仪表盘平台 - v5 本地开发
cd /d "%~dp0"

echo 个人知识库与仪表盘平台 - v5 前端基线
echo 开发地址: http://127.0.0.1:5185

if not exist node_modules (
    call npm ci
    if errorlevel 1 (
        echo 依赖安装失败，请检查 Node.js 版本和网络。
        pause
        exit /b 1
    )
)

call npm run dev -- --open
pause
