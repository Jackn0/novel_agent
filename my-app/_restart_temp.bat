
@echo off
title Next.js Dev Server - Restarting...
timeout /t 2 /nobreak >nul
cd /d "D:\work\llm\novel_agent\my-app"
echo Starting Next.js development server...
echo.
npm run dev
echo.
echo Server stopped. Press any key to exit.
pause >nul
