# ============================================================
# push-to-github.ps1
# Satu-klik deploy website Masjid Bandar Labis ke GitHub Pages.
#
# Fungsi skrip:
#   1. Init repo git (jika belum)
#   2. Stage & commit semua fail
#   3. Cipta repo GitHub PUBLIC (jika belum wujud)
#   4. Sambung remote origin
#   5. Aktifkan GitHub Pages (source: GitHub Actions)
#   6. Push ke branch main
#   7. (Actions CI akan bina + deploy secara automatik)
#
# Prasyarat: gh CLI sudah log masuk (gh auth status)
# ============================================================

$ErrorActionPreference = 'Stop'

$PROJECT = Split-Path $PSScriptRoot -Parent
Set-Location $PROJECT

$REPO_NAME  = 'masjid-bandar-labis'
$BRANCH     = 'main'
$COMMIT_MSG = 'Laman rasmi Masjid Bandar Labis (open source)'

function Step($n, $title) {
  Write-Host "`n==> [$n/7] $title" -ForegroundColor Cyan
}

# ---------- 1. Git init ----------
Step 1 'Inisialisasi repo git'
if (-not (Test-Path '.git')) {
  git init
  Write-Host '  Repo git dicipta.'
} else {
  Write-Host '  Repo git sudah wujud.'
}
git branch -M $BRANCH

# ---------- 2. Stage & commit ----------
Step 2 'Stage & commit semua fail'
git add .
$staged = (git status --porcelain | Measure-Object).Count
Write-Host "  $staged fail di-stage."
if ($staged -gt 0) {
  git commit -m $COMMIT_MSG
  Write-Host '  Commit berjaya.'
} else {
  Write-Host '  Tiada perubahan baharu untuk di-commit.' -ForegroundColor Yellow
}

# ---------- 3. Semak GitHub ----------
Step 3 'Semak akaun GitHub (gh CLI)'
gh auth status
$USER = (gh api user -q '.login').Trim()
Write-Host "  Akaun: $USER"

# ---------- 4. Remote origin ----------
Step 4 'Sambung remote origin'
$remoteUrl = "https://github.com/$USER/$REPO_NAME.git"
$origin = git remote get-url origin 2>$null
if ($origin) {
  git remote set-url origin $remoteUrl
  Write-Host "  origin dikemas kini -> $remoteUrl"
} else {
  git remote add origin $remoteUrl
  Write-Host "  origin ditambah -> $remoteUrl"
}

# ---------- 5. Cipta repo GitHub (public) ----------
Step 5 'Cipta repo GitHub PUBLIC (jika belum wujud)'
$exists = gh repo view "$USER/$REPO_NAME" --json name 2>$null
if (-not $exists) {
  gh repo create $REPO_NAME --public --source . --remote origin
  Write-Host "  Repo public '$REPO_NAME' dicipta."
} else {
  Write-Host "  Repo '$REPO_NAME' sudah wujud - gunakan sedia ada."
}

# ---------- 6. Aktifkan GitHub Pages ----------
Step 6 'Aktifkan GitHub Pages (source: GitHub Actions)'
$ok = $false
try {
  gh api "repos/$USER/$REPO_NAME/pages" -X POST -f build_type=workflow 2>$null | Out-Null
  $ok = ($LASTEXITCODE -eq 0)
} catch { $ok = $false }
if (-not $ok) {
  try {
    gh api "repos/$USER/$REPO_NAME/pages" -X PUT -f build_type=workflow 2>$null | Out-Null
    $ok = ($LASTEXITCODE -eq 0)
  } catch { $ok = $false }
}
if ($ok) {
  Write-Host '  GitHub Pages diaktifkan (build_type: workflow).'
} else {
  Write-Host '  Amaran: tidak dapat tetapkan Pages secara automatik.' -ForegroundColor Yellow
  Write-Host '  Sila buka: Settings > Pages > Source: GitHub Actions' -ForegroundColor Yellow
}

# ---------- 7. Push ----------
Step 7 'Push ke GitHub'
git push -u origin $BRANCH
Write-Host '  Push selesai.'

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " SELESAI! Website akan live dalam 1-3 minit di:" -ForegroundColor Green
Write-Host "  https://$USER.github.io/$REPO_NAME/" -ForegroundColor Yellow
Write-Host ""
Write-Host " Nota: Jangan lupa sahkan e-mel pengesahan FormSubmit" -ForegroundColor Cyan
Write-Host " selepas ujian borang pertama (mesej akan sampai ke" -ForegroundColor Cyan
Write-Host " masjidbandarlabis@gmail.com)." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
