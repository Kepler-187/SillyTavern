[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolRoot = $PSScriptRoot
$appPath = Join-Path $toolRoot 'app'
$configPath = Join-Path $toolRoot 'config.yaml'
$dataPath = Join-Path $toolRoot 'data'
$serverPath = Join-Path $appPath 'server.js'
$nodeModulesPath = Join-Path $appPath 'node_modules'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
	throw '未找到 Node.js。请先安装 Node.js 20 或更高版本并运行 setup.ps1。'
}

if (-not (Test-Path -LiteralPath $serverPath)) {
	throw 'SillyTavern submodule 尚未初始化。请先运行 setup.ps1。'
}

if (-not (Test-Path -LiteralPath $nodeModulesPath)) {
	throw 'SillyTavern 依赖尚未安装。请先运行 setup.ps1。'
}

if (-not (Test-Path -LiteralPath $configPath)) {
	throw "缺少共享配置：$configPath"
}

if (-not (Test-Path -LiteralPath $dataPath)) {
	throw "缺少共享数据目录：$dataPath"
}

Write-Host "SillyTavern 程序：$appPath"
Write-Host "共享数据目录：$dataPath"
Write-Host '服务地址：http://127.0.0.1:8000/'

Push-Location $appPath
try {
	& node $serverPath --configPath $configPath --dataRoot $dataPath
	$serverExitCode = $LASTEXITCODE
}
finally {
	Pop-Location
}

if ($serverExitCode -ne 0) {
	throw "SillyTavern 启动失败，退出码：$serverExitCode"
}
