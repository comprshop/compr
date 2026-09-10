Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RelativeInventory([string]$Root) {
  @(Get-ChildItem -LiteralPath $Root -Recurse -File | ForEach-Object {
    $_.FullName.Substring($Root.Length + 1).Replace('\','/')
  } | Sort-Object)
}

function Copy-ExtensionAllowlist([string]$Source,[string]$Destination,[string[]]$Files) {
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  foreach ($relative in $Files) {
    $from = Join-Path $Source $relative
    if (-not (Test-Path -LiteralPath $from -PathType Leaf)) { throw "Required production source file is missing: $relative" }
    $to = Join-Path $Destination $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null
    Copy-Item -LiteralPath $from -Destination $to
  }
}

function Assert-ExtensionInventory([string]$Root,[string[]]$ExpectedFiles) {
  $actual = @(Get-RelativeInventory $Root)
  $expected = @($ExpectedFiles | ForEach-Object { $_.Replace('\','/') } | Sort-Object -Unique)
  $unexpected = @($actual | Where-Object { $_ -notin $expected })
  $missing = @($expected | Where-Object { $_ -notin $actual })
  if ($unexpected.Count -or $missing.Count) {
    throw "Production inventory mismatch (missing=$($missing.Count), unexpected=$($unexpected.Count))."
  }
  $actual
}

function Assert-ExtensionOutputSafety([string]$Root) {
  $forbidden = @(Get-ChildItem -LiteralPath $Root -Recurse -Force | Where-Object {
    $_.Name -match '(?i)^\.git|^\.env|node_modules|screenshots?|videos?|\.map$|\.log$|\.tmp$|\.temp$|\.zip$|\.ps1$|readme|audit|checklist|test\.js$|fixture|demo|preview|backup|dump|deriveddata|\.p12$|\.pem$|\.key$|\.mobileprovision$'
  })
  if ($forbidden.Count) { throw "Forbidden production output entries: $($forbidden.Count)." }
  $patterns = @(
    'sk_live_[A-Za-z0-9]+','sk_test_[A-Za-z0-9]+','whsec_[A-Za-z0-9]+','service[_-]?role',
    '127\.0\.0\.1','localhost','\.invalid(?:/|\s|$)',
    '[A-Za-z]:\\Users\\','C:/Users/','/Users/[^<\s]+','eval\s*\(','new\s+Function\s*\('
  )
  $unsafe = @(Get-ChildItem -LiteralPath $Root -Recurse -File | Select-String -Pattern $patterns -AllMatches)
  if ($unsafe.Count) { throw "Unsafe production output content detected in $($unsafe.Count) location(s)." }

  $mojibake = @(
    ([char]0x00e2).ToString() + [char]0x20ac,
    ([char]0x00c3).ToString(),
    ([char]0xfffd).ToString()
  )
  $brokenText = @(Get-ChildItem -LiteralPath $Root -Recurse -File |
    Where-Object { $_.Extension -in @('.html','.js','.css','.json','.md') } |
    Select-String -SimpleMatch -Pattern $mojibake)
  if ($brokenText.Count) { throw "Mojibake detected in production output at $($brokenText.Count) location(s)." }
}

Export-ModuleMember -Function Get-RelativeInventory,Copy-ExtensionAllowlist,Assert-ExtensionInventory,Assert-ExtensionOutputSafety
