$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ required.' }
New-Item -ItemType Directory -Force -Path 'data' | Out-Null
$credentials = Join-Path $PSScriptRoot 'data\local-credentials.json'
if (-not (Test-Path $credentials)) {
  $device = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
  $admin = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
  @{ DEVICE_KEY=$device; ADMIN_KEY=$admin } | ConvertTo-Json | Set-Content -Path $credentials -Encoding UTF8
}
$cfg = Get-Content $credentials -Raw | ConvertFrom-Json
$env:DEVICE_KEY = $cfg.DEVICE_KEY
$env:ADMIN_KEY = $cfg.ADMIN_KEY
Write-Host 'Open A-Plate at http://localhost:3000/' -ForegroundColor Cyan
# Skip the login page ONLY on the local computer; API keys remain private.
$env:APLATE_SKIP_LOGIN = '1'
Write-Host 'Local dashboard starts without a login screen.' -ForegroundColor Green
node server.mjs
