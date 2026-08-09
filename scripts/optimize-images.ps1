# ============================================================
# optimize-images.ps1
# Kompres gambar JPG dalam folder images/ untuk kegunaan web
# (maksimum 1600px, kualiti 82). Gambar asal kekal di peranti.
# Guna: powershell -ExecutionPolicy Bypass -File scripts\optimize-images.ps1
# ============================================================

Add-Type -AssemblyName System.Drawing

$PROJECT = Split-Path $PSScriptRoot -Parent
Set-Location $PROJECT

$MAX_W = 1600
$QUALITY = 82

$files = Get-ChildItem (Join-Path $PROJECT 'images') -Recurse -File |
  Where-Object { $_.Extension -match '^\.jpe?g$' -or $_.Extension -match '^\.JPE?G$' }

Write-Host ("Memproses " + $files.Count + " gambar...")

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)

foreach ($f in $files) {
  try {
    $img = [System.Drawing.Image]::FromFile($f.FullName)

    # Baca orientasi EXIF (untuk gambar telefon)
    $orientation = 1
    try {
      $prop = $img.GetPropertyItem(0x0112)
      if ($prop) { $orientation = [BitConverter]::ToInt32($prop.Value, 0) }
    } catch { $orientation = 1 }

    # Kira saiz baru
    $ratio = 1.0
    if ($img.Width -gt $MAX_W) { $ratio = $MAX_W / $img.Width }
    $newW = [int]([math]::Max(1, $img.Width * $ratio))
    $newH = [int]([math]::Max(1, $img.Height * $ratio))

    $bmp = New-Object System.Drawing.Bitmap $newW, $newH
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $newW, $newH)
    $g.Dispose()
    $img.Dispose()  # lepaskan kunci fail sebelum simpan

    # Guna orientasi EXIF
    switch ($orientation) {
      3 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      6 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      8 { $bmp.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }

    $bmp.Save($f.FullName, $encoder, $params)
    $bmp.Dispose()

    $sizeKB = [math]::Round((Get-Item $f.FullName).Length / 1KB)
    Write-Host ("  OK  " + $f.FullName.Replace($PROJECT + '\', '') + "  (" + $sizeKB + " KB)")
  } catch {
    Write-Host ("  GAGAL " + $f.Name + " -> " + $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host "Selesai."
