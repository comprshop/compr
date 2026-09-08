$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$testRoot = Join-Path $root ('dist\.production-staging-test-' + [guid]::NewGuid().ToString('N'))
Import-Module (Join-Path $root 'tools\extension-production-staging.psm1') -Force
$passed = 0

function Expect-Failure([scriptblock]$Action,[string]$Pattern) {
  try { & $Action; throw 'Expected validation failure did not occur.' }
  catch { if ($_.Exception.Message -notmatch $Pattern) { throw }; $script:passed++ }
}

try {
  New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $testRoot 'allowed.js') -Value 'const safe = true;' -Encoding utf8
  Assert-ExtensionInventory -Root $testRoot -ExpectedFiles @('allowed.js') | Out-Null
  $passed++

  Set-Content -LiteralPath (Join-Path $testRoot 'unexpected.js') -Value 'const extra = true;' -Encoding utf8
  Expect-Failure { Assert-ExtensionInventory -Root $testRoot -ExpectedFiles @('allowed.js') } 'unexpected=1'
  Remove-Item -LiteralPath (Join-Path $testRoot 'unexpected.js') -Force
  Expect-Failure { Assert-ExtensionInventory -Root $testRoot -ExpectedFiles @('allowed.js','missing.js') } 'missing=1'

  foreach ($case in @(
    @{ Name='bundle.js.map'; Value='{}'; Pattern='Forbidden' },
    @{ Name='unsafe.fixture'; Value='fixture'; Pattern='Forbidden' },
    @{ Name='marker.txt'; Value='sk_live_synthetic_security_marker'; Pattern='Unsafe' }
  )) {
    $path = Join-Path $testRoot $case.Name
    Set-Content -LiteralPath $path -Value $case.Value -Encoding utf8
    Expect-Failure { Assert-ExtensionOutputSafety -Root $testRoot } $case.Pattern
    Remove-Item -LiteralPath $path -Force
  }
  Write-Host "Production staging security tests passed: $passed"
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    $resolved = [IO.Path]::GetFullPath($testRoot)
    $prefix = [IO.Path]::GetFullPath((Join-Path $root 'dist')).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup target.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
