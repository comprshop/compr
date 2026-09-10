param(
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$SupabaseUrl,
  [Parameter(Mandatory = $true)][string]$SupabaseAnonKey,
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$AuthCallbackUrl,
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$ChromeStoreUrl,
  [switch]$ValidationOnly,
  [switch]$CreateRelease
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($ValidationOnly -eq $CreateRelease) { throw 'Choose exactly one mode: -ValidationOnly or -CreateRelease.' }
$allInputs = "$ApiBaseUrl $SupabaseUrl $SupabaseAnonKey $AuthCallbackUrl $ChromeStoreUrl"
if ($allInputs -match '(?i)(placeholder|replace[_-]?with|example\.(com|org|net)|\.invalid(?:/|\s|$))') {
  throw 'Placeholder configuration is forbidden, including in validation-only mode.'
}
if ($SupabaseAnonKey -notmatch '^[A-Za-z0-9._-]{20,}$' -or
    $SupabaseAnonKey -match '(?i)(service.role|service_role|secret|sk_test|sk_live|whsec_)') {
  throw 'The extension build requires a public Supabase anon/publishable key, never a privileged secret.'
}

$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$source = Join-Path $root 'V.0.3-prototype'
$buildRoot = [IO.Path]::GetFullPath((Join-Path $root 'dist'))
$stage = Join-Path $buildRoot ('.compr-extension-stage-' + [guid]::NewGuid().ToString('N'))
Import-Module (Join-Path $PSScriptRoot 'extension-production-staging.psm1') -Force

$sourceFiles = @(
  'manifest.json','popup.html','popup.js','compare.html','compare.js','background.js','content.js',
  'auth-receiver.html','auth-receiver.js','privacy.md',
  'icons/icon16.png','icons/icon32.png','icons/icon48.png','icons/icon128.png',
  'styles/popup.css','styles/compare.css',
  'shared/browserAdapter.js','shared/productEligibility.js','shared/popupState.js','shared/product.js',
  'shared/currency.js','shared/similarity.js','shared/storage.js','shared/i18n.js','shared/auth.js',
  'shared/apiClient.js','shared/reliability.js',
  'detectors/price.js','detectors/brand.js','detectors/color.js','detectors/material.js','detectors/sizes.js',
  'detectors/availability.js','detectors/policies.js','detectors/discountCodes.js','detectors/category.js',
  'detectors/productId.js','detectors/productName.js',
  'matching/productMatcher.js','search/searchProvider.js','search/buildSearchQuery.js',
  'compare/price.js','compare/collection.js','compare/productCard.js'
)
$expectedFiles = @($sourceFiles + 'shared/runtimeConfig.js' | Sort-Object -Unique)
$callbackUri = [uri]$AuthCallbackUrl
if ($callbackUri.Scheme -ne 'https' -or $callbackUri.Host -ne 'getcompr.nl' -or
    $callbackUri.AbsolutePath -ne '/auth-callback.html' -or $callbackUri.Query -or $callbackUri.Fragment) {
  throw 'Auth callback must be exactly https://getcompr.nl/auth-callback.html.'
}
$websiteBaseUrl = ([uri]::new($callbackUri, '.')).AbsoluteUri.TrimEnd('/')

Push-Location (Join-Path $root 'find-cheaper-backend')
try {
  & npm.cmd test; if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
  & npm.cmd audit --omit=dev --offline --audit-level=high; if ($LASTEXITCODE -ne 0) { throw 'High-severity dependency audit failed.' }
} finally { Pop-Location }
Push-Location $source
try {
  & node --test 'tests/integration.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Extension integration tests failed.' }
  & node 'tests/core.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Extension core tests failed.' }
  & node 'tests/find-cheaper.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Find This Cheaper tests failed.' }
} finally { Pop-Location }

