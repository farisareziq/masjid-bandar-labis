# ============================================================
# deploy-branch.ps1
# Deploy website ke GitHub Pages TANPA GitHub Actions
# (kaedah "Deploy from branch": main /docs).
#
# Cara guna:  powershell -ExecutionPolicy Bypass -File scripts\deploy-branch.ps1
#
# Langkah:
#   1. Bina website (node src/build.js -> dist/)
#   2. Salin output ke folder docs/
#   3. Commit & push ke GitHub
#   4. Tetapkan Pages source kepada main /docs (kali pertama sahaja)
# ============================================================

$ErrorActionPreference = 'Continue'

$PROJECT = Split-Path $PSScriptRoot -Parent
Set-Location $PROJECT

$REPO_NAME = 'masjid-bandar-labis'
$BRANCH    = 'main'
$COMMIT_MSG = 'Kemas kini laman web'

function Step($n, $title) {
  Write-Host "`n==> [$n/5] $title" -ForegroundColor Cyan
}

# ---------- 1. Bina website ----------
Step 1 'Bina website (node src/build.js)'
node src/build.js
if ($LASTEXITCODE -ne 0) { Write-Host 'Ralat semasa bina. Berhenti.' -ForegroundColor Red; exit 1 }

# ---------- 2. Salin ke docs/ ----------
Step 2 'Salin output ke folder docs/'
if (Test-Path 'docs') { Remove-Item 'docs' -Recurse -Force }
New-Item -ItemType Directory -Path 'docs' | Out-Null
Copy-Item 'dist\*' 'docs' -Recurse -Force
Write-Host '  docs/ dikemas kini.'

# ---------- 3. Commit ----------
Step 3 'Commit perubahan'
git add .
$staged = (git status --porcelain | Measure-Object).Count
if ($staged -gt 0) {
  git commit -m $COMMIT_MSG
  Write-Host '  Commit berjaya.'
} else {
  Write-Host '  Tiada perubahan - teruskan.' -ForegroundColor Yellow
}

# ---------- 4. Push ----------
Step 4 'Push ke GitHub'
git push origin $BRANCH
Write-Host '  Push selesai.'

# ---------- 5. Tetapkan Pages source (sekali sahaja) ----------
Step 5 'Tetapkan GitHub Pages (source: main /docs)'
$USER = (gh api user -q '.login').Trim()
$ok = $false
try {
  $null = gh api "repos/$USER/$REPO_NAME/pages" -X PUT -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/docs' 2>$null
  if ($LASTEXITCODE -eq 0) { $ok = $true }
} catch { $ok = $false }
if (-not $ok) {
  try {
    $null = gh api "repos/$USER/$REPO_NAME/pages" -X POST -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/docs' 2>$null
    if ($LASTEXITCODE -eq 0) { $ok = $true }
  } catch { $ok = $false }
}
if ($ok) {
  Write-Host '  Pages ditetapkan ke main /docs.'
} else {
  Write-Host '  Amaran: tidak dapat tetapkan Pages automatik.' -ForegroundColor Yellow
  Write-Host '  Buka: Settings > Pages > Source: Deploy from branch > main /docs' -ForegroundColor Yellow
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " SELESAI! Website live di:" -ForegroundColor Green
Write-Host "  https://$USER.github.io/$REPO_NAME/" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
