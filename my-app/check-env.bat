@echo off
chcp 65001 >nul
echo === 环境变量检查 ===
echo.
echo ANTHROPIC_API_KEY: %ANTHROPIC_API_KEY:~0,10%...
echo OPENAI_API_KEY: %OPENAI_API_KEY:~0,10%...
echo OPENAI_BASE_URL: %OPENAI_BASE_URL%
echo USE_MAX_COMPLETION_TOKENS: %USE_MAX_COMPLETION_TOKENS%
echo MAX_TOKENS: %MAX_TOKENS%
echo SETTING_MODEL: %SETTING_MODEL%
echo.
echo === Node 版本 ===
node --version
echo.
echo === 依赖版本 ===
npm list next typescript --depth=0 2>nul
echo.
pause
