[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolRoot = $PSScriptRoot
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolRoot '..\..')).Path
$appPath = Join-Path $toolRoot 'app'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
	throw '未找到 Git。请先安装 Git，再重新运行 setup.ps1。'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
	throw '未找到 Node.js。SillyTavern 需要 Node.js 20 或更高版本。'
}

$nodeVersionText = (& node --version).TrimStart('v')
$nodeMajor = [int]($nodeVersionText.Split('.')[0])
if ($nodeMajor -lt 20) {
	throw "Node.js 版本过低：$nodeVersionText。SillyTavern 需要 Node.js 20 或更高版本。"
}

Write-Host '正在初始化 SillyTavern submodule...'
& git -C $repoRoot submodule update --init --recursive -- tools/sillytavern/app
if ($LASTEXITCODE -ne 0) {
	throw "SillyTavern submodule 初始化失败，退出码：$LASTEXITCODE"
}

if (-not (Test-Path -LiteralPath (Join-Path $appPath 'package-lock.json'))) {
	throw "SillyTavern submodule 不完整：缺少 $appPath\package-lock.json"
}

Write-Host '正在安装 SillyTavern Node.js 依赖...'
Push-Location $appPath
try {
	& npm ci
	if ($LASTEXITCODE -ne 0) {
		throw "npm ci 失败，退出码：$LASTEXITCODE"
	}
}
finally {
	Pop-Location
}

Write-Host ''
Write-Host 'SillyTavern 首次安装完成。'
Write-Host '启动命令：'
Write-Host '  .\tools\sillytavern\start.ps1'
