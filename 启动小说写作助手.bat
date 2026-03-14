@echo off
chcp 65001 >nul
title 灏忚 AI 鍐欎綔鍔╂墜

echo ==========================================
echo     灏忚 AI 鍐欎綔鍔╂墜 - 鍚姩绋嬪簭
echo ==========================================
echo.

:: 妫€鏌?Node.js 鏄惁瀹夎
node --version >nul 2>&1
if errorlevel 1 (
    echo [閿欒] 鏈娴嬪埌 Node.js锛岃鍏堝畨瑁?Node.js
    echo 涓嬭浇鍦板潃: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] 妫€娴嬪埌 Node.js 鐗堟湰:
node --version
echo.

:: 杩涘叆椤圭洰鐩綍
cd /d "%~dp0my-app"

:: 妫€鏌?node_modules 鏄惁瀛樺湪
if not exist "node_modules" (
    echo [2/3] 棣栨鍚姩锛屾鍦ㄥ畨瑁呬緷璧?..
    echo 杩欏彲鑳介渶瑕佸嚑鍒嗛挓鏃堕棿锛岃鑰愬績绛夊緟...
    echo.
    call npm install
    if errorlevel 1 (
        echo [閿欒] 渚濊禆瀹夎澶辫触
        pause
        exit /b 1
    )
) else (
    echo [2/3] 渚濊禆宸插畨瑁?
)

echo.
echo [3/3] 鍚姩寮€鍙戞湇鍔″櫒...
echo.
echo ==========================================
echo     鏈嶅姟鍚姩鍚庯紝璇峰湪娴忚鍣ㄨ闂?
echo     http://localhost:3000
echo ==========================================
echo.
echo 鎸?Ctrl+C 鍙互鍋滄鏈嶅姟鍣?
echo.

:: 鍚姩 Next.js 寮€鍙戞湇鍔″櫒
call npm run dev

:: 濡傛灉鏈嶅姟鍣ㄦ剰澶栭€€鍑?
echo.
echo 鏈嶅姟鍣ㄥ凡鍋滄
pause
