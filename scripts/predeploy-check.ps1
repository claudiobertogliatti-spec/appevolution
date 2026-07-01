$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "== Ciak / Evolution PRO predeploy check ==" -ForegroundColor Cyan
Write-Host ""

Push-Location $repoRoot
try {
  $branch = git branch --show-current
  Write-Host "Branch: $branch"
  if ($branch -ne "main") {
    Write-Host "WARNING: non sei su main. Il deploy production standard parte da main." -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Host "Git status:"
  git status --short

  Write-Host ""
  Write-Host "Remote:"
  git remote -v

  Write-Host ""
  Write-Host "Vercel config:"
  if (Test-Path (Join-Path $frontendDir "vercel.json")) {
    Write-Host "OK frontend/vercel.json trovato"
  } else {
    throw "frontend/vercel.json non trovato"
  }
}
finally {
  Pop-Location
}

Push-Location $frontendDir
try {
  Write-Host ""
  Write-Host "Build frontend con env Vercel..." -ForegroundColor Cyan
  $env:DISABLE_ESLINT_PLUGIN = "true"
  $env:CI = "false"
  npm run build

  $ciakIndex = Join-Path $frontendDir "build\index.ciak.html"
  if (!(Test-Path $ciakIndex)) {
    throw "Build completata ma build/index.ciak.html non esiste"
  }

  Write-Host ""
  Write-Host "OK build/index.ciak.html generato" -ForegroundColor Green
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "== Risultato ==" -ForegroundColor Cyan
Write-Host "Locale: PASS"
Write-Host "GitHub: esegui commit + git push origin main"
Write-Host "Vercel: se Git integration e' attiva, partira' dal push su main"
Write-Host "Backend: deploy Cloud Run solo se cambiano backend/**"

