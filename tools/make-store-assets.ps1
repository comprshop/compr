param([Parameter(Mandatory=$true)][string]$BackgroundPath)

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'website\assets\images'
$output = Join-Path $root 'store-assets'
New-Item -ItemType Directory -Force -Path $output | Out-Null

function New-Canvas([int]$width, [int]$height, [string]$path) {
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bitmap=$bitmap; Graphics=$graphics; Path=$path }
}

function Save-Canvas($canvas) {
  $canvas.Bitmap.Save($canvas.Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Draw-Cover($g, $image, [int]$x, [int]$y, [int]$w, [int]$h) {
  $scale = [Math]::Max($w / $image.Width, $h / $image.Height)
  $sw = [int]($w / $scale); $sh = [int]($h / $scale)
  $sx = [int](($image.Width - $sw) / 2); $sy = [int](($image.Height - $sh) / 2)
  $g.DrawImage($image, [System.Drawing.Rectangle]::new($x,$y,$w,$h), $sx,$sy,$sw,$sh, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-Fit($g, $image, [int]$x, [int]$y, [int]$w, [int]$h) {
  $scale = [Math]::Min($w / $image.Width, $h / $image.Height)
  $dw = [int]($image.Width * $scale); $dh = [int]($image.Height * $scale)
  $dx = $x + [int](($w-$dw)/2); $dy = $y + [int](($h-$dh)/2)
  $g.DrawImage($image, $dx,$dy,$dw,$dh)
}

$background = [System.Drawing.Image]::FromFile($BackgroundPath)
$logo = [System.Drawing.Image]::FromFile((Join-Path $source 'compr-logo.png'))
$comparison = [System.Drawing.Image]::FromFile((Join-Path $source 'compr-comparison-wide.png'))
$popup = [System.Drawing.Image]::FromFile((Join-Path $source 'compr-popup.png'))
$white = [System.Drawing.Brushes]::White
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220,226,238))
$violet = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(139,116,255))
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18,20,30))
$lightBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244,245,249))

# Screenshot 1: comparison overview, real UI preserved and cropped rather than stretched.
$c = New-Canvas 1280 800 (Join-Path $output '01-compr-comparison-1280x800.png')
$c.Graphics.FillRectangle($lightBg,0,0,1280,800)
$shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20,0,0,0))
$c.Graphics.FillRectangle($shadow,34,34,1212,744)
$srcHeight = [int]($comparison.Width / 1.6)
$c.Graphics.DrawImage($comparison, [System.Drawing.Rectangle]::new(40,28,1200,750), 0,0,$comparison.Width,$srcHeight, [System.Drawing.GraphicsUnit]::Pixel)
Save-Canvas $c

# Screenshot 2: popup explanation.
$c = New-Canvas 1280 800 (Join-Path $output '02-compr-popup-1280x800.png')
Draw-Cover $c.Graphics $background 0 0 1280 800
$c.Graphics.DrawImage($logo,72,76,76,76)
$c.Graphics.DrawString('COMPR', (New-Object System.Drawing.Font('Arial',26,[System.Drawing.FontStyle]::Bold)), $white,166,80)
$c.Graphics.DrawString('Save while you shop.', (New-Object System.Drawing.Font('Arial',42,[System.Drawing.FontStyle]::Bold)), $white,72,220)
$c.Graphics.DrawString("Review detected prices, sizes and`nproduct details in one clear popup.", (New-Object System.Drawing.Font('Arial',20)), $muted,76,290)
$c.Graphics.DrawString('NO ACCOUNT REQUIRED', (New-Object System.Drawing.Font('Arial',14,[System.Drawing.FontStyle]::Bold)), $violet,76,405)
$c.Graphics.DrawString('Your saved products stay in your browser.', (New-Object System.Drawing.Font('Arial',18)), $white,76,440)
Draw-Fit $c.Graphics $popup 760 34 430 732
Save-Canvas $c

# Small promotional tile.
$c = New-Canvas 440 280 (Join-Path $output '03-small-promo-440x280.png')
Draw-Cover $c.Graphics $background 0 0 440 280
$c.Graphics.DrawImage($logo,30,28,58,58)
$c.Graphics.DrawString('COMPR', (New-Object System.Drawing.Font('Arial',24,[System.Drawing.FontStyle]::Bold)), $white,104,34)
$c.Graphics.DrawString("Compare before`nyou buy.", (New-Object System.Drawing.Font('Arial',25,[System.Drawing.FontStyle]::Bold)), $white,30,112)
$c.Graphics.DrawString('Free browser extension', (New-Object System.Drawing.Font('Arial',13)), $muted,32,220)
Save-Canvas $c

# Marquee promotional tile.
$c = New-Canvas 1400 560 (Join-Path $output '04-marquee-promo-1400x560.png')
Draw-Cover $c.Graphics $background 0 0 1400 560
$c.Graphics.DrawImage($logo,72,58,72,72)
$c.Graphics.DrawString('COMPR', (New-Object System.Drawing.Font('Arial',30,[System.Drawing.FontStyle]::Bold)), $white,164,69)
$c.Graphics.DrawString("Stop shopping with`n20 tabs open.", (New-Object System.Drawing.Font('Arial',38,[System.Drawing.FontStyle]::Bold)), $white,72,184)
$c.Graphics.DrawString('Save clothes. Compare clearly.', (New-Object System.Drawing.Font('Arial',21)), $muted,76,338)
$c.Graphics.DrawString('FREE  |  NO ACCOUNT REQUIRED', (New-Object System.Drawing.Font('Arial',13,[System.Drawing.FontStyle]::Bold)), $violet,76,407)
$c.Graphics.FillRectangle($dark,790,54,540,452)
Draw-Fit $c.Graphics $comparison 806 70 508 420
Save-Canvas $c

$background.Dispose(); $logo.Dispose(); $comparison.Dispose(); $popup.Dispose()
$muted.Dispose(); $violet.Dispose(); $dark.Dispose(); $lightBg.Dispose(); $shadow.Dispose()
Write-Output "Created Chrome Web Store assets in $output"
