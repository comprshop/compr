param([Parameter(Mandatory=$true)][string]$BackgroundPath)

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$images = Join-Path $root 'website\assets\images'
$output = Join-Path $root 'tiktok-assets'
New-Item -ItemType Directory -Force -Path $output | Out-Null

function New-Frame([string]$name) {
  $bmp = New-Object System.Drawing.Bitmap(1080,1920,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  return @{Bitmap=$bmp; Graphics=$g; Path=(Join-Path $output $name)}
}
function Cover($g,$img,$x,$y,$w,$h) {
  $s=[Math]::Max($w/$img.Width,$h/$img.Height); $sw=[int]($w/$s); $sh=[int]($h/$s)
  $sx=[int](($img.Width-$sw)/2); $sy=[int](($img.Height-$sh)/2)
  $g.DrawImage($img,[System.Drawing.Rectangle]::new($x,$y,$w,$h),$sx,$sy,$sw,$sh,[System.Drawing.GraphicsUnit]::Pixel)
}
function Fit($g,$img,$x,$y,$w,$h) {
  $s=[Math]::Min($w/$img.Width,$h/$img.Height); $dw=[int]($img.Width*$s); $dh=[int]($img.Height*$s)
  $g.DrawImage($img,$x+[int](($w-$dw)/2),$y+[int](($h-$dh)/2),$dw,$dh)
}
function Save($f) { $f.Bitmap.Save($f.Path,[System.Drawing.Imaging.ImageFormat]::Png); $f.Graphics.Dispose(); $f.Bitmap.Dispose() }

$bg=[System.Drawing.Image]::FromFile($BackgroundPath)
$logo=[System.Drawing.Image]::FromFile((Join-Path $images 'compr-logo.png'))
$popup=[System.Drawing.Image]::FromFile((Join-Path $images 'compr-popup.png'))
$compare=[System.Drawing.Image]::FromFile((Join-Path $images 'compr-comparison.png'))
$white=[System.Drawing.Brushes]::White
$muted=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(218,222,237))
$purple=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(145,119,255))

$f=New-Frame '01-hook.png'; Cover $f.Graphics $bg 0 0 1080 1920
$f.Graphics.DrawImage($logo,90,130,110,110)
$f.Graphics.DrawString('COMPR',(New-Object System.Drawing.Font('Arial',46,[System.Drawing.FontStyle]::Bold)),$white,230,148)
$f.Graphics.DrawString("Still shopping with`n20 tabs open?",(New-Object System.Drawing.Font('Arial',68,[System.Drawing.FontStyle]::Bold)),$white,86,580)
$f.Graphics.DrawString('There is a clearer way.',(New-Object System.Drawing.Font('Arial',31)),$muted,92,790)
$f.Graphics.FillRectangle($purple,90,900,160,8); Save $f

$f=New-Frame '02-popup.png'; Cover $f.Graphics $bg 0 0 1080 1920
$f.Graphics.DrawString('SAVE WHILE YOU SHOP',(New-Object System.Drawing.Font('Arial',25,[System.Drawing.FontStyle]::Bold)),$purple,78,86)
$f.Graphics.DrawString('Open COMPR on a product page.',(New-Object System.Drawing.Font('Arial',37,[System.Drawing.FontStyle]::Bold)),$white,76,145)
Fit $f.Graphics $popup 145 280 790 1450; Save $f

$f=New-Frame '03-compare.png'; Cover $f.Graphics $bg 0 0 1080 1920
$f.Graphics.DrawString('COMPARE YOUR PICKS',(New-Object System.Drawing.Font('Arial',25,[System.Drawing.FontStyle]::Bold)),$purple,76,72)
$f.Graphics.DrawString('Everything in one shortlist.',(New-Object System.Drawing.Font('Arial',38,[System.Drawing.FontStyle]::Bold)),$white,74,128)
Fit $f.Graphics $compare 76 235 928 1560; Save $f

$f=New-Frame '04-cta.png'; Cover $f.Graphics $bg 0 0 1080 1920
$f.Graphics.DrawImage($logo,435,320,210,210)
$format=New-Object System.Drawing.StringFormat; $format.Alignment=[System.Drawing.StringAlignment]::Center
$f.Graphics.DrawString('COMPR',(New-Object System.Drawing.Font('Arial',62,[System.Drawing.FontStyle]::Bold)),$white,[System.Drawing.RectangleF]::new(0,580,1080,90),$format)
$f.Graphics.DrawString("Compare before you buy.",(New-Object System.Drawing.Font('Arial',40,[System.Drawing.FontStyle]::Bold)),$white,[System.Drawing.RectangleF]::new(0,730,1080,80),$format)
$f.Graphics.DrawString("Free on Chrome and Microsoft Edge`nNo account required",(New-Object System.Drawing.Font('Arial',29)),$muted,[System.Drawing.RectangleF]::new(40,850,1000,130),$format)
$f.Graphics.FillRectangle($purple,290,1080,500,105)
$f.Graphics.DrawString('LINK IN BIO',(New-Object System.Drawing.Font('Arial',30,[System.Drawing.FontStyle]::Bold)),$white,[System.Drawing.RectangleF]::new(290,1112,500,50),$format)
Save $f

$bg.Dispose(); $logo.Dispose(); $popup.Dispose(); $compare.Dispose(); $muted.Dispose(); $purple.Dispose(); $format.Dispose()
Write-Output "Created TikTok frames in $output"
