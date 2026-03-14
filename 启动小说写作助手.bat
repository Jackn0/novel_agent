@echo off
chcp 65001 >nul
title 小说 AI 写作助手

echo ==========================================
echo     小说 AI 写作助手 - 启动程序
echo ==========================================
echo.

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] 检测到 Node.js 版本:
node --version
echo.

:: 进入项目目录
cd /d "%~dp0my-app"

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [2/3] 首次启动，正在安装依赖...
    echo 这可能需要几分钟时间，请耐心等待...
    echo.
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [2/3] 依赖已安装
)

echo.
echo [3/3] 启动开发服务器...
echo.
echo ==========================================
echo     服务启动后，请在浏览器访问:
echo     http://localhost:3000
echo ==========================================
echo.
echo 按 Ctrl+C 可以停止服务器
echo.

:: 启动 Next.js 开发服务器
call npm run dev

:: 如果服务器意外退出
echo.
echo 服务器已停止
pause