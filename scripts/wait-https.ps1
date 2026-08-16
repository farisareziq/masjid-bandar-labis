# ============================================================
# wait-https.ps1
# Pemantau automatik: tunggu GitHub keluarkan sijil SSL untuk
# domain khas, kemudian aktifkan "Enforce HTTPS".
# Berjalan di latar belakang (sehingga 2 jam). Log ke fail.
# ============================================================

$REPO = 'farisareziq/masjid-bandar-labis'
$LOG  = Join-Path $env:TEMP 'masjid-https-log.txt'

Add-Content $LOG ("(" + (Get-Date -Format 'HH:mm:ss') + ") Pemantau dimulakan.")
Add-Content $LOG ("(" + (Get-Date -Format 'HH:mm:ss') + ") Menunggu sijil SSL untuk masjidlabis.my...")

for ($i = 1; $i -le 120; $i++) {
  Start-Sleep -Seconds 60

  $state = ''
  try { $state = gh api "repos/$REPO/pages" -q '.protected_domain_state' 2>$null } catch {}

  $httpsOk = $false
  try {
    $r = Invoke-WebRequest -Uri 'https://masjidlabis.my/' -UseBasicParsing -TimeoutSec 15
    if ($r.StatusCode -eq 200) { $httpsOk = $true }
  } catch {}

  if ($httpsOk -or $state -eq 'verified') {
    try {
      gh api "repos/$REPO/pages" -X PUT -F https_enforced=true 2>$null | Out-Null
      Add-Content $LOG ("(" + (Get-Date -Format 'HH:mm:ss') + ") Sijil SAH! Enforce HTTPS diaktifkan. Domain: https://masjidlabis.my")
    } catch {
      Add-Content $LOG ("(" + (Get-Date -Format 'HH:mm:ss') + ") Sijil SAH tapi gagal aktifkan HTTPS: " + $_.Exception.Message)
    }
    break
  }

  if ($i % 5 -eq 0) {
    Add-Content $LOG ("(" + (Get-Date -Format 'HH:mm:ss') + ") Semakan #$i - masih menunggu sijil...")
  }
}

Add-Content $LOG ("(" + (Get-Date -Format 'HH:mm:ss') + ") Pemantau tamat.")
