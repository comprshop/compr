param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$site = Join-Path $Root 'website-live'
$work = Join-Path $Root 'tmp\website-demo-v4'
New-Item -ItemType Directory -Force -Path $work | Out-Null

$ffmpeg = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe" -Filter ffmpeg.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
if (-not $ffmpeg) { throw 'FFmpeg was not found.' }

function RoundedRect([System.Drawing.Graphics]$g, [System.Drawing.RectangleF]$r, [float]$radius, [System.Drawing.Brush]$brush) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $path.AddArc($r.X,$r.Y,$d,$d,180,90); $path.AddArc($r.Right-$d,$r.Y,$d,$d,270,90)
  $path.AddArc($r.Right-$d,$r.Bottom-$d,$d,$d,0,90); $path.AddArc($r.X,$r.Bottom-$d,$d,$d,90,90); $path.CloseFigure()
  $g.FillPath($brush,$path); $path.Dispose()
}

function DrawContain([System.Drawing.Graphics]$g,[System.Drawing.Image]$img,[System.Drawing.RectangleF]$box) {
  $scale = [Math]::Min($box.Width/$img.Width,$box.Height/$img.Height)
  $w=$img.Width*$scale; $h=$img.Height*$scale
  $g.DrawImage($img,$box.X+($box.Width-$w)/2,$box.Y+($box.Height-$h)/2,$w,$h)
}

function MakeScene([string]$name,[string]$eyebrow,[string]$title,[string]$body,[string]$imagePath,[string]$accent) {
  $bmp = New-Object System.Drawing.Bitmap 1920,1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode='AntiAlias'; $g.InterpolationMode='HighQualityBicubic'; $g.TextRenderingHint='AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::FromArgb(16,17,25))
  $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(42,100,82,245))
  $g.FillEllipse($glow,-240,640,850,850); $glow.Dispose()
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $purple = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($accent))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190,193,206))
  $eyebrowFont = New-Object System.Drawing.Font('Arial',20,[System.Drawing.FontStyle]::Bold)
  $titleFont = New-Object System.Drawing.Font('Arial',54,[System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font('Arial',25,[System.Drawing.FontStyle]::Regular)
  $brandFont = New-Object System.Drawing.Font('Arial',28,[System.Drawing.FontStyle]::Bold)
  $g.DrawString('COMPR',$brandFont,$white,92,70)
  $g.FillRectangle($purple,92,132,76,6)
  $g.DrawString($eyebrow.ToUpperInvariant(),$eyebrowFont,$purple,92,300)
  $titleBox = New-Object System.Drawing.RectangleF 92,350,700,220
  $g.DrawString($title,$titleFont,$white,$titleBox)
  $bodyBox = New-Object System.Drawing.RectangleF 92,600,700,180
  $g.DrawString($body,$bodyFont,$muted,$bodyBox)
  $cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(246,247,251))
  RoundedRect $g (New-Object System.Drawing.RectangleF 870,70,950,940) 34 $cardBrush
  $img = [System.Drawing.Image]::FromFile($imagePath)
  $clip = New-Object System.Drawing.RectangleF 900,100,890,880
  $state=$g.Save(); $g.SetClip($clip); DrawContain $g $img $clip; $g.Restore($state)
  $img.Dispose(); $cardBrush.Dispose(); $white.Dispose(); $purple.Dispose(); $muted.Dispose()
  $eyebrowFont.Dispose(); $titleFont.Dispose(); $bodyFont.Dispose(); $brandFont.Dispose(); $g.Dispose()
  $out=Join-Path $work "$name.png"; $bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); return $out
}

$scenes = @(
  (MakeScene '01-detect' 'Step 1' 'Open COMPR while you shop.' 'COMPR reads the product details already visible on the page and puts the important information in one clear card.' (Join-Path $Root 'tmp\popup-product-audit-2.png') '#8174ff'),
  (MakeScene '02-search' 'Step 2' 'Ask COMPR to find it cheaper.' 'One click starts a live price check for the same product, with careful checks for model, variant and condition.' (Join-Path $Root 'tmp\result-1280-3.png') '#8174ff'),
  (MakeScene '03-result' 'Step 3' 'See the saving clearly.' 'COMPR separates confident matches from uncertain options and shows the current price, best price and potential saving.' (Join-Path $Root 'tmp\result-1280-3.png') '#55c69a'),
  (MakeScene '04-compare' 'Step 4' 'Save. Compare. Decide.' 'Keep products from different stores together and compare prices and details side by side before you buy.' (Join-Path $Root 'tmp\compare-two-1920.png') '#8174ff')
)

$narration = 'Before you buy, let COMPR check the price. Open the extension on a product page and review the product it detected. Choose Find This Cheaper. COMPR searches live retailer pages, checks the model and important product details, and keeps uncertain options separate. When a confident cheaper offer is found, you see the current price, best price, and potential saving clearly. You can also save products from different stores and compare them side by side. COMPR helps you check first, compare clearly, and buy with more confidence.'
$wav = Join-Path $work 'narration.wav'
$voice = New-Object -ComObject SAPI.SpVoice
$voice.Voice = $voice.GetVoices() | Where-Object { $_.GetDescription() -like 'Microsoft Zira*' } | Select-Object -First 1
$voice.Rate = -1; $voice.Volume = 100
$stream = New-Object -ComObject SAPI.SpFileStream
$stream.Open($wav,3,$false); $voice.AudioOutputStream=$stream; [void]$voice.Speak($narration); $stream.Close()

$segments=@()
for($i=0;$i -lt $scenes.Count;$i++){
  $segment=Join-Path $work ("segment-{0}.mp4" -f $i)
  & $ffmpeg -y -loop 1 -framerate 30 -i $scenes[$i] -t 10.5 -vf "scale=1920:1080,fade=t=in:st=0:d=0.45,fade=t=out:st=10:d=0.45" -c:v libx264 -pix_fmt yuv420p -r 30 $segment | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not render segment $i." }
  $segments += $segment
}
$list=Join-Path $work 'segments.txt'
$segments | ForEach-Object { "file '$($_.Replace("'","''"))'" } | Set-Content -Encoding ascii $list
$silent=Join-Path $work 'silent.mp4'
& $ffmpeg -y -f concat -safe 0 -i $list -c copy $silent | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not concatenate video segments.' }
$out=Join-Path $site 'compr-demo-v4.mp4'
& $ffmpeg -y -i $silent -i $wav -filter_complex "[1:a]apad=pad_dur=2[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart $out | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not mux narration and video.' }
Copy-Item $scenes[0] (Join-Path $site 'compr-demo-poster-v4.png') -Force
Copy-Item (Join-Path $Root 'tmp\compare-two-1920.png') (Join-Path $site 'compr-product-overview.png') -Force

@'
WEBVTT

00:00:00.000 --> 00:00:05.500
Before you buy, let COMPR check the price.

00:00:05.500 --> 00:00:12.000
Open the extension on a product page and review the product it detected.

00:00:12.000 --> 00:00:21.000
Choose Find This Cheaper. COMPR searches live retailer pages and checks the model and important product details.

00:00:21.000 --> 00:00:30.500
When a confident cheaper offer is found, you see the current price, best price and potential saving clearly.

00:00:30.500 --> 00:00:38.500
Save products from different stores and compare them side by side.

00:00:38.500 --> 00:00:42.000
Check first. Compare clearly. Buy with more confidence.
'@ | Set-Content -Encoding utf8 (Join-Path $site 'compr-demo-en-v4.vtt')

Write-Output $out
