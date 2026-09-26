param(
  [string]$PreparationPath = $PSScriptRoot,
  [string]$KitZipPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'build\COMPR-Safari-Mac-Day-Kit-v0.3.6.zip'),
  [ValidatePattern('^[0-9a-fA-F]{64}$')][string]$ExpectedKitSha256 = 'd4505d7d6186ad5cc221998985cfde3d156e04a1b929a8b2fa380124e8322642'
)

$ErrorActionPreference = 'Stop'
$blockers = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
function Block([string]$message) { $blockers.Add($message); Write-Output "BLOCKER: $message" }
function Warn([string]$message) { $warnings.Add($message); Write-Output "WARN: $message" }

if (-not (Test-Path -LiteralPath $PreparationPath -PathType Container)) {
  Block 'Preparation directory is missing.'
} else {
  $required = @(
    'START-HERE-PRE-MAC.md','PRE_MAC_READINESS_REPORT.md','HUMAN_ACTIONS_BEFORE_RENTAL.md',
    'APPLE_IDENTIFIERS_PLAN.md','APP_STORE_METADATA_REVIEW.md','APP_PRIVACY_DRAFT.md',
    'SUPPORT_LEGAL_CONTENT_DRAFTS.md','FREE_PRO_PRODUCT_SPEC.md','STOREKIT_ARCHITECTURE.md',
    'STOREKIT_IMPLEMENTATION_BACKLOG.md','SAFARI_VALUES_CAPTURE_PLAN.md','TESTFLIGHT_TEST_MATRIX.md',
    'CLOUD_MAC_RUNBOOK.md','CLOUD_MAC_PROVIDER_REQUIREMENTS.md','APP_ICON_READINESS.md',
    'SCREENSHOT_CAPTURE_PLAN.md','MAC_SESSION_DECISION.md','verify-pre-mac-readiness.ps1'
  )
  foreach ($name in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $PreparationPath $name) -PathType Leaf)) { Block "Missing document: $name" }
  }
  foreach ($file in Get-ChildItem -LiteralPath $PreparationPath -File -Filter *.md) {
    $body = Get-Content -Raw -LiteralPath $file.FullName
    if ($body -match '(?i)\b(TODO|_REQUIRED|<PUBLIC_|<ACCOUNT_HOLDER_)\b') { Warn "Unresolved human/Apple fields in $($file.Name)." }
    if ($body -match '(?i)\b(sk_live_[A-Za-z0-9]{12,}|sk_test_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,}|sb_secret_[A-Za-z0-9]{12,})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----') {
      Block "Possible secret in $($file.Name); value suppressed."
    }
  }
}

if (-not (Test-Path -LiteralPath $KitZipPath -PathType Leaf)) {
  Block 'Frozen Mac Day Kit ZIP is missing.'
} else {
  try {
    $actual = (Get-FileHash -LiteralPath $KitZipPath -Algorithm SHA256).Hash
    if ($actual -ine $ExpectedKitSha256) { Block 'Frozen Mac Day Kit ZIP hash differs from expected.' }
    else { Write-Output 'PASS: frozen Mac Day Kit ZIP SHA-256.' }
  } catch { Block 'Frozen Mac Day Kit ZIP could not be hashed.' }
}

if ($blockers.Count -gt 0) {
  Write-Output "FAIL: $($blockers.Count) blocker(s), $($warnings.Count) warning(s). No files were changed."
  exit 1
}
Write-Output "PASS: local preparation complete; $($warnings.Count) human/Apple warning(s) remain. No files were changed."