try {
  New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
  Copy-ExtensionAllowlist -Source $source -Destination $stage -Files $sourceFiles

  $providerPath = Join-Path $stage 'search\searchProvider.js'
  $provider = Get-Content -LiteralPath $providerPath -Raw -Encoding utf8
  $oldProviderUrl = 'const BACKEND_SEARCH_URL = "http://127.0.0.1:8787/api/search";'
  if (([regex]::Matches($provider,[regex]::Escape($oldProviderUrl))).Count -ne 1) { throw 'Unexpected search provider layout.' }
  $provider = $provider.Replace($oldProviderUrl,'const BACKEND_SEARCH_URL = ComprRuntimeConfig.apiBaseUrl + "/api/search";')
  $provider = $provider.Replace('local-demo-catalog','backend').Replace('offline-demo','unavailable')
  $provider = $provider.Replace('ComprDemoCatalog','undefined')
  $provider = $provider.Replace('COMPR development backend unavailable; using offline demo','COMPR backend unavailable')
  Set-Content -LiteralPath $providerPath -Value $provider -Encoding utf8

  $comparePath = Join-Path $stage 'compare.html'
  $compare = (Get-Content -LiteralPath $comparePath -Raw -Encoding utf8) -replace '\s*<script src="search/demoCatalog\.js"></script>', ''
  Set-Content -LiteralPath $comparePath -Value $compare -Encoding utf8
  $popupPath = Join-Path $stage 'popup.html'
  $popup = Get-Content -LiteralPath $popupPath -Raw -Encoding utf8
  $popup = $popup -replace '\s*<script src="shared/safariExperience\.js"></script>', ''
  $popup = $popup -replace '\s*<script src="safari-popup\.js"></script>', ''
  Set-Content -LiteralPath $popupPath -Value $popup -Encoding utf8

  $runtime = @"
// Generated public production configuration. Never add private server secrets here.
const ComprRuntimeConfig = Object.freeze({
  apiBaseUrl: "$($ApiBaseUrl.TrimEnd('/'))",
  supabaseUrl: "$($SupabaseUrl.TrimEnd('/'))",
  supabaseAnonKey: "$SupabaseAnonKey",
  authCallbackUrl: "$AuthCallbackUrl",
  chromeStoreUrl: "$ChromeStoreUrl",
  mode: "production",
  betaMode: true,
  betaAccessUrl: "$websiteBaseUrl/#beta-access",
  platform: "chrome",
  guestMode: false
});
"@
  Set-Content -LiteralPath (Join-Path $stage 'shared\runtimeConfig.js') -Value $runtime -Encoding utf8

  $manifestPath = Join-Path $stage 'manifest.json'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
  $version = [string]$manifest.version
  if ($version -notmatch '^\d+(?:\.\d+){1,3}$') { throw 'Manifest version is invalid.' }
  $manifest.host_permissions = @("$($ApiBaseUrl.TrimEnd('/'))/*","$($SupabaseUrl.TrimEnd('/'))/*",'https://www.ecb.europa.eu/*')
  $manifest.web_accessible_resources[0].matches = @($callbackUri.GetLeftPart('Authority') + '/*')
  $manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding utf8

  if ($manifest.manifest_version -ne 3 -or $manifest.name -ne 'COMPR') { throw 'Chrome manifest identity is invalid.' }
  if ($manifest.background.service_worker -ne 'background.js' -or
      $manifest.PSObject.Properties.Name -contains 'content_scripts') { throw 'Chrome entry points are invalid.' }
  if ($manifest.content_security_policy.extension_pages -ne "script-src 'self'; object-src 'self'") { throw 'Production CSP is invalid.' }
  if (@($manifest.permissions).Count -ne 3 -or @($manifest.permissions | Where-Object { $_ -notin @('storage','activeTab','scripting') }).Count) {
    throw 'Production permissions differ from the approved set.'
  }
  if ($manifest.host_permissions -contains '<all_urls>' -or @($manifest.host_permissions | Where-Object { $_ -match 'localhost|127\.0\.0\.1|^http:' }).Count) {
    throw 'Production host permissions are broad, local or insecure.'
  }
  if ($manifest.PSObject.Properties.Name -contains 'externally_connectable') { throw 'Unused external messaging is forbidden.' }
  $webResources = @($manifest.web_accessible_resources | ForEach-Object { $_.resources })
  if ($webResources.Count -ne 1 -or $webResources[0] -ne 'auth-receiver.html') { throw 'Only the login receiver may be web-accessible.' }

  $popup = Get-Content -LiteralPath $popupPath -Raw -Encoding utf8
  if ($popup -match '(?i)(safari-popup\.js|shared/safariExperience\.js)' -or
      (Test-Path -LiteralPath (Join-Path $stage 'safari-popup.js')) -or
      (Test-Path -LiteralPath (Join-Path $stage 'shared\safariExperience.js'))) {
    throw 'Safari-specific runtime files entered the Chrome output.'
  }
  foreach ($htmlPath in @($popupPath,$comparePath,(Join-Path $stage 'auth-receiver.html'))) {
    $html = Get-Content -LiteralPath $htmlPath -Raw -Encoding utf8
    $adapterIndex = $html.IndexOf('shared/browserAdapter.js')
    $dependent = [regex]::Match($html,'<script src="shared/(?!browserAdapter)[^"]+\.js"></script>')
    if ($adapterIndex -lt 0 -or ($dependent.Success -and $adapterIndex -gt $dependent.Index)) {
      throw "Browser adapter load order invalid in $htmlPath"
    }
  }

  $inventory = @(Assert-ExtensionInventory -Root $stage -ExpectedFiles $expectedFiles)
  Assert-ExtensionOutputSafety -Root $stage
  $obsoleteUrls = @(Get-ChildItem -LiteralPath $stage -Recurse -File |
    Select-String -Pattern 'comprshop\.github\.io|vercel\.app' -AllMatches)
  if ($obsoleteUrls.Count) { throw 'Obsolete website origin entered the Chrome output.' }
  foreach ($javascript in Get-ChildItem -LiteralPath $stage -Recurse -File -Filter '*.js') {
    & node --check $javascript.FullName; if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax failure: $($javascript.Name)" }
  }
  Write-Host "Chrome production staging validated ($($inventory.Count) files)." -ForegroundColor Cyan
  $inventory | ForEach-Object { Write-Host " - $_" }
  foreach ($relative in $inventory) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $stage $relative)).Hash.ToLowerInvariant()
    Write-Host " SHA256 $relative $hash"
  }
  if ($ValidationOnly) {
    Write-Host 'Validation-only build passed; no artifact was retained.' -ForegroundColor Green
  } else {
    $zip = Join-Path $buildRoot "COMPR-v$version-production.zip"
    if (Test-Path -LiteralPath $zip) { throw "Refusing to overwrite existing versioned artifact: $zip" }
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
    $manualSmoke = [IO.Path]::GetFullPath((Join-Path $root 'build\chrome-manual-smoke'))
    $manualRoot = [IO.Path]::GetFullPath((Join-Path $root 'build')).TrimEnd('\') + '\'
    if (-not $manualSmoke.StartsWith($manualRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe manual smoke path.' }
    if (Test-Path -LiteralPath $manualSmoke) { Remove-Item -LiteralPath $manualSmoke -Recurse -Force }
    Copy-ExtensionAllowlist -Source $stage -Destination $manualSmoke -Files $expectedFiles
    $manualInventory = @(Assert-ExtensionInventory -Root $manualSmoke -ExpectedFiles $expectedFiles)
    Assert-ExtensionOutputSafety -Root $manualSmoke
    foreach ($relative in $inventory) {
      $stagedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $stage $relative)).Hash
      $manualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $manualSmoke $relative)).Hash
      if ($stagedHash -ne $manualHash) { throw "Manual smoke mismatch: $relative" }
    }
    Write-Host "Production extension validated: $zip" -ForegroundColor Green
    Write-Host "Manual smoke directory refreshed ($($manualInventory.Count) files): $manualSmoke" -ForegroundColor Green
  }
} finally {
  if (Test-Path -LiteralPath $stage) {
    $resolvedStage = [IO.Path]::GetFullPath($stage)
    $prefix = $buildRoot.TrimEnd('\') + '\'
    if (-not $resolvedStage.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe staging cleanup target.' }
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
}
