# 小说 AI 写作助手 - 启动脚本
# 使用方法: 右键点击此文件 -> 使用 PowerShell 运行

$Host.UI.RawUI.WindowTitle = "小说 AI 写作助手"

function Write-Header {
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "     小说 AI 写作助手 - 启动程序" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-NodeInstalled {
    try {
        $nodeVersion = node --version 2>$null
        return $nodeVersion
    } catch {
        return $null
    }
}

function Install-Dependencies {
    param([string]$ProjectPath)
    
    Write-Host "[2/3] 正在安装依赖..." -ForegroundColor Yellow
    Write-Host "      这可能需要几分钟时间，请耐心等待..." -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $ProjectPath
    
    try {
        npm install | Out-String | ForEach-Object { 
            if ($_ -match "error|ERR|failed") {
                Write-Host $_ -ForegroundColor Red
            }
        }
        return $LASTEXITCODE -eq 0
    } catch {
        Write-Host "[错误] 依赖安装失败: $_" -ForegroundColor Red
        return $false
    }
}

function Start-DevServer {
    param([string]$ProjectPath)
    
    Write-Host "[3/3] 正在启动开发服务器..." -ForegroundColor Green
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "     服务启动后，请打开浏览器访问:" -ForegroundColor Green
    Write-Host "     http://localhost:3000" -ForegroundColor Yellow -BackgroundColor Black
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "提示: 按 Ctrl+C 可以停止服务器" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $ProjectPath
    
    try {
        npm run dev
    } finally {
        Write-Host ""
        Write-Host "服务器已停止" -ForegroundColor Yellow
        Write-Host "按任意键退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

# 主程序
Write-Header

# 获取脚本所在目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Join-Path $ScriptDir "my-app"

# 检查 Node.js
Write-Host "[1/3] 检查 Node.js..." -ForegroundColor Yellow
$nodeVersion = Test-NodeInstalled

if (-not $nodeVersion) {
    Write-Host "[错误] 未检测到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "      检测到 Node.js $nodeVersion" -ForegroundColor Green
Write-Host ""

# 检查 node_modules
$nodeModulesPath = Join-Path $ProjectPath "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    $installed = Install-Dependencies -ProjectPath $ProjectPath
    if (-not $installed) {
        Write-Host ""
        Write-Host "按任意键退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "[2/3] 依赖已安装" -ForegroundColor Green
    Write-Host ""
}

# 启动服务器
Start-DevServer -ProjectPath $ProjectPath
